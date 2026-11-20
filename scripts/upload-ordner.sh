#!/usr/bin/env bash
# Stellt in ../upload-hostpoint genau die Dateien zusammen, die auf den Hostpoint-Server gehören.
# Danach in Cyberduck den INHALT dieses Ordners nach www/kanzleiwelten.com ziehen.
set -euo pipefail
cd "$(dirname "$0")/.."
ZIEL=../upload-hostpoint
rm -rf "$ZIEL" && mkdir -p "$ZIEL"
rsync -a --exclude='.git' --exclude='.github' --exclude='.gitignore' --exclude='.DS_Store' \
  --exclude='tests' --exclude='scripts' --exclude='docs' --exclude='package.json' \
  --exclude='DEPLOY.md' --exclude='README.md' --exclude='kontakt-secret.php' ./ "$ZIEL/"
echo "Bereit: $(cd "$ZIEL" && pwd) ($(find "$ZIEL" -type f | wc -l | tr -d ' ') Dateien, inkl. versteckter .htaccess)"
