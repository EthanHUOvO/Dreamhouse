import { getBambuPrinterService } from "@/lib/execution/BambuPrinterService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let unsubscribe = () => undefined;
  const stream = new ReadableStream({
    start(controller) {
      const send = (value: unknown) => controller.enqueue(encoder.encode(`event: printer\ndata: ${JSON.stringify(value)}\n\n`));
      void getBambuPrinterService().getStatus().then(send);
      unsubscribe = getBambuPrinterService().subscribe(send);
      request.signal.addEventListener("abort", () => { unsubscribe(); try { controller.close(); } catch {} }, { once: true });
    },
    cancel() { unsubscribe(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
