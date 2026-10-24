import { getRobotMonitorAdapter } from "@/lib/execution/RobotMonitorAdapter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let refreshing = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const adapter = getRobotMonitorAdapter();
      const push = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(adapter.getCachedStatus())}\n\n`));
        } catch { /* the client closed while an update was being prepared */ }
      };
      const refresh = async () => {
        if (closed || refreshing) return;
        refreshing = true;
        try {
          await adapter.getStatus(true);
          push();
        } catch { /* the next tick retries without taking down the stream */ }
        finally { refreshing = false; }
      };
      push();
      void refresh();
      timer = setInterval(() => void refresh(), 3000);
      request.signal.addEventListener("abort", () => {
        closed = true;
        if (timer) clearInterval(timer);
        try { controller.close(); } catch { /* already closed by the browser */ }
      }, { once: true });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
}
