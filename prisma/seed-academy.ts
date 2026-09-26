/**
 * Academy-Seed: überführt die auditierte Admin-Schulung (55 Folien) in Kurs-
 * version 1 der Möller Academy.
 *
 * Quelle: Admin-Schulung-08-2026.pptx · Audit: docs/TRAINING_CONTENT_AUDIT.md
 * Regeln: fachliche Schritte/Reihenfolgen/URLs unverändert; Sprache in Du-Form
 * vereinheitlicht; sourceSlides referenzieren die Original-Folien; sensible
 * Screenshots nur redigiert, K4-markierte Vollbild-Screenshots (image3/4/10/11/
 * 12/17) werden NICHT ausgeliefert (Freigabe erforderlich).
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

type Block =
  | { type: "intro"; text: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "screenshot"; asset: string; alt: string; caption?: string }
  | { type: "warning"; text: string }
  | { type: "remember"; items: string[] }
  | { type: "example"; text: string };

type LessonDef = {
  title: string;
  sourceSlides: number[];
  blocks: Block[];
  questions?: Array<{
    q: string;
    options: Array<[string, boolean]>;
    explanation: string;
    final?: boolean;
  }>;
};

type ModuleDef = { title: string; intro: string; lessons: LessonDef[] };

// Screenshots, die verwendet werden dürfen (Audit): Dateiname → Alt-Text
const ASSETS: Record<string, string> = {
  "image5.png": "OTP-Einrichtungsseite des Möller-Portals mit App-Liste (QR-Code und Schlüssel redigiert)",
  "image6.png": "Browseransicht des Eingabe-Tools mit Hinweis auf neuen Tab und Startseite",
  "image8.png": "Anmeldemaske des Möller-Portals mit Feldern ID, Passwort und OTP",
  "image9.jpg": "Google Authenticator mit Eintrag „Möller GmbH (Login Portal)“ (Code redigiert)",
  "image13.png": "Formular Vertragseingabe mit Referenz-ID, Kundendaten und Produktauswahl",
  "image14.png": "Schaltfläche „Eintragen“ im Eingabe-Tool",
  "image15.png": "Promoter-Menü des Eingabe-Tools mit Menüpunkt „Tag abschließen“",
  "image16.png": "Seite „Tag abschließen“ im Eingabe-Tool (Benutzername redigiert)",
  "image19.png": "Beispiel-E-Mail mit SSC-Zugangsdaten (Musterdaten)",
  "image20.png": "Vodafone Single-Sign-on-Anmeldeseite für Partner",
  "image21.png": "SSC-Login und Passwortrichtlinien nach der Erstanmeldung",
  "image22.png": "SSC-Abfrage der PIN per SMS",
  "image23.png": "SSC-Eingabefeld für die 6-stellige PIN",
  "image24.png": "SSC-Startseite nach erfolgreichem Login (Kennungen redigiert)",
  "image25.png": "SSC-Menüleiste mit „Meine Daten“ (Kennungen redigiert)",
  "image26.png": "SSC-Funktion Rufnummernregistrierung",
  "image27.png": "SSC-Bereich „Vodafone-Systemzugriffe“ mit EASY+-Zugangsdaten",
  "image28.png": "SSC-Maske „Passwort anfordern“ mit Benutzername und E-Mail",
  "image29.png": "E-Mail mit temporärem SSC-Passwort (maskiert)",
  "image30.png": "SSC „Meine Daten“: Vodafone-Systemzugriffe mit Passwort-anzeigen-Funktion",
  "image31.png": "EASY+-Anmeldeseite mit Benutzername und Passwort",
  "image32.png": "EASY+-Abfrage der Einmal-PIN per SMS",
  "image33.png": "EASY+-Startseite nach erfolgreichem Login",
  "image34.png": "VF-EASY-Anmeldeseite im Browser",
  "image35.png": "Willkommens-E-Mail von VF-EASY mit Anleitung (Musterdaten)",
  "image36.png": "VF-EASY-Portal mit Promotions-Übersicht",
  "image38.png": "VF-EASY-Login mit Link „Passwort zurücksetzen“",
  "image39.png": "VF-EASY-Maske „Kennwort ändern“ mit Passwortrichtlinie",
  "image40.png": "VF-EASY-Anmeldung mit mTAN-Eingabefeld",
  "image41.png": "VF-EASY-Startseite mit Verfügbarkeitsprüfung",
  "image42.png": "VF-EASY-Maske „Passwort zurücksetzen“ mit Benutzername und Validierung",
};

const s = (asset: string, caption?: string): Block => ({
  type: "screenshot",
  asset,
  alt: ASSETS[asset] ?? asset,
  caption,
});

const MODULES: ModuleDef[] = [
  {
    title: "Willkommen bei Möller",
    intro: "Wer wir sind, wer Dir hilft – und wofür Büro und Teamleitung zuständig sind.",
    lessons: [
      {
        title: "Dein Innendienst: Jana & Jasmin",
        sourceSlides: [1, 2],
        blocks: [
          {
            type: "intro",
            text: "Schön, dass Du bei Möller startest! Diese Schulung führt Dich Schritt für Schritt durch alles, was Du für Deinen Arbeitsalltag brauchst – von den Unterlagen über unser Portal bis zu den Vodafone-Systemen. Du kannst jederzeit unterbrechen; Dein Fortschritt wird gespeichert.",
          },
          {
            type: "steps",
            title: "Dein erfahrenes Team im Innendienst",
            items: [
              "Jana Talackova – Head of Administration. Diplom-Führungskraft und Diplom-Trainerin (EOTE), im Unternehmen seit 2005.",
              "Jasmin Mück – Assistenz. Staatlich geprüfte Rechtsanwaltsfachangestellte, Fachschulungen u. a. in professioneller Telefonkommunikation, im Team seit Juli 2011.",
            ],
          },
          { type: "remember", items: ["Du erreichst mit dem Büro echte Menschen, die Deine Themen kennen – keine anonyme Hotline."] },
        ],
        questions: [
          {
            q: "Wer ist Dein Innendienst-Team bei Möller?",
            options: [
              ["Jana und Jasmin", true],
              ["Ein externes Callcenter", false],
              ["Nur der Teamleiter", false],
            ],
            explanation: "Jana Talackova und Jasmin Mück sind Dein Innendienst und helfen Dir bei allen Verwaltungsthemen.",
          },
        ],
      },
      {
        title: "Büro oder Teamleitung – wer hilft wobei?",
        sourceSlides: [3],
        blocks: [
          {
            type: "intro",
            text: "Damit Du immer schnell eine Antwort bekommst, sind die Zuständigkeiten klar aufgeteilt.",
          },
          {
            type: "steps",
            title: "Das Büro (Innendienst) ist für Dich da bei:",
            items: [
              "Abrechnungen, Gutschriften und Reklamationen",
              "Auszahlungen",
              "Zugangsdaten für die Portale",
              "Änderungen Deiner Stammdaten",
            ],
          },
          {
            type: "warning",
            text: "Bei Fragen zur Einsatzplanung oder zu Portalen und Produkten im Einsatz wendest Du Dich bitte an Deine Teamleitung – nicht an das Büro.",
          },
          {
            type: "steps",
            title: "So erreichst Du das Büro",
            items: [
              "Telefon: 06725 91 93 50",
              "E-Mail: info@bvg-moeller.de",
              "Adresse: Max-Planck-Str. 8, 55435 Gau-Algesheim",
              // Verbindlich geklärt (Korrekturpaket Punkt 20): durchgehend 08:00–17:00 Uhr.
              // Die 09–12/13–17-Angabe der alten Schulungsfolie ist überholt.
              "Erreichbar: Montag bis Freitag, 08:00–17:00 Uhr (durchgehend)",
              "Aktuelle Zeiten findest Du immer auf www.bvg-moeller.de/kontakt.",
            ],
          },
        ],
        questions: [
          {
            q: "An wen wendest Du Dich bei Fragen zur Einsatzplanung?",
            options: [
              ["An meine Teamleitung", true],
              ["An das Büro", false],
              ["An den Markt", false],
            ],
            explanation: "Planung und Produktfragen laufen über Deine Teamleitung; das Büro kümmert sich um Verwaltung, Auszahlungen und Zugänge.",
            final: true,
          },
        ],
      },
    ],
  },
  {
    title: "Organisatorisches",
    intro: "Unterlagen, Verfügbarkeit, Auszahlung und Reklamation – einmal sauber erklärt.",
    lessons: [
      {
        title: "Diese Unterlagen brauchen wir von Dir",
        sourceSlides: [4],
        blocks: [
          {
            type: "steps",
            title: "Benötigte Unterlagen",
            items: [
              "Rahmenvertrag im Original",
              "Gewerbeanmeldung",
              "Steuernummer",
              "Anschrift",
              "Bankdaten (IBAN/BIC)",
            ],
          },
          {
            type: "warning",
            text: "Änderungen Deiner Daten (z. B. Bank oder Anschrift) musst Du rechtzeitig per E-Mail an das Büro melden.",
          },
          {
            type: "steps",
            title: "Verfügbarkeit & Planung",
            items: [
              "Schick Dein Verfügbarkeitsformular vor dem nächsten Monat an das Büro.",
              "Ohne Formular können wir Dich nicht einplanen.",
            ],
          },
        ],
        questions: [
          {
            q: "Was passiert, wenn Du Dein Verfügbarkeitsformular nicht rechtzeitig schickst?",
            options: [
              ["Ich kann für den Monat nicht eingeplant werden", true],
              ["Nichts, das Formular ist freiwillig", false],
              ["Der Markt plant mich automatisch ein", false],
            ],
            explanation: "Ohne Verfügbarkeitsformular keine Planung – schick es deshalb immer vor Monatsbeginn ans Büro.",
          },
        ],
      },
      {
        title: "Auszahlung, Gutschrift & Reklamation",
        sourceSlides: [4],
        blocks: [
          {
            type: "steps",
            title: "So läuft Deine Auszahlung",
            items: [
              "Die Auszahlung erfolgt in der letzten Kalenderwoche des Folgemonats.",
              "Für die Auszahlung stellen wir eine Gutschrift aus.",
              "Die Auflistung Deiner provisionsrelevanten Verträge bekommst Du zusammen mit der Gutschrift innerhalb von 5 Werktagen nach der Auszahlung.",
            ],
          },
          {
            type: "steps",
            title: "Wenn etwas nicht stimmt: Reklamation",
            items: [
              "Reklamationen musst Du zeitnah über das Formular einreichen (im Portal unter „Downloads“).",
              "Das ausgefüllte Formular schickst Du per E-Mail an das Büro.",
            ],
          },
          { type: "remember", items: ["Auszahlung: letzte Kalenderwoche des Folgemonats.", "Reklamation: zeitnah, per Formular aus dem Portal, per E-Mail ans Büro."] },
        ],
        questions: [
          {
            q: "Wann erfolgt die Auszahlung?",
            options: [
              ["In der letzten Kalenderwoche des Folgemonats", true],
              ["Immer am 1. des Monats", false],
              ["Sofort nach jedem Einsatz", false],
            ],
            explanation: "Die Auszahlung kommt in der letzten Kalenderwoche des Folgemonats, zusammen mit einer Gutschrift.",
            final: true,
          },
        ],
      },
    ],
  },
  {
    title: "Möller-Portal: Dein erster Login",
    intro: "portal-moeller.de einrichten: Verkäufernummer, Passwort und OTP-App – einmalig, danach geht alles schnell.",
    lessons: [
      {
        title: "Erste Anmeldung mit Deiner Verkäufernummer",
        sourceSlides: [5],
        blocks: [
          {
            type: "intro",
            text: "Dein wichtigstes Werkzeug ist unser Portal unter www.portal-moeller.de. Hier gibst Du Verträge ein, bestätigst Deine Planung und schließt Deine Einsatztage ab.",
          },
          {
            type: "steps",
            items: [
              "Öffne www.portal-moeller.de.",
              "Gib bei „ID“ Deine Verkäufernummer ein.",
              "Lass bei der allerersten Anmeldung das Passwort-Feld leer und klick auf „Anmelden“.",
              "Vergib jetzt Dein eigenes Passwort. Es muss mindestens 8 Zeichen lang sein.",
              "Danach wirst Du zur Anmeldung zurückgeleitet: Melde Dich mit Deiner ID und Deinem neuen Passwort an.",
            ],
          },
          s("image8.png", "Die Anmeldemaske des Portals: ID, Passwort und OTP"),
        ],
        questions: [
          {
            q: "Was trägst Du bei Deiner allerersten Anmeldung im Passwort-Feld ein?",
            options: [
              ["Nichts – das Feld bleibt leer", true],
              ["Meine Verkäufernummer", false],
              ["Ein vorgegebenes Standardpasswort", false],
            ],
            explanation: "Beim ersten Login bleibt das Passwortfeld leer; direkt danach vergibst Du Dein eigenes Passwort (mind. 8 Zeichen).",
          },
        ],
      },
      {
        title: "OTP-App einrichten (Zwei-Faktor-Schutz)",
        sourceSlides: [6],
        blocks: [
          {
            type: "intro",
            text: "Zur Sicherheit brauchst Du zusätzlich zum Passwort einen Einmal-Code (OTP) aus einer Authenticator-App auf Deinem Handy.",
          },
          {
            type: "steps",
            items: [
              "Lade Dir eine Authenticator-App mit One-Time-Passwort-Funktion herunter. Das Portal schlägt Dir passende Apps vor (z. B. Google Authenticator, Microsoft Authenticator, FreeOTP).",
              "Scanne mit der App den QR-Code, den Dir das Portal anzeigt. Alternativ kannst Du den angezeigten Sicherheitsschlüssel manuell eingeben.",
              "Wenn Du fertig bist: Geh über „Startseite“ zurück oder öffne die Seite in einem neuen Tab neu.",
            ],
          },
          s("image5.png", "Die OTP-Einrichtungsseite (Dein persönlicher QR-Code erscheint an der redigierten Stelle)"),
          {
            type: "warning",
            text: "WICHTIG: Lade die Einrichtungsseite NICHT neu, solange Du die App einrichtest – sonst musst Du die komplette OTP-Einrichtung von vorne beginnen.",
          },
        ],
        questions: [
          {
            q: "Was darfst Du während der OTP-Einrichtung auf keinen Fall tun?",
            options: [
              ["Die Seite neu laden", true],
              ["Das Handy drehen", false],
              ["Die App im Hintergrund öffnen", false],
            ],
            explanation: "Wenn Du die Seite neu lädst, musst Du die OTP-Einrichtung komplett neu starten. Erst nach Abschluss über „Startseite“ zurückkehren.",
            final: true,
          },
        ],
      },
      {
        title: "Anmelden mit Passwort + OTP-Code",
        sourceSlides: [7, 8],
        blocks: [
          {
            type: "steps",
            items: [
              "Gib bei „ID“ Deine Verkäufernummer ein.",
              "Gib Dein selbst vergebenes Passwort ein.",
              "Öffne Deine Authenticator-App und tippe den aktuell angezeigten Code in das Feld „OTP“.",
              "Klick auf „Anmelden“ (oder drück Enter).",
            ],
          },
          s("image9.jpg", "So sieht der Eintrag in der Authenticator-App aus – der Code wechselt alle 30 Sekunden"),
          { type: "remember", items: ["Der OTP-Code ändert sich alle 30 Sekunden – nimm immer den gerade angezeigten.", "Nach der Anmeldung nutzt Du das Portal ganz normal weiter."] },
        ],
        questions: [
          {
            q: "Was brauchst Du künftig für jeden Portal-Login?",
            options: [
              ["Verkäufernummer, Passwort und den aktuellen OTP-Code", true],
              ["Nur meine Verkäufernummer", false],
              ["Verkäufernummer und E-Mail-Adresse", false],
            ],
            explanation: "Der Login besteht immer aus ID (Verkäufernummer), Deinem Passwort und dem aktuellen Code aus der Authenticator-App.",
          },
        ],
      },
    ],
  },
  {
    title: "Möller-Portal: Deine tägliche Arbeit",
    intro: "Der Promoter-Bereich: Nachrichten, Verträge, Planung, Kalender und Downloads.",
    lessons: [
      {
        title: "Der Promoter-Bereich im Überblick",
        sourceSlides: [9, 10],
        blocks: [
          {
            type: "intro",
            text: "Im Promoter-Bereich des Portals findest Du alles für Deinen Einsatzalltag an einem Ort.",
          },
          s("image15.png", "Das Promoter-Menü im Portal"),
          {
            type: "steps",
            title: "Das kannst Du hier tun:",
            items: [
              "Nachrichten ansehen",
              "Alle am Tag geschriebenen Verträge eingeben",
              "Jeden Einsatztag abschließen – auch wenn keine Verträge geschrieben wurden",
              "Die Historie Deiner letzten 250 Verträge einsehen",
              "Geplante Einsätze ansehen und bestätigen oder absagen",
              "Deinen Übersichtskalender nutzen",
              "Benötigte Unterlagen herunterladen (Downloads)",
            ],
          },
          { type: "remember", items: ["Unter „Planung bestätigen“ bestätigst Du Deine Einsätze – oder sagst rechtzeitig ab."] },
        ],
        questions: [
          {
            q: "Wo bestätigst Du Deine geplanten Einsätze?",
            options: [
              ["Im Portal unter „Planung bestätigen“", true],
              ["Per WhatsApp an den Markt", false],
              ["Gar nicht – Einsätze gelten automatisch", false],
            ],
            explanation: "Deine Einsätze bestätigst (oder absagst) Du direkt im Portal im Promoter-Bereich unter „Planung bestätigen“.",
          },
        ],
      },
    ],
  },
  {
    title: "Vertragseingabe & Tagesabschluss",
    intro: "Verträge richtig erfassen und jeden Einsatztag sauber abschließen – Deine wichtigste Routine.",
    lessons: [
      {
        title: "Verträge eingeben",
        sourceSlides: [11],
        blocks: [
          {
            type: "steps",
            items: [
              "Öffne im Promoter-Bereich „Verträge eingeben“.",
              "Trag die Referenz-ID ein – Achtung, das Format hängt von der Vertragsart ab.",
              "Gib die Kundendaten ein.",
              "Wähle das Produkt aus.",
              "Klick auf „Eintragen“.",
            ],
          },
          s("image13.png", "Die Vertragseingabe mit Referenz-ID, Kundendaten und Produktauswahl"),
          {
            type: "example",
            text: "Referenz-ID-Formate: Cable-Verträge = Vertragsnummer (Weborder-ID) im Format V-18111111 · DSL-Verträge = Vertragsnummer im Format ARC11111111",
          },
        ],
        questions: [
          {
            q: "In welchem Format trägst Du die Referenz-ID eines Cable-Vertrags ein?",
            options: [
              ["V-18111111", true],
              ["ARC11111111", false],
              ["SC12345", false],
            ],
            explanation: "Cable = V-xxxxxxxx (Weborder-ID), DSL = ARCxxxxxxxx. Die SC-Nummer ist Dein SSC-Benutzername und gehört nicht in die Vertragseingabe.",
          },
        ],
      },
      {
        title: "Tag abschließen – jeden Einsatztag!",
        sourceSlides: [12, 13],
        blocks: [
          {
            type: "steps",
            items: [
              "Schritt 1: Klick im Menü auf „Promoter“ und dann auf „Tag abschließen“.",
              "Schritt 2: Klick auf der Seite auf „Tag abschließen“ – fertig. Der Bericht wird automatisch an uns versendet.",
            ],
          },
          s("image16.png", "Die Seite „Tag abschließen“ – ein Klick genügt"),
          {
            type: "warning",
            text: "Der Tag muss JEDEN Abend nach einem Einsatztag abgeschlossen werden – auch dann, wenn Du KEINE Verträge geschrieben hast.",
          },
          {
            type: "steps",
            title: "Kontrolle: Ist Dein Tagesreport angekommen?",
            items: [
              "Öffne das Menü „Planung bestätigen“.",
              "✓ (Häkchen) = Dein Tagesreport ist angekommen.",
              "X = Der Tagesreport fehlt – bitte den Tag noch abschließen.",
            ],
          },
        ],
        questions: [
          {
            q: "Muss der Einsatztag auch abgeschlossen werden, wenn Du keinen Vertrag geschrieben hast?",
            options: [
              ["Ja, immer – auch ohne Verträge", true],
              ["Nein, nur bei mindestens einem Vertrag", false],
              ["Nur freitags", false],
            ],
            explanation: "Der Tagesabschluss ist an jedem Einsatztag Pflicht – unabhängig davon, ob Verträge geschrieben wurden.",
            final: true,
          },
          {
            q: "Woran erkennst Du unter „Planung bestätigen“, dass Dein Tagesreport NICHT angekommen ist?",
            options: [
              ["Am X", true],
              ["Am Häkchen", false],
              ["Der Eintrag verschwindet", false],
            ],
            explanation: "X bedeutet: Report fehlt. Ein Häkchen bedeutet: Report ist angekommen.",
          },
        ],
      },
    ],
  },
  {
    title: "Vodafone SSC: Erstanmeldung",
    intro: "Das Sales Service Center (SSC) ist Dein Draht zu den Vodafone-Fachbereichen – so richtest Du den Zugang ein.",
    lessons: [
      {
        title: "Deine SSC-Zugangsdaten",
        sourceSlides: [14, 15],
        blocks: [
          {
            type: "intro",
            text: "Über das Office (Büro) erhältst Du Deine persönlichen SSC-Zugangsdaten: Wir registrieren Dich im System.",
          },
          {
            type: "steps",
            items: [
              "Du bekommst eine automatisierte E-Mail von no-reply@servicecenter.vodafone.de.",
              "Darin steht Deine SC-Nummer (z. B. SC12345).",
              "In einer separaten E-Mail bekommst Du ein temporäres Passwort.",
            ],
          },
          s("image19.png", "Beispiel der Zugangsdaten-E-Mail (Musterdaten)"),
          { type: "warning", text: "Keine E-Mail bekommen? Schau unbedingt auch in Deinem Spam-Ordner nach." },
        ],
        questions: [
          {
            q: "Von welcher Adresse kommt die E-Mail mit Deinen SSC-Zugangsdaten?",
            options: [
              ["no-reply@servicecenter.vodafone.de", true],
              ["info@bvg-moeller.de", false],
              ["start@vf-easy.de", false],
            ],
            explanation: "Die SSC-Zugangsdaten kommen automatisiert von no-reply@servicecenter.vodafone.de – ggf. im Spam-Ordner nachsehen.",
          },
        ],
      },
      {
        title: "Erster Login & eigenes Passwort",
        sourceSlides: [16, 17],
        blocks: [
          {
            type: "steps",
            items: [
              "Öffne das SSC: https://salesservice.vodafone.de/login/sso.exe",
              "Gib bei „Benutzername“ Deine persönliche SC-Nummer (SCxxxxx) aus der E-Mail ein.",
              "Gib bei „Passwort“ Dein temporäres Passwort aus der E-Mail ein.",
              "Erstelle danach Dein persönliches Passwort: aktuelles (temporäres) Passwort eingeben, neues Passwort ausdenken, neues Passwort wiederholen.",
            ],
          },
          s("image20.png", "Die SSC-Anmeldeseite für Partner aus dem Fachhandel"),
          {
            type: "warning",
            text: "Die Freigabe durch den zuständigen Vodafone-VB kann bis zu 48 Stunden dauern. Vorher funktioniert der Login noch nicht.",
          },
          {
            type: "remember",
            items: [
              "Passwortrichtlinien: Großbuchstaben, Kleinbuchstaben, Ziffern und Sonderzeichen verwenden.",
              "Kein Zeichen doppelt hintereinander.",
              "Das neue Passwort muss sich vom alten unterscheiden.",
            ],
          },
          s("image21.png", "Nach dem ersten Login: Passwort nach den Richtlinien vergeben"),
        ],
        questions: [
          {
            q: "Wie lange kann die Freigabe Deines SSC-Zugangs durch den Vodafone-VB dauern?",
            options: [
              ["Bis zu 48 Stunden", true],
              ["Maximal 5 Minuten", false],
              ["Bis zu 4 Wochen", false],
            ],
            explanation: "Plane bis zu 48 Stunden für die Freigabe ein, bevor Dein SSC-Login funktioniert.",
          },
        ],
      },
      {
        title: "Login bestätigen: PIN per SMS",
        sourceSlides: [18, 19, 20],
        blocks: [
          {
            type: "steps",
            items: [
              "Wähle „per SMS“ aus.",
              "Klick auf „Jetzt eine PIN anfordern“.",
              "Warte, bis die TAN per SMS auf Deinem Handy ankommt.",
              "Gib die 6-stellige PIN/TAN ein und klick auf „Login“.",
            ],
          },
          s("image22.png", "PIN per SMS anfordern"),
          s("image23.png", "Die 6-stellige PIN eingeben und bestätigen"),
        ],
        questions: [
          {
            q: "Was brauchst Du zusätzlich zu SC-Nummer und Passwort beim SSC-Login?",
            options: [
              ["Eine 6-stellige PIN/TAN per SMS", true],
              ["Einen QR-Code", false],
              ["Meine Verkäufernummer", false],
            ],
            explanation: "Der SSC-Login wird mit einer 6-stelligen PIN bestätigt, die Du per SMS anforderst.",
            final: true,
          },
        ],
      },
      {
        title: "SSC nutzen: Regeln & Funktionen",
        sourceSlides: [21, 22],
        blocks: [
          {
            type: "intro",
            text: "Über das SSC adressierst Du Deine Service-Anliegen direkt an die verantwortlichen Fachbereiche bei Vodafone – so kannst Du Kundinnen und Kunden helfen, ohne sie an die Kundenbetreuung zu verweisen.",
          },
          {
            type: "warning",
            text: "Logge Dich regelmäßig ein – spätestens alle 60 Tage. Sonst wird Dein SSC-Zugang wegen Inaktivität deaktiviert.",
          },
          {
            type: "steps",
            items: [
              "Über die Funktion „Reg. 124444“ kannst Du Deine Rufnummer hinterlegen, damit Du die Vodafone-Hotline erreichen kannst.",
              "Unter „Meine Daten“ findest Du Deine Zugangsdaten für EASY+ (brauchst Du in Modul 8).",
            ],
          },
          s("image24.png", "Die SSC-Startseite nach dem Login"),
          s("image25.png", "Über die Menüleiste kommst Du zu „Meine Daten“"),
        ],
        questions: [
          {
            q: "Wie oft musst Du Dich mindestens im SSC einloggen, damit der Zugang aktiv bleibt?",
            options: [
              ["Mindestens alle 60 Tage", true],
              ["Einmal im Jahr reicht", false],
              ["Täglich", false],
            ],
            explanation: "Ohne Login innerhalb von 60 Tagen wird der SSC-Zugang wegen Inaktivität deaktiviert.",
          },
        ],
      },
    ],
  },
  {
    title: "Vodafone SSC: Passwort vergessen",
    intro: "Kein Drama: In wenigen Schritten setzt Du Dein SSC-Passwort selbst zurück.",
    lessons: [
      {
        title: "SSC-Passwort zurücksetzen",
        sourceSlides: [23, 24, 25, 26, 27, 28, 29, 30, 31],
        blocks: [
          {
            type: "steps",
            items: [
              "Öffne das SSC (https://salesservice.vodafone.de/login/sso.exe) und klick auf „Passwort anfordern“.",
              "Gib Deine SC-Nummer (SCxxxxx) ein.",
              "Gib Deine persönliche E-Mail-Adresse ein – wichtig: die Adresse, die bei der SSC-Anmeldung hinterlegt wurde.",
              "Klick auf „Passwort anfordern“.",
              "Du erhältst von no-reply@servicecenter.vodafone.de eine E-Mail mit einem temporären Passwort (auch im Spam-/Junk-Ordner nachsehen).",
              "Melde Dich mit SC-Nummer und dem temporären Passwort an.",
              "Vergib ein neues Passwort nach den bekannten Richtlinien (Groß-/Kleinbuchstaben, Ziffern, Sonderzeichen, kein Zeichen doppelt, anders als das alte).",
              "Bestätige den Login wie gewohnt: „per SMS“ wählen, PIN anfordern, 6-stellige TAN eingeben, „Login“ klicken.",
            ],
          },
          s("image28.png", "Passwort anfordern: SC-Nummer und hinterlegte E-Mail-Adresse"),
          s("image29.png", "Die E-Mail mit dem temporären Passwort (maskiert)"),
          { type: "remember", items: ["Es zählt die E-Mail-Adresse, die im SSC hinterlegt ist – nicht irgendeine andere."] },
        ],
        questions: [
          {
            q: "Welche E-Mail-Adresse musst Du beim Zurücksetzen des SSC-Passworts angeben?",
            options: [
              ["Die im SSC hinterlegte persönliche E-Mail-Adresse", true],
              ["Eine beliebige E-Mail-Adresse", false],
              ["Die E-Mail-Adresse des Marktes", false],
            ],
            explanation: "Das temporäre Passwort wird nur an die Adresse geschickt, die bei Deiner SSC-Anmeldung hinterlegt wurde.",
            final: true,
          },
        ],
      },
    ],
  },
  {
    title: "EASY+ einrichten",
    intro: "EASY+ baut auf Deinem SSC-Zugang auf – die Zugangsdaten findest Du direkt im SSC.",
    lessons: [
      {
        title: "EASY+-Zugangsdaten im SSC finden",
        sourceSlides: [32, 33, 34, 35],
        blocks: [
          {
            type: "intro",
            text: "Voraussetzung für EASY+ ist ein funktionierender SSC-Zugang (Modul 6). Deine EASY+-Zugangsdaten liegen im SSC bereit.",
          },
          {
            type: "steps",
            items: [
              "Logge Dich im SSC ein (SC-Nummer, Passwort, SMS-TAN).",
              "Klick im SSC auf „Meine Daten“.",
              "Klick auf „Vodafone-Systemzugriffe“.",
              "Klick bei EASY+ auf „Passwort anzeigen“ – jetzt siehst Du Deine User-ID und Dein Initial-Passwort.",
            ],
          },
          s("image30.png", "Unter „Vodafone-Systemzugriffe“ findest Du Deine EASY+-Zugangsdaten"),
          s("image27.png", "So sieht der EASY+-Eintrag mit „Passwort anzeigen“ aus"),
        ],
        questions: [
          {
            q: "Wo findest Du Deine Zugangsdaten für EASY+?",
            options: [
              ["Im SSC unter „Meine Daten“ → „Vodafone-Systemzugriffe“", true],
              ["In einer E-Mail von Möller", false],
              ["Im Möller-Portal unter Downloads", false],
            ],
            explanation: "EASY+-Zugangsdaten liegen im SSC: „Meine Daten“ → „Vodafone-Systemzugriffe“ → „Passwort anzeigen“.",
            final: true,
          },
        ],
      },
      {
        title: "Bei EASY+ anmelden",
        sourceSlides: [36, 37, 38],
        blocks: [
          {
            type: "steps",
            items: [
              "Öffne EASY+: https://mhv.vodafone.de/",
              "Gib bei „Benutzername“ Deine User-ID aus dem SSC ein (Format: vorname.nachname@vodafone.com).",
              "Gib bei „Passwort“ Dein Initial-Passwort aus dem SSC ein.",
              "Warte auf die TAN per SMS und gib die 6-stellige PIN ein – fertig, Du bist eingeloggt.",
            ],
          },
          s("image31.png", "Die EASY+-Anmeldung"),
          s("image32.png", "Einmal-PIN aus der SMS eingeben"),
        ],
        questions: [
          {
            q: "In welchem Format ist Deine EASY+-User-ID aufgebaut?",
            options: [
              ["vorname.nachname@vodafone.com", true],
              ["SCxxxxx", false],
              ["800xxxxx-xxx", false],
            ],
            explanation: "Die EASY+-User-ID hat das Format vorname.nachname@vodafone.com – Du findest sie im SSC.",
          },
        ],
      },
    ],
  },
  {
    title: "EASY: Dein Zugang je Markt",
    intro: "In EASY erfasst Du Cable-, DSL- und DTV-Verträge – wichtig: Der Zugang gilt immer nur für einen Marktstandort.",
    lessons: [
      {
        title: "Das Wichtigste zu EASY",
        sourceSlides: [39, 40],
        blocks: [
          {
            type: "steps",
            title: "In Vodafone EASY werden diese Verträge eingegeben:",
            items: ["Cable-Verträge", "DSL-Verträge", "DTV-Verträge"],
          },
          {
            type: "warning",
            text: "Jeder Marktstandort hat seinen EIGENEN EASY-Zugang. Wechselst Du z. B. von Markt A zu Markt B, brauchst Du einen neuen EASY-Zugang für Markt B – der Zugang von Markt A gilt dort nicht.",
          },
          {
            type: "steps",
            items: [
              "Deine EASY-Zugangsdaten bekommst Du über das Office: Wir registrieren Dich im System.",
              "Du erhältst eine automatisierte E-Mail von start@vf-easy.de (auch den Spam-Ordner prüfen).",
            ],
          },
        ],
        questions: [
          {
            q: "Kannst Du den EASY-Zugang von Markt A automatisch in Markt B weiterverwenden?",
            options: [
              ["Nein – jeder Markt hat einen eigenen EASY-Zugang", true],
              ["Ja, EASY gilt überall", false],
              ["Nur am Wochenende", false],
            ],
            explanation: "EASY-Zugänge sind standortbezogen: Beim Marktwechsel brauchst Du einen neuen Zugang über das Office.",
            final: true,
          },
        ],
      },
      {
        title: "EASY-Erstanmeldung",
        sourceSlides: [41, 42, 43, 44, 45, 46],
        blocks: [
          {
            type: "steps",
            items: [
              "Öffne EASY über die Schaltfläche „zum Portal“ in der E-Mail – oder direkt: https://easy4-sso.vf-easy.de/simplesaml/module.php/otelo/landing.php",
              "Gib bei „Benutzername“ Deinen persönlichen Benutzernamen (VOID) aus der E-Mail ein.",
              "Gib bei „Passwort“ das Initial-/temporäre Passwort aus der E-Mail ein und klick „Anmelden“.",
              "Vergib ein neues Passwort: Passwort aus der E-Mail eingeben, neues Passwort ausdenken, Kennwort wiederholen – Richtlinien beachten (Groß-/Kleinbuchstaben, Ziffern, Sonderzeichen, kein Zeichen doppelt, anders als vorher).",
              "Warte auf die TAN per SMS, gib die 6-stellige PIN ein und klick „Weiter“ – Du bist drin.",
            ],
          },
          s("image35.png", "Die Willkommens-E-Mail von VF-EASY erklärt die ersten Schritte (Musterdaten)"),
          s("image34.png", "Die EASY-Anmeldeseite im Browser"),
          {
            type: "warning",
            text: "Präg Dir Dein EASY-Passwort gut ein oder bewahre es sicher auf – wir haben KEINEN Zugriff auf Deine Zugangsdaten.",
          },
        ],
        questions: [
          {
            q: "Warum musst Du Dir Dein EASY-Passwort gut merken?",
            options: [
              ["Weil Möller keinen Zugriff auf Deine Zugangsdaten hat", true],
              ["Weil man es nie zurücksetzen kann", false],
              ["Weil es täglich abgefragt wird", false],
            ],
            explanation: "Deine EASY-Zugangsdaten kennt nur Du – bei Verlust hilft nur das Zurücksetzen über „Passwort zurücksetzen“ (Modul 10).",
          },
        ],
      },
    ],
  },
  {
    title: "EASY: Passwort zurücksetzen",
    intro: "Wenn das EASY-Passwort weg ist: Schritt für Schritt zum neuen Zugang.",
    lessons: [
      {
        title: "EASY-Passwort zurücksetzen",
        sourceSlides: [47, 48, 49, 50, 51, 52, 53, 54],
        blocks: [
          {
            type: "steps",
            items: [
              "Öffne EASY und klick auf „Passwort zurücksetzen“.",
              "Gib Deine Nummer im Format 800xxxxx-xxx ein.",
              "Gib die angezeigten Zeichen (Validierung) ein und klick „Weiter“.",
              "Du erhältst eine E-Mail von VF-EASY mit einem temporären Passwort und Anweisungen.",
              "Öffne EASY über „zum Portal“ oder den bekannten Link.",
              "Melde Dich mit Benutzername (VOID) und dem temporären Passwort an.",
              "Vergib ein neues Passwort nach den Richtlinien.",
              "Bestätige mit der 6-stelligen TAN aus der SMS und klick „Weiter“ – geschafft.",
            ],
          },
          s("image42.png", "„Passwort zurücksetzen“: Benutzername und Validierung eingeben"),
          s("image39.png", "Neues Kennwort nach der Passwortrichtlinie vergeben"),
          s("image40.png", "Zum Schluss mit der mTAN aus der SMS bestätigen"),
        ],
        questions: [
          {
            q: "In welchem Format gibst Du Deine Nummer beim EASY-Passwort-Zurücksetzen ein?",
            options: [
              ["800xxxxx-xxx", true],
              ["V-18111111", false],
              ["SCxxxxx", false],
            ],
            explanation: "Beim Zurücksetzen fragt EASY nach Deiner Nummer im Format 800xxxxx-xxx.",
          },
        ],
      },
    ],
  },
  {
    title: "Abschluss & Wissenscheck",
    intro: "Kurz zusammengefasst – und dann zeig, was Du drauf hast.",
    lessons: [
      {
        title: "Deine wichtigsten Pflichten im Überblick",
        sourceSlides: [55],
        blocks: [
          {
            type: "remember",
            items: [
              "Verfügbarkeitsformular vor Monatsbeginn ans Büro – sonst keine Planung.",
              "Jeden Einsatztag im Portal abschließen – auch ohne geschriebene Verträge.",
              "Kontrolle unter „Planung bestätigen“: Häkchen = Report da, X = Report fehlt.",
              "SSC: mindestens alle 60 Tage einloggen, sonst wird der Zugang deaktiviert.",
              "EASY: je Marktstandort ein eigener Zugang – bei Marktwechsel neuen Zugang über das Office.",
              "Bei Verwaltungsfragen hilft das Büro (06725 91 93 50), bei Planung und Produkten Deine Teamleitung.",
            ],
          },
          {
            type: "intro",
            text: "Gleich folgt der kurze Wissenscheck. Keine Sorge: Es gibt keine Fangfragen, und Du kannst jede Frage so oft beantworten, bis alles sitzt. Danke, dass Du Dir die Zeit genommen hast – Jana & Jasmin freuen sich auf Dich!",
          },
        ],
        questions: [
          {
            q: "Ein Kunde hat eine Frage zu seiner Abrechnung bei Dir am Stand – Du selbst hast eine Frage zu DEINER Gutschrift. Wen kontaktierst Du für Deine Gutschrift?",
            options: [
              ["Das Möller-Büro (Innendienst)", true],
              ["Die Vodafone-Hotline", false],
              ["Den Marktleiter", false],
            ],
            explanation: "Für Deine Abrechnungen, Gutschriften und Auszahlungen ist das Möller-Büro zuständig.",
            final: true,
          },
        ],
      },
    ],
  },
];

export async function seedAcademy(db: PrismaClient): Promise<void> {
  // Kurs + Version 1 (idempotent: nur anlegen, wenn noch keine Version existiert)
  const course = await db.trainingCourse.upsert({
    where: { slug: "admin-schulung" },
    update: {},
    create: { slug: "admin-schulung", title: "Admin-Schulung", active: true },
  });
  const existing = await db.trainingCourseVersion.findFirst({ where: { courseId: course.id } });
  if (existing) {
    console.log("Academy: Kursversion existiert bereits – Seed übersprungen.");
    return;
  }

  // Redigierte Screenshots als INTERNE Medien importieren
  const assetIds = new Map<string, string>();
  for (const [fileName, alt] of Object.entries(ASSETS)) {
    const filePath = path.join(process.cwd(), "content/academy/screenshots", fileName);
    let data: Buffer;
    try {
      data = await readFile(filePath);
    } catch {
      console.warn(`Academy: Screenshot fehlt: ${fileName}`);
      continue;
    }
    const storageName = `academy/${randomBytes(8).toString("hex")}-${fileName}`;
    const { storage } = await import("../src/lib/storage");
    await storage.put("private", storageName, data, fileName.endsWith(".png") ? "image/png" : "image/jpeg");
    const asset = await db.mediaAsset.create({
      data: {
        fileName: storageName,
        originalName: fileName,
        mime: fileName.endsWith(".png") ? "image/png" : "image/jpeg",
        size: data.length,
        alt,
        description: "Redigierter Schulungs-Screenshot (Quelle: Admin-Schulung-PPTX, siehe TRAINING_CONTENT_AUDIT.md)",
        approval: "FREIGABE_ERFORDERLICH",
        category: "TRAINING",
        visibility: "INTERNAL",
      },
    });
    assetIds.set(fileName, asset.id);
  }

  const version = await db.trainingCourseVersion.create({
    data: {
      courseId: course.id,
      version: 1,
      changelog: "Erstversion – überführt aus Admin-Schulung-08-2026.pptx (55 Folien, auditiert)",
      passScore: 80,
      publishedAt: new Date(),
    },
  });

  for (const [mi, moduleDef] of MODULES.entries()) {
    const trainingModule = await db.trainingModule.create({
      data: {
        courseVersionId: version.id,
        sortOrder: mi,
        title: moduleDef.title,
        intro: moduleDef.intro,
        required: true,
      },
    });
    for (const [li, lessonDef] of moduleDef.lessons.entries()) {
      const blocks = lessonDef.blocks
        .map((block) => {
          if (block.type === "screenshot") {
            const mediaId = assetIds.get(block.asset);
            if (!mediaId) return null; // Asset zurückgehalten (Audit) → Block entfällt
            return { type: "screenshot", mediaId, alt: block.alt, caption: block.caption ?? null };
          }
          return block;
        })
        .filter(Boolean);
      const lesson = await db.trainingLesson.create({
        data: {
          moduleId: trainingModule.id,
          sortOrder: li,
          title: lessonDef.title,
          content: { blocks } as Prisma.InputJsonValue,
          sourceSlides: lessonDef.sourceSlides,
        },
      });
      for (const [qi, q] of (lessonDef.questions ?? []).entries()) {
        await db.trainingQuestion.create({
          data: {
            lessonId: lesson.id,
            sortOrder: qi,
            question: q.q,
            explanation: q.explanation,
            finalCheck: q.final ?? false,
            options: {
              create: q.options.map(([text, correct], oi) => ({ sortOrder: oi, text, correct })),
            },
          },
        });
      }
    }
  }

  // Assets der Version zuordnen (Nachvollziehbarkeit)
  for (const [fileName, mediaId] of assetIds) {
    await db.trainingAsset.create({
      data: { courseVersionId: version.id, mediaAssetId: mediaId, caption: fileName },
    });
  }
  console.log(`Academy: Kurs „Admin-Schulung“ v1 mit ${MODULES.length} Modulen angelegt.`);
}
