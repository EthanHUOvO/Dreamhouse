import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { JobQueue, checkAborted, imageSize, jobError, readRequestBody, requestCancellation, runImageProcess, withGpuLock } from "../local-ai-runtime.ts";

const port = Number(process.env.LOCAL_IMAGE_PORT || 8200);
const binary = process.env.QWEN_IMAGE_BIN || "/opt/qwen-image/qwenimage-ncnn-vulkan";
const modelPath = process.env.QWEN_IMAGE_MODEL_PATH || "/models/qwenimage21";
const accelerationLora = process.env.QWEN_IMAGE_LORA || "";
const accelerationSteps = Number(process.env.QWEN_IMAGE_LORA_STEPS) || 4;
const modelName = accelerationLora ? "Qwen-Image-2.1-Fun-Acc-4Step" : "Qwen-Image-2.1";
const outputDirectory = process.env.GENERATED_IMAGE_DIR || "/data/generated";
const temporaryDirectory = process.env.QWEN_IMAGE_TMP_DIR || "/tmp/qwen-image-jobs";
const timeoutMs = Number(process.env.QWEN_IMAGE_JOB_TIMEOUT_MS || 900_000);
const queue = new JobQueue();
const requiredModelFiles = [
  "processor/merges.txt",
  "processor/vocab.txt",
  "text_encoder/text_encoder.ncnn.bin",
  "text_encoder/text_encoder.ncnn.param",
  "transformer/blocks.ncnn.bin",
  "transformer/blocks.ncnn.param",
  "transformer/input.ncnn.bin",
  "transformer/input.ncnn.param",
  "transformer/output.ncnn.bin",
  "transformer/output.ncnn.param",
  "vae/decoder.ncnn.bin",
  "vae/decoder.ncnn.param",
  "vae/encoder.ncnn.bin",
  "vae/encoder.ncnn.param",
  "vision/vision_encoder.ncnn.bin",
  "vision/vision_encoder.ncnn.param",
  "vision/vision_pos_embed.f32",
];

function json(res: any, status: number, value: unknown) {
  if (res.destroyed) return;
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

function decodeDataUrl(value: string) {
  const match = value.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) throw jobError("local image service accepts base64 image data URLs only", 400);
  return Buffer.from(match[1], "base64");
}

async function generate(body: any, signal: AbortSignal, receivedAt: number, deadlineAt: number) {
  checkAborted(signal);
  if (!String(body.prompt || "").trim()) throw jobError("prompt is required", 400);
  const requestId = randomUUID();
  const jobDirectory = join(temporaryDirectory, requestId);
  await mkdir(jobDirectory, { recursive: true });
  await mkdir(outputDirectory, { recursive: true });
  const outputName = `${requestId}.png`;
  const outputPath = join(outputDirectory, outputName);
  try {
    const references: string[] = [];
    for (const [index, image] of (Array.isArray(body.images) ? body.images : []).slice(0, 3).entries()) {
      const path = join(jobDirectory, `reference-${index + 1}.png`);
      await writeFile(path, decodeDataUrl(String(image)));
      references.push(path);
    }
    const [width, height] = imageSize(body.size, "1024*1024");
    const steps = Number(body.steps) || Number(process.env.QWEN_IMAGE_DEFAULT_STEPS) || (accelerationLora ? accelerationSteps : 40);
    if (!Number.isInteger(steps) || steps < 1 || steps > 60) throw jobError("steps must be an integer between 1 and 60", 400);
    if (accelerationLora && steps !== accelerationSteps) throw jobError(`the configured acceleration adapter requires exactly ${accelerationSteps} steps`, 400);
    const args = ["-m", modelPath, "-g", "0", "-p", String(body.prompt), "-s", `${width},${height}`, "-l", String(steps), "-w", String(Number(body.guidanceScale) || 1), "-o", outputPath];
    if (accelerationLora) args.push("--lora", accelerationLora);
    if (body.negativePrompt) args.push("-n", String(body.negativePrompt));
    if (Number.isInteger(body.seed)) args.push("-r", String(body.seed));
    for (const reference of references) args.push("-i", reference);
    const startedAt = Date.now();
    const remainingMs = deadlineAt - startedAt;
    if (remainingMs <= 0) throw jobError("image job deadline exceeded while queued", 504);
    const logs = await runImageProcess(binary, args, signal, remainingMs);
    checkAborted(signal);
    const details = await stat(outputPath);
    return {
      requestId,
      model: modelName,
      url: `/api/generated-images/${outputName}`,
      width,
      height,
      elapsedMs: Date.now() - receivedAt,
      usage: { backend: "ncnn-vulkan", gpu: 0, steps, accelerated: Boolean(accelerationLora), bytes: details.size, queueMs: startedAt - receivedAt, processMs: Date.now() - startedAt, resident: false },
      logs: process.env.LOCAL_AI_DEBUG === "true" ? logs : undefined,
    };
  } catch (error) { await rm(outputPath, { force: true }).catch(() => undefined); throw error;
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function probeVulkan() {
  return new Promise<{ ready: boolean; summary?: string; error?: string }>((resolve) => {
    const child = spawn(process.env.VULKANINFO_BIN || "/usr/bin/vulkaninfo", ["--summary"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, AMD_VULKAN_ICD: process.env.AMD_VULKAN_ICD || "RADV" },
    });
    let output = "";
    const finish = (ready: boolean, error?: string) => {
      clearTimeout(timer);
      resolve({ ready, summary: output.match(/deviceName\s*=.*(?:Radeon|AMD).*/i)?.[0], error });
    };
    const timer = setTimeout(() => { child.kill("SIGKILL"); finish(false, "vulkaninfo timed out"); }, 8_000);
    child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-32_000); });
    child.stderr.on("data", (chunk) => { output = (output + chunk).slice(-32_000); });
    child.on("error", (error) => finish(false, error.message));
    child.on("exit", (code) => {
      const hasAmdDevice = /deviceName\s*=.*(?:Radeon|AMD)/i.test(output);
      finish(code === 0 && hasAmdDevice, code === 0 && hasAmdDevice ? undefined : output.slice(-500));
    });
  });
}

async function health() {
  const missingModelFiles: string[] = [];
  await Promise.all(requiredModelFiles.map(async (file) => {
    try {
      const details = await stat(join(modelPath, file));
      if (!details.isFile() || details.size === 0) missingModelFiles.push(file);
    } catch {
      missingModelFiles.push(file);
    }
  }));
  if (accelerationLora) {
    const ready = await stat(accelerationLora).then(details => details.isFile() && details.size > 0, () => false);
    if (!ready) missingModelFiles.push(accelerationLora);
  }
  const binaryReady = await access(binary, constants.X_OK).then(() => true, () => false);
  const vulkanDevice = "/dev/dri/renderD128";
  const vulkanDeviceAccessible = await access(vulkanDevice, constants.R_OK | constants.W_OK).then(() => true, () => false);
  const vulkanProbe = vulkanDeviceAccessible ? await probeVulkan() : { ready: false, error: "render device is not accessible" };
  const vulkanReady = vulkanDeviceAccessible && vulkanProbe.ready;
  return {
    ok: binaryReady && vulkanReady && missingModelFiles.length === 0,
    service: "qwen-image-ncnn-vulkan",
    model: modelName,
    backend: "vulkan",
    binary,
    binaryReady,
    modelPath,
    modelFilesPresent: requiredModelFiles.length + (accelerationLora ? 1 : 0) - missingModelFiles.length,
    modelFilesRequired: requiredModelFiles.length + (accelerationLora ? 1 : 0),
    missingModelFiles: missingModelFiles.sort(),
    vulkanDevice,
    vulkanDeviceAccessible,
    vulkanReady,
    vulkanSummary: vulkanProbe.summary,
    vulkanError: vulkanProbe.error,
    queue: queue.state,
    gpuLock: Boolean(process.env.LOCAL_AI_GPU_LOCK_DIR),
    resident: false,
    accelerationEnabled: Boolean(accelerationLora),
    accelerationSteps: accelerationLora ? accelerationSteps : undefined,
  };
}

const server = createServer(async (req, res) => {
  const cancellation = requestCancellation(req, res), receivedAt = Date.now();
  try {
    if (req.method === "GET" && req.url === "/health") {
      const status = await health();
      json(res, status.ok ? 200 : 503, status);
      return;
    }
    if (req.method !== "POST" || req.url !== "/v1/images/generations") {
      json(res, 404, { error: "not found" });
      return;
    }
    let body: any;
    try { body = JSON.parse((await readRequestBody(req, cancellation.signal, 25 * 1024 * 1024)).toString("utf8") || "{}"); }
    catch (error: any) { throw error instanceof SyntaxError ? jobError("invalid JSON body", 400) : error; }
    const deadlineAt = receivedAt + timeoutMs;
    const result = await queue.run(queueDeadline => withGpuLock(cancellation.signal, Math.min(queueDeadline, deadlineAt), activeSignal => generate(body, activeSignal, receivedAt, deadlineAt)), cancellation.signal);
    json(res, 200, result);
  } catch (error: any) {
    if (!cancellation.signal.aborted && !res.destroyed) {
      console.error("[Local Qwen Image]", error.message);
      json(res, error.status || 503, { error: error?.message || String(error) });
    }
  } finally { cancellation.dispose(); }
});
server.headersTimeout = 30_000;
server.requestTimeout = 0;
server.listen(port, "0.0.0.0", () => console.log(`Local Qwen Image service listening on :${port}`));
