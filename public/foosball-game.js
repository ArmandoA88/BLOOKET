(async () => {
  if (!window.PIXI) {
    const notice = document.getElementById("demoNotice");
    if (notice) {
      notice.textContent = "Could not load game engine.";
    }
    return;
  }

  const scoreEl = document.getElementById("demoScore");
  const statsEl = document.getElementById("demoStats");
  const levelEl = document.getElementById("demoLevel");
  const eventEl = document.getElementById("demoEvent");
  const timerEl = document.getElementById("demoTimer");
  const noticeEl = document.getElementById("demoNotice");
  const stageEl = document.getElementById("demoStage");
  const restartBtn = document.getElementById("demoRestartBtn");

  const width = 1000;
  const height = 560;
  const goalDurationMs = 90000;
  const spriteAssetVersion = "20260303f";

  const pitch = {
    left: 154,
    right: 846,
    top: 184,
    bottom: 460
  };

  const goal = {
    top: 246,
    bottom: 401
  };
  const goalTop = goal.top;
  const goalBottom = goal.bottom;

  const teamBlueColor = 0x2f80ff;
  const teamGoldColor = 0xffd447;

  const topFrameUrls = [
    "/assets/minigames/foosball_demo/player-top-0.png",
    "/assets/minigames/foosball_demo/player-top-1.png",
    "/assets/minigames/foosball_demo/player-top-2.png",
    "/assets/minigames/foosball_demo/player-top-3.png"
  ];

  const bottomFrameUrls = [
    "/assets/minigames/foosball_demo/player-bottom-0.png",
    "/assets/minigames/foosball_demo/player-bottom-1.png",
    "/assets/minigames/foosball_demo/player-bottom-2.png",
    "/assets/minigames/foosball_demo/player-bottom-3.png"
  ];

  const state = {
    blueGoals: 0,
    goldGoals: 0,
    blueTouches: 0,
    goldTouches: 0,
    running: true,
    freezeUntil: 0,
    endAt: 0
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setNotice(text, tone = "") {
    if (!noticeEl) {
      return;
    }
    noticeEl.textContent = text;
    noticeEl.classList.remove("good", "bad");
    if (tone) {
      noticeEl.classList.add(tone);
    }
  }

  function makeFrameTexture(sheetTexture, x, y, size = 16) {
    const frame = new window.PIXI.Rectangle(x, y, size, size);
    try {
      return new window.PIXI.Texture({ source: sheetTexture.source, frame });
    } catch (_err) {
      return new window.PIXI.Texture(sheetTexture.baseTexture || sheetTexture.source, frame);
    }
  }

  function setNearestScaleMode(texture) {
    const source = texture && (texture.source || texture.baseTexture);
    if (!source || !window.PIXI.SCALE_MODES) {
      return;
    }
    source.scaleMode = window.PIXI.SCALE_MODES.NEAREST;
  }

  async function loadTextureSafe(url) {
    try {
      if (window.PIXI.Assets && typeof window.PIXI.Assets.load === "function") {
        return await window.PIXI.Assets.load(url);
      }
    } catch (_err) {}
    return window.PIXI.Texture.from(url);
  }

  function buildFramesFromSheet(sheetTexture, rowIndex) {
    return [0, 1, 2, 3].map((col) => makeFrameTexture(sheetTexture, col * 16, rowIndex * 16, 16));
  }

  async function loadFoosballSpriteFrames() {
    const cacheBust = `?v=${spriteAssetVersion}`;
    const sheetUrl = `/assets/minigames/foosball_demo/football-player-sheet-cc0.png${cacheBust}`;
    let topFrames = [];
    let bottomFrames = [];

    try {
      const sheetTexture = await loadTextureSafe(sheetUrl);
      setNearestScaleMode(sheetTexture);
      topFrames = buildFramesFromSheet(sheetTexture, 6);
      bottomFrames = buildFramesFromSheet(sheetTexture, 5);
    } catch (_err) {}

    if (topFrames.length === 0) {
      topFrames = await Promise.all(topFrameUrls.map((url) => loadTextureSafe(`${url}${cacheBust}`)));
    }
    if (bottomFrames.length === 0) {
      bottomFrames = await Promise.all(bottomFrameUrls.map((url) => loadTextureSafe(`${url}${cacheBust}`)));
    }

    topFrames.forEach(setNearestScaleMode);
    bottomFrames.forEach(setNearestScaleMode);

    return {
      topFrames: topFrames.length ? topFrames : [window.PIXI.Texture.WHITE],
      bottomFrames: bottomFrames.length ? bottomFrames : [window.PIXI.Texture.WHITE]
    };
  }

  const { topFrames, bottomFrames } = await loadFoosballSpriteFrames();

  const app = new window.PIXI.Application();
  await app.init({
    width,
    height,
    antialias: true,
    backgroundAlpha: 0,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true
  });

  if (stageEl) {
    stageEl.innerHTML = "";
    const view = app.canvas || app.view;
    view.classList.add("mini-foosball-canvas");
    stageEl.appendChild(view);
  }

  const root = new window.PIXI.Container();
  app.stage.addChild(root);
  const fxLayer = new window.PIXI.Container();

  const tableFrame = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  tableFrame.width = width;
  tableFrame.height = height;
  tableFrame.tint = 0x1f6d44;
  root.addChild(tableFrame);

  const fieldImage = window.PIXI.Sprite.from(`/assets/minigames/soccer_shootout/fussball-field.svg?v=${spriteAssetVersion}`);
  fieldImage.width = width - 12;
  fieldImage.height = height - 8;
  fieldImage.x = 6;
  fieldImage.y = 4;
  fieldImage.alpha = 0.98;
  root.addChild(fieldImage);

  const goalGuideLeft = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  goalGuideLeft.x = pitch.left + 2;
  goalGuideLeft.y = goalTop;
  goalGuideLeft.width = 6;
  goalGuideLeft.height = goalBottom - goalTop;
  goalGuideLeft.tint = 0xe6f6ff;
  goalGuideLeft.alpha = 0.55;
  root.addChild(goalGuideLeft);

  const goalGuideRight = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  goalGuideRight.x = pitch.right - 8;
  goalGuideRight.y = goalTop;
  goalGuideRight.width = 6;
  goalGuideRight.height = goalBottom - goalTop;
  goalGuideRight.tint = 0xfff4c9;
  goalGuideRight.alpha = 0.55;
  root.addChild(goalGuideRight);

  const leftGoalie = window.PIXI.Sprite.from(`/assets/minigames/soccer_shootout/goalie-bot.svg?v=${spriteAssetVersion}`);
  leftGoalie.anchor.set(0.5);
  leftGoalie.width = 62;
  leftGoalie.height = 74;
  leftGoalie.x = pitch.left + 34;
  leftGoalie.y = height / 2;
  leftGoalie.alpha = 0.88;
  root.addChild(leftGoalie);

  const rightGoalie = window.PIXI.Sprite.from(`/assets/minigames/soccer_shootout/goalie-bot.svg?v=${spriteAssetVersion}`);
  rightGoalie.anchor.set(0.5);
  rightGoalie.width = 62;
  rightGoalie.height = 74;
  rightGoalie.x = pitch.right - 34;
  rightGoalie.y = height / 2;
  rightGoalie.scale.x = -Math.abs(rightGoalie.scale.x);
  rightGoalie.alpha = 0.88;
  root.addChild(rightGoalie);

  const boardBg = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  boardBg.width = 420;
  boardBg.height = 62;
  boardBg.x = width / 2 - 210;
  boardBg.y = 6;
  boardBg.tint = 0x1d252f;
  root.addChild(boardBg);

  const leftBadge = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  leftBadge.width = 44;
  leftBadge.height = 44;
  leftBadge.x = width / 2 - 188;
  leftBadge.y = 15;
  leftBadge.tint = teamBlueColor;
  root.addChild(leftBadge);

  const rightBadge = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  rightBadge.width = 44;
  rightBadge.height = 44;
  rightBadge.x = width / 2 + 144;
  rightBadge.y = 15;
  rightBadge.tint = teamGoldColor;
  root.addChild(rightBadge);

  const boardStyle = new window.PIXI.TextStyle({
    fontFamily: "Bungee, 'Space Grotesk', sans-serif",
    fill: "#ecf6ff",
    fontSize: 24
  });
  const boardScoreTop = new window.PIXI.Text({ text: "00  90  00", style: boardStyle });
  boardScoreTop.x = width / 2 - boardScoreTop.width / 2;
  boardScoreTop.y = 20;
  root.addChild(boardScoreTop);

  root.addChild(fxLayer);

  const players = [];
  const keysDown = new Set();

  function createPlayer({ name, team, x, y, textures, controls, accent }) {
    const container = new window.PIXI.Container();
    container.x = x;
    container.y = y;

    const aura = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
    aura.anchor.set(0.5);
    aura.width = 34;
    aura.height = 24;
    aura.y = 4;
    aura.alpha = 0.24;
    aura.tint = accent;
    container.addChild(aura);

    const shadow = new window.PIXI.Sprite(textures[0]);
    shadow.anchor.set(0.5, 0.95);
    shadow.scale.set(4.7);
    shadow.y = 14;
    shadow.tint = 0x0a1628;
    shadow.alpha = 0.36;
    shadow.roundPixels = true;
    container.addChild(shadow);

    const sprite = new window.PIXI.Sprite(textures[0]);
    sprite.anchor.set(0.5, 0.95);
    sprite.scale.set(4.35);
    sprite.y = 12;
    sprite.roundPixels = true;
    container.addChild(sprite);

    const label = new window.PIXI.Text({
      text: name,
      style: {
        fontFamily: "Space Grotesk, sans-serif",
        fontWeight: "700",
        fill: "#eff8ff",
        fontSize: 12
      }
    });
    label.anchor.set(0.5, 1);
    label.y = -24;
    container.addChild(label);

    root.addChild(container);

    return {
      name,
      team,
      controls,
      textures,
      frameIndex: 0,
      frameMs: 0,
      container,
      sprite,
      shadow,
      x,
      y,
      vx: 0,
      vy: 0,
      speed: 188,
      radius: 18,
      moveAmount: 0
    };
  }

  players.push(
    createPlayer({
      name: "Blue",
      team: "blue",
      x: width * 0.32,
      y: height * 0.5,
      textures: topFrames,
      controls: { up: "w", down: "s", left: "a", right: "d" },
      accent: 0x7ec2ff
    }),
    createPlayer({
      name: "Gold",
      team: "gold",
      x: width * 0.68,
      y: height * 0.5,
      textures: bottomFrames,
      controls: { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" },
      accent: 0xffd66a
    })
  );

  const ball = window.PIXI.Sprite.from("/assets/minigames/soccer_shootout/soccer.svg");
  ball.anchor.set(0.5);
  ball.width = 44;
  ball.height = 44;
  fxLayer.addChild(ball);

  const ballState = {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    radius: 20,
    lastTouchTeam: ""
  };

  const goalies = [
    { team: "blue", sprite: leftGoalie, x: leftGoalie.x, y: leftGoalie.y, radius: 28 },
    { team: "gold", sprite: rightGoalie, x: rightGoalie.x, y: rightGoalie.y, radius: 28 }
  ];

  function resetPositions() {
    const spawn = [
      [width * 0.32, height * 0.5],
      [width * 0.68, height * 0.5]
    ];

    players.forEach((player, index) => {
      player.x = spawn[index][0];
      player.y = spawn[index][1];
      player.vx = 0;
      player.vy = 0;
      player.moveAmount = 0;
    });

    ballState.x = width / 2;
    ballState.y = height / 2;
    ballState.vx = 0;
    ballState.vy = 0;

    for (const goalie of goalies) {
      goalie.y = height / 2;
      goalie.sprite.y = goalie.y;
    }
  }

  function capBallSpeed(maxSpeed = 460) {
    const speed = Math.hypot(ballState.vx, ballState.vy);
    if (speed <= maxSpeed || speed < 0.001) {
      return;
    }
    const scale = maxSpeed / speed;
    ballState.vx *= scale;
    ballState.vy *= scale;
  }

  function renderHud() {
    const speed = Math.round(Math.hypot(ballState.vx, ballState.vy));
    scoreEl.textContent = `Blue ${state.blueGoals} - ${state.goldGoals} Gold`;
    statsEl.textContent = `Ball speed ${speed} | Blue touches ${state.blueTouches} | Gold touches ${state.goldTouches}`;
    levelEl.textContent = "Blue: WASD";
    eventEl.textContent = "Gold: Arrow Keys";
  }

  function scoreGoal(team) {
    if (team === "blue") {
      state.blueGoals += 1;
    } else {
      state.goldGoals += 1;
    }
    state.freezeUntil = Date.now() + 800;
    setNotice(`${team === "blue" ? "Blue" : "Gold"} scored!`, "good");
    resetPositions();
  }

  function updatePlayer(player, dtMs) {
    const up = keysDown.has(player.controls.up);
    const down = keysDown.has(player.controls.down);
    const left = keysDown.has(player.controls.left);
    const right = keysDown.has(player.controls.right);

    let ix = (right ? 1 : 0) - (left ? 1 : 0);
    let iy = (down ? 1 : 0) - (up ? 1 : 0);

    if (ix !== 0 || iy !== 0) {
      const len = Math.hypot(ix, iy) || 1;
      ix /= len;
      iy /= len;
    }

    player.moveAmount = Math.hypot(ix, iy);
    player.vx = ix * player.speed;
    player.vy = iy * player.speed;

    const dt = dtMs / 1000;
    player.x = clamp(player.x + player.vx * dt, pitch.left + player.radius, pitch.right - player.radius);
    player.y = clamp(player.y + player.vy * dt, pitch.top + player.radius, pitch.bottom - player.radius);

    player.frameMs += dtMs * (player.moveAmount > 0 ? 0.02 : 0.008);
    if (player.frameMs >= 1) {
      player.frameMs = 0;
      player.frameIndex = (player.frameIndex + 1) % player.textures.length;
      player.sprite.texture = player.textures[player.frameIndex];
      player.shadow.texture = player.textures[player.frameIndex];
    }

    player.container.x = player.x;
    player.container.y = player.y;

    if (Math.abs(player.vx) > 1.2) {
      const face = player.vx < 0 ? -1 : 1;
      player.sprite.scale.x = 4.35 * face;
      player.shadow.scale.x = 4.7 * face;
    }
  }

  function collideBallWithPlayer(player) {
    const dx = ballState.x - player.x;
    const dy = ballState.y - player.y;
    const minDist = ballState.radius + player.radius;
    const distSq = dx * dx + dy * dy;

    if (distSq >= minDist * minDist) {
      return;
    }

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;

    ballState.x += nx * overlap;
    ballState.y += ny * overlap;

    const kickStrength = 180 + player.moveAmount * 140;
    ballState.vx += nx * kickStrength + player.vx * 0.55;
    ballState.vy += ny * kickStrength + player.vy * 0.55;
    capBallSpeed();

    ballState.lastTouchTeam = player.team;
    if (player.team === "blue") {
      state.blueTouches += 1;
    } else {
      state.goldTouches += 1;
    }
  }

  function updateGoalies() {
    const sway = Math.sin(performance.now() * 0.004) * 5;
    const targetY = clamp(ballState.y, goalTop + 20, goalBottom - 20);
    for (const goalie of goalies) {
      goalie.y += (targetY - goalie.y) * 0.08;
      goalie.sprite.y = goalie.y + sway;
      goalie.sprite.rotation = (goalie.team === "blue" ? 1 : -1) * Math.sin(performance.now() * 0.006) * 0.04;
    }
  }

  function collideBallWithGoalies() {
    for (const goalie of goalies) {
      const dx = ballState.x - goalie.x;
      const dy = ballState.y - goalie.y;
      const minDist = ballState.radius + goalie.radius;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDist * minDist) {
        continue;
      }

      const dist = Math.sqrt(distSq) || 0.001;
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      ballState.x += nx * overlap;
      ballState.y += ny * overlap;

      const reflectBoost = 130;
      ballState.vx += nx * reflectBoost + (goalie.team === "blue" ? 25 : -25);
      ballState.vy += ny * reflectBoost;
      capBallSpeed(500);
    }
  }

  function updateBall(dtMs) {
    const now = Date.now();
    if (now < state.freezeUntil) {
      return;
    }

    const dt = dtMs / 1000;
    ballState.x += ballState.vx * dt;
    ballState.y += ballState.vy * dt;

    ballState.vx *= Math.pow(0.992, dtMs / 16.66);
    ballState.vy *= Math.pow(0.992, dtMs / 16.66);

    if (Math.abs(ballState.vx) < 0.2) {
      ballState.vx = 0;
    }
    if (Math.abs(ballState.vy) < 0.2) {
      ballState.vy = 0;
    }

    if (ballState.y - ballState.radius <= pitch.top) {
      ballState.y = pitch.top + ballState.radius;
      ballState.vy = Math.abs(ballState.vy) * 0.82;
    } else if (ballState.y + ballState.radius >= pitch.bottom) {
      ballState.y = pitch.bottom - ballState.radius;
      ballState.vy = -Math.abs(ballState.vy) * 0.82;
    }

    const insideGoalY = ballState.y >= goalTop && ballState.y <= goalBottom;
    if (ballState.x - ballState.radius <= pitch.left) {
      if (insideGoalY) {
        scoreGoal("gold");
        return;
      }
      ballState.x = pitch.left + ballState.radius;
      ballState.vx = Math.abs(ballState.vx) * 0.82;
    } else if (ballState.x + ballState.radius >= pitch.right) {
      if (insideGoalY) {
        scoreGoal("blue");
        return;
      }
      ballState.x = pitch.right - ballState.radius;
      ballState.vx = -Math.abs(ballState.vx) * 0.82;
    }
  }

  function startRound() {
    state.blueGoals = 0;
    state.goldGoals = 0;
    state.blueTouches = 0;
    state.goldTouches = 0;
    state.running = true;
    state.endAt = Date.now() + goalDurationMs;
    state.freezeUntil = 0;

    resetPositions();
    setNotice("Kickoff! Soccer field sprite + goalies enabled. Use WASD and Arrow Keys.");
    renderHud();
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", startRound);
  }

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = String(event.key || "").toLowerCase();
    keysDown.add(key);

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = String(event.key || "").toLowerCase();
    keysDown.delete(key);
  });

  window.addEventListener("blur", () => {
    keysDown.clear();
  });

  startRound();

  app.ticker.add((ticker) => {
    const now = Date.now();
    const msLeft = Math.max(0, state.endAt - now);

    if (timerEl) {
      timerEl.textContent = `${(msLeft / 1000).toFixed(1)}s`;
    }

    if (state.running && msLeft <= 0) {
      state.running = false;
      const result =
        state.blueGoals > state.goldGoals
          ? "Blue wins!"
          : state.blueGoals < state.goldGoals
            ? "Gold wins!"
            : "Tie game.";
      setNotice(`${result} Final ${state.blueGoals}-${state.goldGoals}`, state.blueGoals >= state.goldGoals ? "good" : "bad");
    }

    if (state.running) {
      for (const player of players) {
        updatePlayer(player, ticker.deltaMS);
      }

      for (const player of players) {
        collideBallWithPlayer(player);
      }

      updateGoalies();
      collideBallWithGoalies();

      updateBall(ticker.deltaMS);
    }

    ball.x = ballState.x;
    ball.y = ballState.y;
    ball.rotation += (ballState.vx * 0.0006 + ballState.vy * 0.0006) * ticker.deltaMS;

    const boardSeconds = Math.ceil(msLeft / 1000)
      .toString()
      .padStart(2, "0");
    const leftScore = String(state.blueGoals).padStart(2, "0");
    const rightScore = String(state.goldGoals).padStart(2, "0");

    boardScoreTop.text = `${leftScore}  ${boardSeconds}  ${rightScore}`;
    boardScoreTop.x = width / 2 - boardScoreTop.width / 2;

    renderHud();
  });
})();
