#!/usr/bin/env bash
set -euo pipefail

CONFIG="$HOME/.config/coinwatch/watchlist.json"

pick() {
    if command -v fuzzel >/dev/null 2>&1; then
        jq -r '.[].label' "$CONFIG" | sort | fuzzel --dmenu --prompt="CoinGecko: "
    elif command -v wofi >/dev/null 2>&1; then
        jq -r '.[].label' "$CONFIG" | sort | wofi --dmenu --prompt="CoinGecko: "
    elif command -v rofi >/dev/null 2>&1; then
        jq -r '.[].label' "$CONFIG" | sort | rofi -dmenu -p "CoinGecko: "
    else
        echo "coinwatch_open: no se encontró fuzzel, wofi ni rofi" >&2
        exit 1
    fi
}

choice=$(pick)
[ -z "$choice" ] && exit 0

id=$(jq -r --arg label "$choice" '.[] | select(.label == $label) | .id' "$CONFIG")
[ -n "$id" ] && xdg-open "https://www.coingecko.com/en/coins/$id"
