import { requestInteriorRender } from "../lib/ai/interior-request";

export async function generateInterior(input: {
  image: string;
  prompt: string;
  styleId: string;
  roomId?: string;
  roomType?: string;
  roomName?: string;
  captureId: string;
  camera?: unknown;
  sessionId: string;
  sceneRevision: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  fresh?: boolean;
}) {
  if (!input.prompt?.trim()) throw new Error("装修生成需要有效的装修风格和提示词");
  return requestInteriorRender({
    sourceImage: input.image,
    styleId: input.styleId,
    roomId: input.roomId,
    roomType: input.roomType,
    roomName: input.roomName,
    captureId: input.captureId,
    camera: input.camera,
    sessionId: input.sessionId,
    sceneRevision: input.sceneRevision,
    fresh: input.fresh,
  }, { signal: input.signal, timeoutMs: input.timeoutMs });
}
