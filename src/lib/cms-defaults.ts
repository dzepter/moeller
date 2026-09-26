import type { CmsPageContent } from "@/lib/cms-schema";

/**
 * Redaktionelle Startinhalte (keine Platzhalter, kein Lorem Ipsum).
 * Vollständig im CMS änderbar – dies sind nur die Erstwerte.
 * Sprachregeln: Bewerber = Du, Geschäftskunden = Sie. Keine erfundenen Zahlen.
 */

export const CMS_DEFAULTS: Record<string, CmsPageContent> = {
  home: {
    hero: {
      headline: "Menschen, die Marken am PoS voranbringen.",
      subline:
        "Seit über 15 Jahren als Möller GmbH. Über 25 Jahre Erfahrung. Langfristige Projekte in Nordrhein-Westfalen, Hessen, Rheinland-Pfalz und Bayern.",
      ctaPrimary: "Jobs entdecken",
      ctaPrimaryHref: "/jobs",
      ctaSecondary: "Für Unternehmen",
      ctaSecondaryHref: "/fuer-unternehmen",
      image: { src: "/photos/pos-mm-hanau.jpg", alt: "Beratungsfläche eines Telekommunikationsanbieters im Elektrofachmarkt" },
      imageCaption: "Einsatzfläche im Elektrofachmarkt – betreut durch Möller",
    },
    facts: {
      items: [
        { a: "15+", b: "Jahre als Möller GmbH" },
        { a: "25+", b: "Jahre Branchenerfahrung" },
        { a: "4", b: "Bundesländer im Einsatz" },
        { a: "Langfristig", b: "angelegte Projekte" },
      ],
    },
    jobfinder: {
      eyebrow: "Jobs bei Möller",
      title: "Wo möchtest Du arbeiten?",
      intro: "Wähl Deine Region oder gib Deine PLZ ein – wir zeigen Dir passende Einsätze in Deiner Nähe.",
    },
    services: {
      eyebrow: "Für Unternehmen",
      title: "Mehr als Personal: Wir betreuen Ihre Fläche.",
      intro:
        "Die Möller GmbH stellt nicht einfach Promotoren bereit. Wir organisieren, steuern und betreuen langfristige PoS-Projekte – vom ersten Einsatztag bis zum wöchentlichen Reporting.",
    },
    serviceBlock1: {
      title: "Geschulte Menschen, die verkaufen können",
      text: "Unsere Promotoren werden in eigenen Schulungsräumen von erfahrenen Trainern vorbereitet – theoretisch und praktisch. Auch kurzfristige Personalbereitstellung ist möglich, wenn es bei Ihnen schnell gehen muss.",
      bullets: ["Eigene Konferenz- und Schulungsräume", "Theorie- und Praxiseinarbeitung", "Kurzfristige Bereitstellung möglich"],
      image: { src: "/photos/pos-mm-frankfurt-nwz.jpg", alt: "Promotionstand mit Beratungssituation im Elektrofachmarkt" },
    },
    serviceBlock2: {
      title: "Verlässliche Organisation im Hintergrund",
      text: "Digitale Einsatzplanung, erfahrene regionale Teamleiter mit kurzen Wegen und ein Springer-System für Urlaubs- und Krankheitsvertretung: Ihre Flächen bleiben besetzt – auch wenn mal etwas dazwischenkommt.",
      bullets: ["Digitale Einsatzplanung", "Regionale Teamleiter als direkte Ansprechpartner", "Urlaubs- und Krankheitsvertretung"],
      image: { src: "/photos/pos-center-shopflaeche.jpg", alt: "Shopfläche mit mehreren Anbieterflächen im Einkaufszentrum" },
    },
    serviceBlock3: {
      title: "Qualität, die Sie nachvollziehen können",
      text: "Laufende Qualitätskontrolle an Ihren Standorten und ein wöchentliches Reporting machen den Projektfortschritt transparent – Woche für Woche, Standort für Standort.",
      bullets: ["Kontinuierliche Qualitätskontrolle", "Wöchentliches Reporting", "Dauerhafte Betreuung statt Einzelaktion"],
    },
    work: {
      eyebrow: "Arbeiten bei Möller",
      title: "Ein Job, bei dem Du nicht allein gelassen wirst.",
      text: "Gute Einarbeitung, ein direkter Ansprechpartner in Deiner Region und ein Innendienst, den Du wirklich erreichst: Montag bis Freitag von 08:00 bis 17:00 Uhr. Quereinsteiger sind bei uns ausdrücklich willkommen.",
      benefits: [
        "Gründliche Einarbeitung in Theorie und Praxis",
        "Direkter Ansprechpartner: Dein regionaler Teamleiter",
        "Erreichbarer Innendienst, Mo–Fr 08:00–17:00 Uhr",
        "Moderne, digitale Tools für Planung und Alltag",
        "Planungssicherheit durch langfristige Projekte",
        "Schulungen und Weiterbildung durch erfahrene Trainer",
        "Besondere Leistungen können sich lohnen – bis hin zu Incentive-Reisen wie Miami oder Ibiza",
      ],
      image: { src: "/photos/pos-mm-darmstadt.jpg", alt: "Einsatzbereich mit Beratungstisch im Elektrofachmarkt" },
    },
    ceo: {
      name: "Markus Möller",
      role: "Geschäftsführer",
      statement:
        "Unser Geschäft lebt von Menschen, die gern auf andere zugehen – und von Auftraggebern, die sich auf uns verlassen. Beides funktioniert nur, wenn wir uns um beide Seiten wirklich kümmern. Genau das machen wir. Jeden Tag, seit über 15 Jahren.",
      image: { src: "", alt: "Porträt von Markus Möller, Geschäftsführer der Möller GmbH" },
    },
    jobsTeaser: {
      eyebrow: "Aktuelle Jobs",
      title: "Diese Einsätze warten auf Dich",
    },
    gallery: {
      eyebrow: "Echte Einsätze",
      title: "Mitten im Markt: unsere PoS-Welt",
      images: [
        "/photos/pos-mm-frankfurt-zeil.jpg :: Zwei Beratungstische auf einer Einsatzfläche im Elektrofachmarkt",
        "/photos/pos-mm-sulzbach-mtz.jpg :: Beratungsstand mit Aktionsflächen im Elektrofachmarkt",
        "/photos/pos-center-counter.jpg :: Counter eines Telekommunikationsanbieters im Einkaufszentrum",
        "/photos/pos-mm-wiesbaden-aeppelallee.jpg :: Einsatzfläche mit Infostand im Elektrofachmarkt",
      ],
    },
  },

  "ueber-uns": {
    hero: {
      eyebrow: "Über uns",
      headline: "Ein Familienunternehmen mit Handschlagqualität.",
      intro:
        "Die Möller GmbH ist eine Beratungs- und Vertriebsgesellschaft aus Gau-Algesheim. Seit über 15 Jahren bringen wir Marken am Point of Sale voran – mit Erfahrung aus über 25 Jahren in der Branche.",
      image: { src: "/photos/pos-center-shopflaeche.jpg", alt: "Shopfläche mit mehreren Anbieterflächen im Einkaufszentrum" },
    },
    story: {
      title: "Was uns ausmacht",
      body: "Promotion und Vertrieb sind Vertrauenssache. Auftraggeber vertrauen uns ihre Marke an, Promotoren ihren Arbeitsalltag. Deshalb arbeiten wir seit jeher mit festen Ansprechpartnern, klarer Organisation und langfristigen Projekten statt kurzfristiger Aktionen.\n\nUnsere Einsatzfelder: Promotion im Lebensmitteleinzelhandel, Promotion und Vertrieb in Elektrofachmärkten, Messen und Events sowie die dauerhafte Betreuung von Points of Sale.",
    },
    values: {
      title: "Wofür wir stehen",
      items: [
        { a: "Verlässlichkeit", b: "Zusagen gelten – gegenüber Auftraggebern genauso wie gegenüber unserem Team." },
        { a: "Nähe", b: "Regionale Teamleiter mit überschaubaren Gebieten sorgen für kurze Wege." },
        { a: "Entwicklung", b: "Wer bei uns arbeitet, wird eingearbeitet, geschult und begleitet." },
        { a: "Klarheit", b: "Digitale Planung und wöchentliches Reporting statt Blindflug." },
      ],
    },
    regions: {
      title: "Unsere Einsatzregionen",
      text: "Wir sind in Nordrhein-Westfalen, Hessen, Rheinland-Pfalz und Bayern im Einsatz – mit regionalen Teamleitern, die ihre Märkte und Menschen kennen.",
    },
    ceo: {
      name: "Markus Möller",
      role: "Geschäftsführer",
      statement:
        "Unser Geschäft lebt von Menschen, die gern auf andere zugehen – und von Auftraggebern, die sich auf uns verlassen. Beides funktioniert nur, wenn wir uns um beide Seiten wirklich kümmern. Genau das machen wir. Jeden Tag, seit über 15 Jahren.",
      image: { src: "", alt: "Porträt von Markus Möller, Geschäftsführer der Möller GmbH" },
    },
    team: {
      eyebrow: "Innendienst",
      title: "Die Stimmen am anderen Ende der Leitung",
      intro:
        "Bei uns landet niemand in der Warteschleife eines anonymen Callcenters. Wenn Du bei Möller anrufst, sprichst Du mit echten Menschen, die Deine Fragen kennen – Montag bis Freitag von 08:00 bis 17:00 Uhr.",
    },
  },

  "fuer-unternehmen": {
    hero: {
      eyebrow: "Für Unternehmen",
      headline: "Ihre Marke verdient mehr als bloße Anwesenheit.",
      intro:
        "Die Möller GmbH übernimmt Promotion, Vertrieb und die dauerhafte Betreuung Ihrer Points of Sale – organisiert, kontrolliert und transparent. Damit Ihre Flächen nicht nur besetzt, sondern erfolgreich sind.",
      image: { src: "/photos/pos-mm-hanau.jpg", alt: "Beratungsfläche eines Telekommunikationsanbieters im Elektrofachmarkt" },
    },
    promise: {
      title: "Unser Anspruch",
      body: "Möller stellt nicht einfach Personal zur Verfügung. Wir organisieren, steuern und betreuen langfristige PoS-Projekte – strukturell und operativ.\n\nDas heißt konkret: geschulte Promotoren, digitale Einsatzplanung, erfahrene Teamleiter vor Ort, abgesicherte Besetzung und ein Reporting, mit dem Sie jederzeit wissen, was auf Ihren Flächen passiert.",
    },
    leistungen: {
      title: "Unsere Leistungen im Überblick",
      intro: "Neun Bausteine, ein Ziel: dass Ihre PoS-Projekte zuverlässig laufen.",
      items: [
        { a: "Kurzfristige Personalbereitstellung", b: "Auch wenn es schnell gehen muss: Wir stellen kurzfristig geeignete Promotoren für Ihre Flächen bereit." },
        { a: "Schulungen", b: "Eigene Konferenz- und Schulungsräume, erfahrene Trainer, theoretische und praktische Vorbereitung." },
        { a: "Digitale Einsatzplanung", b: "Strukturierte digitale Planung mit voller Übersicht über alle Einsätze – zuverlässig organisiert." },
        { a: "Dauerhafte Betreuung am PoS", b: "Nicht nur Projektstart: laufende Betreuung mit festen Ansprechpartnern für Promotoren und Standorte." },
        { a: "Erfahrene Teamleiter", b: "Ausgebildete Teamleiter in überschaubaren Regionen – direkte Ansprechpartner für Auftraggeber, Promotoren und Märkte." },
        { a: "Urlaubs- und Krankheitsvertretung", b: "Springer-System und Ausfallabsicherung für eine möglichst kontinuierliche Besetzung." },
        { a: "Kontinuierliche Qualitätskontrolle", b: "Laufende Überprüfung der Einsätze mit dokumentierbarer Qualitätssicherung." },
        { a: "Wöchentliches Reporting", b: "Regelmäßige Berichterstattung – Ihr Projekt bleibt jederzeit nachvollziehbar." },
        { a: "Langfristige Projektbetreuung", b: "Unser Fokus liegt auf dauerhafter Zusammenarbeit, nicht auf kurzfristigen Einzelaktionen." },
      ],
    },
    steuerung: {
      title: "Kurze Wege, klare Verantwortung",
      text: "Unsere Teamleiter arbeiten in bewusst überschaubaren Regionen. Sie kennen die Märkte, die Menschen und die Besonderheiten vor Ort – und sind für Sie genauso erreichbar wie für unsere Promotoren. Dazu kommt ein Innendienst, der Montag bis Freitag von 08:00 bis 17:00 Uhr für Sie da ist.",
      bullets: [
        "Regionale Teamleiter für NRW, Hessen/Rheinland-Pfalz und Bayern",
        "Ein fester Ansprechpartner für Ihr Projekt",
        "Innendienst Mo–Fr 08:00–17:00 Uhr",
      ],
      image: { src: "/photos/pos-mm-frankfurt-zeil.jpg", alt: "Zwei Beratungstische auf einer Einsatzfläche im Elektrofachmarkt" },
    },
    kontakt: {
      title: "Lassen Sie uns über Ihre Flächen sprechen.",
      text: "Rufen Sie uns an oder schreiben Sie uns – wir melden uns zeitnah mit einer ehrlichen Einschätzung, wie wir Ihr Projekt unterstützen können.",
    },
  },

  "arbeiten-bei-moeller": {
    hero: {
      eyebrow: "Arbeiten bei Möller",
      headline: "Dein Einstieg in einen Job, der Dir liegt.",
      intro:
        "Du gehst gern auf Menschen zu? Dann bist Du bei uns richtig – ob mit Branchenerfahrung oder als Quereinsteiger. Wir arbeiten Dich gründlich ein und lassen Dich danach nicht allein.",
      image: { src: "/photos/pos-mm-frankfurt-nwz.jpg", alt: "Promotionstand mit Beratungssituation im Elektrofachmarkt" },
    },
    benefits: {
      title: "Was Dich bei uns erwartet",
      items: [
        { a: "Sehr gute Einarbeitung", b: "Theorie in unseren Schulungsräumen, Praxis direkt am PoS – bis Du Dich sicher fühlst." },
        { a: "Direkter Ansprechpartner", b: "Dein regionaler Teamleiter betreut ein überschaubares Gebiet und ist wirklich für Dich da." },
        { a: "Erreichbarer Innendienst", b: "Montag bis Freitag von 08:00 bis 17:00 Uhr – echte Menschen, keine Hotline." },
        { a: "Moderne Tools", b: "Digitale Unterstützung für Einsatzplanung, Vertragserfassung und Kommunikation." },
        { a: "Planungssicherheit", b: "Langjährige Auftraggeber und langfristige Projekte statt Job-Hopping von Aktion zu Aktion." },
        { a: "Schulung & Weiterbildung", b: "Erfahrene Trainer, die Dich fachlich und persönlich weiterbringen." },
        { a: "Incentive-Reisen", b: "Besondere Leistungen können sich richtig lohnen – vergangene Ziele waren zum Beispiel Miami und Ibiza." },
      ],
    },
    quereinstieg: {
      title: "Quereinsteiger? Ausdrücklich willkommen.",
      body: "Du musst keine Vertriebserfahrung mitbringen. Weil wir sowohl theoretisch als auch praktisch einarbeiten, können auch Menschen ohne Branchenerfahrung bei uns erfolgreich starten – wenn das Interesse stimmt.\n\nDein Alter spielt dabei übrigens keine Rolle. Bei uns zählt, wie Du mit Menschen umgehst.",
    },
    eigenschaften: {
      title: "Was Du mitbringen solltest",
      items: ["Zuverlässigkeit", "Freude an Kommunikation", "Flexibilität", "Ein freundliches Auftreten"],
      note: "Ein Führerschein ist von Vorteil, aber nicht für jede Stelle Voraussetzung – das steht jeweils in der Stellenausschreibung.",
    },
    einarbeitung: {
      title: "So läuft Deine Einarbeitung",
      text: "Bevor Du in Deinen ersten Einsatz startest, wirst Du in unseren eigenen Schulungsräumen von erfahrenen Trainern vorbereitet – und danach in der Praxis begleitet. Zusätzlich bekommst Du Zugang zu unserer Online-Academy, mit der Du alle Abläufe in Deinem Tempo lernst und jederzeit nachschlagen kannst.",
      image: { src: "/photos/pos-mm-darmstadt.jpg", alt: "Einsatzbereich mit Beratungstisch im Elektrofachmarkt" },
    },
    cta: {
      title: "Klingt gut? Dann lern uns kennen.",
      text: "Schau Dir unsere offenen Stellen an oder schick uns eine Initiativbewerbung – das dauert keine zwei Minuten.",
    },
  },

  kontakt: {
    hero: {
      headline: "Sprich einfach mit uns.",
      intro:
        "Ob Frage zur Bewerbung, zu einem laufenden Einsatz oder zu einem neuen Projekt: Unser Innendienst ist Montag bis Freitag von 08:00 bis 17:00 Uhr für Dich und für Sie da.",
    },
  },

  impressum: {
    inhalt: {
      body: "## Angaben gemäß § 5 DDG\n\nMöller GmbH\nBeratungs- & Vertriebsgesellschaft\nMax-Planck-Str. 8\n55435 Gau-Algesheim\n\nTelefon: 06725 / 919350\nE-Mail: info@bvg-moeller.de\n\n**Vertreten durch:** [PLATZHALTER – Geschäftsführer eintragen: Markus Möller]\n\n**Registereintrag:** [PLATZHALTER – Registergericht und HRB-Nummer eintragen]\n\n**Umsatzsteuer-ID:** [PLATZHALTER – USt-IdNr. eintragen]\n\n> Hinweis: Dieser Rechtstext ist ein redaktioneller Platzhalter und muss vor Veröffentlichung juristisch geprüft und vervollständigt werden.",
    },
  },

  datenschutz: {
    inhalt: {
      body: "## Datenschutzerklärung\n\n[PLATZHALTER – Diese Datenschutzerklärung muss durch einen juristisch geprüften Text ersetzt werden.]\n\nVerantwortlicher im Sinne der DSGVO:\n\nMöller GmbH\nMax-Planck-Str. 8\n55435 Gau-Algesheim\nTelefon: 06725 / 919350\nE-Mail: info@bvg-moeller.de\n\n**Hinweise zur Datenverarbeitung auf dieser Website (Kurzüberblick für die juristische Ausarbeitung):**\n\n- Bewerbungsformulare: Verarbeitung der eingegebenen Daten zur Durchführung des Bewerbungsverfahrens.\n- Empfehlungsformular: Verarbeitung der Daten empfehlender und empfohlener Personen mit dokumentierter Einwilligung.\n- Live-Chat: Verarbeitung der Chat-Nachrichten und freiwilliger Kontaktangaben.\n- Es werden keine Tracking-Cookies von Drittanbietern eingesetzt.\n\n> Hinweis: Dieser Rechtstext ist ein redaktioneller Platzhalter und muss vor Veröffentlichung juristisch geprüft und vervollständigt werden.",
    },
  },

  empfehlen: {
    hero: {
      eyebrow: "Mitarbeiter empfehlen Mitarbeiter",
      headline: "Du kennst jemanden, der zu uns passt?",
      intro:
        "Gute Leute kennen gute Leute. Empfiehl uns jemanden aus Deinem Umfeld – entweder mit einem persönlichen Empfehlungslink, den Du selbst weitergibst, oder direkt mit den Kontaktdaten, wenn die Person einverstanden ist.",
    },
  },

  jobs: {
    hero: {
      headline: "Finde Deinen Einsatz.",
      intro: "Promotion, Vertrieb, Messen oder dauerhafte PoS-Betreuung – hier findest Du alle offenen Stellen bei Möller.",
    },
    empty: {
      title: "Gerade nichts Passendes dabei?",
      text: "Schick uns eine Initiativbewerbung – wir melden uns, sobald in Deiner Region etwas frei wird.",
    },
  },

  initiativbewerbung: {
    hero: {
      headline: "Initiativbewerbung – in 2 Minuten.",
      intro:
        "Kein Anschreiben, kein Lebenslauf-Zwang, kein Konto: Sag uns einfach, wer Du bist und wo Du arbeiten möchtest. Wir melden uns persönlich bei Dir.",
    },
  },
};
