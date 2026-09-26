import { describe, it, expect } from "vitest";
import { normalizePhone, normalizeEmail, plzToBundesland, slugify } from "@/lib/utils";
import { tooFast } from "@/lib/validation";

describe("normalizePhone", () => {
  it("normalisiert deutsche Formate auf E.164", () => {
    expect(normalizePhone("0170 123 45 67")).toBe("+491701234567");
    expect(normalizePhone("0049 170 1234567")).toBe("+491701234567");
    expect(normalizePhone("+49 (170) 123-4567")).toBe("+491701234567");
    expect(normalizePhone("06725/919350")).toBe("+496725919350");
  });
  it("erkennt identische Nummern in unterschiedlicher Schreibweise", () => {
    expect(normalizePhone("0170-1234567")).toBe(normalizePhone("+49 170 1234567"));
  });
});

describe("normalizeEmail", () => {
  it("trimmt und lowercased", () => {
    expect(normalizeEmail("  Max@Example.COM ")).toBe("max@example.com");
  });
});

describe("plzToBundesland (Offline-Näherung)", () => {
  it("ordnet Leitzonen den Einsatzregionen zu", () => {
    expect(plzToBundesland("50667")).toBe("NRW"); // Köln
    expect(plzToBundesland("60311")).toBe("HESSEN"); // Frankfurt
    expect(plzToBundesland("55435")).toBe("RHEINLAND_PFALZ"); // Gau-Algesheim
    expect(plzToBundesland("80331")).toBe("BAYERN"); // München
  });
  it("liefert null für unbekannte/ungültige PLZ", () => {
    expect(plzToBundesland("20095")).toBeNull(); // Hamburg – keine Einsatzregion
    expect(plzToBundesland("abc")).toBeNull();
  });
});

describe("slugify", () => {
  it("wandelt Umlaute und Sonderzeichen um", () => {
    expect(slugify("Promotor (m/w/d) Köln – Süd")).toBe("promotor-m-w-d-koeln-sued");
  });
});

describe("tooFast (Bot-Zeitfalle)", () => {
  it("erkennt zu schnelle Submissions", () => {
    expect(tooFast(String(Date.now()))).toBe(true);
    expect(tooFast(String(Date.now() - 10_000))).toBe(false);
    expect(tooFast(undefined)).toBe(false);
  });
});
