import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { generateToken } from "@/lib/crypto";
import { getVisitorConversation, startOrPostMessage } from "@/server/chat";
import { isWithinBusinessHours } from "@/lib/settings";
import { rateLimit, requestIpHash } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const CHAT_COOKIE = "chat_token";

const postSchema = z.object({
  body: z.string().min(1).max(2000),
  name: z.string().max(120).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  topic: z.string().max(60).optional(),
  website: z.string().max(0).optional(), // Honeypot
});

export async function GET() {
  const store = await cookies();
  const token = store.get(CHAT_COOKIE)?.value;
  const open = await isWithinBusinessHours();
  if (!token) return NextResponse.json({ open, conversation: null });
  const conversation = await getVisitorConversation(token);
  return NextResponse.json({
    open,
    conversation: conversation
      ? {
          id: conversation.id,
          status: conversation.status,
          messages: conversation.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const ipHash = requestIpHash(req.headers);
  const rl = await rateLimit({ key: `chat:${ipHash}`, limit: 30, windowSeconds: 600, blockSeconds: 600 });
  if (!rl.ok) return NextResponse.json({ error: "Zu viele Nachrichten. Bitte versuch es später erneut." }, { status: 429 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true }); // Honeypot: still schlucken

  const store = await cookies();
  let token = store.get(CHAT_COOKIE)?.value;
  const isNewToken = !token;
  if (!token) token = generateToken();

  const result = await startOrPostMessage({
    visitorToken: token,
    body: parsed.data.body,
    name: parsed.data.name,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone,
    topic: parsed.data.topic,
  });

  const res = NextResponse.json({ ok: true, conversationId: result.conversationId, offline: result.offline });
  if (isNewToken) {
    res.cookies.set(CHAT_COOKIE, token, {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
