import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

const exists = (p) => fs.existsSync(path.join(ROOT, p));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const files = (dir = ROOT) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else out.push(path.relative(ROOT, full).replaceAll(path.sep, '/'));
  }
  return out;
};

const allFiles = files();
const htmlFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.html'));
const rootHtml = htmlFiles.filter((f) => !f.includes('/'));

function localTarget(raw, source) {
  if (!raw) return null;
  const value = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!value || value.startsWith('#') || value.startsWith('//')) return null;
  if (/^(?:https?:|data:|mailto:|tel:|javascript:|blob:)/i.test(value)) return null;
  const clean = value.split('#')[0].split('?')[0];
  if (!clean) return null;
  const sourceDir = path.posix.dirname(source);
  const resolved = path.posix.normalize(path.posix.join(sourceDir, clean));
  return resolved.replace(/^\.\//, '');
}

function checkLocalRefs(file, content) {
  const attrRe = /\b(?:src|href|poster|action)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(content))) {
    const target = localTarget(m[1], file);
    if (target && !exists(target)) errors.push(`${file}: missing local resource ${m[1]} -> ${target}`);
  }
}

function validateHtml(file) {
  const content = read(file);
  if (!/^\s*<!doctype html>/i.test(content)) errors.push(`${file}: missing HTML5 doctype`);
  if (!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(content)) errors.push(`${file}: missing html lang`);
  if (!/<meta\b[^>]*charset\s*=\s*["']?utf-8/i.test(content)) errors.push(`${file}: missing UTF-8 charset`);
  if (!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(content)) errors.push(`${file}: missing viewport meta`);
  if (!/<title\b[^>]*>[^<]+<\/title>/i.test(content)) errors.push(`${file}: missing meaningful title`);
  if ((content.match(/<main\b/gi) || []).length !== 1) errors.push(`${file}: expected exactly one <main>`);
  if ((content.match(/<header\b/gi) || []).length > 1) errors.push(`${file}: duplicate <header>`);
  if ((content.match(/<footer\b/gi) || []).length > 1) errors.push(`${file}: duplicate <footer>`);
  if (/<script[^>]+src=["'][^"']+["'][^>]*>/i.test(content) && !/<\/html>\s*$/i.test(content)) errors.push(`${file}: malformed document ending`);
  checkLocalRefs(file, content);
  for (const iframe of content.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const target = localTarget(iframe[1], file);
    if (target && !exists(target)) errors.push(`${file}: iframe target missing ${iframe[1]}`);
  }
}

for (const file of htmlFiles) validateHtml(file);

const channelsFile = 'main/js/channels.js';
if (!exists(channelsFile)) {
  errors.push('main/js/channels.js: file missing');
} else {
  const content = read(channelsFile);
  const entries = [...content.matchAll(/\{\s*id\s*:\s*(\d+)\s*,\s*file\s*:\s*['"]([^'"]+)['"]/g)]
    .map((m) => ({ id: m[1], file: m[2] }));
  if (entries.length !== 30) errors.push(`channels.js: expected 30 registered channels, found ${entries.length}`);
  const ids = new Set();
  const mappedFiles = new Set();
  for (const item of entries) {
    if (ids.has(item.id)) errors.push(`channels.js: duplicate channel id ${item.id}`);
    ids.add(item.id);
    if (mappedFiles.has(item.file)) errors.push(`channels.js: duplicate channel file ${item.file}`);
    mappedFiles.add(item.file);
    if (!exists(item.file)) errors.push(`channels.js: registered page missing ${item.file}`);
  }

  const allowedRootPages = new Set(['index.html', '404.html', 'copyright-en.html', 'copyright-ru.html', ...entries.map((x) => x.file)]);
  for (const file of rootHtml) {
    if (!allowedRootPages.has(file)) warnings.push(`orphan root HTML not registered as a channel: ${file}`);
  }
}

for (const file of allFiles.filter((f) => /\.(css|js|json|webmanifest|xml|txt)$/i.test(f))) {
  const content = read(file);
  if (/\b(?:src|href)\s*=/.test(content)) checkLocalRefs(file, content);
}

if (warnings.length) {
  console.log(`Warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`::warning::${warning}`);
}
if (errors.length) {
  console.error(`Integrity check failed: ${errors.length} error(s)`);
  for (const error of errors) console.error(`::error::${error}`);
  process.exit(1);
}
console.log(`MatchPro integrity check passed: ${htmlFiles.length} HTML files checked, 30 channel mappings verified, local references validated.`);
