const path = require("path");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const XLSX = require("xlsx");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const PORT = process.env.PORT || 3000;
const GAME_CODE_LENGTH = 6;
const GAME_IDLE_TTL_MS = 3 * 60 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-local-session-secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_AUTH_ENABLED = GOOGLE_CLIENT_ID.length > 0 && GOOGLE_CLIENT_SECRET.length > 0;

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
    label: "Multiplication 1-Digit",
    source: "built_in"
  },
  general_knowledge: {
    id: "general_knowledge",
    label: "General Knowledge",
    source: "built_in"
  }
};
const CUSTOM_QUIZZES_DATA_FILE = path.join(__dirname, "data", "custom-quizzes.json");
const customQuestionSets = new Map();
const MINIGAME_STATS_FILE = path.join(__dirname, "data", "minigame-stats.json");

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
const STARTER_COMMON_BLOOK_COUNT = 10;
const STARTER_COMMON_BLOOK_IDS = BLOOK_PACKS.flatMap((pack) =>
  pack.blooks
    .filter((blook) => String(blook?.rarity || "").toLowerCase() === "common")
    .map((blook) => blook.id)
).slice(0, STARTER_COMMON_BLOOK_COUNT);
const PACK_OPEN_COST = 20;
const DUPLICATE_SELL_RATE = 0.3;
const STARTER_FREE_PACK_OPENS = 1;
const BLOOK_RARITY_WEIGHT = {
  Common: 60,
  Rare: 26,
  Epic: 11,
  Legendary: 3
};
const ACCOUNT_DATA_DIR = path.join(__dirname, "data");
const ACCOUNT_DATA_FILE = path.join(ACCOUNT_DATA_DIR, "accounts.json");
const accounts = new Map();

function nowIso() {
  return new Date().toISOString();
}

function normalizeAccountKey(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (!/^[a-zA-Z0-9:_-]{8,120}$/.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function generateGuestAccountKey() {
  if (typeof crypto.randomUUID === "function") {
    return `guest:${crypto.randomUUID()}`;
  }
  return `guest:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function parseStoredNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return number;
}

function rarityWeightForBlook(blook) {
  const rarity = String(blook?.rarity || "Common");
  return BLOOK_RARITY_WEIGHT[rarity] || 1;
}

function packOpenCost(packId) {
  const pack = BLOOK_PACKS.find((entry) => entry.id === packId);
  if (!pack) {
    return PACK_OPEN_COST;
  }
  return clamp(Number(pack.price) || PACK_OPEN_COST, 1, 2000);
}

function duplicateSellValueForPack(packId) {
  return Math.max(1, Math.floor(packOpenCost(packId) * DUPLICATE_SELL_RATE));
}

function ensureStarterCommonBlooks(account) {
  if (!account) {
    return false;
  }

  if (!account.inventory || typeof account.inventory !== "object") {
    account.inventory = {};
  }

  let changed = false;
  for (const blookId of STARTER_COMMON_BLOOK_IDS) {
    const ownedCount = Math.max(0, Math.floor(parseStoredNumber(account.inventory[blookId], 0)));
    if (ownedCount <= 0) {
      account.inventory[blookId] = 1;
      changed = true;
    }
  }

  if (!accountOwnsBlook(account, account.selectedBlookId)) {
    const fallback = STARTER_COMMON_BLOOK_IDS.find((blookId) => accountOwnsBlook(account, blookId)) || DEFAULT_BLOOK?.id || "";
    if (fallback && account.selectedBlookId !== fallback) {
      account.selectedBlookId = fallback;
      changed = true;
    }
  }

  if (changed) {
    account.updatedAt = nowIso();
  }
  return changed;
}

function loadAccountsFromDisk() {
  try {
    if (!fs.existsSync(ACCOUNT_DATA_FILE)) {
      return;
    }

    const raw = fs.readFileSync(ACCOUNT_DATA_FILE, "utf8");
    if (!raw.trim()) {
      return;
    }

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed?.accounts) ? parsed.accounts : [];
    let touched = false;
    for (const record of records) {
      const key = normalizeAccountKey(record?.id);
      if (!key) {
        continue;
      }

      const inventorySource = record?.inventory && typeof record.inventory === "object" ? record.inventory : {};
      const inventory = {};
      for (const [blookId, countValue] of Object.entries(inventorySource)) {
        if (!BLOOK_LOOKUP.has(blookId)) {
          continue;
        }
        const count = Math.max(0, Math.floor(parseStoredNumber(countValue, 0)));
        if (count > 0) {
          inventory[blookId] = count;
        }
      }

      const selectedCandidate = typeof record.selectedBlookId === "string" ? record.selectedBlookId : "";
      const selectedBlookId = inventory[selectedCandidate] > 0 ? selectedCandidate : "";
      const miniGameStatsSource = record?.miniGameStats && typeof record.miniGameStats === "object" ? record.miniGameStats : {};
      const miniGameStats = {};
      for (const game of MINI_GAME_CATALOG) {
        const source = miniGameStatsSource[game.id] || {};
        miniGameStats[game.id] = {
          plays: Math.max(0, Math.floor(parseStoredNumber(source?.plays, 0))),
          wins: Math.max(0, Math.floor(parseStoredNumber(source?.wins, 0))),
          bestBonus: Math.max(0, Math.floor(parseStoredNumber(source?.bestBonus, 0))),
          totalBonus: Math.max(0, Math.floor(parseStoredNumber(source?.totalBonus, 0)))
        };
      }

      const account = {
        id: key,
        coins: Math.max(0, Math.floor(parseStoredNumber(record.coins, 0))),
        freePackOpensRemaining: Math.max(0, Math.floor(parseStoredNumber(record.freePackOpensRemaining, STARTER_FREE_PACK_OPENS))),
        selectedBlookId,
        inventory,
        miniGameStats,
        gamesPlayed: Math.max(0, Math.floor(parseStoredNumber(record.gamesPlayed, 0))),
        totalCorrect: Math.max(0, Math.floor(parseStoredNumber(record.totalCorrect, 0))),
        totalScore: Math.max(0, Math.floor(parseStoredNumber(record.totalScore, 0))),
        bestRank: Math.max(0, Math.floor(parseStoredNumber(record.bestRank, 0))),
        createdAt: typeof record.createdAt === "string" ? record.createdAt : nowIso(),
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : nowIso()
      };
      if (ensureStarterCommonBlooks(account)) {
        touched = true;
      }
      accounts.set(key, account);
    }

    if (touched) {
      saveAccountsToDisk();
    }
  } catch (error) {
    console.warn("Failed to load accounts data:", error?.message || error);
  }
}

function saveAccountsToDisk() {
  try {
    fs.mkdirSync(ACCOUNT_DATA_DIR, { recursive: true });
    const payload = {
      savedAt: nowIso(),
      accounts: Array.from(accounts.values()).map((account) => ({
        id: account.id,
        coins: account.coins,
        freePackOpensRemaining: account.freePackOpensRemaining,
        selectedBlookId: account.selectedBlookId || "",
        inventory: account.inventory,
        miniGameStats: account.miniGameStats || {},
        gamesPlayed: account.gamesPlayed || 0,
        totalCorrect: account.totalCorrect || 0,
        totalScore: account.totalScore || 0,
        bestRank: account.bestRank || 0,
        createdAt: account.createdAt || nowIso(),
        updatedAt: account.updatedAt || nowIso()
      }))
    };
    fs.writeFileSync(ACCOUNT_DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to save accounts data:", error?.message || error);
  }
}

function ensureAccount(accountKey) {
  const safeKey = normalizeAccountKey(accountKey);
  if (!safeKey) {
    return null;
  }

  let changed = false;
  if (!accounts.has(safeKey)) {
    const createdAt = nowIso();
    const created = {
      id: safeKey,
      coins: 0,
      freePackOpensRemaining: STARTER_FREE_PACK_OPENS,
      selectedBlookId: "",
      inventory: {},
      miniGameStats: {},
      gamesPlayed: 0,
      totalCorrect: 0,
      totalScore: 0,
      bestRank: 0,
      createdAt,
      updatedAt: createdAt
    };
    accounts.set(safeKey, created);
    changed = true;
  }

  const account = accounts.get(safeKey);
  if (ensureStarterCommonBlooks(account)) {
    changed = true;
  }
  if (changed) {
    saveAccountsToDisk();
  }

  return account;
}

function accountOwnedCount(account, blookId) {
  if (!account || !account.inventory) {
    return 0;
  }
  return Math.max(0, Math.floor(parseStoredNumber(account.inventory[blookId], 0)));
}

function accountOwnsBlook(account, blookId) {
  return accountOwnedCount(account, blookId) > 0;
}

function accountMiniGameBucket(account, miniGameType) {
  if (!account) {
    return null;
  }
  if (!account.miniGameStats || typeof account.miniGameStats !== "object") {
    account.miniGameStats = {};
  }
  const key = String(miniGameType || "");
  if (!key) {
    return null;
  }
  if (!account.miniGameStats[key]) {
    account.miniGameStats[key] = {
      plays: 0,
      wins: 0,
      bestBonus: 0,
      totalBonus: 0
    };
  }
  return account.miniGameStats[key];
}

function accountUnlockedBlooks(account) {
  if (!account || typeof account.inventory !== "object") {
    return [];
  }

  const rows = [];
  for (const [blookId, countValue] of Object.entries(account.inventory)) {
    const blook = BLOOK_LOOKUP.get(blookId);
    if (!blook) {
      continue;
    }

    const count = Math.max(0, Math.floor(parseStoredNumber(countValue, 0)));
    if (count <= 0) {
      continue;
    }

    const duplicates = Math.max(0, count - 1);
    rows.push({
      ...blook,
      count,
      duplicates,
      sellValueEach: duplicateSellValueForPack(blook.packId)
    });
  }

  rows.sort((left, right) => {
    if (left.packName !== right.packName) {
      return left.packName.localeCompare(right.packName);
    }
    if (left.rarity !== right.rarity) {
      return left.rarity.localeCompare(right.rarity);
    }
    return left.name.localeCompare(right.name);
  });
  return rows;
}

function rarityOddsForPack(pack) {
  const buckets = new Map();
  let totalWeight = 0;
  for (const blook of pack.blooks) {
    const rarity = String(blook.rarity || "Common");
    const weight = rarityWeightForBlook(blook);
    buckets.set(rarity, (buckets.get(rarity) || 0) + weight);
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    return [];
  }

  return Array.from(buckets.entries())
    .map(([rarity, weight]) => ({
      rarity,
      chance: Math.round((weight / totalWeight) * 1000) / 10
    }))
    .sort((left, right) => right.chance - left.chance);
}

function publicAccountSummary(account) {
  if (!account) {
    return null;
  }

  const inventory = accountUnlockedBlooks(account);
  const packRows = BLOOK_PACKS.map((pack) => {
    const totalCount = pack.blooks.length;
    let ownedCount = 0;
    let duplicateCount = 0;
    for (const blook of pack.blooks) {
      const count = accountOwnedCount(account, blook.id);
      if (count > 0) {
        ownedCount += 1;
      }
      if (count > 1) {
        duplicateCount += count - 1;
      }
    }

    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      openCost: packOpenCost(pack.id),
      sellValueEach: duplicateSellValueForPack(pack.id),
      totalCount,
      ownedCount,
      duplicateCount,
      rarityOdds: rarityOddsForPack(pack)
    };
  });

  const selectedBlookId = accountOwnsBlook(account, account.selectedBlookId) ? account.selectedBlookId : "";
  const miniGames = MINI_GAME_CATALOG.map((game) => {
    const bucket = accountMiniGameBucket(account, game.id);
    const plays = Number(bucket?.plays || 0);
    const wins = Number(bucket?.wins || 0);
    const totalBonus = Number(bucket?.totalBonus || 0);
    return {
      id: game.id,
      name: game.name,
      plays,
      wins,
      bestBonus: Number(bucket?.bestBonus || 0),
      avgBonus: plays > 0 ? Math.round(totalBonus / plays) : 0
    };
  }).sort((left, right) => right.plays - left.plays || right.wins - left.wins || left.name.localeCompare(right.name));

  return {
    id: account.id,
    coins: account.coins,
    freePackOpensRemaining: account.freePackOpensRemaining,
    selectedBlookId,
    packs: packRows,
    inventory,
    stats: {
      gamesPlayed: account.gamesPlayed || 0,
      totalCorrect: account.totalCorrect || 0,
      totalScore: account.totalScore || 0,
      bestRank: account.bestRank || 0
    },
    miniGames
  };
}

function pickRandomBlookFromPack(pack) {
  if (!pack || !Array.isArray(pack.blooks) || pack.blooks.length === 0) {
    return DEFAULT_BLOOK;
  }

  const weighted = pack.blooks.map((blook) => ({
    blook,
    weight: Math.max(1, rarityWeightForBlook(blook))
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return BLOOK_LOOKUP.get(entry.blook.id) || DEFAULT_BLOOK;
    }
  }

  const fallback = weighted[weighted.length - 1]?.blook?.id;
  return BLOOK_LOOKUP.get(fallback) || DEFAULT_BLOOK;
}

function openPackForAccount(account, packId) {
  const pack = BLOOK_PACKS.find((entry) => entry.id === packId);
  if (!pack) {
    return { ok: false, message: "Pack not found." };
  }

  const cost = packOpenCost(pack.id);
  const isFree = account.freePackOpensRemaining > 0;

  if (!isFree && account.coins < cost) {
    return { ok: false, message: `Not enough coins. ${pack.name} costs ${cost}.` };
  }

  if (isFree) {
    account.freePackOpensRemaining -= 1;
  } else {
    account.coins -= cost;
  }

  const reward = pickRandomBlookFromPack(pack);
  const previousCount = accountOwnedCount(account, reward.id);
  const nextCount = previousCount + 1;
  account.inventory[reward.id] = nextCount;
  if (!account.selectedBlookId || !accountOwnsBlook(account, account.selectedBlookId)) {
    account.selectedBlookId = reward.id;
  }
  account.updatedAt = nowIso();
  saveAccountsToDisk();

  return {
    ok: true,
    reward: {
      id: reward.id,
      name: reward.name,
      icon: reward.icon,
      rarity: reward.rarity,
      packId: reward.packId,
      packName: reward.packName,
      duplicate: previousCount >= 1,
      count: nextCount,
      sellValueEach: duplicateSellValueForPack(reward.packId),
      openCost: cost,
      freeOpen: isFree
    }
  };
}

function sellDuplicateForAccount(account, blookId, quantity) {
  const blook = BLOOK_LOOKUP.get(String(blookId || ""));
  if (!blook) {
    return { ok: false, message: "Blook not found." };
  }

  const owned = accountOwnedCount(account, blook.id);
  const duplicates = Math.max(0, owned - 1);
  if (duplicates <= 0) {
    return { ok: false, message: "No duplicates available to sell." };
  }

  const requested = Math.max(1, Math.floor(Number(quantity) || 1));
  const sellCount = Math.min(duplicates, requested);
  const sellValueEach = duplicateSellValueForPack(blook.packId);
  const earned = sellCount * sellValueEach;

  account.inventory[blook.id] = owned - sellCount;
  account.coins += earned;
  account.updatedAt = nowIso();
  saveAccountsToDisk();

  return {
    ok: true,
    sold: {
      blookId: blook.id,
      name: blook.name,
      icon: blook.icon,
      quantity: sellCount,
      valueEach: sellValueEach,
      earned
    }
  };
}

function resolveRequestAccountKey(req, payloadAccountKey = "") {
  if (GOOGLE_AUTH_ENABLED && req?.user?.id) {
    return `google:${req.user.id}`;
  }

  const payloadKey = normalizeAccountKey(payloadAccountKey);
  if (payloadKey) {
    return payloadKey;
  }

  const queryKey = normalizeAccountKey(req?.query?.accountKey || "");
  if (queryKey) {
    return queryKey;
  }

  const headerKey = normalizeAccountKey(req?.get?.("x-account-key") || "");
  if (headerKey) {
    return headerKey;
  }

  const sessionKey = normalizeAccountKey(req?.session?.accountKey || "");
  if (sessionKey) {
    return sessionKey;
  }

  return "";
}

function rankBonusByPlace(rank, totalPlayers) {
  if (rank <= 1) return Math.max(18, 28 + Math.min(12, totalPlayers));
  if (rank === 2) return Math.max(14, 20 + Math.min(8, totalPlayers));
  if (rank === 3) return Math.max(10, 14 + Math.min(6, totalPlayers));
  if (rank <= 5) return 10;
  if (rank <= 10) return 6;
  return 3;
}

function calculateCoinReward(player, rank, totalPlayers) {
  const correctCoins = Math.max(0, Number(player?.correctCount || 0)) * 5;
  const scoreCoins = Math.max(0, Math.floor(Number(player?.score || 0) / 350));
  const participationCoins = 8;
  const rankCoins = rankBonusByPlace(rank, totalPlayers);
  const total = Math.max(10, participationCoins + correctCoins + scoreCoins + rankCoins);
  return {
    total,
    breakdown: {
      participation: participationCoins,
      correct: correctCoins,
      score: scoreCoins,
      rank: rankCoins
    }
  };
}

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
  classic: ["soccer_shootout", "tap_rush", "reaction_duel", "sequence_memory", "obstacle_dodge", "precision_stop", "word_scramble"],
  gold: ["soccer_shootout", "tap_rush", "reaction_duel", "sequence_memory", "obstacle_dodge", "precision_stop", "word_scramble"],
  crypto: ["soccer_shootout", "tap_rush", "reaction_duel", "sequence_memory", "obstacle_dodge", "precision_stop", "word_scramble"],
  fishing: ["soccer_shootout", "tap_rush", "reaction_duel", "sequence_memory", "obstacle_dodge", "precision_stop", "word_scramble"],
  brawl: ["soccer_shootout", "tap_rush", "reaction_duel", "sequence_memory", "obstacle_dodge", "precision_stop", "word_scramble"]
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
    id: "reaction_duel",
    name: "Reaction Duel",
    description: "Wait for GO, then react as fast as possible."
  },
  {
    id: "sequence_memory",
    name: "Sequence Memory",
    description: "Repeat the color order as fast as possible."
  },
  {
    id: "obstacle_dodge",
    name: "Obstacle Dodge",
    description: "Dodge incoming lane blockers for 8 turns."
  },
  {
    id: "precision_stop",
    name: "Precision Stop",
    description: "Stop the moving marker near the target zone."
  },
  {
    id: "word_scramble",
    name: "Word Scramble",
    description: "Unscramble the word before attempts run out."
  }
];

const MINI_GAME_LOOKUP = new Map(MINI_GAME_CATALOG.map((game) => [game.id, game]));
const MINI_GAME_ROTATION_MODES = new Set(["fixed", "random", "popular", "soccer_only", "off"]);
const globalMiniGameStats = {};
for (const game of MINI_GAME_CATALOG) {
  globalMiniGameStats[game.id] = {
    sessions: 0,
    playerEntries: 0,
    completions: 0,
    totalBonus: 0
  };
}
loadAccountsFromDisk();
loadCustomQuestionSetsFromDisk();
loadMiniGameStatsFromDisk();

const WORD_SCRAMBLE_WORDS = [
  "MULTIPLY",
  "FRACTION",
  "INTEGER",
  "DECIMAL",
  "ALGEBRA",
  "SCIENCE",
  "HISTORY",
  "CHROMEBOOK",
  "SOCCER",
  "ANIME"
];
const SOCCER_FIELD_PLAYERS = [
  { id: "messi_left", starId: "messi", lane: 0, row: 2 },
  { id: "ronaldo_mid", starId: "ronaldo", lane: 1, row: 2 },
  { id: "kylian_right", starId: "kylian", lane: 2, row: 2 },
  { id: "messi_support", starId: "messi", lane: 0, row: 1 },
  { id: "ronaldo_support", starId: "ronaldo", lane: 1, row: 1 },
  { id: "kylian_support", starId: "kylian", lane: 2, row: 1 }
];
const SOCCER_TEAMS = {
  red: {
    id: "red",
    name: "Red Rockets"
  },
  blue: {
    id: "blue",
    name: "Blue Blazers"
  }
};

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

function normalizeMiniGameRotationMode(mode) {
  if (typeof mode !== "string") {
    return "fixed";
  }

  const normalized = mode.trim().toLowerCase();
  return MINI_GAME_ROTATION_MODES.has(normalized) ? normalized : "fixed";
}

function getModeConfig(mode) {
  return MODE_CONFIG[normalizeMode(mode)];
}

function authStatusForRequest(req) {
  const authenticated = typeof req?.isAuthenticated === "function" ? req.isAuthenticated() : false;
  const user = authenticated ? req.user || null : null;
  return {
    authEnabled: GOOGLE_AUTH_ENABLED,
    authenticated,
    user: user
      ? {
          id: user.id || "",
          name: user.name || "",
          email: user.email || "",
          picture: user.picture || ""
        }
      : null
  };
}

function resolveGoogleCallbackUrl(req) {
  if (typeof process.env.GOOGLE_CALLBACK_URL === "string" && process.env.GOOGLE_CALLBACK_URL.length > 0) {
    return process.env.GOOGLE_CALLBACK_URL;
  }

  const forwardedProto = typeof req?.get === "function" ? req.get("x-forwarded-proto") : "";
  const forwardedHost = typeof req?.get === "function" ? req.get("x-forwarded-host") : "";
  const protocolSource = (forwardedProto || req?.protocol || "http").split(",")[0].trim();
  const hostSource =
    (forwardedHost || (typeof req?.get === "function" ? req.get("host") : "") || `localhost:${PORT}`)
      .split(",")[0]
      .trim();
  const protocol = protocolSource || "http";
  const host = hostSource || `localhost:${PORT}`;
  return `${protocol}://${host}/auth/google/callback`;
}

function pathRequiresLogin(pathname) {
  if (!GOOGLE_AUTH_ENABLED) {
    return false;
  }

  return pathname === "/host.html" || pathname === "/play.html";
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set("trust proxy", true);
app.use(express.json());
const quizUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }
});

const games = new Map();
const socketToGame = new Map();

io.engine.use(sessionMiddleware);

function activeRoomSummary() {
  if (games.size === 0) {
    return null;
  }

  const entries = Array.from(games.values());
  entries.sort((left, right) => {
    const leftLobby = left.phase === "lobby" ? 1 : 0;
    const rightLobby = right.phase === "lobby" ? 1 : 0;
    if (leftLobby !== rightLobby) {
      return rightLobby - leftLobby;
    }
    return Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
  });

  const game = entries[0];
  if (!game) {
    return null;
  }

  return {
    code: game.code,
    hostName: game.hostName,
    phase: game.phase,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
  };
}

function broadcastActiveRoom() {
  io.emit("room:activeCode", activeRoomSummary());
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user || null);
});

if (GOOGLE_AUTH_ENABLED) {
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback";
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : "";
        const picture = Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : "";
        done(null, {
          id: profile.id,
          name: profile.displayName || email || "Google User",
          email,
          picture
        });
      }
    )
  );
}

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/auth/status", (req, res) => {
  res.json(authStatusForRequest(req));
});

app.get("/auth/google", (req, res, next) => {
  if (!GOOGLE_AUTH_ENABLED) {
    res.status(503).json({ ok: false, message: "Google auth is not configured on this server." });
    return;
  }

  if (req.query?.next && typeof req.query.next === "string") {
    req.session.authReturnTo = req.query.next;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    callbackURL: resolveGoogleCallbackUrl(req)
  })(req, res, next);
});

app.get("/auth/google/callback", (req, res, next) => {
  if (!GOOGLE_AUTH_ENABLED) {
    res.redirect("/?error=auth_not_configured");
    return;
  }

  passport.authenticate("google", {
    failureRedirect: "/?error=google_auth_failed",
    callbackURL: resolveGoogleCallbackUrl(req)
  })(req, res, () => {
    const redirectTo = req.session?.authReturnTo || "/";
    delete req.session.authReturnTo;
    res.redirect(redirectTo);
  });
});

app.get("/auth/logout", (req, res) => {
  const done = () => {
    req.session?.destroy(() => {
      res.redirect("/");
    });
  };
  req.logout(done);
});

app.use((req, res, next) => {
  if (!pathRequiresLogin(req.path)) {
    next();
    return;
  }

  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    next();
    return;
  }

  req.session.authReturnTo = req.originalUrl || req.path;
  res.redirect("/?login=required");
});

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
  res.json({ ok: true, games: games.size, googleAuthEnabled: GOOGLE_AUTH_ENABLED });
});

app.get("/api/blooks", (_req, res) => {
  res.json({
    packs: publicBlookPacks()
  });
});

app.get("/api/quizzes", (_req, res) => {
  res.json({
    ok: true,
    sets: publicQuestionSets()
  });
});

app.post("/api/quizzes/upload", quizUpload.single("file"), (req, res) => {
  const titleRaw = String(req.body?.title || "").trim();
  const uploadedBy = sanitizeName(req.body?.uploadedBy || req.user?.name || "User");
  const file = req.file;

  if (!file || !file.buffer || file.buffer.length === 0) {
    res.status(400).json({ ok: false, message: "Upload a CSV or Excel file." });
    return;
  }

  const fileName = String(file.originalname || "quiz_upload");
  const ext = path.extname(fileName).toLowerCase();
  const allowed = new Set([".csv", ".xlsx", ".xls"]);
  if (!allowed.has(ext)) {
    res.status(400).json({ ok: false, message: "Only CSV, XLSX, and XLS files are supported." });
    return;
  }

  let rows = [];
  try {
    const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: false });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      res.status(400).json({ ok: false, message: "File has no worksheet." });
      return;
    }

    rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
      raw: false,
      defval: "",
      blankrows: false
    });
  } catch (error) {
    res.status(400).json({ ok: false, message: "Could not parse file. Check CSV/Excel format." });
    return;
  }

  const parsedQuestions = parseQuizRows(rows);
  if (parsedQuestions.length < 5) {
    res.status(400).json({
      ok: false,
      message: "Need at least 5 valid questions. Required columns: question/prompt, options, and answer."
    });
    return;
  }

  const label = sanitizeQuestionPrompt(titleRaw || path.basename(fileName, ext) || "Uploaded Quiz").slice(0, 64);
  const id = normalizeQuizSetId(label, "uploaded_quiz");
  const now = nowIso();
  customQuestionSets.set(id, {
    id,
    label,
    source: "uploaded",
    questions: parsedQuestions,
    questionCount: parsedQuestions.length,
    uploadedBy,
    uploadedAt: now
  });
  saveCustomQuestionSetsToDisk();

  res.json({
    ok: true,
    set: {
      id,
      label,
      questionCount: parsedQuestions.length,
      uploadedBy,
      uploadedAt: now
    },
    sets: publicQuestionSets()
  });
});

app.get("/api/account", (req, res) => {
  let accountKey = resolveRequestAccountKey(req);
  if (!accountKey && !GOOGLE_AUTH_ENABLED) {
    accountKey = generateGuestAccountKey();
  }

  const account = ensureAccount(accountKey);
  if (!account) {
    res.status(400).json({ ok: false, message: "Invalid account key." });
    return;
  }

  if (req.session) {
    req.session.accountKey = account.id;
  }

  res.json({
    ok: true,
    accountKey: account.id,
    account: publicAccountSummary(account)
  });
});

app.post("/api/account/open-pack", (req, res) => {
  let accountKey = resolveRequestAccountKey(req, req.body?.accountKey || "");
  if (!accountKey && !GOOGLE_AUTH_ENABLED) {
    accountKey = generateGuestAccountKey();
  }

  const account = ensureAccount(accountKey);
  if (!account) {
    res.status(400).json({ ok: false, message: "Invalid account key." });
    return;
  }

  if (req.session) {
    req.session.accountKey = account.id;
  }

  const packId = String(req.body?.packId || "").trim();
  const result = openPackForAccount(account, packId);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({
    ok: true,
    reward: result.reward,
    accountKey: account.id,
    account: publicAccountSummary(account)
  });
});

app.post("/api/account/sell-duplicate", (req, res) => {
  const accountKey = resolveRequestAccountKey(req, req.body?.accountKey || "");
  const account = ensureAccount(accountKey);
  if (!account) {
    res.status(400).json({ ok: false, message: "Invalid account key." });
    return;
  }

  const blookId = String(req.body?.blookId || "").trim();
  const quantity = Number(req.body?.quantity || 1);
  const result = sellDuplicateForAccount(account, blookId, quantity);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({
    ok: true,
    sold: result.sold,
    accountKey: account.id,
    account: publicAccountSummary(account)
  });
});

app.get("/api/minigames", (_req, res) => {
  const stats = publicMiniGameStats();
  const mostMatched = mostMatchedMiniGame(stats);
  res.json({
    games: publicMiniGameCatalog(),
    stats,
    mostPlayed: stats[0] || null,
    mostMatched
  });
});

app.get("/api/minigames/stats", (_req, res) => {
  const stats = publicMiniGameStats();
  const mostMatched = mostMatchedMiniGame(stats);
  res.json({
    ok: true,
    stats,
    mostPlayed: stats[0] || null,
    mostMatched
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
  const activeRoom = activeRoomSummary();

  res.json({
    port,
    localhost: `http://localhost:${port}`,
    lanIps,
    lanUrls: lanIps.map((ip) => `http://${ip}:${port}`),
    activeRoom
  });
});

app.get("/api/active-room", (_req, res) => {
  res.json({
    ok: true,
    activeRoom: activeRoomSummary()
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

function scrambleWord(word) {
  const source = String(word || "").toUpperCase();
  if (source.length <= 1) {
    return source;
  }

  let scrambled = source;
  for (let tries = 0; tries < 10 && scrambled === source; tries += 1) {
    scrambled = shuffle(source.split("")).join("");
  }

  return scrambled;
}

function soccerFieldPlayersSnapshot() {
  return SOCCER_FIELD_PLAYERS.map((player) => ({
    id: String(player.id || ""),
    starId: String(player.starId || ""),
    lane: clamp(Number(player.lane) || 0, 0, 2),
    row: clamp(Number(player.row) || 0, 0, 3)
  }));
}

function randomSoccerTeamAssignments(playerIds) {
  const ids = shuffle(Array.isArray(playerIds) ? playerIds : []);
  const assignments = {};
  for (let index = 0; index < ids.length; index += 1) {
    assignments[ids[index]] = index % 2 === 0 ? "red" : "blue";
  }
  return assignments;
}

function ensureSoccerMatchState(game) {
  if (!game || !game.soccerMatch || typeof game.soccerMatch !== "object") {
    return null;
  }
  return game.soccerMatch;
}

function randomFloat(min, max) {
  const low = Math.min(Number(min) || 0, Number(max) || 0);
  const high = Math.max(Number(min) || 0, Number(max) || 0);
  return Math.random() * (high - low) + low;
}

function createSoccerMatchForPlayers(game, eligiblePlayerIds) {
  const ids = Array.isArray(eligiblePlayerIds) ? eligiblePlayerIds : [];
  const assignments = randomSoccerTeamAssignments(ids);
  const players = {};
  const grouped = { red: [], blue: [] };
  for (const id of ids) {
    const team = String(assignments[id] || "red") === "blue" ? "blue" : "red";
    grouped[team].push(id);
  }

  for (const team of ["red", "blue"]) {
    const roster = grouped[team];
    const count = Math.max(1, roster.length);
    for (let index = 0; index < roster.length; index += 1) {
      const playerId = roster[index];
      const slot = (index + 1) / (count + 1);
      const xBase = team === "red" ? randomFloat(14, 42) : randomFloat(58, 86);
      const yBase = clamp(8 + slot * 44 + randomFloat(-4.5, 4.5), 8, 52);
      players[playerId] = {
        x: xBase,
        y: yBase,
        vx: team === "red" ? randomFloat(0.08, 0.22) : randomFloat(-0.22, -0.08),
        vy: randomFloat(-0.18, 0.18),
        team
      };
    }
  }

  return {
    startedAt: game?.minigameStartedAt || Date.now(),
    pitch: {
      width: 100,
      height: 60,
      goalTop: 22,
      goalBottom: 38
    },
    teams: {
      red: { ...SOCCER_TEAMS.red, goals: 0 },
      blue: { ...SOCCER_TEAMS.blue, goals: 0 }
    },
    assignments,
    players,
    ball: {
      x: 50,
      y: 30,
      vx: 0,
      vy: 0,
      lastTouchPlayerId: "",
      lastTouchTeam: ""
    },
    lastKickSeq: 0,
    lastKick: null,
    lastEventSeq: 0,
    lastEvent: null,
    tickCount: 0
  };
}

function soccerMatchPlayerRows(game) {
  if (!game || !(game.chestPhase instanceof Map)) {
    return [];
  }

  const soccer = ensureSoccerMatchState(game);
  const worldPlayers = soccer?.players && typeof soccer.players === "object" ? soccer.players : {};
  const rows = [];
  for (const [playerId, state] of game.chestPhase.entries()) {
    if (!state || state.type !== "soccer_shootout") {
      continue;
    }
    const player = game.players.get(playerId);
    if (!player) {
      continue;
    }

    rows.push({
      id: player.id,
      name: player.name,
      blook: player.blook,
      team: state.team || "red",
      goals: Math.max(0, Number(state.goals || 0)),
      kicks: Math.max(0, Number(state.kicks || 0)),
      x: clamp(Number(worldPlayers[playerId]?.x || 50), 0, 100),
      y: clamp(Number(worldPlayers[playerId]?.y || 30), 0, 60)
    });
  }
  return rows;
}

function sanitizeQuestionPrompt(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function sanitizeQuestionOption(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function normalizeQuizColumnKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildQuizRowLookup(row) {
  const lookup = new Map();
  if (!row || typeof row !== "object") {
    return lookup;
  }

  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeQuizColumnKey(key);
    if (!normalized || lookup.has(normalized)) {
      continue;
    }
    lookup.set(normalized, value);
  }
  return lookup;
}

function readQuizRowValue(rowLookup, aliases) {
  if (!(rowLookup instanceof Map) || !Array.isArray(aliases)) {
    return "";
  }

  for (const alias of aliases) {
    const normalized = normalizeQuizColumnKey(alias);
    if (!normalized) {
      continue;
    }
    if (rowLookup.has(normalized)) {
      return rowLookup.get(normalized);
    }
  }
  return "";
}

function splitOptionsFromSingleCell(value) {
  const text = String(value || "").trim();
  if (!text) {
    return [];
  }
  return text
    .split(/[\|\n;,]+/g)
    .map((piece) => sanitizeQuestionOption(piece))
    .filter(Boolean);
}

function builtInQuestionSetEntries() {
  return Object.values(QUESTION_SET_CONFIG);
}

function allQuestionSetEntries() {
  return [...builtInQuestionSetEntries(), ...Array.from(customQuestionSets.values())];
}

function hasQuestionSet(questionSet) {
  if (typeof questionSet !== "string") {
    return false;
  }
  return Boolean(QUESTION_SET_CONFIG[questionSet] || customQuestionSets.has(questionSet));
}

function normalizeQuestionSet(questionSet) {
  if (!hasQuestionSet(questionSet)) {
    return "multiplication_1_digit";
  }
  return questionSet;
}

function questionSetLabel(questionSet) {
  const normalized = normalizeQuestionSet(questionSet);
  return QUESTION_SET_CONFIG[normalized]?.label || customQuestionSets.get(normalized)?.label || "Quiz";
}

function normalizeQuizSetId(rawId, fallbackPrefix = "quiz") {
  const source = String(rawId || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);
  const base = source || fallbackPrefix;
  let id = base;
  let suffix = 2;
  while (hasQuestionSet(id)) {
    id = `${base}_${suffix}`;
    suffix += 1;
  }
  return id;
}

function parseAnswerIndex(answerValue, options) {
  if (!Array.isArray(options) || options.length < 2) {
    return -1;
  }

  const byNumber = Number(answerValue);
  if (Number.isInteger(byNumber)) {
    if (byNumber >= 0 && byNumber < options.length) {
      return byNumber;
    }
    if (byNumber >= 1 && byNumber <= options.length) {
      return byNumber - 1;
    }
  }

  const normalized = String(answerValue || "").trim().toLowerCase();
  if (!normalized) {
    return -1;
  }

  const alphaIndex = ["a", "b", "c", "d", "e", "f"].indexOf(normalized);
  if (alphaIndex >= 0 && alphaIndex < options.length) {
    return alphaIndex;
  }

  const optionIndex = options.findIndex((option) => option.toLowerCase() === normalized);
  return optionIndex;
}

function parseQuizRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const questions = [];
  for (const rawRow of rows) {
    const row = rawRow && typeof rawRow === "object" ? rawRow : {};

    if (typeof row.prompt === "string" && Array.isArray(row.options) && row.options.length >= 2) {
      const prompt = sanitizeQuestionPrompt(row.prompt);
      const options = row.options.map((option) => sanitizeQuestionOption(option)).filter(Boolean).slice(0, 6);
      const answerIndex = parseAnswerIndex(row.answerIndex ?? row.answer ?? row.correct, options);
      if (prompt && options.length >= 2 && answerIndex >= 0 && answerIndex < options.length) {
        const explanation = sanitizeQuestionPrompt(row.explanation || "");
        questions.push({
          prompt,
          options,
          answerIndex,
          explanation
        });
      }
      continue;
    }

    const rowLookup = buildQuizRowLookup(row);
    const prompt = sanitizeQuestionPrompt(readQuizRowValue(rowLookup, ["prompt", "question", "q", "text"]));
    if (!prompt) {
      continue;
    }

    const optionsRaw = [
      readQuizRowValue(rowLookup, ["optionA", "choiceA", "answerA", "A", "option1", "choice1", "answer1"]),
      readQuizRowValue(rowLookup, ["optionB", "choiceB", "answerB", "B", "option2", "choice2", "answer2"]),
      readQuizRowValue(rowLookup, ["optionC", "choiceC", "answerC", "C", "option3", "choice3", "answer3"]),
      readQuizRowValue(rowLookup, ["optionD", "choiceD", "answerD", "D", "option4", "choice4", "answer4"]),
      readQuizRowValue(rowLookup, ["optionE", "choiceE", "answerE", "E", "option5", "choice5", "answer5"]),
      readQuizRowValue(rowLookup, ["optionF", "choiceF", "answerF", "F", "option6", "choice6", "answer6"])
    ];
    const optionSet = [];
    for (const rawOption of optionsRaw) {
      const safeOption = sanitizeQuestionOption(rawOption);
      if (!safeOption) {
        continue;
      }
      if (optionSet.includes(safeOption)) {
        continue;
      }
      optionSet.push(safeOption);
      if (optionSet.length >= 6) {
        break;
      }
    }

    if (optionSet.length < 2) {
      const combined = splitOptionsFromSingleCell(readQuizRowValue(rowLookup, ["options", "choices", "answers"]));
      for (const option of combined) {
        if (!optionSet.includes(option)) {
          optionSet.push(option);
        }
        if (optionSet.length >= 6) {
          break;
        }
      }
    }

    if (optionSet.length < 2) {
      continue;
    }

    const answerValue = readQuizRowValue(rowLookup, [
      "answerIndex",
      "answer",
      "correct",
      "correctAnswer",
      "rightAnswer"
    ]);
    const answerIndex = parseAnswerIndex(answerValue, optionSet);
    if (answerIndex < 0 || answerIndex >= optionSet.length) {
      continue;
    }

    const explanation = sanitizeQuestionPrompt(readQuizRowValue(rowLookup, ["explanation", "hint", "reason"]));
    questions.push({
      prompt,
      options: optionSet,
      answerIndex,
      explanation
    });
  }

  return questions;
}

function loadCustomQuestionSetsFromDisk() {
  try {
    customQuestionSets.clear();
    if (!fs.existsSync(CUSTOM_QUIZZES_DATA_FILE)) {
      return;
    }

    const raw = fs.readFileSync(CUSTOM_QUIZZES_DATA_FILE, "utf8");
    if (!raw.trim()) {
      return;
    }
    const payload = JSON.parse(raw);
    const quizzes = Array.isArray(payload?.quizzes) ? payload.quizzes : [];
    for (const quiz of quizzes) {
      const id = normalizeQuizSetId(quiz?.id || "");
      const label = sanitizeQuestionPrompt(quiz?.label || quiz?.name || id).slice(0, 64);
      const questions = parseQuizRows(Array.isArray(quiz?.questions) ? quiz.questions : []);
      if (questions.length === 0) {
        continue;
      }

      customQuestionSets.set(id, {
        id,
        label,
        source: "uploaded",
        questions,
        questionCount: questions.length,
        uploadedBy: sanitizeName(quiz?.uploadedBy || ""),
        uploadedAt: typeof quiz?.uploadedAt === "string" ? quiz.uploadedAt : nowIso()
      });
    }
  } catch (error) {
    console.warn("Failed to load custom quizzes:", error?.message || error);
  }
}

function saveCustomQuestionSetsToDisk() {
  try {
    fs.mkdirSync(path.dirname(CUSTOM_QUIZZES_DATA_FILE), { recursive: true });
    const payload = {
      savedAt: nowIso(),
      quizzes: Array.from(customQuestionSets.values()).map((quiz) => ({
        id: quiz.id,
        label: quiz.label,
        uploadedBy: quiz.uploadedBy || "",
        uploadedAt: quiz.uploadedAt || nowIso(),
        questions: quiz.questions
      }))
    };
    fs.writeFileSync(CUSTOM_QUIZZES_DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to save custom quizzes:", error?.message || error);
  }
}

function publicQuestionSets() {
  return allQuestionSetEntries().map((entry) => ({
    id: entry.id,
    label: entry.label,
    source: entry.source || "built_in",
    questionCount: entry.questionCount || (entry.id === "multiplication_1_digit" ? 81 : QUESTION_BANK.length)
  }));
}

function ensureMiniGameStatsBucket(type) {
  const key = String(type || "");
  if (!key) {
    return null;
  }
  if (!globalMiniGameStats[key]) {
    globalMiniGameStats[key] = {
      sessions: 0,
      playerEntries: 0,
      completions: 0,
      totalBonus: 0
    };
  }
  return globalMiniGameStats[key];
}

function loadMiniGameStatsFromDisk() {
  try {
    if (!fs.existsSync(MINIGAME_STATS_FILE)) {
      return;
    }
    const raw = fs.readFileSync(MINIGAME_STATS_FILE, "utf8");
    if (!raw.trim()) {
      return;
    }
    const payload = JSON.parse(raw);
    const source = payload?.stats && typeof payload.stats === "object" ? payload.stats : {};
    for (const [type, values] of Object.entries(source)) {
      const bucket = ensureMiniGameStatsBucket(type);
      if (!bucket) {
        continue;
      }
      bucket.sessions = Math.max(0, Math.floor(parseStoredNumber(values?.sessions, 0)));
      bucket.playerEntries = Math.max(0, Math.floor(parseStoredNumber(values?.playerEntries, 0)));
      bucket.completions = Math.max(0, Math.floor(parseStoredNumber(values?.completions, 0)));
      bucket.totalBonus = Math.max(0, Math.floor(parseStoredNumber(values?.totalBonus, 0)));
    }
  } catch (error) {
    console.warn("Failed to load mini-game stats:", error?.message || error);
  }
}

function saveMiniGameStatsToDisk() {
  try {
    fs.mkdirSync(path.dirname(MINIGAME_STATS_FILE), { recursive: true });
    const payload = {
      savedAt: nowIso(),
      stats: globalMiniGameStats
    };
    fs.writeFileSync(MINIGAME_STATS_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to save mini-game stats:", error?.message || error);
  }
}

function publicMiniGameStats() {
  const rows = MINI_GAME_CATALOG.map((game) => {
    const bucket = ensureMiniGameStatsBucket(game.id);
    const sessions = Math.max(0, Number(bucket?.sessions || 0));
    const playerEntries = Math.max(0, Number(bucket?.playerEntries || 0));
    const completions = Math.max(0, Number(bucket?.completions || 0));
    const totalBonus = Math.max(0, Number(bucket?.totalBonus || 0));
    const avgBonus = completions > 0 ? Math.round(totalBonus / completions) : 0;
    const completionRate = playerEntries > 0 ? Math.round((completions / playerEntries) * 1000) / 10 : 0;
    return {
      id: game.id,
      name: game.name,
      sessions,
      playerEntries,
      completions,
      avgBonus,
      completionRate
    };
  });
  rows.sort((left, right) => right.playerEntries - left.playerEntries || right.sessions - left.sessions || left.name.localeCompare(right.name));
  return rows;
}

function mostMatchedMiniGame(statsRows) {
  const rows = Array.isArray(statsRows) ? statsRows : [];
  if (rows.length === 0) {
    return null;
  }

  const filtered = rows.filter((row) => Number(row?.completions || 0) > 0);
  const source = filtered.length > 0 ? filtered : rows;
  return source
    .slice()
    .sort(
      (left, right) =>
        Number(right?.completionRate || 0) - Number(left?.completionRate || 0) ||
        Number(right?.avgBonus || 0) - Number(left?.avgBonus || 0) ||
        Number(right?.completions || 0) - Number(left?.completions || 0) ||
        Number(right?.playerEntries || 0) - Number(left?.playerEntries || 0) ||
        String(left?.name || "").localeCompare(String(right?.name || ""))
    )[0];
}

function mostPlayedMiniGameType(options) {
  const source = Array.isArray(options) ? options : [];
  if (source.length === 0) {
    return null;
  }

  let bestType = source[0];
  let bestEntries = -1;
  let bestSessions = -1;
  let bestCompletionRate = -1;
  for (const type of source) {
    const bucket = ensureMiniGameStatsBucket(type);
    const entries = Number(bucket?.playerEntries || 0);
    const sessions = Number(bucket?.sessions || 0);
    const completions = Number(bucket?.completions || 0);
    const completionRate = entries > 0 ? completions / entries : 0;
    if (
      entries > bestEntries ||
      (entries === bestEntries && completionRate > bestCompletionRate) ||
      (entries === bestEntries && completionRate === bestCompletionRate && sessions > bestSessions)
    ) {
      bestType = type;
      bestEntries = entries;
      bestSessions = sessions;
      bestCompletionRate = completionRate;
    }
  }
  return bestType;
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

  if (normalizedSet === "general_knowledge") {
    return QUESTION_BANK;
  }

  const custom = customQuestionSets.get(normalizedSet);
  if (custom && Array.isArray(custom.questions) && custom.questions.length > 0) {
    return custom.questions;
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
  let answers = game.submissions.size;
  let correctAnswers = Array.from(game.submissions.values()).filter((entry) => entry.correct).length;

  if (game.phase === "question" && game.questionEligiblePlayerIds instanceof Set && game.questionEligiblePlayerIds.size > 0) {
    answers = 0;
    correctAnswers = 0;
    for (const submission of game.submissions.values()) {
      if (!game.questionEligiblePlayerIds.has(submission.playerId)) {
        continue;
      }
      answers += 1;
      if (submission.correct) {
        correctAnswers += 1;
      }
    }
  }

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

function syncPlayerToCurrentPhase(game, socketId) {
  if (!game || !socketId) {
    return;
  }

  const leaderboard = sortedPlayers(game);
  io.to(socketId).emit("players:update", {
    players: leaderboard
  });

  if (game.phase === "question") {
    const question = game.questions[game.currentQuestionIndex];
    if (!question) {
      return;
    }

    io.to(socketId).emit("question:start", {
      questionIndex: game.currentQuestionIndex + 1,
      totalQuestions: game.questions.length,
      endsAt: game.questionEndsAt || Date.now() + 1000,
      question: {
        prompt: question.prompt,
        options: question.options
      }
    });
    return;
  }

  if (game.phase === "minigame") {
    const eligiblePlayerIds = Array.from(game.chestPhase.keys());
    const meta = miniGameMeta(game.minigameType);

    io.to(socketId).emit("minigame:start", {
      eligiblePlayerIds,
      type: game.minigameType,
      endsAt: game.minigameEndsAt || Date.now() + 1000,
      eventName: meta?.name || "Mini Game",
      feedTitle: "Mini-game Feed",
      difficulty: game.minigameDifficulty || miniGameDifficultyProfile(game)
    });

    if (game.chestPhase.has(socketId)) {
      const state = game.chestPhase.get(socketId);
      io.to(socketId).emit("minigame:yourData", {
        type: state.type,
        endsAt: game.minigameEndsAt || Date.now() + 1000,
        eventName: meta?.name || "Mini Game",
        actionLabel: "Play",
        data: miniGamePublicData(state, game, socketId),
        difficulty: game.minigameDifficulty || miniGameDifficultyProfile(game)
      });
    }
    return;
  }

  if (game.phase === "round_summary") {
    io.to(socketId).emit("round:summary", {
      questionIndex: game.currentQuestionIndex + 1,
      totalQuestions: game.questions.length,
      leaderboard
    });
    return;
  }

  if (game.phase === "finished") {
    io.to(socketId).emit("game:finished", {
      leaderboard
    });
  }
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
  if (game.minigameTick) {
    clearInterval(game.minigameTick);
    game.minigameTick = null;
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
  broadcastActiveRoom();
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
  const rotationMode = normalizeMiniGameRotationMode(game.settings.miniGameRotationMode);
  if (rotationMode === "off") {
    return null;
  }
  if (rotationMode === "soccer_only") {
    return "soccer_shootout";
  }

  const options = MODE_MINI_GAMES[normalizeMode(game.settings.mode)] || [];
  if (options.length === 0) {
    return null;
  }

  if (rotationMode === "random") {
    return options[randomInt(0, options.length - 1)];
  }

  if (rotationMode === "popular") {
    return mostPlayedMiniGameType(options) || options[0];
  }

  const index = game.minigameRotationIndex % options.length;
  game.minigameRotationIndex += 1;
  return options[index];
}

function miniGameMeta(type) {
  return MINI_GAME_LOOKUP.get(type) || MINI_GAME_LOOKUP.get("soccer_shootout");
}

function isMiniGameType(type) {
  if (typeof type !== "string") {
    return false;
  }

  return MINI_GAME_LOOKUP.has(type.trim());
}

function miniGameDifficultyProfile(game) {
  const totalQuestions = Math.max(1, Number(game?.questions?.length || game?.settings?.questionCount || 10));
  const roundNumber = Math.max(1, Number(game?.currentQuestionIndex ?? -1) + 1);
  const ratioRaw = totalQuestions <= 1 ? 1 : (roundNumber - 1) / (totalQuestions - 1);
  const ratio = clamp(Number.isFinite(ratioRaw) ? ratioRaw : 0, 0, 1);
  const tier = clamp(1 + Math.round(ratio * 3), 1, 4);
  return {
    roundNumber,
    totalQuestions,
    ratio,
    tier
  };
}

function miniGameHostGoal(game, type) {
  const difficulty = game?.minigameDifficulty || miniGameDifficultyProfile(game);
  const tier = clamp(Number(difficulty?.tier || 1), 1, 4);
  if (type === "tap_rush") {
    return Math.max(40, Math.round((Number(game?.minigameDurationMs) || 10000) / 130) + (tier - 1) * 8);
  }
  if (type === "soccer_shootout") {
    return 4 + tier;
  }
  if (type === "reaction_duel") {
    return Math.max(180, 380 - (tier - 1) * 40);
  }
  if (type === "sequence_memory") {
    return 4 + tier;
  }
  if (type === "obstacle_dodge") {
    return 7 + tier;
  }
  if (type === "precision_stop") {
    return 100;
  }
  if (type === "word_scramble") {
    return 1;
  }
  return 0;
}

function hostMiniGameProgressRow(state) {
  if (state.type === "tap_rush") {
    return {
      metric: Number(state.taps || 0),
      progress: Number(state.taps || 0),
      completed: false
    };
  }

  if (state.type === "soccer_shootout") {
    const goals = Math.max(0, Number(state.goals || 0));
    const kicks = Math.max(0, Number(state.kicks || 0));
    return {
      metric: goals * 130 + kicks * 22,
      progress: goals,
      team: String(state.team || "red"),
      goals,
      kicks,
      completed: false
    };
  }

  if (state.type === "reaction_duel") {
    const reacted = state.reactedAt !== null;
    const falseStart = state.falseStart === true;
    const reactionMs = reacted && !falseStart ? Number(state.reactionMs || 0) : null;
    return {
      metric: reacted ? (falseStart ? -1 : 10000 - reactionMs) : 0,
      progress: reacted ? (falseStart ? 0 : Math.max(0, 100 - Math.round(reactionMs / 8))) : 0,
      reacted,
      falseStart,
      reactionMs,
      completed: reacted
    };
  }

  if (state.type === "sequence_memory") {
    const progress = Number(state.progress || 0);
    const total = Array.isArray(state.sequence) ? state.sequence.length : 5;
    return {
      metric: (state.completedAt ? 1000 : 0) + progress,
      progress,
      total,
      completed: state.completedAt !== null
    };
  }

  if (state.type === "obstacle_dodge") {
    const step = Number(state.step || 0);
    const totalTurns = Number(state.totalTurns || 8);
    const hits = Number(state.hits || 0);
    const safeTurns = Math.max(0, step - hits);
    return {
      metric: safeTurns * 100 - hits * 10,
      progress: safeTurns,
      safeTurns,
      hits,
      step,
      totalTurns,
      lane: Number(state.lane ?? 1),
      lastObstacle: Number.isInteger(state.lastObstacle) ? state.lastObstacle : null,
      completed: step >= totalTurns
    };
  }

  if (state.type === "precision_stop") {
    const submitted = state.submitted === true;
    const target = Number(state.target || 0);
    const value = submitted ? Number(state.value || 0) : null;
    const diff = submitted ? Math.abs(value - target) : null;
    return {
      metric: submitted ? 1000 - diff : 0,
      progress: submitted ? 100 - diff : 0,
      submitted,
      target,
      value,
      diff,
      completed: submitted
    };
  }

  if (state.type === "word_scramble") {
    const attempts = Number(state.attempts || 0);
    const maxAttempts = Number(state.maxAttempts || 4);
    const solved = state.solved === true;
    return {
      metric: solved ? 1000 - attempts : -attempts,
      progress: solved ? 100 : 0,
      solved,
      attempts,
      maxAttempts,
      lastGuess: state.lastGuess || "",
      completed: solved || attempts >= maxAttempts
    };
  }

  return {
    metric: 0,
    progress: 0,
    completed: false
  };
}

function buildMiniGameProgressPayload(game) {
  if (!game || game.phase !== "minigame" || !game.minigameType) {
    return null;
  }

  const type = game.minigameType;
  const meta = miniGameMeta(type);
  const difficulty = game?.minigameDifficulty || miniGameDifficultyProfile(game);
  const goal = miniGameHostGoal(game, type);
  const rows = [];

  for (const [playerId, state] of game.chestPhase.entries()) {
    const player = game.players.get(playerId);
    if (!player || !state) {
      continue;
    }

    const progressRow = hostMiniGameProgressRow(state);
    rows.push({
      id: player.id,
      name: player.name,
      blook: player.blook,
      score: player.score,
      ...progressRow
    });
  }

  rows.sort((a, b) => b.metric - a.metric || b.score - a.score || a.name.localeCompare(b.name));
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return {
    type,
    eventName: meta?.name || "Mini-game",
    goal,
    difficulty,
    endsAt: game.minigameEndsAt || Date.now() + 1000,
    players: rows,
    teamScores:
      type === "soccer_shootout"
        ? {
            red: Math.max(0, Number(game.soccerMatch?.teams?.red?.goals || 0)),
            blue: Math.max(0, Number(game.soccerMatch?.teams?.blue?.goals || 0)),
            redName: SOCCER_TEAMS.red.name,
            blueName: SOCCER_TEAMS.blue.name
          }
        : null
  };
}

function broadcastMiniGameProgress(game) {
  if (!game || game.phase !== "minigame") {
    return;
  }

  const payload = buildMiniGameProgressPayload(game);
  if (!payload) {
    return;
  }

  io.to(game.hostId).emit("minigame:progress", payload);
}

function soccerStatePayloadForPlayer(game, playerId) {
  const soccer = ensureSoccerMatchState(game);
  if (!soccer) {
    return null;
  }
  const playerState = game?.chestPhase?.get(playerId);
  const players = soccerMatchPlayerRows(game);
  return {
    type: "soccer_shootout",
    teams: {
      red: SOCCER_TEAMS.red.name,
      blue: SOCCER_TEAMS.blue.name
    },
    score: {
      red: Math.max(0, Number(soccer.teams?.red?.goals || 0)),
      blue: Math.max(0, Number(soccer.teams?.blue?.goals || 0))
    },
    yourTeam: String(playerState?.team || "red"),
    yourGoals: Math.max(0, Number(playerState?.goals || 0)),
    yourKicks: Math.max(0, Number(playerState?.kicks || 0)),
    players,
    ball: {
      x: clamp(Number(soccer.ball?.x || 50), 0, 100),
      y: clamp(Number(soccer.ball?.y || 30), 0, 60),
      vx: Number(soccer.ball?.vx || 0),
      vy: Number(soccer.ball?.vy || 0)
    },
    lastKick: soccer.lastKick || null,
    lastEvent: soccer.lastEvent || null,
    completed: false
  };
}

function broadcastSoccerMatchState(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "soccer_shootout") {
    return;
  }
  for (const playerId of game.chestPhase.keys()) {
    const payload = soccerStatePayloadForPlayer(game, playerId);
    if (!payload) {
      continue;
    }
    io.to(playerId).emit("minigame:state", payload);
  }
}

function updateSoccerBallKick(game, playerId, value) {
  const soccer = ensureSoccerMatchState(game);
  const state = game?.chestPhase?.get(playerId);
  if (!soccer || !state) {
    return { ok: false, message: "Soccer match state unavailable." };
  }

  const playerWorld = soccer.players?.[playerId];
  if (!playerWorld) {
    return { ok: false, message: "Player world state missing." };
  }

  const ball = soccer.ball;
  const dx = Number(ball.x || 50) - Number(playerWorld.x || 50);
  const dy = Number(ball.y || 30) - Number(playerWorld.y || 30);
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 26) {
    return { ok: false, message: "Move closer to the ball before kicking." };
  }

  const team = String(state.team || "red") === "blue" ? "blue" : "red";
  const attackSign = team === "red" ? 1 : -1;
  const power = clamp(Number(value?.power) || 2, 1, 3);
  const direction = clamp(Number(value?.direction) || randomFloat(-35, 35), -60, 60);
  const angle = (direction * Math.PI) / 180;
  const speed = 2.0 + power * 0.9;
  ball.vx = attackSign * Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.lastTouchPlayerId = playerId;
  ball.lastTouchTeam = team;

  state.kicks = Math.max(0, Number(state.kicks || 0)) + 1;
  state.lastKickAt = Date.now();

  soccer.lastKickSeq = Math.max(0, Number(soccer.lastKickSeq || 0)) + 1;
  soccer.lastKick = {
    seq: soccer.lastKickSeq,
    ts: Date.now(),
    byId: playerId,
    byName: game.players.get(playerId)?.name || "Player",
    byTeam: team,
    power,
    direction,
    flightMs: clamp(Math.round((100 / Math.max(0.01, Math.abs(ball.vx))) * 16), 350, 1200),
    outcome: "in_play",
    goal: false,
    bounces: 0
  };

  return { ok: true };
}

function soccerResetBallAfterGoal(soccer, team) {
  const nextKickTeam = team === "red" ? "blue" : "red";
  const sign = nextKickTeam === "red" ? 1 : -1;
  soccer.ball.x = 50;
  soccer.ball.y = 30;
  soccer.ball.vx = sign * randomFloat(0.55, 1.05);
  soccer.ball.vy = randomFloat(-0.3, 0.3);
  soccer.ball.lastTouchPlayerId = "";
  soccer.ball.lastTouchTeam = "";
}

function tickSoccerMatch(game) {
  if (!game || game.phase !== "minigame" || game.minigameType !== "soccer_shootout") {
    return;
  }
  const soccer = ensureSoccerMatchState(game);
  if (!soccer) {
    return;
  }

  const pitch = soccer.pitch || { width: 100, height: 60, goalTop: 22, goalBottom: 38 };
  const players = soccer.players && typeof soccer.players === "object" ? soccer.players : {};
  for (const [playerId, world] of Object.entries(players)) {
    if (!game.chestPhase.has(playerId)) {
      delete players[playerId];
      continue;
    }
    const team = String(world.team || soccer.assignments?.[playerId] || "red") === "blue" ? "blue" : "red";
    const minX = team === "red" ? 7 : 53;
    const maxX = team === "red" ? 47 : 93;
    const minY = 6;
    const maxY = pitch.height - 6;

    world.vx = clamp(Number(world.vx || 0) + randomFloat(-0.05, 0.05), -0.55, 0.55);
    world.vy = clamp(Number(world.vy || 0) + randomFloat(-0.06, 0.06), -0.6, 0.6);
    world.x = Number(world.x || 50) + world.vx;
    world.y = Number(world.y || 30) + world.vy;

    if (world.x <= minX || world.x >= maxX) {
      world.vx *= -0.85;
      world.x = clamp(world.x, minX, maxX);
    }
    if (world.y <= minY || world.y >= maxY) {
      world.vy *= -0.85;
      world.y = clamp(world.y, minY, maxY);
    }
  }

  const ball = soccer.ball;
  ball.x = Number(ball.x || 50) + Number(ball.vx || 0);
  ball.y = Number(ball.y || 30) + Number(ball.vy || 0);
  ball.vx = Number(ball.vx || 0) * 0.986;
  ball.vy = Number(ball.vy || 0) * 0.986;

  if (Math.abs(ball.vx) < 0.01) {
    ball.vx = 0;
  }
  if (Math.abs(ball.vy) < 0.01) {
    ball.vy = 0;
  }

  if (ball.y <= 1 || ball.y >= pitch.height - 1) {
    ball.y = clamp(ball.y, 1, pitch.height - 1);
    ball.vy *= -0.9;
    if (soccer.lastKick && soccer.lastKick.outcome === "in_play") {
      soccer.lastKick.bounces = Math.max(0, Number(soccer.lastKick.bounces || 0)) + 1;
    }
  }

  let handledGoalOrEnd = false;
  if (ball.x <= 0 || ball.x >= pitch.width) {
    const side = ball.x >= pitch.width ? "right" : "left";
    const inGoalWindow = ball.y >= pitch.goalTop && ball.y <= pitch.goalBottom;
    const scoringTeam = side === "right" ? "red" : "blue";
    if (inGoalWindow && ball.lastTouchTeam === scoringTeam) {
      soccer.teams[scoringTeam].goals += 1;
      const scorerId = String(ball.lastTouchPlayerId || "");
      const scorer = game.chestPhase.get(scorerId);
      if (scorer && scorer.type === "soccer_shootout") {
        scorer.goals = Math.max(0, Number(scorer.goals || 0)) + 1;
      }

      soccer.lastEventSeq = Math.max(0, Number(soccer.lastEventSeq || 0)) + 1;
      soccer.lastEvent = {
        seq: soccer.lastEventSeq,
        type: "goal",
        team: scoringTeam,
        byId: scorerId,
        byName: game.players.get(scorerId)?.name || "Player",
        score: {
          red: Math.max(0, Number(soccer.teams.red.goals || 0)),
          blue: Math.max(0, Number(soccer.teams.blue.goals || 0))
        }
      };
      if (soccer.lastKick) {
        soccer.lastKick.outcome = "goal";
        soccer.lastKick.goal = true;
      }
      soccerResetBallAfterGoal(soccer, scoringTeam);
      handledGoalOrEnd = true;
    } else {
      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(Number(ball.vx || 0)) * 0.85;
      } else {
        ball.x = pitch.width;
        ball.vx = -Math.abs(Number(ball.vx || 0)) * 0.85;
      }
      if (soccer.lastKick) {
        soccer.lastKick.outcome = "saved";
      }
    }
  }

  soccer.tickCount = Math.max(0, Number(soccer.tickCount || 0)) + 1;
  broadcastSoccerMatchState(game);
  if (handledGoalOrEnd || soccer.tickCount % 5 === 0) {
    broadcastMiniGameProgress(game);
  }
}

function createMiniGameState(type, difficulty = null) {
  const safeTier = clamp(Number(difficulty?.tier || 1), 1, 4);
  const safeRatio = clamp(Number(difficulty?.ratio || 0), 0, 1);
  if (type === "tap_rush") {
    return { type, taps: 0, difficultyTier: safeTier };
  }

  if (type === "soccer_shootout") {
    return {
      type,
      team: "red",
      goals: 0,
      kicks: 0,
      lastKickAt: 0,
      difficultyTier: safeTier
    };
  }

  if (type === "reaction_duel") {
    const waitMin = Math.max(700, 1200 - (safeTier - 1) * 120);
    const waitMax = Math.max(waitMin + 700, 3200 - (safeTier - 1) * 220);
    return {
      type,
      goAt: Date.now() + randomInt(waitMin, waitMax),
      reactedAt: null,
      falseStart: false,
      reactionMs: null,
      difficultyTier: safeTier
    };
  }

  if (type === "sequence_memory") {
    const sequenceLength = 4 + safeTier;
    return {
      type,
      sequence: Array.from({ length: sequenceLength }, () => randomInt(0, 3)),
      progress: 0,
      completedAt: null,
      difficultyTier: safeTier
    };
  }

  if (type === "obstacle_dodge") {
    const totalTurns = 7 + safeTier;
    return {
      type,
      lane: 1,
      step: 0,
      totalTurns,
      obstacles: Array.from({ length: totalTurns }, () => randomInt(0, 2)),
      hits: 0,
      lastObstacle: null,
      lastHit: false,
      difficultyTier: safeTier
    };
  }

  if (type === "precision_stop") {
    const tolerance = Math.max(6, 14 - (safeTier - 1) * 2);
    return {
      type,
      target: randomInt(15, 85),
      submitted: false,
      value: null,
      tolerance,
      difficultyTier: safeTier
    };
  }

  if (type === "word_scramble") {
    const minLength = Math.max(4, Math.round(4 + safeRatio * 4));
    const filteredWords = WORD_SCRAMBLE_WORDS.filter((word) => String(word || "").length >= minLength);
    const dictionary = filteredWords.length > 0 ? filteredWords : WORD_SCRAMBLE_WORDS;
    const answer = dictionary[randomInt(0, dictionary.length - 1)];
    const maxAttempts = safeTier >= 4 ? 2 : safeTier >= 2 ? 3 : 4;
    return {
      type,
      answer,
      scrambled: scrambleWord(answer),
      attempts: 0,
      maxAttempts,
      solved: false,
      completed: false,
      lastGuess: "",
      difficultyTier: safeTier
    };
  }

  return { type: "tap_rush", taps: 0, difficultyTier: safeTier };
}

function miniGamePublicData(state, game, playerId = "") {
  const difficulty = game?.minigameDifficulty || miniGameDifficultyProfile(game);
  const difficultyTier = clamp(Number(state?.difficultyTier || difficulty?.tier || 1), 1, 4);
  if (state.type === "tap_rush") {
    return {
      taps: 0,
      difficultyTier
    };
  }

  if (state.type === "soccer_shootout") {
    const soccer = ensureSoccerMatchState(game);
    const allPlayers = soccerMatchPlayerRows(game);
    const assignments = soccer?.assignments && typeof soccer.assignments === "object" ? soccer.assignments : {};
    return {
      team: String(state.team || "red"),
      goals: state.goals,
      kicks: state.kicks,
      teams: {
        red: SOCCER_TEAMS.red.name,
        blue: SOCCER_TEAMS.blue.name
      },
      score: {
        red: Math.max(0, Number(soccer?.teams?.red?.goals || 0)),
        blue: Math.max(0, Number(soccer?.teams?.blue?.goals || 0))
      },
      assignments,
      players: allPlayers,
      ball: {
        x: clamp(Number(soccer?.ball?.x || 50), 0, 100),
        y: clamp(Number(soccer?.ball?.y || 30), 0, 60),
        vx: Number(soccer?.ball?.vx || 0),
        vy: Number(soccer?.ball?.vy || 0)
      },
      lastKick: soccer?.lastKick || null,
      lastEvent: soccer?.lastEvent || null,
      yourId: String(playerId || ""),
      difficultyTier
    };
  }

  if (state.type === "reaction_duel") {
    return {
      goAt: state.goAt,
      difficultyTier
    };
  }

  if (state.type === "sequence_memory") {
    return {
      sequence: state.sequence,
      total: state.sequence.length,
      difficultyTier
    };
  }

  if (state.type === "obstacle_dodge") {
    return {
      lane: state.lane,
      step: state.step,
      totalTurns: state.totalTurns,
      hits: state.hits,
      difficultyTier
    };
  }

  if (state.type === "precision_stop") {
    return {
      target: state.target,
      tolerance: Number(state.tolerance || 12),
      difficultyTier
    };
  }

  if (state.type === "word_scramble") {
    return {
      scrambled: state.scrambled,
      maxAttempts: state.maxAttempts,
      length: state.answer.length,
      difficultyTier
    };
  }

  return {};
}

function isMiniGameStateResolved(state) {
  if (state.type === "tap_rush") {
    return false;
  }

  if (state.type === "soccer_shootout") {
    return false;
  }

  if (state.type === "reaction_duel") {
    return state.reactedAt !== null;
  }

  if (state.type === "sequence_memory") {
    return state.completedAt !== null;
  }

  if (state.type === "obstacle_dodge") {
    return state.step >= state.totalTurns;
  }

  if (state.type === "precision_stop") {
    return state.submitted;
  }

  if (state.type === "word_scramble") {
    return state.solved || state.attempts >= state.maxAttempts || state.completed === true;
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
    const soccer = ensureSoccerMatchState(game);
    const redGoals = Math.max(0, Number(soccer?.teams?.red?.goals || 0));
    const blueGoals = Math.max(0, Number(soccer?.teams?.blue?.goals || 0));
    const team = String(state.team || "red");
    const teamGoals = team === "blue" ? blueGoals : redGoals;
    const opponentGoals = team === "blue" ? redGoals : blueGoals;
    const teamWinBonus = teamGoals > opponentGoals ? 240 : 0;
    const drawBonus = teamGoals === opponentGoals ? 80 : 0;
    const bonus = 120 + Math.max(0, Number(state.goals || 0)) * 190 + Math.max(0, Number(state.kicks || 0)) * 14 + teamWinBonus + drawBonus;
    const resultText = teamGoals > opponentGoals ? "won" : teamGoals < opponentGoals ? "lost" : "drew";
    return {
      bonus,
      text: `${player.name} scored ${state.goals} goals on ${state.kicks} kicks. ${SOCCER_TEAMS[team]?.name || "Team"} ${resultText} ${teamGoals}-${opponentGoals} for +${bonus} ${unit}.`
    };
  }

  if (state.type === "reaction_duel") {
    if (state.falseStart) {
      return {
        bonus: 60,
        text: `${player.name} false-started and got +60 ${unit}.`
      };
    }

    const reactionMs = Math.max(0, Number(state.reactionMs || 0));
    const bonus = Math.max(90, 760 - Math.round(reactionMs * 1.7));
    return {
      bonus,
      text: `${player.name} reacted in ${reactionMs}ms for +${bonus} ${unit}.`
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

  if (state.type === "obstacle_dodge") {
    const totalTurns = Number(state.totalTurns || 8);
    const hits = Number(state.hits || 0);
    const safeTurns = Math.max(0, totalTurns - hits);
    const bonus = Math.max(80, 110 + safeTurns * 120 - hits * 45 + (hits === 0 ? 180 : 0));
    return {
      bonus,
      text: `${player.name} dodged ${safeTurns}/${totalTurns} turns for +${bonus} ${unit}.`
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

  if (state.type === "word_scramble") {
    if (state.solved) {
      const attemptPenalty = Math.max(0, Number(state.attempts || 1) - 1);
      const bonus = Math.max(140, 620 - attemptPenalty * 110);
      return {
        bonus,
        text: `${player.name} solved "${state.answer}" in ${state.attempts} tries for +${bonus} ${unit}.`
      };
    }

    return {
      bonus: 90,
      text: `${player.name} could not solve "${state.answer}" and got +90 ${unit}.`
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

  const miniGameType = String(game.minigameType || "");
  const resolved = [];
  for (const [playerId, state] of game.chestPhase.entries()) {
    const player = game.players.get(playerId);
    if (!player) {
      continue;
    }

    const result = miniGameResult(game, player, state);
    resolved.push({ playerId, player, result });
  }

  const bestBonus = resolved.reduce((max, row) => Math.max(max, Number(row.result?.bonus || 0)), 0);
  let accountsTouched = false;
  let miniGameStatsTouched = false;
  for (const row of resolved) {
    const { playerId, player, result } = row;
    player.score += result.bonus;

    const feedEvent = { playerId: player.id, playerName: player.name, text: result.text };
    game.feed.push(feedEvent);

    io.to(playerId).emit("minigame:resolved", {
      text: result.text,
      bonus: result.bonus,
      leaderboard: sortedPlayers(game)
    });

    const globalBucket = ensureMiniGameStatsBucket(miniGameType);
    if (globalBucket) {
      globalBucket.completions += 1;
      globalBucket.totalBonus += Math.max(0, Number(result.bonus || 0));
      miniGameStatsTouched = true;
    }

    const accountKey = normalizeAccountKey(player.accountKey || "");
    if (accountKey) {
      const account = ensureAccount(accountKey);
      if (account) {
        const accountBucket = accountMiniGameBucket(account, miniGameType);
        if (accountBucket) {
          accountBucket.plays += 1;
          accountBucket.totalBonus += Math.max(0, Number(result.bonus || 0));
          accountBucket.bestBonus = Math.max(accountBucket.bestBonus, Math.max(0, Number(result.bonus || 0)));
          if (Number(result.bonus || 0) === bestBonus && bestBonus > 0) {
            accountBucket.wins += 1;
          }
          account.updatedAt = nowIso();
          accountsTouched = true;
        }
      }
    }
  }

  if (accountsTouched) {
    saveAccountsToDisk();
  }
  if (miniGameStatsTouched) {
    saveMiniGameStatsToDisk();
  }

  io.to(game.code).emit("minigame:feed", {
    feed: game.feed.slice(-8),
    leaderboard: sortedPlayers(game)
  });

  game.chestPhase.clear();
  game.minigameType = null;
  game.minigameDifficulty = null;
  game.minigameStartedAt = null;
  game.minigameEndsAt = null;
  game.soccerMatch = null;
  const returnPhase = game.minigameReturnPhase === "lobby" ? "lobby" : "round_summary";
  game.minigameReturnPhase = "round_summary";

  if (returnPhase === "lobby") {
    game.phase = "lobby";
    game.submissions.clear();
    game.feed = [];
    game.updatedAt = Date.now();
    broadcastLobby(game);
    broadcastHostStatus(game);
    return;
  }

  startRoundSummary(game);
}

function startMiniGamePhase(game, eligiblePlayerIds, options = {}) {
  const requestedType = typeof options.type === "string" ? options.type.trim() : "";
  const miniGameType = isMiniGameType(requestedType) ? requestedType : pickMiniGameType(game);
  const meta = miniGameMeta(miniGameType);
  const difficulty = miniGameDifficultyProfile(game);
  const returnPhase = options.returnPhase === "lobby" ? "lobby" : "round_summary";
  const settingsDurationMs = clamp(Number(game.settings?.miniGameDurationSec) || 10, 5, 30) * 1000;
  const durationMs = clamp(Number(options.durationMs) || settingsDurationMs, 5000, 30000);
  const allowEmpty = options.allowEmpty === true;

  if (!miniGameType || !meta || !Array.isArray(eligiblePlayerIds) || (eligiblePlayerIds.length === 0 && !allowEmpty)) {
    if (returnPhase === "lobby") {
      game.phase = "lobby";
      game.updatedAt = Date.now();
      broadcastLobby(game);
      broadcastHostStatus(game);
      return false;
    }
    startRoundSummary(game);
    return false;
  }

  game.phase = "minigame";
  game.feed = [];
  game.chestPhase.clear();
  game.minigameType = miniGameType;
  game.minigameDurationMs = durationMs;
  game.minigameReturnPhase = returnPhase;
  game.minigameStartedAt = Date.now();
  game.minigameEndsAt = game.minigameStartedAt + game.minigameDurationMs;
  game.minigameDifficulty = difficulty;
  game.soccerMatch = null;
  const globalBucket = ensureMiniGameStatsBucket(miniGameType);
  if (globalBucket) {
    globalBucket.sessions += 1;
    globalBucket.playerEntries += Math.max(0, eligiblePlayerIds.length);
    saveMiniGameStatsToDisk();
  }

  if (miniGameType === "soccer_shootout") {
    game.soccerMatch = createSoccerMatchForPlayers(game, eligiblePlayerIds);
  }

  for (const playerId of eligiblePlayerIds) {
    const state = createMiniGameState(miniGameType, difficulty);
    if (miniGameType === "soccer_shootout") {
      const team = String(game.soccerMatch?.assignments?.[playerId] || "red");
      state.team = team === "blue" ? "blue" : "red";
    }
    game.chestPhase.set(playerId, state);

    io.to(playerId).emit("minigame:yourData", {
      type: miniGameType,
      endsAt: game.minigameEndsAt,
      eventName: meta.name,
      actionLabel: "Play",
      data: miniGamePublicData(state, game, playerId),
      difficulty: game.minigameDifficulty
    });
  }

  io.to(game.code).emit("minigame:start", {
    eligiblePlayerIds,
    type: miniGameType,
    endsAt: game.minigameEndsAt,
    eventName: meta.name,
    feedTitle: "Mini-game Feed",
    difficulty: game.minigameDifficulty
  });

  game.chestTimer = setTimeout(() => {
    finalizeMiniGamePhase(game);
  }, game.minigameDurationMs + 120);

  if (miniGameType === "soccer_shootout") {
    if (game.minigameTick) {
      clearInterval(game.minigameTick);
    }
    game.minigameTick = setInterval(() => {
      tickSoccerMatch(game);
    }, 80);
    broadcastSoccerMatchState(game);
  }

  broadcastHostStatus(game);
  broadcastMiniGameProgress(game);
  return true;
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
    broadcastMiniGameProgress(game);
    return { ok: true };
  }

  if (state.type === "reaction_duel") {
    if (action !== "react") {
      return { ok: false, message: "Invalid action for reaction duel." };
    }

    if (state.reactedAt !== null) {
      return { ok: true, completed: true };
    }

    const now = Date.now();
    state.reactedAt = now;
    if (now < state.goAt) {
      state.falseStart = true;
      state.reactionMs = null;
    } else {
      state.falseStart = false;
      state.reactionMs = Math.max(0, now - state.goAt);
    }

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      reacted: true,
      falseStart: state.falseStart,
      reactionMs: state.reactionMs,
      goAt: state.goAt,
      completed: true
    });
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "soccer_shootout") {
    if (action !== "kick" && action !== "shoot") {
      return { ok: false, message: "Invalid action for soccer match." };
    }

    const now = Date.now();
    if (now - Number(state.lastKickAt || 0) < 150) {
      return { ok: true, throttled: true };
    }

    const applied = updateSoccerBallKick(game, socketId, value);
    if (!applied.ok) {
      return applied;
    }
    broadcastSoccerMatchState(game);
    broadcastMiniGameProgress(game);
    return { ok: true };
  }

  if (state.type === "obstacle_dodge") {
    if (action !== "dodge") {
      return { ok: false, message: "Invalid action for obstacle dodge." };
    }

    if (state.step >= state.totalTurns) {
      return { ok: true, completed: true };
    }

    const lane = Number(value);
    if (!Number.isInteger(lane) || lane < 0 || lane > 2) {
      return { ok: false, message: "Invalid dodge lane." };
    }

    const obstacleLane = state.obstacles[state.step];
    const hit = lane === obstacleLane;
    state.lane = lane;
    state.lastObstacle = obstacleLane;
    state.lastHit = hit;
    if (hit) {
      state.hits += 1;
    }
    state.step += 1;

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      lane: state.lane,
      obstacleLane,
      hit,
      hits: state.hits,
      step: state.step,
      totalTurns: state.totalTurns,
      completed: state.step >= state.totalTurns
    });
    broadcastMiniGameProgress(game);

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
    broadcastMiniGameProgress(game);

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
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true };
  }

  if (state.type === "word_scramble") {
    if (action !== "guess") {
      return { ok: false, message: "Invalid action for word scramble." };
    }

    if (state.completed || state.solved || state.attempts >= state.maxAttempts) {
      return { ok: true, completed: true, solved: state.solved };
    }

    const guess = String(value || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, state.answer.length);

    if (!guess) {
      return { ok: false, message: "Enter a guess first." };
    }

    state.attempts += 1;
    state.lastGuess = guess;
    if (guess === state.answer) {
      state.solved = true;
    }

    if (state.solved || state.attempts >= state.maxAttempts) {
      state.completed = true;
    }

    io.to(socketId).emit("minigame:state", {
      type: state.type,
      attempts: state.attempts,
      maxAttempts: state.maxAttempts,
      solved: state.solved,
      completed: state.completed,
      lastGuess: guess,
      answer: state.completed ? state.answer : undefined
    });
    broadcastMiniGameProgress(game);

    if (allMiniGamesResolved(game)) {
      finalizeMiniGamePhase(game);
    }

    return { ok: true, solved: state.solved, completed: state.completed };
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
  game.questionEligiblePlayerIds = new Set();

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
    const eligible = submissions
      .filter((entry) => entry.correct === true)
      .map((entry) => entry.playerId)
      .filter((playerId, index, source) => source.indexOf(playerId) === index);
    const started = startMiniGamePhase(game, eligible, {
      durationMs: 10000
    });
    if (started) {
      return;
    }
  }

  startRoundSummary(game);
}

function finishGame(game) {
  game.phase = "finished";
  clearTimers(game);

  const leaderboard = sortedPlayers(game);
  const totalPlayers = leaderboard.length;
  for (const row of leaderboard) {
    const livePlayer = game.players.get(row.id);
    const accountKey = normalizeAccountKey(livePlayer?.accountKey || "");
    if (!accountKey) {
      continue;
    }

    const account = ensureAccount(accountKey);
    if (!account) {
      continue;
    }

    const reward = calculateCoinReward(row, row.rank, totalPlayers);
    account.coins += reward.total;
    account.gamesPlayed = Math.max(0, Number(account.gamesPlayed || 0)) + 1;
    account.totalCorrect = Math.max(0, Number(account.totalCorrect || 0)) + Math.max(0, Number(row.correctCount || 0));
    account.totalScore = Math.max(0, Number(account.totalScore || 0)) + Math.max(0, Number(row.score || 0));
    const currentBestRank = Math.max(0, Number(account.bestRank || 0));
    account.bestRank = currentBestRank > 0 ? Math.min(currentBestRank, row.rank) : row.rank;
    account.updatedAt = nowIso();

    io.to(row.id).emit("account:coinsAwarded", {
      reward,
      rank: row.rank,
      totalPlayers,
      account: publicAccountSummary(account)
    });
  }
  saveAccountsToDisk();

  io.to(game.code).emit("game:finished", {
    leaderboard
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
  game.questionEligiblePlayerIds = new Set(game.players.keys());
  game.chestPhase.clear();
  game.minigameType = null;
  game.minigameDifficulty = null;
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

function socketGoogleUser(socket) {
  return socket?.request?.session?.passport?.user || null;
}

function ensureSocketAuthenticated(socket, ack) {
  if (!GOOGLE_AUTH_ENABLED) {
    return true;
  }

  if (socketGoogleUser(socket)) {
    return true;
  }

  if (typeof ack === "function") {
    ack({ ok: false, message: "Login with Google first." });
  }
  return false;
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
  if (game.questionEligiblePlayerIds instanceof Set) {
    game.questionEligiblePlayerIds.delete(socketId);
  }
  game.chestPhase.delete(socketId);
  if (game.soccerMatch?.players && game.soccerMatch.players[socketId]) {
    delete game.soccerMatch.players[socketId];
  }

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

  if (game.phase === "question") {
    const requiredAnswers =
      game.questionEligiblePlayerIds instanceof Set && game.questionEligiblePlayerIds.size > 0
        ? game.questionEligiblePlayerIds.size
        : game.players.size;
    let submittedAnswers = 0;
    for (const submission of game.submissions.values()) {
      if (!(game.questionEligiblePlayerIds instanceof Set) || game.questionEligiblePlayerIds.size === 0) {
        submittedAnswers += 1;
        continue;
      }
      if (game.questionEligiblePlayerIds.has(submission.playerId)) {
        submittedAnswers += 1;
      }
    }

    if (requiredAnswers === 0 || submittedAnswers >= requiredAnswers) {
      closeQuestion(game);
    }
  }

  if (game.phase === "minigame") {
    if (game.chestPhase.size === 0 || (game.minigameType !== "tap_rush" && allMiniGamesResolved(game))) {
      finalizeMiniGamePhase(game);
    } else {
      if (game.minigameType === "soccer_shootout") {
        broadcastSoccerMatchState(game);
      }
      broadcastMiniGameProgress(game);
    }
  }
}

io.on("connection", (socket) => {
  socket.emit("room:activeCode", activeRoomSummary());

  socket.on("host:create", (payload, ack) => {
    if (!ensureSocketAuthenticated(socket, ack)) {
      return;
    }

    const hostName = sanitizeName(payload?.hostName || "Teacher");
    const mode = normalizeMode(payload?.mode);
    const questionSet = normalizeQuestionSet(payload?.questionSet);
    const timerSeconds = clamp(Number(payload?.timerSeconds) || 15, 8, 45);
    const questionCount = clamp(Number(payload?.questionCount) || 10, 5, 30);
    const miniGameRotationMode = normalizeMiniGameRotationMode(payload?.miniGameRotationMode);
    const miniGameDurationSec = clamp(Number(payload?.miniGameDurationSec) || 10, 5, 30);

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
        questionCount,
        miniGameRotationMode,
        miniGameDurationSec
      },
      players: new Map(),
      questions: pickQuestions(questionCount, questionSet),
      currentQuestionIndex: -1,
      submissions: new Map(),
      questionEligiblePlayerIds: new Set(),
      chestPhase: new Map(),
      feed: [],
      questionTimer: null,
      roundTimer: null,
      chestTimer: null,
      minigameTick: null,
      questionStartedAt: null,
      questionEndsAt: null,
      minigameType: null,
      minigameDifficulty: null,
      minigameDurationMs: 0,
      minigameStartedAt: null,
      minigameEndsAt: null,
      minigameReturnPhase: "round_summary",
      minigameRotationIndex: 0,
      soccerMatch: null
    };

    games.set(code, game);
    broadcastActiveRoom();
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
    game.settings.miniGameRotationMode = normalizeMiniGameRotationMode(
      settings?.miniGameRotationMode ?? game.settings.miniGameRotationMode
    );
    game.settings.miniGameDurationSec = clamp(
      Number(settings?.miniGameDurationSec) || game.settings.miniGameDurationSec || 10,
      5,
      30
    );
    game.questions = pickQuestions(game.settings.questionCount, game.settings.questionSet);
    game.minigameRotationIndex = 0;
    game.updatedAt = Date.now();

    broadcastLobby(game);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("player:join", (payload, ack) => {
    if (!ensureSocketAuthenticated(socket, ack)) {
      return;
    }

    const code = String(payload?.code || "").toUpperCase().trim();
    const playerName = sanitizeName(payload?.name || "");
    const game = games.get(code);
    const googleSocketKey = GOOGLE_AUTH_ENABLED && socketGoogleUser(socket)?.id ? `google:${socketGoogleUser(socket).id}` : "";
    const providedAccountKey = normalizeAccountKey(payload?.accountKey || "");
    const accountKey = normalizeAccountKey(googleSocketKey || providedAccountKey);
    const hasAccount = accountKey.length > 0;
    const account = hasAccount ? ensureAccount(accountKey) : null;
    const requestedBlookId = String(payload?.blookId || "").trim();
    let selectedBlook = null;

    if (!game) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game code not found." });
      }
      return;
    }

    if (game.phase === "finished") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Game already finished." });
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

    if (hasAccount && !account) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Invalid account." });
      }
      return;
    }

    if (hasAccount) {
      if (accountOwnsBlook(account, requestedBlookId)) {
        selectedBlook = { ...resolveBlookById(requestedBlookId) };
      } else if (accountOwnsBlook(account, account.selectedBlookId)) {
        selectedBlook = { ...resolveBlookById(account.selectedBlookId) };
      } else {
        const firstOwned = accountUnlockedBlooks(account)[0];
        if (firstOwned) {
          selectedBlook = { ...resolveBlookById(firstOwned.id) };
        }
      }

      if (!selectedBlook) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Open a pack first to unlock your first blook." });
        }
        return;
      }

      account.selectedBlookId = selectedBlook.id;
      account.updatedAt = nowIso();
      saveAccountsToDisk();
    } else {
      selectedBlook = { ...resolveBlookById(payload?.blookId) };
    }

    socket.join(game.code);
    markSocketGame(socket, game.code);

    game.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      blook: selectedBlook,
      accountKey: hasAccount ? account.id : "",
      score: 0,
      streak: 0,
      correctCount: 0,
      protectedTurns: 0,
      joinedAt: Date.now()
    });

    game.updatedAt = Date.now();

    if (game.phase === "lobby") {
      broadcastLobby(game);
    } else {
      io.to(game.code).emit("players:update", {
        players: sortedPlayers(game)
      });
      syncPlayerToCurrentPhase(game, socket.id);
    }
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
        blook: selectedBlook,
        phase: game.phase,
        account: hasAccount ? publicAccountSummary(account) : null
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

  socket.on("host:startMiniGameTest", ({ code, type }, ack) => {
    const game = games.get((code || "").toUpperCase());
    if (!canHost(socket, game)) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Not allowed." });
      }
      return;
    }

    if (game.phase !== "lobby" && game.phase !== "round_summary") {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Mini-game test can only run from lobby or round summary." });
      }
      return;
    }

    if (!isMiniGameType(type || "")) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Unknown mini-game type." });
      }
      return;
    }

    if (game.roundTimer) {
      clearTimeout(game.roundTimer);
      game.roundTimer = null;
    }

    const playerIds = Array.from(game.players.keys());
    const previewMode = playerIds.length === 0;
    startMiniGamePhase(game, playerIds, {
      type,
      returnPhase: "lobby",
      durationMs: 12000,
      allowEmpty: previewMode
    });

    if (typeof ack === "function") {
      ack({ ok: true, previewMode });
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

    const requiredAnswers =
      game.questionEligiblePlayerIds instanceof Set && game.questionEligiblePlayerIds.size > 0
        ? game.questionEligiblePlayerIds.size
        : game.players.size;
    let submittedAnswers = 0;
    for (const submission of game.submissions.values()) {
      if (!(game.questionEligiblePlayerIds instanceof Set) || game.questionEligiblePlayerIds.size === 0) {
        submittedAnswers += 1;
        continue;
      }
      if (game.questionEligiblePlayerIds.has(submission.playerId)) {
        submittedAnswers += 1;
      }
    }

    if (requiredAnswers > 0 && submittedAnswers >= requiredAnswers) {
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
