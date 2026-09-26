# Entscheidungen (ADR-Log) – Möller GmbH Plattform

Format: Nr. · Entscheidung · Begründung · Status. Alle Defaults sind konfigurierbar bzw. reversibel,
sofern nicht anders vermerkt.

| # | Entscheidung | Begründung | Status |
|---|---|---|---|
| D1 | Ein Next.js-Monolith (standalone) statt getrennter Frontend-/Backend-Services | Ein Deployment, gemeinsame Typen, SSR/SEO, geringe Betriebskomplexität für einen Mittelständler | fest |
| D2 | PostgreSQL + Prisma | Vorgabe „relational, ausgereiftes ORM"; Migrations + Typsicherheit | fest |
| D3 | Eigene Auth (Argon2id, DB-Sessions, TOTP) statt Auth-Framework | Vorgaben (MFA erzwingbar, Session-Revocation, RBAC serverseitig, Audit) sauber und transparent erfüllbar; keine Blackbox-Abhängigkeit | fest |
| D4 | Zwei Blau-Töne der gelieferten Logos als Tokens: `#2569C3` (kräftig, primär) + `#1D4E8F`/Ink-Ableitungen (gedeckt) | Farben laut Briefing „später final" – Tokens machen den Wechsel zum Einzeiler | Default, änderbar |
| D5 | Fonts: Archivo (Display) + Inter (Text), lokal via Fontsource (SIL OFL) | Lizenzkonform, performant, passt zur Logo-Anmutung ohne es zu imitieren | Default, änderbar |
| D6 | Realtime via SSE + `RealtimeHub`-Abstraktion (In-Memory-Default) | Läuft im Docker-Standalone ohne Zusatzinfrastruktur; Redis/WS-Adapter nachrüstbar | Default |
| D7 | Scheduler im App-Prozess (Minuten-Tick + PG Advisory Lock) + optionaler externer Trigger `POST /api/cron/run` | Zuverlässig im Docker-Betrieb, horizontal skalierbar über Lock, plattformunabhängig | Default |
| D8 | Geocoding-Default: Offline-PLZ-Zuordnung (PLZ-Leitregion → Bundesland/Koordinaten-Näherung), Provider-Interface für echte Geocoder | Kein Drittanbieter, kein Datenschutz-Risiko, „Möller in Deiner Nähe" funktioniert sofort; präzisere Provider später steckbar | Default |
| D9 | E-Mail: SMTP via nodemailer + `console`/Log-Provider für Dev; Empfängerlisten in SystemSettings | Vorgabe providerunabhängig; Zustellstatus in `EmailLog` mit Retry | fest |
| D10 | Uploads: lokale Disk unter `var/uploads` (Dev-Default), S3-kompatibler Treiber per ENV aktivierbar | Vorgabe Abstraktion lokal/S3 | fest |
| D11 | Bewerbung: Lebenslauf-Upload technisch fertig, **Default deaktiviert** je Stelle | Vorgabe §15 („standardmäßig optional bzw. deaktivierbar") | Default, pro Job |
| D12 | Statusmodell: `autoStatus` (NEU/OFFEN) getrennt von `manualStatus`; effektiv = manual ?? auto | 72h-Automatik + „manuell stoppt Automatik" ohne Statushistorien-Verrenkung | fest |
| D13 | RLP → Verantwortung Hessen über konfigurierbares Region-Mapping (`SystemSetting`), RLP bleibt eigenes Bundesland | Vorgabe §16, spätere Reorganisation ohne Migration | fest |
| D14 | Vertretung: Rechte werden zur Laufzeit aus aktiven Delegationen berechnet (kein Rechte-Kopieren) | „Nach Ende automatisch entfernen" ist damit systemisch garantiert | fest |
| D15 | Referral-Leads als eigene Entität mit eigenem Statusraum; Konversion erzeugt Candidate+Application mit `source=MITARBEITEREMPFEHLUNG` und erhaltener `referralId` | Vorgabe §23: keine Vermischung, Historie bleibt | fest |
| D16 | Referral-Incentive-Tracking: Felder vorhanden, UI hinter Feature-Flag `referrals.incentivesEnabled` (Default aus), kein Betrag vorgegeben | Vorgabe §23 optional | Default |
| D17 | Live-Chat ohne KI: Widget mit Bürozeiten-Logik aus SystemSettings; E-Mail nur bei neuer Unterhaltung + Reaktivierung nach Pause (Default 30 min) ohne Antwort | Vorgabe §24 Anti-Spam-Default | Default |
| D18 | WhatsApp-CTA: `wa.me`-Link mit per-Kontext konfigurierbaren Textbausteinen (Bewerber/Geschäftskunde/allgemein); Nummer in SystemSettings (Default Festnetz 06725/919350) | Vorgabe §25; Voraussetzung WhatsApp-Business-Registrierung der Nummer wird im README genannt | Default |
| D19 | CMS: strukturierte Sektionen (typisierte Blöcke) + eingeschränkter Rich-Text (Absatz, H-Ebenen, fett, kursiv, Liste, Link, Zitat) statt freiem HTML; Entwurf/Vorschau/Publish mit `CmsRevision`-Versionierung & Wiederherstellen | Vorgabe §26, Layout-Schutz | fest |
| D20 | Öffnungszeiten zentral in SystemSettings; Default Mo–Fr 08:00–17:00 laut Masterprompt; Konflikt der Schulungsfolie (09–12/13–17) im Audit dokumentiert | Eine Quelle der Wahrheit für Website, Chat-Status, Academy | Default, klärungsbedürftig |
| D21 | Original-PPTX wird nicht committet (enthält reales TOTP-Secret/QR); nur redigierte Screenshots im Repo | Sicherheit; siehe `TRAINING_CONTENT_AUDIT.md` K1 | fest |
| D22 | Academy-Quiz: bestanden ab 80 % (konfigurierbar), unbegrenzte Wiederholungen mit Erklärungen | Lernziel statt Prüfungsdruck; Addendum fordert Erklärungen bei Fehlern | Default |
| D23 | Academy-Magic-Link: 30 Tage gültig (konfigurierbar), Wiederversand revoked alten Token | Sicherheit + Praxis (Onboarding-Zeitraum) | Default |
| D24 | Analytics: standardmäßig **aus**; eingebaute minimale, cookielose Ereigniszählung (First-Party, ohne PII) aktivierbar; kein Cookie-Banner nötig im Default | Vorgabe §37 datenschutzfreundlich, keine Dark Patterns | Default |
| D25 | Duplikaterkennung: normalisierte E-Mail exakt, Telefon per E.164-Normalisierung, optional Name+Ort-Ähnlichkeit; nur Hinweis + kontrolliertes Mergen, nie automatisch | Vorgabe §19 | fest |
| D26 | Suchmaschinenstrategie abgelaufene Jobs: freundliche „Stelle vergeben"-Seite mit `noindex, follow` + Verweis auf Jobübersicht/Initiativbewerbung; `validThrough` in JSON-LD. Bewusste Abweichung von wörtlichem HTTP 410: Der App Router erlaubt keinen eigenen Statuscode aus einer Page; `noindex` erzielt dieselbe Deindexierung, `follow` erhält den Linkfluss zur Jobübersicht | Vorgabe §36, technisch angepasst | Default |
| D27 | Teamzuordnung Bewerbung „ohne Bundesland-Match" (Initiativ ohne Angabe unmöglich – Bundesland ist Pflichtfeld) | Formular erzwingt Bundesland ⇒ eindeutige Zuordnung | fest |
| D28 | Admin-UI deutschsprachig, öffentliche Site deutschsprachig (keine i18n-Infrastruktur in v1) | Zielgruppe rein deutschsprachig; i18n wäre Overhead ohne Nutzen | Default |
| D29 | Reporting-Export CSV nur mit Permission `reporting.export`, jeder Export im Audit | Vorgabe §29 | fest |
| D30 | Node 22 LTS als Runtime (Docker-Basisimage `node:22-slim`) | aktuelle LTS, Prisma/Next-kompatibel | Default |
