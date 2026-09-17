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
menú nativo en la barra de GNOME, sin dependencias de terceros. Click abre la
moneda en CoinGecko.

`panel` necesita reloguear tras instalar/actualizar (GNOME cachea el JS por
sesión, `install.sh` avisa cuándo). También detecta tu versión de GNOME e
instala `panel/extension.js` (45+) o `panel/legacy/extension.js` (40-44,
incluye Debian 12) -- son dos copias, todo cambio al panel va en ambas.

## Watchlist

Un solo archivo, `~/.config/coinwatch/watchlist.json`, lo leen waybar, panel
y el picker en cada corrida -- agregar/sacar moneda es editar esto y nada más
(se relee solo, sin reloguear; waybar toma el cambio en el próximo `interval`):

```json
[
  {"id": "bitcoin", "label": "BTC", "decimals": 2, "bar": true},
  {"id": "cardano", "label": "ADA", "decimals": 4, "bar": false}
]
```

`decimals` = decimales a mostrar. `bar` = si aparece en el texto de la barra
(si no, solo en tooltip/menú).

Sin tocar el JSON a mano (fuzzel/wofi/rofi):

- `~/.config/coinwatch/coinwatch_add.sh` -- busca en todo CoinGecko y agrega
  la que elijas (`decimals: 4`, `bar: false` por defecto). Cachea la lista de
  monedas en `coins_cache.json` y la renueva sola 1 vez por semana.
- `~/.config/coinwatch/coinwatch_bar.sh` -- lista tu watchlist con `[x]/[ ]`,
  buscás y elegís una para tildar/destildar `bar`; repite hasta que canceles.

Acceso directo: en el **panel** están como ítems del menú ("+ Agregar
moneda...", "Elegir monedas de la barra..."). En **waybar**, click derecho
agrega y click del medio elige (`on-click-right`/`on-click-middle` en
`config.jsonc.example`).

## Desinstalación

```bash
rm ~/.config/waybar/scripts/coinwatch.py ~/.config/waybar/scripts/coinwatch_open.sh   # waybar (+ sacar el bloque de config.jsonc/style.css)
gnome-extensions disable coinwatch@local && rm -rf ~/.local/share/gnome-shell/extensions/coinwatch@local   # panel
rm -rf ~/.config/coinwatch   # config compartida, si no usás ninguno de los dos
```

## Licencia

MIT — ver [LICENSE](LICENSE).
