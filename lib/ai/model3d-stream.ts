// Shared by the browser and regression tests. Every successful stream must end
// in an explicit terminal event; EOF alone cannot complete a generation task.
export async function consumeModel3dSse(response: Response, onEvent: (type: string, data: any) => void, options: { signal?: AbortSignal; idleTimeoutMs?: number } = {}) {
  if (!response.ok || !response.body) throw new Error((await response.text()) || `3D生成服务返回 ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      options.signal?.throwIfAborted();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let abort = () => {};
      const interrupted = new Promise<never>((_, reject) => {
        abort = () => reject(options.signal?.reason || new DOMException("Generation cancelled", "AbortError"));
        options.signal?.addEventListener("abort", abort, { once: true });
        timer = setTimeout(() => reject(new Error("3D生成连接长时间没有响应，请重试")), options.idleTimeoutMs || 90_000);
      });
      let result: ReadableStreamReadResult<Uint8Array>;
      try { result = await Promise.race([reader.read(), interrupted]); }
      finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); }
      options.signal?.throwIfAborted();
      buffer += decoder.decode(result.value || new Uint8Array(), { stream: !result.done });
      let boundary = /\r?\n\r?\n/.exec(buffer);
      while (boundary) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const lines = frame.split(/\r?\n/);
        const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
        const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (data) {
          onEvent(event, JSON.parse(data));
          if (["complete", "fallback", "error"].includes(event)) return;
        }
        boundary = /\r?\n\r?\n/.exec(buffer);
      }
      if (result.done) throw new Error("3D生成连接已结束，但没有返回完整结果，请重试");
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
