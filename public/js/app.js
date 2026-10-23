/**
 * Main Web Application Controller for Day Trading Simulator.
 * Integrates simulation engine, canvas chart, Firebase PvP matchmaking, and reactive UI.
 */

// --- Web Audio Sound Synthesizer ---
class SoundFx {
    constructor() {
        this.ctx = null;
    }

    _init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    }

    playBuy() {
        try {
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    playSell() {
        try {
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(880.00, now);
            osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.14);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    playWin(equippedSfx = "default") {
        try {
            this._init();
            if (!this.ctx) return;
            if (equippedSfx === "sfx_airhorn") {
                this.playAirhorn();
                this._playChaChing();
                return;
            }
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
            notes.forEach((freq, i) => {
                const now = this.ctx.currentTime + (i * 0.12);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.26);
            });
        } catch (e) {}
    }

    playAirhorn() {
        try {
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const bursts = [
                { t: 0.00, d: 0.10 },
                { t: 0.13, d: 0.10 },
                { t: 0.26, d: 0.10 },
                { t: 0.39, d: 0.40 }
            ];
            bursts.forEach(b => {
                const startT = now + b.t;
                [698.46, 704.0].forEach(f => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(f, startT);
                    osc.frequency.exponentialRampToValueAtTime(f * 0.96, startT + b.d);
                    gain.gain.setValueAtTime(0.18, startT);
                    gain.gain.exponentialRampToValueAtTime(0.001, startT + b.d);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(startT);
                    osc.stop(startT + b.d + 0.02);
                });
            });
        } catch (e) {}
    }

    _playChaChing() {
        try {
            this._init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime + 0.85;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(1318.51, now); // E6
            osc.frequency.setValueAtTime(2093.00, now + 0.08); // C7
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.36);
        } catch (e) {}
    }
}

// --- Shop Catalog Specification ---
const SHOP_ITEMS = [
    {
        id: "money_rain",
        name: "Money Rain & Gold Confetti",
        category: "animation",
        price: 0,
        icon: "💸",
        description: "High-roller cash storm! 100-dollar bills and shimmering gold glitter shower down across your terminal."
    },
    {
        id: "rocket_moon",
        name: "To The Moon Rocket Blast",
        category: "animation",
        price: 25000,
        icon: "🚀",
        description: "Screen-shaking neon rocket blastoff with blazing particle thrusters, warp speed stars & lunar splashdown!"
    },
    {
        id: "matrix_glitch",
        name: "Cyber Matrix Glitch Rain",
        category: "animation",
        price: 75000,
        icon: "⚡",
        description: "Neon green digital rain cascades down with retro CRT distortion, scanlines, and lightning victory flashes!"
    },
    {
        id: "diamond_hands",
        name: "Diamond Hands Supernova",
        category: "animation",
        price: 200000,
        icon: "💎",
        description: "Glowing diamond hands rise up, shattering into thousands of shimmering prismatic gemstone particles with a cosmic shockwave!"
    },
    {
        id: "golden_bull",
        name: "Golden Bull Stampede",
        category: "animation",
        price: 500000,
        icon: "👑",
        description: "The ultimate Wall Street flex. Giant mechanical golden bull charges across screen with laser eyes & bullion explosions!"
    },
    {
        id: "theme_default",
        name: "Classic Obsidian Dark Theme",
        category: "theme",
        price: 0,
        icon: "🌑",
        description: "The sleek, battle-tested standard dark terminal styling."
    },
    {
        id: "theme_cyberpunk",
        name: "Cyberpunk Neon Theme",
        category: "theme",
        price: 50000,
        icon: "🔮",
        description: "Futuristic neon purple & electric cyan styling for your trading dashboard."
    },
    {
        id: "theme_gold_vip",
        name: "Golden Bull VIP Theme",
        category: "theme",
        price: 150000,
        icon: "✨",
        description: "Ultra-prestige obsidian and metallic gold luxury border accents."
    },
    {
        id: "sfx_standard",
        name: "Standard Electronic Chimes",
        category: "sfx",
        price: 0,
        icon: "🔔",
        description: "Clean harmonic victory chimes for order fills and round victories."
    },
    {
        id: "sfx_airhorn",
        name: "DJ Airhorn & Cha-Ching!",
        category: "sfx",
        price: 15000,
        icon: "📢",
        description: "Stadium DJ victory airhorns and cash register cha-ching audio euphoria."
    },
    {
        id: "title_trader",
        name: "Title: 'Trader'",
        category: "title",
        price: 0,
        icon: "📈",
        description: "Standard trader badge displayed on your terminal and in duels."
    },
    {
        id: "title_whale",
        name: "Title: 'Wall Street Whale'",
        category: "title",
        price: 100000,
        icon: "🐋",
        description: "Display the prestigious [WHALE] title on your trader badge in duels & menu."
    }
];

// --- App State & Controller ---
class TradingApp {
    constructor() {
        window.app = this;
        this.sfx = new SoundFx();
        this.fb = new FirebaseMatchmaker();

        this.nickname = localStorage.getItem("trader_nickname") || `Trader_${Math.floor(100 + Math.random() * 900)}`;
        this.mode = "solo"; // "solo" or "online"
        this.activeTicker = "NVXP";
        this.selectedQty = 50;
        this.activeSector = "All";
        this.searchQuery = "";
        this.activeShopCat = "all";

        // Load saved profile (balance, inventory, equipped animations, themes, sfx, titles)
        this.profile = this._loadProfile();

        // Match state
        this.matchData = null;
        this.matchTimeLeft = 180;
        this.matchTimerInterval = null;
        this.syncMetricsInterval = null;
        this.searchAbortCtrl = null;

        // Init engine with saved solo temperature
        const initialTemp = (this.profile && typeof this.profile.trading_temperature === "number") ? this.profile.trading_temperature : 1.0;
        this.engine = new MarketEngine(25000.0, null, initialTemp);
        this.chart = null;
        this.loopTimer = null;

        this._bindDom();
        this._initChart();
        this._bindEvents();
        this._initBottomPanelResizable();
        this._applyTheme();
        this._updateTitleBadge();
        this._renderScanner();
        this._selectTicker("NVXP");
        this._updateVaultDisplay();
        this._updateModeTempDisplay();
        this._updateAuthUi();
        this._initAuthSession();

        // Start solo loop initially
        this._scheduleNextTick();

        // Prompt mode select on first arrival
        this.showModeModal();
    }

    _loadProfile() {
        const defaults = {
            player_name: "",
            menu_balance: 0.0,
            total_profit_banked: 0.0,
            trading_temperature: 1.0,
            inventory: ["money_rain", "theme_default", "sfx_standard", "title_trader"],
            equipped_animation: "money_rain",
            equipped_theme: "theme_default",
            equipped_sfx: "sfx_standard",
            equipped_title: "title_trader",
            duels_won: 0,
            auth_uid: "",
            auth_email: "",
            auth_display_name: "",
            auth_id_token: "",
            auth_refresh_token: ""
        };
        try {
            const raw = localStorage.getItem("tradegpt_profile") || localStorage.getItem("daytradesim_profile");
            if (raw) {
                const p = JSON.parse(raw);
                if (!Array.isArray(p.inventory)) p.inventory = [...defaults.inventory];
                defaults.inventory.forEach(defId => {
                    if (!p.inventory.includes(defId)) p.inventory.push(defId);
                });
                p.player_name = typeof p.player_name === "string" ? p.player_name : "";
                p.menu_balance = typeof p.menu_balance === "number" ? p.menu_balance : 0.0;
                p.total_profit_banked = typeof p.total_profit_banked === "number" ? p.total_profit_banked : 0.0;
                p.trading_temperature = typeof p.trading_temperature === "number" ? p.trading_temperature : 1.0;
                p.equipped_animation = p.equipped_animation || "money_rain";
                p.equipped_theme = p.equipped_theme || "theme_default";
                p.equipped_sfx = p.equipped_sfx || "sfx_standard";
                p.equipped_title = p.equipped_title || "title_trader";
                p.duels_won = typeof p.duels_won === "number" ? p.duels_won : 0;
                p.auth_uid = typeof p.auth_uid === "string" ? p.auth_uid : "";
                p.auth_email = typeof p.auth_email === "string" ? p.auth_email : "";
                p.auth_display_name = typeof p.auth_display_name === "string" ? p.auth_display_name : "";
                p.auth_id_token = typeof p.auth_id_token === "string" ? p.auth_id_token : "";
                p.auth_refresh_token = typeof p.auth_refresh_token === "string" ? p.auth_refresh_token : "";
                return p;
            }
        } catch (e) {}
        return defaults;
    }

    _saveProfile(syncCloud = true) {
        try {
            localStorage.setItem("tradegpt_profile", JSON.stringify(this.profile));
            localStorage.setItem("daytradesim_profile", JSON.stringify(this.profile));
        } catch (e) {}
        if (syncCloud && this.profile.auth_uid) {
            this.syncToCloud();
        }
    }

    applyCloudData(cloudData) {
        if (!cloudData || typeof cloudData !== 'object') return;
        if (cloudData.player_name) {
            this.profile.player_name = cloudData.player_name;
            this.nickname = cloudData.player_name;
            localStorage.setItem("trader_nickname", this.nickname);
            if (this.elNicknameInput) this.elNicknameInput.value = this.nickname;
            if (this.fb) this.fb.displayName = this.nickname;
        }
        if (typeof cloudData.menu_balance === 'number') {
            this.profile.menu_balance = Math.max(this.profile.menu_balance, cloudData.menu_balance);
        }
        if (typeof cloudData.total_profit_banked === 'number') {
            this.profile.total_profit_banked = Math.max(this.profile.total_profit_banked, cloudData.total_profit_banked);
        }
        if (Array.isArray(cloudData.inventory)) {
            cloudData.inventory.forEach(item => {
                if (item && !this.profile.inventory.includes(item)) {
                    this.profile.inventory.push(item);
                }
            });
        }
        if (cloudData.equipped_animation && this.profile.inventory.includes(cloudData.equipped_animation)) {
            this.profile.equipped_animation = cloudData.equipped_animation;
        }
        if (cloudData.equipped_theme && this.profile.inventory.includes(cloudData.equipped_theme)) {
            this.profile.equipped_theme = cloudData.equipped_theme;
        }
        if (typeof cloudData.duels_won === 'number') {
            this.profile.duels_won = Math.max(this.profile.duels_won, cloudData.duels_won);
        }
        this._saveProfile(false);
        this._updateVaultDisplay();
        this._applyTheme();
        this._updateTitleBadge();
        this._updateAuthUi();
    }

    async syncToCloud() {
        if (!this.profile.auth_uid || !this.fb) return;
        const pData = {
            player_name: this.nickname,
            menu_balance: this.profile.menu_balance,
            total_profit_banked: this.profile.total_profit_banked,
            inventory: this.profile.inventory,
            equipped_animation: this.profile.equipped_animation,
            equipped_theme: this.profile.equipped_theme,
            duels_won: this.profile.duels_won
        };
        try {
            await this.fb.saveUserProfile(this.profile.auth_uid, pData);
        } catch (e) {
            console.warn("[CloudSync] Error saving profile:", e);
        }
    }

    _bankProfit(profitAmount) {
        if (profitAmount <= 0) return this.profile.menu_balance;
        this.profile.menu_balance = Math.round((this.profile.menu_balance + profitAmount) * 100) / 100;
        this.profile.total_profit_banked = Math.round((this.profile.total_profit_banked + profitAmount) * 100) / 100;
        this._saveProfile();
        this._updateVaultDisplay();
        return this.profile.menu_balance;
    }

    _bindDom() {
        // Headers & HUD
        this.elTopHeader = document.getElementById("top-header");
        this.elBattleHud = document.getElementById("battle-hud");

        // Metrics in Header
        this.elBalance = document.getElementById("hdr-balance");
        this.elBuyingPower = document.getElementById("hdr-bp");
        this.elUnrealized = document.getElementById("hdr-unrealized");
        this.elRealized = document.getElementById("hdr-realized");
        this.elTotalPnl = document.getElementById("hdr-total-pnl");
        this.elSpeedSelect = document.getElementById("speed-select");
        this.elBtnPause = document.getElementById("btn-pause");
        this.elBtnBankProfit = document.getElementById("btn-bank-profit");
        this.elBtnShopOpen = document.getElementById("btn-shop-open");
        this.elBtnHudShop = document.getElementById("btn-hud-shop");
        this.elBtnMenu = document.getElementById("btn-menu");

        // Battle HUD
        this.elHudMyName = document.getElementById("hud-my-name");
        this.elHudMyScore = document.getElementById("hud-my-score");
        this.elHudLeaderBadge = document.getElementById("hud-leader-badge");
        this.elHudTimer = document.getElementById("hud-timer");
        this.elHudOppName = document.getElementById("hud-opp-name");
        this.elHudOppScore = document.getElementById("hud-opp-score");

        // Scanner
        this.elSearchInput = document.getElementById("scanner-search");
        this.elSectorScroll = document.getElementById("sector-scroll");
        this.elStockList = document.getElementById("stock-list");

        // Chart Header
        this.elActiveTicker = document.getElementById("chart-active-ticker");
        this.elActiveName = document.getElementById("chart-active-name");
        this.elActiveSector = document.getElementById("chart-active-sector");
        this.elActivePrice = document.getElementById("chart-active-price");
        this.elActiveChg = document.getElementById("chart-active-chg");

        // Execution Desk
        this.elDeskPrice = document.getElementById("desk-price");
        this.elQtyInput = document.getElementById("qty-input");
        this.elEstCost = document.getElementById("order-est-cost");
        this.elPosShares = document.getElementById("pos-shares");
        this.elPosAvg = document.getElementById("pos-avg");
        this.elPosVal = document.getElementById("pos-val");
        this.elPosPnl = document.getElementById("pos-pnl");

        // Bottom Tabs & Resizer
        this.elBottomPanel = document.getElementById("bottom-panel");
        this.elBottomResizer = document.getElementById("bottom-resizer");
        this.elBtnBottomReset = document.getElementById("btn-bottom-reset");
        this.elBtnBottomToggle = document.getElementById("btn-bottom-toggle");
        this.elBtnResizerReset = document.getElementById("btn-resizer-reset");
        this.elResizerBanner = document.getElementById("resizer-collapsed-banner");
        this.elTablePositions = document.getElementById("table-positions-body");
        this.elTableTrades = document.getElementById("table-trades-body");
        this.elNewsList = document.getElementById("news-feed-list");

        // Modals
        this.elModalMode = document.getElementById("modal-mode");
        this.elModalVaultBal = document.getElementById("modal-vault-bal");
        this.elBtnModalShop = document.getElementById("btn-modal-shop");
        this.elNicknameInput = document.getElementById("nickname-input");
        this.elModalMatchmaking = document.getElementById("modal-matchmaking");
        this.elMatchStatusTxt = document.getElementById("match-status-txt");
        this.elModalMatchEnd = document.getElementById("modal-match-end");
        this.elEndOutcome = document.getElementById("end-outcome");
        this.elEndDetails = document.getElementById("end-details");

        // Shop Modal
        this.elModalShop = document.getElementById("modal-shop");
        this.elBtnCloseShop = document.getElementById("btn-close-shop");
        this.elShopVaultBal = document.getElementById("shop-vault-bal");
        this.elShopItemsList = document.getElementById("shop-items-list");
        this.elShopCatTabs = document.getElementById("shop-category-tabs");

        // Auth UI & Modal
        this.elTopLeftAuth = document.getElementById("modal-top-left-auth");
        this.elModalAuth = document.getElementById("modal-auth");
        this.elBtnGoogleAuth = document.getElementById("btn-google-auth");
        this.elTabAuthSignin = document.getElementById("tab-auth-signin");
        this.elTabAuthSignup = document.getElementById("tab-auth-signup");
        this.elAuthGroupNick = document.getElementById("auth-group-nick");
        this.elAuthInputNick = document.getElementById("auth-input-nick");
        this.elAuthInputEmail = document.getElementById("auth-input-email");
        this.elAuthInputPass = document.getElementById("auth-input-pass");
        this.elBtnAuthSubmit = document.getElementById("btn-auth-submit");
        this.elAuthStatusMsg = document.getElementById("auth-status-msg");
        this.elBtnCloseAuth = document.getElementById("btn-close-auth");
        this.elBtnCloseAuthView = document.getElementById("btn-close-auth-view");
        this.elBtnAuthSync = document.getElementById("btn-auth-sync");
        this.elBtnAuthSignout = document.getElementById("btn-auth-signout");
        this.authMode = "signin";

        // Settings Elements
        this.elBtnSettingsOpen = document.getElementById("btn-settings-open");
        this.elBtnModalSettings = document.getElementById("btn-modal-settings");
        this.elModeTempTag = document.getElementById("mode-temp-tag");
        this.elModalSettings = document.getElementById("modal-settings");
        this.elTempSlider = document.getElementById("settings-temp-slider");
        this.elTempVal = document.getElementById("settings-temp-val");
        this.elTempBadge = document.getElementById("settings-temp-badge");
        this.elMetricVol = document.getElementById("metric-vol-val");
        this.elMetricSpikes = document.getElementById("metric-spikes-val");
        this.elMetricNews = document.getElementById("metric-news-val");
        this.elMetricRealism = document.getElementById("metric-realism-val");
        this.elBtnResetTemp = document.getElementById("btn-reset-temp");
        this.elBtnSaveSettings = document.getElementById("btn-save-settings");
        this.elBtnCloseSettings = document.getElementById("btn-close-settings");
    }


    _initChart() {
        this.chart = new CandlestickChart("chart-canvas");
    }

    _bindEvents() {
        // Nickname: persistent auto-save on input or change
        this.elNicknameInput.value = this.nickname;
        if (this.fb) this.fb.displayName = this.nickname;
        const handleNick = (e) => {
            const val = e.target.value.trim();
            if (val) {
                this.nickname = val;
                this.profile.player_name = val;
                localStorage.setItem("trader_nickname", val);
                if (this.fb) this.fb.displayName = val;
                this._saveProfile();
                this._updateTitleBadge();
                this._updateAuthUi();
            }
        };
        this.elNicknameInput.addEventListener("input", handleNick);
        this.elNicknameInput.addEventListener("change", handleNick);

        // Auth Modal & Buttons
        if (this.elTabAuthSignin) {
            this.elTabAuthSignin.addEventListener("click", () => this._setAuthTab("signin"));
        }
        if (this.elTabAuthSignup) {
            this.elTabAuthSignup.addEventListener("click", () => this._setAuthTab("signup"));
        }
        if (this.elBtnGoogleAuth) {
            this.elBtnGoogleAuth.addEventListener("click", () => this._handleGoogleSignIn());
        }
        if (this.elBtnAuthSubmit) {
            this.elBtnAuthSubmit.addEventListener("click", () => this._handleAuthSubmit());
        }
        if (this.elBtnCloseAuth) {
            this.elBtnCloseAuth.addEventListener("click", () => {
                if (this.elModalAuth) this.elModalAuth.style.display = "none";
            });
        }
        if (this.elBtnCloseAuthView) {
            this.elBtnCloseAuthView.addEventListener("click", () => {
                if (this.elModalAuth) this.elModalAuth.style.display = "none";
            });
        }
        if (this.elBtnAuthSync) {
            this.elBtnAuthSync.addEventListener("click", () => this._handleManualSync());
        }
        if (this.elBtnAuthSignout) {
            this.elBtnAuthSignout.addEventListener("click", () => this._handleSignOut());
        }

        // Search & Sector filter
        this.elSearchInput.addEventListener("input", (e) => {
            this.searchQuery = e.target.value.toUpperCase();
            this._renderScanner();
        });

        // Speed select
        this.elSpeedSelect.addEventListener("change", (e) => {
            this.engine.currentDifficulty = e.target.value;
        });

        // Pause
        this.elBtnPause.addEventListener("click", () => {
            this.engine.isPaused = !this.engine.isPaused;
            this.elBtnPause.textContent = this.engine.isPaused ? "▶ Resume" : "⏸ Pause";
        });

        // Bank Profit to Menu
        if (this.elBtnBankProfit) {
            this.elBtnBankProfit.addEventListener("click", () => this._handleBankProfitClick());
        }

        // Reset
        document.getElementById("btn-reset").addEventListener("click", () => {
            if (confirm("Reset account equity to $25,000.00 and wipe current positions?")) {
                const temp = this.mode === "solo" ? (this.profile.trading_temperature || 1.0) : 1.0;
                this.engine.resetAccount(null, temp);
                this._updateAllUi();
            }
        });

        // Shop buttons
        if (this.elBtnShopOpen) {
            this.elBtnShopOpen.addEventListener("click", () => this.showShopModal());
        }
        if (this.elBtnHudShop) {
            this.elBtnHudShop.addEventListener("click", () => this.showShopModal());
        }
        if (this.elBtnModalShop) {
            this.elBtnModalShop.addEventListener("click", () => this.showShopModal());
        }
        if (this.elBtnCloseShop) {
            this.elBtnCloseShop.addEventListener("click", () => this.hideShopModal());
        }

        // Return to Menu
        if (this.elBtnMenu) {
            this.elBtnMenu.addEventListener("click", () => this._handleReturnToMenu());
        }

        // Shop category tab buttons
        if (this.elShopCatTabs) {
            this.elShopCatTabs.querySelectorAll(".shop-tab-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    this.elShopCatTabs.querySelectorAll(".shop-tab-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    this.activeShopCat = btn.getAttribute("data-cat") || "all";
                    this._renderShopItems();
                });
            });
        }

        // Switch to Duel from Solo header
        document.getElementById("btn-switch-duel").addEventListener("click", () => {
            this.showModeModal();
        });

        // Quantity presets
        document.querySelectorAll(".btn-qty").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".btn-qty").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const val = btn.getAttribute("data-qty");
                if (val === "MAX") {
                    const price = this.engine.stocks[this.activeTicker].price;
                    const maxShares = Math.floor(this.engine.cash / price);
                    this.selectedQty = Math.max(1, maxShares);
                } else {
                    this.selectedQty = parseInt(val, 10);
                }
                this.elQtyInput.value = this.selectedQty;
                this._updateDeskEstimate();
            });
        });

        // Quantity steppers
        document.getElementById("btn-qty-minus").addEventListener("click", () => {
            this.selectedQty = Math.max(1, this.selectedQty - 10);
            this.elQtyInput.value = this.selectedQty;
            this._updateDeskEstimate();
        });
        document.getElementById("btn-qty-plus").addEventListener("click", () => {
            this.selectedQty = this.selectedQty + 10;
            this.elQtyInput.value = this.selectedQty;
            this._updateDeskEstimate();
        });
        this.elQtyInput.addEventListener("input", (e) => {
            const v = parseInt(e.target.value, 10);
            this.selectedQty = isNaN(v) || v <= 0 ? 1 : v;
            this._updateDeskEstimate();
        });

        // Trade execution buttons
        document.getElementById("btn-buy").addEventListener("click", () => this._executeOrder("BUY"));
        document.getElementById("btn-sell").addEventListener("click", () => this._executeOrder("SELL"));
        document.getElementById("btn-short").addEventListener("click", () => this._executeOrder("SHORT"));
        document.getElementById("btn-cover").addEventListener("click", () => this._executeOrder("COVER"));
        const btnRev = document.getElementById("btn-reverse");
        if (btnRev) btnRev.addEventListener("click", () => this._executeOrder("REVERSE"));
        document.getElementById("btn-flatten").addEventListener("click", () => {
            const pos = this.engine.positions[this.activeTicker];
            if (pos && pos.shares !== 0) {
                const oldRealized = this.engine.realizedPnL;
                const shares = Math.abs(pos.shares);
                const act = pos.shares > 0 ? "SELL" : "COVER";
                this.engine.closePosition(this.activeTicker);
                this.sfx.playSell();
                const diff = this.engine.realizedPnL - oldRealized;
                this.chart.showTradeNotification(act, shares, this.engine.stocks[this.activeTicker].price, this.activeTicker, diff);
                this._updateAllUi();
            }
        });

        // Bottom tab navigation
        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                btn.classList.add("active");
                const target = btn.getAttribute("data-tab");
                const targetTab = document.getElementById(`tab-${target}`);
                if (targetTab) targetTab.classList.add("active");
                if (this.elBottomPanel && this.elBottomPanel.classList && this.elBottomPanel.classList.contains("is-collapsed")) {
                    this.setBottomPanelHeight(this.bottomPanelLastHeight || 210, { animate: true, save: true });
                }
            });
        });

        // Global hotkeys
        window.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

            const key = e.key.toUpperCase();
            if (key === "B") this._executeOrder("BUY");
            else if (key === "S") this._executeOrder("SELL");
            else if (key === "H") this._executeOrder("SHORT");
            else if (key === "C") this._executeOrder("COVER");
            else if (key === "R") this._executeOrder("REVERSE");
            else if (key === " ") {
                e.preventDefault();
                const pos = this.engine.positions[this.activeTicker];
                if (pos && pos.shares !== 0) {
                    const oldRealized = this.engine.realizedPnL;
                    const shares = Math.abs(pos.shares);
                    const act = pos.shares > 0 ? "SELL" : "COVER";
                    this.engine.closePosition(this.activeTicker);
                    this.sfx.playSell();
                    const diff = this.engine.realizedPnL - oldRealized;
                    this.chart.showTradeNotification(act, shares, this.engine.stocks[this.activeTicker].price, this.activeTicker, diff);
                    this._updateAllUi();
                }
            } else if (key === "1") this._setPresetQty(10);
            else if (key === "2") this._setPresetQty(50);
            else if (key === "3") this._setPresetQty(100);
            else if (key === "4") this._setPresetQty(500);
            else if (key === "5") this._setPresetQty("MAX");
            else if (key === "ESCAPE") {
                if (window.winAnimations && window.winAnimations.active) {
                    window.winAnimations.stop();
                } else if (this.elModalShop && this.elModalShop.style.display !== "none") {
                    this.hideShopModal();
                }
            }
        });

        // Click outside shop modal card to close
        if (this.elModalShop) {
            this.elModalShop.addEventListener("click", (e) => {
                if (e.target === this.elModalShop) this.hideShopModal();
            });
        }

        // Battle HUD Actions
        document.getElementById("btn-next-opp").addEventListener("click", () => this._handleNextOpponent());
        document.getElementById("btn-leave-duel").addEventListener("click", () => this._leaveDuel());

        // Modal triggers
        document.getElementById("mode-solo").addEventListener("click", () => this._startSoloMode());
        document.getElementById("mode-online").addEventListener("click", () => this._startOnlineMatchmaking());
        document.getElementById("btn-cancel-match").addEventListener("click", () => {
            if (this.searchAbortCtrl) this.searchAbortCtrl.abort();
            this.elModalMatchmaking.style.display = "none";
            this.showModeModal();
        });

        // Match end buttons
        document.getElementById("btn-end-next").addEventListener("click", () => {
            this.elModalMatchEnd.style.display = "none";
            this._startOnlineMatchmaking();
        });
        document.getElementById("btn-end-menu").addEventListener("click", () => {
            this.elModalMatchEnd.style.display = "none";
            this._startSoloMode();
            this.showModeModal();
        });

        // Settings Modal Triggers & Controls
        if (this.elBtnSettingsOpen) {
            this.elBtnSettingsOpen.addEventListener("click", () => this._openSettingsModal());
        }
        if (this.elBtnModalSettings) {
            this.elBtnModalSettings.addEventListener("click", (e) => {
                e.stopPropagation();
                this._openSettingsModal();
            });
        }
        if (this.elBtnCloseSettings) {
            this.elBtnCloseSettings.addEventListener("click", () => {
                if (this.elModalSettings) this.elModalSettings.style.display = "none";
            });
        }
        if (this.elBtnResetTemp) {
            this.elBtnResetTemp.addEventListener("click", () => this._applyTempPreset(1.0));
        }
        if (this.elBtnSaveSettings) {
            this.elBtnSaveSettings.addEventListener("click", () => this._saveSettings());
        }
        if (this.elTempSlider) {
            this.elTempSlider.addEventListener("input", (e) => {
                this._onTempSliderInput(parseFloat(e.target.value));
            });
        }
        if (this.elModalSettings) {
            this.elModalSettings.addEventListener("click", (e) => {
                if (e.target === this.elModalSettings) this.elModalSettings.style.display = "none";
            });
            const presetBtns = this.elModalSettings.querySelectorAll(".btn-preset");
            presetBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    const t = parseFloat(btn.dataset.temp);
                    this._applyTempPreset(t);
                });
            });
        }
    }

    _setPresetQty(val) {
        if (val === "MAX") {
            const price = this.engine.stocks[this.activeTicker].price;
            const maxShares = Math.floor(this.engine.cash / price);
            this.selectedQty = Math.max(1, maxShares);
        } else {
            this.selectedQty = val;
        }
        this.elQtyInput.value = this.selectedQty;
        this._updateDeskEstimate();
    }

    _renderScanner() {
        // 1. Sector pills
        this.elSectorScroll.innerHTML = "";
        for (const sec of SECTORS) {
            const pill = document.createElement("div");
            pill.className = `sector-pill ${this.activeSector === sec ? 'active' : ''}`;
            pill.textContent = sec;
            pill.addEventListener("click", () => {
                this.activeSector = sec;
                this._renderScanner();
            });
            this.elSectorScroll.appendChild(pill);
        }

        // 2. Stock items
        this.elStockList.innerHTML = "";
        const stocks = Object.values(this.engine.stocks);

        for (const st of stocks) {
            if (this.activeSector !== "All" && st.sector !== this.activeSector) continue;
            if (this.searchQuery && !st.ticker.includes(this.searchQuery) && !st.name.toUpperCase().includes(this.searchQuery)) continue;

            const row = document.createElement("div");
            row.className = `stock-row ${this.activeTicker === st.ticker ? 'active' : ''}`;
            row.id = `row-${st.ticker}`;

            const chgSign = st.change >= 0 ? "+" : "";
            const chgClass = st.change >= 0 ? "up" : "down";

            row.innerHTML = `
                <div class="stock-info">
                    <span class="sym">${st.ticker}</span>
                    <span class="sub">${st.name}</span>
                </div>
                <div class="stock-prices">
                    <span class="cur-p" id="price-${st.ticker}">$${st.price.toFixed(2)}</span>
                    <span class="pct ${chgClass}" id="pct-${st.ticker}">${chgSign}${st.changePct.toFixed(2)}%</span>
                </div>
            `;

            row.addEventListener("click", () => this._selectTicker(st.ticker));
            this.elStockList.appendChild(row);
        }
    }

    _selectTicker(ticker) {
        if (!this.engine.stocks[ticker]) return;
        this.activeTicker = ticker;

        document.querySelectorAll(".stock-row").forEach(r => r.classList.remove("active"));
        const activeRow = document.getElementById(`row-${ticker}`);
        if (activeRow) activeRow.classList.add("active");

        const st = this.engine.stocks[ticker];
        this.elActiveTicker.textContent = st.ticker;
        this.elActiveName.textContent = st.name;
        this.elActiveSector.textContent = st.sector;

        this.chart.setData(st);
        this.chart.setPosition(this.engine.positions[ticker] || null);
        this._updateDeskEstimate();
        this._updateDeskPosition();
    }

    _executeOrder(action) {
        let ok = false;
        const curPrice = this.engine.stocks[this.activeTicker].price;
        const oldRealized = this.engine.realizedPnL;

        if (action === "BUY") {
            ok = this.engine.buy(this.activeTicker, this.selectedQty);
            if (ok) {
                this.sfx.playBuy();
                this.chart.showTradeNotification("BUY", this.selectedQty, curPrice, this.activeTicker);
            }
        } else if (action === "SELL") {
            ok = this.engine.sell(this.activeTicker, this.selectedQty);
            if (ok) {
                this.sfx.playSell();
                const diff = this.engine.realizedPnL - oldRealized;
                this.chart.showTradeNotification("SELL", this.selectedQty, curPrice, this.activeTicker, diff);
            }
        } else if (action === "SHORT") {
            ok = this.engine.short(this.activeTicker, this.selectedQty);
            if (ok) {
                this.sfx.playSell();
                this.chart.showTradeNotification("SHORT", this.selectedQty, curPrice, this.activeTicker);
            }
        } else if (action === "COVER") {
            ok = this.engine.cover(this.activeTicker, this.selectedQty);
            if (ok) {
                this.sfx.playBuy();
                const diff = this.engine.realizedPnL - oldRealized;
                this.chart.showTradeNotification("COVER", this.selectedQty, curPrice, this.activeTicker, diff);
            }
        } else if (action === "REVERSE") {
            const pos = this.engine.positions[this.activeTicker];
            const revShares = pos ? Math.abs(pos.shares) : 0;
            ok = this.engine.reversePosition(this.activeTicker);
            if (ok) {
                this.sfx.playWin();
                const diff = this.engine.realizedPnL - oldRealized;
                this.chart.showTradeNotification("REVERSE", revShares, curPrice, this.activeTicker, diff);
            }
        }

        if (ok) {
            this._updateAllUi();
        } else {
            // Flash red on order reject
            this.elEstCost.style.color = "var(--red)";
            setTimeout(() => this.elEstCost.style.color = "var(--text-muted)", 300);
        }
    }

    _scheduleNextTick() {
        const diffCfg = MarketEngine.DIFFICULTIES[this.engine.currentDifficulty] || MarketEngine.DIFFICULTIES["Day Trader (3x)"];
        const tickMs = diffCfg.tickMs;

        this.loopTimer = setTimeout(() => {
            this._tick();
            this._scheduleNextTick();
        }, tickMs);
    }

    _tick() {
        const triggeredNews = this.engine.step();

        // Update active chart
        const activeStock = this.engine.stocks[this.activeTicker];
        if (activeStock) {
            this.chart.setData(activeStock);
            this.chart.setPosition(this.engine.positions[this.activeTicker] || null);

            const chgSign = activeStock.change >= 0 ? "+" : "";
            const chgClass = activeStock.change >= 0 ? "up" : "down";

            this.elActivePrice.textContent = `$${activeStock.price.toFixed(2)}`;
            this.elActiveChg.className = `active-chg ${chgClass}`;
            this.elActiveChg.textContent = `${chgSign}$${activeStock.change.toFixed(2)} (${chgSign}${activeStock.changePct.toFixed(2)}%)`;

            this.elDeskPrice.textContent = `$${activeStock.price.toFixed(2)}`;
        }

        // Update row prices in scanner
        for (const st of Object.values(this.engine.stocks)) {
            const pEl = document.getElementById(`price-${st.ticker}`);
            const pctEl = document.getElementById(`pct-${st.ticker}`);
            if (pEl && pctEl) {
                pEl.textContent = `$${st.price.toFixed(2)}`;
                const sign = st.change >= 0 ? "+" : "";
                pctEl.className = `pct ${st.change >= 0 ? 'up' : 'down'}`;
                pctEl.textContent = `${sign}${st.changePct.toFixed(2)}%`;
            }
        }

        // If news triggered, update news tab
        if (triggeredNews) {
            this._renderNewsTab();
        }

        this._updateAllUi();
    }

    _updateAllUi() {
        // Header metrics
        this.elBalance.textContent = `$${this.engine.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        this.elBuyingPower.textContent = `$${this.engine.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const unrl = this.engine.totalUnrealizedPnL;
        const unrlSign = unrl >= 0 ? "+" : "";
        this.elUnrealized.textContent = `${unrlSign}$${unrl.toFixed(2)}`;
        this.elUnrealized.className = `value ${unrl >= 0 ? 'up' : 'down'}`;

        const rlz = this.engine.realizedPnL;
        const rlzSign = rlz >= 0 ? "+" : "";
        this.elRealized.textContent = `${rlzSign}$${rlz.toFixed(2)}`;
        this.elRealized.className = `value ${rlz >= 0 ? 'up' : 'down'}`;

        const pnl = this.engine.totalPnL;
        const pnlPct = this.engine.totalPnLPct;
        const pnlSign = pnl >= 0 ? "+" : "";
        this.elTotalPnl.textContent = `${pnlSign}$${pnl.toFixed(2)} (${pnlSign}${pnlPct.toFixed(2)}%)`;
        this.elTotalPnl.className = `value ${pnl >= 0 ? 'up' : 'down'}`;

        // Bank Profit Button update
        if (this.elBtnBankProfit) {
            const profitAbove25k = Math.max(0, this.engine.totalEquity - 25000.0);
            if (profitAbove25k > 0) {
                this.elBtnBankProfit.disabled = false;
                this.elBtnBankProfit.textContent = `💰 Bank +$${profitAbove25k.toFixed(2)}`;
            } else {
                this.elBtnBankProfit.disabled = true;
                this.elBtnBankProfit.textContent = "💰 Bank Profit";
            }
        }

        // Desk
        this._updateDeskEstimate();
        this._updateDeskPosition();

        // Tables
        this._renderPositionsTab();
        this._renderTradesTab();
    }

    _updateDeskEstimate() {
        const st = this.engine.stocks[this.activeTicker];
        if (!st) return;
        const est = this.selectedQty * st.price;
        this.elEstCost.textContent = `Est. Value: $${est.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    _updateDeskPosition() {
        const pos = this.engine.positions[this.activeTicker];
        const st = this.engine.stocks[this.activeTicker];
        if (!pos || !st) return;

        this.elPosShares.textContent = `${pos.shares} (${pos.side})`;
        this.elPosShares.className = `val ${pos.shares > 0 ? 'up' : pos.shares < 0 ? 'down' : ''}`;

        this.elPosAvg.textContent = pos.avgPrice > 0 ? `$${pos.avgPrice.toFixed(2)}` : "$0.00";
        this.elPosVal.textContent = `$${pos.currentValue(st.price).toFixed(2)}`;

        const uPnl = pos.unrealizedPnL(st.price);
        const uPct = pos.unrealizedPnLPct(st.price);
        const sign = uPnl >= 0 ? "+" : "";
        this.elPosPnl.textContent = `${sign}$${uPnl.toFixed(2)} (${sign}${uPct.toFixed(2)}%)`;
        this.elPosPnl.className = `val ${uPnl >= 0 ? 'up' : 'down'}`;
    }

    _renderPositionsTab() {
        let html = "";
        for (const [ticker, pos] of Object.entries(this.engine.positions)) {
            if (pos.shares === 0) continue;
            const st = this.engine.stocks[ticker];
            const uPnl = pos.unrealizedPnL(st.price);
            const uPct = pos.unrealizedPnLPct(st.price);
            const sign = uPnl >= 0 ? "+" : "";
            const cls = uPnl >= 0 ? "up" : "down";

            html += `
                <tr>
                    <td style="color:#fff;font-weight:700;">${ticker}</td>
                    <td>${st.sector}</td>
                    <td class="${pos.shares > 0 ? 'up' : 'down'}">${pos.side}</td>
                    <td>${pos.shares}</td>
                    <td>$${pos.avgPrice.toFixed(2)}</td>
                    <td>$${st.price.toFixed(2)}</td>
                    <td>$${pos.currentValue(st.price).toFixed(2)}</td>
                    <td class="${cls}">${sign}$${uPnl.toFixed(2)}</td>
                    <td class="${cls}">${sign}${uPct.toFixed(2)}%</td>
                    <td><button class="btn-ctrl" onclick="app.engine.closePosition('${ticker}'); app._updateAllUi();" style="padding:2px 8px;font-size:10px;">FLATTEN</button></td>
                </tr>
            `;
        }
        this.elTablePositions.innerHTML = html || `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:24px;">No open positions. Use Buy or Short to trade.</td></tr>`;
    }

    _renderTradesTab() {
        let html = "";
        for (const t of this.engine.trades) {
            const pnlStr = t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : "-";
            const pnlCls = t.pnl !== null ? (t.pnl >= 0 ? 'up' : 'down') : '';

            html += `
                <tr>
                    <td style="color:var(--text-muted);">${t.timeStr}</td>
                    <td style="color:#fff;font-weight:700;">${t.ticker}</td>
                    <td class="${t.action === 'BUY' || t.action === 'COVER' ? 'up' : 'down'}">${t.action}</td>
                    <td>${t.shares}</td>
                    <td>$${t.price.toFixed(2)}</td>
                    <td class="${pnlCls}">${pnlStr}</td>
                </tr>
            `;
        }
        this.elTableTrades.innerHTML = html || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No trades executed yet.</td></tr>`;
    }

    _renderNewsTab() {
        let html = "";
        for (const item of this.engine.newsFeed) {
            const badgeCls = item.importance.toLowerCase();
            const sentCls = item.sentiment === "BULLISH" ? "up" : item.sentiment === "BEARISH" ? "down" : "gold";

            html += `
                <div class="news-item">
                    <span class="news-time">${item.timeStr}</span>
                    <span class="news-badge ${badgeCls}">${item.importance}</span>
                    <span class="news-headline">${item.headline}</span>
                    <span class="${sentCls}" style="font-weight:700;font-size:11px;">${item.sentiment}</span>
                </div>
            `;
        }
        this.elNewsList.innerHTML = html;
    }

    // --- Mode Management ---
    showModeModal() {
        this._updateVaultDisplay();
        this._updateTitleBadge();
        this.elModalMode.style.display = "flex";
    }

    _startSoloMode() {
        this.mode = "solo";
        this.elModalMode.style.display = "none";
        this.elTopHeader.style.display = "flex";
        this.elBattleHud.style.display = "none";

        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
        if (this.syncMetricsInterval) clearInterval(this.syncMetricsInterval);

        // Apply solo trading temperature
        const soloTemp = (this.profile && typeof this.profile.trading_temperature === "number") ? this.profile.trading_temperature : 1.0;
        this.engine.setTemperature(soloTemp);
        this._updateModeTempDisplay();
    }

    async _startOnlineMatchmaking(duration = null) {
        const dur = duration || this.selectedDuelDuration || 60;
        this.selectedDuelDuration = dur;
        this.elModalMode.style.display = "none";
        this.elModalMatchmaking.style.display = "flex";

        const durLabel = dur === 60 ? "60s Blitz" : dur === 120 ? "2m Tactical" : "5m Marathon";
        this.elMatchStatusTxt.textContent = `Searching for active ${durLabel} trader...`;

        if (this.wsClient && this.wsClient.isConnected) {
            this.wsClient.joinQueue(
                this.nickname,
                (this.profile && this.profile.equipped_title) ? this.profile.equipped_title : "title_trader",
                (this.profile && this.profile.equipped_animation) ? this.profile.equipped_animation : "money_rain",
                dur
            );
            return;
        }

        // Fallback to Firestore / simulated rival bot if WebSocket server not running
        this.searchAbortCtrl = new AbortController();

        try {
            if (this.fb) this.fb.displayName = this.nickname;
            const myAnim = (this.profile && this.profile.equipped_animation) ? this.profile.equipped_animation : "money_rain";
            const matchData = await this.fb.findMatch(
                (status) => { this.elMatchStatusTxt.textContent = status; },
                this.searchAbortCtrl.signal,
                this.nickname,
                myAnim
            );

            if (!matchData) return;

            matchData.durationSeconds = dur;
            this.elModalMatchmaking.style.display = "none";
            this._enterOnlineMatch(matchData);
        } catch (e) {
            console.error("Matchmaking error:", e);
            this.elMatchStatusTxt.textContent = "Error during matchmaking. Retrying...";
            setTimeout(() => this.showModeModal(), 1500);
        }
    }

    _setupWsListeners() {
        if (!this.wsClient) return;

        this.wsClient.onQueueStatus = (data) => {
            if (this.elMatchStatusTxt) {
                this.elMatchStatusTxt.textContent = data.status || `Searching for 1v1 rival... (Queue: ${data.queueLength})`;
            }
        };

        this.wsClient.onMatchCountdown = (data) => {
            if (this.elModalMatchmaking) this.elModalMatchmaking.style.display = "none";
            if (this.elModalCountdown) {
                this.elModalCountdown.style.display = "flex";
                if (this.elCountdownNum) this.elCountdownNum.textContent = String(data.countdown);
                if (this.elCdPlayerA) this.elCdPlayerA.textContent = this.nickname;
                if (this.elCdPlayerB) this.elCdPlayerB.textContent = data.opponent ? data.opponent.nickname : "Opponent";
                if (this.elCdStockName) this.elCdStockName.textContent = `${data.symbol} • Volatile Live Arena`;
                if (this.elCdDuelFormatPill) {
                    const dur = data.matchDuration || 60;
                    const formatText = dur === 60 ? "60S BLITZ SHOWDOWN" : dur === 120 ? "2M TACTICAL SHOWDOWN" : "5M MARATHON SHOWDOWN";
                    this.elCdDuelFormatPill.textContent = `1V1 LIVE DUEL • ${formatText}`;
                }
            }
            this.sfx.playTick();
        };

        this.wsClient.onMatchStart = (data) => {
            if (this.elModalCountdown) this.elModalCountdown.style.display = "none";
            this.sfx.playBell();
            this._enterWsOnlineMatch(data);
        };

        this.wsClient.onMarketTick = (data) => {
            if (this.mode !== "online" || !this.wsClient || !this.wsClient.inMatch) return;
            this._handleWsMarketTick(data);
        };

        this.wsClient.onPortfolioUpdate = (data) => {
            if (this.mode !== "online" || !this.wsClient || !this.wsClient.inMatch) return;
            this._handleWsPortfolioUpdate(data);
        };

        this.wsClient.onOrderAck = (data) => {
            if (data.success) {
                if (data.side === "BUY" || data.side === "COVER") this.sfx.playBuy();
                else if (data.side === "SELL" || data.side === "SHORT") this.sfx.playSell();
                else this.sfx.playWin();

                if (this.chart) {
                    this.chart.showTradeNotification(data.side, data.shares, data.price, this.activeTicker);
                }
            } else {
                if (this.elEstCost) {
                    this.elEstCost.style.color = "var(--red)";
                    setTimeout(() => { if (this.elEstCost) this.elEstCost.style.color = "var(--text-muted)"; }, 400);
                }
            }
        };

        this.wsClient.onMatchEnd = (data) => {
            if (this.mode === "online") {
                this._finishWsMatch(data);
            }
        };
    }

    _enterWsOnlineMatch(data) {
        this.mode = "online";
        const dur = data.matchDuration || this.selectedDuelDuration || 60;
        this.selectedDuelDuration = dur;
        this.matchData = {
            roomId: data.roomId,
            opponent: {
                name: data.opponent.nickname,
                equipped_title: data.opponent.title,
                equipped_animation: data.opponent.animation
            },
            durationSeconds: dur
        };
        this.matchTimeLeft = dur;
        this.activeTicker = data.symbol || "NVXP";

        if (this.loopTimer) clearTimeout(this.loopTimer);

        this.elTopHeader.style.display = "none";
        this.elBattleHud.style.display = "flex";

        this.elHudMyName.textContent = `YOU (${this.nickname})`;
        this.elHudOppName.textContent = `OPPONENT (${data.opponent.nickname})`;

        const oppTitleEl = document.getElementById("hud-opp-title");
        if (oppTitleEl) {
            oppTitleEl.textContent = (data.opponent.title || "RIVAL").replace("title_", "").toUpperCase();
        }

        if (this.elHudDuelFormat) {
            this.elHudDuelFormat.textContent = dur === 60 ? "60S BLITZ" : dur === 120 ? "2M TACTICAL" : "5M MARATHON";
        }

        this.elHudMyScore.textContent = "$25,000.00 (+0.00%)";
        this.elHudOppScore.textContent = "$25,000.00 (+0.00%)";
        this.elHudLeaderBadge.textContent = "1v1 MATCH STARTED • TIED";
        this.elHudLeaderBadge.className = "hud-leader-badge gold";

        if (this.elHudTugYou) this.elHudTugYou.style.width = "50%";
        if (this.elHudTugOpp) this.elHudTugOpp.style.width = "50%";

        const mins = Math.floor(this.matchTimeLeft / 60);
        const secs = this.matchTimeLeft % 60;
        this.elHudTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (this.engine.stocks[this.activeTicker]) {
            this.engine.stocks[this.activeTicker].price = data.initialPrice;
            this._selectTicker(this.activeTicker);
        }

        this._updateDeskPosition();
    }

    _handleWsMarketTick(data) {
        if (!data || data.ticker !== this.activeTicker) return;

        const price = data.price;
        const change = data.change;
        const changePct = data.changePct;
        const chgSign = change >= 0 ? "+" : "";
        const chgClass = change >= 0 ? "up" : "down";

        if (this.elActivePrice) this.elActivePrice.textContent = `${price.toFixed(2)}`;
        if (this.elActiveChg) {
            this.elActiveChg.textContent = `${chgSign}${change.toFixed(2)} (${chgSign}${changePct.toFixed(2)}%)`;
            this.elActiveChg.className = `active-chg ${chgClass}`;
        }
        if (this.elDeskPrice) this.elDeskPrice.textContent = `${price.toFixed(2)}`;

        const pEl = document.getElementById(`price-${data.ticker}`);
        const pctEl = document.getElementById(`pct-${data.ticker}`);
        if (pEl) pEl.textContent = `${price.toFixed(2)}`;
        if (pctEl) {
            pctEl.textContent = `${chgSign}${changePct.toFixed(2)}%`;
            pctEl.className = `pct ${chgClass}`;
        }

        if (this.chart) {
            this.chart.currentPrice = price;
            if (data.candle) {
                if (this.chart.candles && this.chart.candles.length > 0) {
                    const last = this.chart.candles[this.chart.candles.length - 1];
                    if (Math.abs(last.timestamp - data.candle.timestamp) < 2) {
                        last.high = Math.max(last.high, data.candle.high);
                        last.low = Math.min(last.low, data.candle.low);
                        last.close = data.candle.close;
                        last.volume = data.candle.volume;
                    } else {
                        this.chart.candles.push(data.candle);
                        if (this.chart.candles.length > 80) this.chart.candles.shift();
                    }
                }
            }
            this.chart.render();
        }

        this._updateDeskEstimate();
    }

    _handleWsPortfolioUpdate(data) {
        const you = data.you;
        const opp = data.opponent;
        const timeLeft = data.timeLeft;

        const mins = Math.floor(Math.max(0, timeLeft) / 60);
        const secs = Math.max(0, timeLeft) % 60;
        this.elHudTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const mySign = you.totalPnL >= 0 ? "+" : "";
        this.elHudMyScore.textContent = `${you.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${mySign}${you.totalPnLPct.toFixed(2)}%)`;

        const oppSign = opp.totalPnL >= 0 ? "+" : "";
        this.elHudOppScore.textContent = `${opp.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${oppSign}${opp.totalPnLPct.toFixed(2)}%)`;

        if (this.elHudTugYou && this.elHudTugOpp) {
            const totalEq = Math.max(1, you.equity + opp.equity);
            const youPct = Math.max(10, Math.min(90, (you.equity / totalEq) * 100));
            const oppPct = 100 - youPct;
            this.elHudTugYou.style.width = `${youPct}%`;
            this.elHudTugOpp.style.width = `${oppPct}%`;
        }

        const diff = data.leadDiff;
        if (Math.abs(diff) < 2.0) {
            this.elHudLeaderBadge.textContent = "1v1 MATCH • TIED";
            this.elHudLeaderBadge.className = "hud-leader-badge gold";
        } else if (diff > 0) {
            this.elHudLeaderBadge.textContent = `YOU LEAD BY ${diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            this.elHudLeaderBadge.className = "hud-leader-badge up";
        } else {
            const oppName = opp.nickname || "OPPONENT";
            this.elHudLeaderBadge.textContent = `${oppName} LEADS BY ${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            this.elHudLeaderBadge.className = "hud-leader-badge down";
        }

        if (you.position && you.position.shares !== 0) {
            const pos = you.position;
            const sideStr = pos.shares > 0 ? `LONG ${pos.shares}` : `SHORT ${Math.abs(pos.shares)}`;
            const pnlSign = pos.unrealizedPnL >= 0 ? "+" : "";
            const pnlClass = pos.unrealizedPnL >= 0 ? "up" : "down";

            if (this.elPosShares) this.elPosShares.textContent = sideStr;
            if (this.elPosAvg) this.elPosAvg.textContent = `${pos.avgEntry.toFixed(2)}`;
            if (this.elPosVal) this.elPosVal.textContent = `${pos.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            if (this.elPosPnl) {
                this.elPosPnl.textContent = `${pnlSign}${pos.unrealizedPnL.toFixed(2)} (${pnlSign}${pos.unrealizedPnLPct.toFixed(2)}%)`;
                this.elPosPnl.className = `val ${pnlClass}`;
            }

            if (this.chart) {
                this.chart.setPosition({
                    shares: pos.shares,
                    avgPrice: pos.avgEntry,
                    unrealizedPnL: () => pos.unrealizedPnL,
                    unrealizedPnLPct: () => pos.unrealizedPnLPct
                });
            }
        } else {
            if (this.elPosShares) this.elPosShares.textContent = "0 (FLAT)";
            if (this.elPosAvg) this.elPosAvg.textContent = "$0.00";
            if (this.elPosVal) this.elPosVal.textContent = "$0.00";
            if (this.elPosPnl) {
                this.elPosPnl.textContent = "$0.00 (+0.00%)";
                this.elPosPnl.className = "val";
            }
            if (this.chart) {
                this.chart.setPosition(null);
            }
        }
    }

    _finishWsMatch(data) {
        const won = data.winner === "you";
        const tied = data.winner === "tie";
        const myEq = data.yourFinalEquity;
        const oppEq = data.oppFinalEquity;

        if (myEq > 25000.0) {
            this._bankProfit(myEq - 25000.0);
        }

        let title = tied ? "MATCH COMPLETE: TIED!" : won ? "VICTORY! DEFEATED OPPONENT" : "DEFEAT! OPPONENT WON ROUND";
        if (won) {
            this.profile.duels_won = (this.profile.duels_won || 0) + 1;
            this._saveProfile();
            this.sfx.playWin(this.profile.equipped_sfx);
        }

        this._showMatchEndModal(title, myEq, oppEq);
    }

    startNextOpponent() {
        if (this.wsClient && this.wsClient.isConnected) {
            if (this.elModalMatchEnd) this.elModalMatchEnd.style.display = "none";
            this.elModalMatchmaking.style.display = "flex";
            const dur = this.selectedDuelDuration || 60;
            const durLabel = dur === 60 ? "60s Blitz" : dur === 120 ? "2m Tactical" : "5m Marathon";
            this.elMatchStatusTxt.textContent = `Omegle Skip: Pairing with next ${durLabel} rival...`;
            this.wsClient.nextOpponent(dur);
        } else {
            this._handleNextOpponent();
        }
    }

    _enterOnlineMatch(matchData) {
        this.mode = "online";
        this.matchData = matchData;
        this.matchTimeLeft = matchData.durationSeconds || 180;

        // Reset account to initial $25,000 and seed engine with standard 1.0x temperature
        this.engine.resetAccount(matchData.seed, 1.0);
        this.engine.setTemperature(1.0);
        this.engine.currentDifficulty = "Day Trader (3x)"; // 330ms

        // Switch headers
        this.elTopHeader.style.display = "none";
        this.elBattleHud.style.display = "flex";

        const oppName = (matchData.opponent && matchData.opponent.name) ? matchData.opponent.name : "Opponent";
        this.elHudMyName.textContent = `YOU (${this.nickname})`;
        this.elHudOppName.textContent = `OPPONENT (${oppName})`;

        this._updateHudDisplay(25000.0, 0.0, 0.0, matchData.opponent);

        // Timer interval
        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
        this.matchTimerInterval = setInterval(() => {
            this.matchTimeLeft -= 1;
            const mins = Math.floor(Math.max(0, this.matchTimeLeft) / 60);
            const secs = Math.max(0, this.matchTimeLeft) % 60;
            this.elHudTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (this.matchTimeLeft <= 0) {
                clearInterval(this.matchTimerInterval);
                this._finishMatch();
            }
        }, 1000);

        // Sync metrics interval (every 1.5s)
        if (this.syncMetricsInterval) clearInterval(this.syncMetricsInterval);
        this.syncMetricsInterval = setInterval(async () => {
            const eq = this.engine.totalEquity;
            const pnl = this.engine.totalPnL;
            const pnlPct = this.engine.totalPnLPct;

            const anim = (this.profile && this.profile.equipped_animation) ? this.profile.equipped_animation : "money_rain";
            const oppData = await this.fb.updatePlayerMetrics(eq, pnl, pnlPct, anim);
            if (oppData) {
                this._updateHudDisplay(eq, pnl, pnlPct, oppData);

                if (oppData.status === "forfeited") {
                    clearInterval(this.syncMetricsInterval);
                    clearInterval(this.matchTimerInterval);
                    const currentOppName = (oppData && oppData.name) ? oppData.name : (this.matchData && this.matchData.opponent && this.matchData.opponent.name) ? this.matchData.opponent.name : "Opponent";
                    this._showMatchEndModal(`VICTORY! ${currentOppName} Left the Match`, eq, oppData.equity);
                }
            }
        }, 1500);

        this._updateAllUi();
    }

    _updateHudDisplay(myEq, myPnl, myPnlPct, opp) {
        const mySign = myPnl >= 0 ? "+" : "";
        this.elHudMyScore.textContent = `$${myEq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${mySign}${myPnlPct.toFixed(2)}%)`;

        const oppName = (opp && opp.name) ? opp.name : (this.matchData && this.matchData.opponent && this.matchData.opponent.name) ? this.matchData.opponent.name : "Opponent";
        if (opp && opp.name) {
            this.elHudOppName.textContent = `OPPONENT (${opp.name})`;
            if (this.matchData && this.matchData.opponent) {
                this.matchData.opponent.name = opp.name;
            }
        }
        if (opp && opp.equipped_animation && this.matchData && this.matchData.opponent) {
            this.matchData.opponent.equipped_animation = opp.equipped_animation;
        }

        const oppEq = (opp && opp.equity !== undefined) ? opp.equity : 25000.0;
        const oppPnl = (opp && opp.pnl !== undefined) ? opp.pnl : 0.0;
        const oppPnlPct = (opp && opp.pnl_pct !== undefined) ? opp.pnl_pct : 0.0;
        const oppSign = oppPnl >= 0 ? "+" : "";
        this.elHudOppScore.textContent = `$${oppEq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${oppSign}${oppPnlPct.toFixed(2)}%)`;

        // Leader badge
        const diff = Math.abs(myEq - oppEq);
        if (Math.abs(myEq - oppEq) < 5.0) {
            this.elHudLeaderBadge.textContent = "⚔️ 1v1 MATCH • TIED";
            this.elHudLeaderBadge.className = "hud-leader-badge gold";
        } else if (myEq > oppEq) {
            this.elHudLeaderBadge.textContent = `🔥 YOU LEAD BY $${diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            this.elHudLeaderBadge.className = "hud-leader-badge up";
        } else {
            this.elHudLeaderBadge.textContent = `⚠️ ${oppName} LEADS BY $${diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            this.elHudLeaderBadge.className = "hud-leader-badge down";
        }
    }

    async _finishMatch() {
        if (this.syncMetricsInterval) clearInterval(this.syncMetricsInterval);
        const myEq = this.engine.totalEquity;
        let oppEq = 25000.0;
        try {
            const latestOpp = await this.fb.getLatestOpponentMetrics();
            if (latestOpp && latestOpp.equity !== undefined) {
                if (this.matchData) this.matchData.opponent = latestOpp;
                oppEq = latestOpp.equity;
            } else if (this.matchData && this.matchData.opponent) {
                oppEq = this.matchData.opponent.equity || 25000.0;
            }
        } catch (e) {
            if (this.matchData && this.matchData.opponent) {
                oppEq = this.matchData.opponent.equity || 25000.0;
            }
        }

        // Auto-bank profit above $25,000
        if (myEq > 25000.0) {
            this._bankProfit(myEq - 25000.0);
        }

        const oppName = (this.matchData && this.matchData.opponent && this.matchData.opponent.name) ? this.matchData.opponent.name : "Opponent";
        const oppAnim = (this.matchData && this.matchData.opponent && this.matchData.opponent.equipped_animation) ? this.matchData.opponent.equipped_animation : "money_rain";
        let title = "MATCH COMPLETE: TIED!";
        if (myEq > oppEq) {
            title = `🏆 VICTORY! YOU DEFEATED ${oppName}!`;
            this.profile.duels_won = (this.profile.duels_won || 0) + 1;
            this._saveProfile();
            this.sfx.playWin(this.profile.equipped_sfx);
            if (window.winAnimations) {
                window.winAnimations.play(this.profile.equipped_animation, `🏆 1v1 DUEL VICTORY vs ${oppName}! 🏆`);
            }
        } else if (myEq < oppEq) {
            title = `💀 DEFEAT! ${oppName} WON THIS ROUND!`;
            if (window.winAnimations) {
                window.winAnimations.play(oppAnim, `👑 ${oppName.toUpperCase()} WINS THE DUEL! 👑`);
            }
        }

        this._showMatchEndModal(title, myEq, oppEq);
    }

    _showMatchEndModal(title, myEq, oppEq) {
        this.elEndOutcome.textContent = title;
        this.elEndOutcome.className = `modal-title ${myEq > oppEq ? 'up' : myEq < oppEq ? 'down' : 'gold'}`;

        const myPnl = myEq - 25000.0;
        const oppPnl = oppEq - 25000.0;
        const mySign = myPnl >= 0 ? "+" : "";
        const oppSign = oppPnl >= 0 ? "+" : "";

        let bankedHtml = "";
        if (myEq > 25000.0) {
            bankedHtml = `
                <div class="menu-vault-pill" style="margin: 10px 0;">
                    <span>💰 Banked to Menu Vault: <strong class="up">+${(myEq - 25000).toFixed(2)}</strong></span>
                    <span>New Balance: <strong class="up">$${this.profile.menu_balance.toFixed(2)}</strong></span>
                </div>
            `;
        }

        const oppName = (this.matchData && this.matchData.opponent && this.matchData.opponent.name) ? this.matchData.opponent.name : "Opponent";
        this.elEndDetails.innerHTML = `
            <div style="font-size:15px;margin-bottom:12px;color:var(--text-white);">
                <b>Your Final Balance:</b> $${myEq.toFixed(2)} (${mySign}$${myPnl.toFixed(2)})<br>
                <b>${oppName} Final Balance:</b> $${oppEq.toFixed(2)} (${oppSign}$${oppPnl.toFixed(2)})
            </div>
            ${bankedHtml}
            <p style="color:var(--text-muted);font-size:12px;">Click Next Opponent to jump directly into another live 1v1 showdown!</p>
        `;
        this.elModalMatchEnd.style.display = "flex";
    }

    async _handleNextOpponent() {
        await this.fb.forfeitOrLeave();
        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
        if (this.syncMetricsInterval) clearInterval(this.syncMetricsInterval);
        this._startOnlineMatchmaking();
    }

    async _leaveDuel() {
        if (this.engine.totalEquity > 25000.0) {
            const profit = this.engine.bankProfit();
            if (profit > 0) this._bankProfit(profit);
        }
        await this.fb.forfeitOrLeave();
        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
        if (this.syncMetricsInterval) clearInterval(this.syncMetricsInterval);
        this._startSoloMode();
    }

    _handleReturnToMenu() {
        if (this.engine.totalEquity > 25000.0) {
            const profit = this.engine.bankProfit();
            if (profit > 0) this._bankProfit(profit);
        }
        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
        if (this.syncMetricsInterval) clearInterval(this.syncMetricsInterval);
        this.showModeModal();
    }

    _handleBankProfitClick() {
        const profit = this.engine.bankProfit();
        if (profit > 0) {
            const newBal = this._bankProfit(profit);
            if (window.winAnimations) {
                window.winAnimations.play(this.profile.equipped_animation);
            }
            this.sfx.playWin(this.profile.equipped_sfx);
            this._updateAllUi();
            alert(`🎉 Profit locked in!\n\n+$${profit.toFixed(2)} transferred to your Menu Vault.\nTotal Saved Menu Balance: $${newBal.toFixed(2)}\n\nRound complete! Returning to main menu.`);
            this._handleReturnToMenu();
        }
    }

    // --- Custom Theme & Title Management ---
    _applyTheme() {
        document.body.classList.remove("theme-cyberpunk", "theme-gold-vip");
        if (this.profile.equipped_theme === "theme_cyberpunk") {
            document.body.classList.add("theme-cyberpunk");
        } else if (this.profile.equipped_theme === "theme_gold_vip") {
            document.body.classList.add("theme-gold-vip");
        }

        if (this.chart) {
            if (this.profile.equipped_theme === "theme_cyberpunk") {
                this.chart.colors.up = "#00f0ff";
                this.chart.colors.upWick = "#00f0ff";
                this.chart.colors.down = "#ff007f";
                this.chart.colors.downWick = "#ff007f";
                this.chart.colors.priceLine = "#d946ef";
            } else if (this.profile.equipped_theme === "theme_gold_vip") {
                this.chart.colors.up = "#ffd700";
                this.chart.colors.upWick = "#ffd700";
                this.chart.colors.down = "#e53935";
                this.chart.colors.downWick = "#e53935";
                this.chart.colors.priceLine = "#ffd700";
            } else {
                this.chart.colors.up = "#089981";
                this.chart.colors.upWick = "#089981";
                this.chart.colors.down = "#f23645";
                this.chart.colors.downWick = "#f23645";
                this.chart.colors.priceLine = "#2962ff";
            }
            this.chart.render();
        }
    }

    _updateTitleBadge() {
        const isWhale = this.profile.equipped_title === "title_whale";
        let brandBadge = document.getElementById("hdr-whale-badge");
        if (isWhale) {
            if (!brandBadge) {
                brandBadge = document.createElement("span");
                brandBadge.id = "hdr-whale-badge";
                brandBadge.className = "whale-badge";
                brandBadge.textContent = "🐋 WHALE";
                const brand = document.querySelector("#top-header .brand");
                if (brand) brand.appendChild(brandBadge);
            }
        } else if (brandBadge) {
            brandBadge.remove();
        }

        if (this.elHudMyName) {
            const titlePrefix = isWhale ? "🐋 [WHALE] " : "";
            this.elHudMyName.textContent = `YOU (${titlePrefix}${this.nickname})`;
        }
    }

    // --- Shop System ---
    showShopModal() {
        this._updateVaultDisplay();
        this._renderShopItems();
        if (this.elModalShop) this.elModalShop.style.display = "flex";
    }

    hideShopModal() {
        if (this.elModalShop) this.elModalShop.style.display = "none";
    }

    _updateVaultDisplay() {
        const balStr = `$${this.profile.menu_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (this.elModalVaultBal) this.elModalVaultBal.textContent = balStr;
        if (this.elShopVaultBal) this.elShopVaultBal.textContent = balStr;
    }

    _renderShopItems() {
        if (!this.elShopItemsList) return;
        const items = SHOP_ITEMS.filter(it => this.activeShopCat === "all" || it.category === this.activeShopCat);
        let html = "";
        for (const item of items) {
            const owned = this.profile.inventory.includes(item.id);
            const isEquipped = (
                (item.category === "animation" && this.profile.equipped_animation === item.id) ||
                (item.category === "theme" && this.profile.equipped_theme === item.id) ||
                (item.category === "sfx" && this.profile.equipped_sfx === item.id) ||
                (item.category === "title" && this.profile.equipped_title === item.id)
            );
            const priceStr = item.price === 0 ? "FREE" : `$${item.price.toLocaleString()}`;
            const canAfford = this.profile.menu_balance >= item.price;

            let actionHtml = "";
            if (owned) {
                if (isEquipped) {
                    actionHtml = `<span class="shop-badge-equipped">⭐ EQUIPPED</span>`;
                } else {
                    actionHtml = `<button class="btn-shop-equip" onclick="window.app._handleShopEquip('${item.id}')">Equip</button>`;
                }
            } else {
                if (canAfford) {
                    actionHtml = `<button class="btn-shop-buy" onclick="window.app._handleShopBuy('${item.id}')">Unlock ${priceStr}</button>`;
                } else {
                    const needed = Math.ceil(item.price - this.profile.menu_balance);
                    actionHtml = `<button class="shop-btn-locked" disabled>${priceStr} (Need +$${needed.toLocaleString()})</button>`;
                }
            }

            let previewBtn = "";
            if (item.category === "animation") {
                previewBtn = `<button class="btn-shop-preview" onclick="window.app._previewAnimation('${item.id}')">🎬 Preview</button>`;
            } else if (item.category === "sfx") {
                previewBtn = `<button class="btn-shop-preview" onclick="window.app._previewSfx('${item.id}')">🔊 Preview Audio</button>`;
            } else if (item.category === "theme") {
                previewBtn = `<button class="btn-shop-preview" onclick="window.app._previewTheme('${item.id}')">👁️ Preview Theme</button>`;
            }

            html += `
                <div class="shop-item-card">
                    <div class="shop-item-icon">${item.icon}</div>
                    <div class="shop-item-info">
                        <div class="shop-item-title">${item.name}</div>
                        <div class="shop-item-category">CATEGORY: ${item.category.toUpperCase()}</div>
                        <div class="shop-item-desc">${item.description}</div>
                    </div>
                    <div class="shop-item-actions">
                        ${previewBtn}
                        ${actionHtml}
                    </div>
                </div>
            `;
        }
        this.elShopItemsList.innerHTML = html;
    }

    _handleShopBuy(itemId) {
        const item = SHOP_ITEMS.find(it => it.id === itemId);
        if (!item || this.profile.inventory.includes(itemId)) return;

        if (this.profile.menu_balance < item.price) {
            alert("Insufficient Vault Balance! Bank more trading profits above $25k to unlock this perk.");
            return;
        }

        this.profile.menu_balance = Math.round((this.profile.menu_balance - item.price) * 100) / 100;
        this.profile.inventory.push(itemId);
        if (item.category === "animation") {
            this.profile.equipped_animation = itemId;
        } else if (item.category === "theme") {
            this.profile.equipped_theme = itemId;
            this._applyTheme();
        } else if (item.category === "sfx") {
            this.profile.equipped_sfx = itemId;
        } else if (item.category === "title") {
            this.profile.equipped_title = itemId;
            this._updateTitleBadge();
        }
        this._saveProfile();
        this._updateVaultDisplay();
        this._renderShopItems();
        this.sfx.playBuy();
        alert(`🎉 Unlocked ${item.name}!\nIt has been automatically equipped.`);
    }

    _handleShopEquip(itemId) {
        const item = SHOP_ITEMS.find(it => it.id === itemId);
        if (!item || !this.profile.inventory.includes(itemId)) return;

        if (item.category === "animation") {
            this.profile.equipped_animation = itemId;
        } else if (item.category === "theme") {
            this.profile.equipped_theme = itemId;
            this._applyTheme();
        } else if (item.category === "sfx") {
            this.profile.equipped_sfx = itemId;
            this._previewSfx(itemId);
        } else if (item.category === "title") {
            this.profile.equipped_title = itemId;
            this._updateTitleBadge();
        }
        this._saveProfile();
        this._renderShopItems();
    }

    _previewAnimation(animationId) {
        if (window.winAnimations) {
            window.winAnimations.play(animationId);
        }
    }

    _previewSfx(sfxId) {
        if (sfxId === "sfx_airhorn") {
            this.sfx.playAirhorn();
            this.sfx._playChaChing();
        } else {
            this.sfx.playWin("default");
        }
    }

    _previewTheme(themeId) {
        document.body.classList.remove("theme-cyberpunk", "theme-gold-vip");
        if (themeId === "theme_cyberpunk") {
            document.body.classList.add("theme-cyberpunk");
        } else if (themeId === "theme_gold_vip") {
            document.body.classList.add("theme-gold-vip");
        }
        setTimeout(() => {
            this._applyTheme();
        }, 2800);
    }

    // --- Authentication & Cloud Sync System ---
    _initAuthSession() {
        if (this.profile && this.profile.auth_uid && this.fb) {
            this.fb.setAuthenticatedSession(
                this.profile.auth_uid,
                this.profile.auth_email,
                this.profile.auth_display_name || this.nickname,
                this.profile.auth_id_token,
                this.profile.auth_refresh_token
            );
            this.fb.loadUserProfile(this.profile.auth_uid).then(cloudData => {
                if (cloudData) this.applyCloudData(cloudData);
            }).catch(e => console.warn("[Auth] Auto-sync error:", e));
        }
    }

    _updateAuthUi() {
        if (!this.elTopLeftAuth) return;
        if (this.profile && this.profile.auth_uid) {
            const name = this.nickname || this.profile.auth_display_name || "Trader";
            this.elTopLeftAuth.innerHTML = `
                <button class="btn-ctrl" id="btn-top-auth" style="background:#161a25;color:#00e676;border:1px solid #2a2e39;font-weight:700;padding:6px 12px;border-radius:6px;cursor:pointer;">🟢 ${name}</button>
                <button class="btn-ctrl" id="btn-top-signout" style="background:#1e222d;color:var(--text-muted);border:1px solid #2a2e39;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;">Sign Out</button>
            `;
            const bAuth = document.getElementById("btn-top-auth");
            if (bAuth) bAuth.onclick = () => this._openAuthModal();
            const bOut = document.getElementById("btn-top-signout");
            if (bOut) bOut.onclick = () => this._handleSignOut();
        } else {
            this.elTopLeftAuth.innerHTML = `
                <button class="btn-ctrl" id="btn-top-auth" style="background:#2962ff;color:#fff;font-weight:700;padding:6px 12px;border-radius:6px;cursor:pointer;border:none;">👤 Sign In</button>
            `;
            const bAuth = document.getElementById("btn-top-auth");
            if (bAuth) bAuth.onclick = () => this._openAuthModal();
        }
    }

    _openAuthModal() {
        if (!this.elModalAuth) return;
        this.elModalAuth.style.display = "flex";
        if (this.profile && this.profile.auth_uid) {
            document.getElementById("auth-unauthed-view").style.display = "none";
            document.getElementById("auth-authed-view").style.display = "block";
            const name = this.nickname || this.profile.auth_display_name || "Trader";
            document.getElementById("auth-user-name").textContent = name;
            document.getElementById("auth-user-email").textContent = this.profile.auth_email || "Google Account";
            document.getElementById("auth-vault-bal").textContent = `$${this.profile.menu_balance.toFixed(2)}`;
            document.getElementById("auth-profit-banked").textContent = `$${this.profile.total_profit_banked.toFixed(2)}`;
            document.getElementById("auth-items-count").textContent = `${this.profile.inventory.length} items`;
            document.getElementById("auth-duels-won").textContent = `${this.profile.duels_won || 0}`;
        } else {
            document.getElementById("auth-unauthed-view").style.display = "block";
            document.getElementById("auth-authed-view").style.display = "none";
            if (this.elAuthStatusMsg) this.elAuthStatusMsg.style.display = "none";
        }
    }

    _setAuthTab(mode) {
        this.authMode = mode;
        if (mode === "signin") {
            if (this.elTabAuthSignin) {
                this.elTabAuthSignin.style.background = "#2962ff";
                this.elTabAuthSignin.style.color = "#fff";
            }
            if (this.elTabAuthSignup) {
                this.elTabAuthSignup.style.background = "transparent";
                this.elTabAuthSignup.style.color = "var(--text-muted)";
            }
            if (this.elAuthGroupNick) this.elAuthGroupNick.style.display = "none";
            if (this.elBtnAuthSubmit) this.elBtnAuthSubmit.textContent = "Sign In";
        } else {
            if (this.elTabAuthSignup) {
                this.elTabAuthSignup.style.background = "#2962ff";
                this.elTabAuthSignup.style.color = "#fff";
            }
            if (this.elTabAuthSignin) {
                this.elTabAuthSignin.style.background = "transparent";
                this.elTabAuthSignin.style.color = "var(--text-muted)";
            }
            if (this.elAuthGroupNick) this.elAuthGroupNick.style.display = "block";
            if (this.elBtnAuthSubmit) this.elBtnAuthSubmit.textContent = "Create Account";
        }
        if (this.elAuthStatusMsg) this.elAuthStatusMsg.style.display = "none";
    }

    async _handleGoogleSignIn() {
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                alert("Firebase Auth SDK is loading or unavailable. Check network connection.");
                return;
            }
            const apiKey = (this.fb && this.fb.apiKey) || "AIzaSyAPXfhZrr1vndo_2xge6DxVyyGEFHQaIPY";
            const projectId = (this.fb && this.fb.projectId) || "tradisim-188a6";
            const authDomain = (this.fb && this.fb.authDomain) || "tradisim-188a6.firebaseapp.com";
            const firebaseConfig = { apiKey, projectId, authDomain };

            if (firebase.apps && firebase.apps.length > 0) {
                const cur = firebase.app();
                if (!cur.options || !cur.options.authDomain) {
                    await cur.delete();
                    firebase.initializeApp(firebaseConfig);
                }
            } else {
                firebase.initializeApp(firebaseConfig);
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            const res = await firebase.auth().signInWithPopup(provider);
            const user = res.user;
            const idToken = await user.getIdToken();
            await this._handleAuthSuccess(
                user.uid,
                user.email || "",
                user.displayName || "",
                idToken,
                user.refreshToken || ""
            );
        } catch (e) {
            console.error("[Google Auth Error]:", e);
            if (this.elAuthStatusMsg) {
                let msg = e.message || "Google sign in failed.";
                if (e.code === 'auth/popup-closed-by-user') {
                    msg = "Google sign-in popup was closed.";
                }
                this.elAuthStatusMsg.textContent = msg;
                this.elAuthStatusMsg.style.display = "block";
            }
        }
    }

    async _handleAuthSubmit() {
        const email = this.elAuthInputEmail ? this.elAuthInputEmail.value.trim() : "";
        const pass = this.elAuthInputPass ? this.elAuthInputPass.value : "";
        const nick = this.elAuthInputNick ? this.elAuthInputNick.value.trim() : "";

        if (!email || !pass) {
            if (this.elAuthStatusMsg) {
                this.elAuthStatusMsg.textContent = "Please enter both email and password.";
                this.elAuthStatusMsg.style.display = "block";
            }
            return;
        }

        if (this.elBtnAuthSubmit) {
            this.elBtnAuthSubmit.disabled = true;
            this.elBtnAuthSubmit.textContent = "Connecting...";
        }

        try {
            let res;
            if (this.authMode === "signup") {
                res = await this.fb.signUpEmail(email, pass, nick);
            } else {
                res = await this.fb.signInEmail(email, pass);
            }

            if (res.success && res.data) {
                await this._handleAuthSuccess(
                    res.data.localId,
                    email,
                    nick || res.data.displayName || "",
                    res.data.idToken,
                    res.data.refreshToken || ""
                );
            } else {
                if (this.elAuthStatusMsg) {
                    this.elAuthStatusMsg.textContent = res.error || "Authentication failed.";
                    this.elAuthStatusMsg.style.display = "block";
                }
            }
        } catch (e) {
            if (this.elAuthStatusMsg) {
                this.elAuthStatusMsg.textContent = e.message || "Error connecting to server.";
                this.elAuthStatusMsg.style.display = "block";
            }
        } finally {
            if (this.elBtnAuthSubmit) {
                this.elBtnAuthSubmit.disabled = false;
                this.elBtnAuthSubmit.textContent = this.authMode === "signup" ? "Create Account" : "Sign In";
            }
        }
    }

    async _handleAuthSuccess(uid, email, displayName, idToken, refreshToken) {
        this.profile.auth_uid = uid;
        this.profile.auth_email = email;
        this.profile.auth_display_name = displayName;
        this.profile.auth_id_token = idToken;
        this.profile.auth_refresh_token = refreshToken;

        if (displayName && (!this.profile.player_name || this.profile.player_name.startsWith("Trader_"))) {
            this.profile.player_name = displayName;
            this.nickname = displayName;
            localStorage.setItem("trader_nickname", this.nickname);
            if (this.elNicknameInput) this.elNicknameInput.value = this.nickname;
        }

        if (this.fb) {
            this.fb.setAuthenticatedSession(uid, email, displayName, idToken, refreshToken);
        }

        // Pull existing cloud profile
        const cloudData = await this.fb.loadUserProfile(uid);
        if (cloudData) {
            this.applyCloudData(cloudData);
        } else {
            await this.syncToCloud();
        }

        this._saveProfile();
        this._updateAuthUi();
        if (this.elModalAuth) this.elModalAuth.style.display = "none";

        // Check if opened from desktop app via ?port=
        const urlParams = new URLSearchParams(window.location.search);
        const desktopPort = urlParams.get('port');
        if (desktopPort) {
            const authPayload = { uid, email, displayName, idToken, refreshToken };
            try {
                fetch(`http://127.0.0.1:${desktopPort}/callback`, {
                    method: 'POST',
                    mode: 'cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(authPayload)
                }).catch(() => {});
            } catch (e) {}
            setTimeout(() => {
                window.location.href = `http://127.0.0.1:${desktopPort}/callback?data=${encodeURIComponent(JSON.stringify(authPayload))}`;
            }, 300);
            return;
        }

        alert(`Welcome, ${this.nickname}!\nAll your progress (name, balance, and shop items) is securely synced.`);
    }

    _handleSignOut() {
        if (!confirm("Are you sure you want to sign out?")) return;
        this.profile.auth_uid = "";
        this.profile.auth_email = "";
        this.profile.auth_display_name = "";
        this.profile.auth_id_token = "";
        this.profile.auth_refresh_token = "";
        if (this.fb) this.fb.signOut();
        this._saveProfile(false);
        this._updateAuthUi();
        if (this.elModalAuth) this.elModalAuth.style.display = "none";
        alert("You have signed out. Progress is now stored locally.");
    }

    async _handleManualSync() {
        if (!this.profile.auth_uid || !this.fb) return;
        const cloudData = await this.fb.loadUserProfile(this.profile.auth_uid);
        if (cloudData) this.applyCloudData(cloudData);
        await this.syncToCloud();
        this._updateVaultDisplay();
        alert("All progress has been synchronized with the cloud!");
    }

    // --- Trading Engine Settings & Temperature ---
    _openSettingsModal() {
        const temp = (this.profile && typeof this.profile.trading_temperature === "number") ? this.profile.trading_temperature : 1.0;
        if (this.elTempSlider) this.elTempSlider.value = temp;
        this._updateSettingsMetrics(temp);
        if (this.elModalSettings) this.elModalSettings.style.display = "flex";
    }

    _onTempSliderInput(temp) {
        const val = Math.max(0.2, Math.min(3.0, Number(temp) || 1.0));
        if (this.elTempSlider) this.elTempSlider.value = val;
        this._updateSettingsMetrics(val);
        if (this.mode === "solo") {
            this.engine.setTemperature(val);
        }
    }

    _applyTempPreset(temp) {
        if (this.elTempSlider) this.elTempSlider.value = temp;
        this._onTempSliderInput(temp);
    }

    _updateSettingsMetrics(temp) {
        const t = Number(temp);
        if (this.elTempVal) this.elTempVal.textContent = `${t.toFixed(2)}x`;

        // Update active preset button highlight
        if (this.elModalSettings) {
            const presetBtns = this.elModalSettings.querySelectorAll(".btn-preset");
            presetBtns.forEach(btn => {
                const bTemp = parseFloat(btn.dataset.temp);
                if (Math.abs(bTemp - t) < 0.03) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
        }

        let badgeTxt = "⚖️ Standard Engine (Balanced)";
        let badgeColor = "#00e676";
        let badgeBg = "#1a2e22";
        let spikesTxt = "Standard intraday noise";
        let newsTxt = "Standard market catalyst shocks";
        let realismTxt = "Authentic Day Trading Sim";

        if (t < 0.60) {
            badgeTxt = "🥶 Ultra Calm & Realistic (Low Vol)";
            badgeColor = "#3d72ff";
            badgeBg = "#132347";
            spikesTxt = "Minimal & tight spreads";
            newsTxt = "Subdued & orderly reactions";
            realismTxt = "Maximum Realism (Blue-Chip Institutional)";
        } else if (t < 0.90) {
            badgeTxt = "😌 Smooth Trending (Institutional)";
            badgeColor = "#00e676";
            badgeBg = "#143324";
            spikesTxt = "Gentle spreads & calm noise";
            newsTxt = "Moderate catalyst drift";
            realismTxt = "Orderly Institutional Market";
        } else if (t <= 1.20) {
            badgeTxt = "⚖️ Standard Engine (Balanced Day Trading)";
            badgeColor = "#00e676";
            badgeBg = "#1a2e22";
            spikesTxt = "Standard intraday noise";
            newsTxt = "Standard market catalyst shocks";
            realismTxt = "Authentic Day Trading Sim";
        } else if (t <= 1.80) {
            badgeTxt = "🔥 High Volatility (Sharp Swings)";
            badgeColor = "#ff9100";
            badgeBg = "#3d2700";
            spikesTxt = "Frequent momentum spikes";
            newsTxt = "Spicy amplified breakouts";
            realismTxt = "High Adrenaline Action";
        } else {
            badgeTxt = "⚡ Maximum Chaos (Extreme Degenerate)";
            badgeColor = "#ff5252";
            badgeBg = "#3d1419";
            spikesTxt = "Violent erratic micro-jumps";
            newsTxt = "Wild supernova catalyst shocks";
            realismTxt = "Extreme Chaos / Crypto Arena";
        }

        if (this.elTempVal) this.elTempVal.style.color = badgeColor;
        if (this.elTempBadge) {
            this.elTempBadge.textContent = badgeTxt;
            this.elTempBadge.style.color = badgeColor;
            this.elTempBadge.style.background = badgeBg;
            this.elTempBadge.style.borderColor = badgeColor;
        }

        const volPct = Math.round(t * 100);
        if (this.elMetricVol) this.elMetricVol.textContent = `${volPct}% of baseline`;
        if (this.elMetricSpikes) {
            this.elMetricSpikes.textContent = spikesTxt;
            this.elMetricSpikes.style.color = badgeColor;
        }
        if (this.elMetricNews) {
            this.elMetricNews.textContent = newsTxt;
            this.elMetricNews.style.color = badgeColor;
        }
        if (this.elMetricRealism) {
            this.elMetricRealism.textContent = realismTxt;
            this.elMetricRealism.style.color = badgeColor;
        }
    }

    _saveSettings() {
        const sliderVal = this.elTempSlider ? parseFloat(this.elTempSlider.value) : this.engine.getTemperature();
        const val = Math.max(0.2, Math.min(3.0, sliderVal || 1.0));
        this.profile.trading_temperature = Number(val.toFixed(2));
        this._saveProfile();
        if (this.mode === "solo") {
            this.engine.setTemperature(this.profile.trading_temperature);
        }
        this._updateModeTempDisplay();
        if (this.elModalSettings) this.elModalSettings.style.display = "none";
    }

    _updateModeTempDisplay() {
        const temp = (this.profile && typeof this.profile.trading_temperature === "number") ? this.profile.trading_temperature : 1.0;
        if (this.elModeTempTag) {
            this.elModeTempTag.textContent = `⚙️ Temp: ${temp.toFixed(2)}x`;
        }
    }

    _initBottomPanelResizable() {
        if (!this.elBottomPanel || !this.elBottomResizer) return;

        const DEFAULT_HEIGHT = 210;
        this.bottomPanelDefaultHeight = DEFAULT_HEIGHT;
        this.bottomPanelLastHeight = DEFAULT_HEIGHT;

        // Apply saved preference if any; default remains 210px
        let savedHeight = null;
        let savedCollapsed = null;
        try {
            savedHeight = localStorage.getItem("tradesim_bottom_height");
            savedCollapsed = localStorage.getItem("tradesim_bottom_collapsed");
        } catch (_) {}

        if (savedCollapsed === "1") {
            if (savedHeight && !isNaN(Number(savedHeight)) && Number(savedHeight) > 30) {
                this.bottomPanelLastHeight = Number(savedHeight);
            }
            this.setBottomPanelHeight(0, { animate: false, save: false });
        } else if (savedHeight && !isNaN(Number(savedHeight))) {
            const h = Number(savedHeight);
            const winH = (typeof window !== "undefined" && window.innerHeight) ? window.innerHeight : 800;
            const maxH = Math.max(100, winH - 180);
            const clamped = Math.min(Math.max(0, h), maxH);
            this.bottomPanelLastHeight = clamped > 30 ? clamped : DEFAULT_HEIGHT;
            this.setBottomPanelHeight(clamped, { animate: false, save: false });
        } else {
            // Keep default 210px
            this.setBottomPanelHeight(DEFAULT_HEIGHT, { animate: false, save: false });
        }

        // Pointer drag event listeners on bottom resizer
        let isDragging = false;
        let startY = 0;
        let startHeight = 0;
        let hasMoved = false;

        const onPointerDown = (e) => {
            if (e.target && (e.target.id === "btn-resizer-reset" || (e.target.closest && e.target.closest("#btn-resizer-reset")))) {
                return;
            }

            isDragging = true;
            hasMoved = false;
            startY = e.clientY;
            const rect = this.elBottomPanel.getBoundingClientRect ? this.elBottomPanel.getBoundingClientRect() : { height: DEFAULT_HEIGHT };
            startHeight = rect.height;

            if (this.elBottomResizer.setPointerCapture && e.pointerId !== undefined) {
                try { this.elBottomResizer.setPointerCapture(e.pointerId); } catch (_) {}
            }
            if (this.elBottomResizer.classList) this.elBottomResizer.classList.add("is-dragging");
            if (document.body && document.body.classList) {
                document.body.classList.add("resizing-bottom-panel");
            }
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;

            const deltaY = e.clientY - startY;
            if (Math.abs(deltaY) > 3) {
                hasMoved = true;
            }

            const winH = (typeof window !== "undefined" && window.innerHeight) ? window.innerHeight : 800;
            const maxHeight = Math.max(100, winH - 180);
            const newHeight = startHeight - deltaY;

            if (newHeight <= 25) {
                // Shrink completely
                this.setBottomPanelHeight(0, { animate: false, save: false });
            } else {
                const clamped = Math.min(newHeight, maxHeight);
                this.setBottomPanelHeight(clamped, { animate: false, save: false });
            }
        };

        const onPointerUp = (e) => {
            if (!isDragging) return;
            isDragging = false;

            if (this.elBottomResizer.classList) this.elBottomResizer.classList.remove("is-dragging");
            if (document.body && document.body.classList) {
                document.body.classList.remove("resizing-bottom-panel");
            }

            if (this.elBottomResizer.releasePointerCapture && e.pointerId !== undefined) {
                try { this.elBottomResizer.releasePointerCapture(e.pointerId); } catch (_) {}
            }

            // If user clicked the collapsed bar without dragging, restore it
            if (!hasMoved) {
                if (this.elBottomPanel.classList && this.elBottomPanel.classList.contains("is-collapsed")) {
                    this.setBottomPanelHeight(this.bottomPanelLastHeight || DEFAULT_HEIGHT, { animate: true, save: true });
                    return;
                }
            }

            // Save final height
            const rect = this.elBottomPanel.getBoundingClientRect ? this.elBottomPanel.getBoundingClientRect() : { height: DEFAULT_HEIGHT };
            const finalHeight = rect.height;
            if (finalHeight <= 25) {
                this.setBottomPanelHeight(0, { animate: false, save: true });
            } else {
                this.setBottomPanelHeight(finalHeight, { animate: false, save: true });
            }
        };

        if (this.elBottomResizer.addEventListener) {
            this.elBottomResizer.addEventListener("pointerdown", onPointerDown);
            this.elBottomResizer.addEventListener("pointermove", onPointerMove);
            this.elBottomResizer.addEventListener("pointerup", onPointerUp);
            this.elBottomResizer.addEventListener("pointercancel", onPointerUp);

            // Double-click on resizer resets to 210px default
            this.elBottomResizer.addEventListener("dblclick", (e) => {
                if (e.target && (e.target.id === "btn-resizer-reset" || (e.target.closest && e.target.closest("#btn-resizer-reset")))) return;
                this.setBottomPanelHeight(DEFAULT_HEIGHT, { animate: true, save: true });
            });
        }

        // Toggle button in tab nav
        if (this.elBtnBottomToggle && this.elBtnBottomToggle.addEventListener) {
            this.elBtnBottomToggle.addEventListener("click", () => {
                const isCollapsed = this.elBottomPanel.classList && this.elBottomPanel.classList.contains("is-collapsed");
                if (isCollapsed) {
                    this.setBottomPanelHeight(this.bottomPanelLastHeight || DEFAULT_HEIGHT, { animate: true, save: true });
                } else {
                    this.setBottomPanelHeight(0, { animate: true, save: true });
                }
            });
        }

        // Reset button in tab nav
        if (this.elBtnBottomReset && this.elBtnBottomReset.addEventListener) {
            this.elBtnBottomReset.addEventListener("click", () => {
                this.setBottomPanelHeight(DEFAULT_HEIGHT, { animate: true, save: true });
            });
        }

        // Reset button in collapsed banner
        if (this.elBtnResizerReset && this.elBtnResizerReset.addEventListener) {
            this.elBtnResizerReset.addEventListener("click", (e) => {
                if (e.stopPropagation) e.stopPropagation();
                this.setBottomPanelHeight(DEFAULT_HEIGHT, { animate: true, save: true });
            });
        }
    }

    setBottomPanelHeight(height, { animate = false, save = true } = {}) {
        if (!this.elBottomPanel || !this.elBottomResizer) return;

        const DEFAULT_HEIGHT = 210;
        const isShrunkCompletely = height <= 25;

        if (animate && this.elBottomPanel.classList) {
            this.elBottomPanel.classList.add("transitioning");
            setTimeout(() => {
                if (this.elBottomPanel.classList) {
                    this.elBottomPanel.classList.remove("transitioning");
                }
                if (this.chart && typeof this.chart.resize === "function") {
                    this.chart.resize();
                }
            }, 220);
        }

        if (isShrunkCompletely) {
            this.elBottomPanel.style.height = "0px";
            if (this.elBottomPanel.classList) this.elBottomPanel.classList.add("is-collapsed");
            if (this.elBottomResizer.classList) this.elBottomResizer.classList.add("is-collapsed");
            if (this.elBtnBottomToggle) {
                this.elBtnBottomToggle.innerHTML = "▲";
                this.elBtnBottomToggle.title = "Expand bottom panel";
            }
            if (save) {
                try {
                    localStorage.setItem("tradesim_bottom_collapsed", "1");
                } catch (_) {}
            }
        } else {
            const h = Math.round(height);
            this.bottomPanelLastHeight = h;
            this.elBottomPanel.style.height = `${h}px`;
            if (this.elBottomPanel.classList) this.elBottomPanel.classList.remove("is-collapsed");
            if (this.elBottomResizer.classList) this.elBottomResizer.classList.remove("is-collapsed");
            if (this.elBtnBottomToggle) {
                this.elBtnBottomToggle.innerHTML = "▼";
                this.elBtnBottomToggle.title = "Minimize / Shrink bottom panel completely";
            }
            if (save) {
                try {
                    localStorage.setItem("tradesim_bottom_height", String(h));
                    localStorage.removeItem("tradesim_bottom_collapsed");
                } catch (_) {}
            }
        }

        if (this.chart && typeof this.chart.resize === "function") {
            this.chart.resize();
        }
    }

}

// Global initialization
let app = null;
window.addEventListener("DOMContentLoaded", () => {
    app = new TradingApp();
    window.app = app;
});
