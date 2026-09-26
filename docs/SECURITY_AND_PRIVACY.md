# Sicherheit & Datenschutz – Möller GmbH Plattform

Stand: 2026-09-26

## 1. Authentifizierung (interner Bereich)

- Passwörter: **Argon2id** (`@node-rs/argon2`, Standard-Parameter memoryCost 19 MiB, timeCost 2, parallelism 1).
- **Sessions in der DB** (`Session`-Tabelle): 32-Byte-Random-Token, nur als SHA-256-Hash gespeichert;
  Cookie `__Host-session`: httpOnly, Secure, SameSite=Lax, Path=/. Idle-Timeout 12 h, absolute 30 Tage.
- „Alle Sitzungen abmelden": löscht alle Sessions des Users; Passwortwechsel erzwingt dies automatisch.
- **MFA (TOTP)** via `otplib`: für alle Rollen aktivierbar; per SystemSetting **für Administratoren erzwingbar**
  (`security.mfaRequiredForAdmins`, Default: an). Secret verschlüsselt (AES-256-GCM, `APP_ENCRYPTION_KEY`).
  Recovery-Codes (10 × einmalig, gehasht).
- Passwort-Reset per E-Mail-Token (gehasht, 60 min gültig, Einmalgebrauch). Antwortverhalten
  enumeration-sicher (immer „E-Mail versendet, falls Konto existiert").
- **Rate Limiting / Brute Force:** zentraler Limiter (DB-basiert, Fenster + Sperre): Login 10/15min
  pro Konto + IP-Hash, Magic-Link-Prüfung 20/15min, öffentliche Formulare 5/10min pro IP-Hash + Honeypot
  + Zeitfalle. IPs werden dafür nur als **gesalzener Hash mit 24h-TTL** gespeichert.


**Betriebssperre (First-Login/MFA-Pflicht):** `mustChangePassword` und die
Admin-Pflicht-MFA werden zentral in `getCurrentUser()`/`assertPermission()`
durchgesetzt (fail closed). Server Actions und geschützte Route Handler sind
damit automatisch gesperrt, bis der Zustand aufgelöst ist; nur die
Entsperr-Flows (Passwort ändern, MFA-Setup, Logout) laufen über
`getSessionUser()`. Getestet an echten Action-/API-Grenzen
(`tests/permissions/operational-lock.test.ts`, E2E inkl. API-Aufruf).

## 2. Autorisierung

- **RBAC** aus DB (Role → Permission), Rollen nicht hart verdrahtet; Seeds: Administrator, Innendienst,
  Teamleiter (je Region über `User.regionId`).
- **Object-Level Authorization** in jedem Service: Teamleiter sehen nur Bewerber/Referrals/Academy-Teilnehmer
  ihrer wirksamen Regionen (eigene + aktive Vertretung + explizite Einzelzuweisung). Rheinland-Pfalz →
  Verantwortung Hessen (konfigurierbar). Kein IDOR: alle Detail-Loads filtern serverseitig per Scope,
  nie nur per ID.
- Vertretungen: zeitfensterbasiert, keine Selbst-/Zirkular-/transitive Vertretung (Service-Checks + Tests).
  Rechte enden automatisch mit `endsAt` (kein Cron nötig – Scope wird zur Laufzeit berechnet).
- Innendienst: operativ alles, aber keine CMS-Marketinginhalte, kein Design, keine Benutzer-/Rollenverwaltung
  (Permission-gesteuert, Admin kann Permissions später erweitern).
- Alle Permission-Regeln automatisiert getestet (`tests/permissions/`).

## 3. Security Header & Transport

Zentral in `next.config.ts`/Middleware:
- `Content-Security-Policy` (default-src 'self'; img/media self+blob:; script self + erforderliche Nonces;
  keine Third-Party-Origins im Default),
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
- `Permissions-Policy` (camera=(), microphone=(), geolocation=()),
- `X-Frame-Options: DENY` (Admin/Academy zusätzlich per CSP `frame-ancestors 'none'`).

## 4. Eingaben, Ausgaben, Uploads

- Zod-Validierung serverseitig für **jede** Mutation; Längenlimits; Normalisierung (Telefon, PLZ).
- XSS: React-Escaping; CMS-Rich-Text ist **strukturierter Inhalt** (kein Roh-HTML); die wenigen
  Render-Pfade mit HTML laufen durch Sanitizer-Whitelist.
- CSRF: Server Actions (Origin-gebunden) bzw. Same-Site-Cookies + Origin-Check in Route Handlers.
- SQL-Injection: ausschließlich Prisma-Parameterbindung; kein String-SQL.
- Uploads (Lebenslauf, Medien): Größenlimit (Default 10 MB), Extension- **und** Magic-Byte-Prüfung
  (PDF/JPG/PNG/WebP), Dateinamen randomisiert, Speicherung **außerhalb** `public/`.
  Private Dateien nur über autorisierte Streaming-Route mit Berechtigungsprüfung; optionaler
  `MalwareScanner`-Adapter: Default `MALWARE_SCANNER=none` ist ausdrücklich KEIN Schutz (Uploads werden nicht geprüft; der Go-Live-Check warnt). Mit `MALWARE_SCANNER=clamav` läuft jeder Upload über clamd (INSTREAM) und gilt FAIL-CLOSED: ist der Scanner nicht erreichbar, wird der Upload abgelehnt – niemals stillschweigend als geprüft behandelt.
- CMS-Medien (öffentlich) und Bewerber-/Academy-Dateien (privat) liegen in getrennten Wurzeln.

## 5. Audit Log

Append-only `AuditLog(actorId, action, entityType, entityId, meta, createdAt, ipHash)`.
Erfasst: Logins (Erfolg/Fehlschlag ohne Passwortdaten), Rollen-/Benutzeränderungen, Bewerber-Zuordnung,
Statuswechsel, Notiz-Edits, Exporte, Löschungen/Anonymisierungen, Vertretungen, CMS-Publishing,
Einstellungening mit Sicherheitsbezug, Academy-Einladungen/-Abschlüsse, Scheduler-Läufe.
Kein Update-/Delete-Codepfad; README dokumentiert `REVOKE UPDATE, DELETE` auf DB-Ebene.
Meta-Felder enthalten keine sensiblen Rohdaten (z. B. nie Passwörter, nie vollständige Bewerberprofile).

## 6. Datenschutz (Privacy by Design)

- **Datenminimierung:** Bewerbungsformular erhebt nur die §15-Pflichtfelder; kein Alter; Anschreiben optional;
  Lebenslauf optional/deaktivierbar. Analytics (falls aktiviert) ereignisbasiert ohne PII.
- **Zweckbindung/Transparenz:** `ConsentRecord` speichert Consent-Version + Zeitstempel je Einreichung
  (Bewerbung, Referral Variante B, optionaler Bewerberpool).
- **Logs ohne PII**, Fehlermeldungen generisch nach außen.
- **Retention (SystemSettings, keine hardcodierten Fristen):** Absagen, abgeschlossene Bewerbungen,
  Chats, Referrals, IP-Hashes, Academy-Einladungstokens. Scheduler zeigt anstehende Löschungen im Admin
  („Datenschutz"-Bereich), führt Anonymisierung/Löschung aus und protokolliert nur Zähler/IDs-Hashes,
  nicht die Inhalte.
- **Betroffenenrechte:** Admin-Suche über alle personenbezogenen Entitäten (Bewerber, Referrals, Chats),
  Export als JSON/CSV (auditiert), Lösch-/Anonymisierungsprozess pro Person anstoßbar.
- E-Mails intern: nur Name, Stelle, Bundesland + geschützter Link (keine vollständigen Datensätze).
- Geocoding (Umkreissuche): abstrahiert, Default **offline** (PLZ-Präfix-Zuordnung ohne Drittanbieter);
  Suchanfragen werden nicht personenbezogen gespeichert.

## 7. Academy-spezifisch

Magic Links: 32-Byte-Token, nur Hash in DB, Ablauf konfigurierbar (Default 30 Tage), widerrufbar,
an Einladung/Teilnehmer gebunden; Rate Limit auf Prüf-Endpoint; `noindex` + `robots`-Disallow;
keine echten Zugangsdaten/OTP-Secrets in Schulungsinhalten (siehe `TRAINING_CONTENT_AUDIT.md`);
Screenshots nur redigiert; Downloads autorisiert.

## 8. Secrets & Betrieb

Keine Secrets im Repo (`.env.example` dokumentiert alle Variablen; Seeds lesen Dev-Passwörter aus ENV).
`APP_ENCRYPTION_KEY`/`SESSION_PEPPER` müssen produktiv gesetzt sein (Startup-Check erzwingt das). `CRON_SECRET` ist optional: ohne Wert ist der externe Trigger `/api/cron/run` deaktiviert und es läuft ausschließlich der interne Scheduler.
Backups/Restore im README. Dependency-Hygiene: gepinnte Versionen, `npm audit` im CI-Abschnitt des README.
