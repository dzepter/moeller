# Abschließende Qualitätsprüfung (Masterprompt §47)

Stand: 26.09.2026, nach ZWEI externen Review-Runden: Hardening-Durchgang
(Basis `25ffe04` → `4f4b41b`) und finaler Security-/Datenintegritäts-
Durchgang (Basis `4f4b41b`). Geprüft am
fertigen Production-Build (Standalone) mit geseedeter Datenbank.

| # | Frage | Ergebnis | Beleg |
| --- | --- | --- | --- |
| 1 | Sieht die Website irgendwo wie ein AI-/Template-Design aus? | Nein. Redaktionelles Layout: asymmetrische Split-Sektionen, nummerierte Blöcke, Schrägkanten-Motiv aus dem Logo, echte PoS-Fotografie. Der Polish-Pass hat gezielt Hero-Rhythmus (mobil), Fokus-/Hover-/Active-Zustände und den Chat-Freiraum im Footer verfeinert – kein Redesign. | Screenshots Desktop/Mobil; `docs/DESIGN_SYSTEM.md` |
| 2 | Zu viele gleichartige Karten? | Nein. Listen bleiben redaktionell gesetzt (Jobzeilen mit Hairlines, Zahlen-/Textblöcke); Karten nur im Admin als Werkzeug. | Startseite, /jobs, /fuer-unternehmen |
| 3 | Typografie, Abstände, Bildgrößen konsistent? | Ja. Zentrale Tokens, wiederverwendete Section-/Eyebrow-Komponenten; Hero-Typografie mobil nachjustiert (2.35 rem, straffere Abstände). | `globals.css` @theme |
| 4 | Auf kleinem Smartphone wirklich hervorragend? | Ja. Above-the-fold der Startseite zeigt jetzt Eyebrow, H1, Subline und beide CTAs; der schwebende Chat-Button überdeckt keine Footer-Links mehr; Academy weiterhin mobile-first. | Mobile Screenshots (390 px), E2E im 390×844-Viewport |
| 5 | Bewerbung in ~2 Minuten möglich? | Ja. Unverändert ein Formular ohne Konto; jetzt inklusive vollständiger UTM-Kette. | E2E „Bewerbung in 2 Minuten … UTM landet an der Bewerbung“ |
| 6 | Kann nicht-technischer Innendienst Stellen pflegen? | Ja. Unverändert (Formular, Vorschau, Zeitsteuerung). | `/admin/stellen` |
| 7 | Kann Markus Websiteinhalte ohne HTML ändern? | Ja. CMS mit Versionen/Restore; E2E publiziert eine Headline-Änderung. | E2E CMS-Test |
| 8 | Sehen Teamleiter technisch nur eigene Bewerber? | Ja – jetzt auch über alle Nebenwege: Duplikat-Hinweise sind doppelt gescopet (Ausgangs-Kandidat UND Treffer), Notizen/Wiedervorlagen validieren jede mitgesendete applicationId/referralId/assigneeId serverseitig. | `tests/permissions/teamleiter-scope.test.ts`, `tests/permissions/hardening-idor.test.ts` (A, B, C) |
| 9 | Funktioniert die Vertretung automatisch und sicher? | Ja. Unverändert (zeitraumbasiert, keine Selbst-/Zirkel-/Kettenvertretung). | `tests/integration/delegations.test.ts` |
| 10 | Tauchen Mitarbeiterempfehlungen sauber im Bewerbertool auf? | Ja; die Verknüpfung mit einem Bestands-Kandidaten akzeptiert nur echte Duplikat-Matches (serverseitig geprüft). | `tests/integration/referrals.test.ts`, hardening-idor (D) |
| 11 | Bleibt Herkunft bei Konvertierung erhalten? | Ja. `Application.referralId` + übernommene Historie. | ebd. |
| 12 | Personenbezogene Daten aus öffentlichen Responses, Logs, Analytics ferngehalten? | Ja. Zusätzlich gehärtet: eine öffentliche Bewerbung kann bestehende Candidate-Stammdaten nicht mehr verändern (immer neuer Datensatz, Zusammenführen nur manuell); IPs weiterhin nur als gesalzener Hash über vertrauenswürdige Proxy-Header. | hardening-idor (J), `src/lib/rate-limit.ts`, `docs/SECURITY_AND_PRIVACY.md` |
| 13 | Live-Chat intern sinnvoll bearbeitbar? | Ja. Unverändert (SSE, Posteingang); Besucher können jetzt optional eine Telefonnummer für Rückrufe hinterlassen. | E2E Chat-Test |
| 14 | Keine falschen Unternehmensdaten? | Ja. Ausschließlich §44-Daten; Rechtstext-Platzhalter werden vom Go-Live-Check als **Blocker** ausgewiesen statt jemals erfunden zu werden; Bürozeiten verbindlich Mo–Fr 08:00–17:00 aus zentralem Setting (Website, Chat, E-Mails, Academy). | `src/server/golive.ts`, `tests/integration/golive.test.ts`, D36 |
| 15 | Alle Kernflüsse automatisiert getestet? | Ja. **79 Vitest-Tests** (Unit/Integration/Permissions, inkl. Negativtests A–D, F–K gegen manipulierte IDs, parallele Rate-Limit-/Reset-Requests, Retention-Fehlerfall, Anonymisierung) + **16 Playwright-E2E** (inkl. MFA-Pflicht-Gate, UTM-Kette, noindex, axe mit WCAG-2.0/2.1/2.2-Regeln auf Public + Admin-Login + Academy). | `npm test`, `npm run e2e` |

## Sicherheits-Selbstangriff (Korrekturpaket Punkt 27)

Vor Abschluss wurden die Schutzmechanismen gezielt selbst angegriffen –
auf Service-Ebene (Vitest-Negativtests) und per HTTP gegen den laufenden
Production-Build:

| Angriff | Ergebnis |
| --- | --- |
| Fremde Candidate-ID bei Duplikat-Hinweisen (Teamleiter) | abgewehrt (ForbiddenError; Treffer zusätzlich gescopet) |
| candidateId A + applicationId B bei Notiz | abgewehrt |
| Manipulierte applicationId/referralId/assigneeId bei Wiedervorlagen | abgewehrt (inkl. Vollzug ohne candidateId) |
| Beliebige linkCandidateId bei Referral-Konvertierung | abgewehrt (nur echte Duplikat-Matches) |
| Admin ohne MFA ruft /admin, /admin/bewerbungen, /admin/einstellungen direkt auf | abgewehrt (serverseitiges Gate → /admin/sicherheit) |
| Academy-Session der fremden Kursversion lädt INTERNAL-Asset (HTTP) | abgewehrt (404; Positivkontrolle mit richtiger Version: 200) |
| GESPERRTES bzw. nicht freigegebenes PUBLIC-Asset per direkter ID (HTTP) | abgewehrt (404) |
| 30 parallele Requests gegen Limit 10 | exakt 10 kommen durch (atomar) |
| Paralleler Doppelverbrauch desselben Reset-Tokens | genau ein Gewinner |
| Öffentliche Bewerbung mit bekannter E-Mail + manipulierten Stammdaten | Bestand unverändert, Bewerbung angenommen, Duplikat erkannt |
| Academy-Zugang nach Candidate-Anonymisierung | abgewehrt (Link und Session ungültig) |
| X-Forwarded-For-Spoofing (führender Eintrag) | wirkungslos (letzter Hop/X-Real-IP zählt; Proxy-Pflicht dokumentiert) |

Dabei gefundene und behobene Zusatzpunkte: fehlende physische Storage-Datei
erzeugte in den Auslieferungsrouten einen 500er (jetzt sauberes 404 + Log);
`STORAGE_LOCAL_ROOT` muss absolut gesetzt werden, weil der Standalone-Server
sein Arbeitsverzeichnis wechselt (Playwright-Konfiguration und README
angepasst; im Docker-Betrieb unverändert korrekt).


## Finaler Security-Durchgang (Runde 2, auf `4f4b41b`)

Alle acht extern gemeldeten Punkte wurden am Code reproduziert (jeder traf zu)
und behoben:

| # | Punkt | Kern der Lösung | Tests |
| --- | --- | --- | --- |
| 1 | MFA-/First-Login-Pflicht an der Action-/API-Grenze | Zentrale Betriebssperre in `getCurrentUser()`/`assertPermission()` (fail closed); `getSessionUser()` nur für Entsperr-Flows (D39) | `operational-lock.test.ts` A–F an echten Actions + Route Handler; E2E: API-403 mit gesperrter Session |
| 2 | Manuelle Anonymisierung Storage-first | Mark-then-Delete wie Retention (gemeinsames `deletePendingFiles`) | `storage-consistency.test.ts` (Storage-Ausfall → PII anonymisiert, Datei markiert, Retry räumt) |
| 3 | Seed-Privilege-Accumulation | `syncSystemRoles()` mit Entzug; Rollenmodell B: Bestandsbenutzer unangetastet (D40) | `seed-sync.test.ts` |
| 4 | Reset-Failure-Window | Hash vor Claim; Claim+Passwort+Revoke in EINER Transaktion; Rollback verbrennt keinen Token | `auth-hardening.test.ts` (TX-Fehler → Token nutzbar; Sessions widerrufen; parallel weiter 1 Gewinner) |
| 5 | Referral-Match per Nachname allein | E-Mail ODER Telefon ODER Name+Wohnort (beide nötig, Vorname falls bekannt) (D42) | `hardening-idor.test.ts` (Namensvetter ohne Stadt abgelehnt; Telefon/Name+Stadt akzeptiert) |
| 6 | Storage↔DB-Lebenszyklen | CV/Media-Upload: put vor DB + Kompensations-Delete; Media-Delete: DB zuerst, Storage best effort + Log (D41) | `storage-consistency.test.ts` A/B/C |
| 7 | Go-Live nur Marker-basiert | Zusätzlich: Leere/ausgehöhlte Rechtstexte = Blocker; Impressum-Pflichtbausteine (Vertretung/Register/USt) als technische Vollständigkeit – nichts wird erfunden | `golive.test.ts` |
| 8 | Academy-Servicegrenzen | Defense-in-Depth in `markLessonComplete`/`answerQuestion`: Versions-Zugehörigkeit + fremde Option-IDs werden ABGELEHNT statt als „falsch“ gewertet | `academy.test.ts` (fremde Lesson/Question/Option → kein Write) |

**Selbstangriff Runde 2 (Service-Ebene + Live-HTTP gegen den Production-Build):**
Admin ohne Pflicht-MFA → operative Actions/`/api/admin/reporting/export` abgelehnt (403) ✚
mustChangePassword-Session (echter Login) → API 403, Admin-Seite 307 zur Passwortänderung ✚
Anonymisierung bei Storage-Ausfall → PII weg, Datei markiert, Retry räumt ✚
Referral-Namensvetter abgelehnt ✚ Reset parallel/TX-Fehler robust ✚
fremde Academy-Lesson/Question/Option → kein Write ✚ CV-/Media-Fehlerpfade ohne Orphans.

## Abschluss-Gates (letzter Lauf, nach ALLEN Änderungen)

- `npm run lint` – 0 Fehler, 0 Warnungen
- `npm run typecheck` – fehlerfrei (TypeScript strict)
- `npm test` – **96/96** bestanden
- `npm run build` – erfolgreich (Standalone, inkl. Proxy/Middleware)
- `npm run e2e` – **16/16** bestanden
- Accessibility: axe (WCAG 2.0/2.1/2.2 A+AA-Regeln, alle Impact-Klassen außer `minor` blockierend) – 0 Verstöße; manuelle 2.2-Checkliste: `docs/ACCESSIBILITY.md`
- `npm audit` – 0 bekannte Schwachstellen
- Keine offenen TODO/FIXME in `src/`
- Keine Secrets im Repository
