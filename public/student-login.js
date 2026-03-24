(async () => {
  const STUDENT_NAME_STORAGE_KEY = "blooketStudentLoginUsername";

  const usernameInput = document.getElementById("studentAuthUsername");
  const passwordInput = document.getElementById("studentAuthPassword");
  const loginBtn = document.getElementById("studentAuthLoginBtn");
  const logoutBtn = document.getElementById("studentAuthLogoutBtn");
  const noticeEl = document.getElementById("studentAuthNotice");
  const summaryEl = document.getElementById("studentAuthSummary");
  const greetingEl = document.getElementById("studentAuthGreeting");
  const greetingTitleEl = document.getElementById("studentAuthGreetingTitle");
  const greetingMetaEl = document.getElementById("studentAuthGreetingMeta");
  const roomSummaryEl = document.getElementById("studentRoomSummary");
  const joinLiveBtn = document.getElementById("studentJoinLiveBtn");
  const accountPanel = document.getElementById("studentAccountPanel");

  const coinsValueEl = document.getElementById("studentCoinsValue");
  const unlockedValueEl = document.getElementById("studentUnlockedValue");
  const gamesValueEl = document.getElementById("studentGamesValue");
  const selectedBlookValueEl = document.getElementById("studentSelectedBlookValue");
  const ownedPacksValueEl = document.getElementById("studentOwnedPacksValue");
  const bestRankValueEl = document.getElementById("studentBestRankValue");
  const correctValueEl = document.getElementById("studentCorrectValue");

  let authBusy = false;
  let currentStudent = null;
  let currentAccount = null;
  let currentActiveRoom = null;

  function normalizeStudentLoginUsername(value) {
    if (typeof value !== "string") {
      return "";
    }
    const firstToken = value.trim().split(/\s+/)[0] || "";
    return firstToken.toLowerCase().replace(/[^a-z]/g, "");
  }

  function buildJoinHref(code = "") {
    const roomCode = String(code || "").toUpperCase().trim();
    return roomCode ? `/play?code=${encodeURIComponent(roomCode)}&autojoin=1` : "/play";
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
  }

  function setBusy(nextBusy) {
    authBusy = nextBusy === true;
    const loggedIn = Boolean(currentStudent);

    if (loginBtn) {
      loginBtn.disabled = authBusy || loggedIn;
      loginBtn.textContent = authBusy ? "Logging In..." : (loggedIn ? "Logged In" : "Log In");
    }
    if (logoutBtn) {
      logoutBtn.disabled = authBusy;
      logoutBtn.classList.toggle("hidden", !loggedIn);
    }
    if (usernameInput) {
      usernameInput.disabled = authBusy || loggedIn;
    }
    if (passwordInput) {
      passwordInput.disabled = authBusy || loggedIn;
    }
  }

  function setNotice(message, tone = "") {
    if (!noticeEl) {
      return;
    }

    if (!message) {
      noticeEl.classList.add("hidden");
      noticeEl.classList.remove("good", "bad");
      noticeEl.textContent = "";
      return;
    }

    noticeEl.classList.remove("hidden", "good", "bad");
    if (tone) {
      noticeEl.classList.add(tone);
    }
    noticeEl.textContent = message;
  }

  function writeStoredUsername(username) {
    try {
      if (username) {
        window.localStorage.setItem(STUDENT_NAME_STORAGE_KEY, username);
      } else {
        window.localStorage.removeItem(STUDENT_NAME_STORAGE_KEY);
      }
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function readStoredUsername() {
    try {
      return normalizeStudentLoginUsername(window.localStorage.getItem(STUDENT_NAME_STORAGE_KEY) || "");
    } catch (_error) {
      return "";
    }
  }

  function fetchJson(url, options = {}) {
    return fetch(url, {
      credentials: "same-origin",
      ...options
    }).then(async (response) => {
      let payload = {};
      try {
        payload = await response.json();
      } catch (_error) {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload?.message || `Request failed for ${url}`);
      }

      return payload;
    });
  }

  function formatCount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return "0";
    }
    return String(Math.max(0, Math.floor(parsed)));
  }

  function ordinalPlace(value) {
    const place = Math.max(0, Number(value) || 0);
    if (!place) {
      return "-";
    }
    const mod100 = place % 100;
    if (mod100 >= 11 && mod100 <= 13) {
      return `${place}th`;
    }
    const mod10 = place % 10;
    if (mod10 === 1) return `${place}st`;
    if (mod10 === 2) return `${place}nd`;
    if (mod10 === 3) return `${place}rd`;
    return `${place}th`;
  }

  function unlockedBlookCount(account) {
    if (Array.isArray(account?.inventory)) {
      return account.inventory.length;
    }

    if (!Array.isArray(account?.packs)) {
      return 0;
    }

    return account.packs.reduce((sum, pack) => sum + Math.max(0, Number(pack?.ownedCount || 0)), 0);
  }

  function ownedPackCount(account) {
    if (!Array.isArray(account?.packs)) {
      return 0;
    }
    return account.packs.filter((pack) => Math.max(0, Number(pack?.ownedCount || 0)) > 0).length;
  }

  function selectedBlookName(account) {
    const selectedId = String(account?.selectedBlookId || "");
    if (selectedId && Array.isArray(account?.inventory)) {
      const selected = account.inventory.find((row) => String(row?.id || "") === selectedId);
      if (selected?.name) {
        return String(selected.name);
      }
    }

    if (Array.isArray(account?.inventory) && account.inventory[0]?.name) {
      return String(account.inventory[0].name);
    }

    return "Starter Blook";
  }

  function renderRoomSummary() {
    const joinHref = buildJoinHref(currentActiveRoom?.code || "");
    const roomCode = String(currentActiveRoom?.code || "").toUpperCase().trim();

    if (joinLiveBtn) {
      joinLiveBtn.href = joinHref;
      joinLiveBtn.textContent = roomCode ? `Join Room ${roomCode}` : "Open Join Page";
    }

    if (!roomSummaryEl) {
      return;
    }

    if (!roomCode) {
      roomSummaryEl.textContent = currentStudent
        ? "No live room right now. Your account is ready, so you can still open the join screen and wait for the next code."
        : "No live room right now. You can still log in now so your saved coins and blooks are ready for the next game.";
      return;
    }

    const phase = String(currentActiveRoom?.phase || "lobby").replace(/_/g, " ");
    roomSummaryEl.innerHTML = `Room <span class="student-room-code">${roomCode}</span> is live right now. Current phase: ${phase}.`;
  }

  function renderAccountPanel() {
    const loggedIn = Boolean(currentStudent && currentAccount);
    if (accountPanel) {
      accountPanel.classList.toggle("hidden", !loggedIn);
    }
    if (!loggedIn) {
      return;
    }

    setText(coinsValueEl, formatCount(currentAccount.coins));
    setText(unlockedValueEl, formatCount(unlockedBlookCount(currentAccount)));
    setText(gamesValueEl, formatCount(currentAccount?.stats?.gamesPlayed || 0));
    setText(selectedBlookValueEl, selectedBlookName(currentAccount));
    setText(ownedPacksValueEl, formatCount(ownedPackCount(currentAccount)));
    setText(bestRankValueEl, ordinalPlace(currentAccount?.stats?.bestRank || 0));
    setText(correctValueEl, formatCount(currentAccount?.stats?.totalCorrect || 0));
  }

  function renderAuthSummary() {
    const loggedIn = Boolean(currentStudent);
    if (!summaryEl) {
      return;
    }

    if (!loggedIn) {
      summaryEl.textContent = "Log in with your classroom first name and password. Your coins and blooks stay saved on this server even after it restarts.";
      return;
    }

    summaryEl.textContent = `Logged in as ${currentStudent.displayName}. Your coins, blooks, and stats are saved on this classroom server and will still be here after a restart.`;
  }

  function renderGreeting() {
    const loggedIn = Boolean(currentStudent);
    if (greetingEl) {
      greetingEl.classList.toggle("hidden", !loggedIn);
    }
    if (greetingTitleEl) {
      greetingTitleEl.textContent = loggedIn ? `Hello, ${currentStudent.displayName}!` : "Hello!";
    }
    if (greetingMetaEl) {
      greetingMetaEl.textContent = loggedIn
        ? `You are logged in as ${currentStudent.username}. This is your saved classroom account.`
        : "You are logged in.";
    }
  }

  function renderPage() {
    const loggedIn = Boolean(currentStudent);
    if (usernameInput) {
      if (loggedIn) {
        usernameInput.value = currentStudent.displayName;
      } else if (!usernameInput.value.trim()) {
        const remembered = readStoredUsername();
        if (remembered) {
          usernameInput.value = remembered;
        }
      }
    }
    if (passwordInput && loggedIn) {
      passwordInput.value = "";
    }

    renderAuthSummary();
    renderGreeting();
    renderRoomSummary();
    renderAccountPanel();
    setBusy(authBusy);
  }

  async function refreshStudentStatus() {
    const payload = await fetchJson("/api/student-auth/status");
    currentStudent = payload?.loggedIn && payload?.student
      ? {
          username: String(payload.student.username || ""),
          displayName: String(payload.student.displayName || ""),
          accountKey: String(payload.accountKey || payload.student.accountKey || "")
        }
      : null;
    currentAccount = currentStudent ? payload.account || null : null;

    if (currentStudent?.username) {
      writeStoredUsername(currentStudent.username);
    }
  }

  async function refreshServerInfo() {
    const payload = await fetchJson("/api/server-info");
    currentActiveRoom = payload?.activeRoom || null;
  }

  async function initializePage() {
    try {
      await Promise.all([refreshStudentStatus(), refreshServerInfo()]);
      renderPage();
    } catch (_error) {
      setNotice("Could not load the student login screen yet. Refresh and try again.", "bad");
      renderPage();
    }
  }

  async function submitLogin() {
    const username = normalizeStudentLoginUsername(usernameInput?.value || "");
    const password = String(passwordInput?.value || "");
    if (!username || !password) {
      setNotice("Enter your first name and password.", "bad");
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const payload = await fetchJson("/api/student-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      currentStudent = payload?.student
        ? {
            username: String(payload.student.username || username),
            displayName: String(payload.student.displayName || username),
            accountKey: String(payload.accountKey || payload.student.accountKey || "")
          }
        : null;
      currentAccount = payload?.account || null;
      writeStoredUsername(username);
      passwordInput.value = "";
      renderPage();

      const roomCode = String(currentActiveRoom?.code || "").toUpperCase().trim();
      setNotice(
        roomCode
          ? `Logged in as ${currentStudent?.displayName || username}. Room ${roomCode} is ready to join.`
          : `Logged in as ${currentStudent?.displayName || username}. Your saved coins and blooks are ready.`,
        "good"
      );
    } catch (error) {
      setNotice(error?.message || "Could not log in.", "bad");
    } finally {
      setBusy(false);
      renderPage();
    }
  }

  async function logoutStudent() {
    setBusy(true);
    setNotice("");

    try {
      await fetchJson("/api/student-auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      currentStudent = null;
      currentAccount = null;
      if (usernameInput) {
        usernameInput.value = readStoredUsername();
      }
      renderPage();
      setNotice("Logged out. Your saved coins and blooks will still be here next time.", "good");
    } catch (error) {
      setNotice(error?.message || "Could not log out.", "bad");
    } finally {
      setBusy(false);
      renderPage();
    }
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", submitLogin);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutStudent);
  }

  for (const input of [usernameInput, passwordInput]) {
    if (!input) {
      continue;
    }
    input.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      submitLogin();
    });
  }

  const storedUsername = readStoredUsername();
  if (usernameInput && storedUsername) {
    usernameInput.value = storedUsername;
  }

  await initializePage();
  window.setInterval(() => {
    refreshServerInfo()
      .then(renderPage)
      .catch(() => {
        // Ignore refresh failures until the next poll.
      });
  }, 10000);
})();
