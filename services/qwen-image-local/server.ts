import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JobQueue, checkAborted, imageSize, jobError, readRequestBody, requestCancellation, runImageProcess, withGpuLock } from "../local-ai-runtime.ts";

const port = Number(process.env.LOCAL_IMAGE_PORT || 8200);
const binary = process.env.SD_CPP_BIN || "/usr/local/bin/sd-cli";
const diffusionModel = process.env.SD_DIFFUSION_MODEL || "/models/z_image_turbo-Q8_0.gguf";
const textEncoder = process.env.SD_TEXT_ENCODER || "/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf";
const vae = process.env.SD_VAE || "/models/ae.safetensors";
const outputDirectory = process.env.GENERATED_IMAGE_DIR || "/data/generated";
const temporaryDirectory = process.env.SD_TMP_DIR || "/tmp/sd-image-jobs";
const timeoutMs = Number(process.env.SD_JOB_TIMEOUT_MS || 1_800_000);
const queue = new JobQueue();

function json(res: any, status: number, value: unknown) {
  if (res.destroyed) return;
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}
async function generate(body: any, signal: AbortSignal, receivedAt: number, deadlineAt: number) {
  checkAborted(signal);
  if (!String(body.prompt || "").trim()) throw jobError("prompt is required", 400);
  const [width, height] = imageSize(body.size);
  const steps = Number(body.steps) || 8;
  if (!Number.isInteger(steps) || steps < 1 || steps > 60) throw jobError("steps must be an integer between 1 and 60", 400);
  const id = randomUUID(), dir = join(temporaryDirectory, id); await mkdir(dir, { recursive: true }); await mkdir(outputDirectory, { recursive: true });
  const outputName = `${id}.png`; const outputPath = join(outputDirectory, outputName);
  try {
    const args = ["--diffusion-model", diffusionModel, "--vae", vae, "--llm", textEncoder, "-p", String(body.prompt), "--cfg-scale", String(Number(body.guidanceScale) || 1), "--steps", String(steps), "-H", String(height), "-W", String(width), "-o", outputPath, "--diffusion-fa", "--mmap"];
    // This machine has a verified RADV VAE-encode GPU hang. The VAE can be
    // assigned to CPU while the expensive diffusion transformer stays on GPU.
    if (process.env.SD_VAE_BACKEND) args.push("--backend", `vae=${process.env.SD_VAE_BACKEND}`);
    const sourceImage = Array.isArray(body.images) ? body.images.find((value: unknown) => typeof value === "string" && value.startsWith("data:image/")) : undefined;
    if (sourceImage) {
      const match = String(sourceImage).match(/^data:image\/[^;]+;base64,(.*)$/s);
      if (!match) throw jobError("invalid source image data URL", 400);
      const initPath = join(dir, "init-image");
      await writeFile(initPath, Buffer.from(match[1], "base64"));
      const defaultStrength = String(body.mode || "") === "floorplan-edit" ? 0.2 : 0.28;
      const editStrength = Number(body.strength ?? process.env.SD_IMAGE_STRENGTH ?? defaultStrength);
      if (!Number.isFinite(editStrength) || editStrength < 0.05 || editStrength > 1) throw jobError("image strength must be between 0.05 and 1", 400);
      args.push("--init-img", initPath, "--strength", String(editStrength), "--img-cfg-scale", "1");
    }
    if (body.negativePrompt) args.push("--negative-prompt", String(body.negativePrompt));
    if (Number.isInteger(body.seed)) args.push("--seed", String(body.seed));
    const startedAt = Date.now();
    const remainingMs = deadlineAt - startedAt;
    if (remainingMs <= 0) throw jobError("image job deadline exceeded while queued", 504);
    const logs = await runImageProcess(binary, args, signal, remainingMs);
    checkAborted(signal);
    const details = await stat(outputPath);
    return { requestId: id, model: "Z-Image-Turbo", url: `/api/generated-images/${outputName}`, width, height, elapsedMs: Date.now() - receivedAt, usage: { backend: "stable-diffusion.cpp-vulkan", steps, bytes: details.size, queueMs: startedAt - receivedAt, processMs: Date.now() - startedAt, resident: false }, logs: process.env.LOCAL_AI_DEBUG === "true" ? logs : undefined };
  } catch (error) { await rm(outputPath, { force: true }).catch(() => undefined); throw error;
  } finally { await rm(dir, { recursive: true, force: true }).catch(() => undefined); }
}
async function health() {
  const files = [diffusionModel, textEncoder, vae]; const missingModelFiles: string[] = [];
  await Promise.all(files.map(async f => { try { const s = await stat(f); if (!s.isFile() || s.size === 0) missingModelFiles.push(f); } catch { missingModelFiles.push(f); } }));
  const binaryReady = await access(binary, constants.X_OK).then(() => true, () => false); const dev = "/dev/dri/renderD128"; const deviceAccessible = await access(dev, constants.R_OK | constants.W_OK).then(() => true, () => false);
  return { ok: binaryReady && deviceAccessible && missingModelFiles.length === 0, service: "stable-diffusion.cpp", model: "Z-Image-Turbo", backend: "vulkan", binary, binaryReady, models: { diffusionModel, textEncoder, vae, missingModelFiles }, vulkanDevice: dev, vulkanDeviceAccessible: deviceAccessible, queue: queue.state, gpuLock: Boolean(process.env.LOCAL_AI_GPU_LOCK_DIR), resident: false, vaeBackend: process.env.SD_VAE_BACKEND || "vulkan" };
}
const server = createServer(async (req, res) => {
  const cancellation = requestCancellation(req, res), receivedAt = Date.now();
  try { if (req.method === "GET" && req.url === "/health") { const s = await health(); json(res, s.ok ? 200 : 503, s); return; }
    if (req.method !== "POST" || req.url !== "/v1/images/generations") { json(res, 404, { error: "not found" }); return; }
    let body: any;
    try { body = JSON.parse((await readRequestBody(req, cancellation.signal, 25 * 1024 * 1024)).toString("utf8") || "{}"); }
    catch (error: any) { throw error instanceof SyntaxError ? jobError("invalid JSON body", 400) : error; }
    const deadlineAt = receivedAt + timeoutMs;
    const result = await queue.run(queueDeadline => withGpuLock(cancellation.signal, Math.min(queueDeadline, deadlineAt), activeSignal => generate(body, activeSignal, receivedAt, deadlineAt)), cancellation.signal);
    json(res, 200, result);
  } catch (e: any) { if (!cancellation.signal.aborted && !res.destroyed) { console.error("[stable-diffusion.cpp]", e.message); json(res, e.status || 503, { error: e?.message || String(e) }); } }
  finally { cancellation.dispose(); }
});
server.headersTimeout = 30_000;
server.requestTimeout = 0;
server.listen(port, "0.0.0.0", () => console.log(`stable-diffusion.cpp Vulkan service listening on :${port}`));
