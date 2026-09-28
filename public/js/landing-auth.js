/**
 * Day Trade Simulator • Landing & Downloads Interactive Script
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
      const raw = localStorage.getItem("daytradesim_profile");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      player_name: "Trader",
      vault_balance: 0.0,
      total_profit_banked: 0.0,
      duels_won: 0,
      owned_items: ["anim_confetti", "theme_cyberpunk", "sfx_bell", "title_intern"]
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

    const profile = getLocalProfile();

    if (user) {
      const displayName = user.displayName || profile.player_name || user.email.split("@")[0] || "Trader";

      // Update Nav
      if (navBtnSignIn) navBtnSignIn.style.display = "none";
      if (navUserPill) {
        navUserPill.style.display = "inline-flex";
        if (navUserName) navUserName.textContent = displayName;
        if (navUserVault) navUserVault.textContent = fmtMoney(profile.vault_balance);
      }

      // Update Auth Section Widget
      if (authFormWrap) authFormWrap.style.display = "none";
      if (userProfileWidget) {
        userProfileWidget.style.display = "block";
        if (profileUserName) profileUserName.textContent = displayName;
        if (profileUserEmail) profileUserEmail.textContent = user.email || "";
        if (profileVaultBal) profileVaultBal.textContent = fmtMoney(profile.vault_balance);
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
    let mode = "signin"; // "signin" or "signup"

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

    // Google Sign-In
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

    // Email/Password Form Submit
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

    // Sign Out
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

  // Interactive Terminal Preview Simulation (Eye-Candy)
  function setupTerminalDemo() {
    const priceEl = document.getElementById("demo-term-price");
    const chgEl = document.getElementById("demo-term-chg");
    const btnBuy = document.getElementById("demo-btn-buy");
    const btnShort = document.getElementById("demo-btn-short");
    const toast = document.getElementById("demo-toast");

    let currentPrice = 428.50;
    let basePrice = 412.00;

    function tickDemoPrice() {
      if (!priceEl) return;
      const delta = (Math.random() - 0.48) * 0.95;
      currentPrice = Math.max(10, currentPrice + delta);
      const chgVal = currentPrice - basePrice;
      const chgPct = (chgVal / basePrice) * 100;

      priceEl.textContent = "$" + currentPrice.toFixed(2);
      if (chgEl) {
        chgEl.textContent = (chgVal >= 0 ? "+" : "") + chgVal.toFixed(2) + " (" + (chgVal >= 0 ? "+" : "") + chgPct.toFixed(2) + "%)";
        chgEl.className = chgVal >= 0 ? "ticker-up" : "ticker-down";
      }
    }

    setInterval(tickDemoPrice, 1200);

    function showOrderToast(text) {
      if (!toast) return;
      toast.textContent = text;
      toast.style.display = "block";
      setTimeout(() => {
        if (toast) toast.style.display = "none";
      }, 3000);
    }

    if (btnBuy) {
      btnBuy.onclick = () => {
        showOrderToast(`🟢 BOUGHT 100 @ $${currentPrice.toFixed(2)} • ORDER FILLED`);
      };
    }

    if (btnShort) {
      btnShort.onclick = () => {
        showOrderToast(`🔴 SHORTED 100 @ $${currentPrice.toFixed(2)} • MARGIN LOCKED`);
      };
    }
  }

  // DOM Content Loaded
  document.addEventListener("DOMContentLoaded", () => {
    initFirebaseAuth();
    setupAuthEvents();
    setupTerminalDemo();
  });
})();
