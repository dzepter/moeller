import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { sseResponse } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/** SSE für den internen Chat-Arbeitsbereich (einzelne Unterhaltung oder Inbox). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "chat.manage")) {
    return new Response("Keine Berechtigung", { status: 403 });
  }
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversation");
  const channel = conversationId ? `chat:${conversationId}` : "chat:inbox";
  return sseResponse(channel, { signal: req.signal });
}
