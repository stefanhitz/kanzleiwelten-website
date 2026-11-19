# Kanzlei Welten Website – Anleitung

**Status 2026-11-19:** Erster Entwurf fertig, noch **nicht online**. Die alte WordPress-Website läuft weiter bei ialla
(91.214.170.52). Aufbau wie immohitz.ch: statisches HTML/CSS/JS, Kontaktformular `kontakt.php`, Hosting Hostpoint.

## Aufbau

- Deutsch im Hauptordner, Englisch in `en/`. Kopf und Fuss kommen aus `partials/` (werden per `js/include.js` geladen).
- Sprachumschalter: `data-alt` im `<body>` jeder Seite nennt die passende Seite der anderen Sprache.
- Schriften (Inter, Source Serif 4) liegen in `fonts/`, nichts wird von Google oder anderen geladen.
- `.htaccess`: www und kanzleiwelten.ch → kanzleiwelten.com, alte WordPress-Adressen → neue Seiten (301), Sicherheits-Kopfzeilen.
- Bilder: `img/team/` (quadratisch zugeschnitten aus `../alte-website/bilder/`), `img/site/` (Logo, Relief Bern).

## Lokal ansehen und testen

```bash
python3 -m http.server 8000      # dann http://localhost:8000
npm test                         # Links, Bilder, Pflichtangaben, Umleitungen, Formularregeln
php tests/kontakt-php.test.php   # Formular-Server; braucht PHP (nicht installiert) oder Docker:
# docker run --rm -v "$PWD":/app -w /app php:8.3-cli php tests/kontakt-php.test.php
```

## Vor dem Aufschalten (offen)

- [ ] Texte und Team von Bernhard prüfen und freigeben lassen
- [ ] Adresse klären: alte Website nennt «3000 Bern 15» (Startseite) und «3000 Bern 16» (Kontakt, Stellen) → hier 16 verwendet
- [ ] Empfänger des Kontaktformulars bestätigen (`CONTACT_RECIPIENT` in `kontakt.php`, jetzt bernhard.welten@)
- [ ] Bewerbungsadresse bestätigen (jetzt sekretariat@kanzleiwelten.com; alte Seite zeigte daniela.welten@, verlinkte aber sekretariat@)
- [ ] Foto Franziska Kropf fehlt (Platzhalter mit Initialen)
- [ ] Impressum: Rechtsform / UID der Kanzlei, falls im Handelsregister eingetragen (nicht gefunden)
- [ ] PHP-Tests laufen lassen
- [ ] Hostpoint-Hosting bestellen (Konto und Bezahlung mit Bernhard klären)

## Umstellung (erst nach Freigabe, DNS nur nach Bestätigung Stefan)

1. Bei Hostpoint Hosting einrichten, Domains kanzleiwelten.com und kanzleiwelten.ch als «extern verwaltet» hinzufügen,
   SSL-Zertifikate durch Hostpoint ausstellen lassen.
2. Per SFTP (Cyberduck) in den Webroot hochladen: `*.html`, `en/`, `kontakt.php`, `.htaccess`, `robots.txt`, `sitemap.xml`,
   `favicon.ico`, `apple-touch-icon.png`, `css/`, `js/`, `img/`, `fonts/`, `partials/`.
   **Nicht** hochladen: `.git/`, `tests/`, `scripts/`, `docs/`, `package.json`, `DEPLOY.md`, `README.md`, `.gitignore`.
3. `kontakt-secret.php` entsteht auf dem Server beim ersten Formularaufruf; nicht löschen, nicht im Git.
4. Vorab über die Hostpoint-Vorschauadresse testen (alle Seiten, Formular, Umleitungen).
5. **Mail-Versand des Formulars:** Absender ist `website@kanzleiwelten.com`, gesendet über Hostpoint. Damit die Mails
   DMARC bestehen, SPF bei Swizzonic ergänzen: `v=spf1 include:spf.protection.outlook.com include:spf.mail.hostpoint.ch -all`
   und Hostpoint-DKIM für kanzleiwelten.com einrichten (wie immohitz.ch). Danach DMARC-Berichte prüfen; erst dann `p=reject` möglich.
6. A-Eintrag `kanzleiwelten.com` und `kanzleiwelten.ch` (inkl. www) bei Swizzonic auf die Hostpoint-Adresse ändern.
   MX, SPF (ausser Ergänzung oben), DMARC und Microsoft-Einträge **nicht** anfassen. DNSSEC bleibt bei Swizzonic, kein Problem.
7. Nach der Umstellung: Live-Prüfung, Testanfrage über das Formular, alte Adressen (z. B. `/team/`) leiten um.
