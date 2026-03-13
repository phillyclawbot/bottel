import {
  addSSEListener,
  removeSSEListener,
  ensureSimulation,
} from "@/lib/simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  ensureSimulation();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      const listener = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          removeSSEListener(listener);
        }
      };

      addSSEListener(listener);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
          removeSSEListener(listener);
        }
      }, 15000);
    },
    cancel() {
      // Cleanup happens via try/catch in listener
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
