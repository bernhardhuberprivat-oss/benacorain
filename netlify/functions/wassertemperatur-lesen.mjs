// netlify/functions/wassertemperatur-lesen.mjs
//
// Liefert die aktuelle Wassertemperatur des Gardasees als schlankes JSON.
//
// Quelle: Messsonde der APPA Trento (Agenzia provinciale per la protezione dell'ambiente)
// vor Riva del Garda, zwischen Punta Lido und Spiaggia dei Sabbioni, ca. 100 m vom Ufer,
// in 1 m Tiefe. Beschreibung:
//   https://www.appa.provincia.tn.it/Documenti-e-dati/Documenti-tecnici-di-supporto/Temperatura-lago-di-Garda-sonda-presso-Riva-del-Garda-spiaggia-dei-Sabbioni
//
// Die APPA veröffentlicht den Wert NICHT als CSV/JSON, sondern nur als eingebettetes
// Google-Sheets-"Scorecard"-Diagramm (pubchart). Der CSV-Export des Sheets ist gesperrt
// (liefert "Seite nicht gefunden"). Im HTML des pubchart steckt aber das Datenobjekt
// (chartJson), JS-escaped (\x22 statt ", \/ statt /), mit genau einer Zeile:
//   [ "20.66 °C", "08/10/2026 17:43:55" ]   (Datum TT/MM/JJJJ, italienische Ortszeit)
// Diese Function holt das HTML server-seitig, ent-escaped es und zieht Wert + Zeit heraus.
// Ändert die APPA das Diagramm (anderes oid, anderes Format), liefert sie einen
// sauberen Fehler statt Unsinn - das Frontend zeigt dann "nicht verfügbar".
//
// Erreichbar unter: /.netlify/functions/wassertemperatur-lesen

const QUELLE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxZAWmP2SPtuDepEMql7_Ht7g7Aq0_HeumgZ6VlV4dMSyzaWuzyts8wN-ckI28Cb7JPnbSxfC42m9X/pubchart?oid=1574049628&format=interactive";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}

// Offset (in Minuten) von Europe/Rome zu einem gegebenen UTC-Zeitpunkt (Sommer-/Winterzeit).
function romOffsetMin(utcMs) {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome", timeZoneName: "shortOffset",
  }).formatToParts(new Date(utcMs));
  const tz = (teile.find(t => t.type === "timeZoneName") || {}).value || "GMT+1";
  const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 60;
  return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3] || "0", 10));
}

export function parseAppa(html) {
  const klar = html
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\\//g, "/");

  const m = klar.match(
    /"v"\s*:\s*"\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[^"\d]{0,10}C\s*"\s*\}\s*,\s*\{\s*"v"\s*:\s*"\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*"/
  );
  if (!m) return null;

  const grad = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(grad) || grad < -2 || grad > 40) return null;

  const [tagN, monN, jahr, std, min, sek] = [m[2], m[3], m[4], m[5], m[6], m[7] || "0"].map(Number);
  // Ortszeit Rom -> UTC (zweimal rechnen, damit der Offset an DST-Grenzen stimmt)
  const naiv = Date.UTC(jahr, monN - 1, tagN, std, min, sek);
  let utc = naiv - romOffsetMin(naiv) * 60000;
  utc = naiv - romOffsetMin(utc) * 60000;

  return { grad, zeit: new Date(utc).toISOString() };
}

export default async () => {
  let html;
  try {
    const r = await fetch(QUELLE, {
      headers: { "User-Agent": "Mozilla/5.0 (benaco.netlify.app)", "Accept-Language": "it,de;q=0.8" },
    });
    if (!r.ok) return json(502, { error: "appa-http-" + r.status });
    html = await r.text();
  } catch (e) {
    return json(502, { error: "appa-fetch-fehlgeschlagen", detail: String((e && e.message) || e) });
  }

  const wert = parseAppa(html);
  if (!wert) return json(502, { error: "appa-format-unbekannt" });

  return json(200, {
    ...wert,
    ort: "Riva del Garda · Spiaggia dei Sabbioni",
    tiefeM: 1,
    quelle: "APPA Trento",
  });
};
