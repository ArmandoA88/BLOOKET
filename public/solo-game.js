const params = new URLSearchParams(window.location.search);
const embedMode = params.get("embed") === "1";

if (embedMode) {
  document.body.classList.add("embed-mode");
}

const refs = {
  title: document.getElementById("gameTitle"),
  description: document.getElementById("gameDescription"),
  primaryLabel: document.getElementById("primaryStatLabel"),
  primaryValue: document.getElementById("primaryStatValue"),
  secondaryLabel: document.getElementById("secondaryStatLabel"),
  secondaryValue: document.getElementById("secondaryStatValue"),
  bestValue: document.getElementById("bestStatValue"),
  controls: document.getElementById("gameControls"),
  note: document.getElementById("gameNote"),
  restartBtn: document.getElementById("restartBtn"),
  statusPill: document.getElementById("statusPill"),
  stageTitle: document.getElementById("stageTitle"),
  stageHelp: document.getElementById("stageHelp"),
  canvasWrap: document.getElementById("canvasWrap"),
  boardWrap: document.getElementById("boardWrap"),
  boardStage: document.getElementById("boardStage"),
  actions: document.getElementById("gameActions"),
  backLink: document.getElementById("backToSuiteLink"),
  canvas: document.getElementById("gameCanvas")
};

if (embedMode && refs.backLink) {
  refs.backLink.hidden = true;
}

const ctx = refs.canvas.getContext("2d");
const W = refs.canvas.width;
const H = refs.canvas.height;
const BEST_KEY_PREFIX = "solo-arcade-best";
const input = {
  keys: new Set()
};

let currentId = "";
let currentGame = null;
let currentState = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function laneCenter(index, total, inset = 210) {
  const span = W - inset * 2;
  return inset + (span / (total - 1 || 1)) * index;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function loadSprite(src) {
  const image = new Image();
  image.src = src;
  return image;
}

const sprites = {
  heroBlue: loadSprite("/assets/standalone/topdown/hero-blue.png"),
  heroBrown: loadSprite("/assets/standalone/topdown/hero-brown.png"),
  robot: loadSprite("/assets/standalone/topdown/robot.png"),
  survivor: loadSprite("/assets/standalone/topdown/survivor.png"),
  playerBlue: loadSprite("/assets/standalone/sports/player-blue.png"),
  playerGreen: loadSprite("/assets/standalone/sports/player-green.png"),
  playerRed: loadSprite("/assets/standalone/sports/player-red.png"),
  soccerBall: loadSprite("/assets/standalone/sports/ball-soccer.png"),
  soccerBall2: loadSprite("/assets/standalone/sports/ball-soccer-2.png"),
  soccerBall3: loadSprite("/assets/standalone/sports/ball-soccer-3.png"),
  soccerBall4: loadSprite("/assets/standalone/sports/ball-soccer-4.png"),
  football: loadSprite("/assets/standalone/sports/ball-football.png"),
  genericBall: loadSprite("/assets/standalone/sports/ball-generic.png"),
  boxingGlove: loadSprite("/assets/standalone/sports/boxing-glove.png"),
  cardRed: loadSprite("/assets/standalone/sports/card-red.png"),
  cardWhite: loadSprite("/assets/standalone/sports/card-white.png"),
  cardYellow: loadSprite("/assets/standalone/sports/card-yellow.png"),
  batHandle: loadSprite("/assets/standalone/sports/bat-handle.png"),
  flagGreen: loadSprite("/assets/standalone/sports/flag-green.png"),
  grassMownWide: loadSprite("/assets/standalone/sports/ground-grass-mown-wide.png"),
  trex: loadSprite("/assets/standalone/dinos/tyrannosaurus.png"),
  triceratops: loadSprite("/assets/standalone/dinos/triceratops.png"),
  stegosaurus: loadSprite("/assets/standalone/dinos/stegosaurus.png"),
  velociraptor: loadSprite("/assets/standalone/dinos/velociraptor.png"),
  shipScout: loadSprite("/assets/standalone/space/playerShip1_blue.png"),
  shipComet: loadSprite("/assets/standalone/space/playerShip2_green.png"),
  shipRanger: loadSprite("/assets/standalone/space/playerShip2_orange.png"),
  shipSentinel: loadSprite("/assets/standalone/space/playerShip3_red.png"),
  laserBlue: loadSprite("/assets/standalone/space/laserBlue01.png"),
  laserGreen: loadSprite("/assets/standalone/space/laserGreen01.png"),
  laserRed: loadSprite("/assets/standalone/space/laserRed01.png"),
  powerBoost: loadSprite("/assets/standalone/space/powerupBlue_bolt.png"),
  powerShield: loadSprite("/assets/standalone/space/powerupGreen_shield.png"),
  powerTech: loadSprite("/assets/standalone/space/powerupYellow_star.png"),
  meteorBrownBig1: loadSprite("/assets/standalone/space/meteorBrown_big1.png"),
  meteorBrownBig4: loadSprite("/assets/standalone/space/meteorBrown_big4.png"),
  meteorGreyBig2: loadSprite("/assets/standalone/space/meteorGrey_big2.png"),
  meteorBrownMed1: loadSprite("/assets/standalone/space/meteorBrown_med1.png"),
  meteorBrownMed3: loadSprite("/assets/standalone/space/meteorBrown_med3.png"),
  meteorGreyMed2: loadSprite("/assets/standalone/space/meteorGrey_med2.png"),
  meteorBrownSmall1: loadSprite("/assets/standalone/space/meteorBrown_small1.png"),
  meteorBrownTiny1: loadSprite("/assets/standalone/space/meteorBrown_tiny1.png"),
  meteorGreySmall2: loadSprite("/assets/standalone/space/meteorGrey_small2.png"),
  goalieGoal: loadSprite("/assets/standalone/goalie-rush/goal-frame.svg"),
  goalieGloves: loadSprite("/assets/standalone/goalie-rush/keeper-gloves.svg"),
  goaliePowerMagnet: loadSprite("/assets/standalone/goalie-rush/powerup-magnet.svg"),
  goaliePowerSlow: loadSprite("/assets/standalone/goalie-rush/powerup-slow.svg"),
  goaliePowerShield: loadSprite("/assets/standalone/goalie-rush/powerup-shield.svg"),
  hallwayLockers: loadSprite("/assets/standalone/hallway/locker-bank.svg"),
  hallwayDoor: loadSprite("/assets/standalone/hallway/classroom-door.svg"),
  hallwayBoard: loadSprite("/assets/standalone/hallway/bulletin-board.svg"),
  hallwayPass: loadSprite("/assets/standalone/hallway/hall-pass.svg"),
  hallwayBackpack: loadSprite("/assets/standalone/hallway/backpack.svg"),
  hallwayWetFloor: loadSprite("/assets/standalone/hallway/wet-floor-sign.svg"),
  hallwayBookStack: loadSprite("/assets/standalone/hallway/book-stack.svg"),
  hallwayScienceBoard: loadSprite("/assets/standalone/hallway/science-board.svg"),
  studentFaceA: loadSprite("/assets/student-sprites/students1_face_12.png"),
  studentFaceB: loadSprite("/assets/student-sprites/students1_face_20.png"),
  studentFaceC: loadSprite("/assets/student-sprites/students2_face_04.png"),
  studentFaceD: loadSprite("/assets/student-sprites/students1_face_03.png"),
  studentFaceE: loadSprite("/assets/student-sprites/students1_face_08.png"),
  studentFaceF: loadSprite("/assets/student-sprites/students1_face_17.png"),
  studentFaceG: loadSprite("/assets/student-sprites/students2_face_02.png"),
  studentFaceH: loadSprite("/assets/student-sprites/students2_face_09.png"),
  digSiteScene: loadSprite("/assets/standalone/dino-dig/dig-site-scene.svg"),
  digFossilSkull: loadSprite("/assets/standalone/dino-dig/fossil-skull.svg"),
  digFossilRibs: loadSprite("/assets/standalone/dino-dig/fossil-ribs.svg"),
  digBoneBundle: loadSprite("/assets/standalone/dino-dig/bone-bundle.svg"),
  digCoinCache: loadSprite("/assets/standalone/dino-dig/coin-cache.svg"),
  digDust: loadSprite("/assets/standalone/dino-dig/dust-cloud.svg"),
  digMarker: loadSprite("/assets/standalone/dino-dig/dig-marker.svg"),
  matchRainbowRocket: loadSprite("/assets/standalone/shadow-match/rainbow-rocket.svg"),
  matchTreasureChest: loadSprite("/assets/standalone/shadow-match/treasure-chest.svg"),
  matchDinoEgg: loadSprite("/assets/standalone/shadow-match/dino-egg.svg"),
  matchRobotBuddy: loadSprite("/assets/standalone/shadow-match/robot-buddy.svg"),
  matchOctopusPal: loadSprite("/assets/standalone/shadow-match/octopus-pal.svg"),
  matchMagicWand: loadSprite("/assets/standalone/shadow-match/magic-wand.svg"),
  matchDragonKite: loadSprite("/assets/standalone/shadow-match/dragon-kite.svg"),
  matchCupcakeCastle: loadSprite("/assets/standalone/shadow-match/cupcake-castle.svg"),
  battleArenaStadium: loadSprite("/assets/standalone/battle-royale/arena-stadium.svg"),
  pokemonBulbasaur: loadSprite("/assets/pokemon/pokemon-bulbasaur.png"),
  pokemonCharmander: loadSprite("/assets/pokemon/pokemon-charmander.png"),
  pokemonSquirtle: loadSprite("/assets/pokemon/pokemon-squirtle.png"),
  pokemonPikachu: loadSprite("/assets/pokemon/pokemon-pikachu.png"),
  pokemonJigglypuff: loadSprite("/assets/pokemon/pokemon-jigglypuff.png"),
  pokemonMeowth: loadSprite("/assets/pokemon/pokemon-meowth.png"),
  pokemonPsyduck: loadSprite("/assets/pokemon/pokemon-psyduck.png"),
  pokemonEevee: loadSprite("/assets/pokemon/pokemon-eevee.png"),
  pokemonGengar: loadSprite("/assets/pokemon/pokemon-gengar.png"),
  pokemonGyarados: loadSprite("/assets/pokemon/pokemon-gyarados.png"),
  pokemonLapras: loadSprite("/assets/pokemon/pokemon-lapras.png"),
  pokemonSnorlax: loadSprite("/assets/pokemon/pokemon-snorlax.png"),
  pokemonDragonite: loadSprite("/assets/pokemon/pokemon-dragonite.png"),
  pokemonUmbreon: loadSprite("/assets/pokemon/pokemon-umbreon.png"),
  pokemonCharizard: loadSprite("/assets/pokemon/pokemon-charizard.png"),
  pokemonMew: loadSprite("/assets/pokemon/pokemon-mew.png"),
  pokemonLucario: loadSprite("/assets/pokemon/pokemon-lucario.png"),
  pokemonGreninja: loadSprite("/assets/pokemon/pokemon-greninja.png"),
  pokemonMewtwo: loadSprite("/assets/pokemon/pokemon-mewtwo.png"),
  pokemonRayquaza: loadSprite("/assets/pokemon/pokemon-rayquaza.png"),
  pokemonStadiumBowl: loadSprite("/assets/standalone/pokemon-stadium/stadium-bowl.svg")
};

function getBestScore(id) {
  return Number(window.localStorage.getItem(`${BEST_KEY_PREFIX}:${id}`) || 0);
}

function setBestScore(id, value) {
  const normalized = Math.max(0, Math.round(value || 0));
  if (normalized > getBestScore(id)) {
    window.localStorage.setItem(`${BEST_KEY_PREFIX}:${id}`, String(normalized));
  }
}

function drawRoundedRect(x, y, w, h, r, fillStyle, strokeStyle = "", lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSprite(image, x, y, w, h, options = {}) {
  const {
    alpha = 1,
    angle = 0
  } = options;

  if (!image || !image.complete || !image.naturalWidth) {
    drawRoundedRect(x, y, w, h, 14, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)");
    return;
  }

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawText(text, x, y, size, color, align = "center", font = "Orbitron") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px "${font}", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function clearCanvas(background = "#07111d") {
  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function createParticles(count, x, y, color) {
  return Array.from({ length: count }, () => ({
    x,
    y,
    vx: rand(-140, 140),
    vy: rand(-140, 140),
    size: rand(4, 9),
    life: rand(0.4, 0.8),
    color
  }));
}

function updateParticles(state, dt) {
  state.particles = (state.particles || []).filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.size *= 0.985;
    return particle.life > 0;
  });
}

function drawParticles(state) {
  for (const particle of state.particles || []) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life * 1.4, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStarField(now, density = 32) {
  for (let i = 0; i < density; i += 1) {
    const x = (i * 157) % W;
    const y = ((i * 263) + now * 18 * (1 + (i % 4))) % H;
    const alpha = 0.18 + ((i % 5) * 0.07);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 3 === 0 ? "#ffd447" : "#d7f2ff";
    ctx.fillRect(x, y, 2 + (i % 2), 2 + (i % 2));
    ctx.restore();
  }
}

function getCurrentBestValue() {
  if (!currentGame || !currentState) {
    return 0;
  }
  if (typeof currentGame.getBestValue === "function") {
    return currentGame.getBestValue(currentState);
  }
  return currentState.score || 0;
}

function syncBestValue() {
  const value = getCurrentBestValue();
  setBestScore(currentId, value);
  refs.bestValue.textContent = String(getBestScore(currentId));
}

function renderStats() {
  if (!currentGame || !currentState) {
    return;
  }
  const stats = currentGame.getStats(currentState);
  refs.primaryLabel.textContent = stats.primaryLabel;
  refs.primaryValue.textContent = String(stats.primaryValue);
  refs.secondaryLabel.textContent = stats.secondaryLabel;
  refs.secondaryValue.textContent = String(stats.secondaryValue);
  refs.statusPill.textContent = stats.status;
  syncBestValue();
}

function renderActions() {
  if (!currentGame || !currentState || typeof currentGame.getActions !== "function") {
    refs.actions.innerHTML = "";
    refs.actions.dataset.signature = "";
    return;
  }

  const actions = currentGame.getActions(currentState) || [];
  const signature = JSON.stringify(actions.map((action) => [
    action.id,
    action.label,
    Boolean(action.disabled),
    action.className || ""
  ]));
  if (refs.actions.dataset.signature === signature) {
    return;
  }
  refs.actions.dataset.signature = signature;
  refs.actions.innerHTML = "";
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action-btn ${action.className || ""}`.trim();
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);
    button.addEventListener("click", () => {
      currentGame.act(currentState, action.id);
      renderActions();
      renderStats();
      renderBoard(true);
    });
    refs.actions.appendChild(button);
  }
}

function renderBoard(force = false) {
  if (!currentGame || currentGame.type !== "board" || !currentState) {
    return;
  }
  if (!force && !currentState.dirty) {
    return;
  }
  currentGame.render(currentState, refs.boardStage);
  currentState.dirty = false;
}

function useSurface(type) {
  refs.canvasWrap.classList.toggle("hidden", type !== "canvas");
  refs.boardWrap.classList.toggle("hidden", type !== "board");
}

function markDirty() {
  if (currentState) {
    currentState.dirty = true;
  }
}

function createAsteroidsGame() {
  const shipSkins = [
    { name: "Rocket Buddy", sprite: sprites.shipScout, accent: "#68d1ff" },
    { name: "Comet Striker", sprite: sprites.shipComet, accent: "#7dedb0" },
    { name: "Eclipse Ranger", sprite: sprites.shipRanger, accent: "#ffd447" },
    { name: "Supernova Sentinel", sprite: sprites.shipSentinel, accent: "#ff8f8f" }
  ];
  const asteroidStats = {
    large: { radius: 48, minSpeed: 34, maxSpeed: 62, points: 45, next: "medium", debris: 24 },
    medium: { radius: 30, minSpeed: 58, maxSpeed: 92, points: 85, next: "small", debris: 18 },
    small: { radius: 18, minSpeed: 92, maxSpeed: 136, points: 130, next: null, debris: 12 }
  };
  const asteroidSprites = {
    large: [sprites.meteorBrownBig1, sprites.meteorGreyBig2, sprites.meteorBrownBig4],
    medium: [sprites.meteorBrownMed1, sprites.meteorGreyMed2, sprites.meteorBrownMed3],
    small: [sprites.meteorBrownSmall1, sprites.meteorGreySmall2, sprites.meteorBrownTiny1]
  };
  const pickupTypes = {
    boost: { id: "boost", label: "Booster", sprite: sprites.powerBoost, color: "#68d1ff" },
    shield: { id: "shield", label: "Shield Cell", sprite: sprites.powerShield, color: "#7dedb0" },
    tech: { id: "tech", label: "Laser Core", sprite: sprites.powerTech, color: "#ffd447" }
  };
  const laserSprites = [sprites.laserBlue, sprites.laserGreen, sprites.laserRed];
  const upgradeThresholds = [0, 8, 18, 34];
  const safeRadius = 160;

  function wrapValue(value, max, padding = 0) {
    if (value < -padding) {
      return max + padding;
    }
    if (value > max + padding) {
      return -padding;
    }
    return value;
  }

  function wrappedDistanceSq(a, b) {
    let dx = Math.abs(a.x - b.x);
    let dy = Math.abs(a.y - b.y);
    dx = Math.min(dx, W - dx);
    dy = Math.min(dy, H - dy);
    return dx * dx + dy * dy;
  }

  function forwardVector(angle) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  function sideVector(angle) {
    return { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) };
  }

  function getUpgradeTier(tech) {
    let tier = 0;
    while (tier + 1 < upgradeThresholds.length && tech >= upgradeThresholds[tier + 1]) {
      tier += 1;
    }
    return tier;
  }

  function currentSkin(state) {
    return shipSkins[Math.min(state.shipSkin, state.unlockedSkinCount - 1)];
  }

  function createShip() {
    return {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 24,
      fireCooldown: 0,
      invuln: 2.2,
      boostCharge: 100,
      burst: 0,
      engineGlow: 0
    };
  }

  function applyUpgradeTier(state, quiet = false) {
    const previousTier = typeof state.upgradeTier === "number" ? state.upgradeTier : -1;
    const nextTier = getUpgradeTier(state.tech);
    state.upgradeTier = nextTier;
    state.unlockedSkinCount = Math.min(shipSkins.length, nextTier + 1);
    state.enginePower = 210 + nextTier * 28;
    state.turnSpeed = 3.5 + nextTier * 0.18;
    state.topSpeed = 255 + nextTier * 24;
    state.boostPower = 170 + nextTier * 32;
    state.reloadTime = Math.max(0.12, 0.26 - nextTier * 0.04);
    state.maxBoostCharge = 100 + nextTier * 18;
    state.maxShields = 3 + (nextTier >= 3 ? 1 : 0);
    state.laserTier = nextTier >= 3 ? 3 : nextTier >= 2 ? 2 : 1;
    state.shields = Math.min(state.shields, state.maxShields);
    state.ship.boostCharge = clamp(state.ship.boostCharge, 0, state.maxBoostCharge);
    if (state.shipSkin >= state.unlockedSkinCount) {
      state.shipSkin = state.unlockedSkinCount - 1;
    }
    if (!quiet && previousTier >= 0 && nextTier > previousTier) {
      state.shields = Math.min(state.maxShields, state.shields + 1);
      state.ship.boostCharge = Math.min(state.maxBoostCharge, state.ship.boostCharge + 28);
      state.ship.invuln = Math.max(state.ship.invuln, 1.2);
      state.feedback = `${shipSkins[nextTier].name} unlocked with better boosters and laser guns.`;
    }
  }

  function createAsteroid(state, size, overrides = {}) {
    const stats = asteroidStats[size];
    let x = typeof overrides.x === "number" ? overrides.x : rand(0, W);
    let y = typeof overrides.y === "number" ? overrides.y : rand(0, H);
    if (!overrides.allowNearShip) {
      let attempts = 0;
      while (attempts < 24 && wrappedDistanceSq({ x, y }, state.ship) < (safeRadius + stats.radius) ** 2) {
        x = rand(0, W);
        y = rand(0, H);
        attempts += 1;
      }
    }

    let vx;
    let vy;
    if (typeof overrides.vx === "number" && typeof overrides.vy === "number") {
      vx = overrides.vx;
      vy = overrides.vy;
    } else {
      const angle = typeof overrides.angle === "number" ? overrides.angle : rand(0, Math.PI * 2);
      const speed = rand(stats.minSpeed, stats.maxSpeed) + state.wave * 5;
      vx = Math.cos(angle) * speed + (overrides.inheritVx || 0);
      vy = Math.sin(angle) * speed + (overrides.inheritVy || 0);
    }

    return {
      size,
      x,
      y,
      vx,
      vy,
      angle: typeof overrides.rotation === "number" ? overrides.rotation : rand(0, Math.PI * 2),
      spin: typeof overrides.spin === "number" ? overrides.spin : rand(-1.5, 1.5),
      radius: stats.radius,
      sprite: overrides.sprite || pick(asteroidSprites[size])
    };
  }

  function spawnWave(state, initial = false) {
    const largeCount = Math.min(3 + Math.floor(state.wave / 2), 7);
    state.asteroids = [];
    for (let i = 0; i < largeCount; i += 1) {
      state.asteroids.push(createAsteroid(state, "large"));
    }
    state.nextWaveTimer = 0;
    state.feedback = initial ? "Thrusters hot. Clear the sector." : `Wave ${state.wave} dropped in from the rim.`;
  }

  function maybeDropPickup(state, asteroid) {
    if (Math.random() > 0.38) {
      return;
    }
    const roll = Math.random();
    let config = pickupTypes.boost;
    if (roll > 0.72) {
      config = pickupTypes.shield;
    } else if (roll > 0.42) {
      config = pickupTypes.tech;
    }

    state.pickups.push({
      kind: config.id,
      label: config.label,
      x: asteroid.x,
      y: asteroid.y,
      vx: rand(-24, 24),
      vy: rand(-24, 24),
      radius: 18,
      sprite: config.sprite,
      color: config.color,
      life: 10,
      angle: rand(0, Math.PI * 2),
      spin: rand(-2.6, 2.6)
    });
  }

  function shatterAsteroid(state, asteroid) {
    const stats = asteroidStats[asteroid.size];
    const previousTier = state.upgradeTier;
    let feedback = `Asteroid cracked for ${stats.points} points.`;

    state.score += stats.points + state.wave * 5;
    state.streak += 1;
    if (asteroid.size === "medium") {
      state.tech += 1;
    }
    if (asteroid.size === "small") {
      state.tech += 2;
    }
    applyUpgradeTier(state);
    state.particles.push(...createParticles(stats.debris, asteroid.x, asteroid.y, asteroid.size === "small" ? "#ffd447" : "#d7f2ff"));

    if (stats.next) {
      const nextStats = asteroidStats[stats.next];
      const heading = Math.atan2(asteroid.vy, asteroid.vx) || rand(0, Math.PI * 2);
      for (const dir of [-1, 1]) {
        state.asteroids.push(createAsteroid(state, stats.next, {
          x: asteroid.x + dir * nextStats.radius * 0.28,
          y: asteroid.y + rand(-8, 8),
          angle: heading + dir * rand(0.55, 1.05),
          inheritVx: asteroid.vx * 0.24,
          inheritVy: asteroid.vy * 0.24,
          rotation: asteroid.angle + dir * 0.14,
          spin: rand(-2.2, 2.2)
        }));
      }
      feedback = `${stats.points} points. Rock split apart.`;
    }

    maybeDropPickup(state, asteroid);
    if (state.upgradeTier === previousTier) {
      state.feedback = feedback;
    }
  }

  function cycleShip(state, direction = 1) {
    state.shipSkin = (state.shipSkin + direction + state.unlockedSkinCount) % state.unlockedSkinCount;
    state.feedback = `Ship skin switched to ${currentSkin(state).name}.`;
  }

  function burstBoost(state) {
    if (state.over || state.ship.boostCharge < 18) {
      return;
    }
    const forward = forwardVector(state.ship.angle);
    state.ship.vx += forward.x * 120;
    state.ship.vy += forward.y * 120;
    state.ship.boostCharge = Math.max(0, state.ship.boostCharge - 18);
    state.ship.burst = Math.max(state.ship.burst, 0.34);
    state.feedback = "Booster burst engaged.";
  }

  function fireWeapons(state) {
    const ship = state.ship;
    const side = sideVector(ship.angle);
    const bulletSpeed = 480 + state.upgradeTier * 34;
    const bulletSprite = laserSprites[state.laserTier - 1];
    const patterns = state.laserTier === 3 ? [-0.26, 0, 0.26] : state.laserTier === 2 ? [-0.1, 0.1] : [0];

    for (const spread of patterns) {
      const shotAngle = ship.angle + spread;
      const shotForward = forwardVector(shotAngle);
      const lateral = patterns.length === 1 ? 0 : spread * 80;
      state.bullets.push({
        x: ship.x + shotForward.x * 30 + side.x * lateral,
        y: ship.y + shotForward.y * 30 + side.y * lateral,
        vx: shotForward.x * bulletSpeed + ship.vx * 0.15,
        vy: shotForward.y * bulletSpeed + ship.vy * 0.15,
        angle: shotAngle,
        life: 1.15,
        radius: 10,
        sprite: bulletSprite,
        glow: currentSkin(state).accent
      });
    }

    ship.fireCooldown = state.reloadTime;
    ship.engineGlow = Math.min(1, ship.engineGlow + 0.2);
    const nose = forwardVector(ship.angle);
    state.particles.push(...createParticles(6, ship.x + nose.x * 18, ship.y + nose.y * 18, currentSkin(state).accent));
  }

  function collectPickup(state, pickup) {
    const previousTier = state.upgradeTier;
    state.score += 20;
    state.particles.push(...createParticles(14, pickup.x, pickup.y, pickup.color));

    if (pickup.kind === "boost") {
      state.ship.boostCharge = Math.min(state.maxBoostCharge, state.ship.boostCharge + 42);
      state.ship.burst = Math.max(state.ship.burst, 0.16);
      state.feedback = "Booster canister loaded.";
      return;
    }
    if (pickup.kind === "shield") {
      state.shields = Math.min(state.maxShields, state.shields + 1);
      state.ship.invuln = Math.max(state.ship.invuln, 1.4);
      state.feedback = "Shield cell restored your hull.";
      return;
    }

    state.tech += 4;
    applyUpgradeTier(state);
    if (state.upgradeTier === previousTier) {
      state.feedback = "Laser core recovered from the field.";
    }
  }

  function damageShip(state) {
    if (state.ship.invuln > 0 || state.over) {
      return;
    }

    state.shields -= 1;
    state.streak = 0;
    state.particles.push(...createParticles(28, state.ship.x, state.ship.y, "#ff8f8f"));
    if (state.shields <= 0) {
      state.over = true;
      state.feedback = "Your ship broke apart in the debris field.";
      return;
    }

    state.ship.x = W / 2;
    state.ship.y = H / 2;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.angle = -Math.PI / 2;
    state.ship.invuln = 2.4;
    state.ship.burst = 0;
    state.ship.boostCharge = Math.max(22, state.ship.boostCharge * 0.45);
    state.feedback = "Hull clipped. Emergency jump reset the ship.";

    for (const asteroid of state.asteroids) {
      const dx = asteroid.x - state.ship.x;
      const dy = asteroid.y - state.ship.y;
      const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      if (length < 190) {
        asteroid.vx += (dx / length) * 90;
        asteroid.vy += (dy / length) * 90;
      }
    }
  }

  function drawWrappedCopies(x, y, padding, renderer) {
    const offsets = [{ x: 0, y: 0 }];
    if (x < padding) {
      offsets.push({ x: W, y: 0 });
    }
    if (x > W - padding) {
      offsets.push({ x: -W, y: 0 });
    }
    if (y < padding) {
      offsets.push({ x: 0, y: H });
    }
    if (y > H - padding) {
      offsets.push({ x: 0, y: -H });
    }

    const base = offsets.slice();
    for (const offsetX of base) {
      for (const offsetY of base) {
        if (offsetX === offsetY) {
          continue;
        }
        if (offsetX.x !== 0 && offsetY.y !== 0) {
          offsets.push({ x: offsetX.x, y: offsetY.y });
        }
      }
    }

    const seen = new Set();
    for (const offset of offsets) {
      const key = `${offset.x}:${offset.y}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      renderer(x + offset.x, y + offset.y);
    }
  }

  function renderShipDock(state) {
    const dockWidth = 314;
    const dockX = W - dockWidth - 24;
    const dockY = H - 92;

    drawRoundedRect(dockX, dockY, dockWidth, 64, 20, "rgba(4,11,23,0.76)", "rgba(151,214,255,0.16)");
    drawText("Ship Hangar", dockX + 70, dockY + 16, 11, "rgba(244,251,255,0.72)", "left", "Baloo 2");

    for (let i = 0; i < shipSkins.length; i += 1) {
      const unlocked = i < state.unlockedSkinCount;
      const active = i === state.shipSkin;
      const cardX = dockX + 18 + i * 72;
      const cardY = dockY + 18;
      drawRoundedRect(
        cardX,
        cardY,
        54,
        38,
        14,
        active ? "rgba(255,212,71,0.18)" : unlocked ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        active ? "rgba(255,212,71,0.46)" : unlocked ? "rgba(151,214,255,0.2)" : "rgba(255,255,255,0.08)"
      );
      drawSprite(shipSkins[i].sprite, cardX + 9, cardY + 2, 36, 36, { alpha: unlocked ? 1 : 0.18 });
      if (!unlocked) {
        drawText(`T${i + 1}`, cardX + 27, cardY + 30, 10, "rgba(244,251,255,0.72)", "center", "Baloo 2");
      }
    }
  }

  return {
    id: "asteroids",
    type: "canvas",
    name: "Asteroids",
    description: "Pilot a real wraparound starfighter, blast rock clusters apart, and upgrade into stronger ships.",
    controls: "Click inside the stage. Use Left and Right or A and D to rotate, Up or W to thrust, Space or J to fire, Shift or X to burst boost, and Q or E to swap unlocked ships.",
    note: "This solo build now plays like classic Asteroids with locally saved online ship sprites, laser pickups, booster canisters, and upgradeable loadouts.",
    stageTitle: "Asteroids Redux",
    stageHelp: "Fly anywhere in the arena, wrap off one edge to appear on the other, crack large rocks into smaller pieces, and collect boosts, shields, and laser cores.",
    createState() {
      const state = {
        score: 0,
        wave: 1,
        tech: 0,
        upgradeTier: 0,
        laserTier: 1,
        maxShields: 3,
        unlockedSkinCount: 1,
        shipSkin: 0,
        streak: 0,
        shields: 3,
        asteroids: [],
        bullets: [],
        pickups: [],
        feedback: "Thrusters hot. Clear the sector.",
        particles: [],
        over: false,
        nextWaveTimer: 0,
        enginePower: 0,
        turnSpeed: 0,
        topSpeed: 0,
        boostPower: 0,
        reloadTime: 0,
        maxBoostCharge: 100,
        ship: createShip(),
        time: 0
      };
      applyUpgradeTier(state, true);
      spawnWave(state, true);
      return state;
    },
    getActions(state) {
      const actions = [];
      if (state.over) {
        actions.push({ id: "restart", label: "Fly Again", className: "good" });
      }
      actions.push({ id: "swap-skin", label: `Ship: ${currentSkin(state).name}` });
      actions.push({
        id: "boost-burst",
        label: "Boost Burst",
        className: "good",
        disabled: state.ship.boostCharge < 18 || state.over
      });
      return actions;
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
        return;
      }
      if (id === "swap-skin") {
        cycleShip(state, 1);
        return;
      }
      if (id === "boost-burst") {
        burstBoost(state);
      }
    },
    keydown(state, key, event) {
      if ((key === "q" || key === "e") && !event.repeat) {
        cycleShip(state, key === "q" ? -1 : 1);
      }
      if ((key === "shift" || key === "x") && !event.repeat) {
        burstBoost(state);
      }
      if (key === "r" && !event.repeat) {
        startGame(currentId);
      }
    },
    update(state, dt, now) {
      const ship = state.ship;
      state.time = now;
      updateParticles(state, dt);

      if (state.over) {
        return;
      }

      ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
      ship.invuln = Math.max(0, ship.invuln - dt);
      ship.burst = Math.max(0, ship.burst - dt);

      const turnLeft = input.keys.has("arrowleft") || input.keys.has("a");
      const turnRight = input.keys.has("arrowright") || input.keys.has("d");
      const thrustHeld = input.keys.has("arrowup") || input.keys.has("w");
      const fireHeld = input.keys.has(" ") || input.keys.has("j") || input.keys.has("k");
      const boostHeld = input.keys.has("shift");
      const turnInput = (turnRight ? 1 : 0) - (turnLeft ? 1 : 0);

      ship.angle += turnInput * state.turnSpeed * dt;

      const boosting = (thrustHeld && boostHeld && ship.boostCharge > 0) || ship.burst > 0;
      const thrusting = thrustHeld || ship.burst > 0;
      if (thrusting) {
        const thrustVector = forwardVector(ship.angle);
        let accel = state.enginePower;
        if (boosting) {
          accel += state.boostPower;
          ship.boostCharge = Math.max(0, ship.boostCharge - dt * 30);
        } else {
          ship.boostCharge = Math.min(state.maxBoostCharge, ship.boostCharge + dt * (13 + state.upgradeTier));
        }
        ship.vx += thrustVector.x * accel * dt;
        ship.vy += thrustVector.y * accel * dt;
        ship.engineGlow = Math.min(1, ship.engineGlow + dt * 7);
      } else {
        ship.boostCharge = Math.min(state.maxBoostCharge, ship.boostCharge + dt * (12 + state.upgradeTier * 1.5));
        ship.engineGlow = Math.max(0, ship.engineGlow - dt * 4.8);
      }

      const drag = Math.pow(thrustHeld ? 0.9935 : 0.988, dt * 60);
      ship.vx *= drag;
      ship.vy *= drag;

      const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      const maxSpeed = state.topSpeed + (boosting ? 140 : 0);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        ship.vx *= scale;
        ship.vy *= scale;
      }

      ship.x = wrapValue(ship.x + ship.vx * dt, W, ship.radius);
      ship.y = wrapValue(ship.y + ship.vy * dt, H, ship.radius);

      if (fireHeld && ship.fireCooldown <= 0) {
        fireWeapons(state);
      }

      for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
        const bullet = state.bullets[i];
        bullet.life -= dt;
        bullet.x = wrapValue(bullet.x + bullet.vx * dt, W, 16);
        bullet.y = wrapValue(bullet.y + bullet.vy * dt, H, 16);
        if (bullet.life <= 0) {
          state.bullets.splice(i, 1);
        }
      }

      for (const asteroid of state.asteroids) {
        asteroid.x = wrapValue(asteroid.x + asteroid.vx * dt, W, asteroid.radius);
        asteroid.y = wrapValue(asteroid.y + asteroid.vy * dt, H, asteroid.radius);
        asteroid.angle += asteroid.spin * dt;
      }

      for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
        const pickup = state.pickups[i];
        pickup.life -= dt;
        pickup.x = wrapValue(pickup.x + pickup.vx * dt, W, 24);
        pickup.y = wrapValue(pickup.y + pickup.vy * dt, H, 24);
        pickup.angle += pickup.spin * dt;
        if (pickup.life <= 0) {
          state.pickups.splice(i, 1);
        }
      }

      for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
        const bullet = state.bullets[i];
        for (let j = state.asteroids.length - 1; j >= 0; j -= 1) {
          const asteroid = state.asteroids[j];
          const hitRadius = bullet.radius + asteroid.radius;
          if (wrappedDistanceSq(bullet, asteroid) <= hitRadius * hitRadius) {
            state.bullets.splice(i, 1);
            state.asteroids.splice(j, 1);
            shatterAsteroid(state, asteroid);
            break;
          }
        }
      }

      if (ship.invuln <= 0) {
        for (const asteroid of state.asteroids) {
          const hitRadius = ship.radius + asteroid.radius * 0.72;
          if (wrappedDistanceSq(ship, asteroid) <= hitRadius * hitRadius) {
            damageShip(state);
            break;
          }
        }
      }

      for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
        const pickup = state.pickups[i];
        if (wrappedDistanceSq(ship, pickup) <= (ship.radius + pickup.radius) ** 2) {
          state.pickups.splice(i, 1);
          collectPickup(state, pickup);
        }
      }

      if (state.asteroids.length === 0) {
        if (state.nextWaveTimer <= 0) {
          state.nextWaveTimer = 1.6;
          state.feedback = `Sector clear. Wave ${state.wave + 1} warping in.`;
        } else {
          state.nextWaveTimer = Math.max(0, state.nextWaveTimer - dt);
          if (state.nextWaveTimer <= 0) {
            state.wave += 1;
            spawnWave(state);
          }
        }
      } else {
        state.nextWaveTimer = 0;
      }
    },
    render(state) {
      const ship = state.ship;
      const skin = currentSkin(state);
      clearCanvas("#040914");

      const backdrop = ctx.createLinearGradient(0, 0, 0, H);
      backdrop.addColorStop(0, "#061120");
      backdrop.addColorStop(0.55, "#0a1830");
      backdrop.addColorStop(1, "#050b14");
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, W, H);

      const nebulaLeft = ctx.createRadialGradient(W * 0.18, H * 0.24, 10, W * 0.18, H * 0.24, 260);
      nebulaLeft.addColorStop(0, "rgba(92,199,255,0.28)");
      nebulaLeft.addColorStop(1, "rgba(92,199,255,0)");
      ctx.fillStyle = nebulaLeft;
      ctx.fillRect(0, 0, W, H);

      const nebulaRight = ctx.createRadialGradient(W * 0.82, H * 0.18, 10, W * 0.82, H * 0.18, 220);
      nebulaRight.addColorStop(0, "rgba(255,110,159,0.22)");
      nebulaRight.addColorStop(1, "rgba(255,110,159,0)");
      ctx.fillStyle = nebulaRight;
      ctx.fillRect(0, 0, W, H);

      drawStarField((state.time || 0) * 1.8, 74);

      ctx.save();
      ctx.strokeStyle = "rgba(151,214,255,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 110 + i * 70 + Math.sin((state.time || 0) * 0.5 + i) * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      for (const pickup of state.pickups) {
        drawWrappedCopies(pickup.x, pickup.y, pickup.radius + 10, (drawX, drawY) => {
          ctx.save();
          ctx.globalAlpha = 0.22 + Math.sin((state.time || 0) * 7 + pickup.angle) * 0.08;
          ctx.fillStyle = pickup.color;
          ctx.beginPath();
          ctx.arc(drawX, drawY, pickup.radius + 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawSprite(pickup.sprite, drawX - 18, drawY - 18, 36, 36, { angle: pickup.angle });
        });
      }

      for (const bullet of state.bullets) {
        drawWrappedCopies(bullet.x, bullet.y, bullet.radius + 10, (drawX, drawY) => {
          ctx.save();
          ctx.globalAlpha = 0.24;
          ctx.fillStyle = bullet.glow;
          ctx.beginPath();
          ctx.arc(drawX, drawY, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawSprite(bullet.sprite, drawX - 10, drawY - 22, 20, 44, { angle: bullet.angle + Math.PI / 2 });
        });
      }

      for (const asteroid of state.asteroids) {
        drawWrappedCopies(asteroid.x, asteroid.y, asteroid.radius + 12, (drawX, drawY) => {
          const size = asteroid.radius * 2;
          drawSprite(asteroid.sprite, drawX - asteroid.radius, drawY - asteroid.radius, size, size, { angle: asteroid.angle });
        });
      }

      if (!state.over) {
        const flameLength = ship.engineGlow * (ship.burst > 0 ? 72 : input.keys.has("arrowup") || input.keys.has("w") ? 46 : 0);
        if (flameLength > 6) {
          drawWrappedCopies(ship.x, ship.y, 70, (drawX, drawY) => {
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.rotate(ship.angle + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 26);
            ctx.lineTo(-11, 16);
            ctx.lineTo(0, 16 + flameLength);
            ctx.lineTo(11, 16);
            ctx.closePath();
            ctx.fillStyle = ship.burst > 0 ? "rgba(255,116,116,0.72)" : "rgba(255,212,71,0.72)";
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 24);
            ctx.lineTo(-6, 17);
            ctx.lineTo(0, 17 + flameLength * 0.68);
            ctx.lineTo(6, 17);
            ctx.closePath();
            ctx.fillStyle = "rgba(214,245,255,0.86)";
            ctx.fill();
            ctx.restore();
          });
        }
      }

      drawWrappedCopies(ship.x, ship.y, 74, (drawX, drawY) => {
        if (ship.invuln > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(125,237,176,${0.2 + Math.sin((state.time || 0) * 8) * 0.08})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.arc(drawX, drawY, 34, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        drawSprite(skin.sprite, drawX - 42, drawY - 42, 84, 84, {
          angle: ship.angle + Math.PI / 2,
          alpha: ship.invuln > 0 ? 0.66 + Math.sin((state.time || 0) * 11) * 0.16 : 1
        });
      });

      drawRoundedRect(24, 22, 244, 88, 24, "rgba(4,11,23,0.74)", "rgba(151,214,255,0.16)");
      drawText(`Wave ${state.wave}`, 46, 44, 18, "#f4fbff", "left");
      drawText(`${Math.round(state.score)} score`, 46, 74, 24, "#ffd447", "left");

      drawRoundedRect(W - 278, 22, 254, 96, 24, "rgba(4,11,23,0.74)", "rgba(151,214,255,0.16)");
      drawText(skin.name, W - 254, 44, 16, skin.accent, "left");
      drawText(`Laser Tier ${state.laserTier}`, W - 254, 68, 13, "#f4fbff", "left", "Baloo 2");
      drawText(`Tech ${state.tech}`, W - 254, 88, 13, "rgba(244,251,255,0.74)", "left", "Baloo 2");

      drawRoundedRect(W - 256, 98, 214, 10, 999, "rgba(255,255,255,0.07)");
      const boostWidth = 214 * (ship.boostCharge / state.maxBoostCharge);
      const boostBar = ctx.createLinearGradient(W - 256, 0, W - 42, 0);
      boostBar.addColorStop(0, "#5cc7ff");
      boostBar.addColorStop(1, skin.accent);
      drawRoundedRect(W - 256, 98, boostWidth, 10, 999, boostBar);

      for (let i = 0; i < state.maxShields; i += 1) {
        drawRoundedRect(
          30 + i * 34,
          124,
          24,
          24,
          9,
          i < state.shields ? "rgba(125,237,176,0.18)" : "rgba(255,255,255,0.06)",
          i < state.shields ? "rgba(125,237,176,0.46)" : "rgba(255,255,255,0.1)"
        );
      }

      if (state.nextWaveTimer > 0 && !state.over) {
        drawRoundedRect(W / 2 - 156, 26, 312, 44, 18, "rgba(4,11,23,0.74)", "rgba(255,212,71,0.18)");
        drawText(`Wave ${state.wave + 1} in ${state.nextWaveTimer.toFixed(1)}s`, W / 2, 48, 15, "#ffd447");
      }

      drawRoundedRect(170, H - 92, W - 520, 50, 18, "rgba(4,11,23,0.74)", "rgba(151,214,255,0.14)");
      drawText(state.feedback, W / 2, H - 66, 17, state.over ? "#ffb0b0" : "#f4fbff", "center", "Baloo 2");

      drawRoundedRect(W - 310, H - 152, 286, 42, 18, "rgba(4,11,23,0.74)", "rgba(151,214,255,0.14)");
      drawText("Q/E ship  Shift boost  Space fire", W - 167, H - 131, 13, "rgba(244,251,255,0.72)", "center", "Baloo 2");

      renderShipDock(state);
      drawParticles(state);

      if (state.over) {
        drawRoundedRect(224, 152, W - 448, 204, 30, "rgba(4,11,23,0.88)", "rgba(255,143,143,0.24)");
        drawText("Ship Down", W / 2, 204, 36, "#ffd447");
        drawText(`Final score ${Math.round(state.score)}`, W / 2, 252, 26, "#f4fbff");
        drawText(`You reached wave ${state.wave} with ${state.tech} tech.`, W / 2, 292, 18, "rgba(244,251,255,0.72)", "center", "Baloo 2");
        drawText("Restart to launch another asteroid run.", W / 2, 330, 18, "rgba(244,251,255,0.72)", "center", "Baloo 2");
      }
    },
    getStats(state) {
      return {
        primaryLabel: "Score",
        primaryValue: Math.round(state.score),
        secondaryLabel: "Ship",
        secondaryValue: currentSkin(state).name,
        status: state.over
          ? `Final wave ${state.wave} | Tech ${state.tech}`
          : `Shields ${state.shields}/${state.maxShields} | Boost ${Math.round(state.ship.boostCharge)} | Wave ${state.wave}`
      };
    },
    getBestValue(state) {
      return state.score;
    }
  };
}

function createGoalieRushGame() {
  const lanes = [laneCenter(0, 3, 280), laneCenter(1, 3, 280), laneCenter(2, 3, 280)];
  const soccerBallSprites = [sprites.soccerBall, sprites.soccerBall2, sprites.soccerBall3, sprites.soccerBall4];
  const pickupTypes = {
    glove: {
      id: "glove",
      label: "Mega Gloves",
      sprite: sprites.boxingGlove,
      color: "#68d1ff"
    },
    magnet: {
      id: "magnet",
      label: "Ball Magnet",
      sprite: sprites.goaliePowerMagnet,
      color: "#94d9ff"
    },
    slow: {
      id: "slow",
      label: "Time Freeze",
      sprite: sprites.goaliePowerSlow,
      color: "#7dedb0"
    },
    shield: {
      id: "shield",
      label: "Wall Shield",
      sprite: sprites.goaliePowerShield,
      color: "#ffd447"
    },
    bonus: {
      id: "bonus",
      label: "Gold Card",
      sprite: sprites.cardYellow,
      color: "#ffdf67"
    }
  };

  function spawnPickup(state, forcedLane = randInt(0, 2), forcedKind = "") {
    const type = pickupTypes[forcedKind] || pick(Object.values(pickupTypes));
    state.pickups.push({
      lane: forcedLane,
      kind: type.id,
      label: type.label,
      sprite: type.sprite,
      color: type.color,
      x: lanes[forcedLane],
      y: 144,
      vy: 168,
      angle: rand(0, Math.PI * 2),
      spin: rand(-2, 2)
    });
  }

  function applyPickup(state, pickup) {
    if (pickup.kind === "glove") {
      state.wideShots += 3;
      state.feedback = "Mega Gloves: wider saves for the next 3 shots.";
    } else if (pickup.kind === "magnet") {
      state.magnetShots += 3;
      state.feedback = "Ball Magnet: the next 3 shots bend closer to you.";
    } else if (pickup.kind === "slow") {
      state.slowShots += 3;
      state.feedback = "Time Freeze: the next 3 shots come in slower.";
    } else if (pickup.kind === "shield") {
      state.shieldCharges += 1;
      state.feedback = "Wall Shield: one miss will be erased.";
    } else {
      state.bonusShots += 3;
      state.feedback = "Gold Card: the next 3 saves pay bonus score.";
    }
    state.score += pickup.kind === "bonus" ? 35 : 25;
    state.particles.push(...createParticles(16, pickup.x, pickup.y, pickup.color));
  }

  function spawnShot(state) {
    const boss = state.round % 5 === 0;
    const golden = !boss && (state.round % 4 === 0 || Math.random() < 0.18);
    const lane = randInt(0, 2);
    state.shot = {
      lane,
      boss,
      golden,
      y: -42,
      x: lanes[lane],
      curve: rand(-82, 82),
      speed: 192 + state.round * 12,
      angle: rand(0, Math.PI * 2),
      spin: rand(-5.5, 5.5),
      sprite: boss ? sprites.football : pick(soccerBallSprites),
      slowed: false,
      wideSave: false,
      magnetized: false,
      bonus: false
    };
    if (boss) {
      state.shot.speed += 58;
      state.shot.curve *= 1.18;
    }
    if (state.slowShots > 0) {
      state.slowShots -= 1;
      state.shot.slowed = true;
      state.shot.speed *= 0.74;
    }
    if (state.wideShots > 0) {
      state.wideShots -= 1;
      state.shot.wideSave = true;
    }
    if (state.magnetShots > 0) {
      state.magnetShots -= 1;
      state.shot.magnetized = true;
      state.shot.curve *= 0.82;
    }
    if (state.bonusShots > 0) {
      state.bonusShots -= 1;
      state.shot.bonus = true;
    }
    state.strikerLane = lane;
  }

  function resolveShot(state) {
    const shot = state.shot;
    const reach = shot.wideSave ? 104 : 58;
    const delta = Math.abs(state.keeperX - shot.x);
    const saved = delta <= reach;
    const perfect = delta <= 24;

    if (saved) {
      const gain =
        (shot.boss ? 190 : 92) +
        (shot.golden ? 60 : 0) +
        (shot.bonus ? 45 : 0) +
        state.streak * 12 +
        (perfect ? 28 : 0);
      state.score += gain;
      state.saves += 1;
      state.streak += 1;
      if (shot.boss) {
        state.bossSaves += 1;
      }
      state.crowdPulse = Math.min(1, state.crowdPulse + 0.18);
      state.feedback = shot.boss
        ? `Boss save! +${gain}`
        : shot.golden
          ? `Golden save! +${gain}`
          : shot.bonus
            ? `Crowd bonus save! +${gain}`
          : perfect
            ? `Perfect save! +${gain}`
            : `Huge save! +${gain}`;
      state.particles.push(
        ...createParticles(18, shot.x, H - 148, shot.golden || shot.bonus ? "#ffd447" : shot.magnetized ? "#68d1ff" : "#7dedb0")
      );

      if (shot.boss) {
        spawnPickup(state, shot.lane, "shield");
      } else if (shot.golden) {
        spawnPickup(state, shot.lane, Math.random() < 0.5 ? "bonus" : "glove");
      } else if (shot.bonus && Math.random() < 0.6) {
        spawnPickup(state, shot.lane, pick(["glove", "magnet", "slow"]));
      } else if (state.streak % 3 === 0 || Math.random() < 0.34) {
        spawnPickup(state, shot.lane);
      }
    } else if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      state.streak = 0;
      state.score += 15;
      state.feedback = "Wall Shield saved the play.";
      state.particles.push(...createParticles(18, shot.x, H - 156, "#ffd447"));
    } else {
      state.misses += 1;
      state.streak = 0;
      state.crowdPulse = Math.max(0, state.crowdPulse - 0.24);
      state.feedback = shot.boss ? "Boss shot got through." : "Goal against you.";
      state.particles.push(...createParticles(18, shot.x, H - 140, "#ff8f8f"));
      if (state.misses >= 3) {
        state.over = true;
      }
    }

    state.round += 1;
    state.shot = null;
    state.cooldown = rand(0.34, 0.58);
  }

  return {
    id: "goalie_rush",
    type: "canvas",
    name: "Goalie Rush",
    description: "A brighter penalty showdown with Kenney CC0 player and ball sprites, curved shots, combo saves, and five arcade power-ups.",
    controls: "Use Left and Right or A and D to slide across the goal. Press 1, 2, or 3 for direct lane picks if you want faster reactions.",
    note: "This solo version keeps everything local and now leans on the free Kenney sports pack for the keeper, striker, turf, and ball variants, plus extra power-ups and streak rewards.",
    stageTitle: "Stadium Save Rush",
    stageHelp: "Read the lane, catch Mega Gloves, Ball Magnet, Time Freeze, Wall Shield, and Gold Card pickups, then survive each fifth-round boss shot.",
    createState() {
      return {
        lane: 1,
        keeperX: lanes[1],
        strikerLane: 1,
        round: 1,
        score: 0,
        saves: 0,
        bossSaves: 0,
        streak: 0,
        misses: 0,
        wideShots: 0,
        magnetShots: 0,
        slowShots: 0,
        shieldCharges: 0,
        bonusShots: 0,
        crowdPulse: 0.2,
        cooldown: 0.45,
        shot: null,
        pickups: [],
        feedback: "Stadium lights on. Protect the goal.",
        particles: [],
        over: false,
        time: 0
      };
    },
    getActions(state) {
      if (state.over) {
        return [{ id: "restart", label: "Play Again", className: "good" }];
      }
      return [
        { id: "move:-1", label: "Left" },
        { id: "move:0", label: "Center" },
        { id: "move:1", label: "Right" }
      ];
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
        return;
      }
      if (id.startsWith("move:")) {
        state.lane = clamp(Number(id.split(":")[1]) + 1, 0, 2);
      }
    },
    keydown(state, key) {
      if (key === "arrowleft" || key === "a") {
        state.lane = clamp(state.lane - 1, 0, 2);
      }
      if (key === "arrowright" || key === "d") {
        state.lane = clamp(state.lane + 1, 0, 2);
      }
      if (["1", "2", "3"].includes(key)) {
        state.lane = Number(key) - 1;
      }
    },
    update(state, dt, now) {
      state.time = now;
      updateParticles(state, dt);
      state.crowdPulse = Math.max(0, state.crowdPulse - dt * 0.35);
      state.keeperX += (lanes[state.lane] - state.keeperX) * Math.min(1, dt * (12 + (state.magnetShots > 0 ? 1.5 : 0)));
      if (state.over) {
        return;
      }

      for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
        const pickup = state.pickups[i];
        pickup.y += pickup.vy * dt;
        pickup.angle += pickup.spin * dt;
        if (Math.abs(state.keeperX - pickup.x) < 58 && Math.abs(pickup.y - (H - 160)) < 32) {
          state.pickups.splice(i, 1);
          applyPickup(state, pickup);
          continue;
        }
        if (pickup.y > H + 50) {
          state.pickups.splice(i, 1);
        }
      }

      if (!state.shot) {
        state.cooldown -= dt;
        if (state.cooldown <= 0) {
          spawnShot(state);
        }
        return;
      }

      state.shot.y += state.shot.speed * dt;
      state.shot.angle += state.shot.spin * dt;
      const progress = clamp((state.shot.y + 42) / (H - 180), 0, 1);
      state.shot.x = lanes[state.shot.lane] + Math.sin(progress * Math.PI) * state.shot.curve;
      if (state.shot.magnetized) {
        state.shot.x += (state.keeperX - state.shot.x) * progress * (state.shot.boss ? 0.12 : 0.2);
      }
      if (state.shot.y >= H - 170) {
        resolveShot(state);
      }
    },
    render(state) {
      clearCanvas("#06111d");

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#13243f");
      sky.addColorStop(0.5, "#132b4a");
      sky.addColorStop(1, "#0b1727");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const crowd = ctx.createLinearGradient(0, 0, 0, 138);
      crowd.addColorStop(0, "#0b1322");
      crowd.addColorStop(1, "#17273f");
      ctx.fillStyle = crowd;
      ctx.fillRect(0, 0, W, 138);

      for (let i = 0; i < 42; i += 1) {
        const x = 18 + i * 23;
        const h = 18 + ((i * 7) % 24);
        const hue = i % 4 === 0 ? "#ffd447" : i % 3 === 0 ? "#68d1ff" : i % 2 === 0 ? "#ff8f8f" : "#f4fbff";
        ctx.save();
        ctx.globalAlpha = 0.16 + state.crowdPulse * 0.12;
        ctx.fillStyle = hue;
        ctx.fillRect(x, 98 - h, 12, h);
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = 0.14 + state.crowdPulse * 0.18;
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(0, 132, W, 6);
      ctx.restore();

      const grass = ctx.createLinearGradient(0, H - 220, 0, H);
      grass.addColorStop(0, "#2f9f64");
      grass.addColorStop(1, "#14603d");
      ctx.fillStyle = grass;
      ctx.fillRect(0, H - 210, W, 210);
      if (sprites.grassMownWide.complete && sprites.grassMownWide.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        for (let x = -8; x < W; x += 156) {
          ctx.drawImage(sprites.grassMownWide, x, H - 214, 164, 214);
        }
        ctx.restore();
      }

      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0)";
        ctx.fillRect(0, H - 210 + i * 35, W, 35);
      }

      drawSprite(sprites.goalieGoal, 160, 90, W - 320, 230);
      drawRoundedRect(194, 104, W - 388, 246, 26, "rgba(255,255,255,0.02)", "rgba(255,255,255,0.16)", 2);

      for (const x of lanes) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.11)";
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.moveTo(x, 130);
        ctx.lineTo(x, H - 122);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W / 2, H - 110, 110, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const strikerX = state.shot ? state.shot.x : lanes[state.strikerLane];
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#08111d";
      ctx.beginPath();
      ctx.ellipse(strikerX, 176, 38, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawSprite(sprites.playerRed, strikerX - 44, 96, 88, 88);

      for (const pickup of state.pickups) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = pickup.color;
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawSprite(pickup.sprite, pickup.x - 22, pickup.y - 22, 44, 44, { angle: pickup.angle });
      }

      if (state.shot) {
        const ballSprite = state.shot.sprite || (state.shot.boss ? sprites.football : sprites.soccerBall);
        const size = state.shot.boss ? 72 : state.shot.golden || state.shot.bonus ? 62 : 56;
        const glow = state.shot.boss
          ? "#ff8f8f"
          : state.shot.golden || state.shot.bonus
            ? "#ffd447"
            : state.shot.slowed
              ? "#7dedb0"
              : state.shot.magnetized
                ? "#68d1ff"
                : "#dce9ff";
        ctx.save();
        ctx.strokeStyle = `${glow}66`;
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.moveTo(strikerX, 182);
        ctx.lineTo(state.shot.x, state.shot.y + 16);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(state.shot.x, state.shot.y, size * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (state.shot.magnetized) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = "#68d1ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(state.shot.x, state.shot.y, size * 0.58, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        drawSprite(ballSprite, state.shot.x - size / 2, state.shot.y - size / 2, size, size, {
          angle: state.shot.angle
        });
      }

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#08111d";
      ctx.beginPath();
      ctx.ellipse(state.keeperX, H - 116, 46, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (state.wideShots > 0) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "#68d1ff";
        ctx.beginPath();
        ctx.arc(state.keeperX, H - 150, 78, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (state.shieldCharges > 0) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "#ffd447";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(state.keeperX, H - 148, 64, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();
        ctx.restore();
      }

      drawSprite(sprites.playerGreen, state.keeperX - 58, H - 188, 116, 116);
      drawSprite(sprites.goalieGloves, state.keeperX - 68, H - 170, 136, 82);

      drawRoundedRect(22, 22, 220, 60, 18, "rgba(4,11,23,0.78)", "rgba(151,214,255,0.16)");
      drawText(`Round ${state.round}`, 88, 44, 14, "#f4fbff", "left");
      drawText(`${state.score} score`, 88, 64, 22, "#ffd447", "left");

      drawRoundedRect(252, 22, 214, 60, 18, "rgba(4,11,23,0.78)", "rgba(151,214,255,0.16)");
      drawText(`Streak ${state.streak}x`, 359, 44, 20, state.streak > 0 ? "#7dedb0" : "#f4fbff");
      drawText(`Saves ${state.saves}`, 359, 64, 13, "rgba(244,251,255,0.72)", "center", "Baloo 2");

      drawRoundedRect(W - 246, 22, 224, 60, 18, "rgba(4,11,23,0.78)", "rgba(151,214,255,0.16)");
      drawText(`Boss Saves ${state.bossSaves}`, W - 134, 44, 18, "#ffd447");
      drawText(`Misses ${state.misses}/3`, W - 134, 64, 13, "rgba(244,251,255,0.72)", "center", "Baloo 2");

      drawRoundedRect(22, H - 122, 432, 74, 22, "rgba(4,11,23,0.78)", "rgba(151,214,255,0.16)");
      drawText("Power-Ups", 76, H - 99, 14, "#f4fbff", "left");
      drawSprite(sprites.boxingGlove, 42, H - 86, 28, 28);
      drawText(`${state.wideShots}`, 78, H - 72, 16, "#68d1ff", "left");
      drawSprite(sprites.goaliePowerMagnet, 118, H - 86, 28, 28);
      drawText(`${state.magnetShots}`, 154, H - 72, 16, "#94d9ff", "left");
      drawSprite(sprites.goaliePowerSlow, 194, H - 86, 28, 28);
      drawText(`${state.slowShots}`, 230, H - 72, 16, "#7dedb0", "left");
      drawSprite(sprites.goaliePowerShield, 270, H - 86, 28, 28);
      drawText(`${state.shieldCharges}`, 306, H - 72, 16, "#ffd447", "left");
      drawSprite(sprites.cardYellow, 346, H - 86, 28, 28);
      drawText(`${state.bonusShots}`, 382, H - 72, 16, "#ffdf67", "left");

      const feedbackX = 470;
      const feedbackW = W - feedbackX - 22;
      drawRoundedRect(feedbackX, H - 102, feedbackW, 54, 18, "rgba(4,11,23,0.78)", "rgba(151,214,255,0.16)");
      drawText(state.feedback, feedbackX + feedbackW / 2, H - 75, 18, state.over ? "#ffb0b0" : "#f4fbff", "center", "Baloo 2");
      drawParticles(state);

      if (state.over) {
        drawRoundedRect(232, 160, W - 464, 174, 28, "rgba(6,12,18,0.88)", "rgba(255,143,143,0.28)");
        drawText("Final Whistle", W / 2, 224, 34, "#ffd447");
        drawText(`You saved ${state.saves} shots and hit ${state.streak > 0 ? `${state.streak}x` : "0x"} streak pace.`, W / 2, 272, 22, "#f4fbff");
        drawText("Restart to defend another stadium run.", W / 2, 312, 18, "rgba(244,251,255,0.72)", "center", "Baloo 2");
      }
    },
    getStats(state) {
      return {
        primaryLabel: "Saves",
        primaryValue: state.saves,
        secondaryLabel: "Streak",
        secondaryValue: state.over ? "Ended" : `${state.streak}x`,
        status: state.over
          ? `Misses ${state.misses} | Boss saves ${state.bossSaves}`
          : `Misses ${state.misses}/3 | Boss ${state.bossSaves} | Power ${state.wideShots + state.magnetShots + state.slowShots + state.shieldCharges + state.bonusShots}`
      };
    },
    getBestValue(state) {
      return state.saves + state.bossSaves * 3;
    }
  };
}

function createHallwayDashGame() {
  const lanes = [laneCenter(0, 3, 300), laneCenter(1, 3, 300), laneCenter(2, 3, 300)];
  const obstacleTypes = [
    { id: "bag", label: "Backpack", sprite: sprites.hallwayBackpack, color: "#ffcf6e", w: 76, h: 76, collision: 60 },
    { id: "sign", label: "Wet Floor Sign", sprite: sprites.hallwayWetFloor, color: "#ffe08a", w: 70, h: 84, collision: 58 },
    { id: "book", label: "Book Stack", sprite: sprites.hallwayBookStack, color: "#dce9ff", w: 82, h: 68, collision: 60 },
    { id: "project", label: "Science Board", sprite: sprites.hallwayScienceBoard, color: "#d8b4fe", w: 94, h: 74, collision: 64 }
  ];
  const wallPanels = [
    { left: "lockers", right: "door" },
    { left: "board", right: "lockers" },
    { left: "door", right: "board" },
    { left: "lockers", right: "board" }
  ];
  const wallSprites = {
    lockers: { sprite: sprites.hallwayLockers, w: 146, h: 108 },
    door: { sprite: sprites.hallwayDoor, w: 112, h: 150 },
    board: { sprite: sprites.hallwayBoard, w: 142, h: 100 }
  };
  const bulletinFaces = [sprites.studentFaceA, sprites.studentFaceB, sprites.studentFaceC];
  const bannerCopy = ["Science Fair", "Book Drive", "Robotics Club"];

  function spawnTrackItem(state) {
    const lane = randInt(0, 2);
    if (Math.random() < 0.3) {
      state.pickups.push({
        lane,
        y: -58,
        sprite: sprites.hallwayPass,
        label: "Hall Pass",
        angle: rand(-0.18, 0.18),
        spin: rand(-2.2, 2.2),
        bob: rand(0, Math.PI * 2),
        value: 1
      });
      return;
    }
    const type = pick(obstacleTypes);
    state.obstacles.push({
      lane,
      y: -86,
      type,
      tilt: rand(-0.12, 0.12),
      sway: rand(0, Math.PI * 2)
    });
  }

  function playerY(state) {
    return H - 170 - state.jump;
  }

  function drawBulletinBoardDetails(x, y, scale, seed) {
    const faceA = bulletinFaces[seed % bulletinFaces.length];
    const faceB = bulletinFaces[(seed + 1) % bulletinFaces.length];
    drawSprite(faceA, x + 20 * scale, y + 22 * scale, 32 * scale, 32 * scale, { angle: -0.08 });
    drawSprite(faceB, x + 96 * scale, y + 24 * scale, 28 * scale, 28 * scale, { angle: 0.1 });
    drawSprite(sprites.hallwayPass, x + 56 * scale, y + 14 * scale, 30 * scale, 40 * scale, { angle: 0.06 });
  }

  function drawWallPanel(kind, x, y, scale, seed) {
    const panel = wallSprites[kind];
    const w = panel.w * scale;
    const h = panel.h * scale;
    drawSprite(panel.sprite, x, y, w, h);
    if (kind === "board") {
      drawBulletinBoardDetails(x, y, scale, seed);
    }
  }

  function hitPlayer(state, obstacle) {
    state.hearts -= 1;
    state.stumbleTimer = 0.75;
    state.obstacles = state.obstacles.filter((entry) => entry !== obstacle);
    state.feedback = `${obstacle.type.label} slowed your hallway run.`;
    state.particles.push(...createParticles(18, lanes[obstacle.lane], H - 132, "#ff8f8f"));
    if (state.hearts <= 0) {
      state.over = true;
    }
  }

  return {
    id: "hallway_dash",
    type: "canvas",
    name: "Hallway Dash",
    description: "A fuller school-hall runner with lockers, bulletin boards, classroom clutter, and better hallway sprites.",
    controls: "Use Left and Right or A and D to change lanes. Press Space, Up, or W to jump.",
    note: "This solo hallway version now looks more like a real school corridor, with local hallway sprites for lockers, doors, bulletin boards, hall passes, backpacks, and book clutter.",
    stageTitle: "Hallway Sprint",
    stageHelp: "Sprint through a school hallway, dodge backpacks, wet-floor signs, science boards, and book stacks, and grab hall passes for bonus score.",
    createState() {
      return {
        lane: 1,
        jump: 0,
        vy: 0,
        distance: 0,
        coins: 0,
        score: 0,
        hearts: 3,
        speed: 270,
        spawnTimer: 0.7,
        stumbleTimer: 0,
        boostTimer: 0,
        obstacles: [],
        pickups: [],
        particles: [],
        feedback: "The hallway is clear.",
        over: false,
        time: 0
      };
    },
    getActions(state) {
      if (state.over) {
        return [{ id: "restart", label: "Run Again", className: "good" }];
      }
      return [
        { id: "lane:left", label: "Left" },
        { id: "jump", label: "Jump", className: "good" },
        { id: "lane:right", label: "Right" }
      ];
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
        return;
      }
      if (id === "jump" && state.jump === 0) {
        state.vy = 560;
      }
      if (id === "lane:left") {
        state.lane = clamp(state.lane - 1, 0, 2);
      }
      if (id === "lane:right") {
        state.lane = clamp(state.lane + 1, 0, 2);
      }
    },
    keydown(state, key) {
      if (key === "arrowleft" || key === "a") {
        state.lane = clamp(state.lane - 1, 0, 2);
      }
      if (key === "arrowright" || key === "d") {
        state.lane = clamp(state.lane + 1, 0, 2);
      }
      if ((key === " " || key === "arrowup" || key === "w") && state.jump === 0) {
        state.vy = 560;
      }
    },
    update(state, dt, now) {
      state.time = now;
      updateParticles(state, dt);
      if (state.over) {
        return;
      }

      state.stumbleTimer = Math.max(0, state.stumbleTimer - dt);
      state.boostTimer = Math.max(0, state.boostTimer - dt);
      const baseSpeed = 270 + state.distance * 0.2;
      state.speed = baseSpeed * (state.stumbleTimer > 0 ? 0.72 : state.boostTimer > 0 ? 1.06 : 1);
      state.distance += dt * state.speed * 0.1;
      state.score = Math.floor(state.distance * 8 + state.coins * 75);

      if (state.vy !== 0 || state.jump > 0) {
        state.jump = Math.max(0, state.jump + state.vy * dt);
        state.vy -= 1200 * dt;
        if (state.jump === 0 && state.vy < 0) {
          state.vy = 0;
        }
      }

      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnTrackItem(state);
        state.spawnTimer = rand(0.52, 0.78);
      }

      for (const obstacle of state.obstacles) {
        obstacle.y += state.speed * dt;
      }
      for (const pickup of state.pickups) {
        pickup.y += state.speed * dt * 0.94;
        pickup.angle += pickup.spin * dt;
        pickup.bob += dt * 5;
      }

      const player = { x: lanes[state.lane], y: playerY(state) + 52 };

      for (const obstacle of [...state.obstacles]) {
        if (obstacle.y > H + 60) {
          state.obstacles = state.obstacles.filter((entry) => entry !== obstacle);
          continue;
        }
        const obstaclePoint = { x: lanes[obstacle.lane], y: obstacle.y + obstacle.type.h * 0.16 };
        const grounded = state.jump < 36;
        if (grounded && obstacle.lane === state.lane && distance(player, obstaclePoint) < obstacle.type.collision) {
          hitPlayer(state, obstacle);
        }
      }

      for (const pickup of [...state.pickups]) {
        if (pickup.y > H + 60) {
          state.pickups = state.pickups.filter((entry) => entry !== pickup);
          continue;
        }
        const pickupPoint = { x: lanes[pickup.lane], y: pickup.y + 12 };
        if (pickup.lane === state.lane && distance(player, pickupPoint) < 58) {
          state.coins += pickup.value;
          state.boostTimer = 0.45;
          state.feedback = "Hall pass stamped.";
          state.particles.push(...createParticles(14, pickupPoint.x, pickupPoint.y, "#ffd447"));
          state.pickups = state.pickups.filter((entry) => entry !== pickup);
        }
      }
    },
    render(state) {
      clearCanvas("#0a1726");

      const wall = ctx.createLinearGradient(0, 0, 0, H);
      wall.addColorStop(0, "#20344a");
      wall.addColorStop(0.48, "#17304a");
      wall.addColorStop(1, "#101c2a");
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, 0, W, 92);
      for (let i = 0; i < 5; i += 1) {
        const x = 70 + i * 182;
        drawRoundedRect(x, 22, 118, 18, 9, "rgba(248,251,255,0.18)", "rgba(248,251,255,0.12)");
      }

      drawRoundedRect(34, 52, 86, 24, 12, "rgba(14,26,41,0.78)", "rgba(255,255,255,0.1)");
      drawText("EXIT", 77, 65, 13, "#7dedb0");
      drawRoundedRect(W - 138, 52, 104, 24, 12, "rgba(14,26,41,0.78)", "rgba(255,255,255,0.1)");
      drawText("Library", W - 86, 65, 13, "#ffd447");

      for (let i = 0; i < 7; i += 1) {
        const template = wallPanels[i % wallPanels.length];
        const panelY = (i * 122 + state.distance * 18) % (H + 220) - 150;
        const depth = clamp((panelY + 150) / (H + 130), 0, 1);
        const scale = 0.78 + depth * 0.4;
        drawWallPanel(template.left, 20, panelY, scale, i);
        const rightPanel = wallSprites[template.right];
        drawWallPanel(template.right, W - 20 - rightPanel.w * scale, panelY, scale, i + 8);
      }

      for (let i = 0; i < bannerCopy.length; i += 1) {
        const x = 216 + i * 190;
        drawRoundedRect(x, 30, 156, 22, 11, "rgba(10,21,34,0.7)", "rgba(255,255,255,0.08)");
        drawText(bannerCopy[i], x + 78, 42, 11, i === 1 ? "#ffd447" : "#dff5ff");
      }

      ctx.fillStyle = "#dae4ee";
      ctx.fillRect(0, H - 220, W, 220);
      ctx.fillStyle = "#274256";
      ctx.fillRect(0, H - 186, W, 34);
      ctx.fillStyle = "#112030";
      ctx.fillRect(W / 2 - 154, H - 220, 308, 220);

      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? "rgba(17,32,48,0.11)" : "rgba(255,255,255,0.03)";
        ctx.fillRect(W / 2 - 154, H - 220 + i * 36, 308, 18);
      }

      for (let i = 0; i < 12; i += 1) {
        const tileY = H - 220 + ((i * 42 + state.distance * 10) % 42);
        ctx.strokeStyle = "rgba(17,32,48,0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, tileY);
        ctx.lineTo(W, tileY);
        ctx.stroke();
      }

      for (let i = 0; i < lanes.length; i += 1) {
        ctx.save();
        ctx.strokeStyle = i === 1 ? "rgba(255,255,255,0.14)" : "rgba(17,32,48,0.18)";
        ctx.setLineDash([16, 14]);
        ctx.beginPath();
        ctx.moveTo(lanes[i], 0);
        ctx.lineTo(lanes[i], H);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, H - 154, W, 6);

      for (const obstacle of state.obstacles) {
        const wobble = obstacle.tilt + Math.sin(state.time * 2.4 + obstacle.sway) * 0.05;
        const x = lanes[obstacle.lane];
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = obstacle.type.color;
        ctx.beginPath();
        ctx.ellipse(x, obstacle.y + 18, obstacle.type.w * 0.34, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawSprite(obstacle.type.sprite, x - obstacle.type.w / 2, obstacle.y - obstacle.type.h / 2, obstacle.type.w, obstacle.type.h, {
          angle: wobble
        });
      }
      for (const pickup of state.pickups) {
        const x = lanes[pickup.lane];
        const bobY = Math.sin(pickup.bob) * 7;
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "#ffd447";
        ctx.beginPath();
        ctx.arc(x, pickup.y + bobY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawSprite(pickup.sprite, x - 26, pickup.y - 34 + bobY, 52, 68, { angle: pickup.angle });
      }

      const runnerX = lanes[state.lane];
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#08111d";
      ctx.beginPath();
      ctx.ellipse(runnerX, H - 104, 44, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (state.boostTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "#68d1ff";
        ctx.beginPath();
        ctx.arc(runnerX, playerY(state) + 58, 68, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      drawSprite(sprites.hallwayBackpack, runnerX - 34, playerY(state) + 26, 68, 68);
      drawSprite(sprites.heroBlue, runnerX - 54, playerY(state), 108, 108);

      for (let i = 0; i < state.hearts; i += 1) {
        drawSprite(sprites.hallwayBackpack, 24 + i * 38, 20, 34, 34);
      }

      drawRoundedRect(180, 24, W - 360, 56, 18, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
      drawText(state.feedback, W / 2, 52, 18, state.over ? "#ffb0b0" : "#f4fbff", "center", "Baloo 2");
      drawParticles(state);

      if (state.over) {
        drawRoundedRect(232, 174, W - 464, 166, 24, "rgba(7,17,29,0.84)", "rgba(255,143,143,0.24)");
        drawText("Bell Rang", W / 2, 224, 34, "#ffd447");
        drawText(`Distance ${Math.floor(state.distance)} m`, W / 2, 272, 24, "#f4fbff");
        drawText("Restart for another school hallway run.", W / 2, 316, 18, "rgba(244,251,255,0.72)", "center", "Baloo 2");
      }
    },
    getStats(state) {
      return {
        primaryLabel: "Distance",
        primaryValue: `${Math.floor(state.distance)}m`,
        secondaryLabel: "Passes",
        secondaryValue: state.coins,
        status: state.over ? `Final score ${state.score}` : `Hearts ${state.hearts} | Score ${state.score}`
      };
    },
    getBestValue(state) {
      return state.score;
    }
  };
}

function createDinoDigGame() {
  const fossilPool = [
    { kind: "fossil", label: "Skull Fossil", points: 55, sprite: sprites.digFossilSkull, tint: "#e8dec1" },
    { kind: "fossil", label: "Rib Fossil", points: 55, sprite: sprites.digFossilRibs, tint: "#e8dec1" },
    { kind: "fossil", label: "Skull Fossil", points: 55, sprite: sprites.digFossilSkull, tint: "#e8dec1" },
    { kind: "fossil", label: "Rib Fossil", points: 55, sprite: sprites.digFossilRibs, tint: "#e8dec1" }
  ];
  const dinoPool = [
    { kind: "dino", label: "T. rex", points: 180, sprite: sprites.trex, tint: "#ffd447" },
    { kind: "dino", label: "Triceratops", points: 180, sprite: sprites.triceratops, tint: "#ffd447" },
    { kind: "dino", label: "Stegosaurus", points: 180, sprite: sprites.stegosaurus, tint: "#ffd447" },
    { kind: "dino", label: "Velociraptor", points: 180, sprite: sprites.velociraptor, tint: "#ffd447" }
  ];
  const digFinds = [
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.digCoinCache, tint: "#ffd447" },
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.digCoinCache, tint: "#ffd447" },
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.digCoinCache, tint: "#ffd447" },
    ...fossilPool,
    { kind: "bones", label: "Bone Bundle", points: 30, sprite: sprites.digBoneBundle, tint: "#ffcf92" },
    { kind: "bones", label: "Bone Bundle", points: 30, sprite: sprites.digBoneBundle, tint: "#ffcf92" },
    { kind: "bones", label: "Bone Bundle", points: 30, sprite: sprites.digBoneBundle, tint: "#ffcf92" },
    { kind: "empty", label: "Dust Cloud", points: 8, sprite: sprites.digDust, tint: "#dec398" },
    { kind: "empty", label: "Dust Cloud", points: 8, sprite: sprites.digDust, tint: "#dec398" },
    { kind: "empty", label: "Dust Cloud", points: 8, sprite: sprites.digDust, tint: "#dec398" },
    ...dinoPool,
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.digCoinCache, tint: "#ffd447" },
    { kind: "fossil", label: "Rib Fossil", points: 55, sprite: sprites.digFossilRibs, tint: "#e8dec1" },
    { kind: "bones", label: "Bone Bundle", points: 30, sprite: sprites.digBoneBundle, tint: "#ffcf92" },
    { kind: "empty", label: "Dust Cloud", points: 8, sprite: sprites.digDust, tint: "#dec398" }
  ];

  function digTile(state, index) {
    if (state.done || state.digsLeft <= 0) {
      return;
    }
    const tile = state.tiles[index];
    if (!tile || tile.dug) {
      return;
    }
    tile.dug = true;
    state.digsLeft -= 1;
    state.score += tile.points;
    if (tile.kind === "fossil") {
      state.fossils += 1;
    }
    if (tile.kind === "dino") {
      state.rareFinds += 1;
    }
    state.message =
      tile.kind === "dino"
        ? `Rare dino pull: ${tile.label} for +${tile.points}.`
        : tile.kind === "empty"
          ? `Only drifting dust this time. +${tile.points}.`
          : `${tile.label} found for +${tile.points}.`;
    if (state.digsLeft === 0 || state.tiles.every((entry) => entry.dug)) {
      state.done = true;
    }
    markDirty();
  }

  return {
    id: "dino_dig",
    type: "board",
    name: "Dino Dig",
    description: "A scenic badlands dig board with sky, layered ground tiles, richer fossil sprites, and rare dinosaur finds.",
    controls: "Click a hidden tile to dig. Each run gives you twelve digs, so choose carefully.",
    note: "This solo version now uses a real dig-site scene with a sky backdrop, layered soil tiles, fossil art, and local dinosaur finds, with progress saved only on this browser.",
    stageTitle: "Dig Site",
    stageHelp: "Each dirt tile hides a reward. Rare dinosaur pulls are worth the most points before the dig budget runs out.",
    createState() {
      return {
        score: 0,
        digsLeft: 12,
        fossils: 0,
        rareFinds: 0,
        message: "Pick a tile to start digging.",
        done: false,
        tiles: shuffle(digFinds).map((entry, index) => ({ ...entry, id: index, dug: false })),
        dirty: true
      };
    },
    getActions(state) {
      return state.done
        ? [{ id: "restart", label: "New Dig Site", className: "good" }]
        : [];
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
      }
    },
    update() {},
    render(state, container) {
      const tiles = state.tiles.map((tile) => {
        if (!tile.dug) {
          return `
            <button class="dig-card dig-site-card hidden-card" type="button" data-dig-index="${tile.id}" aria-label="Dig tile ${tile.id + 1}">
              <img class="dig-marker-art" src="${sprites.digMarker.src}" alt="" />
              <span class="dig-tile-label">Dig Here</span>
              <span class="dig-tile-index">${String(tile.id + 1).padStart(2, "0")}</span>
            </button>
          `;
        }
        return `
          <div class="dig-card dig-site-card dig-found-${tile.kind}">
            <img src="${tile.sprite.src}" alt="${escapeHtml(tile.label)}" />
            <strong>${escapeHtml(tile.label)}</strong>
            <div class="dig-points" style="color:${tile.tint};">+${tile.points}</div>
          </div>
        `;
      }).join("");

      container.innerHTML = `
        <div class="solo-grid dig-site-stage">
          <div class="dig-site-hero">
            <img class="dig-site-scene" src="${sprites.digSiteScene.src}" alt="Badlands dig site" />
            <div class="dig-site-copy">
              <div class="eyebrow">Badlands Camp</div>
              <h3>Dust Trail Dig</h3>
              <p>Break through the soil layers, pull fossils, and chase the rare dinosaur jackpot before the crew runs out of digs.</p>
            </div>
            <div class="dig-site-scout-panel">
              <div class="solo-pill">Scout: <img class="sprite-inline" src="${sprites.survivor.src}" alt="Explorer" /></div>
              <div class="solo-pill">Tools: <img class="sprite-inline" src="${sprites.digMarker.src}" alt="Dig tools" /></div>
            </div>
          </div>
          <div class="solo-board-head dig-site-head">
            <div class="solo-pill">Digs Left: ${state.digsLeft}</div>
            <div class="solo-pill">Fossils: ${state.fossils}</div>
            <div class="solo-pill">Rare Finds: ${state.rareFinds}</div>
            <div class="solo-pill">Best Pull: ${state.rareFinds > 0 ? "Dino" : state.fossils > 0 ? "Fossil" : "Digging"}</div>
          </div>
          <div class="dig-grid dig-grid-site">${tiles}</div>
          <div class="battle-log dig-site-log"><strong>Site Notes</strong><br />${escapeHtml(state.message)}</div>
        </div>
      `;

      container.querySelectorAll("[data-dig-index]").forEach((button) => {
        button.addEventListener("click", () => {
          digTile(state, Number(button.getAttribute("data-dig-index")));
          renderStats();
          renderActions();
          renderBoard(true);
        });
      });
    },
    getStats(state) {
      return {
        primaryLabel: "Score",
        primaryValue: state.score,
        secondaryLabel: "Rare",
        secondaryValue: state.rareFinds,
        status: state.done ? `Dig complete | Fossils ${state.fossils}` : `${state.digsLeft} digs left`
      };
    },
    getBestValue(state) {
      return state.score;
    }
  };
}

function createShadowMatchGame() {
  const MODE_KEY = "solo-arcade-memory-vault-mode";
  const iconPool = [
    { id: "rainbow-rocket", label: "Rainbow Rocket", family: "Space", note: "Blast through the clouds.", accent: "#ff8d6b", sprite: sprites.matchRainbowRocket },
    { id: "treasure-chest", label: "Treasure Chest", family: "Adventure", note: "Packed with bright gems.", accent: "#f7c356", sprite: sprites.matchTreasureChest },
    { id: "dino-egg", label: "Dino Egg", family: "Dino", note: "A tiny friend is hatching.", accent: "#82dd8f", sprite: sprites.matchDinoEgg },
    { id: "robot-buddy", label: "Robot Buddy", family: "STEM", note: "Built for friendly beeps.", accent: "#79c8ff", sprite: sprites.matchRobotBuddy },
    { id: "octopus-pal", label: "Octopus Pal", family: "Ocean", note: "Eight arms, big smile.", accent: "#8f8aff", sprite: sprites.matchOctopusPal },
    { id: "magic-wand", label: "Magic Wand", family: "Magic", note: "Sprinkles a trail of stars.", accent: "#f49fe7", sprite: sprites.matchMagicWand },
    { id: "dragon-kite", label: "Dragon Kite", family: "Sky", note: "Swoops high in the breeze.", accent: "#6be3c8", sprite: sprites.matchDragonKite },
    { id: "cupcake-castle", label: "Cupcake Castle", family: "Sweet City", note: "A castle made of frosting.", accent: "#ffb56d", sprite: sprites.matchCupcakeCastle }
  ];
  const facePool = [
    { id: "ava", label: "Ava", family: "Classroom Friends", note: "Match Ava's face to her name.", accent: "#ff8fb4", sprite: sprites.studentFaceA },
    { id: "liam", label: "Liam", family: "Classroom Friends", note: "Find Liam's matching name card.", accent: "#6db8ff", sprite: sprites.studentFaceB },
    { id: "maya", label: "Maya", family: "Classroom Friends", note: "Remember Maya's smile.", accent: "#89dd87", sprite: sprites.studentFaceC },
    { id: "noah", label: "Noah", family: "Classroom Friends", note: "Pair Noah's picture and name.", accent: "#ffd36a", sprite: sprites.studentFaceD },
    { id: "zoe", label: "Zoe", family: "Classroom Friends", note: "Match Zoe's face tile fast.", accent: "#b091ff", sprite: sprites.studentFaceE },
    { id: "leo", label: "Leo", family: "Classroom Friends", note: "Find Leo's name before time runs out.", accent: "#ff9a62", sprite: sprites.studentFaceF },
    { id: "ivy", label: "Ivy", family: "Classroom Friends", note: "Ivy is hiding in the vault.", accent: "#58d6c4", sprite: sprites.studentFaceG },
    { id: "ezra", label: "Ezra", family: "Classroom Friends", note: "Tap Ezra's picture, then his name.", accent: "#f29de3", sprite: sprites.studentFaceH }
  ];
  const modePool = [
    {
      id: "storybook",
      label: "Storybook Match",
      eyebrow: "Storybook Match Quest",
      title: "Color-Packed Memory Vault",
      description: "Flip adventure cards hiding space, ocean, dino, magic, and sweet-city surprises. Fast streaks raise your reward tier.",
      pillLabel: "Themes",
      preview: () => [...new Set(iconPool.map((card) => card.family))].slice(0, 4).join(" | "),
      intro: "Pick a vault card and reveal the first picture.",
      complete: "Vault complete! Every adventure card is matched.",
      miss: "No match. The vault lights flickered. Try to remember the pictures.",
      matchText(card) {
        return `Match streak __STREAK__! You found ${card.label}.`;
      }
    },
    {
      id: "name_face",
      label: "Name + Face Match",
      eyebrow: "Classroom Friend Match",
      title: "Match Every Name To A Face",
      description: "Kids flip a face card and a name card, then match each classroom friend correctly before the timer runs out.",
      pillLabel: "Skill",
      preview: () => "Name recall | Face recognition",
      intro: "Choose a card to start matching names and faces.",
      complete: "Classroom match complete! Every friend is paired correctly.",
      miss: "Not a match yet. Try to remember which face belongs to each name.",
      matchText(card) {
        return `Match streak __STREAK__! You matched ${card.label}.`;
      }
    }
  ];
  const modeById = new Map(modePool.map((mode) => [mode.id, mode]));

  function rewardTier(bestStreak) {
    if (bestStreak >= 6) {
      return "Legendary";
    }
    if (bestStreak >= 4) {
      return "Epic";
    }
    if (bestStreak >= 2) {
      return "Rare";
    }
    return "Common";
  }

  function getMode(id) {
    return modeById.get(id) || modePool[0];
  }

  function getStoredMode() {
    try {
      return window.localStorage.getItem(MODE_KEY) || modePool[0].id;
    } catch {
      return modePool[0].id;
    }
  }

  function setStoredMode(id) {
    try {
      window.localStorage.setItem(MODE_KEY, getMode(id).id);
    } catch {
      // Ignore storage failures.
    }
  }

  function buildDeck(modeId) {
    if (modeId === "name_face") {
      return shuffle(facePool.flatMap((entry) => [
        {
          pairId: entry.id,
          uid: `${entry.id}:face`,
          matched: false,
          label: entry.label,
          family: "Face",
          note: `This is ${entry.label}.`,
          accent: entry.accent,
          sprite: entry.sprite,
          cardKind: "face"
        },
        {
          pairId: entry.id,
          uid: `${entry.id}:name`,
          matched: false,
          label: entry.label,
          family: "Name",
          note: `Match ${entry.label} to the correct face.`,
          accent: entry.accent,
          sprite: null,
          cardKind: "name"
        }
      ])).map((card, index) => ({ ...card, index }));
    }

    return shuffle(iconPool.flatMap((icon) => [
      { ...icon, pairId: icon.id, uid: `${icon.id}:a`, matched: false, cardKind: "art" },
      { ...icon, pairId: icon.id, uid: `${icon.id}:b`, matched: false, cardKind: "art" }
    ])).map((card, index) => ({ ...card, index }));
  }

  function createState(modeId = getStoredMode()) {
    const mode = getMode(modeId);
    setStoredMode(mode.id);
    return {
      mode: mode.id,
      score: 0,
      moves: 0,
      streak: 0,
      bestStreak: 0,
      timeLeft: 60,
      message: mode.intro,
      cards: buildDeck(mode.id),
      flipped: [],
      lockedUntil: 0,
      done: false,
      dirty: true
    };
  }

  function resetState(state, modeId = state.mode) {
    Object.assign(state, createState(modeId));
  }

  function flipCard(state, index) {
    if (state.done || state.lockedUntil || state.flipped.includes(index)) {
      return;
    }
    const card = state.cards[index];
    const mode = getMode(state.mode);
    if (!card || card.matched) {
      return;
    }
    state.flipped.push(index);
    state.message = state.mode === "name_face"
      ? (card.cardKind === "name" ? `Flipped the name ${card.label}.` : "Flipped a face card.")
      : `Flipped ${card.label}.`;
    if (state.flipped.length === 2) {
      state.moves += 1;
      const [firstIndex, secondIndex] = state.flipped;
      const first = state.cards[firstIndex];
      const second = state.cards[secondIndex];
      if (first.pairId === second.pairId) {
        first.matched = true;
        second.matched = true;
        state.flipped = [];
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.score += 120 + state.streak * 35;
        state.message = mode.matchText(first).replace("__STREAK__", String(state.streak));
        if (state.cards.every((entry) => entry.matched)) {
          state.done = true;
          state.message = mode.complete;
        }
      } else {
        state.streak = 0;
        state.lockedUntil = performance.now() + 700;
        state.message = mode.miss;
      }
    }
    markDirty();
  }

  return {
    id: "shadow_match",
    type: "board",
    name: "Shadow Match",
    description: "Pick a Memory Vault mode, then match either storybook cards or face-and-name pairs before the timer runs out.",
    controls: "Choose a vault mode, then click cards to flip two at a time. In Name + Face Match, pair each face tile with the correct name tile.",
    note: "This local version turns Shadow Match into a colorful Memory Vault with both storybook art and a classroom-style name-and-face learning mode.",
    stageTitle: "Memory Vault",
    stageHelp: "Kids can pick Storybook Match or Name + Face Match. Longer streaks push the reward tier from Common to Legendary before time expires.",
    createState() {
      return createState();
    },
    getActions(state) {
      return state.done
        ? [{ id: "restart", label: "Shuffle Again", className: "good" }]
        : [];
    },
    act(state, id) {
      if (id === "restart") {
        resetState(state, state.mode);
        renderStats();
        renderActions();
        renderBoard(true);
      }
    },
    update(state, dt) {
      const mode = getMode(state.mode);
      if (state.done) {
        return;
      }
      const previousTime = Math.ceil(state.timeLeft);
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      if (state.lockedUntil && performance.now() >= state.lockedUntil) {
        state.flipped = [];
        state.lockedUntil = 0;
        state.dirty = true;
      }
      if (Math.ceil(state.timeLeft) !== previousTime) {
        state.dirty = true;
      }
      if (state.timeLeft === 0) {
        state.done = true;
        state.flipped = [];
        state.message = mode.id === "name_face" ? "Time is up. Try another round of matching names and faces." : "Time is up.";
        state.dirty = true;
      }
    },
    render(state, container) {
      const mode = getMode(state.mode);
      const tier = rewardTier(state.bestStreak);
      const preview = mode.preview();
      const modeButtons = modePool.map((entry) => `
        <button type="button" class="memory-mode-btn ${entry.id === state.mode ? "active" : ""}" data-memory-mode="${entry.id}">
          <strong>${escapeHtml(entry.label)}</strong>
          <span>${escapeHtml(entry.id === "name_face" ? "Match names with real face tiles." : "Match bright picture pairs.")}</span>
        </button>
      `).join("");
      const cards = state.cards.map((card, index) => {
        const visible = card.matched || state.flipped.includes(index);
        const classes = [
          "match-card",
          "memory-vault-card",
          card.cardKind === "name" ? "memory-name-card" : "",
          card.cardKind === "face" ? "memory-face-card" : "",
          visible ? "flipped" : "hidden-card",
          card.matched ? "matched" : ""
        ].filter(Boolean).join(" ");
        if (!visible) {
          return `
            <button class="${classes}" type="button" data-match-index="${index}" aria-label="Flip card ${index + 1}">
              <span class="memory-card-shine"></span>
              <span class="memory-card-glyph"></span>
              <strong>Vault Card</strong>
              <span class="memory-card-note">Tap to peek</span>
            </button>
          `;
        }
        return `
          <button class="${classes}" type="button" data-match-index="${index}" style="--memory-accent:${card.accent};">
            <span class="memory-card-badge">${escapeHtml(card.family)}</span>
            ${card.cardKind === "name"
              ? `<span class="memory-name-chip">${escapeHtml(card.label)}</span>`
              : `<img class="memory-card-art" src="${card.sprite.src}" alt="${escapeHtml(card.label)}" />`}
            <strong>${escapeHtml(card.cardKind === "face" && !card.matched ? "Face Card" : card.label)}</strong>
            <span class="memory-card-note">${escapeHtml(card.cardKind === "face" && !card.matched ? "Remember this face, then find the matching name." : card.note)}</span>
          </button>
        `;
      }).join("");

      container.innerHTML = `
        <div class="solo-grid memory-vault-stage">
          <div class="memory-vault-hero">
            <div class="memory-vault-copy">
              <div class="eyebrow">${escapeHtml(mode.eyebrow)}</div>
              <h3>${escapeHtml(mode.title)}</h3>
              <p>${escapeHtml(mode.description)}</p>
            </div>
            <div class="memory-vault-pills">
              <div class="solo-pill">${escapeHtml(mode.pillLabel)}: ${escapeHtml(preview)}</div>
              <div class="solo-pill">Pairs: ${state.cards.length / 2}</div>
            </div>
          </div>
          <div class="memory-mode-row">${modeButtons}</div>
          <div class="solo-board-head">
            <div class="solo-pill">Time: ${Math.ceil(state.timeLeft)}s</div>
            <div class="solo-pill">Moves: ${state.moves}</div>
            <div class="solo-pill">Streak: ${state.streak}</div>
            <div class="solo-pill">Reward Tier: ${tier}</div>
          </div>
          <div class="memory-vault-grid-shell">
            <div class="match-grid memory-vault-grid">${cards}</div>
          </div>
          <div class="battle-log memory-vault-log"><strong>Vault Guide</strong><br />${escapeHtml(state.message)}</div>
        </div>
      `;

      container.querySelectorAll("[data-memory-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          resetState(state, button.getAttribute("data-memory-mode"));
          renderStats();
          renderActions();
          renderBoard(true);
        });
      });
      container.querySelectorAll("[data-match-index]").forEach((button) => {
        button.addEventListener("click", () => {
          flipCard(state, Number(button.getAttribute("data-match-index")));
          renderStats();
          renderActions();
          renderBoard(true);
        });
      });
    },
    getStats(state) {
      const mode = getMode(state.mode);
      return {
        primaryLabel: "Pairs",
        primaryValue: state.cards.filter((card) => card.matched).length / 2,
        secondaryLabel: "Tier",
        secondaryValue: rewardTier(state.bestStreak),
        status: state.done ? `${mode.label} | Final score ${state.score}` : `${mode.label} | ${Math.ceil(state.timeLeft)}s left | ${state.moves} moves`
      };
    },
    getBestValue(state) {
      return state.score + state.bestStreak * 100;
    }
  };
}

function createClassroomCleanupGame() {
  const binTypes = [
    { id: "books", label: "Books", sprite: sprites.cardWhite, lane: 0 },
    { id: "supplies", label: "Supplies", sprite: sprites.batHandle, lane: 1 },
    { id: "trash", label: "Trash", sprite: sprites.genericBall, lane: 2 }
  ];

  function spawnCleanupItem(state) {
    const type = pick(binTypes);
    state.currentItem = {
      ...type,
      y: 18,
      speed: 160 + state.sorted * 6
    };
  }

  function chooseLane(state, lane) {
    state.lane = clamp(lane, 0, 2);
    markDirty();
  }

  return {
    id: "classroom_cleanup",
    type: "board",
    name: "Classroom Cleanup",
    description: "Sort falling books, supplies, and trash before the classroom timer runs out.",
    controls: "Use Left and Right to pick a bin, or tap the bin buttons below the board.",
    note: "This local cleanup sprint keeps the sorting action but drops the multiplayer requirement, so it works as an instant solo page.",
    stageTitle: "Cleanup Sprint",
    stageHelp: "Move the cleaner to the right bin before the falling item reaches the sorting line.",
    createState() {
      return {
        score: 0,
        sorted: 0,
        missed: 0,
        combo: 0,
        lane: 1,
        timeLeft: 45,
        currentItem: null,
        spawnDelay: 0.4,
        message: "Sort the first item correctly.",
        done: false,
        dirty: true
      };
    },
    getActions(state) {
      if (state.done) {
        return [{ id: "restart", label: "Clean Again", className: "good" }];
      }
      return binTypes.map((type) => ({
        id: `lane:${type.lane}`,
        label: type.label,
        className: state.lane === type.lane ? "good" : ""
      }));
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
        return;
      }
      if (id.startsWith("lane:")) {
        chooseLane(state, Number(id.split(":")[1]));
      }
    },
    keydown(state, key) {
      if (key === "arrowleft" || key === "a") {
        chooseLane(state, state.lane - 1);
      }
      if (key === "arrowright" || key === "d") {
        chooseLane(state, state.lane + 1);
      }
    },
    update(state, dt) {
      if (state.done) {
        return;
      }
      const previousTime = Math.ceil(state.timeLeft);
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      if (Math.ceil(state.timeLeft) !== previousTime) {
        state.dirty = true;
      }
      if (state.timeLeft === 0) {
        state.done = true;
        state.message = "Cleanup time is up.";
        state.dirty = true;
        return;
      }
      if (!state.currentItem) {
        state.spawnDelay -= dt;
        if (state.spawnDelay <= 0) {
          spawnCleanupItem(state);
          state.dirty = true;
        }
        return;
      }
      state.currentItem.y += state.currentItem.speed * dt;
      state.dirty = true;
      if (state.currentItem.y >= 224) {
        const correctLane = state.currentItem.lane;
        const success = state.lane === correctLane;
        if (success) {
          state.sorted += 1;
          state.combo += 1;
          const gain = 45 + state.combo * 8;
          state.score += gain;
          state.message = `${state.currentItem.label} sorted right. +${gain}`;
        } else {
          state.missed += 1;
          state.combo = 0;
          state.score = Math.max(0, state.score - 20);
          state.message = `${state.currentItem.label} went into the wrong bin.`;
        }
        state.currentItem = null;
        state.spawnDelay = 0.3;
      }
    },
    render(state, container) {
      const cleanerLeft = ["16.5%", "50%", "83.5%"][state.lane];
      const activeItem = state.currentItem
        ? `
          <div class="cleanup-item" style="top:${state.currentItem.y}px;">
            <img src="${state.currentItem.sprite.src}" alt="${escapeHtml(state.currentItem.label)}" />
            <strong>${escapeHtml(state.currentItem.label)}</strong>
          </div>
        `
        : "";

      const bins = binTypes.map((type) => `
        <button
          class="cleanup-bin"
          type="button"
          data-cleanup-lane="${type.lane}"
          style="${state.lane === type.lane ? "border-color:rgba(255,212,71,0.38); background:rgba(255,212,71,0.12);" : ""}"
        >
          <img src="${type.sprite.src}" alt="${escapeHtml(type.label)}" />
          <strong>${escapeHtml(type.label)}</strong>
        </button>
      `).join("");

      container.innerHTML = `
        <div class="cleanup-stage">
          <div class="solo-board-head">
            <div class="solo-pill">Time: ${Math.ceil(state.timeLeft)}s</div>
            <div class="solo-pill">Sorted: ${state.sorted}</div>
            <div class="solo-pill">Combo: ${state.combo}</div>
            <div class="solo-pill">Missed: ${state.missed}</div>
          </div>
          <div class="cleanup-arena">
            ${activeItem}
            <div class="cleanup-cleaner" style="left:${cleanerLeft};">
              <img src="${sprites.heroBrown.src}" alt="Cleaner" />
              <div>Cleaner</div>
            </div>
            <div class="cleanup-bins">${bins}</div>
          </div>
          <div class="battle-log"><strong>Classroom Cleanup</strong><br />${escapeHtml(state.message)}</div>
        </div>
      `;

      container.querySelectorAll("[data-cleanup-lane]").forEach((button) => {
        button.addEventListener("click", () => {
          chooseLane(state, Number(button.getAttribute("data-cleanup-lane")));
          renderActions();
          renderStats();
          renderBoard(true);
        });
      });
    },
    getStats(state) {
      return {
        primaryLabel: "Score",
        primaryValue: state.score,
        secondaryLabel: "Sorted",
        secondaryValue: state.sorted,
        status: state.done ? `Final combo ${state.combo}` : `${Math.ceil(state.timeLeft)}s left | Missed ${state.missed}`
      };
    },
    getBestValue(state) {
      return state.score;
    }
  };
}

function createBattleRoyaleGame() {
  const PLAYER_FIGHTER_KEY = "solo-arcade-battle-fighter";
  const fighterRoster = [
    { id: "blue-captain", name: "Blue Captain", title: "Captain Tactician", sprite: sprites.heroBlue, special: "Photon Burst", accent: "#68d1ff", hp: 120 },
    { id: "dust-ranger", name: "Dust Ranger", title: "Badlands Scout", sprite: sprites.heroBrown, special: "Sand Breaker", accent: "#ffb474", hp: 122 },
    { id: "trail-scout", name: "Trail Scout", title: "Arena Explorer", sprite: sprites.survivor, special: "Trail Shot", accent: "#7dedb0", hp: 118 },
    { id: "arena-bot", name: "Arena Bot", title: "Steel Duelist", sprite: sprites.robot, special: "Steel Slam", accent: "#cfd8ff", hp: 124 },
    { id: "blue-striker", name: "Blue Striker", title: "Pitch Runner", sprite: sprites.playerBlue, special: "Sky Cross", accent: "#8dd7ff", hp: 116 },
    { id: "green-keeper", name: "Green Keeper", title: "Goal Guardian", sprite: sprites.playerGreen, special: "Wall Save", accent: "#8ef0bd", hp: 122 },
    { id: "red-striker", name: "Red Striker", title: "Rival Forward", sprite: sprites.playerRed, special: "Rocket Volley", accent: "#ff9b92", hp: 118 },
    { id: "triceratops", name: "Triceratops", title: "Horn Charger", sprite: sprites.triceratops, special: "Horn Charge", accent: "#ffd447", hp: 128 }
  ];
  const enemyPool = [
    ...fighterRoster,
    { id: "velociraptor", name: "Velociraptor", title: "Speed Hunter", sprite: sprites.velociraptor, special: "Pounce Rush", accent: "#ff8f8f", hp: 116 },
    { id: "stegosaurus", name: "Stegosaurus", title: "Plate Crusher", sprite: sprites.stegosaurus, special: "Tail Slam", accent: "#ffe08a", hp: 126 },
    { id: "tyrannosaurus", name: "T. rex", title: "Arena Titan", sprite: sprites.trex, special: "Prime Roar", accent: "#ffd447", hp: 132 }
  ];

  function getStoredFighterId() {
    try {
      return window.localStorage.getItem(PLAYER_FIGHTER_KEY) || fighterRoster[0].id;
    } catch {
      return fighterRoster[0].id;
    }
  }

  function setStoredFighterId(id) {
    try {
      window.localStorage.setItem(PLAYER_FIGHTER_KEY, id);
    } catch {
      // Ignore storage failures in embedded or private contexts.
    }
  }

  function getFighterTemplate(id, pool = fighterRoster) {
    return pool.find((entry) => entry.id === id) || pool[0];
  }

  function createFighter(template) {
    return {
      id: template.id,
      name: template.name,
      title: template.title,
      sprite: template.sprite,
      special: template.special,
      accent: template.accent,
      hp: template.hp,
      maxHp: template.hp,
      guard: 0
    };
  }

  function spawnEnemy(round, selectedFighterId) {
    let template = enemyPool[(round - 1) % enemyPool.length];
    if (enemyPool.length > 1 && template.id === selectedFighterId) {
      template = enemyPool[round % enemyPool.length];
    }
    const baseHp = Math.max(94, template.hp - 12);
    const maxHp = baseHp + (round - 1) * 16;
    return {
      id: template.id,
      name: template.name,
      title: template.title,
      sprite: template.sprite,
      special: template.special,
      accent: template.accent,
      hp: maxHp,
      maxHp,
      guard: 0
    };
  }

  function createBattleState(fighterId = getStoredFighterId()) {
    const template = getFighterTemplate(fighterId);
    setStoredFighterId(template.id);
    return {
      selectedFighterId: template.id,
      player: createFighter(template),
      enemy: spawnEnemy(1, template.id),
      round: 1,
      score: 0,
      healUses: 3,
      specialCharge: 0,
      turn: "player",
      pendingCpuAt: 0,
      message: "Choose your opening move.",
      log: ["Choose your opening move.", `${template.name} entered the arena.`],
      done: false,
      dirty: true
    };
  }

  function resetBattleState(state, fighterId = state.selectedFighterId) {
    Object.assign(state, createBattleState(fighterId));
  }

  function pushLog(state, line) {
    state.log.unshift(line);
    state.log = state.log.slice(0, 5);
    state.message = line;
    state.dirty = true;
  }

  function applyDamage(target, amount) {
    let next = amount;
    if (target.guard > 0) {
      next = Math.round(amount * (1 - target.guard));
      target.guard = 0;
    }
    target.hp = Math.max(0, target.hp - next);
    return next;
  }

  function nextEnemy(state) {
    state.score += 1;
    state.round += 1;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 24);
    state.specialCharge = Math.min(100, state.specialCharge + 25);
    state.enemy = spawnEnemy(state.round, state.selectedFighterId);
    state.turn = "player";
    pushLog(state, `New challenger: ${state.enemy.name}.`);
  }

  function finishPlayerTurn(state) {
    if (state.enemy.hp <= 0) {
      nextEnemy(state);
      return;
    }
    state.turn = "cpu";
    state.pendingCpuAt = performance.now() + 650;
  }

  function cpuTurn(state) {
    if (state.done || state.turn !== "cpu") {
      return;
    }
    state.pendingCpuAt = 0;
    if (state.enemy.hp < 34 && Math.random() < 0.26) {
      const heal = randInt(12, 22);
      state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + heal);
      pushLog(state, `${state.enemy.name} recovered ${heal} HP.`);
      state.turn = "player";
      return;
    }
    if (Math.random() < 0.24) {
      state.enemy.guard = 0.5;
      pushLog(state, `${state.enemy.name} raised a guard.`);
      state.turn = "player";
      return;
    }
    const heavy = Math.random() < 0.2;
    const baseDamage = heavy ? randInt(22, 34) + state.round : randInt(12, 20) + state.round;
    const dealt = applyDamage(state.player, baseDamage);
    pushLog(state, `${state.enemy.name} used ${heavy ? state.enemy.special : "Strike"} for ${dealt}.`);
    if (state.player.hp <= 0) {
      state.done = true;
      state.turn = "ended";
      pushLog(state, "You were knocked out.");
      return;
    }
    state.turn = "player";
  }

    return {
    id: "battle_royale",
    type: "board",
    name: "Battle Royale",
    description: "Pick a fighter sprite, enter a lit stadium arena, and battle CPU challengers with guards, heals, and specials.",
    controls: "Pick an action each turn. Build special charge by surviving and attacking, then spend it on a heavy move.",
    note: "This solo arena now lets you pick from a fuller fighter roster so your character matches the look you want, then throws that pick into a local stadium gauntlet with no login and no second player.",
    stageTitle: "Solo Battle Arena",
    stageHelp: "Pick your fighter, then beat one challenger after another. Each win heals you a bit and spawns a tougher rival in the stadium.",
    createState() {
      return createBattleState();
    },
    getActions(state) {
      if (state.done) {
        return [{ id: "restart", label: "Fight Again", className: "good" }];
      }
      return [
        { id: "attack", label: "Attack", disabled: state.turn !== "player" },
        { id: "guard", label: "Guard", disabled: state.turn !== "player" },
        { id: "heal", label: `Heal (${state.healUses})`, disabled: state.turn !== "player" || state.healUses <= 0 },
        { id: "special", label: `Special ${state.specialCharge}%`, className: state.specialCharge >= 100 ? "good" : "", disabled: state.turn !== "player" }
      ];
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
        return;
      }
      if (state.done || state.turn !== "player") {
        return;
      }
      if (id === "attack") {
        const dealt = applyDamage(state.enemy, randInt(14, 24) + state.round);
        state.specialCharge = Math.min(100, state.specialCharge + 22);
        pushLog(state, `${state.player.name} attacked for ${dealt}.`);
        finishPlayerTurn(state);
        return;
      }
      if (id === "guard") {
        state.player.guard = 0.58;
        state.specialCharge = Math.min(100, state.specialCharge + 10);
        pushLog(state, `${state.player.name} braced for the next hit.`);
        finishPlayerTurn(state);
        return;
      }
      if (id === "heal" && state.healUses > 0) {
        const heal = randInt(18, 28);
        state.healUses -= 1;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
        state.specialCharge = Math.min(100, state.specialCharge + 8);
        pushLog(state, `${state.player.name} recovered ${heal} HP.`);
        finishPlayerTurn(state);
        return;
      }
      if (id === "special") {
        if (state.specialCharge < 100) {
          pushLog(state, "Special charge is not full yet.");
          return;
        }
        state.specialCharge = 0;
        const dealt = applyDamage(state.enemy, randInt(28, 42) + state.round * 2);
        pushLog(state, `${state.player.special} landed for ${dealt}.`);
        finishPlayerTurn(state);
      }
    },
    update(state) {
      if (state.pendingCpuAt && performance.now() >= state.pendingCpuAt) {
        cpuTurn(state);
      }
    },
    render(state, container) {
      const enemyHpWidth = `${clamp((state.enemy.hp / state.enemy.maxHp) * 100, 0, 100)}%`;
      const playerHpWidth = `${clamp((state.player.hp / state.player.maxHp) * 100, 0, 100)}%`;
      const rosterButtons = fighterRoster.map((fighter) => `
        <button
          class="arena-roster-btn ${fighter.id === state.selectedFighterId ? "active" : ""}"
          type="button"
          data-fighter-pick="${fighter.id}"
          style="--fighter-accent:${fighter.accent};"
        >
          <img src="${fighter.sprite.src}" alt="${escapeHtml(fighter.name)}" />
          <span>${escapeHtml(fighter.name)}</span>
        </button>
      `).join("");
      const renderFighterCard = (fighter, hpWidth, side) => `
        <div class="fighter-card arena-fighter-card arena-fighter-${side}" style="--fighter-accent:${fighter.accent};">
          <div class="arena-fighter-scene">
            <div class="arena-crowd-band"></div>
            <div class="arena-spotlight"></div>
            <div class="arena-fighter-platform"></div>
            <img class="arena-fighter-sprite" src="${fighter.sprite.src}" alt="${escapeHtml(fighter.name)}" />
            ${fighter.guard > 0 ? '<div class="arena-guard-badge">Guard Up</div>' : ""}
          </div>
          <div class="arena-fighter-copy">
            <div class="arena-fighter-role">${escapeHtml(fighter.title || "Arena Challenger")}</div>
            <h3>${escapeHtml(fighter.name)}</h3>
            <div class="arena-special-label">${escapeHtml(fighter.special)}</div>
            <div class="hp-bar"><div class="hp-fill" style="width:${hpWidth};"></div></div>
            <div>${fighter.hp} / ${fighter.maxHp} HP</div>
          </div>
        </div>
      `;
      container.innerHTML = `
        <div class="battle-stage battle-arena-stage">
          <div class="battle-arena-hero">
            <img class="battle-arena-image" src="${sprites.battleArenaStadium.src}" alt="Stadium arena" />
            <div class="battle-arena-copy">
              <div class="eyebrow">Pick Your Fighter</div>
              <h3>Stadium Showdown</h3>
              <p>Tap any roster tile to restart the gauntlet as that fighter. Your selected sprite becomes the duelist for the run.</p>
            </div>
            <div class="battle-arena-pill-stack">
              <div class="solo-pill">Your Pick: ${escapeHtml(state.player.name)}</div>
              <div class="solo-pill">${state.specialCharge >= 100 ? "Special Ready" : `${escapeHtml(state.player.special)} charging`}</div>
            </div>
          </div>
          <div class="arena-roster">${rosterButtons}</div>
          <div class="solo-board-head">
            <div class="solo-pill">Wins: ${state.score}</div>
            <div class="solo-pill">Round: ${state.round}</div>
            <div class="solo-pill">Special: ${state.specialCharge}%</div>
            <div class="solo-pill">Turn: ${state.turn === "cpu" ? "Enemy" : state.done ? "Ended" : "Player"}</div>
          </div>
          <div class="fighter-grid arena-fighter-grid">
            ${renderFighterCard(state.player, playerHpWidth, "player")}
            ${renderFighterCard(state.enemy, enemyHpWidth, "enemy")}
          </div>
          <div class="battle-log arena-battle-log">
            <strong>Battle Log</strong><br />
            ${state.log.map((line) => escapeHtml(line)).join("<br />")}
          </div>
        </div>
      `;

      container.querySelectorAll("[data-fighter-pick]").forEach((button) => {
        button.addEventListener("click", () => {
          resetBattleState(state, button.getAttribute("data-fighter-pick"));
          renderStats();
          renderActions();
          renderBoard(true);
        });
      });
    },
    getStats(state) {
      return {
        primaryLabel: "Wins",
        primaryValue: state.score,
        secondaryLabel: "HP",
        secondaryValue: state.player.hp,
        status: state.done ? `Final wins ${state.score}` : `${state.enemy.name} at ${state.enemy.hp} HP`
      };
    },
    getBestValue(state) {
      return state.score * 100 + state.player.hp;
    }
  };
}

const games = {
  asteroids: createAsteroidsGame(),
  goalie_rush: createGoalieRushGame(),
  hallway_dash: createHallwayDashGame(),
  dino_dig: createDinoDigGame(),
  shadow_match: createShadowMatchGame(),
  classroom_cleanup: createClassroomCleanupGame(),
  battle_royale: createBattleRoyaleGame()
};

if (typeof window.createPokemonStadiumGameModule === "function") {
  const pokemonStadiumGame = window.createPokemonStadiumGameModule({
    sprites,
    clamp,
    randInt,
    pick,
    escapeHtml,
    startGame,
    renderStats,
    renderActions,
    renderBoard
  });
  if (pokemonStadiumGame && pokemonStadiumGame.id) {
    games[pokemonStadiumGame.id] = pokemonStadiumGame;
  }
}

function startGame(id) {
  currentId = games[id] ? id : "asteroids";
  currentGame = games[currentId];
  currentState = currentGame.createState();

  refs.title.textContent = currentGame.name;
  refs.description.textContent = currentGame.description;
  refs.controls.textContent = currentGame.controls;
  refs.note.textContent = currentGame.note;
  refs.stageTitle.textContent = currentGame.stageTitle;
  refs.stageHelp.textContent = currentGame.stageHelp;

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("game", currentId);
  if (embedMode) {
    nextUrl.searchParams.set("embed", "1");
  } else {
    nextUrl.searchParams.delete("embed");
  }
  window.history.replaceState({}, "", nextUrl);

  useSurface(currentGame.type);
  refs.boardStage.innerHTML = "";
  refs.actions.dataset.signature = "";
  renderActions();
  renderStats();
  renderBoard(true);
}

refs.restartBtn.addEventListener("click", () => startGame(currentId));

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) {
    event.preventDefault();
  }
  input.keys.add(key);
  if (currentGame && typeof currentGame.keydown === "function" && currentState) {
    currentGame.keydown(currentState, key, event);
    renderActions();
    renderStats();
    renderBoard(true);
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  input.keys.delete(key);
});

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;

  if (currentGame && currentState) {
    if (typeof currentGame.update === "function") {
      currentGame.update(currentState, dt, now / 1000);
    }
    if (currentGame.type === "canvas" && typeof currentGame.render === "function") {
      currentGame.render(currentState, now / 1000);
    } else {
      renderBoard();
    }
    renderStats();
    renderActions();
  }

  window.requestAnimationFrame(frame);
}

startGame(params.get("game") || "asteroids");
window.requestAnimationFrame(frame);
