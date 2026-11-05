HISTORISCHE WEBAPP 1.6.1 – Referenz für die Regressionstests.
Für die neue Windows-/iPhone-App bitte README.md lesen.

MECHATRONIK LERNPASS – Version 1.6.1 – 05.11.2026

Responsive Webapp mit 94 selbst formulierten Lernfällen zu MEC H1, D1–D46
und E1–E48. 349 Teilantworten, Merksätze, Fachquellen und Links zu den
Originalabbildungen des WKO-Katalogs. Kein offizieller Lösungsschlüssel.

VERWENDUNG
1. Über den bereitgestellten privaten Weblink öffnen.
2. Drei oder vier Wochen, verfügbare Tage, Zeit und Einheitengröße wählen.
3. Bevorzugte Übungsformen wählen und optional den Wissenscheck durchgehen.
4. Lernen öffnen und eine Lerneinheit starten. Die ausgewählten Fragen mit
   den sichtbaren Teilantworten, Erklärungen und Merksätzen durchlesen.
5. Jede Frage als gelesen markieren. Anschließend freiwillig den Test starten.
   Alle Fragen dieser Einheit werden gemischt; dazu kommen zufällig bis zu
   fünf ältere Fragen aus dem Wiederholungspool. In ungefähr jedem dritten Test
   wird zusätzlich eine bereits richtige Frage als Kontrollfrage ausgewählt,
   sofern eine passende Frage verfügbar ist. Insgesamt höchstens 25 Fragen,
   ohne doppelte Fragen. Bei mehreren Einheitsfragen unterscheidet sich ihre
   Testreihenfolge garantiert von der Reihenfolge im Lernbogen.
6. Im Test die Antworten selbst formulieren. Lösungen sind bis zur Abgabe
   verborgen. Entwürfe, Frageposition und abgegebene Antworten werden gespeichert.
7. Nach der Abgabe prüft Gemini die Fachpunkte. Falsche und unvollständige
   Antworten kommen automatisch in den Pool. Unsicher beurteilbare Antworten
   werden gesondert als „Nachprüfen“ aufgenommen und erhöhen keine Lernstufe.
8. Erst eine vollständig richtige Antwort in einem späteren Test entfernt eine
   Frage aus dem Pool. Lesen allein entfernt keine Fehler und vergibt keine Stufe.
9. Im Lernpass die Stufen und Lerntage ansehen. Einstellungen öffnen, um
   ein Backup für einen anderen Browser oder ein anderes Gerät zu exportieren.

Das Profil ist ein Startpunkt, keine wissenschaftliche Lerntyp-Diagnose.
Unsichere Themen haben Vorrang. Spätere Bewertungen bestimmen den Abstand.
Neue Fälle werden anhand der Zeit und der gewählten Lerntage begrenzt;
überfällige Wiederholungen bleiben sichtbar. Zu wenig Zeit kann zusätzliche
Lerneinheiten oder eine Verlängerung erfordern. Der Plan garantiert kein
Prüfungsergebnis. Testergebnisse sind KI-Lernfeedback, keine offizielle Note.
Weitere Übungsformen mit eigener Einschätzung bleiben unter Lernen verfügbar.

DATEN UND GERÄTE
Lernprofil, Bewertungen, Einheiten, Tests, Fehlerheft, Notizen und Favoriten
werden lokal im Browser gespeichert und mit deinem angemeldeten Konto auf dem
privaten Server abgeglichen. Auf Handy und PC dasselbe ChatGPT-Konto verwenden.
Ein vorhandener lokaler Stand wird beim ersten Abgleich übernommen. Gibt es
bereits zwei unterschiedliche Stände, fragt die App nach einer Auswahl.

Die Anzeige oben zeigt Synchronisiert, Lokal gespeichert oder Abgleich nötig.
Ohne Verbindung bleibt Lernen lokal möglich; die KI-Prüfung benötigt Internet.
Änderungen werden nach kurzer Pause übertragen, neue Serverstände regelmäßig
bei geöffneter App und beim erneuten Aktivieren geprüft. Ein laufender Text-
eintrag wird nicht durch einen eingehenden Stand ersetzt.

Bei gleichzeitig geänderten Ständen gibt es keine stille Zusammenführung.
Der Nutzer kann Unterschiede ansehen, beide Fassungen einzeln exportieren
und den gewünschten vollständigen Stand auswählen. Navigation allein erzeugt
keinen fachlichen Konflikt. Zwei Browser-Sicherungen und bis zu drei vorherige
Serverrevisionen bleiben als begrenzte Rückfallebene erhalten; im Dialog wird
jeweils die neueste frühere Sicherung zum Download angeboten. Eigene Backups
weiterhin für langfristige Sicherungen verwenden.

Die letzten acht Tests und 30 Einheiten werden gespeichert. Offene Tests werden
nicht zugunsten abgeschlossener Tests verworfen. Bei acht offenen Tests muss
zuerst einer beendet werden. Der Wiederholungspool bleibt unabhängig erhalten.
Nach Schließen des Tabs pausiert eine laufende Bewertung gegebenenfalls.
Bereits bewertete Fragen bleiben gespeichert; Bewertung fortsetzen prüft nur
die offenen Antworten. Anbieterfehler zählen nicht als falsche Antworten.
Leere Antworten werden ohne KI-Anfrage als nicht beantwortet gesammelt.

QUELLEN UND PFLEGE
Die Inhalte in content/ sind selbst verfasste Lernhilfen. Der Originalkatalog
und seine Zeichnungen werden nicht mit der veröffentlichten App verteilt.
Quell-PDF: https://www.wko.at/ooe/bildung-lehre/fragenkatalog-kandidat-mec-h1.pdf
Fachquellen stehen pro Fall. Zeichnungen im Original öffnen und selbst
erklären. Normenstand und herstellerabhängige Details sind entsprechend
eingeordnet; konkrete Arbeiten erfordern die einschlägigen Unterlagen.

TECHNIK
HTML/CSS/JavaScript mit serverseitigem Gemini-Proxy und geschützter D1-Datenbank.
Keine zusätzliche Paketinstallation erforderlich. Lokal wird Node.js 24 mit
dem eingebauten SQLite-Modul für Vorschau und Datenbanktests verwendet. Das Hosting bleibt privat und behält dieselbe
Adresse und Projekt-ID. Der Schlüssel liegt nur auf dem Server.
dist/ enthält die Oberfläche. worker/index.js enthält den Server; beim Build
werden nur explizit erlaubte App-Dateien eingebettet, keine Einstellungsdateien.
Lokaler Build: node scripts/build-worker.mjs
Lokale Vorschau: node scripts/preview.mjs
Danach http://127.0.0.1:8788 öffnen. Der Online- und der lokale Lernstand
gehören zu unterschiedlichen Browser-Adressen und werden separat gespeichert.

Inhalte neu erzeugen: python build_content.py
Lernlogik prüfen: node --test tests/learning.test.cjs
Syntax prüfen: node --check dist/app.js

FREIE ANTWORTEN UND GEMINI
Unter Lernen > Frei antworten eine eigene Erklärung tippen. Der Entwurf wird
pro Fall lokal gespeichert und in das Lernstand-Backup aufgenommen. Es gibt
keine vorgeschlagene Antwortauswahl. Fachpunkte lassen sich optional öffnen.
„Mit Gemini prüfen“ sendet ausschließlich diese Antwort und die zugehörigen
Fachpunkte an Google. Das Lernfeedback beschreibt richtige, fehlende, falsche
und unklare Punkte. Du bestätigst die Lernstufe selbst.

Standardmodell: gemini-3.1-flash-lite. Eine Anbindung ist kein Nachweis der
Bewertungsqualität. Vor der Freigabe mit echtem API-Zugang richtige,
unvollständige, falsch gerechnete und umformulierte Antworten prüfen.
Im kostenlosen Google-Kontingent können übermittelte Inhalte zur Verbesserung
der Produkte verwendet werden. Die App aktiviert keine kostenpflichtige
Abrechnung. Kontingente und Modellverfügbarkeit hängen vom Google-Zugang ab.

Schlüssel einrichten: „Gemini einrichten.cmd“ starten. Den Google-Zugang,
gegebenenfalls Kontoprüfungen und Nutzungsbedingungen selbst abschließen.
Danach den erzeugten Schlüssel in der lokalen Einrichtungsseite speichern.
Die ignorierte .dev.vars ist nur für die lokale Einrichtung. Den Schlüssel
niemals ins Repository, in portable ZIPs oder in den Chat schreiben.
Für online den Wert mit Sites als Secret GEMINI_API_KEY konfigurieren und
eine Version neu veröffentlichen. Optional GEMINI_MODEL als normale Variable
setzen. Erlaubt: gemini-2.5-flash-lite, gemini-3.1-flash-lite,
gemini-3.5-flash-lite. Keine automatische kostenpflichtige Ausweichanfrage.

Tests: node --test tests/*.cjs

Hosting-Konfiguration: .openai/hosting.json. Bestehende project_id beibehalten.
Die Veröffentlichung erfolgt privat über Sites. Authentifizierung ist Sache
des Hostings. Zugangsdaten gehören nicht in Quellstand oder App.

SCHRIFT
Inter, lokal ausgeliefert. Lizenz: dist/fonts/OFL.txt.

AKTIVIERUNG AM 05.11.2026
Gemini 3.1 Flash-Lite ist serverseitig eingerichtet. Acht echte Modellprüfungen
(volle, umformulierte, unvollständige, falsch berechnete und widersprüchliche
Antworten sowie Anweisungen innerhalb einer Antwort) entsprachen den
erwarteten Kategorien. Das ist eine kleine Stichprobe, keine Garantie.
Neue Google-Auth-Schlüssel mit Punkten und längere Schlüssel bis 4096 Zeichen
werden unterstützt. Bei Speicherfehlern bleibt die Eingabe erhalten.

NEU IN 1.3.0: KURZTEST, LERNANALYSE UND FEHLERHEFT
Lernen > Kurztest wiederholt bis zu drei bereits gelernte Fragen. Nur nach
einer abgeschlossenen Einheit oder einer früheren Wiederholung verfügbar.
Bis zu zwei Fehlerfragen haben zuerst Vorrang; danach werden weitere bekannte
Fragen zufällig ergänzt. Die Antworten sind beim Start leer. Der Kurztest
verwendet dieselbe KI-Bewertung und dieselben Lernabstände wie andere Tests.
Offene Kurztests werden fortgesetzt und nicht durch neue Fragen ersetzt.

Unter Lernen die aufklappbare Lernanalyse öffnen. Sie zeigt erfüllte Fachpunkte
je Thema, geprüfte Fragen und offenen Übungsbedarf. Pro Frage zählt nur die
letzte im aktuellen Testverlauf gespeicherte Bewertung, damit oft wiederholte
Fragen nicht mehrfach als zusätzlicher Wissensumfang erscheinen. Unklare
Bewertungen werden separat ausgewiesen und nicht als falsch gerechnet.
Die Analyse ist eine Momentaufnahme, keine Prognose einer Prüfungsnote.

Das Fehlerheft sammelt offene Fachpunkte und den echten Überarbeitungshinweis
aus der Bewertung. Diese kompakten Hinweise bleiben auch erhalten, wenn ein
alter abgeschlossener Test aus der Acht-Test-Historie fällt. Alte Backups
ohne solche Hinweise bleiben nutzbar. Notizen und Erklärungen sind pro Frage
erreichbar; vollständig richtige Testantworten entfernen den offenen Fehler.
Die Analyse und das Fehlerheft lösen keine zusätzlichen KI-Anfragen aus.

NEU IN 1.4.0: PRÜFUNGSTERMIN UND GERÄTEABGLEICH
Auf der Übersicht Prüfungstermin festlegen wählen. Der Prüfungstag selbst
liegt außerhalb des Lernzeitraums. Zwei, drei, fünf oder sieben Kalendertage
vorher werden für eine letzte Wiederholung reserviert; sehr kurze Pläne
verkürzen diese Phase. Lerntage und Zeitbudget gelten weiterhin.

Die Planung verteilt noch nicht bewertete Fragen auf verbleibende Lerntage
vor der Abschlussphase. Die verfügbare Zeit begrenzt neue Fragen. Ausgefallene
Tage erhöhen das Ziel der übrigen Tage; bei zu wenig Zeit bleibt ein Hinweis
sichtbar. Die Schätzung garantiert keine vollständige Bearbeitung oder Note.
In der Abschlussphase werden bekannte Fragen vorgezogen, auch wenn ihr
gewöhnlicher Wiederholungstermin später läge. Unbekannter Stoff wird nicht
automatisch ergänzt; ausdrücklich im Katalog gewählte Fragen bleiben lernbar.
Ohne festen Termin bleiben die bisherigen 21-/28-Tage-Pläne verfügbar.

Synchronisierung: .openai/hosting.json deklariert d1 als DB. Sites stellt die
Datenbank bereit und wendet die SQL-Migrationen aus drizzle/ vor dem Upload an.
Keine Tabellenanlage während einer Anfrage. Jeder Zugriff auf /api/state ist
an die serverseitige Besucheridentität gebunden. Ein Browser kann keinen
anderen Benutzer per Anfragefeld auswählen. Revisionsvergleiche verhindern
das stille Überschreiben paralleler Änderungen. Die gespeicherten JSON-Stände
werden serverseitig normalisiert und als Gzip-BLOB abgelegt.

Lokale Vorschau: .runtime/learner-preview.sqlite, unabhängig von der Produktion.
Für die zweite Geräte-Vorschau MEC_PREVIEW_PORT=8789 setzen. Beide Vorschauen
verwenden denselben lokalen Testbenutzer und dieselbe lokale Datenbank.
Die künstliche lokale Besucheridentität existiert nur in scripts/preview.mjs;
der produktive Worker verlangt die echte vom Hosting bestätigte Identität.

Portable HTML-Dateien arbeiten nur lokal. Synchronisierung und KI benötigen
den privaten Online-Link oder eine korrekt eingerichtete Serverumgebung.
Eine native SwiftUI-App wurde mit diesem Update nicht erstellt. Die geschützte
Schnittstelle ist vorbereitet; die Anmeldung eines späteren nativen Clients
muss über einen unterstützten Ablauf gesondert integriert und geprüft werden.

NEU IN 1.5.0: PRÜFUNGSTERMIN ALS AUSGANGSPUNKT
Direkt oben auf der Übersicht „Prüfungstermin & Lernplan“ öffnen. Der Planer
bündelt Termin, Lernstart, Minuten pro Lerntag und verfügbare Wochentage.
Auch in der ersten Profileinrichtung steht das echte Prüfungsdatum jetzt zuerst.
Ohne Datum bleibt der vorläufige 3-/4-Wochen-Rahmen verfügbar.

Die automatische Abschlussrunde reserviert ungefähr die letzten 20 Prozent
der ausgewählten Lerntage, mindestens einen und höchstens sieben. Wenn möglich
bleibt davor mindestens ein Lerntag für neuen Stoff. Eine vorhandene manuelle
Wahl von zwei/drei/fünf/sieben Kalendertagen wird beibehalten. Neue Pläne starten
mit der automatischen Empfehlung. reviewAuto ergänzt das Backup-Format Version 1.

Die Vorschau simuliert neue Fragen und Wiederholungen bis zum Prüfungstermin.
Sie respektiert verfügbare Minuten, freie Wochentage, Fehler und Lernstufen.
Die nächsten sieben Lerntage zeigen neue Fragen, Wiederholungen und geschätzte
Minuten. Die Simulation nimmt richtige Antworten an; sie vergibt keine echten
Lernstufen und verändert keine Antworten, Fehler oder Notizen. Nach echten
Tests wird die Planung aus dem tatsächlichen Stand neu berechnet.

Bei zu knapper Zeit zeigt die Vorschau, wie viele Fragen voraussichtlich noch
keine erste Bewertung erhalten, sowie einen groben Zeitrichtwert. Eine passende
längere Zeit kann ausdrücklich übernommen werden. Die App ändert dein Zeitbudget
nicht still. Aktuelle Fehler erhalten bei terminbasierten Wiederholungen Vorrang.
In der Abschlussphase werden länger nicht geübte Fragen vorgezogen, damit die
Runde zwischen bekannten Fragen wechselt. Ein perfekter Lernerfolg wird nicht
versprochen; die Planung zeigt ihre Annahmen und passt sich laufend an.

Prüfung: 94 automatische Tests bestanden. Vorschau, Eingabe des echten Datums,
Wochentage, Zeitübernahme und Abbrechen ohne Änderung im Browser geprüft.


KATALOG SELBST AUSFÜLLEN – UPDATE 1.6.0
Unter Fragenkatalog gibt es Kartenansicht, Gesamter Katalog und Selbst ausfüllen.
Eigene Antworten werden unabhängig von Testantworten gespeichert. Je Frage sind
bis zu 12.000 Zeichen und sechs eigene Bilder möglich. Die Bildauswahl am Handy
ermöglicht auch Fotos von Handskizzen. Bilder werden beim Einfügen verkleinert
(bis 2.000 Pixel längste Kante / 2 MB), von Metadaten befreit und im privaten
R2-Speicher des angemeldeten Kontos gehalten. Bilder benötigen eine Verbindung.
Texte bleiben lokal bearbeitbar; ihre Speicherung und Bildverweise werden mit
dem Lernstand abgeglichen. Eigenes Ausfüllen allein erhöht keine Lernstufe.

Der Filter Abbildungen zeigt alle Fragen, nur Bild-/Skizzenfragen, nur Textfragen
oder Fragen mit eigenen Bildern. Zusätzliche Filter zeigen offene, begonnene,
ausgefüllte oder bereits gelernte Fragen. Eine entfernte Bildverknüpfung bleibt
über frühere Lernstand-Sicherungen wiederherstellbar, solange diese vorliegen.
Die Datei im privaten Bildspeicher wird dabei nicht automatisch gelöscht.
Das JSON-Backup enthält Verweise auf diesen Speicher. Für eine eigenständige
Offline-Datei einschließlich Bildern gibt es im Gesamtkatalog den HTML-Download.
Er enthält die ausgewählten Fragen und eigenen Antworten, kein ausführbares
Skript. Diese Datei kann im Browser geöffnet und als PDF gedruckt werden.

Über Zusammengefasst / Ausführlich erklärt wird die Erklärungstiefe umgestellt.
Die ausführliche Darstellung enthält alle bisherigen Fachpunkte plus je Fall
eine zusätzliche Vertiefung mit Zusammenhängen, Praxisbeispiel oder Rechenweg.
Alle 94 Fälle sind abgedeckt. Diese selbst verfassten Vertiefungen sind Lern-
beispiele, keine vollständigen Arbeitsanweisungen oder offiziellen Lösungen.
Die Wahl wird auf dem jeweiligen Gerät gespeichert. Beim Selbstausfüllen und
in Testentwürfen bleiben Musterantworten bis zur bewussten Anzeige verborgen.

WISSEN TESTEN
Der Wissenstest enthält alle bereits durch Lerneinheiten oder Übung bekannten
Fragen in zufälliger Reihenfolge, höchstens die 94 vorhandenen Katalogfälle.
Optional werden nur Textfragen oder nur Bild-/Skizzenfragen verwendet. Jeder
Fall erscheint höchstens einmal. Offene Wissenstests derselben Auswahl werden
fortgesetzt, Antworttexte werden nicht aus früheren Tests übernommen.
Normale Tests zu Lerneinheiten behalten ihre bisherige Grenze von 25 Fragen.

Bild-/Skizzenfragen sind gekennzeichnet. Für sie wird keine automatische
Gemini-Bewertung angefordert; auch der Server weist solche Anfragen ab.
Nach der Abgabe vergleichst du die Vorlage und wählst Noch üben, Unsicher oder
Sicher erinnert. Das wird ausdrücklich als eigener Vergleich gespeichert und
fließt in die Wiederholungen ein. Die KI-Punktzahl zählt nur Textfachpunkte.
Bei alten gespeicherten Tests bleiben frühere Bewertungen als Historie erhalten.
Eigene hochgeladene Bilder werden nicht an Google zur Bewertung übertragen.

Zusätzliche Lernhilfen: gesamter Katalog, Filter für offene Antworten, private
Bildablage, Download mit Bildern, pausierbarer Gesamtwissenstest und bewusstes
Abrufen mit anschließendem Feedback. Fachlicher Hintergrund:
https://tll.mit.edu/teaching-resources/how-to-teach/help-students-retain-organize-and-integrate-knowledge/
https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication

+
+PERSÖNLICHE KI-VERBINDUNG – OPTIONAL
+Oben auf KI aus / KI verbunden / KI Fehler oder in Einstellungen auf Eigenen
+API-Schlüssel verwalten klicken. Eigenen Gemini-Schlüssel und Modell wählen,
+Prüfen & für mich speichern anklicken. Der Server prüft den Modellzugang bei
+Google. Grün = Zugang erfolgreich geprüft, Rot = Fehler oder ungültiger bzw.
+nicht berechtigter Schlüssel, Grau = keine KI verbunden. Kontingent- und
+Verbindungsfehler werden von ungültigen Schlüsseln unterschieden. Ein grüner
+Modellzugang garantiert keine später verfügbaren Generierungskontingente.
+
+Der eigene Schlüssel wird pro angemeldetem Benutzer in einer getrennten
+Datenbanktabelle mit AES-256-GCM verschlüsselt gespeichert. Der zusätzliche
+Verschlüsselungsschlüssel liegt als Secret AI_KEY_ENCRYPTION_KEY im Hosting,
+nicht im Quellstand oder Client. Benutzerzuordnung ist kryptographisch gebunden.
+API-Schlüssel werden weder in Lernstand-Backups noch in den HTML-Katalog oder
+in den Browser-Lokalspeicher geschrieben. Sie werden nur im Header der Anfrage
+vom Server an Google übertragen. Ein ungültiger Ersatz überschreibt keinen
+bisher funktionierenden Schlüssel. Verbindung erneut prüfen aktualisiert den
+Status. KI trennen entfernt den persönlichen Schlüssel und lässt den Lernstand.
+
+Die bisherige private Einpersonen-Einrichtung wird nur für den einen bereits
+vorhandenen Benutzer mit Lernstand übernommen, falls genau ein solcher Benutzer
+vorliegt. Neue Benutzer bekommen keinen gemeinsamen API-Schlüssel. Bei mehreren
+vorhandenen Benutzern wird keine automatische Zuordnung geraten. Das Hosting
+bleibt weiterhin privat; dieses Update ändert keine Zugriffsberechtigungen.
+Eine Trennung bleibt wirksam und wird nicht still durch die alte Servereinrichtung
+rückgängig gemacht. Alte Umgebungswerte werden zum Erhalt der bisherigen
+Einrichtung aufbewahrt, aber nicht als allgemeiner Nutzer-Fallback verwendet.
+
+Ohne verbundene API sind auch Texttests möglich: Nach der Abgabe Fachpunkte
+öffnen und selbst einschätzen. Solche Ergebnisse werden als eigener Vergleich
+gekennzeichnet; sie erzeugen keine KI-Punktzahl. Bildfragen werden weiterhin
+immer selbst verglichen. In der portablen HTML-Version ohne Server bleibt die
+KI aus; für persönliche Schlüsselverwaltung die private Online-App verwenden.
+
+Schema: zusätzliche Migration 0001_personal_ai.sql, bestehende Migration 0000
+unverändert. Die private Bildablage nutzt R2-Bindung BUCKET, Lernstand und
+verschlüsselte API-Profile D1-Bindung DB. Lokale Vorschauen haben eigene Daten.
+
+
+KORREKTUR 1.6.1 – MEIN LERNPASS
+Der Reiter Mein Lernpass verwendet für den Kalender direkt die bereits
+berechnete Plandauer. Zuvor wurde das berechnete Ergebnis fälschlich noch einmal
+als vollständiger Eingabeplan verarbeitet. Das löste Invalid time value aus,
+weshalb beim Klick kein Seitenwechsel sichtbar wurde. Drei Regressionstests
+betätigen die echte Navigation mit 21 Tagen, 28 Tagen und einem Prüfungstermin.
+