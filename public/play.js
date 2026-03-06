const socket = io();

let roomCode = "";
let playerName = "";
let phase = "join";
let currentMode = "classic";
let ticker = null;
let currentQuestion = null;
let myAnswerIndex = null;
let canAnswer = false;
let pausedFromPhase = "";
let blookPacks = [];
let catalogPacks = [];
let selectedPackId = "";
let selectedBlookId = "";
let selectedEffectId = "fx-none";
let blookEffects = [];
let accountKey = "";
let accountData = null;
let activeEventName = "Event Card";
let activeActionLabel = "Open";
const ALL_BLOOKS_AVAILABLE = true;
const MODE_LABELS = {
  classic: "Classic Quiz",
  gold: "Gold Quest",
  crypto: "Crypto Hack",
  fishing: "Fishing Frenzy",
  brawl: "Monster Brawl"
};
const GAME_IMAGE_MAP = {
  question: "/assets/minigames/shared/question.svg",
  foosball_frenzy: "/assets/minigames/soccer_shootout/soccer.svg",
  soccer_shootout: "/assets/minigames/soccer_shootout/soccer.svg",
  tap_rush: "/assets/minigames/tap_rush/tap.svg",
  reaction_duel: "/assets/minigames/reaction_duel/tap.svg",
  sequence_memory: "/assets/minigames/sequence_memory/sequence.svg",
  obstacle_dodge: "/assets/minigames/obstacle_dodge/sequence.svg",
  precision_stop: "/assets/minigames/precision_stop/precision.svg",
  word_scramble: "/assets/minigames/word_scramble/question.svg"
};
const SOUND_PREF_STORAGE_KEY = "quizArenaSoundEnabled";
const MINI_TUTORIAL_STORAGE_KEY = "quizArenaMiniTutorialSeen";
const PHASE_BANNER_COPY = {
  join: {
    title: "Join Screen",
    detail: "Enter game code and nickname."
  },
  lobby: {
    title: "Lobby",
    detail: "Waiting for host to start the game."
  },
  paused: {
    title: "Game Paused",
    detail: "Play is temporarily frozen by the host."
  },
  countdown: {
    title: "Starting Countdown",
    detail: "First question begins in 3..2..1."
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
  "phase-paused",
  "phase-countdown",
  "phase-question",
  "phase-question-result",
  "phase-minigame",
  "phase-round-summary",
  "phase-finished",
  "phase-kicked",
  "phase-ended"
];
const BLOOK_IMAGE_POSITION_OVERRIDES = {
  "spiderman-noir": { position: "center 7%", scale: 0.9 },
  "spiderman-2099": { position: "center 6%", scale: 0.92 },
  "spiderman-mcu-peter": { position: "center 9%", scale: 0.93 },
  "doctor-strange": { position: "center 6%", scale: 0.93 },
  "scarlet-witch": { position: "center 8%", scale: 0.94 },
  thanos: { position: "center 11%", scale: 0.94 },
  loki: { position: "center 8%", scale: 0.94 },
  hawkeye: { position: "center 9%", scale: 0.93 },
  "black-widow": { position: "center 8%", scale: 0.94 },
  "captain-marvel": { position: "center 8%", scale: 0.93 },
  "captain-america-steve": { position: "center 9%", scale: 0.93 },
  "captain-america-sam": { position: "center 9%", scale: 0.93 },
  "black-panther": { position: "center 10%", scale: 0.93 },
  killmonger: { position: "center 9%", scale: 0.94 },
  vulture: { position: "center 8%", scale: 0.92 }
};

const joinCard = document.getElementById("joinCard");
const playCard = document.getElementById("playCard");
const landingTopbar = document.getElementById("landingTopbar");
const landingSub = document.getElementById("landingSub");
const joinCardTitle = document.getElementById("joinCardTitle");
const fishingHud = document.getElementById("fishingHud");
const fishingHudAudio = fishingHud?.querySelector(".fishing-hud-audio") || null;
const fishingHudName = document.getElementById("fishingHudName");
const fishingHudTimer = document.getElementById("fishingHudTimer");
const fishingHudCode = document.getElementById("fishingHudCode");
const fishingBoard = document.getElementById("fishingBoard");
const fishingRankCard = document.getElementById("fishingRankCard");
const fishingRankPlace = document.getElementById("fishingRankPlace");
const fishingRankIcon = document.getElementById("fishingRankIcon");
const fishingRankName = document.getElementById("fishingRankName");
const fishingRankWeight = document.getElementById("fishingRankWeight");
const fishingFinalPanel = document.getElementById("fishingFinalPanel");
const fishingPlayAgainBtn = document.getElementById("fishingPlayAgainBtn");
const fishingWinnerName = document.getElementById("fishingWinnerName");
const fishingWinnerWeight = document.getElementById("fishingWinnerWeight");
const fishingWinnerIcon = document.getElementById("fishingWinnerIcon");

const codeInput = document.getElementById("code");
const nameInput = document.getElementById("name");
const joinBtn = document.getElementById("joinBtn");
const joinNotice = document.getElementById("joinNotice");
const accountPanel = document.getElementById("accountPanel");
const accountPolicyNotice = document.getElementById("accountPolicyNotice");
const packTabs = document.getElementById("packTabs");
const blookGrid = document.getElementById("blookGrid");
const pickedBlook = document.getElementById("pickedBlook");
const accountCoins = document.getElementById("accountCoins");
const accountFreeOpen = document.getElementById("accountFreeOpen");
const openPackBtn = document.getElementById("openPackBtn");
const sellDuplicateBtn = document.getElementById("sellDuplicateBtn");
const packOdds = document.getElementById("packOdds");
const packResult = document.getElementById("packResult");
const packOpenAnimation = document.getElementById("packOpenAnimation");

const roomCodeEl = document.getElementById("roomCode");
const playerNameEl = document.getElementById("playerName");
const phaseText = document.getElementById("phaseText");
const phaseBanner = document.getElementById("phaseBanner");
const phaseBannerTitle = document.getElementById("phaseBannerTitle");
const phaseBannerDetail = document.getElementById("phaseBannerDetail");
const miniGameActiveFlag = document.getElementById("miniGameActiveFlag");
const playerConnectionPill = document.getElementById("playerConnectionPill");
const mainNotice = document.getElementById("mainNotice");
const soundToggleBtn = document.getElementById("soundToggleBtn");

const questionSection = document.getElementById("questionSection");
const questionIllustration = document.getElementById("questionIllustration");
const questionMedia = document.getElementById("questionMedia");
const timerText = document.getElementById("timerText");
const questionText = document.getElementById("questionText");
const answers = document.getElementById("answers");

const chestSection = document.getElementById("chestSection");
const chestIllustration = document.getElementById("chestIllustration");
const chestTimer = document.getElementById("chestTimer");
const chests = document.getElementById("chests");
const eventTitle = document.getElementById("eventTitle");
const miniTutorialBtn = document.getElementById("miniTutorialBtn");

const resultSection = document.getElementById("resultSection");
const resultText = document.getElementById("resultText");

const leaderboardBody = document.getElementById("leaderboardBody");
const feedList = document.getElementById("feedList");
const feedTitle = document.getElementById("feedTitle");
const miniGamesList = document.getElementById("miniGamesList");
const miniGamePopularity = document.getElementById("miniGamePopularity");
const miniTutorialOverlay = document.getElementById("miniTutorialOverlay");
const miniTutorialTitle = document.getElementById("miniTutorialTitle");
const miniTutorialIntro = document.getElementById("miniTutorialIntro");
const miniTutorialSteps = document.getElementById("miniTutorialSteps");
const miniTutorialCloseBtn = document.getElementById("miniTutorialCloseBtn");

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
const MINI_GAME_TUTORIALS = {
  foosball_frenzy: {
    intro: "Move lane, pick power, then shoot quickly before time runs out.",
    steps: [
      "Use Left and Right arrows or lane buttons to position your striker.",
      "Set power to balance speed and control.",
      "Press Space or Kick to shoot and score before the bot adapts."
    ]
  },
  soccer_shootout: {
    intro: "Kick fast to help your team score more goals than the other side.",
    steps: [
      "Adjust power before each shot.",
      "Press Space or Kick to shoot as soon as you are ready.",
      "Higher power is faster but can reduce control."
    ]
  },
  tap_rush: {
    intro: "Rapid taps convert directly into bonus progress.",
    steps: [
      "Spam the tap button as quickly as possible.",
      "Every tap is sent to the server immediately.",
      "Keep a steady pace for the full timer."
    ]
  },
  reaction_duel: {
    intro: "Wait for GO, then react as fast as possible.",
    steps: [
      "Do not click early or it counts as a false start.",
      "When GO appears, react immediately.",
      "Lower milliseconds means a better result."
    ]
  },
  sequence_memory: {
    intro: "Repeat the color order exactly to complete the sequence.",
    steps: [
      "Read the sequence shown above.",
      "Press colors in the same order.",
      "One wrong step breaks your run."
    ]
  },
  obstacle_dodge: {
    intro: "Choose safe lanes each turn to avoid blockers.",
    steps: [
      "Pick Left, Center, or Right every turn.",
      "If you choose the blocked lane, you take a hit.",
      "Finish with as few hits as possible."
    ]
  },
  precision_stop: {
    intro: "Stop the moving marker as close to the target as possible.",
    steps: [
      "Watch the marker sweep left and right.",
      "Press Stop near the target line.",
      "Closer distance gives a better result."
    ]
  },
  word_scramble: {
    intro: "Unscramble the letters before attempts run out.",
    steps: [
      "Type your best guess in the input.",
      "Submit guesses quickly and refine from feedback.",
      "Solve before max attempts to score."
    ]
  }
};

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
let miniFoosballSelectedLane = 1;
let miniFoosballGoalieLane = 1;
let miniFoosballShotSeq = 0;
let miniFoosballPixiLoadPromise = null;
let miniFoosballPixiApp = null;
let miniFoosballPixiScene = null;
let miniFoosballPixiTicker = null;
let miniFoosballBallTween = null;
let latestLeaderboardRows = [];
let fishingGameEndsAt = 0;
let fishingHudTicker = null;
let currentReportCode = "";
let packOpenAnimationTimer = null;
let soundEnabled = true;
let sfxAudioContext = null;
let miniTutorialSeen = new Set();
let activeMiniTutorialType = "";
let tickerWarningSecond = null;

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
  { id: "foosball_frenzy", name: "Foosball Frenzy", description: "Fast table soccer duel with lane + power shots." },
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
let roomSettings = {
  showInstructions: true,
  allowLateJoin: true,
  useRandomNames: false,
  allowStudentAccounts: true,
  endType: "time",
  endTargetValue: 7
};

const pageParams = new URLSearchParams(window.location.search);
const prefilledCode = pageParams.get("code");
const prefilledName = String(pageParams.get("name") || "").trim().slice(0, 24);
const shouldAutoJoinFromQuery = ["1", "true", "yes", "on"].includes(String(pageParams.get("autojoin") || "").toLowerCase());
const catalogViewRequested = ["1", "true", "yes", "on"].includes(String(pageParams.get("catalog") || "").toLowerCase());
let autoJoinFromQueryPending = shouldAutoJoinFromQuery;
let autoJoinFromQueryAttempted = false;
if (prefilledCode) {
  const safePrefill = String(prefilledCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  codeInput.value = safePrefill;
  autoJoinCodeApplied = safePrefill;
  manualCodeOverride = safePrefill.length > 0;
}
if (prefilledName && nameInput) {
  nameInput.value = prefilledName;
}

if (catalogViewRequested) {
  if (landingSub) {
    landingSub.textContent = "Browse every blook, then enter a game code when you are ready to join.";
  }
  if (joinCardTitle) {
    joinCardTitle.textContent = "Browse Blooks";
  }
  if (pickedBlook) {
    pickedBlook.textContent = "Viewing the full blook catalog. Choose any pack to preview its roster.";
  }
  if (joinNotice) {
    setJoinNotice("Catalog view loaded. Enter a room code any time to join a game.", "good");
  }
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

function maybeAutoJoinFromQuery() {
  if (!autoJoinFromQueryPending || autoJoinFromQueryAttempted || !joinBtn || !joinCard) {
    return;
  }
  if (roomCode || joinCard.classList.contains("hidden")) {
    return;
  }

  const code = sanitizeRoomCode(codeInput?.value || "");
  const name = String(nameInput?.value || "").trim();
  if (code.length !== 6 || !name) {
    return;
  }

  autoJoinFromQueryPending = false;
  autoJoinFromQueryAttempted = true;
  setJoinNotice(`Joining room ${code} as ${name}...`, "good");
  setTimeout(() => {
    if (!roomCode && !joinCard.classList.contains("hidden")) {
      joinBtn.click();
    }
  }, 0);
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

function readLocalStorageValue(key, fallback = "") {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : String(value);
  } catch (_error) {
    return fallback;
  }
}

function writeLocalStorageValue(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_error) {
    // Ignore local storage write failures.
  }
}

function loadSoundPreference() {
  const stored = readLocalStorageValue(SOUND_PREF_STORAGE_KEY, "1").trim().toLowerCase();
  soundEnabled = !(stored === "0" || stored === "false" || stored === "off");
}

function applySoundToggleUi() {
  if (!soundToggleBtn) {
    return;
  }
  soundToggleBtn.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  soundToggleBtn.classList.toggle("off", !soundEnabled);
  soundToggleBtn.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
}

function ensureSfxAudioContext() {
  if (!soundEnabled) {
    return null;
  }
  const ContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!ContextCtor) {
    return null;
  }
  if (!sfxAudioContext) {
    try {
      sfxAudioContext = new ContextCtor();
    } catch (_error) {
      return null;
    }
  }
  if (sfxAudioContext.state === "suspended") {
    sfxAudioContext.resume().catch(() => {
      // Ignore resume failures until next user interaction.
    });
  }
  return sfxAudioContext;
}

function playSfxTone(ctx, frequency, durationMs, gain = 0.04, waveform = "sine", delayMs = 0) {
  if (!ctx || ctx.state !== "running") {
    return;
  }
  const start = ctx.currentTime + Math.max(0, Number(delayMs) || 0) / 1000;
  const end = start + Math.max(20, Number(durationMs) || 80) / 1000;
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(Math.max(40, Number(frequency) || 440), start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), Math.min(end, start + 0.02));
  volume.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playMiniGameSfx(eventType) {
  if (!soundEnabled) {
    return;
  }
  const ctx = ensureSfxAudioContext();
  if (!ctx || ctx.state !== "running") {
    return;
  }

  const key = String(eventType || "").toLowerCase();
  if (key === "goal") {
    playSfxTone(ctx, 680, 90, 0.04, "triangle");
    playSfxTone(ctx, 880, 120, 0.045, "triangle", 90);
    return;
  }
  if (key === "save") {
    playSfxTone(ctx, 360, 90, 0.035, "square");
    playSfxTone(ctx, 290, 110, 0.03, "square", 75);
    return;
  }
  if (key === "timer_warning") {
    playSfxTone(ctx, 740, 75, 0.03, "square");
    return;
  }
  if (key === "miss") {
    playSfxTone(ctx, 260, 100, 0.03, "triangle");
  }
}

function setSoundEnabled(nextEnabled) {
  soundEnabled = Boolean(nextEnabled);
  writeLocalStorageValue(SOUND_PREF_STORAGE_KEY, soundEnabled ? "1" : "0");
  applySoundToggleUi();
  updateFishingHudIdentity();
  if (soundEnabled) {
    ensureSfxAudioContext();
  }
}

function setupSfxUnlockListeners() {
  const unlock = () => {
    ensureSfxAudioContext();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

function loadMiniTutorialProgress() {
  const raw = readLocalStorageValue(MINI_TUTORIAL_STORAGE_KEY, "");
  if (!raw) {
    miniTutorialSeen = new Set();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      miniTutorialSeen = new Set();
      return;
    }
    miniTutorialSeen = new Set(
      parsed
        .map((entry) => String(entry || ""))
        .filter((entry) => Object.prototype.hasOwnProperty.call(MINI_GAME_TUTORIALS, entry))
    );
  } catch (_error) {
    miniTutorialSeen = new Set();
  }
}

function saveMiniTutorialProgress() {
  writeLocalStorageValue(MINI_TUTORIAL_STORAGE_KEY, JSON.stringify(Array.from(miniTutorialSeen)));
}

function hasMiniTutorial(type) {
  return Object.prototype.hasOwnProperty.call(MINI_GAME_TUTORIALS, String(type || ""));
}

function hideMiniTutorialOverlay() {
  if (miniTutorialOverlay) {
    miniTutorialOverlay.classList.add("hidden");
  }
  activeMiniTutorialType = "";
}

function applyMiniTutorialButtonVisibility(type = activeMiniGameType) {
  if (!miniTutorialBtn) {
    return;
  }
  const shouldShow = phase === "minigame" && hasMiniTutorial(type);
  miniTutorialBtn.classList.toggle("hidden", !shouldShow);
  miniTutorialBtn.disabled = !shouldShow;
}

function openMiniTutorial(type, options = {}) {
  const tutorialType = String(type || "");
  const tutorial = MINI_GAME_TUTORIALS[tutorialType];
  if (!tutorial || !miniTutorialOverlay || !miniTutorialTitle || !miniTutorialIntro || !miniTutorialSteps) {
    return;
  }

  const force = options.force === true;
  const alreadySeen = miniTutorialSeen.has(tutorialType);
  if (!force && alreadySeen) {
    return;
  }

  if (!alreadySeen) {
    miniTutorialSeen.add(tutorialType);
    saveMiniTutorialProgress();
  }

  activeMiniTutorialType = tutorialType;
  miniTutorialTitle.textContent = `${miniGameTypeLabel(tutorialType)} Tutorial`;
  miniTutorialIntro.textContent = tutorial.intro;
  miniTutorialSteps.innerHTML = tutorial.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  miniTutorialOverlay.classList.remove("hidden");
  if (miniTutorialCloseBtn) {
    miniTutorialCloseBtn.focus();
  }
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

function boolFlag(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function normalizeEndType(value) {
  return String(value || "time").trim().toLowerCase() === "weight" ? "weight" : "time";
}

function isFishingMode() {
  return String(currentMode || "").trim().toLowerCase() === "fishing";
}

function formatWeightLbs(value) {
  const score = Number(value);
  return `${Math.max(0, Math.round(Number.isFinite(score) ? score : 0))} lbs`;
}

function ordinalPlace(value) {
  const rank = Math.max(1, Math.floor(Number(value) || 1));
  const moduloHundred = rank % 100;
  const moduloTen = rank % 10;
  if (moduloHundred >= 11 && moduloHundred <= 13) {
    return `${rank}th`;
  }
  if (moduloTen === 1) {
    return `${rank}st`;
  }
  if (moduloTen === 2) {
    return `${rank}nd`;
  }
  if (moduloTen === 3) {
    return `${rank}rd`;
  }
  return `${rank}th`;
}

function formatCountdown(secondsLeft) {
  const safe = Math.max(0, Math.floor(Number(secondsLeft) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resetFishingHudTicker() {
  if (!fishingHudTicker) {
    return;
  }
  clearInterval(fishingHudTicker);
  fishingHudTicker = null;
}

function updateFishingTimerDisplay() {
  if (!fishingHudTimer) {
    return;
  }
  if (!isFishingMode()) {
    fishingHudTimer.textContent = "--:--";
    return;
  }
  if (phase === "finished") {
    fishingHudTimer.textContent = "Final Standings";
    return;
  }
  if (roomSettings.endType !== "time") {
    fishingHudTimer.textContent = "WEIGHT";
    return;
  }
  if (fishingGameEndsAt <= 0) {
    const defaultMinutes = Math.max(2, Math.min(99, Number(roomSettings.endTargetValue || 7)));
    fishingHudTimer.textContent = formatCountdown(defaultMinutes * 60);
    return;
  }
  const leftSeconds = Math.ceil((fishingGameEndsAt - Date.now()) / 1000);
  fishingHudTimer.textContent = formatCountdown(leftSeconds);
}

function ensureFishingGameTimerStarted() {
  if (!isFishingMode() || roomSettings.endType !== "time" || fishingGameEndsAt > 0) {
    return;
  }
  const minutes = Math.max(2, Math.min(99, Number(roomSettings.endTargetValue || 7)));
  fishingGameEndsAt = Date.now() + minutes * 60 * 1000;
}

function updateFishingHudIdentity() {
  const finalPhase = String(phase || "").toLowerCase() === "finished";
  if (fishingHudAudio) {
    fishingHudAudio.textContent = finalPhase ? "END" : soundEnabled ? "SFX ON" : "SFX OFF";
  }
  if (fishingHudName) {
    fishingHudName.textContent = finalPhase ? "Blooket" : String(playerName || "PLAYER").toUpperCase();
  }
  if (fishingHudCode) {
    fishingHudCode.textContent = finalPhase ? "View Report" : `ID: ${roomCode || "------"}`;
  }
}

function syncFishingRankCard(players = latestLeaderboardRows) {
  if (!fishingRankCard || !isFishingMode()) {
    return;
  }
  if (String(phase || "").toLowerCase() === "finished") {
    fishingRankCard.classList.add("hidden");
    return;
  }
  const rows = Array.isArray(players) ? players : [];
  const me =
    rows.find((row) => row?.id === socket.id) ||
    rows.find((row) => String(row?.name || "").toLowerCase() === String(playerName || "").toLowerCase()) ||
    null;
  if (!me) {
    fishingRankCard.classList.add("hidden");
    return;
  }

  fishingRankCard.classList.remove("hidden");
  if (fishingRankPlace) {
    fishingRankPlace.textContent = ordinalPlace(me.rank);
  }
  if (fishingRankIcon) {
    fishingRankIcon.innerHTML = renderBlookWithEffect(me.blook, me.effectId);
  }
  if (fishingRankName) {
    fishingRankName.textContent = String(me?.name || playerName || "PLAYER").toUpperCase();
  }
  if (fishingRankWeight) {
    fishingRankWeight.textContent = formatWeightLbs(me?.score || 0);
  }
}

function renderFishingFinalWinner(players = latestLeaderboardRows) {
  if (!fishingFinalPanel) {
    return;
  }
  const rows = Array.isArray(players) ? players : [];
  const winner = rows[0] || null;
  if (!winner) {
    fishingFinalPanel.classList.add("hidden");
    return;
  }

  if (fishingWinnerName) {
    fishingWinnerName.textContent = String(winner?.name || "PLAYER").toUpperCase();
  }
  if (fishingWinnerWeight) {
    fishingWinnerWeight.textContent = formatWeightLbs(winner?.score || 0);
  }
  if (fishingWinnerIcon) {
    fishingWinnerIcon.innerHTML = renderBlookWithEffect(winner.blook, winner.effectId);
  }
  fishingFinalPanel.classList.remove("hidden");
}

function applyPlayModeTheme() {
  const active = isFishingMode() && !playCard.classList.contains("hidden");
  const finalPhase = String(phase || "").toLowerCase() === "finished";
  const stageOnly = active && (phase === "lobby" || phase === "round_summary" || finalPhase);

  document.body.classList.toggle("play-fishing-mode", active);
  playCard.classList.toggle("fishing-stage-only", stageOnly);
  playCard.classList.toggle("fishing-final-active", active && finalPhase);
  if (landingTopbar) {
    landingTopbar.classList.toggle("hidden", active);
  }
  if (fishingHud) {
    fishingHud.classList.toggle("hidden", !active);
    fishingHud.setAttribute("aria-hidden", active ? "false" : "true");
  }
  if (fishingHudCode) {
    fishingHudCode.classList.toggle("fishing-report-link", active && finalPhase);
    if (active && finalPhase) {
      fishingHudCode.setAttribute("role", "button");
      fishingHudCode.setAttribute("tabindex", "0");
    } else {
      fishingHudCode.removeAttribute("role");
      fishingHudCode.removeAttribute("tabindex");
    }
  }
  if (fishingBoard) {
    fishingBoard.classList.toggle("hidden", !active);
    fishingBoard.setAttribute("aria-hidden", active ? "false" : "true");
  }
  if (fishingFinalPanel) {
    fishingFinalPanel.classList.toggle("hidden", !(active && finalPhase));
  }
  if (!active) {
    resetFishingHudTicker();
    return;
  }

  updateFishingHudIdentity();
  updateFishingTimerDisplay();
  syncFishingRankCard();
  if (finalPhase) {
    renderFishingFinalWinner();
  }
  if (!fishingHudTicker) {
    fishingHudTicker = setInterval(updateFishingTimerDisplay, 300);
  }
}

function openCurrentReportPage() {
  const code = String(currentReportCode || roomCode || "").toUpperCase().trim();
  if (!code) {
    return;
  }
  window.location.href = `/report.html?code=${encodeURIComponent(code)}`;
}

function applyRoomSettings(nextSettings = null) {
  if (nextSettings && typeof nextSettings === "object") {
    const parsedTarget = Number(nextSettings.endTargetValue ?? roomSettings.endTargetValue ?? 7);
    roomSettings = {
      showInstructions: boolFlag(nextSettings.showInstructions, roomSettings.showInstructions),
      allowLateJoin: boolFlag(nextSettings.allowLateJoin, roomSettings.allowLateJoin),
      useRandomNames: boolFlag(nextSettings.useRandomNames, roomSettings.useRandomNames),
      allowStudentAccounts: boolFlag(nextSettings.allowStudentAccounts, roomSettings.allowStudentAccounts),
      endType: normalizeEndType(nextSettings.endType || roomSettings.endType),
      endTargetValue: Math.max(2, Number.isFinite(parsedTarget) ? parsedTarget : 7)
    };
  }

  const allowAccounts = roomSettings.allowStudentAccounts !== false;
  if (accountPanel) {
    accountPanel.classList.remove("hidden");
  }
  if (accountPolicyNotice) {
    if (!allowAccounts) {
      accountPolicyNotice.classList.remove("hidden", "bad");
      accountPolicyNotice.classList.add("good");
      accountPolicyNotice.textContent = "Student accounts are disabled for this game. All packs and blooks are still available for avatar selection.";
    } else {
      accountPolicyNotice.classList.add("hidden");
      accountPolicyNotice.textContent = "";
      accountPolicyNotice.classList.remove("good", "bad");
    }
  }
  if (!allowAccounts && !selectedBlookId) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(selectedPackId) || getInventoryRows()[0]?.id || "";
  }
  updateFishingTimerDisplay();
  applyPlayModeTheme();
}

function setPhase(nextPhase, detail = "") {
  phase = nextPhase;
  phaseText.textContent = phaseLabel(nextPhase);
  setPhaseBanner(nextPhase, detail);
  if (String(nextPhase || "").toLowerCase() !== "minigame") {
    hideMiniTutorialOverlay();
  }
  applyMiniTutorialButtonVisibility();
  if (String(nextPhase || "").toLowerCase() !== "lobby" && String(nextPhase || "").toLowerCase() !== "join") {
    ensureFishingGameTimerStarted();
  }
  applyPlayModeTheme();
}

function startTicker(targetEl, endsAt, label) {
  stopTicker();
  tickerWarningSecond = null;

  const update = () => {
    const leftMs = Math.max(0, endsAt - Date.now());
    targetEl.textContent = `${label}: ${(leftMs / 1000).toFixed(1)}s`;
    const leftSeconds = Math.ceil(leftMs / 1000);
    if (leftSeconds > 0 && leftSeconds <= 3 && leftSeconds !== tickerWarningSecond) {
      tickerWarningSecond = leftSeconds;
      playMiniGameSfx("timer_warning");
    }

    if (leftMs <= 0 && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };

  update();
  ticker = setInterval(update, 120);
}

function stopTicker() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
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
  destroyMiniFoosballPixi();
}

function miniGameTypeLabel(type) {
  if (type === "foosball_frenzy") return "Foosball Frenzy";
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

function setQuestionMediaImage(element, imageUrl, questionPrompt = "Question") {
  if (!element) {
    return;
  }

  const src = String(imageUrl || "").trim();
  if (!src) {
    element.classList.add("hidden");
    element.removeAttribute("src");
    return;
  }

  element.src = src;
  element.alt = `${String(questionPrompt || "Question")} image`;
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
    playMiniGameSfx("goal");
  } else if (lastShot.outcome === "saved") {
    stage?.classList.add("save-flash");
    strikerImage?.classList.add("frustrated");
    playMiniGameSfx("save");
  } else {
    stage?.classList.add("miss-flash");
    strikerImage?.classList.add("frustrated");
    playMiniGameSfx("miss");
  }
}

function clampMiniFoosballLane(value) {
  return clamp(Math.round(Number(value ?? 1)), 0, 2);
}

function miniFoosballLaneX(index, width = 720) {
  const lane = clampMiniFoosballLane(index);
  const points = [Math.round(width * 0.24), Math.round(width * 0.5), Math.round(width * 0.76)];
  return points[lane];
}

function miniFoosballEventText(payload) {
  const eventType = String(payload?.lastEvent?.type || "");
  if (eventType === "player_goal") return "GOAL! Your shot found the corner.";
  if (eventType === "player_saved") return "Saved by the bot keeper. Try a new lane.";
  if (eventType === "bot_goal") return "Bot scores. Block with your current lane.";
  if (eventType === "bot_saved") return "Great block! You stopped the bot shot.";
  if (eventType === "goalie_shift") return "Keeper moved. Time your next shot.";
  return "Move lane with Left/Right, then press Space to shoot.";
}

function ensureMiniFoosballPixiLoaded() {
  if (window.PIXI) {
    return Promise.resolve(window.PIXI);
  }
  if (miniFoosballPixiLoadPromise) {
    return miniFoosballPixiLoadPromise;
  }
  miniFoosballPixiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/pixi.min.js";
    script.async = true;
    script.onload = () => {
      if (window.PIXI) {
        resolve(window.PIXI);
        return;
      }
      reject(new Error("PIXI global missing after load."));
    };
    script.onerror = () => reject(new Error("Failed to load PixiJS bundle."));
    document.head.appendChild(script);
  });
  return miniFoosballPixiLoadPromise;
}

function destroyMiniFoosballPixi() {
  if (miniFoosballPixiApp && miniFoosballPixiTicker) {
    miniFoosballPixiApp.ticker.remove(miniFoosballPixiTicker);
  }
  miniFoosballPixiTicker = null;
  miniFoosballBallTween = null;
  if (miniFoosballPixiApp) {
    try {
      miniFoosballPixiApp.destroy(true, { children: true });
    } catch (_error) {
      // Ignore teardown failures.
    }
  }
  miniFoosballPixiApp = null;
  miniFoosballPixiScene = null;
}

async function initMiniFoosballPixi() {
  const stage = document.getElementById("miniFoosballStage");
  if (!stage) {
    return;
  }

  try {
    const PIXI = await ensureMiniFoosballPixiLoaded();
    const width = 720;
    const height = 360;
    destroyMiniFoosballPixi();

    const app = new PIXI.Application();
    await app.init({
      width,
      height,
      antialias: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true
    });
    const view = app.canvas || app.view;
    if (!view) {
      throw new Error("PixiJS canvas not available.");
    }

    stage.innerHTML = "";
    view.classList.add("mini-foosball-canvas");
    stage.appendChild(view);

    const root = new PIXI.Container();
    app.stage.addChild(root);

    const field = new PIXI.Sprite(PIXI.Texture.WHITE);
    field.width = width;
    field.height = height;
    field.tint = 0x198551;
    root.addChild(field);

    const stripe = new PIXI.Sprite(PIXI.Texture.WHITE);
    stripe.width = width;
    stripe.height = 4;
    stripe.x = 0;
    stripe.y = height / 2 - 2;
    stripe.alpha = 0.42;
    root.addChild(stripe);

    const leftGoal = new PIXI.Sprite(PIXI.Texture.WHITE);
    leftGoal.width = 14;
    leftGoal.height = 112;
    leftGoal.x = 8;
    leftGoal.y = 124;
    leftGoal.tint = 0xecf7ff;
    leftGoal.alpha = 0.9;
    root.addChild(leftGoal);

    const rightGoal = new PIXI.Sprite(PIXI.Texture.WHITE);
    rightGoal.width = 14;
    rightGoal.height = 112;
    rightGoal.x = width - 22;
    rightGoal.y = 124;
    rightGoal.tint = 0xecf7ff;
    rightGoal.alpha = 0.9;
    root.addChild(rightGoal);

    const fieldBorder = new PIXI.Sprite(PIXI.Texture.WHITE);
    fieldBorder.width = width - 24;
    fieldBorder.height = height - 24;
    fieldBorder.x = 12;
    fieldBorder.y = 12;
    fieldBorder.alpha = 0.16;
    root.addChild(fieldBorder);

    const striker = new PIXI.Container();
    const strikerBar = new PIXI.Sprite(PIXI.Texture.WHITE);
    strikerBar.anchor.set(0.5);
    strikerBar.width = 126;
    strikerBar.height = 16;
    strikerBar.tint = 0xffd447;
    striker.addChild(strikerBar);
    root.addChild(striker);

    const goalie = new PIXI.Container();
    const goalieBar = new PIXI.Sprite(PIXI.Texture.WHITE);
    goalieBar.anchor.set(0.5);
    goalieBar.width = 126;
    goalieBar.height = 16;
    goalieBar.tint = 0xff6f61;
    goalie.addChild(goalieBar);
    root.addChild(goalie);

    const ball = PIXI.Sprite.from("/assets/minigames/soccer_shootout/soccer.svg");
    ball.anchor.set(0.5);
    ball.width = 28;
    ball.height = 28;
    root.addChild(ball);

    const flash = new PIXI.Sprite(PIXI.Texture.WHITE);
    flash.width = width;
    flash.height = height;
    flash.alpha = 0;
    root.addChild(flash);

    const laneXs = [miniFoosballLaneX(0, width), miniFoosballLaneX(1, width), miniFoosballLaneX(2, width)];
    striker.x = laneXs[clampMiniFoosballLane(miniFoosballSelectedLane)];
    striker.y = height - 58;
    goalie.x = laneXs[clampMiniFoosballLane(miniFoosballGoalieLane)];
    goalie.y = 66;
    ball.x = striker.x;
    ball.y = striker.y - 24;

    miniFoosballPixiApp = app;
    miniFoosballPixiScene = {
      laneXs,
      striker,
      goalie,
      ball,
      flash,
      strikerTargetX: striker.x,
      goalieTargetX: goalie.x
    };

    miniFoosballPixiTicker = () => {
      if (!miniFoosballPixiScene) {
        return;
      }
      const scene = miniFoosballPixiScene;
      scene.striker.x += (scene.strikerTargetX - scene.striker.x) * 0.22;
      scene.goalie.x += (scene.goalieTargetX - scene.goalie.x) * 0.2;

      const tween = miniFoosballBallTween;
      if (!tween) {
        scene.ball.x += (scene.striker.x - scene.ball.x) * 0.22;
        scene.ball.y += (scene.striker.y - 24 - scene.ball.y) * 0.22;
      } else {
        const elapsed = performance.now() - tween.start;
        const t = clamp(elapsed / tween.duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        scene.ball.x = tween.fromX + (tween.toX - tween.fromX) * eased;
        scene.ball.y = tween.fromY + (tween.toY - tween.fromY) * t;
        if (t >= 1) {
          miniFoosballBallTween = null;
        }
      }

      scene.flash.alpha = Math.max(0, scene.flash.alpha - 0.02);
    };
    app.ticker.add(miniFoosballPixiTicker);
  } catch (_error) {
    stage.innerHTML = `<div class="notice bad">Could not load Pixi foosball renderer.</div>`;
  }
}

function setMiniFoosballLane(lane, syncToServer = false) {
  miniFoosballSelectedLane = clampMiniFoosballLane(lane);
  const buttons = chests.querySelectorAll("button[data-mini-action='foos_lane']");
  buttons.forEach((button) => {
    const buttonLane = clampMiniFoosballLane(button.getAttribute("data-mini-value"));
    button.classList.toggle("selected", buttonLane === miniFoosballSelectedLane);
  });

  if (miniFoosballPixiScene) {
    miniFoosballPixiScene.strikerTargetX = miniFoosballPixiScene.laneXs[miniFoosballSelectedLane];
  }

  if (!syncToServer || !roomCode) {
    return;
  }

  socket.emit("player:minigameAction", { code: roomCode, action: "set_lane", value: { lane: miniFoosballSelectedLane } }, (res) => {
    if (res?.ok !== true) {
      setNotice(res?.message || "Could not update lane.", "bad");
    }
  });
}

function playMiniFoosballShot(lastShot, goalieLane) {
  if (!miniFoosballPixiScene || !lastShot) {
    return;
  }
  const scene = miniFoosballPixiScene;
  const lane = clampMiniFoosballLane(lastShot.lane);
  const keeperLane = clampMiniFoosballLane(goalieLane ?? lastShot.goalieLane);
  scene.goalieTargetX = scene.laneXs[keeperLane];

  miniFoosballBallTween = {
    start: performance.now(),
    duration: lastShot.goal ? 410 : 360,
    fromX: scene.striker.x,
    fromY: scene.striker.y - 24,
    toX: scene.laneXs[lane],
    toY: lastShot.goal ? 78 : 102
  };
  scene.flash.tint = lastShot.goal ? 0x52ef92 : 0xffbf59;
  scene.flash.alpha = lastShot.goal ? 0.2 : 0.14;
}

function applyMiniFoosballState(payload, options = {}) {
  const goals = Math.max(0, Number(payload?.goals ?? payload?.score?.you ?? 0));
  const botGoals = Math.max(0, Number(payload?.botGoals ?? payload?.score?.bot ?? 0));
  const shots = Math.max(0, Number(payload?.shots || 0));
  const saves = Math.max(0, Number(payload?.saves || 0));
  const accuracy = shots > 0 ? Math.round((goals / shots) * 100) : 0;
  const lane = clampMiniFoosballLane(payload?.lane);
  const goalieLane = clampMiniFoosballLane(payload?.goalieLane);
  miniFoosballGoalieLane = goalieLane;

  setMiniFoosballLane(lane, false);
  if (miniFoosballPixiScene) {
    miniFoosballPixiScene.goalieTargetX = miniFoosballPixiScene.laneXs[goalieLane];
  }

  const scoreEl = document.getElementById("miniFoosScore");
  const statsEl = document.getElementById("miniFoosStats");
  const lastEl = document.getElementById("miniFoosLast");
  if (scoreEl) {
    scoreEl.textContent = `You ${goals} - ${botGoals} Bot`;
  }
  if (statsEl) {
    statsEl.textContent = `${shots} shots | ${accuracy}% accuracy | ${saves} saves`;
  }
  if (lastEl) {
    lastEl.textContent = miniFoosballEventText(payload);
  }

  const shotSeq = Number(payload?.lastShot?.seq || 0);
  if (shotSeq > miniFoosballShotSeq) {
    miniFoosballShotSeq = shotSeq;
    playMiniFoosballShot(payload.lastShot, goalieLane);
    if (payload.lastShot?.goal) {
      setNotice("Goal! Keep pressing the advantage.", "good");
      playMiniGameSfx("goal");
    } else {
      setNotice("Saved. Switch lane or power and shoot again.", "");
      playMiniGameSfx("save");
    }
  } else if (options.forceSummaryText) {
    setNotice("Foosball live: move lane with arrow keys and press Space to shoot.", "");
  }

  if (payload?.completed) {
    chests.querySelectorAll("button[data-mini-action='foos_lane']").forEach((btn) => {
      btn.disabled = true;
    });
    const kickButton = document.getElementById("miniFoosKickBtn");
    if (kickButton) {
      kickButton.disabled = true;
    }
  }
}

function renderMiniGame(type, data, actionLabel) {
  stopMiniTickers();
  activeMiniGameType = type;
  applyMiniTutorialButtonVisibility(type);

  if (type === "foosball_frenzy") {
    miniFoosballSelectedLane = clampMiniFoosballLane(data?.lane);
    miniFoosballGoalieLane = clampMiniFoosballLane(data?.goalieLane);
    miniFoosballShotSeq = Number(data?.lastShot?.seq || 0);
    chests.innerHTML = `
      <div class="chest mini-foosball-chest">
        <h4>Foosball Frenzy</h4>
        <p class="help">Move lanes with <strong>Left/Right</strong> then shoot with <strong>Space</strong>.</p>
        <div id="miniFoosScore" class="notice">You 0 - 0 Bot</div>
        <div id="miniFoosStats" class="help">0 shots | 0% accuracy | 0 saves</div>
        <div id="miniFoosballStage" class="mini-foosball-stage"></div>
        <div class="mini-foosball-controls">
          <label for="miniFoosPower">Power</label>
          <input id="miniFoosPower" type="range" min="1" max="3" value="2" />
          <div class="answers mini-foosball-lanes">
            <button class="answer" data-mini-action="foos_lane" data-mini-value="0">Left</button>
            <button class="answer" data-mini-action="foos_lane" data-mini-value="1">Center</button>
            <button class="answer" data-mini-action="foos_lane" data-mini-value="2">Right</button>
          </div>
          <button id="miniFoosKickBtn" class="answer" data-mini-action="foos_kick">${escapeHtml(actionLabel || "Kick")} (Space)</button>
        </div>
        <div id="miniFoosLast" class="help">Get ready to score.</div>
      </div>`;
    initMiniFoosballPixi();
    applyMiniFoosballState(data, { forceSummaryText: true });
    return;
  }

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
  latestLeaderboardRows = Array.isArray(players) ? players.slice() : [];
  if (isFishingMode()) {
    syncFishingRankCard(latestLeaderboardRows);
    if (String(phase || "").toLowerCase() === "finished") {
      renderFishingFinalWinner(latestLeaderboardRows);
    }
  }

  if (!Array.isArray(players) || players.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="help">No players yet.</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = players
    .map((player) => {
      const isYou = player.id === socket.id;
      const displayBlook = renderBlookWithEffect(player.blook, player.effectId);
      return `
      <tr>
        <td>${player.rank}</td>
        <td>
          <span class="blook-name-stack">
            <span class="blook-top-icon" style="overflow:visible;height:auto;width:auto">${displayBlook}</span>
            <span class="player-label" style="margin-left:8px">${escapeHtml(player.name)}</span>
            ${isYou ? `<span class="player-tag">You</span>` : ""}
          </span>
        </td>
        <td>${isFishingMode() ? formatWeightLbs(player.score) : player.score}</td>
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

function joinAccountKey() {
  return roomSettings.allowStudentAccounts === false ? "" : getOrCreateAccountKey();
}

function effectiveJoinBlookId() {
  return selectedBlookId || "sports-soccer-star";
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

function showPackOpenAnimation(blook) {
  if (!packOpenAnimation || !blook) {
    return;
  }

  if (packOpenAnimationTimer) {
    clearTimeout(packOpenAnimationTimer);
    packOpenAnimationTimer = null;
  }

  const display = renderBlookWithEffect(blook, selectedEffectId);
  packOpenAnimation.innerHTML = `
    <div class="pack-open-shell">
      <div class="pack-open-seal">Opening...</div>
      <div class="pack-open-reveal">
        ${display}
        <strong>${escapeHtml(blook.name || "Blook")}</strong>
        <span>${escapeHtml(blook.rarity || "Common")}</span>
      </div>
    </div>`;

  packOpenAnimation.classList.remove("hidden", "revealed");
  requestAnimationFrame(() => {
    packOpenAnimation.classList.add("revealed");
  });

  packOpenAnimationTimer = setTimeout(() => {
    packOpenAnimation.classList.add("hidden");
    packOpenAnimation.classList.remove("revealed");
    packOpenAnimationTimer = null;
  }, 2600);
}

function getPackById(packId) {
  return blookPacks.find((pack) => pack.id === packId) || null;
}

function clonePackRows(packs) {
  return (Array.isArray(packs) ? packs : []).map((pack) => ({
    ...pack,
    blooks: Array.isArray(pack?.blooks) ? pack.blooks.map((blook) => ({ ...blook })) : []
  }));
}

function mergeCatalogPackStats(packSummaries) {
  const summaries = Array.isArray(packSummaries) ? packSummaries : [];
  const summaryById = new Map(summaries.map((pack) => [pack.id, pack]));
  return clonePackRows(catalogPacks).map((pack) => {
    const summary = summaryById.get(pack.id);
    return summary
      ? {
          ...pack,
          ...summary,
          blooks: Array.isArray(pack.blooks) ? pack.blooks.map((blook) => ({ ...blook })) : []
        }
      : pack;
  });
}

function fallbackInventoryRows() {
  return blookPacks.flatMap((pack) =>
    (Array.isArray(pack?.blooks) ? pack.blooks : []).map((blook) => ({
      ...blook,
      packId: blook.packId || pack.id,
      packName: blook.packName || pack.name,
      count: Math.max(1, Number(blook.count || 1)),
      duplicates: Math.max(0, Number(blook.duplicates || 0)),
      sellValueEach: Math.max(0, Number(blook.sellValueEach || pack.sellValueEach || 0))
    }))
  );
}

function getInventoryRows() {
  if (Array.isArray(accountData?.inventory) && accountData.inventory.length > 0) {
    return accountData.inventory;
  }
  return fallbackInventoryRows();
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

function pickRandomOwnedBlookIdForPack(packId) {
  const owned = getInventoryRows().filter((entry) => entry.packId === packId);
  if (!Array.isArray(owned) || owned.length === 0) {
    return "";
  }
  const index = Math.floor(Math.random() * owned.length);
  return owned[index]?.id || "";
}

function syncSelectedBlook() {
  const owned = getOwnedBlookById(selectedBlookId) || getInventoryRows()[0] || null;
  if (owned) {
    selectedBlookId = owned.id;
    if (pickedBlook) {
      const display = renderBlookWithEffect(owned, selectedEffectId);
      pickedBlook.innerHTML = `
        <div class="selected-blook-preview">
          <div class="selected-blook-row">
            ${display}
          <div class="selected-blook-meta">
            <strong>${escapeHtml(owned.name)}</strong>
            <span class="help">${escapeHtml(owned.packName)} | ${escapeHtml(owned.rarity)}</span>
            <span class="help">Join uses a random avatar from your selected pack.</span>
          </div>
        </div>
        <span class="selected-blook-ready">Ready!</span>
      </div>`;
    }
  } else {
    selectedBlookId = "";
    if (pickedBlook) {
      pickedBlook.textContent = "No blooks available right now.";
    }
  }
}

function renderPackTabs() {
  if (!packTabs) return;
  if (!Array.isArray(blookPacks) || blookPacks.length === 0) {
    packTabs.innerHTML = `<span class="help">No packs available.</span>`;
    return;
  }

  const preferredPackOrder = ["superheroes", "athletes", "sports", "anime", "books", "science", "nature"];
  const orderIndex = new Map(preferredPackOrder.map((id, index) => [id, index]));
  const sortedPacks = blookPacks.slice().sort((left, right) => {
    const leftIdx = orderIndex.has(left.id) ? orderIndex.get(left.id) : preferredPackOrder.length + 1;
    const rightIdx = orderIndex.has(right.id) ? orderIndex.get(right.id) : preferredPackOrder.length + 1;
    if (leftIdx !== rightIdx) {
      return leftIdx - rightIdx;
    }
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  const packButtons = sortedPacks.map((pack) => {
    const selectedClass = pack.id === selectedPackId ? "pack-tab selected" : "pack-tab";
    const total = Math.max(1, Number(pack.totalCount || 1));
    const unlocked = Math.max(0, Number(pack.ownedCount || total));
    const badge = pack.id === "superheroes" ? `<span class="pack-tab-badge">NEW</span>` : "";
    const availabilityText = ALL_BLOOKS_AVAILABLE ? `${total}/${total} available` : `${unlocked}/${total} unlocked`;
    return `<button type="button" class="${selectedClass}" data-pack-id="${pack.id}">
      ${escapeHtml(pack.name)}<br />
      ${badge}
      <span class="help">${availabilityText}</span>
    </button>`;
  }).join("");

  const effectBtnClass = selectedPackId === "effects" ? "pack-tab selected" : "pack-tab";
  const effectBtn = `<button type="button" class="${effectBtnClass}" data-pack-id="effects" style="background:linear-gradient(135deg,#34d7c6,#28cad7);color:#fff">
    Effects Picker<br />
    <span class="help">Apply auras</span>
  </button>`;

  packTabs.innerHTML = packButtons + effectBtn;
}

function renderBlookGrid() {
  if (selectedPackId === "effects") {
    renderEffectGrid();
    return;
  }

  const pack = getPackById(selectedPackId);
  if (!pack) {
    blookGrid.innerHTML = `<span class="help">Select a pack.</span>`;
    return;
  }

  const ownedInPack = getInventoryRows().filter((entry) => entry.packId === pack.id);
  const unlockedTiles = ownedInPack
    .map((blook) => {
      const isSelected = blook.id === selectedBlookId;
      const selectedClass = isSelected ? "blook-tile selected" : "blook-tile";
      const duplicateSuffix = blook.duplicates > 0 ? ` x${blook.count}` : "";
      const display = renderBlookWithEffect(blook, selectedEffectId);
      const readyBanner = isSelected ? `<span class="blook-ready-banner">Ready!</span>` : "";
      return `
      <button type="button" class="${selectedClass}" data-blook-id="${blook.id}">
        ${display}
        <span class="blook-name">${escapeHtml(blook.name)}${escapeHtml(duplicateSuffix)}</span>
        <span class="blook-rarity">${escapeHtml(blook.rarity || "Common")}</span>
        ${readyBanner}
      </button>`;
    })
    .join("");

  blookGrid.innerHTML = unlockedTiles || `<span class="help">No blooks in this pack.</span>`;
}

function renderEffectGrid() {
  if (!blookGrid) return;
  const tiles = blookEffects.map(fx => {
    const selectedClass = fx.id === selectedEffectId ? "effect-tile selected" : "effect-tile";
    return `
      <button type="button" class="${selectedClass}" data-effect-id="${fx.id}">
        <span class="effect-icon">${escapeHtml(fx.icon)}</span>
        <span class="effect-name">${escapeHtml(fx.name)}</span>
        <span class="blook-rarity" style="font-size:0.7rem">${escapeHtml(fx.description)}</span>
      </button>`;
  }).join("");
  blookGrid.innerHTML = tiles || `<span class="help">No effects available.</span>`;
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
    openPackBtn.hidden = ALL_BLOOKS_AVAILABLE;
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
    sellDuplicateBtn.hidden = ALL_BLOOKS_AVAILABLE;
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
    accountCoins.textContent = ALL_BLOOKS_AVAILABLE ? "ALL" : String(Math.max(0, Number(accountData?.coins || 0)));
  }
  if (accountFreeOpen) {
    accountFreeOpen.textContent = ALL_BLOOKS_AVAILABLE
      ? "ALL"
      : String(Math.max(0, Number(accountData?.freePackOpensRemaining || 0)));
  }
  renderPackTabs();
  renderBlookGrid();
  updatePackOdds();
  updateEconomyButtons();
  syncSelectedBlook();
}

function applyPublicBlookCatalog(payload) {
  catalogPacks = clonePackRows(Array.isArray(payload?.packs) ? payload.packs : []);
  blookEffects = Array.isArray(payload?.effects) ? payload.effects : blookEffects;
  if (accountData?.packs) {
    blookPacks = mergeCatalogPackStats(accountData.packs);
  } else {
    blookPacks = clonePackRows(catalogPacks);
  }

  const defaultPackId = blookPacks[0]?.id || "";
  if (!selectedPackId || !getPackById(selectedPackId)) {
    selectedPackId = defaultPackId;
  }
  if (!selectedBlookId) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(selectedPackId) || getInventoryRows()[0]?.id || "";
  }
  renderEconomyPanel();
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
  blookPacks = mergeCatalogPackStats(Array.isArray(accountData?.packs) ? accountData.packs : []);
  blookEffects = Array.isArray(accountData?.effects) ? accountData.effects : [];
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

async function loadPublicBlooks() {
  const response = await fetch("/api/blooks");
  const payload = await response.json();
  if (!response.ok || !payload?.packs) {
    throw new Error(payload?.message || "Blook catalog load failed");
  }
  applyPublicBlookCatalog(payload);
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
    const rewardDisplay = getOwnedBlookById(reward.id) || reward;
    showPackOpenAnimation(rewardDisplay);
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
    await loadPublicBlooks();
  } catch (_error) {
    blookPacks = [];
    catalogPacks = [];
    selectedPackId = "";
    selectedBlookId = "";
    setJoinNotice("Could not load the blook catalog. Refresh and try again.", "bad");
    if (packTabs) {
      packTabs.innerHTML = `<span class="help">Blook catalog unavailable.</span>`;
    }
    if (blookGrid) {
      blookGrid.innerHTML = `<span class="help">No blooks available.</span>`;
    }
    return;
  }

  try {
    await loadAccount();
    if (packResult) {
      packResult.classList.add("hidden");
    }
  } catch (_error) {
    accountData = null;
    blookPacks = clonePackRows(catalogPacks);
    const defaultPackId = blookPacks[0]?.id || "";
    if (!selectedPackId || !getPackById(selectedPackId)) {
      selectedPackId = defaultPackId;
    }
    if (!selectedBlookId) {
      selectedBlookId = pickFirstOwnedBlookIdForPack(selectedPackId) || getInventoryRows()[0]?.id || "";
    }
    renderEconomyPanel();
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
  setQuestionMediaImage(questionMedia, payload.question.image, payload.question.prompt);

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
    { code: roomCode, name: playerName, blookId: effectiveJoinBlookId(), accountKey: joinAccountKey() },
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
      currentMode = String(res.mode || currentMode || "classic").toLowerCase();
      if (res.playerName) {
        playerName = String(res.playerName);
      }
      if (res.settings) {
        applyRoomSettings(res.settings);
      }
      if (res.account) {
        applyAccount(res.account, getOrCreateAccountKey());
      }
      playerNameEl.textContent = `${activeBlook.icon || "?"} ${playerName}`;
      updateFishingHudIdentity();
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

if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", () => {
    setSoundEnabled(!soundEnabled);
  });
}

if (miniTutorialBtn) {
  miniTutorialBtn.addEventListener("click", () => {
    if (!activeMiniGameType) {
      return;
    }
    openMiniTutorial(activeMiniGameType, { force: true });
  });
}

if (miniTutorialCloseBtn) {
  miniTutorialCloseBtn.addEventListener("click", () => {
    hideMiniTutorialOverlay();
  });
}

if (miniTutorialOverlay) {
  miniTutorialOverlay.addEventListener("click", (event) => {
    if (event.target === miniTutorialOverlay) {
      hideMiniTutorialOverlay();
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
    selectedBlookId = "sports-soccer-star";
  }

  const joinPackId = selectedPackId === "effects"
    ? (getOwnedBlookById(selectedBlookId)?.packId || "")
    : selectedPackId;
  const randomJoinBlookId = pickRandomOwnedBlookIdForPack(joinPackId) || effectiveJoinBlookId();
  if (randomJoinBlookId) {
    selectedBlookId = randomJoinBlookId;
    syncSelectedBlook();
    renderBlookGrid();
  }

  socket.emit("player:join", {
    code,
    name,
    blookId: randomJoinBlookId || effectiveJoinBlookId(),
    packId: joinPackId,
    effectId: selectedEffectId,
    accountKey: joinAccountKey()
  }, (res) => {
    if (!res?.ok) {
      setJoinNotice(res?.message || "Unable to join room.", "bad");
      return;
    }

    roomCode = res.code;
    currentReportCode = "";
    playerName = String(res.playerName || name);
    currentMode = String(res.mode || currentMode || "classic").toLowerCase();
    const activeBlook = res.blook || { icon: "?", name: "Random Blook" };
    if (res.settings) {
      applyRoomSettings(res.settings);
    }
    if (res.account) {
      applyAccount(res.account, getOrCreateAccountKey());
    }

    roomCodeEl.textContent = roomCode;
    playerNameEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;transform:scale(0.85);transform-origin:left">
        ${renderBlookWithEffect(activeBlook, res.player?.effectId || selectedEffectId)}
        <span style="font-size:1.4rem;font-weight:700">${escapeHtml(playerName)}</span>
      </div>`;
    updateFishingHudIdentity();

    joinCard.classList.add("hidden");
    playCard.classList.remove("hidden");

    const joinedPhase = res.phase || "lobby";
    const phaseDetail =
      joinedPhase === "lobby" ? "Joined lobby. Waiting for host to start." : "Joined in progress. Syncing live phase now.";
    setPhase(joinedPhase, phaseDetail);
    if (roomSettings.allowStudentAccounts === false) {
      setJoinNotice(`Joined as ${playerName}. Account features are disabled for this game.`, "good");
    } else {
      setJoinNotice(`Locked in ${activeBlook.name || "Blook"}.`, "good");
    }
    if (joinedPhase === "lobby") {
      setNotice(`Joined room ${roomCode}. Waiting for host to start.`, "good");
    } else {
      setNotice(`Joined room ${roomCode} in progress. Syncing to current phase...`, "good");
    }
  });
});

maybeAutoJoinFromQuery();

packTabs.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-pack-id]");
  if (!button) return;

  const packId = button.dataset.packId;
  if (packId === "effects") {
    selectedPackId = "effects";
    renderEconomyPanel();
    return;
  }

  const pack = getPackById(packId);
  if (!pack) return;

  selectedPackId = pack.id;
  const packOwnedBlookId = pickRandomOwnedBlookIdForPack(pack.id);
  if (packOwnedBlookId) {
    selectedBlookId = packOwnedBlookId;
  } else if (!selectedBlookId || !getOwnedBlookById(selectedBlookId)) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(pack.id) || selectedBlookId;
  }
  renderEconomyPanel();
});

blookGrid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const button = target.closest("button");
  if (!button) return;

  const blookId = button.dataset.blookId;
  const effectId = button.dataset.effectId;

  if (blookId) {
    if (!getOwnedBlookById(blookId)) return;
    const randomId = pickRandomOwnedBlookIdForPack(selectedPackId);
    selectedBlookId = randomId || blookId;
    setPackResultNotice("Pack locked. Avatar will be random when you join.", "good");
    syncSelectedBlook();
    updateEconomyButtons();
    renderBlookGrid();
  } else if (effectId) {
    selectedEffectId = effectId;
    renderEffectGrid();
    syncSelectedBlook(); // update preview with new effect
  }
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

if (fishingPlayAgainBtn) {
  fishingPlayAgainBtn.addEventListener("click", () => {
    window.location.href = "/play.html";
  });
}

if (fishingHudCode) {
  fishingHudCode.addEventListener("click", () => {
    if (String(phase || "").toLowerCase() !== "finished") {
      return;
    }
    openCurrentReportPage();
  });
  fishingHudCode.addEventListener("keydown", (event) => {
    if (String(phase || "").toLowerCase() !== "finished") {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    openCurrentReportPage();
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

  if (action === "foos_lane") {
    const lane = clampMiniFoosballLane(button.dataset.miniValue);
    setMiniFoosballLane(lane, true);
    return;
  }

  const payload = { code: roomCode, action };
  if (action === "foos_kick") {
    const powerInput = document.getElementById("miniFoosPower");
    payload.action = "kick";
    payload.value = {
      lane: miniFoosballSelectedLane,
      power: Math.max(1, Math.min(3, Math.round(Number(powerInput?.value || 2))))
    };
    const kickButton = document.getElementById("miniFoosKickBtn");
    if (kickButton) {
      kickButton.disabled = true;
      setTimeout(() => {
        if (activeMiniGameType === "foosball_frenzy") {
          kickButton.disabled = false;
        }
      }, 130);
    }
  }
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
      if (action === "foos_kick") {
        const kickButton = document.getElementById("miniFoosKickBtn");
        if (kickButton) {
          kickButton.disabled = false;
        }
      }
    }
  });
});

window.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  const tutorialOpen = miniTutorialOverlay && !miniTutorialOverlay.classList.contains("hidden");
  if (tutorialOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      hideMiniTutorialOverlay();
    }
    return;
  }
  if (phase !== "minigame") {
    return;
  }

  const isTextEntry =
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement;
  if (isTextEntry) {
    return;
  }

  if (event.key === "ArrowLeft" && activeMiniGameType === "foosball_frenzy") {
    event.preventDefault();
    setMiniFoosballLane(miniFoosballSelectedLane - 1, true);
    return;
  }

  if (event.key === "ArrowRight" && activeMiniGameType === "foosball_frenzy") {
    event.preventDefault();
    setMiniFoosballLane(miniFoosballSelectedLane + 1, true);
    return;
  }

  if (event.key !== " " && event.code !== "Space") {
    return;
  }

  if (activeMiniGameType === "soccer_shootout") {
    const kickBtn = document.getElementById("miniSoccerKickBtn");
    if (!(kickBtn instanceof HTMLButtonElement) || kickBtn.disabled) {
      return;
    }
    if (Date.now() < miniSoccerSpaceCooldownUntil) {
      return;
    }
    event.preventDefault();
    kickBtn.click();
    return;
  }

  if (activeMiniGameType === "foosball_frenzy") {
    const kickBtn = document.getElementById("miniFoosKickBtn");
    if (!(kickBtn instanceof HTMLButtonElement) || kickBtn.disabled) {
      return;
    }
    event.preventDefault();
    kickBtn.click();
  }
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

  currentMode = String(payload.mode || currentMode || "classic").toLowerCase();
  applyRoomSettings(payload.settings || {});
  setPhase("lobby", `${payload.players.length} students connected. Waiting for host.`);
  showSection(null);
  renderLeaderboard(payload.players);
  if (!Array.isArray(payload.players) || payload.players.every((row) => Number(row?.score || 0) <= 0)) {
    fishingGameEndsAt = 0;
  }
  const modeText = payload.modeName || MODE_LABELS[payload.mode] || payload.mode || "Classic Quiz";
  const quizSetText = payload.questionSetLabel || payload.questionSet || "Quiz";
  feedTitle.textContent = payload.feedTitle || "Mode Feed";
  activeEventName = payload.eventName || "Event Card";
  if (roomSettings.showInstructions === false) {
    setNotice(`Lobby active. Host: ${payload.hostName}.`);
  } else {
    setNotice(`Lobby active. Host: ${payload.hostName}. Mode: ${modeText}. Quiz: ${quizSetText}.`);
  }
});

socket.on("settings:update", (payload) => {
  if (payload?.code !== roomCode) {
    return;
  }
  applyRoomSettings(payload?.settings || {});
  const allowLateJoin = roomSettings.allowLateJoin !== false;
  if (phase !== "join" && phase !== "lobby") {
    setNotice(allowLateJoin ? "Late join unlocked by host." : "Late join locked by host.");
  }
});

socket.on("game:countdown", ({ secondsLeft, endsAt }) => {
  stopMiniTickers();
  const safeSeconds = Math.max(0, Number(secondsLeft) || 0);
  const countdownText = safeSeconds > 0 ? `Game starts in ${safeSeconds}...` : "Go! Question is starting.";
  setPhase("countdown", countdownText);
  pausedFromPhase = "";
  showSection(resultSection);
  resultText.textContent = countdownText;
  setNotice(countdownText, safeSeconds > 0 ? "" : "good");
  const countdownEndsAt = Number(endsAt || 0);
  if (Number.isFinite(countdownEndsAt) && countdownEndsAt > Date.now()) {
    startTicker(timerText, countdownEndsAt, "Starting in");
  }
});

socket.on("game:paused", ({ fromPhase }) => {
  pausedFromPhase = String(fromPhase || "");
  stopTicker();
  stopMiniTickers();
  canAnswer = false;
  setPhase("paused", `Paused during ${phaseLabel(pausedFromPhase || "game")}.`);
  setNotice("Game paused by host.", "good");
});

socket.on("game:resumed", ({ phase: resumedPhase, endsAt }) => {
  const nextPhase = String(resumedPhase || "question");
  pausedFromPhase = "";
  setPhase(nextPhase, `${phaseLabel(nextPhase)} resumed.`);
  const safeEndsAt = Number(endsAt || 0);
  if (nextPhase === "question" && safeEndsAt > Date.now()) {
    canAnswer = myAnswerIndex === null;
    startTicker(timerText, safeEndsAt, "Time left");
  }
  if (nextPhase === "minigame" && safeEndsAt > Date.now()) {
    startTicker(chestTimer, safeEndsAt, "Mini-game ends in");
  }
  setNotice(`${phaseLabel(nextPhase)} resumed.`, "good");
});

socket.on("minigame:skipped", ({ reason }) => {
  setNotice(reason || "Mini-game skipped by host.");
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
  ensureFishingGameTimerStarted();
  setPhase("question", `Question ${payload.questionIndex}/${payload.totalQuestions} is live.`);
  renderQuestion(payload);
  setNotice(
    roomSettings.showInstructions === false
      ? `Question ${payload.questionIndex}/${payload.totalQuestions} is live.`
      : `Question ${payload.questionIndex} of ${payload.totalQuestions}. Answer quickly for bonuses.`
  );
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
    hideMiniTutorialOverlay();
    applyMiniTutorialButtonVisibility("");
    stopMiniTickers();
    showSection(resultSection);
    resultText.textContent = `Only students who answered correctly are in ${activeEventName}.`;
    setNotice(roomSettings.showInstructions === false ? "Mini-game in progress." : "Answer correctly to enter the next mini-game round.");
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
  openMiniTutorial(type);
  setNotice(roomSettings.showInstructions === false ? "Mini-game started." : "Play the mini-game for bonus points.");
});

socket.on("minigame:state", (payload) => {
  if (payload.type === "foosball_frenzy") {
    applyMiniFoosballState(payload, { forceSummaryText: false });
    return;
  }

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
      `Coins earned +${reward.total} | Participation ${reward.breakdown?.participation || 0}, Correct ${reward.breakdown?.correct || 0}, Score ${reward.breakdown?.score || 0
      }, Rank ${reward.breakdown?.rank || 0}.`,
      "good"
    );
  }
});

socket.on("game:finished", ({ leaderboard, reportCode }) => {
  stopMiniTickers();
  fishingGameEndsAt = Date.now();
  currentReportCode = String(reportCode || roomCode || "").toUpperCase().trim();
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
    maybeAutoJoinFromQuery();
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

loadSoundPreference();
applySoundToggleUi();
loadMiniTutorialProgress();
setupSfxUnlockListeners();
applyMiniTutorialButtonVisibility("");
applyRoomSettings(roomSettings);
loadBlooks();
loadMiniGames();
loadActiveRoomCode();
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

function clampBlookImageScale(scale) {
  const value = Number(scale);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0.75, Math.min(1.2, value));
}

function blookImagePresentation(blook) {
  const safeBlook = blook && typeof blook === "object" ? blook : {};
  const id = String(safeBlook.id || "");
  const packId = String(safeBlook.packId || "").toLowerCase();
  const imagePath = String(safeBlook.image || "").toLowerCase();

  const specific = BLOOK_IMAGE_POSITION_OVERRIDES[id];
  if (specific) {
    return {
      position: String(specific.position || ""),
      scale: clampBlookImageScale(specific.scale)
    };
  }

  const isSuperhero = packId === "superheroes" || imagePath.includes("/assets/superheroes/");
  if (isSuperhero) {
    return {
      position: "center 10%",
      scale: 0.95
    };
  }

  return {
    position: "",
    scale: 1
  };
}

function blookImageStyleAttribute(blook) {
  const presentation = blookImagePresentation(blook);
  const parts = [];
  if (presentation.position) {
    parts.push(`--blook-image-position:${presentation.position}`);
  }
  if (Math.abs(Number(presentation.scale || 1) - 1) > 0.001) {
    parts.push(`--blook-image-scale:${clampBlookImageScale(presentation.scale)}`);
  }
  if (parts.length === 0) {
    return "";
  }
  return ` style="${escapeHtml(parts.join(";"))}"`;
}

function handleBlookImageError(img) {
  if (!img) {
    return;
  }
  img.classList.add("hidden");
  const fallback = img.parentElement?.querySelector(".blook-emoji");
  if (fallback) {
    fallback.classList.remove("hidden");
  }
}

function handleBlookImageLoad(img) {
  if (!img) {
    return;
  }
  img.classList.remove("hidden");
  const fallback = img.parentElement?.querySelector(".blook-emoji");
  if (fallback) {
    fallback.classList.add("hidden");
  }
}

window.handleBlookImageError = handleBlookImageError;
window.handleBlookImageLoad = handleBlookImageLoad;

function renderBlookWithEffect(blook, effectId) {
  if (!blook) return `<span class="blook-emoji">?</span>`;
  const aura = effectId && effectId !== "fx-none" ? `<div class="blook-aura ${escapeHtml(effectId)}"></div>` : "";
  const styleAttribute = blookImageStyleAttribute(blook);
  const content = blook.image
    ? `<img src="${escapeHtml(blook.image)}" class="blook-image" alt="${escapeHtml(blook.name)}"${styleAttribute} onload="window.handleBlookImageLoad(this)" onerror="window.handleBlookImageError(this)" /><span class="blook-emoji hidden">${escapeHtml(blook.icon || "?")}</span>`
    : `<span class="blook-emoji">${escapeHtml(blook.icon || "?")}</span>`;

  return `<div class="blook-container">${aura}${content}</div>`;
}

