"""
Next-Generation Ultra-Smooth Hardware-Accelerated Win Animation Engine for TradeGPT.
Renders 60 FPS delta-time physics-driven celebration overlays:
- Money Rain & Gold Confetti (3D tumbling banknotes, metallic gold coins, foil ribbons & sparkles)
- To The Moon Rocket Blast (Procedural sleek spacecraft, glowing lunar orb with craters, supersonic thruster plume, warp starfield & fireworks splashdown)
- Cyber Matrix Glitch Rain (Dual-layer code stream with white-hot head glow, CRT scanlines, cyber grid & telemetry HUD)
- Diamond Hands Supernova (Gravitational singularity vortex, blinding shockwaves & faceted crystal blast)
- Golden Bull Stampede (Charging procedural golden bull, twin laser eyes, 3D spinning coins & bullion avalanche)
"""

import tkinter as tk
import random
import math
import time
import sys
import threading
from typing import Optional, Callable, List, Dict, Any


def play_audio_fanfare(animation_id: str):
    """Plays an asynchronous celebratory audio chime on Windows systems without blocking the UI."""
    if sys.platform != "win32":
        return

    def _worker():
        try:
            import winsound
            if animation_id == "money_rain":
                # Double cash register cha-ching
                winsound.Beep(1200, 75)
                time.sleep(0.03)
                winsound.Beep(1760, 160)
            elif animation_id == "rocket_moon":
                # Ascending cosmic warp chime
                for freq in [440, 554, 659, 880, 1175, 1400]:
                    winsound.Beep(freq, 50)
            elif animation_id == "matrix_glitch":
                # High-speed cyber terminal chirp
                for freq in [980, 1400, 780, 1650, 1200]:
                    winsound.Beep(freq, 40)
            elif animation_id == "diamond_hands":
                # Gravitational charge-up into high crystal sparkle
                winsound.Beep(330, 130)
                time.sleep(0.04)
                for freq in [1320, 1760, 2093]:
                    winsound.Beep(freq, 70)
            elif animation_id == "golden_bull":
                # Sovereign Wall Street brass fanfare
                for freq in [523, 659, 784, 1046]:
                    winsound.Beep(freq, 85)
            else:
                winsound.Beep(1000, 100)
        except Exception:
            pass

    threading.Thread(target=_worker, daemon=True).start()


class WinAnimationOverlay:
    """
    Renders 60 FPS hardware-accelerated celebration animations over any Tkinter window.
    Features delta-time physics, dynamic resizing, procedural spacecraft & celestial bodies,
    shockwave rings, and non-blocking victory flow.
    """
    def __init__(
        self,
        parent: tk.Widget,
        animation_id: str = "money_rain",
        on_finished: Optional[Callable[[], None]] = None,
        profit_info: Optional[Dict[str, Any]] = None
    ):
        self.parent = parent
        self.animation_id = animation_id
        self.on_finished = on_finished
        self.profit_info = profit_info

        self.particles: List[Dict[str, Any]] = []
        self.frame_count = 0
        self.elapsed_time = 0.0
        self.max_duration = 4.3  # ~4.3 seconds
        self._anim_job: Optional[str] = None
        self._stopped = False
        self._last_time = time.perf_counter()

        self.w = max(parent.winfo_width(), 950)
        self.h = max(parent.winfo_height(), 620)

        # Screen shake offsets
        self.shake_x = 0.0
        self.shake_y = 0.0

        # Create overlay canvas
        self.canvas = tk.Canvas(
            parent,
            bg="#06090f",
            highlightthickness=0,
            bd=0
        )
        self.canvas.place(x=0, y=0, relwidth=1.0, relheight=1.0)
        tk.Misc.lift(self.canvas)

        # Dynamic resize listener
        self.canvas.bind("<Configure>", self._on_resize)

        # Interactive dismiss listeners
        self.canvas.bind("<Button-1>", lambda e: self.stop())
        self._esc_bind = self.parent.bind("<Escape>", lambda e: self.stop(), add="+")

        # Top-Right Skip / Close Button
        self.btn_skip = tk.Button(
            self.canvas,
            text="✕ Close [Esc]",
            font=("Segoe UI", 9, "bold"),
            bg="#181d29",
            fg="#94a3b8",
            activebackground="#ef4444",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            padx=12, pady=5,
            cursor="hand2",
            bd=0,
            command=self.stop
        )
        self.btn_skip.bind("<Enter>", lambda e: self.btn_skip.config(bg="#ef4444", fg="#ffffff"))
        self.btn_skip.bind("<Leave>", lambda e: self.btn_skip.config(bg="#181d29", fg="#94a3b8"))
        self.btn_skip_win = self.canvas.create_window(self.w - 75, 32, window=self.btn_skip)

        # Static HUD Elements
        self.banner_card = None
        self.banner_id = None
        self.sub_id = None
        self.profit_badge_rect = None
        self.profit_badge_text = None

        # Play victory audio in background
        play_audio_fanfare(self.animation_id)

        # Initialize specific animation scene
        self._init_animation()
        self._create_hud_elements()

        # Kickoff 60 FPS tick
        self._tick()

    def _on_resize(self, event):
        if event.widget == self.canvas and event.width > 50 and event.height > 50:
            self.w = event.width
            self.h = event.height
            self._reposition_hud()
            if self.animation_id == "rocket_moon":
                self._reposition_moon()

    def _create_hud_elements(self):
        cx = self.w // 2
        cy = 90 if self.profit_info else 105

        theme_colors = {
            "money_rain": ("#00e676", "#042614"),
            "rocket_moon": ("#00e5ff", "#041a2e"),
            "matrix_glitch": ("#39ff14", "#02240b"),
            "diamond_hands": ("#00f0ff", "#0d102b"),
            "golden_bull": ("#ffd700", "#2b1c03")
        }
        border_col, bg_col = theme_colors.get(self.animation_id, ("#00e676", "#071724"))

        titles = {
            "money_rain": "💸 CASH TSUNAMI! PROFIT LOCKED! 💸",
            "rocket_moon": "🚀 TO THE MOON! 100x GAINS! 🚀",
            "matrix_glitch": "⚡ SYSTEM OVERRIDE: VICTORY PROTOCOL ⚡",
            "diamond_hands": "💎 DIAMOND HANDS: COSMIC SUPERNOVA! 💎",
            "golden_bull": "👑 WALL STREET WHALE: BULL STAMPEDE! 👑"
        }
        subtitles = {
            "money_rain": "VAULT BOOSTED • HIGH ROLLER STATUS UNLOCKED",
            "rocket_moon": "INTERPLANETARY APEX • ORBITAL BREAKOUT CONFIRMED",
            "matrix_glitch": "WALL STREET TERMINAL COMPROMISED • ALPHA EXTRACTED",
            "diamond_hands": "UNSHAKEABLE CONVICTION • COSMIC WEALTH CREATED",
            "golden_bull": "MARKET APEX PREDATOR • UNSTOPPABLE RUNNING BULL"
        }

        is_duel = bool(self.profit_info and self.profit_info.get("duel_win"))
        is_me = bool(not self.profit_info or self.profit_info.get("is_me", True))
        winner_name = str(self.profit_info.get("winner_name", "Winner")) if self.profit_info else "Winner"
        opp_name = str(self.profit_info.get("opp_name", "Opponent")) if self.profit_info else "Opponent"
        diff = float(self.profit_info.get("diff", 0.0)) if self.profit_info else 0.0
        profit = float(self.profit_info.get("profit", 0.0)) if self.profit_info else 0.0

        if is_duel:
            if not is_me:
                sub_text = f"👑 {winner_name.upper()}'S VICTORY CELEBRATION • {subtitles.get(self.animation_id, 'VICTORY')}"
                if profit > 0:
                    p_text = f"👑 {winner_name} WINS (+${diff:,.2f} LEAD) • 💰 +${profit:,.2f} BANKED TO VAULT"
                else:
                    p_text = f"👑 {winner_name} WINS THE DUEL (+${diff:,.2f} LEAD OVER {opp_name})!"
                badge_bg = "#221a08"
                badge_outline = border_col
                badge_fg = border_col
            else:
                sub_text = f"👑 VICTORY OVER {opp_name.upper()} • {subtitles.get(self.animation_id, 'PROFIT SECURED')}"
                if profit > 0:
                    p_text = f"🏆 DUEL VICTORY! +${diff:,.2f} LEAD • 💰 +${profit:,.2f} TRANSFERRED TO VAULT"
                else:
                    p_text = f"🏆 DUEL VICTORY! +${diff:,.2f} LEAD OVER {opp_name}!"
                badge_bg = "#102e1b"
                badge_outline = "#00e676"
                badge_fg = "#00e676"
        else:
            sub_text = subtitles.get(self.animation_id, "PROFIT SECURED")
            p_text = ""
            if self.profit_info:
                if "profit" in self.profit_info and self.profit_info["profit"] > 0:
                    p_text = f"💰 +${self.profit_info['profit']:,.2f} TRANSFERRED TO VAULT"
                    if "new_balance" in self.profit_info:
                        p_text += f" • TOTAL VAULT: ${self.profit_info['new_balance']:,.2f}"
            badge_bg = "#102e1b"
            badge_outline = "#00e676"
            badge_fg = "#00e676"

        card_w, card_h = 410, (70 if self.profit_info else 48)
        self.banner_card = self.canvas.create_rectangle(
            cx - card_w, cy - card_h, cx + card_w, cy + card_h,
            fill=bg_col,
            outline=border_col,
            width=2
        )

        font_family = "Consolas" if self.animation_id == "matrix_glitch" else "Segoe UI"
        self.banner_id = self.canvas.create_text(
            cx, cy - (14 if self.profit_info else 8),
            text=titles.get(self.animation_id, "VICTORY!"),
            font=(font_family, 24, "bold"),
            fill=border_col
        )
        self.sub_id = self.canvas.create_text(
            cx, cy + (12 if not self.profit_info else 10),
            text=sub_text,
            font=(font_family, 10, "bold"),
            fill="#e2e8f0"
        )

        if p_text:
            self.profit_badge_rect = self.canvas.create_rectangle(
                cx - 350, cy + 34, cx + 350, cy + 58,
                fill=badge_bg, outline=badge_outline, width=1
            )
            self.profit_badge_text = self.canvas.create_text(
                cx, cy + 46,
                text=p_text,
                font=("Segoe UI", 10, "bold"),
                fill=badge_fg
            )

    def _reposition_hud(self):
        cx = self.w // 2
        cy = 90 if self.profit_info else 105
        card_w, card_h = 410, (70 if self.profit_info else 48)

        if self.banner_card:
            self.canvas.coords(self.banner_card, cx - card_w, cy - card_h, cx + card_w, cy + card_h)
        if self.banner_id:
            self.canvas.coords(self.banner_id, cx, cy - (14 if self.profit_info else 8))
        if self.sub_id:
            self.canvas.coords(self.sub_id, cx, cy + (12 if not self.profit_info else 10))
        if self.profit_badge_rect:
            self.canvas.coords(self.profit_badge_rect, cx - 350, cy + 34, cx + 350, cy + 58)
        if self.profit_badge_text:
            self.canvas.coords(self.profit_badge_text, cx, cy + 46)
        if hasattr(self, "btn_skip_win"):
            self.canvas.coords(self.btn_skip_win, self.w - 75, 32)

    def _init_animation(self):
        w, h = self.w, self.h
        if self.animation_id == "rocket_moon":
            self._init_rocket(w, h)
        elif self.animation_id == "matrix_glitch":
            self._init_matrix(w, h)
        elif self.animation_id == "diamond_hands":
            self._init_diamond_hands(w, h)
        elif self.animation_id == "golden_bull":
            self._init_golden_bull(w, h)
        else:
            self._init_money_rain(w, h)

    # =========================================================================
    # 1. MONEY RAIN & GOLD CONFETTI (3D BANKNOTES, GOLD COINS & METALLIC FOIL)
    # =========================================================================
    def _init_money_rain(self, w, h):
        self.canvas.configure(bg="#040b08")

        # 32 Realistic 3D Fluttering Banknotes ($100, $1k, $10k)
        denoms = ["$100", "$1,000", "$10,000"]
        for _ in range(32):
            self.particles.append({
                "type": "banknote",
                "x": random.uniform(30, w - 30),
                "y": random.uniform(-h * 0.9, -20),
                "vx": random.uniform(-1.0, 1.0),
                "vy": random.uniform(4.0, 8.5),
                "bw": random.uniform(42, 54),
                "bh": random.uniform(22, 28),
                "rot": random.uniform(0, math.pi * 2),
                "v_rot": random.uniform(-0.04, 0.04),
                "flip": random.uniform(0, math.pi * 2),
                "v_flip": random.uniform(0.08, 0.18),
                "wobble": random.uniform(0, math.pi * 2),
                "denom": random.choice(denoms),
                "poly_tag": None,
                "text_tag": None
            })

        # 22 3D Tumbling Metallic Gold Coins
        for _ in range(22):
            self.particles.append({
                "type": "gold_coin_3d",
                "x": random.uniform(40, w - 40),
                "y": random.uniform(-h * 0.8, -30),
                "vx": random.uniform(-1.8, 1.8),
                "vy": random.uniform(4.5, 9.0),
                "r": random.uniform(10.0, 14.0),
                "flip": random.uniform(0, math.pi * 2),
                "v_flip": random.uniform(0.12, 0.25),
                "tag_outer": None,
                "tag_inner": None,
                "tag_symbol": None
            })

        # 60 Shimmering Metallic Foil Confetti Ribbons
        confetti_colors = ["#ffd700", "#ffecb3", "#00e676", "#00e5ff", "#ff1744", "#ff4081", "#ffffff"]
        for _ in range(65):
            self.particles.append({
                "type": "confetti",
                "x": random.uniform(20, w - 20),
                "y": random.uniform(-h * 0.8, -10),
                "vx": random.uniform(-1.8, 1.8),
                "vy": random.uniform(4.5, 9.5),
                "w": random.uniform(10, 18),
                "h": random.uniform(6, 12),
                "color": random.choice(confetti_colors),
                "flip": random.uniform(0, math.pi * 2),
                "v_flip": random.uniform(0.12, 0.28),
                "rot": random.uniform(0, math.pi * 2),
                "v_rot": random.uniform(-0.08, 0.08),
                "tag": None
            })

        # 28 Shimmering Star Sparkles & Currency Icons with guaranteed bright fills
        sparkles = ["✨", "✦", "⭐", "💰", "🤑", "🌟"]
        for _ in range(28):
            self.particles.append({
                "type": "sparkle",
                "x": random.uniform(30, w - 30),
                "y": random.uniform(-h * 0.6, -10),
                "vx": random.uniform(-0.8, 0.8),
                "vy": random.uniform(3.0, 6.0),
                "char": random.choice(sparkles),
                "size": random.randint(14, 26),
                "color": random.choice(["#ffd700", "#ffffff", "#00e676", "#76ff03", "#00e5ff"]),
                "wobble": random.uniform(0, math.pi * 2),
                "tag": None
            })

    def _tick_money_rain(self, w, h, dt_scale: float):
        if self.banner_card:
            glow = "#00e676" if (int(self.elapsed_time * 8)) % 2 == 0 else "#ffd700"
            self.canvas.itemconfig(self.banner_card, outline=glow)

        for p in self.particles:
            p_type = p["type"]
            p["x"] += p["vx"] * dt_scale
            p["y"] += p["vy"] * dt_scale

            if p["y"] > h + 30:
                p["y"] = random.uniform(-70, -15)
                p["x"] = random.uniform(20, w - 20)

            if p_type == "banknote":
                p["rot"] += p["v_rot"] * dt_scale
                p["flip"] += p["v_flip"] * dt_scale
                p["wobble"] += 0.05 * dt_scale
                p["x"] += math.sin(p["wobble"]) * 1.2 * dt_scale

                cos_r = math.cos(p["rot"])
                sin_r = math.sin(p["rot"])
                cos_f = math.cos(p["flip"])
                hw = p["bw"] * 0.5
                hh = p["bh"] * 0.5 * cos_f

                x1 = p["x"] - hw * cos_r + hh * sin_r
                y1 = p["y"] - hw * sin_r - hh * cos_r
                x2 = p["x"] + hw * cos_r + hh * sin_r
                y2 = p["y"] + hw * sin_r - hh * cos_r
                x3 = p["x"] + hw * cos_r - hh * sin_r
                y3 = p["y"] + hw * sin_r + hh * cos_r
                x4 = p["x"] - hw * cos_r - hh * sin_r
                y4 = p["y"] - hw * sin_r + hh * cos_r

                front = (cos_f >= 0)
                body_col = "#00e676" if front else "#093318"
                out_col = "#00c853" if front else "#00e676"
                txt_col = "#ffffff" if front else "#00e676"

                if p["poly_tag"] is None:
                    p["poly_tag"] = self.canvas.create_polygon(
                        x1, y1, x2, y2, x3, y3, x4, y4,
                        fill=body_col, outline=out_col, width=1.5
                    )
                    p["text_tag"] = self.canvas.create_text(
                        p["x"], p["y"], text=p["denom"], font=("Segoe UI", 8, "bold"), fill=txt_col
                    )
                else:
                    self.canvas.coords(p["poly_tag"], x1, y1, x2, y2, x3, y3, x4, y4)
                    self.canvas.coords(p["text_tag"], p["x"], p["y"])
                    self.canvas.itemconfig(p["poly_tag"], fill=body_col, outline=out_col)
                    self.canvas.itemconfig(p["text_tag"], fill=txt_col)

            elif p_type == "gold_coin_3d":
                p["flip"] += p["v_flip"] * dt_scale
                cos_f = abs(math.cos(p["flip"]))
                cw = max(2.5, p["r"] * cos_f)
                r = p["r"]
                x, y = p["x"], p["y"]

                if p["tag_outer"] is None:
                    p["tag_outer"] = self.canvas.create_oval(
                        x - cw, y - r, x + cw, y + r,
                        fill="#ffd700", outline="#fff59d", width=1.5
                    )
                    p["tag_inner"] = self.canvas.create_oval(
                        x - cw * 0.7, y - r * 0.7, x + cw * 0.7, y + r * 0.7,
                        fill="#ffb300", outline=""
                    )
                    p["tag_symbol"] = self.canvas.create_text(
                        x, y, text="$", font=("Segoe UI", 9, "bold"), fill="#fffde7"
                    )
                else:
                    self.canvas.coords(p["tag_outer"], x - cw, y - r, x + cw, y + r)
                    self.canvas.coords(p["tag_inner"], x - cw * 0.7, y - r * 0.7, x + cw * 0.7, y + r * 0.7)
                    self.canvas.coords(p["tag_symbol"], x, y)

            elif p_type == "confetti":
                p["rot"] += p["v_rot"] * dt_scale
                p["flip"] += p["v_flip"] * dt_scale
                cos_f = abs(math.cos(p["flip"]))
                cw = max(2.0, p["w"] * cos_f)
                ch = p["h"]

                cos_r = math.cos(p["rot"])
                sin_r = math.sin(p["rot"])
                x1 = p["x"] - cw * cos_r + ch * sin_r
                y1 = p["y"] - cw * sin_r - ch * cos_r
                x2 = p["x"] + cw * cos_r + ch * sin_r
                y2 = p["y"] + cw * sin_r - ch * cos_r
                x3 = p["x"] + cw * cos_r - ch * sin_r
                y3 = p["y"] + cw * sin_r + ch * cos_r
                x4 = p["x"] - cw * cos_r - ch * sin_r
                y4 = p["y"] - cw * sin_r + ch * cos_r

                if p["tag"] is None:
                    p["tag"] = self.canvas.create_polygon(x1, y1, x2, y2, x3, y3, x4, y4, fill=p["color"], outline="")
                else:
                    self.canvas.coords(p["tag"], x1, y1, x2, y2, x3, y3, x4, y4)

            elif p_type == "sparkle":
                p["wobble"] += 0.08 * dt_scale
                p["x"] += math.sin(p["wobble"]) * 1.5 * dt_scale
                if p["tag"] is None:
                    p["tag"] = self.canvas.create_text(
                        p["x"], p["y"], text=p["char"], font=("Segoe UI", p["size"]), fill=p["color"]
                    )
                else:
                    self.canvas.coords(p["tag"], p["x"], p["y"])

    # =========================================================================
    # 2. TO THE MOON ROCKET BLAST (PROCEDURAL SPACECRAFT, LUMINOUS MOON & FIREWORKS)
    # =========================================================================
    def _init_rocket(self, w, h):
        self.canvas.configure(bg="#02040f")
        self.moon_x = w // 2
        self.moon_y = 125
        self.lunar_touchdown = False
        self.lunar_flash_r = 0.0

        # 1. Distant space starfield (55 twinkling cosmic background stars)
        self.space_stars = []
        for _ in range(55):
            sx = random.uniform(10, w - 10)
            sy = random.uniform(10, h - 10)
            sz = random.uniform(1.0, 2.6)
            col = random.choice(["#ffffff", "#80d8ff", "#ffd700", "#c084fc", "#e2e8f0"])
            tag = self.canvas.create_oval(sx - sz, sy - sz, sx + sz, sy + sz, fill=col, outline="")
            self.space_stars.append({"x": sx, "y": sy, "sz": sz, "tag": tag, "phase": random.uniform(0, 6.28)})

        # 2. Procedural Luminous Celestial Moon
        mx, my = self.moon_x, self.moon_y
        self.moon_halo1 = self.canvas.create_oval(
            mx - 85, my - 85, mx + 85, my + 85,
            outline="#00e5ff", width=3
        )
        self.moon_orbit_ring = self.canvas.create_oval(
            mx - 105, my - 105, mx + 105, my + 105,
            outline="#ffd700", width=1.5, dash=(6, 4)
        )
        self.moon_halo2 = self.canvas.create_oval(
            mx - 70, my - 70, mx + 70, my + 70,
            outline="#38bdf8", width=2
        )
        self.moon_body = self.canvas.create_oval(
            mx - 54, my - 54, mx + 54, my + 54,
            fill="#fffde7", outline="#fde047", width=2.5
        )
        self.moon_limb = self.canvas.create_arc(
            mx - 54, my - 54, mx + 54, my + 54,
            start=270, extent=180, fill="#f1f5f9", outline=""
        )
        self.moon_craters = [
            self.canvas.create_oval(mx - 20 - 9, my - 14 - 9, mx - 20 + 9, my - 14 + 9, fill="#cbd5e1", outline="#94a3b8", width=1),
            self.canvas.create_oval(mx + 16 - 7, my - 22 - 7, mx + 16 + 7, my - 22 + 7, fill="#cbd5e1", outline="#94a3b8", width=1),
            self.canvas.create_oval(mx + 14 - 11, my + 16 - 11, mx + 14 + 11, my + 16 + 11, fill="#cbd5e1", outline="#94a3b8", width=1),
            self.canvas.create_oval(mx - 24 - 8, my + 18 - 8, mx - 24 + 8, my + 18 + 8, fill="#cbd5e1", outline="#94a3b8", width=1),
            self.canvas.create_oval(mx - 3 - 6, my + 30 - 6, mx - 3 + 6, my + 30 + 6, fill="#cbd5e1", outline="#94a3b8", width=1),
        ]
        self.moon_crater_rims = [
            self.canvas.create_oval(mx - 22 - 4, my - 16 - 4, mx - 22 + 4, my - 16 + 4, fill="#ffffff", outline=""),
            self.canvas.create_oval(mx + 12 - 5, my + 14 - 5, mx + 12 + 5, my + 14 + 5, fill="#ffffff", outline=""),
        ]
        self.moon_hud_text = self.canvas.create_text(
            mx, my + 72,
            text="[ LUNAR APEX LOCKED: 100x ]",
            font=("Consolas", 10, "bold"),
            fill="#00e5ff"
        )
        self.lunar_flash_ring = self.canvas.create_oval(0, 0, 0, 0, outline="#ffffff", width=4)
        self.lunar_banner_rect = self.canvas.create_rectangle(0, 0, 0, 0, fill="#041a2e", outline="#00e5ff", width=2)
        self.lunar_banner_text = self.canvas.create_text(0, 0, text="", font=("Segoe UI", 11, "bold"), fill="#ffd700")

        # 3. 80 Perspective Hyperspace Warp Stars streaming outward from celestial apex (moon)
        for _ in range(80):
            angle = random.uniform(0, math.pi * 2)
            dist = random.uniform(30, max(w, h))
            self.particles.append({
                "type": "warp_star",
                "angle": angle,
                "dist": dist,
                "spd": random.uniform(12, 28),
                "color": random.choice(["#ffffff", "#00e5ff", "#80d8ff", "#ffd700", "#fde047"]),
                "line_tag": None
            })

        # 4. Rocket Physics State
        self.rocket = {
            "x": self.moon_x,
            "y": h + 100,
            "vy": -7.5,
            "accel": -0.16,
            "max_vy": -24.0
        }

        # 5. Multi-Tier Thruster Plasma Jets & Flame
        rx = self.rocket["x"]
        ry = self.rocket["y"]
        self.flame_poly = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, fill="#ff3d00", outline="#ffff00", width=1.5)
        self.flame_inner = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#ffea00", outline="")
        self.plasma_core = self.canvas.create_oval(0, 0, 0, 0, fill="#ffffff", outline="#00f0ff", width=1)
        self.shock_diamond1 = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, fill="#00f0ff", outline="#ffffff", width=1)
        self.shock_diamond2 = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, fill="#ffffff", outline="#00e5ff", width=1)

        # 6. Procedural Sleek Rocket Spacecraft Parts (pointing straight up)
        self.r_fin_left = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, fill="#0369a1", outline="#00e5ff", width=1.5)
        self.r_fin_right = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, fill="#0284c7", outline="#00e5ff", width=1.5)
        self.r_fuselage = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, fill="#f8fafc", outline="#38bdf8", width=1.5)
        self.r_fuselage_shade = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, fill="#cbd5e1", outline="")
        self.r_nose_tip = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#00e5ff", outline="#ffffff", width=1)
        self.r_cockpit = self.canvas.create_oval(0, 0, 0, 0, fill="#00f0ff", outline="#0284c7", width=1.5)
        self.r_cockpit_glint = self.canvas.create_oval(0, 0, 0, 0, fill="#ffffff", outline="")
        self.r_stripe1 = self.canvas.create_line(0, 0, 0, 0, fill="#00e5ff", width=2.5)
        self.r_stripe2 = self.canvas.create_line(0, 0, 0, 0, fill="#ffd700", width=2)
        self.r_nozzle_left = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, fill="#1e293b", outline="#ff6d00", width=1.2)
        self.r_nozzle_right = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, 0, 0, fill="#1e293b", outline="#ff6d00", width=1.2)

        # 7. Dynamic particle pools
        self.exhaust_particles: List[Dict[str, Any]] = []
        self.shockwaves: List[Dict[str, Any]] = []
        self.lunar_fireworks: List[Dict[str, Any]] = []

    def _reposition_moon(self):
        self.moon_x = self.w // 2
        mx, my = self.moon_x, self.moon_y
        if hasattr(self, "moon_halo1"):
            self.canvas.coords(self.moon_halo1, mx - 85, my - 85, mx + 85, my + 85)
            self.canvas.coords(self.moon_orbit_ring, mx - 105, my - 105, mx + 105, my + 105)
            self.canvas.coords(self.moon_halo2, mx - 70, my - 70, mx + 70, my + 70)
            self.canvas.coords(self.moon_body, mx - 54, my - 54, mx + 54, my + 54)
            self.canvas.coords(self.moon_limb, mx - 54, my - 54, mx + 54, my + 54)
            c_offsets = [(-20, -14, 9), (16, -22, 7), (14, 16, 11), (-24, 18, 8), (-3, 30, 6)]
            for i, (dx, dy, r) in enumerate(c_offsets):
                self.canvas.coords(self.moon_craters[i], mx + dx - r, my + dy - r, mx + dx + r, my + dy + r)
            self.canvas.coords(self.moon_crater_rims[0], mx - 22 - 4, my - 16 - 4, mx - 22 + 4, my - 16 + 4)
            self.canvas.coords(self.moon_crater_rims[1], mx + 12 - 5, my + 14 - 5, mx + 12 + 5, my + 14 + 5)
            self.canvas.coords(self.moon_hud_text, mx, my + 72)

    def _tick_rocket(self, w, h, dt_scale: float):
        rx = self.rocket["x"]
        ry = self.rocket["y"]

        # Accelerate rocket upwards
        self.rocket["vy"] = max(self.rocket["max_vy"], self.rocket["vy"] + self.rocket["accel"] * dt_scale)
        self.rocket["y"] += self.rocket["vy"] * dt_scale
        ry = self.rocket["y"]

        # Twinkle space stars
        for ss in self.space_stars:
            ss["phase"] += 0.06 * dt_scale
            tw = 0.6 + 0.4 * math.sin(ss["phase"])
            sz = ss["sz"] * tw
            self.canvas.coords(ss["tag"], ss["x"] - sz, ss["y"] - sz, ss["x"] + sz, ss["y"] + sz)

        # Pulse lunar target HUD
        if hasattr(self, "moon_hud_text"):
            blink_col = "#00e5ff" if (int(self.elapsed_time * 6)) % 2 == 0 else "#ffffff"
            self.canvas.itemconfig(self.moon_hud_text, fill=blink_col)

        # Screen shake during supersonic blastoff
        if ry > self.moon_y + 80:
            shake_amp = min(6.0, abs(self.rocket["vy"]) * 0.3)
            self.shake_x = random.uniform(-shake_amp, shake_amp)
            self.shake_y = random.uniform(-shake_amp, shake_amp)
        else:
            self.shake_x = 0.0
            self.shake_y = 0.0

        drx = rx + self.shake_x
        dry = ry + self.shake_y

        # Update procedural rocket components pointing straight up
        self.canvas.coords(self.r_fin_left, drx - 14, dry + 6, drx - 32, dry + 36, drx - 24, dry + 40, drx - 14, dry + 24)
        self.canvas.coords(self.r_fin_right, drx + 14, dry + 6, drx + 32, dry + 36, drx + 24, dry + 40, drx + 14, dry + 24)
        self.canvas.coords(
            self.r_fuselage,
            drx, dry - 42,
            drx + 10, dry - 22,
            drx + 14, dry - 4,
            drx + 14, dry + 26,
            drx - 14, dry + 26,
            drx - 14, dry - 4,
            drx - 10, dry - 22
        )
        self.canvas.coords(
            self.r_fuselage_shade,
            drx, dry - 42,
            drx + 10, dry - 22,
            drx + 14, dry - 4,
            drx + 14, dry + 26,
            drx, dry + 26
        )
        self.canvas.coords(self.r_nose_tip, drx, dry - 45, drx + 6, dry - 30, drx - 6, dry - 30)
        self.canvas.coords(self.r_cockpit, drx - 6, dry - 14, drx + 6, dry + 2)
        self.canvas.coords(self.r_cockpit_glint, drx - 4, dry - 12, drx - 1, dry - 6)
        self.canvas.coords(self.r_stripe1, drx - 13, dry + 6, drx + 13, dry + 6)
        self.canvas.coords(self.r_stripe2, drx - 13, dry + 14, drx + 13, dry + 14)
        self.canvas.coords(self.r_nozzle_left, drx - 12, dry + 26, drx - 3, dry + 26, drx - 2, dry + 32, drx - 13, dry + 32)
        self.canvas.coords(self.r_nozzle_right, drx + 3, dry + 26, drx + 12, dry + 26, drx + 13, dry + 32, drx + 2, dry + 32)

        # Multi-Tier Roaring Supersonic Thruster Flame
        flame_len = min(80.0, 36.0 + abs(self.rocket["vy"]) * 2.2 + random.uniform(-6, 6))
        flicker_x = random.uniform(-4, 4)
        fx1, fy1 = drx - 13, dry + 31
        fx2, fy2 = drx + 13, dry + 31
        fx3, fy3 = drx + flicker_x, dry + 31 + flame_len
        self.canvas.coords(self.flame_poly, fx1, fy1, drx - 8, dry + 48, fx3, fy3, drx + 8, dry + 48, fx2, fy2)
        self.canvas.itemconfig(self.flame_poly, fill=random.choice(["#ff3d00", "#ff6d00", "#ff9100"]))

        # Inner hyper-thrust core
        self.canvas.coords(self.flame_inner, drx - 7, dry + 31, drx + flicker_x * 0.5, dry + 31 + flame_len * 0.6, drx + 7, dry + 31)

        # White plasma emitter
        self.canvas.coords(self.plasma_core, drx - 8, dry + 28, drx + 8, dry + 40)

        # Shock diamonds along supersonic exhaust stream
        d1_y = dry + 42
        self.canvas.coords(self.shock_diamond1, drx, d1_y - 4, drx + 4, d1_y, drx, d1_y + 4, drx - 4, d1_y)
        d2_y = dry + 56
        self.canvas.coords(self.shock_diamond2, drx, d2_y - 3, drx + 3, d2_y, drx, d2_y + 3, drx - 3, d2_y)

        # Spawn exhaust sparks, fireballs & billowing smoke
        if len(self.exhaust_particles) < 40 and ry > self.moon_y - 10:
            for _ in range(2):
                self.exhaust_particles.append({
                    "x": drx + random.uniform(-8, 8),
                    "y": dry + 34,
                    "vx": random.uniform(-2.5, 2.5),
                    "vy": random.uniform(7.0, 15.0),
                    "size": random.uniform(4.0, 9.0),
                    "life": 1.0,
                    "decay": random.uniform(0.04, 0.08),
                    "color": random.choice(["#ff3d00", "#ff6d00", "#ffd700", "#ffffff", "#00e5ff", "#94a3b8"]),
                    "is_spark": (random.random() < 0.4),
                    "tag": None
                })

        # Update exhaust particles
        for ep in list(self.exhaust_particles):
            ep["x"] += ep["vx"] * dt_scale
            ep["y"] += ep["vy"] * dt_scale
            ep["life"] -= ep["decay"] * dt_scale
            if ep["life"] <= 0:
                if ep["tag"]:
                    self.canvas.delete(ep["tag"])
                self.exhaust_particles.remove(ep)
            else:
                x, y, sz = ep["x"], ep["y"], max(1.5, ep["size"] * ep["life"])
                if ep["tag"] is None:
                    if ep.get("is_spark"):
                        ep["tag"] = self.canvas.create_text(
                            x, y, text="✦", font=("Segoe UI", int(sz * 2) + 2, "bold"), fill=ep["color"]
                        )
                    else:
                        ep["tag"] = self.canvas.create_oval(x - sz, y - sz, x + sz, y + sz, fill=ep["color"], outline="")
                else:
                    if ep.get("is_spark"):
                        self.canvas.coords(ep["tag"], x, y)
                    else:
                        self.canvas.coords(ep["tag"], x - sz, y - sz, x + sz, y + sz)

        # Trigger Supersonic Mach Shockwaves
        if self.frame_count in (20, 38, 56):
            self.shockwaves.append({
                "x": drx,
                "y": dry + 32,
                "r": 12.0,
                "max_r": 180.0,
                "spd": 9.5,
                "color": random.choice(["#00e5ff", "#ffffff", "#ffd700"]),
                "tag": None
            })

        for sw in list(self.shockwaves):
            sw["r"] += sw["spd"] * dt_scale
            if sw["r"] >= sw["max_r"]:
                if sw["tag"]:
                    self.canvas.delete(sw["tag"])
                self.shockwaves.remove(sw)
            else:
                x1, y1 = sw["x"] - sw["r"], sw["y"] - sw["r"]
                x2, y2 = sw["x"] + sw["r"], sw["y"] + sw["r"]
                if sw["tag"] is None:
                    sw["tag"] = self.canvas.create_oval(x1, y1, x2, y2, outline=sw["color"], width=2)
                else:
                    self.canvas.coords(sw["tag"], x1, y1, x2, y2)

        # Hyperspace Warp Stars Stream
        max_dist = math.hypot(w, h)
        for p in self.particles:
            p["dist"] += p["spd"] * dt_scale
            if p["dist"] > max_dist:
                p["dist"] = random.uniform(25, 80)
                p["angle"] = random.uniform(0, math.pi * 2)

            cos_a = math.cos(p["angle"])
            sin_a = math.sin(p["angle"])
            tail_len = min(60.0, p["dist"] * 0.22)
            x1 = self.moon_x + cos_a * p["dist"]
            y1 = self.moon_y + sin_a * p["dist"]
            x2 = self.moon_x + cos_a * (p["dist"] + tail_len)
            y2 = self.moon_y + sin_a * (p["dist"] + tail_len)

            if p["line_tag"] is None:
                p["line_tag"] = self.canvas.create_line(x1, y1, x2, y2, fill=p["color"], width=1.5)
            else:
                self.canvas.coords(p["line_tag"], x1, y1, x2, y2)

        # Lunar Touchdown & Fireworks Finale
        if ry <= self.moon_y + 40 and not self.lunar_touchdown:
            self.lunar_touchdown = True
            self.lunar_flash_r = 15.0

            # Display Landing Banner
            self.canvas.coords(self.lunar_banner_rect, self.moon_x - 190, self.moon_y + 88, self.moon_x + 190, self.moon_y + 120)
            self.canvas.coords(self.lunar_banner_text, self.moon_x, self.moon_y + 104)
            self.canvas.itemconfig(self.lunar_banner_text, text="🚀 TOUCHDOWN! 100x APEX CONFIRMED! 🚀")

            # 75 Brilliant Fireworks Starbursts shooting 360 degrees
            fw_colors = ["#ffd700", "#00f0ff", "#39ff14", "#ff007f", "#ffffff", "#fde047", "#80d8ff"]
            fw_chars = ["✦", "★", "✧", "💠", "●", "✨"]
            for _ in range(75):
                ang = random.uniform(0, math.pi * 2)
                spd = random.uniform(4.0, 16.0)
                self.lunar_fireworks.append({
                    "x": self.moon_x,
                    "y": self.moon_y,
                    "vx": math.cos(ang) * spd,
                    "vy": math.sin(ang) * spd,
                    "color": random.choice(fw_colors),
                    "char": random.choice(fw_chars),
                    "size": random.randint(12, 22),
                    "drag": random.uniform(0.965, 0.985),
                    "tag": None
                })

        # Expanding lunar touchdown flash ring
        if self.lunar_touchdown and self.lunar_flash_r < 180.0:
            self.lunar_flash_r += 12.0 * dt_scale
            r = self.lunar_flash_r
            self.canvas.coords(self.lunar_flash_ring, self.moon_x - r, self.moon_y - r, self.moon_x + r, self.moon_y + r)
        elif self.lunar_touchdown:
            self.canvas.coords(self.lunar_flash_ring, 0, 0, 0, 0)

        # Update Fireworks Particles with drag & gravity
        for fw in self.lunar_fireworks:
            fw["vx"] *= fw["drag"] ** dt_scale
            fw["vy"] = (fw["vy"] + 0.18 * dt_scale) * (fw["drag"] ** dt_scale)
            fw["x"] += fw["vx"] * dt_scale
            fw["y"] += fw["vy"] * dt_scale
            if fw["tag"] is None:
                fw["tag"] = self.canvas.create_text(
                    fw["x"], fw["y"],
                    text=fw["char"],
                    font=("Segoe UI", fw["size"], "bold"),
                    fill=fw["color"]
                )
            else:
                self.canvas.coords(fw["tag"], fw["x"], fw["y"])

    # =========================================================================
    # 3. CYBER MATRIX GLITCH RAIN (CODE STREAM, CRT SCANLINES & CYBER HUD)
    # =========================================================================
    def _init_matrix(self, w, h):
        self.canvas.configure(bg="#010a04")

        # Digital Cyber Wireframe Grid on Floor
        self.cyber_grid_lines = []
        for i in range(10):
            gy = h - i * 18
            line = self.canvas.create_line(0, gy, w, gy, fill="#022e11", width=1)
            self.cyber_grid_lines.append(line)

        # Code Stream Columns (32 columns)
        cols = max(18, min(42, w // 32))
        pool = ["$", "¥", "€", "₿", "BUY", "WIN", "BULL", "GAIN", "CALL", "7F", "A4", "0", "1", "ALPHA", "EXE", "SEC", "+999%"]
        self.matrix_cols: List[Dict[str, Any]] = []

        for c in range(cols):
            x = c * 32 + 16
            chars = [random.choice(pool) for _ in range(14)]
            self.matrix_cols.append({
                "x": x,
                "y": random.uniform(-350, 0),
                "spd": random.uniform(12.0, 24.0),
                "chars": chars,
                "head_char": random.choice(pool),
                "head_tag": None,
                "trail_tag": None
            })

        # CRT Scanline Sweep
        self.scanline_y = 0.0
        self.scanline = self.canvas.create_line(0, 0, w, 0, fill="#39ff14", width=2)

        # Dynamic Glitch Bands
        self.glitch_rect1 = self.canvas.create_rectangle(0, -50, w, -50, fill="#00ff66", outline="")
        self.glitch_rect2 = self.canvas.create_rectangle(0, -50, w, -50, fill="#00e5ff", outline="")

    def _tick_matrix(self, w, h, dt_scale: float):
        pool = ["$", "¥", "€", "₿", "BUY", "WIN", "BULL", "GAIN", "CALL", "7F", "A4", "0", "1", "ALPHA", "EXE", "SEC", "+999%"]

        # CRT Scanline Sweep
        self.scanline_y = (self.scanline_y + 4.5 * dt_scale) % h
        self.canvas.coords(self.scanline, 0, self.scanline_y, w, self.scanline_y)

        # Glitch Slice Bands
        if random.random() < 0.25:
            gy1 = random.uniform(40, h - 40)
            gh1 = random.uniform(4, 18)
            self.canvas.coords(self.glitch_rect1, 0, gy1, w, gy1 + gh1)
            self.canvas.itemconfig(self.glitch_rect1, fill=random.choice(["#00e676", "#00e5ff", "#ff007f"]))
        else:
            self.canvas.coords(self.glitch_rect1, 0, -50, w, -50)

        for col in self.matrix_cols:
            col["y"] += col["spd"] * dt_scale
            if col["y"] > h + 250:
                col["y"] = random.uniform(-250, -40)
                col["spd"] = random.uniform(12.0, 24.0)

            # Random character morphing
            if random.random() < 0.20:
                idx = random.randint(0, len(col["chars"]) - 1)
                col["chars"][idx] = random.choice(pool)
                col["head_char"] = random.choice(pool)

            trail_text = "\n".join(col["chars"])
            if col["trail_tag"] is None:
                col["trail_tag"] = self.canvas.create_text(
                    col["x"], col["y"],
                    text=trail_text,
                    font=("Consolas", 10, "bold"),
                    fill="#00e676",
                    anchor="n"
                )
                col["head_tag"] = self.canvas.create_text(
                    col["x"], col["y"] + (len(col["chars"]) * 14),
                    text=col["head_char"],
                    font=("Consolas", 12, "bold"),
                    fill="#ffffff",
                    anchor="n"
                )
            else:
                self.canvas.coords(col["trail_tag"], col["x"], col["y"])
                self.canvas.itemconfig(col["trail_tag"], text=trail_text)
                self.canvas.coords(col["head_tag"], col["x"], col["y"] + (len(col["chars"]) * 14))
                self.canvas.itemconfig(col["head_tag"], text=col["head_char"])

        if self.sub_id:
            cursor = "_" if (int(self.elapsed_time * 4)) % 2 == 0 else " "
            base_txt = "WALL STREET TERMINAL COMPROMISED • ALPHA EXTRACTED"
            self.canvas.itemconfig(self.sub_id, text=f"{base_txt} {cursor}")

    # =========================================================================
    # 4. DIAMOND HANDS SUPERNOVA (SINGULARITY, EXPANDING SHOCKWAVES & GEMS)
    # =========================================================================
    def _init_diamond_hands(self, w, h):
        self.canvas.configure(bg="#07071a")
        self.cx = w // 2
        self.cy = h // 2 + 10
        self.detonated = False

        self._dh_facet_coords = [
            ([(-26, -34), (26, -34), (16, -10), (-16, -10)], "table"),
            ([(-46, -34), (-26, -34), (-16, -10), (-52, -10)], "crown_left"),
            ([(26, -34), (46, -34), (52, -10), (16, -10)], "crown_right"),
            ([(0, 46), (-16, -10), (16, -10)], "pavilion_center"),
            ([(0, 46), (-52, -10), (-16, -10)], "pavilion_left"),
            ([(0, 46), (16, -10), (52, -10)], "pavilion_right"),
        ]

        self._dh_palettes = {
            "cyan": {
                "table": "#ffffff", "crown_left": "#a5f3fc", "crown_right": "#7dd3fc",
                "pavilion_center": "#00f0ff", "pavilion_left": "#0284c7", "pavilion_right": "#0ea5e9",
                "outline": "#e0f2fe"
            },
            "violet": {
                "table": "#ffffff", "crown_left": "#f3e8ff", "crown_right": "#e9d5ff",
                "pavilion_center": "#c084fc", "pavilion_left": "#7e22ce", "pavilion_right": "#a855f7",
                "outline": "#faf5ff"
            },
            "gold": {
                "table": "#ffffff", "crown_left": "#fef9c3", "crown_right": "#fef08a",
                "pavilion_center": "#fde047", "pavilion_left": "#a16207", "pavilion_right": "#eab308",
                "outline": "#fffbeb"
            },
            "rose": {
                "table": "#ffffff", "crown_left": "#fce7f3", "crown_right": "#fbcfe8",
                "pavilion_center": "#f472b6", "pavilion_left": "#9d174d", "pavilion_right": "#db2777",
                "outline": "#fff1f2"
            },
            "ice": {
                "table": "#ffffff", "crown_left": "#e0f2fe", "crown_right": "#bae6fd",
                "pavilion_center": "#38bdf8", "pavilion_left": "#0369a1", "pavilion_right": "#0284c7",
                "outline": "#ffffff"
            }
        }

        # 1. Twinkling Cosmic Background Starfield
        self.cosmic_stars: List[Dict[str, Any]] = []
        for _ in range(45):
            self.cosmic_stars.append({
                "x": random.uniform(10, w - 10),
                "y": random.uniform(10, h - 10),
                "phase": random.uniform(0, math.pi * 2),
                "spd": random.uniform(0.04, 0.09),
                "size": random.uniform(1.2, 3.2),
                "color": random.choice(["#ffffff", "#67e8f9", "#c084fc", "#38bdf8", "#fef08a"]),
                "tag": None
            })

        # 2. Deep Space Nebula Glow Auras
        self.nebula_auras = [
            {"r": 360.0, "color": "#1e103a", "width": 8.0, "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#1e103a", width=8)},
            {"r": 240.0, "color": "#0c4a6e", "width": 5.0, "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#0c4a6e", width=5)},
            {"r": 130.0, "color": "#0369a1", "width": 3.0, "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#0369a1", width=3)},
        ]

        # 3. Rotating Cosmic Prism Beams
        self.beam_angle = 0.0
        self.prism_beams: List[int] = []
        for _ in range(12):
            tag = self.canvas.create_line(0, 0, 0, 0, fill="#132742", width=1.5)
            self.prism_beams.append(tag)

        # 4. Central Faceted Brilliant-Cut Diamond
        self.center_diamond_tags: List[int] = []
        c_pal = self._dh_palettes["cyan"]
        for _, facet_key in self._dh_facet_coords:
            tag = self.canvas.create_polygon(0, 0, 0, 0, fill=c_pal[facet_key], outline=c_pal["outline"], width=2)
            self.center_diamond_tags.append(tag)
        self.diamond_glint_tag = self.canvas.create_text(self.cx, self.cy, text="✦", font=("Segoe UI", 16, "bold"), fill="#ffffff")

        # 5. Conviction Hands & Charging Callout
        self.dh_hand_left = self.canvas.create_text(self.cx - 95, self.cy, text="🙌", font=("Segoe UI", 36), fill="#38bdf8")
        self.dh_hand_right = self.canvas.create_text(self.cx + 95, self.cy, text="🙌", font=("Segoe UI", 36), fill="#38bdf8")
        self.dh_text_id = self.canvas.create_text(
            self.cx, self.cy + 85, text="💎 CHARGING SINGULARITY... 💎", font=("Segoe UI", 14, "bold"), fill="#00f0ff"
        )
        self.dh_sub_text_id: Optional[int] = None

        # 6. Gravitational Singularity Inward Contracting Rings
        self.gravity_rings = [
            {"r": 380.0, "spd": 11.0, "color": "#00f0ff", "width": 3.0, "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#00f0ff", width=3)},
            {"r": 280.0, "spd": 9.5, "color": "#c084fc", "width": 2.5, "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#c084fc", width=2.5)},
            {"r": 180.0, "spd": 8.0, "color": "#38bdf8", "width": 2.0, "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#38bdf8", width=2)},
            {"r": 90.0, "spd": 6.5, "color": "#ffffff", "width": 1.5, "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#ffffff", width=1.5)},
        ]

        # 7. Inward Gravity Particle Motes
        for _ in range(45):
            angle = random.uniform(0, math.pi * 2)
            dist = random.uniform(160, 440)
            self.particles.append({
                "type": "inward_mote",
                "angle": angle,
                "dist": dist,
                "spd": random.uniform(7.0, 16.0),
                "char": random.choice(["✦", "✧", "⚡", "◆", "💎"]),
                "color": random.choice(["#00f0ff", "#ffffff", "#c084fc", "#38bdf8", "#fde047"]),
                "tag": None
            })

        # 8. Outward Shockwaves & Exploding Facets
        self.cosmic_shockwaves: List[Dict[str, Any]] = []
        self.exploding_facets: List[Dict[str, Any]] = []

    def _render_diamond_polygons(self, tags: List[int], cx: float, cy: float, scale: float, angle: float):
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        for i, (facet_pts, _) in enumerate(self._dh_facet_coords):
            flat = []
            for px, py in facet_pts:
                rx = cx + (px * cos_a - py * sin_a) * scale
                ry = cy + (px * sin_a + py * cos_a) * scale
                flat.extend((rx, ry))
            self.canvas.coords(tags[i], *flat)

    def _tick_diamond_hands(self, w, h, dt_scale: float):
        self.cx = w // 2
        self.cy = h // 2 + 10

        # Update Cosmic Stars
        for s in self.cosmic_stars:
            s["phase"] += s["spd"] * dt_scale
            twinkle = 0.5 + 0.5 * math.sin(s["phase"])
            sz = s["size"] * (0.8 + 0.4 * twinkle)
            x, y = s["x"], s["y"]
            if s["tag"] is None:
                s["tag"] = self.canvas.create_oval(x - sz, y - sz, x + sz, y + sz, fill=s["color"], outline="")
            else:
                self.canvas.coords(s["tag"], x - sz, y - sz, x + sz, y + sz)

        # Update Rotating Cosmic Prism Beams
        self.beam_angle += 0.009 * dt_scale
        beam_len = max(w, h) * 0.75
        for i, tag in enumerate(self.prism_beams):
            ang = self.beam_angle + i * (math.pi / 6)
            bx = self.cx + math.cos(ang) * beam_len
            by = self.cy + math.sin(ang) * beam_len
            self.canvas.coords(tag, self.cx, self.cy, bx, by)

        # Update Nebula Glow Auras
        aura_pulse = 1.0 + math.sin(self.elapsed_time * 4.0) * 0.05
        for aura in self.nebula_auras:
            r = aura["r"] * aura_pulse
            self.canvas.coords(aura["tag"], self.cx - r, self.cy - r, self.cx + r, self.cy + r)

        # Phase 1: Singularity Compression
        if self.elapsed_time < 1.1:
            progress = self.elapsed_time / 1.1
            vib_x = random.uniform(-progress * 4.5, progress * 4.5)
            vib_y = random.uniform(-progress * 4.5, progress * 4.5)
            d_scale = 0.85 + progress * 0.55
            d_rot = math.sin(self.elapsed_time * 14.0) * 0.08

            self._render_diamond_polygons(
                self.center_diamond_tags, self.cx + vib_x, self.cy + vib_y, d_scale, d_rot
            )

            glint_x = self.cx + vib_x - 22 * d_scale
            glint_y = self.cy + vib_y - 28 * d_scale
            self.canvas.coords(self.diamond_glint_tag, glint_x, glint_y)

            self.canvas.coords(self.dh_hand_left, self.cx - 95 + progress * 25 + vib_x, self.cy + vib_y)
            self.canvas.coords(self.dh_hand_right, self.cx + 95 - progress * 25 + vib_x, self.cy + vib_y)

            self.canvas.coords(self.dh_text_id, self.cx + vib_x, self.cy + 85 + vib_y)
            pulse_col = "#00f0ff" if int(self.elapsed_time * 10) % 2 == 0 else "#ffffff"
            self.canvas.itemconfig(self.dh_text_id, fill=pulse_col)

            for gr in self.gravity_rings:
                gr["r"] -= gr["spd"] * dt_scale
                if gr["r"] <= 12.0:
                    gr["r"] = 380.0
                r = gr["r"]
                self.canvas.coords(gr["tag"], self.cx - r, self.cy - r, self.cx + r, self.cy + r)

            for mote in self.particles:
                mote["dist"] -= mote["spd"] * dt_scale
                if mote["dist"] < 18.0:
                    mote["dist"] = random.uniform(220, 440)
                mx = self.cx + math.cos(mote["angle"]) * mote["dist"]
                my = self.cy + math.sin(mote["angle"]) * mote["dist"]
                if mote["tag"] is None:
                    mote["tag"] = self.canvas.create_text(
                        mx, my, text=mote["char"], font=("Segoe UI", 12, "bold"), fill=mote["color"]
                    )
                else:
                    self.canvas.coords(mote["tag"], mx, my)

        # Phase 2: THE SUPERNOVA BURST DETONATION!
        else:
            if not self.detonated:
                self.detonated = True
                for gr in self.gravity_rings:
                    self.canvas.delete(gr["tag"])
                for mote in self.particles:
                    if mote.get("tag"):
                        self.canvas.delete(mote["tag"])
                self.particles.clear()
                self.canvas.delete(self.dh_hand_left)
                self.canvas.delete(self.dh_hand_right)

                beam_colors = ["#00f0ff", "#ffffff", "#c084fc", "#38bdf8", "#fde047"]
                for i, tag in enumerate(self.prism_beams):
                    self.canvas.itemconfig(tag, fill=beam_colors[i % len(beam_colors)], width=2.5)

                self.canvas.itemconfig(
                    self.dh_text_id,
                    text="💥 SUPERNOVA DETONATION! 💥",
                    font=("Segoe UI", 20, "bold"),
                    fill="#ffffff"
                )
                self.dh_sub_text_id = self.canvas.create_text(
                    self.cx, self.cy + 115,
                    text="✨ UNSHAKEABLE CONVICTION • COSMIC WEALTH CREATED ✨",
                    font=("Segoe UI", 11, "bold"),
                    fill="#38bdf8"
                )

                shockwave_specs = [
                    ("#ffffff", 24.0, 4.0),
                    ("#00f0ff", 18.0, 3.5),
                    ("#d946ef", 13.0, 3.0),
                    ("#38bdf8", 8.5, 2.5),
                ]
                for sw_color, spd, sw_w in shockwave_specs:
                    self.cosmic_shockwaves.append({
                        "r": 15.0,
                        "spd": spd,
                        "max_r": max(w, h) * 0.95,
                        "tag": self.canvas.create_oval(0, 0, 0, 0, outline=sw_color, width=sw_w)
                    })

                palette_keys = ["cyan", "violet", "gold", "rose", "ice"]
                for _ in range(35):
                    angle = random.uniform(0, math.pi * 2)
                    spd = random.uniform(8.0, 24.0)
                    pal_name = random.choice(palette_keys)
                    pal = self._dh_palettes[pal_name]
                    shard_tags = []
                    for _, facet_key in self._dh_facet_coords:
                        tag = self.canvas.create_polygon(0, 0, 0, 0, fill=pal[facet_key], outline=pal["outline"], width=1.2)
                        shard_tags.append(tag)
                    self.exploding_facets.append({
                        "x": self.cx,
                        "y": self.cy,
                        "vx": math.cos(angle) * spd,
                        "vy": math.sin(angle) * spd,
                        "rot": random.uniform(0, math.pi * 2),
                        "v_rot": random.uniform(-0.16, 0.16),
                        "scale": random.uniform(0.18, 0.38),
                        "drag": random.uniform(0.975, 0.99),
                        "tags": shard_tags
                    })

                starburst_chars = ["✦", "★", "✧", "💠", "⚡"]
                starburst_colors = ["#ffffff", "#00f0ff", "#fde047", "#f472b6", "#38bdf8"]
                for _ in range(35):
                    angle = random.uniform(0, math.pi * 2)
                    spd = random.uniform(6.0, 20.0)
                    self.particles.append({
                        "type": "starburst",
                        "x": self.cx,
                        "y": self.cy,
                        "vx": math.cos(angle) * spd,
                        "vy": math.sin(angle) * spd,
                        "char": random.choice(starburst_chars),
                        "size": random.randint(16, 26),
                        "color": random.choice(starburst_colors),
                        "drag": random.uniform(0.97, 0.99),
                        "tag": None
                    })

                trophy_chars = ["🪙", "💎", "✨"]
                for _ in range(25):
                    angle = random.uniform(0, math.pi * 2)
                    spd = random.uniform(7.0, 21.0)
                    char = random.choice(trophy_chars)
                    col = "#ffd700" if char == "🪙" else "#00f0ff"
                    self.particles.append({
                        "type": "trophy",
                        "x": self.cx,
                        "y": self.cy,
                        "vx": math.cos(angle) * spd,
                        "vy": math.sin(angle) * spd,
                        "char": char,
                        "size": random.randint(18, 28),
                        "color": col,
                        "drag": random.uniform(0.975, 0.99),
                        "tag": None
                    })

            since_det = self.elapsed_time - 1.1
            shake_amp = max(0.0, 9.0 * (1.0 - since_det / 0.55))
            self.shake_x = random.uniform(-shake_amp, shake_amp)
            self.shake_y = random.uniform(-shake_amp, shake_amp)

            c_scale = 1.35 + math.sin(self.elapsed_time * 6.0) * 0.1
            c_rot = self.elapsed_time * 0.4
            self._render_diamond_polygons(
                self.center_diamond_tags, self.cx + self.shake_x, self.cy + self.shake_y, c_scale, c_rot
            )

            glint_x = self.cx + self.shake_x - 22 * c_scale
            glint_y = self.cy + self.shake_y - 28 * c_scale
            self.canvas.coords(self.diamond_glint_tag, glint_x, glint_y)

            self.canvas.coords(self.dh_text_id, self.cx + self.shake_x, self.cy + 85 + self.shake_y)
            if self.dh_sub_text_id:
                self.canvas.coords(self.dh_sub_text_id, self.cx + self.shake_x, self.cy + 115 + self.shake_y)

            for sw in list(self.cosmic_shockwaves):
                sw["r"] += sw["spd"] * dt_scale
                r = sw["r"]
                if r >= sw["max_r"]:
                    self.canvas.delete(sw["tag"])
                    self.cosmic_shockwaves.remove(sw)
                else:
                    self.canvas.coords(sw["tag"], self.cx - r, self.cy - r, self.cx + r, self.cy + r)

            for shard in self.exploding_facets:
                shard["vx"] *= shard["drag"] ** dt_scale
                shard["vy"] = (shard["vy"] + 0.22 * dt_scale) * (shard["drag"] ** dt_scale)
                shard["x"] += shard["vx"] * dt_scale
                shard["y"] += shard["vy"] * dt_scale
                shard["rot"] += shard["v_rot"] * dt_scale
                self._render_diamond_polygons(
                    shard["tags"], shard["x"], shard["y"], shard["scale"], shard["rot"]
                )

            for p in self.particles:
                p["vx"] *= p["drag"] ** dt_scale
                p["vy"] = (p["vy"] + 0.22 * dt_scale) * (p["drag"] ** dt_scale)
                p["x"] += p["vx"] * dt_scale
                p["y"] += p["vy"] * dt_scale

                if p["tag"] is None:
                    p["tag"] = self.canvas.create_text(
                        p["x"], p["y"], text=p["char"], font=("Segoe UI", p["size"], "bold"), fill=p["color"]
                    )
                else:
                    self.canvas.coords(p["tag"], p["x"], p["y"])

    # =========================================================================
    # 5. GOLDEN BULL STAMPEDE (PROCEDURAL BULL, 3D COINS & LASER BEAMS)
    # =========================================================================
    def _init_golden_bull(self, w, h):
        self.canvas.configure(bg="#0c0903")
        self.bull_x = -220.0
        self.bull_y = h // 2 + 20
        self.bull_vx = 17.5

        # Procedural Golden Bull Geometry
        # Motion blur trailing silhouettes (bronze & deep gold)
        self.bull_echo_tags = [
            self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#5e4100", outline=""),
            self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#b28704", outline="")
        ]

        # Primary Muscular Charging Golden Bull Body
        self.bull_body = self.canvas.create_polygon(
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            fill="#ffd700", outline="#ffe082", width=2
        )
        self.bull_head = self.canvas.create_polygon(
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            fill="#ffc107", outline="#fff9c4", width=2
        )
        # Giant Swept Golden Horns
        self.bull_horn_upper = self.canvas.create_polygon(
            0, 0, 0, 0, 0, 0, 0, 0,
            fill="#fff9c4", outline="#ffd700", width=2
        )
        self.bull_horn_lower = self.canvas.create_polygon(
            0, 0, 0, 0, 0, 0, 0, 0,
            fill="#fff59d", outline="#ffb300", width=1.5
        )
        # Imperial Crown atop horns
        self.bull_crown = self.canvas.create_polygon(
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            fill="#ffd700", outline="#ffffff", width=1.5
        )

        # Twin Piercing Crimson/Gold Laser Eyes
        self.laser_line1 = self.canvas.create_line(0, 0, 0, 0, fill="#ff1744", width=3)
        self.laser_line2 = self.canvas.create_line(0, 0, 0, 0, fill="#ffd700", width=2)

        # Hoof Ground Stomp Rings
        self.hoof_rings: List[Dict[str, Any]] = []

        # 25 3D Spinning Metallic Gold Coins
        for _ in range(25):
            self.particles.append({
                "type": "bull_coin_3d",
                "x": random.uniform(40, w - 40),
                "y": random.uniform(-180, 0),
                "vx": random.uniform(-3.5, 3.5),
                "vy": random.uniform(6.0, 14.0),
                "r": random.uniform(11.0, 16.0),
                "flip": random.uniform(0, math.pi * 2),
                "v_flip": random.uniform(0.14, 0.28),
                "bounce_floor": h - random.uniform(20, 60),
                "tag_outer": None,
                "tag_inner": None,
                "tag_sym": None
            })

        # 50 Falling Golden Bullion Bars & Tokens with guaranteed bright fills
        gold_tokens = ["🪙", "🧱", "👑", "🏆", "💰", "✨"]
        gold_colors = ["#ffd700", "#ffea00", "#ffc107", "#ffb300", "#ffffff"]
        for _ in range(50):
            self.particles.append({
                "type": "gold_coin",
                "x": random.uniform(40, w - 40),
                "y": random.uniform(-150, 0),
                "vx": random.uniform(-4.0, 4.0),
                "vy": random.uniform(6.0, 15.0),
                "char": random.choice(gold_tokens),
                "color": random.choice(gold_colors),
                "size": random.randint(18, 28),
                "bounce_floor": h - random.uniform(20, 60),
                "tag": None
            })

    def _tick_golden_bull(self, w, h, dt_scale: float):
        self.bull_x += self.bull_vx * dt_scale
        if self.bull_x > w + 240:
            self.bull_x = -220.0

        # Gallop stride physics
        gallop_phase = self.frame_count * 0.45
        gallop_y = self.bull_y + math.sin(gallop_phase) * 16.0

        # Ground camera rumble synced with hoof impact
        if math.sin(gallop_phase) > 0.85:
            self.shake_y = random.uniform(-4.0, 4.0)
            if len(self.hoof_rings) < 4:
                self.hoof_rings.append({
                    "x": self.bull_x - 30,
                    "y": gallop_y + 35,
                    "r": 5.0,
                    "max_r": 90.0,
                    "spd": 7.0,
                    "tag": self.canvas.create_oval(0, 0, 0, 0, outline="#ffd700", width=2)
                })
        else:
            self.shake_y = 0.0

        # Update hoof stomp rings
        for hr in list(self.hoof_rings):
            hr["r"] += hr["spd"] * dt_scale
            r = hr["r"]
            if r >= hr["max_r"]:
                self.canvas.delete(hr["tag"])
                self.hoof_rings.remove(hr)
            else:
                self.canvas.coords(hr["tag"], hr["x"] - r, hr["y"] - r * 0.5, hr["x"] + r, hr["y"] + r * 0.5)

        bx = self.bull_x
        by = gallop_y + self.shake_y

        # Update Motion Blur Trailing Echo Silhouettes
        for idx, offset_x in enumerate([60, 30]):
            ebx = bx - offset_x
            self.canvas.coords(
                self.bull_echo_tags[idx],
                ebx + 10, by - 26,
                ebx + 40, by - 14,
                ebx + 55, by + 12,
                ebx + 35, by + 30,
                ebx - 10, by + 26,
                ebx - 40, by + 18,
                ebx - 30, by - 10,
                ebx - 10, by - 20
            )

        # Update Muscular Golden Bull Body Geometry
        self.canvas.coords(
            self.bull_body,
            bx + 10, by - 28,
            bx + 40, by - 16,
            bx + 55, by + 12,
            bx + 35, by + 32,
            bx - 10, by + 28,
            bx - 45, by + 20,
            bx - 32, by - 12,
            bx - 10, by - 22
        )
        self.canvas.coords(
            self.bull_head,
            bx + 35, by - 12,
            bx + 75, by - 4,
            bx + 85, by + 12,
            bx + 65, by + 22,
            bx + 45, by + 18
        )
        self.canvas.coords(
            self.bull_horn_upper,
            bx + 55, by - 16,
            bx + 80, by - 34,
            bx + 105, by - 24,
            bx + 72, by - 10
        )
        self.canvas.coords(
            self.bull_horn_lower,
            bx + 58, by - 6,
            bx + 84, by - 18,
            bx + 98, by - 10,
            bx + 70, by - 2
        )
        self.canvas.coords(
            self.bull_crown,
            bx + 62, by - 30,
            bx + 68, by - 42,
            bx + 74, by - 33,
            bx + 80, by - 44,
            bx + 86, by - 32
        )

        # Update Twin Searing Laser Eyes
        eye_x = bx + 76
        eye_y = by + 4
        laser_target_y = by + random.uniform(-60, 60)
        self.canvas.coords(self.laser_line1, eye_x, eye_y, w, laser_target_y)
        self.canvas.coords(self.laser_line2, eye_x, eye_y - 3, w, laser_target_y - 3)

        # Update Bouncing Coin & Bullion Cascade
        for p in self.particles:
            p_type = p["type"]
            p["x"] += p["vx"] * dt_scale
            p["y"] += p["vy"] * dt_scale
            p["vy"] += 0.35 * dt_scale

            # Floor Bounce Physics
            if p["y"] > p["bounce_floor"]:
                p["y"] = p["bounce_floor"]
                p["vy"] = -abs(p["vy"]) * 0.65
                p["vx"] *= 0.85
                if abs(p["vy"]) < 1.5:
                    p["y"] = random.uniform(-100, -20)
                    p["x"] = random.uniform(30, w - 30)
                    p["vy"] = random.uniform(6.0, 14.0)
                    p["vx"] = random.uniform(-3.5, 3.5)

            if p_type == "bull_coin_3d":
                p["flip"] += p["v_flip"] * dt_scale
                cos_f = abs(math.cos(p["flip"]))
                cw = max(2.5, p["r"] * cos_f)
                r = p["r"]
                x, y = p["x"], p["y"]

                if p["tag_outer"] is None:
                    p["tag_outer"] = self.canvas.create_oval(
                        x - cw, y - r, x + cw, y + r,
                        fill="#ffd700", outline="#fff59d", width=1.5
                    )
                    p["tag_inner"] = self.canvas.create_oval(
                        x - cw * 0.7, y - r * 0.7, x + cw * 0.7, y + r * 0.7,
                        fill="#ffb300", outline=""
                    )
                    p["tag_sym"] = self.canvas.create_text(
                        x, y, text="$", font=("Segoe UI", 9, "bold"), fill="#fffde7"
                    )
                else:
                    self.canvas.coords(p["tag_outer"], x - cw, y - r, x + cw, y + r)
                    self.canvas.coords(p["tag_inner"], x - cw * 0.7, y - r * 0.7, x + cw * 0.7, y + r * 0.7)
                    self.canvas.coords(p["tag_sym"], x, y)

            elif p_type == "gold_coin":
                if p["tag"] is None:
                    p["tag"] = self.canvas.create_text(
                        p["x"], p["y"], text=p["char"], font=("Segoe UI", p["size"]), fill=p["color"]
                    )
                else:
                    self.canvas.coords(p["tag"], p["x"], p["y"])

    # =========================================================================
    # MAIN 60 FPS DELTA-TIME TICK LOOP
    # =========================================================================
    def _tick(self):
        if self._stopped:
            return

        now = time.perf_counter()
        dt = min(now - self._last_time, 0.05)
        self._last_time = now
        self.elapsed_time += dt
        self.frame_count += 1
        dt_scale = dt * 60.0

        w, h = self.w, self.h

        try:
            if self.animation_id == "rocket_moon":
                self._tick_rocket(w, h, dt_scale)
            elif self.animation_id == "matrix_glitch":
                self._tick_matrix(w, h, dt_scale)
            elif self.animation_id == "diamond_hands":
                self._tick_diamond_hands(w, h, dt_scale)
            elif self.animation_id == "golden_bull":
                self._tick_golden_bull(w, h, dt_scale)
            else:
                self._tick_money_rain(w, h, dt_scale)
        except Exception:
            self.stop()
            return

        if self.elapsed_time >= self.max_duration:
            self.stop()
        else:
            proc_time = time.perf_counter() - now
            interval = max(1, int((0.0166 - proc_time) * 1000))
            self._anim_job = self.canvas.after(interval, self._tick)

    def stop(self):
        """Safely terminates animation, destroys overlay canvas, and executes on_finished callback."""
        if self._stopped:
            return
        self._stopped = True

        if self._anim_job:
            try:
                self.canvas.after_cancel(self._anim_job)
            except Exception:
                pass
            self._anim_job = None

        try:
            if hasattr(self, "_esc_bind"):
                self.parent.unbind("<Escape>", self._esc_bind)
        except Exception:
            pass

        try:
            self.canvas.destroy()
        except Exception:
            pass

        if self.on_finished:
            cb = self.on_finished
            self.on_finished = None
            try:
                cb()
            except Exception:
                pass


def play_win_animation(
    parent: tk.Widget,
    animation_id: Optional[str] = None,
    on_finished: Optional[Callable[[], None]] = None,
    profit_info: Optional[Dict[str, Any]] = None
) -> WinAnimationOverlay:
    """Helper function to play currently equipped or specified crazy win animation."""
    from profile_manager import get_profile
    if not animation_id:
        animation_id = get_profile().equipped_animation
    return WinAnimationOverlay(
        parent,
        animation_id=animation_id,
        on_finished=on_finished,
        profit_info=profit_info
    )
