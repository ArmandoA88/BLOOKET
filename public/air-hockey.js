class InputController {
  constructor() {
    this.keys = new Set();
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  onKeyDown(event) {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      event.preventDefault();
    }
    this.keys.add(event.code);
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  vectorForPlayer(player) {
    const bindings =
      player === 1
        ? { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" }
        : { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

    let x = 0;
    let y = 0;
    if (this.keys.has(bindings.left)) x -= 1;
    if (this.keys.has(bindings.right)) x += 1;
    if (this.keys.has(bindings.up)) y -= 1;
    if (this.keys.has(bindings.down)) y += 1;

    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, active: x !== 0 || y !== 0 };
  }

  wantsServe() {
    return this.keys.has("Space");
  }
}

class ScoreManager {
  constructor(winScore = 5) {
    this.winScore = winScore;
    this.player1 = 0;
    this.player2 = 0;
    this.winner = 0;
  }

  reset() {
    this.player1 = 0;
    this.player2 = 0;
    this.winner = 0;
  }

  addPoint(player) {
    if (player === 1) {
      this.player1 += 1;
      if (this.player1 >= this.winScore) {
        this.winner = 1;
      }
    } else {
      this.player2 += 1;
      if (this.player2 >= this.winScore) {
        this.winner = 2;
      }
    }
  }
}

class AirHockeyGame {
  constructor() {
    this.canvas = document.getElementById("airHockeyCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.startBtn = document.getElementById("startRoundBtn");
    this.restartBtn = document.getElementById("restartMatchBtn");
    this.statusEl = document.getElementById("airHockeyStatus");
    this.bannerEl = document.getElementById("airHockeyBanner");
    this.score1El = document.getElementById("player1Score");
    this.score2El = document.getElementById("player2Score");
    this.stateEl = document.getElementById("roundState");
    this.winnerEl = document.getElementById("winnerText");
    this.input = new InputController();
    this.score = new ScoreManager(5);

    this.table = {
      width: this.canvas.width,
      height: this.canvas.height,
      centerX: this.canvas.width / 2,
      centerY: this.canvas.height / 2,
      wallInset: 18,
      goalHeight: 154,
      goalDepth: 20
    };

    this.strikerRadius = 28;
    this.puckRadius = 16;
    this.maxStrikerSpeed = 470;
    this.maxPuckSpeed = 760;
    this.puckTrail = [];
    this.collisionFlash = 0;
    this.goalFlash = 0;
    this.tableShake = 0;
    this.roundPauseUntil = 0;
    this.serveOwner = 1;
    this.matchState = "waiting";
    this.lastFrame = performance.now();

    this.players = {
      1: this.createStriker(1),
      2: this.createStriker(2)
    };
    this.puck = this.createPuck();

    this.startBtn.addEventListener("click", () => {
      if (this.matchState === "goal_pause" || this.matchState === "playing") {
        return;
      }
      this.startServe();
    });
    this.restartBtn.addEventListener("click", () => this.restartMatch());

    this.resetPositions();
    this.updateHud();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  createStriker(player) {
    return {
      player,
      x: player === 1 ? 170 : this.table.width - 170,
      y: this.table.centerY,
      vx: 0,
      vy: 0,
      radius: this.strikerRadius,
      color: player === 1 ? "#5cc7ff" : "#ff7c6a",
      glow: player === 1 ? "rgba(92, 199, 255, 0.4)" : "rgba(255, 124, 106, 0.4)"
    };
  }

  createPuck() {
    return {
      x: this.table.centerX,
      y: this.table.centerY,
      vx: 0,
      vy: 0,
      radius: this.puckRadius
    };
  }

  resetPositions() {
    this.players[1].x = 170;
    this.players[1].y = this.table.centerY;
    this.players[1].vx = 0;
    this.players[1].vy = 0;
    this.players[2].x = this.table.width - 170;
    this.players[2].y = this.table.centerY;
    this.players[2].vx = 0;
    this.players[2].vy = 0;
    this.puck.x = this.table.centerX;
    this.puck.y = this.table.centerY;
    this.puck.vx = 0;
    this.puck.vy = 0;
    this.puckTrail = [];
  }

  restartMatch() {
    this.score.reset();
    this.serveOwner = 1;
    this.matchState = "waiting";
    this.roundPauseUntil = 0;
    this.goalFlash = 0;
    this.bannerEl.textContent = "Press Space or Start Round";
    this.statusEl.textContent = "Local 1v1 ready. Player 1 uses WASD. Player 2 uses Arrow Keys.";
    this.resetPositions();
    this.updateHud();
  }

  startServe() {
    this.resetPositions();
    const direction = this.serveOwner === 1 ? 1 : -1;
    this.puck.vx = direction * 280;
    this.puck.vy = (Math.random() * 2 - 1) * 120;
    this.matchState = "playing";
    this.bannerEl.textContent = "";
    this.statusEl.textContent = `Serve live. Player ${this.serveOwner} launched the puck.`;
    this.updateHud();
  }

  goalFor(player) {
    this.score.addPoint(player);
    this.goalFlash = 1;
    this.tableShake = 12;
    this.matchState = this.score.winner ? "match_over" : "goal_pause";
    this.roundPauseUntil = performance.now() + 1100;
    this.serveOwner = player === 1 ? 2 : 1;
    this.bannerEl.textContent = player === 1 ? "Goal for Player 1!" : "Goal for Player 2!";
    this.statusEl.textContent = this.score.winner
      ? `Player ${this.score.winner} wins the match!`
      : "Quick reset. Next serve is ready in a moment.";
    this.updateHud();
  }

  updateHud() {
    this.score1El.textContent = String(this.score.player1);
    this.score2El.textContent = String(this.score.player2);

    if (this.score.winner) {
      this.stateEl.textContent = "Match Over";
      this.winnerEl.textContent = `Winner: Player ${this.score.winner}`;
      this.startBtn.textContent = "Start New Round";
    } else if (this.matchState === "playing") {
      this.stateEl.textContent = "Playing";
      this.winnerEl.textContent = "Race to 5 goals";
      this.startBtn.textContent = "Round Live";
    } else if (this.matchState === "goal_pause") {
      this.stateEl.textContent = "Goal!";
      this.winnerEl.textContent = `Next serve: Player ${this.serveOwner}`;
      this.startBtn.textContent = "Resetting...";
    } else {
      this.stateEl.textContent = "Ready";
      this.winnerEl.textContent = "First to 5 wins";
      this.startBtn.textContent = "Start Round";
    }
  }

  clampStrikerToHalf(striker) {
    const inset = this.table.wallInset + striker.radius;
    const goalTop = this.table.centerY - this.table.goalHeight / 2;
    const goalBottom = this.table.centerY + this.table.goalHeight / 2;
    const minY = inset;
    const maxY = this.table.height - inset;

    if (striker.player === 1) {
      const minX = inset;
      const maxX = this.table.centerX - striker.radius - 10;
      striker.x = Math.max(minX, Math.min(maxX, striker.x));
    } else {
      const minX = this.table.centerX + striker.radius + 10;
      const maxX = this.table.width - inset;
      striker.x = Math.max(minX, Math.min(maxX, striker.x));
    }

    striker.y = Math.max(minY, Math.min(maxY, striker.y));

    if (striker.player === 1 && striker.x < this.table.wallInset + striker.radius + 6 && striker.y > goalTop && striker.y < goalBottom) {
      striker.x = this.table.wallInset + striker.radius + 6;
    }
    if (striker.player === 2 && striker.x > this.table.width - this.table.wallInset - striker.radius - 6 && striker.y > goalTop && striker.y < goalBottom) {
      striker.x = this.table.width - this.table.wallInset - striker.radius - 6;
    }
  }

  updateStriker(striker, dt) {
    const input = this.input.vectorForPlayer(striker.player);
    const accel = input.active ? 1 : 0.84;
    striker.vx = input.x * this.maxStrikerSpeed * accel;
    striker.vy = input.y * this.maxStrikerSpeed * accel;
    striker.x += striker.vx * dt;
    striker.y += striker.vy * dt;
    this.clampStrikerToHalf(striker);
  }

  updatePuck(dt) {
    this.puck.x += this.puck.vx * dt;
    this.puck.y += this.puck.vy * dt;

    const top = this.table.wallInset + this.puck.radius;
    const bottom = this.table.height - this.table.wallInset - this.puck.radius;
    const goalTop = this.table.centerY - this.table.goalHeight / 2;
    const goalBottom = this.table.centerY + this.table.goalHeight / 2;

    if (this.puck.y <= top) {
      this.puck.y = top;
      this.puck.vy = Math.abs(this.puck.vy) * 0.98;
      this.bumpTable(0.16);
    }
    if (this.puck.y >= bottom) {
      this.puck.y = bottom;
      this.puck.vy = -Math.abs(this.puck.vy) * 0.98;
      this.bumpTable(0.16);
    }

    const inGoalLane = this.puck.y > goalTop + this.puck.radius && this.puck.y < goalBottom - this.puck.radius;
    const leftBoundary = this.table.wallInset + this.puck.radius;
    const rightBoundary = this.table.width - this.table.wallInset - this.puck.radius;

    if (!inGoalLane && this.puck.x <= leftBoundary) {
      this.puck.x = leftBoundary;
      this.puck.vx = Math.abs(this.puck.vx) * 0.99;
      this.bumpTable(0.16);
    }
    if (!inGoalLane && this.puck.x >= rightBoundary) {
      this.puck.x = rightBoundary;
      this.puck.vx = -Math.abs(this.puck.vx) * 0.99;
      this.bumpTable(0.16);
    }

    const speed = Math.hypot(this.puck.vx, this.puck.vy);
    if (speed > this.maxPuckSpeed) {
      const scale = this.maxPuckSpeed / speed;
      this.puck.vx *= scale;
      this.puck.vy *= scale;
    }

    this.puck.vx *= 0.9985;
    this.puck.vy *= 0.9985;
    this.puckTrail.unshift({ x: this.puck.x, y: this.puck.y });
    if (this.puckTrail.length > 12) {
      this.puckTrail.pop();
    }
  }

  resolveStrikerCollision(striker) {
    const dx = this.puck.x - striker.x;
    const dy = this.puck.y - striker.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = this.puck.radius + striker.radius;
    if (distance === 0 || distance >= minDistance) {
      return;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minDistance - distance;
    this.puck.x += nx * overlap;
    this.puck.y += ny * overlap;

    const relativeVx = this.puck.vx - striker.vx;
    const relativeVy = this.puck.vy - striker.vy;
    const separatingSpeed = relativeVx * nx + relativeVy * ny;
    const bounce = Math.max(0, -separatingSpeed) + 180;
    this.puck.vx = striker.vx + nx * bounce;
    this.puck.vy = striker.vy + ny * bounce;

    const impact = Math.min(1, bounce / 620);
    this.bumpTable(0.2 + impact * 0.35);
    this.collisionFlash = Math.max(this.collisionFlash, 0.3 + impact * 0.4);
  }

  resolvePlayerOverlap() {
    const p1 = this.players[1];
    const p2 = this.players[2];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = p1.radius + p2.radius + 8;
    if (distance === 0 || distance >= minDistance) {
      return;
    }
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = (minDistance - distance) / 2;
    p1.x -= nx * overlap;
    p1.y -= ny * overlap;
    p2.x += nx * overlap;
    p2.y += ny * overlap;
    this.clampStrikerToHalf(p1);
    this.clampStrikerToHalf(p2);
  }

  bumpTable(amount) {
    this.tableShake = Math.min(14, this.tableShake + amount * 10);
  }

  checkGoals() {
    const goalTop = this.table.centerY - this.table.goalHeight / 2;
    const goalBottom = this.table.centerY + this.table.goalHeight / 2;
    const puckFullyInGoalLane = this.puck.y > goalTop + this.puck.radius && this.puck.y < goalBottom - this.puck.radius;

    if (!puckFullyInGoalLane) {
      return;
    }

    if (this.puck.x + this.puck.radius < 0) {
      this.goalFor(2);
      return;
    }
    if (this.puck.x - this.puck.radius > this.table.width) {
      this.goalFor(1);
    }
  }

  update(dt) {
    if (this.input.wantsServe() && (this.matchState === "waiting" || this.matchState === "match_over")) {
      if (this.matchState === "match_over") {
        this.restartMatch();
      }
      this.startServe();
    }

    if (this.matchState === "goal_pause" && performance.now() >= this.roundPauseUntil) {
      this.matchState = "waiting";
      this.resetPositions();
      this.updateHud();
      return;
    }

    if (this.matchState !== "playing") {
      return;
    }

    this.updateStriker(this.players[1], dt);
    this.updateStriker(this.players[2], dt);
    this.resolvePlayerOverlap();
    this.updatePuck(dt);
    this.resolveStrikerCollision(this.players[1]);
    this.resolveStrikerCollision(this.players[2]);
    this.checkGoals();
  }

  drawTable() {
    const ctx = this.ctx;
    const { width, height, centerX, centerY, wallInset, goalHeight } = this.table;
    const goalTop = centerY - goalHeight / 2;
    const goalBottom = centerY + goalHeight / 2;

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#b7f4ff");
    bg.addColorStop(1, "#e9feff");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#1b7aa2";
    ctx.lineWidth = 10;
    ctx.strokeRect(wallInset, wallInset, width - wallInset * 2, height - wallInset * 2);

    ctx.save();
    ctx.globalAlpha = 0.18 + this.goalFlash * 0.18;
    ctx.fillStyle = "#fff08a";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.strokeStyle = "rgba(27, 122, 162, 0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, wallInset);
    ctx.lineTo(centerX, height - wallInset);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 72, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#1f95bf";
    ctx.fillRect(0, goalTop, wallInset + 5, goalHeight);
    ctx.fillRect(width - wallInset - 5, goalTop, wallInset + 5, goalHeight);

    ctx.fillStyle = "rgba(255,255,255,0.26)";
    ctx.fillRect(0, goalTop + 10, wallInset + 5, goalHeight - 20);
    ctx.fillRect(width - wallInset - 5, goalTop + 10, wallInset + 5, goalHeight - 20);
  }

  drawPuckTrail() {
    const ctx = this.ctx;
    this.puckTrail.forEach((point, index) => {
      const alpha = 0.2 * (1 - index / this.puckTrail.length);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.puck.radius * (1 - index / (this.puckTrail.length * 1.6)), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawStriker(striker) {
    const ctx = this.ctx;
    const glowRadius = striker.radius + 18 + this.collisionFlash * 10;
    ctx.fillStyle = striker.glow;
    ctx.beginPath();
    ctx.arc(striker.x, striker.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(striker.x - 8, striker.y - 8, 4, striker.x, striker.y, striker.radius);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.18, striker.color);
    body.addColorStop(1, striker.player === 1 ? "#1d78b7" : "#bd4430");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(striker.x, striker.y, striker.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(striker.x, striker.y, striker.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPuck() {
    const ctx = this.ctx;
    const puckGlow = ctx.createRadialGradient(this.puck.x, this.puck.y, 2, this.puck.x, this.puck.y, this.puck.radius * 2);
    puckGlow.addColorStop(0, "rgba(255,255,255,1)");
    puckGlow.addColorStop(0.35, "rgba(255,242,140,0.95)");
    puckGlow.addColorStop(1, "rgba(255,242,140,0)");
    ctx.fillStyle = puckGlow;
    ctx.beginPath();
    ctx.arc(this.puck.x, this.puck.y, this.puck.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1f95bf";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.puck.x, this.puck.y, this.puck.radius - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  render() {
    const ctx = this.ctx;
    const shakeX = (Math.random() - 0.5) * this.tableShake;
    const shakeY = (Math.random() - 0.5) * this.tableShake;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(shakeX, shakeY);
    this.drawTable();
    this.drawPuckTrail();
    this.drawStriker(this.players[1]);
    this.drawStriker(this.players[2]);
    this.drawPuck();
    ctx.restore();
  }

  loop(now) {
    const dt = Math.min(0.022, (now - this.lastFrame) / 1000 || 0.016);
    this.lastFrame = now;
    this.collisionFlash = Math.max(0, this.collisionFlash - dt * 1.8);
    this.goalFlash = Math.max(0, this.goalFlash - dt * 0.9);
    this.tableShake = Math.max(0, this.tableShake - dt * 28);
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }
}

window.addEventListener("load", () => {
  new AirHockeyGame();
});
