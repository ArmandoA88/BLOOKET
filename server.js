const path = require("path");
const os = require("os");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const GAME_CODE_LENGTH = 6;
const GAME_IDLE_TTL_MS = 3 * 60 * 60 * 1000;

const QUESTION_BANK = [
  {
    prompt: "What does CPU stand for?",
    options: ["Central Processing Unit", "Computer Program Utility", "Central Peripheral Unit", "Compute Power Unit"],
    answerIndex: 0,
    explanation: "CPU means Central Processing Unit."
  },
  {
    prompt: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Mercury"],
    answerIndex: 1,
    explanation: "Mars appears red due to iron oxide on its surface."
  },
  {
    prompt: "What is 9 x 7?",
    options: ["56", "63", "72", "49"],
    answerIndex: 1,
    explanation: "9 multiplied by 7 is 63."
  },
  {
    prompt: "Which language runs natively in the browser?",
    options: ["Java", "Python", "JavaScript", "C#"],
    answerIndex: 2,
    explanation: "JavaScript is the browser's native scripting language."
  },
  {
    prompt: "What gas do plants absorb from the atmosphere?",
    options: ["Oxygen", "Hydrogen", "Nitrogen", "Carbon dioxide"],
    answerIndex: 3,
    explanation: "Plants absorb carbon dioxide during photosynthesis."
  },
  {
    prompt: "Who wrote 'Romeo and Juliet'?",
    options: ["William Shakespeare", "Jane Austen", "Charles Dickens", "Mark Twain"],
    answerIndex: 0,
    explanation: "Shakespeare wrote Romeo and Juliet."
  },
  {
    prompt: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
    answerIndex: 2,
    explanation: "The Pacific Ocean is the largest."
  },
  {
    prompt: "Which data structure uses FIFO ordering?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    answerIndex: 1,
    explanation: "Queue is first-in, first-out."
  },
  {
    prompt: "How many degrees are in a right angle?",
    options: ["45", "90", "120", "180"],
    answerIndex: 1,
    explanation: "A right angle is 90 degrees."
  },
  {
    prompt: "Which country is home to the city of Kyoto?",
    options: ["China", "Japan", "South Korea", "Thailand"],
    answerIndex: 1,
    explanation: "Kyoto is in Japan."
  },
  {
    prompt: "What does HTML stand for?",
    options: ["HyperText Markup Language", "HighText Machine Language", "Hyperlink Tool Markup Language", "Home Tool Markup Language"],
    answerIndex: 0,
    explanation: "HTML stands for HyperText Markup Language."
  },
  {
    prompt: "Which organ pumps blood through the human body?",
    options: ["Liver", "Lungs", "Heart", "Kidney"],
    answerIndex: 2,
    explanation: "The heart pumps blood through the body."
  },
  {
    prompt: "What is the capital of Canada?",
    options: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
    answerIndex: 2,
    explanation: "Ottawa is the capital city of Canada."
  },
  {
    prompt: "In coding, what does API stand for?",
    options: ["Applied Programming Interface", "Application Programming Interface", "Advanced Program Integration", "Automated Process Instruction"],
    answerIndex: 1,
    explanation: "API means Application Programming Interface."
  },
  {
    prompt: "What is the square root of 144?",
    options: ["10", "11", "12", "14"],
    answerIndex: 2,
    explanation: "12 * 12 equals 144."
  },
  {
    prompt: "Which continent has the most countries?",
    options: ["Africa", "Europe", "Asia", "South America"],
    answerIndex: 0,
    explanation: "Africa has the highest number of countries."
  },
  {
    prompt: "Which file extension is used for JSON files?",
    options: [".jsn", ".json", ".jv", ".data"],
    answerIndex: 1,
    explanation: "JSON files use the .json extension."
  },
  {
    prompt: "What is H2O commonly known as?",
    options: ["Hydrogen Peroxide", "Salt", "Water", "Ozone"],
    answerIndex: 2,
    explanation: "H2O is water."
  },
  {
    prompt: "Which musician is known as the 'King of Pop'?",
    options: ["Elvis Presley", "Michael Jackson", "Prince", "Stevie Wonder"],
    answerIndex: 1,
    explanation: "Michael Jackson is widely known as the King of Pop."
  },
  {
    prompt: "What does CSS primarily control in web development?",
    options: ["Database queries", "Server routing", "Page styling", "Unit testing"],
    answerIndex: 2,
    explanation: "CSS controls presentation and styling."
  },
  {
    prompt: "Which number is prime?",
    options: ["21", "29", "35", "49"],
    answerIndex: 1,
    explanation: "29 is a prime number."
  },
  {
    prompt: "Which layer of Earth is liquid and surrounds the inner core?",
    options: ["Crust", "Mantle", "Outer core", "Lithosphere"],
    answerIndex: 2,
    explanation: "The outer core is liquid and surrounds the inner core."
  },
  {
    prompt: "What command initializes a new npm project?",
    options: ["npm start", "npm init", "npm install", "npm create"],
    answerIndex: 1,
    explanation: "npm init starts a new npm project setup."
  },
  {
    prompt: "Which U.S. state is known as the Sunshine State?",
    options: ["California", "Florida", "Texas", "Arizona"],
    answerIndex: 1,
    explanation: "Florida is called the Sunshine State."
  }
];

const QUESTION_SET_CONFIG = {
  multiplication_1_digit: {
    id: "multiplication_1_digit",
    label: "Multiplication 1-Digit"
  },
  general_knowledge: {
    id: "general_knowledge",
    label: "General Knowledge"
  }
};

const BLOOK_PACKS = [
  {
    id: "sports",
    name: "Sports Pack",
    description: "Athletes and game-day icons.",
    blooks: [
      { id: "sports-soccer-star", name: "Soccer Star", icon: "⚽", rarity: "Common" },
      { id: "sports-basketball-pro", name: "Basketball Pro", icon: "🏀", rarity: "Common" },
      { id: "sports-tennis-ace", name: "Tennis Ace", icon: "🎾", rarity: "Rare" },
      { id: "sports-football-captain", name: "Football Captain", icon: "🏈", rarity: "Rare" },
      { id: "sports-baseball-slugger", name: "Baseball Slugger", icon: "⚾", rarity: "Epic" },
      { id: "sports-hockey-enforcer", name: "Hockey Enforcer", icon: "🏒", rarity: "Epic" },
      { id: "sports-boxing-champ", name: "Boxing Champ", icon: "🥊", rarity: "Legendary" },
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
      { id: "anime-element-mage", name: "Element Mage", icon: "🔥", rarity: "Rare" },
      { id: "anime-shadow-rival", name: "Shadow Rival", icon: "🌘", rarity: "Rare" },
      { id: "anime-sky-ninja", name: "Sky Ninja", icon: "🌪️", rarity: "Epic" },
      { id: "anime-spirit-fox", name: "Spirit Fox", icon: "🦊", rarity: "Epic" },
      { id: "anime-dragon-summoner", name: "Dragon Summoner", icon: "🐉", rarity: "Legendary" },
      { id: "anime-cosmic-sentinel", name: "Cosmic Sentinel", icon: "✨", rarity: "Legendary" }
    ]
  },
  {
    id: "science",
    name: "Science Pack",
    description: "Lab, space, and invention vibes.",
    blooks: [
      { id: "science-lab-rat", name: "Lab Rat", icon: "🧪", rarity: "Common" },
      { id: "science-rocket-cadet", name: "Rocket Cadet", icon: "🚀", rarity: "Common" },
      { id: "science-robot-tech", name: "Robot Tech", icon: "🛠️", rarity: "Rare" },
      { id: "science-dna-hacker", name: "DNA Hacker", icon: "🧬", rarity: "Rare" },
      { id: "science-circuit-master", name: "Circuit Master", icon: "💡", rarity: "Epic" },
      { id: "science-nebula-scout", name: "Nebula Scout", icon: "🪐", rarity: "Epic" },
      { id: "science-quantum-chief", name: "Quantum Chief", icon: "⚛️", rarity: "Legendary" },
      { id: "science-time-architect", name: "Time Architect", icon: "⌛", rarity: "Legendary" }
    ]
  },
  {
    id: "nature",
    name: "Nature Pack",
    description: "Animals and wild creatures.",
    blooks: [
      { id: "nature-forest-owl", name: "Forest Owl", icon: "🦉", rarity: "Common" },
      { id: "nature-polar-bear", name: "Polar Bear", icon: "🐻‍❄️", rarity: "Common" },
      { id: "nature-river-otter", name: "River Otter", icon: "🦦", rarity: "Rare" },
      { id: "nature-thunder-eagle", name: "Thunder Eagle", icon: "🦅", rarity: "Rare" },
      { id: "nature-night-panther", name: "Night Panther", icon: "🐆", rarity: "Epic" },
      { id: "nature-volcano-fox", name: "Volcano Fox", icon: "🦊", rarity: "Epic" },
      { id: "nature-ancient-turtle", name: "Ancient Turtle", icon: "🐢", rarity: "Legendary" },
      { id: "nature-crystal-stag", name: "Crystal Stag", icon: "🦌", rarity: "Legendary" }
    ]
  },
  {
    id: "mythic",
    name: "Mythic Pack",
    description: "Fantasy and legendary entities.",
    blooks: [
      { id: "mythic-stone-golem", name: "Stone Golem", icon: "🪨", rarity: "Common" },
      { id: "mythic-sun-priest", name: "Sun Priest", icon: "☀️", rarity: "Common" },
      { id: "mythic-moon-seer", name: "Moon Seer", icon: "🌙", rarity: "Rare" },
      { id: "mythic-arcane-knight", name: "Arcane Knight", icon: "🛡️", rarity: "Rare" },
      { id: "mythic-griffin-rider", name: "Griffin Rider", icon: "🪽", rarity: "Epic" },
      { id: "mythic-phoenix", name: "Phoenix", icon: "🐦‍🔥", rarity: "Epic" },
      { id: "mythic-titan-warden", name: "Titan Warden", icon: "🏛️", rarity: "Legendary" },
      { id: "mythic-celestial-dragon", name: "Celestial Dragon", icon: "🐲", rarity: "Legendary" }
    ]
  }
];

const BLOOK_LOOKUP = new Map();

for (const pack of BLOOK_PACKS) {
  for (const blook of pack.blooks) {
    BLOOK_LOOKUP.set(blook.id, {
      id: blook.id,
      name: blook.name,
      icon: blook.icon,
      rarity: blook.rarity,
      packId: pack.id,
      packName: pack.name
    });
  }
}

const DEFAULT_BLOOK = BLOOK_LOOKUP.get(BLOOK_PACKS[0].blooks[0].id);
const ALL_BLOOKS = Array.from(BLOOK_LOOKUP.values());

function publicBlookPacks() {
  return BLOOK_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    blooks: pack.blooks.map((blook) => ({
      id: blook.id,
      name: blook.name,
      icon: blook.icon,
      rarity: blook.rarity
    }))
  }));
}

function resolveBlookById(blookId) {
  if (typeof blookId !== "string") {
    return DEFAULT_BLOOK;
  }

  return BLOOK_LOOKUP.get(blookId.trim()) || DEFAULT_BLOOK;
}

function randomBlook() {
  if (!Array.isArray(ALL_BLOOKS) || ALL_BLOOKS.length === 0) {
    return DEFAULT_BLOOK;
  }

  return ALL_BLOOKS[randomInt(0, ALL_BLOOKS.length - 1)];
}

const MODE_CONFIG = {
  classic: {
    id: "classic",
    label: "Classic Quiz",
    baseScore: 600,
    speedBonusCap: 450,
    streakStep: 120,
    streakCap: 500,
    eventPhase: false,
    eventName: "",
    feedTitle: "Round Feed",
    actionLabel: "Open",
    fallbackGain: 100,
    unit: "points"
  },
  gold: {
    id: "gold",
    label: "Gold Quest",
    baseScore: 450,
    speedBonusCap: 420,
    streakStep: 120,
    streakCap: 500,
    eventPhase: true,
    eventName: "Gold Chest",
    feedTitle: "Gold Feed",
    actionLabel: "Open Chest",
    fallbackGain: 120,
    unit: "gold"
  },
  crypto: {
    id: "crypto",
    label: "Crypto Hack",
    baseScore: 440,
    speedBonusCap: 420,
    streakStep: 115,
    streakCap: 520,
    eventPhase: true,
    eventName: "Market Card",
    feedTitle: "Market Feed",
    actionLabel: "Use Card",
    fallbackGain: 110,
    unit: "coins"
  },
  fishing: {
    id: "fishing",
    label: "Fishing Frenzy",
    baseScore: 470,
    speedBonusCap: 390,
    streakStep: 110,
    streakCap: 480,
    eventPhase: true,
    eventName: "Catch Crate",
    feedTitle: "Harbor Feed",
    actionLabel: "Reel In",
    fallbackGain: 90,
    unit: "fish"
  },
  brawl: {
    id: "brawl",
    label: "Monster Brawl",
    baseScore: 500,
    speedBonusCap: 360,
    streakStep: 130,
    streakCap: 560,
    eventPhase: true,
    eventName: "Battle Move",
    feedTitle: "Battle Feed",
    actionLabel: "Use Move",
    fallbackGain: 95,
    unit: "power"
  }
};

const MODE_MINI_GAMES = {
  classic: ["soccer_shootout", "tap_rush", "sequence_memory", "precision_stop"],
  gold: ["soccer_shootout", "tap_rush", "sequence_memory", "precision_stop"],
  crypto: ["soccer_shootout", "tap_rush", "sequence_memory", "precision_stop"],
  fishing: ["soccer_shootout", "tap_rush", "sequence_memory", "precision_stop"],
  brawl: ["soccer_shootout", "tap_rush", "sequence_memory", "precision_stop"]
};

const MINI_GAME_CATALOG = [
  {
    id: "soccer_shootout",
    name: "Soccer Shootout",
    description: "Penalty kicks: choose lane and power against the goalkeeper."
  },
  {
    id: "tap_rush",
    name: "Tap Rush",
    description: "Tap fast before the timer ends to build your bonus."
  },
  {
    id: "sequence_memory",
    name: "Sequence Memory",
    description: "Repeat the color order as fast as possible."
  },
  {
    id: "precision_stop",
    name: "Precision Stop",
    description: "Stop the moving marker near the target zone."
  }
];

const MINI_GAME_LOOKUP = new Map(MINI_GAME_CATALOG.map((game) => [game.id, game]));

function publicMiniGameCatalog() {
  return MINI_GAME_CATALOG.map((game) => ({
    id: game.id,
    name: game.name,
    description: game.description
  }));
}

function normalizeMode(mode) {
  if (typeof mode !== "string") {
    return "classic";
  }

  return MODE_CONFIG[mode] ? mode : "classic";
}

function getModeConfig(mode) {
  return MODE_CONFIG[normalizeMode(mode)];
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const games = new Map();
const socketToGame = new Map();

app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".html" || ext === ".js" || ext === ".css") {
        res.setHeader("Cache-Control", "no-store, max-age=0");
      }
    }
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, games: games.size });
});

app.get("/api/blooks", (_req, res) => {
  res.json({
    packs: publicBlookPacks()
  });
});

app.get("/api/minigames", (_req, res) => {
  res.json({
    games: publicMiniGameCatalog()
  });
});

function isPrivateIpv4(ip) {
  if (typeof ip !== "string") {
    return false;
  }

  return ip.startsWith("10.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function getLanIpv4Addresses() {
  const results = [];
  const seen = new Set();
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    for (const entry of entries) {
      if (!entry || entry.family !== "IPv4" || entry.internal || !isPrivateIpv4(entry.address)) {
        continue;
      }

      if (seen.has(entry.address)) {
        continue;
      }

      seen.add(entry.address);
      results.push(entry.address);
    }
  }

  return results;
}

app.get("/api/server-info", (_req, res) => {
  const port = Number(PORT);
  const lanIps = getLanIpv4Addresses();

  res.json({
    port,
    localhost: `http://localhost:${port}`,
    lanIps,
    lanUrls: lanIps.map((ip) => `http://${ip}:${port}`)
  });
});

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeName(name) {
  if (typeof name !== "string") {
    return "";
  }

  return name.replace(/\s+/g, " ").trim().slice(0, 24);
}

function createGameCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let i = 0; i < 2000; i += 1) {
    let code = "";

    for (let j = 0; j < GAME_CODE_LENGTH; j += 1) {
      code += alphabet[randomInt(0, alphabet.length - 1)];
    }

    if (!games.has(code)) {
      return code;
    }
  }

  throw new Error("Unable to generate unique game code");
}

function shuffle(list) {
  const arr = [...list];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function normalizeQuestionSet(questionSet) {
  if (typeof questionSet !== "string") {
    return "multiplication_1_digit";
  }

  return QUESTION_SET_CONFIG[questionSet] ? questionSet : "multiplication_1_digit";
}

function questionSetLabel(questionSet) {
  return QUESTION_SET_CONFIG[normalizeQuestionSet(questionSet)].label;
}

function buildMultiplicationOneDigitBank() {
  const questions = [];

  for (let left = 1; left <= 9; left += 1) {
    for (let right = 1; right <= 9; right += 1) {
      const correct = left * right;
      const distractors = new Set();

      while (distractors.size < 3) {
        const drift = randomInt(-9, 9);
        if (drift === 0) {
          continue;
        }
        const candidate = Math.max(1, correct + drift);
        if (candidate !== correct) {
          distractors.add(candidate);
        }
      }

      const options = shuffle([correct, ...distractors]).map((value) => String(value));
      questions.push({
        prompt: `What is ${left} x ${right}?`,
        options,
        answerIndex: options.indexOf(String(correct)),
        explanation: `${left} x ${right} = ${correct}.`
      });
    }
  }

  return questions;
}

function questionPoolBySet(questionSet) {
  const normalizedSet = normalizeQuestionSet(questionSet);
  if (normalizedSet === "multiplication_1_digit") {
    return buildMultiplicationOneDigitBank();
  }

  return QUESTION_BANK;
}

function pickQuestions(count, questionSet) {
  const safeCount = clamp(count, 5, 30);
  const pool = shuffle(questionPoolBySet(questionSet));

  if (safeCount <= pool.length) {
    return pool.slice(0, safeCount);
  }

  const extended = [];
  while (extended.length < safeCount) {
    extended.push(...shuffle(questionPoolBySet(questionSet)));
  }

  return extended.slice(0, safeCount);
}

function sortedPlayers(game) {
  return Array.from(game.players.values())
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map((player, index) => ({
      id: player.id,
      name: player.name,
      blook: player.blook,
      score: player.score,
      streak: player.streak,
      correctCount: player.correctCount,
      rank: index + 1,
      isProtected: player.protectedTurns > 0
    }));
}

function broadcastLobby(game) {
  const modeConfig = getModeConfig(game.settings.mode);
  const normalizedQuestionSet = normalizeQuestionSet(game.settings.questionSet);

  io.to(game.code).emit("lobby:update", {
    code: game.code,
    hostName: game.hostName,
    settings: game.settings,
    mode: game.settings.mode,
    modeName: modeConfig.label,
    eventName: modeConfig.eventName,
    feedTitle: modeConfig.feedTitle,
    questionSet: normalizedQuestionSet,
    questionSetLabel: questionSetLabel(normalizedQuestionSet),
    players: sortedPlayers(game)
  });
}

function broadcastHostStatus(game) {
  const totalPlayers = game.players.size;
  const answers = game.submissions.size;
  const correctAnswers = Array.from(game.submissions.values()).filter((entry) => entry.correct).length;

  io.to(game.hostId).emit("host:status", {
    phase: game.phase,
    code: game.code,
    totalPlayers,
    answers,
    correctAnswers,
    currentQuestionIndex: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length
  });
}

function clearTimers(game) {
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  if (game.roundTimer) {
    clearTimeout(game.roundTimer);
    game.roundTimer = null;
  }

  if (game.chestTimer) {
    clearTimeout(game.chestTimer);
    game.chestTimer = null;
  }
}

function destroyGame(code, reason = "Game ended") {
  const game = games.get(code);
  if (!game) {
    return;
  }

  clearTimers(game);
  io.to(game.code).emit("game:ended", { reason });

  for (const player of game.players.values()) {
    socketToGame.delete(player.id);
  }

  socketToGame.delete(game.hostId);
  games.delete(code);
}

function startRoundSummary(game) {
  game.phase = "round_summary";

  io.to(game.code).emit("round:summary", {
    questionIndex: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length,
    leaderboard: sortedPlayers(game)
  });

  broadcastHostStatus(game);

  if (game.currentQuestionIndex >= game.questions.length - 1) {
    game.roundTimer = setTimeout(() => {
      finishGame(game);
    }, 9000);
    return;
  }

  game.roundTimer = setTimeout(() => {
    startQuestion(game);
  }, 7000);
}

function applyPenalty(target, amount) {
  const loss = Math.min(target.score, amount);
  target.score -= loss;
  return loss;
}

function pickMiniGameType(game) {
  const options = MODE_MINI_GAMES[normalizeMode(game.settings.mode)] || [];
  if (options.length === 0) {
    return null;
  }

  const index = game.minigameRotationIndex % options.length;
  game.minigameRotationIndex += 1;
  return options[index];
}

function miniGameMeta(type) {
  return MINI_GAME_LOOKUP.get(type) || MINI_GAME_LOOKUP.get("soccer_shootout");
}

function createMiniGameState(type) {
  if (type === "tap_rush") {
    return { type, taps: 0 };
  }

  if (type === "soccer_shootout") {
    return {
      type,
      goals: 0,
      shotsTaken: 0,
      totalShots: 5,
      goaliePattern: Array.from({ length: 5 }, () => randomInt(0, 2)),
      shots: []
    };
  }

  if (type === "sequence_memory") {
    return {
      type,
      sequence: Array.from({ length: 5 }, () => randomInt(0, 3)),
      progress: 0,
      completedAt: null
    };
  }

  if (type === "precision_stop") {
    return {
      type,
      target: randomInt(15, 85),
      submitted: false,
      value: null
    };
  }

  return { type: "tap_rush", taps: 0 };
}

function miniGamePublicData(state) {
  if (state.type === "tap_rush") {
    return {
      taps: 0
    };
  }

  if (state.type === "soccer_shootout") {
    return {
      goals: state.goals,
      shotsTaken: state.shotsTaken,
      totalShots: state.totalShots,
      shots: state.shots
    };
  }

  if (state.type === "sequence_memory") {
    return {
      sequence: state.sequence,
      total: state.sequence.length
    };
  }

  if (state.type === "precision_stop") {
    return {
      target: state.target
    };
  }

  return {};
}

function isMiniGameStateResolved(state) {
  if (state.type === "tap_rush") {
    return false;
  }

  if (state.type === "soccer_shootout") {
    return state.shotsTaken >= state.totalShots;
  }

  if (state.type === "sequence_memory") {
    return state.completedAt !== null;
  }

  if (state.type === "precision_stop") {
    return state.submitted;
  }

  return false;
}

function allMiniGamesResolved(game) {
  if (game.chestPhase.size === 0) {
    return true;
  }

  for (const state of game.chestPhase.values()) {
    if (!isMiniGameStateResolved(state)) {
      return false;
    }
  }

  return true;
}

function miniGameResult(game, player, state) {
  const modeConfig = getModeConfig(game.settings.mode);
  const unit = modeConfig.unit;

  if (state.type === "tap_rush") {
    const bonus = Math.max(80, Math.min(700, state.taps * 28) + randomInt(30, 120));
    return {
      bonus,
      text: `${player.name} landed ${state.taps} taps for +${bonus} ${unit}.`
    };
  }

  if (state.type === "soccer_shootout") {
    const perfectBonus = state.goals === state.totalShots ? 300 : 0;
    const bonus = 120 + state.goals * 200 + perfectBonus;
    return {
      bonus,
      text: `${player.name} scored ${state.goals}/${state.totalShots} goals for +${bonus} ${unit}.`
    };
  }

  if (state.type === "sequence_memory") {
    if (state.completedAt !== null) {
      const elapsed = clamp(state.completedAt - game.minigameStartedAt, 0, game.minigameDurationMs);
      const speedRatio = clamp(1 - elapsed / game.minigameDurationMs, 0, 1);
      const bonus = 260 + Math.round(speedRatio * 460);
      return {
        bonus,
        text: `${player.name} cleared memory sequence for +${bonus} ${unit}.`
      };
    }

    const bonus = state.progress * 85;
    return {
      bonus,
      text: `${player.name} solved ${state.progress}/5 sequence steps for +${bonus} ${unit}.`
    };
  }

  if (state.type === "precision_stop") {
    if (state.submitted) {
      const diff = Math.abs(state.value - state.target);
      const bonus = Math.max(70, 620 - diff * 10 + (diff <= 5 ? 120 : 0));
      return {
        bonus,
        text: `${player.name} stopped ${diff} away from target for +${bonus} ${unit}.`
      };
    }

    return {
      bonus: 70,
      text: `${player.name} missed stop timing and got +70 ${unit}.`
    };
  }

  return {
    bonus: modeConfig.fallbackGain,
    text: `${player.name} received fallback +${modeConfig.fallbackGain} ${unit}.`
  };
}

function finalizeMiniGamePhase(game) {
  if (game.phase !== "minigame") {
    return;
  }

  if (game.chestTimer) {
    clearTimeout(game.chestTimer);
    game.chestTimer = null;
  }

  for (const [playerId, state] of game.chestPhase.entries()) {
    const player = game.players.get(playerId);
    if (!player) {
      continue;
    }

    const result = miniGameResult(game, player, state);
    player.score += result.bonus;

    const feedEvent = { playerId: player.id, playerName: player.name, text: result.text };
    game.feed.push(feedEvent);

    io.to(playerId).emit("minigame:resolved", {
      text: result.text,
      bonus: result.bonus,
      leaderboard: sortedPlayers(game)
    });
  }

  io.to(game.code).emit("minigame:feed", {
    feed: game.feed.slice(-8),
    leaderboard: sortedPlayers(game)
  });

  game.chestPhase.clear();
  game.minigameType = null;
  game.minigameStartedAt = null;
  game.minigameEndsAt = null;
  startRoundSummary(game);
}

function startMiniGamePhase(game, eligiblePlayerIds) {
  const miniGameType = pickMiniGameType(game);
  const meta = miniGameMeta(miniGameType);

  if (!miniGameType || !meta || !Array.isArray(eligiblePlayerIds) || eligiblePlayerIds.length === 0) {
    startRoundSummary(game);
    return;
  }

  game.phase = "minigame";
  game.feed = [];
  game.chestPhase.clear();
  game.minigameType = miniGameType;
  game.minigameDurationMs = 10000;
  game.minigameStartedAt = Date.now();
  game.minigameEndsAt = game.minigameStartedAt + game.minigameDurationMs;

  for (const playerId of eligiblePlayerIds) {
    const state = createMiniGameState(miniGameType);
    game.chestPhase.set(playerId, state);

    io.to(playerId).emit("minigame:yourData", {
      type: miniGameType,
      endsAt: game.minigameEndsAt,
      eventName: meta.name,
      actionLabel: "Play",
      data: miniGamePublicData(state)
    });
  }

  io.to(game.code).emit("minigame:start", {
    eligiblePlayerIds,
    type: miniGameType,
    endsAt: game.minigameEndsAt,
    eventName: meta.name,
    feedTitle: "Mini-game Feed"
  });

  game.chestTimer = setTimeout(() => {
    finalizeMiniGamePhase(game);
  }, game.minigameDurationMs + 120);

  broadcastHostStatus(game);
}

function handleMiniGameAction(game, socketId, action, value) {
  if (!game || game.phase !== "minigame") {
    return { ok: false, message: "Mini-game is not active." };
  }

  const state = game.chestPhase.get(socketId);
  if (!state) {
    return { ok: false, message: "You are not in this mini-game." };
  }

  if (state.type === "tap_rush") {
    if (action !== "tap") {
      return { ok: false, message: "Invalid action for tap rush." };
    }

    state.taps += 1;
    io.to(socketId).emit("minigame:state", {
      type: state.type,
      taps: state.taps
    });
    return { ok: true };
  }

  if (state.type === "soccer_shootout") {
    if (action !== "shoot") {
      return { ok: false, message: "Invalid action for soccer shootout." };
    }

    if (state.shotsTaken >= state.totalShots) {
      return { ok: true, completed: true };
    }

    const lane = Number(value?.lane);
    const power = clamp(Number(value?.power) || 2, 1, 3);
    if (!Number.isInteger(lane) || lane < 0 || lane > 2) {
      return { ok: false, message: "Invalid shot lane." };
    }

    const goalieLane = state.goaliePattern[state.shotsTaken];
    const roll = Math.random();
    let outcome = "goal";

    if (lane === goalieLane) {
      const saveChance = power === 3 ? 0.42 : power === 2 ? 0.68 : 0.84;
      outcome = roll < saveChance ? "saved" : "goal";
    } else {
      const missChance = power === 3 ? 0.18 : power === 2 ? 0.09 : 0.04;
      outcome = roll < missChance ? "miss" : "goal";
    }

    const goal = outcome === "goal";

    state.shotsTaken += 1;
    if (goal) {
      state.goals += 1;
    }
    state.shots.push({
      lane,
      goalieLane,
      power,
      goal,
      outcome
    });

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      goals: state.goals,
      shotsTaken: state.shotsTaken,
      totalShots: state.totalShots,
      lastShot: state.shots[state.shots.length - 1],
      completed: state.shotsTaken >= state.totalShots
    });

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "sequence_memory") {
    if (action !== "step") {
      return { ok: false, message: "Invalid action for sequence memory." };
    }

    const stepValue = Number(value);
    if (!Number.isInteger(stepValue) || stepValue < 0 || stepValue > 3) {
      return { ok: false, message: "Invalid sequence step." };
    }

    if (state.completedAt !== null) {
      return { ok: true, completed: true };
    }

    const expected = state.sequence[state.progress];
    if (stepValue === expected) {
      state.progress += 1;
      if (state.progress >= state.sequence.length) {
        state.completedAt = Date.now();
      }
    } else {
      state.progress = Math.max(0, state.progress - 1);
    }

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      progress: state.progress,
      total: state.sequence.length,
      completed: state.completedAt !== null
    });

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "precision_stop") {
    if (action !== "stop") {
      return { ok: false, message: "Invalid action for precision stop." };
    }

    if (state.submitted) {
      return { ok: true, submitted: true };
    }

    const safeValue = clamp(Number(value), 0, 100);
    state.submitted = true;
    state.value = Math.round(safeValue);

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      submitted: true,
      value: state.value,
      target: state.target
    });

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  return { ok: false, message: "Unknown mini-game type." };
}

function closeQuestion(game) {
  if (game.phase !== "question") {
    return;
  }

  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  const question = game.questions[game.currentQuestionIndex];
  const submissions = Array.from(game.submissions.values());

  io.to(game.code).emit("question:result", {
    correctAnswer: question.answerIndex,
    explanation: question.explanation,
    submissions: submissions.map((item) => ({
      playerId: item.playerId,
      playerName: item.playerName,
      correct: item.correct,
      delta: item.delta,
      answerIndex: item.answerIndex,
      ms: item.ms
    })),
    leaderboard: sortedPlayers(game)
  });

  if (game.players.size > 0) {
    const eligible = Array.from(game.players.keys());
    startMiniGamePhase(game, eligible);
    return;
  }

  startRoundSummary(game);
}

function finishGame(game) {
  game.phase = "finished";
  clearTimers(game);

  io.to(game.code).emit("game:finished", {
    leaderboard: sortedPlayers(game)
  });

  broadcastHostStatus(game);
}

function startQuestion(game) {
  if (!games.has(game.code) || game.phase === "finished") {
    return;
  }

  clearTimers(game);

  if (game.currentQuestionIndex >= game.questions.length - 1) {
    finishGame(game);
    return;
  }

  game.phase = "question";
  game.currentQuestionIndex += 1;
  game.submissions.clear();
  game.chestPhase.clear();
  game.minigameType = null;
  game.minigameStartedAt = null;
  game.minigameEndsAt = null;

  const question = game.questions[game.currentQuestionIndex];
  const endsAt = Date.now() + game.settings.timerSeconds * 1000;

  game.questionStartedAt = Date.now();
  game.questionEndsAt = endsAt;

  io.to(game.code).emit("question:start", {
    questionIndex: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length,
    endsAt,
    question: {
      prompt: question.prompt,
      options: question.options
    }
  });

  broadcastHostStatus(game);

  game.questionTimer = setTimeout(() => {
    closeQuestion(game);
  }, game.settings.timerSeconds * 1000 + 120);
}

function calculateScore(game, elapsedMs, isCorrect, previousStreak) {
  if (!isCorrect) {
    return { delta: 0, newStreak: 0 };
  }

  const modeConfig = getModeConfig(game.settings.mode);
  const maxWindowMs = game.settings.timerSeconds * 1000;
  const normalized = clamp(1 - elapsedMs / maxWindowMs, 0, 1);
  const base = modeConfig.baseScore;
  const speedBonus = Math.round(normalized * modeConfig.speedBonusCap);
  const nextStreak = previousStreak + 1;
  const streakBonus = Math.min(modeConfig.streakCap, (nextStreak - 1) * modeConfig.streakStep);

  return {
    delta: base + speedBonus + streakBonus,
    newStreak: nextStreak
  };
}

function canHost(socket, game) {
  return game && socket.id === game.hostId;
}

function markSocketGame(socket, code) {
  socketToGame.set(socket.id, code);
}

function removePlayerFromGame(game, socketId) {
  const player = game.players.get(socketId);
  if (!player) {
    return;
  }

  game.players.delete(socketId);
  socketToGame.delete(socketId);
  game.submissions.delete(socketId);
  game.chestPhase.delete(socketId);

  io.to(game.code).emit("player:left", {
    playerId: socketId,
    playerName: player.name
  });

  if (game.phase === "lobby") {
    broadcastLobby(game);
  } else {
    io.to(game.code).emit("players:update", {
      players: sortedPlayers(game)
    });
  }
  broadcastHostStatus(game);

  if (game.phase === "question" && game.players.size > 0 && game.submissions.size >= game.players.size) {
    closeQuestion(game);
  }

  if (game.phase === "minigame") {
    if (game.chestPhase.size === 0 || (game.minigameType !== "tap_rush" && allMiniGamesResolved(game))) {
      finalizeMiniGamePhase(game);
    }
  }
}

io.on("connection", (socket) => {
  socket.on("host:create", (payload, ack) => {
    const hostName = sanitizeName(payload?.hostName || "Teacher");
    const mode = normalizeMode(payload?.mode);
    const questionSet = normalizeQuestionSet(payload?.questionSet);
    const timerSeconds = clamp(Number(payload?.timerSeconds) || 15, 8, 45);
    const questionCount = clamp(Number(payload?.questionCount) || 10, 5, 30);

    const code = createGameCode();
    const game = {
      code,
      hostId: socket.id,
      hostName: hostName || "Teacher",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phase: "lobby",
      settings: {
        mode,
        questionSet,
        timerSeconds,
        questionCount
      },
      players: new Map(),
      questions: pickQuestions(questionCount, questionSet),
      currentQuestionIndex: -1,
      submissions: new Map(),
      chestPhase: new Map(),
      feed: [],
      questionTimer: null,
      roundTimer: null,
      chestTimer: null,
      questionStartedAt: null,
      questionEndsAt: null,
      minigameType: null,
      minigameDurationMs: 0,
      minigameStartedAt: null,
      minigameEndsAt: null,
      minigameRotationIndex: 0
    };

    games.set(code, game);
    socket.join(code);
    markSocketGame(socket, code);

    broadcastLobby(game);
    broadcastHostStatus(game);

    if (typeof ack === "function") {
      ack({
        ok: true,
        code,
        gameMode: mode,
        modeName: getModeConfig(mode).label,
        questionSet,
        questionSetLabel: questionSetLabel(questionSet)
      });
    }
  });

  socket.on("host:updateSettings", ({ code, settings }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game) || game.phase !== "lobby") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Cannot update settings right now." });
      }
      return;
    }

    game.settings.mode = normalizeMode(settings?.mode ?? game.settings.mode);
    game.settings.questionSet = normalizeQuestionSet(settings?.questionSet ?? game.settings.questionSet);
    game.settings.timerSeconds = clamp(Number(settings?.timerSeconds) || game.settings.timerSeconds, 8, 45);
    game.settings.questionCount = clamp(Number(settings?.questionCount) || game.settings.questionCount, 5, 30);
    game.questions = pickQuestions(game.settings.questionCount, game.settings.questionSet);
    game.minigameRotationIndex = 0;
    game.updatedAt = Date.now();

    broadcastLobby(game);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("player:join", (payload, ack) => {
    const code = String(payload?.code || "").toUpperCase().trim();
    const playerName = sanitizeName(payload?.name || "");
    const selectedBlook = { ...resolveBlookById(payload?.blookId) };
    const game = games.get(code);

    if (!game) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game code not found." });
      }
      return;
    }

    if (game.phase !== "lobby") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game already started." });
      }
      return;
    }

    if (game.players.size >= 60) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Lobby is full." });
      }
      return;
    }

    if (!playerName) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Name is required." });
      }
      return;
    }

    const duplicate = Array.from(game.players.values()).some((player) => player.name.toLowerCase() === playerName.toLowerCase());
    if (duplicate) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Name already taken in this room." });
      }
      return;
    }

    socket.join(game.code);
    markSocketGame(socket, game.code);

    game.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      blook: selectedBlook,
      score: 0,
      streak: 0,
      correctCount: 0,
      protectedTurns: 0,
      joinedAt: Date.now()
    });

    game.updatedAt = Date.now();

    broadcastLobby(game);
    broadcastHostStatus(game);

    io.to(game.hostId).emit("host:playerJoined", {
      id: socket.id,
      name: playerName,
      blook: selectedBlook
    });

    if (typeof ack === "function") {
      ack({
        ok: true,
        code: game.code,
        mode: game.settings.mode,
        hostName: game.hostName,
        blook: selectedBlook
      });
    }
  });

  socket.on("host:kick", ({ code, playerId }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    if (!game.players.has(playerId)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Player not found." });
      }
      return;
    }

    io.to(playerId).emit("kicked", { reason: "Removed by host." });

    const targetSocket = io.sockets.sockets.get(playerId);
    if (targetSocket) {
      targetSocket.leave(game.code);
    }

    removePlayerFromGame(game, playerId);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:start", ({ code }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    if (game.phase !== "lobby") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game already running." });
      }
      return;
    }

    if (game.players.size === 0) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "At least one student is required." });
      }
      return;
    }

    startQuestion(game);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:next", ({ code }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game) || game.phase !== "round_summary") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Next round unavailable." });
      }
      return;
    }

    if (game.roundTimer) {
      clearTimeout(game.roundTimer);
      game.roundTimer = null;
    }

    startQuestion(game);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("host:end", ({ code }, ack) => {
    const roomCode = (code || "").toUpperCase();
    const game = games.get(roomCode);

    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    destroyGame(roomCode, "Host ended the game.");

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("player:answer", ({ code, answerIndex }, ack) => {
    const game = games.get((code || "").toUpperCase());
    const player = game?.players.get(socket.id);

    if (!game || !player || game.phase !== "question") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Question not active." });
      }
      return;
    }

    if (game.submissions.has(socket.id)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Answer already submitted." });
      }
      return;
    }

    const question = game.questions[game.currentQuestionIndex];
    const safeAnswerIndex = Number(answerIndex);

    if (!Number.isInteger(safeAnswerIndex) || safeAnswerIndex < 0 || safeAnswerIndex >= question.options.length) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Invalid answer." });
      }
      return;
    }

    const elapsed = clamp(Date.now() - game.questionStartedAt, 0, game.settings.timerSeconds * 1000);
    const correct = safeAnswerIndex === question.answerIndex;
    const score = calculateScore(game, elapsed, correct, player.streak);

    player.streak = score.newStreak;
    player.score += score.delta;
    if (correct) {
      player.correctCount += 1;
    }

    game.submissions.set(socket.id, {
      playerId: player.id,
      playerName: player.name,
      answerIndex: safeAnswerIndex,
      correct,
      delta: score.delta,
      ms: elapsed
    });

    game.updatedAt = Date.now();

    broadcastHostStatus(game);

    if (typeof ack === "function") {
      ack({
        ok: true,
        correct,
        delta: score.delta,
        streak: player.streak
      });
    }

    io.to(socket.id).emit("player:locked", {
      leaderboard: sortedPlayers(game)
    });

    if (game.submissions.size >= game.players.size) {
      closeQuestion(game);
    }
  });

  socket.on("player:minigameAction", ({ code, action, value }, ack) => {
    const game = games.get((code || "").toUpperCase());
    const result = handleMiniGameAction(game, socket.id, action, value);
    if (typeof ack === "function") {
      ack(result);
    }
  });

  socket.on("disconnect", () => {
    const code = socketToGame.get(socket.id);
    if (!code) {
      return;
    }

    const game = games.get(code);
    socketToGame.delete(socket.id);

    if (!game) {
      return;
    }

    if (socket.id === game.hostId) {
      destroyGame(code, "Host disconnected.");
      return;
    }

    removePlayerFromGame(game, socket.id);
  });
});

setInterval(() => {
  const now = Date.now();

  for (const [code, game] of games.entries()) {
    if (now - game.updatedAt > GAME_IDLE_TTL_MS) {
      destroyGame(code, "Game expired due to inactivity.");
    }
  }
}, 15 * 60 * 1000);

server.listen(PORT, () => {
  const port = Number(PORT);
  const lanUrls = getLanIpv4Addresses().map((ip) => `http://${ip}:${port}`);

  console.log(`Blooket-style game server listening on http://localhost:${port}`);
  if (lanUrls.length > 0) {
    console.log("Chromebook/LAN join URLs:");
    for (const url of lanUrls) {
      console.log(`  ${url}`);
    }
  } else {
    console.log("No private LAN IPv4 address detected. Students can still use localhost on this machine.");
  }
});
