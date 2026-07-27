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
| Seepegel (aktuell, Kurz-Chart) | ARPAV, `Ultime48ore.xml` (CC BY 4.0), server-seitig gefiltert über `netlify/functions/seepegel-lesen.mjs` | letzte ~3 Tage, 10-Minuten-Werte, in cm über dem Nullpunkt Peschiera |
| Verlauf – letzte 4 Monate | Selbst aufgebautes Archiv (Netlify Blobs) aus denselben ARPAV-Werten, siehe unten | wächst täglich ab Einführung der Funktion, kein rückwirkender Verlauf |
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

Neben der Pegellatte steht eine zweite, gleich große Grafik mit der Kontur des Gardasees. Der
SVG-Pfad wurde aus einer vom Nutzer bereitgestellten Kartenvorlage extrahiert (automatische
Konturerkennung + Vereinfachung, keine amtliche Vermessung, aber deutlich näher an der echten
Form als eine frei Hand gezeichnete Silhouette). Dieselbe Kontur wird als App-Icon verwendet
(siehe unten).

Die Pegellatte selbst zeigt:

- eine dicke dunkelblaue Linie an der Oberkante der Wasserfüllung = aktueller Pegelstand,
- einen schraffierten, gestrichelt eingefassten Bereich = Spanne zwischen dem 5-Jahres-Minimum
  und -Maximum (siehe oben),
- die üblichen Marken bei 0 cm, +50 cm, +100 cm und der Warnschwelle (+135 cm).

## Verlauf – letzte 4 Monate (selbst aufgebautes Archiv)

ARPAV liefert öffentlich nur eine rollende ~3-Tage-Reihe (`Ultime48ore.xml`) - das ist auch
offiziell dokumentiert (siehe „Dati ARPAV in formato XML" auf arpa.veneto.it: dort steht explizit
nur „ultimi 3 giorni"). Eine Mehrmonats-Historie gibt es bei ARPAV nicht als abrufbare
Schnittstelle. Andere Portale (Comunità del Garda, laghi.net) zeigen zwar Verlaufsgrafiken auf
ihren Webseiten, sind aber JavaScript-Apps ohne einfach auslesbare Rohdaten-API, und einzelne
Presseartikel mit Pegelwerten sind zu lückenhaft (und teils von zweifelhafter Zuverlässigkeit)
für einen durchgehenden Chart.

Statt hier ungeprüfte oder rückwirkend geschätzte Werte einzusetzen, baut BENACO sein eigenes
Archiv auf: `netlify/functions/seepegel-lesen.mjs` trägt bei **jedem Seitenaufruf** den
aktuellen Tageswert zusätzlich in einen Netlify-Blobs-Store (`seepegel-historie`) ein - ein
Eintrag pro Kalendertag, beim erneuten Aufruf am selben Tag aktualisiert. `netlify/functions/
seepegel-archiv.mjs` liest dieses Archiv nur aus (kein Schreibzugriff). Das Rolling-Window hält
die letzten ~200 Tage vor.

Konsequenz: Der Verlauf zeigt zu Beginn nur wenige Tage und füllt sich mit der Zeit - er zeigt
aber ausschließlich echte, von dieser Seite selbst aufgezeichnete ARPAV-Messwerte, nie erfundene
oder geschätzte. Damit ein Tag erfasst wird, muss die Seite an diesem Tag mindestens einmal
aufgerufen werden (kein Cron-Job im Hintergrund).

## Icon & Web-App (Homescreen)

`manifest.json` + `icons/icon-*.png` sorgen dafür, dass die Seite als eigenständige Web-App mit
Titel „BENACO“ und der Gardasee-Kontur als Icon auf dem Homescreen gespeichert werden kann
(„Zum Home-Bildschirm“ in Safari bzw. „App installieren“ in Chrome). Die Icons wurden aus derselben, aus der Nutzer-Kartenvorlage extrahierten SVG-Kontur wie die
Pegel-Grafik gerendert (dunkler Tinte-Hintergrund `#15332B`, helle Kontur), damit Icon und
Seite optisch zusammengehören. Größen: 16, 32, 120, 152, 167,
180, 192, 512 px, plus eine 512-px-Maskable-Variante für Android.

## Schrauben zum Drehen

Ganz oben im `<script>` steht der Block `CFG`:

- `guardiaCm` – Warnschwelle, aktuell +135 cm
- `lattenBereich` – Skala der Pegellatte in cm (min/max der sichtbaren Achse)
- `arpav.url` – Pfad zur Netlify Function (aktueller Pegel)
- `arpav.archivUrl` – Pfad zur Netlify Function, die das selbst aufgebaute 4-Monats-Archiv ausliest
- `spanne5j` – Minimum/Maximum der letzten 5 Jahre plus Beschriftung (siehe „5-Jahres-Min/Max“ oben)

## Warnschwelle

Ab +135 cm über dem hydrometrischen Nullpunkt von Peschiera gilt die Quota di guardia.
Geregelt wird der Abfluss über die Wehre von Salionze am Mincio (AIPO).
