// Pèse le JavaScript réellement téléchargé au premier affichage de chaque écran (gzip) :
// l'entrée et ses imports statiques, plus l'écran. Échoue au-delà du budget du guide (170 Ko).
// Les panneaux (saisie, modification) sont chargés à la demande : ils sont exclus du budget.
// Usage : npm run size
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 170;
const root = new URL('../dist/', import.meta.url).pathname;
const assets = readdirSync(`${root}assets`);

const html = readFileSync(`${root}index.html`, 'utf8');
const entry = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((match) => match[1]);

const staticImports = (file) =>
  [...readFileSync(root + file, 'utf8').matchAll(/from"\.\/([^"]+\.js)"/g)].map((m) => `assets/${m[1]}`);
const closure = (files) => {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    staticImports(file).forEach(walk);
  };
  files.forEach(walk);
  return seen;
};
const kb = (files) => [...files].reduce((sum, f) => sum + gzipSync(readFileSync(root + f)).length, 0) / 1024;

console.log(`Démarrage (entrée + imports statiques) : ${kb(closure(entry)).toFixed(1)} Ko gzip`);
let failed = false;
for (const file of assets.filter((f) => /^(Dashboard|History|Settings|Stats)Page-.*\.js$/.test(f))) {
  const size = kb(closure([...entry, `assets/${file}`]));
  const over = size > BUDGET_KB;
  failed ||= over;
  console.log(`${file.replace(/-.*/, '').padEnd(16)} ${size.toFixed(1).padStart(6)} Ko${over ? `  ✖ dépasse ${BUDGET_KB} Ko` : ''}`);
}
process.exit(failed ? 1 : 0);
