import { validateContactForm, hasForeignLink } from './contact-form.js';

const SERVER_ERRORS = {
  eingabe: 'formError',
  versand: 'sendError',
  link: 'linkError',
  js: 'jsError',
  abgelaufen: 'expiredError',
};
const FIELDS = ['name', 'email', 'telefon', 'nachricht'];

document.addEventListener('partials:loaded', () => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const serverError = new URLSearchParams(window.location.search).get('fehler');
  if (SERVER_ERRORS[serverError]) document.getElementById(SERVER_ERRORS[serverError]).hidden = false;

  // Spamschutz: Der Server nimmt nur Anfragen mit einem Stempel an, den er
  // mindestens ein paar Sekunden vorher ausgestellt hat. Bots holen keinen.
  fetch('/kontakt.php?token=1', { cache: 'no-store' })
    .then((response) => response.json())
    .then(({ token }) => { form.elements._token.value = token; })
    .catch(() => {});

  form.addEventListener('submit', (event) => {
    const values = Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value]));
    const errors = validateContactForm(values);

    FIELDS.forEach((f) => form.elements[f].removeAttribute('aria-invalid'));
    Object.values(SERVER_ERRORS).forEach((id) => { document.getElementById(id).hidden = true; });

    if (errors.length > 0) {
      event.preventDefault();
      document.getElementById('formError').hidden = false;
      errors.forEach((f) => form.elements[f].setAttribute('aria-invalid', 'true'));
      form.elements[errors[0]].focus();
      return;
    }
    const allText = ['name', 'telefon', 'betreff', 'nachricht'].map((f) => form.elements[f].value).join(' ');
    if (hasForeignLink(allText)) {
      event.preventDefault();
      document.getElementById('linkError').hidden = false;
    }
  });
});
