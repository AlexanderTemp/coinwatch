#!/usr/bin/env bash
set -euo pipefail

declare -A IDS=(
    [BTC]=bitcoin
    [ETH]=ethereum
    [XRP]=ripple
    [BNB]=binancecoin
    [SUI]=sui
)

pick() {
    if command -v fuzzel >/dev/null 2>&1; then
        printf '%s\n' "${!IDS[@]}" | sort | fuzzel --dmenu --prompt="CoinGecko: "
    elif command -v wofi >/dev/null 2>&1; then
        printf '%s\n' "${!IDS[@]}" | sort | wofi --dmenu --prompt="CoinGecko: "
    elif command -v rofi >/dev/null 2>&1; then
        printf '%s\n' "${!IDS[@]}" | sort | rofi -dmenu -p "CoinGecko: "
    else
        echo "coinwatch_open: no se encontró fuzzel, wofi ni rofi" >&2
        exit 1
    fi
}

choice=$(pick)
[ -z "$choice" ] && exit 0

id="${IDS[$choice]:-}"
[ -n "$id" ] && xdg-open "https://www.coingecko.com/en/coins/$id"
