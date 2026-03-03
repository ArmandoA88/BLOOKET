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

let activeMiniGameType = "";
let miniPrecisionValue = 0;
let miniPrecisionDirection = 1;
let miniPrecisionTicker = null;

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

function setPhase(nextPhase) {
  phase = nextPhase;
  phaseText.textContent = phaseLabel(nextPhase);
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

function renderMiniGame(type, data, actionLabel) {
  stopMiniPrecisionTicker();
  activeMiniGameType = type;

  if (type === "soccer_shootout") {
    const totalShots = Number(data?.totalShots ?? 5);
    chests.innerHTML = `
      <div class="chest">
        <h4>Soccer Shootout</h4>
        <p class="help">Pick lane + power. Beat the goalkeeper in ${totalShots} shots.</p>
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
        <div id="miniSoccerLast" class="help" style="margin-top: 8px;">Take your first shot.</div>
      </div>`;
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

    setPhase("lobby");
    setJoinNotice(`Locked blook: ${activeBlook.icon || "?"} ${activeBlook.name || "Blook"}.`, "good");
    setNotice(`Joined room ${roomCode}. Waiting for host to start.`, "good");
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
    payload.value = { lane, power };
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

  setPhase("lobby");
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
  setPhase("question");
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
  setPhase("question_result");
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
  setPhase("minigame");
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
  setPhase("minigame");
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
    if (goalsEl) goalsEl.textContent = String(payload.goals || 0);
    if (shotsEl) shotsEl.textContent = String(payload.shotsTaken || 0);

    if (lastEl && payload.lastShot) {
      const laneText = SOCCER_LANE_LABELS[payload.lastShot.lane] || "?";
      const goalieText = SOCCER_LANE_LABELS[payload.lastShot.goalieLane] || "?";
      if (payload.lastShot.outcome === "goal") {
        lastEl.textContent = `GOAL! Shot ${laneText} beat keeper at ${goalieText}.`;
      } else if (payload.lastShot.outcome === "saved") {
        lastEl.textContent = `Saved. You shot ${laneText}, keeper was ${goalieText}.`;
      } else {
        lastEl.textContent = `Missed wide. You hit ${laneText} with too much risk.`;
      }
    }

    if (payload.completed) {
      chests.querySelectorAll("button[data-mini-action='shoot']").forEach((btn) => {
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
  setPhase("round_summary");
  showSection(resultSection);
  resultText.textContent = `Round ${questionIndex}/${totalQuestions} complete. Next question starts shortly.`;
  setNotice("Leaderboard updated.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("game:finished", ({ leaderboard }) => {
  stopMiniPrecisionTicker();
  setPhase("finished");
  showSection(resultSection);
  resultText.textContent = "Game finished. Final rankings are locked.";
  setNotice("Match complete.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("kicked", ({ reason }) => {
  stopMiniPrecisionTicker();
  setPhase("kicked");
  setNotice(reason || "You were removed from this room.", "bad");
  showSection(resultSection);
  resultText.textContent = "Disconnected from game.";
});

socket.on("game:ended", ({ reason }) => {
  stopMiniPrecisionTicker();
  setPhase("ended");
  showSection(resultSection);
  resultText.textContent = reason || "Host ended the game.";
  setNotice(reason || "Game ended.", "bad");
});

loadBlooks();
loadMiniGames();

socket.on("connect_error", () => {
  setJoinNotice("Cannot connect to server. Check localhost process.", "bad");
});

