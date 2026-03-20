const { spawn } = require("child_process");
const path = require("path");
const { io } = require("socket.io-client");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.SMOKE_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MINI_GAME_TYPES = [
  "foosball_frenzy",
  "soccer_shootout",
  "tower_stacker",
  "space_invaders"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        const payload = await response.json();
        if (payload?.ok) {
          return;
        }
      }
    } catch (_error) {
      // Server may still be booting.
    }

    await sleep(250);
  }

  throw new Error(`Server did not become healthy at ${BASE_URL}/health`);
}

function waitForEvent(socket, eventName, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;
  const predicate = options.predicate || (() => true);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for '${eventName}'`));
    }, timeoutMs);

    const onEvent = (payload) => {
      let match = false;
      try {
        match = predicate(payload);
      } catch (error) {
        clearTimeout(timer);
        socket.off(eventName, onEvent);
        reject(error);
        return;
      }

      if (!match) {
        return;
      }

      clearTimeout(timer);
      socket.off(eventName, onEvent);
      resolve(payload);
    };

    socket.on(eventName, onEvent);
  });
}

function emitAck(socket, eventName, payload, timeoutMs = 10000) {
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
      reject(new Error(`Socket connect timeout: ${label}`));
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

function solveMultiplication(questionPayload) {
  const prompt = questionPayload?.question?.prompt || "";
  const options = questionPayload?.question?.options || [];
  const match = prompt.match(/What is\s+(\d+)\s+x\s+(\d+)\?/i);

  if (!match) {
    return 0;
  }

  const answer = String(Number(match[1]) * Number(match[2]));
  const index = options.findIndex((option) => String(option) === answer);
  return index >= 0 ? index : 0;
}

async function playMiniGameActions(type, code, studentA, studentB, dataA, dataB) {
  if (type === "foosball_frenzy") {
    const deadline = Date.now() + 2600;
    let lane = 0;
    while (Date.now() < deadline) {
      lane = (lane + 1) % 3;
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: "set_lane",
        value: { lane }
      });
      await emitAck(studentB, "player:minigameAction", {
        code,
        action: "set_lane",
        value: { lane: (lane + 1) % 3 }
      });
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: "kick",
        value: { lane, power: 2 }
      });
      await emitAck(studentB, "player:minigameAction", {
        code,
        action: "kick",
        value: { lane: (lane + 2) % 3, power: 2 }
      });
      await sleep(110);
    }
    return;
  }

  if (type === "soccer_shootout") {
    const deadline = Date.now() + 2800;
    while (Date.now() < deadline) {
      try {
        await emitAck(studentA, "player:minigameAction", {
          code,
          action: "shoot",
          value: { power: 2, direction: 0 }
        });
      } catch (error) {
        const message = String(error?.message || error);
        if (!message.includes("Move closer to the ball")) {
          throw error;
        }
      }

      try {
        await emitAck(studentB, "player:minigameAction", {
          code,
          action: "shoot",
          value: { power: 2, direction: 0 }
        });
      } catch (error) {
        const message = String(error?.message || error);
        if (!message.includes("Move closer to the ball")) {
          throw error;
        }
      }
      await sleep(120);
    }
    return;
  }

  if (type === "space_invaders") {
    await sleep(1200);
    return;
  }

  if (type === "tower_stacker") {
    await emitAck(studentA, "player:minigameAction", { code, action: "set_theme", value: { theme: "cats" } });
    await emitAck(studentB, "player:minigameAction", { code, action: "set_theme", value: { theme: "dogs" } });
    await sleep(220);
    await emitAck(studentA, "player:minigameAction", { code, action: "drop" });
    await sleep(180);
    await emitAck(studentB, "player:minigameAction", { code, action: "drop" });
    await sleep(1400);
    return;
  }

  if (type === "tap_rush") {
    const deadline = Date.now() + 2300;
    while (Date.now() < deadline) {
      await emitAck(studentA, "player:minigameAction", { code, action: "tap" });
      await emitAck(studentB, "player:minigameAction", { code, action: "tap" });
      await sleep(80);
    }
    return;
  }

  if (type === "reaction_duel") {
    const goAtA = Number(dataA?.goAt || Date.now() + 1500);
    const goAtB = Number(dataB?.goAt || Date.now() + 1500);
    const waitMs = Math.max(goAtA, goAtB) - Date.now() + 120;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    await emitAck(studentA, "player:minigameAction", { code, action: "react" });
    await emitAck(studentB, "player:minigameAction", { code, action: "react" });
    return;
  }

  if (type === "sequence_memory") {
    const sequenceA = Array.isArray(dataA?.sequence) ? dataA.sequence : [];
    const sequenceB = Array.isArray(dataB?.sequence) ? dataB.sequence : [];
    const total = Math.max(sequenceA.length, sequenceB.length);

    for (let i = 0; i < total; i += 1) {
      if (sequenceA[i] !== undefined) {
        await emitAck(studentA, "player:minigameAction", {
          code,
          action: "step",
          value: sequenceA[i]
        });
      }
      if (sequenceB[i] !== undefined) {
        await emitAck(studentB, "player:minigameAction", {
          code,
          action: "step",
          value: sequenceB[i]
        });
      }
    }
    return;
  }

  if (type === "obstacle_dodge") {
    const totalTurns = Math.max(1, Number(dataA?.totalTurns || dataB?.totalTurns || 8));
    for (let turn = 0; turn < totalTurns; turn += 1) {
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: "dodge",
        value: turn % 3
      });
      await emitAck(studentB, "player:minigameAction", {
        code,
        action: "dodge",
        value: (turn + 1) % 3
      });
    }
    return;
  }

  if (type === "precision_stop") {
    const valueA = Number.isFinite(Number(dataA?.target)) ? Number(dataA.target) : 50;
    const valueB = Number.isFinite(Number(dataB?.target)) ? Number(dataB.target) : 50;
    await emitAck(studentA, "player:minigameAction", { code, action: "stop", value: valueA });
    await emitAck(studentB, "player:minigameAction", { code, action: "stop", value: valueB });
    return;
  }

  if (type === "word_scramble") {
    const attempts = Math.max(1, Number(dataA?.maxAttempts || dataB?.maxAttempts || 4));
    for (let i = 0; i < attempts; i += 1) {
      await emitAck(studentA, "player:minigameAction", { code, action: "guess", value: "AAAAA" });
      await emitAck(studentB, "player:minigameAction", { code, action: "guess", value: "BBBBB" });
    }
  }
}

async function runMiniGameTestRound(type, code, host, studentA, studentB) {
  const miniStart = waitForEvent(host, "minigame:start", {
    timeoutMs: 15000,
    predicate: (payload) => payload?.type === type
  });
  const hostProgress = waitForEvent(host, "minigame:progress", {
    timeoutMs: 15000,
    predicate: (payload) => payload?.type === type && Array.isArray(payload?.players)
  });
  const lobbyBack = waitForEvent(host, "lobby:update", {
    timeoutMs: 25000,
    predicate: (payload) => payload?.code === code
  });
  const aDataPromise = waitForEvent(studentA, "minigame:yourData", {
    timeoutMs: 15000,
    predicate: (payload) => payload?.type === type
  });
  const bDataPromise = waitForEvent(studentB, "minigame:yourData", {
    timeoutMs: 15000,
    predicate: (payload) => payload?.type === type
  });
  const aResolved = waitForEvent(studentA, "minigame:resolved", { timeoutMs: 25000 });
  const bResolved = waitForEvent(studentB, "minigame:resolved", { timeoutMs: 25000 });

  await emitAck(host, "host:startMiniGameTest", {
    code,
    type,
    durationMs: 3500
  });

  await miniStart;
  await hostProgress;
  const aData = await aDataPromise;
  const bData = await bDataPromise;

  await playMiniGameActions(type, code, studentA, studentB, aData?.data, bData?.data);
  await aResolved;
  await bResolved;
  await lobbyBack;
}

async function run() {
  const server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stdout.on("data", (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });

  server.stderr.on("data", (chunk) => {
    process.stderr.write(`[server:err] ${chunk}`);
  });

  let host;
  let studentA;
  let studentB;

  try {
    await waitForHealth();

    host = await connectSocket("host");
    studentA = await connectSocket("studentA");
    studentB = await connectSocket("studentB");

    const created = await emitAck(host, "host:create", {
      hostName: "SmokeHost",
      mode: "classic",
      questionSet: "multiplication_1_digit",
      timerSeconds: 10,
      questionCount: 5
    });

    const code = created.code;

    await emitAck(studentA, "player:join", { code, name: "Ava" });
    await emitAck(studentB, "player:join", { code, name: "Ben" });

    for (const type of MINI_GAME_TYPES) {
      await runMiniGameTestRound(type, code, host, studentA, studentB);
    }

    const aQuestion = waitForEvent(studentA, "question:start", { timeoutMs: 12000 });
    const bQuestion = waitForEvent(studentB, "question:start", { timeoutMs: 12000 });
    const hostMiniStart = waitForEvent(host, "minigame:start", {
      timeoutMs: 20000,
      predicate: (payload) => payload?.type === "foosball_frenzy"
    });

    await emitAck(host, "host:start", { code });

    const questionPayload = await aQuestion;
    await bQuestion;

    const correctIndex = solveMultiplication(questionPayload);
    await emitAck(studentA, "player:answer", { code, answerIndex: correctIndex });
    await emitAck(studentB, "player:answer", { code, answerIndex: correctIndex });
    await hostMiniStart;

    await emitAck(host, "host:end", { code });

    const createdNoMini = await emitAck(host, "host:create", {
      hostName: "SmokeHost2",
      mode: "classic",
      questionSet: "multiplication_1_digit",
      timerSeconds: 10,
      questionCount: 5,
      miniGameRotationMode: "off",
      miniGameDurationSec: 6
    });

    const noMiniCode = createdNoMini.code;
    await emitAck(studentA, "player:join", { code: noMiniCode, name: "Ava2" });
    await emitAck(studentB, "player:join", { code: noMiniCode, name: "Ben2" });

    const noMiniQuestionA = waitForEvent(studentA, "question:start", { timeoutMs: 12000 });
    const noMiniQuestionB = waitForEvent(studentB, "question:start", { timeoutMs: 12000 });
    const noMiniRoundSummary = waitForEvent(host, "round:summary", { timeoutMs: 12000 });
    const noMiniStart = waitForEvent(host, "minigame:start", { timeoutMs: 4500 })
      .then((payload) => ({ triggered: true, payload }))
      .catch((error) => ({ triggered: false, error }));

    await emitAck(host, "host:start", { code: noMiniCode });

    const noMiniQuestionPayload = await noMiniQuestionA;
    await noMiniQuestionB;

    const noMiniAnswer = solveMultiplication(noMiniQuestionPayload);
    await emitAck(studentA, "player:answer", { code: noMiniCode, answerIndex: noMiniAnswer });
    await emitAck(studentB, "player:answer", { code: noMiniCode, answerIndex: noMiniAnswer });

    await noMiniRoundSummary;
    const noMiniResult = await noMiniStart;
    if (noMiniResult.triggered) {
      throw new Error("Mini-game fired even though mini-game rotation mode is off.");
    }
    const noMiniMessage = String(noMiniResult.error?.message || noMiniResult.error || "");
    if (!noMiniMessage.includes("Timed out waiting for 'minigame:start'")) {
      throw noMiniResult.error;
    }

    await emitAck(host, "host:end", { code: noMiniCode });

    console.log("\nSMOKE TEST PASSED");
    console.log(`- server: ${BASE_URL}`);
    console.log("- quiz flow verified: host:start + student answers");
    console.log(`- mini-game test verified: ${MINI_GAME_TYPES.join(", ")}`);
    console.log("- default round mini-game verified: foosball_frenzy");
    console.log("- mini-game rotation mode off verified: question goes straight to round summary");
    console.log("- multiplayer flow: host + 2 students");
  } finally {
    if (host) host.close();
    if (studentA) studentA.close();
    if (studentB) studentB.close();

    if (!server.killed) {
      server.kill("SIGTERM");
      await sleep(600);
      if (!server.killed) {
        server.kill("SIGKILL");
      }
    }
  }
}

run().catch((error) => {
  console.error("\nSMOKE TEST FAILED");
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
