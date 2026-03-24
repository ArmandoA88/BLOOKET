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
  playerRed: loadSprite("/assets/standalone/sports/player-red.png"),
  soccerBall: loadSprite("/assets/standalone/sports/ball-soccer.png"),
  football: loadSprite("/assets/standalone/sports/ball-football.png"),
  genericBall: loadSprite("/assets/standalone/sports/ball-generic.png"),
  cardRed: loadSprite("/assets/standalone/sports/card-red.png"),
  cardWhite: loadSprite("/assets/standalone/sports/card-white.png"),
  cardYellow: loadSprite("/assets/standalone/sports/card-yellow.png"),
  batHandle: loadSprite("/assets/standalone/sports/bat-handle.png"),
  flagGreen: loadSprite("/assets/standalone/sports/flag-green.png"),
  trex: loadSprite("/assets/standalone/dinos/tyrannosaurus.png"),
  triceratops: loadSprite("/assets/standalone/dinos/triceratops.png"),
  stegosaurus: loadSprite("/assets/standalone/dinos/stegosaurus.png"),
  velociraptor: loadSprite("/assets/standalone/dinos/velociraptor.png")
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
  const lanes = [laneCenter(0, 3), laneCenter(1, 3), laneCenter(2, 3)];

  function makeQuestion(level) {
    const range = Math.min(12 + level * 2, 40);
    const a = randInt(3, range);
    const b = randInt(2, Math.max(4, Math.floor(range * 0.7)));
    const mode = level > 5 ? pick(["+", "-", "+"]) : pick(["+", "-"]);
    const correct = mode === "+" ? a + b : a - b;
    const offsetA = randInt(2, 9);
    const offsetB = randInt(3, 11);
    return {
      prompt: `${a} ${mode} ${b} = ?`,
      options: shuffle([correct, correct + offsetA, correct - offsetB]),
      correct
    };
  }

  function spawnWave(state) {
    const question = makeQuestion(state.level);
    state.question = question.prompt;
    state.options = question.options;
    state.correct = question.correct;
    state.asteroids = question.options.map((value, index) => ({
      lane: index,
      x: lanes[index],
      y: rand(-220, -40),
      speed: 88 + state.level * 16 + index * 8,
      value,
      angle: rand(0, Math.PI * 2)
    }));
  }

  function loseShield(state, reason) {
    state.shields -= 1;
    state.streak = 0;
    state.feedback = reason;
    state.particles.push(...createParticles(16, W / 2, H - 92, "#ff8f8f"));
    if (state.shields <= 0) {
      state.over = true;
    } else {
      spawnWave(state);
    }
  }

  function answer(state, index) {
    if (state.over || index < 0 || index >= state.options.length) {
      return;
    }
    const selected = state.options[index];
    if (selected === state.correct) {
      const points = 110 + state.streak * 30 + state.level * 10;
      const asteroid = state.asteroids[index];
      state.score += points;
      state.streak += 1;
      state.level += 1;
      state.feedback = `Direct hit! +${points}`;
      state.particles.push(...createParticles(22, asteroid.x, asteroid.y + 28, "#ffd447"));
      spawnWave(state);
      return;
    }
    loseShield(state, "Wrong answer. Shield lost.");
  }

  return {
    id: "asteroids",
    type: "canvas",
    name: "Asteroids",
    description: "Answer fast to blast asteroid waves and keep your streak climbing.",
    controls: "Press 1, 2, or 3 to choose an answer. You can also tap the answer buttons.",
    note: "This solo version keeps the fast-answer feel locally, so there is no login, room, or extra players needed.",
    stageTitle: "Math Blaster",
    stageHelp: "Solve each prompt before the falling asteroid answers crash into your ship.",
    createState() {
      const state = {
        score: 0,
        level: 1,
        streak: 0,
        shields: 3,
        question: "",
        correct: 0,
        options: [],
        asteroids: [],
        feedback: "Blasters online.",
        particles: [],
        over: false
      };
      spawnWave(state);
      return state;
    },
    getActions(state) {
      if (state.over) {
        return [{ id: "restart", label: "Play Again", className: "good" }];
      }
      return state.options.map((option, index) => ({
        id: `answer:${index}`,
        label: `${index + 1}. ${option}`,
        className: "good"
      }));
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
        return;
      }
      if (id.startsWith("answer:")) {
        answer(state, Number(id.split(":")[1]));
      }
    },
    keydown(state, key) {
      if (["1", "2", "3"].includes(key)) {
        answer(state, Number(key) - 1);
      }
    },
    update(state, dt, now) {
      updateParticles(state, dt);
      if (state.over) {
        return;
      }

      for (const asteroid of state.asteroids) {
        asteroid.y += asteroid.speed * dt;
        asteroid.angle += dt * 0.8;
        if (asteroid.y > H - 120) {
          loseShield(state, "An asteroid slipped through.");
          break;
        }
      }

      state.status = `Wave ${state.level}`;
      state.time = now;
    },
    render(state) {
      clearCanvas("#08111c");
      drawStarField(state.time || 0, 46);

      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, "rgba(35, 71, 105, 0.18)");
      gradient.addColorStop(1, "rgba(7, 17, 29, 0.65)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      drawRoundedRect(140, 34, W - 280, 78, 24, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)");
      drawText(state.question, W / 2, 72, 28, "#f4fbff");

      for (let i = 0; i < lanes.length; i += 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(151, 214, 255, 0.12)";
        ctx.setLineDash([10, 14]);
        ctx.beginPath();
        ctx.moveTo(lanes[i], 122);
        ctx.lineTo(lanes[i], H - 126);
        ctx.stroke();
        ctx.restore();
      }

      for (const asteroid of state.asteroids) {
        drawSprite(sprites.genericBall, asteroid.x - 38, asteroid.y - 38, 76, 76, { angle: asteroid.angle });
        drawText(String(asteroid.value), asteroid.x, asteroid.y + 2, 24, "#07111d");
      }

      drawSprite(sprites.robot, W / 2 - 50, H - 124, 100, 100);

      for (let i = 0; i < state.shields; i += 1) {
        drawRoundedRect(36 + i * 42, 34, 30, 30, 10, "rgba(125,237,176,0.16)", "rgba(125,237,176,0.4)");
      }

      drawRoundedRect(170, H - 102, W - 340, 58, 18, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
      drawText(state.feedback, W / 2, H - 74, 18, state.over ? "#ffb0b0" : "#ffd447", "center", "Baloo 2");
      drawParticles(state);

      if (state.over) {
        drawRoundedRect(240, 178, W - 480, 160, 26, "rgba(7,17,29,0.84)", "rgba(255,212,71,0.22)");
        drawText("Ship Down", W / 2, 226, 34, "#ffd447");
        drawText(`Final Score ${state.score}`, W / 2, 272, 24, "#f4fbff");
        drawText("Tap restart to blast another run.", W / 2, 312, 18, "rgba(244,251,255,0.72)", "center", "Baloo 2");
      }
    },
    getStats(state) {
      return {
        primaryLabel: "Score",
        primaryValue: Math.round(state.score),
        secondaryLabel: "Streak",
        secondaryValue: state.over ? "Ended" : `${state.streak}x`,
        status: state.over ? `Final wave ${Math.max(1, state.level - 1)}` : `Shields ${state.shields} | Wave ${state.level}`
      };
    },
    getBestValue(state) {
      return state.score;
    }
  };
}

function createGoalieRushGame() {
  const lanes = [laneCenter(0, 3, 280), laneCenter(1, 3, 280), laneCenter(2, 3, 280)];

  function spawnShot(state) {
    state.shot = {
      lane: randInt(0, 2),
      y: -40,
      boss: state.round % 5 === 0,
      speed: 170 + state.round * 14
    };
    if (state.shot.boss) {
      state.shot.speed += 60;
    }
  }

  function resolveShot(state, saved) {
    if (saved) {
      const gain = state.shot.boss ? 180 : 70;
      state.score += gain;
      state.saves += 1;
      if (state.shot.boss) {
        state.bossSaves += 1;
      }
      state.feedback = state.shot.boss ? `Boss save! +${gain}` : `Save! +${gain}`;
      state.particles.push(...createParticles(16, lanes[state.lane], H - 140, "#7dedb0"));
    } else {
      state.misses += 1;
      state.feedback = state.shot.boss ? "Boss shot got through." : "Goal against you.";
      state.particles.push(...createParticles(16, lanes[state.shot.lane], H - 126, "#ff8f8f"));
      if (state.misses >= 3) {
        state.over = true;
      }
    }
    state.round += 1;
    state.shot = null;
    state.cooldown = 0.4;
  }

  return {
    id: "goalie_rush",
    type: "canvas",
    name: "Goalie Rush",
    description: "Block faster and faster soccer shots, with boss rounds paying extra.",
    controls: "Use Left and Right or A and D to move between lanes before the shot reaches the goal.",
    note: "This solo build runs instantly in the browser and lets you practice saves without a room or class lobby.",
    stageTitle: "Penalty Wall",
    stageHelp: "Every fifth shot is a boss shot. Get into the right lane before it reaches the goal line.",
    createState() {
      return {
        lane: 1,
        round: 1,
        score: 0,
        saves: 0,
        bossSaves: 0,
        misses: 0,
        cooldown: 0.25,
        shot: null,
        feedback: "Protect the net.",
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
    },
    update(state, dt, now) {
      state.time = now;
      updateParticles(state, dt);
      if (state.over) {
        return;
      }
      if (!state.shot) {
        state.cooldown -= dt;
        if (state.cooldown <= 0) {
          spawnShot(state);
        }
        return;
      }
      state.shot.y += state.shot.speed * dt;
      if (state.shot.y >= H - 170) {
        resolveShot(state, state.shot.lane === state.lane);
      }
    },
    render(state) {
      clearCanvas("#0a1a22");
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#142a40");
      sky.addColorStop(1, "#0b1624");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#13394d";
      ctx.fillRect(0, H - 160, W, 160);
      ctx.fillStyle = "#2c7b57";
      ctx.fillRect(0, H - 120, W, 120);

      drawRoundedRect(180, 88, W - 360, 280, 28, "rgba(255,255,255,0.02)", "rgba(255,255,255,0.2)", 4);
      for (const x of lanes) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.setLineDash([12, 14]);
        ctx.beginPath();
        ctx.moveTo(x, 92);
        ctx.lineTo(x, H - 120);
        ctx.stroke();
        ctx.restore();
      }

      drawSprite(sprites.playerBlue, lanes[state.lane] - 54, H - 160, 108, 108);

      if (state.shot) {
        const ballSprite = state.shot.boss ? sprites.football : sprites.soccerBall;
        const size = state.shot.boss ? 66 : 54;
        drawSprite(ballSprite, lanes[state.shot.lane] - size / 2, state.shot.y - size / 2, size, size, {
          angle: state.time * (state.shot.boss ? 4 : 2)
        });
      }

      drawRoundedRect(22, 22, 210, 54, 16, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
      drawText(`Round ${state.round}`, 127, 50, 20, "#f4fbff");
      drawRoundedRect(W - 238, 22, 216, 54, 16, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
      drawText(`Boss Saves ${state.bossSaves}`, W - 130, 50, 20, "#ffd447");
      drawRoundedRect(240, H - 92, W - 480, 54, 18, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
      drawText(state.feedback, W / 2, H - 65, 18, state.over ? "#ffb0b0" : "#f4fbff", "center", "Baloo 2");
      drawParticles(state);

      if (state.over) {
        drawRoundedRect(252, 176, W - 504, 160, 24, "rgba(6,12,18,0.84)", "rgba(255,143,143,0.26)");
        drawText("Final Whistle", W / 2, 224, 34, "#ffd447");
        drawText(`You saved ${state.saves} shots`, W / 2, 272, 24, "#f4fbff");
        drawText("Restart to defend another streak.", W / 2, 312, 18, "rgba(244,251,255,0.72)", "center", "Baloo 2");
      }
    },
    getStats(state) {
      return {
        primaryLabel: "Saves",
        primaryValue: state.saves,
        secondaryLabel: "Boss Saves",
        secondaryValue: state.bossSaves,
        status: state.over ? `Misses ${state.misses}` : `Misses ${state.misses}/3 | Round ${state.round}`
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
    { id: "bag", label: "Backpack", sprite: sprites.football, color: "#ffcf6e" },
    { id: "sign", label: "Wet Floor", sprite: sprites.flagGreen, color: "#8ef0bd" },
    { id: "book", label: "Book Stack", sprite: sprites.cardWhite, color: "#dce9ff" }
  ];

  function spawnTrackItem(state) {
    const lane = randInt(0, 2);
    if (Math.random() < 0.28) {
      state.pickups.push({
        lane,
        y: -50,
        sprite: sprites.cardYellow,
        label: "Hall Pass"
      });
      return;
    }
    const type = pick(obstacleTypes);
    state.obstacles.push({
      lane,
      y: -68,
      type
    });
  }

  function playerY(state) {
    return H - 170 - state.jump;
  }

  function hitPlayer(state, obstacle) {
    state.hearts -= 1;
    state.obstacles = state.obstacles.filter((entry) => entry !== obstacle);
    state.feedback = `${obstacle.type.label} slowed you down.`;
    state.particles.push(...createParticles(18, lanes[obstacle.lane], H - 132, "#ff8f8f"));
    if (state.hearts <= 0) {
      state.over = true;
    }
  }

  return {
    id: "hallway_dash",
    type: "canvas",
    name: "Hallway Dash",
    description: "Run the hall, dodge clutter, jump hazards, and grab hall-pass pickups.",
    controls: "Use Left and Right or A and D to change lanes. Press Space to jump.",
    note: "This solo hallway version runs immediately in the browser, so students can practice without signing in or waiting on other players.",
    stageTitle: "Hallway Sprint",
    stageHelp: "Stay in front of the clutter rush, jump at the right time, and scoop up yellow hall-pass cards for bonus points.",
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
      if (key === " " && state.jump === 0) {
        state.vy = 560;
      }
    },
    update(state, dt, now) {
      state.time = now;
      updateParticles(state, dt);
      if (state.over) {
        return;
      }

      state.speed = 270 + state.distance * 0.2;
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
      }

      const player = { x: lanes[state.lane], y: playerY(state) + 52 };

      for (const obstacle of [...state.obstacles]) {
        if (obstacle.y > H + 60) {
          state.obstacles = state.obstacles.filter((entry) => entry !== obstacle);
          continue;
        }
        const obstaclePoint = { x: lanes[obstacle.lane], y: obstacle.y + 34 };
        const grounded = state.jump < 36;
        if (grounded && obstacle.lane === state.lane && distance(player, obstaclePoint) < 62) {
          hitPlayer(state, obstacle);
        }
      }

      for (const pickup of [...state.pickups]) {
        if (pickup.y > H + 60) {
          state.pickups = state.pickups.filter((entry) => entry !== pickup);
          continue;
        }
        const pickupPoint = { x: lanes[pickup.lane], y: pickup.y + 28 };
        if (pickup.lane === state.lane && distance(player, pickupPoint) < 58) {
          state.coins += 1;
          state.feedback = "Hall pass collected.";
          state.particles.push(...createParticles(14, pickupPoint.x, pickupPoint.y, "#ffd447"));
          state.pickups = state.pickups.filter((entry) => entry !== pickup);
        }
      }
    },
    render(state) {
      clearCanvas("#0a1726");

      const wall = ctx.createLinearGradient(0, 0, 0, H);
      wall.addColorStop(0, "#203149");
      wall.addColorStop(0.48, "#14263b");
      wall.addColorStop(1, "#0c1826");
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 8; i += 1) {
        const stripeY = (i * 84 + state.distance * 18) % (H + 80) - 40;
        drawRoundedRect(78, stripeY, 110, 44, 12, "rgba(255,255,255,0.06)");
        drawRoundedRect(W - 188, stripeY, 110, 44, 12, "rgba(255,255,255,0.06)");
      }

      ctx.fillStyle = "#20384a";
      ctx.fillRect(0, H - 152, W, 152);
      ctx.fillStyle = "#121f2c";
      ctx.fillRect(0, H - 118, W, 118);

      for (let i = 0; i < lanes.length; i += 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.13)";
        ctx.setLineDash([16, 16]);
        ctx.beginPath();
        ctx.moveTo(lanes[i], 0);
        ctx.lineTo(lanes[i], H);
        ctx.stroke();
        ctx.restore();
      }

      for (const obstacle of state.obstacles) {
        drawSprite(obstacle.type.sprite, lanes[obstacle.lane] - 36, obstacle.y - 36, 72, 72);
      }
      for (const pickup of state.pickups) {
        drawSprite(pickup.sprite, lanes[pickup.lane] - 26, pickup.y - 26, 52, 52);
      }

      drawSprite(sprites.heroBlue, lanes[state.lane] - 54, playerY(state), 108, 108);

      for (let i = 0; i < state.hearts; i += 1) {
        drawRoundedRect(30 + i * 42, 28, 30, 30, 10, "rgba(255,212,71,0.18)", "rgba(255,212,71,0.42)");
      }

      drawRoundedRect(180, 24, W - 360, 56, 18, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
      drawText(state.feedback, W / 2, 52, 18, state.over ? "#ffb0b0" : "#f4fbff", "center", "Baloo 2");
      drawParticles(state);

      if (state.over) {
        drawRoundedRect(232, 174, W - 464, 166, 24, "rgba(7,17,29,0.84)", "rgba(255,143,143,0.24)");
        drawText("Hall Closed", W / 2, 224, 34, "#ffd447");
        drawText(`Distance ${Math.floor(state.distance)} m`, W / 2, 272, 24, "#f4fbff");
        drawText("Restart for another hallway run.", W / 2, 316, 18, "rgba(244,251,255,0.72)", "center", "Baloo 2");
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
  const digFinds = [
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.cardYellow, tint: "#ffd447" },
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.cardYellow, tint: "#ffd447" },
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.cardYellow, tint: "#ffd447" },
    { kind: "fossil", label: "Fossil", points: 55, sprite: sprites.cardWhite, tint: "#dce7ff" },
    { kind: "fossil", label: "Fossil", points: 55, sprite: sprites.cardWhite, tint: "#dce7ff" },
    { kind: "fossil", label: "Fossil", points: 55, sprite: sprites.cardWhite, tint: "#dce7ff" },
    { kind: "bones", label: "Bones", points: 30, sprite: sprites.batHandle, tint: "#ffb474" },
    { kind: "bones", label: "Bones", points: 30, sprite: sprites.batHandle, tint: "#ffb474" },
    { kind: "bones", label: "Bones", points: 30, sprite: sprites.batHandle, tint: "#ffb474" },
    { kind: "empty", label: "Dust", points: 8, sprite: sprites.flagGreen, tint: "#8ef0bd" },
    { kind: "empty", label: "Dust", points: 8, sprite: sprites.flagGreen, tint: "#8ef0bd" },
    { kind: "empty", label: "Dust", points: 8, sprite: sprites.flagGreen, tint: "#8ef0bd" },
    { kind: "dino", label: "T. rex", points: 180, sprite: sprites.trex, tint: "#ffd447" },
    { kind: "dino", label: "Triceratops", points: 180, sprite: sprites.triceratops, tint: "#ffd447" },
    { kind: "dino", label: "Stegosaurus", points: 180, sprite: sprites.stegosaurus, tint: "#ffd447" },
    { kind: "dino", label: "Velociraptor", points: 180, sprite: sprites.velociraptor, tint: "#ffd447" },
    { kind: "coins", label: "Coin Cache", points: 40, sprite: sprites.cardYellow, tint: "#ffd447" },
    { kind: "fossil", label: "Fossil", points: 55, sprite: sprites.cardWhite, tint: "#dce7ff" },
    { kind: "bones", label: "Bones", points: 30, sprite: sprites.batHandle, tint: "#ffb474" },
    { kind: "empty", label: "Dust", points: 8, sprite: sprites.flagGreen, tint: "#8ef0bd" }
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
    state.message = `${tile.label} found for +${tile.points}.`;
    if (state.digsLeft === 0 || state.tiles.every((entry) => entry.dug)) {
      state.done = true;
    }
    markDirty();
  }

  return {
    id: "dino_dig",
    type: "board",
    name: "Dino Dig",
    description: "Dig through the site for fossils, bones, coins, and rare dinosaur finds.",
    controls: "Click a hidden tile to dig. Each run gives you twelve digs, so choose carefully.",
    note: "This solo version is a local dig site with no lobby or teammates. Your best score is saved only on this browser.",
    stageTitle: "Dig Site",
    stageHelp: "Each tile hides a reward. Rare dinosaur pulls are worth the most points before the dig budget runs out.",
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
          return `<button class="dig-card hidden-card" type="button" data-dig-index="${tile.id}" aria-label="Dig tile ${tile.id + 1}"></button>`;
        }
        return `
          <div class="dig-card">
            <img src="${tile.sprite.src}" alt="${escapeHtml(tile.label)}" />
            <strong>${escapeHtml(tile.label)}</strong>
            <div style="color:${tile.tint}; font-family:Orbitron,monospace;">+${tile.points}</div>
          </div>
        `;
      }).join("");

      container.innerHTML = `
        <div class="solo-grid">
          <div class="solo-board-head">
            <div class="solo-pill">Digs Left: ${state.digsLeft}</div>
            <div class="solo-pill">Fossils: ${state.fossils}</div>
            <div class="solo-pill">Rare Finds: ${state.rareFinds}</div>
            <div class="solo-pill">Scout: <img class="sprite-inline" src="${sprites.survivor.src}" alt="Explorer" /></div>
          </div>
          <div class="dig-grid">${tiles}</div>
          <div class="battle-log"><strong>Site Notes</strong><br />${escapeHtml(state.message)}</div>
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
  const iconPool = [
    { id: "heroBlue", label: "Hero Blue", sprite: sprites.heroBlue },
    { id: "heroBrown", label: "Hero Brown", sprite: sprites.heroBrown },
    { id: "robot", label: "Robot", sprite: sprites.robot },
    { id: "survivor", label: "Explorer", sprite: sprites.survivor },
    { id: "playerBlue", label: "Striker", sprite: sprites.playerBlue },
    { id: "playerRed", label: "Rival", sprite: sprites.playerRed },
    { id: "trex", label: "T. rex", sprite: sprites.trex },
    { id: "triceratops", label: "Triceratops", sprite: sprites.triceratops }
  ];

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

  function flipCard(state, index) {
    if (state.done || state.lockedUntil || state.flipped.includes(index)) {
      return;
    }
    const card = state.cards[index];
    if (!card || card.matched) {
      return;
    }
    state.flipped.push(index);
    state.message = `Flipped ${card.label}.`;
    if (state.flipped.length === 2) {
      state.moves += 1;
      const [firstIndex, secondIndex] = state.flipped;
      const first = state.cards[firstIndex];
      const second = state.cards[secondIndex];
      if (first.iconId === second.iconId) {
        first.matched = true;
        second.matched = true;
        state.flipped = [];
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.score += 120 + state.streak * 35;
        state.message = `Match streak ${state.streak}!`;
        if (state.cards.every((entry) => entry.matched)) {
          state.done = true;
        }
      } else {
        state.streak = 0;
        state.lockedUntil = performance.now() + 700;
        state.message = "No match. Try to remember the shadows.";
      }
    }
    markDirty();
  }

  return {
    id: "shadow_match",
    type: "board",
    name: "Shadow Match",
    description: "Flip hidden sprites, match pairs, and build streaks for better reward tiers.",
    controls: "Click cards to flip two at a time. Remember their positions before the timer runs out.",
    note: "This local version turns Shadow Match into a quick solo memory challenge, with rare-tier bragging rights stored as your best score.",
    stageTitle: "Memory Vault",
    stageHelp: "Longer streaks push your reward tier from Common to Legendary. Match all eight pairs before time expires.",
    createState() {
      const deck = shuffle(iconPool.flatMap((icon) => [
        { ...icon, uid: `${icon.id}:a`, matched: false },
        { ...icon, uid: `${icon.id}:b`, matched: false }
      ])).map((card, index) => ({ ...card, index }));
      return {
        score: 0,
        moves: 0,
        streak: 0,
        bestStreak: 0,
        timeLeft: 60,
        message: "Find the first pair.",
        cards: deck,
        flipped: [],
        lockedUntil: 0,
        done: false,
        dirty: true
      };
    },
    getActions(state) {
      return state.done
        ? [{ id: "restart", label: "Shuffle Again", className: "good" }]
        : [];
    },
    act(state, id) {
      if (id === "restart") {
        startGame(currentId);
      }
    },
    update(state, dt) {
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
        state.message = "Time is up.";
        state.dirty = true;
      }
    },
    render(state, container) {
      const tier = rewardTier(state.bestStreak);
      const cards = state.cards.map((card, index) => {
        const visible = card.matched || state.flipped.includes(index);
        const classes = [
          "match-card",
          visible ? "flipped" : "hidden-card",
          card.matched ? "matched" : ""
        ].filter(Boolean).join(" ");
        if (!visible) {
          return `<button class="${classes}" type="button" data-match-index="${index}" aria-label="Flip card ${index + 1}"></button>`;
        }
        return `
          <button class="${classes}" type="button" data-match-index="${index}">
            <img src="${card.sprite.src}" alt="${escapeHtml(card.label)}" />
            <strong>${escapeHtml(card.label)}</strong>
          </button>
        `;
      }).join("");

      container.innerHTML = `
        <div class="solo-grid">
          <div class="solo-board-head">
            <div class="solo-pill">Time: ${Math.ceil(state.timeLeft)}s</div>
            <div class="solo-pill">Moves: ${state.moves}</div>
            <div class="solo-pill">Streak: ${state.streak}</div>
            <div class="solo-pill">Reward Tier: ${tier}</div>
          </div>
          <div class="match-grid">${cards}</div>
          <div class="battle-log"><strong>Shadow Match</strong><br />${escapeHtml(state.message)}</div>
        </div>
      `;

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
      return {
        primaryLabel: "Matches",
        primaryValue: state.cards.filter((card) => card.matched).length / 2,
        secondaryLabel: "Tier",
        secondaryValue: rewardTier(state.bestStreak),
        status: state.done ? `Final score ${state.score}` : `${Math.ceil(state.timeLeft)}s left | ${state.moves} moves`
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
  const enemyPool = [
    { name: "Red Striker", sprite: sprites.playerRed, special: "Rocket Volley" },
    { name: "Arena Bot", sprite: sprites.robot, special: "Steel Slam" },
    { name: "Triceratops", sprite: sprites.triceratops, special: "Horn Charge" },
    { name: "Velociraptor", sprite: sprites.velociraptor, special: "Pounce Rush" }
  ];

  function spawnEnemy(round) {
    const template = enemyPool[(round - 1) % enemyPool.length];
    return {
      name: template.name,
      sprite: template.sprite,
      special: template.special,
      hp: 86 + round * 18,
      maxHp: 86 + round * 18,
      guard: 0
    };
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
    state.enemy = spawnEnemy(state.round);
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
    description: "Fight CPU challengers one by one with attacks, guards, healing, and specials.",
    controls: "Pick an action each turn. Build special charge by surviving and attacking, then spend it on a heavy move.",
    note: "This solo arena replaces the old room-based duel with a local gauntlet, so it is playable instantly with no login and no second player.",
    stageTitle: "Solo Battle Arena",
    stageHelp: "Beat one challenger after another. Each win heals you a bit and spawns a tougher rival.",
    createState() {
      return {
        player: {
          name: "Blue Captain",
          sprite: sprites.heroBlue,
          hp: 120,
          maxHp: 120,
          guard: 0
        },
        enemy: spawnEnemy(1),
        round: 1,
        score: 0,
        healUses: 3,
        specialCharge: 0,
        turn: "player",
        pendingCpuAt: 0,
        message: "Choose your opening move.",
        log: ["Choose your opening move."],
        done: false,
        dirty: true
      };
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
        pushLog(state, `You attacked for ${dealt}.`);
        finishPlayerTurn(state);
        return;
      }
      if (id === "guard") {
        state.player.guard = 0.58;
        state.specialCharge = Math.min(100, state.specialCharge + 10);
        pushLog(state, "You braced for the next hit.");
        finishPlayerTurn(state);
        return;
      }
      if (id === "heal" && state.healUses > 0) {
        const heal = randInt(18, 28);
        state.healUses -= 1;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
        state.specialCharge = Math.min(100, state.specialCharge + 8);
        pushLog(state, `You recovered ${heal} HP.`);
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
        pushLog(state, `Photon Burst landed for ${dealt}.`);
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
      container.innerHTML = `
        <div class="battle-stage">
          <div class="solo-board-head">
            <div class="solo-pill">Wins: ${state.score}</div>
            <div class="solo-pill">Round: ${state.round}</div>
            <div class="solo-pill">Special: ${state.specialCharge}%</div>
            <div class="solo-pill">Turn: ${state.turn === "cpu" ? "Enemy" : state.done ? "Ended" : "Player"}</div>
          </div>
          <div class="fighter-grid">
            <div class="fighter-card">
              <img src="${state.player.sprite.src}" alt="${escapeHtml(state.player.name)}" />
              <h3>${escapeHtml(state.player.name)}</h3>
              <div class="hp-bar"><div class="hp-fill" style="width:${playerHpWidth};"></div></div>
              <div>${state.player.hp} / ${state.player.maxHp} HP</div>
            </div>
            <div class="fighter-card">
              <img src="${state.enemy.sprite.src}" alt="${escapeHtml(state.enemy.name)}" />
              <h3>${escapeHtml(state.enemy.name)}</h3>
              <div class="hp-bar"><div class="hp-fill" style="width:${enemyHpWidth};"></div></div>
              <div>${state.enemy.hp} / ${state.enemy.maxHp} HP</div>
            </div>
          </div>
          <div class="battle-log">
            <strong>Battle Log</strong><br />
            ${state.log.map((line) => escapeHtml(line)).join("<br />")}
          </div>
        </div>
      `;
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
