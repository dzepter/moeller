import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/archivo";
import "@fontsource-variable/archivo/wght-italic.css";
import "./globals.css";

// Inhalte kommen aus CMS/DB und müssen ohne Rebuild aktuell sein;
// außerdem darf der Docker-Build keine Datenbank benötigen.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: {
    default: "Möller GmbH – Beratungs- & Vertriebsgesellschaft",
    template: "%s | Möller GmbH",
  },
  description:
    "Menschen, die Marken am PoS voranbringen. Seit über 15 Jahren als Möller GmbH – Promotion, Vertrieb und dauerhafte PoS-Betreuung in NRW, Hessen, Rheinland-Pfalz und Bayern.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
