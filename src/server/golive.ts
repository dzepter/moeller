import { env } from "@/lib/env";
import { getPublishedContent } from "@/server/cms";

/**
 * Go-Live-Check: erkennt Zustände, mit denen die Plattform nicht produktiv
 * gehen darf (Blocker) oder die vor dem Start bewusst entschieden sein müssen
 * (Warnungen). Rechtstexte werden NIE automatisch befüllt – die echten Angaben
 * (Geschäftsführung, Registergericht, HRB, USt-ID, Datenschutzerklärung)
 * liefert der Betreiber und pflegt sie über das CMS ein.
 */

export type GoLiveFinding = {
  level: "BLOCKER" | "WARNUNG";
  bereich: string;
  text: string;
};

const PLACEHOLDER_MARKER = "[PLATZHALTER";

function scanContentForPlaceholders(content: unknown): boolean {
  return JSON.stringify(content ?? "").includes(PLACEHOLDER_MARKER);
}

/** Sichtbaren Text eines Rechtstext-Bodys grob normalisieren (Markdown-Zeichen raus). */
function plainText(body: unknown): string {
  return String(body ?? "").replace(/[#>*_`\-]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Rechtstexte: rein TECHNISCHE Vollständigkeitsprüfung. Es wird nie Inhalt
 * erfunden und nicht behauptet, ein Text sei juristisch geprüft – geprüft
 * wird nur, dass die Seite existiert, nicht leer/ausgehöhlt ist, keine
 * Platzhaltermarker mehr trägt und (beim Impressum) die vorgesehenen
 * Pflichtbausteine überhaupt vorhanden sind.
 */
async function checkLegalPage(
  slug: "impressum" | "datenschutz",
  name: string,
  minLength: number,
  findings: GoLiveFinding[],
): Promise<void> {
  const content = await getPublishedContent(slug);
  const body = plainText((content.inhalt as Record<string, unknown> | undefined)?.body);

  if (scanContentForPlaceholders(content)) {
    findings.push({
      level: "BLOCKER",
      bereich: name,
      text: `Der veröffentlichte Text enthält noch „${PLACEHOLDER_MARKER} …“-Markierungen. Echte Angaben (z. B. Geschäftsführung, Registergericht, HRB, USt-ID) müssen vom Betreiber geliefert und unter Website → ${name} eingepflegt werden.`,
    });
  }
  if (body.length < minLength) {
    // Auch das bloße Löschen der Platzhalter darf den Blocker nicht auflösen:
    // ein leerer oder ausgehöhlter Rechtstext ist genauso wenig freigabefähig.
    findings.push({
      level: "BLOCKER",
      bereich: name,
      text: `Der veröffentlichte Text ist leer oder offensichtlich unvollständig (${body.length} Zeichen). Der vollständige, vom Betreiber gelieferte Rechtstext muss unter Website → ${name} eingepflegt werden.`,
    });
  }
  if (slug === "impressum" && body.length > 0) {
    const bausteine: Array<[RegExp, string]> = [
      [/vertret/i, "Vertretungsberechtigte Geschäftsführung („Vertreten durch“)"],
      [/register/i, "Registereintrag (Registergericht + Nummer)"],
      [/umsatzsteuer|ust[-\s]?id/i, "Umsatzsteuer-ID"],
    ];
    for (const [pattern, label] of bausteine) {
      if (!pattern.test(body)) {
        findings.push({
          level: "BLOCKER",
          bereich: name,
          text: `Pflichtbaustein fehlt im veröffentlichten Text: ${label}. Die echten Angaben liefert der Betreiber – es wird nichts automatisch befüllt.`,
        });
      }
    }
  }
}

export async function runGoLiveChecks(): Promise<GoLiveFinding[]> {
  const findings: GoLiveFinding[] = [];

  await checkLegalPage("impressum", "Impressum", 150, findings);
  await checkLegalPage("datenschutz", "Datenschutzerklärung", 300, findings);

  // Konfiguration, ohne die der Betrieb erkennbar unvollständig ist.
  if (env.email.provider === "log") {
    findings.push({
      level: "BLOCKER",
      bereich: "E-Mail",
      text: "EMAIL_PROVIDER=log – es wird keine einzige E-Mail versendet (Eingangsbestätigungen, Magic-Links, Passwort-Reset). Für den Livegang SMTP konfigurieren.",
    });
  }
  if (env.baseUrl.includes("localhost")) {
    findings.push({
      level: "BLOCKER",
      bereich: "Basis-URL",
      text: "APP_BASE_URL zeigt auf localhost – Links in E-Mails, Sitemap und Academy-Einladungen wären unbrauchbar.",
    });
  }
  if (env.rateLimitDisabled) {
    findings.push({
      level: "BLOCKER",
      bereich: "Rate-Limits",
      text: "RATE_LIMIT_DISABLED=true ist gesetzt – sämtliche Rate-Limits (inkl. Login-Schutz) sind aus. Nur für automatisierte Tests zulässig.",
    });
  }
  if (env.malwareScanner.provider === "none") {
    findings.push({
      level: "WARNUNG",
      bereich: "Upload-Scan",
      text: "Es ist kein Malware-Scanner konfiguriert (MALWARE_SCANNER=none): Bewerber-Uploads werden NICHT auf Schadsoftware geprüft. Entweder ClamAV anbinden (MALWARE_SCANNER=clamav) oder dieses Restrisiko bewusst akzeptieren.",
    });
  }

  return findings;
}

/** Für den Serverstart: protokolliert Blocker laut, wirft aber nicht (Inhalte sind zur Laufzeit über das CMS korrigierbar). */
export async function logGoLiveChecksAtStartup(): Promise<void> {
  try {
    const findings = await runGoLiveChecks();
    for (const f of findings) {
      const line = `[go-live] ${f.level}: ${f.bereich} – ${f.text}`;
      if (f.level === "BLOCKER") console.error("⛔ " + line);
      else console.warn("⚠️  " + line);
    }
    if (findings.some((f) => f.level === "BLOCKER")) {
      console.error("⛔ [go-live] Diese Instanz ist NICHT freigabefähig. Details: Admin → Einstellungen → Go-Live-Check.");
    }
  } catch (err) {
    console.warn("[go-live] Prüfung beim Start nicht möglich:", err instanceof Error ? err.message : err);
  }
}
