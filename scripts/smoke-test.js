const { spawn } = require("child_process");
const path = require("path");
const { io } = require("socket.io-client");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.SMOKE_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) {
        const body = await res.json();
        if (body?.ok) {
          return;
        }
      }
    } catch (_error) {
      // Server may still be booting.
    }

    await sleep(250);
  }

  throw new Error(`Server did not become healthy at ${BASE_URL}/health within ${timeoutMs}ms`);
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
      let ok = false;
      try {
        ok = predicate(payload);
      } catch (error) {
        clearTimeout(timer);
        socket.off(eventName, onEvent);
        reject(error);
        return;
      }

      if (!ok) {
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
        const message = ack?.message || `Unknown error for ${eventName}`;
        reject(new Error(message));
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
      reject(new Error(`Socket connect timeout for ${label}`));
    }, 9000);

    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });

    socket.once("connect_error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Socket connect_error (${label}): ${err?.message || "unknown"}`));
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

  const left = Number(match[1]);
  const right = Number(match[2]);
  const answer = String(left * right);
  const answerIndex = options.findIndex((opt) => String(opt) === answer);

  return answerIndex >= 0 ? answerIndex : 0;
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
      mode: "gold",
      questionSet: "multiplication_1_digit",
      timerSeconds: 12,
      questionCount: 5
    });

    const code = created.code;

    await emitAck(studentA, "player:join", { code, name: "Ava" });
    await emitAck(studentB, "player:join", { code, name: "Ben" });

    const hostMiniStart = waitForEvent(host, "minigame:start", { timeoutMs: 20000 });
    const aMiniData = waitForEvent(studentA, "minigame:yourData", { timeoutMs: 20000 });
    const bMiniData = waitForEvent(studentB, "minigame:yourData", { timeoutMs: 20000 });
    const aMiniResolved = waitForEvent(studentA, "minigame:resolved", { timeoutMs: 25000 });
    const bMiniResolved = waitForEvent(studentB, "minigame:resolved", { timeoutMs: 25000 });

    const aQuestion = waitForEvent(studentA, "question:start", { timeoutMs: 12000 });
    const bQuestion = waitForEvent(studentB, "question:start", { timeoutMs: 12000 });

    await emitAck(host, "host:start", { code });

    const qA = await aQuestion;
    await bQuestion;

    const correctIndex = solveMultiplication(qA);
    await emitAck(studentA, "player:answer", { code, answerIndex: correctIndex });
    await emitAck(studentB, "player:answer", { code, answerIndex: correctIndex });

    const miniStart = await hostMiniStart;
    if (miniStart.type !== "soccer_shootout") {
      throw new Error(`Expected soccer_shootout first, got ${miniStart.type}`);
    }

    const miniA = await aMiniData;
    const miniB = await bMiniData;

    if (miniA.type !== "soccer_shootout" || miniB.type !== "soccer_shootout") {
      throw new Error("Students did not receive soccer_shootout data");
    }

    for (let shot = 0; shot < 5; shot += 1) {
      await emitAck(studentA, "player:minigameAction", {
        code,
        action: "shoot",
        value: { lane: shot % 3, power: 2 }
      });

      await emitAck(studentB, "player:minigameAction", {
        code,
        action: "shoot",
        value: { lane: (shot + 1) % 3, power: 2 }
      });
    }

    await aMiniResolved;
    await bMiniResolved;

    await emitAck(host, "host:end", { code });

    console.log("\nSMOKE TEST PASSED");
    console.log(`- server: ${BASE_URL}`);
    console.log("- quiz: multiplication_1_digit");
    console.log("- mini-game verified: soccer_shootout");
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
