const { spawn } = require("child_process");
const path = require("path");
const { io } = require("socket.io-client");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.DEMO_PORT || 3000);
const BASE_URL = process.env.DEMO_URL || `http://127.0.0.1:${PORT}`;
const STUDENT_COUNT = Math.max(2, Number(process.env.DEMO_STUDENTS || 10));
const QUESTION_COUNT = Math.max(5, Number(process.env.DEMO_QUESTIONS || 5));
const TIMER_SECONDS = Math.max(8, Number(process.env.DEMO_TIMER || 8));
const MODE = process.env.DEMO_MODE || "classic";
const ACCURACY = Math.min(1, Math.max(0, Number(process.env.DEMO_ACCURACY || 0.78)));
const DEMO_CODE = String(process.env.DEMO_CODE || "")
  .trim()
  .toUpperCase();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function healthcheck() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      return false;
    }
    const payload = await response.json();
    return payload?.ok === true;
  } catch (_error) {
    return false;
  }
}

async function waitForHealth(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await healthcheck()) {
      return true;
    }
    await sleep(300);
  }
  return false;
}

function emitAck(socket, eventName, payload, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Ack timeout for '${eventName}'`));
    }, timeoutMs);

    socket.emit(eventName, payload, (ack) => {
      clearTimeout(timer);
      if (!ack || ack.ok === false) {
        reject(new Error(ack?.message || `Ack failed for '${eventName}'`));
        return;
      }
      resolve(ack);
    });
  });
}

async function connectSocket(label) {
  const socket = io(BASE_URL, {
    transports: ["websocket"],
    reconnection: false,
    timeout: 8000
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Socket timeout: ${label}`));
    }, 9000);

    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Socket connect_error (${label}): ${error?.message || "unknown"}`));
    });
  });

  return socket;
}

function parseMultiplicationAnswer(questionPayload) {
  const prompt = questionPayload?.question?.prompt || "";
  const options = Array.isArray(questionPayload?.question?.options) ? questionPayload.question.options : [];
  const match = prompt.match(/What is\s+(\d+)\s+x\s+(\d+)\?/i);

  if (!match || options.length === 0) {
    return Math.floor(Math.random() * Math.max(1, options.length));
  }

  const correctValue = String(Number(match[1]) * Number(match[2]));
  const correctIndex = options.findIndex((opt) => String(opt) === correctValue);
  return correctIndex >= 0 ? correctIndex : 0;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function loadBlookIds() {
  try {
    const response = await fetch(`${BASE_URL}/api/blooks`);
    if (!response.ok) {
      throw new Error("blooks api failed");
    }

    const payload = await response.json();
    const ids = [];
    for (const pack of payload?.packs || []) {
      for (const blook of pack?.blooks || []) {
        if (blook?.id) {
          ids.push(String(blook.id));
        }
      }
    }
    return ids;
  } catch (_error) {
    return [];
  }
}

function randomBlookId(allIds) {
  if (!Array.isArray(allIds) || allIds.length === 0) {
    return undefined;
  }
  return allIds[randomInt(0, allIds.length - 1)];
}

function makeBot(name, socket, code) {
  return {
    name,
    socket,
    code,
    activeIntervals: new Set(),
    activeTimeouts: new Set(),
    resolvedMiniGame: false
  };
}

function clearBotTimers(bot) {
  for (const id of bot.activeIntervals) {
    clearInterval(id);
  }
  bot.activeIntervals.clear();
  for (const id of bot.activeTimeouts) {
    clearTimeout(id);
  }
  bot.activeTimeouts.clear();
}

function scheduleTimeout(bot, fn, ms) {
  const id = setTimeout(() => {
    bot.activeTimeouts.delete(id);
    fn();
  }, ms);
  bot.activeTimeouts.add(id);
}

function scheduleInterval(bot, fn, ms) {
  const id = setInterval(fn, ms);
  bot.activeIntervals.add(id);
  return id;
}

function autoPlaySoccer(bot, totalShots) {
  let shots = 0;
  const maxShots = Number(totalShots) > 0 ? Number(totalShots) : 5;

  const intervalId = scheduleInterval(bot, async () => {
    if (shots >= maxShots || bot.resolvedMiniGame) {
      clearInterval(intervalId);
      bot.activeIntervals.delete(intervalId);
      return;
    }

    shots += 1;
    const lane = randomInt(0, 2);
    const power = randomInt(1, 3);
    try {
      await emitAck(bot.socket, "player:minigameAction", {
        code: bot.code,
        action: "shoot",
        value: { lane, power }
      });
    } catch (_error) {
      // Ignore action races when timer ends.
    }
  }, 420 + randomInt(10, 90));
}

function autoPlayTapRush(bot) {
  const intervalId = scheduleInterval(bot, async () => {
    if (bot.resolvedMiniGame) {
      clearInterval(intervalId);
      bot.activeIntervals.delete(intervalId);
      return;
    }

    try {
      await emitAck(bot.socket, "player:minigameAction", {
        code: bot.code,
        action: "tap"
      });
    } catch (_error) {
      // Ignore action races when timer ends.
    }
  }, 75 + randomInt(0, 55));
}

function autoPlayReaction(bot, goAt) {
  const target = Number(goAt || Date.now() + 1400);
  const waitMs = Math.max(80, target - Date.now() + randomInt(40, 180));
  scheduleTimeout(bot, async () => {
    if (bot.resolvedMiniGame) {
      return;
    }
    try {
      await emitAck(bot.socket, "player:minigameAction", {
        code: bot.code,
        action: "react"
      });
    } catch (_error) {
      // Ignore action races when timer ends.
    }
  }, waitMs);
}

function autoPlaySequence(bot, sequence) {
  const seq = Array.isArray(sequence) ? sequence : [];

  let step = 0;
  const playStep = async () => {
    if (bot.resolvedMiniGame || step >= seq.length) {
      return;
    }

    const expected = seq[step];
    const shouldHit = Math.random() < 0.88;
    const value = shouldHit ? expected : randomInt(0, 3);

    try {
      await emitAck(bot.socket, "player:minigameAction", {
        code: bot.code,
        action: "step",
        value
      });
    } catch (_error) {
      // Ignore action races when timer ends.
    }

    if (shouldHit) {
      step += 1;
    }

    if (!bot.resolvedMiniGame && step < seq.length) {
      scheduleTimeout(bot, playStep, 240 + randomInt(30, 130));
    }
  };

  scheduleTimeout(bot, playStep, 220 + randomInt(10, 80));
}

function autoPlayObstacle(bot, totalTurns) {
  const turns = Number(totalTurns) > 0 ? Number(totalTurns) : 8;
  let step = 0;
  const playTurn = async () => {
    if (bot.resolvedMiniGame || step >= turns) {
      return;
    }

    step += 1;
    try {
      await emitAck(bot.socket, "player:minigameAction", {
        code: bot.code,
        action: "dodge",
        value: randomInt(0, 2)
      });
    } catch (_error) {
      // Ignore action races when timer ends.
    }

    if (!bot.resolvedMiniGame && step < turns) {
      scheduleTimeout(bot, playTurn, 220 + randomInt(30, 130));
    }
  };

  scheduleTimeout(bot, playTurn, 180 + randomInt(10, 70));
}

function autoPlayPrecision(bot, target) {
  const t = Number.isFinite(Number(target)) ? Number(target) : 50;
  const attempt = Math.max(0, Math.min(100, t + randomInt(-8, 8)));

  scheduleTimeout(bot, async () => {
    if (bot.resolvedMiniGame) {
      return;
    }
    try {
      await emitAck(bot.socket, "player:minigameAction", {
        code: bot.code,
        action: "stop",
        value: attempt
      });
    } catch (_error) {
      // Ignore action races when timer ends.
    }
  }, 1500 + randomInt(150, 1900));
}

function autoPlayScramble(bot, maxAttempts) {
  const attempts = Number(maxAttempts) > 0 ? Number(maxAttempts) : 4;
  let used = 0;
  const tryGuess = async () => {
    if (bot.resolvedMiniGame || used >= attempts) {
      return;
    }

    used += 1;
    const samples = ["MATH", "CLASS", "BLOOK", "QUIZ", "CHROME"];
    const guess = samples[randomInt(0, samples.length - 1)];
    try {
      await emitAck(bot.socket, "player:minigameAction", {
        code: bot.code,
        action: "guess",
        value: guess
      });
    } catch (_error) {
      // Ignore action races when timer ends.
    }

    if (!bot.resolvedMiniGame && used < attempts) {
      scheduleTimeout(bot, tryGuess, 260 + randomInt(40, 130));
    }
  };

  scheduleTimeout(bot, tryGuess, 280 + randomInt(20, 80));
}

function wireBotGameplay(bot) {
  bot.socket.on("question:start", (payload) => {
    const correctIndex = parseMultiplicationAnswer(payload);
    const optionCount = payload?.question?.options?.length || 4;
    const chosenIndex =
      Math.random() < ACCURACY ? correctIndex : randomInt(0, Math.max(0, optionCount - 1));

    const jitterMs = randomInt(500, Math.max(900, TIMER_SECONDS * 1000 - 700));
    scheduleTimeout(bot, async () => {
      try {
        await emitAck(bot.socket, "player:answer", {
          code: bot.code,
          answerIndex: chosenIndex
        });
      } catch (_error) {
        // Ignore races at question timeout.
      }
    }, jitterMs);
  });

  bot.socket.on("minigame:yourData", (payload) => {
    bot.resolvedMiniGame = false;
    clearBotTimers(bot);

    const type = payload?.type;
    if (type === "soccer_shootout") {
      autoPlaySoccer(bot, payload?.data?.totalShots);
      return;
    }
    if (type === "tap_rush") {
      autoPlayTapRush(bot);
      return;
    }
    if (type === "reaction_duel") {
      autoPlayReaction(bot, payload?.data?.goAt);
      return;
    }
    if (type === "sequence_memory") {
      autoPlaySequence(bot, payload?.data?.sequence);
      return;
    }
    if (type === "obstacle_dodge") {
      autoPlayObstacle(bot, payload?.data?.totalTurns);
      return;
    }
    if (type === "precision_stop") {
      autoPlayPrecision(bot, payload?.data?.target);
      return;
    }
    if (type === "word_scramble") {
      autoPlayScramble(bot, payload?.data?.maxAttempts);
    }
  });

  bot.socket.on("minigame:resolved", () => {
    bot.resolvedMiniGame = true;
    clearBotTimers(bot);
  });

  bot.socket.on("game:finished", () => {
    bot.resolvedMiniGame = true;
    clearBotTimers(bot);
  });
}

async function run() {
  let serverProcess = null;
  const sockets = [];
  const bots = [];
  let host = null;
  let code = DEMO_CODE;

  try {
    const healthyBefore = await healthcheck();
    if (!healthyBefore) {
      console.log(`No server at ${BASE_URL}, starting one...`);
      serverProcess = spawn(process.execPath, ["server.js"], {
        cwd: ROOT,
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"]
      });

      serverProcess.stdout.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
      serverProcess.stderr.on("data", (chunk) => process.stderr.write(`[server:err] ${chunk}`));

      const healthyAfter = await waitForHealth(25000);
      if (!healthyAfter) {
        throw new Error(`Server failed healthcheck at ${BASE_URL}`);
      }
    }

    const blookIds = await loadBlookIds();

    if (!code) {
      host = await connectSocket("host-bot");
      sockets.push(host);

      const created = await emitAck(host, "host:create", {
        hostName: "AutoDemoHost",
        mode: MODE,
        questionSet: "multiplication_1_digit",
        timerSeconds: TIMER_SECONDS,
        questionCount: QUESTION_COUNT
      });

      code = created.code;
    }

    console.log(`\nDEMO ROOM READY`);
    console.log(`- Base URL: ${BASE_URL}`);
    console.log(`- Code: ${code}`);
    console.log(`- Students: ${STUDENT_COUNT}`);
    if (!DEMO_CODE) {
      console.log(`- Questions: ${QUESTION_COUNT}`);
    }
    console.log(`- Mini-game rotation: soccer -> tap -> sequence -> precision`);
    console.log(`- Watch student screen: ${BASE_URL}/play.html?code=${code}\n`);

    let finishedResolve;
    const finishedPromise = new Promise((resolve) => {
      finishedResolve = resolve;
    });

    if (host) {
      host.on("question:start", (payload) => {
        console.log(`Q${payload?.questionIndex}/${payload?.totalQuestions}: ${payload?.question?.prompt || "Question"}`);
      });

      host.on("minigame:start", (payload) => {
        console.log(`Mini-game: ${payload?.type || "unknown"} (${payload?.eligiblePlayerIds?.length || 0} players)`);
      });

      host.on("round:summary", (payload) => {
        console.log(`Round complete: ${payload?.questionIndex}/${payload?.totalQuestions}`);
      });

      host.on("game:finished", () => {
        console.log("\nDEMO COMPLETE: game finished.\n");
        finishedResolve();
      });

      host.on("game:ended", () => {
        finishedResolve();
      });
    }

    for (let i = 0; i < STUDENT_COUNT; i += 1) {
      const socket = await connectSocket(`bot-${i + 1}`);
      sockets.push(socket);
      const name = `Bot${String(i + 1).padStart(2, "0")}`;
      const blookId = randomBlookId(blookIds);

      await emitAck(socket, "player:join", {
        code,
        name,
        blookId
      });

      const bot = makeBot(name, socket, code);
      wireBotGameplay(bot);
      bots.push(bot);

      if (i === 0) {
        socket.on("question:start", (payload) => {
          if (!host) {
            console.log(`Q${payload?.questionIndex}/${payload?.totalQuestions}: ${payload?.question?.prompt || "Question"}`);
          }
        });
        socket.on("minigame:yourData", (payload) => {
          if (!host) {
            console.log(`Mini-game: ${payload?.type || "unknown"}`);
          }
        });
        socket.on("round:summary", (payload) => {
          if (!host) {
            console.log(`Round complete: ${payload?.questionIndex}/${payload?.totalQuestions}`);
          }
        });
        socket.on("game:finished", () => {
          if (!host) {
            console.log("\nDEMO COMPLETE: game finished.\n");
            finishedResolve();
          }
        });
        socket.on("game:ended", () => {
          if (!host) {
            finishedResolve();
          }
        });
      }
    }

    if (host) {
      console.log(`Joined ${bots.length} bots. Starting in 2 seconds...`);
      await sleep(2000);
      await emitAck(host, "host:start", { code });
    } else {
      console.log(`Joined ${bots.length} bots to room ${code}.`);
      console.log("Start the game from your host dashboard to watch realtime autoplay.");
    }

    await finishedPromise;
    await sleep(800);
  } finally {
    for (const bot of bots) {
      clearBotTimers(bot);
    }
    for (const socket of sockets) {
      socket.close();
    }

    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      await sleep(500);
      if (!serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
    }
  }
}

run().catch((error) => {
  console.error("\nAUTO DEMO FAILED");
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
