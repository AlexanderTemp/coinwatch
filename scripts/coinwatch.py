#!/usr/bin/env python3
import json
import urllib.error
import urllib.request
from datetime import datetime

WATCHLIST = [
    ("bitcoin", 2, "BTC"),
    ("ethereum", 2, "ETH"),
    ("ripple", 4, "XRP"),
    ("binancecoin", 4, "BNB"),
    ("sui", 4, "SUI"),
]
BAR_COINS = {"BTC", "XRP"}

UP, DOWN, FLAT = "#9ADE7B", "#FF8F8F", "#abb2bf"
HEADER, DIM = "#61afef", "#5c6370"


def arrow_and_color(change):
    if change > 0:
        return "↑", UP
    if change < 0:
        return "↓", DOWN
    return "→", FLAT


def fetch():
    ids = ",".join(c[0] for c in WATCHLIST)
    url = (
        "https://api.coingecko.com/api/v3/simple/price"
        f"?ids={ids}&vs_currencies=usd&include_24hr_change=true&precision=full"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "coinwatch-waybar"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.load(resp)


def main():
    try:
        data = fetch()
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
        print(json.dumps({"text": "⚠ sin datos", "tooltip": "CoinGecko no respondió", "class": "error"}))
        return

    bar_parts = []
    rows = []

    for coin_id, decimals, label in WATCHLIST:
        entry = data.get(coin_id)
        if not entry or "usd" not in entry:
            continue
        price = entry["usd"]
        change = entry.get("usd_24h_change") or 0.0
        arrow, color = arrow_and_color(change)
        price_fmt = f"{price:,.{decimals}f}"
        change_fmt = f"{abs(change):.2f}"

        rows.append(
            f"  {label:<4}<span foreground='{color}'>${price_fmt:<14} {arrow}{change_fmt}%</span>"
        )

        if label in BAR_COINS:
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
