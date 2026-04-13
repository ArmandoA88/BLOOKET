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
const MODE_LABELS = {
  classic: "Foosball",
  gold: "Tower Stacker",
  crypto: "Crypto Hack",
  fishing: "Fishing Frenzy",
  asteroids: "Asteroids",
  brawl: "Space Invaders"
};
const SHARED_MINI_GAME_VISUALS = window.MINI_GAME_VISUALS || {};
const SHARED_MINI_GAME_IMAGE_MAP = window.MINI_GAME_IMAGE_MAP || {};
const GAME_IMAGE_MAP = {
  question: "/assets/minigames/shared/question.svg",
  ...SHARED_MINI_GAME_IMAGE_MAP
};
const SOUND_PREF_STORAGE_KEY = "quizArenaSoundEnabled";
const MINI_TUTORIAL_STORAGE_KEY = "quizArenaMiniTutorialSeen";
const PHASE_BANNER_COPY = {
  join: {
    title: "Join Screen",
    detail: "Log in and enter the game code."
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
const studentLoginUsernameInput = document.getElementById("studentLoginUsername");
const studentLoginPasswordInput = document.getElementById("studentLoginPassword");
const studentLoginBtn = document.getElementById("studentLoginBtn");
const studentLogoutBtn = document.getElementById("studentLogoutBtn");
const studentLoginCard = document.getElementById("studentLoginCard");
const studentLoginSummary = document.getElementById("studentLoginSummary");
const studentLoginGreeting = document.getElementById("studentLoginGreeting");
const studentLoginGreetingTitle = document.getElementById("studentLoginGreetingTitle");
const studentLoginGreetingMeta = document.getElementById("studentLoginGreetingMeta");
const studentLoginNotice = document.getElementById("studentLoginNotice");
const accountPanel = document.getElementById("accountPanel");
const accountPolicyNotice = document.getElementById("accountPolicyNotice");
const storeLinkBtn = document.getElementById("storeLinkBtn");
const storeHint = document.getElementById("storeHint");
const packTabs = document.getElementById("packTabs");
const blookGrid = document.getElementById("blookGrid");
const pickedBlook = document.getElementById("pickedBlook");
const accountCoins = document.getElementById("accountCoins");
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
const asteroidsQuestionStage = document.getElementById("asteroidsQuestionStage");
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
const MINI_HALLWAY_LANE_LABELS = ["Left", "Center", "Right"];
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
  tower_stacker: {
    intro: "Build a cute tower one drop at a time. Pick a theme, then press Space or tap to drop the next piece.",
    steps: [
      "Choose Cats, Dogs, Ducks, or Pandas before your first drop.",
      "Wait for the piece to glide across the top, then press Space, click Drop, or tap the stage.",
      "Perfect placements keep your combo alive and help the tower stay stable."
    ]
  },
  foosball_frenzy: {
    intro: "The foosball lines stay in formation. Slide laterally, score fast, and chase the top class score.",
    steps: [
      "Use Left and Right arrows or the lane buttons to slide your bars side to side.",
      "Your players stay fixed on each rod like a real foosball table.",
      "Press Space or Kick to shoot before the moving keeper closes your lane."
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
  goalie_rush: {
    intro: "Slide across the goal mouth and get in front of each incoming shot before it reaches the line.",
    steps: [
      "Use Left and Right arrows or the lane buttons to move between the three goal lanes.",
      "Shots get faster every round, so recenter quickly after each save or goal.",
      "Every fifth shot is a boss round. Block it to bank bonus coins for your student account."
    ]
  },
  snake: {
    intro: "Use simple turns to guide the snake, collect snacks, and avoid walls or your own tail.",
    steps: [
      "Use Arrow keys or WASD to turn up, down, left, or right.",
      "Plan one move ahead because you cannot reverse straight into your own body.",
      "Each snack grows the snake, so the path gets tighter as the round goes on."
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
  },
  hallway_dash: {
    intro: "Sprint down the school hallway, swap lanes fast, jump hazards, and scoop up coins.",
    steps: [
      "Use Left and Right arrows or A and D to change lanes.",
      "Press Space, Up, or W to jump over cones, backpacks, and puddles.",
      "Grab coin spills in your lane and avoid three hits before the timer ends."
    ]
  },
  dino_dig: {
    intro: "Dig through the fossil field to uncover fossils, coins, old bones, and a possible rare dinosaur blook.",
    steps: [
      "Tap a dig tile to reveal what is buried there.",
      "Fossils and coin caches boost your round, while bones are smaller finds.",
      "A rare dinosaur blook tile is the jackpot, so keep digging until your digs run out."
    ]
  },
  shadow_match: {
    intro: "Flip hidden blooks, remember their spots, and build streaks to unlock rarer bonus packs.",
    steps: [
      "Tap two cards at a time to reveal the hidden blooks underneath.",
      "Matching pairs build your streak and unlock stronger bonus pack rewards.",
      "A miss resets your streak, so use memory and speed together before time runs out."
    ]
  },
  classroom_cleanup: {
    intro: "Move across classroom rows and sort falling clutter into the correct spot before it hits the floor.",
    steps: [
      "Use Left and Right arrows or A and D to move to the row under the falling item.",
      "Press 1 or B for books, 2 or P for pencils, and 3 or T for trash.",
      "Correct sorts build combo points, but missed or wrong-bin sorts cost you score."
    ]
  },
  battle_royale: {
    intro: "Battle your opponent in fast 1v1 turns using the blook you joined with.",
    steps: [
      "Each turn, choose Attack, Guard, Heal, or your blook's special power.",
      "Guard adds shield before damage lands, while Heal restores HP right away.",
      "Special powers are stronger, but they need a short recharge before you can use them again."
    ]
  }
};

const JOIN_ACK_TIMEOUT_MS = 8000;

let activeMiniGameType = "";
let miniPrecisionValue = 0;
let miniPrecisionDirection = 1;
let miniPrecisionTicker = null;
let miniReactionTicker = null;
let reconnecting = false;
let reconnectJoinPending = false;
let reconnectRetryCount = 0;
let joinRequestPending = false;
let studentAuthLoaded = false;
let studentAuthBusy = false;
let studentAuthEnabled = true;
let loggedInStudent = null;
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
let miniSnakeState = null;
let miniSnakeCanvas = null;
let miniSnakeCtx = null;
let miniSnakeAnimationFrame = 0;
let miniSnakeLastEventSeq = 0;
let miniTowerStackerState = null;
let miniTowerStackerCanvas = null;
let miniTowerStackerCtx = null;
let miniTowerStackerAnimationFrame = 0;
let miniTowerStackerLastEventSeq = 0;
let miniTowerStackerCameraTop = 0;
let miniHallwayDashState = null;
let miniHallwayDashLastEventSeq = 0;
let miniGoalieRushState = null;
let miniGoalieRushLastEventSeq = 0;
let miniDinoDigState = null;
let miniDinoDigLastRevealSeq = 0;
let miniShadowMatchState = null;
let miniShadowMatchLastMoveSeq = 0;
let miniShadowMatchPreviewTimer = null;
let miniClassroomCleanupState = null;
let miniClassroomCleanupLastEventSeq = 0;
let miniBattleRoyaleState = null;
let miniBattleRoyaleTicker = null;
let miniBattleRoyaleLastResolutionSeq = 0;
let asteroidRoundState = null;
let latestLeaderboardRows = [];
let fishingGameEndsAt = 0;
let fishingHudTicker = null;
let currentReportCode = "";
let packOpenAnimationTimer = null;
let soundEnabled = true;
let sfxAudioContext = null;
let sfxCooldownUntil = Object.create(null);
let miniTutorialSeen = new Set();
let activeMiniTutorialType = "";
let tickerWarningSecond = null;
let miniReactionGoCuePlayed = false;
let miniTapLastCount = 0;
let miniSequenceLastProgress = 0;
let miniObstacleLastStep = 0;
let miniObstacleLastHits = 0;
let miniScrambleLastAttempts = 0;

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
  { id: "foosball_frenzy", name: "Foosball Frenzy", description: "Foosball bars stay in formation. Slide laterally, score fast, and race the class leaderboard." },
  { id: "soccer_shootout", name: "Soccer Shootout", description: "Penalty kicks with lane + power choice." },
  { id: "goalie_rush", name: "Goalie Rush", description: "Guard the goal, block faster shots each round, and survive boss rounds for extra coins." },
  { id: "snake", name: "Snake Strategy", description: "Simple controls, careful turns, and growing path strategy." },
  { id: "tower_stacker", name: "Tower Stacker", description: "Drop cute themed pieces and build a happy tower." },
  { id: "tap_rush", name: "Tap Rush", description: "Tap fast for bonus points." },
  { id: "reaction_duel", name: "Reaction Duel", description: "Wait for GO and react fast." },
  { id: "sequence_memory", name: "Sequence Memory", description: "Repeat the color order to score." },
  { id: "obstacle_dodge", name: "Obstacle Dodge", description: "Pick safe lanes across turns." },
  { id: "precision_stop", name: "Precision Stop", description: "Stop the marker near the target zone." },
  { id: "word_scramble", name: "Word Scramble", description: "Unscramble words before attempts run out." },
  { id: "hallway_dash", name: "Hallway Dash", description: "Race through a school hallway, dodge clutter, jump hazards, and collect coins." },
  { id: "dino_dig", name: "Dino Dig", description: "Dig tiles to uncover fossils, bones, coin caches, and maybe a rare dinosaur blook." },
  { id: "shadow_match", name: "Shadow Match", description: "Flip hidden blooks, match the pairs, and unlock better reward packs with streaks." },
  { id: "classroom_cleanup", name: "Classroom Cleanup", description: "Move between classroom rows and sort books, pencils, and trash before time runs out." },
  { id: "battle_royale", name: "Battle Royale", description: "Simple 1v1 blook battles where every selected blook gets a small power." }
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

function shouldShowAllBlooks() {
  return roomSettings.allowStudentAccounts === false;
}

const pageParams = new URLSearchParams(window.location.search);
const prefilledCode = pageParams.get("code");
const prefilledName = String(pageParams.get("name") || "").trim().slice(0, 24);
const shouldAutoJoinFromQuery = ["1", "true", "yes", "on"].includes(String(pageParams.get("autojoin") || "").toLowerCase());
const catalogViewRequested = ["1", "true", "yes", "on"].includes(String(pageParams.get("catalog") || "").toLowerCase());
const previewGuestJoinRequested = ["1", "true", "yes", "on"].includes(String(pageParams.get("previewGuest") || "").toLowerCase());
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
  if (!studentAuthLoaded) {
    return;
  }
  if (roomCode || joinCard.classList.contains("hidden")) {
    return;
  }

  const code = sanitizeRoomCode(codeInput?.value || "");
  const name = String(nameInput?.value || "").trim();
  if (!canJoinCurrentRoom()) {
    if (code.length === 6) {
      setJoinNotice(`Log in first to join room ${code}.`, "bad");
    }
    return;
  }
  if (code.length !== 6 || !name) {
    return;
  }
  if (!socket.connected) {
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

function canPlaySfx(key, cooldownMs = 0) {
  const safeCooldown = Math.max(0, Number(cooldownMs) || 0);
  if (safeCooldown <= 0) {
    return true;
  }
  const now = Date.now();
  if (Number(sfxCooldownUntil[key] || 0) > now) {
    return false;
  }
  sfxCooldownUntil[key] = now + safeCooldown;
  return true;
}

function playMiniGameSfx(eventType, options = {}) {
  if (!soundEnabled) {
    return;
  }
  const key = String(eventType || "").toLowerCase();
  if (!key || !canPlaySfx(key, options?.cooldownMs)) {
    return;
  }
  const ctx = ensureSfxAudioContext();
  if (!ctx || ctx.state !== "running") {
    return;
  }

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
  if (key === "start") {
    playSfxTone(ctx, 520, 70, 0.03, "triangle");
    playSfxTone(ctx, 660, 90, 0.034, "triangle", 70);
    return;
  }
  if (key === "select") {
    playSfxTone(ctx, 430, 45, 0.02, "square");
    playSfxTone(ctx, 560, 65, 0.018, "triangle", 35);
    return;
  }
  if (key === "tap") {
    playSfxTone(ctx, 560, 30, 0.018, "square");
    return;
  }
  if (key === "progress") {
    playSfxTone(ctx, 620, 65, 0.024, "triangle");
    return;
  }
  if (key === "go") {
    playSfxTone(ctx, 880, 80, 0.03, "square");
    playSfxTone(ctx, 1120, 100, 0.026, "triangle", 75);
    return;
  }
  if (key === "correct") {
    playSfxTone(ctx, 540, 70, 0.03, "triangle");
    playSfxTone(ctx, 720, 100, 0.034, "triangle", 60);
    playSfxTone(ctx, 960, 130, 0.036, "triangle", 140);
    return;
  }
  if (key === "complete") {
    playSfxTone(ctx, 520, 75, 0.028, "triangle");
    playSfxTone(ctx, 660, 95, 0.032, "triangle", 65);
    playSfxTone(ctx, 840, 120, 0.034, "triangle", 145);
    return;
  }
  if (key === "reward") {
    playSfxTone(ctx, 660, 80, 0.028, "triangle");
    playSfxTone(ctx, 990, 110, 0.034, "triangle", 70);
    playSfxTone(ctx, 1320, 145, 0.036, "triangle", 150);
    return;
  }
  if (key === "unlock") {
    playSfxTone(ctx, 460, 75, 0.028, "triangle");
    playSfxTone(ctx, 690, 100, 0.032, "triangle", 70);
    playSfxTone(ctx, 1040, 160, 0.038, "triangle", 150);
    return;
  }
  if (key === "miss") {
    playSfxTone(ctx, 260, 100, 0.03, "triangle");
    playSfxTone(ctx, 200, 120, 0.024, "square", 70);
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

function requiresStudentLogin() {
  return studentAuthEnabled !== false && !previewGuestJoinRequested;
}

function canJoinCurrentRoom() {
  return !requiresStudentLogin() || Boolean(loggedInStudent);
}

function focusStudentLoginForm() {
  if (studentLoginUsernameInput && !studentLoginUsernameInput.disabled) {
    studentLoginUsernameInput.focus();
    return;
  }
  if (studentLoginPasswordInput && !studentLoginPasswordInput.disabled) {
    studentLoginPasswordInput.focus();
  }
}

function updateJoinButtonState() {
  if (!joinBtn) {
    return;
  }

  joinBtn.disabled = joinRequestPending || !canJoinCurrentRoom();
  joinBtn.textContent = joinRequestPending ? "Joining..." : (canJoinCurrentRoom() ? "Join Game" : "Log In to Join");
}

function joinConnectionHelpText() {
  const host = String(window.location.hostname || "").toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return "Cannot reach the game server. Check that the host computer is running the server, then refresh.";
  }
  return "Cannot reach the game server. Make sure you are on the same Wi-Fi as the host, then refresh and try again.";
}

function setJoinBusy(isBusy) {
  joinRequestPending = isBusy === true;
  updateJoinButtonState();
}

function setStudentLoginBusy(isBusy) {
  studentAuthBusy = isBusy === true;
  if (studentLoginBtn) {
    studentLoginBtn.disabled = studentAuthBusy || Boolean(loggedInStudent);
    studentLoginBtn.textContent = studentAuthBusy ? "Logging In..." : (loggedInStudent ? "Logged In" : "Log In");
  }
  if (studentLogoutBtn) {
    studentLogoutBtn.disabled = studentAuthBusy;
  }
  if (studentLoginUsernameInput) {
    studentLoginUsernameInput.disabled = studentAuthBusy || Boolean(loggedInStudent);
  }
  if (studentLoginPasswordInput) {
    studentLoginPasswordInput.disabled = studentAuthBusy || Boolean(loggedInStudent);
  }
}

function setStudentLoginNotice(message, type = "") {
  if (!studentLoginNotice) {
    return;
  }
  if (!message) {
    studentLoginNotice.classList.add("hidden");
    studentLoginNotice.classList.remove("good", "bad");
    studentLoginNotice.textContent = "";
    return;
  }
  studentLoginNotice.classList.remove("hidden", "good", "bad");
  if (type) {
    studentLoginNotice.classList.add(type);
  }
  studentLoginNotice.textContent = message;
}

function renderStudentLoginState() {
  const loggedIn = Boolean(loggedInStudent);
  const previewGuest = previewGuestJoinRequested;
  if (studentLoginCard) {
    studentLoginCard.classList.toggle("hidden", previewGuest);
  }
  if (landingSub && previewGuest) {
    landingSub.textContent = "Arcade preview is loading a guest player automatically. No student login is needed here.";
  }
  if (joinCardTitle && previewGuest) {
    joinCardTitle.textContent = "Arcade Preview";
  }
  if (studentLoginSummary) {
    if (loggedIn) {
      studentLoginSummary.textContent = `Hello, ${loggedInStudent.displayName}! Your saved coins and blooks are ready, and your join name stays locked to your first name.`;
    } else if (previewGuest) {
      studentLoginSummary.textContent = "Arcade preview guest will join automatically.";
    } else if (requiresStudentLogin()) {
      studentLoginSummary.textContent = "Not logged in. Student login is required before you can join a game.";
    } else {
      studentLoginSummary.textContent = "Guest join is available right now.";
    }
  }
  if (studentLoginGreeting) {
    studentLoginGreeting.classList.toggle("hidden", !loggedIn);
  }
  if (studentLoginGreetingTitle) {
    studentLoginGreetingTitle.textContent = loggedIn ? `Hello, ${loggedInStudent.displayName}!` : "Hello!";
  }
  if (studentLoginGreetingMeta) {
    studentLoginGreetingMeta.textContent = loggedIn
      ? `You are logged in as ${loggedInStudent.username}. Your game name will show as ${loggedInStudent.displayName}.`
      : "You are logged in.";
  }
  if (studentLogoutBtn) {
    studentLogoutBtn.classList.toggle("hidden", !loggedIn);
  }
  if (studentLoginUsernameInput) {
    if (loggedIn) {
      studentLoginUsernameInput.value = loggedInStudent.displayName;
    }
  }
  if (studentLoginPasswordInput && loggedIn) {
    studentLoginPasswordInput.value = "";
  }
  if (nameInput) {
    nameInput.readOnly = requiresStudentLogin() || loggedIn;
    nameInput.disabled = requiresStudentLogin() && !loggedIn;
    nameInput.placeholder = loggedIn
      ? loggedInStudent.displayName
      : (requiresStudentLogin() ? "Log in to use your first name" : "Your name");
    if (loggedIn) {
      nameInput.value = loggedInStudent.displayName;
    } else if (requiresStudentLogin()) {
      nameInput.value = "";
    }
  }
  if (accountPanel) {
    accountPanel.classList.toggle("hidden", requiresStudentLogin() && !loggedIn);
  }
  if (storeLinkBtn) {
    storeLinkBtn.classList.toggle("hidden", !loggedIn);
  }
  if (storeHint) {
    storeHint.textContent = loggedIn
      ? "Buy new packs in the Store, then come back here to choose from the blooks you already own."
      : "Log in first, then use the Store to buy packs for your account.";
  }
  if (!loggedIn && requiresStudentLogin() && pickedBlook) {
    pickedBlook.textContent = "Log in to load your saved blooks and get ready to join.";
  }
  setStudentLoginBusy(studentAuthBusy);
  updateJoinButtonState();
}

function applyStudentAuthState(payload) {
  studentAuthEnabled = payload?.enabled !== false;
  const nextStudent = payload?.loggedIn && payload?.student ? payload.student : null;
  loggedInStudent = nextStudent
    ? {
        username: String(nextStudent.username || ""),
        displayName: String(nextStudent.displayName || ""),
        accountKey: String(payload?.accountKey || nextStudent.accountKey || "")
      }
    : null;
  studentAuthLoaded = true;

  if (loggedInStudent?.accountKey) {
    setStoredAccountKey(loggedInStudent.accountKey);
  } else {
    clearStoredStudentAccountKey();
  }

  renderStudentLoginState();
  maybeAutoJoinFromQuery();
}

async function loadStudentAuthStatus() {
  if (previewGuestJoinRequested) {
    studentAuthLoaded = true;
    studentAuthEnabled = false;
    loggedInStudent = null;
    clearStoredStudentAccountKey();
    renderStudentLoginState();
    maybeAutoJoinFromQuery();
    return;
  }

  try {
    const response = await fetch("/api/student-auth/status");
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Student auth status failed");
    }
    applyStudentAuthState(payload);
    if (loggedInStudent && payload.account) {
      applyAccount(payload.account, payload.accountKey || loggedInStudent.accountKey);
    }
  } catch (_error) {
    studentAuthLoaded = true;
    studentAuthEnabled = true;
    loggedInStudent = null;
    clearStoredStudentAccountKey();
    renderStudentLoginState();
    maybeAutoJoinFromQuery();
  }
}

async function submitStudentLogin() {
  const username = normalizeStudentLoginUsername(studentLoginUsernameInput?.value || "");
  const password = String(studentLoginPasswordInput?.value || "");
  if (!username || !password) {
    setStudentLoginNotice("Enter your first name and password.", "bad");
    return;
  }

  setStudentLoginBusy(true);
  setStudentLoginNotice("");

  try {
    const response = await fetch("/api/student-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Student login failed.");
    }

    applyStudentAuthState(payload);
    if (payload.account) {
      applyAccount(payload.account, payload.accountKey || payload.student?.accountKey || "");
    } else {
      await loadBlooks();
    }
    setStudentLoginNotice(`Logged in as ${payload.student?.displayName || username}.`, "good");
  } catch (error) {
    setStudentLoginNotice(error?.message || "Student login failed.", "bad");
  } finally {
    setStudentLoginBusy(false);
    renderStudentLoginState();
  }
}

async function logoutStudentAccount() {
  setStudentLoginBusy(true);
  setStudentLoginNotice("");

  try {
    const response = await fetch("/api/student-auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Could not log out.");
    }

    applyStudentAuthState(payload);
    accountData = null;
    await loadBlooks();
    setStudentLoginNotice("Logged out. Log back in with your classroom account before joining.", "good");
  } catch (error) {
    setStudentLoginNotice(error?.message || "Could not log out.", "bad");
  } finally {
    setStudentLoginBusy(false);
    renderStudentLoginState();
  }
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
  renderStudentLoginState();
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

function stopMiniBattleRoyaleTicker() {
  if (miniBattleRoyaleTicker) {
    clearInterval(miniBattleRoyaleTicker);
    miniBattleRoyaleTicker = null;
  }
}

function stopMiniShadowMatchPreviewTimer() {
  if (miniShadowMatchPreviewTimer) {
    clearTimeout(miniShadowMatchPreviewTimer);
    miniShadowMatchPreviewTimer = null;
  }
}

function stopMiniTickers() {
  stopMiniPrecisionTicker();
  stopMiniReactionTicker();
  stopMiniSoccerTicker();
  stopMiniBattleRoyaleTicker();
  stopMiniShadowMatchPreviewTimer();
  destroyMiniFoosballPixi();
  if (miniSnakeAnimationFrame) {
    cancelAnimationFrame(miniSnakeAnimationFrame);
    miniSnakeAnimationFrame = 0;
  }
  miniSnakeCanvas = null;
  miniSnakeCtx = null;
  miniSnakeState = null;
  miniSnakeLastEventSeq = 0;
  if (miniTowerStackerAnimationFrame) {
    cancelAnimationFrame(miniTowerStackerAnimationFrame);
    miniTowerStackerAnimationFrame = 0;
  }
  miniTowerStackerCanvas = null;
  miniTowerStackerCtx = null;
  miniTowerStackerState = null;
  miniTowerStackerLastEventSeq = 0;
  miniTowerStackerCameraTop = 0;
  miniHallwayDashState = null;
  miniHallwayDashLastEventSeq = 0;
  miniGoalieRushState = null;
  miniGoalieRushLastEventSeq = 0;
  miniDinoDigState = null;
  miniDinoDigLastRevealSeq = 0;
  miniShadowMatchState = null;
  miniShadowMatchLastMoveSeq = 0;
  miniClassroomCleanupState = null;
  miniClassroomCleanupLastEventSeq = 0;
  miniBattleRoyaleState = null;
  miniBattleRoyaleLastResolutionSeq = 0;
}

function miniGameTypeLabel(type) {
  const visual = SHARED_MINI_GAME_VISUALS[String(type || "")] || null;
  if (visual?.label || visual?.title) {
    return String(visual.label || visual.title);
  }
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
    playMiniGameSfx("goal");
  } else if (outcome === "saved") {
    pitch.classList.add("save-flash");
    playMiniGameSfx("save");
  } else {
    playMiniGameSfx("miss");
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

function miniFoosballLaneOffset(index, width = 720) {
  const lane = clampMiniFoosballLane(index);
  const points = [Math.round(width * -0.06), 0, Math.round(width * 0.06)];
  return points[lane];
}

function miniFoosballShotX(index, width = 720) {
  const lane = clampMiniFoosballLane(index);
  const points = [Math.round(width * 0.24), Math.round(width * 0.5), Math.round(width * 0.76)];
  return points[lane];
}

function miniFoosballEventText(payload) {
  const eventType = String(payload?.lastEvent?.type || "");
  if (eventType === "player_goal") return "GOAL! Your shot found the corner.";
  if (eventType === "player_saved") return "The keeper blocked it. Shift and fire again.";
  if (eventType === "goalie_shift") return "The keeper slid into a new lane.";
  return "Slide the bars with Left/Right, then press Space to kick.";
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

    const topGoal = new PIXI.Sprite(PIXI.Texture.WHITE);
    topGoal.width = 112;
    topGoal.height = 14;
    topGoal.x = width / 2 - 56;
    topGoal.y = 8;
    topGoal.tint = 0xecf7ff;
    topGoal.alpha = 0.9;
    root.addChild(topGoal);

    const bottomGoal = new PIXI.Sprite(PIXI.Texture.WHITE);
    bottomGoal.width = 112;
    bottomGoal.height = 14;
    bottomGoal.x = width / 2 - 56;
    bottomGoal.y = height - 22;
    bottomGoal.tint = 0xecf7ff;
    bottomGoal.alpha = 0.9;
    root.addChild(bottomGoal);

    const fieldBorder = new PIXI.Sprite(PIXI.Texture.WHITE);
    fieldBorder.width = width - 24;
    fieldBorder.height = height - 24;
    fieldBorder.x = 12;
    fieldBorder.y = 12;
    fieldBorder.alpha = 0.16;
    root.addChild(fieldBorder);

    const centerCircle = new PIXI.Graphics();
    centerCircle.lineStyle(3, 0xf7fbff, 0.45);
    centerCircle.drawCircle(width / 2, height / 2, 42);
    centerCircle.moveTo(14, height / 2);
    centerCircle.lineTo(width - 14, height / 2);
    centerCircle.beginFill(0xf7fbff, 0.7);
    centerCircle.drawCircle(width / 2, height / 2, 4);
    centerCircle.endFill();
    root.addChild(centerCircle);

    const penaltyMarks = new PIXI.Graphics();
    penaltyMarks.beginFill(0xf7fbff, 0.7);
    penaltyMarks.drawCircle(width / 2, 72, 3);
    penaltyMarks.drawCircle(width / 2, height - 72, 3);
    penaltyMarks.endFill();
    root.addChild(penaltyMarks);

    function createFoosballFigure(team, isKeeper = false) {
      const figure = new PIXI.Container();
      const body = new PIXI.Graphics();
      const shirt = team === "you" ? 0xffd447 : 0x2d4057;
      const trim = team === "you" ? 0x7a5312 : 0xd7ecff;
      const shorts = team === "you" ? 0xc07d11 : 0x182332;
      const skin = team === "you" ? 0xf4c68f : 0xe9d3b8;
      const bodyWidth = isKeeper ? 18 : 16;
      const bodyHeight = isKeeper ? 28 : 24;

      body.lineStyle(2, trim, 0.95);
      body.beginFill(shirt);
      body.drawRoundedRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, 5);
      body.endFill();

      body.lineStyle(0);
      body.beginFill(shorts);
      body.drawRoundedRect(-bodyWidth / 2, 2, bodyWidth, 8, 3);
      body.endFill();

      body.beginFill(skin);
      body.drawCircle(0, -bodyHeight / 2 - 9, 7);
      body.endFill();

      body.beginFill(trim, 0.95);
      body.drawRect(-2, bodyHeight / 2 - 2, 4, 7);
      body.endFill();
      figure.addChild(body);

      const marker = new PIXI.Graphics();
      marker.beginFill(isKeeper ? 0x67d8ff : trim, 0.95);
      marker.drawCircle(0, 0, isKeeper ? 3.5 : 2.8);
      marker.endFill();
      marker.y = -bodyHeight / 2 - 9;
      figure.addChild(marker);
      return figure;
    }

    function createFoosballRow(config) {
      const row = new PIXI.Container();
      row.x = width / 2;
      row.y = config.y;

      const rod = new PIXI.Sprite(PIXI.Texture.WHITE);
      rod.anchor.set(0.5);
      rod.width = width + 80;
      rod.height = 5;
      rod.tint = 0xe4edf5;
      rod.alpha = 0.92;
      row.addChild(rod);

      const leftHandle = new PIXI.Graphics();
      leftHandle.beginFill(0x334454);
      leftHandle.drawRoundedRect(-width / 2 - 48, -9, 24, 18, 6);
      leftHandle.endFill();
      row.addChild(leftHandle);

      const rightHandle = new PIXI.Graphics();
      rightHandle.beginFill(0x334454);
      rightHandle.drawRoundedRect(width / 2 + 24, -9, 24, 18, 6);
      rightHandle.endFill();
      row.addChild(rightHandle);

      config.xPositions.forEach((ratio, index) => {
        const figure = createFoosballFigure(config.team, config.keeperIndex === index);
        figure.x = Math.round((ratio - 0.5) * width);
        row.addChild(figure);
      });
      root.addChild(row);
      return row;
    }

    const rowConfigs = [
      { team: "bot", y: 38, xPositions: [0.3, 0.5, 0.7], keeperIndex: 1 },
      { team: "bot", y: 76, xPositions: [0.18, 0.82] },
      { team: "you", y: 116, xPositions: [0.23, 0.5, 0.77] },
      { team: "bot", y: 158, xPositions: [0.12, 0.31, 0.5, 0.69, 0.88] },
      { team: "you", y: 202, xPositions: [0.12, 0.31, 0.5, 0.69, 0.88] },
      { team: "bot", y: 244, xPositions: [0.23, 0.5, 0.77] },
      { team: "you", y: 286, xPositions: [0.18, 0.82] },
      { team: "you", y: 322, xPositions: [0.3, 0.5, 0.7], keeperIndex: 1 }
    ];

    const friendlyRows = [];
    const enemyRows = [];
    rowConfigs.forEach((config) => {
      const row = createFoosballRow(config);
      if (config.team === "you") {
        friendlyRows.push(row);
      } else {
        enemyRows.push(row);
      }
    });

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

    const shotTargets = [
      miniFoosballShotX(0, width),
      miniFoosballShotX(1, width),
      miniFoosballShotX(2, width)
    ];
    const friendlyStartOffset = miniFoosballLaneOffset(miniFoosballSelectedLane, width);
    const enemyStartOffset = miniFoosballLaneOffset(miniFoosballGoalieLane, width);
    friendlyRows.forEach((row) => {
      row.x = width / 2 + friendlyStartOffset;
    });
    enemyRows.forEach((row) => {
      row.x = width / 2 + enemyStartOffset;
    });
    ball.x = width / 2 + friendlyStartOffset;
    ball.y = height - 126;

    miniFoosballPixiApp = app;
    miniFoosballPixiScene = {
      width,
      friendlyRows,
      enemyRows,
      ball,
      flash,
      shotTargets,
      friendlyOffset: friendlyStartOffset,
      enemyOffset: enemyStartOffset,
      friendlyTargetOffset: friendlyStartOffset,
      enemyTargetOffset: enemyStartOffset,
      ballRestY: height - 126
    };

    miniFoosballPixiTicker = () => {
      if (!miniFoosballPixiScene) {
        return;
      }
      const scene = miniFoosballPixiScene;
      scene.friendlyOffset += (scene.friendlyTargetOffset - scene.friendlyOffset) * 0.18;
      scene.enemyOffset += (scene.enemyTargetOffset - scene.enemyOffset) * 0.18;
      scene.friendlyRows.forEach((row) => {
        row.x = width / 2 + scene.friendlyOffset;
      });
      scene.enemyRows.forEach((row) => {
        row.x = width / 2 + scene.enemyOffset;
      });

      const tween = miniFoosballBallTween;
      if (!tween) {
        scene.ball.x += (width / 2 + scene.friendlyOffset - scene.ball.x) * 0.18;
        scene.ball.y += (scene.ballRestY - scene.ball.y) * 0.18;
      } else {
        const elapsed = performance.now() - tween.start;
        const t = clamp(elapsed / tween.duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        scene.ball.x = tween.fromX + (tween.toX - tween.fromX) * eased;
        scene.ball.y = tween.fromY + (tween.toY - tween.fromY) * eased;
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
  const nextLane = clampMiniFoosballLane(lane);
  const laneChanged = nextLane !== miniFoosballSelectedLane;
  miniFoosballSelectedLane = nextLane;
  const buttons = chests.querySelectorAll("button[data-mini-action='foos_lane']");
  buttons.forEach((button) => {
    const buttonLane = clampMiniFoosballLane(button.getAttribute("data-mini-value"));
    button.classList.toggle("selected", buttonLane === miniFoosballSelectedLane);
  });

  if (miniFoosballPixiScene) {
    miniFoosballPixiScene.friendlyTargetOffset = miniFoosballLaneOffset(miniFoosballSelectedLane, miniFoosballPixiScene.width);
  }

  if (!syncToServer || !roomCode) {
    if (laneChanged) {
      playMiniGameSfx("tap", { cooldownMs: 70 });
    }
    return;
  }

  socket.emit("player:minigameAction", { code: roomCode, action: "set_lane", value: { lane: miniFoosballSelectedLane } }, (res) => {
    if (res?.ok !== true) {
      setNotice(res?.message || "Could not update lane.", "bad");
      playMiniGameSfx("miss", { cooldownMs: 120 });
      return;
    }
    if (laneChanged) {
      playMiniGameSfx("tap", { cooldownMs: 70 });
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
  scene.enemyTargetOffset = miniFoosballLaneOffset(keeperLane, scene.width);

  miniFoosballBallTween = {
    start: performance.now(),
    duration: lastShot.goal ? 410 : 360,
    fromX: scene.ball.x,
    fromY: scene.ball.y,
    toX: scene.shotTargets[lane],
    toY: lastShot.goal ? 52 : 88
  };
  scene.flash.tint = lastShot.goal ? 0x52ef92 : 0xffbf59;
  scene.flash.alpha = lastShot.goal ? 0.2 : 0.14;
}

function applyMiniFoosballState(payload, options = {}) {
  const goals = Math.max(0, Number(payload?.goals ?? payload?.score?.goals ?? 0));
  const shots = Math.max(0, Number(payload?.shots || 0));
  const saves = Math.max(0, Number(payload?.saves || 0));
  const accuracy = shots > 0 ? Math.round((goals / shots) * 100) : 0;
  const lane = clampMiniFoosballLane(payload?.lane);
  const goalieLane = clampMiniFoosballLane(payload?.goalieLane);
  miniFoosballGoalieLane = goalieLane;

  setMiniFoosballLane(lane, false);
  if (miniFoosballPixiScene) {
    miniFoosballPixiScene.enemyTargetOffset = miniFoosballLaneOffset(goalieLane, miniFoosballPixiScene.width);
  }

  const scoreEl = document.getElementById("miniFoosScore");
  const statsEl = document.getElementById("miniFoosStats");
  const lastEl = document.getElementById("miniFoosLast");
  if (scoreEl) {
    scoreEl.textContent = `Goals ${goals}`;
  }
  if (statsEl) {
    statsEl.textContent = `${shots} shots | ${accuracy}% accuracy | ${saves} keeper blocks`;
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
      setNotice("Saved. Slide the bars and shoot again.", "");
      playMiniGameSfx("save");
    }
  } else if (options.forceSummaryText) {
    setNotice("Foosball live: slide the bars with arrow keys and press Space to kick.", "");
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

function miniSnakeDirectionKey(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "up" || key === "down" || key === "left") {
    return key;
  }
  return "right";
}

function sendMiniSnakeDirection(direction) {
  if (!roomCode || activeMiniGameType !== "snake") {
    return;
  }
  socket.emit("player:minigameAction", { code: roomCode, action: "set_direction", value: { direction } }, (res) => {
    if (res?.ok !== true) {
      setNotice(res?.message || "Could not turn the snake.", "bad");
      playMiniGameSfx("miss", { cooldownMs: 120 });
      return;
    }
    playMiniGameSfx("tap", { cooldownMs: 70 });
  });
}

function drawMiniSnakeCanvas() {
  if (!miniSnakeCanvas || !miniSnakeCtx || !miniSnakeState) {
    return;
  }

  const canvas = miniSnakeCanvas;
  const ctx = miniSnakeCtx;
  const gridWidth = Math.max(8, Number(miniSnakeState.gridWidth || 18));
  const gridHeight = Math.max(8, Number(miniSnakeState.gridHeight || 18));
  const cellSize = Math.min(canvas.width / gridWidth, canvas.height / gridHeight);
  const boardWidth = cellSize * gridWidth;
  const boardHeight = cellSize * gridHeight;
  const offsetX = (canvas.width - boardWidth) / 2;
  const offsetY = (canvas.height - boardHeight) / 2;

  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, "#12314e");
  background.addColorStop(1, "#091621");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(95, 173, 110, 0.22)" : "rgba(129, 205, 124, 0.14)";
      ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
    }
  }

  if (miniSnakeState.food) {
    const foodX = Number(miniSnakeState.food.x || 0) * cellSize + cellSize / 2;
    const foodY = Number(miniSnakeState.food.y || 0) * cellSize + cellSize / 2;
    ctx.fillStyle = "#ff6f61";
    ctx.beginPath();
    ctx.arc(foodX, foodY, cellSize * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7ed36d";
    ctx.beginPath();
    ctx.ellipse(foodX + cellSize * 0.08, foodY - cellSize * 0.2, cellSize * 0.12, cellSize * 0.06, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const body = Array.isArray(miniSnakeState.body) ? miniSnakeState.body : [];
  body.forEach((segment, index) => {
    const x = Number(segment?.x || 0) * cellSize + 1.5;
    const y = Number(segment?.y || 0) * cellSize + 1.5;
    const segmentWidth = cellSize - 3;
    const segmentHeight = cellSize - 3;
    ctx.fillStyle = index === 0 ? "#ffd447" : "rgba(84, 232, 148, 0.95)";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, segmentWidth, segmentHeight, Math.max(6, cellSize * 0.22));
      ctx.fill();
    } else {
      ctx.fillRect(x, y, segmentWidth, segmentHeight);
    }
    if (index === 0) {
      ctx.fillStyle = "#173255";
      const eyeY = y + segmentHeight * 0.34;
      ctx.beginPath();
      ctx.arc(x + segmentWidth * 0.33, eyeY, Math.max(1.8, cellSize * 0.08), 0, Math.PI * 2);
      ctx.arc(x + segmentWidth * 0.67, eyeY, Math.max(1.8, cellSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  if (miniSnakeState.alive === false) {
    ctx.fillStyle = "rgba(6, 13, 20, 0.6)";
    ctx.fillRect(0, 0, boardWidth, boardHeight);
  }

  ctx.restore();

  if (miniSnakeState.alive === false || miniSnakeState.won === true) {
    ctx.fillStyle = "rgba(247, 251, 255, 0.92)";
    ctx.fillRect(canvas.width / 2 - 152, canvas.height / 2 - 44, 304, 88);
    ctx.fillStyle = "#173255";
    ctx.font = "900 28px Arial";
    ctx.fillText(miniSnakeState.won === true ? "Board Cleared!" : "Snake Crashed", canvas.width / 2 - 116, canvas.height / 2 - 4);
    ctx.font = "700 16px Arial";
    ctx.fillText("Keep the route clean and collect more snacks.", canvas.width / 2 - 138, canvas.height / 2 + 24);
  }

  miniSnakeAnimationFrame = requestAnimationFrame(drawMiniSnakeCanvas);
}

function initMiniSnakeCanvas() {
  miniSnakeCanvas = document.getElementById("miniSnakeCanvas");
  if (!(miniSnakeCanvas instanceof HTMLCanvasElement)) {
    return;
  }
  miniSnakeCtx = miniSnakeCanvas.getContext("2d");
  if (!miniSnakeCtx) {
    return;
  }
  miniSnakeAnimationFrame = requestAnimationFrame(drawMiniSnakeCanvas);
}

function applyMiniSnakeState(payload = {}, options = {}) {
  miniSnakeState = payload;
  const hudEl = document.getElementById("miniSnakeHud");
  const statsEl = document.getElementById("miniSnakeStats");
  const summaryEl = document.getElementById("miniSnakeSummary");
  const direction = miniSnakeDirectionKey(payload.direction || payload.queuedDirection || "right");

  chests.querySelectorAll("button[data-mini-action='snake_dir']").forEach((button) => {
    button.classList.toggle("selected", button.getAttribute("data-mini-value") === direction);
    button.disabled = payload.completed === true;
  });

  if (hudEl) {
    hudEl.textContent = `Snacks ${Number(payload.foodsEaten || 0)} | Length ${Number(payload.length || 0)} | Score ${Math.round(Number(payload.score || 0))}`;
  }
  if (statsEl) {
    const speedMs = Math.max(80, Number(payload.moveIntervalMs || 180));
    statsEl.textContent = `${Number(payload.moves || 0)} moves | ${speedMs} ms step speed | ${payload.alive === false ? "Crashed" : payload.won === true ? "Cleared board" : "Alive"}`;
  }

  if (summaryEl) {
    const eventSeq = Number(payload?.lastEvent?.seq || 0);
    const forceSummaryText = options.forceSummaryText === true;
    if (forceSummaryText || eventSeq !== miniSnakeLastEventSeq) {
      miniSnakeLastEventSeq = eventSeq;
      const eventType = String(payload?.lastEvent?.type || "");
      if (payload.won === true || eventType === "board_clear") {
        summaryEl.textContent = "Perfect path. You filled the board and cleared the round.";
        playMiniGameSfx("complete");
        setNotice("Snake board cleared. Waiting for results...", "good");
      } else if (payload.alive === false || eventType === "crash") {
        summaryEl.textContent = "Crash. Walls and your own tail both end the run.";
        playMiniGameSfx("miss");
        setNotice("Snake crashed. Waiting for results...", "bad");
      } else if (eventType === "food") {
        summaryEl.textContent = "Snack collected. Longer snake, tighter route.";
        playMiniGameSfx("progress", { cooldownMs: 70 });
        setNotice("Snack collected. Keep the route clean.", "good");
      } else {
        summaryEl.textContent = "Use Arrow keys or WASD to turn. Plan ahead because reverse turns are blocked.";
      }
    }
  }
}

const TOWER_STACKER_THEME_STYLES = {
  cats: {
    accent: "#ff9b5c",
    secondary: "#ffd971",
    tertiary: "#f7f9ff",
    skyTop: "#9ae7f3",
    skyBottom: "#d6fff6",
    ground: "#6c4d39",
    silhouette: "cat",
    idleBob: 1.1,
    landingSquish: 1,
    milestone: "Climbing Cat Tower"
  },
  dogs: {
    accent: "#ff8c67",
    secondary: "#6ec5ff",
    tertiary: "#f6ede2",
    skyTop: "#a8d7ff",
    skyBottom: "#eefbff",
    ground: "#735440",
    silhouette: "dog",
    idleBob: 1.24,
    landingSquish: 1.18,
    milestone: "Puppy Pile Rising"
  },
  ducks: {
    accent: "#ffd34f",
    secondary: "#59d8d2",
    tertiary: "#fff4ba",
    skyTop: "#8ce0ff",
    skyBottom: "#edfff5",
    ground: "#7d5f3f",
    silhouette: "duck",
    idleBob: 0.95,
    landingSquish: 0.92,
    milestone: "Duck Stack Parade"
  },
  pandas: {
    accent: "#9fd3ff",
    secondary: "#9af0a9",
    tertiary: "#f8fbff",
    skyTop: "#b9ddff",
    skyBottom: "#f7fdff",
    ground: "#505564",
    silhouette: "panda",
    idleBob: 0.82,
    landingSquish: 1.34,
    milestone: "Panda Peak"
  }
};

function towerThemeStyle(themeId) {
  return TOWER_STACKER_THEME_STYLES[String(themeId || "").toLowerCase()] || TOWER_STACKER_THEME_STYLES.cats;
}

function towerCanvasX(value, width) {
  return (Number(value || 0) / 100) * width;
}

function towerVisibleWorldRange() {
  return 86;
}

function towerCameraTargetTop(state) {
  const pieces = []
    .concat(Array.isArray(state?.settledPieces) ? state.settledPieces : [])
    .concat(Array.isArray(state?.fallingPieces) ? state.fallingPieces : []);
  if (state?.previewPiece) {
    pieces.push(state.previewPiece);
  }
  if (pieces.length === 0) {
    return 0;
  }
  const highestTop = pieces.reduce((min, piece) => Math.min(min, Number(piece.y || 0) - Number(piece.h || 0) / 2), 92);
  return Math.min(0, Math.round((highestTop - 20) * 10) / 10);
}

function towerCanvasY(value, height, topWorld = 0) {
  return ((Number(value || 0) - Number(topWorld || 0)) / towerVisibleWorldRange()) * height;
}

function towerRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function renderTowerAltitudeDecor(ctx, canvas, state, topWorld, style) {
  const heightBand = Math.floor(Math.max(0, Number(state?.towerHeight || 0)) / 26);
  const yAt = (worldY) => towerCanvasY(worldY, canvas.height, topWorld);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 10; i += 1) {
    const x = ((i * 93 + 40) % canvas.width);
    const cloudWorldY = 18 + heightBand * 6 + (i % 4) * 6;
    ctx.beginPath();
    ctx.arc(x, yAt(cloudWorldY), 10 + (i % 3) * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (heightBand >= 1) {
    for (let i = 0; i < 5; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 163, 123, 0.55)" : "rgba(89, 216, 210, 0.55)";
      ctx.lineWidth = 2;
      const balloonX = ((i * 171) + 110) % canvas.width;
      const balloonY = yAt(-6 - i * 9);
      ctx.beginPath();
      ctx.ellipse(balloonX, balloonY, 12, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(balloonX, balloonY + 16);
      ctx.lineTo(balloonX - 2, balloonY + 38);
      ctx.stroke();
    }
  }

  if (heightBand >= 2) {
    for (let i = 0; i < 2; i += 1) {
      const planeX = ((performance.now() * 0.04) + i * 340) % (canvas.width + 180) - 90;
      const planeY = yAt(-48 - i * 18);
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.beginPath();
      ctx.moveTo(planeX - 14, planeY + 4);
      ctx.lineTo(planeX + 18, planeY);
      ctx.lineTo(planeX - 14, planeY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(planeX - 6, planeY - 1.5, 16, 3);
    }
  }

  if (heightBand >= 3) {
    const satX = canvas.width - 120 + Math.sin(performance.now() * 0.0008) * 28;
    const satY = yAt(-94);
    ctx.strokeStyle = "rgba(215, 233, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(satX - 12, satY - 8, 24, 16);
    ctx.beginPath();
    ctx.moveTo(satX - 28, satY);
    ctx.lineTo(satX - 12, satY);
    ctx.moveTo(satX + 12, satY);
    ctx.lineTo(satX + 28, satY);
    ctx.stroke();
  }

  if (heightBand >= 4) {
    const moonX = canvas.width - 86;
    const moonY = yAt(-148);
    ctx.fillStyle = "rgba(255, 248, 208, 0.95)";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.skyTop;
    ctx.beginPath();
    ctx.arc(moonX + 9, moonY - 3, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  if (heightBand >= 5) {
    const sunX = 92;
    const sunY = yAt(-208);
    ctx.fillStyle = "rgba(255, 225, 112, 0.98)";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 225, 112, 0.55)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(angle) * 32, sunY + Math.sin(angle) * 32);
      ctx.lineTo(sunX + Math.cos(angle) * 46, sunY + Math.sin(angle) * 46);
      ctx.stroke();
    }
  }
}

function drawTowerPiece(ctx, piece, canvas, options = {}) {
  if (!piece) {
    return;
  }
  const style = towerThemeStyle(piece.theme);
  const width = (Number(piece.w || 12) / 100) * canvas.width * 2.6;
  const height = (Number(piece.h || 10) / 100) * canvas.height * 1.6;
  const centerX = towerCanvasX(piece.x, canvas.width);
  const centerY = towerCanvasY(piece.y, canvas.height, options.topWorld || 0);
  const motionSeed = performance.now() * 0.01 + Number(piece.blinkSeed || 0) * 13;
  const wobble = Number(piece.wobble || 0) * 0.007 * Math.sin(motionSeed);
  const angle = Number(piece.angle || 0) + wobble;
  const blinkOpen = Math.sin(performance.now() * 0.0025 + Number(piece.blinkSeed || 0) * 4) > -0.95;
  const bodyColor = piece.color || style.accent;
  const bellyColor = piece.belly || "#fff6dd";
  const accent = style.secondary;
  const verticalSquish = 1 - Math.min(0.12, Number(piece.wobble || 0) * 0.006 * style.landingSquish);
  const horizontalStretch = 1 + Math.min(0.14, Number(piece.wobble || 0) * 0.007 * style.landingSquish);
  const gentleBob = !options.falling && !piece.dropped ? Math.sin(motionSeed * style.idleBob * 0.4) * 3 : 0;

  ctx.save();
  ctx.translate(centerX, centerY + gentleBob);
  ctx.rotate(angle);
  ctx.scale(horizontalStretch, verticalSquish);

  ctx.shadowColor = "rgba(9, 20, 34, 0.18)";
  ctx.shadowBlur = options.shadow ? 18 : 8;
  ctx.shadowOffsetY = options.shadow ? 8 : 4;
  ctx.fillStyle = bodyColor;

  if (style.silhouette === "duck" || String(piece.shape || "").startsWith("duck")) {
    ctx.beginPath();
    ctx.ellipse(0, 4, width * 0.38, height * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-width * 0.06, -height * 0.12, width * 0.22, height * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.silhouette === "panda" || String(piece.shape || "").startsWith("panda")) {
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.4, height * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.silhouette === "dog" || String(piece.shape || "").startsWith("dog")) {
    if (String(piece.shape || "").includes("long")) {
      towerRoundRect(ctx, -width / 2, -height * 0.34, width, height * 0.68, Math.min(height / 2, 22));
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.42, height * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (piece.shape === "oval") {
    ctx.beginPath();
    ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (piece.shape === "capsule" || piece.shape === "longcat" || piece.shape === "tall") {
    towerRoundRect(ctx, -width / 2, -height / 2, width, height, Math.min(height / 2, 22));
    ctx.fill();
  } else if (piece.shape === "cloud" || piece.shape === "fluff") {
    ctx.beginPath();
    ctx.arc(-width * 0.22, 0, height * 0.34, 0, Math.PI * 2);
    ctx.arc(0, -height * 0.08, height * 0.42, 0, Math.PI * 2);
    ctx.arc(width * 0.24, 0, height * 0.32, 0, Math.PI * 2);
    ctx.fill();
    towerRoundRect(ctx, -width * 0.44, -height * 0.18, width * 0.88, height * 0.52, 20);
    ctx.fill();
  } else {
    towerRoundRect(ctx, -width / 2, -height / 2, width, height, Math.min(24, height * 0.32));
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = bellyColor;
  if (style.silhouette === "duck") {
    ctx.beginPath();
    ctx.ellipse(-width * 0.05, height * 0.1, width * 0.18, height * 0.14, 0, 0, Math.PI * 2);
  } else if (piece.shape === "capsule" || piece.shape === "cloud" || piece.shape === "longcat" || piece.shape === "dog_long" || piece.shape === "panda_loaf") {
    towerRoundRect(ctx, -width * 0.24, -height * 0.05, width * 0.48, height * 0.38, Math.min(18, height * 0.18));
  } else {
    ctx.beginPath();
    ctx.ellipse(0, height * 0.1, width * 0.24, height * 0.2, 0, 0, Math.PI * 2);
  }
  ctx.fill();

  if (style.silhouette === "dog") {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(-width * 0.24, -height * 0.1, width * 0.1, height * 0.22, -0.45, 0, Math.PI * 2);
    ctx.ellipse(width * 0.24, -height * 0.1, width * 0.1, height * 0.22, 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.silhouette === "duck") {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(-width * 0.23, height * 0.02, width * 0.11, height * 0.16, -0.4, 0, Math.PI * 2);
    ctx.ellipse(width * 0.23, height * 0.02, width * 0.11, height * 0.16, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (piece.ears) {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-width * 0.22, -height * 0.28);
    ctx.lineTo(-width * 0.08, -height * 0.62);
    ctx.lineTo(0, -height * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width * 0.22, -height * 0.28);
    ctx.lineTo(width * 0.08, -height * 0.62);
    ctx.lineTo(0, -height * 0.24);
    ctx.closePath();
    ctx.fill();
  }

  if (style.silhouette === "panda") {
    ctx.fillStyle = "#24344c";
    ctx.beginPath();
    ctx.ellipse(-width * 0.19, -height * 0.12, width * 0.12, height * 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(width * 0.19, -height * 0.12, width * 0.12, height * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#24344c";
  const eyeY = -height * 0.05;
  if (blinkOpen) {
    ctx.beginPath();
    ctx.arc(-width * 0.14, eyeY, Math.max(2.4, width * 0.035), 0, Math.PI * 2);
    ctx.arc(width * 0.14, eyeY, Math.max(2.4, width * 0.035), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(-width * 0.2, eyeY);
    ctx.lineTo(-width * 0.08, eyeY);
    ctx.moveTo(width * 0.08, eyeY);
    ctx.lineTo(width * 0.2, eyeY);
    ctx.strokeStyle = "#24344c";
    ctx.stroke();
  }

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#24344c";
  ctx.beginPath();
  if (piece.face === "sleepy") {
    ctx.moveTo(-width * 0.08, height * 0.12);
    ctx.quadraticCurveTo(0, height * 0.17, width * 0.08, height * 0.12);
  } else if (piece.face === "wide" || piece.face === "grin" || piece.face === "happy") {
    ctx.moveTo(-width * 0.12, height * 0.08);
    ctx.quadraticCurveTo(0, height * 0.2, width * 0.12, height * 0.08);
  } else {
    ctx.moveTo(-width * 0.08, height * 0.11);
    ctx.quadraticCurveTo(0, height * 0.17, width * 0.08, height * 0.11);
  }
  ctx.stroke();

  if (piece.accessory === "duck_beak" || piece.accessory === "beak") {
    ctx.fillStyle = "#ff9855";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.02);
    ctx.lineTo(width * 0.12, height * 0.08);
    ctx.lineTo(0, height * 0.14);
    ctx.closePath();
    ctx.fill();
  }
  if (piece.accessory === "floatie") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, height * 0.14, Math.max(8, height * 0.18), 0, Math.PI * 2);
    ctx.stroke();
  }
  if (piece.accessory === "collar") {
    ctx.fillStyle = accent;
    ctx.fillRect(-width * 0.22, height * 0.02, width * 0.44, Math.max(4, height * 0.07));
  }
  if (piece.accessory === "cat_tail" || piece.accessory === "wag_tail") {
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = Math.max(5, width * 0.045);
    ctx.beginPath();
    ctx.moveTo(width * 0.34, height * 0.08);
    ctx.quadraticCurveTo(width * 0.52, -height * 0.05, width * 0.44, -height * 0.34);
    ctx.stroke();
  }
  if (piece.accessory === "wing") {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(width * 0.1, height * 0.02, width * 0.12, height * 0.13, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (piece.accessory === "patch") {
    ctx.fillStyle = "rgba(36, 52, 76, 0.12)";
    ctx.beginPath();
    ctx.ellipse(width * 0.18, -height * 0.02, width * 0.1, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (piece.accessory === "panda_patch") {
    ctx.fillStyle = "rgba(36, 52, 76, 0.9)";
    ctx.beginPath();
    ctx.ellipse(-width * 0.12, -height * 0.04, width * 0.09, height * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(width * 0.12, -height * 0.04, width * 0.09, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (piece.perfect) {
    ctx.strokeStyle = "rgba(255, 226, 128, 0.9)";
    ctx.lineWidth = 3;
    towerRoundRect(ctx, -width / 2 - 3, -height / 2 - 3, width + 6, height + 6, Math.min(24, height * 0.34));
    ctx.stroke();
  }

  ctx.restore();
}

function drawTowerStackerCanvas() {
  if (!miniTowerStackerCanvas || !miniTowerStackerCtx || !miniTowerStackerState) {
    return;
  }
  const canvas = miniTowerStackerCanvas;
  const ctx = miniTowerStackerCtx;
  const themeStyle = towerThemeStyle(miniTowerStackerState.theme);
  const targetCameraTop = towerCameraTargetTop(miniTowerStackerState);
  miniTowerStackerCameraTop += (targetCameraTop - miniTowerStackerCameraTop) * 0.08;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, themeStyle.skyTop);
  gradient.addColorStop(1, themeStyle.skyBottom);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  renderTowerAltitudeDecor(ctx, canvas, miniTowerStackerState, miniTowerStackerCameraTop, themeStyle);

  const groundY = towerCanvasY(92, canvas.height, miniTowerStackerCameraTop);
  ctx.fillStyle = themeStyle.ground;
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(0, groundY, canvas.width, 6);

  const settledPieces = Array.isArray(miniTowerStackerState.settledPieces) ? [...miniTowerStackerState.settledPieces].sort((a, b) => Number(a.y || 0) - Number(b.y || 0)) : [];
  for (const piece of settledPieces) {
    drawTowerPiece(ctx, piece, canvas, { shadow: true, topWorld: miniTowerStackerCameraTop });
  }
  for (const piece of miniTowerStackerState.fallingPieces || []) {
    drawTowerPiece(ctx, piece, canvas, { shadow: true, topWorld: miniTowerStackerCameraTop, falling: true });
  }
  drawTowerPiece(ctx, miniTowerStackerState.previewPiece, canvas, { shadow: true, topWorld: miniTowerStackerCameraTop });

  if (miniTowerStackerState.previewPiece && miniTowerStackerState.previewPiece.dropped !== true) {
    ctx.strokeStyle = "rgba(36,52,76,0.15)";
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(towerCanvasX(miniTowerStackerState.previewPiece.x, canvas.width), towerCanvasY(miniTowerStackerState.previewPiece.y, canvas.height, miniTowerStackerCameraTop));
    ctx.lineTo(towerCanvasX(miniTowerStackerState.previewPiece.x, canvas.width), groundY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = "rgba(36,52,76,0.78)";
  ctx.font = "800 22px Arial";
  ctx.fillText("Tower Stacker", 22, 34);
  ctx.font = "700 16px Arial";
  ctx.fillText(themeStyle.milestone, 22, 58);

  ctx.fillStyle = "rgba(36,52,76,0.52)";
  ctx.font = "800 14px Arial";
  ctx.fillText(`Height Score ${Math.round(Number(miniTowerStackerState.towerHeightScore || 0))}`, canvas.width - 228, 28);
  ctx.fillText(`Perfect Landings ${Math.round(Number(miniTowerStackerState.perfectLandingScore || 0))}`, canvas.width - 268, 50);

  if (["perfect_drop", "great_drop", "stable_stack"].includes(String(miniTowerStackerState.lastEvent?.type || "")) && (performance.now() % 900) < 540) {
    ctx.fillStyle = "#fff7b5";
    ctx.font = "900 28px Arial";
    const label =
      miniTowerStackerState.lastEvent?.type === "perfect_drop"
        ? "Perfect!"
        : miniTowerStackerState.lastEvent?.type === "great_drop"
          ? "Great Drop"
          : "Stable Stack";
    ctx.fillText(label, canvas.width - 188, 84);
  }
  if (miniTowerStackerState.lastEvent?.isHeightRecord === true && (performance.now() % 1200) < 700) {
    ctx.fillStyle = "#fff7b5";
    ctx.font = "900 22px Arial";
    ctx.fillText("New Height Record", canvas.width - 220, 112);
  }
  if (miniTowerStackerState.collapsed) {
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillRect(canvas.width / 2 - 150, 84, 300, 86);
    ctx.fillStyle = "#28415b";
    ctx.font = "900 30px Arial";
    ctx.fillText("Oops! Try again!", canvas.width / 2 - 120, 120);
    ctx.font = "700 17px Arial";
    ctx.fillText("Press Restart and build another tower.", canvas.width / 2 - 130, 148);
  }

  miniTowerStackerAnimationFrame = requestAnimationFrame(drawTowerStackerCanvas);
}

function initTowerStackerCanvas() {
  miniTowerStackerCanvas = document.getElementById("miniTowerStackerCanvas");
  if (!(miniTowerStackerCanvas instanceof HTMLCanvasElement)) {
    return;
  }
  miniTowerStackerCtx = miniTowerStackerCanvas.getContext("2d");
  if (!miniTowerStackerCtx) {
    return;
  }
  miniTowerStackerCameraTop = 0;
  miniTowerStackerAnimationFrame = requestAnimationFrame(drawTowerStackerCanvas);
}

function bindTowerStackerStageDrop() {
  const stage = document.getElementById("miniTowerStackerStage");
  if (!stage) {
    return;
  }
  const triggerDrop = () => {
    if (activeMiniGameType !== "tower_stacker") {
      return;
    }
    const button = document.getElementById("miniTowerDropBtn");
    if (button instanceof HTMLButtonElement && !button.disabled) {
      button.click();
    }
  };
  stage.addEventListener("click", triggerDrop);
  stage.addEventListener("touchstart", (event) => {
    event.preventDefault();
    triggerDrop();
  }, { passive: false });
}

function applyMiniTowerStackerState(payload = {}, options = {}) {
  miniTowerStackerState = payload;
  const seq = Number(payload?.lastEvent?.seq || 0);
  const summaryEl = document.getElementById("miniTowerSummary");
  const dropBtn = document.getElementById("miniTowerDropBtn");
  const restartBtn = document.getElementById("miniTowerRestartBtn");
  const themeButtons = chests.querySelectorAll("button[data-mini-action='tower_theme']");
  themeButtons.forEach((button) => {
    const themeId = String(button.getAttribute("data-mini-value") || "");
    button.classList.toggle("selected", themeId === String(payload.theme || ""));
    button.disabled = Number(payload?.piecesPlaced || 0) > 0;
  });

  if (dropBtn instanceof HTMLButtonElement) {
    dropBtn.disabled = payload.collapsed === true || !payload.previewPiece || Number(payload.availableDrops || 0) <= 0 || payload.previewPiece?.dropped === true;
  }
  if (restartBtn instanceof HTMLButtonElement) {
    restartBtn.disabled = false;
  }

  const scoreEl = document.getElementById("miniTowerScore");
  const statsEl = document.getElementById("miniTowerStats");
  const dropsEl = document.getElementById("miniTowerDrops");
  if (scoreEl) {
    scoreEl.textContent = `Height ${Math.round(Number(payload.towerHeightScore || 0))} | Perfect Landings ${Math.round(Number(payload.perfectLandingScore || 0))}`;
  }
  if (statsEl) {
    statsEl.textContent = `${Number(payload.piecesPlaced || 0)} stacked | Height ${Math.round(Number(payload.towerHeight || 0))} | Best combo ${Number(payload.bestCombo || payload.combo || 0)}`;
  }
  if (dropsEl) {
    dropsEl.textContent = `${Number(payload.availableDrops || 0)} drop${Number(payload.availableDrops || 0) === 1 ? "" : "s"} ready`;
  }
  if (summaryEl) {
    const lastEventType = String(payload?.lastEvent?.type || "");
    if (lastEventType === "perfect_drop") {
      summaryEl.textContent = "Perfect! Centered landing and extra stability bonus.";
    } else if (lastEventType === "great_drop") {
      summaryEl.textContent = "Great Drop. That one landed cleanly.";
    } else if (lastEventType === "stable_stack") {
      summaryEl.textContent = "Stable Stack. Nice balance on that layer.";
    } else if (lastEventType === "tower_collapse") {
      summaryEl.textContent = "Oops! Too many pieces slipped. Restart and try again.";
    } else if (payload.collapsed) {
      summaryEl.textContent = "Tower collapsed. Restart to build another one.";
    } else if (Number(payload.availableDrops || 0) <= 0 && !payload.previewPiece) {
      summaryEl.textContent = "Nice stack. Earn another correct answer for your next drop.";
    } else {
      summaryEl.textContent = "Press Space, click Drop, or tap the stage when the piece lines up.";
    }
  }

  if (seq > miniTowerStackerLastEventSeq) {
    miniTowerStackerLastEventSeq = seq;
    if (String(payload?.lastEvent?.type || "") === "perfect_drop") {
      setNotice("Perfect drop! Keep the combo going.", "good");
      playMiniGameSfx("goal");
    } else if (String(payload?.lastEvent?.type || "") === "great_drop") {
      setNotice("Great drop. The tower looks solid.", "good");
      playMiniGameSfx("progress", { cooldownMs: 80 });
    } else if (String(payload?.lastEvent?.type || "") === "stable_stack") {
      setNotice("Stable stack. Keep climbing.", "good");
      playMiniGameSfx("progress", { cooldownMs: 80 });
    } else if (String(payload?.lastEvent?.type || "") === "tower_collapse") {
      setNotice("Oops! The tower wobbled apart. Restart and try again.", "bad");
      playMiniGameSfx("miss");
    } else if (String(payload?.lastEvent?.type || "") === "drop_landed" && options.forceSummaryText !== true) {
      setNotice("Nice landing. Keep stacking.", "good");
      playMiniGameSfx("tap", { cooldownMs: 80 });
    }
  } else if (options.forceSummaryText) {
    setNotice("Tower Stacker live. Pick a theme, then press Space to drop.", "");
  }
}

function miniDinoDigTileTone(tile) {
  const kind = String(tile?.kind || "");
  if (kind === "coin") {
    return {
      bg: "rgba(255, 212, 71, 0.18)",
      border: "rgba(255, 212, 71, 0.55)"
    };
  }
  if (kind === "fossil") {
    return {
      bg: "rgba(129, 199, 132, 0.18)",
      border: "rgba(129, 199, 132, 0.48)"
    };
  }
  if (kind === "rare_blook") {
    return {
      bg: "rgba(96, 165, 250, 0.2)",
      border: "rgba(125, 211, 252, 0.58)"
    };
  }
  if (kind === "bone") {
    return {
      bg: "rgba(148, 163, 184, 0.18)",
      border: "rgba(191, 219, 254, 0.34)"
    };
  }
  return {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(151,193,255,0.22)"
  };
}

function renderMiniDinoDigBoard(payload = {}) {
  const grid = document.getElementById("miniDinoGrid");
  if (!grid) {
    return;
  }

  const board = Array.isArray(payload?.board) ? payload.board : [];
  const completed = payload?.completed === true;
  grid.innerHTML = board.map((tile, index) => {
    const dug = tile?.dug === true;
    const tone = miniDinoDigTileTone(tile);
    const hiddenTitle = `Dig Site ${index + 1}`;
    const hiddenDetail = completed ? "Dig complete" : "Tap to dig";
    const title = dug ? String(tile?.label || "Dig Find") : hiddenTitle;
    let detail = hiddenDetail;
    if (dug) {
      if (String(tile?.kind || "") === "coin") {
        detail = `+${Number(tile?.coins || 0)} coins`;
      } else if (String(tile?.kind || "") === "rare_blook") {
        detail = `${escapeHtml(String(tile?.rarity || "Rare"))} blook`;
      } else {
        detail = `+${Number(tile?.points || 0)} dig pts`;
      }
    }

    const icon = dug ? String(tile?.icon || "⛏️") : "⛏️";
    const disabledAttr = dug || completed ? "disabled" : "";
    const ariaLabel = dug
      ? `${title} revealed`
      : `${hiddenTitle}, ${completed ? "completed" : "tap to dig"}`;
    return `
      <button
        type="button"
        class="answer"
        data-mini-action="dig"
        data-mini-value="${index}"
        aria-label="${escapeHtml(ariaLabel)}"
        ${disabledAttr}
        style="min-height:96px;padding:12px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;text-align:left;background:${tone.bg};border-color:${tone.border};opacity:${dug ? 0.96 : 1};">
        <span style="font-size:1.45rem;line-height:1">${escapeHtml(icon)}</span>
        <strong style="font-size:1rem;line-height:1.15">${escapeHtml(title)}</strong>
        <span class="help" style="margin:0;font-size:0.82rem;line-height:1.15">${escapeHtml(detail)}</span>
      </button>`;
  }).join("");
}

function applyMiniDinoDigState(payload = {}, options = {}) {
  miniDinoDigState = payload;
  renderMiniDinoDigBoard(payload);

  const scoreEl = document.getElementById("miniDinoScore");
  const statsEl = document.getElementById("miniDinoStats");
  const summaryEl = document.getElementById("miniDinoLast");
  const digs = Math.max(0, Number(payload?.digs || 0));
  const maxDigs = Math.max(1, Number(payload?.maxDigs || 1));
  const fossilsFound = Math.max(0, Number(payload?.fossilsFound || 0));
  const fossilPoints = Math.max(0, Number(payload?.fossilPoints || 0));
  const bonesFound = Math.max(0, Number(payload?.bonesFound || 0));
  const coinsFound = Math.max(0, Number(payload?.coinsFound || 0));
  const rareBlooksFound = Math.max(0, Number(payload?.rareBlooksFound || 0));

  if (scoreEl) {
    scoreEl.textContent = `Digs ${digs}/${maxDigs} | Fossil Score ${fossilPoints}`;
  }
  if (statsEl) {
    statsEl.textContent = `${fossilsFound} fossils | ${bonesFound} bones | ${coinsFound} coins | ${rareBlooksFound} rare finds`;
  }

  if (summaryEl) {
    const reveal = payload?.lastReveal && typeof payload.lastReveal === "object" ? payload.lastReveal : null;
    const revealSeq = Math.max(0, Number(reveal?.seq || 0));
    const forceSummaryText = options.forceSummaryText === true;
    let handledReveal = false;
    if (reveal && (forceSummaryText || revealSeq > miniDinoDigLastRevealSeq)) {
      miniDinoDigLastRevealSeq = revealSeq;
      handledReveal = true;
      if (String(reveal.kind || "") === "rare_blook") {
        summaryEl.textContent = `Jackpot! ${reveal.label} was buried in that tile.`;
        setNotice(`Rare dinosaur blook found: ${reveal.label}.`, "good");
        playMiniGameSfx("unlock");
      } else if (String(reveal.kind || "") === "coin") {
        summaryEl.textContent = `${reveal.label} uncovered. That tile had +${Number(reveal.coins || 0)} coins.`;
        setNotice(`Coin cache found: +${Number(reveal.coins || 0)} dig coins.`, "good");
        playMiniGameSfx("reward");
      } else if (String(reveal.kind || "") === "fossil") {
        summaryEl.textContent = `${reveal.label} uncovered for +${Number(reveal.points || 0)} fossil points.`;
        setNotice(`Fossil found: ${reveal.label}.`, "good");
        playMiniGameSfx("progress", { cooldownMs: 80 });
      } else {
        summaryEl.textContent = `${reveal.label} brushed off for +${Number(reveal.points || 0)} dig points.`;
        setNotice(`Bone find: ${reveal.label}. Keep digging.`, "");
        playMiniGameSfx("tap", { cooldownMs: 80 });
      }
    }

    if (payload?.completed === true) {
      if (!handledReveal) {
        summaryEl.textContent = "Dig complete. Your finds are locked in and results are on the way.";
      }
      if (!forceSummaryText) {
        setNotice("Dino Dig complete. Waiting for results...", "good");
      } else if (!handledReveal) {
        setNotice("Dino Dig live. Tap sites quickly before your digs run out.", "");
      }
    } else if (forceSummaryText && !handledReveal) {
      summaryEl.textContent = "Tap any dig site. Fossils and coin caches are great, but a rare dinosaur blook is the jackpot.";
      setNotice("Dino Dig live. Tap sites quickly before your digs run out.", "");
    }
  }
}

function miniShadowMatchVisibleIndexes(payload = {}) {
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  const now = Date.now();
  const previewExpiresAt = Math.max(0, Number(payload?.previewExpiresAt || 0));
  const visible = new Set();
  const unmatchedVisible = [];

  for (const card of cards) {
    if (card?.matched === true) {
      visible.add(Number(card.index));
      continue;
    }
    if (card?.revealed === true) {
      unmatchedVisible.push(Number(card.index));
    }
  }

  if (previewExpiresAt > now || unmatchedVisible.length <= 1) {
    unmatchedVisible.forEach((index) => visible.add(index));
  }

  return visible;
}

function scheduleMiniShadowMatchPreview(payload = {}) {
  stopMiniShadowMatchPreviewTimer();
  const previewExpiresAt = Math.max(0, Number(payload?.previewExpiresAt || 0));
  const waitMs = previewExpiresAt - Date.now();
  if (!miniShadowMatchState || waitMs <= 0) {
    return;
  }
  miniShadowMatchPreviewTimer = setTimeout(() => {
    if (!miniShadowMatchState) {
      return;
    }
    applyMiniShadowMatchState(miniShadowMatchState, { forceSummaryText: false });
  }, waitMs + 25);
}

function renderMiniShadowMatchGrid(payload = {}) {
  const grid = document.getElementById("miniShadowGrid");
  if (!grid) {
    return;
  }

  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  const visibleIndexes = miniShadowMatchVisibleIndexes(payload);
  const previewLocked = Math.max(0, Number(payload?.previewExpiresAt || 0)) > Date.now() && cards.filter((card) => card?.revealed === true && card?.matched !== true).length >= 2;
  const completed = payload?.completed === true;

  grid.innerHTML = cards.map((card, index) => {
    const visible = visibleIndexes.has(Number(card?.index ?? index));
    const matched = card?.matched === true;
    const revealedBlook = card?.blook || null;
    const disabled = completed || matched || (visible && !matched) || (previewLocked && !visible);
    const label = visible && revealedBlook ? String(revealedBlook.name || "Revealed Blook") : `Hidden shadow card ${index + 1}`;
    const content = visible && revealedBlook
      ? `
        <div style="display:flex;justify-content:center;align-items:center;min-height:72px;">${renderBlookWithEffect(revealedBlook, "")}</div>
        <strong style="display:block;font-size:0.94rem;line-height:1.15;color:#e2e8f0;">${escapeHtml(revealedBlook.name || "Blook")}</strong>
        <span class="help" style="margin:0;font-size:0.76rem;color:rgba(226,232,240,0.88);">${escapeHtml(revealedBlook.packName || revealedBlook.rarity || "Pack Reward")}</span>`
      : `
        <div style="display:flex;justify-content:center;align-items:center;min-height:72px;font-size:2rem;font-weight:900;color:rgba(226,232,240,0.94);letter-spacing:0.08em;">?</div>
        <strong style="display:block;font-size:0.94rem;line-height:1.15;color:#f8fafc;">Shadow</strong>
        <span class="help" style="margin:0;font-size:0.76rem;color:rgba(226,232,240,0.82);">Tap to reveal</span>`;
    const cardBg = visible
      ? "linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)"
      : "linear-gradient(180deg, rgba(51,65,85,0.96) 0%, rgba(15,23,42,0.98) 100%)";
    const borderColor = matched
      ? "rgba(110, 231, 183, 0.8)"
      : visible
        ? "rgba(125, 211, 252, 0.72)"
        : "rgba(148, 163, 184, 0.34)";
    return `
      <button
        type="button"
        class="answer"
        data-mini-action="shadow_flip"
        data-mini-value="${Number(card?.index ?? index)}"
        aria-label="${escapeHtml(label)}"
        ${disabled ? "disabled" : ""}
        style="min-height:150px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;text-align:center;background:${cardBg};border-color:${borderColor};box-shadow:${matched ? "0 16px 28px rgba(16,185,129,0.16)" : "0 14px 26px rgba(15,23,42,0.16)"};opacity:${matched ? 0.95 : 1};">
        ${content}
      </button>`;
  }).join("");
}

function applyMiniShadowMatchState(payload = {}, options = {}) {
  miniShadowMatchState = payload;
  scheduleMiniShadowMatchPreview(payload);
  renderMiniShadowMatchGrid(payload);

  const scoreEl = document.getElementById("miniShadowScore");
  const statsEl = document.getElementById("miniShadowStats");
  const rewardEl = document.getElementById("miniShadowReward");
  const summaryEl = document.getElementById("miniShadowLast");
  const matchedPairs = Math.max(0, Number(payload?.matchedPairs || 0));
  const totalPairs = Math.max(1, Number(payload?.totalPairs || 1));
  const attempts = Math.max(0, Number(payload?.attempts || 0));
  const misses = Math.max(0, Number(payload?.misses || 0));
  const score = Math.max(0, Number(payload?.score || 0));
  const streak = Math.max(0, Number(payload?.streak || 0));
  const bestStreak = Math.max(0, Number(payload?.bestStreak || 0));
  const rewardPackName = String(payload?.rewardPackName || "");
  const nextRewardPackName = String(payload?.nextRewardPackName || "");
  const nextRewardThreshold = Math.max(0, Number(payload?.nextRewardThreshold || 0));

  if (scoreEl) {
    scoreEl.textContent = `Pairs ${matchedPairs}/${totalPairs} | Score ${score} | Streak ${streak}`;
  }
  if (statsEl) {
    statsEl.textContent = `Attempts ${attempts} | Misses ${misses} | Best streak ${bestStreak}`;
  }
  if (rewardEl) {
    rewardEl.textContent = rewardPackName
      ? `Unlocked reward pack: ${rewardPackName}${nextRewardPackName ? ` | Next at streak ${nextRewardThreshold}: ${nextRewardPackName}` : ""}`
      : nextRewardPackName
        ? `Next reward pack: streak ${nextRewardThreshold} unlocks ${nextRewardPackName}`
        : "No more reward packs to unlock.";
  }

  if (summaryEl) {
    const lastMove = payload?.lastMove && typeof payload.lastMove === "object" ? payload.lastMove : null;
    const moveSeq = Math.max(0, Number(lastMove?.seq || 0));
    const forceSummaryText = options.forceSummaryText === true;
    let handledMove = false;

    if (lastMove && (forceSummaryText || moveSeq > miniShadowMatchLastMoveSeq)) {
      miniShadowMatchLastMoveSeq = moveSeq;
      handledMove = true;
      if (String(lastMove.type || "") === "match") {
        const unlockText = lastMove.rewardPackName ? ` Unlocked ${lastMove.rewardPackName}.` : "";
        summaryEl.textContent = `${lastMove.label || "Pair"} matched for +${Math.max(0, Number(lastMove.points || 0))}. Streak ${Math.max(0, Number(lastMove.streak || 0))}.${unlockText}`;
        setNotice(
          lastMove.rewardPackName
            ? `Match streak ${Math.max(0, Number(lastMove.streak || 0))}. ${lastMove.rewardPackName} unlocked.`
            : `Match made. Streak ${Math.max(0, Number(lastMove.streak || 0))}.`,
          "good"
        );
        playMiniGameSfx(lastMove.rewardPackName ? "unlock" : "progress", { cooldownMs: 90 });
      } else if (String(lastMove.type || "") === "miss") {
        summaryEl.textContent = "No match. Those shadows flip back, and your streak resets.";
        setNotice(`Missed pair. ${Math.max(0, Number(lastMove.misses || 0))} misses so far.`, "bad");
        playMiniGameSfx("miss", { cooldownMs: 90 });
      }
    }

    if (payload?.completed === true) {
      if (!handledMove) {
        summaryEl.textContent = `Shadow Match complete. You found ${matchedPairs}/${totalPairs} pairs with a best streak of ${bestStreak}.`;
      }
      if (!forceSummaryText) {
        setNotice("Shadow Match complete. Waiting for results...", "good");
      }
    } else if (forceSummaryText && !handledMove) {
      summaryEl.textContent = "Flip two cards at a time, remember the blooks you see, and stack streaks to unlock better reward packs.";
      setNotice("Shadow Match live. Match fast and protect your streak.", "");
    }
  }
}

function clampMiniHallwayLane(value) {
  return Math.max(0, Math.min(2, Math.round(Number(value ?? 1))));
}

function miniHallwayDashLaneLabel(value) {
  return MINI_HALLWAY_LANE_LABELS[clampMiniHallwayLane(value)] || "Center";
}

function miniHallwayDashItemDisplay(kind) {
  const key = String(kind || "cone").toLowerCase();
  if (key === "coin") {
    return {
      label: "COIN",
      bg: "linear-gradient(180deg, rgba(255, 224, 130, 0.95) 0%, rgba(245, 158, 11, 0.98) 100%)",
      border: "rgba(146, 64, 14, 0.55)",
      color: "#3b1f06"
    };
  }
  if (key === "backpack") {
    return {
      label: "BAG",
      bg: "linear-gradient(180deg, rgba(248, 180, 120, 0.96) 0%, rgba(180, 83, 9, 0.98) 100%)",
      border: "rgba(120, 53, 15, 0.5)",
      color: "#fff6ea"
    };
  }
  if (key === "puddle") {
    return {
      label: "WET",
      bg: "linear-gradient(180deg, rgba(103, 232, 249, 0.92) 0%, rgba(2, 132, 199, 0.98) 100%)",
      border: "rgba(8, 47, 73, 0.45)",
      color: "#effbff"
    };
  }
  return {
    label: "CONE",
    bg: "linear-gradient(180deg, rgba(251, 191, 36, 0.95) 0%, rgba(234, 88, 12, 0.98) 100%)",
    border: "rgba(124, 45, 18, 0.48)",
    color: "#fff7ed"
  };
}

function renderMiniHallwayDashScene(payload = {}) {
  const stage = document.getElementById("miniHallwayStage");
  if (!stage) {
    return;
  }

  const lanePositions = [18, 50, 82];
  const lane = clampMiniHallwayLane(payload?.lane);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const jumpActive = payload?.jumpActive === true;
  const runnerTop = jumpActive ? 68 : 82;
  const runnerName = escapeHtml(((playerName || "You").trim().slice(0, 8) || "YOU").toUpperCase());

  stage.innerHTML = `
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(245,248,253,0.98) 0%, rgba(226,234,246,0.98) 18%, rgba(194,207,226,0.98) 100%);"></div>
    <div style="position:absolute;left:7%;right:7%;top:8%;bottom:8%;border-radius:26px;overflow:hidden;border:1px solid rgba(108, 126, 156, 0.42);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.45), 0 16px 32px rgba(31,41,55,0.18);background:linear-gradient(180deg, rgba(247,250,255,0.92) 0%, rgba(213,223,240,0.95) 100%);">
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(180deg, rgba(255,255,255,0.18) 0 9%, rgba(160,174,192,0.05) 9% 18%);"></div>
      <div style="position:absolute;left:0;right:0;top:0;height:16%;background:linear-gradient(180deg, rgba(199,210,223,0.9) 0%, rgba(236,242,250,0.75) 100%);border-bottom:1px solid rgba(133,152,182,0.3);"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:20%;background:linear-gradient(180deg, rgba(174,185,204,0.15) 0%, rgba(137,148,168,0.38) 100%);"></div>
      ${lanePositions
        .map(
          (left, index) => `
            <div style="position:absolute;left:${left}%;top:0;bottom:0;transform:translateX(-50%);width:2px;background:linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.18) 38%, rgba(255,255,255,0.06) 100%);"></div>
            <div style="position:absolute;left:${left}%;top:5.5%;transform:translateX(-50%);font-size:0.72rem;font-weight:800;letter-spacing:0.14em;color:rgba(71,85,105,0.86);">${escapeHtml(miniHallwayDashLaneLabel(index).toUpperCase())}</div>`
        )
        .join("")}
      ${items
        .map((item) => {
          const tone = miniHallwayDashItemDisplay(item?.kind);
          const top = Math.max(-6, Math.min(94, Number(item?.y || 0)));
          const left = lanePositions[clampMiniHallwayLane(item?.lane)];
          const coinLine = String(item?.kind || "") === "coin" ? `<div style="font-size:0.68rem;font-weight:700;opacity:0.88;">+${Math.max(0, Number(item?.coinValue || 0))}</div>` : "";
          return `
            <div style="position:absolute;left:${left}%;top:${top}%;transform:translate(-50%, -50%);min-width:78px;padding:8px 10px;border-radius:18px;background:${tone.bg};border:1px solid ${tone.border};box-shadow:0 10px 22px rgba(15,23,42,0.18);text-align:center;color:${tone.color};font-weight:900;letter-spacing:0.08em;">
              <div style="font-size:0.86rem;line-height:1;">${escapeHtml(tone.label)}</div>
              ${coinLine}
            </div>`;
        })
        .join("")}
      <div style="position:absolute;left:${lanePositions[lane]}%;top:${runnerTop}%;transform:translate(-50%, -50%);display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="min-width:86px;padding:10px 14px;border-radius:20px;background:linear-gradient(180deg, rgba(59,130,246,0.94) 0%, rgba(30,64,175,0.98) 100%);border:1px solid rgba(191,219,254,0.58);box-shadow:0 12px 26px rgba(30,64,175,0.28);text-align:center;color:#eff6ff;font-weight:900;letter-spacing:0.08em;">${runnerName}</div>
        <div style="padding:4px 10px;border-radius:999px;background:rgba(15,23,42,0.68);border:1px solid rgba(148,163,184,0.34);font-size:0.7rem;font-weight:800;letter-spacing:0.12em;color:#f8fafc;">${escapeHtml((jumpActive ? "JUMP" : miniHallwayDashLaneLabel(lane)).toUpperCase())}</div>
      </div>
    </div>`;
}

function applyMiniHallwayDashState(payload = {}, options = {}) {
  miniHallwayDashState = payload;
  renderMiniHallwayDashScene(payload);

  const scoreEl = document.getElementById("miniHallwayScore");
  const statsEl = document.getElementById("miniHallwayStats");
  const summaryEl = document.getElementById("miniHallwayLast");
  const distance = Math.max(0, Number(payload?.distance || 0));
  const coinsFound = Math.max(0, Number(payload?.coinsFound || 0));
  const dodges = Math.max(0, Number(payload?.dodges || 0));
  const hits = Math.max(0, Number(payload?.hits || 0));
  const maxHits = Math.max(1, Number(payload?.maxHits || 3));
  const score = Math.max(0, Number(payload?.score || 0));
  const lane = clampMiniHallwayLane(payload?.lane);

  if (scoreEl) {
    scoreEl.textContent = `Distance ${distance} m | Coins ${coinsFound} | Score ${score}`;
  }
  if (statsEl) {
    statsEl.textContent = `Dodges ${dodges} | Hits ${hits}/${maxHits} | Lane ${miniHallwayDashLaneLabel(lane)}`;
  }

  const hallwayButtons = chests.querySelectorAll(
    "button[data-mini-action='hallway_left'], button[data-mini-action='hallway_right'], button[data-mini-action='hallway_jump']"
  );
  hallwayButtons.forEach((button) => {
    button.disabled = payload?.completed === true;
  });

  if (summaryEl) {
    const lastEvent = payload?.lastEvent && typeof payload.lastEvent === "object" ? payload.lastEvent : null;
    const eventSeq = Math.max(0, Number(lastEvent?.seq || 0));
    const forceSummaryText = options.forceSummaryText === true;
    let handledEvent = false;

    if (lastEvent && (forceSummaryText || eventSeq > miniHallwayDashLastEventSeq)) {
      miniHallwayDashLastEventSeq = eventSeq;
      handledEvent = true;
      const label = String(lastEvent.label || miniHallwayDashItemDisplay(lastEvent.kind).label || "Hallway item");
      if (String(lastEvent.type || "") === "coin") {
        summaryEl.textContent = `${label} collected for +${Math.max(0, Number(lastEvent.coins || 0))} coins.`;
        setNotice(`Hallway coins found: +${Math.max(0, Number(lastEvent.coins || 0))}.`, "good");
        playMiniGameSfx("reward");
      } else if (String(lastEvent.type || "") === "hit") {
        summaryEl.textContent = `${label} clipped your run. Shift sooner or jump over it next time.`;
        setNotice(`Hit by ${label.toLowerCase()}. ${Math.max(0, maxHits - hits)} hits left.`, "bad");
        playMiniGameSfx("miss");
      } else {
        summaryEl.textContent = `Clean move. ${label} cleared safely.`;
        setNotice(`${label} cleared. Keep running.`, "good");
        playMiniGameSfx("progress", { cooldownMs: 90 });
      }
    }

    if (payload?.completed === true) {
      if (!handledEvent) {
        summaryEl.textContent = payload?.failed === true
          ? "Too many hits. Your hallway run is locked in."
          : "Hallway run complete. Results are on the way.";
      }
      if (!forceSummaryText) {
        setNotice(
          payload?.failed === true ? "Hallway Dash complete. You ran out of hits." : "Hallway Dash complete. Waiting for results...",
          payload?.failed === true ? "bad" : "good"
        );
      }
    } else if (forceSummaryText && !handledEvent) {
      summaryEl.textContent = "Stay in a safe lane, jump the clutter, and scoop up the coin spills.";
      setNotice("Hallway Dash live. Dodge clutter and collect coins.", "");
    }
  }
}

function clampMiniGoalieRushLane(value) {
  return Math.max(0, Math.min(2, Math.round(Number(value ?? 1))));
}

function miniGoalieRushLaneLabel(value) {
  return ["Left", "Center", "Right"][clampMiniGoalieRushLane(value)] || "Center";
}

function updateMiniGoalieRushLaneButtons(lane) {
  const safeLane = clampMiniGoalieRushLane(lane);
  chests.querySelectorAll("button[data-mini-action='goalie_lane']").forEach((button) => {
    const buttonLane = clampMiniGoalieRushLane(button.getAttribute("data-mini-value"));
    button.classList.toggle("selected", buttonLane === safeLane);
  });
}

function renderMiniGoalieRushScene(payload = {}) {
  const stage = document.getElementById("miniGoalieStage");
  if (!stage) {
    return;
  }

  const lanePositions = [18, 50, 82];
  const lane = clampMiniGoalieRushLane(payload?.lane);
  const activeShot = payload?.activeShot && typeof payload.activeShot === "object" ? payload.activeShot : null;
  const progress = Math.max(0, Math.min(1, Number(activeShot?.progress || 0)));
  const shotTop = activeShot ? 18 + progress * 60 : 12;
  const shotScale = activeShot ? (activeShot?.boss ? 1.18 : 1) * (0.84 + progress * 0.32) : 1;
  const shotLeft = lanePositions[clampMiniGoalieRushLane(activeShot?.lane)];
  const goalieName = escapeHtml(((playerName || "You").trim().slice(0, 9) || "YOU").toUpperCase());

  stage.innerHTML = `
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(186,230,253,0.95) 0%, rgba(224,242,254,0.95) 24%, rgba(255,255,255,0.96) 58%, rgba(220,252,231,0.98) 100%);"></div>
    <div style="position:absolute;left:6%;right:6%;top:9%;bottom:8%;border-radius:28px;overflow:hidden;border:1px solid rgba(125,211,252,0.42);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.52),0 16px 34px rgba(15,23,42,0.16);background:linear-gradient(180deg, rgba(240,249,255,0.96) 0%, rgba(224,242,254,0.95) 36%, rgba(220,252,231,0.96) 100%);">
      <div style="position:absolute;left:10%;right:10%;top:8%;height:12px;border-radius:999px;background:rgba(15,23,42,0.92);"></div>
      <div style="position:absolute;left:11%;right:11%;top:8%;height:56%;border:4px solid rgba(15,23,42,0.86);border-top:none;border-bottom:none;border-radius:0 0 22px 22px;"></div>
      <div style="position:absolute;left:12%;right:12%;top:10%;bottom:24%;background:repeating-linear-gradient(90deg, rgba(148,163,184,0.18) 0 5%, rgba(255,255,255,0.1) 5% 10%),repeating-linear-gradient(180deg, rgba(148,163,184,0.14) 0 8%, rgba(255,255,255,0.1) 8% 16%);border-radius:0 0 18px 18px;"></div>
      <div style="position:absolute;left:0;right:0;top:0;bottom:0;background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 30%);"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:24%;background:linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(22,163,74,0.26) 100%);"></div>
      ${lanePositions
        .map(
          (left, index) => `
            <div style="position:absolute;left:${left}%;top:10%;bottom:16%;transform:translateX(-50%);width:2px;background:linear-gradient(180deg, rgba(14,165,233,0.06) 0%, rgba(14,165,233,0.22) 55%, rgba(255,255,255,0.08) 100%);"></div>
            <div style="position:absolute;left:${left}%;top:72%;transform:translateX(-50%);padding:4px 10px;border-radius:999px;background:${index === lane ? "rgba(14,116,144,0.88)" : "rgba(255,255,255,0.64)"};border:1px solid ${index === lane ? "rgba(186,230,253,0.66)" : "rgba(148,163,184,0.22)"};font-size:0.7rem;font-weight:800;letter-spacing:0.12em;color:${index === lane ? "#f0fdfa" : "#334155"};">${escapeHtml(miniGoalieRushLaneLabel(index).toUpperCase())}</div>`
        )
        .join("")}
      ${activeShot ? `
        <div style="position:absolute;left:${shotLeft}%;top:${shotTop}%;transform:translate(-50%, -50%) scale(${shotScale});display:flex;flex-direction:column;align-items:center;gap:4px;z-index:2;">
          ${activeShot.boss ? `<div style="padding:4px 8px;border-radius:999px;background:linear-gradient(90deg, rgba(251,191,36,0.96) 0%, rgba(249,115,22,0.96) 100%);border:1px solid rgba(146,64,14,0.34);font-size:0.66rem;font-weight:900;letter-spacing:0.12em;color:#431407;">BOSS +${Math.max(0, Number(activeShot.coins || 0))}</div>` : ""}
          <div style="width:54px;height:54px;border-radius:999px;background:radial-gradient(circle at 34% 34%, rgba(255,255,255,0.96) 0 22%, rgba(226,232,240,0.98) 22% 42%, rgba(15,23,42,0.96) 42% 48%, rgba(255,255,255,0.94) 48% 68%, rgba(15,23,42,0.96) 68% 76%, rgba(226,232,240,0.98) 76% 100%);box-shadow:0 14px 24px rgba(15,23,42,0.2);"></div>
        </div>` : ""}
      <div style="position:absolute;left:${lanePositions[lane]}%;top:84%;transform:translate(-50%, -50%);display:flex;flex-direction:column;align-items:center;gap:8px;z-index:3;">
        <div style="width:74px;height:74px;border-radius:26px;background:linear-gradient(180deg, rgba(37,99,235,0.96) 0%, rgba(30,64,175,0.98) 100%);border:1px solid rgba(191,219,254,0.58);box-shadow:0 14px 28px rgba(30,64,175,0.26);display:flex;align-items:center;justify-content:center;color:#eff6ff;font-size:1.1rem;font-weight:900;letter-spacing:0.06em;">GK</div>
        <div style="padding:5px 12px;border-radius:999px;background:rgba(15,23,42,0.74);border:1px solid rgba(148,163,184,0.34);font-size:0.72rem;font-weight:800;letter-spacing:0.12em;color:#f8fafc;">${goalieName}</div>
      </div>
      <div style="position:absolute;left:10%;right:10%;bottom:15%;height:4px;border-radius:999px;background:rgba(15,23,42,0.7);"></div>
    </div>`;
}

function applyMiniGoalieRushState(payload = {}, options = {}) {
  miniGoalieRushState = payload;
  renderMiniGoalieRushScene(payload);
  updateMiniGoalieRushLaneButtons(payload?.lane);

  const scoreEl = document.getElementById("miniGoalieScore");
  const statsEl = document.getElementById("miniGoalieStats");
  const summaryEl = document.getElementById("miniGoalieLast");
  const shotsFaced = Math.max(0, Number(payload?.shotsFaced || 0));
  const saves = Math.max(0, Number(payload?.saves || 0));
  const goalsAllowed = Math.max(0, Number(payload?.goalsAllowed || 0));
  const bossSaves = Math.max(0, Number(payload?.bossSaves || 0));
  const bossCoinsEarned = Math.max(0, Number(payload?.bossCoinsEarned || 0));
  const bestStreak = Math.max(0, Number(payload?.bestStreak || 0));
  const streak = Math.max(0, Number(payload?.streak || 0));
  const nextBossRound = Math.max(1, Number(payload?.nextBossRound || 5));
  const currentRound = Math.max(1, Number(payload?.activeShot?.round || payload?.currentRound || shotsFaced + 1));

  if (scoreEl) {
    scoreEl.textContent = `Saves ${saves} | Boss Saves ${bossSaves} | Coins ${bossCoinsEarned}`;
  }
  if (statsEl) {
    statsEl.textContent = `Shots ${shotsFaced} | Goals Allowed ${goalsAllowed} | Streak ${streak} | Best ${bestStreak} | Round ${currentRound}${currentRound < nextBossRound ? ` | Boss at ${nextBossRound}` : ""}`;
  }

  const laneButtons = chests.querySelectorAll("button[data-mini-action='goalie_lane']");
  laneButtons.forEach((button) => {
    button.disabled = payload?.completed === true;
  });

  if (!summaryEl) {
    return;
  }

  const lastEvent = payload?.lastEvent && typeof payload.lastEvent === "object" ? payload.lastEvent : null;
  const eventSeq = Math.max(0, Number(lastEvent?.seq || 0));
  const forceSummaryText = options.forceSummaryText === true;
  let handledEvent = false;

  if (lastEvent && (forceSummaryText || eventSeq > miniGoalieRushLastEventSeq)) {
    miniGoalieRushLastEventSeq = eventSeq;
    handledEvent = true;
    const laneLabel = miniGoalieRushLaneLabel(lastEvent?.lane);
    if (String(lastEvent.type || "") === "boss_save") {
      summaryEl.textContent = `Boss shot saved in the ${laneLabel.toLowerCase()} lane for +${Math.max(0, Number(lastEvent.coinsAwarded || 0))} coins.`;
      setNotice(`Boss save! +${Math.max(0, Number(lastEvent.coinsAwarded || 0))} bonus coins banked.`, "good");
      playMiniGameSfx("unlock");
    } else if (String(lastEvent.type || "") === "save") {
      summaryEl.textContent = `Clean save in the ${laneLabel.toLowerCase()} lane. Recover fast for the next shot.`;
      setNotice(`Save made in the ${laneLabel.toLowerCase()} lane.`, "good");
      playMiniGameSfx("progress", { cooldownMs: 80 });
    } else if (String(lastEvent.type || "") === "boss_goal") {
      summaryEl.textContent = `Boss shot slipped past in the ${laneLabel.toLowerCase()} lane. The next one will be even faster.`;
      setNotice("Boss shot scored. Reset and get ready.", "bad");
      playMiniGameSfx("miss");
    } else {
      summaryEl.textContent = `Shot got past in the ${laneLabel.toLowerCase()} lane. Shift quicker for the next save.`;
      setNotice(`Goal allowed in the ${laneLabel.toLowerCase()} lane.`, "bad");
      playMiniGameSfx("miss");
    }
  }

  if (payload?.completed === true) {
    if (!handledEvent) {
      summaryEl.textContent = `Goalie Rush complete. You blocked ${saves} shots and banked ${bossCoinsEarned} coins.`;
    }
    if (!forceSummaryText) {
      setNotice("Goalie Rush complete. Waiting for results...", "good");
    }
  } else if (forceSummaryText && !handledEvent) {
    summaryEl.textContent = "Slide left and right to guard the goal. Boss shots hit every fifth round and award extra coins when you block them.";
    setNotice("Goalie Rush live. Get in front of each shot before it reaches the goal line.", "");
  }
}

function clampMiniClassroomCleanupLane(value) {
  return Math.max(0, Math.min(2, Math.round(Number(value ?? 1))));
}

function miniClassroomCleanupLaneLabel(value) {
  return ["Window Row", "Center Row", "Door Row"][clampMiniClassroomCleanupLane(value)] || "Center Row";
}

function miniClassroomCleanupItemDisplay(kind) {
  const key = String(kind || "book").toLowerCase();
  if (key === "pencil") {
    return {
      label: "PENCIL",
      bg: "linear-gradient(180deg, rgba(253, 230, 138, 0.96) 0%, rgba(245, 158, 11, 0.98) 100%)",
      border: "rgba(180, 83, 9, 0.5)",
      color: "#4a2406"
    };
  }
  if (key === "trash") {
    return {
      label: "TRASH",
      bg: "linear-gradient(180deg, rgba(203, 213, 225, 0.95) 0%, rgba(100, 116, 139, 0.98) 100%)",
      border: "rgba(51, 65, 85, 0.45)",
      color: "#f8fafc"
    };
  }
  return {
    label: "BOOK",
    bg: "linear-gradient(180deg, rgba(147, 197, 253, 0.95) 0%, rgba(37, 99, 235, 0.98) 100%)",
    border: "rgba(30, 64, 175, 0.45)",
    color: "#eff6ff"
  };
}

function renderMiniClassroomCleanupScene(payload = {}) {
  const stage = document.getElementById("miniCleanupStage");
  if (!stage) {
    return;
  }

  const lanePositions = [18, 50, 82];
  const lane = clampMiniClassroomCleanupLane(payload?.lane);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const runnerName = escapeHtml(((playerName || "You").trim().slice(0, 8) || "YOU").toUpperCase());

  stage.innerHTML = `
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(226,232,240,0.98) 24%, rgba(203,213,225,0.98) 100%);"></div>
    <div style="position:absolute;left:5%;right:5%;top:7%;bottom:8%;border-radius:28px;overflow:hidden;border:1px solid rgba(148,163,184,0.34);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.42),0 18px 32px rgba(15,23,42,0.16);background:linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(226,232,240,0.94) 100%);">
      <div style="position:absolute;left:0;right:0;top:0;height:17%;background:linear-gradient(180deg, rgba(191,219,254,0.72) 0%, rgba(239,246,255,0.38) 100%);border-bottom:1px solid rgba(148,163,184,0.3);"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:24%;background:linear-gradient(180deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0.28) 100%);"></div>
      <div style="position:absolute;left:9%;right:9%;bottom:14%;height:16px;border-radius:999px;background:rgba(30,41,59,0.12);"></div>
      ${lanePositions
        .map(
          (left, index) => `
            <div style="position:absolute;left:${left}%;top:0;bottom:0;transform:translateX(-50%);width:2px;background:linear-gradient(180deg, rgba(148,163,184,0.1) 0%, rgba(148,163,184,0.24) 38%, rgba(255,255,255,0.06) 100%);"></div>
            <div style="position:absolute;left:${left}%;top:6%;transform:translateX(-50%);padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.6);border:1px solid rgba(148,163,184,0.26);font-size:0.68rem;font-weight:800;letter-spacing:0.12em;color:#475569;">${escapeHtml(miniClassroomCleanupLaneLabel(index).toUpperCase())}</div>`
        )
        .join("")}
      ${items
        .map((item) => {
          const tone = miniClassroomCleanupItemDisplay(item?.kind);
          const top = Math.max(-6, Math.min(94, Number(item?.y || 0)));
          const left = lanePositions[clampMiniClassroomCleanupLane(item?.lane)];
          return `
            <div style="position:absolute;left:${left}%;top:${top}%;transform:translate(-50%, -50%);min-width:88px;padding:9px 10px;border-radius:18px;background:${tone.bg};border:1px solid ${tone.border};box-shadow:0 10px 20px rgba(15,23,42,0.16);text-align:center;color:${tone.color};font-weight:900;letter-spacing:0.08em;">
              <div style="font-size:0.84rem;line-height:1;">${escapeHtml(tone.label)}</div>
            </div>`;
        })
        .join("")}
      <div style="position:absolute;left:${lanePositions[lane]}%;top:84%;transform:translate(-50%, -50%);display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="min-width:98px;padding:10px 14px;border-radius:22px;background:linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(51,65,85,0.98) 100%);border:1px solid rgba(203,213,225,0.44);box-shadow:0 12px 24px rgba(15,23,42,0.24);text-align:center;color:#f8fafc;font-weight:900;letter-spacing:0.08em;">${runnerName}</div>
        <div style="padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.72);border:1px solid rgba(148,163,184,0.26);font-size:0.7rem;font-weight:800;letter-spacing:0.12em;color:#334155;">${escapeHtml(miniClassroomCleanupLaneLabel(lane).toUpperCase())}</div>
      </div>
      <div style="position:absolute;left:8%;right:8%;bottom:4.5%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
        ${[
          { key: "book", label: "BOOKSHELF" },
          { key: "pencil", label: "PENCIL CUP" },
          { key: "trash", label: "TRASH CAN" }
        ]
          .map((bin) => {
            const tone = miniClassroomCleanupItemDisplay(bin.key);
            return `<div style="padding:8px 10px;border-radius:16px;background:${tone.bg};border:1px solid ${tone.border};text-align:center;color:${tone.color};font-size:0.74rem;font-weight:900;letter-spacing:0.08em;">${escapeHtml(bin.label)}</div>`;
          })
          .join("")}
      </div>
    </div>`;
}

function applyMiniClassroomCleanupState(payload = {}, options = {}) {
  miniClassroomCleanupState = payload;
  renderMiniClassroomCleanupScene(payload);

  const scoreEl = document.getElementById("miniCleanupScore");
  const statsEl = document.getElementById("miniCleanupStats");
  const summaryEl = document.getElementById("miniCleanupLast");
  const score = Math.max(0, Number(payload?.score || 0));
  const sortedCount = Math.max(0, Number(payload?.sortedCount || 0));
  const booksSorted = Math.max(0, Number(payload?.booksSorted || 0));
  const pencilsSorted = Math.max(0, Number(payload?.pencilsSorted || 0));
  const trashSorted = Math.max(0, Number(payload?.trashSorted || 0));
  const misses = Math.max(0, Number(payload?.misses || 0));
  const wrongSorts = Math.max(0, Number(payload?.wrongSorts || 0));
  const combo = Math.max(0, Number(payload?.combo || 0));
  const bestCombo = Math.max(0, Number(payload?.bestCombo || 0));
  const lane = clampMiniClassroomCleanupLane(payload?.lane);

  if (scoreEl) {
    scoreEl.textContent = `Sorted ${sortedCount} | Score ${score} | Combo ${combo}`;
  }
  if (statsEl) {
    statsEl.textContent = `${booksSorted} books | ${pencilsSorted} pencils | ${trashSorted} trash | Misses ${misses} | Wrong bins ${wrongSorts} | Row ${miniClassroomCleanupLaneLabel(lane)}`;
  }

  const cleanupButtons = chests.querySelectorAll(
    "button[data-mini-action='cleanup_left'], button[data-mini-action='cleanup_right'], button[data-mini-action='cleanup_book'], button[data-mini-action='cleanup_pencil'], button[data-mini-action='cleanup_trash']"
  );
  cleanupButtons.forEach((button) => {
    button.disabled = payload?.completed === true;
  });

  if (summaryEl) {
    const lastEvent = payload?.lastEvent && typeof payload.lastEvent === "object" ? payload.lastEvent : null;
    const eventSeq = Math.max(0, Number(lastEvent?.seq || 0));
    const forceSummaryText = options.forceSummaryText === true;
    let handledEvent = false;

    if (lastEvent && (forceSummaryText || eventSeq > miniClassroomCleanupLastEventSeq)) {
      miniClassroomCleanupLastEventSeq = eventSeq;
      handledEvent = true;
      if (String(lastEvent.type || "") === "sorted") {
        summaryEl.textContent = `${lastEvent.label} sorted into the ${lastEvent.binLabel} for +${Math.max(0, Number(lastEvent.points || 0))}.`;
        setNotice(`Clean sort. Combo ${Math.max(0, Number(lastEvent.combo || 0))}.`, "good");
        playMiniGameSfx(combo >= 3 ? "reward" : "progress", { cooldownMs: 80 });
      } else if (String(lastEvent.type || "") === "wrong_sort") {
        summaryEl.textContent = `${lastEvent.label} went into the wrong bin. Reset and refocus.`;
        setNotice(`Wrong bin. ${Math.max(0, wrongSorts)} wrong sorts so far.`, "bad");
        playMiniGameSfx("miss", { cooldownMs: 90 });
      } else if (String(lastEvent.type || "") === "missed") {
        summaryEl.textContent = `${lastEvent.label} hit the floor before you sorted it.`;
        setNotice(`Missed item. ${Math.max(0, misses)} misses so far.`, "bad");
        playMiniGameSfx("miss", { cooldownMs: 90 });
      }
    }

    if (payload?.completed === true) {
      if (!handledEvent) {
        summaryEl.textContent = `Cleanup complete. You sorted ${sortedCount} items with a best combo of ${bestCombo}.`;
      }
      if (!forceSummaryText) {
        setNotice("Classroom Cleanup complete. Waiting for results...", "good");
      }
    } else if (forceSummaryText && !handledEvent) {
      summaryEl.textContent = "Move to the matching row, then sort books, pencils, and trash before they hit the floor.";
      setNotice("Classroom Cleanup live. Sort fast and keep your combo going.", "");
    }
  }
}

function battleRoyaleActionLabel(action, payload = {}) {
  if (action === "attack") return "Attack";
  if (action === "guard") return "Guard";
  if (action === "heal") return "Heal";
  if (action === "special") return String(payload?.you?.powerName || "Special");
  return "Move";
}

function battleRoyaleActionDescription(action, payload = {}) {
  const you = payload?.you || {};
  if (action === "attack") {
    return `Deal about ${Math.max(0, Number(you.attackDamage || 0))} damage.`;
  }
  if (action === "guard") {
    return `Add ${Math.max(0, Number(you.guardAmount || 0))} shield before hits land.`;
  }
  if (action === "heal") {
    return `Recover about ${Math.max(0, Number(you.healAmount || 0))} HP.`;
  }
  if (action === "special") {
    if (you.specialReady === true) {
      return String(you.powerDescription || "Use your blook power.");
    }
    return `${String(you.powerName || "Special")} recharges in ${Math.max(0, Number(you.specialReadyIn || 0))} more turn${Math.max(0, Number(you.specialReadyIn || 0)) === 1 ? "" : "s"}.`;
  }
  return "";
}

function battleRoyaleHpPercent(current, max) {
  const safeMax = Math.max(1, Number(max || 1));
  return Math.max(0, Math.min(100, Math.round((Math.max(0, Number(current || 0)) / safeMax) * 100)));
}

function renderMiniBattleRoyaleStage(payload = {}) {
  const stage = document.getElementById("miniBattleRoyaleStage");
  if (!stage) {
    return;
  }

  const you = payload?.you || {};
  const opponent = payload?.opponent || {};
  const selectedAction = String(payload?.selectedAction || "");
  const completed = payload?.completed === true;
  const battleEnded = completed || payload?.won === true || payload?.tie === true;
  const actionButtons = [
    { id: "attack", tone: "rgba(59,130,246,0.16)", border: "rgba(96,165,250,0.42)" },
    { id: "guard", tone: "rgba(16,185,129,0.16)", border: "rgba(52,211,153,0.42)" },
    { id: "heal", tone: "rgba(245,158,11,0.16)", border: "rgba(251,191,36,0.42)" },
    { id: "special", tone: "rgba(168,85,247,0.18)", border: "rgba(196,181,253,0.44)" }
  ];

  const buildFighterCard = (label, fighter, accent, isOpponent = false) => {
    const hp = Math.max(0, Number(fighter?.hp || 0));
    const maxHp = Math.max(1, Number(fighter?.maxHp || 1));
    const shield = Math.max(0, Number(fighter?.shield || 0));
    return `
      <article style="padding:14px;border-radius:24px;background:${accent};border:1px solid rgba(151,193,255,0.24);box-shadow:0 14px 30px rgba(15,23,42,0.16);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div>
            <div class="help" style="margin:0;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(label)}</div>
            <strong style="display:block;font-size:1.08rem;line-height:1.2;margin-top:4px;">${escapeHtml(isOpponent ? fighter?.name || "Opponent" : playerName || "You")}</strong>
            <div class="help" style="margin-top:4px;">${escapeHtml(fighter?.blook?.name || "Blook")} | ${escapeHtml(fighter?.blook?.rarity || "Rare")}</div>
          </div>
          <div style="min-width:84px;display:flex;justify-content:center;">${renderBlookWithEffect(fighter?.blook, isOpponent ? "" : selectedEffectId)}</div>
        </div>
        <div style="margin-top:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.86rem;font-weight:700;color:#334155;">
            <span>HP ${hp}/${maxHp}</span>
            <span>Shield ${shield}</span>
          </div>
          <div style="margin-top:6px;height:12px;border-radius:999px;background:rgba(148,163,184,0.2);overflow:hidden;border:1px solid rgba(148,163,184,0.28);">
            <span style="display:block;height:100%;width:${battleRoyaleHpPercent(hp, maxHp)}%;background:linear-gradient(90deg, rgba(34,197,94,0.95) 0%, rgba(16,185,129,0.95) 100%);"></span>
          </div>
        </div>
        <div style="margin-top:10px;padding:10px 12px;border-radius:18px;background:rgba(255,255,255,0.58);border:1px solid rgba(148,163,184,0.22);">
          <strong style="display:block;font-size:0.92rem;line-height:1.15;">${escapeHtml(isOpponent ? fighter?.powerName || "Special" : you.powerName || "Special")}</strong>
          <span class="help" style="margin-top:4px;display:block;">${escapeHtml(isOpponent ? fighter?.powerDescription || "" : you.powerDescription || "")}</span>
        </div>
      </article>`;
  };

  stage.innerHTML = `
    <div class="notice" id="miniBattleTurn">Turn ${Math.max(1, Number(payload?.turn || 1))}/${Math.max(1, Number(payload?.maxTurns || 1))}</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;">
      ${buildFighterCard("Your Fighter", you, "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(219,234,254,0.96) 100%)")}
      ${buildFighterCard(opponent?.isBot ? "Bot Rival" : "Opponent", opponent, "linear-gradient(180deg, rgba(255,247,237,0.96) 0%, rgba(254,215,170,0.96) 100%)", true)}
    </div>
    <div class="answers" style="margin-top:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
      ${actionButtons
        .map((button) => {
          const isSpecial = button.id === "special";
          const specialReady = you.specialReady === true;
          const disabled = completed || (selectedAction && !battleEnded) || (isSpecial && !specialReady);
          const selected = selectedAction === button.id;
          return `
            <button
              type="button"
              class="answer"
              data-mini-action="battle_${button.id}"
              ${disabled ? "disabled" : ""}
              style="min-height:98px;padding:12px;text-align:left;background:${button.tone};border-color:${selected ? "rgba(37,99,235,0.85)" : button.border};box-shadow:${selected ? "0 0 0 2px rgba(37,99,235,0.18)" : "none"};">
              <strong style="display:block;font-size:1rem;line-height:1.15">${escapeHtml(battleRoyaleActionLabel(button.id, payload))}</strong>
              <span class="help" style="margin-top:8px;display:block;line-height:1.2">${escapeHtml(battleRoyaleActionDescription(button.id, payload))}</span>
            </button>`;
        })
        .join("")}
    </div>
    <div id="miniBattleSummary" class="help" style="margin-top:10px;">${escapeHtml(payload?.summary || "Pick a move to start the duel.")}</div>
    <div id="miniBattleLog" class="feed" style="margin-top:10px;">
      ${(Array.isArray(payload?.log) ? payload.log : [])
        .slice(-6)
        .map((entry) => `<div class="feed-item">${escapeHtml(entry?.text || "")}</div>`)
        .join("") || `<div class="help">Battle log will appear here.</div>`}
    </div>
  `;
}

function updateMiniBattleRoyaleTurnTimer() {
  const turnEl = document.getElementById("miniBattleTurn");
  if (!turnEl) {
    return;
  }

  const payload = miniBattleRoyaleState;
  if (!payload) {
    turnEl.textContent = "Battle loading...";
    return;
  }

  if (payload.completed === true) {
    turnEl.textContent = payload.tie ? "Duel tied" : payload.won ? "Duel won" : "Duel finished";
    return;
  }

  const turn = Math.max(1, Number(payload.turn || 1));
  const maxTurns = Math.max(1, Number(payload.maxTurns || 1));
  const timeLeftMs = Math.max(0, Number(payload.turnEndsAt || 0) - Date.now());
  turnEl.textContent = `Turn ${turn}/${maxTurns} | ${Math.max(0, timeLeftMs / 1000).toFixed(1)}s left`;
}

function applyMiniBattleRoyaleState(payload = {}, options = {}) {
  miniBattleRoyaleState = payload;
  renderMiniBattleRoyaleStage(payload);
  stopMiniBattleRoyaleTicker();
  updateMiniBattleRoyaleTurnTimer();

  if (payload?.completed !== true && Number(payload?.turnEndsAt || 0) > Date.now()) {
    miniBattleRoyaleTicker = setInterval(() => {
      updateMiniBattleRoyaleTurnTimer();
    }, 100);
  }

  const resolutionSeq = Math.max(0, Number(payload?.resolutionSeq || 0));
  const forceSummaryText = options.forceSummaryText === true;
  const summaryText =
    payload?.resultText ||
    payload?.summary ||
    (payload?.selectedAction
      ? `Move locked: ${battleRoyaleActionLabel(payload.selectedAction, payload)}.`
      : payload?.opponentReady
        ? "Opponent is ready. Pick your move now."
        : "Pick attack, guard, heal, or your special power.");

  if (resolutionSeq > miniBattleRoyaleLastResolutionSeq && !forceSummaryText) {
    if (payload?.completed === true) {
      if (payload?.won === true) {
        playMiniGameSfx("unlock");
        setNotice("You won the duel. Waiting for class results...", "good");
      } else if (payload?.tie === true) {
        playMiniGameSfx("complete");
        setNotice("Battle tied. Waiting for class results...", "good");
      } else {
        playMiniGameSfx("miss");
        setNotice("Duel finished. Waiting for class results...", "");
      }
    } else {
      playMiniGameSfx("progress", { cooldownMs: 90 });
      setNotice(summaryText, payload?.won === true ? "good" : "");
    }
  } else if (forceSummaryText) {
    setNotice("Battle Royale live. Pick your move each turn before the timer locks it.", "");
  } else if (payload?.selectedAction) {
    setNotice(`Move locked: ${battleRoyaleActionLabel(payload.selectedAction, payload)}. Waiting for the turn to resolve.`, "");
  } else if (payload?.opponentReady) {
    setNotice("Opponent locked in first. Pick your move now.", "");
  }

  miniBattleRoyaleLastResolutionSeq = Math.max(miniBattleRoyaleLastResolutionSeq, resolutionSeq);
}

function renderMiniGame(type, data, actionLabel) {
  stopMiniTickers();
  activeMiniGameType = type;
  applyMiniTutorialButtonVisibility(type);

  if (type === "snake") {
    miniSnakeLastEventSeq = Number(data?.lastEvent?.seq || 0);
    chests.innerHTML = `
      <div class="chest mini-snake-chest">
        <h4>Snake Strategy</h4>
        <p class="help">Simple controls, clean turns, and planning ahead. Use <strong>Arrow keys</strong> or <strong>WASD</strong>.</p>
        <div id="miniSnakeHud" class="notice">Snacks 0 | Length 0 | Score 0</div>
        <div id="miniSnakeStats" class="help">0 moves | 180 ms step speed | Alive</div>
        <div class="mini-snake-stage">
          <canvas id="miniSnakeCanvas" class="mini-snake-canvas" width="760" height="420"></canvas>
        </div>
        <div class="mini-snake-controls">
          <div class="mini-snake-dpad">
            <button type="button" class="answer" data-mini-action="snake_dir" data-mini-value="up">Up</button>
            <button type="button" class="answer" data-mini-action="snake_dir" data-mini-value="left">Left</button>
            <button type="button" class="answer" data-mini-action="snake_dir" data-mini-value="down">Down</button>
            <button type="button" class="answer" data-mini-action="snake_dir" data-mini-value="right">Right</button>
          </div>
          <div class="help">Collect snacks, avoid walls, and do not fold into your own tail.</div>
        </div>
        <div id="miniSnakeSummary" class="help">Use Arrow keys or WASD to turn. Plan ahead because reverse turns are blocked.</div>
      </div>`;
    initMiniSnakeCanvas();
    applyMiniSnakeState(data, { forceSummaryText: true });
    return;
  }

  if (type === "tower_stacker") {
    const themes = Array.isArray(data?.themes) && data.themes.length > 0
      ? data.themes
      : [
        { id: "cats", label: "Cats" },
        { id: "dogs", label: "Dogs" },
        { id: "ducks", label: "Ducks" },
        { id: "pandas", label: "Pandas" }
      ];
    chests.innerHTML = `
      <div class="chest mini-tower-chest">
        <h4>Tower Stacker</h4>
        <p class="help">Pick a cute theme, then press <strong>Space</strong>, click <strong>Drop</strong>, or tap the stage to release the next piece.</p>
        <div class="mini-tower-topbar">
          <div id="miniTowerScore" class="notice">Height 0 | Perfect Landings 0</div>
          <div id="miniTowerDrops" class="notice">0 drops ready</div>
        </div>
        <div id="miniTowerStats" class="help">0 stacked | Height 0 | Best combo 0</div>
        <div class="mini-tower-theme-row">
          ${themes.map((theme) => `<button type="button" class="answer mini-theme-btn" data-mini-action="tower_theme" data-mini-value="${escapeHtml(theme.id)}">${escapeHtml(theme.label)}</button>`).join("")}
        </div>
        <div id="miniTowerStackerStage" class="mini-tower-stage">
          <canvas id="miniTowerStackerCanvas" class="mini-tower-canvas" width="760" height="500"></canvas>
        </div>
        <div class="mini-tower-controls">
          <button id="miniTowerDropBtn" class="answer" data-mini-action="tower_drop">${escapeHtml(actionLabel || "Drop")} (Space)</button>
          <button id="miniTowerRestartBtn" class="answer" data-mini-action="tower_restart">Restart Tower</button>
        </div>
        <div id="miniTowerSummary" class="help">Press Space, click Drop, or tap the stage when the piece lines up.</div>
      </div>`;
    initTowerStackerCanvas();
    bindTowerStackerStageDrop();
    applyMiniTowerStackerState(data, { forceSummaryText: true });
    return;
  }

  if (type === "foosball_frenzy") {
    miniFoosballSelectedLane = clampMiniFoosballLane(data?.lane);
    miniFoosballGoalieLane = clampMiniFoosballLane(data?.goalieLane);
    miniFoosballShotSeq = Number(data?.lastShot?.seq || 0);
    chests.innerHTML = `
      <div class="chest mini-foosball-chest">
        <h4>Foosball Frenzy</h4>
        <p class="help">The players stay on fixed rods. Slide the bars with <strong>Left/Right</strong>, beat the keeper, and race the class leaderboard.</p>
        <div id="miniFoosScore" class="notice">Goals 0</div>
        <div id="miniFoosStats" class="help">0 shots | 0% accuracy | 0 keeper blocks</div>
        <div id="miniFoosballStage" class="mini-foosball-stage"></div>
        <div class="mini-foosball-controls">
          <div class="answers mini-foosball-lanes">
            <button class="answer" data-mini-action="foos_lane" data-mini-value="0">Left</button>
            <button class="answer" data-mini-action="foos_lane" data-mini-value="1">Center</button>
            <button class="answer" data-mini-action="foos_lane" data-mini-value="2">Right</button>
          </div>
          <button id="miniFoosKickBtn" class="answer" data-mini-action="foos_kick">${escapeHtml(actionLabel || "Kick")} (Space)</button>
        </div>
        <div id="miniFoosLast" class="help">Get ready. Beat the moving keeper and climb the leaderboard.</div>
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

  if (type === "goalie_rush") {
    miniGoalieRushLastEventSeq = Number(data?.lastEvent?.seq || 0);
    chests.innerHTML = `
      <div class="chest">
        <h4>Goalie Rush</h4>
        <p class="help">Use <strong>Left/Right</strong>, <strong>A/D</strong>, or the lane buttons to slide across the goal and block each incoming shot. Boss shots land every fifth round for extra coins.</p>
        <div id="miniGoalieScore" class="notice">Saves 0 | Boss Saves 0 | Coins 0</div>
        <div id="miniGoalieStats" class="help">Shots 0 | Goals Allowed 0 | Streak 0 | Best 0</div>
        <div id="miniGoalieStage" style="position:relative;height:400px;margin-top:12px;border-radius:30px;overflow:hidden;background:rgba(15,23,42,0.08);border:1px solid rgba(148,163,184,0.24);"></div>
        <div class="answers" style="margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
          <button class="answer" data-mini-action="goalie_lane" data-mini-value="0">Guard Left</button>
          <button class="answer" data-mini-action="goalie_lane" data-mini-value="1">Hold Center</button>
          <button class="answer" data-mini-action="goalie_lane" data-mini-value="2">Guard Right</button>
        </div>
        <div id="miniGoalieLast" class="help" style="margin-top:10px;">Slide left and right to guard the goal. Boss shots hit every fifth round and award extra coins when you block them.</div>
      </div>`;
    applyMiniGoalieRushState(data, { forceSummaryText: true });
    return;
  }

  if (type === "tap_rush") {
    miniTapLastCount = Math.max(0, Number(data?.taps || 0));
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
    miniReactionGoCuePlayed = goAt <= Date.now();
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
        if (!miniReactionGoCuePlayed) {
          miniReactionGoCuePlayed = true;
          playMiniGameSfx("go");
        }
        return;
      }
      if (statusEl) statusEl.textContent = "Wait...";
      if (timerEl) timerEl.textContent = `${Math.max(0, Math.round(msLeft))} ms`;
    }, 50);
    return;
  }

  if (type === "sequence_memory") {
    const sequence = Array.isArray(data?.sequence) ? data.sequence : [];
    miniSequenceLastProgress = Math.max(0, Number(data?.progress || 0));
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
    miniObstacleLastStep = Math.max(0, Number(data?.step || 0));
    miniObstacleLastHits = Math.max(0, Number(data?.hits || 0));
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
    miniScrambleLastAttempts = Math.max(0, Number(data?.attempts || 0));
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

  if (type === "hallway_dash") {
    miniHallwayDashLastEventSeq = Math.max(0, Number(data?.lastEvent?.seq || 0));
    chests.innerHTML = `
      <div class="chest">
        <h4>Hallway Dash</h4>
        <p class="help">Race down the school hallway. Use <strong>Left/Right</strong> or <strong>A/D</strong> to switch lanes, then press <strong>Space</strong>, <strong>Up</strong>, or <strong>W</strong> to jump.</p>
        <div id="miniHallwayScore" class="notice">Distance 0 m | Coins 0 | Score 0</div>
        <div id="miniHallwayStats" class="help">Dodges 0 | Hits 0/3 | Lane Center</div>
        <div id="miniHallwayStage" style="position:relative;height:380px;margin-top:12px;border-radius:28px;overflow:hidden;background:rgba(15,23,42,0.18);border:1px solid rgba(148,163,184,0.26);"></div>
        <div class="answers" style="margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
          <button class="answer" data-mini-action="hallway_left">Move Left</button>
          <button class="answer" data-mini-action="hallway_jump">${escapeHtml(actionLabel || "Jump")}</button>
          <button class="answer" data-mini-action="hallway_right">Move Right</button>
        </div>
        <div id="miniHallwayLast" class="help" style="margin-top:10px;">Stay in a safe lane, jump the clutter, and scoop up the coin spills.</div>
      </div>`;
    applyMiniHallwayDashState(data, { forceSummaryText: true });
    return;
  }

  if (type === "dino_dig") {
    miniDinoDigLastRevealSeq = Math.max(0, Number(data?.lastReveal?.seq || 0));
    const maxDigs = Math.max(1, Number(data?.maxDigs || 7));
    chests.innerHTML = `
      <div class="chest">
        <h4>Dino Dig</h4>
        <p class="help">Tap dig sites to uncover fossils, coins, old bones, and maybe a rare dinosaur blook before your digs run out.</p>
        <div id="miniDinoScore" class="notice">Digs 0/${maxDigs} | Fossil Score 0</div>
        <div id="miniDinoStats" class="help">0 fossils | 0 bones | 0 coins | 0 rare finds</div>
        <div id="miniDinoGrid" class="answers" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px;"></div>
        <div id="miniDinoLast" class="help" style="margin-top:10px;">Tap any dig site. Fossils and coin caches are great, but a rare dinosaur blook is the jackpot.</div>
      </div>`;
    applyMiniDinoDigState(data, { forceSummaryText: true });
    return;
  }

  if (type === "shadow_match") {
    miniShadowMatchLastMoveSeq = Math.max(0, Number(data?.lastMove?.seq || 0));
    chests.innerHTML = `
      <div class="chest">
        <h4>Shadow Match</h4>
        <p class="help">Flip hidden blooks, remember where they are, and build longer streaks to unlock rarer reward packs.</p>
        <div id="miniShadowScore" class="notice">Pairs 0/0 | Score 0 | Streak 0</div>
        <div id="miniShadowStats" class="help">Attempts 0 | Misses 0 | Best streak 0</div>
        <div id="miniShadowReward" class="help">Make your first match to unlock a reward pack.</div>
        <div id="miniShadowGrid" class="answers" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px;"></div>
        <div id="miniShadowLast" class="help" style="margin-top:10px;">Flip two cards at a time and use your memory to keep the streak going.</div>
      </div>`;
    applyMiniShadowMatchState(data, { forceSummaryText: true });
    return;
  }

  if (type === "classroom_cleanup") {
    miniClassroomCleanupLastEventSeq = Math.max(0, Number(data?.lastEvent?.seq || 0));
    chests.innerHTML = `
      <div class="chest">
        <h4>Classroom Cleanup</h4>
        <p class="help">Move between classroom rows with <strong>Left/Right</strong> or <strong>A/D</strong>, then tap the right bin before the item hits the floor. Keys: <strong>1</strong> Book, <strong>2</strong> Pencil, <strong>3</strong> Trash.</p>
        <div id="miniCleanupScore" class="notice">Sorted 0 | Score 0 | Combo 0</div>
        <div id="miniCleanupStats" class="help">0 books | 0 pencils | 0 trash | Misses 0 | Wrong bins 0 | Row Center Row</div>
        <div id="miniCleanupStage" style="position:relative;height:400px;margin-top:12px;border-radius:30px;overflow:hidden;background:rgba(15,23,42,0.08);border:1px solid rgba(148,163,184,0.24);"></div>
        <div class="answers" style="margin-top:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
          <button class="answer" data-mini-action="cleanup_left">Move Left</button>
          <button class="answer" data-mini-action="cleanup_right">Move Right</button>
        </div>
        <div class="answers" style="margin-top:10px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
          <button class="answer" data-mini-action="cleanup_book">Sort Book (1)</button>
          <button class="answer" data-mini-action="cleanup_pencil">Sort Pencil (2)</button>
          <button class="answer" data-mini-action="cleanup_trash">Sort Trash (3)</button>
        </div>
        <div id="miniCleanupLast" class="help" style="margin-top:10px;">Move to the matching row, then sort books, pencils, and trash before they hit the floor.</div>
      </div>`;
    applyMiniClassroomCleanupState(data, { forceSummaryText: true });
    return;
  }

  if (type === "battle_royale") {
    miniBattleRoyaleLastResolutionSeq = Math.max(0, Number(data?.resolutionSeq || 0));
    chests.innerHTML = `
      <div class="chest">
        <h4>Battle Royale</h4>
        <p class="help">Your selected blook is your fighter. Pick a move every turn before the timer locks it in.</p>
        <div id="miniBattleRoyaleStage"></div>
      </div>`;
    applyMiniBattleRoyaleState(data, { forceSummaryText: true });
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

function isAsteroidsMode() {
  return String(currentMode || "").trim().toLowerCase() === "asteroids";
}

function hideAsteroidsQuestionStage() {
  asteroidRoundState = null;
  if (!asteroidsQuestionStage) {
    return;
  }
  asteroidsQuestionStage.classList.add("hidden");
  asteroidsQuestionStage.innerHTML = "";
}

function asteroidRockLayout(index, total) {
  const safeTotal = Math.max(1, Number(total || 1));
  const angle = (index / safeTotal) * Math.PI * 2 - Math.PI / 2;
  const ring = index % 3;
  const radiusX = 18 + ring * 11 + (index % 2 === 0 ? 4 : 0);
  const radiusY = 15 + ring * 9 + (index % 3 === 0 ? 4 : 0);
  return {
    left: 50 + Math.cos(angle) * radiusX,
    top: 38 + Math.sin(angle) * radiusY
  };
}

function renderPlayerAsteroidsStage(modeData = {}, options = {}) {
  if (!asteroidsQuestionStage) {
    return;
  }
  if (!isAsteroidsMode()) {
    hideAsteroidsQuestionStage();
    return;
  }

  const waveSize = Math.max(6, Number(modeData?.waveSize || asteroidRoundState?.waveSize || 8));
  const destroyedCount = Math.max(0, Math.min(waveSize, Number(options.destroyedCount ?? asteroidRoundState?.destroyedCount ?? 0)));
  const totalBlasts = Math.max(0, Number(options.totalBlasts ?? asteroidRoundState?.totalBlasts ?? destroyedCount));
  const streakCoinsAwarded = Math.max(0, Number(options.streakCoinsAwarded ?? asteroidRoundState?.streakCoinsAwarded ?? 0));
  const speedLabel = String(options.speedLabel || asteroidRoundState?.speedLabel || "");
  const summaryText =
    options.summaryText ||
    (destroyedCount > 0
      ? `${totalBlasts} asteroids blasted${speedLabel ? ` with ${speedLabel}` : ""}.`
      : "Answer fast to charge your ship and blast the wave.");
  const topPilots = Array.isArray(options.topPilots) ? options.topPilots : [];

  asteroidRoundState = {
    waveSize,
    destroyedCount,
    totalBlasts,
    streakCoinsAwarded,
    speedLabel
  };

  asteroidsQuestionStage.classList.remove("hidden");
  asteroidsQuestionStage.innerHTML = `
    <div class="asteroids-stage">
      ${Array.from({ length: waveSize }, (_, index) => {
        const layout = asteroidRockLayout(index, waveSize);
        const destroyed = index < destroyedCount;
        const coinRock = streakCoinsAwarded > 0 && index < Math.min(destroyedCount, streakCoinsAwarded);
        return `<span class="asteroid-rock${destroyed ? " destroyed" : ""}${coinRock ? " coin-rock" : ""}" style="left:${layout.left}%;top:${layout.top}%;"></span>`;
      }).join("")}
      ${destroyedCount > 0 ? `<span class="asteroids-beam"></span>` : ""}
      <span class="asteroids-ship"></span>
    </div>
    <div class="asteroids-meta">
      <span class="asteroids-pill"><strong>Wave</strong> ${waveSize}</span>
      <span class="asteroids-pill"><strong>Blasted</strong> ${totalBlasts}</span>
      <span class="asteroids-pill"><strong>Streak Coins</strong> ${streakCoinsAwarded}</span>
    </div>
    <div class="asteroids-summary">${escapeHtml(summaryText)}</div>
    ${topPilots.length > 0 ? `
      <div class="asteroids-scoreboard">
        ${topPilots.map((pilot) => `
          <div class="asteroids-score-row">
            <span>${escapeHtml(pilot.playerName || "Player")}</span>
            <span>${Math.max(0, Number(pilot.blasts || 0))} blasts${pilot.speedLabel ? ` | ${escapeHtml(pilot.speedLabel)}` : ""}</span>
          </div>`).join("")}
      </div>` : ""}
  `;
}

function applyPlayerAsteroidsAnswerAck(response = {}) {
  if (!isAsteroidsMode()) {
    return;
  }
  const blast = response?.asteroidBlast && typeof response.asteroidBlast === "object" ? response.asteroidBlast : null;
  if (!blast || response.correct !== true) {
    renderPlayerAsteroidsStage({}, {
      summaryText: "No blast this round. Answer correctly to clear the next wave."
    });
    return;
  }
  const nextDestroyed = Math.max(0, Math.min(Number(blast.waveSize || 8), Number(asteroidRoundState?.destroyedCount || 0) + Number(blast.blasts || 0)));
  renderPlayerAsteroidsStage({ waveSize: blast.waveSize }, {
    destroyedCount: nextDestroyed,
    totalBlasts: blast.blasts,
    streakCoinsAwarded: response?.streakCoinsAwarded || 0,
    speedLabel: blast.speedLabel,
    summaryText: `${blast.blasts} asteroids blasted${blast.speedLabel ? ` with ${blast.speedLabel}` : ""}.${response?.streakCoinsAwarded ? ` +${response.streakCoinsAwarded} streak coins.` : ""}`
  });
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
  setStoredAccountKey(generated);
  return accountKey;
}

function normalizeStudentLoginUsername(value) {
  if (typeof value !== "string") {
    return "";
  }
  const firstToken = value.trim().split(/\s+/)[0] || "";
  return firstToken.toLowerCase().replace(/[^a-z]/g, "");
}

function isStudentAccountKeyValue(value) {
  return String(value || "").trim().toLowerCase().startsWith("student:");
}

function setStoredAccountKey(nextKey) {
  const safeKey = String(nextKey || "").trim();
  accountKey = safeKey;
  try {
    if (safeKey) {
      window.localStorage.setItem("quizArenaAccountKey", safeKey);
    } else {
      window.localStorage.removeItem("quizArenaAccountKey");
    }
  } catch (_error) {
    // Ignore local storage failures and keep the in-memory key.
  }
}

function clearStoredStudentAccountKey() {
  if (isStudentAccountKeyValue(accountKey)) {
    accountKey = "";
  }

  let existing = "";
  try {
    existing = String(window.localStorage.getItem("quizArenaAccountKey") || "");
  } catch (_error) {
    existing = "";
  }

  if (!isStudentAccountKeyValue(existing)) {
    return;
  }

  try {
    window.localStorage.removeItem("quizArenaAccountKey");
  } catch (_error) {
    // Ignore storage failures.
  }
}

function accountQuery() {
  const currentKey = loggedInStudent?.accountKey || getOrCreateAccountKey();
  const safeKey = encodeURIComponent(currentKey);
  return `accountKey=${safeKey}`;
}

function joinAccountKey() {
  if (roomSettings.allowStudentAccounts === false) {
    return "";
  }
  if (loggedInStudent?.accountKey) {
    return loggedInStudent.accountKey;
  }
  return requiresStudentLogin() ? "" : getOrCreateAccountKey();
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

function hidePackResultNotice() {
  if (!packResult) {
    return;
  }
  packResult.classList.add("hidden");
  packResult.classList.remove("good", "bad");
  packResult.textContent = "";
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

function playPackRewardSfx(reward) {
  const rarity = String(reward?.rarity || "").toLowerCase();
  if (!reward) {
    return;
  }
  if (reward.duplicate) {
    playMiniGameSfx("reward");
    return;
  }
  if (rarity === "legendary" || rarity === "epic" || rarity === "chroma") {
    playMiniGameSfx("unlock");
    return;
  }
  playMiniGameSfx("complete");
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

function fallbackPackRarityOdds(pack) {
  const blooks = Array.isArray(pack?.blooks) ? pack.blooks : [];
  if (blooks.length === 0) {
    return [];
  }

  const counts = new Map();
  for (const blook of blooks) {
    const rarity = String(blook?.rarity || "Common");
    counts.set(rarity, (counts.get(rarity) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([rarity, count]) => ({
    rarity,
    chance: Math.round((count / blooks.length) * 100)
  }));
}

function fallbackPackCatalog() {
  return FALLBACK_BLOOKS.map((pack) => {
    const blooks = Array.isArray(pack?.blooks) ? pack.blooks : [];
    const openCost = pack.id === "students" ? 0 : 10;
    const sellValueEach = Math.max(1, Math.floor(openCost * 0.3));
    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      openCost,
      sellValueEach,
      totalCount: blooks.length,
      ownedCount: 0,
      duplicateCount: 0,
      rarityOdds: fallbackPackRarityOdds(pack),
      blooks: blooks.map((blook) => ({
        ...blook,
        image: blook.image || null,
        packId: pack.id,
        packName: pack.name,
        count: 1,
        duplicates: 0,
        sellValueEach
      }))
    };
  });
}

function applyFallbackBlookCatalog() {
  const fallbackPacks = fallbackPackCatalog();
  catalogPacks = clonePackRows(fallbackPacks);
  blookPacks = clonePackRows(fallbackPacks);

  const defaultPackId = blookPacks[0]?.id || "";
  if (!selectedPackId || !getPackById(selectedPackId)) {
    selectedPackId = defaultPackId;
  }
  if (!selectedBlookId || !getOwnedBlookById(selectedBlookId)) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(selectedPackId) || getInventoryRows()[0]?.id || "";
  }

  renderEconomyPanel();
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
  if (!shouldShowAllBlooks()) {
    return [];
  }
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
  if (shouldShowAllBlooks()) {
    return fallbackInventoryRows();
  }
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

function packIdForOwnedBlook(blookId) {
  return String(getOwnedBlookById(blookId)?.packId || "");
}

function packContainsOwnedBlook(packId, blookId) {
  const safePackId = String(packId || "");
  const safeBlookId = String(blookId || "");
  if (!safePackId || !safeBlookId) {
    return false;
  }
  return getInventoryRows().some((entry) => entry.packId === safePackId && entry.id === safeBlookId);
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
  if (requiresStudentLogin() && !loggedInStudent) {
    selectedBlookId = "";
    if (pickedBlook) {
      pickedBlook.textContent = "Log in to load your saved blooks and get ready to join.";
    }
    return;
  }
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
            <span class="help">Join uses the blook you selected here.</span>
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

  const preferredPackOrder = ["students", "superheroes", "athletes", "nfl-teams", "sports", "anime", "pokemon", "cartoon-network", "science", "space", "nature", "dinosaurs", "books"];
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
    const unlocked = Math.max(0, Number.isFinite(Number(pack.ownedCount)) ? Number(pack.ownedCount) : total);
    const badge = pack.id === "superheroes" ? `<span class="pack-tab-badge">NEW</span>` : "";
    const availabilityText = shouldShowAllBlooks() ? `${total}/${total} available` : `${unlocked}/${total} owned`;
    return `<button type="button" class="${selectedClass}" data-pack-id="${pack.id}">
      ${escapeHtml(pack.name)}<br />
      ${badge}
      <span class="help">${availabilityText}</span>
    </button>`;
  }).join("");

  const effectBtnClass = selectedPackId === "effects" ? "pack-tab selected" : "pack-tab";
  const effectBtn = `<button type="button" class="${effectBtnClass}" data-pack-id="effects" style="background:linear-gradient(135deg,#34d7c6,#28cad7);color:#fff">
    Effects Picker<br />
    <span class="help">Choose your aura</span>
  </button>`;

  packTabs.innerHTML = packButtons + effectBtn;
}

function renderBlookGrid() {
  if (requiresStudentLogin() && !loggedInStudent) {
    blookGrid.innerHTML = `<span class="help">Log in first to load your saved blooks and pack progress.</span>`;
    return;
  }
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
  if (!ownedInPack.length && !shouldShowAllBlooks()) {
    blookGrid.innerHTML = `
      <div class="blook-tile" data-locked-slot="true" aria-hidden="true">
        <span class="blook-emoji">🛍️</span>
        <span class="blook-name">No owned blooks yet</span>
        <span class="blook-rarity">Buy ${escapeHtml(pack.name)} in the Store first</span>
      </div>
      <span class="help">Open the Store to buy ${escapeHtml(pack.name)}, then come back here to use what you unlocked.</span>
    `;
    return;
  }

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
  if (openPackBtn) {
    openPackBtn.hidden = true;
    openPackBtn.disabled = true;
  }

  if (sellDuplicateBtn) {
    sellDuplicateBtn.hidden = true;
    sellDuplicateBtn.disabled = true;
  }
}

function renderEconomyPanel() {
  if (accountCoins) {
    accountCoins.textContent = shouldShowAllBlooks()
      ? "ALL"
      : (requiresStudentLogin() && !loggedInStudent ? "--" : String(Math.max(0, Number(accountData?.coins || 0))));
  }
  renderPackTabs();
  renderBlookGrid();
  if (packOdds) {
    packOdds.textContent = "";
  }
  if (packResult) {
    packResult.classList.add("hidden");
    packResult.textContent = "";
  }
  if (packOpenAnimation) {
    packOpenAnimation.classList.add("hidden");
  }
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
  if (!selectedBlookId || !getOwnedBlookById(selectedBlookId)) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(selectedPackId) || getInventoryRows()[0]?.id || "";
  }
  renderEconomyPanel();
}

function applyAccount(account, nextKey = "") {
  if (nextKey) {
    setStoredAccountKey(nextKey);
  }

  accountData = account || null;
  blookPacks = mergeCatalogPackStats(Array.isArray(accountData?.packs) ? accountData.packs : []);
  blookEffects = Array.isArray(accountData?.effects) ? accountData.effects : [];
  const defaultPackId = blookPacks[0]?.id || "";
  if (!selectedPackId || !getPackById(selectedPackId)) {
    selectedPackId = defaultPackId;
  }

  if ((!selectedBlookId || !getOwnedBlookById(selectedBlookId)) && accountData?.selectedBlookId) {
    selectedBlookId = accountData.selectedBlookId;
  }

  if (accountData?.selectedBlookId && getOwnedBlookById(accountData.selectedBlookId)) {
    selectedBlookId = accountData.selectedBlookId;
  }

  if (!selectedBlookId || !getOwnedBlookById(selectedBlookId)) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(selectedPackId) || getInventoryRows()[0]?.id || "";
  }

  const selectedPackFromBlook = packIdForOwnedBlook(selectedBlookId);
  if (
    selectedPackFromBlook &&
    selectedPackId !== "effects" &&
    (!selectedPackId || !getPackById(selectedPackId) || !packContainsOwnedBlook(selectedPackId, selectedBlookId))
  ) {
    selectedPackId = selectedPackFromBlook;
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
  if (requiresStudentLogin() && !loggedInStudent) {
    setPackResultNotice("Log in with your classroom account before opening packs.", "bad");
    playMiniGameSfx("miss", { cooldownMs: 120 });
    focusStudentLoginForm();
    return;
  }
  const pack = getPackById(selectedPackId);
  if (!pack) {
    setPackResultNotice("Select a pack first.", "bad");
    playMiniGameSfx("miss", { cooldownMs: 120 });
    return;
  }

  openPackBtn.disabled = true;
  const response = await fetch("/api/account/open-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountKey: loggedInStudent?.accountKey || getOrCreateAccountKey(),
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
    if (accountData) {
      accountData.selectedBlookId = reward.id;
    }
    selectedPackId = reward.packId || pack.id;
    selectedBlookId = reward.id;
    renderEconomyPanel();
    const rewardDisplay = getOwnedBlookById(reward.id) || reward;
    showPackOpenAnimation(rewardDisplay);
    playPackRewardSfx(reward);
    const duplicateText = reward.duplicate
      ? `Duplicate! You now have ${reward.count}. Sell extras for ${reward.sellValueEach} coins.`
      : "New unlock added to your collection.";
    const freeText = reward.freeOpen ? "Free starter open used." : `Spent ${reward.openCost} coins.`;
    setPackResultNotice(`${reward.icon} ${reward.name} (${reward.rarity}) - ${duplicateText} ${freeText}`, reward.duplicate ? "bad" : "good");
  }
}

async function sellSelectedDuplicate() {
  if (requiresStudentLogin() && !loggedInStudent) {
    setPackResultNotice("Log in with your classroom account before selling duplicates.", "bad");
    playMiniGameSfx("miss", { cooldownMs: 120 });
    focusStudentLoginForm();
    return;
  }
  const selected = getOwnedBlookById(selectedBlookId);
  if (!selected || Number(selected.duplicates || 0) <= 0) {
    setPackResultNotice("No duplicate selected to sell.", "bad");
    playMiniGameSfx("miss", { cooldownMs: 120 });
    return;
  }

  sellDuplicateBtn.disabled = true;
  const response = await fetch("/api/account/sell-duplicate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountKey: loggedInStudent?.accountKey || getOrCreateAccountKey(),
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
    playMiniGameSfx("reward");
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
  await loadStudentAuthStatus();

  try {
    await loadPublicBlooks();
  } catch (_error) {
    applyFallbackBlookCatalog();
    setJoinNotice("Could not load the full blook catalog yet. Refresh and try again after logging in.", "bad");
    return;
  }

  if (requiresStudentLogin() && !loggedInStudent) {
    accountData = null;
    blookPacks = clonePackRows(catalogPacks);
    const defaultPackId = blookPacks[0]?.id || "";
    if (!selectedPackId || !getPackById(selectedPackId)) {
      selectedPackId = defaultPackId;
    }
    selectedBlookId = "";
    renderEconomyPanel();
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
    if (!selectedBlookId || !getOwnedBlookById(selectedBlookId)) {
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
  if (payload?.mode) {
    currentMode = String(payload.mode || currentMode || "classic").toLowerCase();
  }

  showSection(questionSection);
  setGameIllustration(questionIllustration, isAsteroidsMode() ? "asteroids" : "question", isAsteroidsMode() ? "Asteroids round" : "Question round");
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

  if (isAsteroidsMode()) {
    renderPlayerAsteroidsStage(payload?.modeData || {}, {
      destroyedCount: 0,
      totalBlasts: 0,
      streakCoinsAwarded: 0,
      summaryText: "Answer fast to charge your ship and blast the asteroid wave."
    });
  } else {
    hideAsteroidsQuestionStage();
  }

  startTicker(timerText, payload.endsAt, "Time left");
}

function attemptAutoRejoin() {
  if (!roomCode || !playerName || reconnectJoinPending) {
    return;
  }

  reconnectJoinPending = true;
  socket.timeout(JOIN_ACK_TIMEOUT_MS).emit(
    "player:join",
    { code: roomCode, name: playerName, blookId: effectiveJoinBlookId(), accountKey: joinAccountKey() },
    (error, res) => {
      reconnectJoinPending = false;
      if (error) {
        reconnecting = false;
        setNotice("Reconnect timed out. Rejoin from the join screen if needed.", "bad");
        setPhaseBanner(phase, "Reconnect timed out. Rejoin if sync does not recover.");
        return;
      }
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
        applyAccount(res.account, joinAccountKey() || getOrCreateAccountKey());
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

function requestJoinRoom() {
  if (joinRequestPending) {
    return;
  }

  if (requiresStudentLogin() && !loggedInStudent) {
    setJoinNotice("Log in with your first name and class password before joining.", "bad");
    focusStudentLoginForm();
    return;
  }

  if (loggedInStudent && nameInput) {
    nameInput.value = loggedInStudent.displayName;
  }

  const code = sanitizeRoomCode(codeInput.value);
  const name = loggedInStudent?.displayName || nameInput.value.trim();

  if (!code || !name) {
    setJoinNotice("Game code is required.", "bad");
    return;
  }

  if (!socket.connected) {
    setJoinNotice(joinConnectionHelpText(), "bad");
    return;
  }

  if (!selectedBlookId) {
    selectedBlookId = "sports-soccer-star";
  }

  const joinPackId = "";
  const joinBlookId = effectiveJoinBlookId();

  setJoinBusy(true);
  socket.timeout(JOIN_ACK_TIMEOUT_MS).emit("player:join", {
    code,
    name,
    blookId: joinBlookId,
    packId: joinPackId,
    effectId: selectedEffectId,
    accountKey: joinAccountKey()
  }, (error, res) => {
    setJoinBusy(false);
    if (error) {
      setJoinNotice(`${joinConnectionHelpText()} Join request timed out.`, "bad");
      return;
    }
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
      applyAccount(res.account, joinAccountKey() || getOrCreateAccountKey());
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
}

if (joinBtn) {
  joinBtn.addEventListener("click", requestJoinRoom);
}

if (studentLoginBtn) {
  studentLoginBtn.addEventListener("click", submitStudentLogin);
}

if (studentLogoutBtn) {
  studentLogoutBtn.addEventListener("click", logoutStudentAccount);
}

for (const input of [codeInput, nameInput]) {
  if (!input) {
    continue;
  }
  input.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent) || event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    requestJoinRoom();
  });
}

for (const input of [studentLoginUsernameInput, studentLoginPasswordInput]) {
  if (!input) {
    continue;
  }
  input.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent) || event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    submitStudentLogin();
  });
}

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
  const packOwnedBlookId = pickFirstOwnedBlookIdForPack(pack.id);
  if (packOwnedBlookId) {
    selectedBlookId = packOwnedBlookId;
  } else if (!selectedBlookId || !getOwnedBlookById(selectedBlookId)) {
    selectedBlookId = pickFirstOwnedBlookIdForPack(pack.id) || selectedBlookId;
  }
  hidePackResultNotice();
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
    selectedBlookId = blookId;
    hidePackResultNotice();
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
      playMiniGameSfx("miss", { cooldownMs: 120 });
      return;
    }

    if (res.account) {
      applyAccount(res.account, res.account.id || joinAccountKey() || accountKey);
    }
    if (isAsteroidsMode()) {
      applyPlayerAsteroidsAnswerAck(res);
    }
    playMiniGameSfx("select");
    const streakCoins = Math.max(0, Number(res?.streakCoinsAwarded || 0));
    const asteroidBlastCount = Math.max(0, Number(res?.asteroidBlast?.blasts || 0));
    const asteroidNote =
      isAsteroidsMode() && res.correct
        ? ` Blasted ${asteroidBlastCount} asteroids${streakCoins > 0 ? ` and earned +${streakCoins} coins` : ""}.`
        : "";
    setNotice(`Answer locked. ${res.correct ? "Correct" : "Submitted"} (+${res.delta})${asteroidNote}`, res.correct ? "good" : "");
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
  if (action === "goalie_lane") {
    payload.action = "set_lane";
    payload.value = { lane: clampMiniGoalieRushLane(button.dataset.miniValue) };
  }
  if (action === "snake_dir") {
    payload.action = "set_direction";
    payload.value = { direction: button.dataset.miniValue || "right" };
  }
  if (action === "foos_kick") {
    payload.action = "kick";
    payload.value = {
      lane: miniFoosballSelectedLane
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
  if (action === "hallway_left") {
    payload.action = "move_lane";
    payload.value = { direction: "left" };
  }
  if (action === "hallway_right") {
    payload.action = "move_lane";
    payload.value = { direction: "right" };
  }
  if (action === "hallway_jump") {
    payload.action = "jump";
  }
  if (action === "cleanup_left") {
    payload.action = "move_lane";
    payload.value = { direction: "left" };
  }
  if (action === "cleanup_right") {
    payload.action = "move_lane";
    payload.value = { direction: "right" };
  }
  if (action === "cleanup_book") {
    payload.action = "sort_item";
    payload.value = { bin: "book" };
  }
  if (action === "cleanup_pencil") {
    payload.action = "sort_item";
    payload.value = { bin: "pencil" };
  }
  if (action === "cleanup_trash") {
    payload.action = "sort_item";
    payload.value = { bin: "trash" };
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
  if (action === "dig") {
    payload.value = Number(button.dataset.miniValue);
  }
  if (action === "shadow_flip") {
    payload.action = "flip_tile";
    payload.value = { index: Number(button.dataset.miniValue) };
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
  if (action === "tower_theme") {
    payload.action = "set_theme";
    payload.value = { theme: button.dataset.miniValue };
  }
  if (action === "tower_drop") {
    payload.action = "drop";
    const dropButton = document.getElementById("miniTowerDropBtn");
    if (dropButton) {
      dropButton.disabled = true;
    }
  }
  if (action === "tower_restart") {
    payload.action = "restart";
  }
  if (action === "battle_attack") {
    payload.action = "attack";
  }
  if (action === "battle_guard") {
    payload.action = "guard";
  }
  if (action === "battle_heal") {
    payload.action = "heal";
  }
  if (action === "battle_special") {
    payload.action = "special";
  }

  socket.emit("player:minigameAction", payload, (res) => {
    if (!res?.ok) {
      setNotice(res?.message || "Event choice failed.", "bad");
      playMiniGameSfx("miss", { cooldownMs: 120 });
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
      if (action === "tower_drop") {
        const dropButton = document.getElementById("miniTowerDropBtn");
        if (dropButton) {
          dropButton.disabled = false;
        }
      }
      return;
    }

    if (payload.action === "set_theme") {
      playMiniGameSfx("select", { cooldownMs: 90 });
      return;
    }
    if (payload.action === "set_direction" || payload.action === "set_lane" || payload.action === "move_lane") {
      playMiniGameSfx("tap", { cooldownMs: 70 });
      return;
    }
    if (payload.action === "jump") {
      playMiniGameSfx("tap", { cooldownMs: 70 });
      return;
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

  const snakeKey = String(event.key || "").toLowerCase();
  if (activeMiniGameType === "classroom_cleanup") {
    let cleanupAction = "";
    if (event.key === "ArrowLeft" || snakeKey === "a") cleanupAction = "cleanup_left";
    if (event.key === "ArrowRight" || snakeKey === "d") cleanupAction = "cleanup_right";
    if (event.key === "1" || snakeKey === "b") cleanupAction = "cleanup_book";
    if (event.key === "2" || snakeKey === "p") cleanupAction = "cleanup_pencil";
    if (event.key === "3" || snakeKey === "t") cleanupAction = "cleanup_trash";
    if (cleanupAction) {
      const button = chests.querySelector(`button[data-mini-action='${cleanupAction}']`);
      if (button instanceof HTMLButtonElement && !button.disabled) {
        event.preventDefault();
        button.click();
      }
      return;
    }
  }

  if (activeMiniGameType === "battle_royale") {
    const battleActionMap = {
      "1": "battle_attack",
      "2": "battle_guard",
      "3": "battle_heal",
      "4": "battle_special"
    };
    const battleAction = battleActionMap[event.key] || "";
    if (battleAction) {
      const button = chests.querySelector(`button[data-mini-action='${battleAction}']`);
      if (button instanceof HTMLButtonElement && !button.disabled) {
        event.preventDefault();
        button.click();
      }
      return;
    }
  }

  if (activeMiniGameType === "hallway_dash") {
    let hallwayAction = "";
    if (event.key === "ArrowLeft" || snakeKey === "a") hallwayAction = "hallway_left";
    if (event.key === "ArrowRight" || snakeKey === "d") hallwayAction = "hallway_right";
    if (event.key === "ArrowUp" || snakeKey === "w" || event.key === " " || event.code === "Space") hallwayAction = "hallway_jump";
    if (hallwayAction) {
      const button = chests.querySelector(`button[data-mini-action='${hallwayAction}']`);
      if (button instanceof HTMLButtonElement && !button.disabled) {
        event.preventDefault();
        button.click();
      }
      return;
    }
  }

  if (activeMiniGameType === "goalie_rush") {
    let targetLane = null;
    if (event.key === "ArrowLeft" || snakeKey === "a") {
      targetLane = clampMiniGoalieRushLane(Number(miniGoalieRushState?.lane ?? 1) - 1);
    } else if (event.key === "ArrowRight" || snakeKey === "d") {
      targetLane = clampMiniGoalieRushLane(Number(miniGoalieRushState?.lane ?? 1) + 1);
    } else if (event.key === "1") {
      targetLane = 0;
    } else if (event.key === "2") {
      targetLane = 1;
    } else if (event.key === "3") {
      targetLane = 2;
    }

    if (targetLane !== null) {
      const button = chests.querySelector(`button[data-mini-action='goalie_lane'][data-mini-value='${targetLane}']`);
      if (button instanceof HTMLButtonElement && !button.disabled) {
        event.preventDefault();
        button.click();
      }
      return;
    }
  }

  if (activeMiniGameType === "snake") {
    let nextDirection = "";
    if (event.key === "ArrowUp" || snakeKey === "w") nextDirection = "up";
    if (event.key === "ArrowDown" || snakeKey === "s") nextDirection = "down";
    if (event.key === "ArrowLeft" || snakeKey === "a") nextDirection = "left";
    if (event.key === "ArrowRight" || snakeKey === "d") nextDirection = "right";
    if (nextDirection) {
      event.preventDefault();
      sendMiniSnakeDirection(nextDirection);
      return;
    }
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
    return;
  }

  if (activeMiniGameType === "tower_stacker") {
    const dropBtn = document.getElementById("miniTowerDropBtn");
    if (!(dropBtn instanceof HTMLButtonElement) || dropBtn.disabled) {
      return;
    }
    event.preventDefault();
    dropBtn.click();
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
  hideAsteroidsQuestionStage();
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

socket.on("game:countdown", ({ secondsLeft, endsAt, targetPhase, targetLabel }) => {
  stopMiniTickers();
  const safeSeconds = Math.max(0, Number(secondsLeft) || 0);
  const launchLabel = targetPhase === "minigame" ? targetLabel || "Mini-game" : "Question";
  const countdownText = safeSeconds > 0 ? `Game starts in ${safeSeconds}...` : `Go! ${launchLabel} is starting.`;
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
  if (payload?.mode) {
    currentMode = String(payload.mode || currentMode || "classic").toLowerCase();
  }
  ensureFishingGameTimerStarted();
  setPhase("question", `Question ${payload.questionIndex}/${payload.totalQuestions} is live.`);
  renderQuestion(payload);
  playMiniGameSfx("start");
  setNotice(
    roomSettings.showInstructions === false
      ? `Question ${payload.questionIndex}/${payload.totalQuestions} is live.`
      : `Question ${payload.questionIndex} of ${payload.totalQuestions}.${isAsteroidsMode() ? " Answer fast to blast the asteroid wave." : " Answer quickly for bonuses."}`
  );
});

socket.on("player:locked", ({ leaderboard }) => {
  renderLeaderboard(leaderboard);
  if (phase === "question") {
    setNotice("Answer saved. Waiting for others...");
  }
});

socket.on("question:result", (payload) => {
  if (payload?.mode) {
    currentMode = String(payload.mode || currentMode || "classic").toLowerCase();
  }
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
  const streakCoins = Math.max(0, Number(mine?.streakCoinsAwarded || 0));
  const asteroidBlastCount = Math.max(0, Number(mine?.asteroidsBlasted || 0));

  if (isAsteroidsMode()) {
    const topPilots = Array.isArray(payload?.modeData?.topPilots) ? payload.modeData.topPilots : [];
    if (!mine) {
      renderPlayerAsteroidsStage(payload?.modeData || {}, {
        destroyedCount: Number(payload?.modeData?.destroyedCount || 0),
        totalBlasts: Number(payload?.modeData?.totalBlasts || 0),
        topPilots,
        summaryText: "No answer locked in, so your ship did not fire this wave."
      });
    } else if (mine.correct) {
      renderPlayerAsteroidsStage(payload?.modeData || {}, {
        destroyedCount: Math.max(0, Number(mine.asteroidsBlasted || 0)),
        totalBlasts: asteroidBlastCount,
        streakCoinsAwarded: streakCoins,
        speedLabel: mine.asteroidsSpeedLabel,
        topPilots,
        summaryText: `${asteroidBlastCount} asteroids blasted${mine.asteroidsSpeedLabel ? ` with ${mine.asteroidsSpeedLabel}` : ""}.${streakCoins > 0 ? ` +${streakCoins} streak coins.` : ""}`
      });
    } else {
      renderPlayerAsteroidsStage(payload?.modeData || {}, {
        destroyedCount: 0,
        totalBlasts: 0,
        topPilots,
        summaryText: "Wrong answer. Your ship missed the wave this round."
      });
    }
  }

  if (!mine) {
    playMiniGameSfx("miss");
    setNotice(`Time up. You did not submit an answer.${explanation}`, "bad");
  } else {
    playMiniGameSfx(mine.correct ? "correct" : "miss");
    setNotice(
      `${mine.correct ? "Correct. You qualified for the mini-game." : "Incorrect. You will wait for the next checkpoint."} ${mine.correct ? `+${mine.delta} points.` : "No points."}${isAsteroidsMode() && mine.correct ? ` ${asteroidBlastCount} asteroids blasted.${streakCoins > 0 ? ` +${streakCoins} streak coins.` : ""}` : ""}${explanation}`,
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
  const activeRoundPlayers = Array.isArray(eligiblePlayerIds) ? eligiblePlayerIds : [];
  const isEligible = activeRoundPlayers.includes(socket.id);

  if (!isEligible) {
    hideMiniTutorialOverlay();
    applyMiniTutorialButtonVisibility("");
    stopMiniTickers();
    showSection(resultSection);
    resultText.textContent = `Only students who answered correctly continue into ${activeEventName}.`;
    setNotice(
      roomSettings.showInstructions === false
        ? "Mini-game in progress."
        : "You did not qualify for this checkpoint. Wait for the next question to get back in."
    );
  }
});

socket.on("minigame:yourData", ({ type, endsAt, eventName, actionLabel, data }) => {
  setPhase("minigame", `${miniGameTypeLabel(type)} live. Keep playing until the next checkpoint.`);
  showSection(chestSection);
  activeEventName = eventName || "Mini-game";
  activeActionLabel = actionLabel || "Play";
  eventTitle.textContent = `${activeEventName} - ${miniGameTypeLabel(type)}`;
  setGameIllustration(chestIllustration, type || "", miniGameTypeLabel(type));
  renderMiniGame(type, data, activeActionLabel);
  startTicker(chestTimer, endsAt, "Mini-game ends in");
  openMiniTutorial(type);
  playMiniGameSfx("start");
  setNotice(roomSettings.showInstructions === false ? "Mini-game started." : "You answered correctly. Keep playing until the next question checkpoint.");
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

  if (payload.type === "goalie_rush") {
    applyMiniGoalieRushState(payload, { forceSummaryText: false });
    return;
  }

  if (payload.type === "tower_stacker") {
    applyMiniTowerStackerState(payload, { forceSummaryText: false });
    return;
  }

  if (payload.type === "snake") {
    applyMiniSnakeState(payload, { forceSummaryText: false });
    return;
  }

  if (payload.type === "tap_rush") {
    const tapCount = document.getElementById("miniTapCount");
    const nextTaps = Math.max(0, Number(payload.taps || 0));
    if (tapCount) {
      tapCount.textContent = String(nextTaps);
    }
    if (nextTaps > miniTapLastCount) {
      playMiniGameSfx("tap", { cooldownMs: 65 });
      miniTapLastCount = nextTaps;
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
      playMiniGameSfx("miss");
      setNotice("False start. Waiting for others...", "bad");
    } else {
      if (statusEl) statusEl.textContent = "Reacted";
      if (timerEl) timerEl.textContent = `${Number(payload.reactionMs || 0)} ms`;
      playMiniGameSfx("correct");
      setNotice(`Reaction time: ${Number(payload.reactionMs || 0)} ms`, "good");
    }
    return;
  }

  if (payload.type === "sequence_memory") {
    const progressEl = document.getElementById("miniSequenceProgress");
    const nextProgress = Math.max(0, Number(payload.progress || 0));
    if (progressEl) {
      progressEl.textContent = String(nextProgress);
    }
    if (nextProgress > miniSequenceLastProgress) {
      playMiniGameSfx(payload.completed ? "complete" : "progress", { cooldownMs: 80 });
    } else if (nextProgress < miniSequenceLastProgress) {
      playMiniGameSfx("miss", { cooldownMs: 80 });
    }
    miniSequenceLastProgress = nextProgress;
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
    const step = Math.max(0, Number(payload.step || 0));
    const hits = Math.max(0, Number(payload.hits || 0));
    if (turnEl) {
      turnEl.textContent = String(step);
    }
    if (hitsEl) {
      hitsEl.textContent = String(hits);
    }
    if (lastEl) {
      const obstacleNames = ["Left", "Center", "Right"];
      const obstacle = obstacleNames[payload.obstacleLane] || "?";
      lastEl.textContent = payload.hit ? `Blocked at ${obstacle}.` : `Clear lane. Blocker was ${obstacle}.`;
    }
    if (step > miniObstacleLastStep) {
      playMiniGameSfx(hits > miniObstacleLastHits || payload.hit ? "miss" : payload.completed ? "complete" : "progress", { cooldownMs: 80 });
    }
    miniObstacleLastStep = step;
    miniObstacleLastHits = hits;
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
    const diff = Math.abs(Math.max(0, Number(payload.value || 0)) - Math.max(0, Number(payload.target || 0)));
    if (diff <= 4) {
      playMiniGameSfx("reward");
    } else if (diff <= 10) {
      playMiniGameSfx("complete");
    } else {
      playMiniGameSfx("miss");
    }
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
    if (Number(payload.attempts || 0) > miniScrambleLastAttempts) {
      if (payload.solved) {
        playMiniGameSfx("unlock");
      } else if (payload.completed) {
        playMiniGameSfx("miss");
      } else {
        playMiniGameSfx("select", { cooldownMs: 80 });
      }
    }
    miniScrambleLastAttempts = Math.max(0, Number(payload.attempts || 0));
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
    return;
  }

  if (payload.type === "hallway_dash") {
    applyMiniHallwayDashState(payload, { forceSummaryText: false });
    return;
  }

  if (payload.type === "dino_dig") {
    applyMiniDinoDigState(payload, { forceSummaryText: false });
    return;
  }

  if (payload.type === "shadow_match") {
    applyMiniShadowMatchState(payload, { forceSummaryText: false });
    return;
  }

  if (payload.type === "classroom_cleanup") {
    applyMiniClassroomCleanupState(payload, { forceSummaryText: false });
    return;
  }

  if (payload.type === "battle_royale") {
    applyMiniBattleRoyaleState(payload, { forceSummaryText: false });
    return;
  }
});

socket.on("minigame:resolved", ({ text, leaderboard, account }) => {
  stopMiniTickers();
  if (account) {
    applyAccount(account, account.id || joinAccountKey() || accountKey);
  }
  playMiniGameSfx("reward");
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
  playMiniGameSfx("complete");
  setNotice("Leaderboard updated.", "good");
  renderLeaderboard(leaderboard);
});

socket.on("account:coinsAwarded", ({ reward, rank, totalPlayers, account }) => {
  if (account) {
    applyAccount(account, getOrCreateAccountKey());
  }
  if (reward?.total) {
    playMiniGameSfx("reward");
    setNotice(`Placement reward: +${reward.total} coins for ${ordinalPlace(rank)} place.`, "good");
    setPackResultNotice(
      `${ordinalPlace(rank)} place out of ${totalPlayers} earned +${reward.total} coins. Top 5 places earn coins.`,
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
  playMiniGameSfx("complete");
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
  setJoinBusy(false);
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
  setJoinBusy(false);
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
renderStudentLoginState();
applyFallbackBlookCatalog();
loadBlooks();
loadMiniGames();
loadActiveRoomCode();
setInterval(loadMiniGames, 15000);
setInterval(loadActiveRoomCode, 5000);

socket.on("connect_error", () => {
  setJoinBusy(false);
  setConnectionPill("Offline", "warn");
  if (!playCard.classList.contains("hidden")) {
    setNotice("Cannot reach server. Trying to reconnect...", "bad");
  } else {
    setJoinNotice(joinConnectionHelpText(), "bad");
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

