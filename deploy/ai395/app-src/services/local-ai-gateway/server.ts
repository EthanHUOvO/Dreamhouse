import { createServer, request as httpRequest } from "node:http";
import { JobQueue, checkAborted, jobError, readRequestBody, requestCancellation, withGpuLock } from "../local-ai-runtime.ts";

const port = Number(process.env.LOCAL_AI_GATEWAY_PORT || 8300);
const textBaseUrl = (process.env.TEXT_UPSTREAM || "http://qwen-text:8080").replace(/\/$/, "");
const imageBaseUrl = (process.env.IMAGE_UPSTREAM || "http://qwen-image:8200").replace(/\/$/, "");
const queue = new JobQueue();
const upstreamTimeoutMs = Number(process.env.LOCAL_AI_UPSTREAM_TIMEOUT_MS) || 1_000_000;

function requestUpstream(urlString: string, method: string, contentType: string, signal: AbortSignal, body?: Buffer) {
  checkAborted(signal);
  return new Promise<{ status: number; contentType: string; payload: Buffer }>((resolve, reject) => {
    const target = new URL(urlString);
    let response: any, stoppedError: Error | undefined, settled = false;
    const stop = (error: Error) => { stoppedError ||= error; request.destroy(error); };
    const abort = () => stop(signal.reason || jobError("request cancelled", 499));
    const finish = (error?: Error, result?: { status: number; contentType: string; payload: Buffer }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      stoppedError || error ? reject(stoppedError || error) : resolve(result!);
    };
    const request = httpRequest({
      protocol: target.protocol, hostname: target.hostname, port: target.port,
      path: `${target.pathname}${target.search}`, method,
      headers: { "content-type": contentType, ...(body ? { "content-length": String(body.length) } : {}), connection: "close" },
    }, upstream => {
      response = upstream;
      const chunks: Buffer[] = [];
      let bytes = 0;
      upstream.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > 30 * 1024 * 1024) { stop(jobError("upstream response exceeds 30MB", 502)); return; }
        chunks.push(Buffer.from(chunk));
      });
      upstream.on("end", () => finish(undefined, { status: upstream.statusCode || 502, contentType: String(upstream.headers["content-type"] || "application/json"), payload: Buffer.concat(chunks) }));
      upstream.on("error", error => finish(error));
      upstream.on("aborted", () => finish(jobError("upstream response was interrupted", 502)));
    });
    // A wall-clock deadline also covers a slow response body.
    const timer = setTimeout(() => stop(jobError(`upstream request timed out after ${upstreamTimeoutMs}ms`, 504)), upstreamTimeoutMs);
    request.on("error", error => { response?.destroy(); finish(error); });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    if (body) request.write(body);
    request.end();
  });
}

async function proxy(req: any, res: any, upstream: string, path: string, serialized: boolean, textRequest: boolean, signal: AbortSignal) {
  const receivedAt = Date.now();
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readRequestBody(req, signal, 30 * 1024 * 1024);
  const run = async (activeSignal = signal) => {
    checkAborted(activeSignal);
    const startedAt = Date.now();
    const response = await requestUpstream(`${upstream}${path}`, req.method, req.headers["content-type"] || "application/json", activeSignal, body);
    checkAborted(activeSignal);
    res.writeHead(response.status, {
      "content-type": response.contentType, "cache-control": "no-store",
      "x-local-ai-elapsed-ms": String(Date.now() - startedAt), "x-local-ai-queue-ms": String(startedAt - receivedAt),
      "x-local-ai-serialized": serialized ? "true" : "false",
      ...(response.status === 429 ? { "retry-after": "10" } : {}),
    });
    res.end(response.payload);
  };
  if (!serialized) return run();
  await queue.run(deadlineAt => textRequest ? withGpuLock(signal, deadlineAt, run) : run(), signal);
  // Image backends hold the same OS lock until their child actually exits,
  // including after disconnect. Taking that lock here would deadlock them.
}

const server = createServer(async (req, res) => {
  const cancellation = requestCancellation(req, res);
  try {
    const url = new URL(req.url || "/", "http://local-ai-gateway");
    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ ok: true, service: "local-ai-gateway", concurrency: 1, queue: queue.state, gpuLock: Boolean(process.env.LOCAL_AI_GPU_LOCK_DIR) }));
      return;
    }
    if (url.pathname.startsWith("/text/")) {
      await proxy(req, res, textBaseUrl, url.pathname.slice(5) + url.search, req.method === "POST", true, cancellation.signal);
      return;
    }
    if (url.pathname.startsWith("/image/")) {
      await proxy(req, res, imageBaseUrl, url.pathname.slice(6) + url.search, req.method === "POST", false, cancellation.signal);
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  } catch (error: any) {
    if (cancellation.signal.aborted || res.destroyed) return;
    console.error("[Local AI Gateway]", error.message);
    const status = error.status || 503;
    if (!res.headersSent) res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...(status === 429 ? { "retry-after": "10" } : {}) });
    res.end(JSON.stringify({ error: error?.message || String(error) }));
  } finally { cancellation.dispose(); }
});
server.headersTimeout = 30_000;
server.requestTimeout = 0; // Explicit body, queue and upstream deadlines above.
server.listen(port, "0.0.0.0", () => console.log(`Local AI gateway listening on :${port}`));
