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
let accountKey = "";
let accountData = null;
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
  question: "/assets/minigames/shared/question.svg",
  soccer_shootout: "/assets/minigames/soccer_shootout/soccer.svg",
  tap_rush: "/assets/minigames/tap_rush/tap.svg",
  reaction_duel: "/assets/minigames/reaction_duel/tap.svg",
  sequence_memory: "/assets/minigames/sequence_memory/sequence.svg",
  obstacle_dodge: "/assets/minigames/obstacle_dodge/sequence.svg",
  precision_stop: "/assets/minigames/precision_stop/precision.svg",
  word_scramble: "/assets/minigames/word_scramble/question.svg"
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
const accountCoins = document.getElementById("accountCoins");
const accountFreeOpen = document.getElementById("accountFreeOpen");
const openPackBtn = document.getElementById("openPackBtn");
const sellDuplicateBtn = document.getElementById("sellDuplicateBtn");
const packOdds = document.getElementById("packOdds");
const packResult = document.getElementById("packResult");
const uploadQuizBtn = document.getElementById("uploadQuizBtn");
const quizUploadTitleInput = document.getElementById("quizUploadTitle");
const quizUploadFileInput = document.getElementById("quizUploadFile");
const quizUploadNotice = document.getElementById("quizUploadNotice");
const quizUploadSets = document.getElementById("quizUploadSets");

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
const miniGamePopularity = document.getElementById("miniGamePopularity");

const MINI_STEP_LABELS = ["Red", "Blue", "Green", "Yellow"];
const SOCCER_LANE_LABELS = ["Left", "Center", "Right"];
const SOCCER_LANE_POSITIONS = [22, 50, 78];
const SOCCER_ROW_POSITIONS = [72, 56, 40, 26];
const SOCCER_STAR_PLAYERS = [
  {
    id: "messi",
    name: "Messi",
    title: "Dribble Wizard",
    image: "/assets/minigames/soccer_shootout/messi.svg"
  },
  {
    id: "ronaldo",
    name: "Cristiano",
    title: "Power Rocket",
    image: "/assets/minigames/soccer_shootout/ronaldo.svg"
  },
  {
    id: "kylian",
    name: "Kylian",
    title: "Speed Flash",
    image: "/assets/minigames/soccer_shootout/mbappe.svg"
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
const SOCCER_FIELD_PLAYERS_FALLBACK = [
  { id: "messi_left", starId: "messi", lane: 0, row: 2 },
  { id: "ronaldo_mid", starId: "ronaldo", lane: 1, row: 2 },
  { id: "kylian_right", starId: "kylian", lane: 2, row: 2 },
  { id: "messi_support", starId: "messi", lane: 0, row: 1 },
  { id: "ronaldo_support", starId: "ronaldo", lane: 1, row: 1 },
  { id: "kylian_support", starId: "kylian", lane: 2, row: 1 }
];

let activeMiniGameType = "";
let miniPrecisionValue = 0;
let miniPrecisionDirection = 1;
let miniPrecisionTicker = null;
let miniReactionTicker = null;
let reconnecting = false;
let reconnectJoinPending = false;
let reconnectRetryCount = 0;
let selectedSoccerStarId = SOCCER_STAR_PLAYERS[0].id;
let miniSoccerSavedCount = 0;
let miniSoccerMissCount = 0;
let miniSoccerEnergy = 100;
let miniSoccerFieldTicker = null;
let miniSoccerPlayers = [];
let miniSoccerLastKickSeq = 0;
let miniSoccerLastEventSeq = 0;
let miniSoccerSpaceCooldownUntil = 0;
let miniSoccerYourTeam = "red";

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
  { id: "reaction_duel", name: "Reaction Duel", description: "Wait for GO and react fast." },
  { id: "sequence_memory", name: "Sequence Memory", description: "Repeat the color order to score." },
  { id: "obstacle_dodge", name: "Obstacle Dodge", description: "Pick safe lanes across turns." },
  { id: "precision_stop", name: "Precision Stop", description: "Stop the marker near the target zone." },
  { id: "word_scramble", name: "Word Scramble", description: "Unscramble words before attempts run out." }
];

let autoJoinCodeApplied = "";
let manualCodeOverride = false;
let settingCodeProgrammatically = false;

const prefilledCode = new URLSearchParams(window.location.search).get("code");
if (prefilledCode) {
  const safePrefill = String(prefilledCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  codeInput.value = safePrefill;
  autoJoinCodeApplied = safePrefill;
  manualCodeOverride = safePrefill.length > 0;
}

function sanitizeRoomCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function currentJoinInputCode() {
  return sanitizeRoomCode(codeInput?.value || "");
}

function maybeApplyAutoRoomCode(nextCode, hostName = "") {
  if (!codeInput || roomCode) {
    return;
  }
  const safeCode = sanitizeRoomCode(nextCode);
  if (!safeCode) {
    return;
  }

  const currentCode = currentJoinInputCode();
  const hasManualInput = manualCodeOverride && currentCode.length > 0 && currentCode !== autoJoinCodeApplied;
  if (hasManualInput) {
    return;
  }

  if (currentCode === safeCode) {
    autoJoinCodeApplied = safeCode;
    return;
  }

  settingCodeProgrammatically = true;
  codeInput.value = safeCode;
  settingCodeProgrammatically = false;
  autoJoinCodeApplied = safeCode;
  const hostSuffix = hostName ? ` (${hostName})` : "";
  setJoinNotice(`Auto-filled room code: ${safeCode}${hostSuffix}`, "good");
}

function handleActiveRoomPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }
  maybeApplyAutoRoomCode(payload.code, payload.hostName || "");
}

async function loadActiveRoomCode() {
  try {
    const response = await fetch("/api/active-room");
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    handleActiveRoomPayload(payload?.activeRoom || null);
  } catch (_error) {
    // Ignore active-room polling errors.
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function randomInt(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
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

function stopMiniReactionTicker() {
  if (miniReactionTicker) {
    clearInterval(miniReactionTicker);
    miniReactionTicker = null;
  }
}

function stopMiniSoccerTicker() {
  if (miniSoccerFieldTicker) {
    clearInterval(miniSoccerFieldTicker);
    miniSoccerFieldTicker = null;
  }
}

function stopMiniTickers() {
  stopMiniPrecisionTicker();
  stopMiniReactionTicker();
  stopMiniSoccerTicker();
}

function miniGameTypeLabel(type) {
  if (type === "soccer_shootout") return "Soccer Shootout";
  if (type === "tap_rush") return "Tap Rush";
  if (type === "reaction_duel") return "Reaction Duel";
  if (type === "sequence_memory") return "Sequence Memory";
  if (type === "obstacle_dodge") return "Obstacle Dodge";
  if (type === "precision_stop") return "Precision Stop";
  if (type === "word_scramble") return "Word Scramble";
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

function normalizeSoccerTeam(team) {
  return String(team || "").toLowerCase() === "blue" ? "blue" : "red";
}

function soccerTeamName(team, teams) {
  const safeTeam = normalizeSoccerTeam(team);
  if (safeTeam === "blue") {
    return String(teams?.blue || "Blue Blazers");
  }
  return String(teams?.red || "Red Rockets");
}

function renderMiniSoccerRoster(players, teams) {
  const layer = document.getElementById("miniSoccerPlayersLayer");
  if (!layer) {
    return;
  }

  const rows = Array.isArray(players) ? players : [];
  if (rows.length === 0) {
    layer.innerHTML = "";
    miniSoccerPlayers = [];
    return;
  }

  miniSoccerPlayers = rows.map((player, index) => {
    const team = normalizeSoccerTeam(player.team);
    const rawX = Number(player?.x ?? (team === "red" ? 24 : 76));
    const rawY = Number(player?.y ?? (8 + index * 5));
    const x = Math.max(3, Math.min(97, rawX));
    const y = Math.max(6, Math.min(94, (rawY / 60) * 100));
    return {
      id: String(player.id || `p_${index}`),
      name: String(player.name || `Player ${index + 1}`),
      icon: String(player?.blook?.icon || "?"),
      team,
      x,
      y
    };
  });

  layer.innerHTML = miniSoccerPlayers
    .map((player) => {
      const teamLabel = soccerTeamName(player.team, teams);
      return `
        <div id="miniSoccerPlayer-${escapeHtml(player.id)}" class="mini-soccer-player ${escapeHtml(player.team)}" style="left:${player.x}%;top:${player.y}%;">
          <span class="mini-soccer-player-icon">${escapeHtml(player.icon)}</span>
          <span class="mini-soccer-player-name">${escapeHtml(player.name)}</span>
          <span class="mini-soccer-player-team">${escapeHtml(teamLabel)}</span>
        </div>`;
    })
    .join("");
}

function startMiniSoccerFieldMotion() {
  if (!Array.isArray(miniSoccerPlayers) || miniSoccerPlayers.length === 0) {
    return;
  }

  for (const player of miniSoccerPlayers) {
    const el = document.getElementById(`miniSoccerPlayer-${player.id}`);
    if (el) {
      el.style.left = `${player.x}%`;
      el.style.top = `${player.y}%`;
    }
  }
}

function renderMiniSoccerBall(ballState) {
  const ball = document.getElementById("miniSoccerBallLive");
  if (!ball) {
    return;
  }
  const rawX = Number(ballState?.x ?? 50);
  const rawY = Number(ballState?.y ?? 30);
  const x = Math.max(2, Math.min(98, rawX));
  const y = Math.max(4, Math.min(96, (rawY / 60) * 100));
  ball.style.left = `${x}%`;
  ball.style.top = `${y}%`;
}

function soccerStateLineFromKick(lastKick, teams) {
  if (!lastKick) {
    return "";
  }
  const shooter = String(lastKick.byName || "Player");
  const teamName = soccerTeamName(lastKick.byTeam, teams);
  const outcome = String(lastKick.outcome || "in_play");
  if (outcome === "goal") {
    return `GOAL: ${shooter} (${teamName}) scored.`;
  }
  if (outcome === "saved") {
    return `${shooter} (${teamName}) kicked, saved by the keeper.`;
  }
  return `${shooter} (${teamName}) kicked the ball.`;
}

function soccerStateLineFromEvent(lastEvent, teams) {
  if (!lastEvent) {
    return "";
  }
  if (String(lastEvent.type || "") === "goal") {
    const scorer = String(lastEvent.byName || "Player");
    const teamName = soccerTeamName(lastEvent.team, teams);
    const red = Math.max(0, Number(lastEvent?.score?.red || 0));
    const blue = Math.max(0, Number(lastEvent?.score?.blue || 0));
    return `GOAL for ${teamName}! ${scorer} scored. ${red}-${blue}.`;
  }
  return "";
}

function applyMiniSoccerState(payload = {}, options = {}) {
  const teams = payload?.teams || { red: "Red Rockets", blue: "Blue Blazers" };
  const score = payload?.score || { red: 0, blue: 0 };
  const yourTeam = normalizeSoccerTeam(payload?.yourTeam || payload?.team || miniSoccerYourTeam);
  const yourGoals = Number(payload?.yourGoals ?? payload?.goals ?? 0);
  const yourKicks = Number(payload?.yourKicks ?? payload?.kicks ?? 0);
  miniSoccerYourTeam = yourTeam;
  updateMiniSoccerScoreboard(score, teams, yourTeam, yourGoals, yourKicks);

  if (Array.isArray(payload?.players)) {
    renderMiniSoccerRoster(payload.players, teams);
    startMiniSoccerFieldMotion();
  }
  renderMiniSoccerBall(payload?.ball);

  const lastEl = document.getElementById("miniSoccerLast");
  const lastKick = payload?.lastKick || null;
  const lastEvent = payload?.lastEvent || null;
  const kickSeq = Number(lastKick?.seq || 0);
  const eventSeq = Number(lastEvent?.seq || 0);
  let line = "";

  if (eventSeq > miniSoccerLastEventSeq) {
    miniSoccerLastEventSeq = eventSeq;
    line = soccerStateLineFromEvent(lastEvent, teams);
  }
  if (kickSeq > miniSoccerLastKickSeq) {
    miniSoccerLastKickSeq = kickSeq;
    animateMiniSoccerKick(lastKick);
    if (!line) {
      line = soccerStateLineFromKick(lastKick, teams);
    }
  }

  if (options.forceSummaryText === true && !line) {
    line = soccerStateLineFromEvent(lastEvent, teams) || soccerStateLineFromKick(lastKick, teams);
  }
  if (lastEl && line) {
    lastEl.textContent = line;
  }
}

function updateMiniSoccerScoreboard(score, teams, yourTeam, yourGoals, yourKicks) {
  const red = Math.max(0, Number(score?.red || 0));
  const blue = Math.max(0, Number(score?.blue || 0));
  const scoreEl = document.getElementById("miniSoccerScoreLine");
  const myTeamEl = document.getElementById("miniSoccerYourTeam");
  const statEl = document.getElementById("miniSoccerMyStats");
  if (scoreEl) {
    scoreEl.textContent = `${soccerTeamName("red", teams)} ${red} - ${blue} ${soccerTeamName("blue", teams)}`;
  }
  if (myTeamEl) {
    myTeamEl.textContent = soccerTeamName(yourTeam, teams);
    myTeamEl.classList.toggle("blue", normalizeSoccerTeam(yourTeam) === "blue");
  }
  if (statEl) {
    statEl.textContent = `You: ${Math.max(0, Number(yourGoals || 0))} goals on ${Math.max(0, Number(yourKicks || 0))} kicks`;
  }
}

function animateMiniSoccerKick(lastKick) {
  const ball = document.getElementById("miniSoccerBallLive");
  const pitch = document.getElementById("miniSoccerPitch");
  if (!ball || !pitch || !lastKick) {
    return;
  }

  const duration = Math.max(200, Math.min(900, Number(lastKick.flightMs || 380)));
  const outcome = String(lastKick.outcome || "miss");

  ball.getAnimations().forEach((animation) => animation.cancel());
  ball.animate(
    [
      { transform: "translate(-50%, -50%) scale(1) rotate(0deg)" },
      { transform: "translate(-50%, -50%) scale(1.2) rotate(120deg)" },
      { transform: "translate(-50%, -50%) scale(1) rotate(220deg)" }
    ],
    {
      duration,
      easing: "cubic-bezier(0.2, 0.85, 0.25, 1)"
    }
  );

  pitch.classList.remove("goal-flash", "save-flash");
  if (outcome === "goal") {
    pitch.classList.add("goal-flash");
  } else if (outcome === "saved") {
    pitch.classList.add("save-flash");
  }
  setTimeout(() => {
    pitch.classList.remove("goal-flash", "save-flash");
  }, 520);
}

function soccerStarById(starId) {
  return SOCCER_STAR_PLAYERS.find((player) => player.id === starId) || SOCCER_STAR_PLAYERS[0];
}

function randomSoccerStarId() {
  return SOCCER_STAR_PLAYERS[Math.floor(Math.random() * SOCCER_STAR_PLAYERS.length)].id;
}

function soccerLanePercent(lane) {
  return SOCCER_LANE_POSITIONS[lane] ?? 50;
}

function soccerLanePosition(lane) {
  return `${soccerLanePercent(lane)}%`;
}

function soccerRowPercent(row) {
  return SOCCER_ROW_POSITIONS[row] ?? 56;
}

function normalizeSoccerFieldPlayers(rawPlayers) {
  const source = Array.isArray(rawPlayers) && rawPlayers.length > 0 ? rawPlayers : SOCCER_FIELD_PLAYERS_FALLBACK;
  return source.map((player, index) => ({
    id: String(player?.id || `soccer_player_${index}`),
    starId: String(player?.starId || SOCCER_STAR_PLAYERS[index % SOCCER_STAR_PLAYERS.length].id),
    lane: Math.max(0, Math.min(2, Number(player?.lane ?? 1))),
    row: Math.max(0, Math.min(3, Number(player?.row ?? 1)))
  }));
}

function soccerFieldPlayerAnchor(playerId) {
  const goalFrame = document.getElementById("soccerGoalFrame");
  const marker = document.getElementById(`soccerFieldPlayer-${playerId}`);
  if (!goalFrame || !marker) {
    return null;
  }

  const frameRect = goalFrame.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  if (frameRect.width <= 0 || frameRect.height <= 0) {
    return null;
  }

  const markerCenterX = markerRect.left + markerRect.width / 2;
  const markerCenterY = markerRect.top + markerRect.height / 2;
  const xPercent = Math.max(6, Math.min(94, ((markerCenterX - frameRect.left) / frameRect.width) * 100));
  const bottomPx = Math.max(28, Math.min(frameRect.height - 24, frameRect.height - (markerCenterY - frameRect.top)));
  return { xPercent, bottomPx };
}

function setSoccerFieldHighlight(playerId) {
  document.querySelectorAll(".soccer-static-player").forEach((node) => {
    node.classList.remove("ball-near");
  });
  if (!playerId) {
    return;
  }

  const marker = document.getElementById(`soccerFieldPlayer-${playerId}`);
  if (!marker) {
    return;
  }

  marker.classList.add("ball-near");
  setTimeout(() => {
    marker.classList.remove("ball-near");
  }, 560);
}

function soccerCommentary(outcome, playerName) {
  const key = outcome === "goal" ? "goal" : outcome === "saved" ? "saved" : "miss";
  const lines = SOCCER_COMMENTARY[key] || SOCCER_COMMENTARY.goal;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace("{player}", playerName);
}

function updateSoccerHud(goals, shots, energy) {
  const goalsChip = document.getElementById("miniSoccerChipGoals");
  const savesChip = document.getElementById("miniSoccerChipSaves");
  const energyChip = document.getElementById("miniSoccerChipEnergy");
  const shotsChip = document.getElementById("miniSoccerChipShots");
  const energyText = document.getElementById("miniSoccerEnergy");
  const energyFill = document.getElementById("miniSoccerEnergyFill");
  const energyValue = Math.max(0, Math.min(100, Number(energy ?? miniSoccerEnergy ?? 100)));

  if (goalsChip) goalsChip.textContent = String(goals || 0);
  if (savesChip) savesChip.textContent = String(miniSoccerSavedCount + miniSoccerMissCount);
  if (energyChip) energyChip.textContent = `${energyValue}%`;
  if (shotsChip) shotsChip.textContent = String(shots || 0);
  if (energyText) energyText.textContent = String(Math.round(energyValue));
  if (energyFill) {
    energyFill.style.width = `${energyValue}%`;
    energyFill.classList.toggle("low", energyValue <= 35);
  }
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
  if (!ball || !goalie || !stage || !lastShot) {
    return;
  }

  const requestedLane = Number(lastShot.lane);
  const finalLane = Number.isInteger(Number(lastShot.finalLane)) ? Number(lastShot.finalLane) : requestedLane;
  const goalieLane = Number(lastShot.goalieLane);
  const draggedToPlayerId = String(lastShot.draggedToPlayerId || "");
  const energyBefore = Math.max(0, Math.min(100, Number(lastShot.energyBefore ?? 100)));
  const energyAfter = Math.max(0, Math.min(100, Number(lastShot.energyAfter ?? energyBefore)));
  const drained = energyAfter <= 35 || draggedToPlayerId.length > 0;

  goalie.style.left = soccerLanePosition(goalieLane);
  setSoccerFieldHighlight(draggedToPlayerId);

  ball.getAnimations().forEach((animation) => animation.cancel());
  ball.style.left = "50%";
  ball.style.bottom = "18px";
  ball.style.transform = "translateX(-50%) scale(1) rotate(0deg)";
  ball.classList.toggle("energy-low", drained);
  if (stage) {
    stage.classList.remove("goal-flash", "save-flash", "miss-flash");
  }
  if (strikerImage) {
    strikerImage.classList.remove("powered", "frustrated");
  }
  void ball.offsetWidth;

  const finalAnchor = soccerFieldPlayerAnchor(draggedToPlayerId);
  let finalX = soccerLanePercent(finalLane);
  let finalBottom = lastShot.outcome === "goal" ? 156 : lastShot.outcome === "saved" ? 118 : 170;
  if (finalAnchor) {
    finalX = finalAnchor.xPercent;
    finalBottom = finalAnchor.bottomPx;
  }

  const midX = drained ? 50 + (finalX - 50) * 0.4 : 50 + (finalX - 50) * 0.72;
  const midBottom = drained ? Math.max(62, finalBottom - 28) : Math.max(90, finalBottom - 14);
  const endScale = lastShot.outcome === "saved" ? 0.8 : 0.64;
  const endRotate = lastShot.outcome === "goal" ? 320 : lastShot.outcome === "saved" ? 110 : 360;
  const duration = Math.max(520, Math.min(1120, Number(lastShot.flightMs || (drained ? 860 : 620))));
  const easing = drained ? "cubic-bezier(0.14, 0.92, 0.25, 1)" : "cubic-bezier(0.24, 0.94, 0.18, 1.04)";

  ball.animate(
    [
      {
        left: "50%",
        bottom: "18px",
        transform: "translateX(-50%) scale(1) rotate(0deg)",
        offset: 0
      },
      {
        left: `${midX}%`,
        bottom: `${midBottom}px`,
        transform: `translateX(-50%) scale(${drained ? 0.86 : 0.78}) rotate(${Math.round(endRotate * 0.35)}deg)`,
        offset: drained ? 0.68 : 0.55
      },
      {
        left: `${finalX}%`,
        bottom: `${finalBottom}px`,
        transform: `translateX(-50%) scale(${endScale}) rotate(${endRotate}deg)`,
        offset: 1
      }
    ],
    { duration, easing, fill: "forwards" }
  );
  ball.style.left = `${finalX}%`;
  ball.style.bottom = `${finalBottom}px`;
  ball.style.transform = `translateX(-50%) scale(${endScale}) rotate(${endRotate}deg)`;

  if (lastShot.outcome === "goal") {
    stage?.classList.add("goal-flash");
    strikerImage?.classList.add("powered");
    burstSoccerConfetti();
  } else if (lastShot.outcome === "saved") {
    stage?.classList.add("save-flash");
    strikerImage?.classList.add("frustrated");
  } else {
    stage?.classList.add("miss-flash");
    strikerImage?.classList.add("frustrated");
  }
}

function renderMiniGame(type, data, actionLabel) {
  stopMiniTickers();
  activeMiniGameType = type;

  if (type === "soccer_shootout") {
    miniSoccerYourTeam = normalizeSoccerTeam(data?.team || data?.yourTeam || "red");
    miniSoccerLastKickSeq = Number(data?.lastKick?.seq || 0);
    miniSoccerLastEventSeq = Number(data?.lastEvent?.seq || 0);
    miniSoccerSpaceCooldownUntil = 0;
    chests.innerHTML = `
      <div class="chest mini-soccer-team-chest">
        <h4>Soccer Team Clash</h4>
        <p class="help">You unlocked this mini-match by answering correctly. Press <strong>SPACE</strong> to kick.</p>
        <div class="notice">Team: <strong id="miniSoccerYourTeam"></strong></div>
        <div id="miniSoccerScoreLine" class="notice">Red Rockets 0 - 0 Blue Blazers</div>
        <div id="miniSoccerMyStats" class="help">You: 0 goals on 0 kicks</div>
        <div id="miniSoccerPitch" class="mini-soccer-pitch">
          <div class="mini-soccer-goal left"></div>
          <div class="mini-soccer-goal right"></div>
          <div id="miniSoccerPlayersLayer" class="mini-soccer-players-layer"></div>
          <div id="miniSoccerBallLive" class="mini-soccer-ball-live"></div>
        </div>
        <div style="margin-top:8px;">
          <label for="miniSoccerPower">Power</label>
          <input id="miniSoccerPower" type="range" min="1" max="3" value="2" />
          <div class="help">Higher power is faster, but less accurate.</div>
        </div>
        <div class="answers">
          <button id="miniSoccerKickBtn" class="answer" data-mini-action="kick">${escapeHtml(actionLabel || "Kick")} Ball (Space)</button>
        </div>
        <div id="miniSoccerLast" class="help" style="margin-top: 8px;">Kickoff live. Move fast for your team.</div>
      </div>`;
    applyMiniSoccerState(data, { forceSummaryText: true });
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

  if (type === "reaction_duel") {
    const goAt = Number(data?.goAt || Date.now() + 2000);
    chests.innerHTML = `
      <div class="chest">
        <h4>Reaction Duel</h4>
        <p class="help">Wait for GO, then tap instantly. Early tap = false start.</p>
        <div class="notice">Status: <span id="miniReactionStatus">Wait...</span></div>
        <div class="notice" style="margin-top:8px;">Timer: <span id="miniReactionTimer">--</span></div>
        <button data-mini-action="react">${escapeHtml(actionLabel || "React")}</button>
      </div>`;

    const statusEl = document.getElementById("miniReactionStatus");
    const timerEl = document.getElementById("miniReactionTimer");
    miniReactionTicker = setInterval(() => {
      const msLeft = goAt - Date.now();
      if (msLeft <= 0) {
        if (statusEl) statusEl.textContent = "GO!";
        if (timerEl) timerEl.textContent = "0 ms";
        return;
      }
      if (statusEl) statusEl.textContent = "Wait...";
      if (timerEl) timerEl.textContent = `${Math.max(0, Math.round(msLeft))} ms`;
    }, 50);
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

  if (type === "obstacle_dodge") {
    const totalTurns = Number(data?.totalTurns || 8);
    chests.innerHTML = `
      <div class="chest">
        <h4>Obstacle Dodge</h4>
        <p class="help">Choose a lane each turn. If the blocker is there, you get hit.</p>
        <div class="notice">Turn: <span id="miniDodgeTurn">0</span> / ${totalTurns}</div>
        <div class="notice" style="margin-top:8px;">Hits: <span id="miniDodgeHits">0</span></div>
        <div id="miniDodgeLast" class="help" style="margin-top:8px;">Pick your lane.</div>
        <div class="answers">
          <button class="answer" data-mini-action="dodge" data-mini-value="0">Dodge Left</button>
          <button class="answer" data-mini-action="dodge" data-mini-value="1">Dodge Center</button>
          <button class="answer" data-mini-action="dodge" data-mini-value="2">Dodge Right</button>
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
    return;
  }

  if (type === "word_scramble") {
    const scrambled = String(data?.scrambled || "");
    const maxAttempts = Number(data?.maxAttempts || 4);
    chests.innerHTML = `
      <div class="chest">
        <h4>Word Scramble</h4>
        <p class="help">Unscramble this word:</p>
        <div class="question" style="margin-top: 0;">${escapeHtml(scrambled)}</div>
        <div class="notice">Attempts: <span id="miniScrambleAttempts">0</span> / ${maxAttempts}</div>
        <input id="miniScrambleInput" maxlength="20" placeholder="Type your guess" style="margin-top:8px;" />
        <div id="miniScrambleLast" class="help" style="margin-top:8px;">Enter guess and submit.</div>
        <button style="margin-top:8px;" data-mini-action="guess">${escapeHtml(actionLabel || "Submit Guess")}</button>
      </div>`;
    return;
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

function getOrCreateAccountKey() {
  if (accountKey) {
    return accountKey;
  }

  let existing = "";
  try {
    existing = String(window.localStorage.getItem("quizArenaAccountKey") || "");
  } catch (_error) {
    existing = "";
  }

  const valid = /^[a-zA-Z0-9:_-]{8,120}$/.test(existing);
  if (valid) {
    accountKey = existing;
    return accountKey;
  }

  const generated = `guest:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  accountKey = generated;
  try {
    window.localStorage.setItem("quizArenaAccountKey", generated);
  } catch (_error) {
    // Ignore local storage failures and keep in-memory key.
  }
  return accountKey;
}

function accountQuery() {
  const safeKey = encodeURIComponent(getOrCreateAccountKey());
  return `accountKey=${safeKey}`;
}

function setPackResultNotice(message, tone = "") {
  if (!packResult) {
    return;
  }
  packResult.classList.remove("hidden", "good", "bad");
  if (tone) {
    packResult.classList.add(tone);
  }
  packResult.textContent = message;
}

function setQuizUploadNotice(message, tone = "") {
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
  if (tone) {
    quizUploadNotice.classList.add(tone);
  }
  quizUploadNotice.textContent = message;
}

function renderAvailableQuizSets(sets) {
  if (!quizUploadSets) {
    return;
  }
  const rows = Array.isArray(sets) ? sets : [];
  if (rows.length === 0) {
    quizUploadSets.textContent = "No uploaded quizzes yet.";
    return;
  }
  const preview = rows.slice(0, 8).map((set) => `${set.label} (${Number(set.questionCount || 0)}Q)`).join(" | ");
  quizUploadSets.textContent = `Quizzes: ${preview}`;
}

async function loadQuizSets() {
  try {
    const response = await fetch("/api/quizzes");
    if (!response.ok) {
      throw new Error("Quiz list unavailable");
    }
    const payload = await response.json();
    renderAvailableQuizSets(payload?.sets || []);
  } catch (_error) {
    renderAvailableQuizSets([]);
  }
}

async function uploadQuizSetFile() {
  if (!uploadQuizBtn || !quizUploadFileInput) {
    return;
  }
  const file = quizUploadFileInput.files && quizUploadFileInput.files[0];
  if (!file) {
    setQuizUploadNotice("Pick a CSV or Excel file first.", "bad");
    return;
  }

  uploadQuizBtn.disabled = true;
  setQuizUploadNotice("Uploading quiz file...");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", String(quizUploadTitleInput?.value || "").trim());
  formData.append("uploadedBy", String(nameInput?.value || playerName || "Student").trim());

  try {
    const response = await fetch("/api/quizzes/upload", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Upload failed");
    }

    setQuizUploadNotice(
      `Uploaded "${payload.set?.label || "Quiz"}" (${Number(payload.set?.questionCount || 0)} questions).`,
      "good"
    );
    renderAvailableQuizSets(payload?.sets || []);
    quizUploadFileInput.value = "";
  } catch (error) {
    setQuizUploadNotice(error?.message || "Could not upload quiz file.", "bad");
  } finally {
    uploadQuizBtn.disabled = false;
  }
}

function getPackById(packId) {
  return blookPacks.find((pack) => pack.id === packId) || null;
}

function getInventoryRows() {
  return Array.isArray(accountData?.inventory) ? accountData.inventory : [];
}

function getOwnedBlookById(blookId) {
  const safeId = String(blookId || "");
  if (!safeId) {
    return null;
  }
  return getInventoryRows().find((entry) => entry.id === safeId) || null;
}

function pickFirstOwnedBlookIdForPack(packId) {
  const owned = getInventoryRows().find((entry) => entry.packId === packId);
  return owned?.id || "";
}

function syncSelectedBlook() {
  const owned = getOwnedBlookById(selectedBlookId);
  if (owned) {
    if (pickedBlook) {
      pickedBlook.textContent = `Selected: ${owned.icon} ${owned.name} (${owned.packName})`;
    }
    return;
  }

  const fallback = getInventoryRows()[0] || null;
  selectedBlookId = fallback?.id || "";
  if (pickedBlook) {
    if (!fallback) {
      pickedBlook.textContent = "No blooks unlocked yet. Open a pack to unlock your first blook.";
    } else {
      pickedBlook.textContent = `Selected: ${fallback.icon} ${fallback.name} (${fallback.packName})`;
    }
  }
}

function renderPackTabs() {
  if (!packTabs) {
    return;
  }

  if (!Array.isArray(blookPacks) || blookPacks.length === 0) {
    packTabs.innerHTML = `<span class="help">No packs available.</span>`;
    return;
  }

  packTabs.innerHTML = blookPacks
    .map((pack) => {
      const selectedClass = pack.id === selectedPackId ? "pack-tab selected" : "pack-tab";
      const unlocked = Math.max(0, Number(pack.ownedCount || 0));
      const total = Math.max(1, Number(pack.totalCount || 1));
      return `<button type="button" class="${selectedClass}" data-pack-id="${pack.id}">
        ${escapeHtml(pack.name)}<br />
        <span class="help">${unlocked}/${total} unlocked</span>
      </button>`;
    })
    .join("");
}

function renderBlookGrid() {
  const pack = getPackById(selectedPackId);
  if (!pack) {
    blookGrid.innerHTML = `<span class="help">Select a pack.</span>`;
    return;
  }

  const ownedInPack = getInventoryRows().filter((entry) => entry.packId === pack.id);
  const unlockedCount = ownedInPack.length;
  const totalCount = Math.max(0, Number(pack.totalCount || 0));
  const lockedCount = Math.max(0, totalCount - unlockedCount);

  const unlockedTiles = ownedInPack
    .map((blook) => {
      const selectedClass = blook.id === selectedBlookId ? "blook-tile selected" : "blook-tile";
      const duplicateSuffix = blook.duplicates > 0 ? ` x${blook.count}` : "";
      return `
      <button type="button" class="${selectedClass}" data-blook-id="${blook.id}">
        <span class="blook-emoji">${escapeHtml(blook.icon)}</span>
        <span class="blook-name">${escapeHtml(blook.name)}${escapeHtml(duplicateSuffix)}</span>
        <span class="blook-rarity">${escapeHtml(blook.rarity || "Common")}${blook.duplicates > 0 ? ` | ${blook.duplicates} dupes` : ""}</span>
      </button>`;
    })
    .join("");

  const lockedTiles = Array.from({ length: lockedCount }, (_value, index) => {
    return `
      <div class="blook-tile" data-locked-slot="${index}">
        <span class="blook-emoji">?</span>
        <span class="blook-name">Hidden Blook</span>
        <span class="blook-rarity">Open packs to reveal</span>
      </div>`;
  }).join("");

  if (!unlockedTiles && !lockedTiles) {
    blookGrid.innerHTML = `<span class="help">No blooks in this pack.</span>`;
    return;
  }

  blookGrid.innerHTML = `${unlockedTiles}${lockedTiles}`;
}

function updatePackOdds() {
  if (!packOdds) {
    return;
  }
  const pack = getPackById(selectedPackId);
  if (!pack) {
    packOdds.textContent = "";
    return;
  }

  const odds = Array.isArray(pack.rarityOdds) ? pack.rarityOdds : [];
  if (odds.length === 0) {
    packOdds.textContent = `${pack.name}: hidden rarity odds`;
    return;
  }

  const oddsText = odds.map((entry) => `${entry.rarity} ${entry.chance}%`).join(" | ");
  packOdds.textContent = `${pack.name} odds: ${oddsText}`;
}

function updateEconomyButtons() {
  const pack = getPackById(selectedPackId);
  if (openPackBtn) {
    if (!pack) {
      openPackBtn.disabled = true;
      openPackBtn.textContent = "Open Pack";
    } else {
      const hasFreeOpen = Number(accountData?.freePackOpensRemaining || 0) > 0;
      const cost = Math.max(1, Number(pack.openCost || 20));
      openPackBtn.disabled = !hasFreeOpen && Number(accountData?.coins || 0) < cost;
      openPackBtn.textContent = hasFreeOpen ? `Open ${pack.name} (Free)` : `Open ${pack.name} (${cost} coins)`;
    }
  }

  if (sellDuplicateBtn) {
    const selected = getOwnedBlookById(selectedBlookId);
    const duplicates = Math.max(0, Number(selected?.duplicates || 0));
    const sellValue = Math.max(0, Number(selected?.sellValueEach || 0));
    sellDuplicateBtn.disabled = !selected || duplicates <= 0;
    sellDuplicateBtn.textContent =
      duplicates > 0 ? `Sell 1 Duplicate (+${sellValue} coins)` : "Sell Duplicate";
  }
}

function renderEconomyPanel() {
  if (accountCoins) {
    accountCoins.textContent = String(Math.max(0, Number(accountData?.coins || 0)));
  }
  if (accountFreeOpen) {
    accountFreeOpen.textContent = String(Math.max(0, Number(accountData?.freePackOpensRemaining || 0)));
  }
  renderPackTabs();
  renderBlookGrid();
  updatePackOdds();
  updateEconomyButtons();
  syncSelectedBlook();
}

function applyAccount(account, nextKey = "") {
  if (nextKey) {
    accountKey = nextKey;
    try {
      window.localStorage.setItem("quizArenaAccountKey", nextKey);
    } catch (_error) {
      // Ignore local storage failures.
    }
  }

  accountData = account || null;
  blookPacks = Array.isArray(accountData?.packs) ? accountData.packs : [];
  const defaultPackId = blookPacks[0]?.id || "";
  if (!selectedPackId || !getPackById(selectedPackId)) {
    selectedPackId = defaultPackId;
  }

  if (!selectedBlookId && accountData?.selectedBlookId) {
    selectedBlookId = accountData.selectedBlookId;
  }

  if (accountData?.selectedBlookId && getOwnedBlookById(accountData.selectedBlookId)) {
    selectedBlookId = accountData.selectedBlookId;
  }

  if (!selectedBlookId) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(selectedPackId) || getInventoryRows()[0]?.id || "";
  }

  renderEconomyPanel();
}

async function loadAccount() {
  const response = await fetch(`/api/account?${accountQuery()}`);
  const payload = await response.json();
  if (!response.ok || !payload?.ok || !payload?.account) {
    throw new Error(payload?.message || "Account load failed");
  }
  applyAccount(payload.account, payload.accountKey || "");
}

async function openSelectedPack() {
  const pack = getPackById(selectedPackId);
  if (!pack) {
    setPackResultNotice("Select a pack first.", "bad");
    return;
  }

  openPackBtn.disabled = true;
  const response = await fetch("/api/account/open-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountKey: getOrCreateAccountKey(),
      packId: pack.id
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "Could not open pack.");
  }

  applyAccount(payload.account, payload.accountKey || "");
  const reward = payload.reward;
  if (reward) {
    selectedBlookId = reward.id;
    renderEconomyPanel();
    const duplicateText = reward.duplicate
      ? `Duplicate! You now have ${reward.count}. Sell extras for ${reward.sellValueEach} coins.`
      : "New unlock added to your collection.";
    const freeText = reward.freeOpen ? "Free starter open used." : `Spent ${reward.openCost} coins.`;
    setPackResultNotice(`${reward.icon} ${reward.name} (${reward.rarity}) - ${duplicateText} ${freeText}`, reward.duplicate ? "bad" : "good");
  }
}

async function sellSelectedDuplicate() {
  const selected = getOwnedBlookById(selectedBlookId);
  if (!selected || Number(selected.duplicates || 0) <= 0) {
    setPackResultNotice("No duplicate selected to sell.", "bad");
    return;
  }

  sellDuplicateBtn.disabled = true;
  const response = await fetch("/api/account/sell-duplicate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountKey: getOrCreateAccountKey(),
      blookId: selected.id,
      quantity: 1
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "Could not sell duplicate.");
  }

  applyAccount(payload.account, payload.accountKey || "");
  if (payload.sold) {
    setPackResultNotice(
      `Sold duplicate ${payload.sold.icon} ${payload.sold.name} for +${payload.sold.earned} coins.`,
      "good"
    );
  }
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

async function loadMiniGames() {
  try {
    const response = await fetch("/api/minigames");
    if (!response.ok) {
      throw new Error("Mini-games API failed");
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

async function loadBlooks() {
  try {
    await loadAccount();
    if (packResult) {
      packResult.classList.add("hidden");
    }
  } catch (_error) {
    blookPacks = [];
    selectedPackId = "";
    selectedBlookId = "";
    setJoinNotice("Could not load your account. Refresh and try again.", "bad");
    if (packTabs) {
      packTabs.innerHTML = `<span class="help">Account unavailable.</span>`;
    }
    if (blookGrid) {
      blookGrid.innerHTML = `<span class="help">No unlocks available.</span>`;
    }
  }
}

function lockAnswerButtons() {
  answers.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

function renderQuestion(payload) {
  stopMiniTickers();
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
  socket.emit(
    "player:join",
    { code: roomCode, name: playerName, blookId: selectedBlookId, accountKey: getOrCreateAccountKey() },
    (res) => {
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
    if (res.account) {
      applyAccount(res.account, getOrCreateAccountKey());
    }
    playerNameEl.textContent = `${activeBlook.icon || "?"} ${playerName}`;
    setPhase(res.phase || phase || "lobby", "Reconnected. Syncing live state...");
    setNotice("Reconnected to room.", "good");
    }
  );
}

if (codeInput) {
  codeInput.addEventListener("input", () => {
    if (settingCodeProgrammatically) {
      return;
    }
    const safeCode = sanitizeRoomCode(codeInput.value);
    if (codeInput.value !== safeCode) {
      codeInput.value = safeCode;
    }
    manualCodeOverride = safeCode.length > 0;
    if (!manualCodeOverride) {
      autoJoinCodeApplied = "";
    }
  });
}

joinBtn.addEventListener("click", () => {
  const code = sanitizeRoomCode(codeInput.value);
  const name = nameInput.value.trim();

  if (!code || !name) {
    setJoinNotice("Game code and nickname are required.", "bad");
    return;
  }

  if (!selectedBlookId) {
    setJoinNotice("Open a pack first to unlock your first blook.", "bad");
    return;
  }

  socket.emit("player:join", { code, name, blookId: selectedBlookId, accountKey: getOrCreateAccountKey() }, (res) => {
    if (!res?.ok) {
      setJoinNotice(res?.message || "Unable to join room.", "bad");
      return;
    }

    roomCode = res.code;
    playerName = name;
    const activeBlook = res.blook || { icon: "?", name: "Random Blook" };
    if (res.account) {
      applyAccount(res.account, getOrCreateAccountKey());
    }

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
  if (!pack) {
    return;
  }

  selectedPackId = pack.id;
  const packOwnedBlookId = pickFirstOwnedBlookIdForPack(pack.id);
  if (!selectedBlookId || !getOwnedBlookById(selectedBlookId)) {
    selectedBlookId = packOwnedBlookId || selectedBlookId;
  }
  renderEconomyPanel();
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

  if (!getOwnedBlookById(blookId)) {
    return;
  }

  selectedBlookId = blookId;
  syncSelectedBlook();
  updateEconomyButtons();
});

if (openPackBtn) {
  openPackBtn.addEventListener("click", async () => {
    try {
      await openSelectedPack();
    } catch (error) {
      setPackResultNotice(error?.message || "Pack open failed.", "bad");
      updateEconomyButtons();
    }
  });
}

if (sellDuplicateBtn) {
  sellDuplicateBtn.addEventListener("click", async () => {
    try {
      await sellSelectedDuplicate();
    } catch (error) {
      setPackResultNotice(error?.message || "Sell duplicate failed.", "bad");
      updateEconomyButtons();
    }
  });
}

if (uploadQuizBtn) {
  uploadQuizBtn.addEventListener("click", async () => {
    await uploadQuizSetFile();
  });
}

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
  if (action === "kick" || action === "shoot") {
    const powerInput = document.getElementById("miniSoccerPower");
    const power = Number(powerInput?.value || 2);
    const direction = randomInt(-45, 45);
    payload.action = "kick";
    payload.value = { power, direction };
    miniSoccerSpaceCooldownUntil = Date.now() + 170;
  }
  if (action === "shoot") {
    payload.action = "kick";
  }
  if (action === "step") {
    payload.value = Number(button.dataset.miniValue);
  }
  if (action === "dodge") {
    payload.value = Number(button.dataset.miniValue);
  }
  if (action === "stop") {
    payload.value = Math.round(miniPrecisionValue);
    button.disabled = true;
  }
  if (action === "guess") {
    const guessInput = document.getElementById("miniScrambleInput");
    payload.value = String(guessInput?.value || "");
  }
  if (action === "react") {
    button.disabled = true;
  }

  socket.emit("player:minigameAction", payload, (res) => {
    if (!res?.ok) {
      setNotice(res?.message || "Event choice failed.", "bad");
      if (action === "stop") {
        button.disabled = false;
      }
      if (action === "react") {
        button.disabled = false;
      }
      if (action === "kick") {
        miniSoccerSpaceCooldownUntil = 0;
      }
    }
  });
});

window.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  if (event.key !== " " && event.code !== "Space") {
    return;
  }
  if (activeMiniGameType !== "soccer_shootout" || phase !== "minigame") {
    return;
  }
  const kickBtn = document.getElementById("miniSoccerKickBtn");
  if (!(kickBtn instanceof HTMLButtonElement) || kickBtn.disabled) {
    return;
  }
  if (Date.now() < miniSoccerSpaceCooldownUntil) {
    return;
  }
  event.preventDefault();
  kickBtn.click();
});

chests.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent) || event.key !== "Enter") {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement) || target.id !== "miniScrambleInput") {
    return;
  }

  const guessButton = chests.querySelector("button[data-mini-action='guess']");
  if (!(guessButton instanceof HTMLButtonElement) || guessButton.disabled) {
    return;
  }

  event.preventDefault();
  guessButton.click();
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

socket.on("room:activeCode", (payload) => {
  if (roomCode || !joinCard || joinCard.classList.contains("hidden")) {
    return;
  }
  handleActiveRoomPayload(payload);
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
    stopMiniTickers();
    showSection(resultSection);
    resultText.textContent = `Only students who answered correctly are in ${activeEventName}.`;
    setNotice("Answer correctly to enter the next mini-game round.");
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
    applyMiniSoccerState(payload, { forceSummaryText: false });

    if (payload.completed) {
      chests.querySelectorAll("button[data-mini-action='kick']").forEach((btn) => {
        btn.disabled = true;
      });
      const powerInput = document.getElementById("miniSoccerPower");
      if (powerInput) {
        powerInput.disabled = true;
      }
      setNotice("Soccer round complete. Waiting for results...", "good");
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

  if (payload.type === "reaction_duel") {
    stopMiniReactionTicker();
    const statusEl = document.getElementById("miniReactionStatus");
    const timerEl = document.getElementById("miniReactionTimer");
    const reactButton = chests.querySelector("button[data-mini-action='react']");
    if (reactButton) {
      reactButton.disabled = true;
    }
    if (payload.falseStart) {
      if (statusEl) statusEl.textContent = "False Start";
      if (timerEl) timerEl.textContent = "--";
      setNotice("False start. Waiting for others...", "bad");
    } else {
      if (statusEl) statusEl.textContent = "Reacted";
      if (timerEl) timerEl.textContent = `${Number(payload.reactionMs || 0)} ms`;
      setNotice(`Reaction time: ${Number(payload.reactionMs || 0)} ms`, "good");
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

  if (payload.type === "obstacle_dodge") {
    const turnEl = document.getElementById("miniDodgeTurn");
    const hitsEl = document.getElementById("miniDodgeHits");
    const lastEl = document.getElementById("miniDodgeLast");
    if (turnEl) {
      turnEl.textContent = String(payload.step || 0);
    }
    if (hitsEl) {
      hitsEl.textContent = String(payload.hits || 0);
    }
    if (lastEl) {
      const obstacleNames = ["Left", "Center", "Right"];
      const obstacle = obstacleNames[payload.obstacleLane] || "?";
      lastEl.textContent = payload.hit ? `Blocked at ${obstacle}.` : `Clear lane. Blocker was ${obstacle}.`;
    }
    if (payload.completed) {
      chests.querySelectorAll("button[data-mini-action='dodge']").forEach((btn) => {
        btn.disabled = true;
      });
      setNotice("Obstacle run complete. Waiting for others...", "good");
    }
    return;
  }

  if (payload.type === "precision_stop" && payload.submitted) {
    stopMiniPrecisionTicker();
    setNotice(`Stopped at ${payload.value} vs target ${payload.target}.`, "good");
    return;
  }

  if (payload.type === "word_scramble") {
    const attemptsEl = document.getElementById("miniScrambleAttempts");
    const lastEl = document.getElementById("miniScrambleLast");
    const input = document.getElementById("miniScrambleInput");
    const guessButton = chests.querySelector("button[data-mini-action='guess']");
    if (attemptsEl) {
      attemptsEl.textContent = String(payload.attempts || 0);
    }
    if (lastEl && payload.lastGuess) {
      lastEl.textContent = payload.solved ? `Solved: ${payload.answer}` : `Last guess: ${payload.lastGuess}`;
    }
    if (payload.completed) {
      if (input) {
        input.disabled = true;
      }
      if (guessButton) {
        guessButton.disabled = true;
      }
      if (payload.solved) {
        setNotice("Word solved. Waiting for others...", "good");
      } else {
        setNotice(`Out of tries. Answer: ${payload.answer}`, "bad");
      }
    }
  }
});

socket.on("minigame:resolved", ({ text, leaderboard }) => {
  stopMiniTickers();
  setNotice(text, "good");
  renderLeaderboard(leaderboard);
});

socket.on("minigame:feed", ({ feed, leaderboard }) => {
  stopMiniTickers();
  renderLeaderboard(leaderboard);

  if (!feed || feed.length === 0) {
    feedList.innerHTML = `<div class="help">No mode events yet.</div>`;
    return;
  }

  feedList.innerHTML = feed.map((item) => `<div class="feed-item">${escapeHtml(item.text)}</div>`).join("");
});

socket.on("round:summary", ({ questionIndex, totalQuestions, leaderboard }) => {
  stopMiniTickers();
  setPhase("round_summary", `Round ${questionIndex}/${totalQuestions} complete.`);
  showSection(resultSection);
  resultText.textContent = `Round ${questionIndex}/${totalQuestions} complete. Next question starts shortly.`;
  setNotice("Leaderboard updated.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("account:coinsAwarded", ({ reward, rank, totalPlayers, account }) => {
  if (account) {
    applyAccount(account, getOrCreateAccountKey());
  }
  if (reward?.total) {
    setNotice(`Game rewards: +${reward.total} coins (Rank ${rank}/${totalPlayers}).`, "good");
    setPackResultNotice(
      `Coins earned +${reward.total} | Participation ${reward.breakdown?.participation || 0}, Correct ${reward.breakdown?.correct || 0}, Score ${
        reward.breakdown?.score || 0
      }, Rank ${reward.breakdown?.rank || 0}.`,
      "good"
    );
  }
});

socket.on("game:finished", ({ leaderboard }) => {
  stopMiniTickers();
  setPhase("finished", "Final rankings locked.");
  showSection(resultSection);
  resultText.textContent = "Game finished. Final rankings are locked. Coins are now awarded.";
  setNotice("Match complete.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("kicked", ({ reason }) => {
  stopMiniTickers();
  setPhase("kicked", reason || "You were removed by the host.");
  setNotice(reason || "You were removed from this room.", "bad");
  showSection(resultSection);
  resultText.textContent = "Disconnected from game.";
});

socket.on("game:ended", ({ reason }) => {
  stopMiniTickers();
  setPhase("ended", reason || "Game ended by host.");
  showSection(resultSection);
  resultText.textContent = reason || "Host ended the game.";
  setNotice(reason || "Game ended.", "bad");
});

socket.on("connect", () => {
  setConnectionPill("Connected", "ok");
  if (!roomCode) {
    loadActiveRoomCode();
  }
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
loadQuizSets();
loadMiniGames();
loadActiveRoomCode();
setInterval(loadQuizSets, 30000);
setInterval(loadMiniGames, 15000);
setInterval(loadActiveRoomCode, 5000);

socket.on("connect_error", () => {
  setConnectionPill("Offline", "warn");
  if (!playCard.classList.contains("hidden")) {
    setNotice("Cannot reach server. Trying to reconnect...", "bad");
  } else {
    setJoinNotice("Cannot connect to server. Check localhost process.", "bad");
  }
});

