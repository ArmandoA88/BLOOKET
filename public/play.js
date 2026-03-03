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
const timerText = document.getElementById("timerText");
const questionText = document.getElementById("questionText");
const answers = document.getElementById("answers");

const chestSection = document.getElementById("chestSection");
const chestTimer = document.getElementById("chestTimer");
const chests = document.getElementById("chests");
const eventTitle = document.getElementById("eventTitle");

const resultSection = document.getElementById("resultSection");
const resultText = document.getElementById("resultText");

const leaderboardBody = document.getElementById("leaderboardBody");
const feedList = document.getElementById("feedList");
const feedTitle = document.getElementById("feedTitle");

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

function renderLeaderboard(players) {
  if (!Array.isArray(players) || players.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="help">No players yet.</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = players
    .map((player) => {
      const you = player.id === socket.id ? " (You)" : "";
      return `
      <tr>
        <td>${player.rank}</td>
        <td><span class="blook-mini">${escapeHtml(player.blook?.icon || "?")}</span> ${escapeHtml(player.name)}${you}</td>
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
  currentQuestion = payload.question;
  myAnswerIndex = null;
  canAnswer = true;

  showSection(questionSection);
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
  const selectedBlook = getSelectedBlook();

  if (!code || !name) {
    setJoinNotice("Game code and nickname are required.", "bad");
    return;
  }

  if (!selectedBlook) {
    setJoinNotice("Choose a blook before joining.", "bad");
    return;
  }

  socket.emit("player:join", { code, name, blookId: selectedBlook.id }, (res) => {
    if (!res?.ok) {
      setJoinNotice(res?.message || "Unable to join room.", "bad");
      return;
    }

    roomCode = res.code;
    playerName = name;
    const activeBlook = res.blook || selectedBlook;

    roomCodeEl.textContent = roomCode;
    playerNameEl.textContent = `${activeBlook.icon || "?"} ${playerName}`;

    joinCard.classList.add("hidden");
    playCard.classList.remove("hidden");

    setPhase("lobby");
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

  const button = target.closest("button[data-choice]");
  if (!button || !roomCode) {
    return;
  }

  const choiceId = button.dataset.choice;
  if (!choiceId) {
    return;
  }

  chests.querySelectorAll("button").forEach((item) => {
    item.disabled = true;
  });

  socket.emit("player:pickChest", { code: roomCode, choiceId }, (res) => {
    if (!res?.ok) {
      setNotice(res?.message || "Event choice failed.", "bad");
      chests.querySelectorAll("button").forEach((item) => {
        item.disabled = false;
      });
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
  feedTitle.textContent = payload.feedTitle || "Mode Feed";
  activeEventName = payload.eventName || "Event Card";
  setNotice(`Lobby active. Host: ${payload.hostName}. Mode: ${modeText}.`);
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

socket.on("chest:start", ({ eligiblePlayerIds, eventName, feedTitle: nextFeedTitle }) => {
  setPhase("chest");
  activeEventName = eventName || "Event Card";
  if (nextFeedTitle) {
    feedTitle.textContent = nextFeedTitle;
  }
  const isEligible = eligiblePlayerIds.includes(socket.id);

  if (!isEligible) {
    showSection(resultSection);
    resultText.textContent = `Correct players are resolving ${activeEventName}. Hold on for the outcome.`;
    setNotice("Waiting for event outcomes...");
  }
});

socket.on("chest:choices", ({ endsAt, choices, eventName, actionLabel }) => {
  setPhase("chest");
  showSection(chestSection);
  activeEventName = eventName || activeEventName;
  activeActionLabel = actionLabel || "Open";
  eventTitle.textContent = `Pick ${activeEventName}`;

  chests.innerHTML = choices
    .map(
      (choice) => `
      <div class="chest">
        <h4>${escapeHtml(choice.title)}</h4>
        <p class="help">${escapeHtml(choice.description)}</p>
        <button data-choice="${choice.id}">${escapeHtml(activeActionLabel)}</button>
      </div>`
    )
    .join("");

  startTicker(chestTimer, endsAt, "Event closes in");
  setNotice("Pick one event option before time expires.");
});

socket.on("chest:resolved", ({ text, leaderboard }) => {
  setNotice(text, "good");
  renderLeaderboard(leaderboard);
});

socket.on("chest:feed", ({ feed, leaderboard }) => {
  renderLeaderboard(leaderboard);

  if (!feed || feed.length === 0) {
    feedList.innerHTML = `<div class="help">No mode events yet.</div>`;
    return;
  }

  feedList.innerHTML = feed.map((item) => `<div class="feed-item">${escapeHtml(item.text)}</div>`).join("");
});

socket.on("round:summary", ({ questionIndex, totalQuestions, leaderboard }) => {
  setPhase("round_summary");
  showSection(resultSection);
  resultText.textContent = `Round ${questionIndex}/${totalQuestions} complete. Next question starts shortly.`;
  setNotice("Leaderboard updated.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("game:finished", ({ leaderboard }) => {
  setPhase("finished");
  showSection(resultSection);
  resultText.textContent = "Game finished. Final rankings are locked.";
  setNotice("Match complete.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("kicked", ({ reason }) => {
  setPhase("kicked");
  setNotice(reason || "You were removed from this room.", "bad");
  showSection(resultSection);
  resultText.textContent = "Disconnected from game.";
});

socket.on("game:ended", ({ reason }) => {
  setPhase("ended");
  showSection(resultSection);
  resultText.textContent = reason || "Host ended the game.";
  setNotice(reason || "Game ended.", "bad");
});

loadBlooks();

socket.on("connect_error", () => {
  setJoinNotice("Cannot connect to server. Check localhost process.", "bad");
});

