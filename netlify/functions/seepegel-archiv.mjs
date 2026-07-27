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
  // Absichtlich robust: ein Ausfall des Archivs (z.B. Blobs vorübergehend nicht
  // erreichbar) soll nie eine leere/kaputte Antwort ohne Body produzieren, sondern
  // immer gültiges JSON - das Frontend zeigt dann einfach "noch keine Daten".
  try {
    const store = getStore("seepegel-historie");
    const tage = (await store.get("tage", { type: "json" })) || [];

    return new Response(JSON.stringify({ tage }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ tage: [], error: String((e && e.message) || e) }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
