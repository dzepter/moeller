# Abschließende Qualitätsprüfung (Masterprompt §47)

Stand: 26.09.2026 · geprüft am fertigen Production-Build (Standalone) mit
geseedeter Datenbank. Ergebnis je Frage mit Beleg.

| # | Frage | Ergebnis | Beleg |
| --- | --- | --- | --- |
| 1 | Sieht die Website irgendwo wie ein AI-/Template-Design aus? | Nein. Redaktionelles Layout: asymmetrische Split-Sektionen, nummerierte Blöcke, Schrägkanten-Motiv aus dem Logo, echte PoS-Fotografie, keine drei-Karten-Raster mit Icon-Kreisen, keine Stock-Illustrationen. | Visuelle QA per Screenshot (Desktop + Mobil) über alle Seiten; `docs/DESIGN_SYSTEM.md` |
| 2 | Zu viele gleichartige Karten? | Nein. Listen sind redaktionell gesetzt (Jobzeilen mit Hairlines statt Kartengrid, Zahlen-/Textblöcke, Bildpaare); Karten kommen nur im Admin als Werkzeug vor. | Startseite, /jobs, /fuer-unternehmen |
| 3 | Typografie, Abstände, Bildgrößen konsistent? | Ja. Zwei Schriftfamilien (Archivo/Inter) mit fester Skala, zentrale Design-Tokens, wiederverwendete Section-/Eyebrow-Komponenten, Bilder mit festen Seitenverhältnissen und `sizes`. | `globals.css` @theme, `components/site/section.tsx` |
| 4 | Auf kleinem Smartphone wirklich hervorragend? | Ja. Mobile-first geprüft (390 px): Navigation als Vollbild-Menü, Formulare einspaltig mit großen Touch-Zielen, Academy komplett für Mobilnutzung entworfen; E2E-Academy-Test läuft im 390×844-Viewport. | `e2e/admin.spec.ts` (Academy-Test), mobile Screenshots |
| 5 | Bewerbung in ~2 Minuten möglich? | Ja. Ein Formular, nur relevante Pflichtfelder, ohne Konto, ohne Anschreiben; CV-Upload optional je Stelle. E2E füllt es in Sekunden aus. | `e2e/public.spec.ts` „Bewerbung in 2 Minuten" |
| 6 | Kann nicht-technischer Innendienst Stellen pflegen? | Ja. Admin → Stellen: Formular mit Listenfeldern, Vorschau, Zeitsteuerung; keine HTML-/Markdown-Kenntnisse nötig. | `/admin/stellen`, README „Job anlegen" |
| 7 | Kann Markus Websiteinhalte ohne HTML ändern? | Ja. Schema-getriebenes CMS mit einfachen Text-/Listen-/Bildfeldern, Versionen + Wiederherstellen; E2E ändert die Startseiten-Headline und veröffentlicht. | `e2e/admin.spec.ts` CMS-Test |
| 8 | Sehen Teamleiter technisch nur eigene Bewerber? | Ja. Serverseitiger Scope in jeder Query (`applicationScope`), Objektzugriff einzeln geprüft (kein IDOR); dedizierte Permission-Tests inkl. Direktzugriff auf fremde IDs. | `tests/permissions/teamleiter-scope.test.ts` |
| 9 | Funktioniert die Vertretung automatisch und sicher? | Ja. Zeitraumbasiert, wird zur Laufzeit wirksam/unwirksam, keine Selbst-/Zirkel-/Kettenvertretung, Historie bleibt. | `tests/integration/delegations.test.ts` |
| 10 | Tauchen Empfehlungen sauber im Bewerbertool auf? | Ja. Eigener Empfehlungsbereich mit eigener Statuswelt; Konvertierung erzeugt Bewerbung mit Quelle „Empfehlung". | `tests/integration/referrals.test.ts` |
| 11 | Bleibt Herkunft bei Konvertierung erhalten? | Ja. `Application.referralId` + übernommene Statushistorie; im Detail sichtbar. | ebd. |
| 12 | Personenbezogene Daten aus öffentlichen Responses, Logs, Analytics ferngehalten? | Ja. Öffentliche Endpunkte geben keine Personendaten zurück (Honeypot-Antwort ist Fake), Analytics ist Opt-in und zählt nur Tageszähler ohne IDs/IPs, IPs nur als gesalzener Hash im Rate-Limit, Fehlerlogs ohne Formulardaten. | `src/lib/analytics.ts`, `src/lib/rate-limit.ts`, `docs/SECURITY_AND_PRIVACY.md` |
| 13 | Live-Chat intern sinnvoll bearbeitbar? | Ja. Posteingang mit Status/Zuweisung, Live-Updates per SSE (Bundle-übergreifender Hub-Singleton-Fix verifiziert), Verlauf pro Besucher-Token; E2E deckt Besucherfrage → interne Antwort → Besucher sieht Antwort ab. | `e2e/admin.spec.ts` Chat-Test |
| 14 | Keine falschen Unternehmensdaten? | Ja. Ausschließlich §44-Daten (Max-Planck-Str. 8, 55435 Gau-Algesheim, 06725/919350, info@/bewerbung@bvg-moeller.de); keine erfundenen Kennzahlen, Kundenlogos oder Historien; Öffnungszeiten zentral als Einstellung. | `src/lib/settings.ts` Defaults, Impressum |
| 15 | Alle Kernflüsse automatisiert getestet? | Ja. 50 Vitest-Tests (Unit/Integration/Permissions) + 13 Playwright-E2E inkl. axe-WCAG-2.1-AA auf Kernseiten. | `npm test`, `npm run e2e` |

## Abschluss-Gates (letzter Lauf)

- `npm run lint` – 0 Fehler, 0 Warnungen
- `npm run typecheck` – fehlerfrei (TypeScript strict)
- `npm test` – 50/50 bestanden
- `npm run build` – erfolgreich (Standalone)
- `npm run e2e` – 13/13 bestanden (inkl. Accessibility)
- Keine offenen TODO/FIXME in `src/`
- Keine Secrets im Repository (`.env` ignoriert, Seed-Passwörter via ENV)
