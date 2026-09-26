import { cookies } from "next/headers";
import { getVisitorConversation } from "@/server/chat";
import { sseResponse } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/** SSE-Stream für die eigene Unterhaltung des Besuchers. */
export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get("chat_token")?.value;
  if (!token) return new Response("Keine Unterhaltung", { status: 404 });
  const conversation = await getVisitorConversation(token);
  if (!conversation) return new Response("Keine Unterhaltung", { status: 404 });
  return sseResponse(`chat:${conversation.id}`, { signal: req.signal });
}
