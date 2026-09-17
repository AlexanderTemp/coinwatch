#!/usr/bin/env python3
import json
import os
import urllib.error
import urllib.request
from datetime import datetime

CONFIG_PATH = os.path.expanduser("~/.config/coinwatch/watchlist.json")

UP, DOWN, FLAT = "#9ADE7B", "#FF8F8F", "#abb2bf"
HEADER, DIM = "#61afef", "#5c6370"


def arrow_and_color(change):
    if change > 0:
        return "↑", UP
    if change < 0:
        return "↓", DOWN
    return "→", FLAT


def fetch(ids):
    url = (
        "https://api.coingecko.com/api/v3/simple/price"
        f"?ids={ids}&vs_currencies=usd&include_24hr_change=true&precision=full"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "coinwatch-waybar"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.load(resp)


def main():
    try:
        with open(CONFIG_PATH) as f:
            watchlist = json.load(f)
        data = fetch(",".join(c["id"] for c in watchlist))
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, KeyError):
        print(json.dumps({"text": "⚠ sin datos", "tooltip": "CoinGecko no respondió", "class": "error"}))
        return

    bar_parts = []
    rows = []

    for coin in watchlist:
        entry = data.get(coin["id"])
        if not entry or "usd" not in entry:
            continue
        label, decimals = coin["label"], coin["decimals"]
        price = entry["usd"]
        change = entry.get("usd_24h_change") or 0.0
        arrow, color = arrow_and_color(change)
        price_fmt = f"{price:,.{decimals}f}"
        change_fmt = f"{abs(change):.2f}"

        rows.append(
            f"  {label:<4}<span foreground='{color}'>${price_fmt:<14} {arrow}{change_fmt}%</span>"
        )

        if coin.get("bar"):
            sign = "+" if change > 0 else "-" if change < 0 else ""
            bar_parts.append(f"{label} <span foreground='{color}'>${price_fmt} {sign}{change_fmt}%</span>")

    text = "   ".join(bar_parts)

    sep = f"<span foreground='{DIM}'>{'─' * 30}</span>"
    header = f"<span font_weight='bold' foreground='{HEADER}'>coinwatch</span>"
    updated = f"<span foreground='{DIM}'>Actualizado {datetime.now():%H:%M:%S}</span>"

    tooltip_body = "\n".join([header, sep, *rows, sep, updated])
    tooltip = f"<span font_family='FantasqueSansM Nerd Font Mono'>{tooltip_body}</span>"

    print(json.dumps({"text": text, "tooltip": tooltip, "class": "ok"}))


if __name__ == "__main__":
    main()
