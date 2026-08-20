// netlify/functions/seepegel-archiv.mjs
//
// Liefert das selbst aufgebaute Tages-Archiv des Seepegels zurück. ARPAV stellt
// öffentlich nur eine ~3-Tage-Reihe bereit (Ultime48ore.xml, siehe seepegel-lesen.mjs) -
// eine Mehrmonats-Historie gibt es dort nicht als abrufbare Schnittstelle. Deshalb
// trägt seepegel-lesen.mjs bei jedem Seitenaufruf den aktuellen Tageswert in dieses
// Archiv (Netlify Blobs, Store "seepegel-historie") ein. Diese Function liest es nur
// aus - sie schreibt nichts. Die Kurve im Frontend ist deshalb anfangs kurz und wächst
// mit jedem Tag, an dem die Seite mindestens einmal aufgerufen wird.
//
// Erreichbar unter: /.netlify/functions/seepegel-archiv

import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("seepegel-historie");
  const tage = (await store.get("tage", { type: "json" })) || [];

  return new Response(JSON.stringify({ tage }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
};
