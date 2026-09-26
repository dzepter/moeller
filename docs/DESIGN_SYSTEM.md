# Designsystem – Möller GmbH

Stand: 2026-09-26 · Grundlage: bestehendes MÖLLER-Logo (kursiver Schriftzug, schräge Geometrie, Möller-Blau)

## 1. Haltung

Die Website soll wirken wie von einem guten Designstudio individuell konzipiert: **editorial, ruhig,
präzise, erwachsen** – nicht wie Baukasten, SaaS-Template oder KI-Standard. Leitmaxime (Masterprompt §48):
glaubwürdiger > dekorativer, klarer > lauter, Typografie > Effekte.

**Verboten** (§4): Blob-/Verlaufs-Hintergründe, Glassmorphism, schwebende Kartenraster,
Standard-Shadcn-Optik, mittiger Hero mit Stockfoto rechts, Scroll-Jacking, Icon-Wände,
Deko-Riesenzahlen, Fake-Testimonials, Emojis als UI.

## 2. Markenbezug: die schräge Geometrie

Das Logo ist ca. **12° kursiv** mit einem markanten schrägen Balken unter dem Schriftzug.
Daraus leitet sich EIN wiederkehrendes Motiv ab, sparsam eingesetzt:

- **Kantenschnitt:** ausgewählte Bildkanten und Sektionsübergänge laufen mit `clip-path` in einem
  flachen Winkel (~ -6°) aus – höchstens einmal pro Viewport, nie gestapelt.
- **Balken-Detail:** kurze, schräg angeschnittene Linie (`.brand-tick`) als Absender-Detail bei
  Überschriften-Eyebrows und im Footer.
- Alles andere bleibt orthogonal. Keine „Sport-Optik", kein visueller Zirkus.

## 3. Farben (Design Tokens, zentral änderbar)

Definiert als CSS Variables in `src/app/tokens.css`, verdrahtet mit Tailwind (`@theme`).
Zwei Blau-Töne aus den gelieferten Logo-Dateien; finale Abstimmung folgt später – deshalb tokenbasiert.

| Token | Wert | Rolle |
|---|---|---|
| `--color-brand` | `#2569C3` | Möller-Blau (Logo „blue"), CTAs, Akzente, Links |
| `--color-brand-deep` | `#1D4E8F` | Hover/Active, kräftige Flächen |
| `--color-ink` | `#16212E` | Dunkles Blaugrau: Headlines, dunkle Sektionen (statt Schwarz) |
| `--color-ink-soft` | `#3D4C5E` | Fließtext auf hell |
| `--color-paper` | `#FFFFFF` | Grundfläche |
| `--color-paper-warm` | `#F5F7FA` | Off-White für ruhige Wechselflächen |
| `--color-line` | `#D8DEE6` | Hairlines, Trenner |
| `--color-accent` | `#E8A33D` | EINZIGE Akzentfarbe (sparsam: Fokusmarker, kleine Hinweise) |
| `--color-positive` / `--color-danger` | `#2E7D4F` / `#B4382F` | Systemzustände (Formulare, Status) |

Kontrast: alle Text/Hintergrund-Kombinationen ≥ WCAG AA (geprüft im Token-File dokumentiert).
Information nie nur über Farbe (Status immer mit Text/Icon-Form).

## 4. Typografie

Lokal gehostet (Fontsource, SIL-OFL – lizenzkonform, kein Google-CDN):

- **Display: „Archivo" (Variable, inkl. Expanded/SemiExpanded)** – verwandt mit der kompakten,
  kraftvollen Anmutung des Logos. Headlines: 700–800, leicht negative Laufweite, `text-wrap: balance`.
- **Text: „Inter" (Variable)** – neutral, hervorragend lesbar, Zahlen tabellarisch für Admin-Tabellen.

Skala (fluid mit `clamp`): Display 44–76 · H1 36–56 · H2 28–40 · H3 22–26 · Lead 18–20 · Body 16–17 ·
Small 14 · Caption 12.5. Zeilenlänge Fließtext max. ~68ch. Eyebrow-Zeilen (Kicker) in 12.5px,
Versalien, +0.08em Tracking, mit `.brand-tick`.

## 5. Raster & Raum

- **12-Spalten-Grid**, max. Inhaltsbreite 1200px (`--container`), Seitenränder 20px mobil / 32px ab md.
- **Bewusst asymmetrisch:** Text-Spalten 5–7 Spalten breit, Bilder versetzt (nicht jede Sektion 50/50).
- Vertikaler Rhythmus: Sektionen 96–144px Außenabstand (mobil 64–80), Abstände aus 4px-Basis.
- Viel Luft; Trenner sind 1px-Hairlines, keine Schatten-Karten.

## 6. Komponenten-Sprache

- **Flächen statt Karten:** Inhalte gliedern sich durch Hairlines, Nummerierung (01/02/03) und
  Weißraum. Wo Karten nötig sind (Jobs), sind es ruhige, randlose Listenzeilen mit Hover-Unterstrich –
  keine schwebenden Schatten-Kacheln.
- **Buttons:** rechteckig mit 2px Radius, Primär = Brand-Fläche, Sekundär = 1.5px Ink-Outline,
  klare Focus-Ringe (2px Accent, 2px Offset). Hover: Farbe vertieft + Pfeil-Detail, keine Skalierung.
- **Bilder:** dokumentarische PoS-Fotografie, warm entwickelt, oft mit schrägem Anschnitt oben ODER
  unten. Duotone-Ink-Overlay nur auf dunklen Sektionen für Textkontrast.
- **Micro-Motion:** einzig erlaubt: 150–250ms Ease-out für Hover/Focus/Accordion + einmalige, dezente
  Eintritts-Transition des Heros. Alles unter `prefers-reduced-motion: reduce` deaktiviert.

## 7. Seitendramaturgie (öffentlich)

Start: typografischer Premium-Hero (großzügige Display-Zeile, PoS-Bild asymmetrisch mit Schrägschnitt,
zwei CTAs) → Vertrauensfakten als ruhige Zahlenzeile mit Hairlines (nicht animiert) → Jobfinder
(„Wo möchtest Du arbeiten?") als eigenständiges, formularhaftes Modul → Leistungen als 2–3 redaktionelle
Blöcke mit Bild + präzisen Leistungspunkten → „Arbeiten bei Möller" → Markus-Statement (großzügig,
persönlich, kein Zitatkasten) → 2–4 aktuelle Jobs als Listenzeilen → kuratierte Bildstrecke →
Kontaktband. Kein Abschnitt wiederholt das Layout des vorherigen.

## 8. Admin & Academy

Gleiche Token-Basis, aber nüchterner: dichte, tabellarische Layouts, linke Navigationsleiste,
Ink-auf-Paper, Brand nur für Primäraktionen und aktive Zustände. Academy: Mobile-First-Lesespalte
(max. 640px), große Touchflächen (min. 44px), zoombare Screenshots (`<dialog>`-Lightbox),
Merk-Boxen („Das musst Du Dir merken") und Warn-Boxen als klar unterscheidbare, unaufgeregte Muster.

## 9. Barrierefreiheit (Basisregeln)

Skip-Link, sichtbare Fokuszustände überall, semantische Landmarken, Formulare mit `<label>` +
`aria-describedby`-Fehlern, `<dialog>` mit korrektem Fokusmanagement, Kontraste ≥ AA,
Touch-Ziele ≥ 44px, `prefers-reduced-motion`.
