import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next-16-Nachfolger der Middleware): reicht den angefragten Pfad als
 * Request-Header an Server-Layouts weiter. Das Admin-Layout nutzt ihn für das
 * zentrale MFA-Pflicht-Gate (Administratoren ohne eingerichtete MFA erreichen
 * ausschließlich die Einrichtungsseite). Keine Auth-Logik hier: Sessions sind
 * DB-gestützt und werden serverseitig in Layouts/Actions geprüft.
 */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/admin/:path*"] };
