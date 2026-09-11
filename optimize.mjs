// Image pipeline for shoot.riftmedia.cc sample gallery.
//
// sharp is not installed here. It is borrowed from the king-cuts prospect build,
// resolved explicitly because ESM ignores NODE_PATH:
//   node optimize.mjs
// Run from the site/ directory. Re-run after dropping new photos into source-images/.
// If king-cuts ever loses its node_modules, `npm i sharp` here and the fallback picks it up.
//
// Sources are full-res camera files and are gitignored. Only the WebP output ships.
//
// GALLERY ORDER (index.html depends on it): kitchen leads as a full-width band, then the
// six grid tiles alternate subject so no two shots of the same kind touch, in any direction.
//
//   band   kitchen    interior
//   row A  evo        automotive
//          bathroom   interior
//          headlight  automotive detail
//   row B  living     interior
//          cayman     automotive
//          exterior   property
//
// Grid tiles render at about 357px on desktop, so 1100w covers retina. The band spans the
// full 1120px container, so it gets more.

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
  // Feature band, full container width.
  { in: "sample-kitchen.jpg",    out: "kitchen",     w: 1600, q: 76 },
  { in: "sample-kitchen.jpg",    out: "kitchen-sm",  w:  900, q: 74 },

  // Six grid tiles.
  { in: "sample-evo.jpg",        out: "evo",         w: 1100, q: 74 },
  { in: "sample-evo.jpg",        out: "evo-sm",      w:  560, q: 72 },
  { in: "sample-bathroom.jpg",   out: "bathroom",    w: 1100, q: 80 },
  { in: "sample-bathroom.jpg",   out: "bathroom-sm", w:  560, q: 78 },
  { in: "sample-headlight.jpg",  out: "headlight",   w: 1100, q: 76 },
  { in: "sample-headlight.jpg",  out: "headlight-sm",w:  560, q: 74 },
  { in: "sample-livingroom.jpg", out: "living",      w: 1100, q: 76 },
  { in: "sample-livingroom.jpg", out: "living-sm",   w:  560, q: 76 },
  { in: "sample-cayman.jpg",     out: "cayman",      w: 1100, q: 74 },
  { in: "sample-cayman.jpg",     out: "cayman-sm",   w:  560, q: 72 },
  { in: "sample-exterior.jpg",   out: "exterior",    w: 1100, q: 74 },
  { in: "sample-exterior.jpg",   out: "exterior-sm", w:  560, q: 72 },
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
