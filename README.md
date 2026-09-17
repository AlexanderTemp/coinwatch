# coinwatch

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3-3776AB?logo=python&logoColor=white)

Precios cripto en vivo ([CoinGecko](https://www.coingecko.com/)) en tu barra:

```
BTC $109,432.10 ↑1.24%   XRP $2.4310 ↓0.38%
```

## Instalación

Sin clonar el repo:

```bash
curl -fsSL https://raw.githubusercontent.com/AlexanderTemp/coinwatch/main/install.sh | bash -s -- all
curl -fsSL https://raw.githubusercontent.com/AlexanderTemp/coinwatch/main/install.sh | bash -s -- waybar
curl -fsSL https://raw.githubusercontent.com/AlexanderTemp/coinwatch/main/install.sh | bash -s -- panel
```

O clonando el repo:

```bash
git clone https://github.com/AlexanderTemp/coinwatch
cd coinwatch
./install.sh          # waybar + panel
./install.sh waybar   # módulo custom/coinwatch (Sway, Hyprland, etc.)
./install.sh panel    # texto + menú en la barra de GNOME (extensión propia)
```

Click en el módulo/menú abre la moneda en CoinGecko. `panel` no depende de
nada de terceros (extensión en `panel/`), pero necesita cerrar sesión y
volver a entrar: la primera vez para que GNOME detecte la extensión nueva,
y cada vez que se actualiza el código (GNOME cachea el JS por sesión,
`disable`/`enable` no alcanza). `install.sh panel` avisa cuál de los dos
casos aplica.

## Watchlist

Duplicado a propósito en `scripts/coinwatch.py`, `panel/extension.js` y
`scripts/coinwatch_open.sh` (`WATCHLIST`/`IDS`), uno por script. Para
agregar una moneda hay que tocar los tres:

**1. `scripts/coinwatch.py`** (waybar) — agregar una tupla a `WATCHLIST`:

```python
WATCHLIST = [
    ("bitcoin", 2, "BTC"),   # (id de coingecko, decimales, label)
    ("cardano", 4, "ADA"),   # <- nueva
    ...
]
```

**2. `panel/extension.js`** (GNOME) — mismo dato, sintaxis JS:

```js
const WATCHLIST = [
    ['bitcoin', 2, 'BTC'],
    ['cardano', 4, 'ADA'],   // <- nueva
    ...
];
```

**3. `scripts/coinwatch_open.sh`** — agregar la entrada al diccionario `IDS`
(label → id de coingecko), para que el picker la pueda abrir:

```bash
declare -A IDS=(
    [BTC]=bitcoin
    [ADA]=cardano   # <- nueva
    ...
)
```

ID de CoinGecko: `curl -s "https://api.coingecko.com/api/v3/search?query=NOMBRE" | jq -r '.coins[0].id'`

Otras cosas configurables en los mismos archivos:

- **`BAR_COINS`** (`coinwatch.py`) — set de labels que se muestran en el
  texto de la barra de waybar (el resto solo aparece en el tooltip). En
  `extension.js` es el mismo concepto pero afecta el texto del panel de
  GNOME.
- **`INTERVAL_SECONDS`** (`extension.js`) — cada cuánto refresca el panel
  de GNOME, en segundos. Waybar controla su propio intervalo desde
  `config.jsonc` (`"interval"` del módulo `custom/coinwatch`).
- **decimales** — el segundo valor de cada tupla, cuántos decimales
  mostrar para esa moneda (monedas caras como BTC usan menos, stablecoins
  o monedas chicas usan más).

Después de editar, para ver el cambio:

- **waybar**: reiniciá waybar (o tu compositor la reinicia sola según config).
- **panel (GNOME)**: hay que cerrar sesión y volver a entrar — GNOME
  cachea el JS de la extensión por sesión.

## Desinstalación

```bash
# waybar (+ sacar el bloque "custom/coinwatch" de config.jsonc/style.css)
rm ~/.config/waybar/scripts/coinwatch.py ~/.config/waybar/scripts/coinwatch_open.sh

# panel (GNOME)
gnome-extensions disable coinwatch@local
rm -rf ~/.local/share/gnome-shell/extensions/coinwatch@local
```

## Licencia

MIT — ver [LICENSE](LICENSE).
