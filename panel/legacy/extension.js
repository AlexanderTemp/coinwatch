const { GObject, St, Clutter, GLib, Gio, Soup } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const ByteArray = imports.byteArray;

const INTERVAL_SECONDS = 60;
const CONFIG_DIR = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'coinwatch']);
const CONFIG_PATH = GLib.build_filenamev([CONFIG_DIR, 'watchlist.json']);
const COINS_CACHE_PATH = GLib.build_filenamev([CONFIG_DIR, 'gnome_coins_cache.json']);
const COINS_CACHE_MAX_AGE_SECONDS = 7 * 24 * 3600;

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
    return JSON.parse(ByteArray.toString(contents));
}

function saveWatchlist(watchlist) {
    GLib.file_set_contents(CONFIG_PATH, JSON.stringify(watchlist, null, 2));
}

const SearchMenuItem = GObject.registerClass({
    Signals: {'search-changed': {param_types: [GObject.TYPE_STRING]}},
}, class SearchMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init() {
        super._init({activate: false, hover: false, can_focus: false, reactive: true});

        this._entry = new St.Entry({
            hint_text: 'Buscar moneda (símbolo o nombre)...',
            can_focus: true,
            x_expand: true,
        });
        this._entry.clutter_text.connect('text-changed', () => {
            this.emit('search-changed', this._entry.get_text());
        });
        this.add_child(this._entry);
    }

    grabFocus() {
        this._entry.grab_key_focus();
    }

    getText() {
        return this._entry.get_text();
    }

    reset() {
        this._entry.set_text('');
    }
});

const CoinwatchIndicator = GObject.registerClass(
class CoinwatchIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'coinwatch');

        this._label = new St.Label({
            text: '…',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-weight: 600; font-size: 0.9em;',
        });
        this.add_child(this._label);

        this._session = new Soup.Session({timeout: 5, user_agent: 'coinwatch-gnome-extension/1.0'});
        this._timeoutId = null;
        this._coins = null;

        this._priceSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._priceSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._buildAddSubmenu());
        this.menu.addMenuItem(this._buildBarSubmenu());

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

        if (watchlist.length === 0) {
            this._priceSection.removeAll();
            this._priceSection.addMenuItem(new PopupMenu.PopupMenuItem('Watchlist vacío -- agregá una moneda', {reactive: false}));
            this._label.get_clutter_text().set_text('coinwatch');
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
                const text = ByteArray.toString(bytes.get_data());
                this._render(watchlist, JSON.parse(text));
            } catch (e) {
                this._showError();
            }
        });
    }

    _showError() {
        this._label.get_clutter_text().set_markup(`<span foreground='${DOWN}'>⚠ coinwatch</span>`);
        this._priceSection.removeAll();
        this._priceSection.addMenuItem(new PopupMenu.PopupMenuItem('CoinGecko no respondió', {reactive: false}));
    }

    _render(watchlist, data) {
        this._priceSection.removeAll();
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
            this._priceSection.addMenuItem(item);

            if (coin.bar) {
                const sign = change > 0 ? '+' : change < 0 ? '-' : '';
                barParts.push(`${coin.label} <span foreground='${color}'>$${priceFmt} ${sign}${changeFmt}%</span>`);
            }
        }

        this._label.get_clutter_text().set_markup(barParts.join('   ') || 'coinwatch');
    }

    _ensureCoinsCache(callback) {
        if (this._coins) {
            callback(this._coins);
            return;
        }

        const nowSec = Math.floor(GLib.get_real_time() / 1000000);
        try {
            const [ok, contents] = GLib.file_get_contents(COINS_CACHE_PATH);
            if (ok) {
                const parsed = JSON.parse(ByteArray.toString(contents));
                if (parsed && parsed.fetched_at && (nowSec - parsed.fetched_at) < COINS_CACHE_MAX_AGE_SECONDS) {
                    this._coins = parsed.coins;
                    callback(this._coins);
                    return;
                }
            }
        } catch (e) {
        }

        const msg = Soup.Message.new('GET', 'https://api.coingecko.com/api/v3/coins/list');
        this._session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                if (msg.get_status() !== Soup.Status.OK)
                    throw new Error(`HTTP ${msg.get_status()}`);
                const text = ByteArray.toString(bytes.get_data());
                const coins = JSON.parse(text);
                this._coins = coins;
                GLib.mkdir_with_parents(CONFIG_DIR, 0o755);
                GLib.file_set_contents(COINS_CACHE_PATH, JSON.stringify({fetched_at: nowSec, coins}));
                callback(coins);
            } catch (e) {
                callback(null);
            }
        });
    }

    _addCoin(coin) {
        let watchlist;
        try {
            watchlist = loadWatchlist();
        } catch (e) {
            watchlist = [];
        }
        if (watchlist.some(c => c.id === coin.id))
            return;
        watchlist.push({id: coin.id, label: coin.symbol.toUpperCase(), decimals: 4, bar: false});
        saveWatchlist(watchlist);
        this._refresh();
    }

    _buildAddSubmenu() {
        const submenu = new PopupMenu.PopupSubMenuMenuItem('+ Agregar moneda...');

        const searchItem = new SearchMenuItem();
        submenu.menu.addMenuItem(searchItem);

        const resultsSection = new PopupMenu.PopupMenuSection();
        submenu.menu.addMenuItem(resultsSection);

        const renderResults = query => {
            resultsSection.removeAll();
            if (!this._coins) {
                resultsSection.addMenuItem(new PopupMenu.PopupMenuItem('Cargando lista de monedas...', {reactive: false}));
                return;
            }
            if (!query || query.length < 2) {
                resultsSection.addMenuItem(new PopupMenu.PopupMenuItem('Escribí al menos 2 letras...', {reactive: false}));
                return;
            }

            const q = query.toLowerCase();
            const matches = this._coins
                .filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
                .slice(0, 12);

            if (matches.length === 0) {
                resultsSection.addMenuItem(new PopupMenu.PopupMenuItem('Sin resultados', {reactive: false}));
                return;
            }

            for (const coin of matches) {
                const item = new PopupMenu.PopupMenuItem(`${coin.symbol.toUpperCase()}  ${coin.name}`);
                item.connect('activate', () => this._addCoin(coin));
                resultsSection.addMenuItem(item);
            }
        };

        searchItem.connect('search-changed', (_item, text) => renderResults(text));

        submenu.menu.connect('open-state-changed', (_menu, open) => {
            if (!open)
                return;
            searchItem.reset();
            renderResults('');
            this._ensureCoinsCache(() => renderResults(searchItem.getText()));
            searchItem.grabFocus();
        });

        return submenu;
    }

    _buildBarSubmenu() {
        const submenu = new PopupMenu.PopupSubMenuMenuItem('Elegir monedas de la barra...');

        const rebuild = () => {
            submenu.menu.removeAll();
            let watchlist;
            try {
                watchlist = loadWatchlist();
            } catch (e) {
                watchlist = [];
            }

            if (watchlist.length === 0) {
                submenu.menu.addMenuItem(new PopupMenu.PopupMenuItem('Sin monedas en el watchlist', {reactive: false}));
                return;
            }

            for (const coin of watchlist) {
                const switchItem = new PopupMenu.PopupSwitchMenuItem(coin.label, !!coin.bar);
                switchItem.connect('toggled', (_item, state) => {
                    const wl = loadWatchlist();
                    const target = wl.find(c => c.id === coin.id);
                    if (!target)
                        return;
                    target.bar = state;
                    saveWatchlist(wl);
                    this._refresh();
                });
                submenu.menu.addMenuItem(switchItem);
            }
        };

        submenu.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                rebuild();
        });

        return submenu;
    }

    destroy() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        super.destroy();
    }
});

let indicator = null;

function init() {
}

function enable() {
    indicator = new CoinwatchIndicator();
    Main.panel.addToStatusArea('coinwatch@local', indicator);
}

function disable() {
    indicator?.destroy();
    indicator = null;
}
