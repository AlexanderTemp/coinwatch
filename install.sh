#!/usr/bin/env bash
set -euo pipefail

REPO_TARBALL="https://github.com/AlexanderTemp/coinwatch/archive/refs/heads/main.tar.gz"

MODE="${1:-all}"

if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

if [ -z "${SCRIPT_DIR:-}" ] || [ ! -f "$SCRIPT_DIR/scripts/coinwatch.py" ]; then
    SCRIPT_DIR="$(mktemp -d)"
    trap 'rm -rf "$SCRIPT_DIR"' EXIT
    echo "==> Descargando coinwatch..."
    curl -fsSL "$REPO_TARBALL" | tar -xz -C "$SCRIPT_DIR" --strip-components=1
fi

install_deps() {
    echo "==> Instalando dependencias ($MODE)"
    local want_waybar=0
    case "$MODE" in
        all|waybar) want_waybar=1 ;;
        panel) : ;;
    esac

    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        [ "$want_waybar" = 1 ] && sudo apt-get install -y python3 fuzzel xdg-utils jq
        [ "$MODE" = "panel" ] && sudo apt-get install -y python3
    elif command -v pacman >/dev/null 2>&1; then
        [ "$want_waybar" = 1 ] && sudo pacman -S --needed python fuzzel xdg-utils jq
        [ "$MODE" = "panel" ] && sudo pacman -S --needed python
    elif command -v dnf >/dev/null 2>&1; then
        [ "$want_waybar" = 1 ] && sudo dnf install -y python3 fuzzel xdg-utils jq
        [ "$MODE" = "panel" ] && sudo dnf install -y python3
    else
        echo "Distro no reconocida -- instalá manualmente las dependencias del README."
    fi
}

install_config() {
    local dest="$HOME/.config/coinwatch"
    mkdir -p "$dest"
    if [ ! -f "$dest/watchlist.json" ]; then
        cp "$SCRIPT_DIR/watchlist.json" "$dest/watchlist.json"
        echo "==> Config: $dest/watchlist.json"
    fi
}

install_waybar() {
    local dest="$HOME/.config/waybar/scripts"
    echo "==> Waybar: copiando scripts a $dest"
    mkdir -p "$dest"
    cp "$SCRIPT_DIR/scripts/coinwatch.py" "$SCRIPT_DIR/scripts/coinwatch_open.sh" "$dest/"
    chmod +x "$dest/coinwatch.py" "$dest/coinwatch_open.sh"
    echo "    Falta sumar los snippets de waybar/*.example a tu config.jsonc/style.css."
}

install_panel() {
    local ext_uuid="coinwatch@local"
    local extdir="$HOME/.local/share/gnome-shell/extensions/$ext_uuid"
    echo "==> Panel: extensión nativa de GNOME (texto + menú en la barra superior)"

    if ! command -v gnome-extensions >/dev/null 2>&1; then
        echo "    No se encontró gnome-extensions -- este modo es solo para GNOME."
        return
    fi

    local src="$SCRIPT_DIR/panel"
    local shell_major
    shell_major="$(gnome-shell --version 2>/dev/null | grep -oE '[0-9]+' | head -1)"
    if [ -n "$shell_major" ] && [ "$shell_major" -lt 45 ]; then
        src="$SCRIPT_DIR/panel/legacy"
        echo "    GNOME Shell $shell_major detectado -- usando extensión formato legacy."
    fi

    local was_known=0
    gnome-extensions list 2>/dev/null | grep -qx "$ext_uuid" && was_known=1

    mkdir -p "$extdir"
    cp "$src/metadata.json" "$src/extension.js" "$extdir/"

    if [ "$was_known" = 1 ]; then
        gnome-extensions enable "$ext_uuid"
        echo "    Instalada en $extdir."
        echo "    GNOME cachea el código JS por sesión: si ya la habías usado antes,"
        echo "    cerrá sesión y volvé a entrar para que tome los cambios (enable/disable no alcanza)."
    else
        echo "    Instalada en $extdir."
        echo "    GNOME solo detecta extensiones nuevas al reiniciar la sesión:"
        echo "    cerrá sesión y volvé a entrar, después corré:"
        echo "    gnome-extensions enable $ext_uuid"
    fi
}

install_deps
install_config
case "$MODE" in
    all)
        install_waybar
        install_panel
        ;;
    waybar) install_waybar ;;
    panel) install_panel ;;
    *)
        echo "Modo desconocido: $MODE (uso: waybar|panel|all)" >&2
        exit 1
        ;;
esac

echo
echo "Listo ($MODE)."
