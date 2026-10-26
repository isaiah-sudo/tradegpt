/**
 * DayTradeSim Pro • Cyber-Terminal Landing, Live Clash HUD & 3D Vault Showroom Script
 * tradeism.men
 */

(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyAPXfhZrr1vndo_2xge6DxVyyGEFHQaIPY",
    authDomain: "tradisim-188a6.firebaseapp.com",
    projectId: "tradisim-188a6"
  };

  let auth = null;
  let currentUser = null;

  // Initialize Firebase Auth
  function initFirebaseAuth() {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
      console.warn("Firebase SDK not loaded yet.");
      return;
    }
    try {
      if (firebase.apps && firebase.apps.length > 0) {
        auth = firebase.auth();
      } else {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
      }

      auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateUserInterface(user);
      });
    } catch (e) {
      console.error("Firebase auth initialization error:", e);
    }
  }

  // Read saved local profile
  function getLocalProfile() {
    try {
      const raw = localStorage.getItem("daytradesim_profile") || localStorage.getItem("tradegpt_profile");
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.menu_balance === "number" && typeof p.vault_balance !== "number") {
          p.vault_balance = p.menu_balance;
        } else if (typeof p.vault_balance === "number" && typeof p.menu_balance !== "number") {
          p.menu_balance = p.vault_balance;
        }
        return p;
      }
    } catch (e) {}
    return {
      player_name: "Trader",
      menu_balance: 0.0,
      vault_balance: 0.0,
      total_profit_banked: 0.0,
      duels_won: 0,
      owned_items: ["money_rain", "theme_default", "sfx_standard", "title_trader"]
    };
  }

  function saveLocalProfile(updates) {
    try {
      const p = getLocalProfile();
      const updated = Object.assign(p, updates);
      localStorage.setItem("daytradesim_profile", JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Save profile error:", e);
    }
    return updates;
  }

  // Format currency
  function fmtMoney(amount) {
    const val = Number(amount) || 0;
    return (val < 0 ? "-$" : "$") + Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Update UI based on auth state
  function updateUserInterface(user) {
    const navBtnSignIn = document.getElementById("nav-btn-signin");
    const navUserPill = document.getElementById("nav-user-pill");
    const navUserName = document.getElementById("nav-user-name");
    const navUserVault = document.getElementById("nav-user-vault");

    const authFormWrap = document.getElementById("auth-form-wrap");
    const userProfileWidget = document.getElementById("user-profile-widget");
    const profileUserName = document.getElementById("profile-user-name");
    const profileUserEmail = document.getElementById("profile-user-email");
    const profileVaultBal = document.getElementById("profile-vault-bal");
    const profileBankedProf = document.getElementById("profile-banked-prof");
    const profileDuelsWon = document.getElementById("profile-duels-won");

    const flexLocalVault = document.getElementById("flex-local-vault");
    const flexVaultBar = document.getElementById("flex-vault-bar");

    const profile = getLocalProfile();
    const vaultBal = typeof profile.menu_balance === "number"
      ? profile.menu_balance
      : (typeof profile.vault_balance === "number" ? profile.vault_balance : 0.0);

    if (flexLocalVault) {
      flexLocalVault.textContent = fmtMoney(vaultBal);
    }
    if (flexVaultBar) {
      const pct = Math.min(100, Math.max(12, (vaultBal / 350000) * 100));
      flexVaultBar.style.width = pct.toFixed(1) + "%";
    }

    if (user) {
      const displayName = user.displayName || profile.player_name || (user.email ? user.email.split("@")[0] : "Trader");

      // Update Nav
      if (navBtnSignIn) navBtnSignIn.style.display = "none";
      if (navUserPill) {
        navUserPill.style.display = "inline-flex";
        if (navUserName) navUserName.textContent = displayName;
        if (navUserVault) navUserVault.textContent = fmtMoney(vaultBal);
      }

      // Update Auth Section Widget
      if (authFormWrap) authFormWrap.style.display = "none";
      if (userProfileWidget) {
        userProfileWidget.style.display = "block";
        if (profileUserName) profileUserName.textContent = displayName;
        if (profileUserEmail) profileUserEmail.textContent = user.email || "";
        if (profileVaultBal) profileVaultBal.textContent = fmtMoney(vaultBal);
        if (profileBankedProf) profileBankedProf.textContent = fmtMoney(profile.total_profit_banked);
        if (profileDuelsWon) profileDuelsWon.textContent = String(profile.duels_won || 0);
      }
    } else {
      // Unauthenticated
      if (navBtnSignIn) navBtnSignIn.style.display = "inline-flex";
      if (navUserPill) navUserPill.style.display = "none";

      if (authFormWrap) authFormWrap.style.display = "block";
      if (userProfileWidget) userProfileWidget.style.display = "none";
    }
  }

  // Handle Authentication Events
  function setupAuthEvents() {
    let mode = "signin";

    const tabSignIn = document.getElementById("tab-signin");
    const tabSignUp = document.getElementById("tab-signup");
    const groupNickname = document.getElementById("group-nickname");
    const btnSubmit = document.getElementById("btn-auth-submit");
    const authForm = document.getElementById("home-auth-form");
    const btnGoogle = document.getElementById("btn-google-auth");
    const statusBox = document.getElementById("auth-status-box");
    const btnSignOut = document.getElementById("btn-signout");

    function setStatus(msg, isSuccess = false) {
      if (!statusBox) return;
      statusBox.textContent = msg;
      statusBox.className = "auth-status-box " + (isSuccess ? "success" : "error");
      statusBox.style.display = "block";
    }

    function clearStatus() {
      if (!statusBox) return;
      statusBox.textContent = "";
      statusBox.style.display = "none";
    }

    if (tabSignIn && tabSignUp) {
      tabSignIn.onclick = () => {
        mode = "signin";
        tabSignIn.classList.add("active");
        tabSignUp.classList.remove("active");
        if (groupNickname) groupNickname.style.display = "none";
        if (btnSubmit) btnSubmit.textContent = "Sign In";
        clearStatus();
      };

      tabSignUp.onclick = () => {
        mode = "signup";
        tabSignUp.classList.add("active");
        tabSignIn.classList.remove("active");
        if (groupNickname) groupNickname.style.display = "block";
        if (btnSubmit) btnSubmit.textContent = "Create Trader Account";
        clearStatus();
      };
    }

    if (btnGoogle) {
      btnGoogle.onclick = async () => {
        clearStatus();
        if (!auth) initFirebaseAuth();
        if (!auth) {
          setStatus("Authentication service initializing, please try again in a second.");
          return;
        }

        btnGoogle.disabled = true;
        btnGoogle.style.opacity = "0.7";

        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          const res = await auth.signInWithPopup(provider);
          const user = res.user;

          const idToken = await user.getIdToken();
          saveLocalProfile({
            auth_uid: user.uid,
            auth_email: user.email || "",
            auth_display_name: user.displayName || "",
            auth_id_token: idToken,
            auth_refresh_token: user.refreshToken || "",
            player_name: user.displayName || "Trader"
          });

          setStatus("Successfully signed in with Google!", true);
          updateUserInterface(user);
        } catch (err) {
          console.error(err);
          let msg = err.message || "Google sign-in could not be completed.";
          if (err.code === "auth/popup-closed-by-user") {
            msg = "Sign-in popup was closed before completing.";
          }
          setStatus(msg);
        } finally {
          btnGoogle.disabled = false;
          btnGoogle.style.opacity = "1";
        }
      };
    }

    if (authForm) {
      authForm.onsubmit = async (e) => {
        e.preventDefault();
        clearStatus();
        if (!auth) initFirebaseAuth();
        if (!auth) {
          setStatus("Authentication service initializing, please try again.");
          return;
        }

        const emailEl = document.getElementById("auth-email");
        const passEl = document.getElementById("auth-pass");
        const nickEl = document.getElementById("auth-nick");

        const email = emailEl ? emailEl.value.trim() : "";
        const password = passEl ? passEl.value : "";
        const nickname = nickEl ? nickEl.value.trim() : "";

        if (!email || !password) return;

        btnSubmit.disabled = true;
        btnSubmit.textContent = mode === "signin" ? "Signing In..." : "Creating Account...";

        try {
          let userCred;
          if (mode === "signup") {
            userCred = await auth.createUserWithEmailAndPassword(email, password);
            if (nickname && userCred.user) {
              await userCred.user.updateProfile({ displayName: nickname });
            }
          } else {
            userCred = await auth.signInWithEmailAndPassword(email, password);
          }

          const user = userCred.user;
          const idToken = await user.getIdToken();
          saveLocalProfile({
            auth_uid: user.uid,
            auth_email: user.email || "",
            auth_display_name: nickname || user.displayName || "",
            auth_id_token: idToken,
            auth_refresh_token: user.refreshToken || "",
            player_name: nickname || user.displayName || "Trader"
          });

          setStatus(mode === "signup" ? "Account created successfully!" : "Signed in successfully!", true);
          updateUserInterface(user);
        } catch (err) {
          console.error(err);
          let msg = err.message || "Authentication failed.";
          if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
            msg = "Invalid email or password.";
          } else if (err.code === "auth/user-not-found") {
            msg = "No account found with this email.";
          } else if (err.code === "auth/email-already-in-use") {
            msg = "An account with this email already exists.";
          } else if (err.code === "auth/weak-password") {
            msg = "Password should be at least 6 characters.";
          }
          setStatus(msg);
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.textContent = mode === "signin" ? "Sign In" : "Create Trader Account";
        }
      };
    }

    if (btnSignOut) {
      btnSignOut.onclick = async () => {
        try {
          if (auth) await auth.signOut();
          saveLocalProfile({
            auth_uid: null,
            auth_id_token: null,
            auth_refresh_token: null
          });
          currentUser = null;
          updateUserInterface(null);
          clearStatus();
        } catch (err) {
          console.error("Sign out error:", err);
        }
      };
    }
  }

  // =========================================================================
  // MICRO-ANIMATIONS: AMBIENT BACKGROUND TICKERS & MARQUEE GREEN/RED FLASHES
  // =========================================================================
  function setupLiveTickerFlashes() {
    const ambientNodes = Array.from(document.querySelectorAll(".ambient-node"));
    const marqueeItems = Array.from(document.querySelectorAll(".ticker-item"));

    // Periodically tick an ambient background stock node with subtle green/red flash
    if (ambientNodes.length > 0) {
      setInterval(() => {
        const node = ambientNodes[Math.floor(Math.random() * ambientNodes.length)];
        if (!node) return;

        let p = parseFloat(node.getAttribute("data-amb-price") || "100");
        const isUp = Math.random() > 0.44;
        const pctMove = (Math.random() * 0.008 + 0.001) * (isUp ? 1 : -1);
        p = Math.max(5, p * (1 + pctMove));
        node.setAttribute("data-amb-price", p.toFixed(2));

        const valEl = node.querySelector(".amb-val");
        const chgEl = node.querySelector(".amb-chg");
        if (valEl) {
          valEl.textContent = p >= 1000 ? "$" + Math.round(p).toLocaleString("en-US") : "$" + p.toFixed(2);
        }
        if (chgEl) {
          const dispPct = (isUp ? "+" : "-") + (Math.random() * 6 + 0.8).toFixed(1) + "%";
          chgEl.textContent = dispPct;
        }

        node.classList.remove("flash-up", "flash-down");
        node.classList.add(isUp ? "flash-up" : "flash-down");
        setTimeout(() => {
          node.classList.remove("flash-up", "flash-down");
        }, 700);
      }, 1100);
    }

    // Periodically tick visible marquee strip items with green/red flash
    if (marqueeItems.length > 0) {
      setInterval(() => {
        const idx = Math.floor(Math.random() * (marqueeItems.length / 2));
        const pair = [marqueeItems[idx], marqueeItems[idx + (marqueeItems.length / 2)]];
        const isUp = Math.random() > 0.45;

        pair.forEach((item) => {
          if (!item) return;
          let price = parseFloat(item.getAttribute("data-price") || "100");
          let chg = parseFloat(item.getAttribute("data-chg") || "1.0");
          const step = price * (Math.random() * 0.004 + 0.0008) * (isUp ? 1 : -1);
          price = Math.max(2, price + step);
          chg = chg + (isUp ? 0.14 : -0.14);

          item.setAttribute("data-price", price.toFixed(2));
          item.setAttribute("data-chg", chg.toFixed(2));

          const priceSpan = item.querySelector(".ticker-price");
          const chgSpan = item.querySelector(".ticker-up, .ticker-down");
          if (priceSpan) {
            priceSpan.textContent = "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          if (chgSpan) {
            chgSpan.textContent = (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%";
            chgSpan.className = chg >= 0 ? "ticker-up" : "ticker-down";
          }

          item.classList.remove("tick-flash-up", "tick-flash-down");
          item.classList.add(isUp ? "tick-flash-up" : "tick-flash-down");
          setTimeout(() => {
            item.classList.remove("tick-flash-up", "tick-flash-down");
          }, 650);
        });
      }, 900);
    }
  }

  // =========================================================================
  // HERO SECTION: SPLIT-SCREEN 1V1 CLASH HUD & MATCHMAKING RADAR SIMULATION
  // =========================================================================
  function setupClashHeroSimulation() {
    const priceEl = document.getElementById("demo-term-price");
    const chgEl = document.getElementById("demo-term-chg");
    const btnBuy = document.getElementById("demo-btn-buy");
    const btnShort = document.getElementById("demo-btn-short");
    const toast = document.getElementById("demo-toast");

    const youEquityEl = document.getElementById("hud-you-equity");
    const youPnlEl = document.getElementById("hud-you-pnl");
    const oppEquityEl = document.getElementById("hud-opp-equity");
    const oppPnlEl = document.getElementById("hud-opp-pnl");
    const tugGreenBar = document.getElementById("clash-tug-bar-green");
    const tugLeftLabel = document.getElementById("clash-tug-left-label");
    const tugRightLabel = document.getElementById("clash-tug-right-label");
    const timerEl = document.getElementById("clash-countdown-timer");

    const radarStatusEl = document.getElementById("radar-status-text");
    const radarMetaEl = document.getElementById("radar-queue-meta");

    let currentPrice = 128.45;
    const basePrice = 120.60;
    let youShares = 400; // Long 400 NVDA
    let youEquity = 29840.50;
    let oppEquity = 26410.00;
    const seedCash = 25000.00;

    // 1. Live Blitz Countdown Clock (ticks at 50ms intervals)
    let remainingMs = 42850;
    if (timerEl) {
      setInterval(() => {
        remainingMs -= 50;
        if (remainingMs <= 3000) {
          remainingMs = 59950;
        }
        const secs = Math.floor(remainingMs / 1000);
        const cs = Math.floor((remainingMs % 1000) / 10);
        timerEl.textContent = "00:" + String(secs).padStart(2, "0") + "." + String(cs).padStart(2, "0");
      }, 50);
    }

    // 2. Matchmaking Radar Status Cycle
    if (radarStatusEl && radarMetaEl) {
      const states = [
        { status: "SEARCHING FOR OPPONENT...", meta: "42 TRADERS ONLINE • EST. MATCH <0.8s" },
        { status: "SCANNING 60S BLITZ ARENA...", meta: "47 TRADERS ONLINE • PING 14ms [US-EAST]" },
        { status: "RIVAL LOCKED READY TO CLASH", meta: "INSTANT 1V1 QUEUE OPEN • CLICK TO JOIN" }
      ];
      let stIdx = 0;
      setInterval(() => {
        stIdx = (stIdx + 1) % states.length;
        radarStatusEl.textContent = states[stIdx].status;
        radarMetaEl.textContent = states[stIdx].meta;
      }, 3400);
    }

    // 3. Live 1v1 Price & Dual HUD Telemetry Tick
    function updateClashTelemetry() {
      const delta = (Math.random() - 0.45) * 0.65;
      currentPrice = Math.max(40, currentPrice + delta);
      const chgVal = currentPrice - basePrice;
      const chgPct = (chgVal / basePrice) * 100;

      if (priceEl) {
        priceEl.textContent = "$" + currentPrice.toFixed(2);
      }
      if (chgEl) {
        chgEl.textContent = (chgVal >= 0 ? "+" : "") + chgVal.toFixed(2) + " (" + (chgVal >= 0 ? "+" : "") + chgPct.toFixed(2) + "%)";
        chgEl.className = (chgVal >= 0 ? "ticker-up" : "ticker-down") + " mono-data";
      }

      // Update You vs Rival Equity
      youEquity = Math.max(25500, youEquity + delta * (youShares * 0.45));
      oppEquity = Math.max(22800, oppEquity - delta * 110 + (Math.random() - 0.5) * 35);

      const youPnl = youEquity - seedCash;
      const youPnlPct = (youPnl / seedCash) * 100;
      const oppPnl = oppEquity - seedCash;
      const oppPnlPct = (oppPnl / seedCash) * 100;

      if (youEquityEl) youEquityEl.textContent = fmtMoney(youEquity);
      if (youPnlEl) {
        youPnlEl.textContent = (youPnl >= 0 ? "+" : "") + fmtMoney(youPnl) + " (" + (youPnl >= 0 ? "+" : "") + youPnlPct.toFixed(2) + "%)";
        youPnlEl.className = "hud-pnl-badge " + (youPnl >= 0 ? "pos" : "neg");
      }

      if (oppEquityEl) oppEquityEl.textContent = fmtMoney(oppEquity);
      if (oppPnlEl) {
        oppPnlEl.textContent = (oppPnl >= 0 ? "+" : "") + fmtMoney(oppPnl) + " (" + (oppPnl >= 0 ? "+" : "") + oppPnlPct.toFixed(2) + "%)";
        oppPnlEl.className = "hud-pnl-badge neg";
      }

      // Compute Tug-of-War Dominance %
      const totalSpread = Math.max(100, Math.abs(youPnl) + Math.abs(oppPnl));
      const domPct = Math.min(82, Math.max(52, Math.round((Math.max(100, youPnl) / totalSpread) * 100)));
      const oppDom = 100 - domPct;

      if (tugGreenBar) tugGreenBar.style.width = domPct + "%";
      if (tugLeftLabel) tugLeftLabel.textContent = `🟢 YOU [HYPERCAR] • ${domPct}% DOMINANCE`;
      if (tugRightLabel) tugRightLabel.textContent = `${oppDom}% DOMINANCE • RIVAL [WHALE] 🔴`;

      // Subtly animate last candlesticks in both HUDs
      const greenCandles = document.querySelectorAll("#hud-green-candles .sim-candle");
      if (greenCandles.length > 0) {
        const lastG = greenCandles[greenCandles.length - 1];
        const hPct = Math.min(96, Math.max(55, 82 + Math.round(delta * 14)));
        lastG.style.height = hPct + "%";
      }
      const redCandles = document.querySelectorAll("#hud-red-candles .sim-candle");
      if (redCandles.length > 0) {
        const lastR = redCandles[redCandles.length - 1];
        const hPct = Math.min(75, Math.max(28, 42 - Math.round(delta * 12)));
        lastR.style.height = hPct + "%";
      }
    }

    setInterval(updateClashTelemetry, 1100);

    function showOrderToast(text, isShort = false) {
      if (!toast) return;
      toast.textContent = text;
      toast.style.borderColor = isShort ? "var(--accent-red)" : "var(--accent-green)";
      toast.style.color = isShort ? "var(--accent-red)" : "var(--accent-green)";
      toast.style.background = isShort ? "rgba(255, 42, 95, 0.18)" : "rgba(0, 255, 136, 0.18)";
      toast.style.display = "block";
      setTimeout(() => {
        if (toast) toast.style.display = "none";
      }, 2600);
    }

    if (btnBuy) {
      btnBuy.onclick = () => {
        youShares += 100;
        youEquity += 320;
        const posTag = document.getElementById("hud-you-pos-tag");
        if (posTag) posTag.innerHTML = `<span>🟢 LONG ${youShares} NVDA</span><span>•</span><span>4X MARGIN</span>`;
        showOrderToast(`🟢 BOUGHT 100 @ $${currentPrice.toFixed(2)} • FILLED`, false);
        updateClashTelemetry();
      };
    }

    if (btnShort) {
      btnShort.onclick = () => {
        youEquity += 260;
        showOrderToast(`🔴 SHORT HEDGE 100 @ $${currentPrice.toFixed(2)} • LOCKED`, true);
        updateClashTelemetry();
      };
    }
  }

  // =========================================================================
  // TEASE THE FLEX: INTERACTIVE 60FPS 3D/VECTOR VAULT SHOWROOM RENDERER
  // =========================================================================
  function setupFlexShowroomCanvas() {
    const canvas = document.getElementById("flex-showroom-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pricePill = document.getElementById("showroom-price-pill");
    const telemetryTag = document.getElementById("showroom-telemetry-tag");
    const itemTitle = document.getElementById("showroom-item-title");
    const itemDesc = document.getElementById("showroom-item-desc");
    const tabBtns = Array.from(document.querySelectorAll(".showroom-tab-btn"));

    const SCENES = {
      supercar: {
        unlock: "🔒 VAULT UNLOCK: $350,000",
        telemetry: "TELEMETRY // 1,500 HP W16 • 236 MPH DRIFT",
        title: "🏎️ 1,500 HP Bugatti Chiron Pur Sport Drift",
        desc: "Triggers a fullscreen 60fps midnight hypercar drift with tire smoke, twin-turbo exhaust flames, and V16 redline audio whenever you win a duel or bank profits."
      },
      yacht: {
        unlock: "🔒 VAULT UNLOCK: $750,000",
        telemetry: "MONACO HARBOR // 300FT SUPERYACHT • HELIPAD ACTIVE",
        title: "🛥️ 300ft Monaco Superyacht & Private Helipad",
        desc: "Billionaire prestige! Multi-tier 300ft mega-yacht anchored off Saint-Tropez with underwater cyan hull LEDs, rooftop turquoise jacuzzi, and private helicopter."
      },
      jet: {
        unlock: "🔒 VAULT UNLOCK: $1,500,000",
        telemetry: "FLIGHT DECK // MACH 0.925 • ALTITUDE 51,000 FT",
        title: "✈️ Gulfstream G700 Stratosphere Jet",
        desc: "Global domination at 51,000 feet! Cruises above supersonic sunset clouds with twin Rolls-Royce Pearl turbofan afterburners and FAA anti-collision strobes."
      },
      bull: {
        unlock: "🔒 VAULT UNLOCK: $500,000",
        telemetry: "WALL ST STAMPEDE // LASER BULL • 24K GOLD BULLION",
        title: "👑 Mechanical Golden Bull Stampede",
        desc: "The ultimate Wall Street flex. A giant mechanical 24K golden bull charges across your terminal with glowing red laser eyes and gold coin explosions."
      }
    };

    let activeScene = "supercar";
    let frame = 0;

    // Pre-initialize particles for scenes
    const roadStreaks = Array.from({ length: 30 }, () => ({
      x: Math.random() * 760,
      y: 160 + Math.random() * 180,
      len: 40 + Math.random() * 90,
      spd: 14 + Math.random() * 18
    }));
    const smokePuffs = [];
    const oceanBubbles = Array.from({ length: 28 }, () => ({
      x: Math.random() * 760,
      y: Math.random() * 340,
      r: 2 + Math.random() * 4,
      vy: 0.8 + Math.random() * 1.5
    }));
    const jetClouds = Array.from({ length: 18 }, () => ({
      x: Math.random() * 760,
      y: 190 + Math.random() * 140,
      r: 35 + Math.random() * 55,
      spd: 3.5 + Math.random() * 5
    }));

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const sc = btn.getAttribute("data-scene");
        if (!sc || !SCENES[sc]) return;
        activeScene = sc;
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const meta = SCENES[sc];
        if (pricePill) pricePill.textContent = meta.unlock;
        if (telemetryTag) telemetryTag.textContent = meta.telemetry;
        if (itemTitle) itemTitle.textContent = meta.title;
        if (itemDesc) itemDesc.textContent = meta.desc;
      });
    });

    function drawSupercarScene(w, h) {
      // Midnight sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.48);
      sky.addColorStop(0, "#02040a");
      sky.addColorStop(1, "#091326");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.48);

      // Cyber skyline silhouettes
      ctx.fillStyle = "rgba(14, 24, 46, 0.85)";
      for (let bx = 0; bx < w; bx += 55) {
        const bh = 35 + ((bx * 29) % 85);
        ctx.fillRect(bx, h * 0.48 - bh, 42, bh);
      }

      // Wet tarmac road
      const road = ctx.createLinearGradient(0, h * 0.48, 0, h);
      road.addColorStop(0, "#050912");
      road.addColorStop(1, "#0e172a");
      ctx.fillStyle = road;
      ctx.fillRect(0, h * 0.48, w, h * 0.52);

      // Speed streaks
      for (const st of roadStreaks) {
        st.x -= st.spd;
        if (st.x < -100) {
          st.x = w + 60;
          st.y = h * 0.5 + Math.random() * (h * 0.48);
        }
        ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(st.x - st.len, st.y + st.len * 0.18);
        ctx.stroke();
      }

      const cx = w * 0.48;
      const cy = h * 0.62 + Math.sin(frame * 0.1) * 2.5;

      // Neon underglow
      ctx.save();
      ctx.translate(cx, cy + 32);
      ctx.scale(1, 0.28);
      const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 175);
      glow.addColorStop(0, "rgba(0, 240, 255, 0.85)");
      glow.addColorStop(0.5, "rgba(255, 0, 122, 0.45)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 175, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tire smoke particles
      if (smokePuffs.length < 36) {
        smokePuffs.push({
          x: cx - 105,
          y: cy + 20,
          vx: -4 - Math.random() * 5,
          vy: -0.5 - Math.random() * 2,
          r: 7 + Math.random() * 6,
          alpha: 0.55
        });
      }
      for (let i = smokePuffs.length - 1; i >= 0; i--) {
        const sp = smokePuffs[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.r += 0.65;
        sp.alpha -= 0.018;
        if (sp.alpha <= 0) {
          smokePuffs.splice(i, 1);
        } else {
          ctx.fillStyle = `rgba(0, 240, 255, ${sp.alpha})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Hypercar body
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.04 + Math.sin(frame * 0.12) * 0.008);

      // Headlight beam
      const beam = ctx.createLinearGradient(120, 0, 340, 35);
      beam.addColorStop(0, "rgba(0, 240, 255, 0.55)");
      beam.addColorStop(1, "rgba(0, 240, 255, 0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(125, -4);
      ctx.lineTo(350, -24);
      ctx.lineTo(350, 45);
      ctx.lineTo(125, 14);
      ctx.closePath();
      ctx.fill();

      // Chassis
      const bodyGrad = ctx.createLinearGradient(-140, -35, 140, 20);
      bodyGrad.addColorStop(0, "#0284c7");
      bodyGrad.addColorStop(0.5, "#38bdf8");
      bodyGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(135, 14);
      ctx.lineTo(142, 4);
      ctx.lineTo(105, -8);
      ctx.bezierCurveTo(75, -18, 40, -18, 15, -18);
      ctx.bezierCurveTo(-5, -36, -55, -36, -78, -18);
      ctx.lineTo(-125, -16);
      ctx.lineTo(-142, -2);
      ctx.lineTo(-142, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Canopy
      ctx.fillStyle = "#050811";
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, -16);
      ctx.lineTo(-8, -31);
      ctx.lineTo(-56, -31);
      ctx.lineTo(-68, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rear GT Wing
      ctx.fillStyle = "#020617";
      ctx.strokeStyle = "#00f0ff";
      ctx.fillRect(-135, -32, 5, 15);
      ctx.fillRect(-142, -36, 36, 5);

      // Twin-turbo exhaust backfire flame
      if (frame % 8 < 4) {
        ctx.fillStyle = "#ff007a";
        ctx.beginPath();
        ctx.moveTo(-142, 6);
        ctx.lineTo(-175 - Math.random() * 22, 10);
        ctx.lineTo(-142, 15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.moveTo(-142, 8);
        ctx.lineTo(-162 - Math.random() * 12, 10.5);
        ctx.lineTo(-142, 13);
        ctx.closePath();
        ctx.fill();
      }

      // Wheels
      [-92, 82].forEach((wx) => {
        ctx.fillStyle = "#080c16";
        ctx.beginPath();
        ctx.arc(wx, 16, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wx, 16, 13, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.restore();
    }

    function drawYachtScene(w, h) {
      // Sunset Mediterranean sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, "#030612");
      sky.addColorStop(0.5, "#131836");
      sky.addColorStop(1, "#7c2d12");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.55);

      const yx = w * 0.5;
      const yy = h * 0.54 + Math.sin(frame * 0.05) * 3.5;

      // Underwater Cyan LED Glow
      ctx.save();
      ctx.translate(yx, yy + 22);
      ctx.scale(1, 0.3);
      const led = ctx.createRadialGradient(0, 0, 15, 0, 0, 220);
      led.addColorStop(0, "rgba(0, 240, 255, 0.9)");
      led.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = led;
      ctx.beginPath();
      ctx.arc(0, 0, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Superyacht hull & decks
      ctx.save();
      ctx.translate(yx, yy);
      ctx.rotate(Math.sin(frame * 0.04) * 0.01);

      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(190, 10);
      ctx.lineTo(215, -10);
      ctx.lineTo(-190, -10);
      ctx.lineTo(-195, 14);
      ctx.lineTo(150, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main cabin deck
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(-155, -28, 240, 18);
      // Golden cabin windows
      ctx.fillStyle = "#ffcc00";
      for (let wx = -140; wx < 70; wx += 22) {
        ctx.fillRect(wx, -23, 14, 8);
      }

      // Upper bridge deck
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(-110, -44, 155, 16);
      ctx.fillStyle = "#0284c7";
      for (let bx = -95; bx < 30; bx += 20) {
        ctx.fillRect(bx, -40, 12, 8);
      }

      // Helipad [H]
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#ffcc00";
      ctx.beginPath();
      ctx.ellipse(150, -10, 24, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Ocean waves
      ctx.fillStyle = "rgba(4, 18, 38, 0.88)";
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) {
        const wy = h * 0.6 + Math.sin(x * 0.02 + frame * 0.06) * 6;
        ctx.lineTo(x, wy);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Rising golden champagne bubbles
      for (const b of oceanBubbles) {
        b.y -= b.vy;
        if (b.y < 0) b.y = h;
        ctx.fillStyle = "rgba(255, 204, 0, 0.55)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawJetScene(w, h) {
      // Stratosphere twilight sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#030410");
      sky.addColorStop(0.45, "#2e1065");
      sky.addColorStop(0.8, "#be185d");
      sky.addColorStop(1, "#f59e0b");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Parallax clouds
      for (const c of jetClouds) {
        c.x -= c.spd;
        if (c.x < -100) c.x = w + 100;
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const jx = w * 0.5;
      const jy = h * 0.46 + Math.sin(frame * 0.08) * 5;

      ctx.save();
      ctx.translate(jx, jy);
      ctx.rotate(-0.06 + Math.sin(frame * 0.06) * 0.01);

      // Swept wings
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(25, 2);
      ctx.lineTo(-42, 52);
      ctx.lineTo(-56, 46);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-56, -46);
      ctx.lineTo(-42, -52);
      ctx.closePath();
      ctx.fill();

      // Pearl fuselage
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(125, 0);
      ctx.bezierCurveTo(75, -14, -40, -14, -98, -6);
      ctx.lineTo(-120, -28);
      ctx.lineTo(-112, -30);
      ctx.lineTo(-96, -6);
      ctx.bezierCurveTo(-55, 14, 55, 14, 125, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Iconic oval G700 windows
      ctx.fillStyle = "#ffcc00";
      for (let ox = 48; ox > -60; ox -= 18) {
        ctx.beginPath();
        ctx.ellipse(ox, 0, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Twin Pearl turbofan afterburners
      [-14, 14].forEach((ny) => {
        ctx.fillStyle = "#334155";
        ctx.fillRect(-72, ny - 5, 38, 10);
        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.moveTo(-72, ny - 3);
        ctx.lineTo(-96 - Math.random() * 16, ny);
        ctx.lineTo(-72, ny + 3);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();
    }

    function drawBullScene(w, h) {
      // Cyber grid backdrop
      ctx.fillStyle = "#03060f";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255, 204, 0, 0.12)";
      ctx.lineWidth = 1;
      for (let gx = (frame * -4) % 40; gx < w; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }

      const bx = w * 0.5;
      const by = h * 0.52 + Math.sin(frame * 0.18) * 4;

      // Golden aura
      const aura = ctx.createRadialGradient(bx, by, 10, bx, by, 160);
      aura.addColorStop(0, "rgba(255, 204, 0, 0.38)");
      aura.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(bx, by, 160, 0, Math.PI * 2);
      ctx.fill();

      // Geometric Armored Golden Bull Silhouette & Laser Beams
      ctx.save();
      ctx.translate(bx, by);

      // Bull torso & shoulders
      const goldGrad = ctx.createLinearGradient(-90, -50, 90, 50);
      goldGrad.addColorStop(0, "#fef08a");
      goldGrad.addColorStop(0.5, "#eab308");
      goldGrad.addColorStop(1, "#a16207");
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-85, 25);
      ctx.lineTo(-65, -25);
      ctx.lineTo(15, -42);
      ctx.lineTo(65, -18);
      ctx.lineTo(85, 5);
      ctx.lineTo(45, 32);
      ctx.lineTo(-60, 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Horns
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(60, -18);
      ctx.lineTo(105, -48);
      ctx.stroke();

      // Laser Eyes Beam
      ctx.strokeStyle = "#ff0055";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(72, -6);
      ctx.lineTo(320, -28 + Math.sin(frame * 0.2) * 10);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    function renderLoop() {
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (activeScene === "supercar") {
        drawSupercarScene(w, h);
      } else if (activeScene === "yacht") {
        drawYachtScene(w, h);
      } else if (activeScene === "jet") {
        drawJetScene(w, h);
      } else {
        drawBullScene(w, h);
      }

      requestAnimationFrame(renderLoop);
    }

    renderLoop();
  }

  // DOM Content Loaded
  document.addEventListener("DOMContentLoaded", () => {
    initFirebaseAuth();
    setupAuthEvents();
    updateUserInterface(null);
    setupLiveTickerFlashes();
    setupClashHeroSimulation();
    setupFlexShowroomCanvas();
  });
})();
