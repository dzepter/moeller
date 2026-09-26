# Möller Academy – Architektur

Stand: 2026-09-26 · Grundlage: Addendum + `TRAINING_CONTENT_AUDIT.md` (Pflichtlektüre vor Content-Änderungen)

## 1. Zielbild

Neue Promotoren erhalten nach Status **„Zusage"** per Aktion **„Onboarding starten"** einen
personalisierten Magic Link, absolvieren die Schulung selbstständig (mobil-first) und der Innendienst
sieht Fortschritt & Abschluss im Dashboard. Keine PPT-Einbettung – echte, didaktische Lernmodule.

## 2. Datenmodell

```
TrainingCourse            Kurs (z. B. „Admin-Schulung"), Slug, aktiv
└─ TrainingCourseVersion  eingefrorene Version (semver-artig, publishedAt, changelog)
   └─ TrainingModule      Reihenfolge, Titel, Einleitung
      └─ TrainingLesson   strukturierter Inhalt (JSON-Blöcke), sourceSlides[]
         └─ TrainingQuestion (+ TrainingQuestionOption, korrekt-Flag, Erklärung)
TrainingAsset             Medien je Version (redigierte Screenshots, Freigabestatus)
TrainingAssignment        Teilnehmer (candidateId) × CourseVersion, Status, zugewiesen von/az
TrainingInvitation        Magic-Link (tokenHash, expiresAt, revokedAt, sentAt, firstUsedAt)
TrainingProgress          je Assignment × Lesson: begonnen/abgeschlossen, Zeitstempel
TrainingAnswer            je Assignment × Question: gewählte Option(en), korrekt?
TrainingCompletion        Abschluss: Datum, Version, Quiz-Ergebnis, Audit-Ref
TrainingReminderLog       versendete Erinnerungen (Anti-Spam)
```

**Versionierungsregel:** Veröffentlichte Versionen sind unveränderlich. Inhaltliche Änderungen ⇒ neue
Version (Entwurf → veröffentlichen). Laufende Assignments behalten ihre Version; Abschlüsse
referenzieren die absolvierte Version dauerhaft. „Erneut zuweisen" erzeugt ein neues Assignment
(ggf. neue Version), alte Abschlüsse bleiben erhalten.

## 3. Zugriff & Sicherheit

- URL-Raum `/academy` (Einstieg `/academy/[token]` → setzt httpOnly-Session-Cookie fürs Assignment).
- Token: 32 Byte random, **nur SHA-256-Hash gespeichert**, Ablauf konfigurierbar (Default 30 Tage),
  widerrufbar (Admin-Aktion), erneut versendbar (alter Token wird revoked).
- Rate Limit auf Token-Prüfung; `noindex,nofollow` + robots-Disallow; keine öffentliche Kursliste.
- Fortschritt zählt serverseitig; Gerätewechsel = Link erneut öffnen (Session folgt dem Assignment).

## 4. Kursstruktur v1 („Admin-Schulung", aus PPTX überführt)

11 Module gemäß Addendum (Willkommen · Organisatorisches · Portal-Login · Portal-Alltag ·
Vertragseingabe & Tagesabschluss · SSC-Erstanmeldung · SSC-Passwort · EASY+ · EASY ·
EASY-Passwort · Abschluss mit Wissenscheck). Jede Lektion:

- Blocktypen: `intro`, `steps` (nummerierte Einzelschritte), `screenshot` (zoombar, Alt-Text,
  nur redigierte Assets), `warning` (visuell hervorgehoben), `remember` („Das musst Du Dir merken"),
  `example`, `quiz`.
- `sourceSlides: [n,…]` je Lektion → Rückverfolgbarkeit zur PPTX (Audit-Anforderung).
- Sprache: konsequent Du; fachliche Schritte/Reihenfolgen/URLs unverändert (Audit §5.4).
- Wissenscheck: 1–4 Verständnisfragen je Modul + Abschlusscheck in Modul 11; falsche Antwort ⇒
  Erklärung + Link zur betreffenden Lektion. Keine Fangfragen.

## 5. Fortschritt & Abschluss

Modulnavigation mit Zuständen (offen/aktiv/abgeschlossen), Fortschrittsbalken (% = abgeschlossene
Pflichtlektionen), „Zuletzt hier gewesen"-Wiedereinstieg, automatisches Speichern je Lektion,
frühere Module jederzeit erneut öffnbar. Abschluss nur, wenn alle Pflichtmodule abgeschlossen und
der Wissenscheck bestanden ist (Schwelle konfigurierbar, Default 80 %; beliebig wiederholbar –
Lernziel, kein Assessment-Druck). Kein Gamification-Zirkus.

## 6. Workflow Innendienst

1. Bewerbung erhält Status **Zusage** → Button **„Onboarding starten"**.
2. Dialog: Kurs(version) wählen (Default: aktive Version der Admin-Schulung) → erzeugt Assignment +
   Invitation, versendet personalisierte E-Mail (Template editierbar), Audit-Eintrag.
3. Dashboard „Academy": Teilnehmerliste mit Status (nicht eingeladen · Einladung versendet · begonnen ·
   in Bearbeitung · abgeschlossen · überfällig), Fortschritt %, erster/letzter Zugriff, Version,
   Quiz-Ergebnis; Filter (Status, Version, Region/Teamleiter); Aktionen: erneut einladen, Link
   widerrufen, erneut zuweisen.
4. Erinnerungen (konfigurierbar, Default aus): nach X Tagen ohne Start / ohne Abschluss; Benachrichtigung
   an Innendienst bei Fristüberschreitung. `TrainingReminderLog` verhindert Spam.

## 7. Rollen

Administrator: alles inkl. Content & Versionen. Innendienst: Teilnehmer verwalten, zuweisen, Fortschritt
sehen; Content-Bearbeitung gemäß Permission (Default: ja für Academy-Inhalte, da operativ – abweichend
von Website-Marketingtexten; per Permission entziehbar). Teamleiter: nur Fortschritt der Promotoren der
eigenen wirksamen Regionen (Permission `academy.viewRegional`, Default an).

## 8. CMS für Academy-Inhalte

Kurse/Module/Lektionen/Fragen im Admin bearbeitbar (strukturierte Blöcke, kein Roh-HTML), Entwurfs-
versionen mit Vorschau (als Testteilnehmer), Veröffentlichung erzeugt neue eingefrorene Version.
Screenshots über Medienbibliothek (Typ `training`, Freigabestatus, Redaktionshinweis).

## 9. Vorbereitet, nicht überbaut

Mehrere Kurse (Produkt-/Projekt-/Datenschutzschulungen), Zuweisung nach Projekt/Region/Bundesland/
Rolle/Person (Assignment-Filterfelder vorhanden), optionale Audio-Erklärungen je Lektion
(Blocktyp `audio` mit Pflicht-Transkript, standardmäßig ungenutzt), optionale PDF-Abschlussbestätigung
(Feature-Flag, Default aus).
