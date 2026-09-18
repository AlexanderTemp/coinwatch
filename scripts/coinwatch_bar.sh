#!/usr/bin/env bash
set -euo pipefail

CONFIG="$HOME/.config/coinwatch/watchlist.json"
[ -f "$CONFIG" ] || { echo "coinwatch_bar: no existe $CONFIG (ejecuta install.sh primero)" >&2; exit 1; }

pick() {
    if command -v fuzzel >/dev/null 2>&1; then
        fuzzel --dmenu --prompt="Barra: "
    elif command -v wofi >/dev/null 2>&1; then
        wofi --dmenu --prompt="Barra: "
    elif command -v rofi >/dev/null 2>&1; then
        rofi -dmenu -p "Barra: "
    else
        echo "coinwatch_bar: no se encontró fuzzel, wofi ni rofi" >&2
        exit 1
    fi
}

while true; do
    choice=$(jq -r '.[] | (if .bar then "[x] " else "[ ] " end) + .label' "$CONFIG" | pick)
    [ -z "$choice" ] && break

    label=$(sed 's/^\[.\] //' <<< "$choice")
    tmp=$(mktemp)
    jq --arg label "$label" 'map(if .label == $label then .bar = (.bar | not) else . end)' "$CONFIG" > "$tmp"
    mv "$tmp" "$CONFIG"
done
