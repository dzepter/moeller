import { describe, it, expect } from "vitest";
import { textToBlocks, blocksToText } from "@/server/academy/content";

describe("Academy-Textformat (No-Code-Editor)", () => {
  it("parst alle Blocktypen", () => {
    const text = [
      "[text]",
      "Ein Absatz.",
      "",
      "[schritte Erste Schritte]",
      "- Schritt eins",
      "- Schritt zwei",
      "",
      "[wichtig]",
      "Seite nicht neu laden!",
      "",
      "[merken]",
      "- Punkt A",
      "",
      "[beispiel]",
      "V-18111111",
      "",
      "[screenshot media123]",
      "Alt-Text des Bildes",
      ":: Eine Bildunterschrift",
    ].join("\n");

    const blocks = textToBlocks(text);
    expect(blocks).toEqual([
      { type: "intro", text: "Ein Absatz." },
      { type: "steps", title: "Erste Schritte", items: ["Schritt eins", "Schritt zwei"] },
      { type: "warning", text: "Seite nicht neu laden!" },
      { type: "remember", items: ["Punkt A"] },
      { type: "example", text: "V-18111111" },
      { type: "screenshot", mediaId: "media123", alt: "Alt-Text des Bildes", caption: "Eine Bildunterschrift" },
    ]);
  });

  it("Roundtrip: blocksToText → textToBlocks ist verlustfrei", () => {
    const blocks = [
      { type: "intro", text: "Hallo Welt" },
      { type: "steps", title: "Los", items: ["a", "b"] },
      { type: "screenshot", mediaId: "m1", alt: "Bild", caption: "Unterschrift" },
      { type: "warning", text: "Achtung" },
      { type: "remember", items: ["merken"] },
    ];
    expect(textToBlocks(blocksToText(blocks))).toEqual(blocks);
  });
});
