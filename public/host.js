const socket = io();

let roomCode = "";
let phase = "lobby";
let tickInterval = null;
let currentQuestionOptions = [];
const MODE_LABELS = {
  classic: "Classic Quiz",
  gold: "Gold Quest",
  crypto: "Crypto Hack",
  fishing: "Fishing Frenzy",
  brawl: "Monster Brawl"
};
const GAME_IMAGE_MAP = {
  question: "/assets/minigames/shared/question.svg",
  soccer_shootout: "/assets/minigames/soccer_shootout/soccer.svg",
  tap_rush: "/assets/minigames/tap_rush/tap.svg",
  reaction_duel: "/assets/minigames/reaction_duel/tap.svg",
  sequence_memory: "/assets/minigames/sequence_memory/sequence.svg",
  obstacle_dodge: "/assets/minigames/obstacle_dodge/sequence.svg",
  precision_stop: "/assets/minigames/precision_stop/precision.svg",
  word_scramble: "/assets/minigames/word_scramble/question.svg"
};
const QUESTION_SET_LABELS = new Map([
  ["multiplication_1_digit", "Multiplication 1-Digit"],
  ["general_knowledge", "General Knowledge"]
]);
const FALLBACK_QUESTION_SETS = [
  { id: "multiplication_1_digit", label: "Multiplication 1-Digit", source: "built_in", questionCount: 81 },
  { id: "general_knowledge", label: "General Knowledge", source: "built_in", questionCount: 24 }
];
const PHASE_BANNER_COPY = {
  lobby: {
    title: "Lobby Open",
    detail: "Students can join and pick blooks."
  },
  question: {
    title: "Question Live",
    detail: "Answers are being submitted."
  },
  question_result: {
    title: "Answer Reveal",
    detail: "Scores are updating from this question."
  },
  minigame: {
    title: "Mini-Game Running",
    detail: "Players are competing for bonus points."
  },
  round_summary: {
    title: "Round Summary",
    detail: "Leaderboard is updated. Start the next round when ready."
  },
  finished: {
    title: "Game Finished",
    detail: "Final standings are locked."
  },
  ended: {
    title: "Game Ended",
    detail: "Room is no longer active."
  }
};
const PHASE_CLASS_CANDIDATES = [
  "phase-lobby",
  "phase-question",
  "phase-question-result",
  "phase-minigame",
  "phase-round-summary",
  "phase-finished",
  "phase-ended",
  "phase-kicked"
];
const MINI_GAME_LABELS = {
  soccer_shootout: "Soccer Shootout",
  tap_rush: "Tap Rush",
  reaction_duel: "Reaction Duel",
  sequence_memory: "Sequence Memory",
  obstacle_dodge: "Obstacle Dodge",
  precision_stop: "Precision Stop",
  word_scramble: "Word Scramble"
};

const setupCard = document.getElementById("setupCard");
const gameCard = document.getElementById("gameCard");
const hostNameInput = document.getElementById("hostName");
const modeInput = document.getElementById("mode");
const questionSetInput = document.getElementById("questionSet");
const timerInput = document.getElementById("timer");
const countInput = document.getElementById("count");
const miniRotationInput = document.getElementById("miniRotation");
const miniDurationInput = document.getElementById("miniDuration");
const setupNotice = document.getElementById("setupNotice");

const createBtn = document.getElementById("createBtn");
const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const endBtn = document.getElementById("endBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const testMiniGameBtn = document.getElementById("testMiniGameBtn");
const testMiniGameType = document.getElementById("testMiniGameType");
const uploadQuizBtn = document.getElementById("uploadQuizBtn");
const quizUploadTitleInput = document.getElementById("quizUploadTitle");
const quizUploadFileInput = document.getElementById("quizUploadFile");
const quizUploadNotice = document.getElementById("quizUploadNotice");

const roomCodeEl = document.getElementById("roomCode");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const copyJoinLinkBigBtn = document.getElementById("copyJoinLinkBigBtn");
const lobbyStartBtn = document.getElementById("lobbyStartBtn");
const modeLabel = document.getElementById("modeLabel");
const quizLabel = document.getElementById("quizLabel");
const phaseText = document.getElementById("phaseText");
const hostNotice = document.getElementById("hostNotice");
const phaseIllustration = document.getElementById("phaseIllustration");
const phaseBanner = document.getElementById("phaseBanner");
const phaseBannerTitle = document.getElementById("phaseBannerTitle");
const phaseBannerDetail = document.getElementById("phaseBannerDetail");
const miniGameActiveFlag = document.getElementById("miniGameActiveFlag");
const hostConnectionPill = document.getElementById("hostConnectionPill");

const kpiPlayers = document.getElementById("kpiPlayers");
const kpiAnswers = document.getElementById("kpiAnswers");
const kpiCorrect = document.getElementById("kpiCorrect");
const kpiRound = document.getElementById("kpiRound");

const liveMode = document.getElementById("liveMode");
const liveQuestionSet = document.getElementById("liveQuestionSet");
const liveTimer = document.getElementById("liveTimer");
const liveCount = document.getElementById("liveCount");
const liveMiniRotation = document.getElementById("liveMiniRotation");
const liveMiniDuration = document.getElementById("liveMiniDuration");

const playersList = document.getElementById("playersList");
const leaderboardBody = document.getElementById("leaderboardBody");
const questionPanel = document.getElementById("questionPanel");
const questionTimer = document.getElementById("questionTimer");
const questionText = document.getElementById("questionText");
const answerStats = document.getElementById("answerStats");
const miniGameDashboardPanel = document.getElementById("miniGameDashboardPanel");
const miniGameDashboardTitle = document.getElementById("miniGameDashboardTitle");
const miniGameDashboardMeta = document.getElementById("miniGameDashboardMeta");
const miniGameDashboardBody = document.getElementById("miniGameDashboardBody");
const feedList = document.getElementById("feedList");
const feedTitle = document.getElementById("feedTitle");
const joinLinks = document.getElementById("joinLinks");
const miniGamesList = document.getElementById("miniGamesList");
const miniGamePopularity = document.getElementById("miniGamePopularity");
const miniGameTestPanel = document.getElementById("miniGameTestPanel");
const miniGameTestNotice = document.getElementById("miniGameTestNotice");
const lobbyBoard = document.getElementById("lobbyBoard");
const lobbyJoinQr = document.getElementById("lobbyJoinQr");
const lobbyJoinHost = document.getElementById("lobbyJoinHost");
const lobbyCodeBig = document.getElementById("lobbyCodeBig");
const lobbyPlayerCount = document.getElementById("lobbyPlayerCount");
const lobbyReadyCount = document.getElementById("lobbyReadyCount");
const lobbyPlayers = document.getElementById("lobbyPlayers");

let serverInfo = null;
let activeMiniGameType = "";
let availableQuestionSets = FALLBACK_QUESTION_SETS.slice();
const quickMiniGameMode = new URLSearchParams(window.location.search).get("quick") === "minigame";
const FALLBACK_MINI_GAMES = [
  { id: "soccer_shootout", name: "Soccer Shootout", description: "Penalty kicks with lane + power choice." },
  { id: "tap_rush", name: "Tap Rush", description: "Tap fast for bonus points." },
  { id: "reaction_duel", name: "Reaction Duel", description: "Wait for GO and react fast." },
  { id: "sequence_memory", name: "Sequence Memory", description: "Repeat the color order to score." },
  { id: "obstacle_dodge", name: "Obstacle Dodge", description: "Pick safe lanes across turns." },
  { id: "precision_stop", name: "Precision Stop", description: "Stop the marker near the target zone." },
  { id: "word_scramble", name: "Word Scramble", description: "Unscramble words before attempts run out." }
];

function normalizePhase(value) {
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

function miniGameTypeLabel(type) {
  return MINI_GAME_LABELS[type] || normalizePhase(type || "mini-game");
}

function setConnectionPill(label, tone = "") {
  if (!hostConnectionPill) {
    return;
  }

  hostConnectionPill.classList.remove("ok", "warn");
  if (tone) {
    hostConnectionPill.classList.add(tone);
  }
  hostConnectionPill.textContent = label;
}

function setPhaseBanner(nextPhase, detailOverride = "") {
  if (!phaseBanner) {
    return;
  }

  const phaseValue = String(nextPhase || "lobby");
  const copy = PHASE_BANNER_COPY[phaseValue] || {
    title: normalizePhase(phaseValue),
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

function showNotice(el, message, type = "") {
  el.classList.remove("hidden", "good", "bad");
  if (type) {
    el.classList.add(type);
  }
  el.textContent = message;
}

function showMiniGameNotice(message, type = "") {
  if (!miniGameTestNotice) {
    return;
  }

  if (!message) {
    miniGameTestNotice.classList.add("hidden");
    miniGameTestNotice.classList.remove("good", "bad");
    miniGameTestNotice.textContent = "";
    return;
  }

  miniGameTestNotice.classList.remove("hidden", "good", "bad");
  if (type) {
    miniGameTestNotice.classList.add(type);
  }
  miniGameTestNotice.textContent = message;
}

function showQuizUploadNotice(message, type = "") {
  if (!quizUploadNotice) {
    return;
  }
  if (!message) {
    quizUploadNotice.classList.add("hidden");
    quizUploadNotice.classList.remove("good", "bad");
    quizUploadNotice.textContent = "";
    return;
  }
  quizUploadNotice.classList.remove("hidden", "good", "bad");
  if (type) {
    quizUploadNotice.classList.add(type);
  }
  quizUploadNotice.textContent = message;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function questionSetLabelById(setId) {
  return QUESTION_SET_LABELS.get(String(setId || "")) || String(setId || "Quiz");
}

function rememberQuestionSets(sets) {
  const incoming = Array.isArray(sets) ? sets : [];
  if (incoming.length === 0) {
    availableQuestionSets = FALLBACK_QUESTION_SETS.slice();
  } else {
    availableQuestionSets = incoming.map((entry) => ({
      id: String(entry?.id || ""),
      label: String(entry?.label || entry?.id || "Quiz"),
      source: String(entry?.source || "uploaded"),
      questionCount: Math.max(0, Number(entry?.questionCount || 0))
    }));
  }
  for (const set of availableQuestionSets) {
    if (set.id) {
      QUESTION_SET_LABELS.set(set.id, set.label);
    }
  }
}

function renderQuestionSetOptions(selectEl, selectedId) {
  if (!selectEl) {
    return;
  }
  const safeSelected = String(selectedId || "");
  const sets = availableQuestionSets.length > 0 ? availableQuestionSets : FALLBACK_QUESTION_SETS;
  selectEl.innerHTML = sets
    .map((set) => {
      const label = `${set.label}${set.source === "uploaded" ? " (Uploaded)" : ""}`;
      const selected = set.id === safeSelected ? " selected" : "";
      return `<option value="${escapeHtml(set.id)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function syncQuestionSetInputs(preferredId = "") {
  const fallback = availableQuestionSets[0]?.id || "multiplication_1_digit";
  const safePreferred = String(preferredId || "");
  const selectedId = availableQuestionSets.some((set) => set.id === safePreferred) ? safePreferred : fallback;
  renderQuestionSetOptions(questionSetInput, selectedId);
  renderQuestionSetOptions(liveQuestionSet, selectedId);
}

function renderMiniGamePopularity(data = {}) {
  if (!miniGamePopularity) {
    return;
  }
  const mostPlayed = data.mostPlayed || null;
  const mostMatched = data.mostMatched || null;
  if (!mostPlayed && !mostMatched) {
    miniGamePopularity.textContent = "Mini-game trends unavailable.";
    return;
  }

  const playedText = mostPlayed
    ? `Most Played: ${mostPlayed.name} (${Number(mostPlayed.playerEntries || 0)} entries)`
    : "Most Played: N/A";
  const matchedText = mostMatched
    ? `Most Matched: ${mostMatched.name} (${Number(mostMatched.completionRate || 0)}% completion)`
    : "Most Matched: N/A";
  miniGamePopularity.textContent = `${playedText} | ${matchedText}`;
}

function hideMiniGameDashboard() {
  if (!miniGameDashboardPanel) {
    return;
  }

  miniGameDashboardPanel.classList.add("hidden");
  if (miniGameDashboardBody) {
    miniGameDashboardBody.innerHTML = "";
  }
  if (miniGameDashboardMeta) {
    miniGameDashboardMeta.textContent = "Live student progress will appear here.";
  }
  activeMiniGameType = "";
}

function renderMiniGameDashboard(payload) {
  if (!miniGameDashboardPanel || !miniGameDashboardBody) {
    return;
  }

  if (!payload || !Array.isArray(payload.players)) {
    hideMiniGameDashboard();
    return;
  }

  const type = String(payload.type || "");
  const eventName = payload.eventName || miniGameTypeLabel(type);
  const players = payload.players;
  const difficultyTier = Math.max(1, Number(payload?.difficulty?.tier || 1));
  const difficultyRound = Math.max(1, Number(payload?.difficulty?.roundNumber || 1));
  const difficultyTotal = Math.max(difficultyRound, Number(payload?.difficulty?.totalQuestions || difficultyRound));
  activeMiniGameType = type;

  miniGameDashboardPanel.classList.remove("hidden");
  if (miniGameDashboardTitle) {
    miniGameDashboardTitle.textContent = `${eventName} Dashboard`;
  }
  if (miniGameDashboardMeta) {
    miniGameDashboardMeta.textContent = `${players.length} students in this mini-game. Round ${difficultyRound}/${difficultyTotal}. Difficulty T${difficultyTier}.`;
  }

  if (players.length === 0) {
    miniGameDashboardBody.innerHTML = `<div class="help">No students in this mini-game.</div>`;
    return;
  }

  if (type === "tap_rush") {
    const goal = Math.max(
      1,
      Number(payload.goal || 1),
      ...players.map((player) => Number(player.progress || 0))
    );
    miniGameDashboardBody.innerHTML = `
      <div class="host-race-goal">Goal: ${goal} taps</div>
      <div class="host-race-list">
        ${players
          .map((player) => {
            const progress = Number(player.progress || 0);
            const percent = clampPercent((progress / goal) * 100);
            return `
            <div class="host-race-row">
              <div class="host-race-head">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
                <span class="host-race-value">${progress} taps</span>
              </div>
              <div class="host-race-track">
                <span class="host-race-fill" style="width:${percent}%;"></span>
                <span class="host-race-runner" style="left:${percent}%;">${escapeHtml(player.blook?.icon || "?")}</span>
              </div>
            </div>`;
          })
          .join("")}
      </div>`;
    return;
  }

  if (type === "reaction_duel") {
    miniGameDashboardBody.innerHTML = `
      <div class="host-reaction-grid">
        ${players
          .map((player) => {
            const reacted = player.reacted === true;
            const falseStart = player.falseStart === true;
            const reactionMs = reacted && !falseStart ? Number(player.reactionMs || 0) : null;
            const toneClass = falseStart ? "wide" : reacted ? "perfect" : "";
            const text = falseStart ? "False Start" : reacted ? `${reactionMs} ms` : "Waiting";
            return `
            <article class="host-reaction-card ${toneClass}">
              <div class="host-mini-player">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
              </div>
              <div class="host-reaction-value">${text}</div>
            </article>`;
          })
          .join("")}
      </div>`;
    return;
  }

  if (type === "soccer_shootout") {
    const redScore = Number(payload?.teamScores?.red || 0);
    const blueScore = Number(payload?.teamScores?.blue || 0);
    const redName = payload?.teamScores?.redName || "Red Team";
    const blueName = payload?.teamScores?.blueName || "Blue Team";
    miniGameDashboardBody.innerHTML = `
      <div class="host-soccer-grid">
        <div class="host-race-goal">${escapeHtml(redName)} ${redScore} - ${blueScore} ${escapeHtml(blueName)}</div>
        ${players
          .map((player) => {
            const goals = Number(player.goals || 0);
            const kicks = Number(player.kicks || 0);
            const team = String(player.team || "red");
            const teamLabel = team === "blue" ? blueName : redName;
            return `
            <article class="host-soccer-card ${team === "blue" ? "theme-cloud" : "theme-pink"}">
              <div class="host-mini-player">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
              </div>
              <div class="host-soccer-score">${escapeHtml(teamLabel)} | ${goals} goals</div>
              <div class="help">${kicks} kicks this round</div>
            </article>`;
          })
          .join("")}
      </div>`;
    return;
  }

  if (type === "sequence_memory") {
    miniGameDashboardBody.innerHTML = `
      <div class="host-progress-grid">
        ${players
          .map((player) => {
            const progress = Number(player.progress || 0);
            const total = Math.max(1, Number(player.total || payload.goal || 5));
            const percent = clampPercent((progress / total) * 100);
            return `
            <article class="host-progress-card">
              <div class="host-mini-player">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
              </div>
              <div class="host-progress-meter">
                <span style="width:${percent}%"></span>
              </div>
              <div class="help">${progress}/${total} steps ${player.completed ? "- complete" : ""}</div>
            </article>`;
          })
          .join("")}
      </div>`;
    return;
  }

  if (type === "obstacle_dodge") {
    miniGameDashboardBody.innerHTML = `
      <div class="host-progress-grid">
        ${players
          .map((player) => {
            const step = Number(player.step || 0);
            const totalTurns = Math.max(1, Number(player.totalTurns || payload.goal || 8));
            const safeTurns = Number(player.safeTurns || 0);
            const hits = Number(player.hits || 0);
            const percent = clampPercent((step / totalTurns) * 100);
            return `
            <article class="host-progress-card">
              <div class="host-mini-player">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
              </div>
              <div class="host-progress-meter">
                <span style="width:${percent}%"></span>
              </div>
              <div class="help">Turn ${step}/${totalTurns} | Safe ${safeTurns} | Hits ${hits}</div>
            </article>`;
          })
          .join("")}
      </div>`;
    return;
  }

  if (type === "precision_stop") {
    miniGameDashboardBody.innerHTML = `
      <div class="host-precision-grid">
        ${players
          .map((player) => {
            const submitted = player.submitted === true;
            const diff = submitted ? Number(player.diff || 0) : null;
            const qualityClass = submitted ? (diff <= 5 ? "perfect" : diff <= 12 ? "good" : "wide") : "";
            const qualityText = submitted ? (diff <= 5 ? "Perfect" : diff <= 12 ? "Close" : "Wide") : "Pending";
            const stopValue = submitted ? String(player.value) : "--";
            return `
            <article class="host-precision-card ${qualityClass}">
              <div class="host-mini-player">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
              </div>
              <div class="host-precision-meta">Target: ${Number(player.target || 0)} | Stop: ${stopValue}</div>
              <div class="host-precision-quality">${qualityText}${submitted ? ` (${diff} away)` : ""}</div>
            </article>`;
          })
          .join("")}
      </div>`;
    return;
  }

  if (type === "word_scramble") {
    miniGameDashboardBody.innerHTML = `
      <div class="host-scramble-grid">
        ${players
          .map((player) => {
            const solved = player.solved === true;
            const attempts = Number(player.attempts || 0);
            const maxAttempts = Math.max(1, Number(player.maxAttempts || 4));
            const toneClass = solved ? "perfect" : attempts >= maxAttempts ? "wide" : "";
            return `
            <article class="host-scramble-card ${toneClass}">
              <div class="host-mini-player">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
              </div>
              <div class="host-scramble-status">${solved ? "Solved" : attempts >= maxAttempts ? "Out of tries" : "Trying..."}</div>
              <div class="help">Attempts ${attempts}/${maxAttempts}${player.lastGuess ? ` | Last: ${escapeHtml(player.lastGuess)}` : ""}</div>
            </article>`;
          })
          .join("")}
      </div>`;
    return;
  }

  miniGameDashboardBody.innerHTML = `<div class="help">No custom dashboard for ${escapeHtml(type)} yet.</div>`;
}

function renderLeaderboard(players) {
  if (!Array.isArray(players) || players.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="5" class="help">No players yet.</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = players
    .map(
      (player) => `
      <tr>
        <td>${player.rank}</td>
        <td>
          <span class="blook-name-stack">
            <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
            <span class="player-label">${escapeHtml(player.name)}</span>
          </span>
        </td>
        <td>${player.score}</td>
        <td>${player.streak}</td>
        <td>${player.correctCount}</td>
      </tr>`
    )
    .join("");
}

function renderPlayers(players) {
  if (!Array.isArray(players) || players.length === 0) {
    playersList.innerHTML = `<li class="help">No students joined yet.</li>`;
    return;
  }

  playersList.innerHTML = players
    .map(
      (player) => `
      <li class="player">
        <div>
          <div class="blook-name-stack">
            <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
            <strong class="player-label">${escapeHtml(player.name)}</strong>
          </div>
          <div class="meta">
            <span>${escapeHtml(player.blook?.name || "Starter")} (${escapeHtml(player.blook?.packName || "Core")})</span>
            <span>Score ${player.score}</span>
            <span>Streak ${player.streak}</span>
            ${player.isProtected ? "<span>Shielded</span>" : ""}
          </div>
        </div>
        <button class="danger" data-kick="${player.id}">Kick</button>
      </li>`
    )
    .join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setPhaseIllustration(type, altText) {
  if (!phaseIllustration) {
    return;
  }

  if (!type) {
    phaseIllustration.classList.add("hidden");
    phaseIllustration.removeAttribute("src");
    return;
  }

  phaseIllustration.src = GAME_IMAGE_MAP[type] || GAME_IMAGE_MAP.question;
  phaseIllustration.alt = altText || "Game phase image";
  phaseIllustration.classList.remove("hidden");
}

function startTicker(targetEl, endsAt, label) {
  if (tickInterval) {
    clearInterval(tickInterval);
  }

  const update = () => {
    const leftMs = Math.max(0, endsAt - Date.now());
    const seconds = (leftMs / 1000).toFixed(1);
    targetEl.textContent = `${label}: ${seconds}s`;

    if (leftMs <= 0 && tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  };

  update();
  tickInterval = setInterval(update, 120);
}

function setPhase(value, detail = "") {
  phase = value;
  phaseText.textContent = normalizePhase(value);
  setPhaseBanner(value, detail);
  if (value !== "minigame") {
    hideMiniGameDashboard();
  }

  const inRoundSummary = value === "round_summary";
  const inLobby = value === "lobby";
  const canRunMiniTest = value === "lobby" || value === "round_summary";
  startBtn.disabled = !inLobby;
  if (lobbyStartBtn) {
    lobbyStartBtn.disabled = !inLobby;
  }
  saveSettingsBtn.disabled = !inLobby;
  nextBtn.disabled = !inRoundSummary;
  if (lobbyBoard) {
    lobbyBoard.classList.toggle("hidden", !inLobby);
  }
  if (testMiniGameBtn) {
    testMiniGameBtn.disabled = !canRunMiniTest;
  }
}

function formatJoinUrl(baseUrl) {
  const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
  if (!cleanBase) {
    return "";
  }

  if (roomCode) {
    return `${cleanBase}/play.html?code=${encodeURIComponent(roomCode)}`;
  }

  return `${cleanBase}/play.html`;
}

function preferredJoinUrl() {
  if (serverInfo) {
    if (Array.isArray(serverInfo.lanUrls) && serverInfo.lanUrls.length > 0) {
      return formatJoinUrl(serverInfo.lanUrls[0]);
    }
    if (serverInfo.localhost) {
      return formatJoinUrl(serverInfo.localhost);
    }
  }

  return formatJoinUrl(window.location.origin || "");
}

function joinHostLabel(joinUrl) {
  if (!joinUrl) {
    return "localhost:3000/play.html";
  }

  try {
    const url = new URL(joinUrl);
    return `${url.host}${url.pathname}`;
  } catch (_error) {
    return joinUrl.replace(/^https?:\/\//i, "");
  }
}

function renderLobbyPlayerCards(players) {
  if (!lobbyPlayers) {
    return;
  }

  if (!Array.isArray(players) || players.length === 0) {
    lobbyPlayers.innerHTML = `<div class="help">No students joined yet.</div>`;
    return;
  }

  const themes = ["theme-pink", "theme-lime", "theme-cloud", "theme-grid"];
  lobbyPlayers.innerHTML = players
    .map(
      (player, index) => `
      <div class="lobby-player-card ${themes[index % themes.length]}">
        <span class="lobby-player-blook">${escapeHtml(player.blook?.icon || "?")}</span>
        <div class="lobby-player-details">
          <span class="lobby-player-name">${escapeHtml(player.name)}</span>
          <span class="lobby-player-meta">${escapeHtml(player.blook?.name || "Starter")} (${escapeHtml(
            player.blook?.packName || "Core"
          )})</span>
          <span class="lobby-player-status">Waiting</span>
        </div>
      </div>`
    )
    .join("");
}

function renderLobbyBoard(players) {
  if (lobbyCodeBig) {
    lobbyCodeBig.textContent = roomCode || "------";
  }

  const joinUrl = preferredJoinUrl();
  if (lobbyJoinHost) {
    lobbyJoinHost.textContent = joinHostLabel(joinUrl);
  }

  if (copyJoinLinkBigBtn) {
    copyJoinLinkBigBtn.dataset.joinUrl = joinUrl;
  }

  if (lobbyJoinQr) {
    if (!joinUrl) {
      lobbyJoinQr.removeAttribute("src");
    } else {
      lobbyJoinQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;
    }
  }

  const totalPlayers = Array.isArray(players) ? players.length : 0;
  if (lobbyPlayerCount) {
    lobbyPlayerCount.textContent = String(totalPlayers);
  }
  if (lobbyReadyCount) {
    lobbyReadyCount.textContent = String(totalPlayers);
  }

  renderLobbyPlayerCards(players);
}

function renderJoinLinks() {
  if (!serverInfo) {
    joinLinks.innerHTML = `<div class="help">Unable to read LAN details from server.</div>`;
    return;
  }

  const rows = [];
  rows.push({
    label: "This Computer",
    url: formatJoinUrl(serverInfo.localhost)
  });

  for (const lanUrl of serverInfo.lanUrls || []) {
    rows.push({
      label: "LAN Chromebook",
      url: formatJoinUrl(lanUrl)
    });
  }

  joinLinks.innerHTML = rows
    .map((row) => {
      const safeLabel = escapeHtml(row.label);
      const safeUrl = escapeHtml(row.url);
      return `
      <div class="feed-item">
        <div><strong>${safeLabel}</strong></div>
        <div class="mono" style="font-size:0.83rem; word-break: break-all;">${safeUrl}</div>
        <div class="button-row" style="margin-top: 6px;">
          <button class="ghost" data-copy-url="${safeUrl}">Copy Link</button>
        </div>
      </div>`;
    })
    .join("");
}

function renderMiniGameCatalog(games, stats = []) {
  if (!miniGamesList) {
    return;
  }

  if (!Array.isArray(games) || games.length === 0) {
    miniGamesList.innerHTML = `<div class="help">No mini-games loaded.</div>`;
    return;
  }

  const statsById = new Map();
  if (Array.isArray(stats)) {
    for (const row of stats) {
      if (row?.id) {
        statsById.set(row.id, row);
      }
    }
  }

  miniGamesList.innerHTML = games
    .map(
      (game, index) => {
        const stats = statsById.get(game.id);
        const statsText = stats
          ? `Played ${Number(stats.playerEntries || 0)}x | Completion ${Number(stats.completionRate || 0)}%`
          : "";
        return `<div class="feed-item"><strong>${index + 1}. ${escapeHtml(game.name)}</strong><div class="help">${escapeHtml(
          game.description || ""
        )}</div>${statsText ? `<div class="help">${escapeHtml(statsText)}</div>` : ""}</div>`;
      }
    )
    .join("");

  if (testMiniGameType) {
    const previous = testMiniGameType.value;
    testMiniGameType.innerHTML = games
      .map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(game.name)}</option>`)
      .join("");

    const exists = games.some((game) => game.id === previous);
    testMiniGameType.value = exists ? previous : games[0].id;
  }
}

async function loadQuestionSets() {
  try {
    const response = await fetch("/api/quizzes");
    if (!response.ok) {
      throw new Error("Failed to load quiz sets");
    }
    const payload = await response.json();
    rememberQuestionSets(payload?.sets);
  } catch (_error) {
    rememberQuestionSets(FALLBACK_QUESTION_SETS);
  }
  syncQuestionSetInputs(questionSetInput?.value || liveQuestionSet?.value || "");
}

async function uploadQuizSetFile() {
  if (!uploadQuizBtn || !quizUploadFileInput) {
    return;
  }

  const file = quizUploadFileInput.files && quizUploadFileInput.files[0];
  if (!file) {
    showQuizUploadNotice("Pick a CSV or Excel file first.", "bad");
    return;
  }

  uploadQuizBtn.disabled = true;
  showQuizUploadNotice("Uploading quiz file...");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", String(quizUploadTitleInput?.value || "").trim());
  formData.append("uploadedBy", String(hostNameInput?.value || "Teacher").trim());

  try {
    const response = await fetch("/api/quizzes/upload", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Upload failed");
    }

    rememberQuestionSets(payload?.sets);
    syncQuestionSetInputs(payload?.set?.id || "");
    showQuizUploadNotice(
      `Uploaded "${payload.set?.label || "Quiz"}" with ${Number(payload.set?.questionCount || 0)} questions.`,
      "good"
    );
    if (quizUploadFileInput) {
      quizUploadFileInput.value = "";
    }
  } catch (error) {
    showQuizUploadNotice(error?.message || "Could not upload quiz file.", "bad");
  } finally {
    uploadQuizBtn.disabled = false;
  }
}

async function loadServerInfo() {
  try {
    const response = await fetch("/api/server-info");
    if (!response.ok) {
      throw new Error("Failed to load server info");
    }

    serverInfo = await response.json();
  } catch (_error) {
    serverInfo = null;
  }

  renderJoinLinks();
  renderLobbyBoard([]);
}

async function loadMiniGames() {
  try {
    const response = await fetch("/api/minigames");
    if (!response.ok) {
      throw new Error("Failed to load mini-games");
    }

    const payload = await response.json();
    renderMiniGameCatalog(payload?.games, payload?.stats);
    renderMiniGamePopularity({
      mostPlayed: payload?.mostPlayed,
      mostMatched: payload?.mostMatched
    });
  } catch (_error) {
    renderMiniGameCatalog(FALLBACK_MINI_GAMES);
    renderMiniGamePopularity({});
  }
}

function ensureCreated() {
  if (!roomCode) {
    showNotice(setupNotice, "Create a room first.", "bad");
    return false;
  }
  return true;
}

async function copyText(text) {
  const value = String(text || "");
  if (!value) {
    throw new Error("Nothing to copy");
  }

  await navigator.clipboard.writeText(value);
}

createBtn.addEventListener("click", () => {
  const payload = {
    hostName: hostNameInput.value,
    mode: modeInput.value,
    questionSet: questionSetInput.value,
    timerSeconds: Number(timerInput.value),
    questionCount: Number(countInput.value),
    miniGameRotationMode: miniRotationInput?.value || "fixed",
    miniGameDurationSec: Number(miniDurationInput?.value || 10)
  };

  socket.emit("host:create", payload, (res) => {
    if (!res?.ok) {
      showNotice(setupNotice, res?.message || "Failed to create game.", "bad");
      return;
    }

    roomCode = res.code;
    roomCodeEl.textContent = roomCode;
    setupCard.classList.add("hidden");
    gameCard.classList.remove("hidden");
    setPhase("lobby", "Room created. Share the code so students can join.");
    renderJoinLinks();
    renderLobbyBoard([]);
    if (quickMiniGameMode) {
      showNotice(hostNotice, "Room created. Use the Mini-Game Test panel to launch a mini-game instantly.", "good");
      miniGameTestPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      showNotice(hostNotice, "Room created. Waiting for students to join.");
    }
  });
});

function requestStartGame() {
  if (!ensureCreated()) return;

  socket.emit("host:start", { code: roomCode }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Cannot start game.", "bad");
    }
  });
}

startBtn.addEventListener("click", requestStartGame);
lobbyStartBtn?.addEventListener("click", requestStartGame);

nextBtn.addEventListener("click", () => {
  if (!ensureCreated()) return;

  socket.emit("host:next", { code: roomCode }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Cannot go next yet.", "bad");
    }
  });
});

endBtn.addEventListener("click", () => {
  if (!ensureCreated()) return;

  socket.emit("host:end", { code: roomCode }, () => {
    showNotice(hostNotice, "Game ended.", "bad");
  });
});

copyCodeBtn?.addEventListener("click", async () => {
  if (!roomCode) {
    showNotice(hostNotice, "Create a room first.", "bad");
    return;
  }

  try {
    await copyText(roomCode);
    showNotice(hostNotice, `Room code copied: ${roomCode}`, "good");
  } catch (_error) {
    showNotice(hostNotice, `Copy failed. Room code: ${roomCode}`, "bad");
  }
});

copyJoinLinkBigBtn?.addEventListener("click", async () => {
  const joinUrl = copyJoinLinkBigBtn.dataset.joinUrl || preferredJoinUrl();
  if (!joinUrl) {
    showNotice(hostNotice, "Join link unavailable right now.", "bad");
    return;
  }

  try {
    await copyText(joinUrl);
    showNotice(hostNotice, "Join link copied.", "good");
  } catch (_error) {
    showNotice(hostNotice, "Could not copy join link.", "bad");
  }
});

saveSettingsBtn.addEventListener("click", () => {
  if (!ensureCreated()) return;

  socket.emit(
    "host:updateSettings",
    {
      code: roomCode,
      settings: {
        mode: liveMode.value,
        questionSet: liveQuestionSet.value,
        timerSeconds: Number(liveTimer.value),
        questionCount: Number(liveCount.value),
        miniGameRotationMode: liveMiniRotation?.value || "fixed",
        miniGameDurationSec: Number(liveMiniDuration?.value || 10)
      }
    },
    (res) => {
      if (!res?.ok) {
        showNotice(hostNotice, res?.message || "Could not update settings.", "bad");
        return;
      }
      showNotice(hostNotice, "Lobby settings updated.", "good");
    }
  );
});

uploadQuizBtn?.addEventListener("click", () => {
  uploadQuizSetFile();
});

testMiniGameBtn?.addEventListener("click", () => {
  if (!ensureCreated()) {
    showMiniGameNotice("Create a room first.", "bad");
    return;
  }

  showMiniGameNotice("Starting mini-game test...", "");

  socket.emit(
    "host:startMiniGameTest",
    {
      code: roomCode,
      type: testMiniGameType?.value || "soccer_shootout"
    },
    (res) => {
      if (!res?.ok) {
        showNotice(hostNotice, res?.message || "Could not start mini-game test.", "bad");
        showMiniGameNotice(res?.message || "Could not start mini-game test.", "bad");
        return;
      }
      if (res.previewMode) {
        showNotice(hostNotice, "Mini-game preview started (no students joined).", "good");
        showMiniGameNotice("Preview mode started without students.", "good");
      } else {
        showNotice(hostNotice, "Mini-game test started for all students.", "good");
        showMiniGameNotice("Mini-game test started.", "good");
      }
    }
  );
});

playersList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const playerId = target.dataset.kick;
  if (!playerId || !roomCode) {
    return;
  }

  socket.emit("host:kick", { code: roomCode, playerId }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Kick failed.", "bad");
    }
  });
});

joinLinks.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const copyButton = target.closest("button[data-copy-url]");
  if (!copyButton) {
    return;
  }

  const url = copyButton.dataset.copyUrl;
  if (!url) {
    return;
  }

  try {
    await copyText(url);
    showNotice(hostNotice, "Join link copied to clipboard.", "good");
  } catch (_error) {
    showNotice(hostNotice, "Could not copy link. Copy manually from the list.", "bad");
  }
});

socket.on("lobby:update", (payload) => {
  if (payload.code !== roomCode) {
    return;
  }

  setPhase("lobby", `${payload.players.length} students in lobby. Ready when you are.`);
  setPhaseIllustration("", "");
  const modeText = payload.modeName || MODE_LABELS[payload.mode] || payload.mode || "Classic Quiz";
  if (payload.settings?.questionSet && payload.questionSetLabel) {
    QUESTION_SET_LABELS.set(payload.settings.questionSet, payload.questionSetLabel);
    if (!availableQuestionSets.some((set) => set.id === payload.settings.questionSet)) {
      availableQuestionSets.push({
        id: payload.settings.questionSet,
        label: payload.questionSetLabel,
        source: "uploaded",
        questionCount: 0
      });
    }
  }
  syncQuestionSetInputs(payload.settings?.questionSet || "");
  const questionSetText = payload.questionSetLabel || questionSetLabelById(payload.settings.questionSet) || "Quiz";
  modeLabel.textContent = `Mode: ${modeText}`;
  quizLabel.textContent = `Quiz: ${questionSetText}`;
  feedTitle.textContent = payload.feedTitle || "Mode Feed";
  liveMode.value = payload.settings.mode;
  liveQuestionSet.value = payload.settings.questionSet;
  liveTimer.value = payload.settings.timerSeconds;
  liveCount.value = payload.settings.questionCount;
  if (liveMiniRotation) {
    liveMiniRotation.value = payload.settings.miniGameRotationMode || "fixed";
  }
  if (liveMiniDuration) {
    liveMiniDuration.value = payload.settings.miniGameDurationSec || 10;
  }
  if (miniRotationInput) {
    miniRotationInput.value = payload.settings.miniGameRotationMode || "fixed";
  }
  if (miniDurationInput) {
    miniDurationInput.value = payload.settings.miniGameDurationSec || 10;
  }

  renderPlayers(payload.players);
  renderLeaderboard(payload.players);
  renderLobbyBoard(payload.players);

  kpiPlayers.textContent = String(payload.players.length);
  kpiAnswers.textContent = "0";
  kpiCorrect.textContent = "0";
  kpiRound.textContent = `0 / ${payload.settings.questionCount}`;

  if (payload.players.length === 0) {
    showNotice(hostNotice, "Waiting for students to join.");
    showMiniGameNotice("Waiting for at least one student to join.", "");
  } else {
    showMiniGameNotice("Ready. Pick a mini-game and click Play Mini-Game Only.", "good");
  }
});

socket.on("players:update", ({ players }) => {
  renderPlayers(players);
  renderLeaderboard(players);
  renderLobbyBoard(players);
  kpiPlayers.textContent = String(players.length);
});

socket.on("host:status", (payload) => {
  if (payload.code !== roomCode) {
    return;
  }

  setPhase(payload.phase);
  kpiPlayers.textContent = String(payload.totalPlayers);
  kpiAnswers.textContent = String(payload.answers);
  kpiCorrect.textContent = String(payload.correctAnswers);
  kpiRound.textContent = `${payload.currentQuestionIndex} / ${payload.totalQuestions}`;
});

socket.on("question:start", (payload) => {
  setPhase("question", `Question ${payload.questionIndex}/${payload.totalQuestions} is live.`);
  setPhaseIllustration("question", "Question round");
  questionPanel.classList.remove("hidden");
  questionText.textContent = payload.question.prompt;
  currentQuestionOptions = payload.question.options;

  answerStats.innerHTML = payload.question.options
    .map((opt, index) => `<div class="answer"><strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(opt)}<br/><span class="help">0 picks</span></div>`)
    .join("");

  showNotice(hostNotice, `Question ${payload.questionIndex} is live.`);
  startTicker(questionTimer, payload.endsAt, "Time left");
});

socket.on("question:result", (payload) => {
  setPhase("question_result", "Answer revealed and scores updated.");

  const counts = currentQuestionOptions.map(() => 0);
  for (const submission of payload.submissions) {
    if (Number.isInteger(submission.answerIndex) && counts[submission.answerIndex] !== undefined) {
      counts[submission.answerIndex] += 1;
    }
  }

  answerStats.innerHTML = currentQuestionOptions
    .map((opt, index) => {
      const classes = ["answer"];
      if (index === payload.correctAnswer) {
        classes.push("correct");
      }
      return `<div class="${classes.join(" ")}"><strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(opt)}<br/><span class="help">${counts[index]} picks</span></div>`;
    })
    .join("");

  const explanation = payload.explanation ? ` ${payload.explanation}` : "";
  showNotice(hostNotice, `Answer revealed.${explanation}`, "good");
  renderLeaderboard(payload.leaderboard);
});

socket.on("minigame:start", ({ eligiblePlayerIds, endsAt, eventName, feedTitle: nextFeedTitle, type, difficulty }) => {
  const miniGameName = eventName || miniGameTypeLabel(type);
  activeMiniGameType = type || "";
  const participantCount = Array.isArray(eligiblePlayerIds) ? eligiblePlayerIds.length : 0;
  if (participantCount > 0) {
    setPhase("minigame", `${participantCount} players are in ${miniGameName}.`);
  } else {
    setPhase("minigame", `${miniGameName} preview is running.`);
  }
  setPhaseIllustration(type || "question", `${eventName || "Mini-game"} visual`);
  if (nextFeedTitle) {
    feedTitle.textContent = nextFeedTitle;
  }
  showNotice(hostNotice, `${participantCount} players are playing ${eventName || "a mini-game"} (${type}).`);
  if (miniGameDashboardPanel && miniGameDashboardBody) {
    miniGameDashboardPanel.classList.remove("hidden");
    if (miniGameDashboardTitle) {
      miniGameDashboardTitle.textContent = `${miniGameName} Dashboard`;
    }
    if (miniGameDashboardMeta) {
      const tier = Math.max(1, Number(difficulty?.tier || 1));
      const round = Math.max(1, Number(difficulty?.roundNumber || 1));
      const totalQuestions = Math.max(round, Number(difficulty?.totalQuestions || round));
      miniGameDashboardMeta.textContent = `${participantCount} students in this mini-game. Round ${round}/${totalQuestions}. Difficulty T${tier}.`;
    }
    miniGameDashboardBody.innerHTML = `<div class="help">Collecting live progress...</div>`;
  }
  startTicker(questionTimer, endsAt, "Mini-game ends in");
});

socket.on("minigame:progress", (payload) => {
  renderMiniGameDashboard(payload);
});

socket.on("minigame:feed", ({ feed, leaderboard }) => {
  if (!feed || feed.length === 0) {
    feedList.innerHTML = `<div class="help">No mode events yet.</div>`;
  } else {
    feedList.innerHTML = feed
      .map((item) => `<div class="feed-item">${escapeHtml(item.text)}</div>`)
      .join("");
  }

  renderLeaderboard(leaderboard);
});

socket.on("round:summary", (payload) => {
  setPhase("round_summary", `Round ${payload.questionIndex}/${payload.totalQuestions} complete.`);
  setPhaseIllustration("", "");
  renderLeaderboard(payload.leaderboard);
  showNotice(hostNotice, `Round ${payload.questionIndex}/${payload.totalQuestions} complete.`, "good");
});

socket.on("game:finished", ({ leaderboard }) => {
  setPhase("finished", "Final standings locked.");
  setPhaseIllustration("", "");
  renderLeaderboard(leaderboard);
  showNotice(hostNotice, "Game finished. Final standings locked.", "good");
  startBtn.disabled = true;
  nextBtn.disabled = true;
  saveSettingsBtn.disabled = true;
});

socket.on("game:ended", ({ reason }) => {
  setPhase("ended", reason || "Game ended by host.");
  setPhaseIllustration("", "");
  showNotice(hostNotice, reason || "Game ended.", "bad");
  startBtn.disabled = true;
  nextBtn.disabled = true;
  saveSettingsBtn.disabled = true;
  endBtn.disabled = true;
});

socket.on("connect", () => {
  setConnectionPill("Connected", "ok");
  if (roomCode) {
    showNotice(hostNotice, "Connected to server.", "good");
  }
});

socket.on("disconnect", () => {
  setConnectionPill("Reconnecting...", "warn");
  if (roomCode) {
    showNotice(hostNotice, "Connection lost. Reconnecting now.", "bad");
  } else {
    showNotice(setupNotice, "Connection lost. Reconnecting...", "bad");
  }
});

socket.io.on("reconnect_attempt", () => {
  setConnectionPill("Reconnecting...", "warn");
});

socket.on("connect_error", () => {
  setConnectionPill("Offline", "warn");
  if (roomCode) {
    showNotice(hostNotice, "Cannot reach server. Reconnecting...", "bad");
  } else {
    showNotice(setupNotice, "Socket connection failed. Refresh page.", "bad");
  }
});

loadServerInfo();
loadQuestionSets();
loadMiniGames();
setInterval(loadQuestionSets, 30000);
setInterval(loadMiniGames, 15000);

