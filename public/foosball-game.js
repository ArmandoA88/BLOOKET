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
  const blueStaminaEl = document.getElementById("blueStamina");
  const goldStaminaEl = document.getElementById("goldStamina");

  const width = 1000;
  const height = 560;
  const roundDurationMs = 90000;

  const pitch = {
    left: 120,
    right: 880,
    top: 84,
    bottom: 476
  };

  const goal = {
    top: 228,
    bottom: 332
  };

  const teamBlueColor = 0x2f80ff;
  const teamGoldColor = 0xffd447;

  const state = {
    blueGoals: 0,
    goldGoals: 0,
    blueTouches: 0,
    goldTouches: 0,
    running: true,
    freezeUntil: 0,
    endAt: 0,
    statusText: "",
    cpuKickCooldownUntil: 0,
    playerKickCooldownUntil: 0,
    lastKicker: ""
  };

  const keysDown = new Set();
  const ballFlow = {
    stillMs: 0,
    lastRecoveryAt: 0
  };

  const FORMATION_ROWS = [
    { id: "blue_back", team: "blue", x: 150, yPercents: [0.24, 0.5, 0.76], keeperIndex: 1, role: "backline" },
    { id: "blue_edges", team: "blue", x: 235, yPercents: [0.16, 0.84], role: "wide_support" },
    { id: "gold_front_press", team: "gold", x: 330, yPercents: [0.28, 0.5, 0.72], role: "press" },
    { id: "blue_midfield", team: "blue", x: 430, yPercents: [0.14, 0.32, 0.5, 0.68, 0.86], role: "midfield" },
    { id: "gold_midfield", team: "gold", x: 570, yPercents: [0.14, 0.32, 0.5, 0.68, 0.86], role: "midfield" },
    { id: "blue_attack", team: "blue", x: 670, yPercents: [0.28, 0.5, 0.72], role: "attack" },
    { id: "gold_edges", team: "gold", x: 765, yPercents: [0.16, 0.84], role: "wide_support" },
    { id: "gold_back", team: "gold", x: 850, yPercents: [0.24, 0.5, 0.76], keeperIndex: 1, role: "backline" }
  ];

  const BLUE_NAMES = [
    "Blue Left",
    "B. Goalie",
    "Blue Right",
    "Blue Wing A",
    "Blue Wing B",
    "Blue Press A",
    "Blue Press B",
    "Blue Press C",
    "Blue Mid A",
    "Blue Mid B",
    "Blue Mid C",
    "Blue Mid D",
    "Blue Mid E",
    "Blue Attack A",
    "Blue Attack B",
    "Blue Attack C"
  ];

  const GOLD_NAMES = [
    "Gold Left",
    "G. Goalie",
    "Gold Right",
    "Gold Wing A",
    "Gold Wing B",
    "Gold Press A",
    "Gold Press B",
    "Gold Press C",
    "Gold Mid A",
    "Gold Mid B",
    "Gold Mid C",
    "Gold Mid D",
    "Gold Mid E",
    "Gold Attack A",
    "Gold Attack B",
    "Gold Attack C"
  ];

  const MOVEMENT_GROUPS = {
    defenders: {
      id: "defenders",
      rowIds: new Set(["blue_back", "blue_edges"]),
      upKeys: new Set(["w"]),
      downKeys: new Set(["s"]),
      offsetY: 0,
      speed: 220,
      minOffset: 0,
      maxOffset: 0
    },
    attack: {
      id: "attack",
      rowIds: new Set(["blue_midfield", "blue_attack"]),
      upKeys: new Set(["arrowup"]),
      downKeys: new Set(["arrowdown"]),
      offsetY: 0,
      speed: 220,
      minOffset: 0,
      maxOffset: 0
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomFloat(min, max) {
    return min + Math.random() * (max - min);
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

  function pitchY(percent) {
    return pitch.top + (pitch.bottom - pitch.top) * percent;
  }

  function isInsideGoalY(y) {
    return y >= goal.top && y <= goal.bottom;
  }

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
  const fieldLayer = new window.PIXI.Container();
  const rodLayer = new window.PIXI.Container();
  const playerLayer = new window.PIXI.Container();
  const fxLayer = new window.PIXI.Container();
  root.addChild(fieldLayer);
  root.addChild(rodLayer);
  root.addChild(playerLayer);
  root.addChild(fxLayer);

  const grassStripes = new window.PIXI.Graphics();
  const pitchW = pitch.right - pitch.left;
  const pitchH = pitch.bottom - pitch.top;
  const stripeCount = 7;
  const stripeW = pitchW / stripeCount;
  for (let i = 0; i < stripeCount; i += 1) {
    grassStripes.beginFill(i % 2 === 0 ? 0x1a8a52 : 0x1aaa58, 0.28);
    grassStripes.drawRect(pitch.left + i * stripeW, pitch.top, stripeW, pitchH);
    grassStripes.endFill();
  }
  fieldLayer.addChild(grassStripes);

  const field = new window.PIXI.Graphics();
  field.lineStyle(4, 0xffffff, 0.55);
  field.drawRect(pitch.left, pitch.top, pitchW, pitchH);
  field.lineStyle(2, 0xffffff, 0.6);
  field.moveTo(width / 2, pitch.top);
  field.lineTo(width / 2, pitch.bottom);
  field.drawCircle(width / 2, height / 2, 68);
  field.beginFill(0xffffff, 0.8);
  field.drawCircle(width / 2, height / 2, 4);
  field.drawCircle(pitch.left + 85, height / 2, 3);
  field.drawCircle(pitch.right - 85, height / 2, 3);
  field.endFill();
  field.lineStyle(2, 0xffffff, 0.6);
  field.drawRect(pitch.left, height / 2 - 114, 106, 228);
  field.drawRect(pitch.left, height / 2 - 48, 44, 96);
  field.drawRect(pitch.right - 106, height / 2 - 114, 106, 228);
  field.drawRect(pitch.right - 44, height / 2 - 48, 44, 96);
  fieldLayer.addChild(field);

  function drawGoal(x, facingLeft) {
    const goalDepth = 40;
    const goalHeight = goal.bottom - goal.top;
    const goalShape = new window.PIXI.Graphics();
    goalShape.beginFill(0xffffff, 0.08);
    goalShape.drawRect(facingLeft ? x : x - goalDepth, goal.top, goalDepth, goalHeight);
    goalShape.endFill();
    goalShape.lineStyle(4, 0xffffff, 1);
    if (facingLeft) {
      goalShape.moveTo(x + goalDepth, goal.top);
      goalShape.lineTo(x + goalDepth, goal.bottom);
      goalShape.lineTo(x, goal.bottom);
      goalShape.moveTo(x + goalDepth, goal.top);
      goalShape.lineTo(x, goal.top);
    } else {
      goalShape.moveTo(x - goalDepth, goal.top);
      goalShape.lineTo(x - goalDepth, goal.bottom);
      goalShape.lineTo(x, goal.bottom);
      goalShape.moveTo(x - goalDepth, goal.top);
      goalShape.lineTo(x, goal.top);
    }
    fieldLayer.addChild(goalShape);
  }

  drawGoal(pitch.left - 40, true);
  drawGoal(pitch.right + 40, false);

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

  const statusTextStyle = new window.PIXI.TextStyle({
    fontFamily: "Bungee, 'Space Grotesk', sans-serif",
    fill: "#ffffff",
    fontSize: 64,
    dropShadow: true,
    dropShadowColor: "#000000",
    dropShadowBlur: 8,
    dropShadowDistance: 4,
    align: "center"
  });
  const bigStatusText = new window.PIXI.Text({ text: "", style: statusTextStyle });
  bigStatusText.anchor.set(0.5);
  bigStatusText.x = width / 2;
  bigStatusText.y = height / 2 - 36;
  root.addChild(bigStatusText);

  const particles = [];
  const ballTrail = new window.PIXI.Graphics();
  fxLayer.addChild(ballTrail);
  const trailPoints = [];
  let shakeTime = 0;

  function createParticle(x, y, color) {
    const particle = new window.PIXI.Graphics();
    particle.beginFill(color);
    particle.drawCircle(0, 0, Math.random() * 3 + 2);
    particle.endFill();
    particle.x = x;
    particle.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 220 + 90;
    fxLayer.addChild(particle);
    particles.push({
      sprite: particle,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1
    });
  }

  function buildPlayerSprite(team, isGoalie = false) {
    const container = new window.PIXI.Container();
    const body = new window.PIXI.Graphics();
    const shirt = team === "blue" ? 0x3b82f6 : 0xf6d04d;
    const shorts = team === "blue" ? 0x173a8a : 0xa66b10;
    const trim = team === "blue" ? 0xcce5ff : 0x5a3f00;
    const skin = team === "blue" ? 0xf2c79c : 0xeac49c;
    const bodyWidth = isGoalie ? 18 : 16;
    const bodyHeight = isGoalie ? 30 : 26;

    body.lineStyle(2, trim, 0.95);
    body.beginFill(shirt);
    body.drawRoundedRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, 5);
    body.endFill();
    body.lineStyle(0);
    body.beginFill(shorts);
    body.drawRoundedRect(-bodyWidth / 2, 3, bodyWidth, 8, 3);
    body.endFill();
    body.beginFill(skin);
    body.drawCircle(0, -bodyHeight / 2 - 9, 7);
    body.endFill();
    body.beginFill(trim, 0.95);
    body.drawRect(-2, bodyHeight / 2 - 2, 4, 8);
    body.endFill();
    container.addChild(body);

    const marker = new window.PIXI.Graphics();
    marker.beginFill(isGoalie ? 0x67d8ff : trim, 1);
    marker.drawCircle(0, -bodyHeight / 2 - 9, isGoalie ? 3.6 : 2.8);
    marker.endFill();
    container.addChild(marker);

    return container;
  }

  const rods = [];
  const players = [];

  function createRod(row, index) {
    const rod = new window.PIXI.Container();
    rod.baseX = row.x;
    rod.baseY = height / 2;
    rod.row = row;

    const shaft = new window.PIXI.Graphics();
    shaft.beginFill(0xe7eef6, 0.96);
    shaft.drawRoundedRect(-2.5, pitch.top - 58, 5, pitchH + 116, 3);
    shaft.endFill();
    rod.addChild(shaft);

    const topHandle = new window.PIXI.Graphics();
    topHandle.beginFill(0x384858);
    topHandle.drawRoundedRect(-10, pitch.top - 86, 20, 28, 8);
    topHandle.endFill();
    rod.addChild(topHandle);

    const bottomHandle = new window.PIXI.Graphics();
    bottomHandle.beginFill(0x384858);
    bottomHandle.drawRoundedRect(-10, pitch.bottom + 58, 20, 28, 8);
    bottomHandle.endFill();
    rod.addChild(bottomHandle);

    rod.x = row.x;
    rod.y = 0;
    rodLayer.addChild(rod);
    rods.push(rod);

    row.yPercents.forEach((percent, slotIndex) => {
      const isGoalie = row.keeperIndex === slotIndex;
      const namePool = row.team === "blue" ? BLUE_NAMES : GOLD_NAMES;
      const player = {
        id: `${row.id}_${slotIndex}`,
        name: namePool[players.length % namePool.length],
        team: row.team,
        rowId: row.id,
        role: row.role,
        rowIndex: index,
        slotIndex,
        isGoalie,
        homeX: row.x,
        homeY: pitchY(percent),
        x: row.x,
        y: pitchY(percent),
        radius: isGoalie ? 14 : 11.5,
        kickTime: 0,
        touchCooldownUntil: 0,
        groupId: row.team === "blue" && MOVEMENT_GROUPS.defenders.rowIds.has(row.id)
          ? "defenders"
          : row.team === "blue" && MOVEMENT_GROUPS.attack.rowIds.has(row.id)
            ? "attack"
            : ""
      };

      const container = new window.PIXI.Container();
      const shadow = new window.PIXI.Graphics();
      shadow.beginFill(0x000000, 0.18);
      shadow.drawEllipse(0, 18, isGoalie ? 16 : 14, 5);
      shadow.endFill();
      container.addChild(shadow);
      const sprite = buildPlayerSprite(row.team, isGoalie);
      container.addChild(sprite);
      const kickPose = new window.PIXI.Container();
      kickPose.visible = false;
      const leg = new window.PIXI.Graphics();
      leg.beginFill(row.team === "blue" ? 0x173a8a : 0xa66b10);
      if (row.team === "blue") {
        leg.drawPolygon([0, 0, 16, -5, 18, 1, 6, 7]);
      } else {
        leg.drawPolygon([0, 1, -16, -5, -18, 1, -6, 7]);
      }
      leg.endFill();
      kickPose.x = row.team === "blue" ? 6 : -6;
      kickPose.y = 10;
      kickPose.addChild(leg);
      container.addChild(kickPose);
      container.x = player.homeX;
      container.y = player.homeY;
      player.container = container;
      player.sprite = sprite;
      player.kickPose = kickPose;
      players.push(player);
      playerLayer.addChild(container);
    });
  }

  FORMATION_ROWS.forEach((row, index) => createRod(row, index));

  function configureMovementGroupBounds() {
    Object.values(MOVEMENT_GROUPS).forEach((group) => {
      const groupPlayers = players.filter((player) => player.groupId === group.id);
      if (groupPlayers.length === 0) {
        group.minOffset = 0;
        group.maxOffset = 0;
        return;
      }
      const minHomeY = Math.min(...groupPlayers.map((player) => player.homeY - player.radius));
      const maxHomeY = Math.max(...groupPlayers.map((player) => player.homeY + player.radius));
      group.minOffset = pitch.top + 10 - minHomeY;
      group.maxOffset = pitch.bottom - 10 - maxHomeY;
    });
  }

  configureMovementGroupBounds();

  const ballShadow = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  ballShadow.anchor.set(0.5);
  ballShadow.width = 24;
  ballShadow.height = 12;
  ballShadow.tint = 0x000000;
  ballShadow.alpha = 0.28;
  fxLayer.addChild(ballShadow);

  const ball = new window.PIXI.Graphics();
  ball.beginFill(0xffffff);
  ball.lineStyle(2, 0x000000);
  ball.drawCircle(0, 0, 14);
  ball.endFill();
  ball.beginFill(0x000000);
  ball.drawCircle(6, 6, 4);
  ball.drawCircle(-6, -6, 4);
  ball.drawCircle(-6, 6, 4);
  ball.drawCircle(6, -6, 4);
  ball.endFill();
  fxLayer.addChild(ball);

  const ballState = {
    x: width / 2,
    y: height / 2,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 14,
    lastTouchTeam: ""
  };

  function resetPositions() {
    Object.values(MOVEMENT_GROUPS).forEach((group) => {
      group.offsetY = 0;
    });

    players.forEach((player) => {
      player.x = player.homeX;
      player.y = player.homeY;
      player.kickTime = 0;
      player.touchCooldownUntil = 0;
      player.container.x = player.homeX;
      player.container.y = player.homeY;
    });

    rods.forEach((rod) => {
      rod.x = rod.baseX;
      rod.y = 0;
    });

    ballState.x = width / 2;
    ballState.y = height / 2;
    ballState.z = 0;
    ballState.vx = randomFloat(-120, 120);
    ballState.vy = randomFloat(-80, 80);
    ballState.vz = 0;
    state.cpuKickCooldownUntil = 0;
    state.playerKickCooldownUntil = 0;
    state.lastKicker = "";
    ballFlow.stillMs = 0;
    ballFlow.lastRecoveryAt = 0;
  }

  function renderHud() {
    const speed = Math.round(Math.hypot(ballState.vx, ballState.vy));
    scoreEl.textContent = `Blue ${state.blueGoals} - ${state.goldGoals} Gold`;
    statsEl.textContent = `Ball speed ${speed} | Blue kicks ${state.blueTouches} | Gold kicks ${state.goldTouches}`;
    levelEl.textContent = "W/S defenders | Arrows attack | Space kick";
    eventEl.textContent = "Groups: defense and midfield/attack";
    if (blueStaminaEl) blueStaminaEl.style.width = "100%";
    if (goldStaminaEl) goldStaminaEl.style.width = "100%";
  }

  function scoreGoal(team) {
    if (state.statusText === "GOAL!") {
      return;
    }

    if (team === "blue") {
      state.blueGoals += 1;
    } else {
      state.goldGoals += 1;
    }

    state.statusText = "GOAL!";
    state.freezeUntil = Date.now() + 2200;
    shakeTime = 0.3;
    for (let i = 0; i < 18; i += 1) {
      createParticle(ballState.x, ballState.y, team === "blue" ? teamBlueColor : teamGoldColor);
    }
    setNotice(`${team === "blue" ? "Blue Team" : "Gold Team"} scored!`, "good");
  }

  function groupOffsetForPlayer(player) {
    if (!player.groupId) {
      return 0;
    }
    return Number(MOVEMENT_GROUPS[player.groupId]?.offsetY || 0);
  }

  function updatePlayerGroupMovement(dtMs) {
    const dt = dtMs / 1000;
    Object.values(MOVEMENT_GROUPS).forEach((group) => {
      const moveUp = [...group.upKeys].some((key) => keysDown.has(key));
      const moveDown = [...group.downKeys].some((key) => keysDown.has(key));
      const direction = (moveDown ? 1 : 0) - (moveUp ? 1 : 0);
      if (direction === 0) {
        return;
      }
      group.offsetY = clamp(group.offsetY + direction * group.speed * dt, group.minOffset, group.maxOffset);
    });
  }

  function animatePlayer(player, now, dtSeconds) {
    player.kickTime = Math.max(0, player.kickTime - dtSeconds);
    const body = player.sprite;
    const sway = Math.sin(now / 650 + player.rowIndex * 0.55 + player.slotIndex * 0.4) * 0.9;
    const kickProgress = player.kickTime > 0 ? 1 - player.kickTime / 0.22 : 0;
    const lunge = player.kickTime > 0 ? Math.sin(kickProgress * Math.PI) * 6 : 0;
    const groupOffset = groupOffsetForPlayer(player);
    body.y = sway;
    if (player.kickTime > 0) {
      body.scale.x = 1 + Math.sin(kickProgress * Math.PI) * 0.09;
      body.scale.y = 1 - Math.sin(kickProgress * Math.PI) * 0.05;
      body.rotation = (player.team === "blue" ? -1 : 1) * Math.sin(kickProgress * Math.PI) * 0.08;
      player.kickPose.visible = true;
      player.kickPose.rotation = (player.team === "blue" ? -1 : 1) * Math.sin(kickProgress * Math.PI) * 0.18;
      player.kickPose.scale.x = 0.95 + Math.sin(kickProgress * Math.PI) * 0.12;
      player.kickPose.scale.y = 0.95 + Math.sin(kickProgress * Math.PI) * 0.08;
    } else {
      body.scale.x += (1 - body.scale.x) * 0.25;
      body.scale.y += (1 - body.scale.y) * 0.25;
      body.rotation *= 0.72;
      player.kickPose.visible = false;
      player.kickPose.rotation = 0;
      player.kickPose.scale.x = 1;
      player.kickPose.scale.y = 1;
    }
    player.container.x = player.x + (player.team === "blue" ? lunge : -lunge);
    player.container.y = player.y + groupOffset;
  }

  function applyStaticPlayerCollision(player) {
    const dx = ballState.x - player.x;
    const dy = ballState.y - (player.y + groupOffsetForPlayer(player));
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

    const towardNormal = ballState.vx * nx + ballState.vy * ny;
    if (towardNormal < 0) {
      ballState.vx -= 1.65 * towardNormal * nx;
      ballState.vy -= 1.65 * towardNormal * ny;
    }
  }

  function nearestPlayer(team, maxDistance = 64) {
    let best = null;
    let bestDist = maxDistance;
    for (const player of players) {
      if (player.team !== team) {
        continue;
      }
      const distance = Math.hypot(ballState.x - player.x, ballState.y - player.y);
      const correctedDistance = Math.hypot(ballState.x - player.x, ballState.y - (player.y + groupOffsetForPlayer(player)));
      if (correctedDistance <= bestDist) {
        best = player;
        bestDist = correctedDistance;
      }
    }
    return best;
  }

  function kickBall(player) {
    const now = Date.now();
    if (player.touchCooldownUntil > now) {
      return false;
    }
    const distance = Math.hypot(ballState.x - player.x, ballState.y - player.y);
    if (distance > player.radius + ballState.radius + 18) {
      return false;
    }

    const towardX = player.team === "blue" ? pitch.right + 40 : pitch.left - 40;
    const towardY = clamp(ballState.y + randomFloat(-28, 28), pitch.top + 24, pitch.bottom - 24);
    const playerY = player.y + groupOffsetForPlayer(player);
    const dirX = towardX - player.x;
    const dirY = towardY - playerY;
    const length = Math.hypot(dirX, dirY) || 1;
    const kickPower = player.isGoalie ? 460 : 540;

    ballState.x = player.x + (dirX / length) * (player.radius + ballState.radius + 2);
    ballState.y = playerY + (dirY / length) * (player.radius + ballState.radius + 2);
    ballState.vx = (dirX / length) * kickPower;
    ballState.vy = (dirY / length) * kickPower;
    ballState.vz = 80;
    ballState.lastTouchTeam = player.team;
    player.kickTime = 0.22;
    player.touchCooldownUntil = now + 260;
    state.lastKicker = player.name;

    if (player.team === "blue") {
      state.blueTouches += 1;
      state.playerKickCooldownUntil = now + 180;
      setNotice(`${player.name} kicked the ball.`, "");
    } else {
      state.goldTouches += 1;
      state.cpuKickCooldownUntil = now + 260;
    }

    for (let i = 0; i < 5; i += 1) {
      createParticle(ballState.x, ballState.y, player.team === "blue" ? teamBlueColor : teamGoldColor);
    }
    return true;
  }

  function tryPlayerKick() {
    const now = Date.now();
    if (now < state.playerKickCooldownUntil || !state.running || now < state.freezeUntil) {
      return;
    }
    const kicker = nearestPlayer("blue", 72);
    if (!kicker) {
      setNotice("Wait for the ball to get close to one of your players.", "bad");
      state.playerKickCooldownUntil = now + 180;
      return;
    }
    kickBall(kicker);
  }

  function maybeCpuKick() {
    const now = Date.now();
    if (!state.running || now < state.freezeUntil || now < state.cpuKickCooldownUntil) {
      return;
    }
    const kicker = nearestPlayer("gold", 68);
    if (kicker) {
      kickBall(kicker);
    }
  }

  function updateStuckBallDetection(dtMs) {
    const speed = Math.hypot(ballState.vx, ballState.vy) + Math.abs(ballState.vz) * 0.1;
    const now = Date.now();
    if (speed < 18 && ballState.z < 6) {
      ballFlow.stillMs += dtMs;
    } else {
      ballFlow.stillMs = 0;
    }

    if (ballFlow.stillMs < 1000 || now - ballFlow.lastRecoveryAt < 1000) {
      return;
    }

    const sorted = [...players]
      .map((player) => ({
        player,
        distance: Math.hypot(ballState.x - player.x, ballState.y - (player.y + groupOffsetForPlayer(player)))
      }))
      .sort((left, right) => left.distance - right.distance);
    const pool = sorted.slice(0, Math.min(6, sorted.length));
    const chosen = pool[Math.floor(Math.random() * pool.length)]?.player;
    if (!chosen) {
      return;
    }

    const chosenY = chosen.y + groupOffsetForPlayer(chosen);
    const direction = chosen.team === "blue" ? 1 : -1;
    ballState.x = clamp(chosen.x + direction * (chosen.radius + ballState.radius + 12), pitch.left + 40, pitch.right - 40);
    ballState.y = clamp(chosenY + randomFloat(-20, 20), pitch.top + 24, pitch.bottom - 24);
    ballState.vx = direction * randomFloat(180, 260);
    ballState.vy = randomFloat(-120, 120);
    ballState.vz = randomFloat(20, 55);
    ballFlow.stillMs = 0;
    ballFlow.lastRecoveryAt = now;
    setNotice(`Recovered the ball near ${chosen.name} to keep play moving.`, "");
  }

  function updateBall(dtMs) {
    const dt = dtMs / 1000;
    const gravity = -900;

    if (ballState.z > 0 || ballState.vz > 0) {
      ballState.vz += gravity * dt;
      ballState.z += ballState.vz * dt;
      if (ballState.z <= 0) {
        ballState.z = 0;
        ballState.vz *= -0.4;
        if (Math.abs(ballState.vz) < 35) {
          ballState.vz = 0;
        }
      }
    }

    if (Date.now() < state.freezeUntil && ballState.z <= 0) {
      return;
    }

    ballState.x += ballState.vx * dt;
    ballState.y += ballState.vy * dt;
    ballState.vx *= Math.pow(0.986, dtMs / 16.66);
    ballState.vy *= Math.pow(0.986, dtMs / 16.66);

    if (Math.abs(ballState.vx) < 0.18) ballState.vx = 0;
    if (Math.abs(ballState.vy) < 0.18) ballState.vy = 0;

    if (ballState.y - ballState.radius <= pitch.top) {
      ballState.y = pitch.top + ballState.radius;
      ballState.vy = Math.abs(ballState.vy) * 0.88;
    } else if (ballState.y + ballState.radius >= pitch.bottom) {
      ballState.y = pitch.bottom - ballState.radius;
      ballState.vy = -Math.abs(ballState.vy) * 0.88;
    }

    if (ballState.x - ballState.radius <= pitch.left) {
      if (isInsideGoalY(ballState.y)) {
        scoreGoal("gold");
        return;
      }
      ballState.x = pitch.left + ballState.radius;
      ballState.vx = Math.abs(ballState.vx) * 0.88;
    } else if (ballState.x + ballState.radius >= pitch.right) {
      if (isInsideGoalY(ballState.y)) {
        scoreGoal("blue");
        return;
      }
      ballState.x = pitch.right - ballState.radius;
      ballState.vx = -Math.abs(ballState.vx) * 0.88;
    }

    for (const player of players) {
      applyStaticPlayerCollision(player);
    }

    updateStuckBallDetection(dtMs);
  }

  function startRound() {
    state.blueGoals = 0;
    state.goldGoals = 0;
    state.blueTouches = 0;
    state.goldTouches = 0;
    state.running = true;
    state.endAt = Date.now() + roundDurationMs + 3000;
    state.freezeUntil = Date.now() + 3000;
    state.statusText = "";
    resetPositions();
    setNotice("W/S mueve defensores. Flechas mueve mediocampo y ataque. Space patea.", "");
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

    if (key === " " || event.code === "Space") {
      event.preventDefault();
      tryPlayerKick();
    }
    if (["w", "s", "arrowup", "arrowdown"].includes(key)) {
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
    const dtSeconds = ticker.deltaMS / 1000;
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

    updatePlayerGroupMovement(ticker.deltaMS);

    rods.forEach((rod, index) => {
      const rowId = String(rod.row?.id || "");
      const groupOffset =
        MOVEMENT_GROUPS.defenders.rowIds.has(rowId)
          ? MOVEMENT_GROUPS.defenders.offsetY
          : MOVEMENT_GROUPS.attack.rowIds.has(rowId)
            ? MOVEMENT_GROUPS.attack.offsetY
            : 0;
      rod.y = groupOffset + Math.sin(now / 850 + index * 0.55) * 1.2;
    });

    for (const player of players) {
      animatePlayer(player, now, dtSeconds);
    }

    if (state.running) {
      maybeCpuKick();
      updateBall(ticker.deltaMS);
    }

    if (state.running) {
      const waitMsLeft = state.freezeUntil - now;
      if (waitMsLeft > 0) {
        if (state.statusText === "GOAL!" && waitMsLeft < 800) {
          resetPositions();
          state.statusText = "";
          state.freezeUntil = now + 3000;
          state.endAt += 3000;
        } else if (state.statusText !== "GOAL!") {
          const count = Math.ceil(waitMsLeft / 1000);
          bigStatusText.text = count > 0 ? count.toString() : "GO!";
          bigStatusText.scale.set(1 + (waitMsLeft % 1000) / 1000 * 0.5);
          bigStatusText.alpha = (waitMsLeft % 1000) / 1000 + 0.2;
        } else {
          bigStatusText.text = "GOAL!";
          bigStatusText.scale.set(2 + Math.sin(now / 100) * 0.2);
          bigStatusText.alpha = 1;
        }
      } else if (bigStatusText.text === "1" || bigStatusText.text === "GO!") {
        bigStatusText.text = "GO!";
        bigStatusText.alpha -= dtSeconds * 2;
        if (bigStatusText.alpha <= 0) {
          bigStatusText.text = "";
        }
      } else {
        bigStatusText.text = "";
      }
    }

    const scaleMult = 1 + ballState.z / 150;
    ball.scale.set(scaleMult);
    ball.x = ballState.x;
    ball.y = ballState.y - ballState.z;
    ballShadow.x = ballState.x;
    ballShadow.y = ballState.y;
    ballShadow.scale.set(1 - ballState.z / 300);
    ballShadow.alpha = 0.28 * Math.max(0, 1 - ballState.z / 200);
    ball.rotation += (ballState.vx * 0.0005 + ballState.vy * 0.0005) * ticker.deltaMS;

    if (state.running && now >= state.freezeUntil) {
      trailPoints.unshift({ x: ballState.x, y: ballState.y });
      if (trailPoints.length > 10) {
        trailPoints.pop();
      }
      ballTrail.clear();
      for (let i = 1; i < trailPoints.length; i += 1) {
        const p1 = trailPoints[i - 1];
        const p2 = trailPoints[i];
        ballTrail.lineStyle(12 * (1 - i / trailPoints.length), 0xffffff, 0.35 * (1 - i / trailPoints.length));
        ballTrail.moveTo(p1.x, p1.y);
        ballTrail.lineTo(p2.x, p2.y);
      }
    } else {
      trailPoints.length = 0;
      ballTrail.clear();
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= dtSeconds * 1.4;
      if (particle.life <= 0) {
        fxLayer.removeChild(particle.sprite);
        particle.sprite.destroy();
        particles.splice(i, 1);
      } else {
        particle.x += particle.vx * dtSeconds;
        particle.y += particle.vy * dtSeconds;
        particle.sprite.x = particle.x;
        particle.sprite.y = particle.y;
        particle.sprite.alpha = particle.life;
      }
    }

    if (shakeTime > 0) {
      shakeTime -= dtSeconds;
      const magnitude = Math.min(shakeTime * 40, 12);
      app.stage.x = (Math.random() - 0.5) * magnitude;
      app.stage.y = (Math.random() - 0.5) * magnitude;
    } else {
      app.stage.x = 0;
      app.stage.y = 0;
    }

    const boardSeconds = Math.ceil(msLeft / 1000).toString().padStart(2, "0");
    const leftScore = String(state.blueGoals).padStart(2, "0");
    const rightScore = String(state.goldGoals).padStart(2, "0");
    boardScoreTop.text = `${leftScore}  ${boardSeconds}  ${rightScore}`;
    boardScoreTop.x = width / 2 - boardScoreTop.width / 2;

    renderHud();
  });
})();
