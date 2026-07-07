import { NextRequest, NextResponse } from "next/server";
import { EventEmitter } from "events";
import { getSessionUser } from "../../../lib/auth";

const globalForEmitter = global as unknown as { notesEmitter: EventEmitter };
export const notesEmitter = globalForEmitter.notesEmitter || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.notesEmitter = notesEmitter;
}

notesEmitter.setMaxListeners(100);

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUser();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const responseStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: ping\n\n"));

        const handleUpdate = (event: { userId: string; type: string }) => {
          if (event.userId === userId) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: event.type })}\n\n`)
            );
          }
        };

        notesEmitter.on("update", handleUpdate);

        request.signal.addEventListener("abort", () => {
          notesEmitter.off("update", handleUpdate);
          controller.close();
        });
      },
    });

    return new NextResponse(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new NextResponse((error as Error).message, { status: 500 });
  }
}
