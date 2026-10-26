/**
 * Crazy Win Animations Engine for Day Trading Simulator (Web Edition).
 * Renders high-octane 60fps canvas celebration animations:
 * - Money Rain & Gold Confetti
 * - Rocket Blastoff To The Moon
 * - Cyber Matrix Glitch Rain
 * - Diamond Hands Supernova
 * - Golden Bull Stampede
 */

class WinAnimationEngine {
    constructor() {
        this.canvas = document.getElementById("anim-canvas");
        this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
        this.ui = document.getElementById("anim-overlay-ui");
        this.btnSkip = document.getElementById("btn-skip-anim");

        this.active = false;
        this.animationId = "money_rain";
        this.animFrameId = null;
        this.particles = [];
        this.frameCount = 0;
        this.maxFrames = 260; // ~4.3 seconds at 60fps
        this.extraData = {};

        this.videoEl = (typeof document !== "undefined") ? document.getElementById("anim-video") : null;
        this.videoPlaying = false;
        this.videoSources = {
            supercar_drift: "assets/videos/supercar_drift.mp4",
            mega_yacht: "assets/videos/mega_yacht.mp4",
            private_jet: "assets/videos/private_jet.mp4"
        };

        this._initEvents();
    }

    registerVideo(animationId, videoUrl) {
        if (animationId && videoUrl) {
            this.videoSources[animationId] = videoUrl;
        }
    }

    _initEvents() {
        if (this.btnSkip) {
            this.btnSkip.addEventListener("click", () => this.stop());
        }
        if (this.canvas) {
            this.canvas.addEventListener("click", () => this.stop());
        }
        if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
            window.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && this.active) {
                    this.stop();
                }
            });
            window.addEventListener("resize", () => {
                if (this.active) this._resize();
            });
        }
    }

    _resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    play(animationId = "money_rain", titleOverride = null, videoUrlOverride = null) {
        this.stop();
        if (!this.canvas || !this.ctx) {
            this.canvas = document.getElementById("anim-canvas");
            if (this.canvas) this.ctx = this.canvas.getContext("2d");
        }
        if (!this.canvas || !this.ctx) return;

        this.animationId = animationId || "money_rain";
        this.titleOverride = titleOverride;
        this.active = true;
        this.frameCount = 0;
        this.particles = [];
        this.extraData = {};

        this._resize();
        this.canvas.style.display = "block";
        if (this.ui) this.ui.style.display = "block";

        if (!this.videoEl && typeof document !== "undefined") {
            this.videoEl = document.getElementById("anim-video");
        }

        const vUrl = videoUrlOverride || this.videoSources[this.animationId];
        this.videoPlaying = false;
        if (vUrl && this.videoEl) {
            try {
                this.videoEl.src = vUrl;
                this.videoEl.currentTime = 0;
                this.videoEl.style.display = "block";
                const p = this.videoEl.play();
                if (p && typeof p.then === "function") {
                    p.then(() => {
                        this.videoPlaying = true;
                        if (this.canvas) this.canvas.style.background = "transparent";
                    }).catch(() => {
                        this.videoPlaying = false;
                        if (this.videoEl) this.videoEl.style.display = "none";
                        if (this.canvas) this.canvas.style.background = "rgba(6,9,14,0.94)";
                    });
                }
            } catch (e) {
                this.videoPlaying = false;
                if (this.videoEl) this.videoEl.style.display = "none";
                if (this.canvas) this.canvas.style.background = "rgba(6,9,14,0.94)";
            }
        } else {
            if (this.videoEl) this.videoEl.style.display = "none";
            if (this.canvas) this.canvas.style.background = "rgba(6,9,14,0.94)";
        }

        this._initParticles();
        this._loop();
    }

    stop() {
        this.active = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.videoEl) {
            try {
                this.videoEl.pause();
                this.videoEl.currentTime = 0;
                this.videoEl.src = "";
                this.videoEl.style.display = "none";
            } catch (e) {}
        }
        this.videoPlaying = false;
        if (this.canvas) {
            this.canvas.style.display = "none";
            this.canvas.style.transform = "none";
            this.canvas.style.background = "rgba(6,9,14,0.92)";
            if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        if (this.ui) this.ui.style.display = "none";
    }

    _initParticles() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.animationId === "rocket_moon") {
            this.extraData.rocket = { x: w / 2, y: h + 100, vy: -12.0, size: 70 };
            this.extraData.moon = { x: w / 2, y: 110, radius: 45, visible: true };
            // Stars
            for (let i = 0; i < 90; i++) {
                this.particles.push({
                    type: "star",
                    x: Math.random() * w,
                    y: Math.random() * h,
                    len: 10 + Math.random() * 30,
                    spd: 12 + Math.random() * 25
                });
            }
        } else if (this.animationId === "matrix_glitch") {
            const cols = Math.floor(w / 30);
            const chars = ["0", "1", "$", "WIN", "PROFIT", "BUY", "7F", "9A", "CALL", "MOON", "100K", "BULL"];
            for (let c = 0; c < cols; c++) {
                this.particles.push({
                    type: "matrix_col",
                    x: c * 30 + 15,
                    y: -Math.random() * 500,
                    spd: 12 + Math.random() * 18,
                    chars: Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]),
                    color: Math.random() > 0.3 ? "#00ff66" : "#00ffff"
                });
            }
        } else if (this.animationId === "diamond_hands") {
            this.extraData.dh = {
                x: w / 2,
                y: h / 2,
                scale: 0.2,
                rot: 0,
                flash: 0,
                shake: 0,
                detonated: false
            };
            this.extraData.stars = [];
            const starCols = ["#ffffff", "#67e8f9", "#c084fc", "#38bdf8", "#fef08a"];
            for (let i = 0; i < 55; i++) {
                this.extraData.stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    phase: Math.random() * Math.PI * 2,
                    spd: 0.04 + Math.random() * 0.06,
                    size: 1.2 + Math.random() * 2.4,
                    color: starCols[Math.floor(Math.random() * starCols.length)]
                });
            }
            this.extraData.gravityRings = [
                { r: 380, spd: 10.5, color: "#00f0ff", width: 3.5 },
                { r: 280, spd: 9.0, color: "#c084fc", width: 2.8 },
                { r: 180, spd: 7.5, color: "#38bdf8", width: 2.0 },
                { r: 90, spd: 6.0, color: "#ffffff", width: 1.5 }
            ];
            this.extraData.inwardMotes = [];
            const moteChars = ["✦", "✧", "⚡", "◆", "💎"];
            const moteCols = ["#00f0ff", "#ffffff", "#c084fc", "#38bdf8", "#fde047"];
            for (let i = 0; i < 50; i++) {
                this.extraData.inwardMotes.push({
                    angle: Math.random() * Math.PI * 2,
                    dist: 160 + Math.random() * 320,
                    spd: 7 + Math.random() * 9,
                    char: moteChars[Math.floor(Math.random() * moteChars.length)],
                    color: moteCols[Math.floor(Math.random() * moteCols.length)]
                });
            }
            this.extraData.beamAngle = 0;
            this.extraData.shockwaves = [];
        } else if (this.animationId === "golden_bull") {
            this.extraData.bull = { x: -200, y: h / 2, vx: 18.0, size: 75 };
            for (let i = 0; i < 70; i++) {
                this.particles.push({
                    type: "gold_coin",
                    x: Math.random() * w,
                    y: -Math.random() * 300,
                    vx: (Math.random() - 0.5) * 5,
                    vy: 6 + Math.random() * 10,
                    text: ["🪙", "👑", "🥇", "💰", "✨"][Math.floor(Math.random() * 5)],
                    size: 22 + Math.random() * 16,
                    rot: Math.random() * 360,
                    vrot: (Math.random() - 0.5) * 8
                });
            }
        } else if (this.animationId === "supercar_drift") {
            this.extraData.car = {
                x: w * 0.44,
                y: h * 0.58,
                driftAngle: -0.28,
                speed: 232,
                rpm: 9350
            };
            this.extraData.roadLines = [];
            for (let i = 0; i < 45; i++) {
                this.extraData.roadLines.push({
                    x: Math.random() * w,
                    y: h * 0.42 + Math.random() * (h * 0.58),
                    len: 50 + Math.random() * 140,
                    spd: 24 + Math.random() * 30,
                    width: 1.5 + Math.random() * 2.5,
                    alpha: 0.15 + Math.random() * 0.4
                });
            }
            this.extraData.smoke = [];
            this.extraData.sparks = [];
        } else if (this.animationId === "mega_yacht") {
            this.extraData.yacht = {
                x: w * 0.48,
                y: h * 0.52,
                bob: 0
            };
            this.extraData.waves = [];
            for (let i = 0; i < 7; i++) {
                this.extraData.waves.push({
                    y: h * 0.48 + i * (h * 0.52 / 6),
                    speed: 0.025 + i * 0.012,
                    amp: 5 + i * 3.5,
                    freq: 0.006 + i * 0.0025,
                    phase: Math.random() * Math.PI * 2,
                    color: `rgba(${6 + i * 4}, ${22 + i * 10}, ${48 + i * 16}, ${0.4 + i * 0.09})`
                });
            }
            this.extraData.bubbles = [];
            for (let i = 0; i < 50; i++) {
                this.extraData.bubbles.push({
                    x: Math.random() * w,
                    y: h + Math.random() * 200,
                    vy: 1.8 + Math.random() * 3.2,
                    radius: 2 + Math.random() * 4.5,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpd: 0.04 + Math.random() * 0.06,
                    color: Math.random() > 0.4 ? "rgba(255, 215, 0, 0.75)" : "rgba(200, 240, 255, 0.75)"
                });
            }
            this.extraData.skySparks = [];
        } else if (this.animationId === "private_jet") {
            this.extraData.jet = {
                x: w * 0.50,
                y: h * 0.42,
                bankAngle: -0.09
            };
            this.extraData.clouds = [];
            for (let i = 0; i < 35; i++) {
                this.extraData.clouds.push({
                    x: Math.random() * (w * 1.6),
                    y: h * 0.52 + Math.random() * (h * 0.48),
                    radius: 60 + Math.random() * 110,
                    spd: 8 + Math.random() * 18,
                    color: `rgba(${225 + Math.floor(Math.random() * 30)}, ${170 + Math.floor(Math.random() * 45)}, ${130 + Math.floor(Math.random() * 45)}, ${0.22 + Math.random() * 0.28})`
                });
            }
            this.extraData.jetParticles = [];
        } else {
            // Money Rain (default)
            const emojis = ["💵", "💸", "💰", "$100", "🤑", "✨", "⭐", "🎉"];
            for (let i = 0; i < 90; i++) {
                this.particles.push({
                    type: "rain",
                    x: Math.random() * w,
                    y: -Math.random() * (h * 0.9) - 20,
                    vx: (Math.random() - 0.5) * 3,
                    vy: 5 + Math.random() * 9,
                    text: emojis[Math.floor(Math.random() * emojis.length)],
                    size: 20 + Math.random() * 20,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpd: 0.05 + Math.random() * 0.1
                });
            }
        }
    }

    _loop() {
        if (!this.active) return;
        this.frameCount++;

        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        if (this.videoPlaying) {
            this._drawVideoOverlay(w, h);
        } else if (this.animationId === "rocket_moon") {
            this._drawRocket(w, h);
        } else if (this.animationId === "matrix_glitch") {
            this._drawMatrix(w, h);
        } else if (this.animationId === "diamond_hands") {
            this._drawDiamondHands(w, h);
        } else if (this.animationId === "golden_bull") {
            this._drawGoldenBull(w, h);
        } else if (this.animationId === "supercar_drift") {
            this._drawSupercar(w, h);
        } else if (this.animationId === "mega_yacht") {
            this._drawMegaYacht(w, h);
        } else if (this.animationId === "private_jet") {
            this._drawPrivateJet(w, h);
        } else {
            this._drawMoneyRain(w, h);
        }

        if (this.frameCount >= this.maxFrames) {
            this.stop();
        } else {
            this.animFrameId = requestAnimationFrame(() => this._loop());
        }
    }

    // 1. Money Rain
    _drawMoneyRain(w, h) {
        // Draw falling bills
        for (const p of this.particles) {
            p.wobble += p.wobbleSpd;
            p.x += p.vx + Math.sin(p.wobble) * 2;
            p.y += p.vy;

            if (p.y > h + 40) {
                p.y = -40;
                p.x = Math.random() * w;
            }

            this.ctx.font = `${p.size}px sans-serif`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(p.text, p.x, p.y);
        }

        // Center Pulsing Banner
        const pulse = 1 + Math.sin(this.frameCount * 0.1) * 0.06;
        this.ctx.save();
        this.ctx.translate(w / 2, h / 2);
        this.ctx.scale(pulse, pulse);

        // Backdrop box
        this.ctx.fillStyle = "rgba(14, 17, 23, 0.85)";
        this.ctx.strokeStyle = "#00e676";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.roundRect(-340, -60, 680, 120, 16);
        this.ctx.fill();
        this.ctx.stroke();

        // Banner text
        this.ctx.font = "bold 32px 'Segoe UI', Roboto, sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = (this.frameCount % 16 < 8) ? "#00e676" : "#ffd700";
        this.ctx.fillText(this.titleOverride || "💸 CASH TSUNAMI! PROFIT LOCKED! 💸", 0, -14);

        this.ctx.font = "bold 15px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText("PROFIT TRANSFERRED TO MENU VAULT BALANCE", 0, 24);

        this.ctx.restore();
    }

    // 2. Rocket Blastoff
    _drawRocket(w, h) {
        const rocket = this.extraData.rocket;

        // Screen shake during launch
        if (rocket.y > 0) {
            const shake = (Math.random() - 0.5) * 6;
            this.canvas.style.transform = `translate(${shake}px, ${shake}px)`;
        } else {
            this.canvas.style.transform = "none";
        }

        // Warp stars
        this.ctx.strokeStyle = "#00e5ff";
        this.ctx.lineWidth = 2;
        for (const s of this.particles) {
            if (s.type === "star") {
                s.y += s.spd;
                if (s.y > h) {
                    s.y = -10;
                    s.x = Math.random() * w;
                }
                this.ctx.beginPath();
                this.ctx.moveTo(s.x, s.y);
                this.ctx.lineTo(s.x, s.y + s.len);
                this.ctx.stroke();
            }
        }

        // Moon
        this.ctx.font = "80px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText("🌕", w / 2, 110);

        // Rocket position update
        rocket.y += rocket.vy;

        // Thruster flame particles
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                type: "flame",
                x: rocket.x + (Math.random() - 0.5) * 20,
                y: rocket.y + 40,
                vx: (Math.random() - 0.5) * 4,
                vy: 8 + Math.random() * 10,
                text: ["🔥", "💥", "✨"][Math.floor(Math.random() * 3)],
                size: 20 + Math.random() * 16,
                life: 25
            });
        }

        // Draw flames
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.type === "flame") {
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                this.ctx.font = `${p.size}px sans-serif`;
                this.ctx.fillText(p.text, p.x, p.y);
                if (p.life <= 0) this.particles.splice(i, 1);
            }
        }

        // Draw rocket
        this.ctx.font = `${rocket.size}px sans-serif`;
        this.ctx.fillText("🚀", rocket.x, rocket.y);

        // Banner
        this.ctx.fillStyle = "rgba(14, 17, 23, 0.85)";
        this.ctx.strokeStyle = "#00e5ff";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(w / 2 - 320, h / 2 - 40, 640, 80, 14);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 30px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#00e5ff";
        this.ctx.fillText(this.titleOverride || "🚀 TO THE MOON! 100x GAINS! 🚀", w / 2, h / 2 + 10);
    }

    // 3. Matrix Glitch Rain
    _drawMatrix(w, h) {
        // Digital rain columns
        this.ctx.font = "bold 13px Consolas, monospace";
        this.ctx.textAlign = "center";

        for (const col of this.particles) {
            col.y += col.spd;
            if (col.y > h + 200) col.y = -200;

            for (let i = 0; i < col.chars.length; i++) {
                const charY = col.y + i * 22;
                if (charY > -20 && charY < h + 20) {
                    this.ctx.fillStyle = (i === col.chars.length - 1) ? "#ffffff" : col.color;
                    this.ctx.fillText(col.chars[i], col.x, charY);
                }
            }
        }

        // Random horizontal glitch slice
        if (Math.random() < 0.4) {
            const gy = Math.random() * h;
            const gh = 6 + Math.random() * 18;
            this.ctx.fillStyle = Math.random() > 0.5 ? "rgba(0, 255, 102, 0.3)" : "rgba(255, 0, 128, 0.3)";
            this.ctx.fillRect(0, gy, w, gh);
        }

        // Banner box
        this.ctx.fillStyle = "rgba(6, 12, 8, 0.92)";
        this.ctx.strokeStyle = "#00ff66";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(w / 2 - 340, h / 2 - 50, 680, 100, 12);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 26px Consolas, monospace";
        this.ctx.fillStyle = "#00ff66";
        this.ctx.fillText(this.titleOverride || "⚡ SYSTEM OVERRIDE: VICTORY PROTOCOL ⚡", w / 2, h / 2 - 5);

        this.ctx.font = "bold 14px Consolas, monospace";
        this.ctx.fillStyle = "#00ffff";
        this.ctx.fillText("HIGH FREQUENCY ALPHA LOCKED • PROFITS TRANSFERRED", w / 2, h / 2 + 25);
    }

    _drawFacetedDiamond(x, y, scale, angle, palette = null) {
        const pal = palette || {
            table: "#ffffff",
            crownLeft: "#a5f3fc",
            crownRight: "#7dd3fc",
            pavilionCenter: "#00f0ff",
            pavilionLeft: "#0284c7",
            pavilionRight: "#0ea5e9",
            outline: "#e0f2fe"
        };

        const facets = [
            { pts: [[-26, -34], [26, -34], [16, -10], [-16, -10]], fill: pal.table },
            { pts: [[-46, -34], [-26, -34], [-16, -10], [-52, -10]], fill: pal.crownLeft },
            { pts: [[26, -34], [46, -34], [52, -10], [16, -10]], fill: pal.crownRight },
            { pts: [[0, 46], [-16, -10], [16, -10]], fill: pal.pavilionCenter },
            { pts: [[0, 46], [-52, -10], [-16, -10]], fill: pal.pavilionLeft },
            { pts: [[0, 46], [16, -10], [52, -10]], fill: pal.pavilionRight }
        ];

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.scale(scale, scale);

        for (const f of facets) {
            this.ctx.beginPath();
            this.ctx.moveTo(f.pts[0][0], f.pts[0][1]);
            for (let i = 1; i < f.pts.length; i++) {
                this.ctx.lineTo(f.pts[i][0], f.pts[i][1]);
            }
            this.ctx.closePath();
            this.ctx.fillStyle = f.fill;
            this.ctx.fill();
            this.ctx.strokeStyle = pal.outline || "#e0f2fe";
            this.ctx.lineWidth = 1.6;
            this.ctx.stroke();
        }

        // Specular glint star sparkle on top-left facet
        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        const gx = -22, gy = -28, gr = 5;
        this.ctx.moveTo(gx, gy - gr * 1.8);
        this.ctx.quadraticCurveTo(gx, gy, gx + gr * 1.8, gy);
        this.ctx.quadraticCurveTo(gx, gy, gx, gy + gr * 1.8);
        this.ctx.quadraticCurveTo(gx, gy, gx - gr * 1.8, gy);
        this.ctx.quadraticCurveTo(gx, gy, gx, gy - gr * 1.8);
        this.ctx.fill();

        this.ctx.restore();
    }

    // 4. Diamond Hands Supernova
    _drawDiamondHands(w, h) {
        const dh = this.extraData.dh;
        if (!dh) return;

        // 1. Cosmic Deep Space Gradient Background
        const bgGrad = this.ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.85);
        bgGrad.addColorStop(0, "#1c0d38");
        bgGrad.addColorStop(0.45, "#0b0c26");
        bgGrad.addColorStop(1, "#05060f");
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        // 2. Twinkling Cosmic Background Starfield
        if (this.extraData.stars) {
            for (const s of this.extraData.stars) {
                s.phase += s.spd;
                const tw = 0.5 + 0.5 * Math.sin(s.phase);
                const r = s.size * (0.8 + 0.4 * tw);
                this.ctx.fillStyle = s.color;
                this.ctx.globalAlpha = 0.35 + 0.65 * tw;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalAlpha = 1.0;
        }

        // 3. Rotating Cosmic Prism Beams
        this.extraData.beamAngle = (this.extraData.beamAngle || 0) + 0.009;
        const beamLen = Math.max(w, h) * 0.85;
        const isDetonated = this.frameCount >= 45;
        const beamCols = [
            "rgba(0, 240, 255, 0.35)",
            "rgba(192, 132, 252, 0.3)",
            "rgba(255, 255, 255, 0.4)",
            "rgba(56, 189, 248, 0.35)"
        ];

        this.ctx.save();
        this.ctx.translate(w / 2, h / 2);
        for (let i = 0; i < 12; i++) {
            const ang = this.extraData.beamAngle + i * (Math.PI / 6);
            const bx = Math.cos(ang) * beamLen;
            const by = Math.sin(ang) * beamLen;
            const col = isDetonated ? beamCols[i % beamCols.length] : "rgba(30, 45, 80, 0.25)";
            this.ctx.strokeStyle = col;
            this.ctx.lineWidth = isDetonated ? 3.0 : 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(bx, by);
            this.ctx.stroke();
        }
        this.ctx.restore();

        // 4. Pulsing Deep Space Nebula Halo Auras
        const auraPulse = 1.0 + Math.sin(this.frameCount * 0.08) * 0.06;
        const auras = [
            { r: 350 * auraPulse, color: "rgba(46, 16, 101, 0.4)", width: 14 },
            { r: 240 * auraPulse, color: "rgba(12, 74, 110, 0.45)", width: 8 },
            { r: 130 * auraPulse, color: "rgba(3, 105, 161, 0.55)", width: 4 }
        ];
        for (const a of auras) {
            this.ctx.strokeStyle = a.color;
            this.ctx.lineWidth = a.width;
            this.ctx.beginPath();
            this.ctx.arc(w / 2, h / 2, a.r, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // =========================================================================
        // Phase 1: Singularity Compression (Frames 0 to 44)
        // =========================================================================
        if (this.frameCount < 45) {
            const progress = this.frameCount / 45;
            const vibX = (Math.random() - 0.5) * progress * 8;
            const vibY = (Math.random() - 0.5) * progress * 8;

            // Inward Contracting Gravity Rings
            if (this.extraData.gravityRings) {
                for (const gr of this.extraData.gravityRings) {
                    gr.r -= gr.spd;
                    if (gr.r <= 12) gr.r = 380;
                    this.ctx.strokeStyle = gr.color;
                    this.ctx.lineWidth = gr.width;
                    this.ctx.beginPath();
                    this.ctx.arc(w / 2, h / 2, gr.r, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }

            // Inward Gravity Motes
            if (this.extraData.inwardMotes) {
                for (const mote of this.extraData.inwardMotes) {
                    mote.dist -= mote.spd;
                    if (mote.dist < 18) mote.dist = 180 + Math.random() * 260;
                    const mx = w / 2 + Math.cos(mote.angle) * mote.dist;
                    const my = h / 2 + Math.sin(mote.angle) * mote.dist;
                    this.ctx.fillStyle = mote.color;
                    this.ctx.font = "bold 14px 'Segoe UI', sans-serif";
                    this.ctx.textAlign = "center";
                    this.ctx.textBaseline = "middle";
                    this.ctx.fillText(mote.char, mx, my);
                }
            }

            // Conviction Hands moving inward
            this.ctx.font = "38px 'Segoe UI', sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("🙌", w / 2 - 95 + progress * 25 + vibX, h / 2 + vibY);
            this.ctx.fillText("🙌", w / 2 + 95 - progress * 25 + vibX, h / 2 + vibY);

            // Central Faceted Diamond Gemstone
            const dScale = 0.85 + progress * 0.55;
            const dRot = Math.sin(this.frameCount * 0.25) * 0.08;
            this._drawFacetedDiamond(w / 2 + vibX, h / 2 + vibY, dScale, dRot);

            // Pulsing Charging Callout
            this.ctx.font = "bold 15px 'Segoe UI', Roboto, sans-serif";
            this.ctx.fillStyle = (this.frameCount % 10 < 5) ? "#00f0ff" : "#ffffff";
            this.ctx.fillText("💎 CHARGING SINGULARITY... 💎", w / 2 + vibX, h / 2 + 88 + vibY);
        }

        // =========================================================================
        // Detonation Trigger (Frame 45)
        // =========================================================================
        else if (this.frameCount === 45) {
            dh.detonated = true;
            dh.flash = 0.95;
            dh.shake = 10;

            // 4 Blinding Expanding Cosmic Shockwaves
            this.extraData.shockwaves = [
                { r: 15, spd: 24, color: "#ffffff", width: 4.5 },
                { r: 15, spd: 18, color: "#00f0ff", width: 3.5 },
                { r: 15, spd: 13, color: "#d946ef", width: 3.0 },
                { r: 15, spd: 8.5, color: "#38bdf8", width: 2.5 }
            ];

            // 40 Exploding Faceted Diamond Shards with 3D Rotation
            const palList = [
                { table: "#ffffff", crownLeft: "#a5f3fc", crownRight: "#7dd3fc", pavilionCenter: "#00f0ff", pavilionLeft: "#0284c7", pavilionRight: "#0ea5e9", outline: "#e0f2fe" },
                { table: "#ffffff", crownLeft: "#f3e8ff", crownRight: "#e9d5ff", pavilionCenter: "#c084fc", pavilionLeft: "#7e22ce", pavilionRight: "#a855f7", outline: "#faf5ff" },
                { table: "#ffffff", crownLeft: "#fef9c3", crownRight: "#fef08a", pavilionCenter: "#fde047", pavilionLeft: "#a16207", pavilionRight: "#eab308", outline: "#fffbeb" },
                { table: "#ffffff", crownLeft: "#fce7f3", crownRight: "#fbcfe8", pavilionCenter: "#f472b6", pavilionLeft: "#9d174d", pavilionRight: "#db2777", outline: "#fff1f2" },
                { table: "#ffffff", crownLeft: "#e0f2fe", crownRight: "#bae6fd", pavilionCenter: "#38bdf8", pavilionLeft: "#0369a1", pavilionRight: "#0284c7", outline: "#ffffff" }
            ];
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 7 + Math.random() * 20;
                this.particles.push({
                    type: "faceted_shard",
                    x: w / 2, y: h / 2,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    rot: Math.random() * Math.PI * 2,
                    vrot: (Math.random() - 0.5) * 0.25,
                    scale: 0.18 + Math.random() * 0.22,
                    drag: 0.98,
                    palette: palList[Math.floor(Math.random() * palList.length)]
                });
            }

            // 35 Prismatic Starbursts
            const starChars = ["✦", "★", "✧", "💠", "⚡"];
            const starCols = ["#ffffff", "#00f0ff", "#fde047", "#f472b6", "#38bdf8"];
            for (let i = 0; i < 35; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 6 + Math.random() * 18;
                this.particles.push({
                    type: "starburst",
                    x: w / 2, y: h / 2,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    char: starChars[Math.floor(Math.random() * starChars.length)],
                    color: starCols[Math.floor(Math.random() * starCols.length)],
                    size: 16 + Math.random() * 12,
                    drag: 0.98
                });
            }

            // 25 Golden Bullion & Shimmering Gems
            const trophies = ["🪙", "💎", "✨"];
            for (let i = 0; i < 25; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 7 + Math.random() * 18;
                const char = trophies[Math.floor(Math.random() * trophies.length)];
                this.particles.push({
                    type: "trophy",
                    x: w / 2, y: h / 2,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    char: char,
                    color: char === "🪙" ? "#ffd700" : "#00f0ff",
                    size: 18 + Math.random() * 12,
                    drag: 0.98
                });
            }
        }

        // =========================================================================
        // Phase 2: Supernova Detonation Active (Frames 46+)
        // =========================================================================
        else {
            // Screen Shake Tremor
            if (dh.shake > 0) {
                const sx = (Math.random() - 0.5) * dh.shake;
                const sy = (Math.random() - 0.5) * dh.shake;
                this.canvas.style.transform = `translate(${sx}px, ${sy}px)`;
                dh.shake *= 0.92;
                if (dh.shake < 0.2) {
                    dh.shake = 0;
                    this.canvas.style.transform = "none";
                }
            }

            // Detonation Flash Bloom
            if (dh.flash > 0.01) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${dh.flash})`;
                this.ctx.fillRect(0, 0, w, h);
                dh.flash *= 0.78;
            }

            // Expanding Shockwaves
            if (this.extraData.shockwaves) {
                for (let i = this.extraData.shockwaves.length - 1; i >= 0; i--) {
                    const sw = this.extraData.shockwaves[i];
                    sw.r += sw.spd;
                    this.ctx.strokeStyle = sw.color;
                    this.ctx.lineWidth = sw.width;
                    this.ctx.beginPath();
                    this.ctx.arc(w / 2, h / 2, sw.r, 0, Math.PI * 2);
                    this.ctx.stroke();
                    if (sw.r > Math.max(w, h) * 0.95) {
                        this.extraData.shockwaves.splice(i, 1);
                    }
                }
            }

            // Triumphant Majestic Center Diamond Core
            const cScale = 1.35 + Math.sin(this.frameCount * 0.12) * 0.1;
            const cRot = this.frameCount * 0.015;
            this._drawFacetedDiamond(w / 2, h / 2, cScale, cRot);

            // Exploding Shards Physics & Render
            for (const p of this.particles) {
                p.vx *= p.drag;
                p.vy = (p.vy + 0.22) * p.drag;
                p.x += p.vx;
                p.y += p.vy;

                if (p.type === "faceted_shard") {
                    p.rot += p.vrot;
                    this._drawFacetedDiamond(p.x, p.y, p.scale, p.rot, p.palette);
                } else {
                    this.ctx.font = `bold ${p.size}px 'Segoe UI', sans-serif`;
                    this.ctx.fillStyle = p.color;
                    this.ctx.textAlign = "center";
                    this.ctx.textBaseline = "middle";
                    this.ctx.fillText(p.char, p.x, p.y);
                }
            }

            // Supernova Victory HUD Banner
            this.ctx.save();
            this.ctx.translate(w / 2, h / 2 + 115);

            // Glass card background
            this.ctx.fillStyle = "rgba(11, 13, 36, 0.92)";
            this.ctx.strokeStyle = "#00f0ff";
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.roundRect(-340, -45, 680, 90, 14);
            this.ctx.fill();
            this.ctx.stroke();

            // Title
            this.ctx.font = "bold 26px 'Segoe UI', Roboto, sans-serif";
            this.ctx.fillStyle = "#00f0ff";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(this.titleOverride || "💎 DIAMOND HANDS: COSMIC SUPERNOVA! 💎", 0, -10);

            // Subtitle
            this.ctx.font = "bold 13px 'Segoe UI', Roboto, sans-serif";
            this.ctx.fillStyle = "#ffffff";
            this.ctx.fillText("UNSHAKEABLE CONVICTION • COSMIC WEALTH CREATED", 0, 22);
            this.ctx.restore();
        }
    }

    // 5. Golden Bull Stampede
    _drawGoldenBull(w, h) {
        const bull = this.extraData.bull;
        bull.x += bull.vx;
        if (bull.x > w + 200) bull.x = -200;

        const shakeY = bull.y + Math.sin(this.frameCount * 0.7) * 8;

        // Laser eyes
        const lx = bull.x + 40;
        const ly = shakeY - 12;
        this.ctx.strokeStyle = "#ff1744";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(lx, ly);
        this.ctx.lineTo(w, ly + (Math.random() - 0.5) * 60);
        this.ctx.stroke();

        // Draw bull
        this.ctx.font = `${bull.size}px sans-serif`;
        this.ctx.textAlign = "center";
        this.ctx.fillText("👑 🐂 ⚡", bull.x, shakeY);

        // Falling gold
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vrot;
            if (p.y > h + 30) {
                p.y = -30;
                p.x = Math.random() * w;
            }
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rot * Math.PI / 180);
            this.ctx.font = `${p.size}px sans-serif`;
            this.ctx.fillText(p.text, 0, 0);
            this.ctx.restore();
        }

        // Banner
        this.ctx.fillStyle = "rgba(14, 17, 23, 0.88)";
        this.ctx.strokeStyle = "#ffd700";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(w / 2 - 340, 70, 680, 80, 14);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 28px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#ffd700";
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.titleOverride || "👑 WALL STREET WHALE: BULL STAMPEDE! 👑", w / 2, 118);
    }

    // --- Video Overlay HUD & Widescreen Letterbox ---
    _drawVideoOverlay(w, h) {
        // Subtle cinematic letterbox bars (2.39:1 widescreen matte)
        const barHeight = Math.min(65, Math.floor(h * 0.08));
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
        this.ctx.fillRect(0, 0, w, barHeight);
        this.ctx.fillRect(0, h - barHeight, w, barHeight);

        // Gold & diamond celebration motes floating across video
        if (Math.random() < 0.35 && this.particles.length < 50) {
            this.particles.push({
                x: Math.random() * w,
                y: h + 10,
                vy: 2 + Math.random() * 4,
                vx: (Math.random() - 0.5) * 2,
                char: ["✨", "💎", "⭐", "🪙", "🔥"][Math.floor(Math.random() * 5)],
                size: 14 + Math.random() * 16,
                alpha: 0.9,
                life: 90
            });
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y -= p.vy;
            p.life--;
            this.ctx.font = `${p.size}px sans-serif`;
            this.ctx.textAlign = "center";
            this.ctx.fillText(p.char, p.x, p.y);
            if (p.life <= 0 || p.y < -20) this.particles.splice(i, 1);
        }

        // Luxury Victory HUD Glass Card
        this.ctx.save();
        this.ctx.translate(w / 2, barHeight + 50);

        this.ctx.fillStyle = "rgba(10, 14, 24, 0.92)";
        this.ctx.strokeStyle = "#ffd700";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(-360, -38, 720, 76, 12);
        this.ctx.fill();
        this.ctx.stroke();

        let title = this.titleOverride;
        let subtitle = "HIGH-ROLLER LUXURY CELEBRATION • ULTRA-WEALTH UNLOCKED";
        if (!title) {
            if (this.animationId === "supercar_drift") {
                title = "🏎️ 1,500 HP HYPERCAR DRIFT • MAXIMUM WEALTH FLEX 🏎️";
                subtitle = "BUGATTI CHIRON PUR SPORT • QUAD-TURBO W16 • $4,500,000 FLEET";
            } else if (this.animationId === "mega_yacht") {
                title = "🛥️ 300FT MONACO SUPERYACHT • BILLIONAIRE PRESTIGE 🛥️";
                subtitle = "PRIVATE HELIPAD • DEEP OCEAN LED GLOW • ANCHORED IN SAINT-TROPEZ";
            } else if (this.animationId === "private_jet") {
                title = "✈️ GULFSTREAM G700 STRATOSPHERE • MACH 0.925 TRANSATLANTIC ✈️";
                subtitle = "51,000 FT CRUISING ALTITUDE • PRIVATE FLIGHT DECK • GLOBAL REACH";
            } else {
                title = "🏆 WALL STREET CHAMPION • ULTIMATE WEALTH FLEX 🏆";
            }
        }

        this.ctx.font = "bold 24px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#ffd700";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(title, 0, -8);

        this.ctx.font = "bold 12px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#e0e6ed";
        this.ctx.fillText(subtitle, 0, 18);
        this.ctx.restore();
    }

    // --- 6. Supercar Drift Procedural 60fps Scene ---
    _drawSupercar(w, h) {
        const car = this.extraData.car;
        if (!car) return;

        // 1. Midnight Metropolis & Asphalt Backdrop
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h * 0.45);
        skyGrad.addColorStop(0, "#040711");
        skyGrad.addColorStop(1, "#0d1326");
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, w, h * 0.45);

        // Distant Cyber Skyline Silhouettes
        this.ctx.fillStyle = "rgba(18, 25, 45, 0.75)";
        for (let bx = 0; bx < w; bx += 70) {
            const bh = 50 + ((bx * 37) % 110);
            this.ctx.fillRect(bx, h * 0.45 - bh, 55, bh);
        }

        // Wet Tarmac Road
        const roadGrad = this.ctx.createLinearGradient(0, h * 0.45, 0, h);
        roadGrad.addColorStop(0, "#080c14");
        roadGrad.addColorStop(0.5, "#0e1422");
        roadGrad.addColorStop(1, "#141c2e");
        this.ctx.fillStyle = roadGrad;
        this.ctx.fillRect(0, h * 0.45, w, h * 0.55);

        // Perspective Road Streaks (Speed Lines)
        if (this.extraData.roadLines) {
            for (const r of this.extraData.roadLines) {
                r.x -= r.spd * 0.8;
                r.y += r.spd * 0.35;
                if (r.x < -150 || r.y > h + 50) {
                    r.x = w + Math.random() * 100;
                    r.y = h * 0.43 + Math.random() * (h * 0.5);
                }
                this.ctx.strokeStyle = `rgba(0, 229, 255, ${r.alpha})`;
                this.ctx.lineWidth = r.width;
                this.ctx.beginPath();
                this.ctx.moveTo(r.x, r.y);
                this.ctx.lineTo(r.x - r.len, r.y + r.len * 0.35);
                this.ctx.stroke();
            }
        }

        // Volumetric Headlight Beams illuminating the road
        this.ctx.save();
        const beamGrad = this.ctx.createLinearGradient(car.x + 80, car.y - 10, car.x + 480, car.y + 120);
        beamGrad.addColorStop(0, "rgba(224, 247, 250, 0.65)");
        beamGrad.addColorStop(0.4, "rgba(0, 229, 255, 0.3)");
        beamGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
        this.ctx.fillStyle = beamGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(car.x + 70, car.y - 12);
        this.ctx.lineTo(car.x + 460, car.y - 20);
        this.ctx.lineTo(car.x + 490, car.y + 140);
        this.ctx.lineTo(car.x + 70, car.y + 18);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // Underglow Neon Glow on Asphalt
        this.ctx.save();
        this.ctx.translate(car.x, car.y + 36);
        this.ctx.scale(1.0, 0.35);
        const underglow = this.ctx.createRadialGradient(0, 0, 10, 0, 0, 180);
        underglow.addColorStop(0, "rgba(0, 240, 255, 0.85)");
        underglow.addColorStop(0.5, "rgba(217, 70, 239, 0.45)");
        underglow.addColorStop(1, "rgba(0, 0, 0, 0)");
        this.ctx.fillStyle = underglow;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 180, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // 2. High-Density Tire Smoke Particles
        if (this.extraData.smoke) {
            for (let s = 0; s < 4; s++) {
                this.extraData.smoke.push({
                    x: car.x - 110 + (Math.random() - 0.5) * 30,
                    y: car.y + 24 + (Math.random() - 0.5) * 12,
                    vx: -4 - Math.random() * 8,
                    vy: -1 - Math.random() * 3,
                    radius: 8 + Math.random() * 8,
                    maxRadius: 45 + Math.random() * 35,
                    alpha: 0.65,
                    color: Math.random() > 0.4 ? "rgba(0, 229, 255, " : "rgba(200, 215, 230, "
                });
            }
            for (let i = this.extraData.smoke.length - 1; i >= 0; i--) {
                const sm = this.extraData.smoke[i];
                sm.x += sm.vx;
                sm.y += sm.vy;
                sm.radius += 0.9;
                sm.alpha -= 0.016;
                if (sm.alpha <= 0) {
                    this.extraData.smoke.splice(i, 1);
                } else {
                    this.ctx.fillStyle = sm.color + sm.alpha + ")";
                    this.ctx.beginPath();
                    this.ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // 3. Render Vector Hypercar (Bugatti/Chiron-inspired carbon silhouette)
        this.ctx.save();
        const driftWobble = Math.sin(this.frameCount * 0.12) * 0.015;
        this.ctx.translate(car.x, car.y);
        this.ctx.rotate(car.driftAngle + driftWobble);

        // Lower Chassis & Diffuser
        this.ctx.fillStyle = "#0b0d14";
        this.ctx.beginPath();
        this.ctx.roundRect(-140, 16, 280, 18, 4);
        this.ctx.fill();

        // Aerodynamic Carbon Fiber Body
        const carGrad = this.ctx.createLinearGradient(-150, -40, 150, 20);
        carGrad.addColorStop(0, "#0369a1");
        carGrad.addColorStop(0.3, "#0284c7");
        carGrad.addColorStop(0.6, "#38bdf8");
        carGrad.addColorStop(0.9, "#0f172a");
        this.ctx.fillStyle = carGrad;
        this.ctx.strokeStyle = "#38bdf8";
        this.ctx.lineWidth = 2.5;

        this.ctx.beginPath();
        // Nose splitter
        this.ctx.moveTo(135, 14);
        this.ctx.lineTo(142, 6);
        this.ctx.lineTo(110, -6);
        // Front hood & wheel arch
        this.ctx.bezierCurveTo(85, -16, 50, -18, 20, -18);
        // Cockpit canopy
        this.ctx.bezierCurveTo(0, -38, -50, -38, -75, -20);
        // Rear deck & spoiler mount
        this.ctx.lineTo(-120, -18);
        this.ctx.lineTo(-145, -4);
        this.ctx.lineTo(-145, 16);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Cockpit Tinted Canopy Glass
        this.ctx.fillStyle = "#060911";
        this.ctx.strokeStyle = "#00f0ff";
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(15, -16);
        this.ctx.lineTo(-5, -32);
        this.ctx.lineTo(-58, -32);
        this.ctx.lineTo(-68, -16);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Specular Windshield Glint
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(8, -18);
        this.ctx.lineTo(-2, -30);
        this.ctx.stroke();

        // Carbon GT Rear Wing
        this.ctx.fillStyle = "#020617";
        this.ctx.strokeStyle = "#00f0ff";
        this.ctx.lineWidth = 2;
        // Pylons
        this.ctx.fillRect(-136, -34, 5, 16);
        this.ctx.fillRect(-118, -34, 5, 16);
        // Wing blade
        this.ctx.beginPath();
        this.ctx.roundRect(-145, -38, 42, 6, 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Full-width Continuous Crimson LED Lightbar Taillight
        this.ctx.strokeStyle = "#ff003c";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(-144, 2);
        this.ctx.lineTo(-144, 12);
        this.ctx.stroke();

        // Quad-LED Projector Headlights
        this.ctx.fillStyle = "#ffffff";
        this.ctx.shadowColor = "#00f0ff";
        this.ctx.shadowBlur = 14;
        this.ctx.beginPath();
        this.ctx.arc(130, 2, 4.5, 0, Math.PI * 2);
        this.ctx.arc(120, -2, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Massive Racing Alloy Wheels & Brake Rotors
        const wheels = [
            { x: -95, y: 16, r: 21 },
            { x: 80, y: 16, r: 21 }
        ];
        for (const w of wheels) {
            // Tire rubber
            this.ctx.fillStyle = "#090d16";
            this.ctx.beginPath();
            this.ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
            this.ctx.fill();
            // Rim
            this.ctx.fillStyle = "#1e293b";
            this.ctx.strokeStyle = "#00e5ff";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(w.x, w.y, w.r * 0.72, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            // Red Brembo Caliper
            this.ctx.fillStyle = "#ff1744";
            this.ctx.fillRect(w.x + 4, w.y - 12, 6, 12);
            // Center nut
            this.ctx.fillStyle = "#ffd700";
            this.ctx.beginPath();
            this.ctx.arc(w.x, w.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 4. Twin-Turbo Exhaust Backfire Flames (Bursts of fire + sparks)
        const flamePulse = (this.frameCount % 8 < 4);
        if (flamePulse) {
            // Dual exhaust tips
            const exhausts = [-146];
            for (const exX of exhausts) {
                // Outer orange combustion flame
                this.ctx.fillStyle = "rgba(255, 109, 0, 0.9)";
                this.ctx.beginPath();
                this.ctx.moveTo(exX, 10);
                this.ctx.lineTo(exX - 35 - Math.random() * 25, 8 + (Math.random() - 0.5) * 8);
                this.ctx.lineTo(exX, 16);
                this.ctx.closePath();
                this.ctx.fill();

                // Inner high-temp cyan core
                this.ctx.fillStyle = "rgba(0, 240, 255, 0.95)";
                this.ctx.beginPath();
                this.ctx.moveTo(exX, 11);
                this.ctx.lineTo(exX - 18 - Math.random() * 12, 13);
                this.ctx.lineTo(exX, 15);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
        this.ctx.restore();

        // 5. High-Tech Glass Racing HUD (Tachometer & Speedometer)
        this.ctx.save();
        this.ctx.translate(w - 230, 85);
        this.ctx.fillStyle = "rgba(10, 15, 26, 0.88)";
        this.ctx.strokeStyle = "#00f0ff";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(-90, -45, 180, 90, 10);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 11px Consolas, monospace";
        this.ctx.fillStyle = "#00f0ff";
        this.ctx.textAlign = "center";
        this.ctx.fillText("TELEMETRY // V16 TURBO", 0, -25);

        const currentSpeed = 230 + Math.floor(Math.sin(this.frameCount * 0.2) * 8);
        this.ctx.font = "bold 28px Consolas, monospace";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(`${currentSpeed} MPH`, 0, 4);

        this.ctx.font = "bold 12px Consolas, monospace";
        this.ctx.fillStyle = (this.frameCount % 6 < 3) ? "#ff1744" : "#ff9100";
        this.ctx.fillText("9,500 RPM [REDLINE]", 0, 24);
        this.ctx.restore();

        // 6. Cinema Luxury Victory HUD Banner
        this.ctx.save();
        this.ctx.translate(w / 2, 75);
        this.ctx.fillStyle = "rgba(6, 10, 18, 0.94)";
        this.ctx.strokeStyle = "#00e5ff";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(-360, -40, 720, 80, 14);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 25px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#00e5ff";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(this.titleOverride || "🏎️ 1,500 HP HYPERCAR DRIFT • MAXIMUM WEALTH FLEX 🏎️", 0, -10);

        this.ctx.font = "bold 12px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText("BUGATTI CHIRON PUR SPORT • QUAD-TURBO W16 • $4,500,000 FLEET", 0, 20);
        this.ctx.restore();
    }

    // --- 7. Mega Yacht Procedural 60fps Scene ---
    _drawMegaYacht(w, h) {
        const yacht = this.extraData.yacht;
        if (!yacht) return;

        // 1. Monaco Twilight Ocean Gradient
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h * 0.5);
        skyGrad.addColorStop(0, "#030612");
        skyGrad.addColorStop(0.4, "#0b162e");
        skyGrad.addColorStop(0.7, "#1d1a45");
        skyGrad.addColorStop(1, "#c46a28"); // warm golden sunset rim
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, w, h * 0.5);

        // Golden Crescent Moon with Soft Radial Corona
        this.ctx.save();
        this.ctx.font = "60px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText("🌙", w * 0.85, 90);
        this.ctx.restore();

        // Distant Monaco Harbor Shoreline Lights
        this.ctx.fillStyle = "rgba(255, 215, 0, 0.75)";
        for (let i = 0; i < 40; i++) {
            const lx = (i * 48 + 20) % w;
            const ly = h * 0.49 - ((i * 19) % 24);
            this.ctx.fillRect(lx, ly, 3, 3);
        }

        // 2. Underwater Hull Cyan LED Radiance
        const bobY = Math.sin(this.frameCount * 0.05) * 4;
        const yachtY = yacht.y + bobY;
        const yachtX = yacht.x;

        this.ctx.save();
        this.ctx.translate(yachtX, yachtY + 22);
        this.ctx.scale(1.0, 0.35);
        const hullGlow = this.ctx.createRadialGradient(0, 0, 20, 0, 0, 240);
        hullGlow.addColorStop(0, "rgba(0, 240, 255, 0.85)");
        hullGlow.addColorStop(0.5, "rgba(0, 150, 220, 0.45)");
        hullGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        this.ctx.fillStyle = hullGlow;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 240, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // 3. Multi-tier 300ft Superyacht Naval Architecture
        this.ctx.save();
        const pitchAngle = Math.sin(this.frameCount * 0.04) * 0.012;
        this.ctx.translate(yachtX, yachtY);
        this.ctx.rotate(pitchAngle);

        // Main Lower Hull (Midnight Navy & Platinum Waterline)
        const hullGrad = this.ctx.createLinearGradient(-220, 0, 220, 30);
        hullGrad.addColorStop(0, "#08101e");
        hullGrad.addColorStop(0.5, "#0f1c34");
        hullGrad.addColorStop(1, "#1e293b");
        this.ctx.fillStyle = hullGrad;
        this.ctx.strokeStyle = "#38bdf8";
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(210, 10);   // Raked Bow
        this.ctx.lineTo(235, -12);  // Sharp bow tip
        this.ctx.lineTo(130, -12);  // Foredeck
        this.ctx.lineTo(-210, -12); // Aft deck
        this.ctx.lineTo(-215, 14);  // Stern transom
        this.ctx.lineTo(160, 24);   // Lower keel
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Waterline Silver Pinstripe
        this.ctx.strokeStyle = "#e2e8f0";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-212, 10);
        this.ctx.lineTo(195, 10);
        this.ctx.stroke();

        // Superstructure - Main Deck & Cabin Suites
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = "#94a3b8";
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.roundRect(-180, -32, 280, 20, 3);
        this.ctx.fill();
        this.ctx.stroke();

        // Glowing Panoramic Privacy Windows (Golden Warm Light)
        this.ctx.fillStyle = "#fde047";
        this.ctx.shadowColor = "#facc15";
        this.ctx.shadowBlur = 8;
        for (let gx = -165; gx < 85; gx += 22) {
            this.ctx.fillRect(gx, -27, 14, 10);
        }
        this.ctx.shadowBlur = 0;

        // Bridge Deck & Wheelhouse
        this.ctx.fillStyle = "#f8fafc";
        this.ctx.beginPath();
        this.ctx.roundRect(-130, -50, 180, 18, 3);
        this.ctx.fill();
        this.ctx.stroke();

        // Bridge Windows (Cyan Tinted Glass)
        this.ctx.fillStyle = "#0284c7";
        for (let bx = -115; bx < 40; bx += 20) {
            this.ctx.fillRect(bx, -46, 12, 10);
        }

        // Top Sun Deck & Glowing Jacuzzi / Infinity Pool
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(-70, -64, 90, 14);
        // Jacuzzi Pool (glowing turquoise)
        this.ctx.fillStyle = "#00f0ff";
        this.ctx.fillRect(-60, -62, 28, 8);

        // Communications Radar Mast with Spinning Beacon
        this.ctx.strokeStyle = "#64748b";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-10, -64);
        this.ctx.lineTo(-10, -82);
        this.ctx.lineTo(5, -78);
        this.ctx.stroke();

        // Foredeck Helipad [ H ]
        this.ctx.fillStyle = "#1e293b";
        this.ctx.strokeStyle = "#ffd700";
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.ellipse(170, -11, 26, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 9px sans-serif";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = "center";
        this.ctx.fillText("H", 170, -8);

        // Private Helicopter Silhouette on Helipad
        this.ctx.fillStyle = "#0f172a";
        this.ctx.fillRect(162, -22, 16, 8); // Cabin
        this.ctx.fillRect(152, -18, 12, 3); // Tail boom
        // Rotor blades
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(148, -24);
        this.ctx.lineTo(192, -24);
        this.ctx.stroke();

        // Bow Wave Splash Foam
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        this.ctx.beginPath();
        this.ctx.arc(228, 14, 5 + Math.random() * 3, 0, Math.PI * 2);
        this.ctx.arc(235, 18, 7 + Math.random() * 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // 4. Dynamic Deep Ocean Waves (Rolling Mediterranean Sea)
        if (this.extraData.waves) {
            for (const wave of this.extraData.waves) {
                wave.phase += wave.speed;
                this.ctx.fillStyle = wave.color;
                this.ctx.beginPath();
                this.ctx.moveTo(0, h);
                this.ctx.lineTo(0, wave.y);
                for (let wx = 0; wx <= w; wx += 25) {
                    const wy = wave.y + Math.sin(wx * wave.freq + wave.phase) * wave.amp;
                    this.ctx.lineTo(wx, wy);
                }
                this.ctx.lineTo(w, h);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }

        // 5. Effervescent Golden Champagne Bubbles Floating Upward
        if (this.extraData.bubbles) {
            for (const b of this.extraData.bubbles) {
                b.wobble += b.wobbleSpd;
                b.x += Math.sin(b.wobble) * 1.5;
                b.y -= b.vy;
                if (b.y < -20) {
                    b.y = h + Math.random() * 50;
                    b.x = Math.random() * w;
                }
                this.ctx.fillStyle = b.color;
                this.ctx.beginPath();
                this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // 6. Sky Celebration Starbursts
        if (Math.random() < 0.25 && (!this.extraData.skySparks || this.extraData.skySparks.length < 40)) {
            if (!this.extraData.skySparks) this.extraData.skySparks = [];
            const sx = Math.random() * w;
            const sy = 60 + Math.random() * 120;
            const sparkCol = ["#ffd700", "#38bdf8", "#f43f5e", "#a855f7"][Math.floor(Math.random() * 4)];
            for (let k = 0; k < 6; k++) {
                const angle = (k / 6) * Math.PI * 2;
                this.extraData.skySparks.push({
                    x: sx,
                    y: sy,
                    vx: Math.cos(angle) * (2 + Math.random() * 3),
                    vy: Math.sin(angle) * (2 + Math.random() * 3),
                    color: sparkCol,
                    life: 25
                });
            }
        }
        if (this.extraData.skySparks) {
            for (let i = this.extraData.skySparks.length - 1; i >= 0; i--) {
                const sp = this.extraData.skySparks[i];
                sp.x += sp.vx;
                sp.y += sp.vy;
                sp.life--;
                this.ctx.fillStyle = sp.color;
                this.ctx.beginPath();
                this.ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
                this.ctx.fill();
                if (sp.life <= 0) this.extraData.skySparks.splice(i, 1);
            }
        }

        // 7. Cinema Luxury Victory HUD Banner
        this.ctx.save();
        this.ctx.translate(w / 2, 75);
        this.ctx.fillStyle = "rgba(6, 12, 24, 0.94)";
        this.ctx.strokeStyle = "#ffd700";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(-360, -40, 720, 80, 14);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 25px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#ffd700";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(this.titleOverride || "🛥️ 300FT MONACO SUPERYACHT • BILLIONAIRE PRESTIGE 🛥️", 0, -10);

        this.ctx.font = "bold 12px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#e0e7ff";
        this.ctx.fillText("PRIVATE HELIPAD • DEEP OCEAN LED GLOW • ANCHORED IN SAINT-TROPEZ", 0, 20);
        this.ctx.restore();
    }

    // --- 8. Private Jet Procedural 60fps Scene ---
    _drawPrivateJet(w, h) {
        const jet = this.extraData.jet;
        if (!jet) return;

        // 1. Stratosphere High-Altitude Sunset Atmosphere
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, "#030412");   // Cosmic space navy
        skyGrad.addColorStop(0.3, "#160f38"); // Royal violet
        skyGrad.addColorStop(0.6, "#7c1d56"); // Magenta twilight
        skyGrad.addColorStop(0.85, "#ea580c");// Molten sunset amber
        skyGrad.addColorStop(1, "#facc15");   // Golden horizon
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, w, h);

        // Blinding High-Altitude Sun Corona on Horizon
        this.ctx.save();
        const sunX = w * 0.18;
        const sunY = h * 0.58;
        const sunGrad = this.ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 220);
        sunGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        sunGrad.addColorStop(0.3, "rgba(254, 240, 138, 0.65)");
        sunGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        this.ctx.fillStyle = sunGrad;
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, 220, 0, Math.PI * 2);
        this.ctx.fill();

        // Anamorphic Sun Flare Streak across screen
        this.ctx.strokeStyle = "rgba(255, 245, 200, 0.45)";
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, sunY + 8);
        this.ctx.lineTo(w, sunY - 14);
        this.ctx.stroke();
        this.ctx.restore();

        // 2. Supersonic Parallax Cloudscape Deck
        if (this.extraData.clouds) {
            for (const c of this.extraData.clouds) {
                c.x -= c.spd;
                if (c.x < -180) {
                    c.x = w + 180;
                    c.y = h * 0.52 + Math.random() * (h * 0.48);
                }
                this.ctx.fillStyle = c.color;
                this.ctx.beginPath();
                this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // 3. Render High-Fidelity Gulfstream G700 Aircraft
        this.ctx.save();
        const climbAngle = jet.bankAngle + Math.sin(this.frameCount * 0.08) * 0.015;
        this.ctx.translate(jet.x, jet.y);
        this.ctx.rotate(climbAngle);

        // Swept Left/Right Wings with Upturned Blended Winglets
        this.ctx.fillStyle = "#e2e8f0";
        this.ctx.strokeStyle = "#cbd5e1";
        this.ctx.lineWidth = 1.5;
        // Main swept delta wing
        this.ctx.beginPath();
        this.ctx.moveTo(30, 2);
        this.ctx.lineTo(-40, 55);  // Starboard wingtip
        this.ctx.lineTo(-55, 50);
        this.ctx.lineTo(-10, 0);
        this.ctx.lineTo(-55, -50); // Port wingtip
        this.ctx.lineTo(-40, -55);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Vertical Winglets
        this.ctx.fillStyle = "#38bdf8";
        this.ctx.fillRect(-45, 52, 10, 14); // Starboard winglet
        this.ctx.fillRect(-45, -66, 10, 14); // Port winglet

        // FAA Aviation Beacons
        // Port wingtip = Red
        this.ctx.fillStyle = "#ef4444";
        this.ctx.beginPath();
        this.ctx.arc(-42, -55, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Starboard wingtip = Green
        this.ctx.fillStyle = "#22c55e";
        this.ctx.beginPath();
        this.ctx.arc(-42, 55, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // High-Intensity White Strobe Anti-Collision Flash (every 30 frames)
        if (this.frameCount % 30 < 4) {
            this.ctx.fillStyle = "#ffffff";
            this.ctx.shadowColor = "#ffffff";
            this.ctx.shadowBlur = 18;
            this.ctx.beginPath();
            this.ctx.arc(-42, -55, 8, 0, Math.PI * 2);
            this.ctx.arc(-42, 55, 8, 0, Math.PI * 2);
            this.ctx.arc(-110, -18, 9, 0, Math.PI * 2); // Tail strobe
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // Sleek Pearl White Fuselage
        const fuseGrad = this.ctx.createLinearGradient(120, -14, -120, 14);
        fuseGrad.addColorStop(0, "#ffffff");
        fuseGrad.addColorStop(0.5, "#f1f5f9");
        fuseGrad.addColorStop(1, "#cbd5e1");
        this.ctx.fillStyle = fuseGrad;
        this.ctx.strokeStyle = "#94a3b8";
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(130, 0);   // Nose radome
        this.ctx.bezierCurveTo(80, -14, -40, -14, -100, -6);
        this.ctx.lineTo(-125, -28); // T-Tail vertical fin base
        this.ctx.lineTo(-118, -32); // Tail fin top
        this.ctx.lineTo(-100, -6);
        this.ctx.bezierCurveTo(-60, 14, 60, 14, 130, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Iconic G700 Oval Panoramic VIP Windows (Glowing Champagne Gold)
        this.ctx.fillStyle = "#fde047";
        this.ctx.shadowColor = "#eab308";
        this.ctx.shadowBlur = 6;
        for (let ox = 50; ox > -65; ox -= 18) {
            this.ctx.beginPath();
            this.ctx.ellipse(ox, 0, 5.5, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;

        // Cockpit Windshield (Polarized Mirror Titanium)
        this.ctx.fillStyle = "#0284c7";
        this.ctx.beginPath();
        this.ctx.moveTo(114, -3);
        this.ctx.lineTo(95, -7);
        this.ctx.lineTo(95, 3);
        this.ctx.closePath();
        this.ctx.fill();

        // Twin Rolls-Royce Pearl Turbofan Engines (Fuselage Mounted)
        const nacelles = [-14, 14];
        for (const ny of nacelles) {
            // Engine nacelle pod
            this.ctx.fillStyle = "#334155";
            this.ctx.strokeStyle = "#0ea5e9";
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.roundRect(-75, ny - 6, 42, 12, 4);
            this.ctx.fill();
            this.ctx.stroke();

            // Turbofan intake rim
            this.ctx.fillStyle = "#0f172a";
            this.ctx.fillRect(-35, ny - 5, 4, 10);

            // Reheat Exhaust Core & Heat Shimmer Waves
            this.ctx.fillStyle = "rgba(251, 146, 60, 0.9)";
            this.ctx.beginPath();
            this.ctx.moveTo(-75, ny - 4);
            this.ctx.lineTo(-95 - Math.random() * 18, ny);
            this.ctx.lineTo(-75, ny + 4);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.restore();

        // 4. Floating Luxury Champagne Toast Motes & Shimmering Flares
        if (Math.random() < 0.35 && (!this.extraData.jetParticles || this.extraData.jetParticles.length < 35)) {
            if (!this.extraData.jetParticles) this.extraData.jetParticles = [];
            this.extraData.jetParticles.push({
                x: w + 20,
                y: Math.random() * h,
                vx: 4 + Math.random() * 6,
                char: ["🥂", "✨", "💎", "⭐"][Math.floor(Math.random() * 4)],
                size: 16 + Math.random() * 14,
                life: 110
            });
        }
        if (this.extraData.jetParticles) {
            for (let i = this.extraData.jetParticles.length - 1; i >= 0; i--) {
                const jp = this.extraData.jetParticles[i];
                jp.x -= jp.vx;
                jp.life--;
                this.ctx.font = `${jp.size}px sans-serif`;
                this.ctx.textAlign = "center";
                this.ctx.fillText(jp.char, jp.x, jp.y);
                if (jp.life <= 0 || jp.x < -30) this.extraData.jetParticles.splice(i, 1);
            }
        }

        // 5. Cinema Luxury Victory HUD Banner
        this.ctx.save();
        this.ctx.translate(w / 2, 75);
        this.ctx.fillStyle = "rgba(8, 14, 28, 0.94)";
        this.ctx.strokeStyle = "#38bdf8";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(-360, -40, 720, 80, 14);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = "bold 25px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#38bdf8";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(this.titleOverride || "✈️ GULFSTREAM G700 STRATOSPHERE • MACH 0.925 TRANSATLANTIC ✈️", 0, -10);

        this.ctx.font = "bold 12px 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText("51,000 FT CRUISING ALTITUDE • PRIVATE FLIGHT DECK • GLOBAL REACH", 0, 20);
        this.ctx.restore();
    }
}

// Global instance
window.winAnimations = new WinAnimationEngine();
