# Lernpass

Windows-App für Mechatronik MEC H1 mit 94 Lernfragen, freien Antworten,
Lernplan, Tests und wiederholten Fragen. Die Oberflächen in
`design/vorlage-windows.html` und `design/vorlage-iphone.html` sind die
verbindliche Designreferenz. Farben und Grundkomponenten stammen daraus.

## Windows verwenden

Den aktuellen NSIS-Installer aus den [Releases](https://github.com/Jogurella/Lernpass/releases)
laden und ausführen. Lernstand und Einstellungen liegen getrennt vom Programm
unter `%APPDATA%\Lernpass`. Ein Update ersetzt das Programm; vorher wird eine
Sicherung erstellt. Windows-Gerätetoken liegen in der Anmeldeinformationsverwaltung.
Es ist kein kostenpflichtiges Windows-Code-Signing-Zertifikat enthalten.
Die separaten Tauri-Updates werden mit dem projektspezifischen Schlüssel signiert.
Windows kann beim ersten Installer eine SmartScreen-Rückfrage anzeigen.

Beim ersten Start den Lernplan einrichten oder eine JSON-Sicherung der bisherigen
Webapp importieren. Einheiten zuerst lesen, danach einen gemischten Test schreiben.
Fehler und teilweise richtige Antworten werden erneut eingefügt. Regelmäßig kommen
auch bereits richtig beantwortete Fragen zur Kontrolle vor.

Lernen und eigener Antwortvergleich funktionieren offline. Die KI-Prüfung ist
freiwillig und benötigt einen eigenen Gemini-Zugang. Ein eigener Vergleich wird
ausdrücklich gekennzeichnet und erzeugt keine KI-Punktzahl. Skizzenfragen werden
immer selbst verglichen.

## Geräte über Tailscale verbinden

Tailscale auf Server-PC, Windows-Gerät und iPhone mit dem gewünschten Tailnet
verbinden. In Einstellungen → Gerät koppeln die HTTPS-Adresse des Lernpass-Servers
eintragen. Auf dem ersten Gerät ein neues Lernkonto anlegen. Dort einen Einmalcode
anfordern und auf dem weiteren Gerät eingeben. Der Code gilt zehn Minuten.

Die Geräte erhalten unterschiedliche Token. Der Server speichert davon nur Hashes.
Bestehende Revisionen, Konfliktdialog und Sicherungen bleiben erhalten. Ein laufender
Texteintrag wird nicht durch einen heruntergeladenen Stand ersetzt. Bei parallelen
Änderungen wird ein Stand ausdrücklich gewählt. Eigene Bilder bleiben im privaten
Server-Speicher und werden nicht zur KI-Bildbewertung übertragen.

Der Server-PC muss eingeschaltet sein. Für den Windows-Autostart der eingerichteten
Serverinstanz muss das verwendete Windows-Konto angemeldet sein; Sperren oder das
Schließen von RustDesk beendet die Anmeldung nicht. Eine Router-Portfreigabe ist
für diese Verbindung nicht nötig. Der konfigurierte Serve-Port ist ein privater
Tailscale-Zugang, kein öffentliches Funnel-Angebot.

## Quellcode bauen

Node.js 24, pnpm 11.25.0 und für Windows Rust/MSVC installieren. Dann:

```text
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run preview
```

Vorschau: `http://127.0.0.1:8794`. Für die iPhone-Anordnung
`http://127.0.0.1:8794/?platform=ios` öffnen. Die Vorschau hat eigene Daten.
Der Servercode enthält keine feste private Tailscale-Adresse; die eigene Adresse
wird beim Koppeln eingetragen.

`app/` enthält den gemeinsamen Web-Code. `core.js`, `flow.js`, `workbook.js`,
`insights.js`, `explanations.js`, `data.js` und `sync.js` wurden unverändert aus
1.6.1 übernommen; Prüfsummen stehen unter `design/`. Die bisherigen Dateien unter
`dist/`, `worker/` und die ursprünglichen Tests sind als geprüfter Ausgangsstand
enthalten. Der neue Client liegt unter `app/`, die native Serverhülle unter `server/`.
`pnpm run build` baut beide Testgrundlagen. Zusätzlich prüfen Tests die tatsächliche
neue Navigation, die freie Testantwort und Geräteanmeldung.

## Windows-Release erstellen

Version nur in `package.json` erhöhen und die Änderungen in `release-notes.json`
eintragen. Der Build überträgt die Version nach Tauri, Cargo und in die Oberfläche.
Der öffentliche Updater-Schlüssel ist in `windows/tauri.conf.json` enthalten.
Der private Schlüssel gehört ausschließlich in das GitHub-Actions-Secret
`TAURI_SIGNING_PRIVATE_KEY`; ein gesetztes Passwort in
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Er gehört nie ins Repository oder Übergabepaket.

```text
git tag v1.7.1
git push origin v1.7.1
```

Der Windows-Workflow baut einen veröffentlichten Release mit NSIS-Installer,
Signatur und `latest.json`. Die App prüft beim Start und alle sechs Stunden,
lädt ein verfügbares Update mit Signaturprüfung und zeigt es in der Titelleiste an.
Die Einstellung „Automatisch aktualisieren“ übernimmt ein verfügbares Update beim
nächsten Start. Die lokale Sicherung wird vor der Installation angelegt.

## iPhone und SideStore

Die gemeinsame Oberfläche ist vorbereitet. Unter `ios/` liegen Capacitor-Brücke,
Keychain-Speicherung, Dateienexport, Haptik und Signaturanzeige. Das Xcode-Projekt
wird auf einem Mac erzeugt:

```text
pnpm install --frozen-lockfile
pnpm run build
pnpm run ios:sync
```

Danach `ios/native/App/App.xcodeproj` in Xcode öffnen. Die Bundle-ID `at.lernpass.mec`
beibehalten. Der macOS-Workflow erzeugt eine unsignierte IPA, die SideStore mit dem
Apple-Zugang des Nutzers signiert. Erst nach einer tatsächlich gebauten IPA wird
eine Version mit echter Dateigröße in `sidestore/source.json` eingetragen.
Die Quelle ist:

`https://raw.githubusercontent.com/Jogurella/Lernpass/main/sidestore/source.json`

Solange dort keine App-Version steht, gibt es noch kein veröffentlichbares
iPhone-Paket. Ein erfolgreicher CI-Build ersetzt keine Prüfung auf einem echten
iPhone; Kamera, Tastatur, Keychain, SideStore-Installation und Datenerhalt nach
einem Update müssen auf dem MacBook beziehungsweise iPhone geprüft werden.

## Server selbst betreiben

Der aktuelle Weg verwendet `server/node-server.mjs` mit SQLite und privater
Dateiablage. Der Worker verarbeitet die gleichen API-Routen wie bei D1/R2.
Der Verschlüsselungsschlüssel wird unter Windows mit DPAPI an das Serverkonto
gebunden. Serverdaten liegen außerhalb des Quellcodes unter `%APPDATA%\Lernpass Server`.
Für einen anderen Betrieb kann `MEC_SERVER_DATA` gesetzt werden.

```text
node server/node-server.mjs
tailscale serve --bg --https=8443 http://127.0.0.1:8796
```

Vor dem Start für Tailscale `MEC_SERVER_PUBLIC_URL` auf die eigene vollständige
HTTPS-Adresse inklusive Port setzen; sie wird auch zur Host-Prüfung verwendet.
Die hier eingerichtete Instanz nutzt dafür ihre lokale Startkonfiguration.
Der Node-Server bindet ausschließlich an `127.0.0.1`. Bestehende Serve-Routen
zuerst prüfen und für den Lernpass einen freien Port verwenden. Ein optionaler
Cloudflare-Betrieb benötigt D1-Bindung `DB`, R2-Bindung `BUCKET`, die Migrationen
aus `server/drizzle/` und das Secret `AI_KEY_ENCRYPTION_KEY`.

## Inhalte

Eigene Lernhilfen, kein offizieller Lösungsschlüssel und keine offizielle Note.
Quellen stehen bei den Fragen. Originalzeichnungen werden im WKO-PDF geöffnet;
das Original-PDF wird nicht mitverteilt. Die im ursprünglichen Stand enthaltene
Schrift Inter hat ihre Lizenz unter `dist/fonts/OFL.txt`. Die neue App verwendet
die Systemschrift der jeweiligen Plattform.
