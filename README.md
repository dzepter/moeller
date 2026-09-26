# Möller GmbH – Website, Bewerbermanagement & Academy

Die komplette Plattform der Möller GmbH Beratungs- & Vertriebsgesellschaft
(Gau-Algesheim) in einer Anwendung:

1. **Öffentliche Website** – Unternehmensauftritt, Jobbörse mit Bewerbung
   „in zwei Minuten", Initiativbewerbung, Mitarbeiterempfehlungen und Live-Chat.
2. **Interner Bereich** (`/admin`) – Bewerbermanagement mit Status-Automatik,
   Wiedervorlagen, regionaler Zuordnung und Vertretungen, Stellenverwaltung,
   Empfehlungs-Verwaltung, Chat-Arbeitsplatz, Website-CMS, Medienbibliothek,
   Benutzerverwaltung, Reporting, Datenschutz-Werkzeuge und Audit-Log.
3. **Möller Academy** (`/academy`) – mobile Online-Schulung für neue
   Promotor:innen mit persönlichem Magic-Link, Fortschrittsanzeige,
   Wissens-Checks und Abschluss-Übersicht im Admin-Dashboard.

Wer nur Inhalte pflegen möchte (Texte, Bilder, Jobs, Benutzer), springt direkt
zu **[Anleitungen für den Alltag](#anleitungen-für-den-alltag-ohne-technik)**.

---

## Inhalt

- [Technik-Überblick](#technik-überblick)
- [Lokale Installation](#lokale-installation)
- [Umgebungsvariablen (ENV)](#umgebungsvariablen-env)
- [Datenbank & Migrationen](#datenbank--migrationen)
- [Seed & Anmeldung im Dev-Modus](#seed--anmeldung-im-dev-modus)
- [E-Mail-Konfiguration](#e-mail-konfiguration)
- [Dateispeicher (Storage)](#dateispeicher-storage)
- [Chat / Realtime](#chat--realtime)
- [Scheduler / Cron](#scheduler--cron)
- [Möller Academy](#möller-academy)
- [Tests](#tests)
- [Deployment (Docker)](#deployment-docker)
- [Backup & Restore](#backup--restore)
- [Datenschutz konfigurieren](#datenschutz-konfigurieren)
- [Anleitungen für den Alltag (ohne Technik)](#anleitungen-für-den-alltag-ohne-technik)
- [Sicherheit](#sicherheit)
- [Weiterführende Dokumentation](#weiterführende-dokumentation)

---

## Technik-Überblick

| Baustein | Technologie |
| --- | --- |
| Framework | Next.js 16 (App Router, Standalone-Build), React 19, TypeScript strict |
| Datenbank | PostgreSQL 16 über Prisma ORM (Migrationen im Repo) |
| Styling | Tailwind CSS 4 mit eigenem Designsystem (`docs/DESIGN_SYSTEM.md`) |
| Auth | Eigene Sessions (DB-gestützt), Argon2id-Passwörter, TOTP-MFA |
| Realtime | Server-Sent Events (SSE) für Chat und Posteingang |
| E-Mail | SMTP oder Log-Provider (Entwicklung), Vorlagen in Deutsch |
| Tests | Vitest (Unit/Integration/Permissions), Playwright (E2E + axe-Accessibility) |

---

## Lokale Installation

Voraussetzungen: **Node.js 22**, **Docker** (für PostgreSQL) oder eine lokale
PostgreSQL-16-Instanz.

```bash
# 1. Abhängigkeiten installieren
npm ci

# 2. Datenbank starten (PostgreSQL 16 im Container)
docker compose up -d

# 3. Umgebungsdatei anlegen
cp .env.example .env
#    → für die lokale Entwicklung funktionieren die Beispielwerte unverändert

# 4. Datenbankschema anlegen
npm run prisma:migrate

# 5. Demo-Daten einspielen (Rollen, Benutzer, Jobs, Academy-Kurs, CMS-Inhalte)
npm run seed

# 6. Entwicklungsserver starten
npm run dev
```

Website: <http://localhost:3000> · Interner Bereich: <http://localhost:3000/admin>

---

## Umgebungsvariablen (ENV)

Alle Variablen stehen kommentiert in [`.env.example`](.env.example). Die wichtigsten:

| Variable | Bedeutung |
| --- | --- |
| `APP_BASE_URL` | Öffentliche Basis-URL (E-Mail-Links, Sitemap, Academy-Links) |
| `DATABASE_URL` | PostgreSQL-Verbindung |
| `APP_ENCRYPTION_KEY` | 64 Hex-Zeichen; verschlüsselt ruhende Geheimnisse (TOTP). Erzeugen: `openssl rand -hex 32` |
| `SESSION_PEPPER` | Pepper für Session-/Token-Hashes. Erzeugen: `openssl rand -hex 32` |
| `CRON_SECRET` | Optional: aktiviert den externen Trigger `POST /api/cron/run` |
| `EMAIL_PROVIDER` | `log` (Entwicklung) oder `smtp` (Produktion) |
| `STORAGE_PROVIDER` | `local` (Standard) oder `s3` |
| `SCHEDULER_ENABLED` | Interner Minuten-Tick an/aus (Standard: `true`) |
| `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` | Passwörter für Seed-Benutzer; leer = Zufallspasswörter, die einmalig in der Konsole ausgegeben werden |

**Produktiv zwingend:** `APP_ENCRYPTION_KEY` und `SESSION_PEPPER` mit echten
Zufallswerten setzen – die Anwendung verweigert sonst den Start.

⚠️ `RATE_LIMIT_DISABLED=true` schaltet sämtliche Rate-Limits ab. Das ist
**ausschließlich für automatisierte Tests** gedacht und darf in keiner echten
Umgebung gesetzt sein (der Start protokolliert dann eine laute Warnung).

---

## Datenbank & Migrationen

- Schema: [`prisma/schema.prisma`](prisma/schema.prisma), Migrationen unter
  [`prisma/migrations/`](prisma/migrations/).
- Entwicklung: `npm run prisma:migrate` (erstellt/übernimmt Migrationen).
- Produktion: `npm run prisma:deploy` (wendet vorhandene Migrationen an, ohne
  neue zu erzeugen). Das Docker-Image führt dies beim Start automatisch aus.
- Schemaänderungen laufen **immer** über Migrationen – nie von Hand an der
  Datenbank vorbei.

---

## Seed & Anmeldung im Dev-Modus

`npm run seed` legt idempotent an: Rollen & Berechtigungen, Regionen,
Demo-Benutzer, vier Beispiel-Stellen, CMS-Startinhalte, den kompletten
Academy-Kurs sowie (nur außerhalb von Produktion) Demo-Bewerbungen.

| Benutzer | Rolle | E-Mail |
| --- | --- | --- |
| Markus Möller | Administrator | `markus@bvg-moeller.de` |
| Jana Talackova | Innendienst | `jana@bvg-moeller.de` |
| Jasmin Mück | Innendienst | `jasmin@bvg-moeller.de` |
| Teamleitung NRW (Demo) | Teamleiter | `tl-nrw@bvg-moeller.de` |
| Teamleitung Hessen (Demo) | Teamleiter | `tl-hessen@bvg-moeller.de` |
| Teamleitung Bayern (Demo) | Teamleiter | `tl-bayern@bvg-moeller.de` |

Passwörter kommen aus `SEED_ADMIN_PASSWORD` bzw. `SEED_USER_PASSWORD`. Sind die
Variablen leer, erzeugt der Seed **Zufallspasswörter und gibt sie einmalig in
der Konsole aus** – notieren und beim ersten Login ändern. Für Administratoren
ist die Multi-Faktor-Anmeldung (TOTP) verpflichtend und wird beim ersten Login
eingerichtet.

---

## E-Mail-Konfiguration

- **Entwicklung:** `EMAIL_PROVIDER=log` – E-Mails werden nicht versendet,
  sondern vollständig im E-Mail-Protokoll gespeichert (einsehbar in der
  Datenbanktabelle `EmailLog`; Academy-Magic-Links lassen sich dort z. B.
  herauskopieren).
- **Produktion:** `EMAIL_PROVIDER=smtp` plus `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` und `EMAIL_FROM`.
- Fehlgeschlagene Sendungen landen mit Fehlertext im Protokoll; der Scheduler
  versucht sie automatisch erneut.
- Alle Vorlagen (Eingangsbestätigung, Status-Infos, Academy-Einladung,
  Erinnerungen …) liegen in `src/lib/email/templates.ts` – deutschsprachig,
  Bewerber werden geduzt, Unternehmen gesiezt.

---

## Dateispeicher (Storage)

- **`local` (Standard):** Dateien liegen unter `STORAGE_LOCAL_ROOT`
  (Standard `./var/uploads`, bewusst außerhalb von `public/`). Vertrauliche
  Dateien (z. B. Lebensläufe) werden **nie** direkt ausgeliefert, sondern nur
  über zugriffsgeprüfte Routen (`/api/admin/files/…`).
- **`s3`:** S3-kompatibler Objektspeicher (AWS S3, Hetzner, MinIO …) über
  `S3_*`-Variablen; getrennte Buckets für öffentliche Medien und private
  Dateien.
- Beim `local`-Provider gehört das Upload-Verzeichnis **mit ins Backup**
  (siehe unten).

---

## Chat / Realtime

- Der Besucher-Chat ist ein **menschlicher** Kanal – es antwortet kein Bot.
  Besucher werden über ein anonymes Token wiedererkannt (kein Konto nötig),
  der Innendienst arbeitet unter `/admin/chats` mit Live-Updates.
- Zustellung per **Server-Sent Events**; die Datenbank bleibt Quelle der
  Wahrheit, SSE beschleunigt nur die Anzeige.
- Der mitgelieferte In-Memory-Hub gilt für **eine** App-Instanz (Standard-
  Deployment). Für Multi-Instanz-Betrieb ist die Schnittstelle
  `RealtimeHub` (`src/lib/realtime.ts`) vorbereitet – z. B. für eine
  Redis-Pub/Sub-Implementierung; Aufrufer bleiben unverändert.

---

## Scheduler / Cron

Wiederkehrende Aufgaben (Status-Automatik „Neu → Offen" nach Ablauf der
konfigurierten Frist, zeitgesteuerte Job- und CMS-Veröffentlichung,
E-Mail-Neuversand, Datenschutz-Aufbewahrung, Academy-Erinnerungen) laufen über
idempotente Jobs:

- **Intern (Standard):** Minuten-Tick im App-Prozess (`SCHEDULER_ENABLED=true`).
  Ein PostgreSQL-Advisory-Lock verhindert Doppelläufe bei mehreren Instanzen.
- **Extern (optional):** `CRON_SECRET` setzen und von einer Plattform
  (Kubernetes CronJob, systemd-Timer, Hosting-Cron) aufrufen lassen:

  ```bash
  curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/run
  ```

  Ohne gesetztes `CRON_SECRET` ist der Endpunkt deaktiviert. Beide Wege können
  parallel existieren – der Lock schützt vor Überschneidungen.

---

## Möller Academy

- Neue Promotor:innen erhalten nach der Zusage per Klick auf **„Onboarding
  starten"** (in der Bewerbungsakte) eine E-Mail mit persönlichem
  **Magic-Link** – ohne Passwort, mobil optimiert.
- Links sind widerruflich, laufen ab und werden nur als Hash gespeichert.
- Fortschritt, Wissens-Checks und Abschluss sind für den Innendienst unter
  `/admin/academy` sichtbar; Erinnerungen bei Inaktivität verschickt der
  Scheduler automatisch.
- Kursinhalte werden unter `/admin/academy/inhalte` **ohne Programmierung**
  gepflegt (einfaches Textformat für Lektionen und Quizfragen, erklärt direkt
  im Editor). Veröffentlichte Kursversionen sind eingefroren; Änderungen
  erzeugen eine neue Version – laufende Teilnehmer behalten ihren Stand.
- Fachliche Quelle war die Admin-Schulung (PowerPoint). Auffälligkeiten und
  bereinigte sensible Inhalte sind in
  [`docs/TRAINING_CONTENT_AUDIT.md`](docs/TRAINING_CONTENT_AUDIT.md)
  dokumentiert. Die Original-Präsentation gehört **nicht** ins Repository.

---

## Tests

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript strict
npm test            # Vitest: Unit-, Integrations- und Permission-Tests
```

Die Vitest-Suite nutzt eine eigene Testdatenbank `moeller_test` (wird beim
Start automatisch mit dem Schema versorgt). Abgedeckt sind u. a.
Status-Automatik, regionale Zuordnung inkl. Rheinland-Pfalz-Regel,
Vertretungen (kein Selbst-/Zirkel-/Ketten-Delegieren), Empfehlungs-Konvertierung,
Aufbewahrungs-Jobs, Academy-Flows und die Teamleiter-Sichtbarkeit
(IDOR-Schutz).

**E2E + Accessibility (Playwright, axe):**

```bash
npm run build                      # Production-Build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
npm run e2e                        # startet den Standalone-Server auf Port 3200
```

Die E2E-Suite prüft die öffentlichen Kernflüsse (Bewerbung, Empfehlung, Chat,
404), die internen Abläufe (Status, Wiedervorlage, Chat-Antwort, CMS-Publish,
Berechtigungen) und den kompletten Academy-Weg von der Zusage bis zur
abgeschlossenen Lektion – inklusive WCAG-2.1-AA-Prüfung per axe.

---

## Deployment (Docker)

Das Repository enthält ein produktionsfertiges [`Dockerfile`](Dockerfile)
(Multi-Stage, Non-Root, Standalone-Build; wendet Migrationen beim Start an):

```bash
docker build -t moeller-plattform .

docker run -d --name moeller -p 3000:3000 \
  -e DATABASE_URL="postgresql://…" \
  -e APP_BASE_URL="https://www.bvg-moeller.de" \
  -e APP_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  -e SESSION_PEPPER="$(openssl rand -hex 32)" \
  -e EMAIL_PROVIDER=smtp -e SMTP_HOST=… -e SMTP_USER=… -e SMTP_PASSWORD=… \
  -v moeller-uploads:/app/var/uploads \
  moeller-plattform
```

Checkliste vor dem Livegang:

1. Echte Secrets gesetzt (`APP_ENCRYPTION_KEY`, `SESSION_PEPPER`; Werte sicher
   verwahren – der Encryption-Key lässt sich nicht folgenlos tauschen).
2. `APP_BASE_URL` auf die echte Domain gesetzt (E-Mail- und Academy-Links!).
3. SMTP getestet (Eingangsbestätigung an eine Testadresse).
4. Seed einmalig ausgeführt, Zufallspasswörter vergeben, MFA für Admins aktiv.
5. Demo-Teamleiter-Konten deaktivieren oder durch echte ersetzen.
6. Backups eingerichtet (siehe unten) und Restore einmal geprobt.
7. `RATE_LIMIT_DISABLED` ist **nicht** gesetzt.
8. HTTPS terminiert der vorgelagerte Proxy; die App setzt Security-Header
   (CSP, HSTS-fähig) bereits selbst.

---

## Backup & Restore

**Sichern** (täglich empfohlen, vor Updates zwingend):

```bash
# Datenbank
pg_dump --format=custom --file=moeller_$(date +%F).dump "$DATABASE_URL"

# Datei-Uploads (nur bei STORAGE_PROVIDER=local)
tar czf uploads_$(date +%F).tar.gz -C /app/var uploads
```

**Wiederherstellen:**

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" moeller_2026-09-26.dump
tar xzf uploads_2026-09-26.tar.gz -C /app/var
```

Aufbewahrung der Backups an die eigenen Datenschutzfristen koppeln – ein
Backup ist personenbezogene Datenhaltung.

---

## Datenschutz konfigurieren

Alle Fristen sind **einstellbar** (keine fest einprogrammierten Werte) unter
**Admin → Einstellungen → Datenschutz**:

- Aufbewahrung abgelehnter/inaktiver Bewerbungen, Empfehlungen und
  Chat-Verläufe (Anonymisierung bzw. Löschung durch den täglichen
  Retention-Job).
- **Admin → Datenschutz** bietet pro Person: Datenexport (maschinenlesbar)
  und Löschung/Anonymisierung auf Anfrage.
- Einwilligungen werden mit Zeitpunkt und Textversion gespeichert
  (`ConsentRecord`); IP-Adressen tauchen höchstens als gesalzener Hash auf
  (Rate-Limits), nie im Klartext.
- Details: [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md).

---

## Anleitungen für den Alltag (ohne Technik)

**Websiteinhalte ändern:** Admin → **Website** → Seite wählen → Felder
bearbeiten → „Speichern & veröffentlichen". Jede Veröffentlichung erzeugt eine
Version, die sich mit einem Klick wiederherstellen lässt. Entwürfe können
zeitgesteuert veröffentlicht werden.

**Bilder austauschen:** Admin → **Medien** → Bild hochladen (Alt-Text ist
Pflicht, Freigabe-Haken für Personenfotos) → anschließend im Website-Editor
das gewünschte Bildfeld auf das neue Medium umstellen. Die aktuellen Fotos
sind bewusst Platzhalter aus dem PoS-Bestand – neue Fotos einfach hochladen
und zuordnen, ein Code-Deployment ist **nicht** nötig.

**Job anlegen:** Admin → **Stellen** → „Neue Stelle". Titel, Region,
Beschäftigungsart, Aufgaben/Anforderungen ausfüllen; optional zeitgesteuert
veröffentlichen oder automatisch deaktivieren. Die Vorschau zeigt die Anzeige
vor der Veröffentlichung.

**Benutzer anlegen:** Admin → **Benutzer** → „Neuer Benutzer" → Rolle
(Administrator, Innendienst, Teamleiter) und ggf. Region zuweisen. Das
Startpasswort wird einmalig angezeigt und muss beim ersten Login geändert
werden. Deaktivieren statt löschen, damit Historie und Audit-Log konsistent
bleiben.

**Vertretung einrichten:** Admin → **Vertretungen** → Teamleiter, Vertretung
und Zeitraum wählen. Die Vertretung sieht die fremde Region nur im Zeitraum;
Selbst-, Zirkel- und Ketten-Vertretungen verhindert das System.

**WhatsApp-Kontakt:** Die Website verlinkt WhatsApp über die zentrale Nummer
aus Admin → **Einstellungen** (Standard: Festnetznummer 06725 919350). Damit
Klicks zuverlässig in WhatsApp landen, muss diese Nummer tatsächlich bei
**WhatsApp Business** registriert sein – andernfalls die Nummer in den
Einstellungen auf die registrierte Mobilnummer ändern. Vorbefüllte
Nachrichtentexte sind dort ebenfalls einstellbar.

---

## Sicherheit

- Passwörter: Argon2id; Sessions: DB-gestützt mit gepfefferten Token-Hashes,
  `__Host-`-Cookie, Idle- und Absolut-Ablauf.
- MFA (TOTP) für Administratoren verpflichtend; TOTP-Secrets ruhen
  AES-256-GCM-verschlüsselt.
- Berechtigungen werden **serverseitig** in jeder Server-Action und Route
  geprüft (Objekt-Ebene, nicht nur Menü-Ausblendung); dedizierte
  Permission-Tests sichern das ab.
- Rate-Limits auf allen öffentlichen Formularen und dem Login; Audit-Log für
  sicherheitsrelevante Aktionen.
- **Härtungsempfehlung Audit-Log:** dem Anwendungs-Datenbankbenutzer
  `UPDATE`/`DELETE` auf der Tabelle entziehen, damit Einträge auch auf
  DB-Ebene unveränderlich sind:

  ```sql
  REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM moeller;
  ```

- Keine Secrets im Repository; `.env` ist git-ignoriert.
- Sicherheitskonzept im Detail: [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md).

---

## Weiterführende Dokumentation

| Dokument | Inhalt |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Systemarchitektur, Module, Datenfluss |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Farben, Typografie, Gestaltungsprinzipien |
| [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md) | Sicherheits- & Datenschutzkonzept |
| [`docs/ACADEMY_ARCHITECTURE.md`](docs/ACADEMY_ARCHITECTURE.md) | Academy: Datenmodell, Magic-Links, Versionierung |
| [`docs/TRAINING_CONTENT_AUDIT.md`](docs/TRAINING_CONTENT_AUDIT.md) | Prüfbericht der Schulungsinhalte (Pflichtlektüre vor Academy-Änderungen) |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architektur-Entscheidungen (ADR) |
