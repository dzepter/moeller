import { describe, it, expect } from "vitest";
import { runGoLiveChecks } from "@/server/golive";

describe("Punkt 6: Go-Live-Check erkennt Rechtstext-Platzhalter als Blocker", () => {
  it("Impressum- und Datenschutz-Platzhalter sowie EMAIL_PROVIDER=log werden gemeldet", async () => {
    const findings = await runGoLiveChecks();
    const blockers = findings.filter((f) => f.level === "BLOCKER");
    const bereiche = blockers.map((f) => f.bereich);

    // Die Default-Rechtstexte enthalten bewusst [PLATZHALTER …]-Markierungen –
    // niemals erfundene Registerdaten. Beide müssen als Blocker auftauchen.
    expect(bereiche).toContain("Impressum");
    expect(bereiche).toContain("Datenschutzerklärung");
    // Testumgebung nutzt den Log-Mailer → ebenfalls Blocker
    expect(bereiche).toContain("E-Mail");

    // Kein Blocker erfindet Inhalte: die Meldung verlangt Angaben VOM BETREIBER
    const impressum = blockers.find((f) => f.bereich === "Impressum");
    expect(impressum?.text).toMatch(/Betreiber/);
  });
});
