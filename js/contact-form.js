// Prüfregeln des Kontaktformulars (gleiche Regeln wie in kontakt.php).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_RE = /(?:https?:\/\/|www\.)([^\s/?#<>"']+)/gi;
export const OWN_DOMAINS = ['kanzleiwelten.com', 'kanzleiwelten.ch'];

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value.trim());
}

// Telefon ist freiwillig; wenn angegeben, braucht es mindestens 6 Ziffern.
export function isValidOptionalPhone(value) {
  if (typeof value !== 'string' || value.trim() === '') return true;
  return (value.match(/\d/g) || []).length >= 6;
}

// Entspricht contact_has_foreign_link() in kontakt.php.
export function hasForeignLink(text) {
  for (const [, rawHost] of String(text).matchAll(LINK_RE)) {
    const host = rawHost.replace(/[.,;:!)]+$/, '').toLowerCase();
    if (!OWN_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  }
  return false;
}

export function validateContactForm({ name, email, telefon, nachricht } = {}) {
  const errors = [];
  if (!name || !name.trim()) errors.push('name');
  if (!isValidEmail(email)) errors.push('email');
  if (!isValidOptionalPhone(telefon ?? '')) errors.push('telefon');
  if (!nachricht || !nachricht.trim()) errors.push('nachricht');
  return errors;
}
