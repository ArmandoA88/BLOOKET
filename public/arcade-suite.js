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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function resetCurrentGame() {
  if (!currentGame) {
    return;
  }
  currentState = currentGame.createState();
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
  const cols = 13;
  const tile = 72;
  const laneHeight = 64;
  const boardW = cols * tile;
  const boardH = 11 * laneHeight;
  const boardX = (W - boardW) / 2;
  const boardY = (H - boardH) / 2;
  const startRow = 10;

  const laneConfigs = [
    { type: "goal" },
    { type: "river", speed: 110, size: 190, gap: 120, offset: 0 },
    { type: "river", speed: -140, size: 210, gap: 130, offset: 120 },
    { type: "safe" },
    { type: "road", speed: 190, size: 120, gap: 140, offset: 20, color: "#ffb347" },
    { type: "road", speed: -240, size: 170, gap: 110, offset: 130, color: "#60a5fa" },
    { type: "road", speed: 210, size: 100, gap: 150, offset: 60, color: "#4ade80" },
    { type: "safe" },
    { type: "road", speed: -260, size: 200, gap: 170, offset: 170, color: "#fb7185" },
    { type: "safe" },
    { type: "start" }
  ];

  function buildLanes() {
    return laneConfigs.map((config) => {
      if (!config.speed) {
        return { ...config, items: [] };
      }

      const items = [];
      const span = config.size + config.gap;
      for (let x = -config.offset; x < boardW + span; x += span) {
        items.push({ x });
      }
      return { ...config, items };
    });
  }

  function resetFrog(state) {
    state.row = startRow;
    state.x = boardW / 2;
  }

  function loseLife(state, reason) {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.gameOver = true;
      state.status = reason;
    } else {
      resetFrog(state);
      state.status = reason;
    }
  }

  return {
    name: "River Crossing",
    description: "A Frogger style crossing run with roads, river logs, and quick safe-zone resets.",
    controls: "Tap Arrow keys or WASD to hop one lane at a time.",
    stageTitle: "River Crossing",
    stageHelp: "Reach the top grass. Cars hit hard and river lanes need a floating log under you.",
    createState() {
      const state = {
        row: startRow,
        x: boardW / 2,
        lanes: buildLanes(),
        score: 0,
        lives: 4,
        status: "Hop to the top",
        gameOver: false
      };
      resetFrog(state);
      return state;
    },
    keydown(state, key) {
      if (state.gameOver && key === " ") {
        resetCurrentGame();
        return;
      }

      const dir = keyToDir[key];
      if (!dir || state.gameOver) {
        return;
      }
      if (dir === "left") {
        state.x -= tile;
      } else if (dir === "right") {
        state.x += tile;
      } else if (dir === "up") {
        state.row -= 1;
      } else if (dir === "down") {
        state.row += 1;
      }
      state.row = clamp(state.row, 0, laneConfigs.length - 1);
    },
    update(state, dt) {
      if (state.gameOver) {
        return;
      }

      for (const lane of state.lanes) {
        for (const item of lane.items) {
          item.x += lane.speed * dt;
          if (lane.speed > 0 && item.x > boardW + lane.size) {
            item.x -= lane.items.length * (lane.size + lane.gap);
          }
          if (lane.speed < 0 && item.x < -lane.size - lane.gap) {
            item.x += lane.items.length * (lane.size + lane.gap);
          }
        }
      }

      const lane = state.lanes[state.row];
      const frogRect = { x: state.x - 18, y: 0, w: 36, h: 36 };

      if (lane.type === "road") {
        for (const car of lane.items) {
          const carRect = { x: car.x + 4, y: 12, w: lane.size - 8, h: 38 };
          if (rectsOverlap(frogRect, carRect)) {
            loseLife(state, "Traffic got the frog");
            return;
          }
        }
      }

      if (lane.type === "river") {
        let onLog = false;
        for (const log of lane.items) {
          if (state.x > log.x && state.x < log.x + lane.size) {
            onLog = true;
            state.x += lane.speed * dt;
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

      if (state.row === 0) {
        state.score += 1;
        state.status = "Goal reached";
        resetFrog(state);
      }
    },
    draw(state, time) {
      drawBackground("#07131f", "#10253d", time, "rgba(45,212,191,0.85)");

      for (let row = 0; row < laneConfigs.length; row += 1) {
        const lane = state.lanes[row];
        const y = boardY + row * laneHeight;
        let fill = "#1f7a3e";
        if (lane.type === "road") {
          fill = "#374151";
        } else if (lane.type === "river") {
          fill = "#1d4ed8";
        } else if (lane.type === "goal") {
          fill = "#166534";
        }
        ctx.fillStyle = fill;
        drawRoundedRect(boardX, y + 2, boardW, laneHeight - 4, 18, fill);

        if (lane.type === "road") {
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          for (let x = boardX + 24; x < boardX + boardW; x += 90) {
            ctx.fillRect(x, y + laneHeight / 2 - 4, 48, 8);
          }
        }

        for (const item of lane.items) {
          if (lane.type === "road") {
            drawRoundedRect(boardX + item.x, y + 12, lane.size, 38, 12, lane.color, "rgba(255,255,255,0.16)");
            ctx.fillStyle = "rgba(255,255,255,0.24)";
            ctx.fillRect(boardX + item.x + 18, y + 22, lane.size - 36, 8);
          } else if (lane.type === "river") {
            drawRoundedRect(boardX + item.x, y + 10, lane.size, 44, 16, "#9a6b35");
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect(boardX + item.x + 12, y + 18, lane.size - 24, 8);
          }
        }
      }

      const frogX = boardX + state.x;
      const frogY = boardY + state.row * laneHeight + laneHeight / 2;
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(frogX, frogY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#06281a";
      ctx.beginPath();
      ctx.arc(frogX - 8, frogY - 6, 3, 0, Math.PI * 2);
      ctx.arc(frogX + 8, frogY - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Goals reached ${state.score} | Lives ${state.lives}`,
        banner: state.gameOver ? "Run ended" : state.status,
        footer: "The frog drifts with the log, so lane timing matters just as much as the jump."
      };
    }
  };
})();

function spawnFlappyPipe() {
  return {
    x: W + 120,
    gapY: rand(190, H - 220),
    gapH: 210,
    passed: false
  };
}

const flappyGame = {
  name: "Sky Flap",
  description: "A Flappy style flying run with bright pipes, easy restart flow, and fast score pops.",
  controls: "Press Space or click/tap the stage to flap.",
  stageTitle: "Sky Flap",
  stageHelp: "Keep the bird steady through each pipe gap. One clean flap too many is still a crash.",
  createState() {
    return {
      birdY: H / 2,
      birdVY: 0,
      pipes: [],
      spawnTimer: 0.6,
      score: 0,
      started: false,
      gameOver: false,
      status: "Tap to flap"
    };
  },
  flap(state) {
    if (state.gameOver) {
      resetCurrentGame();
      return;
    }
    state.started = true;
    state.birdVY = -380;
    state.status = "Flap";
  },
  keydown(state, key) {
    if (key === " ") {
      this.flap(state);
    }
  },
  pointerdown(state) {
    this.flap(state);
  },
  update(state, dt) {
    if (!state.started || state.gameOver) {
      return;
    }

    state.birdVY += 920 * dt;
    state.birdY += state.birdVY * dt;
    state.spawnTimer -= dt;

    if (state.spawnTimer <= 0) {
      state.spawnTimer = 1.38;
      state.pipes.push(spawnFlappyPipe());
    }

    for (const pipe of state.pipes) {
      pipe.x -= 300 * dt;
      if (!pipe.passed && pipe.x + 92 < 220) {
        pipe.passed = true;
        state.score += 1;
        state.status = "Pipe cleared";
      }
    }
    state.pipes = state.pipes.filter((pipe) => pipe.x > -160);

    const bird = { x: 220, y: state.birdY, r: 24 };
    if (bird.y > H - 66 || bird.y < 54) {
      state.gameOver = true;
      state.status = "Bird clipped the edge";
    }

    for (const pipe of state.pipes) {
      const topRect = { x: pipe.x, y: 0, w: 92, h: pipe.gapY - pipe.gapH / 2 };
      const bottomRect = { x: pipe.x, y: pipe.gapY + pipe.gapH / 2, w: 92, h: H - pipe.gapY };
      if (circleRectOverlap(bird, topRect) || circleRectOverlap(bird, bottomRect)) {
        state.gameOver = true;
        state.status = "Pipe hit";
      }
    }
  },
  draw(state, time) {
    drawBackground("#8bdcff", "#2e6ae3", time, "rgba(255,255,255,0.7)");

    ctx.fillStyle = "rgba(255,255,255,0.26)";
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(170 + i * 270, 130 + Math.sin(time + i) * 10, 42, Math.PI, 0);
      ctx.arc(205 + i * 270, 130 + Math.sin(time + i) * 10, 32, Math.PI, 0);
      ctx.fill();
    }

    for (const pipe of state.pipes) {
      drawRoundedRect(pipe.x, -10, 92, pipe.gapY - pipe.gapH / 2 + 10, 18, "#2fb662");
      drawRoundedRect(pipe.x, pipe.gapY + pipe.gapH / 2, 92, H - pipe.gapY, 18, "#2fb662");
      ctx.fillStyle = "#1d7a42";
      ctx.fillRect(pipe.x - 8, pipe.gapY - pipe.gapH / 2 - 18, 108, 18);
      ctx.fillRect(pipe.x - 8, pipe.gapY + pipe.gapH / 2, 108, 18);
    }

    ctx.fillStyle = "#d7a344";
    ctx.fillRect(0, H - 50, W, 50);
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(0, H - 66, W, 18);

    const wingLift = Math.sin(time * 18) * 8;
    ctx.fillStyle = "#ffd447";
    ctx.beginPath();
    ctx.arc(220, state.birdY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(242, state.birdY);
    ctx.lineTo(268, state.birdY - 7);
    ctx.lineTo(268, state.birdY + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(213, state.birdY - 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(214, state.birdY - 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.ellipse(208, state.birdY + wingLift * 0.3, 18, 12, -0.35, 0, Math.PI * 2);
    ctx.fill();
  },
  hud(state) {
    return {
      value: `${state.score}`,
      copy: state.gameOver
        ? "Tap again to restart fast."
        : state.started ? "Short taps keep the bird centered through the gaps." : "Press Space or click once to begin.",
      banner: state.gameOver ? "Crash" : state.status,
      footer: "This one is intentionally quick to replay so kids can cycle through attempts in seconds."
    };
  }
};

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
  const fishColors = ["#38bdf8", "#fb7185", "#f59e0b", "#4ade80", "#a78bfa"];

  function makeFish(index) {
    const size = rand(28, 48);
    const depth = 240 + index * 80 + rand(-20, 20);
    const speed = rand(70, 150) * (Math.random() < 0.5 ? -1 : 1);
    return {
      x: rand(120, W - 120),
      y: depth,
      size,
      vx: speed,
      value: Math.round(size),
      color: fishColors[index % fishColors.length]
    };
  }

  return {
    name: "Fish & Francis",
    description: "A Fishing Frenzy style catch game with a moving boat, a drop hook, and colorful fish values.",
    controls: "Move the boat with Arrow keys or A/D. Press Space or click once to drop the hook.",
    stageTitle: "Fish & Francis",
    stageHelp: "Drop the hook, catch one fish, then reel it back in. Bigger fish score more.",
    createState() {
      return {
        boatX: W / 2,
        hook: { state: "idle", x: W / 2, y: 150, fishIndex: -1 },
        fish: Array.from({ length: 8 }, (_, index) => makeFish(index)),
        score: 0,
        catches: 0,
        status: "Drop the hook"
      };
    },
    keydown(state, key) {
      if (key === " " && state.hook.state === "idle") {
        state.hook.state = "drop";
      }
    },
    pointerdown(state) {
      if (state.hook.state === "idle") {
        state.hook.state = "drop";
      }
    },
    update(state, dt) {
      if (input.keys.has("arrowleft") || input.keys.has("a")) {
        state.boatX -= 280 * dt;
      }
      if (input.keys.has("arrowright") || input.keys.has("d")) {
        state.boatX += 280 * dt;
      }
      state.boatX = clamp(state.boatX, 120, W - 120);

      for (let i = 0; i < state.fish.length; i += 1) {
        const fish = state.fish[i];
        if (state.hook.fishIndex === i) {
          continue;
        }
        fish.x += fish.vx * dt;
        if (fish.x < -fish.size) {
          fish.x = W + fish.size;
        }
        if (fish.x > W + fish.size) {
          fish.x = -fish.size;
        }
      }

      if (state.hook.state === "idle") {
        state.hook.x = state.boatX;
        state.hook.y = 150;
        state.hook.fishIndex = -1;
      } else if (state.hook.state === "drop") {
        state.hook.x = state.boatX;
        state.hook.y += 420 * dt;
        for (let i = 0; i < state.fish.length; i += 1) {
          const fish = state.fish[i];
          if (distance(state.hook.x, state.hook.y, fish.x, fish.y) < fish.size * 0.55) {
            state.hook.fishIndex = i;
            state.hook.state = "reel";
            state.status = "Fish on the line";
            break;
          }
        }
        if (state.hook.y > H - 70) {
          state.hook.state = "reel";
        }
      } else if (state.hook.state === "reel") {
        state.hook.x = state.boatX;
        state.hook.y -= 520 * dt;
        if (state.hook.fishIndex >= 0) {
          const fish = state.fish[state.hook.fishIndex];
          fish.x = state.hook.x;
          fish.y = state.hook.y + 26;
        }
        if (state.hook.y <= 150) {
          if (state.hook.fishIndex >= 0) {
            const caught = state.fish[state.hook.fishIndex];
            state.score += caught.value;
            state.catches += 1;
            state.status = `Caught ${caught.value} pts`;
            state.fish[state.hook.fishIndex] = makeFish(state.hook.fishIndex);
          } else {
            state.status = "Empty hook";
          }
          state.hook.state = "idle";
          state.hook.fishIndex = -1;
        }
      }
    },
    draw(state, time) {
      drawBackground("#08233b", "#0d4b70", time, "rgba(56,189,248,0.82)");

      ctx.fillStyle = "#dbeafe";
      ctx.fillRect(0, 100, W, 10);
      ctx.fillStyle = "#1e293b";
      drawRoundedRect(state.boatX - 86, 92, 172, 38, 18, "#334155");
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(state.boatX - 10, 92);
      ctx.lineTo(state.boatX - 10, 36);
      ctx.lineTo(state.boatX + 42, 76);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(state.boatX, 92);
      ctx.lineTo(state.hook.x, state.hook.y);
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(state.hook.x, state.hook.y, 8, 0, Math.PI * 2);
      ctx.fill();

      for (const fish of state.fish) {
        ctx.fillStyle = fish.color;
        ctx.beginPath();
        ctx.ellipse(fish.x, fish.y, fish.size * 0.6, fish.size * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fish.x - fish.size * 0.55, fish.y);
        ctx.lineTo(fish.x - fish.size * 0.9, fish.y - fish.size * 0.22);
        ctx.lineTo(fish.x - fish.size * 0.9, fish.y + fish.size * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(fish.x + fish.size * 0.2, fish.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    hud(state) {
      return {
        value: `${state.score}`,
        copy: `Fish caught ${state.catches} | Hook ${state.hook.state}`,
        banner: state.status,
        footer: "I interpreted the request for 'Fish and Francis' as a Blooket-style fishing catch game."
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
    updateHud();
  }

  window.requestAnimationFrame(frame);
}

switchGame(params.get("game") || "pong");
window.requestAnimationFrame(frame);
