# coinwatch

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3-3776AB?logo=python&logoColor=white)

Precios cripto en vivo ([CoinGecko](https://www.coingecko.com/)) en tu barra:

```
BTC $109,432.10 ↑1.24%   XRP $2.4310 ↓0.38%
```

## Instalación

```bash
curl -fsSL https://raw.githubusercontent.com/AlexanderTemp/coinwatch/main/install.sh | bash -s -- all     # o waybar / panel

# o clonando:
git clone https://github.com/AlexanderTemp/coinwatch && cd coinwatch && ./install.sh all   # o waybar / panel
```

`waybar` = módulo `custom/coinwatch` (Sway, Hyprland, etc). `panel` = texto +
menú nativo en GNOME, sin dependencias de terceros. Click abre la moneda en
CoinGecko.

`panel` necesita un proceso de GNOME Shell nuevo para tomar cambios en
`extension.js` (disable/enable no alcanza). Normalmente cerrar sesión
alcanza; si no, reiniciá la máquina.

Detecta tu versión de GNOME e instala `panel/extension.js` (45+) o
`panel/legacy/extension.js` (40-44) -- dos copias, cambios van en ambas.

## Watchlist

Un solo archivo, `~/.config/coinwatch/watchlist.json` -- editarlo alcanza,
se relee solo (waybar en el próximo `interval`):

```json
[
  {"id": "bitcoin", "label": "BTC", "decimals": 2, "bar": true},
  {"id": "cardano", "label": "ADA", "decimals": 4, "bar": false}
]
```

`decimals` = decimales a mostrar. `bar` = si aparece en el texto de la barra
(si no, solo en tooltip/menú). `perp` (`true`/`false`, opcional) = precio del
perpetuo de Binance Futures en vez del spot, matcheado por `label`.

Sin tocar el JSON a mano:

- **Panel** (GNOME): "+ Agregar moneda..." y "Elegir monedas de la barra..."
  son submenús nativos del menú, sin fuzzel/wofi/rofi/jq.
- **Waybar**: click derecho agrega (`coinwatch_add.sh`), click del medio
  elige la barra (`coinwatch_bar.sh`) -- usan fuzzel/wofi/rofi + jq, solo
  instalados con `install.sh waybar`/`all`.

## Desinstalación

```bash
rm ~/.config/waybar/scripts/coinwatch.py ~/.config/waybar/scripts/coinwatch_open.sh   # waybar (+ sacar el bloque de config.jsonc/style.css)
gnome-extensions disable coinwatch@local && rm -rf ~/.local/share/gnome-shell/extensions/coinwatch@local   # panel
rm -rf ~/.config/coinwatch   # config compartida, si no usas ninguno de los dos
```

## Licencia

MIT — ver [LICENSE](LICENSE).
