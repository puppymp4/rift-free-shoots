// Image pipeline for shoot.riftmedia.cc sample gallery.
//
// sharp is not installed here. It is borrowed from the king-cuts prospect build,
// resolved explicitly because ESM ignores NODE_PATH:
//   node optimize.mjs
// Run from the site/ directory. Re-run after dropping new photos into source-images/.
// If king-cuts ever loses its node_modules, `npm i sharp` here and the fallback picks it up.
//
// Sources are full-res camera files and are gitignored. Only the WebP output ships.

import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";

const BORROWED = "../../../Prospects/king-cuts/node_modules/sharp/lib/index.js";
const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  sharp = (await import(new URL(BORROWED, import.meta.url))).default;
}

const jobs = [
  // Portrait anchor tile. Spans two rows on desktop, so it is generated tall.
  { in: "sample-evo.jpg",        out: "evo",        w: 1100, q: 74 },
  { in: "sample-evo.jpg",        out: "evo-sm",     w:  550, q: 72 },

  // Two interiors, stacked beside the anchor at 3:2.
  { in: "sample-bathroom.jpg",   out: "bathroom",   w: 1200, q: 80 },
  { in: "sample-bathroom.jpg",   out: "bathroom-sm",w:  600, q: 78 },
  { in: "sample-livingroom.jpg", out: "living",     w: 1200, q: 76 },
  { in: "sample-livingroom.jpg", out: "living-sm",  w:  600, q: 78 },

  // Full-width band under the grid, so it needs the widest source.
  { in: "sample-exterior.jpg",   out: "exterior",   w: 1600, q: 72 },
  { in: "sample-exterior.jpg",   out: "exterior-sm",w:  900, q: 72 },
];

let total = 0;
for (const j of jobs) {
  const src = `source-images/${j.in}`;
  if (!existsSync(src)) {
    console.log(`skip ${j.in} (source missing)`);
    continue;
  }
  const dest = `images/samples/${j.out}.webp`;
  await sharp(src)
    .resize({ width: j.w, withoutEnlargement: true })
    .webp({ quality: j.q, effort: 6 })
    .toFile(dest);
  const kb = statSync(dest).size / 1024;
  total += kb;
  console.log(`  ${j.out.padEnd(14)} ${String(j.w).padStart(5)}w  ${kb.toFixed(0)}KB`);
}
console.log(`  total ${(total / 1024).toFixed(2)}MB`);
