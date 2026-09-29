"""
Trading Engine Settings Dialog for TradeGPT.
Allows players to customize the Solo Sandbox simulation temperature:
tuning volatility, shock sensitivity, and realism.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional, Callable
from profile_manager import get_profile, UserProfile


class SettingsDialog(tk.Toplevel):
    THEME_BG = "#0e1117"
    CARD_BG = "#161a25"
    BORDER_COLOR = "#2a2e39"
    TEXT_MUTED = "#848e9c"
    GREEN = "#00e676"
    GOLD = "#ffd700"
    BLUE = "#2962ff"
    RED = "#f23645"

    PRESETS = [
        (0.5, "0.5x Calm", "Institutional calm & high realism"),
        (1.0, "1.0x Standard", "Default balanced market"),
        (1.5, "1.5x Spicy", "High volatility & sharp breakouts"),
        (2.5, "2.5x Chaos", "Extreme degenerate crypto swings")
    ]

    def __init__(
        self,
        parent,
        current_temp: Optional[float] = None,
        on_temp_changed: Optional[Callable[[float], None]] = None,
        profile: Optional[UserProfile] = None
    ):
        super().__init__(parent)
        self.title("⚙️ TRADING ENGINE SETTINGS • SOLO SANDBOX")
        self.geometry("640x600")
        self.minsize(580, 520)
        self.configure(bg=self.THEME_BG)
        self.transient(parent)
        self.grab_set()

        self.profile = profile or get_profile()
        self.on_temp_changed = on_temp_changed

        # Determine initial temperature
        if current_temp is not None:
            self.temperature = float(current_temp)
        elif hasattr(self.profile, "trading_temperature"):
            self.temperature = float(self.profile.trading_temperature)
        else:
            self.temperature = 1.0

        self._center_window(parent)
        self._build_ui()

    def _center_window(self, parent):
        self.update_idletasks()
        try:
            pw, ph = parent.winfo_width(), parent.winfo_height()
            px, py = parent.winfo_rootx(), parent.winfo_rooty()
            w, h = 640, 600
            x = px + max(0, (pw - w) // 2)
            y = py + max(0, (ph - h) // 2)
            self.geometry(f"{w}x{h}+{x}+{y}")
        except Exception:
            pass

    def _build_ui(self):
        # 1. Header
        hdr_frame = tk.Frame(self, bg=self.THEME_BG, padx=24, pady=16)
        hdr_frame.pack(fill=tk.X)

        title_box = tk.Frame(hdr_frame, bg=self.THEME_BG)
        title_box.pack(side=tk.LEFT)

        tk.Label(
            title_box,
            text="⚙️ TRADING ENGINE SETTINGS",
            font=("Segoe UI", 16, "bold"),
            fg="#ffffff",
            bg=self.THEME_BG
        ).pack(anchor="w")

        tk.Label(
            title_box,
            text="Adjust Solo Sandbox temperature to control market volatility and realism.",
            font=("Segoe UI", 9),
            fg=self.TEXT_MUTED,
            bg=self.THEME_BG
        ).pack(anchor="w", pady=(2, 0))

        # Main scrollable/padded body
        body = tk.Frame(self, bg=self.THEME_BG, padx=24)
        body.pack(fill=tk.BOTH, expand=True)

        # 2. Temperature Display Card
        gauge_card = tk.Frame(body, bg=self.CARD_BG, bd=1, relief=tk.SOLID, padx=18, pady=14)
        gauge_card.pack(fill=tk.X, pady=(0, 14))

        tk.Label(
            gauge_card,
            text="SIMULATION TEMPERATURE",
            font=("Segoe UI", 9, "bold"),
            fg=self.TEXT_MUTED,
            bg=self.CARD_BG
        ).pack(anchor="w")

        top_val_f = tk.Frame(gauge_card, bg=self.CARD_BG)
        top_val_f.pack(fill=tk.X, pady=4)

        self.lbl_temp_val = tk.Label(
            top_val_f,
            text=f"{self.temperature:.2f}x",
            font=("Segoe UI", 26, "bold"),
            fg=self.GREEN,
            bg=self.CARD_BG
        )
        self.lbl_temp_val.pack(side=tk.LEFT, padx=(0, 12))

        self.lbl_temp_badge = tk.Label(
            top_val_f,
            text=self._get_badge_text(self.temperature),
            font=("Segoe UI", 9, "bold"),
            fg="#ffffff",
            bg="#1a2e22",
            padx=10,
            pady=4
        )
        self.lbl_temp_badge.pack(side=tk.LEFT)

        # Slider frame
        slider_f = tk.Frame(gauge_card, bg=self.CARD_BG)
        slider_f.pack(fill=tk.X, pady=(10, 4))

        self.slider_var = tk.DoubleVar(value=self.temperature)
        self.slider = tk.Scale(
            slider_f,
            from_=0.20,
            to=3.00,
            resolution=0.05,
            orient=tk.HORIZONTAL,
            variable=self.slider_var,
            command=self._on_slider_change,
            showvalue=False,
            bg=self.CARD_BG,
            fg="#ffffff",
            activebackground=self.BLUE,
            troughcolor="#0e1117",
            highlightthickness=0,
            bd=0,
            cursor="hand2"
        )
        self.slider.pack(fill=tk.X)

        # Scale endpoints
        endpoints_f = tk.Frame(gauge_card, bg=self.CARD_BG)
        endpoints_f.pack(fill=tk.X)
        tk.Label(endpoints_f, text="0.20x (Calm & Realistic)", font=("Segoe UI", 8), fg=self.TEXT_MUTED, bg=self.CARD_BG).pack(side=tk.LEFT)
        tk.Label(endpoints_f, text="1.00x (Standard)", font=("Segoe UI", 8), fg=self.TEXT_MUTED, bg=self.CARD_BG).pack(side=tk.LEFT, expand=True)
        tk.Label(endpoints_f, text="3.00x (Extreme Chaos)", font=("Segoe UI", 8), fg=self.TEXT_MUTED, bg=self.CARD_BG).pack(side=tk.RIGHT)

        # 3. Quick Presets Bar
        presets_f = tk.Frame(body, bg=self.THEME_BG)
        presets_f.pack(fill=tk.X, pady=(0, 14))

        tk.Label(
            presets_f,
            text="QUICK PRESETS:",
            font=("Segoe UI", 8, "bold"),
            fg=self.TEXT_MUTED,
            bg=self.THEME_BG
        ).pack(side=tk.LEFT, padx=(0, 8))

        self.preset_btns = []
        for val, label, desc in self.PRESETS:
            btn = tk.Button(
                presets_f,
                text=label,
                font=("Segoe UI", 8, "bold"),
                bg="#1e222d",
                fg="#c5c8d1",
                activebackground=self.BLUE,
                activeforeground="#ffffff",
                relief=tk.FLAT,
                padx=8,
                pady=3,
                cursor="hand2",
                command=lambda v=val: self._apply_preset(v)
            )
            btn.pack(side=tk.LEFT, padx=3)
            self.preset_btns.append(btn)

        # 4. Engine Impact Metrics Card
        metrics_card = tk.Frame(body, bg=self.CARD_BG, bd=1, relief=tk.SOLID, padx=16, pady=12)
        metrics_card.pack(fill=tk.X, pady=(0, 14))

        tk.Label(
            metrics_card,
            text="ACTIVE ENGINE IMPACT PROFILE",
            font=("Segoe UI", 9, "bold"),
            fg=self.TEXT_MUTED,
            bg=self.CARD_BG
        ).pack(anchor="w", pady=(0, 8))

        def make_metric_row(parent, label_text: str):
            row = tk.Frame(parent, bg=self.CARD_BG)
            row.pack(fill=tk.X, pady=2)
            lbl_k = tk.Label(row, text=label_text, font=("Segoe UI", 9), fg="#c5c8d1", bg=self.CARD_BG)
            lbl_k.pack(side=tk.LEFT)
            lbl_v = tk.Label(row, text="--", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg=self.CARD_BG)
            lbl_v.pack(side=tk.RIGHT)
            return lbl_v

        self.lbl_m_vol = make_metric_row(metrics_card, "Volatility Multiplier:")
        self.lbl_m_spikes = make_metric_row(metrics_card, "Micro-Spikes & Spreads:")
        self.lbl_m_news = make_metric_row(metrics_card, "Breaking News Catalyst Impact:")
        self.lbl_m_realism = make_metric_row(metrics_card, "Market Style & Dynamic:")

        # 5. PvP Duels Disclaimer Box
        duel_box = tk.Frame(body, bg="#1a1c23", bd=1, relief=tk.SOLID, padx=14, pady=10)
        duel_box.pack(fill=tk.X, pady=(0, 14))

        tk.Label(
            duel_box,
            text="⚔️ 1v1 PvP DUELS FAIR-PLAY NOTICE",
            font=("Segoe UI", 8, "bold"),
            fg=self.GOLD,
            bg="#1a1c23"
        ).pack(anchor="w")

        tk.Label(
            duel_box,
            text="Online 1v1 PvP Duels always enforce the standardized 1.0x temperature engine. This guarantees deterministic price synchronization and fair competitive balance between players.",
            font=("Segoe UI", 8),
            fg=self.TEXT_MUTED,
            bg="#1a1c23",
            wraplength=550,
            justify=tk.LEFT
        ).pack(anchor="w", pady=(2, 0))

        # 6. Bottom Action Buttons
        btn_bar = tk.Frame(self, bg=self.THEME_BG, padx=24, pady=14)
        btn_bar.pack(fill=tk.X, side=tk.BOTTOM)

        btn_reset = tk.Button(
            btn_bar,
            text="↺ Reset to 1.0x",
            font=("Segoe UI", 9),
            bg="#1e222d",
            fg=self.TEXT_MUTED,
            activebackground="#2a2e39",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            padx=12,
            pady=6,
            cursor="hand2",
            command=lambda: self._apply_preset(1.0)
        )
        btn_reset.pack(side=tk.LEFT)

        btn_close = tk.Button(
            btn_bar,
            text="Close",
            font=("Segoe UI", 9),
            bg="#1e222d",
            fg="#c5c8d1",
            activebackground="#2a2e39",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            padx=14,
            pady=6,
            cursor="hand2",
            command=self.destroy
        )
        btn_close.pack(side=tk.RIGHT, padx=(8, 0))

        btn_save = tk.Button(
            btn_bar,
            text="💾 Save & Apply",
            font=("Segoe UI", 9, "bold"),
            bg=self.BLUE,
            fg="#ffffff",
            activebackground="#3d72ff",
            relief=tk.FLAT,
            padx=16,
            pady=6,
            cursor="hand2",
            command=self._save_and_close
        )
        btn_save.pack(side=tk.RIGHT)

        self._update_metrics(self.temperature)

    def _get_badge_text(self, temp: float) -> str:
        if temp < 0.60:
            return "🥶 Ultra Calm & Realistic (Low Vol)"
        elif temp < 0.90:
            return "😌 Smooth Trending (Institutional)"
        elif temp <= 1.20:
            return "⚖️ Standard Engine (Balanced Day Trading)"
        elif temp <= 1.80:
            return "🔥 High Volatility (Sharp Swings)"
        else:
            return "⚡ Maximum Chaos (Extreme Degenerate)"

    def _get_badge_colors(self, temp: float) -> tuple[str, str]:
        if temp < 0.60:
            return "#3d72ff", "#132347"
        elif temp < 0.90:
            return "#00e676", "#143324"
        elif temp <= 1.20:
            return "#00e676", "#1a2e22"
        elif temp <= 1.80:
            return "#ff9100", "#3d2700"
        else:
            return "#ff5252", "#3d1419"

    def _on_slider_change(self, val_str: str):
        try:
            val = round(float(val_str), 2)
            self.temperature = val
            self._update_metrics(val)
            if self.on_temp_changed:
                self.on_temp_changed(val)
        except Exception:
            pass

    def _apply_preset(self, val: float):
        self.slider_var.set(val)
        self.temperature = val
        self._update_metrics(val)
        if self.on_temp_changed:
            self.on_temp_changed(val)

    def _update_metrics(self, temp: float):
        self.lbl_temp_val.config(text=f"{temp:.2f}x")
        badge_fg, badge_bg = self._get_badge_colors(temp)
        self.lbl_temp_badge.config(
            text=self._get_badge_text(temp),
            fg=badge_fg,
            bg=badge_bg
        )
        self.lbl_temp_val.config(fg=badge_fg)

        # Volatility percentage
        vol_pct = int(temp * 100)
        self.lbl_m_vol.config(text=f"{vol_pct}% of baseline")

        # Micro-spikes
        if temp < 0.60:
            self.lbl_m_spikes.config(text="Minimal & tight spreads", fg="#3d72ff")
        elif temp <= 1.20:
            return_txt = "Standard intraday noise"
            self.lbl_m_spikes.config(text=return_txt, fg="#00e676")
        elif temp <= 1.80:
            self.lbl_m_spikes.config(text="Frequent momentum spikes", fg="#ff9100")
        else:
            self.lbl_m_spikes.config(text="Violent erratic micro-jumps", fg="#ff5252")

        # News impact
        if temp < 0.60:
            self.lbl_m_news.config(text="Subdued & orderly reactions", fg="#3d72ff")
        elif temp <= 1.20:
            self.lbl_m_news.config(text="Standard market catalyst shocks", fg="#00e676")
        elif temp <= 1.80:
            self.lbl_m_news.config(text="Spicy amplified breakouts", fg="#ff9100")
        else:
            self.lbl_m_news.config(text="Wild supernova catalyst shocks", fg="#ff5252")

        # Realism
        if temp < 0.60:
            self.lbl_m_realism.config(text="Maximum Realism (Blue-Chip Institutional)", fg="#3d72ff")
        elif temp <= 1.20:
            self.lbl_m_realism.config(text="Authentic Day Trading Sim", fg="#00e676")
        elif temp <= 1.80:
            self.lbl_m_realism.config(text="High Adrenaline Action", fg="#ff9100")
        else:
            self.lbl_m_realism.config(text="Extreme Chaos / Crypto Arena", fg="#ff5252")

    def _save_and_close(self):
        val = round(self.temperature, 2)
        self.profile.set_trading_temperature(val)
        if self.on_temp_changed:
            self.on_temp_changed(val)
        self.destroy()
