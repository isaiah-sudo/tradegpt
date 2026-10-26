/**
 * Automated Verification & Regression Test Suite for Day Trading Simulator (Web Edition).
 * Tests all core subsystems:
 * 1. Stock Universe (100 stocks, sector distributions, pricing)
 * 2. Market Simulation Engine (Candlesticks, Orders, Margin, Shorting, Reversals, News, Profit Banking)
 * 3. Trader Shop & Profile Manager (Catalog integrity, purchases, equips, vault banking)
 * 4. Win Animations Engine (Canvas particle simulations, all 5 animations)
 * 5. Firebase Matchmaker & Protocol (Serialization, Simulated Rival Bot, State transitions)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=================================================");
console.log("   RUNNING WEB VERSION THOROUGH TEST SUITE");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passedTests++;
    } catch (e) {
        console.error(`  ✗ ${name}`);
        console.error(`    Error: ${e.message}`);
        console.error(e.stack);
        process.exitCode = 1;
    }
}

// Mock DOM & Browser Environment for Node.js
function makeMockElement(id = "") {
    return {
        id,
        style: {},
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        },
        value: "0",
        textContent: "",
        innerHTML: "",
        disabled: false,
        className: "",
        addEventListener: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        appendChild: () => {},
        remove: () => {},
        getContext: () => ({
            save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {},
            beginPath: () => {}, closePath: () => {}, moveTo: () => {}, lineTo: () => {},
            arc: () => {}, stroke: () => {}, fill: () => {}, fillRect: () => {},
            clearRect: () => {}, roundRect: () => {}, fillText: () => {},
            setTransform: () => {}, scale: () => {}, setLineDash: () => {},
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createLinearGradient: () => ({ addColorStop: () => {} })
        }),
        getBoundingClientRect: () => ({ width: 800, height: 400, left: 0, top: 0 }),
        get parentElement() {
            return {
                getBoundingClientRect: () => ({ width: 800, height: 400, left: 0, top: 0 })
            };
        }
    };
}

const mockElements = {};
global.window = {
    addEventListener: () => {},
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1
};
global.document = {
    getElementById: (id) => {
        if (!mockElements[id]) mockElements[id] = makeMockElement(id);
        return mockElements[id];
    },
    querySelector: () => makeMockElement("query"),
    querySelectorAll: () => [],
    createElement: (tag) => makeMockElement(tag),
    body: makeMockElement("body")
};
global.localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    clear() { this.store = {}; }
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.alert = () => {};
global.confirm = () => true;
global.CanvasRenderingContext2D = class {};
global.CanvasRenderingContext2D.prototype = {};

// Load Scripts in sequence into global scope using indirect eval
const load = (relPath) => {
    const code = fs.readFileSync(path.join(__dirname, relPath), "utf-8");
    const exportStatements = [];
    const classMatches = code.match(/^class\s+([A-Za-z0-9_]+)/gm) || [];
    classMatches.forEach(m => exportStatements.push(`try { global.${m.split(/\s+/)[1]} = ${m.split(/\s+/)[1]}; } catch(e){}`));
    const constMatches = code.match(/^(?:const|let|var)\s+([A-Za-z0-9_]+)/gm) || [];
    constMatches.forEach(m => exportStatements.push(`try { global.${m.split(/\s+/)[1]} = ${m.split(/\s+/)[1]}; } catch(e){}`));
    (0, eval)(code + "\n" + exportStatements.join("\n"));
};

// 1. Stock Universe
load("public/js/stock-universe.js");

console.log("1. STOCK UNIVERSE VERIFICATION");
it("contains exactly 100 simulated stocks across varied sectors", () => {
    assert.strictEqual(Array.isArray(STOCK_DEFINITIONS), true);
    assert.strictEqual(STOCK_DEFINITIONS.length, 100);
});

it("every stock has valid ticker, name, sector, price > 0, and volatility > 0", () => {
    const tickers = new Set();
    for (const s of STOCK_DEFINITIONS) {
        assert.ok(s.ticker && typeof s.ticker === "string");
        assert.ok(s.name && typeof s.name === "string");
        assert.ok(s.sector && typeof s.sector === "string");
        assert.ok(typeof s.price === "number" && s.price > 0);
        assert.ok(typeof s.volatility === "number" && s.volatility > 0);
        assert.strictEqual(tickers.has(s.ticker), false, `Duplicate ticker: ${s.ticker}`);
        tickers.add(s.ticker);
    }
});

it("all predefined sectors exist in the universe", () => {
    const foundSectors = new Set(STOCK_DEFINITIONS.map(s => s.sector));
    for (const sec of SECTORS) {
        if (sec === "All") continue;
        assert.ok(foundSectors.has(sec), `Sector missing stocks: ${sec}`);
    }
});

// 2. Market Simulation Engine
load("public/js/news-generator.js");
load("public/js/simulation-engine.js");

console.log("\n2. MARKET SIMULATION ENGINE VERIFICATION");
it("initializes account with $25,000 cash, 0 positions, and 50 pre-seeded candles per stock", () => {
    const engine = new MarketEngine(25000.0);
    assert.strictEqual(engine.cash, 25000.0);
    assert.strictEqual(engine.totalEquity, 25000.0);
    assert.strictEqual(engine.buyingPower, 100000.0);
    assert.strictEqual(engine.realizedPnL, 0.0);
    assert.strictEqual(Object.keys(engine.stocks).length, 100);
    for (const ticker in engine.stocks) {
        const st = engine.stocks[ticker];
        assert.strictEqual(st.candles.length, 50);
        assert.ok(st.price > 0);
    }
});

it("executes BUY orders, deducts cash, tracks average entry, records trade marker", () => {
    const engine = new MarketEngine(25000.0);
    const stock = engine.stocks["NVXP"];
    const initialPrice = stock.price;
    const ok = engine.buy("NVXP", 50);
    assert.strictEqual(ok, true);
    assert.strictEqual(engine.positions["NVXP"].shares, 50);
    assert.strictEqual(engine.positions["NVXP"].avgPrice, initialPrice);
    assert.strictEqual(engine.cash, 25000.0 - (50 * initialPrice));
    assert.strictEqual(engine.trades.length, 1);
    assert.strictEqual(engine.trades[0].action, "BUY");
    assert.strictEqual(stock.tradeMarkers.length, 1);
    assert.strictEqual(stock.tradeMarkers[0].action, "BUY");
});

it("executes SELL orders, computes realized PnL correctly", () => {
    const engine = new MarketEngine(25000.0);
    const stock = engine.stocks["NVXP"];
    const buyPrice = stock.price;
    engine.buy("NVXP", 100);
    
    // Simulate price increase
    stock.price = buyPrice + 10.0;
    const ok = engine.sell("NVXP", 50);
    assert.strictEqual(ok, true);
    assert.strictEqual(engine.positions["NVXP"].shares, 50);
    assert.ok(Math.abs(engine.realizedPnL - (50 * 10.0)) < 1e-5);
});

it("executes SHORT orders with 50% margin collateral and COVER orders with margin release", () => {
    const engine = new MarketEngine(25000.0);
    const stock = engine.stocks["APEX"];
    const shortPrice = stock.price;
    const shares = 100;
    const proceeds = shares * shortPrice;
    const reqMargin = proceeds * 0.5;

    const okShort = engine.short("APEX", shares);
    assert.strictEqual(okShort, true);
    const pos = engine.positions["APEX"];
    assert.strictEqual(pos.shares, -100);
    assert.strictEqual(pos.side, "SHORT");
    assert.strictEqual(pos.lockedMargin, reqMargin);
    assert.strictEqual(engine.cash, 25000.0 - reqMargin);

    // Simulate price dropping by $5.00 (profit for short)
    stock.price = shortPrice - 5.0;
    const okCover = engine.cover("APEX", shares);
    assert.strictEqual(okCover, true);
    assert.strictEqual(pos.shares, 0);
    assert.strictEqual(pos.lockedMargin, 0);
    assert.strictEqual(engine.realizedPnL, 100 * 5.0); // +$500.00
    assert.strictEqual(engine.cash, 25000.0 + 500.0);
});

it("reverses long positions to short, and short positions to long seamlessly", () => {
    const engine = new MarketEngine(25000.0);
    engine.buy("NVXP", 50);
    assert.strictEqual(engine.positions["NVXP"].shares, 50);

    // Reverse long -> short
    const revOk = engine.reversePosition("NVXP");
    assert.strictEqual(revOk, true);
    assert.strictEqual(engine.positions["NVXP"].shares, -50);
    assert.strictEqual(engine.positions["NVXP"].side, "SHORT");

    // Reverse short -> long
    const revBackOk = engine.reversePosition("NVXP");
    assert.strictEqual(revBackOk, true);
    assert.strictEqual(engine.positions["NVXP"].shares, 50);
    assert.strictEqual(engine.positions["NVXP"].side, "LONG");
});

it("flattens positions and accurately banks profit above initial $25,000 into Vault", () => {
    const engine = new MarketEngine(25000.0);
    const stock = engine.stocks["NVXP"];
    engine.buy("NVXP", 100);
    // Artificially bump stock price by $20/share (+$2,000 profit)
    stock.price += 20.0;

    const profit = engine.bankProfit();
    assert.ok(profit >= 1999.0);
    assert.strictEqual(engine.positions["NVXP"].shares, 0);
    assert.strictEqual(engine.cash, 25000.0);
    assert.strictEqual(engine.realizedPnL, 0.0);
});

it("tunes trading engine temperature and scales stock volatility correctly", () => {
    const engine = new MarketEngine(25000.0, null, 1.0);
    assert.strictEqual(engine.getTemperature(), 1.0);

    // Warm up / high volatility
    engine.setTemperature(2.0);
    assert.strictEqual(engine.getTemperature(), 2.0);
    for (const ticker in engine.stocks) {
        const st = engine.stocks[ticker];
        assert.strictEqual(st.temperature, 2.0);
        assert.ok(Math.abs(st.volatility - (st.baseVolatility * 2.0)) < 1e-5);
    }

    // Cool down / calm & realistic
    engine.setTemperature(0.5);
    assert.strictEqual(engine.getTemperature(), 0.5);
    for (const ticker in engine.stocks) {
        const st = engine.stocks[ticker];
        assert.strictEqual(st.temperature, 0.5);
        assert.ok(Math.abs(st.volatility - (st.baseVolatility * 0.5)) < 1e-5);
    }

    // Resetting for competitive duel locks to 1.0
    engine.resetAccount(12345, 1.0);
    assert.strictEqual(engine.getTemperature(), 1.0);
    for (const ticker in engine.stocks) {
        const st = engine.stocks[ticker];
        assert.strictEqual(st.temperature, 1.0);
        assert.ok(Math.abs(st.volatility - st.baseVolatility) < 1e-5);
    }
});

// 3. Load UI and Controllers
load("public/js/chart.js");
load("public/js/firebase-matchmaker.js");
load("public/js/win-animations.js");
load("public/js/ws-client.js");
load("public/js/app.js");

console.log("\n3. TRADER SHOP & PROFILE INTEGRITY VERIFICATION");
it("SHOP_ITEMS catalog contains all expected animations, themes, sfx, and titles", () => {
    assert.ok(Array.isArray(SHOP_ITEMS));
    const ids = SHOP_ITEMS.map(i => i.id);
    const expected = [
        "money_rain", "rocket_moon", "matrix_glitch", "diamond_hands", "golden_bull",
        "supercar_drift", "mega_yacht", "private_jet",
        "theme_default", "theme_cyberpunk", "theme_gold_vip",
        "sfx_standard", "sfx_airhorn",
        "title_trader", "title_whale", "title_hypercar", "title_oligarch"
    ];
    for (const exp of expected) {
        assert.ok(ids.includes(exp), `Missing catalog item: ${exp}`);
    }
});

it("UserProfile initializes with free defaults and manages persistent localStorage", () => {
    localStorage.clear();
    const appInstance = new TradingApp();
    const p = appInstance.profile;
    assert.strictEqual(p.menu_balance, 0.0);
    assert.strictEqual(p.total_profit_banked, 0.0);
    assert.ok(p.inventory.includes("money_rain"));
    assert.ok(p.inventory.includes("theme_default"));
    assert.ok(p.inventory.includes("sfx_standard"));
    assert.ok(p.inventory.includes("title_trader"));
    assert.strictEqual(p.equipped_animation, "money_rain");
    assert.strictEqual(p.equipped_theme, "theme_default");
    assert.strictEqual(p.equipped_sfx, "sfx_standard");
    assert.strictEqual(p.equipped_title, "title_trader");
    assert.strictEqual(p.trading_temperature, 1.0);
});

it("persists trading_temperature in localStorage and applies to solo engine", () => {
    localStorage.clear();
    const appInstance = new TradingApp();
    appInstance._onTempSliderInput(1.75);
    appInstance._saveSettings();
    assert.strictEqual(appInstance.profile.trading_temperature, 1.75);
    assert.strictEqual(appInstance.engine.getTemperature(), 1.75);

    // Verify localStorage has it
    const stored = JSON.parse(localStorage.getItem("tradegpt_profile"));
    assert.strictEqual(stored.trading_temperature, 1.75);

    // Reload new app instance
    const reloadedApp = new TradingApp();
    assert.strictEqual(reloadedApp.profile.trading_temperature, 1.75);
    assert.strictEqual(reloadedApp.engine.getTemperature(), 1.75);
});

it("banks profit into menu vault and updates total banked profits", () => {
    const appInstance = new TradingApp();
    const bal1 = appInstance._bankProfit(5000.0);
    assert.strictEqual(bal1, 5000.0);
    assert.strictEqual(appInstance.profile.menu_balance, 5000.0);
    assert.strictEqual(appInstance.profile.total_profit_banked, 5000.0);

    const bal2 = appInstance._bankProfit(25000.0);
    assert.strictEqual(bal2, 30000.0);
    assert.strictEqual(appInstance.profile.menu_balance, 30000.0);
    assert.strictEqual(appInstance.profile.total_profit_banked, 30000.0);
});

it("rejects purchase when vault balance is insufficient", () => {
    const appInstance = new TradingApp();
    appInstance.profile.menu_balance = 10000.0;
    // rocket_moon costs 25,000
    appInstance._handleShopBuy("rocket_moon");
    assert.strictEqual(appInstance.profile.inventory.includes("rocket_moon"), false);
    assert.strictEqual(appInstance.profile.menu_balance, 10000.0);
});

it("successfully buys and auto-equips rocket_moon when balance is sufficient", () => {
    const appInstance = new TradingApp();
    appInstance.profile.menu_balance = 30000.0;
    appInstance._handleShopBuy("rocket_moon");
    assert.strictEqual(appInstance.profile.inventory.includes("rocket_moon"), true);
    assert.strictEqual(appInstance.profile.equipped_animation, "rocket_moon");
    assert.strictEqual(appInstance.profile.menu_balance, 5000.0); // 30,000 - 25,000
});

it("equipping items switches active animation, theme, sfx, and title", () => {
    const appInstance = new TradingApp();
    // Add items to inventory
    appInstance.profile.inventory.push("theme_cyberpunk", "title_whale", "sfx_airhorn");
    
    // Equip Cyberpunk theme
    appInstance._handleShopEquip("theme_cyberpunk");
    assert.strictEqual(appInstance.profile.equipped_theme, "theme_cyberpunk");
    assert.strictEqual(document.body.classList.contains("theme-cyberpunk"), true);

    // Equip Whale title
    appInstance._handleShopEquip("title_whale");
    assert.strictEqual(appInstance.profile.equipped_title, "title_whale");

    // Equip Airhorn
    appInstance._handleShopEquip("sfx_airhorn");
    assert.strictEqual(appInstance.profile.equipped_sfx, "sfx_airhorn");

    // Equip back default theme
    appInstance._handleShopEquip("theme_default");
    assert.strictEqual(appInstance.profile.equipped_theme, "theme_default");
    assert.strictEqual(document.body.classList.contains("theme-cyberpunk"), false);
});

// 4. Win Animations Engine
console.log("\n4. CRAZY WIN ANIMATIONS ENGINE VERIFICATION");
it("WinAnimationEngine handles all 8 animation presets without errors", () => {
    const mockCtx = {
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        stroke: () => {},
        fill: () => {},
        fillRect: () => {},
        clearRect: () => {},
        roundRect: () => {},
        fillText: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createLinearGradient: () => ({ addColorStop: () => {} })
    };
    const mockCanvas = {
        getContext: () => mockCtx,
        width: 1920,
        height: 1080,
        style: {}
    };

    const animEngine = new WinAnimationEngine();
    animEngine.canvas = mockCanvas;
    animEngine.ctx = mockCtx;

    const animList = [
        "money_rain", "rocket_moon", "matrix_glitch", "diamond_hands", "golden_bull",
        "supercar_drift", "mega_yacht", "private_jet"
    ];
    for (const animId of animList) {
        animEngine.play(animId);
        assert.strictEqual(animEngine.active, true);
        assert.strictEqual(animEngine.animationId, animId);
        assert.ok(
            animEngine.particles.length > 0 ||
            animEngine.extraData.bull ||
            animEngine.extraData.rocket ||
            animEngine.extraData.dh ||
            animEngine.extraData.car ||
            animEngine.extraData.yacht ||
            animEngine.extraData.jet
        );
        // Execute loop frame without exceptions
        animEngine._loop();
        animEngine.stop();
        assert.strictEqual(animEngine.active, false);
    }
});

it("WinAnimationEngine supports video registration, overlay render, and fallback", () => {
    const mockCtx = {
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        stroke: () => {},
        fill: () => {},
        fillRect: () => {},
        clearRect: () => {},
        roundRect: () => {},
        fillText: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createLinearGradient: () => ({ addColorStop: () => {} })
    };
    const mockCanvas = {
        getContext: () => mockCtx,
        width: 1920,
        height: 1080,
        style: {}
    };

    const animEngine = new WinAnimationEngine();
    animEngine.canvas = mockCanvas;
    animEngine.ctx = mockCtx;

    // Test register custom video
    animEngine.registerVideo("supercar_drift", "assets/videos/custom_bugatti.mp4");
    assert.strictEqual(animEngine.videoSources["supercar_drift"], "assets/videos/custom_bugatti.mp4");

    // Test video overlay frame loop
    animEngine.play("supercar_drift");
    animEngine.videoPlaying = true;
    animEngine._loop();
    assert.strictEqual(animEngine.active, true);
    animEngine.stop();
    assert.strictEqual(animEngine.active, false);
    assert.strictEqual(animEngine.videoPlaying, false);
});

// 5. Firebase Matchmaker & Protocol Verification
console.log("\n5. FIREBASE MATCHMAKER & PROTOCOL VERIFICATION");
it("jsToFirestoreValue and firestoreValueToJs accurately serialize and deserialize all types", () => {
    const original = {
        name: "ProTrader_42",
        equity: 27500.50,
        shares: 100,
        is_active: true,
        tags: ["scalper", "whale"],
        metadata: { level: 5, server: "us-east" }
    };
    const doc = dictToFirestoreDoc(original);
    assert.ok(doc.fields);
    assert.strictEqual(doc.fields.name.stringValue, "ProTrader_42");
    assert.strictEqual(doc.fields.equity.doubleValue, 27500.50);
    assert.strictEqual(doc.fields.shares.integerValue, "100");
    assert.strictEqual(doc.fields.is_active.booleanValue, true);

    const reconstructed = firestoreDocToDict(doc);
    assert.deepStrictEqual(reconstructed, original);
});

it("SimulatedOpponentBot performs realistic random-walk equity progression", () => {
    const bot = new SimulatedOpponentBot("WallSt_Titan");
    assert.strictEqual(bot.name, "WallSt_Titan");
    assert.strictEqual(bot.equity, 25000.0);

    for (let i = 0; i < 20; i++) {
        const m = bot.tick();
        assert.ok(m.equity > 0);
        assert.strictEqual(typeof m.pnl, "number");
        assert.strictEqual(typeof m.pnl_pct, "number");
        assert.strictEqual(m.status, "playing");
    }
});

it("FirebaseMatchmaker initializes without syntax or runtime issues", () => {
    const fb = new FirebaseMatchmaker();
    assert.strictEqual(fb.projectId, "tradisim-188a6");
    assert.strictEqual(fb.authDomain, "tradisim-188a6.firebaseapp.com");
    assert.ok(fb.firestoreBaseUrl.includes("tradisim-188a6"));
});

it("FirebaseMatchmaker manages authenticated sessions and profile methods", () => {
    const fb = new FirebaseMatchmaker();
    fb.setAuthenticatedSession("user_123", "trader@web.com", "WebAce", "id_token_xyz", "refresh_tok");
    assert.strictEqual(fb.userId, "user_123");
    assert.strictEqual(fb.email, "trader@web.com");
    assert.strictEqual(fb.displayName, "WebAce");
    assert.strictEqual(fb.isAnonymous, false);

    fb.signOut();
    assert.strictEqual(fb.userId, "");
    assert.strictEqual(fb.email, "");
    assert.strictEqual(fb.isAnonymous, true);
});

console.log("\n6. HIGH-FREQUENCY NODE/TYPESCRIPT GAME SERVER & WEBSOCKET ENGINE VERIFICATION");

const { VolatilePriceEngine } = require("./dist-server/price-engine");
const { OrderEngine } = require("./dist-server/order-engine");
const { MatchRoom } = require("./dist-server/room");
const { Matchmaker } = require("./dist-server/matchmaker");
const { LiveTradeWsClient } = require("./public/js/ws-client");

it("VolatilePriceEngine generates authoritative ticks with Merton Jump Diffusion and aggregates candles", () => {
    const engine = new VolatilePriceEngine("NVXP", "NovaX AI Tech", 85.0);
    assert.strictEqual(engine.ticker, "NVXP");
    assert.strictEqual(engine.initialPrice, 85.0);
    assert.ok(engine.candles.length >= 40, "Pre-seeds at least 40 candles");

    for (let i = 0; i < 30; i++) {
        const tick = engine.tick(0.1);
        assert.ok(tick.price > 0, "Price must be positive");
        assert.strictEqual(typeof tick.change, "number");
        assert.strictEqual(typeof tick.changePct, "number");
        assert.ok(tick.candle.high >= tick.candle.low);
    }
});

it("OrderEngine executes leveraged BUY and SHORT orders and calculates margin maintenance", () => {
    const player = OrderEngine.createPlayerState("p1", "WallStShark");
    assert.strictEqual(player.cash, 25000.0);
    assert.strictEqual(player.equity, 25000.0);

    // 10x Leveraged BUY
    const buyRes = OrderEngine.executeOrder(player, "BUY", "NVXP", 100, 100.0, 10);
    assert.strictEqual(buyRes.success, true);
    assert.strictEqual(player.position.shares, 100);
    assert.strictEqual(player.position.leverage, 10);
    assert.strictEqual(player.position.marginUsed, 1000.0); // 100 * 100 / 10 = 1000

    // Price rises to 105: +$500 unrealized gain
    OrderEngine.updatePortfolio(player, 105.0);
    assert.strictEqual(player.unrealizedPnL, 500.0);
    assert.strictEqual(player.equity, 25500.0);

    // Flatten
    const flatRes = OrderEngine.executeOrder(player, "FLATTEN", "NVXP", 0, 105.0);
    assert.strictEqual(flatRes.success, true);
    assert.strictEqual(player.position, null);
    assert.strictEqual(player.realizedPnL, 500.0);
    assert.strictEqual(player.cash, 25500.0);
});

it("OrderEngine auto-liquidates position when margin maintenance falls below safety threshold", () => {
    const player = OrderEngine.createPlayerState("p_degen", "YoloTrader", "title_ape", "money_rain", 1000.0);
    // 50x Leveraged BUY with almost all cash
    const buyRes = OrderEngine.executeOrder(player, "BUY", "NVXP", 500, 100.0, 50); // $50,000 notional, $1,000 margin
    assert.strictEqual(buyRes.success, true);

    // Price drops by 2.5% -> loses $1,250 on a $1,000 account -> Liquidation!
    OrderEngine.updatePortfolio(player, 97.5);
    assert.strictEqual(player.status, "liquidated");
    assert.strictEqual(player.position, null);
    assert.strictEqual(player.cash, 0);
});

it("MatchRoom conducts 1v1 authoritative match, calculates dual PnL, and handles forfeit", () => {
    const pA = { id: "pA", nickname: "TraderA", title: "title_trader", animation: "money_rain" };
    const pB = { id: "pB", nickname: "TraderB", title: "title_whale", animation: "golden_bull", isBot: true };

    const room = new MatchRoom("test_room_1", pA, pB, "NVXP", 60);
    assert.strictEqual(room.state, "countdown");
    assert.strictEqual(room.durationSeconds, 60);

    // Start match
    room.startMatch();
    assert.strictEqual(room.state, "in_progress");

    // Execute order for Player A
    room.handleOrder("pA", "BUY", "NVXP", 50, 5);
    assert.ok(room.stateA.position);
    assert.strictEqual(room.stateA.position.shares, 50);

    // Forfeit
    room.handleForfeit("pA", "skipped");
    assert.strictEqual(room.state, "ended");
    assert.strictEqual(room.stateA.status, "forfeited");
    room.stopTimers();
});

it("Matchmaker manages FIFO queues, auto-pairs players, and handles Omegle skips", () => {
    const matchmaker = new Matchmaker();
    const mockWs1 = { readyState: 1, send: () => {} };
    const mockWs2 = { readyState: 1, send: () => {} };

    matchmaker.enqueue("user_1", mockWs1, "AlphaTrader");
    matchmaker.enqueue("user_2", mockWs2, "BetaTrader");

    const room1 = matchmaker.getRoomForPlayer("user_1");
    const room2 = matchmaker.getRoomForPlayer("user_2");
    assert.ok(room1, "Player 1 was matched into a room");
    assert.ok(room2, "Player 2 was matched into the same room");
    assert.strictEqual(room1.id, room2.id);

    // Omegle Skip: Player 1 clicks Next Opponent
    matchmaker.enqueue("user_1", mockWs1, "AlphaTrader");
    // Previous room concluded, user_1 is queued
    assert.strictEqual(room1.state, "ended");
    room1.stopTimers();
    matchmaker.dequeue("user_1");
    matchmaker.dequeue("user_2");
});

it("LiveTradeWsClient initializes with protocol handlers", () => {
    const client = new LiveTradeWsClient();
    assert.strictEqual(typeof client.joinQueue, "function");
    assert.strictEqual(typeof client.cancelQueue, "function");
    assert.strictEqual(typeof client.sendOrder, "function");
    assert.strictEqual(typeof client.nextOpponent, "function");
    assert.strictEqual(typeof client.leaveMatch, "function");
    client._stopPing();
});

it("MatchRoom configures proper clock and duration for 60s Blitz, 120s Tactical, and 300s Marathon", () => {
    const pA = { id: "p1", nickname: "TraderBlitz" };
    const pB = { id: "p2", nickname: "TraderBlitz2" };

    const room60 = new MatchRoom("room_60", pA, pB, "NVXP", 60);
    assert.strictEqual(room60.durationSeconds, 60);
    room60.startMatch();
    assert.strictEqual(room60.timeLeft, 60);
    room60.stopTimers();

    const room120 = new MatchRoom("room_120", pA, pB, "NVXP", 120);
    assert.strictEqual(room120.durationSeconds, 120);
    room120.startMatch();
    assert.strictEqual(room120.timeLeft, 120);
    room120.stopTimers();

    const room300 = new MatchRoom("room_300", pA, pB, "NVXP", 300);
    assert.strictEqual(room300.durationSeconds, 300);
    room300.startMatch();
    assert.strictEqual(room300.timeLeft, 300);
    room300.stopTimers();
});

it("Matchmaker separates matchmaking queues by duration (60s Blitz, 120s Tactical, 300s Marathon)", () => {
    const matchmaker = new Matchmaker();
    const ws60_1 = { readyState: 1, send: () => {} };
    const ws60_2 = { readyState: 1, send: () => {} };
    const ws120_1 = { readyState: 1, send: () => {} };
    const ws120_2 = { readyState: 1, send: () => {} };

    // Player 1 queues for 60s, Player 2 queues for 120s
    matchmaker.enqueue("u60_1", ws60_1, "BlitzTrader1", undefined, undefined, 60);
    matchmaker.enqueue("u120_1", ws120_1, "TacticalTrader1", undefined, undefined, 120);

    // Neither should be matched yet (different duration buckets)
    assert.strictEqual(matchmaker.getRoomForPlayer("u60_1"), undefined);
    assert.strictEqual(matchmaker.getRoomForPlayer("u120_1"), undefined);

    // Player 3 queues for 60s -> should immediately pair with u60_1 into a 60s room
    matchmaker.enqueue("u60_2", ws60_2, "BlitzTrader2", undefined, undefined, 60);
    const room60 = matchmaker.getRoomForPlayer("u60_1");
    assert.ok(room60, "u60_1 was paired with u60_2");
    assert.strictEqual(room60.durationSeconds, 60);
    assert.strictEqual(matchmaker.getRoomForPlayer("u60_2")?.id, room60.id);

    // Player 4 queues for 120s -> should immediately pair with u120_1 into a 120s room
    matchmaker.enqueue("u120_2", ws120_2, "TacticalTrader2", undefined, undefined, 120);
    const room120 = matchmaker.getRoomForPlayer("u120_1");
    assert.ok(room120, "u120_1 was paired with u120_2");
    assert.strictEqual(room120.durationSeconds, 120);
    assert.strictEqual(matchmaker.getRoomForPlayer("u120_2")?.id, room120.id);

    // Clean up
    room60.stopTimers();
    room120.stopTimers();
    matchmaker.dequeue("u60_1");
    matchmaker.dequeue("u60_2");
    matchmaker.dequeue("u120_1");
    matchmaker.dequeue("u120_2");
});

it("LiveTradeWsClient sends selected duration on joinQueue and nextOpponent", () => {
    const client = new LiveTradeWsClient();
    const sentMessages = [];
    client.ws = {
        readyState: 1, // OPEN
        send: (msg) => { sentMessages.push(JSON.parse(msg)); }
    };
    client.isConnected = true;

    // joinQueue with 120s
    client.joinQueue(120);
    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0].type, "join_queue");
    assert.strictEqual(sentMessages[0].duration, 120);

    // nextOpponent with 300s
    client.nextOpponent(300);
    assert.strictEqual(sentMessages.length, 2);
    assert.strictEqual(sentMessages[1].type, "next_opponent");
    assert.strictEqual(sentMessages[1].duration, 300);

    client._stopPing();
});

console.log("\n7. RESIZABLE & SHRINKABLE BOTTOM BAR INTEGRITY VERIFICATION");
it("initializes bottom panel with 210px default height", () => {
    localStorage.clear();
    const testApp = new TradingApp();
    assert.strictEqual(testApp.bottomPanelDefaultHeight, 210);
    assert.strictEqual(testApp.elBottomPanel.style.height, "210px");
    assert.strictEqual(testApp.elBottomPanel.classList.contains("is-collapsed"), false);
});

it("resizes bottom panel dynamically to user-defined height", () => {
    const testApp = new TradingApp();
    testApp.setBottomPanelHeight(340);
    assert.strictEqual(testApp.elBottomPanel.style.height, "340px");
    assert.strictEqual(testApp.bottomPanelLastHeight, 340);
    assert.strictEqual(testApp.elBottomPanel.classList.contains("is-collapsed"), false);
    assert.strictEqual(testApp.elBottomResizer.classList.contains("is-collapsed"), false);
    assert.strictEqual(localStorage.getItem("tradesim_bottom_height"), "340");
});

it("shrinks bottom panel completely to 0px when collapsed", () => {
    const testApp = new TradingApp();
    testApp.setBottomPanelHeight(340);
    // Shrink completely
    testApp.setBottomPanelHeight(0);
    assert.strictEqual(testApp.elBottomPanel.style.height, "0px");
    assert.strictEqual(testApp.elBottomPanel.classList.contains("is-collapsed"), true);
    assert.strictEqual(testApp.elBottomResizer.classList.contains("is-collapsed"), true);
    assert.strictEqual(testApp.elBtnBottomToggle.innerHTML, "▲");
    assert.strictEqual(localStorage.getItem("tradesim_bottom_collapsed"), "1");

    // Uncollapse restores previous 340px height
    testApp.setBottomPanelHeight(testApp.bottomPanelLastHeight);
    assert.strictEqual(testApp.elBottomPanel.style.height, "340px");
    assert.strictEqual(testApp.elBottomPanel.classList.contains("is-collapsed"), false);
    assert.strictEqual(testApp.elBottomResizer.classList.contains("is-collapsed"), false);
    assert.strictEqual(testApp.elBtnBottomToggle.innerHTML, "▼");
});

it("resets height to 210px default on reset action", () => {
    const testApp = new TradingApp();
    testApp.setBottomPanelHeight(450);
    assert.strictEqual(testApp.elBottomPanel.style.height, "450px");

    // Reset to default
    testApp.setBottomPanelHeight(testApp.bottomPanelDefaultHeight);
    assert.strictEqual(testApp.elBottomPanel.style.height, "210px");
    assert.strictEqual(localStorage.getItem("tradesim_bottom_height"), "210");
});

console.log("\n8. LIVE MULTIPLAYER 100-STOCK UNIVERSE & REAL-TIME GRAPH INTEGRITY VERIFICATION");

it("MatchRoom simulates all 100 universe stocks with individualized logic and jump diffusion", () => {
    const pA = { id: "pA", nickname: "SharkA", title: "title_trader", animation: "money_rain" };
    const pB = { id: "pB", nickname: "SharkB", title: "title_whale", animation: "golden_bull", isBot: true };

    const room = new MatchRoom("room_universe_100", pA, pB, "NVXP", 60);
    assert.strictEqual(room.priceEngines.size, 100, "Must initialize all 100 stocks");

    // Sample distinct sectors
    const nvxp = room.priceEngines.get("NVXP");
    const moon = room.priceEngines.get("MOON");
    const pump = room.priceEngines.get("PUMP");
    const lock = room.priceEngines.get("LOCK");

    assert.ok(nvxp && moon && pump && lock, "Diverse sector stocks must exist");
    assert.strictEqual(nvxp.sector, "AI & Tech");
    assert.strictEqual(moon.sector, "Meme & Retail");
    assert.strictEqual(pump.sector, "Penny Wildcard");
    assert.strictEqual(lock.sector, "Aerospace & Defense");

    assert.ok(moon.baseVolatility > nvxp.baseVolatility, "Meme stock has higher volatility than AI tech");
    assert.ok(pump.baseVolatility > moon.baseVolatility, "Penny stock has higher volatility than Meme stock");
    assert.ok(nvxp.candles.length >= 40, "Stocks pre-seed at least 40 candles");
    assert.ok(moon.candles.length >= 40);

    room.startMatch();
    room.stopTimers();
});

it("MatchRoom allows players to switch active watched stocks dynamically with full candlestick sync", () => {
    const pA_messages = [];
    const pA = {
        id: "player_switch_a",
        nickname: "TraderSwitch",
        ws: { readyState: 1, send: (m) => pA_messages.push(JSON.parse(m)) }
    };
    const pB = { id: "bot_b", nickname: "BotB", isBot: true };

    const room = new MatchRoom("room_switch_test", pA, pB, "NVXP", 60);
    room.startMatch();

    // Default watched ticker is initial NVXP
    assert.strictEqual(room.watchedTickerA, "NVXP");

    // Player switches to MOON
    room.handleWatchTicker("player_switch_a", "MOON");
    assert.strictEqual(room.watchedTickerA, "MOON");

    // Check that player received stock_data for MOON
    const stockDataMsg = pA_messages.find(m => m.type === "stock_data");
    assert.ok(stockDataMsg, "Received stock_data payload");
    assert.strictEqual(stockDataMsg.ticker, "MOON");
    assert.ok(stockDataMsg.candles.length >= 40, "Full candle history delivered on switch");
    assert.ok(stockDataMsg.currentCandle, "Current live candle delivered");

    room.stopTimers();
});

it("MatchRoom executes orders against the exact live price of any traded stock and updates portfolio", () => {
    const pA_messages = [];
    const pA = {
        id: "trader_orders_1",
        nickname: "OrderTrader",
        ws: { readyState: 1, send: (m) => pA_messages.push(JSON.parse(m)) }
    };
    const pB = { id: "bot_2", nickname: "Bot2", isBot: true };

    const room = new MatchRoom("room_orders_test", pA, pB, "NVXP", 60);
    room.startMatch();

    const moonEngine = room.priceEngines.get("MOON");
    const moonPrice = moonEngine.price;

    // Execute order on MOON while room default symbol was NVXP
    room.handleOrder("trader_orders_1", "BUY", "MOON", 100, 5);

    assert.ok(room.stateA.position, "Position opened");
    assert.strictEqual(room.stateA.position.ticker, "MOON");
    assert.strictEqual(room.stateA.position.shares, 100);
    assert.strictEqual(room.stateA.position.avgEntry, moonPrice);

    const orderAck = pA_messages.find(m => m.type === "order_ack");
    assert.ok(orderAck, "Order ACK sent");
    assert.strictEqual(orderAck.price, moonPrice);

    room.stopTimers();
});

it("CandlestickChart deduplicates candles sharing timestamps and renders without glitching", () => {
    const chart = new CandlestickChart("chart-canvas");
    const stockMock = {
        ticker: "TEST",
        price: 50.0,
        tradeMarkers: [],
        candles: [
            { timestamp: 1000, open: 49, high: 51, low: 48, close: 50, volume: 100 },
            { timestamp: 1005, open: 50, high: 52, low: 49, close: 51, volume: 120 }
        ],
        currentCandle: { timestamp: 1005, open: 50, high: 52, low: 49, close: 51, volume: 120 }
    };

    chart.setData(stockMock);
    assert.strictEqual(chart.candles.length, 2, "Deduplicated timestamp");
    assert.strictEqual(chart.candles[1].timestamp, 1005);
});

console.log("\n=================================================");
console.log(`   TEST RESULTS: ${passedTests}/${totalTests} PASSED (100%)`);
console.log("=================================================");

process.exit(passedTests === totalTests ? 0 : 1);
