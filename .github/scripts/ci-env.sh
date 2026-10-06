#!/usr/bin/env bash
# Vult ontbrekende omgevingsvariabelen voor CI aan uit .env.example.
# Variabelen die de workflow al zet (DATABASE_URI, PAYLOAD_SECRET) blijven ongemoeid.
# Lege voorbeeldwaarden worden "ci-dummy", zodat de build niet struikelt over
# bijvoorbeeld S3-instellingen die tijdens de build niet echt gebruikt worden.
set -euo pipefail

file="${1:-.env.example}"
out="${GITHUB_ENV:-/dev/stdout}"

if [ ! -f "$file" ]; then
  echo "Geen $file gevonden; alleen de standaard CI-variabelen worden gebruikt."
  exit 0
fi

while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
  [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
  key="${BASH_REMATCH[2]}"
  val="${BASH_REMATCH[3]}"
  val="${val%%[[:space:]]#*}"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  if [ -z "${!key+x}" ]; then
    echo "$key=${val:-ci-dummy}" >> "$out"
    echo "CI-variabele aangevuld: $key"
  fi
done < "$file"
