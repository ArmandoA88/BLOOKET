const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const { io } = require("socket.io-client");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.SMOKE_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const STUDENT_LOGIN_PASSWORD = "Arratia1!";
const SMOKE_STUDENT_USERNAMES = ["lenin", "nash"];
const MINI_GAME_TYPES = [
  "foosball_frenzy",
  "soccer_shootout",
  "goalie_rush",
  "tower_stacker",
  "space_invaders",
  "hallway_dash",
  "dino_dig",
  "shadow_match",
  "classroom_cleanup",
  "battle_royale"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
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

function requestJson(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlString);
    const transport = target.protocol === "https:" ? https : http;
    const body = options.body ? String(options.body) : "";
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (body && !headers["Content-Length"]) {
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    const request = transport.request(
      target,
      {
        method: options.method || "GET",
        headers
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          let payload = {};
          try {
            payload = raw ? JSON.parse(raw) : {};
          } catch (_error) {
            payload = {};
          }

          const setCookie = Array.isArray(response.headers["set-cookie"]) ? response.headers["set-cookie"] : [];
          const cookieHeader = setCookie.map((value) => String(value).split(";")[0]).join("; ");
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            statusCode: response.statusCode,
            payload,
            cookieHeader
          });
        });
      }
    );

    request.on("error", reject);
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

async function loginStudentSession(username) {
  const response = await requestJson(`${BASE_URL}/api/student-auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      password: STUDENT_LOGIN_PASSWORD
    })
  });

  if (!response.ok || !response.payload?.ok || !response.cookieHeader) {
    throw new Error(response.payload?.message || `Student login failed for ${username}`);
  }

  return response.cookieHeader;
}

async function connectSocket(label, cookieHeader = "") {
  const socket = io(BASE_URL, {
    transports: ["websocket"],
    reconnection: false,
    timeout: 8000,
    extraHeaders: cookieHeader ? { Cookie: cookieHeader } : undefined
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

  if (type === "goalie_rush") {
    const deadline = Date.now() + 2900;
    let lane = 1;
    while (Date.now() < deadline) {
      lane = (lane + 1) % 3;
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: "set_lane",
        value: { lane }
      }).catch(() => {});
      await emitAck(studentB, "player:minigameAction", {
        code,
        action: "set_lane",
        value: { lane: (lane + 1) % 3 }
      }).catch(() => {});
      await sleep(140);
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
    return;
  }

  if (type === "hallway_dash") {
    const deadline = Date.now() + 2600;
    let step = 0;
    while (Date.now() < deadline) {
      const actionA = step % 3 === 0 ? "jump" : "move_lane";
      const valueA = actionA === "jump" ? undefined : { direction: step % 2 === 0 ? "left" : "right" };
      const actionB = step % 4 === 0 ? "jump" : "move_lane";
      const valueB = actionB === "jump" ? undefined : { direction: step % 2 === 0 ? "right" : "left" };
      await emitAck(studentA, "player:minigameAction", { code, action: actionA, value: valueA });
      await emitAck(studentB, "player:minigameAction", { code, action: actionB, value: valueB });
      step += 1;
      await sleep(170);
    }
    return;
  }

  if (type === "dino_dig") {
    const maxDigs = Math.max(1, Number(dataA?.maxDigs || dataB?.maxDigs || 7));
    const boardLength = Math.max(1, Number(dataA?.board?.length || dataB?.board?.length || 16));
    for (let dig = 0; dig < maxDigs; dig += 1) {
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: "dig",
        value: dig % boardLength
      });
      await emitAck(studentB, "player:minigameAction", {
        code,
        action: "dig",
        value: (dig + 1) % boardLength
      });
    }
    return;
  }

  if (type === "shadow_match") {
    const deadline = Date.now() + 2800;
    const cardCount = Math.max(2, Number(dataA?.cards?.length || dataB?.cards?.length || 12));
    while (Date.now() < deadline) {
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: "flip_tile",
        value: { index: randomInt(0, cardCount - 1) }
      }).catch(() => {});
      await emitAck(studentB, "player:minigameAction", {
        code,
        action: "flip_tile",
        value: { index: randomInt(0, cardCount - 1) }
      }).catch(() => {});
      await sleep(140);
    }
    return;
  }

  if (type === "classroom_cleanup") {
    const deadline = Date.now() + 3000;
    let step = 0;
    const bins = ["book", "pencil", "trash"];
    while (Date.now() < deadline) {
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: step % 2 === 0 ? "move_lane" : "sort_item",
        value: step % 2 === 0 ? { direction: step % 4 === 0 ? "left" : "right" } : { bin: bins[step % bins.length] }
      }).catch(() => {});
      await emitAck(studentB, "player:minigameAction", {
        code,
        action: step % 3 === 0 ? "move_lane" : "sort_item",
        value: step % 3 === 0 ? { direction: step % 2 === 0 ? "right" : "left" } : { bin: bins[(step + 1) % bins.length] }
      }).catch(() => {});
      step += 1;
      await sleep(160);
    }
    return;
  }

  if (type === "battle_royale") {
    const deadline = Date.now() + 5200;
    let step = 0;
    while (Date.now() < deadline) {
      const actionA =
        step === 0 && dataA?.you?.specialReady
          ? "special"
          : Number(dataA?.you?.hp || 0) <= Number(dataA?.you?.maxHp || 1) * 0.45
            ? "heal"
            : step % 3 === 2
              ? "guard"
              : "attack";
      const actionB =
        step === 0 && dataB?.you?.specialReady
          ? "special"
          : Number(dataB?.you?.hp || 0) <= Number(dataB?.you?.maxHp || 1) * 0.45
            ? "heal"
            : step % 2 === 0
              ? "attack"
              : "guard";

      await emitAck(studentA, "player:minigameAction", { code, action: actionA }).catch(() => {});
      await emitAck(studentB, "player:minigameAction", { code, action: actionB }).catch(() => {});
      step += 1;
      await sleep(320);
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

    const [studentACookie, studentBCookie] = await Promise.all([
      loginStudentSession(SMOKE_STUDENT_USERNAMES[0]),
      loginStudentSession(SMOKE_STUDENT_USERNAMES[1])
    ]);

    host = await connectSocket("host");
    studentA = await connectSocket("studentA", studentACookie);
    studentB = await connectSocket("studentB", studentBCookie);

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

    const createdAsteroids = await emitAck(host, "host:create", {
      hostName: "SmokeAsteroids",
      mode: "asteroids",
      questionSet: "multiplication_1_digit",
      timerSeconds: 10,
      questionCount: 5,
      miniGameRotationMode: "off",
      miniGameDurationSec: 6
    });

    const asteroidsCode = createdAsteroids.code;
    await emitAck(studentA, "player:join", { code: asteroidsCode, name: "Ava3" });
    await emitAck(studentB, "player:join", { code: asteroidsCode, name: "Ben3" });

    const asteroidsQuestion1A = waitForEvent(studentA, "question:start", {
      timeoutMs: 12000,
      predicate: (payload) => payload?.mode === "asteroids" && Number(payload?.questionIndex || 0) === 1
    });
    const asteroidsQuestion1B = waitForEvent(studentB, "question:start", {
      timeoutMs: 12000,
      predicate: (payload) => payload?.mode === "asteroids" && Number(payload?.questionIndex || 0) === 1
    });
    const asteroidsQuestion2A = waitForEvent(studentA, "question:start", {
      timeoutMs: 22000,
      predicate: (payload) => payload?.mode === "asteroids" && Number(payload?.questionIndex || 0) === 2
    });
    const asteroidsQuestion2B = waitForEvent(studentB, "question:start", {
      timeoutMs: 22000,
      predicate: (payload) => payload?.mode === "asteroids" && Number(payload?.questionIndex || 0) === 2
    });

    await emitAck(host, "host:start", { code: asteroidsCode });

    const asteroidsPayload1 = await asteroidsQuestion1A;
    await asteroidsQuestion1B;
    const asteroidsAnswer1 = solveMultiplication(asteroidsPayload1);
    const asteroidsAck1 = await emitAck(studentA, "player:answer", { code: asteroidsCode, answerIndex: asteroidsAnswer1 });
    await emitAck(studentB, "player:answer", { code: asteroidsCode, answerIndex: asteroidsAnswer1 });
    if (!asteroidsAck1?.asteroidBlast || Number(asteroidsAck1.asteroidBlast.blasts || 0) <= 0) {
      throw new Error("Asteroids mode did not return a blast result for a correct answer.");
    }

    const asteroidsPayload2 = await asteroidsQuestion2A;
    await asteroidsQuestion2B;
    const asteroidsAnswer2 = solveMultiplication(asteroidsPayload2);
    const asteroidsAck2 = await emitAck(studentA, "player:answer", { code: asteroidsCode, answerIndex: asteroidsAnswer2 });
    await emitAck(studentB, "player:answer", { code: asteroidsCode, answerIndex: asteroidsAnswer2 });
    if (Number(asteroidsAck2?.streakCoinsAwarded || 0) <= 0) {
      throw new Error("Asteroids mode did not award streak coins on a combo answer.");
    }

    await emitAck(host, "host:end", { code: asteroidsCode });

    console.log("\nSMOKE TEST PASSED");
    console.log(`- server: ${BASE_URL}`);
    console.log("- quiz flow verified: host:start + student answers");
    console.log(`- mini-game test verified: ${MINI_GAME_TYPES.join(", ")}`);
    console.log("- default round mini-game verified: foosball_frenzy");
    console.log("- mini-game rotation mode off verified: question goes straight to round summary");
    console.log("- asteroids mode verified: blast payloads + streak coin rewards");
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
