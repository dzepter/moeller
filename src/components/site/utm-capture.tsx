"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { rememberUtm } from "@/lib/utm";

/**
 * Merkt UTM-Parameter der Einstiegs-URL für diesen Tab (sessionStorage),
 * damit sie auch nach interner Navigation (Startseite → Stellendetail)
 * beim Absenden der Bewerbung noch zur Verfügung stehen. Kein Cookie,
 * keine Übertragung – nur ein lokaler Zwischenspeicher bis zum Absenden.
 */
export function UtmCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    rememberUtm(searchParams.toString());
  }, [searchParams]);
  return null;
}
