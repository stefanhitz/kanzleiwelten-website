<?php
declare(strict_types=1);

// Empfänger und Absender der Formular-Mails. Absender muss eine Adresse der eigenen
// Domain sein; damit die Mail DMARC besteht, muss der SPF-Eintrag von kanzleiwelten.com
// den Versand über Hostpoint erlauben (siehe DEPLOY.md, Abschnitt Umstellung).
const CONTACT_RECIPIENT = 'bernhard.welten@kanzleiwelten.com';
const CONTACT_SENDER = 'website@kanzleiwelten.com';
const CONTACT_SECRET_FILE = __DIR__ . '/kontakt-secret.php';
const CONTACT_MIN_SECONDS = 3;
const CONTACT_MAX_SECONDS = 86400;
const CONTACT_OWN_DOMAINS = ['kanzleiwelten.com', 'kanzleiwelten.ch'];
const CONTACT_PAGES = [
    'de' => ['form' => '/kontakt.html', 'thanks' => '/kontakt-danke.html'],
    'en' => ['form' => '/en/contact.html', 'thanks' => '/en/contact-thanks.html'],
];

function contact_field(array $post, string $name): string
{
    $value = $post[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

function contact_single_line(string $value): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $value) ?? '');
}

/**
 * Geheimer Schlüssel für die Formular-Stempel. Wird beim ersten Aufruf erzeugt und in
 * einer PHP-Datei abgelegt (gibt über das Web nichts aus, liegt nicht im Git).
 */
function contact_secret(): string
{
    if (is_file(CONTACT_SECRET_FILE)) {
        $secret = include CONTACT_SECRET_FILE;
        if (is_string($secret) && $secret !== '') {
            return $secret;
        }
    }
    $secret = bin2hex(random_bytes(32));
    if (@file_put_contents(CONTACT_SECRET_FILE, "<?php return '{$secret}';\n", LOCK_EX) === false) {
        return hash('sha256', __FILE__ . php_uname());
    }
    return $secret;
}

/** Stempel für das Formular: "<Ausstellungszeit>.<hmac>". */
function contact_make_token(int $now, string $secret): string
{
    return $now . '.' . hash_hmac('sha256', (string) $now, $secret);
}

/** Liefert 'ok', 'missing', 'invalid', 'too_fast' oder 'expired'. */
function contact_check_token(string $token, int $now, string $secret): string
{
    if ($token === '') {
        return 'missing';
    }
    $parts = explode('.', $token);
    if (count($parts) !== 2 || !ctype_digit($parts[0])
        || !hash_equals(hash_hmac('sha256', $parts[0], $secret), $parts[1])) {
        return 'invalid';
    }
    $age = $now - (int) $parts[0];
    if ($age < CONTACT_MIN_SECONDS) {
        return 'too_fast';
    }
    return $age > CONTACT_MAX_SECONDS ? 'expired' : 'ok';
}

/** True, wenn der Text auf eine fremde Website verlinkt. */
function contact_has_foreign_link(string $text): bool
{
    preg_match_all('~(?:https?://|www\.)([^\s/?#<>"\']+)~i', $text, $matches);
    foreach ($matches[1] as $host) {
        $host = strtolower(rtrim($host, '.,;:!)'));
        $own = false;
        foreach (CONTACT_OWN_DOMAINS as $domain) {
            if ($host === $domain || str_ends_with($host, '.' . $domain)) {
                $own = true;
            }
        }
        if (!$own) {
            return true;
        }
    }
    return false;
}

/**
 * Verarbeitet eine Formular-Einsendung und gibt die Adresse für die Weiterleitung zurück.
 * $send hat die Signatur von PHPs mail(): (to, subject, body, headers) => bool.
 */
function handle_contact(array $post, callable $send, string $secret, int $now): string
{
    $lang = contact_field($post, 'lang') === 'en' ? 'en' : 'de';
    $pages = CONTACT_PAGES[$lang];

    // Honeypot ausgefüllt: Erfolg vortäuschen, damit Bots kein Signal bekommen.
    if (contact_field($post, 'website') !== '') {
        return $pages['thanks'];
    }

    switch (contact_check_token(contact_field($post, '_token'), $now, $secret)) {
        case 'missing':
            return $pages['form'] . '?fehler=js';
        case 'expired':
            return $pages['form'] . '?fehler=abgelaufen';
        case 'invalid':
        case 'too_fast':
            return $pages['thanks'];
    }

    $name = contact_single_line(contact_field($post, 'name'));
    $email = contact_single_line(contact_field($post, 'email'));
    $telefon = contact_single_line(contact_field($post, 'telefon'));
    $betreff = contact_single_line(contact_field($post, 'betreff'));
    $nachricht = contact_field($post, 'nachricht');

    if ($name === '' || $nachricht === ''
        || filter_var($email, FILTER_VALIDATE_EMAIL) === false
        || ($telefon !== '' && preg_match_all('/\d/', $telefon) < 6)
        || mb_strlen($nachricht) > 10000 || mb_strlen($betreff) > 200 || mb_strlen($name) > 200) {
        return $pages['form'] . '?fehler=eingabe';
    }

    if (contact_has_foreign_link("{$name} {$telefon} {$betreff} {$nachricht}")) {
        return $pages['form'] . '?fehler=link';
    }

    $subjectText = 'Website-Anfrage' . ($betreff !== '' ? ': ' . $betreff : '');
    $subject = '=?UTF-8?B?' . base64_encode($subjectText) . '?=';
    $body = "Neue Anfrage über das Kontaktformular auf kanzleiwelten.com"
        . ($lang === 'en' ? ' (englische Seite)' : '') . "\n\n"
        . "Name:    {$name}\n"
        . "E-Mail:  {$email}\n"
        . "Telefon: " . ($telefon !== '' ? $telefon : '(keine Angabe)') . "\n"
        . "Betreff: " . ($betreff !== '' ? $betreff : '(kein Betreff)') . "\n\n"
        . "Nachricht:\n{$nachricht}\n";
    $headers = implode("\r\n", [
        'From: Website Kanzlei Welten <' . CONTACT_SENDER . '>',
        'Reply-To: ' . $email,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);

    return $send(CONTACT_RECIPIENT, $subject, $body, $headers)
        ? $pages['thanks']
        : $pages['form'] . '?fehler=versand';
}

if (PHP_SAPI !== 'cli') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && isset($_GET['token'])) {
        header('Content-Type: application/json');
        header('Cache-Control: no-store');
        echo json_encode(['token' => contact_make_token(time(), contact_secret())]);
        exit;
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Location: /kontakt.html', true, 303);
        exit;
    }
    $location = handle_contact($_POST, static function (string $to, string $subject, string $body, string $headers): bool {
        return mail($to, $subject, $body, $headers, '-f' . CONTACT_SENDER);
    }, contact_secret(), time());
    header('Location: ' . $location, true, 303);
    exit;
}
