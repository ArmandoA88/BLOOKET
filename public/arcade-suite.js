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
}

function spawnPongBall(direction) {
  return {
    x: W / 2,
    y: H / 2,
    vx: direction * rand(400, 460),
    vy: rand(-220, 220)
  };
}

const pongGame = {
  name: "Modern Pong",
  description: "Neon paddles, a live CPU opponent, and a rally that speeds up every clean return.",
  controls: "Move with W/S, Arrow keys, or the mouse inside the stage.",
  stageTitle: "Modern Pong Arena",
  stageHelp: "Beat the CPU to seven. Angled hits create sharper returns.",
  createState() {
    return {
      playerY: H / 2 - 90,
      cpuY: H / 2 - 90,
      ball: spawnPongBall(Math.random() < 0.5 ? -1 : 1),
      player: 0,
      cpu: 0,
      status: "First to 7 wins",
      gameOver: false
    };
  },
  keydown(state, key) {
    if (key === " " && state.gameOver) {
      resetCurrentGame();
    }
  },
  update(state, dt, time) {
    if (state.gameOver) {
      return;
    }

    const playerSpeed = 580;
    if (input.keys.has("arrowup") || input.keys.has("w")) {
      state.playerY -= playerSpeed * dt;
    }
    if (input.keys.has("arrowdown") || input.keys.has("s")) {
      state.playerY += playerSpeed * dt;
    }
    if (input.pointer.inside) {
      state.playerY = input.pointer.y - 90;
    }
    state.playerY = clamp(state.playerY, 28, H - 208);

    const cpuTarget = state.ball.y - 90 + Math.sin(time * 2.8) * 16;
    const cpuSpeed = 360 + Math.min(180, (state.player + state.cpu) * 12);
    if (cpuTarget > state.cpuY + 10) {
      state.cpuY += cpuSpeed * dt;
    } else if (cpuTarget < state.cpuY - 10) {
      state.cpuY -= cpuSpeed * dt;
    }
    state.cpuY = clamp(state.cpuY, 28, H - 208);

    const ball = state.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y < 26 || ball.y > H - 26) {
      ball.y = clamp(ball.y, 26, H - 26);
      ball.vy *= -1;
    }

    const leftPaddle = { x: 56, y: state.playerY, w: 22, h: 180 };
    const rightPaddle = { x: W - 78, y: state.cpuY, w: 22, h: 180 };

    if (circleRectOverlap({ x: ball.x, y: ball.y, r: 18 }, leftPaddle) && ball.vx < 0) {
      const offset = (ball.y - (state.playerY + 90)) / 90;
      ball.x = leftPaddle.x + leftPaddle.w + 19;
      ball.vx = Math.abs(ball.vx) + 24;
      ball.vy += offset * 260;
      state.status = "Player return";
    }

    if (circleRectOverlap({ x: ball.x, y: ball.y, r: 18 }, rightPaddle) && ball.vx > 0) {
      const offset = (ball.y - (state.cpuY + 90)) / 90;
      ball.x = rightPaddle.x - 19;
      ball.vx = -Math.abs(ball.vx) - 24;
      ball.vy += offset * 260;
      state.status = "CPU return";
    }

    if (ball.x < -30) {
      state.cpu += 1;
      state.ball = spawnPongBall(1);
      state.status = state.cpu >= 7 ? "CPU wins the match" : "CPU scores";
      if (state.cpu >= 7) {
        state.gameOver = true;
      }
    } else if (ball.x > W + 30) {
      state.player += 1;
      state.ball = spawnPongBall(-1);
      state.status = state.player >= 7 ? "You win the match" : "Player scores";
      if (state.player >= 7) {
        state.gameOver = true;
      }
    }
  },
  draw(state, time) {
    drawBackground("#07111d", "#10213a", time, "rgba(92,199,255,0.8)");

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([14, 18]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W / 2, 34);
    ctx.lineTo(W / 2, H - 34);
    ctx.stroke();
    ctx.setLineDash([]);

    drawRoundedRect(56, state.playerY, 22, 180, 12, "#60a5fa");
    drawRoundedRect(W - 78, state.cpuY, 22, 180, 12, "#34d399");

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    drawRoundedRect(34, 20, W - 68, H - 40, 28, null, "rgba(255,255,255,0.08)");

    ctx.fillStyle = "#f8fbff";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#5cc7ff";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    drawLabel(String(state.player), W / 2 - 120, 90, 40, "#60a5fa", "center");
    drawLabel(String(state.cpu), W / 2 + 120, 90, 40, "#34d399", "center");
  },
  hud(state) {
    return {
      value: `${state.player} - ${state.cpu}`,
      copy: state.gameOver
        ? "Match finished. Hit Restart Game or tap Space to play another round."
        : "The ball accelerates with each paddle touch, so rallies get sharper fast.",
      banner: state.status,
      footer: "Mouse control is active here too, which makes it easier for younger players."
    };
  }
};

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
      nextDir: "left"
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

  return {
    name: "Maze Chase",
    description: "A Pac-Man style maze run with pellets, power turns, and roaming ghost pressure.",
    controls: "Use Arrow keys or WASD to queue your next turn through the maze.",
    stageTitle: "Maze Chase",
    stageHelp: "Eat every pellet to clear the board. Power pellets let you chase ghosts for a few seconds.",
    createState() {
      const state = {
        pellets: new Set(template.pellets),
        power: new Set(template.power),
        player: null,
        ghosts: [],
        playerClock: 0,
        ghostClock: 0,
        frightened: 0,
        score: 0,
        lives: 3,
        status: "Clear every pellet",
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

      const mouthOpen = 0.28 + Math.abs(Math.sin(time * 8)) * 0.16;
      const facing = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2
      }[state.player.dir];
      const playerX = boardX + state.player.x * tile + tile / 2;
      const playerY = boardY + state.player.y * tile + tile / 2;
      ctx.fillStyle = "#ffd447";
      ctx.beginPath();
      ctx.moveTo(playerX, playerY);
      ctx.arc(playerX, playerY, tile * 0.34, facing + mouthOpen, facing + Math.PI * 2 - mouthOpen);
      ctx.closePath();
      ctx.fill();

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

  function nextKind() {
    const roll = Math.random();
    if (roll < 0.14) {
      return "gold";
    }
    if (roll < 0.24) {
      return "bomb";
    }
    return "mole";
  }

  return {
    name: "Whack-a-Mole",
    description: "Pop-up moles, bonus targets, and a simple timer that works well for quick classroom turns.",
    controls: "Click or tap a target before it ducks back down.",
    stageTitle: "Whack-a-Mole Arcade",
    stageHelp: "Normal moles score 1, golden moles score 3, and bombs subtract points.",
    createState() {
      return {
        holes: holes.map(() => ({
          mode: "hidden",
          timer: rand(0.4, 1.3),
          kind: "mole"
        })),
        score: 0,
        combo: 0,
        timeLeft: 30,
        status: "Ready to bonk",
        gameOver: false
      };
    },
    pointerdown(state, point) {
      if (state.gameOver) {
        resetCurrentGame();
        return;
      }

      holes.forEach((hole, index) => {
        if (distance(point.x, point.y, hole.x, hole.y - 24) > 70) {
          return;
        }

        const slot = state.holes[index];
        if (slot.mode !== "up") {
          state.combo = 0;
          state.status = "Miss";
          return;
        }

        slot.mode = "hidden";
        slot.timer = rand(0.45, 1.2);
        if (slot.kind === "gold") {
          state.score += 3;
          state.combo += 1;
          state.status = "Golden mole";
        } else if (slot.kind === "bomb") {
          state.score = Math.max(0, state.score - 2);
          state.combo = 0;
          state.status = "Bomb hit";
        } else {
          state.score += 1;
          state.combo += 1;
          state.status = "Nice bonk";
        }
      });
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
          slot.mode = "up";
          slot.kind = nextKind();
          slot.timer = rand(0.6, 1.15);
        } else {
          slot.mode = "hidden";
          slot.timer = rand(0.35, 1.1);
        }
      }
    },
    draw(state, time) {
      drawBackground("#12341b", "#1d5f2f", time, "rgba(251,191,36,0.72)");

      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(0, H - 90, W, 90);

      for (let i = 0; i < holes.length; i += 1) {
        const hole = holes[i];
        const slot = state.holes[i];
        ctx.fillStyle = "#2d1408";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + 14, 84, 34, 0, 0, Math.PI * 2);
        ctx.fill();

        if (slot.mode === "up") {
          const rise = 62 + Math.sin(time * 12 + i) * 3;
          const bodyY = hole.y - rise;
          ctx.fillStyle = slot.kind === "gold" ? "#facc15" : slot.kind === "bomb" ? "#475569" : "#8c5a2f";
          ctx.beginPath();
          ctx.arc(hole.x, bodyY, 44, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(hole.x - 34, bodyY + 8, 68, 56);

          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(hole.x - 14, bodyY - 6, 5, 0, Math.PI * 2);
          ctx.arc(hole.x + 14, bodyY - 6, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Time ${formatTime(state.timeLeft)} | Combo ${state.combo}`,
        banner: state.gameOver ? "Time up" : state.status,
        footer: "Golden targets spike the score and bombs keep the game a little chaotic without becoming complex."
      };
    }
  };
})();

const basketballGame = {
  name: "Hoop Shot",
  description: "Charge up a shot, time the moving rim, and send clean arcs through the basket.",
  controls: "Aim with Arrow keys or the pointer. Hold Space or press-and-hold to build power.",
  stageTitle: "Hoop Shot",
  stageHelp: "Release at the right angle and power. The rim moves, so clean rhythm matters.",
  createState() {
    return {
      angle: -1.05,
      charge: 0,
      charging: false,
      hoopX: 980,
      hoopDir: 1,
      ball: { x: 190, y: H - 160, vx: 0, vy: 0, active: false, scored: false, lastY: H - 160 },
      score: 0,
      shots: 0,
      status: "Hold to charge"
    };
  },
  launch(state) {
    if (!state.charging || state.ball.active) {
      return;
    }
    const power = clamp(state.charge, 0.35, 1);
    state.ball = {
      x: 190,
      y: H - 160,
      vx: Math.cos(state.angle) * power * 780,
      vy: Math.sin(state.angle) * power * 780,
      active: true,
      scored: false,
      lastY: H - 160
    };
    state.shots += 1;
    state.charging = false;
    state.charge = 0;
    state.status = "Shot away";
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
  pointerdown(state, point) {
    if (state.ball.active) {
      return;
    }
    state.angle = clamp(Math.atan2(point.y - (H - 160), point.x - 190), -2.2, -0.35);
    state.charging = true;
  },
  pointerup(state) {
    this.launch(state);
  },
  update(state, dt) {
    if (input.keys.has("arrowleft") || input.keys.has("a")) {
      state.angle -= 1.6 * dt;
    }
    if (input.keys.has("arrowright") || input.keys.has("d")) {
      state.angle += 1.6 * dt;
    }
    state.angle = clamp(state.angle, -2.2, -0.35);

    if (state.charging && !state.ball.active) {
      state.charge = Math.min(1, state.charge + dt * 0.75);
    }

    state.hoopX += state.hoopDir * 220 * dt;
    if (state.hoopX > 1100 || state.hoopX < 860) {
      state.hoopDir *= -1;
    }

    if (!state.ball.active) {
      return;
    }

    state.ball.lastY = state.ball.y;
    state.ball.vy += 980 * dt;
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;

    const rimY = 205;
    const leftRim = { x: state.hoopX - 42, y: rimY };
    const rightRim = { x: state.hoopX + 42, y: rimY };

    if (distance(state.ball.x, state.ball.y, leftRim.x, leftRim.y) < 18) {
      state.ball.vx = -Math.abs(state.ball.vx) * 0.8;
      state.ball.vy = -Math.abs(state.ball.vy) * 0.65;
    }
    if (distance(state.ball.x, state.ball.y, rightRim.x, rightRim.y) < 18) {
      state.ball.vx = Math.abs(state.ball.vx) * 0.8;
      state.ball.vy = -Math.abs(state.ball.vy) * 0.65;
    }

    if (!state.ball.scored && state.ball.lastY < rimY && state.ball.y >= rimY && Math.abs(state.ball.x - state.hoopX) < 28 && state.ball.vy > 0) {
      state.score += 1;
      state.ball.scored = true;
      state.status = "Bucket";
    }

    if (state.ball.y > H + 60 || state.ball.x > W + 60 || state.ball.x < -60) {
      state.ball = { x: 190, y: H - 160, vx: 0, vy: 0, active: false, scored: false, lastY: H - 160 };
      state.status = "Set for next shot";
    }
  },
  draw(state, time) {
    drawBackground("#091827", "#1d3557", time, "rgba(251,146,60,0.85)");

    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, H - 160, W, 160);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(190, H - 160, 150, -0.45, 0.45);
    ctx.stroke();

    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(state.hoopX + 58, 110, 18, 130);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(state.hoopX - 50, 198, 100, 8);
    ctx.strokeStyle = "#f3f4f6";
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(state.hoopX - 46 + i * 18, 206);
      ctx.lineTo(state.hoopX - 28 + i * 12, 242);
      ctx.stroke();
    }

    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(190, H - 160);
    ctx.lineTo(190 + Math.cos(state.angle) * (120 + state.charge * 60), H - 160 + Math.sin(state.angle) * (120 + state.charge * 60));
    ctx.stroke();

    const ball = state.ball.active ? state.ball : { x: 190, y: H - 160 };
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 22, 0, Math.PI * 2);
    ctx.moveTo(ball.x - 22, ball.y);
    ctx.lineTo(ball.x + 22, ball.y);
    ctx.moveTo(ball.x, ball.y - 22);
    ctx.lineTo(ball.x, ball.y + 22);
    ctx.stroke();
  },
  hud(state) {
    return {
      value: `${state.score}`,
      copy: `Shots ${state.shots} | Power ${Math.round(state.charge * 100)}%`,
      banner: state.status,
      footer: "This uses one-button charging so younger players can understand it immediately and still feel timing depth."
    };
  }
};

const dodgeGame = {
  name: "Dodger Arena",
  description: "Free-move survival with incoming hazards, collectible stars, and a score that climbs the longer you last.",
  controls: "Move with Arrow keys or WASD and stay away from incoming drones.",
  stageTitle: "Dodger Arena",
  stageHelp: "Collect stars when it is safe, but survival time matters more than greed.",
  createState() {
    return {
      player: { x: W / 2, y: H / 2, r: 22 },
      enemies: [],
      stars: [],
      enemyTimer: 0.6,
      starTimer: 1.2,
      elapsed: 0,
      bonus: 0,
      starsCaught: 0,
      score: 0,
      status: "Stay alive",
      gameOver: false
    };
  },
  keydown(state, key) {
    if (key === " " && state.gameOver) {
      resetCurrentGame();
    }
  },
  update(state, dt, time) {
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
    state.player.x = clamp(state.player.x, 40, W - 40);
    state.player.y = clamp(state.player.y, 40, H - 40);

    state.enemyTimer -= dt;
    if (state.enemyTimer <= 0) {
      state.enemyTimer = Math.max(0.35, 0.9 - state.elapsed * 0.02);
      const side = randInt(0, 3);
      const spawn = [
        { x: rand(0, W), y: -30 },
        { x: W + 30, y: rand(0, H) },
        { x: rand(0, W), y: H + 30 },
        { x: -30, y: rand(0, H) }
      ][side];
      const angle = Math.atan2(state.player.y - spawn.y, state.player.x - spawn.x) + rand(-0.45, 0.45);
      const enemySpeed = rand(170, 240) + state.elapsed * 6;
      state.enemies.push({
        x: spawn.x,
        y: spawn.y,
        vx: Math.cos(angle) * enemySpeed,
        vy: Math.sin(angle) * enemySpeed,
        r: rand(16, 28)
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
    state.enemies = state.enemies.filter((enemy) => enemy.x > -80 && enemy.x < W + 80 && enemy.y > -80 && enemy.y < H + 80);

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
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(state.player.x - 7, state.player.y - 6, 4, 0, Math.PI * 2);
    ctx.arc(state.player.x + 7, state.player.y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
  },
  hud(state) {
    return {
      value: `${state.score}`,
      copy: `Survival ${state.elapsed.toFixed(1)}s | Stars ${state.starsCaught}`,
      banner: state.gameOver ? "Arena down" : state.status,
      footer: "The score keeps climbing with survival time, so even cautious play still feels rewarding."
    };
  }
};

const racerGame = {
  name: "Mini Racer",
  description: "A three-lane arcade racer with clean lane swaps, nitro pickups, and steadily rising speed.",
  controls: "Use Left/Right or A/D to switch lanes.",
  stageTitle: "Mini Racer",
  stageHelp: "Stay off traffic and grab the blue boosts when the lane is clear enough.",
  createState() {
    return {
      lane: 1,
      obstacles: [],
      boosts: [],
      spawnTimer: 0.9,
      boostTimer: 2.4,
      distance: 0,
      boost: 0,
      status: "Shift lanes",
      gameOver: false
    };
  },
  keydown(state, key) {
    if (state.gameOver && key === " ") {
      resetCurrentGame();
      return;
    }
    if (key === "arrowleft" || key === "a") {
      state.lane = clamp(state.lane - 1, 0, 2);
    }
    if (key === "arrowright" || key === "d") {
      state.lane = clamp(state.lane + 1, 0, 2);
    }
  },
  update(state, dt, time) {
    if (state.gameOver) {
      return;
    }

    const roadSpeed = 320 + state.distance * 0.03 + (state.boost > 0 ? 180 : 0);
    state.distance += roadSpeed * dt * 0.1;
    state.boost = Math.max(0, state.boost - dt);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = Math.max(0.42, 0.95 - state.distance * 0.003);
      state.obstacles.push({
        lane: randInt(0, 2),
        y: -150,
        h: rand(120, 160),
        color: pick(["#fb7185", "#f59e0b", "#4ade80"])
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
    state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < H + 180);
    state.boosts = state.boosts.filter((boost) => boost.y < H + 120);

    const playerX = 400 + state.lane * 160;
    const playerRect = { x: playerX, y: 620, w: 96, h: 142 };
    for (const obstacle of state.obstacles) {
      const laneX = 400 + obstacle.lane * 160;
      if (rectsOverlap(playerRect, { x: laneX, y: obstacle.y, w: 96, h: obstacle.h })) {
        state.gameOver = true;
        state.status = "Traffic collision";
      }
    }

    for (const boost of state.boosts) {
      const laneX = 416 + boost.lane * 160;
      if (state.lane === boost.lane && boost.y > 600 && boost.y < 760) {
        state.boost = 4;
        state.status = "Nitro boost";
        boost.y = H + 200;
      }
    }
  },
  draw(state, time) {
    drawBackground("#0a1017", "#1b2430", time, "rgba(96,165,250,0.72)");

    drawRoundedRect(340, 0, 600, H, 36, "#2c313a");
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let y = -60; y < H + 80; y += 110) {
      const offset = (time * 360) % 110;
      ctx.fillRect(534, y + offset, 12, 66);
      ctx.fillRect(694, y + offset, 12, 66);
    }

    for (const obstacle of state.obstacles) {
      const laneX = 400 + obstacle.lane * 160;
      drawRoundedRect(laneX, obstacle.y, 96, obstacle.h, 20, obstacle.color);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(laneX + 16, obstacle.y + 20, 64, 18);
    }

    for (const boost of state.boosts) {
      const laneX = 448 + boost.lane * 160;
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
    }

    const playerX = 400 + state.lane * 160;
    drawRoundedRect(playerX, 620, 96, 142, 22, state.boost > 0 ? "#38bdf8" : "#f43f5e");
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(playerX + 16, 650, 64, 24);
    ctx.fillRect(playerX + 16, 702, 64, 24);
  },
  hud(state) {
    return {
      value: `${Math.floor(state.distance)}`,
      copy: `Lane ${state.lane + 1} | Nitro ${state.boost > 0 ? `${state.boost.toFixed(1)}s` : "ready"}`,
      banner: state.gameOver ? "Race over" : state.status,
      footer: "Nitro adds speed but the real trick is deciding whether the pickup lane is worth the risk."
    };
  }
};

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
    name: "Fish & Francis",
    description: "A Fishing Frenzy style catch game with internet-sourced sprite fish, multiple boat picks, and a fuller underwater scene.",
    controls: "Move with Arrow keys or A/D. Press Space or click to drop the hook. Use keys 1-6 to switch boats.",
    stageTitle: "Fish & Francis",
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

const games = {
  pong: pongGame,
  maze: mazeGame,
  crossing: crossingGame,
  flappy: flappyGame,
  whack: whackGame,
  basketball: basketballGame,
  dodge: dodgeGame,
  racer: racerGame,
  fishing: fishingGame
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

function switchGame(id) {
  currentId = games[id] ? id : "pong";
  currentGame = games[currentId];
  currentState = currentGame.createState();

  suiteGameName.textContent = currentGame.name;
  suiteGameDesc.textContent = currentGame.description;
  suiteControls.textContent = currentGame.controls;
  stageTitle.textContent = currentGame.stageTitle;
  stageHelp.textContent = currentGame.stageHelp;

  const url = new URL(window.location.href);
  url.searchParams.set("game", currentId);
  window.history.replaceState({}, "", url);

  renderTabs();
  renderExtras();
  updateHud();
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
});

canvas.addEventListener("pointerup", (event) => {
  const point = mouseToCanvas(event);
  input.pointer.x = point.x;
  input.pointer.y = point.y;
  input.pointer.down = false;
  if (currentGame && currentGame.pointerup) {
    currentGame.pointerup(currentState, point, event);
  }
});

canvas.addEventListener("pointerleave", () => {
  input.pointer.down = false;
  input.pointer.inside = false;
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

  window.requestAnimationFrame(frame);
}

switchGame(params.get("game") || "pong");
window.requestAnimationFrame(frame);
