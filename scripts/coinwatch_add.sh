#!/usr/bin/env bash
set -euo pipefail

CONFIG="$HOME/.config/coinwatch/watchlist.json"
[ -f "$CONFIG" ] || { echo "coinwatch_add: no existe $CONFIG (corré install.sh primero)" >&2; exit 1; }

list=$(curl -fsSL "https://api.coingecko.com/api/v3/coins/list" |
    jq -r '.[] | "\(.symbol|ascii_upcase)  \(.name)  [\(.id)]"' | sort)

pick() {
    if command -v fuzzel >/dev/null 2>&1; then
        printf '%s\n' "$list" | fuzzel --dmenu --prompt="Agregar moneda: "
    elif command -v wofi >/dev/null 2>&1; then
        printf '%s\n' "$list" | wofi --dmenu --prompt="Agregar moneda: "
    elif command -v rofi >/dev/null 2>&1; then
        printf '%s\n' "$list" | rofi -dmenu -p "Agregar moneda: "
    else
        echo "coinwatch_add: no se encontró fuzzel, wofi ni rofi" >&2
        exit 1
    fi
}

choice=$(pick)
[ -z "$choice" ] && exit 0

id=$(sed -n 's/.*\[\(.*\)\]$/\1/p' <<< "$choice")
label=$(awk '{print $1}' <<< "$choice")

if jq -e --arg id "$id" '.[] | select(.id == $id)' "$CONFIG" >/dev/null; then
    echo "coinwatch_add: $label ($id) ya está en el watchlist" >&2
    exit 1
fi

tmp=$(mktemp)
jq --arg id "$id" --arg label "$label" '. += [{"id": $id, "label": $label, "decimals": 4, "bar": false}]' "$CONFIG" > "$tmp"
mv "$tmp" "$CONFIG"

echo "Agregada: $label ($id) -- decimals=4, bar=false. Ajustá $CONFIG si hace falta."
