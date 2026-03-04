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
  const goalDurationMs = 90000;
  const spriteAssetVersion = "20260303f";

  const pitch = {
    left: 135,
    right: 865,
    top: 110,
    bottom: 504
  };

  const goal = {
    top: 247,
    bottom: 377
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
    endAt: 0,
    blueStamina: 100,
    goldStamina: 100,
    statusText: ""
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
      if (window.PIXI.Assets) {
        return await window.PIXI.Assets.load(url);
      }
    } catch (_err) { }
    try {
      return window.PIXI.Texture.from(url);
    } catch (err) {
      return window.PIXI.Texture.WHITE;
    }
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
    } catch (_err) { }

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

  const messiTex = await loadTextureSafe(`/assets/players/messi.svg?v=${spriteAssetVersion}`);
  const mbappeTex = await loadTextureSafe(`/assets/players/mbappe.svg?v=${spriteAssetVersion}`);
  const neymarTex = await loadTextureSafe(`/assets/players/neymar.svg?v=${spriteAssetVersion}`);
  const ronaldoTex = await loadTextureSafe(`/assets/players/ronaldo.svg?v=${spriteAssetVersion}`);
  const haalandTex = await loadTextureSafe(`/assets/players/haaland.svg?v=${spriteAssetVersion}`);
  const peleTex = await loadTextureSafe(`/assets/players/pele.svg?v=${spriteAssetVersion}`);
  const goalieTex = await loadTextureSafe(`/assets/players/goalie-bot.svg?v=${spriteAssetVersion}`);

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

  // Grass alternating stripes (7 bands)
  const pitchW = pitch.right - pitch.left;
  const pitchH = pitch.bottom - pitch.top;
  const stripeCount = 7;
  const stripeW = pitchW / stripeCount;
  const grassStripes = new window.PIXI.Graphics();
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      grassStripes.beginFill(0x1a8a52, 0.28);
    } else {
      grassStripes.beginFill(0x1aaa58, 0.28);
    }
    grassStripes.drawRect(pitch.left + i * stripeW, pitch.top, stripeW, pitchH);
    grassStripes.endFill();
  }
  root.addChild(grassStripes);

  const fieldDetails = new window.PIXI.Graphics();

  // Pitch outline
  fieldDetails.lineStyle(4, 0xFFFFFF, 0.55);
  fieldDetails.drawRect(pitch.left, pitch.top, pitchW, pitchH);

  // Corner arcs (quarter-circles, radius 22)
  const cR = 22;
  fieldDetails.lineStyle(2, 0xFFFFFF, 0.55);
  fieldDetails.arc(pitch.left, pitch.top, cR, 0, Math.PI * 0.5);
  fieldDetails.moveTo(pitch.right - cR, pitch.top);
  fieldDetails.arc(pitch.right, pitch.top, cR, Math.PI * 0.5, Math.PI);
  fieldDetails.moveTo(pitch.right, pitch.bottom - cR);
  fieldDetails.arc(pitch.right, pitch.bottom, cR, Math.PI, Math.PI * 1.5);
  fieldDetails.moveTo(pitch.left + cR, pitch.bottom);
  fieldDetails.arc(pitch.left, pitch.bottom, cR, Math.PI * 1.5, Math.PI * 2);


  // Center Line
  fieldDetails.lineStyle(2, 0xFFFFFF, 0.6);
  fieldDetails.moveTo(width / 2, pitch.top);
  fieldDetails.lineTo(width / 2, pitch.bottom);

  // Center Circle
  fieldDetails.lineStyle(2, 0xFFFFFF, 0.6);
  fieldDetails.drawCircle(width / 2, height / 2, 70);
  fieldDetails.beginFill(0xFFFFFF, 0.8);
  fieldDetails.drawCircle(width / 2, height / 2, 5);
  fieldDetails.endFill();

  // Penalty spots
  fieldDetails.beginFill(0xFFFFFF, 0.8);
  fieldDetails.drawCircle(pitch.left + 80, height / 2, 3.5);
  fieldDetails.drawCircle(pitch.right - 80, height / 2, 3.5);
  fieldDetails.endFill();

  // Left Penalty Box
  fieldDetails.lineStyle(2, 0xFFFFFF, 0.6);
  fieldDetails.drawRect(pitch.left, height / 2 - 120, 110, 240);
  fieldDetails.drawRect(pitch.left, height / 2 - 50, 45, 100);

  // Right Penalty Box
  fieldDetails.drawRect(pitch.right - 110, height / 2 - 120, 110, 240);
  fieldDetails.drawRect(pitch.right - 45, height / 2 - 50, 45, 100);

  // === GOAL STRUCTURES ===
  const goalDepth = 44;  // depth of the net area
  const goalW = goalBottom - goalTop;  // height of opening

  // LEFT GOAL - net fill
  fieldDetails.beginFill(0xffffff, 0.08);
  fieldDetails.lineStyle(0);
  fieldDetails.drawRect(pitch.left - goalDepth, goalTop, goalDepth, goalW);
  fieldDetails.endFill();

  // LEFT GOAL - net grid lines
  fieldDetails.lineStyle(1, 0xffffff, 0.22);
  for (let gx = pitch.left - goalDepth + 11; gx < pitch.left; gx += 11) {
    fieldDetails.moveTo(gx, goalTop);
    fieldDetails.lineTo(gx, goalBottom);
  }
  for (let gy = goalTop + 13; gy < goalBottom; gy += 13) {
    fieldDetails.moveTo(pitch.left - goalDepth, gy);
    fieldDetails.lineTo(pitch.left, gy);
  }

  // LEFT GOAL - posts & crossbar
  fieldDetails.lineStyle(5, 0xFFFFFF, 1.0);
  fieldDetails.moveTo(pitch.left, goalTop); fieldDetails.lineTo(pitch.left, goalBottom);   // front post
  fieldDetails.moveTo(pitch.left, goalTop); fieldDetails.lineTo(pitch.left - goalDepth, goalTop);   // top bar
  fieldDetails.moveTo(pitch.left, goalBottom); fieldDetails.lineTo(pitch.left - goalDepth, goalBottom); // bottom bar
  fieldDetails.lineStyle(3, 0xdddddd, 0.8);
  fieldDetails.moveTo(pitch.left - goalDepth, goalTop); fieldDetails.lineTo(pitch.left - goalDepth, goalBottom); // back post

  // RIGHT GOAL - net fill
  fieldDetails.lineStyle(0);
  fieldDetails.beginFill(0xffffff, 0.08);
  fieldDetails.drawRect(pitch.right, goalTop, goalDepth, goalW);
  fieldDetails.endFill();

  // RIGHT GOAL - net grid lines
  fieldDetails.lineStyle(1, 0xffffff, 0.22);
  for (let gx = pitch.right + 11; gx < pitch.right + goalDepth; gx += 11) {
    fieldDetails.moveTo(gx, goalTop);
    fieldDetails.lineTo(gx, goalBottom);
  }
  for (let gy = goalTop + 13; gy < goalBottom; gy += 13) {
    fieldDetails.moveTo(pitch.right, gy);
    fieldDetails.lineTo(pitch.right + goalDepth, gy);
  }

  // RIGHT GOAL - posts & crossbar
  fieldDetails.lineStyle(5, 0xFFFFFF, 1.0);
  fieldDetails.moveTo(pitch.right, goalTop); fieldDetails.lineTo(pitch.right, goalBottom);
  fieldDetails.moveTo(pitch.right, goalTop); fieldDetails.lineTo(pitch.right + goalDepth, goalTop);
  fieldDetails.moveTo(pitch.right, goalBottom); fieldDetails.lineTo(pitch.right + goalDepth, goalBottom);
  fieldDetails.lineStyle(3, 0xdddddd, 0.8);
  fieldDetails.moveTo(pitch.right + goalDepth, goalTop); fieldDetails.lineTo(pitch.right + goalDepth, goalBottom);

  root.addChild(fieldDetails);

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
  bigStatusText.y = height / 2 - 40;
  root.addChild(bigStatusText);

  const powerUpContainer = new window.PIXI.Container();
  root.addChild(powerUpContainer);

  root.addChild(fxLayer);

  const powerUpsArray = [];
  const powerUpTypes = ["giant", "speed", "stamina", "super", "freeze", "magnet"];
  const powerUpColors = { "giant": 0xef4444, "speed": 0x3b82f6, "stamina": 0x10b981, "super": 0xa855f7, "freeze": 0x67e8f9, "magnet": 0xf43f5e };
  const powerUpLabels = { "giant": "Giant Mode", "speed": "Super Speed", "stamina": "Full Stamina", "super": "Power Kicker", "freeze": "Freeze Enemies", "magnet": "Ball Magnet" };

  function spawnPowerUp() {
    if (powerUpsArray.length >= 3) return;
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    const cx = pitch.left + 80 + Math.random() * (pitch.right - pitch.left - 160);
    const cy = pitch.top + 50 + Math.random() * (pitch.bottom - pitch.top - 100);

    const graphics = new window.PIXI.Graphics();
    graphics.beginFill(powerUpColors[type]);
    graphics.lineStyle(2, 0xFFFFFF);
    graphics.drawCircle(0, 0, 15);
    graphics.endFill();
    graphics.x = cx;
    graphics.y = cy;

    const label = new window.PIXI.Text({
      text: type === "giant" ? "G" : type === "speed" ? "⚡" : type === "stamina" ? "♥" : type === "freeze" ? "❄" : type === "magnet" ? "🧲" : "S",
      style: { fill: "#FFFFFF", fontSize: 16, fontWeight: "bold" }
    });
    label.anchor.set(0.5);
    graphics.addChild(label);

    powerUpContainer.addChild(graphics);

    powerUpsArray.push({
      x: cx,
      y: cy,
      radius: 17,
      type: type,
      sprite: graphics,
      life: 12.0
    });
  }

  const players = [];
  const keysDown = new Set();




  // === Player configs — unique per star ===
  const playerConfigs = {
    "Messi": { skin: 0xf5c99a, hair: 0x2c1810, hairStyle: "short", num: "10", accent: 0xffe066 },
    "Mbappe": { skin: 0x8b5e3c, hair: 0x111111, hairStyle: "fade", num: "7", accent: 0x60a5fa },
    "Neymar": { skin: 0xa0735a, hair: 0x1d1006, hairStyle: "mohawk", num: "11", accent: 0xfde68a },
    "Ronaldo": { skin: 0xe8c39e, hair: 0x1a120b, hairStyle: "slick", num: "7", accent: 0xfcd34d },
    "Haaland": { skin: 0xfde8cc, hair: 0xe8c87a, hairStyle: "short", num: "9", accent: 0xa78bfa },
    "Pel\u00e9": { skin: 0x6b4226, hair: 0x0d0905, hairStyle: "short", num: "10", accent: 0x86efac },
    "B. Goalie": { skin: 0xf5c99a, hair: 0x2c1810, hairStyle: "short", num: "G", accent: 0x99f6e4 },
    "G. Goalie": { skin: 0xd4a574, hair: 0x111111, hairStyle: "short", num: "G", accent: 0xfcd34d }
  };

  function buildPlayerSprite(name, team, r) {
    const cfg = playerConfigs[name] || { skin: 0xffe0bd, hair: 0x333333, hairStyle: "short", num: "?", accent: 0xffffff };
    const teamDark = team === "blue" ? 0x1d4ed8 : 0xb45309;
    const shirtColor = team === "blue" ? 0x3b82f6 : 0xf59e0b;
    const shirtLight = team === "blue" ? 0x93c5fd : 0xfde68a;
    const shortsColor = team === "blue" ? 0x1e3a8a : 0x7c2d12;
    const isGoalie = name.includes("Goalie");
    const scale = r / 14; // normalize size

    const g = new window.PIXI.Container();
    const body = new window.PIXI.Graphics();

    // ---- LEGS (drawn first, behind torso) ----
    const legW = 6 * scale, legH = 10 * scale;
    const bootH = 4 * scale, bootW = 7 * scale;
    // Left leg
    body.beginFill(shortsColor);
    body.drawRect(-10 * scale, 2 * scale, legW, legH - 2);
    body.endFill();
    body.beginFill(0xffffff); // sock
    body.drawRect(-10 * scale, 2 * scale + legH - 4, legW, 4 * scale);
    body.endFill();
    body.beginFill(0x111111); // boot
    body.drawRect(-11 * scale, 2 * scale + legH + 1, bootW, bootH);
    body.endFill();
    // Right leg
    body.beginFill(shortsColor);
    body.drawRect(4 * scale, 2 * scale, legW, legH - 2);
    body.endFill();
    body.beginFill(0xffffff);
    body.drawRect(4 * scale, 2 * scale + legH - 4, legW, 4 * scale);
    body.endFill();
    body.beginFill(0x111111);
    body.drawRect(3 * scale, 2 * scale + legH + 1, bootW, bootH);
    body.endFill();

    // ---- ARMS ----
    body.beginFill(cfg.skin);
    // Left arm
    body.drawRect(-15 * scale, -10 * scale, 5 * scale, 12 * scale);
    // Right arm
    body.drawRect(10 * scale, -10 * scale, 5 * scale, 12 * scale);
    body.endFill();

    // ---- TORSO/JERSEY ----
    body.lineStyle(1.5, teamDark, 0.8);
    body.beginFill(shirtColor);
    body.drawRoundedRect(-9 * scale, -14 * scale, 18 * scale, 18 * scale, 3 * scale);
    body.endFill();
    // Jersey stripes
    body.lineStyle(1.5, shirtLight, 0.7);
    body.moveTo(-3 * scale, -13 * scale); body.lineTo(-3 * scale, 3 * scale);
    body.moveTo(3 * scale, -13 * scale); body.lineTo(3 * scale, 3 * scale);
    // Collar
    body.lineStyle(0);
    body.beginFill(shirtLight);
    body.drawRoundedRect(-4 * scale, -14 * scale, 8 * scale, 5 * scale, 2);
    body.endFill();

    // Jersey number
    const numStyle = new window.PIXI.TextStyle({ fill: teamDark, fontSize: Math.round(7 * scale + 2), fontWeight: "900", fontFamily: "Arial Black, sans-serif" });
    const numText = new window.PIXI.Text({ text: cfg.num, style: numStyle });
    numText.anchor.set(0.5);
    numText.y = -5 * scale;
    body.addChild(numText);

    // ---- HEAD ----
    // Neck
    body.beginFill(cfg.skin);
    body.drawRect(-3 * scale, -17 * scale, 6 * scale, 4 * scale);
    body.endFill();
    // Head shape
    body.lineStyle(1.2, 0x8b6347, 0.5);
    body.beginFill(cfg.skin);
    body.drawEllipse(0, -23 * scale, 9 * scale, 8 * scale);
    body.endFill();
    // Ears
    body.lineStyle(0);
    body.beginFill(cfg.skin);
    body.drawCircle(-9 * scale, -23 * scale, 2.5 * scale);
    body.drawCircle(9 * scale, -23 * scale, 2.5 * scale);
    body.endFill();
    // Eyes
    body.beginFill(0x1a1a1a);
    body.drawEllipse(-4 * scale, -23.5 * scale, 2 * scale, 2.5 * scale);
    body.drawEllipse(4 * scale, -23.5 * scale, 2 * scale, 2.5 * scale);
    body.endFill();
    body.beginFill(0xffffff, 0.85);
    body.drawCircle(-3.5 * scale, -24 * scale, 0.9 * scale);
    body.drawCircle(4.5 * scale, -24 * scale, 0.9 * scale);
    body.endFill();
    // Mouth
    body.lineStyle(1.2, 0x7a3a1a, 0.8);
    body.moveTo(-3 * scale, -20.5 * scale);
    body.quadraticCurveTo(0, -19 * scale, 3 * scale, -20.5 * scale);
    // Nose
    body.lineStyle(0);
    body.beginFill(cfg.skin);
    body.drawCircle(0, -21.5 * scale, 1.5 * scale);
    body.endFill();

    // ---- HAIR ----
    body.lineStyle(0);
    if (cfg.hairStyle === "short") {
      body.beginFill(cfg.hair);
      body.drawEllipse(0, -28 * scale, 9 * scale, 5 * scale);
      body.endFill();
    } else if (cfg.hairStyle === "fade") {
      body.beginFill(cfg.hair);
      body.drawEllipse(0, -27 * scale, 9 * scale, 4.5 * scale);
      body.endFill();
      // shaved sides
      body.beginFill(cfg.skin, 0.7);
      body.drawRect(-9 * scale, -27 * scale, 6 * scale, 6 * scale);
      body.drawRect(3 * scale, -27 * scale, 6 * scale, 6 * scale);
      body.endFill();
    } else if (cfg.hairStyle === "mohawk") {
      body.beginFill(cfg.hair);
      body.drawRect(-2 * scale, -34 * scale, 4 * scale, 10 * scale);
      body.endFill();
    } else if (cfg.hairStyle === "slick") {
      body.beginFill(cfg.hair);
      body.drawEllipse(0, -27 * scale, 9 * scale, 5 * scale);
      // slick-back highlight
      body.drawRect(-1.5 * scale, -32 * scale, 3 * scale, 8 * scale);
      body.endFill();
    }

    // Direction indicator (small arrow above head)
    body.beginFill(0xffffff, 0.8);
    body.drawPolygon([0, -36 * scale, -4 * scale, -31 * scale, 4 * scale, -31 * scale]);
    body.endFill();

    g.addChild(body);
    return g;
  }

  function createPlayer({ name, team, x, y, textures, controls, accent, ai }) {
    const container = new window.PIXI.Container();
    container.x = x;
    container.y = y;

    const isGoalie = name.includes("Goalie");
    const r = isGoalie ? 22 : 20; // collision radius
    const drawScale = isGoalie ? 1.5 : 1.3; // visual scale up

    // Shadow
    const shadowG = new window.PIXI.Graphics();
    shadowG.beginFill(0x000000, 0.22);
    shadowG.drawEllipse(3, r + 2, r * 0.9, r * 0.35);
    shadowG.endFill();
    container.addChild(shadowG);

    // Build unique sprite
    const bodyG = buildPlayerSprite(name, team, 14); // always draw at base size=14, scale visually
    bodyG.scale.set(drawScale);
    container.addChild(bodyG);

    // Animated legs container (drawn below body)
    const legsG = new window.PIXI.Graphics();
    legsG.y = 14 * drawScale - 2;
    container.addChildAt(legsG, 1);

    // Name label
    const label = new window.PIXI.Text({
      text: name,
      style: {
        fontFamily: "'Space Grotesk', Arial, sans-serif",
        fontWeight: "700",
        fill: "#ffffff",
        fontSize: 11,
        dropShadow: true,
        dropShadowColor: "#000000",
        dropShadowBlur: 4,
        dropShadowDistance: 1
      }
    });
    label.anchor.set(0.5, 1);
    label.y = -(36 * drawScale + 4);
    label.rotation = 0;
    container.addChild(label);

    root.addChild(container);

    const sprite = bodyG;
    const shadow = shadowG;
    const baseScale = drawScale;
    const shadowScale = drawScale;

    return {
      name,
      team,
      controls,
      ai,
      textures: [window.PIXI.Texture.WHITE],
      frameIndex: 0,
      frameMs: 0,
      container,
      sprite,
      shadow,
      legsG,
      label,
      x,
      y,
      vx: 0,
      vy: 0,
      rotation: 0,
      speed: 188,
      radius: isGoalie ? 22 : 20,
      moveAmount: 0,
      baseScale,
      shadowScale,
      powerGiantTime: 0,
      powerSpeedTime: 0,
      powerSuperTime: 0,
      powerFreezeTime: 0,
      powerMagnetTime: 0,
      kickTime: 0
    };
  }

  function animatePlayer(player, now, dtSeconds) {
    const spd = Math.hypot(player.vx, player.vy);
    const isMoving = spd > 40;
    const isSprinting = spd > 400;
    const isKicking = player.kickTime > 0;
    player.kickTime = Math.max(0, player.kickTime - dtSeconds);

    // Run cycle: faster cycle when sprinting
    const cycleSpeed = isSprinting ? 140 : 200;
    const cycle = isMoving ? now / cycleSpeed : 0;
    const swing = isMoving ? Math.sin(cycle) : 0; // -1 to 1

    // Body bob
    const bobY = isMoving ? Math.abs(swing) * -2 : 0;
    player.sprite.y = bobY;

    const isGoalie = player.name.includes("Goalie");
    const drawScale = isGoalie ? 1.5 : 1.3;
    const sc = drawScale; // shorthand
    const teamDark = player.team === "blue" ? 0x1d4ed8 : 0xb45309;
    const shirtColor = player.team === "blue" ? 0x3b82f6 : 0xf59e0b;
    const shortsColor = player.team === "blue" ? 0x1e3a8a : 0x7c2d12;
    const cfg = {
      skin: playerConfigs[player.name] ? playerConfigs[player.name].skin : 0xffe0bd
    };

    const lg = player.legsG;
    lg.clear();

    if (isKicking) {
      // === KICK ANIMATION ===
      // Left (plant) leg
      const plantShift = 4 * sc;
      lg.beginFill(shortsColor);
      lg.drawRect(-10 * sc, 0, 6 * sc, 8 * sc);
      lg.endFill();
      lg.beginFill(0xffffff);
      lg.drawRect(-10 * sc, 8 * sc, 6 * sc, 4 * sc);
      lg.endFill();
      lg.beginFill(0x111111);
      lg.drawRect(-11 * sc, 12 * sc, 8 * sc, 4 * sc);
      lg.endFill();

      // Right (kicking) leg: fully extended
      const kickProgress = 1 - (player.kickTime / 0.3); // 0 = just kicked, 1 = done
      const kickExt = 14 * sc * Math.sin(kickProgress * Math.PI); // parabolic extension
      lg.beginFill(shortsColor);
      lg.drawRect(4 * sc, -2 * sc, 6 * sc, 8 * sc);
      lg.endFill();
      lg.beginFill(0xffffff);
      lg.drawRect(4 * sc + kickExt * 0.4, 7 * sc, 6 * sc, 4 * sc);
      lg.endFill();
      lg.beginFill(0x111111);
      lg.drawRect(3 * sc + kickExt * 0.7, 11 * sc, 9 * sc, 4 * sc);
      lg.endFill();

      // Arm swing during kick
      lg.beginFill(cfg.skin);
      lg.drawRect(-16 * sc, -8 * sc - 6 * sc * kickProgress, 5 * sc, 12 * sc); // left arm up
      lg.drawRect(11 * sc, -8 * sc + 4 * sc * kickProgress, 5 * sc, 12 * sc);
      lg.endFill();
    } else if (isMoving) {
      // === RUN ANIMATION ===
      const maxSwing = isSprinting ? 10 * sc : 7 * sc;
      const leftSwingY = swing * maxSwing;       // left leg
      const rightSwingY = -swing * maxSwing;     // right leg (opposite)

      // LEFT LEG
      lg.beginFill(shortsColor);
      lg.drawRect(-10 * sc, leftSwingY, 6 * sc, 8 * sc);
      lg.endFill();
      lg.beginFill(0xffffff);
      lg.drawRect(-10 * sc, leftSwingY + 8 * sc, 6 * sc, 4 * sc);
      lg.endFill();
      lg.beginFill(0x111111);
      lg.drawRect(-11 * sc, leftSwingY + 12 * sc, 8 * sc, 4 * sc);
      lg.endFill();

      // RIGHT LEG
      lg.beginFill(shortsColor);
      lg.drawRect(4 * sc, rightSwingY, 6 * sc, 8 * sc);
      lg.endFill();
      lg.beginFill(0xffffff);
      lg.drawRect(4 * sc, rightSwingY + 8 * sc, 6 * sc, 4 * sc);
      lg.endFill();
      lg.beginFill(0x111111);
      lg.drawRect(3 * sc, rightSwingY + 12 * sc, 8 * sc, 4 * sc);
      lg.endFill();

      // ARM SWING (opposite to legs)
      const armSwing = -swing * 6 * sc;
      lg.beginFill(cfg.skin);
      lg.drawRect(-16 * sc, -8 * sc + armSwing, 5 * sc, 12 * sc);
      lg.drawRect(11 * sc, -8 * sc - armSwing, 5 * sc, 12 * sc);
      lg.endFill();
    } else {
      // === IDLE ANIMATION — gentle breathing sway ===
      const breathe = Math.sin(now / 800) * 1.5;
      lg.beginFill(cfg.skin);
      lg.drawRect(-16 * sc, -8 * sc + breathe, 5 * sc, 12 * sc);
      lg.drawRect(11 * sc, -8 * sc - breathe, 5 * sc, 12 * sc);
      lg.endFill();
    }

    // Keep label always readable (counter-rotate)
    player.label.rotation = -(player.rotation + Math.PI / 2);
  }

  players.push(
    createPlayer({
      name: "Messi",
      team: "blue",
      x: width * 0.32,
      y: height * 0.5,
      textures: [messiTex],
      controls: { up: "w", down: "s", left: "a", right: "d", boost: "shift" },
      accent: 0x7ec2ff
    }),
    createPlayer({
      name: "Mbappe",
      team: "blue",
      x: width * 0.22,
      y: height * 0.3,
      textures: [mbappeTex],
      controls: { up: "w", down: "s", left: "a", right: "d", boost: "shift" },
      accent: 0x7ec2ff
    }),
    createPlayer({
      name: "Neymar",
      team: "blue",
      x: width * 0.22,
      y: height * 0.7,
      textures: [neymarTex],
      controls: { up: "w", down: "s", left: "a", right: "d", boost: "shift" },
      accent: 0x7ec2ff
    }),
    createPlayer({
      name: "Ronaldo",
      team: "gold",
      x: width * 0.68,
      y: height * 0.5,
      textures: [ronaldoTex],
      ai: "field_gold",
      accent: 0xffd66a
    }),
    createPlayer({
      name: "Haaland",
      team: "gold",
      x: width * 0.78,
      y: height * 0.3,
      textures: [haalandTex],
      ai: "field_gold",
      accent: 0xffd66a
    }),
    createPlayer({
      name: "Pelé",
      team: "gold",
      x: width * 0.78,
      y: height * 0.7,
      textures: [peleTex],
      ai: "field_gold",
      accent: 0xffd66a
    }),
    createPlayer({
      name: "B. Goalie",
      team: "blue",
      x: pitch.left + 25,
      y: height * 0.5,
      textures: [goalieTex],
      ai: "goalie_blue",
      accent: 0x7ec2ff
    }),
    createPlayer({
      name: "G. Goalie",
      team: "gold",
      x: pitch.right - 25,
      y: height * 0.5,
      textures: [goalieTex],
      ai: "goalie_gold",
      accent: 0xffd66a
    })
  );

  const ballShadow = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  ballShadow.anchor.set(0.5);
  ballShadow.width = 24;
  ballShadow.height = 12;
  ballShadow.tint = 0x000000;
  ballShadow.alpha = 0.3;
  fxLayer.addChild(ballShadow);

  const ball = new window.PIXI.Graphics();
  ball.beginFill(0xFFFFFF);
  ball.lineStyle(2, 0x000000);
  ball.drawCircle(0, 0, 14);
  ball.endFill();

  ball.beginFill(0x000000);
  ball.drawCircle(6, 6, 4);
  ball.drawCircle(-6, -6, 4);
  ball.drawCircle(-6, 6, 4);
  ball.drawCircle(6, -6, 4);
  ball.endFill();

  ball.x = width / 2;
  ball.y = height / 2;
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

  const trailPoints = [];
  const ballTrail = new window.PIXI.Graphics();
  fxLayer.addChildAt(ballTrail, 0);

  const particles = [];
  function createParticle(x, y, color) {
    const p = new window.PIXI.Graphics();
    p.beginFill(color);
    p.drawCircle(0, 0, Math.random() * 3 + 2);
    p.endFill();
    p.x = x;
    p.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 250 + 80;
    fxLayer.addChild(p);
    particles.push({ sprite: p, x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0 });
  }

  let shakeTime = 0;
  function resetPositions() {
    const spawn = [
      [width * 0.32, height * 0.5, 0],
      [width * 0.22, height * 0.3, 0],
      [width * 0.22, height * 0.7, 0],
      [width * 0.68, height * 0.5, Math.PI],
      [width * 0.78, height * 0.3, Math.PI],
      [width * 0.78, height * 0.7, Math.PI],
      [pitch.left + 25, height * 0.5, 0],
      [pitch.right - 25, height * 0.5, Math.PI]
    ];

    players.forEach((player, index) => {
      player.x = spawn[index][0];
      player.y = spawn[index][1];
      player.rotation = spawn[index][2];
      player.vx = 0;
      player.vy = 0;
      player.moveAmount = 0;
      player.powerGiantTime = 0;
      player.powerSpeedTime = 0;
      player.powerSuperTime = 0;
      player.powerFreezeTime = 0;
      player.powerMagnetTime = 0;
      player.baseScale = player.textures[0].width > 100 ? (player.name.includes("Goalie") ? 0.35 : 0.12) : 4.35;
      player.shadowScale = player.textures[0].width > 100 ? (player.name.includes("Goalie") ? 0.38 : 0.13) : 4.7;
      player.radius = 18;
    });

    ballState.x = width / 2;
    ballState.y = height / 2;
    ballState.z = 0;
    ballState.vx = 0;
    ballState.vy = 0;
    ballState.vz = 0;

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
    levelEl.textContent = "Player: W A S D + Shift";
    eventEl.textContent = "CPU: Auto";
  }

  function scoreGoal(team) {
    if (state.statusText === "GOAL!") return;

    if (team === "blue") {
      state.blueGoals += 1;
    } else {
      state.goldGoals += 1;
    }
    state.statusText = "GOAL!";
    state.freezeUntil = Date.now() + 2500;
    shakeTime = 0.35;
    for (let i = 0; i < 20; i++) createParticle(ballState.x, ballState.y, team === "blue" ? 0x2f80ff : 0xffd447);
    setNotice(`${team === "blue" ? "Player Team" : "CPU Team"} scored!`, "good");
  }

  function updatePlayer(player, dtMs) {
    let up = false, down = false, left = false, right = false, boost = false;

    if (player.ai) {
      if (state.running && Date.now() >= state.freezeUntil) {
        let tx = ballState.x;
        let ty = ballState.y;

        if (player.ai === "goalie_blue") {
          tx = pitch.left + 28;
          ty = clamp(ballState.y, goalTop + player.radius, goalBottom - player.radius);
        } else if (player.ai === "goalie_gold") {
          tx = pitch.right - 28;
          ty = clamp(ballState.y, goalTop + player.radius, goalBottom - player.radius);
        } else if (player.ai === "field_gold") {
          const ballDist = Math.hypot(ballState.x - player.x, ballState.y - player.y);
          if (ballDist > 150) {
            tx += (player.name === "Haaland" ? 50 : player.name === "Pelé" ? -50 : 0);
            ty += (player.name === "Haaland" ? 80 : player.name === "Pelé" ? -80 : 0);
          }
        }

        const dx = tx - player.x;
        const dy = ty - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15 || player.ai.startsWith("field")) {
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - player.rotation;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          if (angleDiff > 0.15) right = true;
          else if (angleDiff < -0.15) left = true;

          if (Math.abs(angleDiff) < 1.0) up = true;
          else if (Math.abs(angleDiff) > 2.0) down = true;

          if (player.ai === "field_gold" && dist < 180 && Math.abs(angleDiff) < 0.4 && state.goldStamina > 20) {
            boost = true;
          } else if (player.ai.startsWith("goalie") && dist < 80 && Math.abs(angleDiff) < 0.4) {
            boost = true;
          }
        } else {
          let targetAngle = player.ai === "goalie_blue" ? 0 : Math.PI;
          let angleDiff = targetAngle - player.rotation;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          if (angleDiff > 0.1) right = true;
          else if (angleDiff < -0.1) left = true;
        }
      }
    } else {
      up = keysDown.has(player.controls.up);
      down = keysDown.has(player.controls.down);
      left = keysDown.has(player.controls.left);
      right = keysDown.has(player.controls.right);
      boost = keysDown.has(player.controls.boost);
    }

    const dt = dtMs / 1000;
    const speed = Math.hypot(player.vx, player.vy);

    let turnRate = 4.0;
    if (player.powerFreezeTime > 0) {
      turnRate = 0;
      up = false; down = false; left = false; right = false; boost = false;
      player.powerFreezeTime -= dt;
      player.sprite.tint = 0xa5f3fc;
    } else {
      player.sprite.tint = 0xFFFFFF;
    }

    if (left) player.rotation -= turnRate * dt;
    if (right) player.rotation += turnRate * dt;

    if (player.powerGiantTime > 0) {
      player.powerGiantTime -= dt;
      player.container.scale.set(1.55);
      player.radius = 28;
    } else {
      player.powerGiantTime = 0;
      player.container.scale.set(1.0);
      player.radius = player.name.includes("Goalie") ? 20 : 18;
    }
    if (player.powerSpeedTime > 0) player.powerSpeedTime -= dt;
    else player.powerSpeedTime = 0;
    if (player.powerSuperTime > 0) player.powerSuperTime -= dt;
    else player.powerSuperTime = 0;
    if (player.powerMagnetTime > 0) player.powerMagnetTime -= dt;
    else player.powerMagnetTime = 0;

    const staminaKey = player.team === "blue" ? "blueStamina" : "goldStamina";
    let isBoosting = false;
    if (boost && state[staminaKey] > 0) {
      isBoosting = true;
      state[staminaKey] -= (35 / 3) * dt;
    } else if (!boost) {
      state[staminaKey] += (15 / 3) * dt;
    }
    state[staminaKey] = clamp(state[staminaKey], 0, 100);

    const maxSpeedThrust = player.powerSpeedTime > 0 ? 3800 : (isBoosting ? 2600 : 900);

    let thrust = 0;
    if (up) thrust = maxSpeedThrust;
    if (down) thrust = -700;

    const ax = Math.cos(player.rotation) * thrust;
    const ay = Math.sin(player.rotation) * thrust;

    player.vx += ax * dt;
    player.vy += ay * dt;

    const forwardX = Math.cos(player.rotation);
    const forwardY = Math.sin(player.rotation);
    const rightX = -Math.sin(player.rotation);
    const rightY = Math.cos(player.rotation);

    const velForward = player.vx * forwardX + player.vy * forwardY;
    let velSides = player.vx * rightX + player.vy * rightY;

    velSides *= Math.pow(0.8, dtMs / 16.66);
    const newVelForward = velForward * Math.pow(0.96, dtMs / 16.66);

    player.vx = newVelForward * forwardX + velSides * rightX;
    player.vy = newVelForward * forwardY + velSides * rightY;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x < pitch.left + player.radius) { player.x = pitch.left + player.radius; player.vx *= -0.5; }
    if (player.x > pitch.right - player.radius) { player.x = pitch.right - player.radius; player.vx *= -0.5; }
    if (player.y < pitch.top + player.radius) { player.y = pitch.top + player.radius; player.vy *= -0.5; }
    if (player.y > pitch.bottom - player.radius) { player.y = pitch.bottom - player.radius; player.vy *= -0.5; }

    player.moveAmount = speed;

    player.container.x = player.x;
    player.container.y = player.y;
    player.container.rotation = player.rotation + Math.PI / 2;
  }

  function collideBallWithPlayer(player) {
    // If ball is too high in the air, don't collide
    if (ballState.z > 25) return;

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

    const relVx = ballState.vx - player.vx;
    const relVy = ballState.vy - player.vy;

    const relSpeed = relVx * nx + relVy * ny;

    if (relSpeed > 0) return;

    const restitution = 1.2;
    const massBall = 1;
    const massPlayer = 4;

    const j = -(1 + restitution) * relSpeed / (1 / massBall + 1 / massPlayer);

    ballState.vx += (j / massBall) * nx;
    ballState.vy += (j / massBall) * ny;

    player.vx -= (j / massPlayer) * nx;
    player.vy -= (j / massPlayer) * ny;

    const playerSpeed = Math.hypot(player.vx, player.vy);
    const superMult = player.powerSuperTime > 0 ? 3.0 : 1.0;
    if (playerSpeed > 400 * (player.powerSuperTime > 0 ? 0.4 : 1)) {
      ballState.vx += nx * 250 * superMult;
      ballState.vy += ny * 250 * superMult;
      ballState.vz = (playerSpeed * 0.4 + 100) * superMult;
      for (let i = 0; i < 7; i++) createParticle(ballState.x, ballState.y, player.accent);
      shakeTime = player.powerSuperTime > 0 ? 0.25 : 0.05;
    } else if (relSpeed < -200) {
      for (let i = 0; i < 3; i++) createParticle(ballState.x, ballState.y, 0xFFFFFF);
      ballState.vz = Math.min((Math.abs(relSpeed) * 0.3 + 50), 300);
    }

    capBallSpeed(1200);

    ballState.lastTouchTeam = player.team;
    player.kickTime = 0.3; // trigger kick animation
    if (player.team === "blue") {
      state.blueTouches += 1;
    } else {
      state.goldTouches += 1;
    }
  }



  function updateBall(dtMs) {
    const dt = dtMs / 1000;

    const gravity = -900;
    if (ballState.z > 0 || ballState.vz > 0) {
      ballState.vz += gravity * dt;
      ballState.z += ballState.vz * dt;
      if (ballState.z <= 0) {
        ballState.z = 0;
        ballState.vz *= -0.6;
        if (Math.abs(ballState.vz) < 50) ballState.vz = 0;
      }
    }

    if (Date.now() < state.freezeUntil && ballState.z <= 0) {
      return;
    }

    ballState.x += ballState.vx * dt;
    ballState.y += ballState.vy * dt;

    ballState.vx *= Math.pow(0.98, dtMs / 16.66);
    ballState.vy *= Math.pow(0.98, dtMs / 16.66);

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
    state.blueStamina = 100;
    state.goldStamina = 100;
    state.running = true;
    state.endAt = Date.now() + goalDurationMs + 3000; // Add 3s for countdown
    state.freezeUntil = Date.now() + 3000;
    state.statusText = "";

    for (const pup of powerUpsArray) {
      pup.sprite.destroy();
    }
    powerUpsArray.length = 0;

    resetPositions();
    setNotice("Kickoff! Goalies act as AI defenders. You control Blue Team (WASD).");
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

    if (state.running) {
      if (now >= state.freezeUntil) {
        if (Math.random() < 0.003 * (ticker.deltaMS / 16.66)) {
          spawnPowerUp();
        }

        for (let i = powerUpsArray.length - 1; i >= 0; i--) {
          const pup = powerUpsArray[i];
          pup.life -= dtSeconds;
          pup.sprite.rotation += Math.PI * dtSeconds;

          if (pup.life <= 0) {
            powerUpContainer.removeChild(pup.sprite);
            pup.sprite.destroy();
            powerUpsArray.splice(i, 1);
            continue;
          }

          let collectedBy = null;
          for (const player of players) {
            const dx = player.x - pup.x;
            const dy = player.y - pup.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < (player.radius + pup.radius) * (player.radius + pup.radius)) {
              collectedBy = player;
              break;
            }
          }

          if (collectedBy) {
            switch (pup.type) {
              case "giant": collectedBy.powerGiantTime = 7.0; break;
              case "speed": collectedBy.powerSpeedTime = 7.0; break;
              case "stamina": state[collectedBy.team === "blue" ? "blueStamina" : "goldStamina"] = 100; break;
              case "super": collectedBy.powerSuperTime = 7.0; break;
              case "magnet": collectedBy.powerMagnetTime = 7.0; break;
              case "freeze":
                for (let p of players) {
                  if (p.team !== collectedBy.team) p.powerFreezeTime = 3.0;
                }
                break;
            }
            for (let k = 0; k < 12; k++) createParticle(pup.x, pup.y, powerUpColors[pup.type]);
            setNotice(`${collectedBy.name} got ${powerUpLabels[pup.type]}!`, "good");
            powerUpContainer.removeChild(pup.sprite);
            pup.sprite.destroy();
            powerUpsArray.splice(i, 1);
          }
        }
      }

      for (const player of players) {
        updatePlayer(player, ticker.deltaMS);
        animatePlayer(player, now, dtSeconds);
      }

      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const p1 = players[i];
          const p2 = players[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distSq = dx * dx + dy * dy;
          const minDist = p1.radius + p2.radius;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            p1.x -= nx * overlap * 0.5;
            p1.y -= ny * overlap * 0.5;
            p2.x += nx * overlap * 0.5;
            p2.y += ny * overlap * 0.5;

            const relVx = p2.vx - p1.vx;
            const relVy = p2.vy - p1.vy;
            const dot = (relVx * nx + relVy * ny);
            if (dot < 0) {
              p1.vx += nx * dot * 0.6;
              p1.vy += ny * dot * 0.6;
              p2.vx -= nx * dot * 0.6;
              p2.vy -= ny * dot * 0.6;
            }
          }
        }
      }

      for (const player of players) {
        collideBallWithPlayer(player);
        if (player.powerMagnetTime > 0) {
          const mdx = player.x - ballState.x;
          const mdy = player.y - ballState.y;
          const distSq = mdx * mdx + mdy * mdy;
          if (distSq < 200 * 200 && distSq > 0) {
            const dist = Math.sqrt(distSq);
            ballState.vx += (mdx / dist) * 700 * dtSeconds;
            ballState.vy += (mdy / dist) * 700 * dtSeconds;
          }
        }
      }



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
          const cd = Math.ceil(waitMsLeft / 1000);
          bigStatusText.text = cd > 0 ? cd.toString() : "GO!";
          bigStatusText.scale.set(1 + (waitMsLeft % 1000) / 1000 * 0.5);
          bigStatusText.alpha = (waitMsLeft % 1000) / 1000 + 0.2;
        } else {
          bigStatusText.text = "GOAL!";
          bigStatusText.scale.set(2.0 + Math.sin(now / 100) * 0.2);
          bigStatusText.alpha = 1;
        }
      } else {
        if (bigStatusText.text === "1" || bigStatusText.text === "GO!") {
          bigStatusText.text = "GO!";
          bigStatusText.alpha -= dtSeconds * 2;
          if (bigStatusText.alpha <= 0) bigStatusText.text = "";
        } else {
          bigStatusText.text = "";
        }
      }
    }

    const scaleMult = 1 + (ballState.z / 150);
    ball.scale.set(scaleMult);
    ball.x = ballState.x;
    ball.y = ballState.y - ballState.z;
    ballShadow.x = ballState.x;
    ballShadow.y = ballState.y;
    ballShadow.scale.set(1 - (ballState.z / 300));
    ballShadow.alpha = 0.3 * Math.max(0, 1 - (ballState.z / 200));

    ball.rotation += (ballState.vx * 0.0006 + ballState.vy * 0.0006) * ticker.deltaMS;

    if (state.running && now >= state.freezeUntil) {
      trailPoints.unshift({ x: ballState.x, y: ballState.y });
      if (trailPoints.length > 12) trailPoints.pop();

      ballTrail.clear();
      for (let i = 1; i < trailPoints.length; i++) {
        const p1 = trailPoints[i - 1];
        const p2 = trailPoints[i];
        ballTrail.lineStyle(14 * (1 - i / trailPoints.length), 0xFFFFFF, 0.4 * (1 - i / trailPoints.length));
        ballTrail.moveTo(p1.x, p1.y);
        ballTrail.lineTo(p2.x, p2.y);
      }
    } else {
      trailPoints.length = 0;
      ballTrail.clear();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dtSeconds * 1.5;
      if (p.life <= 0) {
        fxLayer.removeChild(p.sprite);
        p.sprite.destroy();
        particles.splice(i, 1);
      } else {
        p.x += p.vx * dtSeconds;
        p.y += p.vy * dtSeconds;
        p.sprite.x = p.x;
        p.sprite.y = p.y;
        p.sprite.alpha = p.life;
      }
    }

    if (shakeTime > 0) {
      shakeTime -= dtSeconds;
      const mag = Math.min(shakeTime * 40, 15);
      app.stage.x = (Math.random() - 0.5) * mag;
      app.stage.y = (Math.random() - 0.5) * mag;
    } else {
      shakeTime = 0;
      app.stage.x = 0;
      app.stage.y = 0;
    }

    if (blueStaminaEl) blueStaminaEl.style.width = `${state.blueStamina}%`;
    if (goldStaminaEl) goldStaminaEl.style.width = `${state.goldStamina}%`;

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
