const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gameList = document.getElementById("gameList");
const restartBtn = document.getElementById("restartBtn");
const randomBtn = document.getElementById("randomBtn");
const suiteGameName = document.getElementById("suiteGameName");
const suiteGameDesc = document.getElementById("suiteGameDesc");
const suiteControls = document.getElementById("suiteControls");
const suiteScoreValue = document.getElementById("suiteScoreValue");
const suiteScoreCopy = document.getElementById("suiteScoreCopy");
const stageTitle = document.getElementById("stageTitle");
const stageHelp = document.getElementById("stageHelp");
const statusBanner = document.getElementById("statusBanner");
const footerNote = document.getElementById("footerNote");
const suiteExtras = document.getElementById("suiteExtras");
const suiteExtrasTitle = document.getElementById("suiteExtrasTitle");
const suiteExtrasBody = document.getElementById("suiteExtrasBody");
const embeddedStage = document.getElementById("embeddedStage");

const W = canvas.width;
const H = canvas.height;
const params = new URLSearchParams(window.location.search);

const input = {
  keys: new Set(),
  pointer: { x: W / 2, y: H / 2, down: false, inside: false }
};

const keyToDir = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right"
};

let currentId = "";
let currentGame = null;
let currentState = null;

function loadSprite(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectOverlap(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  return distance(circle.x, circle.y, closestX, closestY) <= circle.r;
}

function drawRoundedRect(x, y, w, h, radius, fillStyle, strokeStyle) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

function drawBackground(topColor, bottomColor, time, accentColor) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  if (accentColor) {
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.13;
    ctx.beginPath();
    ctx.arc(W * 0.18, H * 0.16, 210, 0, Math.PI * 2);
    ctx.arc(W * 0.8, H * 0.22, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (let i = 0; i < 24; i += 1) {
    const x = ((i * 79) % W) + Math.sin(time * 0.35 + i) * 18;
    const y = ((i * 47) % H) + Math.cos(time * 0.2 + i) * 10;
    const size = 1.5 + (i % 3);
    ctx.fillRect(x, y, size, size);
  }
}

function drawLabel(text, x, y, size, color, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px Orbitron, monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safe / 60);
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function mouseToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H
  };
}

function drawSprite(image, x, y, w, h, options = {}) {
  if (!image || !image.complete || !image.naturalWidth) {
    return;
  }

  const {
    sx = 0,
    sy = 0,
    sw = image.width,
    sh = image.height,
    flip = false,
    alpha = 1
  } = options;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  }
  ctx.restore();
}

function drawCircularSprite(image, cx, cy, radius, options = {}) {
  if (!image || !image.complete || !image.naturalWidth) {
    return false;
  }

  const { alpha = 1, strokeStyle = null, lineWidth = 0 } = options;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceSize = Math.min(sourceWidth, sourceHeight);
  const sx = (sourceWidth - sourceSize) / 2;
  const sy = (sourceHeight - sourceSize) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, sx, sy, sourceSize, sourceSize, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();

  if (strokeStyle && lineWidth > 0) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  return true;
}

function drawTintedSprite(image, x, y, w, h, tint, options = {}) {
  if (!image || !image.complete || !image.naturalWidth) {
    return;
  }

  drawSprite(image, x, y, w, h, options);
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = tint;
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawRotatedSprite(image, cx, cy, w, h, options = {}) {
  if (!image || !image.complete || !image.naturalWidth) {
    return;
  }

  const {
    sx = 0,
    sy = 0,
    sw = image.width,
    sh = image.height,
    angle = 0,
    alpha = 1
  } = options;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawRotatedTintedSprite(image, cx, cy, w, h, tint, options = {}) {
  if (!image || !image.complete || !image.naturalWidth) {
    return;
  }

  const {
    sx = 0,
    sy = 0,
    sw = image.width,
    sh = image.height,
    angle = 0,
    alpha = 1,
    tintAlpha = 0.8
  } = options;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = tintAlpha;
  ctx.fillStyle = tint;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function resetCurrentGame() {
  if (!currentGame) {
    return;
  }
  currentState = currentGame.createState();
  renderExtras();
  syncStageCopy();
  syncStageSurface(isEmbeddedGame(currentGame));
  syncCanvasCursor();
}

function isEmbeddedGame(game = currentGame) {
  return Boolean(game && game.embedUrl);
}

function buildEmbeddedUrl(url, bustCache = false) {
  if (!url || !bustCache) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}suiteReload=${Date.now()}`;
}

function syncStageSurface(forceReload = false) {
  if (!embeddedStage) {
    return;
  }

  if (isEmbeddedGame()) {
    const nextBaseUrl = currentGame.embedUrl;
    const nextSrc = buildEmbeddedUrl(nextBaseUrl, forceReload);
    canvas.hidden = true;
    embeddedStage.hidden = false;
    if (forceReload || embeddedStage.dataset.baseSrc !== nextBaseUrl) {
      embeddedStage.src = nextSrc;
      embeddedStage.dataset.baseSrc = nextBaseUrl;
    }
    return;
  }

  canvas.hidden = false;
  embeddedStage.hidden = true;
  if (embeddedStage.dataset.baseSrc) {
    embeddedStage.removeAttribute("src");
    embeddedStage.dataset.baseSrc = "";
  }
}

if (embeddedStage) {
  embeddedStage.addEventListener("load", () => {
    if (!isEmbeddedGame() || !currentState) {
      return;
    }
    currentState.status = `${currentGame.name} ready`;
    updateHud();
  });

  embeddedStage.addEventListener("error", () => {
    if (!isEmbeddedGame() || !currentState) {
      return;
    }
    currentState.status = `Could not load ${currentGame.name}`;
    updateHud();
  });
}

function spawnPongBall(direction) {
  return {
    x: W / 2,
    y: H / 2,
    vx: direction * rand(360, 430),
    vy: rand(-220, 220),
    r: 16,
    lastTouch: null
  };
}

const pongPowerThemes = [
  { id: "nova", prefix: "Nova", color: "#60a5fa", glow: "#dbeafe" },
  { id: "candy", prefix: "Candy", color: "#fb7185", glow: "#ffe4e6" },
  { id: "jungle", prefix: "Jungle", color: "#22c55e", glow: "#dcfce7" },
  { id: "solar", prefix: "Solar", color: "#f59e0b", glow: "#fef3c7" },
  { id: "frost", prefix: "Frost", color: "#38bdf8", glow: "#e0f2fe" },
  { id: "pixel", prefix: "Pixel", color: "#a78bfa", glow: "#ede9fe" },
  { id: "meteor", prefix: "Meteor", color: "#f97316", glow: "#ffedd5" },
  { id: "prism", prefix: "Prism", color: "#2dd4bf", glow: "#ccfbf1" },
  { id: "disco", prefix: "Disco", color: "#e879f9", glow: "#fae8ff" },
  { id: "storm", prefix: "Storm", color: "#94a3b8", glow: "#e2e8f0" }
];

const pongPowerFamilies = [
  { id: "titan", label: "Titan Paddle", symbol: "T" },
  { id: "pinch", label: "Pinch Rival", symbol: "P" },
  { id: "dash", label: "Dash Drive", symbol: "D" },
  { id: "jam", label: "Jam Rival", symbol: "J" },
  { id: "magnet", label: "Magnet Grip", symbol: "M" },
  { id: "shield", label: "Goal Shield", symbol: "S" },
  { id: "jackpot", label: "Jackpot Goal", symbol: "J2" },
  { id: "rocket", label: "Rocket Ball", symbol: "R" },
  { id: "mist", label: "Mist Slow", symbol: "SL" },
  { id: "curve", label: "Curve Spin", symbol: "C" }
];

const pongPowerCatalog = pongPowerFamilies.flatMap((family) =>
  pongPowerThemes.map((theme, index) => ({
    id: `${theme.id}-${family.id}`,
    familyId: family.id,
    label: `${theme.prefix} ${family.label}`,
    tier: index + 1,
    color: theme.color,
    glow: theme.glow,
    symbol: family.symbol
  }))
);

function otherPongSide(side) {
  return side === "player" ? "cpu" : "player";
}

function pongSideName(side) {
  return side === "player" ? "Player" : "CPU";
}

function createPongModifiers() {
  return {
    player: { paddleScale: 1, speedMul: 1, magnet: 0 },
    cpu: { paddleScale: 1, speedMul: 1, magnet: 0 },
    ball: { speedMul: 1, spin: 0 }
  };
}

function clampBallVelocity(ball) {
  ball.vx = clamp(ball.vx, -860, 860);
  ball.vy = clamp(ball.vy, -720, 720);
}

function addPongEffect(state, effect) {
  state.effects.push({ ...effect, timer: effect.duration });
}

function recalcPongModifiers(state, dt) {
  state.effects = state.effects
    .map((effect) => ({ ...effect, timer: effect.timer - dt }))
    .filter((effect) => effect.timer > 0);

  const modifiers = createPongModifiers();
  for (const effect of state.effects) {
    if (effect.target === "ball") {
      if (effect.kind === "speedMul") {
        modifiers.ball.speedMul += effect.amount;
      } else if (effect.kind === "spin") {
        modifiers.ball.spin += effect.amount;
      }
      continue;
    }

    const sideMods = modifiers[effect.target];
    if (effect.kind === "paddleScale") {
      sideMods.paddleScale += effect.amount;
    } else if (effect.kind === "speedMul") {
      sideMods.speedMul += effect.amount;
    } else if (effect.kind === "magnet") {
      sideMods.magnet += effect.amount;
    }
  }

  modifiers.player.paddleScale = clamp(modifiers.player.paddleScale, 0.58, 1.6);
  modifiers.cpu.paddleScale = clamp(modifiers.cpu.paddleScale, 0.58, 1.6);
  modifiers.player.speedMul = clamp(modifiers.player.speedMul, 0.45, 1.9);
  modifiers.cpu.speedMul = clamp(modifiers.cpu.speedMul, 0.45, 1.9);
  modifiers.player.magnet = clamp(modifiers.player.magnet, 0, 0.8);
  modifiers.cpu.magnet = clamp(modifiers.cpu.magnet, 0, 0.8);
  modifiers.ball.speedMul = clamp(modifiers.ball.speedMul, 0.55, 1.85);
  modifiers.ball.spin = clamp(modifiers.ball.spin, -180, 180);
  state.modifiers = modifiers;
}

function getPongArena() {
  return { x: 34, y: 20, w: W - 68, h: H - 40 };
}

function getPongPaddle(state, side) {
  const arena = getPongArena();
  const mods = state.modifiers[side];
  const height = clamp(156 * mods.paddleScale, 94, 248);
  const width = clamp(22 + (mods.paddleScale - 1) * 16, 18, 36);
  const x = side === "player" ? arena.x + 22 : arena.x + arena.w - 22 - width;
  const y = side === "player" ? state.playerY : state.cpuY;
  return { x, y, w: width, h: height };
}

function spawnPongPickup(state) {
  const arena = getPongArena();
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const candidate = {
      x: rand(arena.x + 170, arena.x + arena.w - 170),
      y: rand(arena.y + 90, arena.y + arena.h - 90),
      radius: 24,
      pulse: rand(0, Math.PI * 2),
      power: pick(pongPowerCatalog)
    };
    const spaced = state.pickups.every((pickup) => distance(candidate.x, candidate.y, pickup.x, pickup.y) > 120);
    if (spaced) {
      return candidate;
    }
  }

  return {
    x: W / 2 + rand(-120, 120),
    y: H / 2 + rand(-110, 110),
    radius: 24,
    pulse: rand(0, Math.PI * 2),
    power: pick(pongPowerCatalog)
  };
}

function logPongPower(state, text, color) {
  state.recentPowers.unshift({ text, color, timer: 5 });
  state.recentPowers = state.recentPowers.slice(0, 4);
}

function applyPongPower(state, owner, power) {
  const rival = otherPongSide(owner);
  const tier = power.tier;
  let message = `${pongSideName(owner)} claimed ${power.label}`;

  if (power.familyId === "titan") {
    addPongEffect(state, {
      target: owner,
      kind: "paddleScale",
      amount: 0.1 + tier * 0.02,
      duration: 5.4 + tier * 0.28
    });
  } else if (power.familyId === "pinch") {
    addPongEffect(state, {
      target: rival,
      kind: "paddleScale",
      amount: -(0.06 + tier * 0.012),
      duration: 4.8 + tier * 0.25
    });
  } else if (power.familyId === "dash") {
    addPongEffect(state, {
      target: owner,
      kind: "speedMul",
      amount: 0.1 + tier * 0.022,
      duration: 5 + tier * 0.24
    });
  } else if (power.familyId === "jam") {
    addPongEffect(state, {
      target: rival,
      kind: "speedMul",
      amount: -(0.08 + tier * 0.018),
      duration: 4.4 + tier * 0.24
    });
  } else if (power.familyId === "magnet") {
    addPongEffect(state, {
      target: owner,
      kind: "magnet",
      amount: 0.12 + tier * 0.03,
      duration: 4.5 + tier * 0.26
    });
  } else if (power.familyId === "shield") {
    state.shields[owner] = clamp(state.shields[owner] + (tier >= 8 ? 2 : 1), 0, 4);
    message = `${pongSideName(owner)} armed ${state.shields[owner]} shield${state.shields[owner] > 1 ? "s" : ""}`;
  } else if (power.familyId === "jackpot") {
    state.scoreBoost[owner] = Math.max(state.scoreBoost[owner], tier >= 9 ? 3 : 2);
    message = `${pongSideName(owner)} primed a x${state.scoreBoost[owner]} goal`;
  } else if (power.familyId === "rocket") {
    const burst = 1.06 + tier * 0.028;
    state.ball.vx *= burst;
    state.ball.vy *= burst;
    addPongEffect(state, {
      target: "ball",
      kind: "speedMul",
      amount: 0.06 + tier * 0.012,
      duration: 3.8 + tier * 0.18
    });
  } else if (power.familyId === "mist") {
    const damp = clamp(0.95 - tier * 0.018, 0.72, 0.92);
    state.ball.vx *= damp;
    state.ball.vy *= damp;
    addPongEffect(state, {
      target: "ball",
      kind: "speedMul",
      amount: -(0.06 + tier * 0.01),
      duration: 4.4 + tier * 0.18
    });
  } else if (power.familyId === "curve") {
    const sign = owner === "player" ? 1 : -1;
    addPongEffect(state, {
      target: "ball",
      kind: "spin",
      amount: sign * (45 + tier * 12),
      duration: 4 + tier * 0.2
    });
  }

  clampBallVelocity(state.ball);
  state.status = message;
  logPongPower(state, message, power.color);
}

function awardPongScore(state, scorer, serveDirection) {
  const defender = otherPongSide(scorer);
  if (state.shields[defender] > 0) {
    state.shields[defender] -= 1;
    state.ball = spawnPongBall(serveDirection);
    state.ball.lastTouch = null;
    state.status = `${pongSideName(defender)} shield blocked the goal`;
    logPongPower(state, state.status, defender === "player" ? "#60a5fa" : "#34d399");
    return;
  }

  const points = state.scoreBoost[scorer];
  state[scorer] += points;
  state.scoreBoost[scorer] = 1;
  state.ball = spawnPongBall(serveDirection);
  state.ball.lastTouch = null;
  state.pickups = state.pickups.slice(0, 2);
  state.pickupTimer = 0.8;
  state.status = points > 1 ? `${pongSideName(scorer)} scores x${points}` : `${pongSideName(scorer)} scores`;
  if (state[scorer] >= 7) {
    state.gameOver = true;
    state.status = scorer === "player" ? "You win the match" : "CPU wins the match";
  }
}

const pongGame = (() => {
  return {
    name: "Modern Pong",
    description: "A powered-up Pong arena with 100 floor pickups, stacked match effects, and a brighter court.",
    controls: "Move with W/S, Arrow keys, or the mouse. The ball can trigger floor pickups for the last side that touched it.",
    stageTitle: "Modern Pong Arena",
    stageHelp: "Beat the CPU to seven, but now the court spawns 100 possible floor power-ups that the ball can activate mid-rally.",
    createState() {
      return {
        playerY: H / 2 - 78,
        cpuY: H / 2 - 78,
        ball: spawnPongBall(Math.random() < 0.5 ? -1 : 1),
        player: 0,
        cpu: 0,
        status: "First to 7 wins",
        gameOver: false,
        effects: [],
        modifiers: createPongModifiers(),
        pickups: [],
        pickupTimer: 1.2,
        shields: { player: 0, cpu: 0 },
        scoreBoost: { player: 1, cpu: 1 },
        recentPowers: []
      };
    },
    keydown(state, key) {
      if (key === " " && state.gameOver) {
        resetCurrentGame();
      }
    },
    update(state, dt, time) {
      for (const note of state.recentPowers) {
        note.timer -= dt;
      }
      state.recentPowers = state.recentPowers.filter((note) => note.timer > 0);

      recalcPongModifiers(state, dt);
      const arena = getPongArena();

      if (state.gameOver) {
        return;
      }

      const playerPaddle = getPongPaddle(state, "player");
      const cpuPaddle = getPongPaddle(state, "cpu");
      const playerSpeed = 560 * state.modifiers.player.speedMul;
      const cpuSpeed = (350 + Math.min(200, (state.player + state.cpu) * 12)) * state.modifiers.cpu.speedMul;

      if (input.keys.has("arrowup") || input.keys.has("w")) {
        state.playerY -= playerSpeed * dt;
      }
      if (input.keys.has("arrowdown") || input.keys.has("s")) {
        state.playerY += playerSpeed * dt;
      }
      if (input.pointer.inside) {
        state.playerY = input.pointer.y - playerPaddle.h / 2;
      }
      state.playerY = clamp(state.playerY, arena.y + 8, arena.y + arena.h - playerPaddle.h - 8);

      const cpuMistake = Math.sin(time * 2.3 + state.cpu * 0.2) * 18 + Math.cos(time * 1.4) * 10;
      const cpuTarget = state.ball.y - cpuPaddle.h / 2 + cpuMistake;
      if (cpuTarget > state.cpuY + 8) {
        state.cpuY += cpuSpeed * dt;
      } else if (cpuTarget < state.cpuY - 8) {
        state.cpuY -= cpuSpeed * dt;
      }
      state.cpuY = clamp(state.cpuY, arena.y + 8, arena.y + arena.h - cpuPaddle.h - 8);

      state.pickupTimer -= dt;
      if (state.pickupTimer <= 0 && state.pickups.length < 4) {
        state.pickups.push(spawnPongPickup(state));
        state.pickupTimer = rand(1.2, 2.4);
      }

      const ball = state.ball;
      const leftPaddle = getPongPaddle(state, "player");
      const rightPaddle = getPongPaddle(state, "cpu");

      if (ball.vx < 0 && state.modifiers.player.magnet > 0) {
        ball.vy += ((leftPaddle.y + leftPaddle.h / 2) - ball.y) * state.modifiers.player.magnet * dt * 1.4;
      }
      if (ball.vx > 0 && state.modifiers.cpu.magnet > 0) {
        ball.vy += ((rightPaddle.y + rightPaddle.h / 2) - ball.y) * state.modifiers.cpu.magnet * dt * 1.4;
      }
      ball.vy += state.modifiers.ball.spin * dt;

      const rallySpeed = state.modifiers.ball.speedMul;
      ball.x += ball.vx * rallySpeed * dt;
      ball.y += ball.vy * rallySpeed * dt;
      clampBallVelocity(ball);

      if (ball.y < arena.y + ball.r || ball.y > arena.y + arena.h - ball.r) {
        ball.y = clamp(ball.y, arena.y + ball.r, arena.y + arena.h - ball.r);
        ball.vy *= -1;
        state.status = "Wall ricochet";
      }

      for (const pickup of state.pickups) {
        if (distance(ball.x, ball.y, pickup.x, pickup.y) < ball.r + pickup.radius) {
          const owner = ball.lastTouch ?? (ball.vx > 0 ? "player" : "cpu");
          applyPongPower(state, owner, pickup.power);
          state.pickups = state.pickups.filter((item) => item !== pickup);
          break;
        }
      }

      if (circleRectOverlap({ x: ball.x, y: ball.y, r: ball.r }, leftPaddle) && ball.vx < 0) {
        const offset = (ball.y - (leftPaddle.y + leftPaddle.h / 2)) / (leftPaddle.h / 2);
        ball.x = leftPaddle.x + leftPaddle.w + ball.r + 1;
        ball.vx = Math.abs(ball.vx) + 24;
        ball.vy += offset * 280;
        ball.lastTouch = "player";
        state.status = "Player return";
      }

      if (circleRectOverlap({ x: ball.x, y: ball.y, r: ball.r }, rightPaddle) && ball.vx > 0) {
        const offset = (ball.y - (rightPaddle.y + rightPaddle.h / 2)) / (rightPaddle.h / 2);
        ball.x = rightPaddle.x - ball.r - 1;
        ball.vx = -Math.abs(ball.vx) - 24;
        ball.vy += offset * 280;
        ball.lastTouch = "cpu";
        state.status = "CPU return";
      }
      clampBallVelocity(ball);

      if (ball.x < arena.x - 40) {
        awardPongScore(state, "cpu", 1);
      } else if (ball.x > arena.x + arena.w + 40) {
        awardPongScore(state, "player", -1);
      }
    },
    draw(state, time) {
      drawBackground("#06111f", "#102642", time, "rgba(92,199,255,0.7)");

      const arena = getPongArena();
      const floor = ctx.createLinearGradient(arena.x, arena.y, arena.x, arena.y + arena.h);
      floor.addColorStop(0, "#091425");
      floor.addColorStop(0.55, "#142744");
      floor.addColorStop(1, "#0f1d31");
      drawRoundedRect(arena.x, arena.y, arena.w, arena.h, 30, floor, "rgba(255,255,255,0.1)");

      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let row = 0; row < 9; row += 1) {
        const y = arena.y + 32 + row * 54;
        ctx.fillRect(arena.x + 28, y, arena.w - 56, 2);
      }

      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 26; i += 1) {
        const x = arena.x + 28 + i * 46;
        ctx.fillRect(x, arena.y + 26, 2, arena.h - 52);
      }

      ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
      ctx.setLineDash([16, 18]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W / 2, arena.y + 14);
      ctx.lineTo(W / 2, arena.y + arena.h - 14);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 88, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(96, 165, 250, 0.18)";
      ctx.strokeRect(arena.x + 90, arena.y + 86, 140, arena.h - 172);
      ctx.strokeStyle = "rgba(52, 211, 153, 0.18)";
      ctx.strokeRect(arena.x + arena.w - 230, arena.y + 86, 140, arena.h - 172);

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 0; i < 14; i += 1) {
        const dotX = arena.x + 42 + i * ((arena.w - 84) / 13);
        ctx.beginPath();
        ctx.arc(dotX, arena.y - 14, 6 + Math.sin(time * 2 + i) * 1.2, 0, Math.PI * 2);
        ctx.arc(dotX, arena.y + arena.h + 14, 6 + Math.cos(time * 1.8 + i) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(34,211,238,0.12)";
      drawRoundedRect(arena.x + 18, arena.y + 18, 110, 20, 10, "rgba(96,165,250,0.18)");
      drawRoundedRect(arena.x + arena.w - 128, arena.y + 18, 110, 20, 10, "rgba(52,211,153,0.18)");
      drawRoundedRect(arena.x + 18, arena.y + arena.h - 38, 110, 20, 10, "rgba(96,165,250,0.18)");
      drawRoundedRect(arena.x + arena.w - 128, arena.y + arena.h - 38, 110, 20, 10, "rgba(52,211,153,0.18)");

      for (const pickup of state.pickups) {
        const pulse = 0.82 + Math.sin(time * 4 + pickup.pulse) * 0.14;
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = pickup.power.color;
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, pickup.radius * 2.1 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        drawRoundedRect(
          pickup.x - pickup.radius,
          pickup.y - pickup.radius,
          pickup.radius * 2,
          pickup.radius * 2,
          14,
          pickup.power.color,
          pickup.power.glow
        );
        ctx.fillStyle = "#08111f";
        ctx.font = "800 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText(pickup.power.symbol, pickup.x, pickup.y + 6);
      }

      const playerPaddle = getPongPaddle(state, "player");
      const cpuPaddle = getPongPaddle(state, "cpu");
      drawRoundedRect(playerPaddle.x, playerPaddle.y, playerPaddle.w, playerPaddle.h, 14, "#60a5fa");
      drawRoundedRect(cpuPaddle.x, cpuPaddle.y, cpuPaddle.w, cpuPaddle.h, 14, "#34d399");

      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(playerPaddle.x + 5, playerPaddle.y + 18, playerPaddle.w - 10, playerPaddle.h - 36);
      ctx.fillRect(cpuPaddle.x + 5, cpuPaddle.y + 18, cpuPaddle.w - 10, cpuPaddle.h - 36);

      ctx.fillStyle = "#f8fbff";
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#5cc7ff";
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, state.ball.r * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawLabel(String(state.player), W / 2 - 120, 90, 40, "#60a5fa", "center");
      drawLabel(String(state.cpu), W / 2 + 120, 90, 40, "#34d399", "center");

      ctx.textAlign = "left";
      ctx.font = "700 16px Orbitron, monospace";
      ctx.fillStyle = "#dbeafe";
      ctx.fillText(`P Shields ${state.shields.player}`, arena.x + 28, arena.y + 34);
      ctx.fillStyle = "#d1fae5";
      ctx.fillText(`CPU Shields ${state.shields.cpu}`, arena.x + arena.w - 196, arena.y + 34);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "700 14px Orbitron, monospace";
      ctx.fillText(`Goal Boost x${state.scoreBoost.player}`, arena.x + 28, arena.y + arena.h - 18);
      ctx.textAlign = "right";
      ctx.fillText(`CPU Boost x${state.scoreBoost.cpu}`, arena.x + arena.w - 28, arena.y + arena.h - 18);

      state.recentPowers.forEach((note, index) => {
        drawRoundedRect(arena.x + 150 + index * 220, arena.y + 18, 196, 26, 12, "rgba(8,17,31,0.72)", note.color);
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.font = "700 12px Orbitron, monospace";
        ctx.fillText(note.text.slice(0, 24), arena.x + 248 + index * 220, arena.y + 36);
      });
    },
    hud(state) {
      return {
        value: `${state.player} - ${state.cpu}`,
        copy: state.gameOver
          ? "Match finished. Tap Restart Game or press Space to play another powered-up round."
          : `100 floor power-ups are live. Active pads ${state.pickups.length} | Player shields ${state.shields.player} | CPU shields ${state.shields.cpu}`,
        banner: state.status,
        footer: "Power tiles spawn on the court floor. If the ball touches one, the side that last hit the ball claims the effect."
      };
    }
  };
})();

const mazeGame = (() => {
  const layout = [
    "#####################",
    "#o....#.....#....o..#",
    "#.##.#.#.#.#.#.##.#.#",
    "#.....#..P..#.....#.#",
    "###.#.#####.#.###.#.#",
    "#...#...#...#...#...#",
    "#.#####.#.#####.#.#.#",
    "#.......G.G.......#.#",
    "#.#####.#.#####.#.#.#",
    "#...#...#...#...#...#",
    "###.#.#####.#.###.#.#",
    "#.....#.....#.....#.#",
    "#.##.#.#.#.#.#.##.#.#",
    "#o....#..G..#....o..#",
    "#####################"
  ];

  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const opposite = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
  };

  const ghostColors = ["#ff758f", "#68d8ff", "#ffbe6b", "#a78bfa"];
  const cols = Math.max(...layout.map((row) => row.length));
  const rows = layout.length;
  const tile = Math.floor(Math.min((W - 180) / cols, (H - 80) / rows));
  const boardX = Math.floor((W - cols * tile) / 2);
  const boardY = Math.floor((H - rows * tile) / 2);
  const mazePlayerRadius = tile * 0.44;
  const studentFaceRoot = "/assets/student-sprites";
  const studentFaceFiles = [
    ...Array.from({ length: 26 }, (_, index) => `students1_face_${String(index + 1).padStart(2, "0")}.png`),
    ...Array.from({ length: 14 }, (_, index) => `students2_face_${String(index + 1).padStart(2, "0")}.png`)
  ];
  const studentFaces = studentFaceFiles.map((file, index) => ({
    id: file.replace(".png", ""),
    label: `Student ${index + 1}`,
    image: loadSprite(`${studentFaceRoot}/${file}`)
  }));

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function isWall(x, y) {
    const row = layout[y] || "";
    return !row[x] || row[x] === "#";
  }

  function buildTemplate() {
    const pellets = new Set();
    const power = new Set();
    const ghostSpawns = [];
    let playerSpawn = { x: 1, y: 1 };

    for (let y = 0; y < layout.length; y += 1) {
      const row = layout[y];
      for (let x = 0; x < row.length; x += 1) {
        const cell = row[x];
        if (cell === ".") {
          pellets.add(cellKey(x, y));
        } else if (cell === "o") {
          power.add(cellKey(x, y));
        } else if (cell === "P") {
          playerSpawn = { x, y };
        } else if (cell === "G") {
          ghostSpawns.push({ x, y });
        }
      }
    }

    return { pellets, power, playerSpawn, ghostSpawns };
  }

  const template = buildTemplate();

  function canMove(entity, dir) {
    const vector = directions[dir];
    return !isWall(entity.x + vector.x, entity.y + vector.y);
  }

  function resetActors(state) {
    state.player = {
      x: template.playerSpawn.x,
      y: template.playerSpawn.y,
      dir: "left",
      nextDir: "left",
      faceIndex: state.playerFaceIndex
    };
    state.ghosts = template.ghostSpawns.map((spawn, index) => ({
      x: spawn.x,
      y: spawn.y,
      dir: pick(["up", "left", "right"]),
      spawnX: spawn.x,
      spawnY: spawn.y,
      color: ghostColors[index % ghostColors.length]
    }));
  }

  function handlePlayerStep(state) {
    if (canMove(state.player, state.player.nextDir)) {
      state.player.dir = state.player.nextDir;
    }

    if (canMove(state.player, state.player.dir)) {
      const vector = directions[state.player.dir];
      state.player.x += vector.x;
      state.player.y += vector.y;
    }

    const key = cellKey(state.player.x, state.player.y);
    if (state.pellets.delete(key)) {
      state.score += 10;
      state.status = "Dot chain rolling";
    }
    if (state.power.delete(key)) {
      state.score += 25;
      state.frightened = 8;
      state.status = "Power pellet active";
    }
  }

  function moveGhost(ghost, state) {
    let options = Object.keys(directions).filter((dir) => canMove(ghost, dir));

    if (options.length > 1) {
      options = options.filter((dir) => dir !== opposite[ghost.dir]);
    }
    if (!options.length) {
      options = [opposite[ghost.dir]];
    }

    const ranked = options
      .map((dir) => {
        const vector = directions[dir];
        const nextX = ghost.x + vector.x;
        const nextY = ghost.y + vector.y;
        const dist = Math.abs(nextX - state.player.x) + Math.abs(nextY - state.player.y);
        return { dir, dist };
      })
      .sort((a, b) => (state.frightened > 0 ? b.dist - a.dist : a.dist - b.dist));

    ghost.dir = Math.random() < 0.2 ? pick(options) : ranked[0].dir;
    const step = directions[ghost.dir];
    ghost.x += step.x;
    ghost.y += step.y;
  }

  function checkGhostCollisions(state) {
    for (const ghost of state.ghosts) {
      if (ghost.x === state.player.x && ghost.y === state.player.y) {
        if (state.frightened > 0) {
          ghost.x = ghost.spawnX;
          ghost.y = ghost.spawnY;
          state.score += 60;
          state.status = "Ghost tagged";
        } else {
          state.lives -= 1;
          if (state.lives <= 0) {
            state.gameOver = true;
            state.status = "Ghosts closed the maze";
          } else {
            resetActors(state);
            state.status = "Reset positions";
          }
        }
        break;
      }
    }
  }

  function drawGhost(ghost, frightenedPulse) {
    const x = boardX + ghost.x * tile + tile / 2;
    const y = boardY + ghost.y * tile + tile / 2;
    const body = stateColor(ghost.color, frightenedPulse);

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y - 4, tile * 0.34, Math.PI, 0);
    ctx.lineTo(x + tile * 0.34, y + tile * 0.3);
    for (let i = 0; i < 4; i += 1) {
      ctx.lineTo(x + tile * 0.24 - i * tile * 0.16, y + tile * 0.18 + ((i % 2) ? 8 : 0));
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f7fbff";
    ctx.beginPath();
    ctx.arc(x - 10, y - 2, 7, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#172554";
    ctx.beginPath();
    ctx.arc(x - 10, y - 1, 3.2, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 1, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function stateColor(base, frightenedPulse) {
    return frightenedPulse ? "#60a5fa" : base;
  }

  function mazeFacingAngle(dir) {
    return {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2
    }[dir] || 0;
  }

  function drawMazeRunner(state, time) {
    const playerX = boardX + state.player.x * tile + tile / 2;
    const playerY = boardY + state.player.y * tile + tile / 2;
    const facing = mazeFacingAngle(state.player.dir);
    const mouthOpen = 0.12 + Math.abs(Math.sin(time * 9)) * 0.1;
    const playerFace = studentFaces[state.player.faceIndex]?.image;

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.beginPath();
    ctx.ellipse(playerX, playerY + mazePlayerRadius * 0.72, mazePlayerRadius * 0.72, mazePlayerRadius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const drewFace = drawCircularSprite(playerFace, playerX, playerY, mazePlayerRadius);
    if (!drewFace) {
      ctx.fillStyle = "#ffd447";
      ctx.beginPath();
      ctx.arc(playerX, playerY, mazePlayerRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.fillStyle = "#0d1728";
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.arc(playerX, playerY, mazePlayerRadius + 1, facing - mouthOpen, facing + mouthOpen);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(playerX, playerY, mazePlayerRadius, facing + mouthOpen, facing + Math.PI * 2 - mouthOpen);
    ctx.stroke();
    ctx.restore();
  }

  return {
    name: "Maze Chase",
    description: "A student-face maze run with pellets, power turns, and roaming ghost pressure.",
    controls: "Use Arrow keys or WASD to queue your next turn through the maze.",
    stageTitle: "Maze Chase",
    stageHelp: "Eat every pellet to clear the board. A random student face is the runner each round, and power pellets let you chase ghosts for a few seconds.",
    createState() {
      const playerFaceIndex = studentFaces.length ? randInt(0, studentFaces.length - 1) : -1;
      const state = {
        pellets: new Set(template.pellets),
        power: new Set(template.power),
        playerFaceIndex,
        player: null,
        ghosts: [],
        playerClock: 0,
        ghostClock: 0,
        frightened: 0,
        score: 0,
        lives: 3,
        status: playerFaceIndex >= 0 ? `${studentFaces[playerFaceIndex].label} ready` : "Clear every pellet",
        gameOver: false,
        win: false
      };
      resetActors(state);
      return state;
    },
    keydown(state, key) {
      const dir = keyToDir[key];
      if (dir) {
        state.player.nextDir = dir;
      }
      if (key === " " && state.gameOver) {
        resetCurrentGame();
      }
    },
    update(state, dt) {
      if (state.gameOver) {
        return;
      }

      if (state.frightened > 0) {
        state.frightened = Math.max(0, state.frightened - dt);
      }

      state.playerClock += dt;
      while (state.playerClock >= 0.13) {
        state.playerClock -= 0.13;
        handlePlayerStep(state);
        checkGhostCollisions(state);
      }

      state.ghostClock += dt;
      const ghostStep = state.frightened > 0 ? 0.2 : 0.17;
      while (state.ghostClock >= ghostStep) {
        state.ghostClock -= ghostStep;
        for (const ghost of state.ghosts) {
          moveGhost(ghost, state);
        }
        checkGhostCollisions(state);
      }

      if (!state.gameOver && state.pellets.size === 0 && state.power.size === 0) {
        state.gameOver = true;
        state.win = true;
        state.status = "Maze cleared";
      }
    },
    draw(state, time) {
      drawBackground("#060d18", "#101d33", time, "rgba(59,130,246,0.85)");

      for (let y = 0; y < rows; y += 1) {
        const row = layout[y] || "";
        for (let x = 0; x < cols; x += 1) {
          const cell = row[x] || "#";
          const px = boardX + x * tile;
          const py = boardY + y * tile;

          if (cell === "#") {
            drawRoundedRect(px + 2, py + 2, tile - 4, tile - 4, 10, "#173b84", "#6ea8ff");
            continue;
          }

          ctx.fillStyle = "rgba(255,255,255,0.04)";
          ctx.fillRect(px, py, tile, tile);

          const dotKey = cellKey(x, y);
          if (state.pellets.has(dotKey)) {
            ctx.fillStyle = "#f8fafc";
            ctx.beginPath();
            ctx.arc(px + tile / 2, py + tile / 2, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          if (state.power.has(dotKey)) {
            ctx.fillStyle = "#fcd34d";
            ctx.beginPath();
            ctx.arc(px + tile / 2, py + tile / 2, 9 + Math.sin(time * 6) * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      drawMazeRunner(state, time);

      const frightenedPulse = state.frightened > 0 && Math.sin(time * 10) > 0;
      for (const ghost of state.ghosts) {
        drawGhost(ghost, frightenedPulse);
      }
    },
    hud(state) {
      const dotsLeft = state.pellets.size + state.power.size;
      return {
        value: `${state.score}`,
        copy: `Dots left ${dotsLeft} | Lives ${state.lives}`,
        banner: state.gameOver
          ? state.win ? "Board cleared" : "Game over"
          : state.frightened > 0 ? `Power run ${state.frightened.toFixed(1)}s` : state.status,
        footer: "Power pellets flip the hunt and let kids chase ghosts instead of only running."
      };
    }
  };
})();

const crossingGame = (() => {
  const stageInsetX = 18;
  const cols = 13;
  const tile = 72;
  const laneHeight = 64;
  const boardW = W - stageInsetX * 2;
  const boardH = 11 * laneHeight;
  const boardX = stageInsetX;
  const boardY = (H - boardH) / 2;
  const startRow = 10;
  const hopDuration = 0.14;
  const riverSpriteRoot = "/assets/arcade/river-crossing";
  const realisticVehicleRoot = `${riverSpriteRoot}/unlucky`;
  const fishingSpriteRoot = "/assets/arcade/fishing";

  const vehicleSprites = {
    bus: loadSprite(`${realisticVehicleRoot}/vehicle_bus_top.png`),
    audi: loadSprite(`${realisticVehicleRoot}/vehicle_audi_top.png`),
    hatchback: loadSprite(`${realisticVehicleRoot}/vehicle_car_top.png`),
    minivan: loadSprite(`${realisticVehicleRoot}/vehicle_minivan_top.png`),
    pickup: loadSprite(`${realisticVehicleRoot}/vehicle_mini_truck_top.png`),
    sports: loadSprite(`${realisticVehicleRoot}/vehicle_viper_top.png`),
    taxi: loadSprite(`${realisticVehicleRoot}/vehicle_taxi_top.png`),
    truck: loadSprite(`${realisticVehicleRoot}/vehicle_truck_top.png`),
    police: loadSprite(`${realisticVehicleRoot}/vehicle_police_top.png`),
    policeFrames: [
      loadSprite(`${realisticVehicleRoot}/vehicle_police_anim_1.png`),
      loadSprite(`${realisticVehicleRoot}/vehicle_police_anim_2.png`),
      loadSprite(`${realisticVehicleRoot}/vehicle_police_anim_3.png`)
    ],
    ambulance: loadSprite(`${realisticVehicleRoot}/vehicle_ambulance_top.png`),
    ambulanceFrames: [
      loadSprite(`${realisticVehicleRoot}/vehicle_ambulance_anim_1.png`),
      loadSprite(`${realisticVehicleRoot}/vehicle_ambulance_anim_2.png`),
      loadSprite(`${realisticVehicleRoot}/vehicle_ambulance_anim_3.png`)
    ]
  };

  const frogSprites = {
    idle: loadSprite(`${riverSpriteRoot}/frog_idle.svg`),
    jump: loadSprite(`${riverSpriteRoot}/frog_jump.svg`)
  };
  const riverVesselSprites = {
    rowboat: loadSprite(`${fishingSpriteRoot}/boat_rowboat.png`),
    oldship: loadSprite(`${fishingSpriteRoot}/boat_oldship.png`),
    trawler: loadSprite(`${fishingSpriteRoot}/boat_trawler.png`),
    sailboat: loadSprite(`${fishingSpriteRoot}/boat_sailboat.svg`),
    yacht: loadSprite(`${fishingSpriteRoot}/boat_yacht.svg`),
    speedboat: loadSprite(`${fishingSpriteRoot}/boat_speedboat.svg`)
  };
  const frogHitbox = { width: 24, height: 22 };
  const spriteBounds = {
    taxi: { x: 67, y: 13, w: 114, h: 223 },
    sports: { x: 67, y: 16, w: 103, h: 216 },
    police: { x: 77, y: 25, w: 98, h: 214 },
    ambulance: { x: 73, y: 31, w: 102, h: 207 },
    sedan: { x: 77, y: 25, w: 98, h: 214 },
    hatchback: { x: 80, y: 16, w: 92, h: 216 },
    minivan: { x: 74, y: 25, w: 93, h: 196 },
    pickup: { x: 63, y: 35, w: 111, h: 204 },
    truck: { x: 76, y: 21, w: 89, h: 216 },
    bus: { x: 0, y: 0, w: 302, h: 709 }
  };

  const vehicleTypes = {
    taxi: { sprite: vehicleSprites.taxi, crop: spriteBounds.taxi, length: 104, native: true, rotateToLane: true },
    sports: { sprite: vehicleSprites.sports, crop: spriteBounds.sports, length: 102, native: true, rotateToLane: true },
    police: { sprite: vehicleSprites.police, frames: vehicleSprites.policeFrames, crop: spriteBounds.police, length: 102, native: true, rotateToLane: true },
    ambulance: { sprite: vehicleSprites.ambulance, frames: vehicleSprites.ambulanceFrames, crop: spriteBounds.ambulance, length: 104, native: true, rotateToLane: true },
    sedan: { sprite: vehicleSprites.audi, crop: spriteBounds.sedan, length: 102, native: true, rotateToLane: true },
    hatchback: { sprite: vehicleSprites.hatchback, crop: spriteBounds.hatchback, length: 96, native: true, rotateToLane: true },
    minivan: { sprite: vehicleSprites.minivan, crop: spriteBounds.minivan, length: 100, native: true, rotateToLane: true },
    pickup: { sprite: vehicleSprites.pickup, crop: spriteBounds.pickup, length: 104, native: true, rotateToLane: true },
    truck: { sprite: vehicleSprites.truck, crop: spriteBounds.truck, length: 108, native: true, rotateToLane: true },
    citybus: { sprite: vehicleSprites.bus, crop: spriteBounds.bus, length: 166, native: true, rotateToLane: true, tint: "#38bdf8", tintAlpha: 0.78, badgeFill: "#0f172a", badgeText: "CITY", badgeColor: "#e0f2fe" },
    schoolbus: { sprite: vehicleSprites.bus, crop: spriteBounds.bus, length: 166, native: true, rotateToLane: true, tint: "#facc15", tintAlpha: 0.55, badgeFill: "#78350f", badgeText: "BUS", badgeColor: "#fef3c7" }
  };

  const laneConfigs = [
    { type: "goal" },
    { type: "river", speed: 110, size: 196, gap: 120, offset: 0, pool: ["rowboat", "oldship", "speedboat", "yacht"] },
    { type: "river", speed: -140, size: 210, gap: 130, offset: 120, pool: ["speedboat", "yacht", "oldship", "rowboat"] },
    { type: "safe" },
    { type: "road", speed: 170, size: 164, gap: 180, offset: 20, spacing: [170, 260], pool: ["schoolbus", "taxi", "sedan", "hatchback"] },
    { type: "road", speed: -210, size: 182, gap: 195, offset: 130, spacing: [190, 300], pool: ["citybus", "police", "sports", "truck"] },
    { type: "road", speed: 185, size: 136, gap: 185, offset: 60, spacing: [180, 290], pool: ["pickup", "taxi", "ambulance", "minivan"] },
    { type: "safe" },
    { type: "road", speed: -225, size: 184, gap: 225, offset: 170, spacing: [210, 340], pool: ["sports", "sedan", "police", "citybus", "truck", "hatchback"] },
    { type: "safe" },
    { type: "start" }
  ];

  function centerYForRow(row) {
    return boardY + row * laneHeight + laneHeight / 2;
  }

  function makeVehicle(config) {
    const typeId = pick(config.pool);
    const profile = vehicleTypes[typeId];
    return {
      typeId,
      profile
    };
  }

  function makeRiverVessel(config) {
    const typeId = pick(config.pool);
    const vesselTypes = {
      rowboat: { sprite: riverVesselSprites.rowboat, width: 94, height: 58, rideWidth: 70, rideInset: 12, bob: 1.8 },
      oldship: { sprite: riverVesselSprites.oldship, width: 164, height: 54, rideWidth: 136, rideInset: 12, bob: 2.8 },
      trawler: { sprite: riverVesselSprites.trawler, width: 142, height: 58, rideWidth: 114, rideInset: 14, bob: 2.4 },
      sailboat: { sprite: riverVesselSprites.sailboat, width: 62, height: 62, rideWidth: 46, rideInset: 8, bob: 1.7 },
      yacht: { sprite: riverVesselSprites.yacht, width: 134, height: 56, rideWidth: 110, rideInset: 10, bob: 2.1 },
      speedboat: { sprite: riverVesselSprites.speedboat, width: 138, height: 54, rideWidth: 112, rideInset: 10, bob: 1.9 }
    };
    return {
      typeId,
      profile: vesselTypes[typeId]
    };
  }

  function getTrafficSpacing(config) {
    const [minSpacing, maxSpacing] = config.spacing ?? [config.gap, config.gap + 80];
    return rand(minSpacing, maxSpacing);
  }

  function getVehicleMetrics(profile) {
    const crop = profile.crop ?? { x: 0, y: 0, w: profile.sprite?.naturalWidth ?? 1, h: profile.sprite?.naturalHeight ?? 1 };
    const length = profile.length ?? profile.bodyWidth ?? profile.width;
    const ratio = crop.w / crop.h;
    const thickness = profile.thickness ?? Math.max(34, length * ratio);
    if (profile.native && profile.rotateToLane) {
      return {
        crop,
        bodyWidth: length * (profile.hitScaleX ?? 0.88),
        bodyHeight: thickness * (profile.hitScaleY ?? 0.84),
        displayWidth: length,
        displayHeight: thickness,
        drawWidth: thickness,
        drawHeight: length
      };
    }
    return {
      crop,
      bodyWidth: length,
      bodyHeight: thickness,
      displayWidth: length,
      displayHeight: thickness,
      drawWidth: length,
      drawHeight: thickness
    };
  }

  function drawVehicle(vehicle, x, centerY, facingRight, time) {
    const { profile } = vehicle;
    const metrics = getVehicleMetrics(profile);
    const y = centerY - metrics.drawHeight / 2;
    const frame = profile.frames ? profile.frames[Math.floor(time * 10) % profile.frames.length] : profile.sprite;

    if (profile.native) {
      const angle = profile.rotateToLane ? (facingRight ? Math.PI / 2 : -Math.PI / 2) : 0;
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.ellipse(x + metrics.displayWidth / 2, centerY + 14, metrics.displayWidth * 0.32, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const drawCx = x + metrics.displayWidth / 2;
      if (profile.tint) {
        drawRotatedTintedSprite(frame, drawCx, centerY, metrics.drawWidth, metrics.drawHeight, profile.tint, {
          angle,
          sx: metrics.crop.x,
          sy: metrics.crop.y,
          sw: metrics.crop.w,
          sh: metrics.crop.h,
          tintAlpha: profile.tintAlpha ?? 0.8
        });
      } else {
        drawRotatedSprite(frame, drawCx, centerY, metrics.drawWidth, metrics.drawHeight, {
          angle,
          sx: metrics.crop.x,
          sy: metrics.crop.y,
          sw: metrics.crop.w,
          sh: metrics.crop.h
        });
      }
      if (profile.badgeFill && profile.badgeText) {
        drawRoundedRect(x + metrics.displayWidth * 0.26, centerY - 18, metrics.displayWidth * 0.48, 12, 4, profile.badgeFill);
        drawLabel(profile.badgeText, x + metrics.displayWidth * 0.5, centerY - 8, 10, profile.badgeColor ?? "#f8fafc", "center");
      }
      return;
    }

    drawTintedSprite(frame, x, y, metrics.drawWidth, metrics.drawHeight, profile.tint, { flip: facingRight });

    ctx.save();
    if (profile.stripe === "sport") {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(x + profile.width * 0.46, y + 8, profile.width * 0.08, profile.height - 16);
    }
    if (profile.roof === "taxi") {
      drawRoundedRect(x + profile.width * 0.37, y + 12, profile.width * 0.26, 10, 4, "#111827");
      drawLabel("T", x + profile.width * 0.5, y + 21, 10, "#fde68a", "center");
    }
    if (profile.roof === "lightbar") {
      drawRoundedRect(x + profile.width * 0.34, y + 12, profile.width * 0.32, 10, 4, "#0f172a");
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(x + profile.width * 0.37, y + 14, profile.width * 0.1, 6);
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(x + profile.width * 0.53, y + 14, profile.width * 0.1, 6);
    }
    if (profile.roof === "medical") {
      drawRoundedRect(x + profile.width * 0.34, y + 11, profile.width * 0.32, 12, 4, "#fee2e2");
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(x + profile.width * 0.47, y + 12, 6, 10);
      ctx.fillRect(x + profile.width * 0.43, y + 15, 14, 4);
    }
    if (profile.roof === "route") {
      drawRoundedRect(x + profile.width * 0.25, y + 9, profile.width * 0.5, 12, 4, "#082f49");
      drawLabel("CITY", x + profile.width * 0.5, y + 19, 10, "#bae6fd", "center");
    }
    if (profile.roof === "school") {
      drawRoundedRect(x + profile.width * 0.25, y + 9, profile.width * 0.5, 12, 4, "#78350f");
      drawLabel("BUS", x + profile.width * 0.5, y + 19, 10, "#fde68a", "center");
    }
    ctx.strokeStyle = profile.accent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.strokeRect(x + 10, y + 8, profile.width - 20, profile.height - 16);
    ctx.restore();
  }

  function buildLanes() {
    return laneConfigs.map((config) => {
      if (!config.speed) {
        return { ...config, items: [] };
      }

      const items = [];
      if (config.type === "road") {
        let x = -config.offset;
        while (x < boardW + config.size + 40) {
          items.push({ x, vehicle: makeVehicle(config) });
          x += config.size + getTrafficSpacing(config);
        }
      } else if (config.type === "river") {
        const span = config.size + config.gap;
        for (let x = -config.offset; x < boardW + span; x += span) {
          items.push({ x, vessel: makeRiverVessel(config) });
        }
      } else {
        const span = config.size + config.gap;
        for (let x = -config.offset; x < boardW + span; x += span) {
          items.push({ x });
        }
      }
      return { ...config, items };
    });
  }

  function resetFrog(state) {
    state.row = startRow;
    state.x = boardW / 2;
    state.hopTimer = 0;
    state.hopFromX = state.x;
    state.hopToX = state.x;
    state.hopFromRow = state.row;
    state.hopToRow = state.row;
    state.queuedDir = null;
    state.facing = "up";
  }

  function loseLife(state, reason) {
    state.lives -= 1;
    state.status = reason;
    state.hopTimer = 0;
    state.queuedDir = null;
    if (state.lives <= 0) {
      state.gameOver = true;
      return;
    }
    resetFrog(state);
  }

  function beginHop(state, dir) {
    const previousX = state.x;
    const previousRow = state.row;
    let nextX = previousX;
    let nextRow = previousRow;

    if (dir === "left") {
      nextX -= tile;
    } else if (dir === "right") {
      nextX += tile;
    } else if (dir === "up") {
      nextRow -= 1;
    } else if (dir === "down") {
      nextRow += 1;
    } else {
      return false;
    }

    nextX = clamp(nextX, tile / 2, boardW - tile / 2);
    nextRow = clamp(nextRow, 0, laneConfigs.length - 1);
    if (nextX === previousX && nextRow === previousRow) {
      return false;
    }

    state.x = nextX;
    state.row = nextRow;
    state.hopFromX = previousX;
    state.hopToX = nextX;
    state.hopFromRow = previousRow;
    state.hopToRow = nextRow;
    state.hopTimer = hopDuration;
    state.facing = dir;
    state.status = nextRow === 0 ? "Stick the landing" : "Hop clean";
    return true;
  }

  return {
    name: "River Crossing",
    description: "A Frogger style crossing run with sprite traffic, buses, and quick jumping frog animation.",
    controls: "Arrow keys or WASD. Each tap buffers one hop, so the frog moves exactly where you press.",
    stageTitle: "River Crossing",
    stageHelp: "Reach the top grass. Random traffic uses top-down sprites, and river lanes still need a log under you.",
    createState() {
      const state = {
        row: startRow,
        x: boardW / 2,
        lanes: buildLanes(),
        score: 0,
        lives: 4,
        status: "Hop to the top",
        gameOver: false,
        hopTimer: 0,
        hopFromX: boardW / 2,
        hopToX: boardW / 2,
        hopFromRow: startRow,
        hopToRow: startRow,
        queuedDir: null,
        facing: "up"
      };
      resetFrog(state);
      return state;
    },
    keydown(state, key, event) {
      if (state.gameOver && key === " ") {
        resetCurrentGame();
        return;
      }

      const dir = keyToDir[key];
      if (!dir || state.gameOver) {
        return;
      }
      if (event?.repeat) {
        return;
      }
      if (state.hopTimer > 0) {
        state.queuedDir = dir;
        return;
      }
      beginHop(state, dir);
    },
    update(state, dt) {
      if (state.gameOver) {
        return;
      }

      for (const lane of state.lanes) {
        if (!lane.speed) {
          continue;
        }
        for (const item of lane.items) {
          item.x += lane.speed * dt;
          if (lane.speed > 0 && item.x > boardW + lane.size) {
            if (lane.type === "road") {
              let leftmost = boardW;
              for (const other of lane.items) {
                if (other !== item) {
                  leftmost = Math.min(leftmost, other.x);
                }
              }
              item.x = leftmost - lane.size - getTrafficSpacing(lane);
              item.vehicle = makeVehicle(lane);
            } else if (lane.type === "river") {
              item.x -= lane.items.length * (lane.size + lane.gap);
              item.vessel = makeRiverVessel(lane);
            } else {
              item.x -= lane.items.length * (lane.size + lane.gap);
            }
          }
          if (lane.speed < 0 && item.x < -lane.size - lane.gap) {
            if (lane.type === "road") {
              let rightmost = -lane.size;
              for (const other of lane.items) {
                if (other !== item) {
                  rightmost = Math.max(rightmost, other.x);
                }
              }
              item.x = rightmost + lane.size + getTrafficSpacing(lane);
              item.vehicle = makeVehicle(lane);
            } else if (lane.type === "river") {
              item.x += lane.items.length * (lane.size + lane.gap);
              item.vessel = makeRiverVessel(lane);
            } else {
              item.x += lane.items.length * (lane.size + lane.gap);
            }
          }
        }
      }

      if (state.hopTimer > 0) {
        state.hopTimer = Math.max(0, state.hopTimer - dt);
      }

      const lane = state.lanes[state.row];
      if (lane.type === "road") {
        const frogRect = {
          x: state.x - frogHitbox.width / 2,
          y: 0,
          w: frogHitbox.width,
          h: frogHitbox.height
        };
        for (const traffic of lane.items) {
          const profile = traffic.vehicle.profile;
          const metrics = getVehicleMetrics(profile);
          const displayLeft = traffic.x + (lane.size - metrics.displayWidth) / 2;
          const carLeft = displayLeft + (metrics.displayWidth - metrics.bodyWidth) / 2;
          const carRect = { x: carLeft, y: 0, w: metrics.bodyWidth, h: metrics.bodyHeight };
          if (rectsOverlap(frogRect, carRect)) {
            loseLife(state, "Traffic got the frog");
            return;
          }
        }
      }

      if (lane.type === "river") {
        let onLog = false;
        for (const log of lane.items) {
          const vessel = log.vessel?.profile;
          const rideInset = vessel?.rideInset ?? 8;
          const rideWidth = vessel?.rideWidth ?? lane.size - rideInset * 2;
          const rideLeft = log.x + (lane.size - rideWidth) / 2 + rideInset / 2;
          const rideRight = rideLeft + rideWidth;
          if (state.x > rideLeft && state.x < rideRight) {
            onLog = true;
            state.x += lane.speed * dt;
            state.hopFromX += lane.speed * dt;
            state.hopToX += lane.speed * dt;
            break;
          }
        }
        if (!onLog) {
          loseLife(state, "Splash. Find a log.");
          return;
        }
      }

      if (state.x < tile / 2 || state.x > boardW - tile / 2) {
        loseLife(state, "Stay inside the lane");
        return;
      }

      if (state.hopTimer === 0 && state.queuedDir) {
        const bufferedDir = state.queuedDir;
        state.queuedDir = null;
        beginHop(state, bufferedDir);
      }

      if (state.row === 0 && state.hopTimer === 0) {
        state.score += 1;
        state.status = "Goal reached";
        resetFrog(state);
      }
    },
    draw(state, time) {
      drawBackground("#081521", "#103453", time, "rgba(34,197,94,0.6)");

      for (let row = 0; row < laneConfigs.length; row += 1) {
        const lane = state.lanes[row];
        const y = boardY + row * laneHeight;
        let fill = "#1f7a3e";
        if (lane.type === "road") {
          fill = "#374151";
        } else if (lane.type === "river") {
          fill = "#2563eb";
        } else if (lane.type === "goal") {
          fill = "#166534";
        }
        drawRoundedRect(boardX, y + 2, boardW, laneHeight - 4, 18, fill);

        if (lane.type === "road") {
          ctx.fillStyle = "rgba(255,255,255,0.16)";
          for (let x = boardX + 24; x < boardX + boardW; x += 94) {
            ctx.fillRect(x, y + laneHeight / 2 - 4, 46, 8);
          }
        }

        if (lane.type === "river") {
          ctx.fillStyle = "rgba(255,255,255,0.09)";
          for (let wave = 0; wave < 10; wave += 1) {
            const waveX = boardX + ((wave * 110 + time * lane.speed * 0.14) % (boardW + 120)) - 60;
            ctx.fillRect(waveX, y + 12 + (wave % 2) * 20, 52, 4);
          }
        }

        if (lane.type === "goal") {
          for (let pad = 0; pad < cols; pad += 2) {
            ctx.fillStyle = "rgba(187,247,208,0.25)";
            ctx.beginPath();
            ctx.arc(boardX + pad * tile + tile / 2, y + laneHeight / 2, 14, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        for (const item of lane.items) {
          if (lane.type === "road") {
            const profile = item.vehicle.profile;
            const metrics = getVehicleMetrics(profile);
            const spriteX = boardX + item.x + (lane.size - metrics.displayWidth) / 2;
            drawVehicle(item.vehicle, spriteX, y + laneHeight / 2, lane.speed > 0, time);
          } else if (lane.type === "river") {
            const vessel = item.vessel?.profile;
            if (vessel?.sprite && vessel.sprite.complete && vessel.sprite.naturalWidth) {
              const vesselX = boardX + item.x + (lane.size - vessel.width) / 2;
              const bob = Math.sin(time * 2.4 + item.x * 0.02) * (vessel.bob ?? 2);
              ctx.save();
              ctx.globalAlpha = 0.18;
              ctx.fillStyle = "#0f172a";
              ctx.beginPath();
              ctx.ellipse(vesselX + vessel.width / 2, y + laneHeight / 2 + 18, vessel.width * 0.34, 8, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              drawSprite(vessel.sprite, vesselX, y + laneHeight / 2 - vessel.height / 2 + bob, vessel.width, vessel.height, { flip: lane.speed < 0 });
            } else {
              drawRoundedRect(boardX + item.x, y + 10, lane.size, 44, 16, "#9a6b35");
              ctx.fillStyle = "rgba(255,255,255,0.08)";
              ctx.fillRect(boardX + item.x + 14, y + 18, lane.size - 28, 8);
            }
          }
        }
      }

      const hopProgress = state.hopTimer > 0 ? 1 - state.hopTimer / hopDuration : 1;
      const frogLane = state.hopTimer > 0 ? lerp(state.hopFromRow, state.hopToRow, hopProgress) : state.row;
      const frogX = boardX + (state.hopTimer > 0 ? lerp(state.hopFromX, state.hopToX, hopProgress) : state.x);
      const frogY = centerYForRow(frogLane);
      const jumpLift = state.hopTimer > 0 ? Math.sin(hopProgress * Math.PI) * 18 : 0;
      const frogSprite = state.hopTimer > 0 ? frogSprites.jump : frogSprites.idle;

      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.ellipse(frogX, frogY + 20, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (frogSprite && frogSprite.complete && frogSprite.naturalWidth) {
        drawSprite(frogSprite, frogX - 28, frogY - 28 - jumpLift, 56, 56);
      } else {
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(frogX, frogY - jumpLift, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Goals reached ${state.score} | Lives ${state.lives}`,
        banner: state.gameOver ? "Run ended" : state.status,
        footer: "Sprite traffic rerolls every pass, buses mix with cars, and a buffered jump keeps each tap going the right way."
      };
    }
  };
})();

const flappyGame = (() => {
  const spriteRoot = "/assets/arcade/sky-flap";
  const customSpriteRoot = `${spriteRoot}/custom-sheet`;
  const birdSkins = [
    {
      id: "parrot",
      label: "1. Parrot",
      frames: [loadSprite(`${customSpriteRoot}/parrot_stand.png`), loadSprite(`${customSpriteRoot}/parrot_fly.png`)],
      drawW: 110,
      drawH: 88
    },
    {
      id: "eagle",
      label: "2. Eagle",
      frames: [loadSprite(`${customSpriteRoot}/eagle_glide.png`), loadSprite(`${customSpriteRoot}/eagle_flap.png`)],
      drawW: 116,
      drawH: 86
    },
    {
      id: "cardinal",
      label: "3. Cardinal",
      frames: [loadSprite(`${customSpriteRoot}/cardinal_perch.png`), loadSprite(`${customSpriteRoot}/cardinal_flap.png`)],
      drawW: 98,
      drawH: 82
    },
    {
      id: "penguin",
      label: "4. Penguin",
      frames: [loadSprite(`${customSpriteRoot}/penguin_walk.png`), loadSprite(`${customSpriteRoot}/penguin_flap.png`), loadSprite(`${customSpriteRoot}/penguin_wiggle.png`)],
      drawW: 96,
      drawH: 90
    },
    {
      id: "toucan",
      label: "5. Toucan",
      frames: [loadSprite(`${customSpriteRoot}/toucan_perch.png`), loadSprite(`${customSpriteRoot}/toucan_flap.png`)],
      drawW: 108,
      drawH: 88
    },
    {
      id: "puffin",
      label: "6. Puffin",
      frames: [loadSprite(`${customSpriteRoot}/puffin_stand.png`), loadSprite(`${customSpriteRoot}/puffin_flap.png`)],
      drawW: 100,
      drawH: 88
    },
    {
      id: "bluejay",
      label: "7. Blue Jay",
      frames: [loadSprite(`${customSpriteRoot}/bluejay_stand.png`), loadSprite(`${customSpriteRoot}/bluejay_flap.png`)],
      drawW: 106,
      drawH: 86
    },
    {
      id: "hummingbird",
      label: "8. Hummingbird",
      frames: [loadSprite(`${customSpriteRoot}/hummingbird_hover.png`), loadSprite(`${customSpriteRoot}/hummingbird_flap.png`), loadSprite(`${customSpriteRoot}/hummingbird_glide.png`)],
      drawW: 96,
      drawH: 82
    },
    {
      id: "robin",
      label: "9. Robin",
      frames: [loadSprite(`${customSpriteRoot}/robin_stand.png`), loadSprite(`${customSpriteRoot}/robin_flap.png`)],
      drawW: 102,
      drawH: 82
    },
    {
      id: "owl",
      label: "0. Owl",
      frames: [loadSprite(`${customSpriteRoot}/owl_stand.png`), loadSprite(`${customSpriteRoot}/owl_flap.png`)],
      drawW: 106,
      drawH: 90
    }
  ];

  let selectedBirdIndex = 0;

  function spawnSkyPipe(score) {
    const gapH = clamp(218 - score * 2.4, 168, 218);
    const gapY = rand(190, H - 220);
    const pipe = {
      x: W + 140,
      gapY,
      gapH,
      passed: false,
      pickup: null,
      hazard: null
    };

    if (Math.random() < 0.44) {
      pipe.pickup = {
        type: pick(["shield", "slow", "star"]),
        offsetX: 132,
        offsetY: rand(-gapH * 0.22, gapH * 0.22),
        collected: false
      };
    }

    if (score > 3 && Math.random() < 0.3) {
      pipe.hazard = {
        type: Math.random() < 0.5 ? "storm" : "orb",
        offsetX: 124,
        offsetY: rand(-gapH * 0.16, gapH * 0.16),
        active: true
      };
    }

    return pipe;
  }

  function getBirdName(state) {
    return birdSkins[state.birdIndex].label.replace(/^[0-9]+\.\s*/, "");
  }

  function selectBird(state, index) {
    if (index < 0 || index >= birdSkins.length) {
      return;
    }
    selectedBirdIndex = index;
    state.birdIndex = index;
    state.status = `${getBirdName(state)} ready`;
  }

  function useShield(state, message) {
    if (state.shield <= 0) {
      return false;
    }
    state.shield = 0;
    state.invuln = 1;
    state.birdVY = -180;
    state.birdY = clamp(state.birdY, 96, H - 160);
    state.status = message;
    return true;
  }

  function applyPickup(state, type) {
    if (type === "shield") {
      state.shield = 1;
      state.status = "Shield bubble ready";
    } else if (type === "slow") {
      state.slowTimer = 6;
      state.status = "Slow breeze active";
    } else {
      state.score += 3;
      state.status = "Star bonus";
    }
  }

  function drawPickup(type, x, y, time) {
    if (type === "shield") {
      ctx.fillStyle = "rgba(191, 219, 254, 0.88)";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 8, y - 3);
      ctx.lineTo(x + 4, y + 12);
      ctx.lineTo(x - 4, y + 12);
      ctx.lineTo(x - 8, y - 3);
      ctx.closePath();
      ctx.stroke();
    } else if (type === "slow") {
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 8);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 7, y + 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fcd34d";
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const outerAngle = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        const innerAngle = outerAngle + Math.PI / 5;
        const ox = x + Math.cos(outerAngle) * 18;
        const oy = y + Math.sin(outerAngle) * 18;
        const ix = x + Math.cos(innerAngle) * 8;
        const iy = y + Math.sin(innerAngle) * 8;
        if (i === 0) {
          ctx.moveTo(ox, oy);
        } else {
          ctx.lineTo(ox, oy);
        }
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.25 + Math.abs(Math.sin(time * 6)) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawHazard(type, x, y, time) {
    if (type === "storm") {
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.arc(x - 12, y, 16, Math.PI, 0);
      ctx.arc(x + 2, y - 6, 20, Math.PI, 0);
      ctx.arc(x + 22, y, 16, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 6);
      ctx.lineTo(x - 6, y + 26);
      ctx.lineTo(x + 6, y + 26);
      ctx.lineTo(x - 2, y + 46);
      ctx.lineTo(x + 20, y + 18);
      ctx.lineTo(x + 8, y + 18);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 2.2);
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = i * (Math.PI / 4);
        const radius = i % 2 === 0 ? 24 : 12;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSkyBird(state, time) {
    const tilt = clamp(state.birdVY / 760, -0.52, 0.6);
    const skin = birdSkins[state.birdIndex];
    const cycle = Math.floor(time * 12);
    let frameIndex = 0;
    if (skin.frames.length > 1) {
      if (state.started && !state.gameOver) {
        frameIndex = state.birdVY < -40 ? cycle % skin.frames.length : (cycle + 1) % skin.frames.length;
      } else {
        frameIndex = 0;
      }
    }
    const image = skin.frames[frameIndex];
    ctx.save();
    ctx.translate(220, state.birdY);
    ctx.rotate(tilt);
    if (state.invuln > 0) {
      ctx.globalAlpha = 0.55 + Math.abs(Math.sin(time * 18)) * 0.35;
    }
    if (image.complete && image.naturalWidth) {
      const scale = Math.min(skin.drawW / image.naturalWidth, skin.drawH / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = "#ffd447";
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    name: "Sky Flap",
    description: "A richer flappy run with custom pixel-bird sprites, pickup powers, hazard obstacles, and a brighter student-friendly HUD.",
    controls: "Press Space or click to flap. Use keys 1-9 and 0, or the sidebar, to switch birds.",
    stageTitle: "Sky Flap",
    stageHelp: "Pick from 10 custom bird sprites from your sheet, then grab shields and star bonuses while weaving through pipes and sky hazards.",
    createState() {
      return {
        birdIndex: selectedBirdIndex,
        birdY: H / 2,
        birdVY: 0,
        pipes: [],
        spawnTimer: 0.6,
        score: 0,
        started: false,
        gameOver: false,
        status: `${birdSkins[selectedBirdIndex].label.replace(/^[0-9]+\.\s*/, "")} ready`,
        shield: 0,
        slowTimer: 0,
        invuln: 0,
        clouds: Array.from({ length: 5 }, (_, index) => ({ x: 150 + index * 250, y: 110 + (index % 3) * 70, scale: 0.85 + (index % 2) * 0.28 })),
        balloons: Array.from({ length: 3 }, (_, index) => ({ x: 430 + index * 310, y: 180 + index * 90, hue: ["#fb7185", "#22c55e", "#fbbf24"][index] }))
      };
    },
    getExtras(state) {
      return {
        title: "Bird Select",
        items: birdSkins.map((bird, index) => ({
          id: String(index),
          label: bird.label,
          active: index === state.birdIndex
        }))
      };
    },
    handleExtra(state, id) {
      selectBird(state, Number(id));
    },
    flap(state) {
      if (state.gameOver) {
        resetCurrentGame();
        return;
      }
      state.started = true;
      state.birdVY = -400;
      state.status = "Flap";
    },
    keydown(state, key) {
      if (/^[1-9]$/.test(key)) {
        selectBird(state, Number(key) - 1);
        return;
      }
      if (key === "0") {
        selectBird(state, 9);
        return;
      }
      if (key === " ") {
        this.flap(state);
      }
    },
    pointerdown(state) {
      this.flap(state);
    },
    update(state, dt) {
      for (const cloud of state.clouds) {
        cloud.x -= 24 * dt * cloud.scale;
        if (cloud.x < -130) {
          cloud.x = W + 120;
        }
      }
      for (const balloon of state.balloons) {
        balloon.x -= 42 * dt;
        if (balloon.x < -80) {
          balloon.x = W + 80;
        }
      }

      if (!state.started || state.gameOver) {
        state.birdY = H / 2 + Math.sin(performance.now() / 320) * 10;
        return;
      }

      state.slowTimer = Math.max(0, state.slowTimer - dt);
      state.invuln = Math.max(0, state.invuln - dt);

      const scrollSpeed = (state.slowTimer > 0 ? 230 : 300) + Math.min(90, state.score * 4);
      state.birdVY += 920 * dt;
      state.birdY += state.birdVY * dt;
      state.spawnTimer -= dt;

      if (state.spawnTimer <= 0) {
        state.spawnTimer = clamp(1.4 - state.score * 0.018, 0.92, 1.4);
        state.pipes.push(spawnSkyPipe(state.score));
      }

      const bird = { x: 220, y: state.birdY, r: 24 };
      for (const pipe of state.pipes) {
        pipe.x -= scrollSpeed * dt;

        if (pipe.pickup && !pipe.pickup.collected) {
          const pickupX = pipe.x + pipe.pickup.offsetX;
          const pickupY = pipe.gapY + pipe.pickup.offsetY;
          if (distance(bird.x, bird.y, pickupX, pickupY) < 36) {
            pipe.pickup.collected = true;
            applyPickup(state, pipe.pickup.type);
          }
        }

        if (pipe.hazard && pipe.hazard.active) {
          const hazardX = pipe.x + pipe.hazard.offsetX;
          const hazardY = pipe.gapY + pipe.hazard.offsetY;
          if (distance(bird.x, bird.y, hazardX, hazardY) < (pipe.hazard.type === "storm" ? 28 : 30)) {
            if (!useShield(state, "Shield blocked the hazard")) {
              state.gameOver = true;
              state.status = "Hazard hit";
            }
            pipe.hazard.active = false;
          }
        }

        if (!pipe.passed && pipe.x + 92 < 220) {
          pipe.passed = true;
          state.score += 1;
          state.status = "Pipe cleared";
        }
      }
      state.pipes = state.pipes.filter((pipe) => pipe.x > -180);

      if (bird.y > H - 72 || bird.y < 54) {
        if (!useShield(state, "Shield saved the wall hit")) {
          state.gameOver = true;
          state.status = "Bird clipped the edge";
        }
      }

      if (state.invuln <= 0) {
        for (const pipe of state.pipes) {
          const topRect = { x: pipe.x, y: 0, w: 92, h: pipe.gapY - pipe.gapH / 2 };
          const bottomRect = { x: pipe.x, y: pipe.gapY + pipe.gapH / 2, w: 92, h: H - pipe.gapY };
          if (circleRectOverlap(bird, topRect) || circleRectOverlap(bird, bottomRect)) {
            if (!useShield(state, "Shield saved a pipe hit")) {
              state.gameOver = true;
              state.status = "Pipe hit";
            }
            break;
          }
        }
      }
    },
    draw(state, time) {
      drawBackground("#8bdcff", "#2563eb", time, "rgba(255,255,255,0.72)");

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(170, 140, 150, 0, Math.PI * 2);
      ctx.arc(1030, 160, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.26)";
      for (const cloud of state.clouds) {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 36 * cloud.scale, Math.PI, 0);
        ctx.arc(cloud.x + 34 * cloud.scale, cloud.y + 4, 24 * cloud.scale, Math.PI, 0);
        ctx.arc(cloud.x - 28 * cloud.scale, cloud.y + 6, 24 * cloud.scale, Math.PI, 0);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(37, 99, 235, 0.22)";
      ctx.beginPath();
      ctx.moveTo(0, H - 160);
      ctx.lineTo(140, H - 240);
      ctx.lineTo(300, H - 170);
      ctx.lineTo(460, H - 260);
      ctx.lineTo(660, H - 180);
      ctx.lineTo(860, H - 250);
      ctx.lineTo(1080, H - 170);
      ctx.lineTo(1280, H - 230);
      ctx.lineTo(1280, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      for (const balloon of state.balloons) {
        ctx.fillStyle = balloon.hue;
        ctx.beginPath();
        ctx.ellipse(balloon.x, balloon.y, 24, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.beginPath();
        ctx.moveTo(balloon.x, balloon.y + 30);
        ctx.lineTo(balloon.x - 8, balloon.y + 92);
        ctx.stroke();
      }

      for (const pipe of state.pipes) {
        drawRoundedRect(pipe.x, -10, 92, pipe.gapY - pipe.gapH / 2 + 10, 18, "#2fb662");
        drawRoundedRect(pipe.x, pipe.gapY + pipe.gapH / 2, 92, H - pipe.gapY, 18, "#2fb662");
        ctx.fillStyle = "#15803d";
        ctx.fillRect(pipe.x - 8, pipe.gapY - pipe.gapH / 2 - 18, 108, 18);
        ctx.fillRect(pipe.x - 8, pipe.gapY + pipe.gapH / 2, 108, 18);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(pipe.x + 18, 0, 10, pipe.gapY - pipe.gapH / 2);
        ctx.fillRect(pipe.x + 18, pipe.gapY + pipe.gapH / 2, 10, H - pipe.gapY);

        if (pipe.pickup && !pipe.pickup.collected) {
          drawPickup(pipe.pickup.type, pipe.x + pipe.pickup.offsetX, pipe.gapY + pipe.pickup.offsetY, time);
        }
        if (pipe.hazard && pipe.hazard.active) {
          drawHazard(pipe.hazard.type, pipe.x + pipe.hazard.offsetX, pipe.gapY + pipe.hazard.offsetY, time);
        }
      }

      ctx.fillStyle = "#d7a344";
      ctx.fillRect(0, H - 50, W, 50);
      ctx.fillStyle = "#4caf50";
      ctx.fillRect(0, H - 66, W, 18);
      for (let x = 0; x < W; x += 44) {
        ctx.fillStyle = x % 88 === 0 ? "#65d458" : "#55bb4d";
        ctx.fillRect(x, H - 74, 18, 10);
      }

      drawSkyBird(state, time);

      drawRoundedRect(24, 22, 262, 88, 22, "rgba(15,23,42,0.26)", "rgba(255,255,255,0.12)");
      drawLabel(`Score ${state.score}`, 42, 58, 24, "#fff");
      drawLabel(getBirdName(state), 42, 88, 18, "rgba(255,255,255,0.82)");

      drawRoundedRect(1000, 22, 256, 88, 22, "rgba(15,23,42,0.26)", "rgba(255,255,255,0.12)");
      drawLabel(state.shield > 0 ? "Shield Ready" : "No Shield", 1128, 58, 20, state.shield > 0 ? "#bfdbfe" : "#fff", "center");
      drawLabel(state.slowTimer > 0 ? `Slow ${state.slowTimer.toFixed(1)}s` : "Normal Speed", 1128, 88, 18, "rgba(255,255,255,0.82)", "center");

      if (!state.started && !state.gameOver) {
        drawRoundedRect(420, 44, 440, 62, 24, "rgba(15,23,42,0.2)", "rgba(255,255,255,0.18)");
        drawLabel("Pick From 10 Birds Then Flap", 640, 83, 22, "#fff", "center");
      }
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: state.gameOver
          ? "Tap again to restart. Bird skins, pickups, and hazards all stay in the rotation."
          : state.started
            ? `Bird ${getBirdName(state)} | Shield ${state.shield ? "up" : "down"} | Slow ${state.slowTimer > 0 ? `${state.slowTimer.toFixed(1)}s` : "off"}`
            : "Choose a bird from the sidebar or use 1-9 and 0, then start the run.",
        banner: state.gameOver ? "Crash" : state.status,
        footer: "Sky Flap now has bird skins, shield bubbles, slow-time pickups, star bonuses, and extra sky hazards to keep runs fresh."
      };
    }
  };
})();

const whackGame = (() => {
  const holes = [
    { x: 330, y: 250 }, { x: 640, y: 250 }, { x: 950, y: 250 },
    { x: 330, y: 440 }, { x: 640, y: 440 }, { x: 950, y: 440 },
    { x: 330, y: 630 }, { x: 640, y: 630 }, { x: 950, y: 630 }
  ];
  const whackCursor = "url('/assets/arcade/whack/whack-mallet.svg') 14 6, pointer";
  const whackCursorDown = "url('/assets/arcade/whack/whack-mallet-down.svg') 12 4, pointer";
  const whackPortraitScale = 1.5;
  const whackCardWidth = Math.round(120 * whackPortraitScale);
  const whackCardHeight = Math.round(132 * whackPortraitScale);
  const whackCardRadius = Math.round(26 * whackPortraitScale);
  const whackCardTopOffset = Math.round(58 * whackPortraitScale);
  const whackPortraitRadius = Math.round(35 * whackPortraitScale);
  const whackPortraitYOffset = Math.round(10 * whackPortraitScale);
  const whackLabelWidth = Math.round(88 * whackPortraitScale);
  const whackLabelHeight = Math.round(22 * whackPortraitScale);
  const whackLabelYOffset = Math.round(34 * whackPortraitScale);
  const whackHitRadius = Math.round(86 * whackPortraitScale);
  const whackRiseBase = Math.round(88 * whackPortraitScale);
  const whackGoldRingRadius = Math.round(44 * whackPortraitScale);
  const whackBombOffsetX = Math.round(28 * whackPortraitScale);
  const whackBombTopY = Math.round(38 * whackPortraitScale);
  const whackBombBottomY = Math.round(18 * whackPortraitScale);
  const bookTargets = [
    { id: "alice", name: "Alice", image: loadSprite("/assets/books/book-alice.jpg") },
    { id: "arthur", name: "Arthur", image: loadSprite("/assets/books/book-arthur.jpg") },
    { id: "auggie", name: "Auggie", image: loadSprite("/assets/books/book-auggie.jpg") },
    { id: "cat-hat", name: "Cat in the Hat", image: loadSprite("/assets/books/book-cat-hat.jpg") },
    { id: "charlie", name: "Charlie", image: loadSprite("/assets/books/book-charlie.jpg") },
    { id: "charlotte", name: "Charlotte", image: loadSprite("/assets/books/book-charlotte.jpg") },
    { id: "clifford", name: "Clifford", image: loadSprite("/assets/books/book-clifford.jpg") },
    { id: "dogman", name: "Dog Man", image: loadSprite("/assets/books/book-dogman.jpg") },
    { id: "dorothy", name: "Dorothy Gale", image: loadSprite("/assets/books/book-dorothy.jpg") },
    { id: "frizzle", name: "Ms. Frizzle", image: loadSprite("/assets/books/book-frizzle.jpg") },
    { id: "george", name: "Curious George", image: loadSprite("/assets/books/book-george.jpg") },
    { id: "geronimo", name: "Geronimo Stilton", image: loadSprite("/assets/books/book-geronimo.jpg") },
    { id: "greg", name: "Greg Heffley", image: loadSprite("/assets/books/book-greg.jpg") },
    { id: "harry", name: "Harry Potter", image: loadSprite("/assets/books/book-harry.jpg") },
    { id: "hermione", name: "Hermione", image: loadSprite("/assets/books/book-hermione.jpg") },
    { id: "horton", name: "Horton", image: loadSprite("/assets/books/book-horton.jpg") },
    { id: "ivan", name: "Ivan", image: loadSprite("/assets/books/book-ivan.jpg") },
    { id: "junie", name: "Junie B. Jones", image: loadSprite("/assets/books/book-junie.jpg") },
    { id: "matilda", name: "Matilda", image: loadSprite("/assets/books/book-matilda.jpg") },
    { id: "mercy", name: "Mercy Watson", image: loadSprite("/assets/books/book-mercy.jpg") },
    { id: "paddington", name: "Paddington", image: loadSprite("/assets/books/book-paddington.jpg") },
    { id: "percy", name: "Percy Jackson", image: loadSprite("/assets/books/book-percy.jpg") },
    { id: "peter", name: "Peter Pan", image: loadSprite("/assets/books/book-peter.jpg") },
    { id: "pippi", name: "Pippi", image: loadSprite("/assets/books/book-pippi.jpg") },
    { id: "pooh", name: "Winnie the Pooh", image: loadSprite("/assets/books/book-pooh.jpg") },
    { id: "ron", name: "Ron Weasley", image: loadSprite("/assets/books/book-ron.jpg") },
    { id: "stuart", name: "Stuart Little", image: loadSprite("/assets/books/book-stuart.jpg") },
    { id: "underpants", name: "Captain Underpants", image: loadSprite("/assets/books/book-underpants.jpg") },
    { id: "wilbur", name: "Wilbur", image: loadSprite("/assets/books/book-wilbur.jpg") },
    { id: "wonka", name: "Willy Wonka", image: loadSprite("/assets/books/book-wonka.jpg") }
  ];
  const studentTargets = [
    ...Array.from({ length: 26 }, (_, index) => ({
      id: `students1-face-${String(index + 1).padStart(2, "0")}`,
      name: `Student ${index + 1}`,
      image: loadSprite(`/assets/student-sprites/students1_face_${String(index + 1).padStart(2, "0")}.png`)
    })),
    ...Array.from({ length: 14 }, (_, index) => ({
      id: `students2-face-${String(index + 1).padStart(2, "0")}`,
      name: `Student ${index + 27}`,
      image: loadSprite(`/assets/student-sprites/students2_face_${String(index + 1).padStart(2, "0")}.png`)
    }))
  ];
  const targetThemes = [
    {
      id: "students",
      label: "Student Blooks",
      name: "Student Blooks",
      targets: studentTargets,
      stageHelp: "Student blooks pop up from the holes. Golden targets are worth more, and red warning targets cost points.",
      bgTop: "#10243f",
      bgBottom: "#16627b",
      accent: "rgba(92,199,255,0.74)",
      ground: "#15576a",
      frame: "#9fe4ff",
      card: "#dff6ff",
      labelFill: "rgba(255,255,255,0.84)",
      labelText: "#11324c"
    }
  ];

  let selectedThemeIndex = 0;

  function nextKind() {
    const roll = Math.random();
    if (roll < 0.12) {
      return "gold";
    }
    if (roll < 0.19) {
      return "bomb";
    }
    return "mole";
  }

  function getTheme(state) {
    return targetThemes[state.themeIndex] || targetThemes[0];
  }

  function shuffledIndexes(count) {
    const indexes = Array.from({ length: count }, (_, index) => index);
    for (let i = indexes.length - 1; i > 0; i -= 1) {
      const j = randInt(0, i);
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes;
  }

  function nextTargetIndex(state) {
    const theme = getTheme(state);
    if (!theme.targets.length) {
      return -1;
    }
    if (!state.targetQueue.length) {
      state.targetQueue = shuffledIndexes(theme.targets.length);
    }
    return state.targetQueue.pop() ?? 0;
  }

  function resetHoles(state) {
    state.holes = holes.map(() => ({
      mode: "hidden",
      timer: rand(0.7, 1.75),
      kind: "mole",
      targetIndex: -1
    }));
  }

  function selectTheme(state, index) {
    if (index < 0 || index >= targetThemes.length) {
      return;
    }
    state.themeIndex = index;
    selectedThemeIndex = index;
    state.targetQueue = shuffledIndexes(getTheme(state).targets.length);
    resetHoles(state);
    state.combo = 0;
    state.status = `${getTheme(state).name} ready`;
    stageHelp.textContent = getTheme(state).stageHelp;
  }

  function drawFallbackWhackTarget(cx, cy, radius, fillStyle, eyeStyle = "#0f172a") {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = eyeStyle;
    ctx.beginPath();
    ctx.arc(cx - radius * 0.28, cy - radius * 0.12, radius * 0.11, 0, Math.PI * 2);
    ctx.arc(cx + radius * 0.28, cy - radius * 0.12, radius * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWhackPortrait(target, kind, x, y, theme, time, index) {
    const floatY = y + Math.sin(time * 5.5 + index) * 2.2;
    const cardX = x - whackCardWidth / 2;
    const cardY = floatY - whackCardTopOffset;
    const frameColor = kind === "gold" ? "#facc15" : kind === "bomb" ? "#fb7185" : theme.frame;
    const labelFill = kind === "gold" ? "rgba(250,204,21,0.22)" : kind === "bomb" ? "rgba(251,113,133,0.18)" : theme.labelFill;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = kind === "gold" ? "rgba(250,204,21,0.45)" : kind === "bomb" ? "rgba(251,113,133,0.45)" : "rgba(15,23,42,0.25)";
    drawRoundedRect(cardX, cardY, whackCardWidth, whackCardHeight, whackCardRadius, theme.card, frameColor);
    ctx.restore();

    const portraitDrawn = drawCircularSprite(target?.image, x, floatY - whackPortraitYOffset, whackPortraitRadius, {
      strokeStyle: frameColor,
      lineWidth: 4
    });
    if (!portraitDrawn) {
      drawFallbackWhackTarget(x, floatY - whackPortraitYOffset, whackPortraitRadius, kind === "gold" ? "#facc15" : kind === "bomb" ? "#fb7185" : "#8c5a2f");
    }

    drawRoundedRect(
      x - whackLabelWidth / 2,
      floatY + whackLabelYOffset,
      whackLabelWidth,
      whackLabelHeight,
      Math.round(12 * whackPortraitScale),
      labelFill
    );
    ctx.fillStyle = theme.labelText;
    ctx.font = `800 ${Math.round(12 * whackPortraitScale)}px Orbitron, monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      kind === "gold" ? "BONUS" : kind === "bomb" ? "SKIP" : "WHACK",
      x,
      floatY + whackLabelYOffset + whackLabelHeight - Math.round(6 * whackPortraitScale)
    );

    if (kind === "gold") {
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, floatY - whackPortraitYOffset, whackGoldRingRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === "bomb") {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - whackBombOffsetX, floatY - whackBombTopY);
      ctx.lineTo(x + whackBombOffsetX, floatY + whackBombBottomY);
      ctx.moveTo(x + whackBombOffsetX, floatY - whackBombTopY);
      ctx.lineTo(x - whackBombOffsetX, floatY + whackBombBottomY);
      ctx.stroke();
    }
  }

  return {
    name: "Whack-a-Mole",
    description: "Cartoon-style pop-up student blooks with bigger portraits and a steadier classroom-friendly pace.",
    controls: "Click or tap a target before it ducks back down.",
    stageTitle: "Whack-a-Mole Arcade",
    stageHelp: targetThemes[selectedThemeIndex].stageHelp,
    getStageHelp(state) {
      return getTheme(state).stageHelp;
    },
    getCursor() {
      return input.pointer.down ? whackCursorDown : whackCursor;
    },
    createState() {
      const state = {
        holes: [],
        themeIndex: selectedThemeIndex,
        targetQueue: shuffledIndexes(targetThemes[selectedThemeIndex].targets.length),
        score: 0,
        combo: 0,
        timeLeft: 35,
        status: `${targetThemes[selectedThemeIndex].name} ready`,
        gameOver: false
      };
      resetHoles(state);
      return state;
    },
    getExtras(state) {
      if (targetThemes.length <= 1) {
        return null;
      }
      return {
        title: "Whack Theme",
        items: targetThemes.map((theme, index) => ({
          id: String(index),
          label: theme.label,
          active: index === state.themeIndex
        }))
      };
    },
    handleExtra(state, id) {
      selectTheme(state, Number(id));
    },
    keydown(state, key) {
      if (/^[1-9]$/.test(key) && targetThemes.length > 1) {
        selectTheme(state, Number(key) - 1);
        return;
      }
      if (key === " " && state.gameOver) {
        resetCurrentGame();
      }
    },
    pointerdown(state, point) {
      if (state.gameOver) {
        resetCurrentGame();
        return;
      }

      let hitHole = false;
      for (let index = 0; index < holes.length; index += 1) {
        const hole = holes[index];
        if (distance(point.x, point.y, hole.x, hole.y - 12) > whackHitRadius) {
          continue;
        }

        hitHole = true;
        const slot = state.holes[index];
        if (slot.mode !== "up") {
          state.combo = 0;
          state.status = "Miss";
          return;
        }

        const theme = getTheme(state);
        const target = theme.targets[slot.targetIndex];
        slot.mode = "hidden";
        slot.timer = rand(0.65, 1.45);
        slot.targetIndex = -1;
        if (slot.kind === "gold") {
          state.score += 3;
          state.combo += 1;
          state.status = target ? `${target.name} bonus` : "Bonus whack";
        } else if (slot.kind === "bomb") {
          state.score = Math.max(0, state.score - 2);
          state.combo = 0;
          state.status = target ? `Skipped ${target.name}` : "Wrong target";
        } else {
          state.score += 1;
          state.combo += 1;
          state.status = target ? `Whacked ${target.name}` : "Nice whack";
        }
        return;
      }

      if (!hitHole) {
        state.combo = 0;
        state.status = "Miss";
      }
    },
    update(state, dt) {
      if (state.gameOver) {
        return;
      }

      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.gameOver = true;
        state.status = "Round complete";
      }

      for (const slot of state.holes) {
        slot.timer -= dt;
        if (slot.timer > 0) {
          continue;
        }

        if (slot.mode === "hidden") {
          const activeTargets = state.holes.filter((entry) => entry.mode === "up").length;
          const maxActiveTargets = state.timeLeft > 12 ? 2 : 3;
          if (activeTargets >= maxActiveTargets || Math.random() < 0.18) {
            slot.timer = rand(0.25, 0.8);
            continue;
          }

          slot.mode = "up";
          slot.kind = nextKind();
          slot.targetIndex = nextTargetIndex(state);
          slot.timer = Math.max(0.7, rand(0.95, 1.55) - state.timeLeft * 0.002);
        } else {
          slot.mode = "hidden";
          slot.targetIndex = -1;
          slot.timer = Math.max(0.45, rand(0.7, 1.5) - state.score * 0.003);
        }
      }
    },
    draw(state, time) {
      const theme = getTheme(state);
      drawBackground(theme.bgTop, theme.bgBottom, time, theme.accent);

      ctx.fillStyle = theme.ground;
      ctx.fillRect(0, H - 98, W, 98);

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 0; i < 6; i += 1) {
        ctx.fillRect(0, 134 + i * 104 + Math.sin(time * 0.8 + i) * 4, W, 2);
      }

      for (let i = 0; i < holes.length; i += 1) {
        const hole = holes[i];
        const slot = state.holes[i];

        if (slot.mode === "up") {
          const rise = whackRiseBase + Math.sin(time * 7 + i) * 4.5;
          drawWhackPortrait(theme.targets[slot.targetIndex], slot.kind, hole.x, hole.y - rise, theme, time, i);
        }

        ctx.fillStyle = "rgba(51,22,8,0.42)";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y - 4, 92, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#2d1408";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + 14, 90, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Time ${formatTime(state.timeLeft)} | Combo ${state.combo} | Theme ${getTheme(state).name}`,
        banner: state.gameOver ? "Time up" : state.status,
        footer: "Whack-a-Mole now uses student blooks only, and the pop-up portraits are about 1.5x bigger for easier hits."
      };
    }
  };
})();

const basketballGame = (() => {
  const spriteRoot = "/assets/arcade/hoop";
  const shootX = 210;
  const shootY = H - 168;
  const hoopDrawY = 96;
  const rimY = 211;
  const ballRadius = 20;
  const gravity = 900;
  const sprites = {
    ball: loadSprite(`${spriteRoot}/basketball-ball.svg`),
    hoop: loadSprite(`${spriteRoot}/basketball-hoop.svg`),
    wide: loadSprite(`${spriteRoot}/powerup-wide.svg`),
    magnet: loadSprite(`${spriteRoot}/powerup-magnet.svg`),
    slow: loadSprite(`${spriteRoot}/powerup-slow.svg`)
  };
  const powerups = [
    { id: "wide", name: "Wide Rim", sprite: sprites.wide, color: "#facc15" },
    { id: "magnet", name: "Magnet Ball", sprite: sprites.magnet, color: "#60a5fa" },
    { id: "slow", name: "Slow Time", sprite: sprites.slow, color: "#34d399" }
  ];

  function getPowerup(id) {
    return powerups.find((powerup) => powerup.id === id) || null;
  }

  function resetBall(state) {
    state.ball = {
      x: shootX,
      y: shootY,
      vx: 0,
      vy: 0,
      active: false,
      scored: false,
      lastY: shootY,
      spin: 0,
      trail: []
    };
    state.activePowerup = null;
  }

  function queueRandomPowerup(state, intro = "Powerup ready") {
    const currentQueued = state.nextPowerup;
    const choices = powerups
      .map((powerup) => powerup.id)
      .filter((id) => id !== currentQueued);
    state.nextPowerup = pick(choices.length ? choices : powerups.map((powerup) => powerup.id));
    state.status = `${intro}: ${getPowerup(state.nextPowerup).name}`;
  }

  function getLaunchVelocity(angle, power) {
    return {
      vx: Math.cos(angle) * power * 1260,
      vy: Math.sin(angle) * power * 1260
    };
  }

  function clampAimFromPoint(point) {
    return clamp(Math.atan2(point.y - shootY, point.x - shootX), -1.55, -0.52);
  }

  function getRimHalfWidth(state) {
    return state.ball.active && state.activePowerup === "wide" ? 70 : 56;
  }

  function getHoopSpeed(state) {
    return state.ball.active && state.activePowerup === "slow" ? 92 : 148;
  }

  function getPreviewPower(state) {
    if (state.ball.active) {
      return 0;
    }
    return clamp(Math.max(0.48, state.charging ? state.charge : Math.max(state.charge, 0.62)), 0.48, 1);
  }

  function finishShot(state) {
    const madeShot = state.ball.scored;
    resetBall(state);
    state.charging = false;
    state.charge = 0;
    if (!madeShot) {
      state.streak = 0;
      queueRandomPowerup(state, "Try this");
      return;
    }
    if (!state.nextPowerup && Math.random() < 0.45) {
      queueRandomPowerup(state, "Bonus");
      return;
    }
    state.status = "Set for next shot";
  }

  function drawPowerupBadge(powerup, x, y, title, active = false) {
    drawRoundedRect(x, y, 214, 62, 18, "rgba(15,23,42,0.4)", powerup?.color || "rgba(255,255,255,0.12)");
    if (powerup?.sprite && powerup.sprite.complete && powerup.sprite.naturalWidth) {
      drawSprite(powerup.sprite, x + 12, y + 10, 42, 42);
    } else {
      drawRoundedRect(x + 12, y + 10, 42, 42, 12, powerup?.color || "#38bdf8");
    }
    ctx.fillStyle = "#eff6ff";
    ctx.font = "800 12px Orbitron, monospace";
    ctx.textAlign = "left";
    ctx.fillText(title, x + 64, y + 24);
    ctx.fillStyle = active ? (powerup?.color || "#bfdbfe") : "rgba(239,246,255,0.78)";
    ctx.font = "800 16px Orbitron, monospace";
    ctx.fillText(powerup?.name || "None", x + 64, y + 46);
  }

  function drawShotPreview(state) {
    const power = getPreviewPower(state);
    const simulated = {
      x: shootX,
      y: shootY,
      ...getLaunchVelocity(state.angle, power)
    };
    ctx.save();
    for (let i = 0; i < 18; i += 1) {
      simulated.vy += gravity * 0.07;
      simulated.x += simulated.vx * 0.07;
      simulated.y += simulated.vy * 0.07;
      if (state.nextPowerup === "magnet" && simulated.vy > 0 && simulated.y < rimY + 110 && Math.abs(simulated.x - state.hoopX) < 120) {
        simulated.vx += (state.hoopX - simulated.x) * 0.18;
      }
      const alpha = 0.14 + i * 0.035;
      ctx.fillStyle = `rgba(191,219,254,${Math.min(alpha, 0.82)})`;
      ctx.beginPath();
      ctx.arc(simulated.x, simulated.y, 4 + i * 0.12, 0, Math.PI * 2);
      ctx.fill();
      if (simulated.y > H - 80) {
        break;
      }
    }
    ctx.restore();
  }

  return {
    name: "Hoop Shot",
    description: "A friendlier arcade shooter with sprite art, a dotted shot guide, and helpful powerups that make every miss teachable instead of punishing.",
    controls: "Aim with Arrow keys or the pointer. Hold Space or press-and-hold to build power, hold ArrowDown or S to wind it back down, then release to shoot.",
    stageTitle: "Hoop Shot",
    stageHelp: "Misses now earn a helpful powerup. Wide Rim, Magnet Ball, and Slow Time help, and ArrowDown or S lets you wind the shot down before release.",
    createState() {
      const state = {
        angle: -0.94,
        charge: 0,
        charging: false,
        hoopX: 940,
        hoopDir: 1,
        score: 0,
        shots: 0,
        made: 0,
        streak: 0,
        nextPowerup: "wide",
        activePowerup: null,
        bucketFlash: 0,
        status: "Aim and hold to shoot"
      };
      resetBall(state);
      return state;
    },
    launch(state) {
      if (!state.charging || state.ball.active) {
        return;
      }
      const power = clamp(state.charge, 0.48, 1);
      const velocity = getLaunchVelocity(state.angle, power);
      state.activePowerup = state.nextPowerup;
      state.nextPowerup = null;
      state.ball = {
        x: shootX,
        y: shootY,
        vx: velocity.vx,
        vy: velocity.vy,
        active: true,
        scored: false,
        lastY: shootY,
        spin: 0,
        trail: []
      };
      state.shots += 1;
      state.charging = false;
      state.charge = 0;
      const activePower = getPowerup(state.activePowerup);
      state.status = activePower ? `${activePower.name} shot` : "Shot away";
    },
    keydown(state, key) {
      if (key === " ") {
        if (state.ball.active) {
          return;
        }
        state.charging = true;
      }
    },
    keyup(state, key) {
      if (key === " ") {
        this.launch(state);
      }
    },
    pointermove(state, point) {
      if (state.ball.active || !input.pointer.down) {
        return;
      }
      state.angle = clampAimFromPoint(point);
    },
    pointerdown(state, point) {
      if (state.ball.active) {
        return;
      }
      state.angle = clampAimFromPoint(point);
      state.charging = true;
    },
    pointerup(state) {
      this.launch(state);
    },
    update(state, dt) {
      if (input.keys.has("arrowleft") || input.keys.has("a")) {
        state.angle -= 1.25 * dt;
      }
      if (input.keys.has("arrowright") || input.keys.has("d")) {
        state.angle += 1.25 * dt;
      }
      state.angle = clamp(state.angle, -1.55, -0.52);

      if (state.charging && !state.ball.active) {
        const windingDown = input.keys.has("arrowdown") || input.keys.has("s");
        if (windingDown) {
          state.charge = Math.max(0.18, state.charge - dt * 1.2);
          if (state.charge > 0.2) {
            state.status = "Winding down";
          }
        } else {
          state.charge = Math.min(1, state.charge + dt * 0.78);
        }
      }

      state.bucketFlash = Math.max(0, state.bucketFlash - dt);

      state.hoopX += state.hoopDir * getHoopSpeed(state) * dt;
      if (state.hoopX > 1040 || state.hoopX < 820) {
        state.hoopDir *= -1;
      }

      if (!state.ball.active) {
        return;
      }

      state.ball.lastY = state.ball.y;
      state.ball.vy += gravity * dt;
      state.ball.x += state.ball.vx * dt;
      state.ball.y += state.ball.vy * dt;
      state.ball.spin += state.ball.vx * dt * 0.012;
      state.ball.trail.push({ x: state.ball.x, y: state.ball.y });
      if (state.ball.trail.length > 8) {
        state.ball.trail.shift();
      }

      if (state.activePowerup === "magnet" && !state.ball.scored && state.ball.vy > 0 && state.ball.y < rimY + 110 && Math.abs(state.ball.x - state.hoopX) < 130) {
        const pullStrength = clamp((130 - Math.abs(state.ball.x - state.hoopX)) / 130, 0, 1);
        state.ball.vx += (state.hoopX - state.ball.x) * 4.4 * pullStrength * dt;
      }

      const rimHalfWidth = getRimHalfWidth(state);
      const leftRim = { x: state.hoopX - rimHalfWidth, y: rimY };
      const rightRim = { x: state.hoopX + rimHalfWidth, y: rimY };
      const board = { x: state.hoopX + 76, y: 112, w: 22, h: 136 };

      if (circleRectOverlap({ x: state.ball.x, y: state.ball.y, r: ballRadius }, board) && state.ball.vx > 0) {
        state.ball.x = board.x - ballRadius;
        state.ball.vx = -Math.abs(state.ball.vx) * 0.74;
        state.status = "Backboard";
      }
      if (distance(state.ball.x, state.ball.y, leftRim.x, leftRim.y) < 20) {
        state.ball.vx = -Math.abs(state.ball.vx) * 0.82;
        state.ball.vy = -Math.abs(state.ball.vy) * 0.68;
        state.status = "Rim bounce";
      }
      if (distance(state.ball.x, state.ball.y, rightRim.x, rightRim.y) < 20) {
        state.ball.vx = Math.abs(state.ball.vx) * 0.82;
        state.ball.vy = -Math.abs(state.ball.vy) * 0.68;
        state.status = "Rim bounce";
      }

      const scoreWindow = rimHalfWidth - 6;
      if (
        !state.ball.scored &&
        state.ball.lastY < rimY + 4 &&
        state.ball.y >= rimY + 4 &&
        Math.abs(state.ball.x - state.hoopX) < scoreWindow &&
        state.ball.vy > 0
      ) {
        const scoreValue = state.activePowerup ? 2 : 1;
        state.score += scoreValue;
        state.made += 1;
        state.streak += 1;
        state.ball.scored = true;
        state.bucketFlash = 0.35;
        state.status = scoreValue > 1 ? "Power bucket" : "Bucket";
      }

      if (state.ball.y > H + 70 || state.ball.x > W + 80 || state.ball.x < -80) {
        finishShot(state);
      }
    },
    draw(state, time) {
      drawBackground("#0a1a2c", "#20446e", time, "rgba(251,146,60,0.72)");

      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(0, H - 154, W, 154);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(shootX, H - 154, 168, -0.44, 0.44);
      ctx.stroke();
      drawRoundedRect(116, H - 218, 192, 82, 34, "rgba(255,255,255,0.08)");

      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(shootX, H - 154, 84, -0.52, 0.52);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, H - 132, W, 6);

      if (!state.ball.active) {
        drawShotPreview(state);
      }

      const hoopGlowAlpha = state.bucketFlash > 0 ? 0.36 + state.bucketFlash * 0.7 : 0.16;
      ctx.save();
      ctx.globalAlpha = hoopGlowAlpha;
      ctx.fillStyle = state.activePowerup === "wide" && state.ball.active ? "#facc15" : "#93c5fd";
      ctx.beginPath();
      ctx.arc(state.hoopX, rimY + 8, getRimHalfWidth(state) + 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (sprites.hoop.complete && sprites.hoop.naturalWidth) {
        drawSprite(sprites.hoop, state.hoopX - 110, hoopDrawY, 220, 180);
      } else {
        ctx.fillStyle = "#dbeafe";
        ctx.fillRect(state.hoopX + 76, 112, 22, 136);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(state.hoopX - 58, rimY - 5, 116, 10);
      }

      const aimLength = 128 + getPreviewPower(state) * 54;
      ctx.strokeStyle = "rgba(147,197,253,0.92)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(shootX, shootY);
      ctx.lineTo(shootX + Math.cos(state.angle) * aimLength, shootY + Math.sin(state.angle) * aimLength);
      ctx.stroke();

      drawRoundedRect(122, H - 120, 176, 18, 10, "rgba(15,23,42,0.42)", "rgba(255,255,255,0.14)");
      drawRoundedRect(126, H - 116, 168 * getPreviewPower(state), 10, 8, state.charging ? "#60a5fa" : "#f59e0b");
      drawLabel("Power Meter", 210, H - 130, 14, "rgba(239,246,255,0.86)", "center");

      const nextPower = getPowerup(state.nextPowerup);
      const activePower = getPowerup(state.activePowerup);
      drawPowerupBadge(nextPower, 26, 28, "Next Shot");
      drawPowerupBadge(activePower, 26, 102, "Active Shot", true);

      if (state.ball.trail.length) {
        for (let i = 0; i < state.ball.trail.length; i += 1) {
          const trail = state.ball.trail[i];
          const alpha = (i + 1) / state.ball.trail.length * 0.2;
          ctx.fillStyle = `rgba(251,146,60,${alpha})`;
          ctx.beginPath();
          ctx.arc(trail.x, trail.y, 8 + i * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const ball = state.ball.active ? state.ball : { x: shootX, y: shootY, spin: 0 };
      if (sprites.ball.complete && sprites.ball.naturalWidth) {
        drawRotatedSprite(sprites.ball, ball.x, ball.y, 46, 46, { angle: ball.spin || 0 });
      } else {
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      drawLabel("Guided Arc + Shot Powerups", 862, 58, 18, "rgba(239,246,255,0.9)", "center");
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Made ${state.made}/${state.shots} | Power ${Math.round(getPreviewPower(state) * 100)}% | Down/S winds it down | Next ${getPowerup(state.nextPowerup)?.name || "None"}`,
        banner: state.status,
        footer: "Misses now hand out helper powerups, the rim is more forgiving, and the dotted guide shows a scoreable arc before you shoot."
      };
    }
  };
})();

const dodgeGame = (() => {
  const studentFaceRoot = "/assets/student-sprites";
  const dodgerFaceScale = 3;
  const playerRadius = 22 * dodgerFaceScale;
  const enemyMinRadius = 16 * dodgerFaceScale;
  const enemyMaxRadius = 28 * dodgerFaceScale;
  const arenaPadding = 14;
  const studentFaceFiles = [
    ...Array.from({ length: 26 }, (_, index) => `students1_face_${String(index + 1).padStart(2, "0")}.png`),
    ...Array.from({ length: 14 }, (_, index) => `students2_face_${String(index + 1).padStart(2, "0")}.png`)
  ];
  const studentFaces = studentFaceFiles.map((file, index) => ({
    id: file.replace(".png", ""),
    label: `Student ${index + 1}`,
    image: loadSprite(`${studentFaceRoot}/${file}`)
  }));

  function shuffledFaceIndexes(excludeIndex = -1) {
    const indexes = studentFaces
      .map((_, index) => index)
      .filter((index) => index !== excludeIndex);
    for (let i = indexes.length - 1; i > 0; i -= 1) {
      const j = randInt(0, i);
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes;
  }

  function nextEnemyFaceIndex(state) {
    if (!studentFaces.length) {
      return -1;
    }
    if (!state.enemyFaceQueue.length) {
      state.enemyFaceQueue = shuffledFaceIndexes(state.playerFaceIndex);
    }
    return state.enemyFaceQueue.pop() ?? state.playerFaceIndex;
  }

  function drawFaceCircle(faceIndex, x, y, radius, ringColor, fallbackColor) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = ringColor;
    ctx.beginPath();
    ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const face = studentFaces[faceIndex];
    const sprite = face?.image;
    const drawRadius = radius * 1.18;
    if (sprite && sprite.complete && sprite.naturalWidth) {
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = ringColor;
      drawSprite(sprite, x - drawRadius, y - drawRadius, drawRadius * 2, drawRadius * 2);
      ctx.restore();
      return;
    }

    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    name: "Dodger Arena",
    description: "Free-move survival with random student-face runners, lookalike incoming hazards, collectible stars, and a score that climbs the longer you last.",
    controls: "Move with Arrow keys or WASD and stay away from the incoming student lookalikes.",
    stageTitle: "Dodger Arena",
    stageHelp: "Each run picks one student face for the runner. The other circles are other student faces coming after you.",
    createState() {
      const playerFaceIndex = studentFaces.length ? randInt(0, studentFaces.length - 1) : -1;
      return {
        player: { x: W / 2, y: H / 2, r: playerRadius },
        playerFaceIndex,
        enemyFaceQueue: shuffledFaceIndexes(playerFaceIndex),
        enemies: [],
        stars: [],
        enemyTimer: 0.6,
        starTimer: 1.2,
        elapsed: 0,
        bonus: 0,
        starsCaught: 0,
        score: 0,
        status: playerFaceIndex >= 0 ? `${studentFaces[playerFaceIndex].label} ready` : "Stay alive",
        gameOver: false
      };
    },
    keydown(state, key) {
      if (key === " " && state.gameOver) {
        resetCurrentGame();
      }
    },
    update(state, dt) {
      if (state.gameOver) {
        return;
      }

      state.elapsed += dt;
      const speed = 340;
      if (input.keys.has("arrowup") || input.keys.has("w")) {
        state.player.y -= speed * dt;
      }
      if (input.keys.has("arrowdown") || input.keys.has("s")) {
        state.player.y += speed * dt;
      }
      if (input.keys.has("arrowleft") || input.keys.has("a")) {
        state.player.x -= speed * dt;
      }
      if (input.keys.has("arrowright") || input.keys.has("d")) {
        state.player.x += speed * dt;
      }
      state.player.x = clamp(state.player.x, state.player.r + arenaPadding, W - state.player.r - arenaPadding);
      state.player.y = clamp(state.player.y, state.player.r + arenaPadding, H - state.player.r - arenaPadding);

      state.enemyTimer -= dt;
      if (state.enemyTimer <= 0) {
        state.enemyTimer = Math.max(0.35, 0.9 - state.elapsed * 0.02);
        const enemyRadius = rand(enemyMinRadius, enemyMaxRadius);
        const spawnOffset = enemyRadius + 36;
        const side = randInt(0, 3);
        const spawn = [
          { x: rand(enemyRadius, W - enemyRadius), y: -spawnOffset },
          { x: W + spawnOffset, y: rand(enemyRadius, H - enemyRadius) },
          { x: rand(enemyRadius, W - enemyRadius), y: H + spawnOffset },
          { x: -spawnOffset, y: rand(enemyRadius, H - enemyRadius) }
        ][side];
        const angle = Math.atan2(state.player.y - spawn.y, state.player.x - spawn.x) + rand(-0.45, 0.45);
        const enemySpeed = rand(170, 240) + state.elapsed * 6;
        state.enemies.push({
          x: spawn.x,
          y: spawn.y,
          vx: Math.cos(angle) * enemySpeed,
          vy: Math.sin(angle) * enemySpeed,
          r: enemyRadius,
          faceIndex: nextEnemyFaceIndex(state)
        });
      }

      state.starTimer -= dt;
      if (state.starTimer <= 0) {
        state.starTimer = rand(1.8, 3.2);
        state.stars.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 12, life: 7 });
      }

      for (const enemy of state.enemies) {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }
      state.enemies = state.enemies.filter((enemy) => {
        const margin = enemy.r + 80;
        return enemy.x > -margin && enemy.x < W + margin && enemy.y > -margin && enemy.y < H + margin;
      });

      for (const star of state.stars) {
        star.life -= dt;
        if (distance(state.player.x, state.player.y, star.x, star.y) < state.player.r + star.r + 4) {
          state.bonus += 30;
          state.starsCaught += 1;
          star.life = 0;
          state.status = "Star collected";
        }
      }
      state.stars = state.stars.filter((star) => star.life > 0);

      for (const enemy of state.enemies) {
        if (distance(state.player.x, state.player.y, enemy.x, enemy.y) < state.player.r + enemy.r) {
          state.gameOver = true;
          state.status = "Arena closed in";
        }
      }

      state.score = Math.floor(state.elapsed * 12) + state.bonus;
    },
    draw(state, time) {
      drawBackground("#09111b", "#182338", time, "rgba(244,114,182,0.72)");

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      for (let x = 80; x < W; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 80; y < H; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      for (const star of state.stars) {
        ctx.fillStyle = "#fcd34d";
        ctx.beginPath();
        for (let i = 0; i < 5; i += 1) {
          const outerAngle = -Math.PI / 2 + i * (Math.PI * 2 / 5);
          const innerAngle = outerAngle + Math.PI / 5;
          const ox = star.x + Math.cos(outerAngle) * 14;
          const oy = star.y + Math.sin(outerAngle) * 14;
          const ix = star.x + Math.cos(innerAngle) * 6;
          const iy = star.y + Math.sin(innerAngle) * 6;
          if (i === 0) {
            ctx.moveTo(ox, oy);
          } else {
            ctx.lineTo(ox, oy);
          }
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
      }

      for (const enemy of state.enemies) {
        drawFaceCircle(enemy.faceIndex, enemy.x, enemy.y, enemy.r, "rgba(251,113,133,0.95)", "#fb7185");
      }

      const pulse = 0.5 + Math.sin(time * 5) * 0.08;
      drawFaceCircle(state.playerFaceIndex, state.player.x, state.player.y, state.player.r + pulse, "rgba(56,189,248,0.95)", "#38bdf8");
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Survival ${state.elapsed.toFixed(1)}s | Stars ${state.starsCaught}`,
        banner: state.gameOver ? "Arena down" : state.status,
        footer: "Each run picks a random student face for the runner, and the other circles come from the rest of the class face set."
      };
    }
  };
})();

const racerGame = (() => {
  const spriteRoot = "/assets/arcade/racer";
  const laneCenters = [448, 608, 768];
  const defaultPlayerY = 606;
  const playerVerticalPadding = 18;
  const playerDepthSpeed = 360;
  const sprites = {
    audiR8: loadSprite(`${spriteRoot}/audi-r8.png`),
    audiR8Black: loadSprite(`${spriteRoot}/audi-r8-black.png`),
    gallardo: loadSprite(`${spriteRoot}/lamborghini-gallardo.png`),
    viper: loadSprite(`${spriteRoot}/dodge-viper.png`),
    audiRed: loadSprite(`${spriteRoot}/traffic-audi-red.png`),
    police: loadSprite(`${spriteRoot}/traffic-police.png`),
    taxi: loadSprite(`${spriteRoot}/traffic-taxi.png`),
    hatchback: loadSprite(`${spriteRoot}/traffic-hatchback.png`),
    minivan: loadSprite(`${spriteRoot}/traffic-minivan.png`),
    pickup: loadSprite(`${spriteRoot}/traffic-pickup.png`)
  };

  const supercarOptions = [
    { id: "audi-r8", key: "1", label: "1. Audi R8", name: "Audi R8", sprite: sprites.audiR8, drawW: 92, drawH: 168, fallback: "#f8fafc", highlight: "#bfdbfe" },
    { id: "audi-r8-black", key: "2", label: "2. Audi R8 Night", name: "Audi R8 Night", sprite: sprites.audiR8Black, drawW: 92, drawH: 166, fallback: "#2563eb", highlight: "#93c5fd" },
    { id: "gallardo", key: "3", label: "3. Lamborghini Gallardo", name: "Lamborghini Gallardo", sprite: sprites.gallardo, drawW: 92, drawH: 166, fallback: "#38bdf8", highlight: "#7dd3fc" },
    { id: "viper", key: "4", label: "4. Dodge Viper", name: "Dodge Viper", sprite: sprites.viper, drawW: 114, drawH: 170, fallback: "#fb923c", highlight: "#fdba74" }
  ];

  const trafficOptions = [
    { id: "traffic-audi-red", name: "Audi Coupe", sprite: sprites.audiRed, drawW: 102, drawH: 166, fallback: "#ef4444", highlight: "#fca5a5" },
    { id: "traffic-police", name: "Police Interceptor", sprite: sprites.police, drawW: 102, drawH: 166, fallback: "#60a5fa", highlight: "#bfdbfe" },
    { id: "traffic-taxi", name: "Taxi", sprite: sprites.taxi, drawW: 102, drawH: 166, fallback: "#facc15", highlight: "#fde68a" },
    { id: "traffic-hatchback", name: "Hatchback", sprite: sprites.hatchback, drawW: 98, drawH: 162, fallback: "#22c55e", highlight: "#86efac" },
    { id: "traffic-minivan", name: "Minivan", sprite: sprites.minivan, drawW: 104, drawH: 168, fallback: "#c084fc", highlight: "#d8b4fe" },
    { id: "traffic-pickup", name: "Pickup", sprite: sprites.pickup, drawW: 106, drawH: 172, fallback: "#f97316", highlight: "#fdba74" },
    { id: "traffic-gallardo", name: "Gallardo", sprite: sprites.gallardo, drawW: 92, drawH: 166, fallback: "#38bdf8", highlight: "#7dd3fc" },
    { id: "traffic-viper", name: "Viper", sprite: sprites.viper, drawW: 114, drawH: 170, fallback: "#fb923c", highlight: "#fdba74" }
  ];

  let selectedCarIndex = 0;

  function getSelectedCar(state) {
    return supercarOptions[state.carIndex] || supercarOptions[0];
  }

  function findCarIndex(id) {
    return supercarOptions.findIndex((car) => car.id === id);
  }

  function carX(lane, car) {
    return laneCenters[lane] - car.drawW / 2;
  }

  function carRect(x, y, car) {
    const insetX = Math.max(8, car.drawW * 0.17);
    const insetY = Math.max(12, car.drawH * 0.14);
    return {
      x: x + insetX,
      y: y + insetY,
      w: car.drawW - insetX * 2,
      h: car.drawH - insetY * 2
    };
  }

  function drawFallbackCar(x, y, car, accentOverride = null) {
    const accent = accentOverride || car.fallback;
    drawRoundedRect(x, y, car.drawW, car.drawH, 20, accent);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x + car.drawW * 0.16, y + car.drawH * 0.15, car.drawW * 0.68, 18);
    ctx.fillStyle = "rgba(15,23,42,0.42)";
    ctx.fillRect(x + car.drawW * 0.18, y + car.drawH * 0.52, car.drawW * 0.64, car.drawH * 0.22);
  }

  function drawCar(x, y, car, options = {}) {
    const { boosted = false, alpha = 1 } = options;
    const spriteReady = Boolean(car.sprite && car.sprite.complete && car.sprite.naturalWidth);

    if (boosted) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.shadowBlur = 28;
      ctx.shadowColor = "rgba(56,189,248,0.95)";
      drawRoundedRect(x + 8, y + 12, car.drawW - 16, car.drawH - 24, 18, "rgba(56,189,248,0.45)");
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(56,189,248,0.9)";
      ctx.beginPath();
      ctx.moveTo(x + car.drawW * 0.34, y + car.drawH + 8);
      ctx.lineTo(x + car.drawW * 0.46, y + car.drawH - 22);
      ctx.lineTo(x + car.drawW * 0.52, y + car.drawH + 8);
      ctx.lineTo(x + car.drawW * 0.58, y + car.drawH - 20);
      ctx.lineTo(x + car.drawW * 0.7, y + car.drawH + 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (spriteReady) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(15,23,42,0.45)";
      drawSprite(car.sprite, x, y, car.drawW, car.drawH, { alpha });
      ctx.restore();
      return;
    }

    drawFallbackCar(x, y, car);
  }

  function setSelectedCar(state, index) {
    if (index < 0 || index >= supercarOptions.length) {
      return;
    }
    state.carIndex = index;
    selectedCarIndex = index;
    state.status = `${supercarOptions[index].name} ready`;
  }

  function getPlayerYBounds(playerCar = supercarOptions[selectedCarIndex] || supercarOptions[0]) {
    return {
      min: playerVerticalPadding,
      max: H - playerCar.drawH - playerVerticalPadding
    };
  }

  function getDepthLabel(state, playerCar = getSelectedCar(state)) {
    const bounds = getPlayerYBounds(playerCar);
    const progress = clamp((state.playerY - bounds.min) / Math.max(1, bounds.max - bounds.min), 0, 1);
    if (progress < 0.34) {
      return "front";
    }
    if (progress > 0.68) {
      return "back";
    }
    return "mid";
  }

  return {
    name: "Mini Racer",
    description: "A three-lane arcade racer with real supercar sprites, quick lane swaps, depth movement, and nitro pickups that reward brave lines.",
    controls: "Use Left/Right or A/D to switch lanes, Up/Down or W/S to move forward and back, and press 1-4 to swap supercars.",
    stageTitle: "Mini Racer",
    stageHelp: "Pick your supercar, weave lanes, slide forward or back to open a gap, and grab the blue nitro bolts when the lane is clear enough.",
    createState() {
      return {
        lane: 1,
        playerY: defaultPlayerY,
        carIndex: selectedCarIndex,
        obstacles: [],
        boosts: [],
        spawnTimer: 0.8,
        boostTimer: 2.4,
        distance: 0,
        boost: 0,
        status: `${supercarOptions[selectedCarIndex].name} ready`,
        gameOver: false
      };
    },
    getExtras(state) {
      return {
        title: "Supercar Picks",
        items: supercarOptions.map((car, index) => ({
          id: car.id,
          label: car.label,
          active: index === state.carIndex
        }))
      };
    },
    handleExtra(state, id) {
      setSelectedCar(state, findCarIndex(id));
    },
    keydown(state, key) {
      if (state.gameOver && key === " ") {
        resetCurrentGame();
        return;
      }
      const numberIndex = supercarOptions.findIndex((car) => car.key === key);
      if (numberIndex >= 0) {
        setSelectedCar(state, numberIndex);
        return;
      }
      if (key === "arrowleft" || key === "a") {
        state.lane = clamp(state.lane - 1, 0, 2);
      }
      if (key === "arrowright" || key === "d") {
        state.lane = clamp(state.lane + 1, 0, 2);
      }
    },
    update(state, dt) {
      if (state.gameOver) {
        return;
      }

      const roadSpeed = 320 + state.distance * 0.03 + (state.boost > 0 ? 180 : 0);
      state.distance += roadSpeed * dt * 0.1;
      state.boost = Math.max(0, state.boost - dt);

      const playerCar = getSelectedCar(state);
      const bounds = getPlayerYBounds(playerCar);
      let depthDirection = 0;
      if (input.keys.has("arrowup") || input.keys.has("w")) {
        depthDirection -= 1;
      }
      if (input.keys.has("arrowdown") || input.keys.has("s")) {
        depthDirection += 1;
      }
      state.playerY = clamp(state.playerY + depthDirection * playerDepthSpeed * dt, bounds.min, bounds.max);

      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const trafficCar = pick(trafficOptions);
        state.spawnTimer = Math.max(0.4, 0.92 - state.distance * 0.0028);
        state.obstacles.push({
          lane: randInt(0, 2),
          y: -trafficCar.drawH - 30,
          car: trafficCar
        });
      }

      state.boostTimer -= dt;
      if (state.boostTimer <= 0) {
        state.boostTimer = rand(2.8, 4.6);
        state.boosts.push({ lane: randInt(0, 2), y: -100 });
      }

      for (const obstacle of state.obstacles) {
        obstacle.y += roadSpeed * dt;
      }
      for (const boost of state.boosts) {
        boost.y += roadSpeed * dt;
      }

      state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < H + obstacle.car.drawH + 40);
      state.boosts = state.boosts.filter((boost) => boost.y < H + 120);

      const playerX = carX(state.lane, playerCar);
      const playerRect = carRect(playerX, state.playerY, playerCar);
      for (const obstacle of state.obstacles) {
        const obstacleX = carX(obstacle.lane, obstacle.car);
        if (rectsOverlap(playerRect, carRect(obstacleX, obstacle.y, obstacle.car))) {
          state.gameOver = true;
          state.status = "Traffic collision";
          break;
        }
      }

      for (const boost of state.boosts) {
        const boostRect = { x: laneCenters[boost.lane] - 20, y: boost.y, w: 40, h: 72 };
        if (rectsOverlap(playerRect, boostRect)) {
          state.boost = 4;
          state.status = "Nitro boost";
          boost.y = H + 200;
        }
      }
    },
    draw(state, time) {
      drawBackground("#0a1017", "#1b2430", time, "rgba(96,165,250,0.72)");

      drawRoundedRect(340, 0, 600, H, 36, "#2c313a");
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(352, 0, 14, H);
      ctx.fillRect(914, 0, 14, H);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (let y = -60; y < H + 80; y += 110) {
        const offset = (time * 360) % 110;
        ctx.fillRect(534, y + offset, 12, 66);
        ctx.fillRect(694, y + offset, 12, 66);
      }

      for (const obstacle of state.obstacles) {
        const laneX = carX(obstacle.lane, obstacle.car);
        drawCar(laneX, obstacle.y, obstacle.car, { alpha: state.gameOver ? 0.88 : 1 });
      }

      for (const boost of state.boosts) {
        const laneX = laneCenters[boost.lane];
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(56,189,248,0.9)";
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.moveTo(laneX, boost.y);
        ctx.lineTo(laneX + 18, boost.y + 30);
        ctx.lineTo(laneX + 2, boost.y + 30);
        ctx.lineTo(laneX + 24, boost.y + 70);
        ctx.lineTo(laneX - 12, boost.y + 38);
        ctx.lineTo(laneX + 6, boost.y + 38);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const playerCar = getSelectedCar(state);
      const playerX = carX(state.lane, playerCar);
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = "rgba(15,23,42,0.55)";
      ctx.beginPath();
      ctx.ellipse(playerX + playerCar.drawW / 2, state.playerY + playerCar.drawH - 6, playerCar.drawW * 0.34, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (state.boost > 0) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#38bdf8";
        drawRoundedRect(playerX - 8, state.playerY + 18, playerCar.drawW + 16, playerCar.drawH - 24, 24, "#38bdf8");
        ctx.restore();
      }
      drawCar(playerX, state.playerY + Math.sin(time * 8) * 1.5, playerCar, { boosted: state.boost > 0 });
    },
    hud(state) {
      return {
        value: `${Math.floor(state.distance)}`,
        copy: `Lane ${state.lane + 1} | Depth ${getDepthLabel(state)} | Car ${getSelectedCar(state).name} | Nitro ${state.boost > 0 ? `${state.boost.toFixed(1)}s` : "ready"}`,
        banner: state.gameOver ? "Race over" : state.status,
        footer: "Use the Supercar Picks panel or keys 1-4 to choose your car, then use Up/Down to drift into safer pockets in traffic."
      };
    }
  };
})();

const fishingGame = (() => {
  const spriteRoot = "/assets/arcade/fishing";
  const sprites = {
    boatKayak: loadSprite(`${spriteRoot}/boat_kayak.png`),
    boatOldShip: loadSprite(`${spriteRoot}/boat_oldship.png`),
    boatRowboat: loadSprite(`${spriteRoot}/boat_rowboat.png`),
    boatTrawler: loadSprite(`${spriteRoot}/boat_trawler.png`),
    boatSailboat: loadSprite(`${spriteRoot}/boat_sailboat.svg`),
    boatYacht: loadSprite(`${spriteRoot}/boat_yacht.svg`),
    boatSpeedboat: loadSprite(`${spriteRoot}/boat_speedboat.svg`),
    fishBlue: loadSprite(`${spriteRoot}/fish_blue.png`),
    fishGreen: loadSprite(`${spriteRoot}/fish_green.png`),
    fishOrange: loadSprite(`${spriteRoot}/fish_orange.png`),
    fishPink: loadSprite(`${spriteRoot}/fish_pink.png`),
    fishRed: loadSprite(`${spriteRoot}/fish_red.png`),
    fishBrown: loadSprite(`${spriteRoot}/fish_brown.png`),
    fishGreyLong: loadSprite(`${spriteRoot}/fish_grey_long_a.png`),
    bubbleA: loadSprite(`${spriteRoot}/bubble_a.png`),
    bubbleB: loadSprite(`${spriteRoot}/bubble_b.png`),
    bubbleC: loadSprite(`${spriteRoot}/bubble_c.png`),
    rockA: loadSprite(`${spriteRoot}/rock_a.png`),
    rockB: loadSprite(`${spriteRoot}/rock_b.png`),
    seaweedGreen: loadSprite(`${spriteRoot}/seaweed_green_c.png`),
    seaweedOrange: loadSprite(`${spriteRoot}/seaweed_orange_b.png`),
    seaweedPink: loadSprite(`${spriteRoot}/seaweed_pink_c.png`),
    bgSeaweedA: loadSprite(`${spriteRoot}/background_seaweed_b.png`),
    bgSeaweedB: loadSprite(`${spriteRoot}/background_seaweed_f.png`),
    sandTop: loadSprite(`${spriteRoot}/terrain_sand_top_c.png`),
    sandFill: loadSprite(`${spriteRoot}/terrain_sand_a.png`)
  };

  const boatOptions = [
    { id: "rowboat", label: "1. Rowboat", image: sprites.boatRowboat, sx: 0, sy: 0, sw: 80, sh: 64, drawW: 138, drawH: 108, anchorX: 68, anchorY: 70, unlockScore: 0 },
    { id: "kayak", label: "2. Kayak", image: sprites.boatKayak, sx: 0, sy: 0, sw: 128, sh: 48, drawW: 188, drawH: 74, anchorX: 92, anchorY: 52, unlockScore: 60 },
    { id: "oldship", label: "3. Old Ship", image: sprites.boatOldShip, sx: 0, sy: 0, sw: 128, sh: 128, drawW: 188, drawH: 152, anchorX: 102, anchorY: 90, unlockScore: 160 },
    { id: "trawler", label: "4. Trawler", image: sprites.boatTrawler, sx: 0, sy: 0, sw: 288, sh: 144, drawW: 244, drawH: 122, anchorX: 122, anchorY: 78, unlockScore: 300 },
    { id: "yacht", label: "5. Yacht", image: sprites.boatYacht, sx: 0, sy: 0, sw: 300, sh: 152.29976, drawW: 248, drawH: 126, anchorX: 136, anchorY: 80, unlockScore: 520 },
    { id: "speedboat", label: "6. Lambo Boat", image: sprites.boatSpeedboat, sx: 0, sy: 0, sw: 320, sh: 140, drawW: 252, drawH: 118, anchorX: 168, anchorY: 80, unlockScore: 820 }
  ];

  const fishTypes = [
    { id: "blue", name: "Blue Runner", image: sprites.fishBlue, baseW: 108, baseH: 74, value: 40, minDepth: 250, maxDepth: 420, minSpeed: 90, maxSpeed: 150 },
    { id: "green", name: "Green Snapper", image: sprites.fishGreen, baseW: 110, baseH: 74, value: 55, minDepth: 360, maxDepth: 560, minSpeed: 80, maxSpeed: 130 },
    { id: "orange", name: "Orange Sunfish", image: sprites.fishOrange, baseW: 104, baseH: 72, value: 65, minDepth: 260, maxDepth: 520, minSpeed: 85, maxSpeed: 125 },
    { id: "pink", name: "Pink Dart", image: sprites.fishPink, baseW: 84, baseH: 58, value: 35, minDepth: 430, maxDepth: 650, minSpeed: 110, maxSpeed: 170 },
    { id: "red", name: "Red Giant", image: sprites.fishRed, baseW: 126, baseH: 84, value: 90, minDepth: 300, maxDepth: 610, minSpeed: 75, maxSpeed: 115 },
    { id: "puffer", name: "Puffer", image: sprites.fishBrown, baseW: 94, baseH: 90, value: 80, minDepth: 250, maxDepth: 610, minSpeed: 70, maxSpeed: 110 },
    { id: "eel", name: "Eel", image: sprites.fishGreyLong, baseW: 134, baseH: 60, value: 110, minDepth: 520, maxDepth: 690, minSpeed: 120, maxSpeed: 190 }
  ];

  const bubbleSprites = [sprites.bubbleA, sprites.bubbleB, sprites.bubbleC];
  const backgroundProps = [
    { image: sprites.bgSeaweedA, x: 34, w: 150, h: 220, sway: 0.8, alpha: 0.22 },
    { image: sprites.bgSeaweedB, x: 252, w: 116, h: 178, sway: 1.2, alpha: 0.2 },
    { image: sprites.bgSeaweedA, x: 926, w: 150, h: 220, sway: 0.9, alpha: 0.18 },
    { image: sprites.bgSeaweedB, x: 1128, w: 116, h: 176, sway: 1.4, alpha: 0.21 }
  ];
  const foregroundProps = [
    { image: sprites.rockA, x: 70, y: H - 128, w: 116, h: 92 },
    { image: sprites.rockB, x: 988, y: H - 134, w: 134, h: 102 },
    { image: sprites.seaweedGreen, x: 172, y: H - 184, w: 98, h: 138, sway: 1.4 },
    { image: sprites.seaweedOrange, x: 846, y: H - 182, w: 96, h: 132, sway: 1.1 },
    { image: sprites.seaweedPink, x: 1092, y: H - 192, w: 88, h: 142, sway: 1.5 }
  ];

  let selectedBoatIndex = 0;

  function unlockedBoatIndex(score) {
    let highest = 0;
    for (let i = 0; i < boatOptions.length; i += 1) {
      if (score >= boatOptions[i].unlockScore) {
        highest = i;
      }
    }
    return highest;
  }

  function makeBubble() {
    return {
      sprite: pick(bubbleSprites),
      x: rand(50, W - 50),
      y: rand(180, H - 30),
      size: rand(16, 40),
      speed: rand(28, 60),
      sway: rand(0.6, 1.6),
      phase: rand(0, Math.PI * 2)
    };
  }

  function makeFish(index) {
    const template = pick(fishTypes);
    const scale = rand(0.82, 1.12);
    const direction = Math.random() < 0.5 ? -1 : 1;
    return {
      template,
      x: rand(120, W - 120),
      y: rand(template.minDepth, template.maxDepth) + index * 4,
      w: Math.round(template.baseW * scale),
      h: Math.round(template.baseH * scale),
      vx: rand(template.minSpeed, template.maxSpeed) * direction,
      value: Math.round(template.value * scale),
      bobPhase: rand(0, Math.PI * 2)
    };
  }

  function getBoat(state) {
    return boatOptions[state.boatIndex] || boatOptions[0];
  }

  function getHookAnchor(state) {
    const boat = getBoat(state);
    const x = state.boatX - boat.drawW / 2 + boat.anchorX;
    const y = 18 + boat.anchorY;
    return { x, y };
  }

  function selectBoat(state, index) {
    if (index < 0 || index >= boatOptions.length || index > state.unlockedBoatIndex) {
      return;
    }
    selectedBoatIndex = index;
    state.boatIndex = index;
    const anchor = getHookAnchor(state);
    if (state.hook.state === "idle") {
      state.hook.x = anchor.x;
      state.hook.y = anchor.y + 16;
    }
    state.status = `${boatOptions[index].label.replace(/^[0-9]+\.\s*/, "")} ready`;
  }

  return {
    name: "Fish & Boats",
    description: "A Fishing Frenzy style catch game with internet-sourced sprite fish, multiple boat picks, and a fuller underwater scene.",
    controls: "Move with Arrow keys or A/D. Press Space or click to drop the hook. Use keys 1-6 to switch boats.",
    stageTitle: "Fish & Boats",
    stageHelp: "Drop the hook, catch one fish, then reel it back in. Bigger fish score more and each boat is selectable.",
    createState() {
      const base = {
        boatX: W / 2,
        boatIndex: Math.min(selectedBoatIndex, unlockedBoatIndex(0)),
        unlockedBoatIndex: unlockedBoatIndex(0),
        hook: { state: "idle", x: W / 2, y: 150, fishIndex: -1 },
        fish: Array.from({ length: 9 }, (_, index) => makeFish(index)),
        bubbles: Array.from({ length: 14 }, () => makeBubble()),
        score: 0,
        catches: 0,
        status: `${boatOptions[Math.min(selectedBoatIndex, unlockedBoatIndex(0))].label.replace(/^[0-9]+\.\s*/, "")} ready`,
        lastCatch: "None"
      };
      const anchor = getHookAnchor(base);
      base.hook.x = anchor.x;
      base.hook.y = anchor.y + 16;
      return base;
    },
    getExtras(state) {
      return {
        title: "Boat Select",
        items: boatOptions.map((boat, index) => ({
          id: String(index),
          label: index <= state.unlockedBoatIndex ? boat.label : `${boat.label} (${boat.unlockScore})`,
          active: index === state.boatIndex,
          disabled: index > state.unlockedBoatIndex
        }))
      };
    },
    handleExtra(state, id) {
      selectBoat(state, Number(id));
    },
    keydown(state, key) {
      if (/^[1-6]$/.test(key)) {
        selectBoat(state, Number(key) - 1);
        return;
      }
      if (key === " " && state.hook.state === "idle") {
        state.hook.state = "drop";
      }
    },
    pointerdown(state) {
      if (state.hook.state === "idle") {
        state.hook.state = "drop";
      }
    },
    update(state, dt, time) {
      if (input.keys.has("arrowleft") || input.keys.has("a")) {
        state.boatX -= 280 * dt;
      }
      if (input.keys.has("arrowright") || input.keys.has("d")) {
        state.boatX += 280 * dt;
      }
      state.boatX = clamp(state.boatX, 150, W - 150);

      for (const bubble of state.bubbles) {
        bubble.y -= bubble.speed * dt;
        bubble.x += Math.sin(time * bubble.sway + bubble.phase) * 12 * dt;
        if (bubble.y < 130) {
          bubble.x = rand(60, W - 60);
          bubble.y = H + rand(10, 120);
          bubble.size = rand(16, 40);
        }
      }

      for (let i = 0; i < state.fish.length; i += 1) {
        const fish = state.fish[i];
        if (state.hook.fishIndex === i) {
          continue;
        }
        fish.x += fish.vx * dt;
        fish.y += Math.sin(time * 1.8 + fish.bobPhase) * 8 * dt;
        if (fish.x < -fish.w) {
          fish.x = W + fish.w;
        }
        if (fish.x > W + fish.w) {
          fish.x = -fish.w;
        }
      }

      const anchor = getHookAnchor(state);
      if (state.hook.state === "idle") {
        state.hook.x = anchor.x;
        state.hook.y = anchor.y + 16;
        state.hook.fishIndex = -1;
      } else if (state.hook.state === "drop") {
        state.hook.x = anchor.x;
        state.hook.y += 420 * dt;
        for (let i = 0; i < state.fish.length; i += 1) {
          const fish = state.fish[i];
          if (Math.abs(state.hook.x - fish.x) < fish.w * 0.26 && Math.abs(state.hook.y - fish.y) < fish.h * 0.22) {
            state.hook.fishIndex = i;
            state.hook.state = "reel";
            state.status = `Hooked ${fish.template.name}`;
            break;
          }
        }
        if (state.hook.y > H - 92) {
          state.hook.state = "reel";
        }
      } else if (state.hook.state === "reel") {
        state.hook.x = anchor.x;
        state.hook.y -= 520 * dt;
        if (state.hook.fishIndex >= 0) {
          const fish = state.fish[state.hook.fishIndex];
          fish.x = state.hook.x;
          fish.y = state.hook.y + 28;
          fish.vx = Math.abs(fish.vx);
        }
        if (state.hook.y <= anchor.y + 16) {
          if (state.hook.fishIndex >= 0) {
            const caught = state.fish[state.hook.fishIndex];
            state.score += caught.value;
            state.catches += 1;
            state.lastCatch = caught.template.name;
            state.status = `Caught ${caught.template.name} for ${caught.value}`;
            state.fish[state.hook.fishIndex] = makeFish(state.hook.fishIndex);
            const newUnlocked = unlockedBoatIndex(state.score);
            if (newUnlocked > state.unlockedBoatIndex) {
              state.unlockedBoatIndex = newUnlocked;
              state.boatIndex = newUnlocked;
              selectedBoatIndex = newUnlocked;
              state.status = `${boatOptions[newUnlocked].label.replace(/^[0-9]+\.\s*/, "")} unlocked`;
            }
          } else {
            state.status = "Empty hook";
          }
          state.hook.state = "idle";
          state.hook.fishIndex = -1;
        }
      }
    },
    draw(state, time) {
      drawBackground("#7bd9ff", "#0b5f8d", time, "rgba(56,189,248,0.88)");
      const anchor = getHookAnchor(state);

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillRect(0, 106, W, 8);
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      for (let i = 0; i < 6; i += 1) {
        ctx.fillRect(0, 140 + i * 84 + Math.sin(time * 1.2 + i) * 4, W, 2);
      }

      for (const prop of backgroundProps) {
        drawSprite(prop.image, prop.x + Math.sin(time * prop.sway) * 6, H - 176 - prop.h, prop.w, prop.h, { alpha: prop.alpha });
      }

      for (const bubble of state.bubbles) {
        drawSprite(bubble.sprite, bubble.x, bubble.y, bubble.size, bubble.size);
      }

      for (const fish of state.fish) {
        drawSprite(fish.template.image, fish.x - fish.w / 2, fish.y - fish.h / 2, fish.w, fish.h, { flip: fish.vx > 0 });
      }

      for (let x = 0; x < W + 64; x += 118) {
        drawSprite(sprites.sandFill, x, H - 124, 118, 132);
        drawSprite(sprites.sandTop, x, H - 170, 118, 74);
      }
      for (const prop of foregroundProps) {
        const swayX = prop.sway ? Math.sin(time * prop.sway) * 7 : 0;
        drawSprite(prop.image, prop.x + swayX, prop.y, prop.w, prop.h);
      }

      ctx.strokeStyle = "#eff6ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(state.hook.x, state.hook.y);
      ctx.stroke();
      ctx.fillStyle = "#eff6ff";
      ctx.beginPath();
      ctx.arc(state.hook.x, state.hook.y, 7, 0, Math.PI * 2);
      ctx.fill();

      const boat = getBoat(state);
      drawSprite(
        boat.image,
        state.boatX - boat.drawW / 2,
        18,
        boat.drawW,
        boat.drawH,
        { sx: boat.sx, sy: boat.sy, sw: boat.sw, sh: boat.sh }
      );

      drawLabel("Press 1-6 To Swap Boats", 34, 54, 20, "rgba(255,255,255,0.88)");
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Fish caught ${state.catches} | Level ${state.unlockedBoatIndex + 1}/${boatOptions.length} | Boat ${getBoat(state).label.replace(/^[0-9]+\.\s*/, "")}`,
        banner: state.status,
        footer: `Old boats start the run and newer boats unlock at ${boatOptions.map((boat) => boat.unlockScore).slice(1).join(", ")} score.`
      };
    }
  };
})();

function createEmbeddedGame(config) {
  return {
    name: config.name,
    description: config.description,
    controls: config.controls,
    stageTitle: config.stageTitle,
    stageHelp: config.stageHelp,
    embedUrl: config.embedUrl,
    createState() {
      return {
        status: `Loading ${config.name}...`
      };
    },
    getExtras() {
      return {
        title: "Launch Options",
        items: [
          { id: "reload", label: "Reload Stage", active: false },
          { id: "open", label: "Open Full Page", active: false }
        ]
      };
    },
    handleExtra(state, id) {
      if (id === "reload") {
        syncStageSurface(true);
        state.status = `${config.name} reloading`;
        return;
      }
      if (id === "open") {
        window.open(config.embedUrl, "_blank", "noopener");
        state.status = `${config.name} opened in new tab`;
      }
    },
    update() {},
    draw() {},
    hud(state) {
      return {
        value: "Ready",
        copy: config.hudCopy,
        banner: state.status,
        footer: config.footer
      };
    }
  };
}

const foosballSuiteGame = createEmbeddedGame({
  name: "Foosball Frenzy",
  description: "Play the full foosball demo inside the arcade suite with grouped rods, kicks, and live score tracking.",
  controls: "Click inside the stage, then use W/S for defenders, Arrow keys for midfield and attack, and Space to kick.",
  stageTitle: "Foosball Frenzy",
  stageHelp: "This loads the full standalone foosball page inside the arcade suite. Click inside the field first so the controls go to the game.",
  embedUrl: "/foosball.html",
  hudCopy: "Embedded full-page foosball with grouped rods, live stamina bars, and auto-reset ball recovery.",
  footer: "Use Reload Stage if the embedded foosball field gets stuck, or Open Full Page if you want it in its original layout."
});

const spaceInvadersSuiteGame = createEmbeddedGame({
  name: "Space Invaders",
  description: "Play the full standalone Space Invaders page inside the arcade suite with waves, bosses, lives, and power-ups.",
  controls: "Click inside the stage, then use Left/Right or A/D to move and Space to fire.",
  stageTitle: "Space Invaders",
  stageHelp: "This loads the full standalone Space Invaders page inside the arcade suite. Click inside the stage first so the shooter gets keyboard focus.",
  embedUrl: "/space-invaders/index.html",
  hudCopy: "Embedded arcade shooter with score, waves, lives, and power-up runs inside the suite.",
  footer: "Use Reload Stage to restart the embedded shooter quickly, or Open Full Page if you want the original standalone view."
});

const games = {
  pong: pongGame,
  maze: mazeGame,
  crossing: crossingGame,
  flappy: flappyGame,
  whack: whackGame,
  basketball: basketballGame,
  dodge: dodgeGame,
  racer: racerGame,
  fishing: fishingGame,
  foosball: foosballSuiteGame,
  invaders: spaceInvadersSuiteGame
};

const gameOrder = Object.keys(games);

function updateHud() {
  if (!currentGame || !currentState) {
    return;
  }
  const hud = currentGame.hud(currentState);
  suiteScoreValue.textContent = hud.value;
  suiteScoreCopy.textContent = hud.copy;
  statusBanner.textContent = hud.banner;
  footerNote.textContent = hud.footer;
}

function syncStageCopy() {
  if (!currentGame || !currentState) {
    return;
  }
  stageTitle.textContent = currentGame.stageTitle;
  stageHelp.textContent = typeof currentGame.getStageHelp === "function"
    ? currentGame.getStageHelp(currentState)
    : currentGame.stageHelp;
}

function renderExtras() {
  if (!currentGame || !currentState || !currentGame.getExtras) {
    suiteExtras.hidden = true;
    suiteExtrasBody.innerHTML = "";
    return;
  }

  const extras = currentGame.getExtras(currentState);
  if (!extras || !extras.items || !extras.items.length) {
    suiteExtras.hidden = true;
    suiteExtrasBody.innerHTML = "";
    return;
  }

  suiteExtras.hidden = false;
  suiteExtrasTitle.textContent = extras.title || "Game Options";
  suiteExtrasBody.innerHTML = "";
  for (const item of extras.items) {
    const button = document.createElement("button");
    button.className = `game-tab extra-btn${item.active ? " active" : ""}`;
    button.textContent = item.label;
    button.disabled = Boolean(item.disabled);
    button.addEventListener("click", () => {
      currentGame.handleExtra(currentState, item.id);
      renderExtras();
      syncStageCopy();
      updateHud();
    });
    suiteExtrasBody.appendChild(button);
  }
}

function renderTabs() {
  gameList.innerHTML = "";
  for (const id of gameOrder) {
    const button = document.createElement("button");
    button.className = `game-tab${id === currentId ? " active" : ""}`;
    button.textContent = games[id].name;
    button.addEventListener("click", () => switchGame(id));
    gameList.appendChild(button);
  }
}

function syncCanvasCursor() {
  if (!currentGame || isEmbeddedGame()) {
    canvas.style.cursor = "default";
    return;
  }
  if (typeof currentGame.getCursor === "function") {
    canvas.style.cursor = currentGame.getCursor(currentState) || "default";
    return;
  }
  canvas.style.cursor = currentGame.cursor || "default";
}

function switchGame(id) {
  currentId = games[id] ? id : "pong";
  currentGame = games[currentId];
  currentState = currentGame.createState();

  suiteGameName.textContent = currentGame.name;
  suiteGameDesc.textContent = currentGame.description;
  suiteControls.textContent = currentGame.controls;

  const url = new URL(window.location.href);
  url.searchParams.set("game", currentId);
  window.history.replaceState({}, "", url);

  syncStageSurface();
  renderTabs();
  renderExtras();
  syncStageCopy();
  updateHud();
  syncCanvasCursor();
}

restartBtn.addEventListener("click", () => {
  resetCurrentGame();
  updateHud();
});

randomBtn.addEventListener("click", () => {
  const choices = gameOrder.filter((id) => id !== currentId);
  switchGame(pick(choices));
});

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key) || ["w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }
  input.keys.add(key);
  if (currentGame && currentGame.keydown) {
    currentGame.keydown(currentState, key, event);
    renderExtras();
    updateHud();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  input.keys.delete(key);
  if (currentGame && currentGame.keyup) {
    currentGame.keyup(currentState, key, event);
  }
});

canvas.addEventListener("pointermove", (event) => {
  const point = mouseToCanvas(event);
  input.pointer.x = point.x;
  input.pointer.y = point.y;
  input.pointer.inside = true;
  if (currentGame && currentGame.pointermove) {
    currentGame.pointermove(currentState, point, event);
  }
  syncCanvasCursor();
});

canvas.addEventListener("pointerdown", (event) => {
  const point = mouseToCanvas(event);
  input.pointer.x = point.x;
  input.pointer.y = point.y;
  input.pointer.down = true;
  input.pointer.inside = true;
  if (currentGame && currentGame.pointerdown) {
    currentGame.pointerdown(currentState, point, event);
  }
  syncCanvasCursor();
});

canvas.addEventListener("pointerup", (event) => {
  const point = mouseToCanvas(event);
  input.pointer.x = point.x;
  input.pointer.y = point.y;
  input.pointer.down = false;
  if (currentGame && currentGame.pointerup) {
    currentGame.pointerup(currentState, point, event);
  }
  syncCanvasCursor();
});

canvas.addEventListener("pointerleave", () => {
  input.pointer.down = false;
  input.pointer.inside = false;
  syncCanvasCursor();
});

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;

  if (currentGame && currentState) {
    currentGame.update(currentState, dt, now / 1000);
    currentGame.draw(currentState, now / 1000);
    renderExtras();
    updateHud();
  }

  syncCanvasCursor();

  window.requestAnimationFrame(frame);
}

switchGame(params.get("game") || "pong");
window.requestAnimationFrame(frame);
