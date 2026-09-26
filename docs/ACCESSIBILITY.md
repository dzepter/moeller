# Barrierefreiheit – Teststrategie & manuelle WCAG-2.2-AA-Checkliste

Stand: Hardening-Durchgang nach externer Review.

## Ehrliche Aussage zur Testabdeckung

**Automatisiert (axe-core via Playwright, `e2e/a11y.ts`):**

- Geprüfte Regel-Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa` –
  also alle Regeln, die axe-core für WCAG 2.0/2.1/2.2 (A + AA) automatisierbar abdeckt.
- Verstöße **jeder** Impact-Klasse außer `minor` lassen den Test fehlschlagen;
  `minor`-Funde werden im Testprotokoll ausgegeben statt ignoriert.
- Geprüfte Seiten: öffentliche Kernseiten (Start, Jobs, Jobdetail, Empfehlen),
  Admin-Login sowie die Academy-Teilnehmerseiten (Kursübersicht, Lektion).

**Wichtig:** axe-core kann WCAG 2.2 AA nur teilweise regelbasiert prüfen.
Es gibt daher **keine Behauptung einer vollständigen, automatisiert
nachgewiesenen WCAG-2.2-AA-Konformität** – die folgenden Kriterien werden
manuell geprüft und hier dokumentiert.

## Manuelle Checkliste (zuletzt geprüft im Hardening-Durchgang)

| Kriterium | Umsetzung / Befund | Status |
| --- | --- | --- |
| Vollständige Keyboard-Bedienbarkeit | Alle Interaktionen (Navigation, Jobfinder, Formulare, Chat-Widget öffnen/schreiben/schließen, Quiz, CMS-Editor) sind ohne Maus erreichbar; keine Custom-Widgets ohne Tastaturpfad. | ✅ |
| Sichtbarer Fokus | Globaler `:focus-visible`-Stil (2 px Brand-Outline, Offset 2 px) auf allen interaktiven Elementen; nirgends `outline: none` ohne Ersatz. | ✅ |
| Focus Not Obscured (2.2 / 2.4.11) | Sticky-Header ist flach (≤ 64 px); Chat-Button überdeckt seit dem Polish-Pass keine fokussierbaren Footer-Links mehr (mobiler Freiraum `pb-24`). Fokusziele werden nicht von Overlays verdeckt; das Chat-Panel ist mobil Vollbild mit eigenem Fokuskreislauf. | ✅ |
| Reflow / Zoom (1.4.10, bis 400 %) | Layout bricht einspaltig um, kein horizontales Scrollen auf 320 px-Viewport; mit 200 %/400 % Zoom stichprobenartig geprüft (Start, Formular, Academy-Lektion). | ✅ |
| Touch-/Target-Size (2.5.8, ≥ 24×24 px) | Buttons ≥ 40 px Höhe, Jobzeilen ≥ 56 px, Radio-/Checkbox-Flächen über Label vergrößert, Quiz-Optionen als große Flächen; axe-Regel `target-size` (wcag22aa) läuft zusätzlich automatisiert. | ✅ |
| Formularlabels | Jedes Feld hat ein programmatisches Label (`<label for>` bzw. `sr-only`-Span im Chat); Pflichtfelder textlich gekennzeichnet. | ✅ |
| Verständliche Fehlermeldungen | Serverseitige Zod-Meldungen in deutscher Alltagssprache, per `role="alert"` + `aria-invalid` + `aria-describedby` den Feldern zugeordnet; E2E-Test „Formularvalidierung“ sichert das ab. | ✅ |
| Fokusmanagement Dialoge/Chat | Chat-Widget: Fokus springt beim Öffnen ins Panel, `Escape` schließt, Fokus kehrt zum Auslöser zurück; Academy-Lightbox als natives `<dialog>` mit gleichem Verhalten. | ✅ |
| Skip-Link / Navigation | „Zum Inhalt springen“ als erstes fokussierbares Element auf allen öffentlichen Seiten, Academy und Admin; konsistente Landmarken (`header/nav/main/footer`), `aria-current="page"` in der Navigation. | ✅ |
| Konsistente Hilfe (2.2 / 3.2.6) | Kontaktwege (Telefon, WhatsApp, Chat, E-Mail) erscheinen konsistent an derselben Stelle (Header-CTA, Footer, Kontaktseite). | ✅ |
| Redundant Entry (2.2 / 3.3.7) | Bewerbung fragt keine Angabe doppelt ab; Academy-Fortschritt speichert automatisch, nichts muss erneut eingegeben werden. | ✅ |
| Accessible Authentication (2.2 / 3.3.8) | Login ohne Rätsel/CAPTCHA; TOTP-Eingabe erlaubt Einfügen aus Passwortmanagern; Recovery-Codes als Alternative. | ✅ |

## Bekannte Grenzen

- Die automatische Prüfung läuft nicht gegen jede einzelne Admin-Unterseite;
  der Admin ist ein internes Werkzeug, Stichproben (Login, Layout/Navigation)
  sind abgedeckt, die Formular-Grundmuster sind komponentenweise identisch.
- Screenreader-Tests wurden heuristisch (Struktur, Namen, Rollen), nicht mit
  echten AT-Nutzerinnen durchgeführt – für ein öffentliches Launch-Audit wird
  ein manueller NVDA/VoiceOver-Durchgang empfohlen.
