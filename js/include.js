// Lädt Kopf- und Fusszeile (partials/) in jede Seite und markiert den aktiven Menüpunkt.
function rehydrateScripts(fragment) {
  fragment.querySelectorAll('script').forEach((oldScript) => {
    const newScript = document.createElement('script');
    for (const attr of oldScript.attributes) newScript.setAttribute(attr.name, attr.value);
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
}

async function loadPartial(el) {
  const url = el.getAttribute('data-include');
  try {
    const res = await fetch(url, { cache: 'no-cache' }); // immer aktuelle Kopf-/Fusszeile
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const tpl = document.createElement('template');
    tpl.innerHTML = await res.text();
    rehydrateScripts(tpl.content);
    el.replaceWith(tpl.content);
  } catch (err) {
    console.error(`[include] Partial "${url}" konnte nicht geladen werden:`, err);
  }
}

function decorate() {
  const { page, alt } = document.body.dataset;
  document.querySelectorAll('.nav-links a[data-nav]').forEach((a) => {
    if (a.dataset.nav === page) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
  // Sprachumschalter führt auf die passende Seite der anderen Sprache.
  const sw = document.querySelector('[data-lang-switch]');
  if (sw && alt) sw.setAttribute('href', alt);
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
}

async function loadAllPartials() {
  const els = Array.from(document.querySelectorAll('[data-include]'));
  try {
    await Promise.all(els.map(loadPartial));
    decorate();
  } finally {
    document.dispatchEvent(new Event('partials:loaded'));
  }
}

document.addEventListener('DOMContentLoaded', loadAllPartials);
