import { describe, it, expect } from "vitest";
import { parseUtmParams, hasUtm } from "@/lib/utm";

describe("M (Parser): UTM-Parameter aus der URL", () => {
  it("liest utm_source/utm_medium/utm_campaign", () => {
    const p = parseUtmParams("?utm_source=instagram&utm_medium=cpc&utm_campaign=herbst-2026");
    expect(p).toEqual({ utmSource: "instagram", utmMedium: "cpc", utmCampaign: "herbst-2026" });
    expect(hasUtm(p)).toBe(true);
  });

  it("funktioniert mit und ohne führendes Fragezeichen und ignoriert fremde Parameter", () => {
    expect(parseUtmParams("utm_source=a&x=1")).toEqual({ utmSource: "a" });
    expect(parseUtmParams("?bundesland=NRW")).toEqual({});
    expect(hasUtm(parseUtmParams(""))).toBe(false);
  });

  it("kürzt überlange Werte auf 100 Zeichen und verwirft leere", () => {
    const long = "x".repeat(250);
    const p = parseUtmParams(`?utm_source=${long}&utm_medium=%20%20`);
    expect(p.utmSource).toHaveLength(100);
    expect(p.utmMedium).toBeUndefined();
  });
});
