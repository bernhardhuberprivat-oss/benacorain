# BENACO

Seespiegel des Gardasees an der Pegellatte von Peschiera, mit dem 5-Jahres-Min/Max als
Referenzband. Eine einzelne HTML-Datei, ohne Build-Schritt, ohne Abhängigkeiten außer
Chart.js vom CDN. Als Web-App auf dem Homescreen speicherbar (eigenes Icon, eigener Titel).

## Aufspielen

1. Ordner in Netlify ziehen (Drag & Drop) oder als eigenes Git-Repo verbinden.
2. Publish directory: `.` – die `netlify.toml` liegt bereits bei.
3. Sitename z. B. `benaco` → `https://benaco.netlify.app`.

Lokal testen: `netlify dev` im Ordner. Ein einfacher `python3 -m http.server` reicht **nicht**,
weil dann die Netlify Function (Seepegel) nicht läuft und der Pegel leer bleibt.

Der Seepegel läuft bewusst über eine echte Netlify Function (`seepegel-lesen.mjs`) statt über
einen reinen `[[redirects]]`-Proxy: die ARPAV-Rohdatei enthält alle ~103 Pegelstationen Venetiens
und ist mehrere MB groß, was über einen einfachen Proxy gelegentlich zu Timeouts führte
("ARPAV nicht erreichbar", obwohl ARPAV selbst erreichbar war). Die Function filtert
serverseitig auf die Garda-Station und schickt nur noch ein paar KB an den Browser.

## Datenquellen

| Element | Quelle | Umfang |
|---|---|---|
| Seepegel (aktuell, Chart) | ARPAV, `Ultime48ore.xml` (CC BY 4.0), server-seitig gefiltert über `netlify/functions/seepegel-lesen.mjs` | letzte ~3 Tage, 10-Minuten-Werte, in cm über dem Nullpunkt Peschiera |
| 5-Jahres-Spanne (Min/Max-Band) | Fest im Code hinterlegte, recherchierte Werte (siehe unten) | kein Live-API vorhanden, daher statisch mit Quellenangabe |

Alle Werte sind unvalidierte Rohdaten und können nachträglich korrigiert werden.
ARPAV-Zeitstempel beziehen sich ganzjährig auf die Sonnenzeit (MEZ), im Sommer also eine Stunde
vor der Uhrzeit am Handy.

### 5-Jahres-Min/Max (Stand der Recherche: Juli 2026)

- **Minimum: +45 cm**, ca. 19. April 2023 – Frühjahrstrockenheit/Niedrigwasser.
- **Maximum: +138 cm**, ab 16. Mai 2024 – Hochwasser, höchster Stand seit 1997.

Es gibt aktuell keine dynamische, frei zugängliche API für ein rollendes 5-Jahres-Min/Max des
Peschiera-Pegels. Die beiden Werte wurden über mehrere unabhängige italienische Nachrichten-
/Fachquellen zum Gardasee-Pegel gegensätzlich verifiziert (Dürre 2022/23 bzw. Hochwasser Mai 2024).
Sollte ein neuer Rekord auftreten, müssen `CFG.spanne5j` in `index.html` **und** dieser Abschnitt
von Hand aktualisiert werden.

## Wie die Seite mit Ausfällen umgeht

Findet sie im ARPAV-Datensatz keine Station mit „Garda“ oder „Peschiera“, oder ist ARPAV
gerade nicht erreichbar, sagt sie das offen in der Kachel und im Meldungsbanner.

## Pegel-Grafik

Neben der Pegellatte steht eine zweite, gleich große Grafik mit der (stilisierten) Kontur des
Gardasees – keine amtliche Vermessung, sondern eine von Hand nachgezogene, wiedererkennbare
Silhouette (schmaler Nordarm bei Riva, deutliche Weitung nach Süden, Halbinsel Sirmione als
Aussparung). Dieselbe Kontur wird als App-Icon verwendet (siehe unten).

Die Pegellatte selbst zeigt:

- eine dicke dunkelblaue Linie an der Oberkante der Wasserfüllung = aktueller Pegelstand,
- einen schraffierten, gestrichelt eingefassten Bereich = Spanne zwischen dem 5-Jahres-Minimum
  und -Maximum (siehe oben),
- die üblichen Marken bei 0 cm, +50 cm, +100 cm und der Warnschwelle (+135 cm).

## Icon & Web-App (Homescreen)

`manifest.json` + `icons/icon-*.png` sorgen dafür, dass die Seite als eigenständige Web-App mit
Titel „BENACO“ und der Gardasee-Kontur als Icon auf dem Homescreen gespeichert werden kann
(„Zum Home-Bildschirm“ in Safari bzw. „App installieren“ in Chrome). Die Icons wurden aus
derselben SVG-Kontur wie die Pegel-Grafik gerendert (dunkler Tinte-Hintergrund `#15332B`,
helle Kontur), damit Icon und Seite optisch zusammengehören. Größen: 16, 32, 120, 152, 167,
180, 192, 512 px, plus eine 512-px-Maskable-Variante für Android.

## Schrauben zum Drehen

Ganz oben im `<script>` steht der Block `CFG`:

- `guardiaCm` – Warnschwelle, aktuell +135 cm
- `lattenBereich` – Skala der Pegellatte in cm (min/max der sichtbaren Achse)
- `arpav.url` – Pfad zur Netlify Function
- `spanne5j` – Minimum/Maximum der letzten 5 Jahre plus Beschriftung (siehe „5-Jahres-Min/Max“ oben)

## Warnschwelle

Ab +135 cm über dem hydrometrischen Nullpunkt von Peschiera gilt die Quota di guardia.
Geregelt wird der Abfluss über die Wehre von Salionze am Mincio (AIPO).
