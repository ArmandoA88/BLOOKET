// =====================================================================
//  SPACE INVADERS  — Premium HTML5 Canvas Edition
// =====================================================================
(function () {
    'use strict';

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // --- HUD refs ---
    const scoreEl = document.getElementById('score-val');
    const hiScoreEl = document.getElementById('hi-score-val');
    const waveEl = document.getElementById('wave-val');
    const livesContainer = document.getElementById('lives-icons');
    const powerupEl = document.getElementById('powerup-active');

    // =====================================================================
    //  WEB AUDIO (procedural sounds)
    // =====================================================================
    let audioCtx = null;
    function getAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }
    function beep(freq, type, duration, vol = 0.18, startFreq = null) {
        try {
            const ac = getAudio();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(startFreq || freq, ac.currentTime);
            if (startFreq) osc.frequency.exponentialRampToValueAtTime(freq, ac.currentTime + duration);
            gain.gain.setValueAtTime(vol, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
            osc.start(ac.currentTime);
            osc.stop(ac.currentTime + duration);
        } catch (e) { }
    }
    function sfxShoot() { beep(880, 'square', 0.08, 0.12, 1760); }
    function sfxExplosion() { beep(80, 'sawtooth', 0.4, 0.3, 200); }
    function sfxAlienDie() { beep(300, 'square', 0.15, 0.2, 100); }
    function sfxPowerup() { beep(440, 'triangle', 0.3, 0.2, 880); }
    function sfxShield() { beep(200, 'sine', 0.1, 0.15); }
    function sfxUFO() { beep(150, 'sawtooth', 0.08, 0.1, 180); }
    function sfxWin() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 'triangle', 0.3, 0.2), i * 150)); }
    function sfxGameOver() { [400, 300, 200, 100].forEach((f, i) => setTimeout(() => beep(f, 'sawtooth', 0.3, 0.25), i * 180)); }

    // =====================================================================
    //  CONSTANTS
    // =====================================================================
    const ALIEN_COLS = 11;
    const ALIEN_ROWS = 5;
    const ALIEN_SIZE = 34;
    const ALIEN_GAP_X = 14;
    const ALIEN_GAP_Y = 16;
    const FORMATION_LEFT = 40;
    const FORMATION_TOP = 90;
    const PLAYER_SPEED = 320;
    const BULLET_SPEED = 560;
    const ALIEN_BULLET_SPEED = 220;
    const SHIELD_COUNT = 4;

    const ALIEN_PTS = [30, 20, 20, 10, 10];   // per row (top to bottom)
    const ALIEN_COLORS = [
        '#ff6bcd', // row 0 - pink squids
        '#ffd60a', // row 1 - yellow crabs
        '#ffd60a', // row 2
        '#00ffff', // row 3 - cyan octopods
        '#00ffff', // row 4
    ];

    // =====================================================================
    //  STATE
    // =====================================================================
    let state = 'START'; // START | PLAYING | DEAD | WAVE_CLEAR | GAME_OVER | BOSS
    let score = 0;
    let hiScore = parseInt(localStorage.getItem('si_hi') || '0');
    let lives = 3;
    let wave = 1;
    let frameCount = 0;
    let stateTimer = 0;

    // Boss
    let boss = null;
    let bossPhase = 0;

    // Player
    let player = { x: W / 2, y: H - 52, w: 48, h: 28, vx: 0, shieldTime: 0, rapidTime: 0, spreadTime: 0, bombTime: 0 };
    let playerBullets = [];
    let alienBullets = [];

    // Aliens
    let aliens = [];
    let formationX = 0;  // offset from starting position
    let formationDir = 1;
    let formationSpeed = 28;
    let formationMoveTimer = 0;
    let formationMoveInterval = 0.6;
    let formationDropped = false;
    let alienShootTimer = 0;
    let alienShootInterval = 1.8;

    // UFO
    let ufo = null;
    let ufoTimer = 0;

    // Shields
    let shields = [];

    // Particles
    let particles = [];

    // Stars background
    let stars = [];
    let nebulas = [];

    // Power-up drops
    let powerUps = [];
    const PUP_TYPES = ['spread', 'rapid', 'shield', 'bomb'];
    const PUP_COLORS = { spread: '#ffd60a', rapid: '#00ffff', shield: '#00ff88', bomb: '#ff4444' };
    const PUP_LABELS = { spread: 'SPREAD', rapid: 'RAPID FIRE', shield: 'SHIELD', bomb: 'BOMB WAVE' };

    // Input
    const keys = {};
    let touchLeft = false, touchRight = false, touchFire = false;

    // =====================================================================
    //  INIT
    // =====================================================================
    function initStars() {
        stars = Array.from({ length: 180 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * 1.8 + 0.3,
            alpha: Math.random() * 0.7 + 0.2,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.3 + 0.05
        }));
        nebulas = Array.from({ length: 4 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * 140 + 60,
            color: ['#00ffff', '#ff6bcd', '#6b4cff', '#00ff88'][Math.floor(Math.random() * 4)],
            alpha: Math.random() * 0.04 + 0.02
        }));
    }

    function buildAliens() {
        aliens = [];
        formationX = 0;
        formationDir = 1;
        formationMoveInterval = Math.max(0.18, 0.6 - (wave - 1) * 0.04);
        alienShootInterval = Math.max(0.6, 1.8 - (wave - 1) * 0.1);
        formationSpeed = Math.min(80, 28 + (wave - 1) * 4);

        for (let row = 0; row < ALIEN_ROWS; row++) {
            for (let col = 0; col < ALIEN_COLS; col++) {
                aliens.push({
                    row, col,
                    x: FORMATION_LEFT + col * (ALIEN_SIZE + ALIEN_GAP_X),
                    y: FORMATION_TOP + row * (ALIEN_SIZE + ALIEN_GAP_Y),
                    alive: true,
                    frame: 0,
                    flashTime: 0,
                    wobble: 0
                });
            }
        }
    }

    function buildShields() {
        shields = [];
        const totalW = W - 120;
        for (let s = 0; s < SHIELD_COUNT; s++) {
            const sx = 60 + s * (totalW / (SHIELD_COUNT - 1));
            // Each shield is a grid of 12x6 blocks
            const blocks = [];
            for (let bx = 0; bx < 12; bx++) {
                for (let by = 0; by < 6; by++) {
                    // Arch cutout at bottom center
                    const isArch = by >= 4 && bx >= 4 && bx <= 7;
                    if (!isArch) blocks.push({ bx, by, hp: 3 });
                }
            }
            shields.push({ x: sx - 30, y: H - 130, blocks, w: 12, h: 6, bw: 5, bh: 5 });
        }
    }

    function startWave() {
        state = 'PLAYING';
        buildAliens();
        buildShields();
        playerBullets = [];
        alienBullets = [];
        powerUps = [];
        particles = [];
        ufo = null;
        ufoTimer = 15 + Math.random() * 20;
        formationDropped = false;
        formationMoveTimer = 0;
        alienShootTimer = 0;
        boss = null;
    }

    function startBossWave() {
        state = 'BOSS';
        aliens = [];
        playerBullets = [];
        alienBullets = [];
        powerUps = [];
        particles = [];
        ufo = null;
        formationDropped = false;
        const maxHp = 15 + wave * 5;
        boss = {
            x: W / 2, y: 100,
            w: 120, h: 50,
            hp: maxHp, maxHp,
            vx: 120,
            shootTimer: 0,
            shootInterval: 1.2,
            phase: 0,
            flashTime: 0,
            armAngle: 0
        };
        state = 'PLAYING';
    }

    initStars();
    updateLivesUI();
    updateHudNumbers();

    // =====================================================================
    //  DRAWING HELPERS
    // =====================================================================
    function drawAlienType0(x, y, size, col, frame, flashTime) {
        // Squid top row - pink spiky
        const glow = flashTime > 0 ? 1 : 0;
        ctx.save();
        ctx.translate(x, y);
        if (glow) { ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; }
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 2;
        const s = size * 0.4;
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.85, s * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-s * 0.3, -s * 0.05, s * 0.18, s * 0.22, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.3, -s * 0.05, s * 0.18, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-s * 0.26, -s * 0.08, s * 0.07, s * 0.1, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.26, -s * 0.08, s * 0.07, s * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tentacles
        ctx.fillStyle = col;
        const tentX = [-0.55, -0.18, 0.18, 0.55];
        const tentOffset = frame === 0 ? 0 : s * 0.15;
        tentX.forEach((tx, i) => {
            const to = (i % 2 === 0) ? tentOffset : -tentOffset;
            ctx.beginPath();
            ctx.moveTo(tx * s, s * 0.55);
            ctx.quadraticCurveTo(tx * s * 1.3, s * 0.8 + to, tx * s, s * 1.0);
            ctx.lineWidth = 3;
            ctx.strokeStyle = col;
            ctx.stroke();
        });
        // Spikes at top
        [-0.6, 0, 0.6].forEach(sx2 => {
            ctx.beginPath();
            ctx.moveTo(sx2 * s, -s * 0.5);
            ctx.lineTo(sx2 * s - s * 0.12, -s * 0.88);
            ctx.lineTo(sx2 * s + s * 0.12, -s * 0.88);
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
        });
        ctx.restore();
    }

    function drawAlienType1(x, y, size, col, frame, flashTime) {
        // Crab mid rows - yellow
        ctx.save();
        ctx.translate(x, y);
        if (flashTime > 0) { ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; }
        const s = size * 0.4;
        ctx.fillStyle = col;
        // Shell body
        ctx.beginPath();
        ctx.roundRect(-s * 0.8, -s * 0.5, s * 1.6, s, [s * 0.35]);
        ctx.fill();
        // Claws
        const clawAnim = frame === 0 ? 0.05 : -0.05;
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.translate(side * s * 0.95, 0);
            ctx.rotate(side * (Math.PI * 0.15 + clawAnim));
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(side * s * 0.45, -s * 0.3);
            ctx.lineTo(side * s * 0.55, s * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-s * 0.35, -s * 0.1, s * 0.18, s * 0.2, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.35, -s * 0.1, s * 0.18, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col === '#ffd60a' ? '#ff8c00' : '#fff';
        ctx.beginPath();
        ctx.ellipse(-s * 0.31, -s * 0.14, s * 0.07, s * 0.09, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.31, -s * 0.14, s * 0.07, s * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        const legAnim = frame === 0 ? s * 0.6 : s * 0.72;
        [-0.6, -0.2, 0.2, 0.6].forEach((lx, i) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = 2.5;
            const side = i < 2 ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(lx * s * 0.7, s * 0.35);
            ctx.lineTo(lx * s, legAnim);
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawAlienType2(x, y, size, col, frame, flashTime) {
        // Octopod bottom rows - cyan
        ctx.save();
        ctx.translate(x, y);
        if (flashTime > 0) { ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; }
        const s = size * 0.42;
        ctx.fillStyle = col;
        // Dome
        ctx.beginPath();
        ctx.arc(0, -s * 0.1, s * 0.85, Math.PI, 0);
        ctx.fill();
        // Flat base
        ctx.fillRect(-s * 0.85, -s * 0.1, s * 1.7, s * 0.35);
        // Tentacles/feet (8 of them alternating)
        const footAnim = frame === 0 ? s * 0.18 : -s * 0.15;
        for (let f = 0; f < 8; f++) {
            const fx = (-3.5 + f) * s * 0.24;
            const flip = f % 2 === 0 ? footAnim : -footAnim;
            ctx.beginPath();
            ctx.moveTo(fx, s * 0.25);
            ctx.quadraticCurveTo(fx + flip * 0.5, s * 0.52, fx + flip, s * 0.7);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = col;
            ctx.stroke();
        }
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-s * 0.32, -s * 0.18, s * 0.2, s * 0.24, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.32, -s * 0.18, s * 0.2, s * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-s * 0.27, -s * 0.23, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.27, -s * 0.23, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawPlayer(px, py, shieldTime) {
        ctx.save();
        ctx.translate(px, py);
        // Engine glow
        const grd = ctx.createRadialGradient(0, 20, 2, 0, 20, 20);
        grd.addColorStop(0, 'rgba(0,255,136,0.6)');
        grd.addColorStop(1, 'rgba(0,255,136,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(-18, 5, 36, 30);

        // Shield bubble
        if (shieldTime > 0) {
            ctx.beginPath();
            ctx.arc(0, -6, 36, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,200,255,${Math.min(1, shieldTime) * 0.7})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ccff';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Ship body
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#00ff88';
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(22, 14);
        ctx.lineTo(14, 8);
        ctx.lineTo(10, 16);
        ctx.lineTo(-10, 16);
        ctx.lineTo(-14, 8);
        ctx.lineTo(-22, 14);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#002211';
        ctx.beginPath();
        ctx.ellipse(0, -4, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(0,255,180,0.5)`;
        ctx.beginPath();
        ctx.ellipse(-2, -6, 3, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Engine nozzles
        ctx.fillStyle = '#005533';
        ctx.fillRect(-13, 14, 8, 6);
        ctx.fillRect(5, 14, 8, 6);

        ctx.restore();
    }

    function drawBoss(b) {
        ctx.save();
        ctx.translate(b.x, b.y);
        if (b.flashTime > 0) { ctx.shadowBlur = 30; ctx.shadowColor = '#fff'; }

        // Main body
        const hpFrac = b.hp / b.maxHp;
        const bcolor = hpFrac > 0.5 ? '#ff4400' : hpFrac > 0.25 ? '#ff8800' : '#ff0000';
        ctx.shadowBlur = (b.flashTime > 0) ? 30 : 20;
        ctx.shadowColor = bcolor;
        ctx.fillStyle = bcolor;
        ctx.beginPath();
        ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, [12]);
        ctx.fill();

        // Canopy
        ctx.fillStyle = '#300';
        ctx.beginPath();
        ctx.ellipse(0, -b.h * 0.05, b.w * 0.3, b.h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,80,0,0.4)`;
        ctx.beginPath();
        ctx.ellipse(-b.w * 0.08, -b.h * 0.15, b.w * 0.1, b.h * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Side guns
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.translate(side * b.w * 0.45, 0);
            ctx.rotate(b.armAngle * side);
            ctx.fillStyle = '#881100';
            ctx.fillRect(-8, -5, 16, 24);
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(-4, 16, 8, 12);
            ctx.restore();
        });

        // Eye
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-4, -2, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-b.w / 2, b.h / 2 + 8, b.w, 8);
        ctx.fillStyle = hpFrac > 0.5 ? '#00ff00' : hpFrac > 0.25 ? '#ffaa00' : '#ff0000';
        ctx.fillRect(-b.w / 2, b.h / 2 + 8, b.w * hpFrac, 8);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-b.w / 2, b.h / 2 + 8, b.w, 8);

        ctx.restore();
    }

    function drawUFO(u) {
        ctx.save();
        ctx.translate(u.x, u.y);
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ff00ff';
        ctx.fillStyle = '#cc00cc';
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff44ff';
        ctx.beginPath();
        ctx.ellipse(0, -8, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,255,0.7)';
        ctx.beginPath();
        ctx.ellipse(-6, -10, 5, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Lights
        [-18, -9, 0, 9, 18].forEach((lx, i) => {
            ctx.fillStyle = `hsl(${(frameCount * 4 + i * 40) % 360}, 100%, 70%)`;
            ctx.beginPath();
            ctx.arc(lx, 2, 3.5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    function drawShield(sh) {
        sh.blocks.forEach(b => {
            if (b.hp <= 0) return;
            const x = sh.x + b.bx * (sh.bw + 1);
            const y = sh.y + b.by * (sh.bh + 1);
            const alpha = b.hp / 3;
            ctx.fillStyle = `rgba(0,255,100,${alpha * 0.9})`;
            ctx.shadowBlur = 4;
            ctx.shadowColor = `rgba(0,255,100,${alpha * 0.5})`;
            ctx.fillRect(x, y, sh.bw, sh.bh);
        });
        ctx.shadowBlur = 0;
    }

    function drawBullet(b, isAlien) {
        ctx.save();
        if (isAlien) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = b.color || '#ff4444';
            ctx.fillStyle = b.color || '#ff4444';
            ctx.beginPath();
            ctx.moveTo(b.x, b.y - 8);
            ctx.lineTo(b.x - 3, b.y + 3);
            ctx.lineTo(b.x + 3, b.y + 3);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.shadowBlur = 12;
            ctx.shadowColor = b.color || '#00ff88';
            ctx.fillStyle = b.color || '#00ff88';
            ctx.fillRect(b.x - 2, b.y - 9, 4, 18);
            // tip glow
            ctx.beginPath();
            ctx.arc(b.x, b.y - 9, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawPowerUp(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.wobble);
        ctx.shadowBlur = 14;
        ctx.shadowColor = PUP_COLORS[p.type];
        ctx.fillStyle = PUP_COLORS[p.type];
        ctx.beginPath();
        ctx.roundRect(-14, -10, 28, 20, [6]);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px Share Tech Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type === 'spread' ? '★★★' : p.type === 'rapid' ? '⚡' : p.type === 'shield' ? '⬡' : '💣', 0, 1);
        ctx.restore();
    }

    function spawnParticles(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 40;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                r: Math.random() * 4 + 1.5,
                life: 1.0
            });
        }
    }

    // =====================================================================
    //  COLLISION
    // =====================================================================
    function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function bulletHitShields(bx, by) {
        let hit = false;
        for (const sh of shields) {
            for (const bl of sh.blocks) {
                if (bl.hp <= 0) continue;
                const x = sh.x + bl.bx * (sh.bw + 1);
                const y = sh.y + bl.by * (sh.bh + 1);
                if (rectHit(bx - 2, by - 9, 4, 18, x, y, sh.bw, sh.bh)) {
                    bl.hp--;
                    spawnParticles(x + sh.bw / 2, y, '#00ff88', 4);
                    sfxShield();
                    hit = true;
                    break;
                }
            }
            if (hit) break;
        }
        return hit;
    }

    function bulletHitShieldsAlien(bx, by) {
        let hit = false;
        for (const sh of shields) {
            for (const bl of sh.blocks) {
                if (bl.hp <= 0) continue;
                const x = sh.x + bl.bx * (sh.bw + 1);
                const y = sh.y + bl.by * (sh.bh + 1);
                if (rectHit(bx - 3, by - 3, 6, 10, x, y, sh.bw, sh.bh)) {
                    bl.hp = Math.max(0, bl.hp - 1);
                    hit = true;
                    break;
                }
            }
            if (hit) break;
        }
        return hit;
    }

    // =====================================================================
    //  UPDATE
    // =====================================================================
    let lastTime = 0;
    let shootCooldown = 0;

    function update(dt) {
        frameCount++;
        stateTimer += dt;
        shootCooldown = Math.max(0, shootCooldown - dt);

        if (state !== 'PLAYING' && state !== 'BOSS') return;

        // Player movement
        let moving = false;
        if ((keys['ArrowLeft'] || keys['a'] || touchLeft) && player.x > player.w / 2 + 8) {
            player.x -= PLAYER_SPEED * dt;
            moving = true;
        }
        if ((keys['ArrowRight'] || keys['d'] || touchRight) && player.x < W - player.w / 2 - 8) {
            player.x += PLAYER_SPEED * dt;
            moving = true;
        }
        player.shieldTime = Math.max(0, player.shieldTime - dt);
        player.rapidTime = Math.max(0, player.rapidTime - dt);
        player.spreadTime = Math.max(0, player.spreadTime - dt);
        player.bombTime = Math.max(0, player.bombTime - dt);

        // Player shoot
        const fireKey = keys[' '] || keys['ArrowUp'] || keys['z'] || touchFire;
        const cooldown = player.rapidTime > 0 ? 0.12 : 0.38;
        if (fireKey && shootCooldown <= 0) {
            shootCooldown = cooldown;
            sfxShoot();
            if (player.spreadTime > 0) {
                [-10, 0, 10].forEach(ox => {
                    playerBullets.push({ x: player.x + ox, y: player.y - 20, vy: -BULLET_SPEED, dx: ox * 0.4, color: '#ffd60a' });
                });
                playerBullets.push({ x: player.x - 18, y: player.y, vy: -BULLET_SPEED * 0.85, dx: -3, color: '#ffd60a' });
                playerBullets.push({ x: player.x + 18, y: player.y, vy: -BULLET_SPEED * 0.85, dx: 3, color: '#ffd60a' });
            } else {
                playerBullets.push({ x: player.x, y: player.y - 20, vy: -BULLET_SPEED, dx: 0, color: '#00ff88' });
            }
        }

        // Bomb: nuke all aliens on screen
        if (keys['b'] || keys['B']) {
            if (player.bombTime > 0) {
                player.bombTime = 0;
                aliens.forEach(a => {
                    if (a.alive) {
                        a.alive = false;
                        score += ALIEN_PTS[a.row] * wave;
                        spawnParticles(a.x + ALIEN_SIZE / 2, a.y + ALIEN_SIZE / 2, ALIEN_COLORS[a.row], 16);
                        sfxAlienDie();
                    }
                });
                if (boss) { boss.hp -= 8; boss.flashTime = 0.15; spawnParticles(boss.x, boss.y, '#ff4400', 20); }
                updateHudNumbers();
            }
        }

        // === ALIEN FORMATION MOVEMENT ===
        if (!boss && aliens.some(a => a.alive)) {
            formationMoveTimer += dt;
            if (formationMoveTimer >= formationMoveInterval) {
                formationMoveTimer = 0;
                // Animate alien frames
                aliens.forEach(a => { if (a.alive) a.frame = 1 - a.frame; });
                // Check if needs to reverse
                let minX = Infinity, maxX = -Infinity;
                aliens.forEach(a => {
                    if (!a.alive) return;
                    const ax = FORMATION_LEFT + a.col * (ALIEN_SIZE + ALIEN_GAP_X) + formationX;
                    if (ax < minX) minX = ax;
                    if (ax + ALIEN_SIZE > maxX) maxX = ax + ALIEN_SIZE;
                });
                if (formationDir === 1 && maxX >= W - 12) {
                    formationDir = -1;
                    // Drop down
                    aliens.forEach(a => { if (a.alive) a.y += 18; });
                } else if (formationDir === -1 && minX <= 12) {
                    formationDir = 1;
                    aliens.forEach(a => { if (a.alive) a.y += 18; });
                } else {
                    formationX += formationDir * (formationSpeed / (formationMoveInterval * 30 || 1)) * 2.5;
                }
            }

            // Alien shoot
            alienShootTimer += dt;
            if (alienShootTimer >= alienShootInterval) {
                alienShootTimer = 0;
                const liveAliens = aliens.filter(a => a.alive);
                if (liveAliens.length > 0) {
                    const shooter = liveAliens[Math.floor(Math.random() * liveAliens.length)];
                    const ax = FORMATION_LEFT + shooter.col * (ALIEN_SIZE + ALIEN_GAP_X) + formationX + ALIEN_SIZE / 2;
                    const ay = shooter.y + ALIEN_SIZE;
                    alienBullets.push({ x: ax, y: ay, vy: ALIEN_BULLET_SPEED + wave * 18, color: ALIEN_COLORS[shooter.row] });
                    beep(180 + Math.random() * 80, 'square', 0.12, 0.1);
                }
            }
        }

        // Alien positions
        aliens.forEach(a => {
            if (!a.alive) return;
            a.x = FORMATION_LEFT + a.col * (ALIEN_SIZE + ALIEN_GAP_X) + formationX;
            a.flashTime = Math.max(0, a.flashTime - dt);
            a.wobble = Math.sin(stateTimer * 2 + a.col * 0.5) * 1.5;
        });

        // === BOSS LOGIC ===
        if (boss) {
            boss.x += boss.vx * dt;
            if (boss.x > W - boss.w / 2 - 20 || boss.x < boss.w / 2 + 20) boss.vx *= -1;
            boss.flashTime = Math.max(0, boss.flashTime - dt);
            boss.armAngle = Math.sin(stateTimer * 2) * 0.3;
            boss.y = 100 + Math.sin(stateTimer * 0.8) * 18;
            boss.shootTimer += dt;
            if (boss.shootTimer >= boss.shootInterval) {
                boss.shootTimer = 0;
                const bphase = Math.floor((1 - boss.hp / boss.maxHp) * 3);
                // Different attack patterns by phase
                if (bphase === 0) {
                    alienBullets.push({ x: boss.x, y: boss.y + boss.h / 2, vy: 260, color: '#ff4400' });
                } else if (bphase === 1) {
                    [-1, 0, 1].forEach(dx => alienBullets.push({ x: boss.x + dx * 30, y: boss.y + boss.h / 2, vy: 240, dx: dx * 60, color: '#ff6600' }));
                } else {
                    for (let a = 0; a < 8; a++) {
                        const ang = (a / 8) * Math.PI * 2;
                        alienBullets.push({ x: boss.x, y: boss.y, vy: Math.sin(ang) * 200 + 100, dx: Math.cos(ang) * 200, color: '#ff0000' });
                    }
                    boss.shootInterval = 2.2;
                }
                sfxUFO();
            }
        }

        // UFO
        if (!boss) {
            ufoTimer -= dt;
            if (ufoTimer <= 0 && !ufo) {
                ufo = { x: -40, y: 48, vx: 130 + Math.random() * 50 };
                ufoTimer = 20 + Math.random() * 25;
            }
            if (ufo) {
                ufo.x += ufo.vx * dt;
                sfxUFO();
                if (ufo.x > W + 60) ufo = null;
            }
        }

        // Update player bullets
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const b = playerBullets[i];
            b.y += b.vy * dt;
            b.x += (b.dx || 0) * dt;
            if (b.y < -20 || b.x < -20 || b.x > W + 20) { playerBullets.splice(i, 1); continue; }

            // Hit shield
            if (bulletHitShields(b.x, b.y)) { playerBullets.splice(i, 1); continue; }

            // Hit UFO
            let removed = false;
            if (ufo && rectHit(b.x - 2, b.y - 9, 4, 18, ufo.x - 28, ufo.y - 12, 56, 24)) {
                const pts = [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)];
                score += pts;
                spawnParticles(ufo.x, ufo.y, '#ff44ff', 20);
                sfxExplosion();
                ufo = null;
                playerBullets.splice(i, 1);
                updateHudNumbers();
                removed = true;
            }
            if (removed) continue;

            // Hit boss
            if (boss && rectHit(b.x - 2, b.y - 9, 4, 18, boss.x - boss.w / 2, boss.y - boss.h / 2, boss.w, boss.h)) {
                boss.hp--;
                boss.flashTime = 0.12;
                spawnParticles(b.x, b.y, '#ff4400', 8);
                playerBullets.splice(i, 1);
                sfxAlienDie();
                if (boss.hp <= 0) {
                    score += 500 + wave * 100;
                    spawnParticles(boss.x, boss.y, '#ff4400', 60);
                    sfxExplosion();
                    sfxWin();
                    boss = null;
                    state = 'WAVE_CLEAR';
                    stateTimer = 0;
                    updateHudNumbers();
                }
                continue;
            }

            // Hit alien
            let hitAlien = false;
            for (const a of aliens) {
                if (!a.alive) continue;
                const ax = a.x, ay = a.y;
                if (rectHit(b.x - 2, b.y - 9, 4, 18, ax + 4, ay + 4, ALIEN_SIZE - 8, ALIEN_SIZE - 8)) {
                    a.alive = false;
                    const pts = ALIEN_PTS[a.row] * wave;
                    score += pts;
                    updateHudNumbers();
                    spawnParticles(ax + ALIEN_SIZE / 2, ay + ALIEN_SIZE / 2, ALIEN_COLORS[a.row], 14);
                    sfxAlienDie();
                    // Power-up drop chance
                    if (Math.random() < 0.12) {
                        const type = PUP_TYPES[Math.floor(Math.random() * PUP_TYPES.length)];
                        powerUps.push({ x: ax + ALIEN_SIZE / 2, y: ay + ALIEN_SIZE / 2, vy: 80, type, wobble: 0 });
                    }
                    playerBullets.splice(i, 1);
                    hitAlien = true;
                    break;
                }
            }
            if (hitAlien) continue;
        }

        // Update alien bullets
        for (let i = alienBullets.length - 1; i >= 0; i--) {
            const b = alienBullets[i];
            b.y += b.vy * dt;
            if (b.dx) b.x += b.dx * dt;
            if (b.y > H + 20 || b.x < -20 || b.x > W + 20) { alienBullets.splice(i, 1); continue; }

            // Hit shield
            if (bulletHitShieldsAlien(b.x, b.y)) { alienBullets.splice(i, 1); continue; }

            // Hit player
            if (rectHit(b.x - 3, b.y - 3, 6, 10, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h)) {
                alienBullets.splice(i, 1);
                if (player.shieldTime > 0) {
                    spawnParticles(player.x, player.y, '#00ccff', 10);
                    sfxShield();
                } else {
                    killPlayer();
                }
                continue;
            }
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 80 * dt;
            p.life -= dt * 1.5;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Update power-ups
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const p = powerUps[i];
            p.y += p.vy * dt;
            p.wobble += 2 * dt;
            if (p.y > H + 30) { powerUps.splice(i, 1); continue; }
            // Player collect
            if (rectHit(p.x - 14, p.y - 10, 28, 20, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h)) {
                applyPowerUp(p.type);
                powerUps.splice(i, 1);
                sfxPowerup();
                spawnParticles(p.x, p.y, PUP_COLORS[p.type], 10);
            }
        }

        // Check: alien reaches bottom
        for (const a of aliens) {
            if (a.alive && a.y + ALIEN_SIZE > player.y - player.h / 2 - 10) {
                killPlayer();
                break;
            }
        }

        // Check: all aliens dead → wave clear
        if (!boss && aliens.length > 0 && aliens.every(a => !a.alive)) {
            sfxWin();
            state = 'WAVE_CLEAR';
            stateTimer = 0;
        }

        // Wave clear → next wave
        if (state === 'WAVE_CLEAR' && stateTimer > 2.5) {
            wave++;
            updateHudNumbers();
            if (wave % 5 === 0) {
                startBossWave();
            } else {
                startWave();
            }
        }

        // Twinkle stars
        stars.forEach(s => {
            s.y += s.speed;
            if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
            s.twinkle += 0.05;
        });
    }

    function killPlayer() {
        lives--;
        updateLivesUI();
        spawnParticles(player.x, player.y, '#00ff88', 30);
        sfxExplosion();
        if (lives <= 0) {
            sfxGameOver();
            state = 'GAME_OVER';
            stateTimer = 0;
            if (score > hiScore) {
                hiScore = score;
                localStorage.setItem('si_hi', hiScore);
                updateHudNumbers();
            }
        } else {
            player.x = W / 2;
            player.shieldTime = 2.5; // brief invuln
        }
    }

    function applyPowerUp(type) {
        if (type === 'spread') player.spreadTime = 8;
        if (type === 'rapid') player.rapidTime = 7;
        if (type === 'shield') player.shieldTime = 6;
        if (type === 'bomb') player.bombTime = 1;
        showPowerUpHUD(type);
    }

    function showPowerUpHUD(type) {
        powerupEl.style.display = 'inline-block';
        powerupEl.style.background = PUP_COLORS[type];
        powerupEl.style.color = '#000';
        powerupEl.textContent = PUP_LABELS[type];
        clearTimeout(powerupEl._timer);
        powerupEl._timer = setTimeout(() => { powerupEl.style.display = 'none'; }, 8000);
    }

    function updateLivesUI() {
        livesContainer.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            const icon = document.createElement('div');
            icon.className = 'life-icon';
            livesContainer.appendChild(icon);
        }
    }

    function updateHudNumbers() {
        scoreEl.textContent = String(score).padStart(6, '0');
        hiScoreEl.textContent = String(hiScore).padStart(6, '0');
        waveEl.textContent = String(wave).padStart(2, '0');
    }

    // =====================================================================
    //  DRAW
    // =====================================================================
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = '#000008';
        ctx.fillRect(0, 0, W, H);

        // Nebulas
        nebulas.forEach(n => {
            const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
            grd.addColorStop(0, n.color.replace(')', `,${n.alpha})`).replace('rgb', 'rgba'));
            grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Stars
        stars.forEach(s => {
            const alpha = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle));
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        if (state === 'START') {
            drawStartScreen();
            return;
        }
        if (state === 'GAME_OVER') {
            drawGameOverScreen();
            return;
        }

        // Shields
        shields.forEach(drawShield);

        // Aliens
        aliens.forEach(a => {
            if (!a.alive) return;
            const ax = a.x + ALIEN_SIZE / 2, ay = a.y + a.wobble + ALIEN_SIZE / 2;
            if (a.row === 0) drawAlienType0(ax, ay, ALIEN_SIZE, ALIEN_COLORS[0], a.frame, a.flashTime);
            else if (a.row <= 2) drawAlienType1(ax, ay, ALIEN_SIZE, ALIEN_COLORS[a.row], a.frame, a.flashTime);
            else drawAlienType2(ax, ay, ALIEN_SIZE, ALIEN_COLORS[a.row], a.frame, a.flashTime);
        });

        // Boss
        if (boss) drawBoss(boss);

        // UFO
        if (ufo) drawUFO(ufo);

        // Power-ups
        powerUps.forEach(drawPowerUp);

        // Bullets
        playerBullets.forEach(b => drawBullet(b, false));
        alienBullets.forEach(b => drawBullet(b, true));

        // Player
        if (!(state === 'GAME_OVER')) {
            const blink = player.shieldTime > 0 && player.shieldTime < 1.5 && Math.floor(stateTimer * 10) % 2 === 0;
            if (!blink) drawPlayer(player.x, player.y, player.shieldTime);
        }

        // Particles
        drawParticles();

        // Wave clear overlay
        if (state === 'WAVE_CLEAR') {
            ctx.save();
            ctx.fillStyle = `rgba(0,0,0,${Math.min(0.55, stateTimer * 0.3)})`;
            ctx.fillRect(0, 0, W, H);
            ctx.font = 'bold 56px Orbitron';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00ff88';
            ctx.fillStyle = '#00ff88';
            ctx.fillText('WAVE CLEAR!', W / 2, H / 2 - 20);
            ctx.font = '22px Share Tech Mono';
            ctx.fillStyle = 'rgba(0,255,136,0.7)';
            ctx.fillText(`WAVE ${wave + 1} INCOMING...`, W / 2, H / 2 + 30);
            ctx.restore();
        }
    }

    function drawStartScreen() {
        // Title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 64px Orbitron';
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#00ff88';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('SPACE', W / 2, 160);
        ctx.fillText('INVADERS', W / 2, 230);

        // Alien preview row
        const previewAliens = [
            { draw: drawAlienType0, color: '#ff6bcd', y: 300 },
            { draw: drawAlienType1, color: '#ffd60a', y: 360 },
            { draw: drawAlienType2, color: '#00ffff', y: 420 }
        ];
        previewAliens.forEach(pa => {
            for (let i = 0; i < 5; i++) {
                pa.draw(120 + i * 100, pa.y, ALIEN_SIZE, pa.color, frameCount % 60 < 30 ? 0 : 1, 0);
            }
        });

        // Instructions
        ctx.font = '20px Share Tech Mono';
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillText('← → to move    SPACE to fire', W / 2, 478);
        ctx.fillText('B to use BOMB power-up', W / 2, 504);

        ctx.font = 'bold 26px Orbitron';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffd60a';
        ctx.fillStyle = Math.sin(stateTimer * 4) > 0 ? '#ffd60a' : '#ffaa00';
        ctx.fillText('PRESS  SPACE  TO  START', W / 2, H - 30);
        ctx.restore();
    }

    function drawGameOverScreen() {
        ctx.save();
        ctx.textAlign = 'center';

        // Darken
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, W, H);

        ctx.font = 'bold 72px Orbitron';
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#ff4444';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('GAME OVER', W / 2, 200);

        ctx.font = '28px Share Tech Mono';
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillText(`SCORE: ${String(score).padStart(6, '0')}`, W / 2, 280);

        if (score >= hiScore) {
            ctx.fillStyle = '#ffd60a';
            ctx.shadowColor = '#ffd60a';
            ctx.fillText('🏆 NEW HIGH SCORE! 🏆', W / 2, 322);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.shadowBlur = 0;
            ctx.fillText(`Hi-Score: ${String(hiScore).padStart(6, '0')}`, W / 2, 322);
        }

        ctx.font = 'bold 22px Orbitron';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
        ctx.fillStyle = Math.sin(stateTimer * 4) > 0 ? '#00ff88' : '#009944';
        ctx.fillText('PRESS  SPACE  TO  RESTART', W / 2, H - 40);
        ctx.restore();
    }

    // =====================================================================
    //  INPUT
    // =====================================================================
    window.addEventListener('keydown', e => {
        keys[e.key] = true;
        if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
        }
        // Start/restart on space
        if (e.key === ' ') handleStartPress();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    function handleStartPress() {
        if (state === 'START') {
            score = 0; lives = 3; wave = 1;
            updateHudNumbers();
            updateLivesUI();
            startWave();
        } else if (state === 'GAME_OVER' && stateTimer > 1.5) {
            score = 0; lives = 3; wave = 1;
            updateHudNumbers();
            updateLivesUI();
            startWave();
        }
    }

    // Touch buttons
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnFire = document.getElementById('btn-fire');

    ['touchstart', 'mousedown'].forEach(ev => {
        btnLeft.addEventListener(ev, e => { touchLeft = true; e.preventDefault(); handleStartPress(); }, { passive: false });
        btnRight.addEventListener(ev, e => { touchRight = true; e.preventDefault(); handleStartPress(); }, { passive: false });
        btnFire.addEventListener(ev, e => { touchFire = true; e.preventDefault(); handleStartPress(); }, { passive: false });
    });
    ['touchend', 'mouseup'].forEach(ev => {
        btnLeft.addEventListener(ev, () => touchLeft = false);
        btnRight.addEventListener(ev, () => touchRight = false);
        btnFire.addEventListener(ev, () => touchFire = false);
    });

    // =====================================================================
    //  GAME LOOP
    // =====================================================================
    function loop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
})();
