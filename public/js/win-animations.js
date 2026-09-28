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

        this._initEvents();
    }

    _initEvents() {
        if (this.btnSkip) {
            this.btnSkip.addEventListener("click", () => this.stop());
        }
        if (this.canvas) {
            this.canvas.addEventListener("click", () => this.stop());
        }
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.active) {
                this.stop();
            }
        });
        window.addEventListener("resize", () => {
            if (this.active) this._resize();
        });
    }

    _resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    play(animationId = "money_rain", titleOverride = null) {
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

        this._initParticles();
        this._loop();
    }

    stop() {
        this.active = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.canvas) {
            this.canvas.style.display = "none";
            this.canvas.style.transform = "none";
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

        if (this.animationId === "rocket_moon") {
            this._drawRocket(w, h);
        } else if (this.animationId === "matrix_glitch") {
            this._drawMatrix(w, h);
        } else if (this.animationId === "diamond_hands") {
            this._drawDiamondHands(w, h);
        } else if (this.animationId === "golden_bull") {
            this._drawGoldenBull(w, h);
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
}

// Global instance
window.winAnimations = new WinAnimationEngine();
