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
  question: "/assets/games/question.svg",
  soccer_shootout: "/assets/games/soccer.svg",
  tap_rush: "/assets/games/tap.svg",
  sequence_memory: "/assets/games/sequence.svg",
  precision_stop: "/assets/games/precision.svg"
};
const QUESTION_SET_LABELS = {
  multiplication_1_digit: "Multiplication 1-Digit",
  general_knowledge: "General Knowledge"
};

const setupCard = document.getElementById("setupCard");
const gameCard = document.getElementById("gameCard");
const hostNameInput = document.getElementById("hostName");
const modeInput = document.getElementById("mode");
const questionSetInput = document.getElementById("questionSet");
const timerInput = document.getElementById("timer");
const countInput = document.getElementById("count");
const setupNotice = document.getElementById("setupNotice");

const createBtn = document.getElementById("createBtn");
const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const endBtn = document.getElementById("endBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const roomCodeEl = document.getElementById("roomCode");
const modeLabel = document.getElementById("modeLabel");
const quizLabel = document.getElementById("quizLabel");
const phaseText = document.getElementById("phaseText");
const hostNotice = document.getElementById("hostNotice");
const phaseIllustration = document.getElementById("phaseIllustration");

const kpiPlayers = document.getElementById("kpiPlayers");
const kpiAnswers = document.getElementById("kpiAnswers");
const kpiCorrect = document.getElementById("kpiCorrect");
const kpiRound = document.getElementById("kpiRound");

const liveMode = document.getElementById("liveMode");
const liveQuestionSet = document.getElementById("liveQuestionSet");
const liveTimer = document.getElementById("liveTimer");
const liveCount = document.getElementById("liveCount");

const playersList = document.getElementById("playersList");
const leaderboardBody = document.getElementById("leaderboardBody");
const questionPanel = document.getElementById("questionPanel");
const questionTimer = document.getElementById("questionTimer");
const questionText = document.getElementById("questionText");
const answerStats = document.getElementById("answerStats");
const feedList = document.getElementById("feedList");
const feedTitle = document.getElementById("feedTitle");
const joinLinks = document.getElementById("joinLinks");
const miniGamesList = document.getElementById("miniGamesList");

let serverInfo = null;
const FALLBACK_MINI_GAMES = [
  { id: "soccer_shootout", name: "Soccer Shootout", description: "Penalty kicks with lane + power choice." },
  { id: "tap_rush", name: "Tap Rush", description: "Tap fast for bonus points." },
  { id: "sequence_memory", name: "Sequence Memory", description: "Repeat the color order to score." },
  { id: "precision_stop", name: "Precision Stop", description: "Stop the marker near the target zone." }
];

function normalizePhase(value) {
  return String(value || "lobby")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function showNotice(el, message, type = "") {
  el.classList.remove("hidden", "good", "bad");
  if (type) {
    el.classList.add(type);
  }
  el.textContent = message;
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

function setPhase(value) {
  phase = value;
  phaseText.textContent = normalizePhase(value);

  const inRoundSummary = value === "round_summary";
  const inLobby = value === "lobby";
  startBtn.disabled = !inLobby;
  saveSettingsBtn.disabled = !inLobby;
  nextBtn.disabled = !inRoundSummary;
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
}

async function loadMiniGames() {
  try {
    const response = await fetch("/api/minigames");
    if (!response.ok) {
      throw new Error("Failed to load mini-games");
    }

    const payload = await response.json();
    renderMiniGameCatalog(payload?.games);
  } catch (_error) {
    renderMiniGameCatalog(FALLBACK_MINI_GAMES);
  }
}

function ensureCreated() {
  if (!roomCode) {
    showNotice(setupNotice, "Create a room first.", "bad");
    return false;
  }
  return true;
}

createBtn.addEventListener("click", () => {
  const payload = {
    hostName: hostNameInput.value,
    mode: modeInput.value,
    questionSet: questionSetInput.value,
    timerSeconds: Number(timerInput.value),
    questionCount: Number(countInput.value)
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
    renderJoinLinks();
    showNotice(hostNotice, "Room created. Waiting for students to join.");
  });
});

startBtn.addEventListener("click", () => {
  if (!ensureCreated()) return;

  socket.emit("host:start", { code: roomCode }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Cannot start game.", "bad");
    }
  });
});

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
        questionCount: Number(liveCount.value)
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
    await navigator.clipboard.writeText(url);
    showNotice(hostNotice, "Join link copied to clipboard.", "good");
  } catch (_error) {
    showNotice(hostNotice, "Could not copy link. Copy manually from the list.", "bad");
  }
});

socket.on("lobby:update", (payload) => {
  if (payload.code !== roomCode) {
    return;
  }

  setPhase("lobby");
  setPhaseIllustration("", "");
  const modeText = payload.modeName || MODE_LABELS[payload.mode] || payload.mode || "Classic Quiz";
  const questionSetText =
    payload.questionSetLabel || QUESTION_SET_LABELS[payload.settings.questionSet] || payload.settings.questionSet || "Quiz";
  modeLabel.textContent = `Mode: ${modeText}`;
  quizLabel.textContent = `Quiz: ${questionSetText}`;
  feedTitle.textContent = payload.feedTitle || "Mode Feed";
  liveMode.value = payload.settings.mode;
  liveQuestionSet.value = payload.settings.questionSet;
  liveTimer.value = payload.settings.timerSeconds;
  liveCount.value = payload.settings.questionCount;

  renderPlayers(payload.players);
  renderLeaderboard(payload.players);

  kpiPlayers.textContent = String(payload.players.length);
  kpiAnswers.textContent = "0";
  kpiCorrect.textContent = "0";
  kpiRound.textContent = `0 / ${payload.settings.questionCount}`;

  if (payload.players.length === 0) {
    showNotice(hostNotice, "Waiting for students to join.");
  }
});

socket.on("players:update", ({ players }) => {
  renderPlayers(players);
  renderLeaderboard(players);
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
  setPhase("question");
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
  setPhase("question_result");

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

socket.on("minigame:start", ({ eligiblePlayerIds, endsAt, eventName, feedTitle: nextFeedTitle, type }) => {
  setPhase("minigame");
  setPhaseIllustration(type || "question", `${eventName || "Mini-game"} visual`);
  if (nextFeedTitle) {
    feedTitle.textContent = nextFeedTitle;
  }
  showNotice(hostNotice, `${eligiblePlayerIds.length} players are playing ${eventName || "a mini-game"} (${type}).`);
  startTicker(questionTimer, endsAt, "Mini-game ends in");
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
  setPhase("round_summary");
  setPhaseIllustration("", "");
  renderLeaderboard(payload.leaderboard);
  showNotice(hostNotice, `Round ${payload.questionIndex}/${payload.totalQuestions} complete.`, "good");
});

socket.on("game:finished", ({ leaderboard }) => {
  setPhase("finished");
  setPhaseIllustration("", "");
  renderLeaderboard(leaderboard);
  showNotice(hostNotice, "Game finished. Final standings locked.", "good");
  startBtn.disabled = true;
  nextBtn.disabled = true;
  saveSettingsBtn.disabled = true;
});

socket.on("game:ended", ({ reason }) => {
  setPhase("ended");
  setPhaseIllustration("", "");
  showNotice(hostNotice, reason || "Game ended.", "bad");
  startBtn.disabled = true;
  nextBtn.disabled = true;
  saveSettingsBtn.disabled = true;
  endBtn.disabled = true;
});

socket.on("connect_error", () => {
  showNotice(setupNotice, "Socket connection failed. Refresh page.", "bad");
});

loadServerInfo();
loadMiniGames();

