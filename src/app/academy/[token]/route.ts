import { NextResponse, type NextRequest } from "next/server";
import { resolveInvitation } from "@/server/academy/service";
import { rateLimit, requestIpHash } from "@/lib/rate-limit";
import { env } from "@/lib/env";

/**
 * Magic-Link-Einstieg: Token prüfen, httpOnly-Cookie setzen, weiter zum Kurs.
 * (Route Handler, weil Cookies nur hier gesetzt werden dürfen.)
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const rl = await rateLimit({
    key: `academy:${requestIpHash(req.headers)}`,
    limit: 20,
    windowSeconds: 900,
    blockSeconds: 900,
  });

  // Redirect-Ziel aus dem Request-Host bauen (nicht aus dem Server-Bind-Host),
  // sonst verliert der Browser das soeben gesetzte Host-Cookie.
  const host = req.headers.get("host") ?? new URL(env.baseUrl).host;
  const proto = req.headers.get("x-forwarded-proto") ?? (env.isProd ? "https" : "http");
  const dest = (path: string) => `${proto}://${host}${path}`;

  if (rl.ok && token.length >= 20 && token.length <= 100) {
    const invitation = await resolveInvitation(token);
    if (invitation) {
      const res = NextResponse.redirect(dest("/academy/kurs"));
      res.cookies.set("academy_token", token, {
        httpOnly: true,
        secure: env.isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 60,
      });
      return res;
    }
  }
  return NextResponse.redirect(dest("/academy/link-ungueltig"));
}
