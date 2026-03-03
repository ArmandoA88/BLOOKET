const socket = io();

let roomCode = "";
let playerName = "";
let phase = "join";
let ticker = null;
let currentQuestion = null;
let myAnswerIndex = null;
let canAnswer = false;
let blookPacks = [];
let selectedPackId = "";
let selectedBlookId = "";
let activeEventName = "Event Card";
let activeActionLabel = "Open";
const MODE_LABELS = {
  classic: "Classic Quiz",
  gold: "Gold Quest",
  crypto: "Crypto Hack",
  fishing: "Fishing Frenzy",
  brawl: "Monster Brawl"
};
const GAME_IMAGE_MAP = {
  question: "/assets/games/question.svg",
  soccer_shootout: "/assets/games/soccer.svg",
  tap_rush: "/assets/games/tap.svg",
  sequence_memory: "/assets/games/sequence.svg",
  precision_stop: "/assets/games/precision.svg"
};
const PHASE_BANNER_COPY = {
  join: {
    title: "Join Screen",
    detail: "Enter game code and nickname."
  },
  lobby: {
    title: "Lobby",
    detail: "Waiting for host to start the game."
  },
  question: {
    title: "Question Live",
    detail: "Answer fast for more points."
  },
  question_result: {
    title: "Answer Reveal",
    detail: "Round score updates are in progress."
  },
  minigame: {
    title: "Mini-Game Running",
    detail: "Complete actions for bonus points."
  },
  round_summary: {
    title: "Round Summary",
    detail: "Leaderboard updated."
  },
  finished: {
    title: "Game Finished",
    detail: "Final rankings are locked."
  },
  kicked: {
    title: "Removed",
    detail: "You were removed from this room."
  },
  ended: {
    title: "Game Ended",
    detail: "The host ended the game."
  }
};
const PHASE_CLASS_CANDIDATES = [
  "phase-join",
  "phase-lobby",
  "phase-question",
  "phase-question-result",
  "phase-minigame",
  "phase-round-summary",
  "phase-finished",
  "phase-kicked",
  "phase-ended"
];

const joinCard = document.getElementById("joinCard");
const playCard = document.getElementById("playCard");

const codeInput = document.getElementById("code");
const nameInput = document.getElementById("name");
const joinBtn = document.getElementById("joinBtn");
const joinNotice = document.getElementById("joinNotice");
const packTabs = document.getElementById("packTabs");
const blookGrid = document.getElementById("blookGrid");
const pickedBlook = document.getElementById("pickedBlook");

const roomCodeEl = document.getElementById("roomCode");
const playerNameEl = document.getElementById("playerName");
const phaseText = document.getElementById("phaseText");
const phaseBanner = document.getElementById("phaseBanner");
const phaseBannerTitle = document.getElementById("phaseBannerTitle");
const phaseBannerDetail = document.getElementById("phaseBannerDetail");
const miniGameActiveFlag = document.getElementById("miniGameActiveFlag");
const playerConnectionPill = document.getElementById("playerConnectionPill");
const mainNotice = document.getElementById("mainNotice");

const questionSection = document.getElementById("questionSection");
const questionIllustration = document.getElementById("questionIllustration");
const timerText = document.getElementById("timerText");
const questionText = document.getElementById("questionText");
const answers = document.getElementById("answers");

const chestSection = document.getElementById("chestSection");
const chestIllustration = document.getElementById("chestIllustration");
const chestTimer = document.getElementById("chestTimer");
const chests = document.getElementById("chests");
const eventTitle = document.getElementById("eventTitle");

const resultSection = document.getElementById("resultSection");
const resultText = document.getElementById("resultText");

const leaderboardBody = document.getElementById("leaderboardBody");
const feedList = document.getElementById("feedList");
const feedTitle = document.getElementById("feedTitle");
const miniGamesList = document.getElementById("miniGamesList");

const MINI_STEP_LABELS = ["Red", "Blue", "Green", "Yellow"];
const SOCCER_LANE_LABELS = ["Left", "Center", "Right"];
const SOCCER_LANE_POSITIONS = ["22%", "50%", "78%"];
const SOCCER_STAR_PLAYERS = [
  {
    id: "messi",
    name: "Messi",
    title: "Dribble Wizard",
    image: "/assets/players/messi.svg"
  },
  {
    id: "ronaldo",
    name: "Cristiano",
    title: "Power Rocket",
    image: "/assets/players/ronaldo.svg"
  },
  {
    id: "kylian",
    name: "Kylian",
    title: "Speed Flash",
    image: "/assets/players/mbappe.svg"
  }
];
const SOCCER_COMMENTARY = {
  goal: [
    "GOOOAL! {player} sends the keeper to another ZIP code.",
    "{player} scores and the crowd goes wild.",
    "{player} buries it. Net is still shaking."
  ],
  saved: [
    "Huge save by the keeper. {player} wants that one back.",
    "Denied. The keeper read {player} like a book.",
    "{player} is smiling, but that save was serious."
  ],
  miss: [
    "{player} sends it wide. A fan just got a souvenir ball.",
    "Missed target. That ball is heading to the parking lot.",
    "Overcooked shot. Even the mascot ducked."
  ]
};

let activeMiniGameType = "";
let miniPrecisionValue = 0;
let miniPrecisionDirection = 1;
let miniPrecisionTicker = null;
let reconnecting = false;
let reconnectJoinPending = false;
let reconnectRetryCount = 0;
let selectedSoccerStarId = SOCCER_STAR_PLAYERS[0].id;
let miniSoccerSavedCount = 0;
let miniSoccerMissCount = 0;
let miniSoccerHypeCount = 0;

const FALLBACK_BLOOKS = [
  {
    id: "sports",
    name: "Sports Pack",
    description: "Athletes and game-day icons.",
    blooks: [
      { id: "sports-soccer-star", name: "Soccer Star", icon: "⚽", rarity: "Common" },
      { id: "sports-basketball-pro", name: "Basketball Pro", icon: "🏀", rarity: "Common" },
      { id: "sports-football-captain", name: "Football Captain", icon: "🏈", rarity: "Rare" },
      { id: "sports-gold-medalist", name: "Gold Medalist", icon: "🥇", rarity: "Legendary" }
    ]
  },
  {
    id: "anime",
    name: "Anime Pack",
    description: "Stylized heroes and rivals.",
    blooks: [
      { id: "anime-shonen-hero", name: "Shonen Hero", icon: "🗡️", rarity: "Common" },
      { id: "anime-mecha-pilot", name: "Mecha Pilot", icon: "🤖", rarity: "Common" },
      { id: "anime-shadow-rival", name: "Shadow Rival", icon: "🌘", rarity: "Rare" },
      { id: "anime-cosmic-sentinel", name: "Cosmic Sentinel", icon: "✨", rarity: "Legendary" }
    ]
  }
];

const FALLBACK_MINI_GAMES = [
  { id: "soccer_shootout", name: "Soccer Shootout", description: "Penalty kicks with lane + power choice." },
  { id: "tap_rush", name: "Tap Rush", description: "Tap fast for bonus points." },
  { id: "sequence_memory", name: "Sequence Memory", description: "Repeat the color order to score." },
  { id: "precision_stop", name: "Precision Stop", description: "Stop the marker near the target zone." }
];

const prefilledCode = new URLSearchParams(window.location.search).get("code");
if (prefilledCode) {
  codeInput.value = String(prefilledCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function phaseLabel(value) {
  return String(value || "lobby")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function phaseClassName(value) {
  const slug = String(value || "lobby")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `phase-${slug || "lobby"}`;
}

function setConnectionPill(label, tone = "") {
  if (!playerConnectionPill) {
    return;
  }

  playerConnectionPill.classList.remove("ok", "warn");
  if (tone) {
    playerConnectionPill.classList.add(tone);
  }
  playerConnectionPill.textContent = label;
}

function setPhaseBanner(nextPhase, detailOverride = "") {
  if (!phaseBanner) {
    return;
  }

  const phaseValue = String(nextPhase || "lobby");
  const copy = PHASE_BANNER_COPY[phaseValue] || {
    title: phaseLabel(phaseValue),
    detail: "Game status updated."
  };

  if (phaseBannerTitle) {
    phaseBannerTitle.textContent = copy.title;
  }
  if (phaseBannerDetail) {
    phaseBannerDetail.textContent = detailOverride || copy.detail;
  }

  phaseBanner.classList.remove(...PHASE_CLASS_CANDIDATES);
  phaseBanner.classList.add(phaseClassName(phaseValue));

  if (miniGameActiveFlag) {
    miniGameActiveFlag.classList.toggle("hidden", phaseValue !== "minigame");
  }
}

function setNotice(message, type = "") {
  mainNotice.classList.remove("good", "bad");
  if (type) {
    mainNotice.classList.add(type);
  }
  mainNotice.textContent = message;
}

function setJoinNotice(message, type = "") {
  joinNotice.classList.remove("hidden", "good", "bad");
  if (type) {
    joinNotice.classList.add(type);
  }
  joinNotice.textContent = message;
}

function setPhase(nextPhase, detail = "") {
  phase = nextPhase;
  phaseText.textContent = phaseLabel(nextPhase);
  setPhaseBanner(nextPhase, detail);
}

function startTicker(targetEl, endsAt, label) {
  if (ticker) {
    clearInterval(ticker);
  }

  const update = () => {
    const leftMs = Math.max(0, endsAt - Date.now());
    targetEl.textContent = `${label}: ${(leftMs / 1000).toFixed(1)}s`;

    if (leftMs <= 0 && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };

  update();
  ticker = setInterval(update, 120);
}

function showSection(section) {
  questionSection.classList.add("hidden");
  chestSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  section?.classList.remove("hidden");
}

function stopMiniPrecisionTicker() {
  if (miniPrecisionTicker) {
    clearInterval(miniPrecisionTicker);
    miniPrecisionTicker = null;
  }
}

function miniGameTypeLabel(type) {
  if (type === "soccer_shootout") return "Soccer Shootout";
  if (type === "tap_rush") return "Tap Rush";
  if (type === "sequence_memory") return "Sequence Memory";
  if (type === "precision_stop") return "Precision Stop";
  return "Mini-game";
}

function setGameIllustration(element, type, altText) {
  if (!element) {
    return;
  }

  const src = GAME_IMAGE_MAP[type] || GAME_IMAGE_MAP.question;
  element.src = src;
  element.alt = altText;
  element.classList.remove("hidden");
}

function soccerStarById(starId) {
  return SOCCER_STAR_PLAYERS.find((player) => player.id === starId) || SOCCER_STAR_PLAYERS[0];
}

function randomSoccerStarId() {
  return SOCCER_STAR_PLAYERS[Math.floor(Math.random() * SOCCER_STAR_PLAYERS.length)].id;
}

function randomSoccerStar() {
  return soccerStarById(randomSoccerStarId());
}

function soccerLanePosition(lane) {
  return SOCCER_LANE_POSITIONS[lane] || "50%";
}

function soccerCommentary(outcome, playerName) {
  const key = outcome === "goal" ? "goal" : outcome === "saved" ? "saved" : "miss";
  const lines = SOCCER_COMMENTARY[key] || SOCCER_COMMENTARY.goal;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace("{player}", playerName);
}

function updateSoccerHud(goals, shots) {
  const goalsChip = document.getElementById("miniSoccerChipGoals");
  const savesChip = document.getElementById("miniSoccerChipSaves");
  const hypeChip = document.getElementById("miniSoccerChipHype");
  const shotsChip = document.getElementById("miniSoccerChipShots");

  if (goalsChip) goalsChip.textContent = String(goals || 0);
  if (savesChip) savesChip.textContent = String(miniSoccerSavedCount + miniSoccerMissCount);
  if (hypeChip) hypeChip.textContent = String(miniSoccerHypeCount);
  if (shotsChip) shotsChip.textContent = String(shots || 0);
}

function burstSoccerConfetti() {
  const container = document.getElementById("soccerConfetti");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  for (let i = 0; i < 16; i += 1) {
    const piece = document.createElement("span");
    piece.style.setProperty("--tx", `${Math.round((Math.random() - 0.5) * 250)}px`);
    piece.style.setProperty("--ty", `${Math.round(-95 - Math.random() * 90)}px`);
    piece.style.setProperty("--rz", `${Math.round(Math.random() * 540)}deg`);
    piece.style.setProperty("--delay", `${Math.round(Math.random() * 120)}ms`);
    piece.style.background = ["#ffd447", "#34d7c6", "#ff6e63", "#9fd3ff"][Math.floor(Math.random() * 4)];
    container.appendChild(piece);
  }

  setTimeout(() => {
    if (container) {
      container.innerHTML = "";
    }
  }, 1100);
}

function setSoccerStarSelection(starId) {
  const star = soccerStarById(starId);
  selectedSoccerStarId = star.id;

  const strikerImage = document.getElementById("soccerStrikerImage");
  const strikerName = document.getElementById("soccerStrikerName");
  if (strikerImage) {
    strikerImage.src = star.image;
    strikerImage.alt = `${star.name} striker card`;
  }
  if (strikerName) {
    strikerName.textContent = `${star.name} - ${star.title}`;
  }

  document.querySelectorAll("button[data-soccer-star]").forEach((button) => {
    button.classList.toggle("selected", button.getAttribute("data-soccer-star") === star.id);
  });
}

function animateSoccerShot(lastShot) {
  const ball = document.getElementById("soccerBall");
  const goalie = document.getElementById("soccerGoalie");
  const stage = document.getElementById("soccerGoalFrame");
  const strikerImage = document.getElementById("soccerStrikerImage");
  if (!ball || !goalie || !lastShot) {
    return;
  }

  const lane = Number(lastShot.lane);
  const goalieLane = Number(lastShot.goalieLane);
  goalie.style.left = soccerLanePosition(goalieLane);

  ball.style.setProperty("--shot-x", soccerLanePosition(lane));
  ball.classList.remove("shoot-goal", "shoot-saved", "shoot-miss");
  void ball.offsetWidth;
  if (stage) {
    stage.classList.remove("goal-flash", "save-flash", "miss-flash");
  }
  if (strikerImage) {
    strikerImage.classList.remove("powered", "frustrated");
    void strikerImage.offsetWidth;
  }

  if (lastShot.outcome === "goal") {
    ball.classList.add("shoot-goal");
    stage?.classList.add("goal-flash");
    strikerImage?.classList.add("powered");
    burstSoccerConfetti();
  } else if (lastShot.outcome === "saved") {
    ball.classList.add("shoot-saved");
    stage?.classList.add("save-flash");
    strikerImage?.classList.add("frustrated");
  } else {
    ball.classList.add("shoot-miss");
    stage?.classList.add("miss-flash");
    strikerImage?.classList.add("frustrated");
  }
}

function renderMiniGame(type, data, actionLabel) {
  stopMiniPrecisionTicker();
  activeMiniGameType = type;

  if (type === "soccer_shootout") {
    const totalShots = Number(data?.totalShots ?? 5);
    const startingStar = soccerStarById(randomSoccerStarId());
    const runnerA = randomSoccerStar();
    const runnerB = randomSoccerStar();
    const runnerC = randomSoccerStar();
    miniSoccerSavedCount = 0;
    miniSoccerMissCount = 0;
    miniSoccerHypeCount = 0;
    chests.innerHTML = `
      <div class="chest soccer-chest">
        <h4>Soccer Shootout</h4>
        <p class="help">Fussball mode: pick a star, shoot penalties, and farm crowd hype in ${totalShots} shots.</p>
        <div class="soccer-stage">
          <div class="soccer-crowd">Stadium noise: OLE OLE OLE</div>
          <div id="soccerGoalFrame" class="soccer-goal-frame">
            <img class="soccer-field-bg" src="/assets/games/fussball-field.svg" alt="Fussball field" />
            <div class="fussball-runners">
              <img class="fussball-runner runner-a" src="${escapeHtml(runnerA.image)}" alt="${escapeHtml(runnerA.name)} runner" />
              <img class="fussball-runner runner-b" src="${escapeHtml(runnerB.image)}" alt="${escapeHtml(runnerB.name)} runner" />
              <img class="fussball-runner runner-c" src="${escapeHtml(runnerC.image)}" alt="${escapeHtml(runnerC.name)} runner" />
            </div>
            <div class="soccer-lane-mark left"></div>
            <div class="soccer-lane-mark center"></div>
            <div class="soccer-lane-mark right"></div>
            <img id="soccerGoalie" class="soccer-goalie" src="/assets/players/goalie-bot.svg" alt="Goalkeeper" />
            <div id="soccerBall" class="soccer-ball"></div>
            <div id="soccerConfetti" class="soccer-confetti"></div>
          </div>
          <div class="soccer-striker-row">
            <img id="soccerStrikerImage" class="soccer-striker" src="${escapeHtml(startingStar.image)}" alt="${escapeHtml(
      startingStar.name
    )} striker card" />
            <div class="help">Striker: <span id="soccerStrikerName">${escapeHtml(startingStar.name)} - ${escapeHtml(
      startingStar.title
    )}</span></div>
          </div>
        </div>
        <div class="soccer-stars">
          ${SOCCER_STAR_PLAYERS.map(
            (star) => `
            <button type="button" class="soccer-star-card ${star.id === startingStar.id ? "selected" : ""}" data-soccer-star="${escapeHtml(
              star.id
            )}">
              <img src="${escapeHtml(star.image)}" alt="${escapeHtml(star.name)} card" />
              <span>${escapeHtml(star.name)}</span>
            </button>`
          ).join("")}
        </div>
        <div class="fussball-hud">
          <div class="fussball-chip blue"><span>Hero Goals</span><strong id="miniSoccerChipGoals">0</strong></div>
          <div class="fussball-chip red"><span>Keeper Stops</span><strong id="miniSoccerChipSaves">0</strong></div>
          <div class="fussball-chip green"><span>Crowd Hype</span><strong id="miniSoccerChipHype">0</strong></div>
          <div class="fussball-chip amber"><span>Shots</span><strong id="miniSoccerChipShots">0</strong></div>
        </div>
        <div class="notice">Goals: <span id="miniSoccerGoals">0</span> | Shots: <span id="miniSoccerShots">0</span>/${totalShots}</div>
        <div style="margin-top:8px;">
          <label for="miniSoccerPower">Power</label>
          <input id="miniSoccerPower" type="range" min="1" max="3" value="2" />
          <div class="help">1 = safe, 3 = power strike</div>
        </div>
        <div class="answers">
          <button class="answer" data-mini-action="shoot" data-mini-lane="0">${escapeHtml(actionLabel || "Shoot")} Left</button>
          <button class="answer" data-mini-action="shoot" data-mini-lane="1">${escapeHtml(actionLabel || "Shoot")} Center</button>
          <button class="answer" data-mini-action="shoot" data-mini-lane="2">${escapeHtml(actionLabel || "Shoot")} Right</button>
        </div>
        <div id="miniSoccerLast" class="help" style="margin-top: 8px;">${escapeHtml(
          startingStar.name
        )} enters fussball mode. Take your first shot.</div>
      </div>`;
    setSoccerStarSelection(startingStar.id);
    updateSoccerHud(0, 0);
    return;
  }

  if (type === "tap_rush") {
    chests.innerHTML = `
      <div class="chest">
        <h4>Tap As Fast As You Can</h4>
        <p class="help">Each tap sends a hit to the server.</p>
        <div class="notice">Taps: <span id="miniTapCount">0</span></div>
        <button data-mini-action="tap">${escapeHtml(actionLabel || "Tap")}</button>
      </div>`;
    return;
  }

  if (type === "sequence_memory") {
    const sequence = Array.isArray(data?.sequence) ? data.sequence : [];
    const sequenceText = sequence.map((step) => MINI_STEP_LABELS[step] || "?").join(" -> ");
    chests.innerHTML = `
      <div class="chest">
        <h4>Follow The Sequence</h4>
        <p class="help">Sequence: ${escapeHtml(sequenceText)}</p>
        <div class="notice">Progress: <span id="miniSequenceProgress">0</span> / ${sequence.length}</div>
        <div class="answers">
          <button class="answer" data-mini-action="step" data-mini-value="0">Red</button>
          <button class="answer" data-mini-action="step" data-mini-value="1">Blue</button>
          <button class="answer" data-mini-action="step" data-mini-value="2">Green</button>
          <button class="answer" data-mini-action="step" data-mini-value="3">Yellow</button>
        </div>
      </div>`;
    return;
  }

  if (type === "precision_stop") {
    miniPrecisionValue = 0;
    miniPrecisionDirection = 1;
    const target = Number(data?.target ?? 50);

    chests.innerHTML = `
      <div class="chest">
        <h4>Stop Near Target</h4>
        <p class="help">Target zone: ${target}</p>
        <div style="position: relative; width: 100%; height: 18px; border-radius: 999px; background: rgba(255,255,255,0.1); border: 1px solid rgba(151,193,255,0.35); overflow: hidden;">
          <div id="miniPrecisionTarget" style="position:absolute; left:${target}%; top:0; bottom:0; width:4px; transform: translateX(-50%); background:#ffd447;"></div>
          <div id="miniPrecisionMarker" style="position:absolute; left:0%; top:0; bottom:0; width:10px; transform: translateX(-50%); background:#34d7c6;"></div>
        </div>
        <div class="notice" style="margin-top:8px;">Current: <span id="miniPrecisionValue">0</span></div>
        <button data-mini-action="stop">${escapeHtml(actionLabel || "Stop")}</button>
      </div>`;

    miniPrecisionTicker = setInterval(() => {
      miniPrecisionValue += miniPrecisionDirection * 2.4;
      if (miniPrecisionValue >= 100) {
        miniPrecisionValue = 100;
        miniPrecisionDirection = -1;
      } else if (miniPrecisionValue <= 0) {
        miniPrecisionValue = 0;
        miniPrecisionDirection = 1;
      }

      const marker = document.getElementById("miniPrecisionMarker");
      const valueEl = document.getElementById("miniPrecisionValue");
      if (marker) {
        marker.style.left = `${miniPrecisionValue}%`;
      }
      if (valueEl) {
        valueEl.textContent = String(Math.round(miniPrecisionValue));
      }
    }, 60);
  }
}

function renderLeaderboard(players) {
  if (!Array.isArray(players) || players.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="help">No players yet.</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = players
    .map((player) => {
      const isYou = player.id === socket.id;
      return `
      <tr>
        <td>${player.rank}</td>
        <td>
          <span class="blook-name-stack">
            <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
            <span class="player-label">${escapeHtml(player.name)}</span>
            ${isYou ? `<span class="player-tag">You</span>` : ""}
          </span>
        </td>
        <td>${player.score}</td>
        <td>${player.streak}</td>
      </tr>`;
    })
    .join("");
}

function getPackById(packId) {
  return blookPacks.find((pack) => pack.id === packId) || null;
}

function getSelectedBlook() {
  const pack = getPackById(selectedPackId);
  if (!pack) {
    return null;
  }

  return pack.blooks.find((blook) => blook.id === selectedBlookId) || null;
}

function setSelectedBlook(packId, blookId) {
  selectedPackId = packId;
  selectedBlookId = blookId;
  renderPackTabs();
  renderBlookGrid();

  const selected = getSelectedBlook();
  if (!selected) {
    pickedBlook.textContent = "Pick a blook before joining.";
    return;
  }

  const selectedPack = getPackById(selectedPackId);
  pickedBlook.textContent = `Selected: ${selected.icon} ${selected.name} (${selectedPack?.name || "Pack"})`;
}

function renderPackTabs() {
  if (!Array.isArray(blookPacks) || blookPacks.length === 0) {
    packTabs.innerHTML = `<span class="help">No packs loaded.</span>`;
    return;
  }

  packTabs.innerHTML = blookPacks
    .map((pack) => {
      const selectedClass = pack.id === selectedPackId ? "pack-tab selected" : "pack-tab";
      return `<button type="button" class="${selectedClass}" data-pack-id="${pack.id}">${escapeHtml(pack.name)}</button>`;
    })
    .join("");
}

function renderBlookGrid() {
  const pack = getPackById(selectedPackId);
  if (!pack) {
    blookGrid.innerHTML = `<span class="help">Select a pack.</span>`;
    return;
  }

  blookGrid.innerHTML = pack.blooks
    .map((blook) => {
      const selectedClass = blook.id === selectedBlookId ? "blook-tile selected" : "blook-tile";
      return `
      <button type="button" class="${selectedClass}" data-blook-id="${blook.id}">
        <span class="blook-emoji">${escapeHtml(blook.icon)}</span>
        <span class="blook-name">${escapeHtml(blook.name)}</span>
        <span class="blook-rarity">${escapeHtml(blook.rarity || "Common")}</span>
      </button>`;
    })
    .join("");
}

function renderMiniGameCatalog(games) {
  if (!miniGamesList) {
    return;
  }

  if (!Array.isArray(games) || games.length === 0) {
    miniGamesList.innerHTML = `<div class="help">No mini-games loaded.</div>`;
    return;
  }

  miniGamesList.innerHTML = games
    .map(
      (game, index) =>
        `<div class="feed-item"><strong>${index + 1}. ${escapeHtml(game.name)}</strong><div class="help">${escapeHtml(
          game.description || ""
        )}</div></div>`
    )
    .join("");
}

async function loadMiniGames() {
  try {
    const response = await fetch("/api/minigames");
    if (!response.ok) {
      throw new Error("Mini-games API failed");
    }

    const payload = await response.json();
    renderMiniGameCatalog(payload?.games);
  } catch (_error) {
    renderMiniGameCatalog(FALLBACK_MINI_GAMES);
  }
}

async function loadBlooks() {
  try {
    const response = await fetch("/api/blooks");
    if (!response.ok) {
      throw new Error("API request failed");
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.packs) || payload.packs.length === 0) {
      throw new Error("No packs in response");
    }

    blookPacks = payload.packs;
  } catch (_error) {
    blookPacks = FALLBACK_BLOOKS;
    setJoinNotice("Could not load online packs. Using fallback packs.", "bad");
  }

  selectedPackId = blookPacks[0].id;
  selectedBlookId = blookPacks[0].blooks[0].id;
  setSelectedBlook(selectedPackId, selectedBlookId);
}

function lockAnswerButtons() {
  answers.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

function renderQuestion(payload) {
  stopMiniPrecisionTicker();
  currentQuestion = payload.question;
  myAnswerIndex = null;
  canAnswer = true;

  showSection(questionSection);
  setGameIllustration(questionIllustration, "question", "Question round");
  if (chestIllustration) {
    chestIllustration.classList.add("hidden");
  }
  questionText.textContent = payload.question.prompt;

  answers.innerHTML = payload.question.options
    .map(
      (option, index) =>
        `<button class="answer" data-answer="${index}"><strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(option)}</button>`
    )
    .join("");

  startTicker(timerText, payload.endsAt, "Time left");
}

function attemptAutoRejoin() {
  if (!roomCode || !playerName || reconnectJoinPending) {
    return;
  }

  reconnectJoinPending = true;
  socket.emit("player:join", { code: roomCode, name: playerName, blookId: selectedBlookId }, (res) => {
    reconnectJoinPending = false;
    if (!res?.ok) {
      const message = res?.message || "Reconnect failed.";
      if (/taken/i.test(message) && reconnectRetryCount < 2) {
        reconnectRetryCount += 1;
        setNotice("Reconnecting to room...", "bad");
        setTimeout(() => {
          attemptAutoRejoin();
        }, 450);
        return;
      }

      reconnecting = false;
      setNotice(`${message} Rejoin from the join screen if needed.`, "bad");
      setPhaseBanner(phase, "Reconnect failed. Rejoin if sync does not recover.");
      return;
    }

    reconnecting = false;
    reconnectRetryCount = 0;
    const activeBlook = res.blook || { icon: "?", name: "Random Blook" };
    playerNameEl.textContent = `${activeBlook.icon || "?"} ${playerName}`;
    setPhase(res.phase || phase || "lobby", "Reconnected. Syncing live state...");
    setNotice("Reconnected to room.", "good");
  });
}

joinBtn.addEventListener("click", () => {
  const code = codeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();

  if (!code || !name) {
    setJoinNotice("Game code and nickname are required.", "bad");
    return;
  }

  socket.emit("player:join", { code, name, blookId: selectedBlookId }, (res) => {
    if (!res?.ok) {
      setJoinNotice(res?.message || "Unable to join room.", "bad");
      return;
    }

    roomCode = res.code;
    playerName = name;
    const activeBlook = res.blook || { icon: "?", name: "Random Blook" };

    roomCodeEl.textContent = roomCode;
    playerNameEl.textContent = `${activeBlook.icon || "?"} ${playerName}`;

    joinCard.classList.add("hidden");
    playCard.classList.remove("hidden");

    const joinedPhase = res.phase || "lobby";
    const phaseDetail =
      joinedPhase === "lobby" ? "Joined lobby. Waiting for host to start." : "Joined in progress. Syncing live phase now.";
    setPhase(joinedPhase, phaseDetail);
    setJoinNotice(`Locked blook: ${activeBlook.icon || "?"} ${activeBlook.name || "Blook"}.`, "good");
    if (joinedPhase === "lobby") {
      setNotice(`Joined room ${roomCode}. Waiting for host to start.`, "good");
    } else {
      setNotice(`Joined room ${roomCode} in progress. Syncing to current phase...`, "good");
    }
  });
});

packTabs.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button[data-pack-id]");
  if (!button) {
    return;
  }

  const packId = button.dataset.packId;
  if (!packId) {
    return;
  }

  const pack = getPackById(packId);
  if (!pack || !Array.isArray(pack.blooks) || pack.blooks.length === 0) {
    return;
  }

  setSelectedBlook(pack.id, pack.blooks[0].id);
});

blookGrid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button[data-blook-id]");
  if (!button) {
    return;
  }

  const blookId = button.dataset.blookId;
  if (!blookId) {
    return;
  }

  setSelectedBlook(selectedPackId, blookId);
});

answers.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button[data-answer]");
  if (!button || !canAnswer || !roomCode) {
    return;
  }

  const answerIndex = Number(button.dataset.answer);
  canAnswer = false;
  myAnswerIndex = answerIndex;

  socket.emit("player:answer", { code: roomCode, answerIndex }, (res) => {
    if (!res?.ok) {
      canAnswer = true;
      setNotice(res?.message || "Answer rejected.", "bad");
      return;
    }

    setNotice(`Answer locked. ${res.correct ? "Correct" : "Submitted"} (+${res.delta})`, res.correct ? "good" : "");
    lockAnswerButtons();
  });
});

chests.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const starButton = target.closest("button[data-soccer-star]");
  if (starButton) {
    const starId = starButton.getAttribute("data-soccer-star");
    if (starId) {
      setSoccerStarSelection(starId);
    }
    return;
  }

  const button = target.closest("button[data-mini-action]");
  if (!button || !roomCode) {
    return;
  }

  const action = button.dataset.miniAction;
  if (!action) {
    return;
  }

  const payload = { code: roomCode, action };
  if (action === "shoot") {
    const lane = Number(button.dataset.miniLane);
    const powerInput = document.getElementById("miniSoccerPower");
    const power = Number(powerInput?.value || 2);
    payload.value = { lane, power, starId: selectedSoccerStarId };
  }
  if (action === "step") {
    payload.value = Number(button.dataset.miniValue);
  }
  if (action === "stop") {
    payload.value = Math.round(miniPrecisionValue);
    button.disabled = true;
  }

  socket.emit("player:minigameAction", payload, (res) => {
    if (!res?.ok) {
      setNotice(res?.message || "Event choice failed.", "bad");
      if (action === "stop") {
        button.disabled = false;
      }
    }
  });
});

socket.on("lobby:update", (payload) => {
  if (payload.code !== roomCode) {
    return;
  }

  setPhase("lobby", `${payload.players.length} students connected. Waiting for host.`);
  showSection(null);
  renderLeaderboard(payload.players);
  const modeText = payload.modeName || MODE_LABELS[payload.mode] || payload.mode || "Classic Quiz";
  const quizSetText = payload.questionSetLabel || payload.questionSet || "Quiz";
  feedTitle.textContent = payload.feedTitle || "Mode Feed";
  activeEventName = payload.eventName || "Event Card";
  setNotice(`Lobby active. Host: ${payload.hostName}. Mode: ${modeText}. Quiz: ${quizSetText}.`);
});

socket.on("players:update", ({ players }) => {
  renderLeaderboard(players);
});

socket.on("question:start", (payload) => {
  setPhase("question", `Question ${payload.questionIndex}/${payload.totalQuestions} is live.`);
  renderQuestion(payload);
  setNotice(`Question ${payload.questionIndex} of ${payload.totalQuestions}. Answer quickly for bonuses.`);
});

socket.on("player:locked", ({ leaderboard }) => {
  renderLeaderboard(leaderboard);
  if (phase === "question") {
    setNotice("Answer saved. Waiting for others...");
  }
});

socket.on("question:result", (payload) => {
  setPhase("question_result", "Answer revealed. Score update in progress.");
  canAnswer = false;
  lockAnswerButtons();

  answers.querySelectorAll("button").forEach((button, index) => {
    button.classList.remove("correct", "wrong");
    if (index === payload.correctAnswer) {
      button.classList.add("correct");
    }
    if (myAnswerIndex === index && index !== payload.correctAnswer) {
      button.classList.add("wrong");
    }
  });

  const mine = payload.submissions.find((entry) => entry.playerId === socket.id);
  const explanation = payload.explanation ? ` ${payload.explanation}` : "";

  if (!mine) {
    setNotice(`Time up. You did not submit an answer.${explanation}`, "bad");
  } else {
    setNotice(
      `${mine.correct ? "Correct" : "Incorrect"}. ${mine.correct ? `+${mine.delta} points.` : "No points."}${explanation}`,
      mine.correct ? "good" : "bad"
    );
  }

  renderLeaderboard(payload.leaderboard);
});

socket.on("minigame:start", ({ eligiblePlayerIds, eventName, feedTitle: nextFeedTitle, type }) => {
  setPhase("minigame", `${eventName || miniGameTypeLabel(type)} is running.`);
  activeMiniGameType = type || "";
  activeEventName = eventName || "Mini-game";
  if (nextFeedTitle) {
    feedTitle.textContent = nextFeedTitle;
  }
  const isEligible = eligiblePlayerIds.includes(socket.id);

  if (!isEligible) {
    stopMiniPrecisionTicker();
    showSection(resultSection);
    resultText.textContent = `Other players are in ${activeEventName}. Hold on for results.`;
    setNotice("Waiting for mini-game outcomes...");
  }
});

socket.on("minigame:yourData", ({ type, endsAt, eventName, actionLabel, data }) => {
  setPhase("minigame", `${miniGameTypeLabel(type)} live. Play for bonus points.`);
  showSection(chestSection);
  activeEventName = eventName || "Mini-game";
  activeActionLabel = actionLabel || "Play";
  eventTitle.textContent = `${activeEventName} - ${miniGameTypeLabel(type)}`;
  setGameIllustration(chestIllustration, type || "", miniGameTypeLabel(type));
  renderMiniGame(type, data, activeActionLabel);
  startTicker(chestTimer, endsAt, "Mini-game ends in");
  setNotice("Play the mini-game for bonus points.");
});

socket.on("minigame:state", (payload) => {
  if (payload.type === "soccer_shootout") {
    const goalsEl = document.getElementById("miniSoccerGoals");
    const shotsEl = document.getElementById("miniSoccerShots");
    const lastEl = document.getElementById("miniSoccerLast");
    const goals = Number(payload.goals || 0);
    const shotsTaken = Number(payload.shotsTaken || 0);
    if (goalsEl) goalsEl.textContent = String(goals);
    if (shotsEl) shotsEl.textContent = String(shotsTaken);

    if (lastEl && payload.lastShot) {
      animateSoccerShot(payload.lastShot);
      const striker = soccerStarById(selectedSoccerStarId);
      const laneText = SOCCER_LANE_LABELS[payload.lastShot.lane] || "?";
      const goalieText = SOCCER_LANE_LABELS[payload.lastShot.goalieLane] || "?";
      const call = soccerCommentary(payload.lastShot.outcome, striker.name);

      if (payload.lastShot.outcome === "saved") {
        miniSoccerSavedCount += 1;
        miniSoccerHypeCount += 1;
      } else if (payload.lastShot.outcome === "miss") {
        miniSoccerMissCount += 1;
        miniSoccerHypeCount += 1;
      } else {
        miniSoccerHypeCount += 3;
      }
      updateSoccerHud(goals, shotsTaken);

      lastEl.textContent = `${call} Shot: ${laneText}. Keeper: ${goalieText}.`;
    }

    if (payload.completed) {
      chests.querySelectorAll("button[data-mini-action='shoot']").forEach((btn) => {
        btn.disabled = true;
      });
      chests.querySelectorAll("button[data-soccer-star]").forEach((btn) => {
        btn.disabled = true;
      });
      setNotice("Shootout complete. Waiting for others...", "good");
    }
    return;
  }

  if (payload.type === "tap_rush") {
    const tapCount = document.getElementById("miniTapCount");
    if (tapCount) {
      tapCount.textContent = String(payload.taps || 0);
    }
    return;
  }

  if (payload.type === "sequence_memory") {
    const progressEl = document.getElementById("miniSequenceProgress");
    if (progressEl) {
      progressEl.textContent = String(payload.progress || 0);
    }
    if (payload.completed) {
      setNotice("Sequence complete. Waiting for others...", "good");
      chests.querySelectorAll("button[data-mini-action='step']").forEach((button) => {
        button.disabled = true;
      });
    }
    return;
  }

  if (payload.type === "precision_stop" && payload.submitted) {
    stopMiniPrecisionTicker();
    setNotice(`Stopped at ${payload.value} vs target ${payload.target}.`, "good");
  }
});

socket.on("minigame:resolved", ({ text, leaderboard }) => {
  stopMiniPrecisionTicker();
  setNotice(text, "good");
  renderLeaderboard(leaderboard);
});

socket.on("minigame:feed", ({ feed, leaderboard }) => {
  stopMiniPrecisionTicker();
  renderLeaderboard(leaderboard);

  if (!feed || feed.length === 0) {
    feedList.innerHTML = `<div class="help">No mode events yet.</div>`;
    return;
  }

  feedList.innerHTML = feed.map((item) => `<div class="feed-item">${escapeHtml(item.text)}</div>`).join("");
});

socket.on("round:summary", ({ questionIndex, totalQuestions, leaderboard }) => {
  stopMiniPrecisionTicker();
  setPhase("round_summary", `Round ${questionIndex}/${totalQuestions} complete.`);
  showSection(resultSection);
  resultText.textContent = `Round ${questionIndex}/${totalQuestions} complete. Next question starts shortly.`;
  setNotice("Leaderboard updated.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("game:finished", ({ leaderboard }) => {
  stopMiniPrecisionTicker();
  setPhase("finished", "Final rankings locked.");
  showSection(resultSection);
  resultText.textContent = "Game finished. Final rankings are locked.";
  setNotice("Match complete.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("kicked", ({ reason }) => {
  stopMiniPrecisionTicker();
  setPhase("kicked", reason || "You were removed by the host.");
  setNotice(reason || "You were removed from this room.", "bad");
  showSection(resultSection);
  resultText.textContent = "Disconnected from game.";
});

socket.on("game:ended", ({ reason }) => {
  stopMiniPrecisionTicker();
  setPhase("ended", reason || "Game ended by host.");
  showSection(resultSection);
  resultText.textContent = reason || "Host ended the game.";
  setNotice(reason || "Game ended.", "bad");
});

socket.on("connect", () => {
  setConnectionPill("Connected", "ok");
  if (reconnecting && roomCode && playerName && !playCard.classList.contains("hidden")) {
    attemptAutoRejoin();
    return;
  }
  reconnecting = false;
});

socket.on("disconnect", () => {
  setConnectionPill("Reconnecting...", "warn");
  reconnecting = true;
  reconnectRetryCount = 0;
  if (roomCode && playerName && !playCard.classList.contains("hidden")) {
    setNotice("Connection lost. Reconnecting...", "bad");
    setPhaseBanner(phase, "Connection lost. Reconnecting...");
  } else {
    setJoinNotice("Connection lost. Reconnecting...", "bad");
  }
});

socket.io.on("reconnect_attempt", () => {
  setConnectionPill("Reconnecting...", "warn");
});

loadBlooks();
loadMiniGames();

socket.on("connect_error", () => {
  setConnectionPill("Offline", "warn");
  if (!playCard.classList.contains("hidden")) {
    setNotice("Cannot reach server. Trying to reconnect...", "bad");
  } else {
    setJoinNotice("Cannot connect to server. Check localhost process.", "bad");
  }
});

