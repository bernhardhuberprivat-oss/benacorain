// netlify/functions/seepegel-lesen.mjs
//
// Liest die ARPAV-XML-Datei (Ultime48ore.xml, alle ~103 Pegelstationen Venetiens,
// 10-Minuten-Werte der letzten 48h) server-seitig, sucht die Garda/Peschiera-Station
// heraus und liefert NUR deren Livello-idrometrico-Reihe als schlankes JSON zurück.
//
// Warum eine eigene Function statt des einfachen [[redirects]]-Proxys in netlify.toml:
// Die Originaldatei enthält alle Stationen Venetiens und ist mehrere MB groß - über
// einen reinen Redirect-Proxy an den Browser durchgereicht, führte das gelegentlich zu
// Timeouts/Abbrüchen ("ARPAV nicht erreichbar"), je nachdem wie langsam ARPAV gerade
// antwortete. Hier serverseitig parsen und nur die paar hundert Byte der Garda-Station
// zurückgeben ist robuster und schneller.
//
// Erreichbar unter der garantierten Standard-URL jeder Netlify Function:
// /.netlify/functions/seepegel-lesen
//
// Trägt bei jedem Aufruf zusätzlich den aktuellen Tageswert in ein selbst geführtes
// Archiv ein (Netlify Blobs, Store "seepegel-historie"). ARPAV liefert öffentlich nur
// eine ~3-Tage-Reihe, keine Mehrmonats-Historie - dieses Archiv wächst deshalb ab dem
// Tag der Einführung dieser Funktion Tag für Tag mit echten ARPAV-Werten, statt eine
// Vergangenheit rückwirkend zu schätzen. Ausgelesen wird es von seepegel-archiv.mjs.

import { getStore } from "@netlify/blobs";

const QUELLE = "https://www.arpa.veneto.it/api/risorse/data-meteo/xml/Ultime48ore.xml";
const SUCHE = /garda|peschiera/i;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export default async () => {
  let xml;
  try {
    const r = await fetch(QUELLE, { headers: { "User-Agent": "benacorain/1.0" } });
    if (!r.ok) return json(502, { error: "arpav-http-" + r.status });
    const buf = await r.arrayBuffer();
    xml = new TextDecoder("iso-8859-1").decode(buf);
  } catch (e) {
    return json(502, { error: "arpav-fetch-fehlgeschlagen", detail: String(e && e.message || e) });
  }

  // Die Datei besteht aus flachen, nicht verschachtelten <STAZIONE>...</STAZIONE>-Blöcken
  // (jeweils mit mehreren <SENSORE>-Kindelementen) - einfaches String-Splitting reicht,
  // ein vollwertiger XML-Parser ist für diese Struktur nicht nötig.
  const teile = xml.split("<STAZIONE>").slice(1);

  let treffer = null;
  for (const teil of teile) {
    const block = teil.split("</STAZIONE>")[0];
    const nomeMatch = block.match(/<NOME><!\[CDATA\[(.*?)\]\]><\/NOME>/);
    const nome = nomeMatch ? nomeMatch[1].trim() : "";
    if (nome && SUCHE.test(nome) && /<TYPE>LIVIDRO<\/TYPE>/.test(block)) {
      treffer = { nome, block };
      break;
    }
  }

  if (!treffer) {
    return json(404, { error: "keine-garda-station-gefunden" });
  }

  const sensorTeile = treffer.block.split("<SENSORE>").slice(1);
  const sensorBlock = sensorTeile
    .map(t => t.split("</SENSORE>")[0])
    .find(b => /<TYPE>LIVIDRO<\/TYPE>/.test(b));

  if (!sensorBlock) {
    return json(404, { error: "kein-lividro-sensor" });
  }

  const unitMatch = sensorBlock.match(/<UNITNM>(.*?)<\/UNITNM>/);
  const einheit = unitMatch ? unitMatch[1].trim() : "m";

  const werte = [];
  const re = /<DATI ISTANTE="(\d+)"><VM>(.*?)<\/VM><\/DATI>/g;
  let m;
  while ((m = re.exec(sensorBlock))) {
    const roh = m[2];
    if (roh === ">>" || roh === "" || roh === undefined) continue;
    const wert = parseFloat(roh);
    if (Number.isNaN(wert)) continue;
    werte.push({ istante: m[1], vm: wert });
  }

  if (werte.length) {
    try {
      await pflegeArchiv(werte, einheit);
    } catch (e) {
      // Ein Fehler beim Archiv-Schreiben darf die eigentliche Antwort nicht verhindern -
      // der aktuelle Pegel muss auch dann angezeigt werden, wenn das Archiv gerade klemmt.
      console.error("archiv-fehler", e);
    }
  }

  return json(200, { name: treffer.nome, einheit, werte });
};

async function pflegeArchiv(werte, einheit) {
  const letzte = werte[werte.length - 1];
  const cm = einheit === "m" ? Math.round(letzte.vm * 100 * 10) / 10 : letzte.vm;
  const s = letzte.istante;   // YYYYMMDDHHMM
  const datum = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

  const store = getStore("seepegel-historie");
  const bisher = (await store.get("tage", { type: "json" })) || [];

  const idx = bisher.findIndex((e) => e.datum === datum);
  if (idx >= 0) bisher[idx].cm = cm;
  else bisher.push({ datum, cm });

  bisher.sort((a, b) => a.datum.localeCompare(b.datum));

  // Rolling window: nur die letzten ~200 Tage behalten - grosszügiger Puffer über die
  // im Frontend angezeigten 4 Monate hinaus, für eine später evtl. längere Ansicht.
  const grenze = new Date();
  grenze.setDate(grenze.getDate() - 200);
  const grenzeStr = grenze.toISOString().slice(0, 10);
  const bereinigt = bisher.filter((e) => e.datum >= grenzeStr);

  await store.setJSON("tage", bereinigt);
}
