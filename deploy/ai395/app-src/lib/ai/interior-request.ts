/** Shared transport checks for a render of one saved camera capture. */
export type InteriorRenderIdentity = {
  sessionId: string;
  sceneRevision: number;
  captureId: string;
  styleId: string;
};

export type InteriorRenderRequest = InteriorRenderIdentity & {
  sourceImage: string;
  roomId?: string;
  roomType?: string;
  roomName?: string;
  camera?: unknown;
  fresh?: boolean;
};

export type InteriorGeneratedImage = {
  url: string;
  provider: string;
  model: string;
  requestId: string;
  fallback?: boolean;
  [key: string]: unknown;
};

export class InteriorRequestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "InteriorRequestError";
    this.status = status;
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function identityString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 256)
    throw new InteriorRequestError(`INVALID_${field.toUpperCase()}`);
  return value;
}

function imagePayload(value: string) {
  return /^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value)?.[1];
}

export function validateInteriorRenderRequest(value: unknown): InteriorRenderRequest {
  const input = record(value);
  if (!input) throw new InteriorRequestError("INVALID_RENDER_REQUEST");
  const sourceImage = input.sourceImage ?? input.screenshotDataUrl;
  if (typeof sourceImage !== "string" || sourceImage.length < 1000 || !imagePayload(sourceImage))
    throw new InteriorRequestError("SOURCE_IMAGE_INVALID：请重新拍摄有效视角图片");
  if (sourceImage.length > 14_000_000)
    throw new InteriorRequestError("SOURCE_IMAGE_TOO_LARGE", 413);
  if (!Number.isSafeInteger(input.sceneRevision) || Number(input.sceneRevision) < 1)
    throw new InteriorRequestError("INVALID_SCENE_REVISION");
  if (input.fresh !== undefined && typeof input.fresh !== "boolean")
    throw new InteriorRequestError("INVALID_FRESH_FLAG");
  return {
    sourceImage,
    sessionId: identityString(input.sessionId, "sessionId"),
    captureId: identityString(input.captureId, "captureId"),
    styleId: identityString(input.styleId, "styleId"),
    sceneRevision: Number(input.sceneRevision),
    roomId: typeof input.roomId === "string" ? input.roomId : undefined,
    roomType: typeof input.roomType === "string" ? input.roomType : undefined,
    roomName: typeof input.roomName === "string" ? input.roomName : undefined,
    camera: input.camera,
    fresh: input.fresh === true,
  };
}

export function assertInteriorGeneratedImage(value: unknown, sourceImage: string): asserts value is InteriorGeneratedImage {
  const image = record(value);
  if (!image || image.fallback || image.provider === "mock" || image.provider === "preset")
    throw new InteriorRequestError("装修生成失败，原视角仍被保留，请重新生成。", 502);
  const url = image.url;
  if (typeof url !== "string" || !url.trim() ||
      !(url.startsWith("/api/generated-images/") || imagePayload(url) || /^https?:\/\//i.test(url)))
    throw new InteriorRequestError("装修服务未返回有效图片。", 502);
  const originalPayload = imagePayload(sourceImage)?.replace(/=+$/, "");
  const generatedPayload = imagePayload(url)?.replace(/=+$/, "");
  if (url === sourceImage || (originalPayload && generatedPayload === originalPayload))
    throw new InteriorRequestError("装修服务返回了原视角，未生成新的效果。", 422);
  if (typeof image.provider !== "string" || !image.provider.trim() ||
      typeof image.model !== "string" || !image.model.trim() ||
      typeof image.requestId !== "string" || !image.requestId.trim())
    throw new InteriorRequestError("装修服务返回结果缺少模型或请求标识。", 502);
}

export function validateInteriorRenderResponse(value: unknown, request: InteriorRenderRequest) {
  const data = record(value);
  if (!data || data.sessionId !== request.sessionId || data.captureId !== request.captureId ||
      data.styleId !== request.styleId || data.sourceSceneRevision !== request.sceneRevision)
    throw new InteriorRequestError("装修结果与当前视角、风格或场景版本不匹配。", 502);
  assertInteriorGeneratedImage(data.image, request.sourceImage);
  return data as Record<string, unknown> & { image: InteriorGeneratedImage };
}

export async function generateInteriorResponse(
  request: InteriorRenderRequest,
  signal: AbortSignal,
  generate: (request: InteriorRenderRequest, signal: AbortSignal) => Promise<unknown>,
) {
  signal.throwIfAborted();
  const image = await generate(request, signal);
  signal.throwIfAborted();
  assertInteriorGeneratedImage(image, request.sourceImage);
  return {
    sessionId: request.sessionId,
    sourceSceneRevision: request.sceneRevision,
    roomId: request.roomId,
    roomName: request.roomName,
    captureId: request.captureId,
    camera: request.camera,
    styleId: request.styleId,
    image,
  };
}

// Fetch resolving its headers is not completion. A stalled JSON stream must
// remain within the same deadline and close the same upstream request.
export async function requestInteriorRender(
  request: InteriorRenderRequest,
  options: { signal?: AbortSignal; timeoutMs?: number; fetcher?: typeof fetch } = {},
) {
  const validated = validateInteriorRenderRequest(request);
  const timeoutMs = options.timeoutMs ?? 600_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 1_800_000)
    throw new InteriorRequestError("INVALID_RENDER_TIMEOUT");
  options.signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason || new DOMException("装修请求已取消", "AbortError"));
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("装修生成等待超时，请重新生成。", "TimeoutError")), timeoutMs);
  let cancelListener: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    cancelListener = () => reject(controller.signal.reason);
    controller.signal.addEventListener("abort", cancelListener, { once: true });
  });
  try {
    const operation = async () => {
      controller.signal.throwIfAborted();
      const response = await (options.fetcher || fetch)("/api/ai/render-view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
        signal: controller.signal,
        cache: "no-store",
      });
      controller.signal.throwIfAborted();
      let data: unknown;
      try { data = await response.json(); }
      catch (error) {
        controller.signal.throwIfAborted();
        throw new InteriorRequestError("装修服务返回了无效响应。", response.ok ? 502 : response.status);
      }
      controller.signal.throwIfAborted();
      if (!response.ok) {
        const message = record(data)?.error;
        throw new InteriorRequestError(typeof message === "string" ? message : "装修效果暂时没有生成完成", response.status);
      }
      return validateInteriorRenderResponse(data, validated);
    };
    // No automatic POST retry: even a failed network response may have already
    // started generation. Only an explicit user action starts another job.
    return await Promise.race([operation(), cancelled]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    if (cancelListener) controller.signal.removeEventListener("abort", cancelListener);
  }
}
