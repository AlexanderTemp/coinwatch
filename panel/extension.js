import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const INTERVAL_SECONDS = 60;
const CONFIG_PATH = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'coinwatch', 'watchlist.json']);

const UP = '#9ADE7B';
const DOWN = '#FF8F8F';
const FLAT = '#abb2bf';

function arrowAndColor(change) {
    if (change > 0)
        return ['↑', UP];
    if (change < 0)
        return ['↓', DOWN];
    return ['→', FLAT];
}

function loadWatchlist() {
    const [ok, contents] = GLib.file_get_contents(CONFIG_PATH);
    if (!ok)
        throw new Error('no se pudo leer watchlist.json');
    return JSON.parse(new TextDecoder().decode(contents));
}

const CoinwatchIndicator = GObject.registerClass(
class CoinwatchIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'coinwatch');

        this._label = new St.Label({
            text: '…',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-weight: normal; font-size: 0.9em;',
        });
        this.add_child(this._label);

        this._session = new Soup.Session({timeout: 5, user_agent: 'coinwatch-gnome-extension/1.0'});
        this._timeoutId = null;

        this._refresh();
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, INTERVAL_SECONDS, () => {
            this._refresh();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _refresh() {
        let watchlist;
        try {
            watchlist = loadWatchlist();
        } catch (e) {
            this._showError();
            return;
        }

        const ids = watchlist.map(c => c.id).join(',');
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&precision=full`;
        const msg = Soup.Message.new('GET', url);

        this._session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                if (msg.get_status() !== Soup.Status.OK)
                    throw new Error(`HTTP ${msg.get_status()}`);
                const text = new TextDecoder().decode(bytes.get_data());
                this._render(watchlist, JSON.parse(text));
            } catch (e) {
                this._showError();
            }
        });
    }

    _showError() {
        this._label.get_clutter_text().set_markup(`<span foreground='${DOWN}'>⚠ coinwatch</span>`);
        this.menu.removeAll();
        const item = new PopupMenu.PopupMenuItem('CoinGecko no respondió', {reactive: false});
        this.menu.addMenuItem(item);
        this._addManageItems();
    }

    _spawn(script) {
        try {
            GLib.spawn_command_line_async(`${GLib.get_home_dir()}/.config/coinwatch/${script}`);
        } catch (e) {
        }
    }

    _addManageItems() {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const addItem = new PopupMenu.PopupMenuItem('+ Agregar moneda...');
        addItem.connect('activate', () => this._spawn('coinwatch_add.sh'));
        this.menu.addMenuItem(addItem);

        const barItem = new PopupMenu.PopupMenuItem('Elegir monedas de la barra...');
        barItem.connect('activate', () => this._spawn('coinwatch_bar.sh'));
        this.menu.addMenuItem(barItem);
    }

    _render(watchlist, data) {
        this.menu.removeAll();
        const barParts = [];

        for (const coin of watchlist) {
            const entry = data[coin.id];
            if (!entry || entry.usd === undefined)
                continue;

            const price = entry.usd;
            const change = entry.usd_24h_change || 0;
            const [arrow, color] = arrowAndColor(change);
            const priceFmt = price.toLocaleString('en-US', {
                minimumFractionDigits: coin.decimals,
                maximumFractionDigits: coin.decimals,
            });
            const changeFmt = Math.abs(change).toFixed(2);

            const item = new PopupMenu.PopupMenuItem(`${coin.label}  $${priceFmt}  ${arrow}${changeFmt}%`);
            item.connect('activate', () => {
                Gio.AppInfo.launch_default_for_uri(`https://www.coingecko.com/en/coins/${coin.id}`, null);
            });
            this.menu.addMenuItem(item);

            if (coin.bar) {
                const sign = change > 0 ? '+' : change < 0 ? '-' : '';
                barParts.push(`${coin.label} <span foreground='${color}'>$${priceFmt} ${sign}${changeFmt}%</span>`);
            }
        }

        this._addManageItems();
        this._label.get_clutter_text().set_markup(barParts.join('   '));
    }

    destroy() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        super.destroy();
    }
});

export default class CoinwatchExtension extends Extension {
    enable() {
        this._indicator = new CoinwatchIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
