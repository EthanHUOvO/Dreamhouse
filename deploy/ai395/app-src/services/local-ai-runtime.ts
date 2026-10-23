import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export function jobError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export function checkAborted(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason || jobError("request cancelled", 499);
}

export function imageSize(value: unknown, defaultSize = "512*512", maximumEdge = Number(process.env.LOCAL_IMAGE_MAX_DIMENSION) || 1024) {
  const match = String(value || defaultSize).match(/^(\d+)[*xX,](\d+)$/);
  if (!match) throw jobError("size must be WIDTH*HEIGHT", 400);
  const original = [Number(match[1]), Number(match[2])];
  if (original.some(value => !Number.isSafeInteger(value) || value < 32 || value > 16384)) throw jobError("image dimensions must be between 32 and 16384 pixels", 400);
  const pixels = Number(process.env.LOCAL_IMAGE_MAX_PIXELS) || maximumEdge * maximumEdge;
  const scale = Math.min(1, maximumEdge / Math.max(...original), Math.sqrt(pixels / (original[0] * original[1])));
  return original.map(value => Math.max(32, Math.min(maximumEdge, Math.round(value * scale / 32) * 32)));
}

export function requestCancellation(req: any, res: any) {
  const controller = new AbortController();
  const abort = () => controller.abort(jobError("request cancelled", 499));
  const close = () => { if (!res.writableEnded) abort(); };
  req.once("aborted", abort);
  res.once("close", close);
  return { signal: controller.signal, dispose() { req.removeListener("aborted", abort); res.removeListener("close", close); } };
}

export async function readRequestBody(req: any, signal: AbortSignal, maxBytes: number) {
  checkAborted(signal);
  const abort = () => req.destroy(signal.reason || jobError("request cancelled", 499));
  const timer = setTimeout(() => req.destroy(jobError("request body timed out", 408)), Number(process.env.LOCAL_AI_BODY_TIMEOUT_MS) || 30_000);
  signal.addEventListener("abort", abort, { once: true });
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    for await (const chunk of req) {
      checkAborted(signal);
      const buffer = Buffer.from(chunk);
      length += buffer.length;
      if (length > maxBytes) throw jobError(`request body exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB`, 413);
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

type QueueEntry = { work: (deadlineAt: number) => Promise<unknown>; signal: AbortSignal; resolve: (value: any) => void; reject: (error: any) => void; deadlineAt: number; timer?: ReturnType<typeof setTimeout>; cancel: () => void };

// Remove abandoned entries immediately, so cancelling work also frees queue capacity.
export class JobQueue {
  private active = false;
  private entries: QueueEntry[] = [];
  private maximumWaiting: number;
  private waitTimeoutMs: number;
  constructor(maximumWaiting = Number(process.env.LOCAL_AI_MAX_QUEUE) || 4, waitTimeoutMs = Number(process.env.LOCAL_AI_QUEUE_TIMEOUT_MS) || 600_000) { this.maximumWaiting = maximumWaiting; this.waitTimeoutMs = waitTimeoutMs; }
  get state() { return { active: this.active, waiting: this.entries.length, capacity: this.maximumWaiting }; }
  run<T>(work: (deadlineAt: number) => Promise<T>, signal: AbortSignal): Promise<T> {
    checkAborted(signal);
    if (this.active && this.entries.length >= this.maximumWaiting) return Promise.reject(jobError("AI queue is full; wait for the current task to finish", 429));
    return new Promise((resolve, reject) => {
      const entry: QueueEntry = { work, signal, resolve, reject, deadlineAt: Date.now() + this.waitTimeoutMs, cancel: () => {} };
      entry.cancel = () => {
        const index = this.entries.indexOf(entry);
        if (index < 0) return;
        this.entries.splice(index, 1);
        this.cleanup(entry);
        reject(signal.reason || jobError("request cancelled", 499));
      };
      signal.addEventListener("abort", entry.cancel, { once: true });
      entry.timer = setTimeout(() => {
        const index = this.entries.indexOf(entry);
        if (index < 0) return;
        this.entries.splice(index, 1);
        this.cleanup(entry);
        reject(jobError("AI queue wait timed out", 504));
      }, this.waitTimeoutMs);
      this.entries.push(entry);
      this.drain();
    });
  }
  private cleanup(entry: QueueEntry) { clearTimeout(entry.timer); entry.signal.removeEventListener("abort", entry.cancel); }
  private drain() {
    if (this.active) return;
    const entry = this.entries.shift();
    if (!entry) return;
    this.cleanup(entry);
    if (entry.signal.aborted) { entry.reject(entry.signal.reason || jobError("request cancelled", 499)); this.drain(); return; }
    this.active = true;
    Promise.resolve().then(() => entry.work(entry.deadlineAt)).then(entry.resolve, entry.reject).finally(() => { this.active = false; this.drain(); });
  }
}

// flock is held by a helper whose stdin belongs to this process. A crash closes
// that pipe and releases the OS lock, with no stale leases or PID assumptions.
export async function withGpuLock<T>(signal: AbortSignal, deadlineAt: number, work: (activeSignal: AbortSignal) => Promise<T>) {
  checkAborted(signal);
  const directory = process.env.LOCAL_AI_GPU_LOCK_DIR;
  if (!directory) return work(signal);
  await mkdir(directory, { recursive: true });
  checkAborted(signal);
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw jobError("GPU queue wait timed out", 504);
  const helper = "process.stdout.write('locked\\n');process.stdin.resume();process.stdin.on('end',()=>process.exit(0))";
  const child = spawn(process.env.LOCAL_AI_FLOCK_BIN || "flock", ["-x", join(directory, "gpu.lock"), process.execPath, "-e", helper], { stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
  const kill = () => { try { if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { child.kill("SIGKILL"); } };
  const lockController = new AbortController();
  const activeSignal = AbortSignal.any([signal, lockController.signal]);
  let closed = false, acquired = false, releasing = false;
  child.once("exit", () => {
    if (acquired && !releasing) lockController.abort(jobError("GPU lock helper was interrupted", 503));
  });
  const close = new Promise<void>((resolve) => child.once("close", () => {
    closed = true;
    if (acquired && !releasing) lockController.abort(jobError("GPU lock helper was interrupted", 503));
    resolve();
  }));
  let stderr = "";
  child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-2000); });
  try {
    await new Promise<void>((resolve, reject) => {
      let output = "", settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        child.removeListener("error", failed);
        child.removeListener("close", ended);
        error ? reject(error) : resolve();
      };
      const abort = () => { kill(); finish(signal.reason || jobError("request cancelled", 499)); };
      const failed = (error: Error) => finish(error);
      const ended = () => finish(jobError(`GPU lock helper exited: ${stderr || "flock unavailable"}`, 503));
      const timer = setTimeout(() => { kill(); finish(jobError("GPU queue wait timed out", 504)); }, remainingMs);
      child.on("error", failed);
      child.on("close", ended);
      child.stdout.on("data", chunk => { output += chunk; if (output.includes("locked\n")) finish(); });
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    acquired = true;
    checkAborted(activeSignal);
    return await work(activeSignal);
  } finally {
    releasing = true;
    if (!closed) {
      child.stdin.on("error", () => {});
      child.stdin.end();
      const timer = setTimeout(kill, 3000);
      await close;
      clearTimeout(timer);
    }
  }
}

// Do not resolve cancellation until the GPU process has exited. The shared
// resource lock must remain held while the driver releases that process.
export async function runImageProcess(binary: string, args: string[], signal: AbortSignal, timeoutMs: number) {
  checkAborted(signal);
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", stopError: Error | undefined;
    const stop = (error: Error) => { stopError ||= error; child.kill("SIGKILL"); };
    const abort = () => stop(signal.reason || jobError("request cancelled", 499));
    const timer = setTimeout(() => stop(jobError(`image job timed out after ${timeoutMs}ms`, 504)), timeoutMs);
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); };
    child.stdout.on("data", chunk => { stdout = (stdout + chunk).slice(-16_000); });
    child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-16_000); });
    child.once("error", error => { cleanup(); reject(error); });
    child.once("close", code => { cleanup(); if (stopError) reject(stopError); else if (code === 0) resolve({ stdout, stderr }); else reject(jobError(`image process exited ${code}: ${(stderr || stdout).slice(-4000)}`, 503)); });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
