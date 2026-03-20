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
  foosball_frenzy: "/assets/minigames/soccer_shootout/soccer.svg",
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
  {
    id: "multiplication_1_digit",
    label: "Multiplication 1-Digit",
    source: "built_in",
    questionCount: 81,
    category: "Math",
    tags: ["math", "multiplication", "facts"]
  },
  {
    id: "general_knowledge",
    label: "General Knowledge",
    source: "built_in",
    questionCount: 24,
    category: "General",
    tags: ["trivia", "mixed"]
  }
];
const PHASE_BANNER_COPY = {
  lobby: {
    title: "Lobby Open",
    detail: "Students can join and pick blooks."
  },
  paused: {
    title: "Game Paused",
    detail: "Play is temporarily frozen by the host."
  },
  countdown: {
    title: "Starting Countdown",
    detail: "Launching the first question in 3..2..1."
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
  "phase-paused",
  "phase-countdown",
  "phase-question",
  "phase-question-result",
  "phase-minigame",
  "phase-round-summary",
  "phase-finished",
  "phase-ended",
  "phase-kicked"
];
const MINI_GAME_LABELS = {
  foosball_frenzy: "Foosball Frenzy",
  soccer_shootout: "Soccer Shootout",
  tap_rush: "Tap Rush",
  reaction_duel: "Reaction Duel",
  sequence_memory: "Sequence Memory",
  obstacle_dodge: "Obstacle Dodge",
  precision_stop: "Precision Stop",
  word_scramble: "Word Scramble"
};
const MODE_PREVIEW_COPY = {
  gold: {
    title: "Gold Quest",
    tagline: "Exciting twists and chests full of gold!",
    difficulty: "Simple",
    skills: "Luck & Speed",
    idealTime: "7 min",
    questions: "Self-paced",
    players: "2 - 300"
  },
  fishing: {
    title: "Fishing Frenzy",
    tagline: "Cast lines, catch loot, and snowball points.",
    difficulty: "Simple",
    skills: "Risk & Timing",
    idealTime: "6 min",
    questions: "Standard pace",
    players: "2 - 300"
  },
  crypto: {
    title: "Crypto Hack",
    tagline: "Invest, steal, and defend your wallet.",
    difficulty: "Medium",
    skills: "Strategy",
    idealTime: "8 min",
    questions: "Standard pace",
    players: "2 - 300"
  },
  brawl: {
    title: "Monster Brawl",
    tagline: "Build power and battle for top rank.",
    difficulty: "Medium",
    skills: "Planning",
    idealTime: "8 min",
    questions: "Standard pace",
    players: "2 - 300"
  },
  classic: {
    title: "Classic",
    tagline: "Fast classroom quiz flow with live leaderboard.",
    difficulty: "Simple",
    skills: "Accuracy",
    idealTime: "5 min",
    questions: "Speed + streak",
    players: "2 - 300"
  }
};

const setupCard = document.getElementById("setupCard");
const gameCard = document.getElementById("gameCard");
const hostNameInput = document.getElementById("hostName");
const modeInput = document.getElementById("mode");
const modePickerGrid = document.getElementById("modePickerGrid");
const modePreviewTitle = document.getElementById("modePreviewTitle");
const modePreviewTagline = document.getElementById("modePreviewTagline");
const modePreviewDifficulty = document.getElementById("modePreviewDifficulty");
const modePreviewSkills = document.getElementById("modePreviewSkills");
const modePreviewTime = document.getElementById("modePreviewTime");
const modePreviewQuestions = document.getElementById("modePreviewQuestions");
const modePreviewPlayers = document.getElementById("modePreviewPlayers");
const modeConfigQuizTitle = document.getElementById("modeConfigQuizTitle");
const modeSettingsHeading = document.getElementById("modeSettingsHeading");
const quickDurationLabel = document.getElementById("quickDurationLabel");
const quickDurationMinInput = document.getElementById("quickDurationMin");
const endTypeTimeBtn = document.getElementById("endTypeTimeBtn");
const endTypeWeightBtn = document.getElementById("endTypeWeightBtn");
const modeSettingToggles = Array.from(document.querySelectorAll(".mode-setting-toggle"));
const questionSetInput = document.getElementById("questionSet");
const questionSetSearchInput = document.getElementById("questionSetSearch");
const questionSetCategoryInput = document.getElementById("questionSetCategory");
const timerInput = document.getElementById("timer");
const explanationRevealInput = document.getElementById("explanationReveal");
const countInput = document.getElementById("count");
const shuffleQuestionOptionsInput = document.getElementById("shuffleQuestionOptions");
const preventQuestionRepeatsInput = document.getElementById("preventQuestionRepeats");
const miniRotationInput = document.getElementById("miniRotation");
const miniDurationInput = document.getElementById("miniDuration");
const setupNotice = document.getElementById("setupNotice");

const createBtn = document.getElementById("createBtn");
const startBtn = document.getElementById("startBtn");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const nextBtn = document.getElementById("nextBtn");
const forceNextQuestionBtn = document.getElementById("forceNextQuestionBtn");
const endBtn = document.getElementById("endBtn");
const lateJoinToggleBtn = document.getElementById("lateJoinToggleBtn");
const skipMiniGameBtn = document.getElementById("skipMiniGameBtn");
const lateJoinStatusText = document.getElementById("lateJoinStatusText");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const testMiniGameBtn = document.getElementById("testMiniGameBtn");
const testMiniGameType = document.getElementById("testMiniGameType");
const uploadQuizBtn = document.getElementById("uploadQuizBtn");
const exportQuizBtn = document.getElementById("exportQuizBtn");
const quizUploadTitleInput = document.getElementById("quizUploadTitle");
const quizUploadFileInput = document.getElementById("quizUploadFile");
const quizUploadNotice = document.getElementById("quizUploadNotice");
const builderSetSelect = document.getElementById("builderSetSelect");
const builderTitleInput = document.getElementById("builderTitleInput");
const builderCategoryInput = document.getElementById("builderCategoryInput");
const builderTagsInput = document.getElementById("builderTagsInput");
const builderQuestions = document.getElementById("builderQuestions");
const builderLoadBtn = document.getElementById("builderLoadBtn");
const builderNewBtn = document.getElementById("builderNewBtn");
const builderAddQuestionBtn = document.getElementById("builderAddQuestionBtn");
const builderSaveBtn = document.getElementById("builderSaveBtn");
const builderNotice = document.getElementById("builderNotice");

const roomCodeEl = document.getElementById("roomCode");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const copyJoinLinkBigBtn = document.getElementById("copyJoinLinkBigBtn");
const previewBlooksBtn = document.getElementById("previewBlooksBtn");
const playAsHostBtn = document.getElementById("playAsHostBtn");
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
const liveQuestionSetSearchInput = document.getElementById("liveQuestionSetSearch");
const liveQuestionSetCategoryInput = document.getElementById("liveQuestionSetCategory");
const liveQuestionSet = document.getElementById("liveQuestionSet");
const liveTimer = document.getElementById("liveTimer");
const liveExplanationReveal = document.getElementById("liveExplanationReveal");
const liveCount = document.getElementById("liveCount");
const liveShuffleQuestionOptions = document.getElementById("liveShuffleQuestionOptions");
const livePreventQuestionRepeats = document.getElementById("livePreventQuestionRepeats");
const liveMiniRotation = document.getElementById("liveMiniRotation");
const liveMiniDuration = document.getElementById("liveMiniDuration");

const playersList = document.getElementById("playersList");
const leaderboardBody = document.getElementById("leaderboardBody");
const questionPanel = document.getElementById("questionPanel");
const questionTimer = document.getElementById("questionTimer");
const questionText = document.getElementById("questionText");
const hostQuestionMedia = document.getElementById("hostQuestionMedia");
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
let quizSetFilterQuery = "";
let quizSetFilterCategory = "";
let builderEditingSetId = "";
let builderQuestionRows = [];
let selectedEndType = "time";
let currentAllowLateJoin = true;
let pausedFromPhase = "";
const DEFAULT_SETUP_FLAGS = {
  instructions: true,
  late_join: true,
  random_names: false,
  student_accounts: true
};
const hostPageParams = new URLSearchParams(window.location.search);
const quickMiniGameMode = hostPageParams.get("quick") === "minigame";
const requestedMiniGameType = String(hostPageParams.get("mini") || "")
  .trim()
  .toLowerCase();
const requestedQuestionSetId = String(hostPageParams.get("set") || "").trim();
const requestedHostName = String(hostPageParams.get("hostName") || "").trim();
const FALLBACK_MINI_GAMES = [
  { id: "foosball_frenzy", name: "Foosball Frenzy", description: "Foosball bars stay in formation. Slide laterally and kick." },
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

function updateLateJoinControls() {
  const phaseValue = String(phase || "").toLowerCase();
  const roomReady = Boolean(roomCode);
  const lockedPhase = phaseValue === "finished" || phaseValue === "ended" || phaseValue === "kicked";
  if (lateJoinToggleBtn) {
    lateJoinToggleBtn.disabled = !roomReady || lockedPhase;
    lateJoinToggleBtn.textContent = currentAllowLateJoin ? "Lock Late Join" : "Unlock Late Join";
  }
  if (lateJoinStatusText) {
    lateJoinStatusText.textContent = currentAllowLateJoin
      ? "Late join currently allowed."
      : "Late join currently locked.";
  }
}

function updatePhaseActionButtons() {
  const phaseValue = String(phase || "").toLowerCase();
  const effectivePhase = phaseValue === "paused" ? String(pausedFromPhase || "") : phaseValue;
  const inLobby = phaseValue === "lobby";
  const inRoundSummary = phaseValue === "round_summary";
  const canRunMiniTest = phaseValue === "lobby" || phaseValue === "round_summary";
  const canPause = ["countdown", "question", "question_result", "minigame", "round_summary", "paused"].includes(phaseValue);
  const canForceNext = ["countdown", "question", "question_result", "minigame", "round_summary"].includes(effectivePhase);
  const canSkipMiniGame = effectivePhase === "minigame";

  startBtn.disabled = !inLobby;
  if (lobbyStartBtn) {
    lobbyStartBtn.disabled = !inLobby;
  }
  saveSettingsBtn.disabled = !inLobby;
  nextBtn.disabled = !inRoundSummary;
  if (testMiniGameBtn) {
    testMiniGameBtn.disabled = !canRunMiniTest;
  }
  if (pauseResumeBtn) {
    pauseResumeBtn.disabled = !canPause;
    pauseResumeBtn.textContent = phaseValue === "paused" ? "Resume Game" : "Pause Game";
  }
  if (forceNextQuestionBtn) {
    forceNextQuestionBtn.disabled = !canForceNext;
  }
  if (skipMiniGameBtn) {
    skipMiniGameBtn.disabled = !canSkipMiniGame;
  }
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

function hideSetupNotice() {
  if (!setupNotice) {
    return;
  }
  setupNotice.classList.add("hidden");
  setupNotice.classList.remove("good", "bad");
  setupNotice.textContent = "";
}

function modePreviewById(mode) {
  return MODE_PREVIEW_COPY[mode] || MODE_PREVIEW_COPY.classic;
}

function renderModePreview(mode) {
  const info = modePreviewById(mode);
  if (modePreviewTitle) {
    modePreviewTitle.textContent = info.title;
  }
  if (modePreviewTagline) {
    modePreviewTagline.textContent = info.tagline;
  }
  if (modePreviewDifficulty) {
    modePreviewDifficulty.textContent = info.difficulty;
  }
  if (modePreviewSkills) {
    modePreviewSkills.textContent = info.skills;
  }
  if (modePreviewTime) {
    modePreviewTime.textContent = info.idealTime;
  }
  if (modePreviewQuestions) {
    modePreviewQuestions.textContent = info.questions;
  }
  if (modePreviewPlayers) {
    modePreviewPlayers.textContent = info.players;
  }
  if (modeSettingsHeading) {
    modeSettingsHeading.textContent = `${info.title} Settings`;
  }
}

function renderModeConfigQuizTitle() {
  if (!modeConfigQuizTitle || !questionSetInput) {
    return;
  }
  const setId = String(questionSetInput.value || "");
  const label = questionSetLabelById(setId);
  const setInfo = availableQuestionSets.find((set) => set.id === setId);
  const count = Math.max(0, Number(setInfo?.questionCount || 0));
  modeConfigQuizTitle.textContent = count > 0 ? `${label} ${count} questions` : label;
}

function setModeToggleVisual(toggle, enabled) {
  if (!toggle) {
    return;
  }
  const isEnabled = enabled === true;
  toggle.classList.toggle("on", isEnabled);
  toggle.setAttribute("aria-pressed", isEnabled ? "true" : "false");
}

function readModeToggleFlags() {
  const flags = { ...DEFAULT_SETUP_FLAGS };
  for (const toggle of modeSettingToggles) {
    const key = String(toggle?.dataset?.settingToggle || "").trim();
    if (!key || !(key in flags)) {
      continue;
    }
    flags[key] = toggle.classList.contains("on");
  }
  return flags;
}

function applyModeToggleFlags(flags = {}) {
  for (const toggle of modeSettingToggles) {
    const key = String(toggle?.dataset?.settingToggle || "").trim();
    if (!key || !(key in DEFAULT_SETUP_FLAGS)) {
      continue;
    }
    const nextValue = key in flags ? flags[key] === true : DEFAULT_SETUP_FLAGS[key];
    setModeToggleVisual(toggle, nextValue);
  }
}

function selectEndType(type) {
  const nextType = type === "weight" ? "weight" : "time";
  selectedEndType = nextType;
  endTypeTimeBtn?.classList.toggle("selected", nextType === "time");
  endTypeWeightBtn?.classList.toggle("selected", nextType === "weight");
  if (quickDurationLabel) {
    quickDurationLabel.textContent = nextType === "weight" ? "Target Weight (x1000)" : "Time (minutes)";
  }
  if (quickDurationMinInput) {
    quickDurationMinInput.min = nextType === "weight" ? "2" : "2";
    quickDurationMinInput.max = nextType === "weight" ? "30" : "20";
  }
}

function initializeModeConfigPanel() {
  renderModeConfigQuizTitle();
  selectEndType("time");
  applyModeToggleFlags(DEFAULT_SETUP_FLAGS);
  applyQuestionSetFilter(
    questionSetSearchInput?.value || liveQuestionSetSearchInput?.value || "",
    questionSetCategoryInput?.value || liveQuestionSetCategoryInput?.value || ""
  );
  syncQuestionSetInputs(questionSetInput?.value || liveQuestionSet?.value || "");

  endTypeTimeBtn?.addEventListener("click", () => {
    selectEndType("time");
    hideSetupNotice();
  });
  endTypeWeightBtn?.addEventListener("click", () => {
    selectEndType("weight");
    hideSetupNotice();
  });

  questionSetInput?.addEventListener("change", () => {
    renderModeConfigQuizTitle();
  });

  const applyFiltersAndRefresh = (queryValue, categoryValue) => {
    const selected = questionSetInput?.value || liveQuestionSet?.value || "";
    applyQuestionSetFilter(queryValue, categoryValue);
    syncQuestionSetInputs(selected);
  };

  questionSetSearchInput?.addEventListener("input", () => {
    applyFiltersAndRefresh(questionSetSearchInput.value, questionSetCategoryInput?.value || "");
  });

  questionSetCategoryInput?.addEventListener("change", () => {
    applyFiltersAndRefresh(questionSetSearchInput?.value || "", questionSetCategoryInput.value);
  });

  liveQuestionSetSearchInput?.addEventListener("input", () => {
    applyFiltersAndRefresh(liveQuestionSetSearchInput.value, liveQuestionSetCategoryInput?.value || "");
  });

  liveQuestionSetCategoryInput?.addEventListener("change", () => {
    applyFiltersAndRefresh(liveQuestionSetSearchInput?.value || "", liveQuestionSetCategoryInput.value);
  });

  for (const toggle of modeSettingToggles) {
    toggle.addEventListener("click", () => {
      const isOn = toggle.classList.contains("on");
      setModeToggleVisual(toggle, !isOn);
    });
  }
}

function applyQuickDurationEstimate() {
  if (!quickDurationMinInput) {
    return;
  }

  const rawMinutes = Number(quickDurationMinInput.value || 7);
  const maxValue = selectedEndType === "weight" ? 30 : 20;
  const minutes = Math.max(2, Math.min(maxValue, Number.isFinite(rawMinutes) ? rawMinutes : 7));
  quickDurationMinInput.value = String(minutes);

  if (selectedEndType !== "time") {
    return;
  }

  const timerSeconds = Math.max(8, Number(timerInput?.value || 15));
  const miniOff = String(miniRotationInput?.value || "fixed") === "off";
  const miniSeconds = miniOff ? 0 : Math.max(5, Number(miniDurationInput?.value || 10));
  const estimatedRoundSeconds = Math.max(12, timerSeconds + 6 + miniSeconds);
  const estimatedQuestionCount = Math.max(5, Math.min(30, Math.round((minutes * 60) / estimatedRoundSeconds)));
  if (countInput) {
    countInput.value = String(estimatedQuestionCount);
  }
}

function setupConfigPayload() {
  applyQuickDurationEstimate();
  const quickRaw = Number(quickDurationMinInput?.value || 7);
  const quickValue = Math.max(2, Math.min(selectedEndType === "weight" ? 30 : 20, Number.isFinite(quickRaw) ? quickRaw : 7));
  const toggles = readModeToggleFlags();
  return {
    endType: selectedEndType,
    endTargetValue: quickValue,
    showInstructions: toggles.instructions === true,
    allowLateJoin: toggles.late_join === true,
    useRandomNames: toggles.random_names === true,
    allowStudentAccounts: toggles.student_accounts === true
  };
}

function applySetupConfigFromSettings(settings = {}) {
  const endType = String(settings?.endType || "time").toLowerCase() === "weight" ? "weight" : "time";
  selectEndType(endType);
  if (quickDurationMinInput) {
    const fallback = endType === "weight" ? 7 : 7;
    const maxValue = endType === "weight" ? 30 : 20;
    const valueRaw = Number(settings?.endTargetValue || settings?.quickDurationMin || fallback);
    const value = Math.max(2, Math.min(maxValue, Number.isFinite(valueRaw) ? valueRaw : fallback));
    quickDurationMinInput.value = String(value);
  }
  const revealRaw = Number(settings?.explanationRevealSec);
  const revealSec = Math.max(0, Math.min(10, Number.isFinite(revealRaw) ? revealRaw : 2));
  if (explanationRevealInput) {
    explanationRevealInput.value = String(revealSec);
  }
  if (liveExplanationReveal) {
    liveExplanationReveal.value = String(revealSec);
  }
  const shuffleOptions = settings?.shuffleQuestionOptions === true;
  const preventRepeats = settings?.preventQuestionRepeats === true;
  if (shuffleQuestionOptionsInput) {
    shuffleQuestionOptionsInput.checked = shuffleOptions;
  }
  if (liveShuffleQuestionOptions) {
    liveShuffleQuestionOptions.checked = shuffleOptions;
  }
  if (preventQuestionRepeatsInput) {
    preventQuestionRepeatsInput.checked = preventRepeats;
  }
  if (livePreventQuestionRepeats) {
    livePreventQuestionRepeats.checked = preventRepeats;
  }
  currentAllowLateJoin = settings?.allowLateJoin !== false;
  updateLateJoinControls();
  applyModeToggleFlags({
    instructions: settings?.showInstructions,
    late_join: settings?.allowLateJoin,
    random_names: settings?.useRandomNames,
    student_accounts: settings?.allowStudentAccounts
  });
}

function selectSetupMode(mode) {
  if (!modeInput) {
    return;
  }

  const supportedModes = Array.from(modeInput.options).map((option) => option.value);
  const nextMode = supportedModes.includes(mode) ? mode : supportedModes[0] || "classic";
  modeInput.value = nextMode;

  const tiles = Array.from(modePickerGrid?.querySelectorAll(".mode-tile[data-mode]") || []);
  for (const tile of tiles) {
    const tileMode = String(tile.dataset.mode || "");
    const selected = tileMode === nextMode;
    tile.classList.toggle("selected", selected);
    tile.setAttribute("aria-pressed", selected ? "true" : "false");
  }

  renderModePreview(nextMode);
  renderModeConfigQuizTitle();
}

function initializeModePicker() {
  if (!modeInput) {
    return;
  }

  const requestedMode = String(hostPageParams.get("mode") || "").trim().toLowerCase();
  if (requestedMode) {
    selectSetupMode(requestedMode);
  } else {
    selectSetupMode(modeInput.value || "classic");
  }

  modeInput.addEventListener("change", () => {
    selectSetupMode(modeInput.value || "classic");
  });

  if (!modePickerGrid) {
    return;
  }

  modePickerGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const tile = target.closest(".mode-tile");
    if (!(tile instanceof HTMLElement)) {
      return;
    }

    const supported = tile.dataset.supported !== "false";
    if (!supported) {
      const label = String(tile.childNodes[0]?.textContent || "This mode").trim();
      showNotice(setupNotice, `${label} is not available in this build.`, "bad");
      return;
    }

    const mode = String(tile.dataset.mode || "").trim();
    if (!mode) {
      return;
    }

    hideSetupNotice();
    selectSetupMode(mode);
  });
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

function showBuilderNotice(message, type = "") {
  if (!builderNotice) {
    return;
  }
  if (!message) {
    builderNotice.classList.add("hidden");
    builderNotice.classList.remove("good", "bad");
    builderNotice.textContent = "";
    return;
  }
  builderNotice.classList.remove("hidden", "good", "bad");
  if (type) {
    builderNotice.classList.add(type);
  }
  builderNotice.textContent = message;
}

function defaultBuilderQuestion() {
  return {
    prompt: "",
    options: ["", "", "", ""],
    answerIndex: 0,
    explanation: "",
    image: ""
  };
}

function normalizeBuilderQuestion(rawQuestion) {
  const source = rawQuestion && typeof rawQuestion === "object" ? rawQuestion : {};
  const prompt = String(source.prompt || "").slice(0, 240);
  const explanation = String(source.explanation || "").slice(0, 240);
  const image = String(source.image || source.imageUrl || "").trim().slice(0, 400);
  const baseOptions = Array.isArray(source.options) ? source.options.slice(0, 4) : [];
  while (baseOptions.length < 4) {
    baseOptions.push("");
  }
  const options = baseOptions.map((value) => String(value || "").slice(0, 160));
  const answerCandidate = Number(source.answerIndex);
  const answerIndex =
    Number.isInteger(answerCandidate) && answerCandidate >= 0 && answerCandidate < options.length ? answerCandidate : 0;
  return {
    prompt,
    options,
    answerIndex,
    explanation,
    image
  };
}

function ensureBuilderQuestionMinimum(minimum = 5) {
  const target = Math.max(1, Number(minimum) || 5);
  while (builderQuestionRows.length < target) {
    builderQuestionRows.push(defaultBuilderQuestion());
  }
}

function renderBuilderSetOptions(preferredId = "") {
  if (!builderSetSelect) {
    return;
  }

  const safePreferred = String(preferredId || "");
  const customSets = availableQuestionSets.filter((set) => set.source === "uploaded");
  builderSetSelect.innerHTML = [
    `<option value="">New Custom Quiz</option>`,
    ...customSets.map((set) => {
      const category = normalizeQuestionSetCategory(set.category || "");
      const label = category ? `[${category}] ${set.label}` : set.label;
      return `<option value="${escapeHtml(set.id)}">${escapeHtml(label)}</option>`;
    })
  ].join("");

  const exists = customSets.some((set) => set.id === safePreferred);
  builderSetSelect.value = exists ? safePreferred : "";
}

function renderBuilderQuestions() {
  if (!builderQuestions) {
    return;
  }

  if (!Array.isArray(builderQuestionRows)) {
    builderQuestionRows = [];
  }
  if (builderQuestionRows.length === 0) {
    ensureBuilderQuestionMinimum(1);
  }

  builderQuestions.innerHTML = builderQuestionRows
    .map((question, index) => {
      const safe = normalizeBuilderQuestion(question);
      const answerOptions = ["A", "B", "C", "D"]
        .map((label, optionIndex) => {
          const selected = safe.answerIndex === optionIndex ? " selected" : "";
          return `<option value="${optionIndex}"${selected}>${label}</option>`;
        })
        .join("");

      const optionFields = safe.options
        .map(
          (option, optionIndex) => `
            <div class="quiz-builder-option">
              <label>Option ${String.fromCharCode(65 + optionIndex)}</label>
              <input
                class="builder-input builder-option"
                data-builder-row="${index}"
                data-builder-option="${optionIndex}"
                maxlength="160"
                value="${escapeHtml(option)}"
                placeholder="Option ${String.fromCharCode(65 + optionIndex)}"
              />
            </div>`
        )
        .join("");

      return `
        <article class="quiz-builder-row" data-builder-row="${index}">
          <div class="quiz-builder-row-head">
            <strong>Question ${index + 1}</strong>
            <button type="button" class="danger quiz-builder-remove" data-builder-remove="${index}">Remove</button>
          </div>
          <div class="quiz-builder-field">
            <label>Prompt</label>
            <textarea
              class="builder-input builder-prompt"
              data-builder-row="${index}"
              rows="2"
              maxlength="240"
              placeholder="Enter question prompt"
            >${escapeHtml(safe.prompt)}</textarea>
          </div>
          <div class="quiz-builder-field" style="margin-top: 8px;">
            <label>Image URL (optional)</label>
            <input
              class="builder-input builder-image"
              data-builder-row="${index}"
              maxlength="400"
              value="${escapeHtml(safe.image || "")}"
              placeholder="https://... or /assets/..."
            />
          </div>
          <div class="quiz-builder-options">${optionFields}</div>
          <div class="quiz-builder-foot">
            <div class="quiz-builder-field">
              <label>Correct Answer</label>
              <select class="builder-input builder-answer" data-builder-row="${index}">
                ${answerOptions}
              </select>
            </div>
            <div class="quiz-builder-field">
              <label>Explanation (optional)</label>
              <input
                class="builder-input builder-explanation"
                data-builder-row="${index}"
                maxlength="240"
                value="${escapeHtml(safe.explanation)}"
                placeholder="Short explanation"
              />
            </div>
          </div>
        </article>`;
    })
    .join("");
}

function resetBuilderEditor() {
  builderEditingSetId = "";
  if (builderTitleInput) {
    builderTitleInput.value = "";
  }
  if (builderCategoryInput) {
    builderCategoryInput.value = "";
  }
  if (builderTagsInput) {
    builderTagsInput.value = "";
  }
  builderQuestionRows = [];
  ensureBuilderQuestionMinimum(5);
  renderBuilderSetOptions("");
  renderBuilderQuestions();
  showBuilderNotice("Builder reset. Add questions and save as a new custom quiz.");
}

function applyBuilderSetPayload(setPayload) {
  if (!setPayload || typeof setPayload !== "object") {
    return;
  }

  builderEditingSetId = String(setPayload.id || "");
  if (builderTitleInput) {
    builderTitleInput.value = String(setPayload.label || "").slice(0, 64);
  }
  if (builderCategoryInput) {
    builderCategoryInput.value = normalizeQuestionSetCategory(setPayload.category || "");
  }
  if (builderTagsInput) {
    builderTagsInput.value = tagsText(normalizeQuestionSetTags(setPayload.tags || ""));
  }
  builderQuestionRows = Array.isArray(setPayload.questions) ? setPayload.questions.map(normalizeBuilderQuestion) : [];
  ensureBuilderQuestionMinimum(5);
  renderBuilderSetOptions(builderEditingSetId);
  renderBuilderQuestions();
}

async function loadBuilderSet(setId = "") {
  const safeSetId = String(setId || builderSetSelect?.value || "").trim();
  if (!safeSetId) {
    showBuilderNotice("Pick a custom set to load.", "bad");
    return;
  }

  if (builderLoadBtn) {
    builderLoadBtn.disabled = true;
  }
  showBuilderNotice("Loading custom set...");

  try {
    const response = await fetch(`/api/quizzes/custom/${encodeURIComponent(safeSetId)}`);
    const payload = await response.json();
    if (!response.ok || !payload?.ok || !payload?.set) {
      throw new Error(payload?.message || "Could not load custom set.");
    }
    applyBuilderSetPayload(payload.set);
    showBuilderNotice(`Loaded "${payload.set.label}" into builder.`, "good");
  } catch (error) {
    showBuilderNotice(error?.message || "Could not load custom set.", "bad");
  } finally {
    if (builderLoadBtn) {
      builderLoadBtn.disabled = false;
    }
  }
}

async function saveBuilderSet() {
  if (!builderSaveBtn) {
    return;
  }

  const title = String(builderTitleInput?.value || "").trim();
  if (!title) {
    showBuilderNotice("Enter a quiz title before saving.", "bad");
    return;
  }

  const payloadQuestions = builderQuestionRows.map((question) => ({
    prompt: String(question.prompt || "").trim(),
    options: Array.isArray(question.options) ? question.options.map((option) => String(option || "").trim()) : [],
    answerIndex: Number(question.answerIndex || 0),
    explanation: String(question.explanation || "").trim(),
    image: String(question.image || "").trim()
  }));

  builderSaveBtn.disabled = true;
  showBuilderNotice("Saving custom quiz...");

  try {
    const response = await fetch("/api/quizzes/custom/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: builderEditingSetId || undefined,
        title,
        category: normalizeQuestionSetCategory(builderCategoryInput?.value || ""),
        tags: normalizeQuestionSetTags(builderTagsInput?.value || ""),
        uploadedBy: String(hostNameInput?.value || "Teacher").trim(),
        questions: payloadQuestions
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Could not save custom set.");
    }

    builderEditingSetId = String(payload?.set?.id || "");
    rememberQuestionSets(payload?.sets);
    syncQuestionSetInputs(builderEditingSetId);
    renderBuilderSetOptions(builderEditingSetId);
    if (builderSetSelect) {
      builderSetSelect.value = builderEditingSetId;
    }
    showBuilderNotice(
      `Saved "${payload?.set?.label || "Custom Quiz"}" with ${Number(payload?.set?.questionCount || 0)} questions.`,
      "good"
    );
  } catch (error) {
    showBuilderNotice(error?.message || "Could not save custom set.", "bad");
  } finally {
    builderSaveBtn.disabled = false;
  }
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function questionSetLabelById(setId) {
  return QUESTION_SET_LABELS.get(String(setId || "")) || String(setId || "Quiz");
}

function normalizeQuestionSetCategory(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function normalizeQuestionSetTags(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[,\|]+/g)
        .map((entry) => entry.trim());
  const tags = [];
  for (const raw of source) {
    const tag = String(raw || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 28);
    if (!tag || tags.includes(tag)) {
      continue;
    }
    tags.push(tag);
    if (tags.length >= 8) {
      break;
    }
  }
  return tags;
}

function tagsText(tags) {
  const source = Array.isArray(tags) ? tags : [];
  return source.join(", ");
}

function questionSetCategoryList() {
  const sets = availableQuestionSets.length > 0 ? availableQuestionSets : FALLBACK_QUESTION_SETS;
  const categories = [];
  for (const set of sets) {
    const category = normalizeQuestionSetCategory(set?.category || "");
    if (!category || categories.includes(category)) {
      continue;
    }
    categories.push(category);
  }
  return categories.sort((left, right) => left.localeCompare(right));
}

function syncQuizFilterInputs() {
  if (questionSetSearchInput) {
    questionSetSearchInput.value = quizSetFilterQuery;
  }
  if (liveQuestionSetSearchInput) {
    liveQuestionSetSearchInput.value = quizSetFilterQuery;
  }
  if (questionSetCategoryInput) {
    questionSetCategoryInput.value = quizSetFilterCategory;
  }
  if (liveQuestionSetCategoryInput) {
    liveQuestionSetCategoryInput.value = quizSetFilterCategory;
  }
}

function renderQuestionSetCategoryFilters() {
  const categories = questionSetCategoryList();
  const options = [`<option value="">All Categories</option>`]
    .concat(categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`))
    .join("");

  if (questionSetCategoryInput) {
    questionSetCategoryInput.innerHTML = options;
  }
  if (liveQuestionSetCategoryInput) {
    liveQuestionSetCategoryInput.innerHTML = options;
  }

  if (quizSetFilterCategory && !categories.includes(quizSetFilterCategory)) {
    quizSetFilterCategory = "";
  }
  syncQuizFilterInputs();
}

function applyQuestionSetFilter(queryValue = "", categoryValue = "") {
  quizSetFilterQuery = String(queryValue || "").trim().slice(0, 64);
  quizSetFilterCategory = normalizeQuestionSetCategory(categoryValue || "");
  renderQuestionSetCategoryFilters();
}

function filteredQuestionSets() {
  const allSets = availableQuestionSets.length > 0 ? availableQuestionSets : FALLBACK_QUESTION_SETS;
  const query = quizSetFilterQuery.toLowerCase();
  const category = quizSetFilterCategory;
  return allSets.filter((set) => {
    const setCategory = normalizeQuestionSetCategory(set?.category || "");
    if (category && setCategory !== category) {
      return false;
    }
    if (!query) {
      return true;
    }
    const tags = Array.isArray(set?.tags) ? set.tags : [];
    const haystack = [set?.label, set?.id, setCategory, ...tags].join(" ").toLowerCase();
    return haystack.includes(query);
  });
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
      questionCount: Math.max(0, Number(entry?.questionCount || 0)),
      category: normalizeQuestionSetCategory(entry?.category || ""),
      tags: normalizeQuestionSetTags(entry?.tags || "")
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
  const allSets = availableQuestionSets.length > 0 ? availableQuestionSets : FALLBACK_QUESTION_SETS;
  const filtered = filteredQuestionSets();
  const sets = filtered.length > 0 ? filtered.slice() : allSets.slice();
  const safeSelected = String(selectedId || "");
  if (safeSelected && !sets.some((set) => set.id === safeSelected)) {
    const selectedEntry = allSets.find((set) => set.id === safeSelected);
    if (selectedEntry) {
      sets.unshift(selectedEntry);
    }
  }

  if (sets.length === 0) {
    selectEl.innerHTML = `<option value="">No matching quiz sets</option>`;
    return;
  }

  selectEl.innerHTML = sets
    .map((set) => {
      const category = normalizeQuestionSetCategory(set.category || "");
      const categoryPrefix = category ? `[${category}] ` : "";
      const uploadedSuffix = set.source === "uploaded" ? " (Uploaded)" : "";
      const label = `${categoryPrefix}${set.label}${uploadedSuffix}`;
      const selected = set.id === safeSelected ? " selected" : "";
      return `<option value="${escapeHtml(set.id)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function syncQuestionSetInputs(preferredId = "") {
  const allSets = availableQuestionSets.length > 0 ? availableQuestionSets : FALLBACK_QUESTION_SETS;
  const fallback = allSets[0]?.id || "multiplication_1_digit";
  const safePreferred = String(preferredId || "");
  const selectedId = allSets.some((set) => set.id === safePreferred) ? safePreferred : fallback;
  renderQuestionSetCategoryFilters();
  renderQuestionSetOptions(questionSetInput, selectedId);
  renderQuestionSetOptions(liveQuestionSet, selectedId);
  renderBuilderSetOptions(builderEditingSetId || "");
  renderModeConfigQuizTitle();
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

  if (type === "foosball_frenzy") {
    miniGameDashboardBody.innerHTML = `
      <div class="host-soccer-grid">
        ${players
          .map((player) => {
            const goals = Number(player.goals || 0);
            const botGoals = Number(player.botGoals || 0);
            const shots = Number(player.shots || 0);
            const saves = Number(player.saves || 0);
            const accuracy = shots > 0 ? Math.round((goals / shots) * 100) : 0;
            return `
            <article class="host-soccer-card theme-lime">
              <div class="host-mini-player">
                <span class="blook-top-icon">${escapeHtml(player.blook?.icon || "?")}</span>
                <strong>${escapeHtml(player.name)}</strong>
              </div>
              <div class="host-soccer-score">You ${goals} - ${botGoals} Bot</div>
              <div class="help">${shots} shots | ${accuracy}% accuracy | ${saves} saves</div>
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

function startTicker(targetEl, endsAt, label) {
  stopTicker();

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

function stopTicker() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function setPhase(value, detail = "") {
  phase = value;
  phaseText.textContent = normalizePhase(value);
  setPhaseBanner(value, detail);
  if (value !== "minigame" && value !== "paused") {
    hideMiniGameDashboard();
  }
  if (value !== "question" && value !== "paused") {
    setQuestionMediaImage(hostQuestionMedia, "", "");
  }

  if (lobbyBoard) {
    lobbyBoard.classList.toggle("hidden", value !== "lobby");
  }
  updatePhaseActionButtons();
  updateLateJoinControls();
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

function formatCatalogUrl(baseUrl) {
  const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
  if (!cleanBase) {
    return "";
  }

  const query = new URLSearchParams();
  query.set("catalog", "1");
  if (roomCode) {
    query.set("code", roomCode);
  }
  return `${cleanBase}/play.html?${query.toString()}#accountPanel`;
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

function preferredCatalogUrl() {
  if (serverInfo) {
    if (Array.isArray(serverInfo.lanUrls) && serverInfo.lanUrls.length > 0) {
      return formatCatalogUrl(serverInfo.lanUrls[0]);
    }
    if (serverInfo.localhost) {
      return formatCatalogUrl(serverInfo.localhost);
    }
  }

  return formatCatalogUrl(window.location.origin || "");
}

function hostPlayUrl() {
  if (!roomCode) {
    return "";
  }

  const hostName = String(hostNameInput?.value || "Host").trim().slice(0, 24) || "Host";
  const joinUrl = preferredJoinUrl();
  if (!joinUrl) {
    return "";
  }

  try {
    const url = new URL(joinUrl);
    url.searchParams.set("code", roomCode);
    url.searchParams.set("name", hostName);
    url.searchParams.set("autojoin", "1");
    return url.toString();
  } catch (_error) {
    return `/play.html?code=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(hostName)}&autojoin=1`;
  }
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
  if (previewBlooksBtn) {
    previewBlooksBtn.href = preferredCatalogUrl() || "/play.html?catalog=1#accountPanel";
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

    const preferred =
      (requestedMiniGameType && games.some((game) => game.id === requestedMiniGameType) ? requestedMiniGameType : "") ||
      previous;
    const exists = games.some((game) => game.id === preferred);
    testMiniGameType.value = exists ? preferred : games[0].id;
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
  const preferred =
    (requestedQuestionSetId && availableQuestionSets.some((set) => set.id === requestedQuestionSetId)
      ? requestedQuestionSetId
      : "") ||
    questionSetInput?.value ||
    liveQuestionSet?.value ||
    "";
  syncQuestionSetInputs(preferred);
}

async function uploadQuizSetFile() {
  if (!uploadQuizBtn || !quizUploadFileInput) {
    return;
  }

  const file = quizUploadFileInput.files && quizUploadFileInput.files[0];
  if (!file) {
    showQuizUploadNotice("Pick a CSV, Excel, or JSON file first.", "bad");
    return;
  }

  uploadQuizBtn.disabled = true;
  showQuizUploadNotice("Importing quiz file...");
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
      throw new Error(payload?.message || "Import failed");
    }

    const importedSets = Array.isArray(payload?.importedSets) ? payload.importedSets : payload?.set ? [payload.set] : [];
    const importedCount = Math.max(0, Number(payload?.importedCount || importedSets.length || 0));
    const skippedCount = Math.max(0, Number(payload?.skippedCount || 0));
    rememberQuestionSets(payload?.sets);
    syncQuestionSetInputs(payload?.set?.id || "");
    if (importedCount > 1) {
      const skippedText = skippedCount > 0 ? ` (${skippedCount} skipped)` : "";
      showQuizUploadNotice(`Imported ${importedCount} quiz sets${skippedText}.`, "good");
    } else {
      const firstSet = importedSets[0] || payload?.set || null;
      showQuizUploadNotice(
        `Imported "${firstSet?.label || "Quiz"}" with ${Number(firstSet?.questionCount || 0)} questions.`,
        "good"
      );
    }
    if (quizUploadFileInput) {
      quizUploadFileInput.value = "";
    }
  } catch (error) {
    showQuizUploadNotice(error?.message || "Could not import quiz file.", "bad");
  } finally {
    uploadQuizBtn.disabled = false;
  }
}

function parseDownloadFileName(contentDisposition) {
  const value = String(contentDisposition || "").trim();
  if (!value) {
    return "";
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).trim();
    } catch (_error) {
      return utf8Match[1].trim();
    }
  }

  const simpleMatch = value.match(/filename="?([^";]+)"?/i);
  return simpleMatch && simpleMatch[1] ? simpleMatch[1].trim() : "";
}

async function exportCustomQuizSets() {
  if (!exportQuizBtn) {
    return;
  }

  exportQuizBtn.disabled = true;
  showQuizUploadNotice("Preparing quiz export...");

  try {
    const response = await fetch("/api/quizzes/export");
    if (!response.ok) {
      throw new Error("Could not export quizzes.");
    }

    const fileName =
      parseDownloadFileName(response.headers.get("content-disposition")) ||
      `quiz-arena-custom-quizzes-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
    showQuizUploadNotice(`Exported custom quizzes to "${fileName}".`, "good");
  } catch (error) {
    showQuizUploadNotice(error?.message || "Could not export quizzes.", "bad");
  } finally {
    exportQuizBtn.disabled = false;
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
  const setupConfig = setupConfigPayload();

  const payload = {
    hostName: hostNameInput.value,
    mode: modeInput.value,
    questionSet: questionSetInput.value,
    timerSeconds: Number(timerInput.value),
    explanationRevealSec: Number(explanationRevealInput?.value || 2),
    questionCount: Number(countInput.value),
    shuffleQuestionOptions: shuffleQuestionOptionsInput?.checked === true,
    preventQuestionRepeats: preventQuestionRepeatsInput?.checked === true,
    miniGameRotationMode: miniRotationInput?.value || "fixed",
    miniGameDurationSec: Number(miniDurationInput?.value || 10),
    endType: setupConfig.endType,
    endTargetValue: setupConfig.endTargetValue,
    showInstructions: setupConfig.showInstructions,
    allowLateJoin: setupConfig.allowLateJoin,
    useRandomNames: setupConfig.useRandomNames,
    allowStudentAccounts: setupConfig.allowStudentAccounts
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
    modeLabel.textContent = `Mode: ${MODE_LABELS[payload.mode] || payload.mode || "Classic Quiz"}`;
    quizLabel.textContent = `Quiz: ${questionSetLabelById(payload.questionSet)}`;
    setPhase("lobby", "Room created. Share the code so students can join.");
    currentAllowLateJoin = setupConfig.allowLateJoin === true;
    updateLateJoinControls();
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

playAsHostBtn?.addEventListener("click", () => {
  if (!roomCode) {
    showNotice(hostNotice, "Create a room first.", "bad");
    return;
  }

  const url = hostPlayUrl();
  if (!url) {
    showNotice(hostNotice, "Host play link unavailable right now.", "bad");
    return;
  }

  const opened = window.open(url, "_blank", "noopener");
  if (!opened) {
    showNotice(hostNotice, "Pop-up blocked. Allow pop-ups to open your host player tab.", "bad");
    return;
  }
  showNotice(hostNotice, "Opened player tab for host. Keep this tab for controls.", "good");
});

lateJoinToggleBtn?.addEventListener("click", () => {
  if (!ensureCreated()) return;
  const nextAllowLateJoin = !currentAllowLateJoin;
  socket.emit("host:toggleLateJoin", { code: roomCode, allowLateJoin: nextAllowLateJoin }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Could not update late join setting.", "bad");
      return;
    }
    currentAllowLateJoin = res.allowLateJoin !== false;
    updateLateJoinControls();
    showNotice(hostNotice, currentAllowLateJoin ? "Late join unlocked." : "Late join locked.", "good");
  });
});

pauseResumeBtn?.addEventListener("click", () => {
  if (!ensureCreated()) return;
  socket.emit("host:pauseToggle", { code: roomCode }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Could not pause/resume the game.", "bad");
      return;
    }
    showNotice(hostNotice, res.phase === "paused" ? "Game paused." : "Game resumed.", "good");
  });
});

skipMiniGameBtn?.addEventListener("click", () => {
  if (!ensureCreated()) return;
  socket.emit("host:skipMiniGame", { code: roomCode }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Could not skip the mini-game.", "bad");
      return;
    }
    showNotice(hostNotice, "Mini-game skipped.", "good");
  });
});

forceNextQuestionBtn?.addEventListener("click", () => {
  if (!ensureCreated()) return;
  socket.emit("host:forceNextQuestion", { code: roomCode }, (res) => {
    if (!res?.ok) {
      showNotice(hostNotice, res?.message || "Could not force the next question.", "bad");
      return;
    }
    showNotice(hostNotice, "Advanced to the next question.", "good");
  });
});

saveSettingsBtn.addEventListener("click", () => {
  if (!ensureCreated()) return;
  const setupConfig = setupConfigPayload();

  socket.emit(
    "host:updateSettings",
    {
      code: roomCode,
      settings: {
        mode: liveMode.value,
        questionSet: liveQuestionSet.value,
        timerSeconds: Number(liveTimer.value),
        explanationRevealSec: Number(liveExplanationReveal?.value || 2),
        questionCount: Number(liveCount.value),
        shuffleQuestionOptions: liveShuffleQuestionOptions?.checked === true,
        preventQuestionRepeats: livePreventQuestionRepeats?.checked === true,
        miniGameRotationMode: liveMiniRotation?.value || "fixed",
        miniGameDurationSec: Number(liveMiniDuration?.value || 10),
        endType: setupConfig.endType,
        endTargetValue: setupConfig.endTargetValue,
        showInstructions: setupConfig.showInstructions,
        allowLateJoin: setupConfig.allowLateJoin,
        useRandomNames: setupConfig.useRandomNames,
        allowStudentAccounts: setupConfig.allowStudentAccounts
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

exportQuizBtn?.addEventListener("click", () => {
  exportCustomQuizSets();
});

builderLoadBtn?.addEventListener("click", () => {
  loadBuilderSet(builderSetSelect?.value || "");
});

builderNewBtn?.addEventListener("click", () => {
  resetBuilderEditor();
});

builderAddQuestionBtn?.addEventListener("click", () => {
  builderQuestionRows.push(defaultBuilderQuestion());
  renderBuilderQuestions();
  showBuilderNotice("");
});

builderSaveBtn?.addEventListener("click", () => {
  saveBuilderSet();
});

builderQuestions?.addEventListener("input", (event) => {
  const target = event.target;
  if (
    !(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    )
  ) {
    return;
  }

  const rowIndex = Number(target.getAttribute("data-builder-row"));
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= builderQuestionRows.length) {
    return;
  }

  const row = builderQuestionRows[rowIndex];
  if (!row) {
    return;
  }

  if (target.classList.contains("builder-prompt")) {
    row.prompt = String(target.value || "");
    return;
  }

  if (target.classList.contains("builder-option")) {
    const optionIndex = Number(target.getAttribute("data-builder-option"));
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= row.options.length) {
      return;
    }
    row.options[optionIndex] = String(target.value || "");
    return;
  }

  if (target.classList.contains("builder-answer")) {
    const answerIndex = Number(target.value || 0);
    row.answerIndex =
      Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < row.options.length ? answerIndex : 0;
    return;
  }

  if (target.classList.contains("builder-image")) {
    row.image = String(target.value || "").trim();
    return;
  }

  if (target.classList.contains("builder-explanation")) {
    row.explanation = String(target.value || "");
  }
});

builderQuestions?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const removeIndex = Number(target.getAttribute("data-builder-remove"));
  if (!Number.isInteger(removeIndex) || removeIndex < 0 || removeIndex >= builderQuestionRows.length) {
    return;
  }

  if (builderQuestionRows.length <= 1) {
    showBuilderNotice("Keep at least one row in the builder.", "bad");
    return;
  }

  builderQuestionRows.splice(removeIndex, 1);
  renderBuilderQuestions();
  showBuilderNotice("");
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
        questionCount: 0,
        category: "",
        tags: []
      });
    }
  }
  syncQuestionSetInputs(payload.settings?.questionSet || "");
  selectSetupMode(payload.settings?.mode || modeInput?.value || "classic");
  applySetupConfigFromSettings(payload.settings || {});
  const questionSetText = payload.questionSetLabel || questionSetLabelById(payload.settings.questionSet) || "Quiz";
  modeLabel.textContent = `Mode: ${modeText}`;
  quizLabel.textContent = `Quiz: ${questionSetText}`;
  feedTitle.textContent = payload.feedTitle || "Mode Feed";
  liveMode.value = payload.settings.mode;
  liveQuestionSet.value = payload.settings.questionSet;
  liveTimer.value = payload.settings.timerSeconds;
  const revealRaw = Number(payload.settings?.explanationRevealSec);
  const revealSec = Math.max(0, Math.min(10, Number.isFinite(revealRaw) ? revealRaw : 2));
  if (liveExplanationReveal) {
    liveExplanationReveal.value = String(revealSec);
  }
  if (explanationRevealInput) {
    explanationRevealInput.value = String(revealSec);
  }
  currentAllowLateJoin = payload.settings?.allowLateJoin !== false;
  const shuffleOptions = payload.settings?.shuffleQuestionOptions === true;
  const preventRepeats = payload.settings?.preventQuestionRepeats === true;
  if (shuffleQuestionOptionsInput) {
    shuffleQuestionOptionsInput.checked = shuffleOptions;
  }
  if (liveShuffleQuestionOptions) {
    liveShuffleQuestionOptions.checked = shuffleOptions;
  }
  if (preventQuestionRepeatsInput) {
    preventQuestionRepeatsInput.checked = preventRepeats;
  }
  if (livePreventQuestionRepeats) {
    livePreventQuestionRepeats.checked = preventRepeats;
  }
  updateLateJoinControls();
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

socket.on("settings:update", (payload) => {
  if (payload?.code !== roomCode || !payload?.settings) {
    return;
  }
  currentAllowLateJoin = payload.settings.allowLateJoin !== false;
  updateLateJoinControls();
});

socket.on("game:countdown", ({ secondsLeft }) => {
  const safeSeconds = Math.max(0, Number(secondsLeft) || 0);
  const message = safeSeconds > 0 ? `Game starts in ${safeSeconds}...` : "Go! Question is starting.";
  setPhase("countdown", message);
  pausedFromPhase = "";
  setPhaseIllustration("", "");
  questionPanel.classList.add("hidden");
  showNotice(hostNotice, message, safeSeconds > 0 ? "" : "good");
});

socket.on("game:paused", ({ fromPhase }) => {
  pausedFromPhase = String(fromPhase || "");
  stopTicker();
  setPhase("paused", `Paused during ${normalizePhase(pausedFromPhase || "game")}.`);
  showNotice(hostNotice, "Game paused.", "good");
});

socket.on("game:resumed", ({ phase: resumedPhase, endsAt }) => {
  pausedFromPhase = "";
  const nextPhase = String(resumedPhase || "question");
  setPhase(nextPhase, `${normalizePhase(nextPhase)} resumed.`);
  if ((nextPhase === "question" || nextPhase === "minigame") && Number.isFinite(Number(endsAt))) {
    startTicker(questionTimer, Number(endsAt), nextPhase === "question" ? "Time left" : "Mini-game ends in");
  }
  showNotice(hostNotice, `${normalizePhase(nextPhase)} resumed.`, "good");
});

socket.on("question:start", (payload) => {
  setPhase("question", `Question ${payload.questionIndex}/${payload.totalQuestions} is live.`);
  setPhaseIllustration("question", "Question round");
  questionPanel.classList.remove("hidden");
  questionText.textContent = payload.question.prompt;
  setQuestionMediaImage(hostQuestionMedia, payload.question.image, payload.question.prompt);
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

if (hostNameInput && requestedHostName) {
  hostNameInput.value = requestedHostName.slice(0, 24);
}

initializeModeConfigPanel();
initializeModePicker();
resetBuilderEditor();
loadServerInfo();
loadQuestionSets();
loadMiniGames();
updateLateJoinControls();
setInterval(loadQuestionSets, 30000);
setInterval(loadMiniGames, 15000);

