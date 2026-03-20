const TOWER_THEMES = {
  cats: { label: "Cats", accent: "#ff9b5c", secondary: "#ffd971", tertiary: "#f7f9ff", skyTop: "#9ae7f3", skyBottom: "#d6fff6", ground: "#6c4d39", silhouette: "cat", idleBob: 1.1, squish: 1, milestone: "Climbing Cat Tower", pieces: [{ w: 110, h: 68, shape: "tall", color: "#f59f61", belly: "#ffe3b8", face: "smile", ears: true, accessory: "cat_tail" }, { w: 182, h: 50, shape: "longcat", color: "#7f8da6", belly: "#eef3ff", face: "sleepy", ears: true, accessory: "whiskers" }, { w: 128, h: 62, shape: "fluff", color: "#c17853", belly: "#f8d7be", face: "grin", ears: true, accessory: "stripes" }] },
  dogs: { label: "Dogs", accent: "#ff8c67", secondary: "#6ec5ff", tertiary: "#f6ede2", skyTop: "#a8d7ff", skyBottom: "#eefbff", ground: "#735440", silhouette: "dog", idleBob: 1.24, squish: 1.18, milestone: "Puppy Pile Rising", pieces: [{ w: 186, h: 50, shape: "dog_long", color: "#d28f57", belly: "#f7ddb5", face: "happy", ears: true, accessory: "wag_tail" }, { w: 132, h: 70, shape: "dog_round", color: "#f2c16f", belly: "#fff0ca", face: "wide", ears: true, accessory: "tongue" }, { w: 146, h: 66, shape: "dog_chunky", color: "#f5f1e8", belly: "#fff8f2", face: "smile", ears: true, accessory: "collar" }] },
  ducks: { label: "Ducks", accent: "#ffd34f", secondary: "#59d8d2", tertiary: "#fff4ba", skyTop: "#8ce0ff", skyBottom: "#edfff5", ground: "#7d5f3f", silhouette: "duck", idleBob: 0.95, squish: 0.92, milestone: "Duck Stack Parade", pieces: [{ w: 138, h: 70, shape: "duck_round", color: "#ffd65c", belly: "#fff2b0", face: "wide", ears: false, accessory: "duck_beak" }, { w: 114, h: 58, shape: "duck_small", color: "#ffe27f", belly: "#fff6c7", face: "happy", ears: false, accessory: "duck_beak" }, { w: 160, h: 60, shape: "duck_float", color: "#ffcb43", belly: "#fff0a8", face: "grin", ears: false, accessory: "floatie" }] },
  pandas: { label: "Pandas", accent: "#9fd3ff", secondary: "#9af0a9", tertiary: "#f8fbff", skyTop: "#b9ddff", skyBottom: "#f7fdff", ground: "#505564", silhouette: "panda", idleBob: 0.82, squish: 1.34, milestone: "Panda Peak", pieces: [{ w: 126, h: 74, shape: "panda_round", color: "#f8fafc", belly: "#ffffff", face: "wide", ears: true, accessory: "panda_patch" }, { w: 150, h: 64, shape: "panda_roll", color: "#eef2f7", belly: "#ffffff", face: "grin", ears: true, accessory: "panda_patch" }, { w: 176, h: 54, shape: "panda_loaf", color: "#f3f6fb", belly: "#ffffff", face: "sleepy", ears: true, accessory: "bamboo" }] }
};

class TowerStackerGame {
  constructor() {
    this.canvas = document.getElementById("towerCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.themeButtons = Array.from(document.querySelectorAll("[data-theme]"));
    this.dropBtn = document.getElementById("dropBtn");
    this.restartBtn = document.getElementById("restartBtn");
    this.heightScoreEl = document.getElementById("stackerScore");
    this.perfectScoreEl = document.getElementById("stackerPerfectScore");
    this.statsEl = document.getElementById("stackerStats");
    this.statusEl = document.getElementById("stackerStatus");
    this.bannerEl = document.getElementById("stackerBanner");
    this.bestEl = document.getElementById("stackerBest");
    this.activeTheme = "cats";
    this.cameraTop = 0;
    this.lastTime = performance.now();
    this.bind();
    this.reset();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  bind() {
    this.themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.activeTheme = button.dataset.theme || "cats";
        this.reset();
      });
    });
    this.dropBtn.addEventListener("click", () => this.dropPiece());
    this.restartBtn.addEventListener("click", () => this.reset());
    this.canvas.addEventListener("click", () => this.dropPiece());
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        this.dropPiece();
      }
    });
  }

  currentTheme() {
    return TOWER_THEMES[this.activeTheme] || TOWER_THEMES.cats;
  }

  reset() {
    this.settled = [];
    this.falling = [];
    this.activePiece = null;
    this.height = 0;
    this.heightScore = 0;
    this.perfectLandingScore = 0;
    this.pieces = 0;
    this.perfect = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.bestHeightScore = 0;
    this.collapsed = false;
    this.goalFlash = 0;
    this.cameraTop = 0;
    this.lastEvent = null;
    this.syncThemeButtons();
    this.spawnPiece();
    this.updateHud("Press Space, click Drop, or tap the stage.");
  }

  syncThemeButtons() {
    this.themeButtons.forEach((button) => button.classList.toggle("selected", button.dataset.theme === this.activeTheme));
  }

  groundWorldY() {
    return 92;
  }

  makePiece() {
    const theme = this.currentTheme();
    const variant = theme.pieces[Math.floor(Math.random() * theme.pieces.length)];
    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      theme: this.activeTheme,
      shape: variant.shape,
      color: variant.color,
      belly: variant.belly,
      face: variant.face,
      ears: variant.ears,
      accessory: variant.accessory,
      x: 50,
      y: Math.max(18, this.groundWorldY() - this.height - 18),
      w: (variant.w / this.canvas.width) * 100,
      h: (variant.h / this.canvas.height) * 100 * 1.6,
      vx: 0,
      vy: 0,
      slide: 0,
      angle: 0,
      wobble: 0,
      dropped: false,
      blinkSeed: Math.random(),
      perfect: false,
      spawnedAt: performance.now()
    };
  }

  spawnPiece() {
    if (this.collapsed) {
      this.activePiece = null;
      return;
    }
    this.activePiece = this.makePiece();
  }

  dropPiece() {
    if (!this.activePiece || this.activePiece.dropped || this.collapsed) {
      return;
    }
    this.activePiece.dropped = true;
    this.activePiece.vy = 0.7;
    this.activePiece.vx = Math.sin(performance.now() * 0.004) * 0.12;
    this.bannerEl.textContent = "";
  }

  pieceBounds(piece) {
    return {
      left: piece.x - piece.w / 2,
      right: piece.x + piece.w / 2,
      top: piece.y - piece.h / 2,
      bottom: piece.y + piece.h / 2
    };
  }

  supportFor(piece, pool) {
    const bounds = this.pieceBounds(piece);
    let best = null;
    for (const candidate of pool) {
      const cb = this.pieceBounds(candidate);
      const overlap = Math.max(0, Math.min(bounds.right, cb.right) - Math.max(bounds.left, cb.left));
      if (overlap <= 0) continue;
      if (cb.top >= bounds.bottom - 4) {
        if (!best || cb.top < best.top) {
          best = { piece: candidate, overlap, top: cb.top };
        }
      }
    }
    return best;
  }

  towerHeight() {
    if (this.settled.length === 0) return 0;
    const top = Math.min(...this.settled.map((piece) => this.pieceBounds(piece).top));
    return Math.max(0, this.groundWorldY() - top);
  }

  heightScoreForState() {
    return Math.round(this.height * 24 + this.pieces * 16);
  }

  perfectPoints(precision, overlap, wobble) {
    return Math.max(0, Math.round(precision * 80 + overlap * 50 - Math.min(1, wobble / 18) * 18));
  }

  cameraTargetTop() {
    const rows = []
      .concat(this.settled)
      .concat(this.falling)
      .concat(this.activePiece ? [this.activePiece] : []);
    if (rows.length === 0) return 0;
    const highestTop = rows.reduce((min, piece) => Math.min(min, this.pieceBounds(piece).top), this.groundWorldY());
    return Math.min(0, highestTop - 24);
  }

  toCanvasX(value) {
    return (value / 100) * this.canvas.width;
  }

  toCanvasY(value) {
    return ((value - this.cameraTop) / 100) * this.canvas.height;
  }

  update(dt, now) {
    this.goalFlash = Math.max(0, this.goalFlash - dt * 0.8);
    this.cameraTop += (this.cameraTargetTop() - this.cameraTop) * 0.08;

    if (this.activePiece && !this.activePiece.dropped) {
      const theme = this.currentTheme();
      const amplitude = Math.max(11, 22 - this.pieces * 0.4);
      this.activePiece.x = 50 + Math.sin((now - this.activePiece.spawnedAt) * 0.0018) * amplitude;
      this.activePiece.y = Math.max(18, this.groundWorldY() - this.height - 18 + Math.sin((now - this.activePiece.spawnedAt) * 0.004 * theme.idleBob) * 1.6);
      this.activePiece.angle = Math.sin((now - this.activePiece.spawnedAt) * 0.0038) * 0.05;
    }

    if (this.activePiece && this.activePiece.dropped) {
      this.activePiece.vy += 0.09;
      this.activePiece.y += this.activePiece.vy * dt * 60;
      this.activePiece.x += this.activePiece.vx * dt * 60;
      this.activePiece.angle += this.activePiece.vx * 0.12;

      let targetY = this.groundWorldY() - this.activePiece.h / 2;
      let support = null;
      let overlapRatio = 1;
      const match = this.supportFor(this.activePiece, this.settled);
      if (match) {
        support = match.piece;
        targetY = match.top - this.activePiece.h / 2;
        overlapRatio = Math.min(1, match.overlap / Math.max(1, this.activePiece.w));
      }

      if (this.pieceBounds(this.activePiece).bottom >= targetY) {
        this.activePiece.y = targetY;
        const centerDelta = support ? Math.abs(this.activePiece.x - support.x) : Math.abs(this.activePiece.x - 50);
        const centerAllowance = support ? Math.max(1.8, support.w * 0.08) : 2.2;
        const precision = Math.max(0, 1 - centerDelta / Math.max(centerAllowance * 3, 1));
        this.activePiece.perfect = centerDelta <= centerAllowance && overlapRatio >= 0.9;
        this.activePiece.wobble = (1 - overlapRatio) * 16;
        this.activePiece.slide = support && overlapRatio < 0.56
          ? Math.sign(this.activePiece.x - support.x || (Math.random() > 0.5 ? 1 : -1)) * (0.12 + (0.56 - overlapRatio) * 0.24)
          : 0;
        this.settled.push(this.activePiece);
        this.pieces += 1;
        this.combo = this.activePiece.perfect ? this.combo + 1 : 0;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        if (this.activePiece.perfect) this.perfect += 1;
        const perfectPoints = this.perfectPoints(precision, overlapRatio, this.activePiece.wobble);
        this.perfectLandingScore += perfectPoints;
        this.activePiece = null;
        const prevHeight = this.height;
        this.height = this.towerHeight();
        this.heightScore = this.heightScoreForState();
        this.bestHeightScore = Math.max(this.bestHeightScore, this.heightScore);
        this.lastEvent = {
          type: this.settled[this.settled.length - 1].perfect ? "perfect_drop" : precision >= 0.74 && overlapRatio >= 0.76 ? "great_drop" : overlapRatio >= 0.62 ? "stable_stack" : "drop_landed",
          perfectPoints,
          isHeightRecord: this.height > prevHeight + 0.4
        };
        this.bannerEl.textContent =
          this.lastEvent.type === "perfect_drop" ? "Perfect!" :
            this.lastEvent.type === "great_drop" ? "Great Drop" :
              this.lastEvent.type === "stable_stack" ? "Stable Stack" : "";
        this.spawnPiece();
        this.updateHud(
          this.lastEvent.type === "perfect_drop" ? "Perfect landing. That one was centered and calm." :
            this.lastEvent.type === "great_drop" ? "Great drop. Clean contact and low wobble." :
              this.lastEvent.type === "stable_stack" ? "Stable stack. Keep climbing." : "Nice landing."
        );
      }
    }

    const standing = [];
    const newlyFalling = [];
    for (const piece of this.settled) {
      piece.x += piece.slide * dt * 60;
      piece.slide *= 0.82;
      const support = this.supportFor(piece, standing);
      if (standing.length > 0 && !support) {
        newlyFalling.push(piece);
        continue;
      }
      if (support) {
        const overlapRatio = Math.min(1, support.overlap / Math.max(1, piece.w));
        piece.wobble = (1 - overlapRatio) * 14 + Math.abs(piece.slide) * 18;
        if (overlapRatio < 0.48) {
          piece.slide += Math.sign(piece.x - support.piece.x || (Math.random() > 0.5 ? 1 : -1)) * (0.04 + (0.48 - overlapRatio) * 0.08);
        }
      }
      standing.push(piece);
    }
    this.settled = standing;

    for (const piece of newlyFalling) {
      piece.vy = 0.14;
      piece.vx = piece.slide || (Math.random() > 0.5 ? 0.18 : -0.18);
      this.falling.push(piece);
    }

    this.falling = this.falling.filter((piece) => {
      piece.vy += 0.06;
      piece.y += piece.vy * dt * 60;
      piece.x += piece.vx * dt * 60;
      piece.angle += piece.vx * 0.9;
      return piece.y < this.groundWorldY() + 70;
    });

    if (newlyFalling.length > 0) {
      this.goalFlash = 1;
      this.combo = 0;
      this.height = this.towerHeight();
      this.heightScore = this.heightScoreForState();
      this.lastEvent = { type: "tower_wobble", isHeightRecord: false };
      this.updateHud("Oops! A few pieces slipped off the tower.");
    }

    if (this.falling.length >= 3 && !this.collapsed) {
      this.collapsed = true;
      this.activePiece = null;
      this.bannerEl.textContent = "Oops!";
      this.lastEvent = { type: "tower_collapse", isHeightRecord: false };
      this.updateHud("Tower collapsed. Restart and build another one.");
    }
  }

  updateHud(message) {
    this.heightScoreEl.textContent = `Height Score ${this.heightScore}`;
    this.perfectScoreEl.textContent = `Perfect Landings ${this.perfectLandingScore}`;
    this.statsEl.textContent = `${this.pieces} stacked | Height ${Math.round(this.height)} | Best combo ${this.bestCombo}`;
    this.bestEl.textContent = `Best Height Score ${this.bestHeightScore}`;
    this.statusEl.textContent = message;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawPiece(piece) {
    const ctx = this.ctx;
    const theme = this.currentTheme().label.toLowerCase() === piece.theme ? this.currentTheme() : TOWER_THEMES[piece.theme] || TOWER_THEMES.cats;
    const style = theme;
    const width = (piece.w / 100) * this.canvas.width * 2.6;
    const height = (piece.h / 100) * this.canvas.height * 1.6;
    const centerX = this.toCanvasX(piece.x);
    const centerY = this.toCanvasY(piece.y);
    const motionSeed = performance.now() * 0.01 + piece.blinkSeed * 13;
    const wobble = piece.wobble * 0.007 * Math.sin(motionSeed);
    const angle = piece.angle + wobble;
    const blinkOpen = Math.sin(performance.now() * 0.0025 + piece.blinkSeed * 4) > -0.95;
    const verticalSquish = 1 - Math.min(0.12, piece.wobble * 0.006 * style.squish);
    const horizontalStretch = 1 + Math.min(0.14, piece.wobble * 0.007 * style.squish);
    const gentleBob = !piece.dropped ? Math.sin(motionSeed * style.idleBob * 0.4) * 3 : 0;

    ctx.save();
    ctx.translate(centerX, centerY + gentleBob);
    ctx.rotate(angle);
    ctx.scale(horizontalStretch, verticalSquish);
    ctx.fillStyle = piece.color;

    if (style.silhouette === "duck" || String(piece.shape).startsWith("duck")) {
      ctx.beginPath();
      ctx.ellipse(0, 4, width * 0.38, height * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-width * 0.06, -height * 0.12, width * 0.22, height * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (style.silhouette === "panda" || String(piece.shape).startsWith("panda")) {
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.4, height * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (style.silhouette === "dog" || String(piece.shape).startsWith("dog")) {
      if (String(piece.shape).includes("long")) {
        this.roundRect(ctx, -width / 2, -height * 0.34, width, height * 0.68, Math.min(height / 2, 22));
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, width * 0.42, height * 0.34, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (piece.shape === "fluff") {
      ctx.beginPath();
      ctx.arc(-width * 0.22, 0, height * 0.34, 0, Math.PI * 2);
      ctx.arc(0, -height * 0.08, height * 0.42, 0, Math.PI * 2);
      ctx.arc(width * 0.24, 0, height * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      this.roundRect(ctx, -width / 2, -height / 2, width, height, Math.min(24, height * 0.32));
      ctx.fill();
    }

    ctx.fillStyle = piece.belly;
    if (style.silhouette === "duck") {
      ctx.beginPath();
      ctx.ellipse(-width * 0.05, height * 0.1, width * 0.18, height * 0.14, 0, 0, Math.PI * 2);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, height * 0.1, width * 0.24, height * 0.2, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    if (style.silhouette === "dog") {
      ctx.fillStyle = piece.color;
      ctx.beginPath();
      ctx.ellipse(-width * 0.24, -height * 0.1, width * 0.1, height * 0.22, -0.45, 0, Math.PI * 2);
      ctx.ellipse(width * 0.24, -height * 0.1, width * 0.1, height * 0.22, 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (style.silhouette === "duck") {
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.ellipse(-width * 0.23, height * 0.02, width * 0.11, height * 0.16, -0.4, 0, Math.PI * 2);
      ctx.ellipse(width * 0.23, height * 0.02, width * 0.11, height * 0.16, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (piece.ears) {
      ctx.fillStyle = piece.color;
      ctx.beginPath();
      ctx.moveTo(-width * 0.22, -height * 0.28);
      ctx.lineTo(-width * 0.08, -height * 0.62);
      ctx.lineTo(0, -height * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width * 0.22, -height * 0.28);
      ctx.lineTo(width * 0.08, -height * 0.62);
      ctx.lineTo(0, -height * 0.24);
      ctx.closePath();
      ctx.fill();
    }

    if (style.silhouette === "panda") {
      ctx.fillStyle = "#24344c";
      ctx.beginPath();
      ctx.ellipse(-width * 0.19, -height * 0.12, width * 0.12, height * 0.14, 0, 0, Math.PI * 2);
      ctx.ellipse(width * 0.19, -height * 0.12, width * 0.12, height * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#24344c";
    if (blinkOpen) {
      ctx.beginPath();
      ctx.arc(-width * 0.14, -height * 0.05, Math.max(2.4, width * 0.035), 0, Math.PI * 2);
      ctx.arc(width * 0.14, -height * 0.05, Math.max(2.4, width * 0.035), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(-width * 0.2, -height * 0.05);
      ctx.lineTo(-width * 0.08, -height * 0.05);
      ctx.moveTo(width * 0.08, -height * 0.05);
      ctx.lineTo(width * 0.2, -height * 0.05);
      ctx.strokeStyle = "#24344c";
      ctx.stroke();
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#24344c";
    ctx.beginPath();
    ctx.moveTo(-width * 0.1, height * 0.12);
    ctx.quadraticCurveTo(0, height * 0.2, width * 0.1, height * 0.12);
    ctx.stroke();

    if (piece.accessory === "duck_beak") {
      ctx.fillStyle = "#ff9855";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.02);
      ctx.lineTo(width * 0.12, height * 0.08);
      ctx.lineTo(0, height * 0.14);
      ctx.closePath();
      ctx.fill();
    }
    if (piece.accessory === "floatie") {
      ctx.strokeStyle = style.secondary;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, height * 0.14, Math.max(8, height * 0.18), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (piece.accessory === "collar") {
      ctx.fillStyle = style.secondary;
      ctx.fillRect(-width * 0.22, height * 0.02, width * 0.44, Math.max(4, height * 0.07));
    }
    if (piece.accessory === "cat_tail" || piece.accessory === "wag_tail") {
      ctx.strokeStyle = piece.color;
      ctx.lineWidth = Math.max(5, width * 0.045);
      ctx.beginPath();
      ctx.moveTo(width * 0.34, height * 0.08);
      ctx.quadraticCurveTo(width * 0.52, -height * 0.05, width * 0.44, -height * 0.34);
      ctx.stroke();
    }
    if (piece.accessory === "panda_patch") {
      ctx.fillStyle = "rgba(36, 52, 76, 0.92)";
      ctx.beginPath();
      ctx.ellipse(-width * 0.12, -height * 0.04, width * 0.09, height * 0.12, 0, 0, Math.PI * 2);
      ctx.ellipse(width * 0.12, -height * 0.04, width * 0.09, height * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (piece.perfect) {
      ctx.strokeStyle = "rgba(255, 226, 128, 0.9)";
      ctx.lineWidth = 3;
      this.roundRect(ctx, -width / 2 - 3, -height / 2 - 3, width + 6, height + 6, Math.min(24, height * 0.34));
      ctx.stroke();
    }

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const theme = this.currentTheme();
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(1, theme.skyBottom);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const band = Math.floor(this.height / 30);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 10; i += 1) {
      const cloudX = ((i * 93) + 40) % this.canvas.width;
      const cloudY = this.toCanvasY(18 + band * 6 + (i % 4) * 6);
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 10 + (i % 3) * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (band >= 1) {
      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? "rgba(255, 239, 170, 0.75)" : "rgba(255,255,255,0.65)";
        ctx.beginPath();
        ctx.arc(((i * 137) + 90) % this.canvas.width, this.toCanvasY(-18 - i * 6), 4 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (band >= 2) {
      for (let i = 0; i < 5; i += 1) {
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 163, 123, 0.55)" : "rgba(89, 216, 210, 0.55)";
        ctx.lineWidth = 2;
        const x = ((i * 171) + 110) % this.canvas.width;
        const y = this.toCanvasY(-42 - i * 10);
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 16, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + 16);
        ctx.lineTo(x - 2, y + 38);
        ctx.stroke();
      }
    }

    const groundY = this.toCanvasY(this.groundWorldY());
    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, groundY, this.canvas.width, this.canvas.height - groundY);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(0, groundY, this.canvas.width, 6);

    if (this.goalFlash > 0) {
      ctx.fillStyle = `rgba(255, 245, 177, ${this.goalFlash * 0.22})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.settled.forEach((piece) => this.drawPiece(piece));
    this.falling.forEach((piece) => this.drawPiece(piece));
    if (this.activePiece) {
      this.drawPiece(this.activePiece);
      if (!this.activePiece.dropped) {
        ctx.strokeStyle = "rgba(36,52,76,0.14)";
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.toCanvasX(this.activePiece.x), this.toCanvasY(this.activePiece.y));
        ctx.lineTo(this.toCanvasX(this.activePiece.x), groundY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.fillStyle = "rgba(36,52,76,0.74)";
    ctx.font = "900 22px Orbitron";
    ctx.fillText("Tower Stacker", 24, 34);
    ctx.font = "700 16px Baloo 2";
    ctx.fillText(theme.milestone, 24, 58);
    ctx.fillText(`Height Score ${this.heightScore}`, this.canvas.width - 212, 30);
    ctx.fillText(`Perfect Landings ${this.perfectLandingScore}`, this.canvas.width - 250, 52);

    if (["perfect_drop", "great_drop", "stable_stack"].includes(String(this.lastEvent?.type || "")) && (performance.now() % 900) < 540) {
      ctx.fillStyle = "#fff7b5";
      ctx.font = "900 30px Orbitron";
      const label = this.lastEvent.type === "perfect_drop" ? "Perfect!" : this.lastEvent.type === "great_drop" ? "Great Drop" : "Stable Stack";
      ctx.fillText(label, this.canvas.width - 220, 86);
    }
    if (this.lastEvent?.isHeightRecord === true && (performance.now() % 1200) < 700) {
      ctx.fillStyle = "#fff7b5";
      ctx.font = "900 22px Orbitron";
      ctx.fillText("New Height Record", this.canvas.width - 248, 114);
    }
    if (this.collapsed) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(this.canvas.width / 2 - 190, 90, 380, 96);
      ctx.fillStyle = "#28415b";
      ctx.font = "900 34px Orbitron";
      ctx.fillText("Oops! Tower Down", this.canvas.width / 2 - 146, 132);
      ctx.font = "700 18px Baloo 2";
      ctx.fillText("Press Restart and build another one.", this.canvas.width / 2 - 126, 160);
    }
  }

  loop(now) {
    const dt = Math.min(0.024, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    this.update(dt, now);
    this.render();
    requestAnimationFrame(this.loop);
  }
}

window.addEventListener("load", () => {
  new TowerStackerGame();
});
