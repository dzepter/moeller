# Architektur – Möller GmbH Website & Bewerbermanagement

Stand: 2026-09-26

## 1. Überblick

Eine einzige, produktionsnahe Next.js-Anwendung (App Router) mit drei Zonen:

| Zone | Pfad | Zugriff |
|---|---|---|
| Öffentliche Website | `/`, `/jobs`, `/kontakt`, … | öffentlich, SEO-optimiert |
| Möller Academy | `/academy/*` | nur per personalisiertem Magic Link, `noindex` |
| Interner Bereich | `/admin/*` | Login + RBAC, `noindex` |

Ein dauerhaft laufender Node-Prozess (Next.js `standalone`) trägt zusätzlich:
- **Realtime** (SSE) für den Live-Chat,
- **Scheduler** für zeitgesteuerte Jobs (72h-Statusautomatik, Retention, Jobveröffentlichung/-ablauf, Wiedervorlagen-/Academy-Erinnerungen, E-Mail-Retries).

Deployment-Ziel: Docker (beliebiger VPS/Server). Lokale Entwicklung: `docker compose` für PostgreSQL, App via `npm run dev`.

## 2. Technologie-Stack

| Baustein | Wahl | Begründung |
|---|---|---|
| Framework | Next.js (App Router, standalone output), React, TypeScript `strict` | SSR/Server Components für Performance & SEO; ein Deployment-Artefakt |
| Datenbank | PostgreSQL 16 | relational, FK-Integrität, Volltext-/Trigram-Suche möglich |
| ORM | Prisma | Migrations, typsichere Queries, Prepared Statements (SQL-Injection-Schutz) |
| Validierung | Zod | serverseitige Schema-Validierung aller Eingaben |
| Auth | Eigene, schlanke Lösung: Argon2id-Hashes (`@node-rs/argon2`), DB-Sessions (httpOnly-Cookie), TOTP-MFA (`otplib`) | volle Kontrolle über RBAC/MFA/Session-Revocation; keine Blackbox |
| Styling | Tailwind CSS auf Basis eigener Design Tokens (CSS Variables) | Utility-CSS erlaubt laut Vorgabe; Look ist vollständig eigenständig (siehe `DESIGN_SYSTEM.md`) |
| E-Mail | Provider-Abstraktion: SMTP (`nodemailer`) + Log-Provider (Dev) | ENV-/Settings-konfigurierbar, Zustellprotokoll in `EmailLog` |
| Realtime | SSE mit Provider-Abstraktion (`RealtimeHub`) | läuft ohne Zusatzinfrastruktur; austauschbar (Redis/WS) |
| Storage | `StorageProvider`-Abstraktion: lokale Disk (Dev/Default) & S3-kompatibel (Prod-Option) | private Bewerber-/Academy-Dateien strikt getrennt von öffentlichen CMS-Medien |
| Tests | Vitest (Unit/Integration/Permission), Playwright (E2E), axe (A11y) | Vorgabe Masterprompt §40 |

Alle Versionen werden bei der Installation auf die aktuell stabile Version gepinnt (`package-lock.json`).

## 3. Verzeichnisstruktur

```
├── docs/                     Planungs- & Audit-Dokumente
├── content/                  Quell-Assets (Logos, PoS-Fotos, redigierte Academy-Screenshots)
├── prisma/                   schema.prisma, Migrationen, seed.ts
├── public/                   statische Dateien (Brand-Assets, Favicons)
├── src/
│   ├── app/
│   │   ├── (public)/         öffentliche Seiten (Route Group mit eigenem Layout)
│   │   ├── academy/          Schulungsbereich (Magic-Link-Auth)
│   │   ├── admin/            interner Bereich (Session-Auth + RBAC)
│   │   └── api/              Route Handler (Formulare, SSE, Downloads, Cron-Webhook)
│   ├── components/           ui/ (Basisbausteine) · site/ (öffentlich) · admin/ · academy/
│   ├── lib/                  auth, rbac, db, email, storage, realtime, scheduler, validation, settings
│   └── server/               Fachservices (applications, jobs, referrals, chat, cms, academy, reporting, retention, audit)
├── tests/                    Vitest-Suiten (unit/, permissions/)
├── e2e/                      Playwright-Tests
├── Dockerfile · docker-compose.yml · .env.example
```

## 4. Grundprinzipien

1. **Serverseitige Durchsetzung.** Jede Autorisierung läuft durch `src/lib/rbac` – im UI wird nur zusätzlich ausgeblendet. Object-Level-Checks (`canAccessCandidate(user, candidate)`) sind Pflicht in jedem Service; getestet in `tests/permissions/`.
2. **Services statt Fat-Routes.** Route Handler/Server Actions validieren (Zod) → rufen Fachservice → Service prüft Berechtigung, schreibt Audit, führt Transaktion aus.
3. **Alles Konfigurierbare in `SystemSetting`** (Öffnungszeiten, Benachrichtigungsempfänger, Retention-Fristen, WhatsApp-Texte, Feature-Flags wie `/referenzen`, `/faq`, Referral-Incentives).
4. **Audit-Log** für sicherheits-/datenschutzrelevante Aktionen (Login, Rollenänderung, Zuordnung, Statuswechsel, Export, Löschung, Vertretung, CMS-Publish, Academy-Einladung). Append-only: keine Update-/Delete-Pfade im Code, dokumentierte DB-Härtung (REVOKE) im README.
5. **Datenminimierung.** Öffentliche Responses enthalten nie Bewerberdaten; Logs sind PII-frei; IP nur als Kurzzeit-Hash für Rate Limiting.

## 5. Datenmodell (Kernentitäten)

User · Role · Permission · RolePermission · UserRole · Region · Job · Candidate · Application ·
ApplicationStatusHistory · CandidateAssignment · CandidateNote · Reminder · TeamLeadDelegation ·
Referral · ReferralStatusHistory · ChatConversation · ChatMessage · ChatAssignment · CmsPage ·
CmsSection · CmsRevision · MediaAsset · CustomerReference · AuditLog · Notification · EmailLog ·
ConsentRecord · SystemSetting · TrainingCourse · TrainingCourseVersion · TrainingModule ·
TrainingLesson · TrainingQuestion · TrainingQuestionOption · TrainingAssignment ·
TrainingProgress · TrainingAnswer · TrainingCompletion · TrainingInvitation · TrainingAsset ·
TrainingReminderLog

Besonderheiten:
- **Application vs. Candidate:** `Candidate` = Person (dedupliziert über E-Mail/Telefon-Hinweise), `Application` = konkrete Bewerbung auf eine Stelle (oder Initiativbewerbung). Referrals konvertieren in `Candidate` + `Application` unter Erhalt von `referralId`/`source`.
- **Statusautomatik:** `Application.autoStatus` (`NEU`/`OFFEN`) getrennt von `manualStatus` (nullable). Effektiver Status = `manualStatus ?? autoStatus`. Scheduler setzt `NEU → OFFEN` nach 72 h nur bei `manualStatus IS NULL`.
- **Regionale Zuordnung:** `Region` (NRW, Hessen, Rheinland-Pfalz, Bayern) + `responsibleRegionId` auf Application: RLP-Bewerbungen erhalten `responsibleRegion = Hessen` (Bundesland bleibt RLP im Datensatz). Mapping in `SystemSetting` konfigurierbar.
- **Delegation:** zeitfensterbasiert (`startsAt`/`endsAt`, Status). Wirksame Regionen eines Teamleiters = eigene Region + aktive Vertretungen (keine Transitivität, keine Selbstvertretung – DB-Check + Servicevalidierung).

## 6. Realtime (Chat)

- `RealtimeHub`-Interface (`publish(channel, event)` / `subscribe(channel)`), Default: In-Memory (ein Prozess). 
- Besucherseite: `EventSource` auf `/api/chat/stream?conversation=…` (Token-gebunden), Innendienst: `/api/admin/chat/stream`.
- Nachrichten laufen immer über die DB (Quelle der Wahrheit); SSE ist nur Zustellbeschleuniger, Polling-Fallback eingebaut.

## 7. Scheduler

- Start via `instrumentation.ts` (nur im Node-Runtime-Prozess), Tick pro Minute.
- **PostgreSQL Advisory Lock** verhindert Doppelausführung bei mehreren Instanzen.
- Jobs idempotent; jeder Lauf in `AuditLog` (Kategorie `system`).
- Alternativ extern auslösbar: `POST /api/cron/run` mit `CRON_SECRET` (für Plattform-Cron).

## 8. E-Mail

Templates (Neue Bewerbung intern · Eingangsbestätigung · Neue Empfehlung intern · Referral-Einladung · Neuer Chat · Academy-Einladung/-Erinnerung) liegen als typisierte Funktionen in `src/lib/email/templates/`; Betreff/Textbausteine über Settings anpassbar. Interne Mails enthalten Name/Stelle/Bundesland + geschützten Link, keine vollständigen Bewerberdaten. Versand mit Retry über `EmailLog` (Status `PENDING/SENT/FAILED`).

## 9. SEO & Performance

- Metadata-API je Route, `sitemap.ts`, `robots.ts` (Disallow `/admin`, `/academy`), Canonicals, OpenGraph.
- `JobPosting`-JSON-LD auf Jobdetails (mit `validThrough`; abgelaufene Stellen: 410-Strategie mit Verweis auf Jobübersicht), `Organization`/`LocalBusiness` auf Kontakt/Start.
- Bilder über `next/image` (AVIF/WebP, feste Dimensionen), Fonts lokal (`@fontsource`, OFL-Lizenz), minimale Client-Bundles (Interaktivität nur in Insel-Komponenten), `prefers-reduced-motion` respektiert.
