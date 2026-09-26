import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/** QR-Code-Erzeugung – nur für eigene Pfade (kein offener Generator). */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 200) {
    return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
  }
  const png = await QRCode.toBuffer(`${env.baseUrl}${path}`, {
    width: 360,
    margin: 1,
    color: { dark: "#16212E", light: "#FFFFFF" },
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
