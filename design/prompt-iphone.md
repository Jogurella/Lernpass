# Prompt: Lernpass als iPhone-App (SideStore)

> Anhängen: `vorlage-iphone.html` (Design-Referenz), `vorlage-windows.html` (zur Abstimmung) und das ZIP `Mechatronik-Lernpass-v1.6.1-…-Quellcode.zip` (bestehende Webapp).

Du baust die iPhone-App „Lernpass" für die Lehrabschlussprüfung Mechatronik (MEC H1). Grundlage ist die angehängte Webapp. Ihre Lernlogik bleibt, die gesamte Oberfläche wird verworfen und nach der angehängten Vorlage `vorlage-iphone.html` neu gebaut. Eine Windows-App mit derselben Oberfläche entsteht parallel. Beide teilen sich den Web-Code und gleichen den Lernstand über einen gemeinsamen Server ab. Installation und Updates laufen ausschließlich über **SideStore**, ohne App Store und ohne eigenen Mac.

## Technik
- **Capacitor** (aktuelle stabile Version) als Hülle um den gemeinsamen Web-Code im Ordner `app/`, den auch die Windows-App verwendet. Plattform per Klasse `.ios` am Wurzelelement. Mindestversion iOS 16.
- Unverändert übernehmen und weiter testen: `core.js`, `flow.js`, `workbook.js`, `insights.js`, `explanations.js`, `data.js`, `sync.js`-Logik, alle Tests unter `tests/` (`node --test tests/*.cjs` muss grün bleiben).
- Neu schreiben: `app.js`-Rendering, `unit-ui.js`, `planner-ui.js`, `writer.js`, alle CSS-Dateien. Die Render-Funktionen der Vorlage (`vToday`, `vLearn`, `vUnit`, `vTest`, `vResult`, `vCatalog`, `vPass`, Sheets) dienen als Vorbild; dort stehen Beispieldaten, in der App kommen die echten Werte aus `LernpassCore`/`LernpassFlow`.
- Native Ergänzungen über Capacitor-Plugins:
  - Haptik: leicht beim Tab-Wechsel und Schaltern, „Erfolg" bei „Gelesen" und beim Testergebnis.
  - Statusleiste über dem Inhalt (`overlay`), Safe Areas mit `env(safe-area-inset-*)`.
  - Tastatur: Editor im Test bleibt beim Tippen sichtbar, Dock schiebt sich über die Tastatur.
  - Geräte-Token im iOS-Schlüsselbund (Keychain-Plugin), nie in `localStorage`.
  - Kamera/Fotos für Skizzen unter „Selbst ausfüllen".
- WebView-Verhalten wie eine echte App: kein Zoomen, kein Textauswahl-Menü auf Buttons, kein Zurückfedern des ganzen Fensters (nur die Scroll-Bereiche federn), Wischgeste vom linken Rand zurück auf Push-Bildschirmen, Großtitel schrumpft beim Scrollen in die gläserne Navigationsleiste.
- Bundle-ID fest auf z. B. `at.lernpass.mec` setzen und **nie ändern**, sonst verliert SideStore beim Update die Daten.

## Abgleich zwischen iPhone und Windows

Die bestehende Webapp verlässt sich auf die Besucheridentität des Hostings. Native Apps haben diese Anmeldung nicht. Deshalb bekommt der vorhandene Server (`worker/index.js`, Cloudflare Worker mit D1 und R2) eine eigene Geräteanmeldung und läuft im eigenen kostenlosen Cloudflare-Konto des Nutzers.

**Server (gemeinsam für beide Apps, eigenes Repo-Verzeichnis `server/`)**
- `worker/index.js`, `drizzle/`-Migrationen und die Gemini-Prüfung (`/api/check`) übernehmen. Die bestehende Revisionslogik von `/api/state` (kein stilles Überschreiben, bis zu 3 frühere Serverstände) bleibt unverändert.
- Neue Migration `0002_devices.sql`: Tabellen `accounts` und `devices` (id, account_id, name, plattform, token_hash, created_at, last_seen).
- Neue Endpunkte:
  - `POST /api/account` → legt beim allerersten Gerät ein Konto an, gibt ein Geräte-Token zurück.
  - `POST /api/pair/start` (angemeldet) → 6-stelliger Code, 10 Minuten gültig, einmal verwendbar.
  - `POST /api/pair/claim` `{code, name, platform}` → Geräte-Token für das neue Gerät. Höchstens 5 Versuche pro 10 Minuten und IP.
  - `GET /api/devices`, `DELETE /api/devices/:id` → Geräte anzeigen und entfernen.
- Token: 32 zufällige Bytes, nur als SHA-256-Hash in D1 gespeichert, Übertragung als `Authorization: Bearer`. Alle bisherigen Routen lesen die Konto-ID aus dem Token statt aus der Hosting-Identität.
- Der Gemini-Schlüssel bleibt wie bisher verschlüsselt auf dem Server (AES-256-GCM, Secret `AI_KEY_ENCRYPTION_KEY`). Er kommt nie in die App.
- Bereitstellung: `wrangler deploy` per GitHub Action bei Änderungen in `server/`. Die Server-Adresse wird beim ersten Start der App abgefragt oder per QR-Code beim Koppeln übernommen.

**Client (in beiden Apps gleich)**
- Offline zuerst: Lernstand lokal speichern, 1,5 Sekunden nach der letzten Änderung hochladen, beim Öffnen, beim Zurückkehren in die App und jede Minute neu abfragen.
- Ein laufender Texteintrag wird nie durch einen eingehenden Stand ersetzt.
- Bei parallelen Änderungen den Dialog „Abgleich nötig" aus der Vorlage zeigen: beide Stände mit Zählern vergleichen, den anderen vorher sichern können, dann bewusst wählen.
- Status oben (Windows) bzw. in den Einstellungen (iPhone): Synchronisiert · Auf diesem Gerät · Abgleich nötig.
- Bilder aus „Selbst ausfüllen" gehen weiterhin in R2 (verkleinert auf 2.000 px, ohne Metadaten).
- Bestehende Lernstände: Import der JSON-Sicherung aus der Webapp beim ersten Start anbieten.


## Bauen ohne Mac und Updates über SideStore
**IPA per GitHub Actions** (`.github/workflows/release-ios.yml`, läuft bei Tags `v*` auf `macos-latest`):
1. `npm ci`, Web-Code bauen, `npx cap sync ios`.
2. `xcodebuild archive -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphoneos -archivePath build/App.xcarchive CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`.
3. `App.app` aus dem Archiv in einen Ordner `Payload/` kopieren und als `Lernpass-<version>.ipa` zippen (unsigniert; SideStore signiert beim Installieren mit der Apple-ID des Nutzers).
4. IPA an ein **veröffentlichtes** GitHub-Release hängen.
5. `sidestore/source.json` aktualisieren und committen (siehe unten).

**SideStore-Quelle** `sidestore/source.json` im AltStore-Quellformat, erreichbar über `https://raw.githubusercontent.com/<BENUTZER>/<REPO>/main/sidestore/source.json` (Repo bzw. Release muss öffentlich sein):
```json
{
  "name": "Lernpass",
  "identifier": "at.lernpass.source",
  "iconURL": "…/icon-512.png",
  "apps": [{
    "name": "Lernpass",
    "bundleIdentifier": "at.lernpass.mec",
    "developerName": "<NAME>",
    "localizedDescription": "Lernplan, Tests und Wiederholungen für MEC H1.",
    "iconURL": "…/icon-512.png",
    "tintColor": "DD7419",
    "versions": [{
      "version": "1.7.0",
      "date": "2026-11-05",
      "downloadURL": "https://github.com/<BENUTZER>/<REPO>/releases/download/v1.7.0/Lernpass-1.7.0.ipa",
      "size": 0,
      "localizedDescription": "Änderungen dieser Version",
      "minOSVersion": "16.0"
    }]
  }],
  "news": []
}
```
Der Workflow stellt jede neue Version **vorne** in `versions` ein (Größe in Bytes aus der IPA, Text aus den Release-Notizen). Der Nutzer fügt die Quelle einmal in SideStore hinzu; danach erscheinen Updates direkt dort.

**In der App** (Einstellungen › App, siehe Vorlage):
- Beim Start und täglich `source.json` laden und mit der eigenen Version vergleichen. Neuere Version → Zeile „Version x.y.z verfügbar" mit Button „In SideStore öffnen" (URL-Schema von SideStore versuchen; falls es nicht reagiert, kurze Anleitung zeigen).
- Ablauf der Signatur anzeigen: kleines natives Plugin liest `ExpirationDate` aus `embedded.mobileprovision` im App-Bundle. Text „App-Signatur läuft in 5 Tagen ab", ab 2 Tagen als Warnung mit Hinweis auf Aktualisieren in SideStore.
- Vor einem Update nichts löschen: Lernstand liegt im App-Container und bleibt bei gleicher Bundle-ID erhalten. Zusätzlich vor jedem Versionswechsel eine lokale Sicherung schreiben.
- App-Icon in allen Größen im Stil der Vorlage (Messuhr-Zeiger auf Petrol-Bernstein-Verlauf).

## Designsystem (verbindlich für alle Bildschirme)

Die angehängte Vorlage ist die visuelle Referenz. Übernimm Farben, Abstände, Radien, Schatten, Animationen und Texte so genau wie möglich. Die CSS-Variablen im `:root`-Block der Vorlage sind die Design-Tokens: Kopiere sie unverändert in eine eigene Datei `tokens.css` und verwende in Komponenten **nur** diese Variablen, nie feste Farbwerte.

### Leitidee
„Werkbank aus Glas": ruhige, gläserne Ebenen (Liquid Glass) über einem langsam treibenden Lichtfeld in Petrol, Bernstein und Taubenblau, darunter ein feines Millimeterraster wie auf technischem Zeichenpapier. Technische Details aus der Mechatronik sind echte Inhalte, keine Dekoration: Fragennummern wie Bauteilschilder (`D22`, `E15` in Monospace), das Tagesziel als Messuhr mit Skala, Lernstufen als LED-Leiste mit 5 Segmenten, Themen mit eigenen Schaltzeichen-Symbolen (Pneumatikzylinder, Zahnrad, Widerstand, SPS, Schutzschild).

### Farben
- Akzent „Signal" (Bernstein): nur für die eine Hauptaktion pro Bildschirm, den aktiven Reiter, Prüfungstermin und Abschlussrunde.
- Zweitfarbe „Flow" (Petrol): Fortschritt, Links, Abgleich, Merksätze.
- Bewertungsfarben sind getrennt vom Akzent: Richtig = `--ok`, Teilweise = `--warn`, Falsch = `--err`, Nachprüfen = `--check`, Eigener Vergleich = `--flow`.
- Lernstufen 0–5 haben eine eigene Skala `--s0` bis `--s5` (Grau → Petrol → Grün).
- Hell- und Dunkelmodus folgen dem System, mit manueller Wahl in den Einstellungen. Beide Paletten stehen vollständig in der Vorlage.

### Liquid Glass (Rezept)
- Fläche: Verlauf von `--glass-strong` über `--glass` zu `--glass-thin`, `backdrop-filter: blur(26px) saturate(170%)`.
- Kante: 1 px `--glass-edge`, innen oben eine helle Lichtkante (`inset 0 1px 0`), unten eine schwache.
- Schatten: weich und tief (`0 10px 30px -12px`), nie hart.
- Glanzlicht: radialer Lichtfleck, der der Maus bzw. dem Finger folgt (`--mx`/`--my`), Mischmodus soft-light.
- Sheets, Tab-Leiste, Navigationsleiste und Dialoge sind stärker geblurrt (40 px) als Karten.
- Glas nur auf Ebenen, die etwas trennen. Nicht jede Zeile bekommt eine eigene Karte.

### Typografie
- Systemschrift der Plattform: iPhone SF Pro (`-apple-system`), Windows Segoe UI Variable. Keine Webfonts für Fließtext.
- Monospace (SF Mono / Cascadia Mono) nur für Fragennummern, Zahlen in Tabellen und Codes.
- Skala: Großtitel 34/28 pt, Abschnitt 20, Kartentitel 16, Text 15, Klein 13, Label 11 (Großbuchstaben, +0,08 em Laufweite).
- Zahlen immer mit `tabular-nums`.

### Bewegung
- Feder-Kurve `cubic-bezier(.32,1.42,.56,1)` für alles, was der Nutzer direkt bewegt (Tabs, Schalter, Buttons, Sheets). Weiche Kurve `cubic-bezier(.22,.8,.24,1)` für Einblendungen.
- Tab-Wechsel: der gläserne Hintergrund-Tropfen gleitet zum neuen Reiter (550 ms Feder).
- Bildschirmwechsel: neue Seite gleitet 26 px von rechts ein (Push) bzw. hebt sich 10 px (Tab).
- Listen und Karten erscheinen gestaffelt (je 50 ms), starten aber sichtbar (Deckkraft ab 0,3), nie unsichtbar.
- Messuhr-Zeiger schwingt beim Öffnen auf den Wert ein, Fortschrittsbalken und Ringe füllen sich animiert.
- Buttons skalieren beim Drücken auf 0,96. Sheets federn von unten herein, Windows-Dialoge skalieren von 0,96.
- Das Lichtfeld im Hintergrund treibt über 26–38 Sekunden. `prefers-reduced-motion` schaltet alle Animationen ab.

### Symbole
Eigener Satz im 24er-Raster, Strichstärke 1,7, runde Enden (alle Pfade stehen in der Vorlage im Objekt `P`). Keine Emojis, keine Icon-Fonts, keine gemischten Symbolstile.

### Begriffe (überall gleich verwenden)
| Immer | Nie |
|---|---|
| Frage (D1–D46, E1–E48) | Fall, Lernfall, Karte, Aufgabe |
| Einheit | Lerneinheit, Session, Lektion |
| Test, Kurztest, Wissenstest | Quiz, Prüfungssimulation |
| Wiederholen | Pool, Wiederholungspool, Fehlerpool |
| Fehlerheft | Fehlerliste |
| Lernplan | Planer, Prüfungsplan |
| Lernpass | Mein Lernpass, Pass |
| Stufen: Neu, Kennengelernt, Wiedererkannt, Verstanden, Gefestigt, Sicher | Level, Sicher erinnert |
| Bewertung: Richtig, Teilweise, Falsch, Nachprüfen, Eigener Vergleich | Korrekt, Fast richtig |
| Abgleich, Synchronisiert, Auf diesem Gerät, Abgleich nötig | Sync, Cloud |
| Kurz / Ausführlich | Zusammengefasst / Ausführlich erklärt |

### Tonalität
- Du-Form, kurze Sätze, Aktiv. Ein Button sagt genau, was passiert („Test abgeben", danach Meldung „Abgegeben").
- Keine Ausrufezeichen-Ketten, keine Emojis, keine Floskeln wie „Willkommen zurück!", „Los geht's!", „Super gemacht!".
- Fehlermeldungen sagen, was passiert ist und was der Nutzer tun kann, ohne Entschuldigung.
- Die Hinweise „Eigene Lernhilfen · kein offizieller Lösungsschlüssel" und „Lernfeedback, keine offizielle Note" bleiben sichtbar (Einstellungen bzw. Ergebnis).

### Bildschirme
Hauptbereiche (iPhone: Tab-Leiste unten, Windows: Seitenleiste links): **Heute · Lernen · Katalog · Lernpass**. Einstellungen über das Zahnrad (iPhone oben rechts, Windows unten in der Seitenleiste).

1. **Heute**: nächste Einheit mit den ersten drei Fragen und Hauptbutton, Countdown bis zur Prüfung mit Zeitleiste und schraffierter Abschlussrunde, Tagesziel als Messuhr, Schnellstart Kurztest / Wiederholen / Wissenstest, Themenfortschritt.
2. **Lernen**: Ablauf in 3 Schritten (Einheit lesen → Test schreiben → Lücken wiederholen), laufende Einheit mit Lesepunkten, Wiederholen-Liste mit Bewertungs-Chips, weitere Übungen, Lernanalyse je Thema, Fehlerheft.
3. **Einheit** (Push): Fragennummer, Thema, Frage, Umschalter Kurz/Ausführlich, Teilantworten nummeriert, Merksatz, „Darauf achten", Link zur Originalabbildung, unten Dock mit Vor/Zurück und „Gelesen".
4. **Test** (Push): Fragennavigation 1–n, Editor mit Autosave-Anzeige und Zeichenzahl, Hinweis „Fachpunkte bleiben bis zur Abgabe verborgen", „Nächste Frage" und „Test abgeben".
5. **Ergebnis** (Push): Ring mit Fachpunkt-Anteil, Zählung je Bewertung, aufklappbare Liste mit erfüllten / fehlenden / falschen Fachpunkten und KI-Hinweis.
6. **Katalog**: Suche, Ansicht Karten / Liste / Selbst ausfüllen, Themen-Chips mit Anzahl, Karten mit Fragennummer, Skizzen-Kennzeichen, Favoritenstern, Stufen-LEDs. Tippen öffnet die Frage als Sheet (Windows: Dialog). Export „Mit eigenen Antworten exportieren".
7. **Lernpass**: Stufenleiter 0–5 mit Anzahl, Gesamtring, Kalender bis zur Prüfung (gelernt / heute / Abschlussrunde / Prüfung), Lernprofil.
8. **Lernplan** (Sheet/Dialog): Prüfungstermin, Minuten pro Lerntag, Lerntage, Vorschau der nächsten 7 Lerntage (neu/wiederholen), Machbarkeitshinweis.
9. **Einstellungen**: Geräte & Abgleich, KI-Bewertung, Lernen, Sicherung, App-Version & Updates.
10. **Gerät koppeln**, **Abgleich nötig** (Konfliktwahl mit Vergleich beider Stände), **Update** (nur Windows), **Einrichtung** (3 Schritte: Termin, Zeit & Tage, Lernvorlieben).

Zusätzlich gestalten, auch wenn die Vorlage sie nicht zeigt, im selben Stil: Ladezustand (Skelett-Glasflächen, kein Spinner-Overlay), Offline-Hinweis als Status-Pill, leere Zustände (z. B. „Wiederholen ist leer. Falsche Antworten aus Tests landen hier."), KI-Fehler (Kontingent, ungültiger Schlüssel), Bild-/Skizzenfragen mit eigenem Vergleich, Selbst-ausfüllen-Editor mit bis zu 6 Bildern.

### Was die App nicht nach KI aussehen lässt
- Echte Inhalte aus `data.js` überall, keine Platzhaltertexte.
- Ein Akzent pro Bildschirm, nicht jede Karte bunt.
- Ungleiche, inhaltsgetriebene Kartengrößen statt identischer Kachelraster.
- Konsequente Begriffe aus der Tabelle oben. Kein Reiter, Titel oder Button weicht davon ab.
- Plattformtypisches Verhalten: iPhone mit Großtitel, der beim Scrollen in die gläserne Navigationsleiste schrumpft, Wischgeste zurück, Haptik. Windows mit Mica/Acryl-Fenster, Tastaturkürzeln, Hover-Zuständen.


### iPhone-spezifisch
- Gläserne, schwebende Tab-Leiste unten (Kapsel, 16 px Rand, 24 px über der Home-Leiste), aktiver Reiter mit gleitendem Glas-Tropfen und Bernstein-Symbol, Zähler am Reiter Lernen.
- Großtitel 34 pt, schrumpft beim Scrollen in die mittige Titelzeile der Navigationsleiste.
- Sheets von unten mit Griff, abgerundet 34 px, mit Feder-Animation; nach unten wischen schließt.
- Einheit und Test: Dock über der Home-Leiste mit Vor/Zurück und Hauptaktion.
- Mindestens 44 × 44 pt Tippfläche, Dynamic Type bis „Groß" ohne abgeschnittene Texte.

## Vorgehen
1. Repo-Struktur anlegen bzw. erweitern: `app/` (gemeinsamer Web-Code), `ios/` (Capacitor), `server/` (Worker), `sidestore/`, `.github/workflows/`.
2. Lernlogik und Tests aus dem ZIP übernehmen, Tests grün.
3. Tokens und Komponenten aus der Vorlage übernehmen, jeden Bildschirm der Liste bauen und mit der Vorlage im Hell- und Dunkelmodus vergleichen (Safari-Webinspektor bzw. iOS-Simulator im CI-Screenshot).
4. Geräteanmeldung und Abgleich einbauen; Koppeln mit dem Windows-PC per 6-stelligem Code testen.
5. Release-Workflow mit `v1.7.0` durchspielen, IPA über die Quelle in SideStore installieren, dann `v1.7.1` veröffentlichen und das Update in SideStore prüfen.
6. README auf Deutsch: SideStore-Quelle hinzufügen, Erstes Koppeln, Release erstellen.

## Abnahme
- Jeder Bildschirm entspricht der Vorlage in Hell und Dunkel; alle Texte folgen der Begriffstabelle.
- Fühlt sich wie eine native App an: kein Browser-Verhalten sichtbar (Zoom, Auswahlrahmen, Rückfedern des ganzen Fensters).
- Lernen funktioniert offline; Abgleich mit Windows ohne Datenverlust, Konflikte nur über den Dialog.
- Neues Tag → IPA im Release und neuer Eintrag in `source.json` → Update erscheint in SideStore; Lernstand bleibt nach dem Update erhalten.
