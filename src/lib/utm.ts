/**
 * UTM-Erfassung für den Bewerbungsflow – bewusst ohne Cookies:
 * Die Parameter der Einstiegs-URL werden clientseitig in sessionStorage
 * gehalten (nur dieser Tab, endet mit der Sitzung, verlässt den Browser nie)
 * und beim Absenden als normale Formularfelder mitgeschickt. Gespeichert wird
 * ausschließlich an der Application (utmSource/-Medium/-Campaign).
 */

export type UtmParams = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

const STORAGE_KEY = "moeller.utm";
const MAX_LEN = 100;

const clean = (v: string | null): string | undefined => {
  const t = v?.trim().slice(0, MAX_LEN);
  return t ? t : undefined;
};

/** Reine Funktion: liest utm_source/utm_medium/utm_campaign aus einem Query-String. */
export function parseUtmParams(search: string): UtmParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const result: UtmParams = {};
  const source = clean(params.get("utm_source"));
  const medium = clean(params.get("utm_medium"));
  const campaign = clean(params.get("utm_campaign"));
  if (source) result.utmSource = source;
  if (medium) result.utmMedium = medium;
  if (campaign) result.utmCampaign = campaign;
  return result;
}

export function hasUtm(p: UtmParams): boolean {
  return Boolean(p.utmSource || p.utmMedium || p.utmCampaign);
}

/** Beim Seitenaufruf: vorhandene UTM-Parameter für den Tab merken (First-Touch gewinnt). */
export function rememberUtm(search: string): void {
  try {
    const parsed = parseUtmParams(search);
    if (!hasUtm(parsed)) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return; // Einstiegs-Kampagne behalten
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Storage nicht verfügbar (z. B. blockiert) → UTM entfällt einfach
  }
}

/** Beim Formular: aktuelle URL gewinnt, sonst der gemerkte Einstieg. */
export function recallUtm(search: string): UtmParams {
  const current = parseUtmParams(search);
  if (hasUtm(current)) return current;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as UtmParams;
    return {
      ...(clean(parsed.utmSource ?? null) ? { utmSource: clean(parsed.utmSource ?? null) } : {}),
      ...(clean(parsed.utmMedium ?? null) ? { utmMedium: clean(parsed.utmMedium ?? null) } : {}),
      ...(clean(parsed.utmCampaign ?? null) ? { utmCampaign: clean(parsed.utmCampaign ?? null) } : {}),
    };
  } catch {
    return {};
  }
}
