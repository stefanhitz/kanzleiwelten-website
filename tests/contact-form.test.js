import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isValidOptionalPhone, hasForeignLink, validateContactForm } from '../js/contact-form.js';

const valid = { name: 'Max Muster', email: 'max@example.com', telefon: '', nachricht: 'Guten Tag' };

test('isValidEmail', () => {
  assert.equal(isValidEmail('bernhard.welten@kanzleiwelten.com'), true);
  assert.equal(isValidEmail('abc'), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail(''), false);
});

test('Telefon ist freiwillig, braucht aber mindestens 6 Ziffern wenn angegeben', () => {
  assert.equal(isValidOptionalPhone(''), true);
  assert.equal(isValidOptionalPhone('   '), true);
  assert.equal(isValidOptionalPhone('+41 31 318 41 41'), true);
  assert.equal(isValidOptionalPhone('abc 123'), false);
});

test('vollständige Einsendung ist gültig', () => {
  assert.deepEqual(validateContactForm(valid), []);
});

test('Pflichtfelder Name, E-Mail und Nachricht', () => {
  assert.deepEqual(validateContactForm({ name: ' ', email: 'x', telefon: '', nachricht: '' }), ['name', 'email', 'nachricht']);
});

test('ungültige Telefonnummer wird gemeldet', () => {
  assert.deepEqual(validateContactForm({ ...valid, telefon: 'asdf' }), ['telefon']);
});

test('fremde Links werden erkannt', () => {
  assert.equal(hasForeignLink('Best SEO https://spam.example/offer'), true);
  assert.equal(hasForeignLink('see www.spam.example'), true);
  assert.equal(hasForeignLink('https://kanzleiwelten.com.spam.example'), true);
});

test('eigene Links und reiner Text sind erlaubt', () => {
  assert.equal(hasForeignLink('Ich brauche Hilfe bei einem Vertrag.'), false);
  assert.equal(hasForeignLink('https://kanzleiwelten.com/team.html und www.kanzleiwelten.ch.'), false);
});
