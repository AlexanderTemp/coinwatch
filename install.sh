#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_deps() {
    echo "==> Instalando dependencias ($MODE)"
    local want_waybar=0
    case "$MODE" in
        all|waybar) want_waybar=1 ;;
        panel) : ;;
    esac

    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        [ "$want_waybar" = 1 ] && sudo apt-get install -y python3 fuzzel xdg-utils
        [ "$MODE" = "panel" ] && sudo apt-get install -y python3
    elif command -v pacman >/dev/null 2>&1; then
        [ "$want_waybar" = 1 ] && sudo pacman -S --needed python fuzzel xdg-utils
        [ "$MODE" = "panel" ] && sudo pacman -S --needed python
    elif command -v dnf >/dev/null 2>&1; then
        [ "$want_waybar" = 1 ] && sudo dnf install -y python3 fuzzel xdg-utils
        [ "$MODE" = "panel" ] && sudo dnf install -y python3
    else
        echo "Distro no reconocida -- instalá manualmente las dependencias del README."
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

    local was_known=0
    gnome-extensions list 2>/dev/null | grep -qx "$ext_uuid" && was_known=1

    mkdir -p "$extdir"
    cp "$SCRIPT_DIR/panel/metadata.json" "$SCRIPT_DIR/panel/extension.js" "$extdir/"

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
