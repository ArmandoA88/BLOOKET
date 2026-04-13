const previewTitle = document.getElementById("previewTitle");
const previewSubtitle = document.getElementById("previewSubtitle");
const previewStatus = document.getElementById("previewStatus");
const previewRoom = document.getElementById("previewRoom");
const previewNote = document.getElementById("previewNote");
const previewHero = document.getElementById("previewHero");
const previewHeroImage = document.getElementById("previewHeroImage");
const previewLoading = document.getElementById("previewLoading");
const previewLoadingTitle = document.getElementById("previewLoadingTitle");
const previewLoadingCopy = document.getElementById("previewLoadingCopy");
const previewFrame = document.getElementById("previewFrame");
const restartPreviewBtn = document.getElementById("restartPreviewBtn");

const previewParams = new URLSearchParams(window.location.search);
const requestedGameId = String(previewParams.get("game") || "").trim().toLowerCase();

const PREVIEW_HOST_NAME = "Arcade Suite";
const PREVIEW_PLAYER_NAME = "Arcade Player";
const PREVIEW_QUESTION_SET = "general_knowledge";
const PREVIEW_CONFIGS = window.ARCADE_PREVIEW_CONFIGS || {};

const config = PREVIEW_CONFIGS[requestedGameId] || null;
const socket = typeof io === "function" ? io({ autoConnect: false }) : null;

let roomCode = "";
let playerCount = 0;
let previewStarted = false;
let startPending = false;
let createPending = false;

function setStatus(message, tone = "") {
  if (!previewStatus) {
    return;
  }
  previewStatus.classList.remove("good", "bad");
  if (tone) {
    previewStatus.classList.add(tone);
  }
  previewStatus.textContent = message;
}

function setRoomLabel(value) {
  if (previewRoom) {
    previewRoom.textContent = value ? `Room ${value}` : "Room ------";
  }
}

function setLoading(title, copy = "", hidden = false) {
  if (previewLoadingTitle) {
    previewLoadingTitle.textContent = title || "Launching preview...";
  }
  if (previewLoadingCopy) {
    previewLoadingCopy.textContent = copy || "";
  }
  if (previewLoading) {
    previewLoading.classList.toggle("hidden", hidden === true);
  }
}

function buildReloadUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("reload", String(Date.now()));
  return url.toString();
}

function buildPlayerFrameUrl(code) {
  const url = new URL("/play.html", window.location.origin);
  url.searchParams.set("code", code);
  url.searchParams.set("name", PREVIEW_PLAYER_NAME);
  url.searchParams.set("autojoin", "1");
  url.searchParams.set("previewGuest", "1");
  url.searchParams.set("suitePreview", "1");
  return url.toString();
}

function buildCreatePayload() {
  return {
    hostName: PREVIEW_HOST_NAME,
    mode: config.type === "mode" ? config.mode : "classic",
    questionSet: PREVIEW_QUESTION_SET,
    timerSeconds: Number(config.timerSeconds || 12),
    explanationRevealSec: 2,
    questionCount: Math.max(5, Number(config.questionCount || 5)),
    miniGameRotationMode: config.type === "minigame" ? config.id : "fixed",
    miniGameDurationSec: Math.max(8, Number(config.miniGameDurationSec || 12)),
    showInstructions: true,
    allowLateJoin: true,
    useRandomNames: false,
    allowStudentAccounts: false,
    shuffleQuestionOptions: false,
    preventQuestionRepeats: false
  };
}

function maybeStartPreview() {
  if (!socket || !roomCode || !config || previewStarted || startPending || playerCount < 1) {
    return;
  }

  startPending = true;
  setStatus(`Starting ${config.label}...`);
  setLoading("Starting preview...", `Launching ${config.label} for the joined arcade player.`, false);

  const finishStart = (res, failureMessage) => {
    startPending = false;
    if (!res?.ok) {
      setStatus(failureMessage || "Preview failed to start.", "bad");
      setLoading("Could not start preview", res?.message || failureMessage || "Try restarting the preview.", false);
      return;
    }
    previewStarted = true;
    setStatus(`${config.label} live`, "good");
    setLoading("Preview live", `Playing ${config.label}. Click inside the frame if controls are not responding yet.`, true);
  };

  if (config.type === "mode") {
    socket.emit("host:start", { code: roomCode }, (res) => {
      finishStart(res, `Could not start ${config.label}.`);
    });
    return;
  }

  socket.emit("host:startMiniGameTest", { code: roomCode, type: config.id }, (res) => {
    finishStart(res, `Could not start ${config.label}.`);
  });
}

function handlePlayerCountUpdate(nextPlayers) {
  playerCount = Array.isArray(nextPlayers) ? nextPlayers.length : 0;
  if (!roomCode) {
    return;
  }
  if (playerCount > 0 && !previewStarted) {
    setStatus("Player joined. Starting...");
    setLoading("Player joined", "The guest player is in the room. Starting the preview now.", false);
    window.setTimeout(() => {
      maybeStartPreview();
    }, 220);
    return;
  }
  if (playerCount === 0 && !previewStarted) {
    setStatus("Waiting for player...");
    setLoading("Waiting for player", "The guest player page is loading and will auto-join in a moment.", false);
  }
}

function createPreviewRoom() {
  if (!socket || !config || createPending || roomCode) {
    return;
  }

  createPending = true;
  setStatus("Creating room...");
  setLoading("Creating room...", `Preparing a temporary ${config.label} preview room.`, false);

  socket.emit("host:create", buildCreatePayload(), (res) => {
    createPending = false;
    if (!res?.ok) {
      setStatus("Room creation failed", "bad");
      setLoading("Could not create preview room", res?.message || "Refresh and try again.", false);
      return;
    }

    roomCode = String(res.code || "").toUpperCase().trim();
    setRoomLabel(roomCode);
    setStatus("Room ready", "good");
    setLoading("Loading player", "Joining the preview player screen automatically.", false);

    if (previewFrame) {
      previewFrame.src = buildPlayerFrameUrl(roomCode);
    }
  });
}

function endPreviewRoom() {
  if (!socket || !roomCode) {
    return;
  }
  socket.emit("host:end", { code: roomCode }, () => {});
}

if (previewTitle) {
  previewTitle.textContent = config ? config.label : "Unknown Preview";
}
if (previewSubtitle) {
  previewSubtitle.textContent = config ? config.description : "This preview could not be loaded because the game id is missing or invalid.";
}
if (previewNote) {
  previewNote.textContent = config
    ? config.note
    : "Return to the arcade suite and launch a valid game preview.";
}
if (previewHero && previewHeroImage) {
  const heroImage = config ? String(config.heroImage || "") : "";
  if (heroImage) {
    previewHeroImage.src = heroImage;
    previewHeroImage.alt = String(config.heroAlt || config.label || "Game preview hero");
    previewHero.hidden = false;
  } else {
    previewHeroImage.removeAttribute("src");
    previewHeroImage.alt = "";
    previewHero.hidden = true;
  }
}

if (!config || !socket) {
  setStatus("Preview unavailable", "bad");
  setLoading(
    "Preview unavailable",
    !socket ? "Socket client could not load for this preview." : "Unknown game preview requested.",
    false
  );
} else {
  socket.on("connect", () => {
    if (!roomCode) {
      createPreviewRoom();
    }
  });

  socket.on("disconnect", () => {
    if (!previewStarted) {
      setStatus("Reconnecting...", "bad");
      setLoading("Reconnecting...", "The preview host is reconnecting to the server.", false);
    }
  });

  socket.on("lobby:update", (payload) => {
    handlePlayerCountUpdate(payload?.players);
  });

  socket.on("players:update", ({ players }) => {
    handlePlayerCountUpdate(players);
  });

  socket.on("minigame:start", ({ eventName }) => {
    const label = String(eventName || config.label || "Mini-game");
    setStatus(`${label} live`, "good");
    setLoading("Preview live", `Playing ${label}.`, true);
  });

  socket.on("question:start", () => {
    if (config.type !== "mode") {
      return;
    }
    setStatus(`${config.label} live`, "good");
    setLoading("Preview live", `Playing ${config.label}.`, true);
  });

  socket.on("round:summary", () => {
    setStatus("Preview finished", "good");
    setLoading("Preview finished", `Restart the preview to play ${config.label} again.`, true);
  });

  socket.on("game:finished", () => {
    setStatus("Preview finished", "good");
    setLoading("Preview finished", `Restart the preview to launch ${config.label} again.`, true);
  });

  socket.on("game:ended", ({ reason }) => {
    setStatus("Preview ended", reason ? "bad" : "good");
    setLoading("Preview ended", reason || `Restart the preview to open ${config.label} again.`, false);
  });

  socket.connect();
}

previewFrame?.addEventListener("load", () => {
  if (!previewStarted) {
    setStatus("Player loading...");
  }
});

restartPreviewBtn?.addEventListener("click", () => {
  endPreviewRoom();
  window.location.href = buildReloadUrl();
});

window.addEventListener("beforeunload", () => {
  endPreviewRoom();
});
