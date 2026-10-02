// TEMP tool — delete now-duplicated selectors from page CSS (brace aware).
//   node prune2.mjs list .btn .topbar .sub .content .summary-card ...
//   node prune2.mjs prune prune-spec.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.css')) out.push(p);
  }
  return out;
}

function parse(css) {
  const rules = [];
  let i = 0, buf = '', start = 0;
  const atStack = [];
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      const preludeRaw = buf;
      const prelude = preludeRaw.trim();
      const lead = preludeRaw.length - preludeRaw.trimStart().length;
      buf = '';
      if (prelude.startsWith('@')) {
        atStack.push({ at: prelude, start: i - prelude.length - lead });
        start = i + 1;
        i++;
        continue;
      }
      let depth = 1, j = i + 1;
      while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; if (depth === 0) break; j++; }
      rules.push({ sel: prelude, selStart: i - prelude.length - lead, bodyStart: i, end: j + 1, at: atStack.map(a => a.at).join(' ') });
      i = j + 1;
      start = i;
      continue;
    }
    if (ch === '}') { atStack.pop(); buf = ''; i++; continue; }
    buf += ch;
    i++;
  }
  return rules;
}

const mode = process.argv[2];

if (mode === 'list') {
  const needles = process.argv.slice(3);
  for (const f of walk(ROOT).sort()) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    for (const r of parse(fs.readFileSync(f, 'utf8'))) {
      for (const s of r.sel.split(',').map(strip)) {
        if (needles.some(n => s === n || s.startsWith(n))) console.log(`${rel} :: ${r.at ? '[' + r.at + '] ' : ''}${s}`);
      }
    }
  }
  process.exit(0);
}

if (mode === 'prune') {
  const spec = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  for (const [rel, selectors] of Object.entries(spec)) {
    const f = path.join(ROOT, rel);
    let css = fs.readFileSync(f, 'utf8');
    const drops = [];
    let removed = 0;
    for (const r of parse(css)) {
      const parts = r.sel.split(',');
      const keep = parts.filter(p => !selectors.includes(strip(p)));
      if (keep.length === parts.length) continue;
      removed += parts.length - keep.length;
      if (keep.length === 0) drops.push([r.selStart, r.end]);
      else drops.push([r.selStart, r.bodyStart, keep.join(',')]);
    }
    drops.sort((a, b) => b[0] - a[0]);
    for (const [s, e, keep] of drops) {
      css = css.slice(0, s) + (keep === undefined ? '' : keep) + css.slice(e);
    }
    css = css.replace(/@media[^{]+\{\s*\}/g, '').replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(f, css);
    console.log(`${rel}: removed ${removed} selector(s)`);
  }
}
