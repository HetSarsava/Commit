// TEMP audit script — delete when done.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.css')) out.push(p);
  }
  return out;
}

// brace-aware rule extractor (flattens @media / @supports blocks)
function rules(css) {
  const out = [];
  let i = 0;
  const stack = [];
  let buf = '';
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel.startsWith('@')) {
        stack.push({ at: true, sel });
        i++;
        continue;
      }
      // read body
      let depth = 1;
      let j = i + 1;
      let body = '';
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') { depth--; if (depth === 0) break; }
        body += css[j];
        j++;
      }
      out.push({ sel, body: body.trim(), at: stack.map(s => s.sel).join(' '), file: null });
      i = j + 1;
      continue;
    }
    if (ch === '}') { stack.pop(); buf = ''; i++; continue; }
    buf += ch;
    i++;
  }
  return out;
}

const files = walk(ROOT).sort();
const all = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  for (const r of rules(fs.readFileSync(f, 'utf8'))) all.push({ ...r, file: rel });
}

// ---- 1. unscoped rules that could leak across pages ----
const generic = /(^|,)\s*(\.(btn|btn-[a-z]+|card|topbar|tabs?|tab|chip|badge|status-badge|summary-[a-z]+|metric-[a-z]+|input|select|textarea|table|table-container|modal|loading|empty-state|content|filters-bar|toolbar|search|icon|label|value|amount|field-caption|field-annotation|product-field|pagination|dropdown|checkbox|row|list|header|footer|actions?|container|grid|panel|section|divider|avatar|spinner|tooltip|overlay)\b)/;
console.log('=== UNSCOPED (depth-0, non-page-prefixed) rules touching generic classes ===');
for (const r of all) {
  if (r.at) continue;
  const sels = r.sel.split(',').map(s => s.trim());
  const bad = sels.filter(s => {
    if (/^:\w/.test(s)) return false;           // :root, :focus-visible …
    // scoped if the FIRST compound selector contains a page/component root class
    const first = s.split(/\s|>|\+|~/)[0];
    const classes = first.match(/\.[A-Za-z0-9_-]+/g) || [];
    const firstClass = classes[0] || '';
    // treat as scoped when the first class looks like a page/component wrapper
    const scoped = /-page$|-page-|-container$|-wrap$|-page\b|^\.(modal|app|rail|sidebar|dashboard|whatsapp|catalogues|proformas|purchase|invoices?|production|reports|users|settings|notifications|inventory|marketing|dispatch|leads|orders|quotations|products|activity)/.test(firstClass);
    return !scoped && generic.test(',' + s + ',');
  });
  if (bad.length) console.log(`${r.file}  ${r.at ? '[in @media] ' : ''}${bad.join(' , ')}`);
}

// ---- 2. definition sites for the classes that differ across routes ----
const WATCH = process.argv.slice(2);
console.log('\n=== DEFINITION SITES ===');
for (const w of WATCH) {
  console.log(`\n### .${w}`);
  for (const r of all) {
    const sels = r.sel.split(',').map(s => s.trim());
    const hits = sels.filter(s => new RegExp(`\\.${w}(?![A-Za-z0-9_-])`).test(s));
    if (hits.length) {
      console.log(`  ${r.file}  ${r.at ? '@' + r.at + ' ' : ''}| ${hits.join(' , ')}`);
      console.log(`     { ${r.body.replace(/\s+/g, ' ')} }`);
    }
  }
}
