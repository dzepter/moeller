# Training Content Audit – Admin-Schulung (Quelle: `Admin-Schulung-08-2026.pptx`)

Stand: 2026-09-26 · Prüfer: Claude Code (automatisiertes Audit, 55 Folien, 42 Medien)

Dieses Audit ist Voraussetzung für die Übernahme der Schulungsinhalte in die Möller Academy
(siehe Addendum). **Kein hier als „kritisch" oder „Freigabe erforderlich" markierter Inhalt
wird ohne explizite Freigabe veröffentlicht.**

---

## 1. Kritische Funde (vor Livegang zwingend zu klären)

| # | Fundstelle | Befund | Maßnahme |
|---|-----------|--------|----------|
| K1 | Folie 6, `image5.png` | **QR-Code zur OTP-Registrierung + Klartext-TOTP-Secret `QN7…YNA`** – ein real verwendbares 2FA-Geheimnis | Bild redigiert (QR + Secret geschwärzt). **Original-PPTX wird NICHT ins Repository übernommen.** Empfehlung: Prüfen, ob dieses OTP-Secret zu einem echten Konto gehört → ggf. zurücksetzen. |
| K2 | Folie 7/8, `image9.jpeg` | Foto eines Google Authenticator mit Live-OTP-Code für „Möller GmbH (Login Portal)" | Code-Bereich redigiert (Codes sind zeitlich verfallen, Redaktion dennoch als Prinzip). |
| K3 | Folie 12, `image16.png` | Eingeloggter **Realname einer Person** („eingeloggt als: …") im Portal-Screenshot | Name redigiert. |
| K4 | Folien 10–13, `image3/4/10/11/12/17` | Hintergrundfenster (Excel/Outlook) mit **echten Vertrags-/Personenlisten** in Bildschirmfotos | Als „Freigabe erforderlich" markiert. In Academy v1 werden diese Vollbild-Screenshots **nicht** ausgeliefert; Inhalte sind als HTML-Text abgebildet. Später: fokussierte Neu-Screenshots ohne Hintergrundfenster erstellen. |
| K5 | Folie 24/25 (SSC), `image24/25.png` | VOID-Kennungen (`800…07 (GF)`, `800…73 (GF)`) in Kopfzeilen | Kopfzeilenbereiche redigiert. |

## 2. Mittlere Funde

| # | Fundstelle | Befund | Maßnahme |
|---|-----------|--------|----------|
| M1 | Folie 3 | Bürozeiten **Mo–Fr 09:00–12:00 und 13:00–17:00** widersprechen der Website-Vorgabe **Mo–Fr 08:00–17:00** (Masterprompt §1/§44) | Konflikt. Öffnungszeiten sind zentral als SystemSetting konfigurierbar; Academy zeigt denselben zentral gepflegten Wert. **GEKLÄRT (Korrekturpaket, Punkt 20):** Verbindlich gilt durchgehend **Mo–Fr 08:00–17:00 Uhr**; die Folienangabe ist überholt. Quelle ist das zentrale Setting `contact.openingHours` (Website, Chat-Geschäftszeiten, E-Mail-Vorlagen, Academy-Footer); die Academy-Bürolektion nennt die Zeit jetzt ausdrücklich. |
| M2 | Folie 3 | Faxnummer `06725 91 93 55 1` – laut Masterprompt §44 sind nur Telefon/E-Mail-Kontakte der Website zulässig | Fax wird auf der Website nicht verwendet; in der Academy-Lektion „Büro" nur nach Freigabe. |
| M3 | Titel/Abschnittsfolien | Datumsstand **„Mai 2026"** vs. Dateiname **08-2026** | Datumsangaben werden nicht übernommen; Kursstände laufen über die Kursversionierung der Academy. |
| M4 | gesamte Präsentation | Gemischte Sie-/Du-/Euch-Ansprache | Academy einheitlich in freundlicher Du-Ansprache (Addendum-Vorgabe), ohne fachliche Aussagen zu verändern. |
| M5 | `image34/38.png` | Browser-Lesezeichenleiste zeigt u. a. „Favoriten Jasmin" (Vorname Innendienst) | Geringes Risiko (Vornamen sind öffentlich auf der Website). Vermerkt; bei Neuerstellung der Screenshots vermeiden. |
| M6 | `image22/23.png` | Teilmaskierte Mobilfunknummer `0160*******…` | Bereits maskiert; akzeptiert. |
| M7 | Screenshot-Footer | Portal-Footer zeigt `© portal-msf.de`, Folientext nennt `www.portal-moeller.de` | Vermutlich White-Label-System. Academy verwendet die im Folientext genannte offizielle URL `portal-moeller.de`. **Bestätigung durch Möller erbeten.** |
| M8 | Folie 36, `image36.png` | Zeitgebundene Promotion („240 GB … bis 31. März") im Screenshot | Als veraltet markiert; Screenshot dient nur der Orientierung, kein Angebotsinhalt. |

## 3. Geringfügige Funde

- Tippfehler/Sprache: „Authenticactor", „drucken" (statt „drücken"), „über einen Formular", „muss Zeitnah" – wird bei der didaktischen Überarbeitung sprachlich vereinheitlicht (zulässig laut Addendum; keine fachliche Änderung).
- Folie 15: Passwort im Screenshot bereits mit `XXXXXXXXXX` maskiert – ok.
- `image19.png` (E-Mail SSC-Zugangsdaten): Musterdaten („Max Mustermann", Beispielpasswort) – als Beispiel gekennzeichnet, ok.
- `image35.png` (VF-EASY-Mail): „Liebe/r Mustermann", Beispielzugangsdaten – ok.
- `image18.tif`: dekoratives Titelbild (Glasfassade), technisch nicht lesbar (TIFF) – wird nicht übernommen; die Academy verwendet das Möller-Designsystem statt Stock-Deko.
- Folie 21: „Reg. 124444" ist laut Folientext eine Funktionsbezeichnung (Rufnummernregistrierung) – wird beibehalten.

## 4. Content-Matrix (Folie → Modul)

Legende Status: ✅ übernehmbar · ✂️ Screenshot nur redigiert/als Neu-Screenshot · ⚠️ Freigabe erforderlich

| Folie(n) | Modul (Academy) | Inhalt | Medien | Sensibel | Status |
|---|---|---|---|---|---|
| 1 | – (Deckblatt) | Titel, Jana & Jasmin, „Mai 2026" | image1 (Logo), image2 (Deko) | Datum veraltet (M3) | ✅ Inhalt, Deko ersetzt |
| 2 | 1 Willkommen | Team-Vorstellung Jana (Head of Administration, seit 2005), Jasmin (Assistenz, seit 07/2011), Qualifikationen | image7 (Körnung/Deko) | Personenbezogen, aber zur Veröffentlichung bestimmt | ✅ |
| 3 | 1 Willkommen | Büro: Adresse, Erreichbarkeit (⚠️ M1), Telefon, Fax (M2), E-Mail; Zuständigkeiten Büro vs. Teamleiter | – | M1, M2 | ⚠️ Zeiten zentral konfigurierbar |
| 4 | 2 Organisatorisches | Unterlagen (Rahmenvertrag orig., Gewerbeanmeldung, Steuernummer, Anschrift, IBAN/BIC), Stammdatenänderung per E-Mail, Verfügbarkeitsformular vor Monatsbeginn, Auszahlung letzte KW Folgemonat, Gutschrift, Vertragsauflistung ≤ 5 Werktage nach Auszahlung, Reklamation zeitnah per Formular (Portal→Downloads) | – | – | ✅ |
| 5 | 3 Portal-Login | portal-moeller.de: Verkäufernummer, Erstanmeldung Passwortfeld leer, Passwort selbst vergeben (min. 8 Zeichen) | image6, image8 | M7 | ✅ |
| 6 | 3 Portal-Login | OTP-App installieren, QR scannen, Seite nicht neu laden! | image5 ✂️ (K1) | K1 | ✂️ |
| 7–8 | 3 Portal-Login | Login mit ID + Passwort + OTP (30-Sek.-Wechsel), Beispiel Google Authenticator | image9 ✂️ (K2) | K2 | ✂️ |
| 9–10 | 4 Portal-Alltag | Startseite; Promoter-Bereich: Nachrichten, Verträge eingeben, Tag abschließen (auch ohne Verträge!), Historie 250 Verträge, Einsätze bestätigen/absagen, Kalender, Downloads | image10/11 ⚠️ (K4), image15 ✅ | K4 | teils ✂️ |
| 11 | 5 Vertragseingabe | Referenz-ID: Cable `V-18111111`, DSL `ARC11111111`; Kundendaten, Produkt, Eintragen | image12 ⚠️, image13 ✅, image14 ✅ | K4 (image12) | teils ✂️ |
| 12–13 | 5 Tagesabschluss | Promoter → Tag abschließen (2 Schritte), Bericht automatisch; jeden Einsatztag abschließen, auch ohne Verträge; Kontrolle in „Planung bestätigen": X = Report fehlt, ✓ = angekommen | image16 ✂️ (K3), image17 ⚠️ (K4) | K3, K4 | ✂️ |
| 14–22 | 6 SSC Erstanmeldung | Zugangsdaten via Office, Mail von no-reply@servicecenter.vodafone.de (Spam prüfen), SC-Nummer + temp. Passwort separat, Login, Passwortregeln, SMS-TAN, 60-Tage-Inaktivitätsregel, Reg. 124444 Rufnummer hinterlegen, „Meine Daten" → EASY+-Zugangsdaten | image19–image27 (24/25 ✂️ K5) | K5 | ✅/✂️ |
| 23–31 | 7 SSC Passwort vergessen | Passwort anfordern → SC-Nummer + registrierte E-Mail → temp. Passwort per Mail (Spam!) → neues Passwort nach Richtlinien → SMS-TAN → Login | image28, image2(9), image15-Wdh. | – | ✅ |
| 32–38 | 8 EASY+ | Voraussetzung SSC-Zugang; Zugangsdaten in SSC → „Meine Daten" → „Vodafone-Systemzugriffe" → „Passwort anzeigen"; mhv.vodafone.de; User-ID `vorname.nachname@vodafone.com`; SMS-TAN | image30–image33 | – | ✅ |
| 39–46 | 9 EASY | Vertragsarten Cable/DSL/DTV; **Zugang je Marktstandort**, bei Marktwechsel neuer Zugang; Mail von start@vf-easy.de (Spam!), VOID-Benutzername, Erstlogin, Passwortvergabe (Richtlinien), SMS-TAN | image34–image41 | M5 | ✅ |
| 47–54 | 10 EASY Passwort zurücksetzen | „Passwort zurücksetzen": Nummer `800xxxxx-xxx`, Captcha, Mail mit temp. Passwort, neues Passwort, TAN, Login | image38–image42 | – | ✅ |
| 55 | 11 Abschluss | Dank, Jana & Jasmin | – | – | ✅ + Wissenscheck ergänzt |

## 5. Entscheidungen aus dem Audit

1. **Die Original-PPTX wird nicht ins Repository committet** (enthält unredigiertes TOTP-Secret, QR-Code, Realnamen). Quelle verbleibt beim Auftraggeber; Textinhalt ist vollständig in die Academy-Seed-Inhalte übernommen, Screenshots liegen redigiert unter `content/academy/screenshots/`.
2. Alle 41 übernommenen Medien tragen in der Medienbibliothek den Status **„Freigabe erforderlich"**, solange Möller sie nicht explizit freigibt. Die als K4 markierten Vollbild-Screenshots sind zusätzlich als „nicht veröffentlichen" gekennzeichnet.
3. Kein Inhalt der Academy ist öffentlich erreichbar; Zugriff nur über personalisierten, widerrufbaren Magic Link (siehe `ACADEMY_ARCHITECTURE.md`).
4. Fachliche Schritte, Reihenfolgen, URLs und Warnhinweise wurden 1:1 übernommen; lediglich Sprache (Du-Form), Rechtschreibung und Didaktik wurden überarbeitet. Jede Lektion referenziert die Ursprungsfolie(n) (`sourceSlides`), damit Änderungen nachvollziehbar bleiben.

## 6. Offene Fragen an Möller (nicht blockierend für die Entwicklung)

1. ~~Bürozeiten: 08:00–17:00 (Website-Vorgabe) oder 09:00–12:00 / 13:00–17:00 (Schulungsfolie)?~~ → **Beantwortet: durchgehend 08:00–17:00 Uhr** (Korrekturpaket, Punkt 20).
2. Ist das OTP-Secret aus Folie 6 ein echtes Konto-Secret? Falls ja: bitte zurücksetzen.
3. Offizielle Portal-URL: `portal-moeller.de` (Folientext) – korrekt?
4. Faxnummer noch aktuell/gewünscht (nur Academy-intern)?
5. Dürfen die MediaMarkt-/Vodafone-Screenshots in der (zugangsgeschützten) Academy verwendet werden? (Derzeit: ja, da interne Schulung; Kennzeichnung „Freigabe erforderlich" bleibt bestehen.)
