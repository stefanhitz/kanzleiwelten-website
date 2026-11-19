// Prüft die ganze Website ohne Server: Links, Bilder, Pflichtangaben, Umleitungen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['tests', 'scripts', 'docs', 'node_modules', '.git', 'partials']);

function htmlFiles(dir = ROOT) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return SKIP.has(name) ? [] : htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}
const pages = htmlFiles();
const partials = readdirSync(join(ROOT, 'partials')).map((n) => join(ROOT, 'partials', n));
const rel = (f) => f.slice(ROOT.length);

function targetExists(url) {
  const path = url.split('#')[0].split('?')[0];
  if (path === '' ) return true;
  if (path.endsWith('/')) return existsSync(join(ROOT, path, 'index.html'));
  return existsSync(join(ROOT, path));
}

test('es gibt alle erwarteten Seiten', () => {
  assert.ok(pages.length >= 24, `nur ${pages.length} Seiten`);
});

for (const file of [...pages, ...partials]) {
  const html = readFileSync(file, 'utf8');

  test(`${rel(file)}: interne Links, Bilder und Skripte existieren`, () => {
    const refs = [...html.matchAll(/(?:href|src|data-include|data-alt|action)="(\/[^"]*)"/g)].map((m) => m[1]);
    const missing = refs.filter((r) => !r.endsWith('.php') && !targetExists(r));
    assert.deepEqual(missing, []);
  });

  test(`${rel(file)}: lädt nichts von fremden Servern`, () => {
    const external = [...html.matchAll(/<(?:script|link|img|iframe)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)]
      .map((m) => m[1]).filter((u) => !u.startsWith('https://kanzleiwelten.com'));
    assert.deepEqual(external, []);
  });

  test(`${rel(file)}: alle Bilder haben einen Alternativtext`, () => {
    const noAlt = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((t) => !/\balt="/.test(t));
    assert.deepEqual(noAlt, []);
  });
}

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  test(`${rel(file)}: Titel, Sprache, Beschreibung und Kopf/Fuss`, () => {
    assert.match(html, /<title>[^<]{5,}<\/title>/);
    assert.match(html, /<html lang="(de|en)">/);
    assert.match(html, /<meta name="description" content="[^"]{10,}">/);
    assert.match(html, /data-include="\/partials\/header(-en)?\.html"/);
    assert.match(html, /data-include="\/partials\/footer(-en)?\.html"/);
    const en = rel(file).startsWith('/en/');
    assert.equal(html.includes('/partials/header-en.html'), en, 'falsche Sprache der Kopfzeile');
  });
}

test('Impressum und Datenschutz sind im Fuss verlinkt', () => {
  const de = readFileSync(join(ROOT, 'partials/footer.html'), 'utf8');
  const en = readFileSync(join(ROOT, 'partials/footer-en.html'), 'utf8');
  assert.match(de, /href="\/impressum\.html"/);
  assert.match(de, /href="\/datenschutz\.html"/);
  assert.match(en, /href="\/en\/legal-notice\.html"/);
  assert.match(en, /href="\/en\/privacy\.html"/);
});

test('Umleitungen in .htaccess zeigen auf bestehende Seiten', () => {
  const rules = [...readFileSync(join(ROOT, '.htaccess'), 'utf8').matchAll(/^RewriteRule \S+ (\/\S+) \[R=301,L\]$/gm)];
  assert.ok(rules.length >= 15);
  for (const [, target] of rules) assert.ok(targetExists(target), target);
});

test('alle alten WordPress-Adressen werden umgeleitet', () => {
  const htaccess = readFileSync(join(ROOT, '.htaccess'), 'utf8');
  const old = ['accounting', 'administration-treuhand', 'administrative-und-gerichtsverfahren-schiedsgerichte',
    'allgemeine-rechtsberatung-vereinsrecht', 'behoerdenkontakt', 'beratung-von-verbaenden-clubs-athleten',
    'buchhaltung-finanzen', 'erbschaft', 'family-office-services', 'gruendung-reststrukturierung-und-liquidation',
    'immobilien-und-baurecht', 'inkasso-schuldbetreibungsverfahren-und-nachlassstundung', 'investitionen-steuern',
    'it-und-steuern', 'juristische-personen', 'kanzlei-welten', 'kontakt',
    'ma-gesellschaftsrecht-strukturen-und-corporate-finance', 'offene-stellen',
    'organfunktion-z-b-verwaltungsrat-sekretariat', 'organfunktion', 'praktikanten-rechtsanwalt', 'privatpersonen',
    'rechtliches-und-steuern', 'rechtsanwalt', 'rechtsberatung', 'schiedsgericht', 'sport', 'tas-schiedsrichter',
    'team', 'trusts-stiftungen', 'unsere-bueros', 'unternehmensberatung-buchhaltung-finanzen-und-steuern',
    'vermoegensverwaltung-investitionen-kunst', 'vertragsrecht', 'zivilprozesse-administrative-und-schiedsverfahren',
    'en/about-us', 'en/career', 'en/contact', 'en/it-taxes', 'en/kanzlei-welten-2', 'en/team-2'];
  const patterns = [...htaccess.matchAll(/^RewriteRule (\^\S+) \//gm)].map((m) => new RegExp(m[1]));
  const unmatched = old.filter((slug) => !patterns.some((re) => re.test(`${slug}/`)));
  assert.deepEqual(unmatched, []);
});
