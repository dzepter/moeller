# Implementierungsplan – Möller GmbH Plattform

Stand: 2026-09-26 · Referenzen: `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY_AND_PRIVACY.md`,
`ACADEMY_ARCHITECTURE.md`, `TRAINING_CONTENT_AUDIT.md`, `DECISIONS.md`

## Phasen

### Phase 0 – Audit & Grundlagen ✅
Repo-/Asset-Audit, PPTX-Content-Audit (55 Folien, 42 Medien, Redaktionen), Planungsdokumente.

### Phase 1 – Fundament
Next.js (App Router, TS strict, standalone) · Tailwind mit Token-System · Prisma-Schema (alle Entitäten
inkl. Training*) · Migrationen · docker-compose (PostgreSQL) · Dockerfile · `.env.example` ·
ESLint/Prettier · Vitest/Playwright-Setup · Basis-Lib (db, settings, audit, rate-limit, storage, email,
realtime, scheduler-Gerüst).

### Phase 2 – Auth & RBAC
Login (Argon2id, DB-Sessions), TOTP-MFA + Recovery-Codes, Passwort-Reset, Session-Verwaltung
(„alle abmelden"), RBAC-Kern (`requirePermission`, `candidateScope`), Delegationslogik,
Audit-Anbindung, Rate Limiting. Permission-Testsuite startet hier.

### Phase 3 – Öffentliche Website
Designsystem-Bausteine (Typo, Grid, Buttons, Formulare, Schräg-Motiv) · Seiten: Start, Über uns,
Für Unternehmen, Arbeiten bei Möller, Jobs (+Filter, „Möller in Deiner Nähe"), Jobdetail (JSON-LD,
Teilen, QR), Initiativbewerbung, Empfehlen (Variante A+B), Kontakt, Impressum/Datenschutz (editierbare
Rechtsseiten), 404 · Bewerbungsflow „in 2 Minuten" mit Danke-Seite · SEO (Metadata, Sitemap, robots,
OG) · A11y-Grundlagen (Skip-Link, Fokus, Landmarken).

### Phase 4 – Bewerbermanagement (Admin-Kern)
Admin-Shell (Navigation nach Rolle) · Dashboard (Arbeitszentrale) · Bewerberliste (Filter/Suche/
Duplikat-Hinweise) · Bewerberdetail (Kopf, Timeline, Notizen, Wiedervorlagen, Statuswechsel mit
Historie, Zuordnung, Quick Actions) · Statusautomatik (Scheduler-Job) · Stellenverwaltung (alle Felder,
Workflow Entwurf→veröffentlicht→pausiert→archiviert, Duplizieren, Terminierung, Vorschau) ·
Vertretungen (UI + Konfliktprüfung).

### Phase 5 – Empfehlungen & Chat
`/empfehlen` öffentlich (Link-Variante mit Code-Erzeugung + Direkt-Variante mit Pflicht-Consent) ·
Referral-Inbox intern (eigene Statuswelt, Filter, Duplikat-Warnung, „In Bewerbung übernehmen") ·
Live-Chat: Widget (Bürozeiten-Status, Offline-Formular), SSE-Streams, interner Chat-Arbeitsbereich
(Zuweisung, Status, interne Notizen), E-Mail-Benachrichtigungslogik.

### Phase 6 – CMS & Medien
Medienbibliothek (Upload, Crop/Focal Point, Alt-Text, Freigabestatus, Verwendungsnachweis) ·
CMS-Seiten/Sektionen mit strukturierten Blöcken + Rich-Text light · Entwurf/Vorschau/Publish/
Versionen/Wiederherstellen · Team-Bereich (Jana/Jasmin, aktivierbar) · Markus-Statement ·
Kontakt-/Öffnungszeiten-Settings · optionale Bereiche (Referenzen/FAQ) aktivierbar.

### Phase 7 – Academy
Datenmodell + Services (Versionierung, Assignment, Magic Link, Fortschritt, Quiz) · Kursinhalt v1 aus
auditiertem PPTX-Material als Seed (11 Module, sourceSlides-Referenzen, redigierte Screenshots) ·
Lern-Frontend mobil-first (Modulnavigation, Fortschritt, Merk-/Warn-Boxen, zoombare Screenshots,
Wissenscheck mit Erklärungen) · Admin-Bereich Academy (Teilnehmer, Einladungen, Versionen, Content-
Editor) · „Onboarding starten" am Bewerberdetail · Erinnerungs-Jobs.

### Phase 8 – Reporting, Datenschutz-Werkzeuge, Feinschliff
Reporting (Zeitraum/Bundesland/Stelle/Quelle, Funnel, Time-to-first-touch, Referral-Conversion,
CSV-Export mit Audit) · Retention-Engine + Datenschutz-Admin (anstehende Löschungen, Betroffenen-
Suche/Export/Anonymisierung) · leere Zustände/Fehlerseiten überall · Performance-Pass (Bilder, Fonts,
Bundle) · A11y-Pass (axe) · Security-Review.

### Phase 9 – Qualitätssicherung & Abschluss
Vollständige Testsuiten (siehe unten) · Seeds (Markus/Jana/Jasmin/3 Teamleiter, Demo-Jobs je Region,
fiktive Bewerber/Referrals/Chats, Academy-Kurs) · README · Build/Typecheck/Lint/Tests grün ·
finale Qualitätsprüfung nach Masterprompt §47.

## Teststrategie (Pflichtfälle)

**Unit/Integration (Vitest):** 72h Neu→Offen · manueller Status stoppt Automatik · RLP→Hessen-Zuordnung ·
Delegation Beginn/Ende/keine Rekursion/keine Selbstvertretung · Referral-Konversion erhält Historie ·
Duplikaterkennung (E-Mail/Telefon-Normalisierung) · Retention anonymisiert korrekt · Jobveröffentlichung/
-ablauf · Magic-Link-Lebenszyklus · Quiz-Bewertung · Kursversion friert Abschluss ein.

**Permissions (Vitest):** NRW sieht kein Bayern/Hessen · Bayern sieht kein Hessen/RLP · Hessen sieht RLP ·
Vertreter nur im Zeitfenster · Ende entzieht Rechte · Innendienst operativ alles, aber keine Website-
Marketinginhalte/Benutzerverwaltung · Admin alles · IDOR-Versuche über fremde IDs scheitern (Candidate,
Datei-Download, Chat, Academy-Teilnehmer).

**E2E (Playwright):** Job finden→bewerben→Danke-Seite→erscheint im Dashboard→Status ändern→Wiedervorlage ·
Referral absenden→konvertieren · Chat starten→intern beantworten · Teamleiter-Sichtbarkeitsgrenzen ·
CMS-Edit→Preview→Publish · Academy: einladen→Link öffnen→Modul abschließen→Fortschritt im Admin.

**A11y:** axe-Checks über Kernseiten (Start, Jobs, Jobdetail, Bewerbung, Empfehlen, Kontakt, Academy-Lektion).

## Definition of Done
Gemäß Masterprompt §45 + Addendum-DoD; abschließende Selbstprüfung gemäß §47 dokumentiert im README-Abschnitt „Qualitätsnachweis".
