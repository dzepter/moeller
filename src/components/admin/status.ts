import type { AutoStatus, ManualStatus } from "@prisma/client";

/** Anzeige-Helfer für den effektiven Bewerbungsstatus. */

export const MANUAL_STATUS_LABEL: Record<ManualStatus, string> = {
  INTERESSENTENGESPRAECH_VEREINBART: "Interessentengespräch vereinbart",
  INTERESSENTENGESPRAECH_DURCHGEFUEHRT: "Interessentengespräch durchgeführt",
  SCHNUPPERTAG_VEREINBART: "Schnuppertag vereinbart",
  SCHNUPPERTAG_DURCHGEFUEHRT: "Schnuppertag durchgeführt",
  VERTRAGSGESPRAECH_VEREINBART: "Vertragsgespräch vereinbart",
  VERTRAGSGESPRAECH_DURCHGEFUEHRT: "Vertragsgespräch durchgeführt",
  ZUSAGE: "Zusage",
  ABSAGE: "Absage",
};

export const AUTO_STATUS_LABEL: Record<AutoStatus, string> = {
  NEU: "Neu",
  OFFEN: "Offen",
};

type StatusShape = { autoStatus: AutoStatus; manualStatus: ManualStatus | null };

export function statusLabel(app: StatusShape): string {
  return app.manualStatus ? MANUAL_STATUS_LABEL[app.manualStatus] : AUTO_STATUS_LABEL[app.autoStatus];
}

export function statusTone(app: StatusShape): "neutral" | "blue" | "green" | "red" | "yellow" | "ink" {
  if (!app.manualStatus) return app.autoStatus === "NEU" ? "blue" : "yellow";
  switch (app.manualStatus) {
    case "ZUSAGE":
      return "green";
    case "ABSAGE":
      return "red";
    default:
      return "ink";
  }
}

export const REFERRAL_STATUS_LABEL: Record<string, string> = {
  EMPFEHLUNG_NEU: "Empfehlung neu",
  KONTAKT_AUSSTEHEND: "Kontakt ausstehend",
  KONTAKTIERT: "Kontaktiert",
  INTERESSE: "Interesse",
  KEIN_INTERESSE: "Kein Interesse",
  IN_BEWERBUNG_UEBERNOMMEN: "In Bewerbung übernommen",
};
