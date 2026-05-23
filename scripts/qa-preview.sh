#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${PREVIEW_URL:-}}"
if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: $0 <preview-url>" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"

paths=(
  /
  /psy
  /koty
  /materialy
  /o-mnie
  /opinie
  /kontakt
  /cennik
  /blog
  /behawiorysta-online-polska
  /konsultacja-behawioralna-online
  /bezplatne-materialy/pies-ile-ruchu-potrzebuje
)

for url in "${paths[@]}"; do
  echo "=== ${url} ==="
  page="$(curl -sSL "${BASE_URL}${url}")"

  title_line="$(printf '%s' "${page}" | grep -oP '<title[^>]*>[^<]*' | head -1 || true)"
  title_text="$(printf '%s' "${page}" | grep -oP '<title[^>]*>\K[^<]*' | head -1 || true)"
  desc_text="$(printf '%s' "${page}" | grep -oP 'name="description"[^>]*content="\K[^"]*' | head -1 || true)"
  mojibake_count="$(printf '%s' "${page}" | grep -oE 'Ã|Ä|Å|Ĺ|Â|�' | wc -l | tr -d '[:space:]')"
  imgs_without_size="$(printf '%s' "${page}" | grep -oE '<img[^>]*>' | awk 'BEGIN { c = 0 } !(/width=/ && /height=/) { c++ } END { print c }')"
  title_length="$(printf '%s' "${title_text}" | LC_ALL=C.UTF-8 wc -m | tr -d '[:space:]')"
  desc_length="$(printf '%s' "${desc_text}" | LC_ALL=C.UTF-8 wc -m | tr -d '[:space:]')"

  echo "  Title: ${title_line}"
  echo "  Title length: ${title_length}"
  echo "  Desc length: ${desc_length}"
  echo "  Mojibake count: ${mojibake_count}"
  echo "  Imgs w/o w+h: ${imgs_without_size}"
done
