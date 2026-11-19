<?php
declare(strict_types=1);

// Ausführen: php tests/kontakt-php.test.php   (oder per Docker, siehe DEPLOY.md)
require __DIR__ . '/../kontakt.php';

$failures = 0;
function check(string $name, bool $ok): void
{
    global $failures;
    echo ($ok ? 'PASS' : 'FAIL') . ": {$name}\n";
    if (!$ok) {
        $failures++;
    }
}

$secret = 'test-secret';
$now = 1_800_000_000;
$valid = [
    'name' => 'Max Muster',
    'email' => 'max@example.com',
    'telefon' => '',
    'betreff' => 'Vertrag',
    'nachricht' => "Hallo\nzweite Zeile",
    'website' => '',
    'lang' => 'de',
    '_token' => contact_make_token($now - 30, $secret),
];

$sent = [];
$recorder = function (string $to, string $subject, string $body, string $headers) use (&$sent): bool {
    $sent[] = compact('to', 'subject', 'body', 'headers');
    return true;
};
$submit = fn(array $post, ?callable $send = null): string => handle_contact($post, $send ?? $recorder, $secret, $now);

check('gültige Einsendung führt zur Danke-Seite', $submit($valid) === '/kontakt-danke.html');
check('genau eine Mail an den Empfänger', count($sent) === 1 && $sent[0]['to'] === CONTACT_RECIPIENT);
check('Mail enthält Felder und mehrzeilige Nachricht',
    str_contains($sent[0]['body'], 'Max Muster') && str_contains($sent[0]['body'], "Hallo\nzweite Zeile")
    && str_contains($sent[0]['body'], '(keine Angabe)'));
check('Reply-To ist die Adresse des Besuchers', str_contains($sent[0]['headers'], 'Reply-To: max@example.com'));
check('englische Einsendung führt zur englischen Danke-Seite', $submit(['lang' => 'en'] + $valid) === '/en/contact-thanks.html');
check('englischer Fehler führt zum englischen Formular', $submit(['lang' => 'en', 'name' => ''] + $valid) === '/en/contact.html?fehler=eingabe');

$sent = [];
check('Honeypot täuscht Erfolg vor', $submit(['website' => 'spam'] + $valid) === '/kontakt-danke.html');
check('Honeypot sendet keine Mail', count($sent) === 0);

foreach (['name', 'nachricht'] as $field) {
    check("fehlendes Feld {$field} wird abgelehnt", $submit([$field => '   '] + $valid) === '/kontakt.html?fehler=eingabe');
}
check('ungültige E-Mail wird abgelehnt', $submit(['email' => 'abc'] + $valid) === '/kontakt.html?fehler=eingabe');
check('Header-Injection über E-Mail wird abgelehnt',
    $submit(['email' => "max@example.com\nBcc: victim@example.com"] + $valid) === '/kontakt.html?fehler=eingabe');
check('Telefon mit zu wenig Ziffern wird abgelehnt', $submit(['telefon' => 'abc 123'] + $valid) === '/kontakt.html?fehler=eingabe');
check('Telefon mit genug Ziffern ist erlaubt', $submit(['telefon' => '031 318 41 41'] + $valid) === '/kontakt-danke.html');
check('Nicht-Text-Werte gelten als leer', $submit(['name' => ['x']] + $valid) === '/kontakt.html?fehler=eingabe');

$sent = [];
$submit(['betreff' => "Test\r\nBcc: x@example.com"] + $valid);
check('Zeilenumbrüche im Betreff werden entfernt', count($sent) === 1 && !str_contains($sent[0]['body'], "\r\nBcc"));

check('Versandfehler führt zur Fehlermeldung', $submit($valid, fn() => false) === '/kontakt.html?fehler=versand');

$sent = [];
check('fehlender Stempel bittet um JavaScript', $submit(['_token' => ''] + $valid) === '/kontakt.html?fehler=js');
check('gefälschter Stempel täuscht Erfolg vor', $submit(['_token' => ($now - 30) . '.deadbeef'] + $valid) === '/kontakt-danke.html');
check('zu schnelle Einsendung täuscht Erfolg vor', $submit(['_token' => contact_make_token($now - 2, $secret)] + $valid) === '/kontakt-danke.html');
check('abgelaufener Stempel bittet um erneutes Senden',
    $submit(['_token' => contact_make_token($now - 86401, $secret)] + $valid) === '/kontakt.html?fehler=abgelaufen');
check('abgelehnte Stempel senden keine Mail', count($sent) === 0);

$sent = [];
check('fremder Link wird abgelehnt', $submit(['nachricht' => 'Best SEO https://spam.example/offer'] + $valid) === '/kontakt.html?fehler=link');
check('abgelehnte Links senden keine Mail', count($sent) === 0);
check('eigene Links sind erlaubt',
    $submit(['nachricht' => 'Siehe https://kanzleiwelten.com/team.html und www.kanzleiwelten.ch'] + $valid) === '/kontakt-danke.html');
check('Doppelgänger-Domain wird abgelehnt', $submit(['nachricht' => 'https://kanzleiwelten.com.spam.example'] + $valid) === '/kontakt.html?fehler=link');

exit($failures === 0 ? 0 : 1);
