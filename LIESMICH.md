# benacorain

Regen an der Westküste des Gardasees und Seespiegel an der Pegellatte von Peschiera.
Eine einzelne HTML-Datei, ohne Build-Schritt, ohne Abhängigkeiten außer Chart.js vom CDN.

## Aufspielen

1. Ordner in Netlify ziehen (Drag & Drop) oder als eigenes Git-Repo verbinden.
2. Publish directory: `.` – die `netlify.toml` liegt bereits bei.
3. Sitename z. B. `benacorain` → `https://benacorain.netlify.app`.

Lokal testen: `netlify dev` im Ordner. Ein einfacher `python3 -m http.server` reicht **nicht**,
weil dann weder die Netlify Function (Seepegel) noch die Proxy-Regel (Regen/Lombardia) laufen.
Die Seite fällt beim Regen in dem Fall automatisch auf Open-Meteo zurück; der Seepegel bleibt leer.

Der Seepegel läuft bewusst über eine echte Netlify Function (`seepegel-lesen.mjs`) statt über
einen reinen `[[redirects]]`-Proxy: die ARPAV-Rohdatei enthält alle ~103 Pegelstationen Venetiens
und ist mehrere MB groß, was über einen einfachen Proxy gelegentlich zu Timeouts führte
("ARPAV nicht erreichbar", obwohl ARPAV selbst erreichbar war). Die Function filtert
serverseitig auf die Garda-Station und schickt nur noch ein paar KB an den Browser.

## Datenquellen

| Kachel | Quelle | Umfang |
|---|---|---|
| Seepegel | ARPAV, `Ultime48ore.xml` (CC BY 4.0), server-seitig gefiltert über `netlify/functions/seepegel-lesen.mjs` | letzte ~3 Tage, 10-Minuten-Werte, in Metern über dem Nullpunkt Peschiera |
| Regen | ARPA Lombardia über dati.lombardia.it (Socrata) | Stationen im Umkreis von 30 km um Salò |
| Regen (Ersatz) | Open-Meteo | 31 Tage Rückblick für den Rasterpunkt Salò |
| Regen, langjähriges Mittel (365-Tage-Ansicht) | ISPRA, Normalperiode 1991–2020, Station Brescia/Ghedi | fix im Code hinterlegte Monatswerte |

Alle Werte sind unvalidierte Rohdaten und können nachträglich korrigiert werden.
ARPAV-Zeitstempel beziehen sich ganzjährig auf die Sonnenzeit (MEZ), im Sommer also eine Stunde
vor der Uhrzeit am Handy.

## Wie die Seite mit Ausfällen umgeht

- Findet sie im ARPAV-Datensatz keine Station mit „Garda“ oder „Peschiera“, sagt sie das offen;
  der Regenteil läuft weiter.
- Ist ARPA Lombardia nicht erreichbar oder liefert die gewählte Station nichts, wechselt sie
  automatisch auf Open-Meteo und schreibt die Quelle rechts oben in die Kachel.
- Tagessummen werden im Browser (localStorage) archiviert, damit sich die 30-Tage-Ansicht
  über die Zeit auffüllt. „Archiv sichern“ schreibt eine JSON-Datei, „Archiv einlesen“ holt sie zurück.

## Schrauben zum Drehen

Ganz oben im `<script>` steht der Block `CFG`:

- `ort` – Bezugspunkt für die Stationssuche (derzeit Salò)
- `radiusKm` – wie weit die Stationsliste greift
- `guardiaCm` – Warnschwelle, aktuell +135 cm
- `lattenBereich` – Skala der Pegellatte in cm
- `arpav.suche` – Suchmuster für den Stationsnamen

## Warnschwelle

Ab +135 cm über dem hydrometrischen Nullpunkt von Peschiera gilt die Quota di guardia.
Geregelt wird der Abfluss über die Wehre von Salionze am Mincio (AIPO).
