(async () => {
  const coinsEl = document.getElementById("studentHistoryCoins");
  const avatarEl = document.getElementById("studentHistoryAvatar");
  const nameEl = document.getElementById("studentHistoryName");
  const statusEl = document.getElementById("studentHistoryStatus");
  const roomCodeEl = document.getElementById("studentHistoryRoomCode");
  const metaEl = document.getElementById("studentHistoryMeta");
  const contentEl = document.getElementById("studentHistoryContent");

  const state = {
    student: null,
    account: null,
    activeRoom: null
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fetchJson(url, options = {}) {
    return fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
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
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)).toLocaleString("en-US") : "0";
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

  function fallbackInitials(value) {
    const safe = String(value || "").trim();
    return safe
      ? safe.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || safe.slice(0, 1).toUpperCase()
      : "S";
  }

  function avatarMarkup(item, fallbackValue) {
    if (item?.image) {
      return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name || fallbackValue)}" />`;
    }
    return `<div class="avatar-fallback">${escapeHtml(fallbackInitials(fallbackValue))}</div>`;
  }

  function selectedBlook(account) {
    if (!Array.isArray(account?.inventory)) {
      return null;
    }
    const selectedId = String(account?.selectedBlookId || "");
    if (selectedId) {
      const selected = account.inventory.find((item) => String(item?.id || "") === selectedId);
      if (selected) {
        return selected;
      }
    }
    return account.inventory[0] || null;
  }

  function studentName() {
    return state.student?.displayName || state.student?.username || "Student";
  }

  function topMiniGame(account) {
    if (!Array.isArray(account?.miniGames) || account.miniGames.length === 0) {
      return null;
    }
    return [...account.miniGames]
      .sort((left, right) => {
        const leftPlays = Math.max(0, Number(left?.plays || 0));
        const rightPlays = Math.max(0, Number(right?.plays || 0));
        if (leftPlays !== rightPlays) {
          return rightPlays - leftPlays;
        }
        return Math.max(0, Number(right?.wins || 0)) - Math.max(0, Number(left?.wins || 0));
      })[0];
  }

  function playedMiniGames(account) {
    return (Array.isArray(account?.miniGames) ? account.miniGames : [])
      .filter((row) => Math.max(0, Number(row?.plays || 0)) > 0)
      .sort((left, right) => {
        const leftPlays = Math.max(0, Number(left?.plays || 0));
        const rightPlays = Math.max(0, Number(right?.plays || 0));
        if (leftPlays !== rightPlays) {
          return rightPlays - leftPlays;
        }
        return Math.max(0, Number(right?.wins || 0)) - Math.max(0, Number(left?.wins || 0));
      });
  }

  function renderHeader() {
    const name = studentName();
    if (coinsEl) {
      coinsEl.textContent = formatCount(state.account?.coins || 0);
    }
    if (avatarEl) {
      avatarEl.innerHTML = avatarMarkup(selectedBlook(state.account), name);
    }
    if (nameEl) {
      nameEl.textContent = name;
    }
    if (statusEl) {
      statusEl.textContent = state.activeRoom?.code ? `Room ${state.activeRoom.code}` : "History";
    }
    if (roomCodeEl) {
      roomCodeEl.textContent = state.activeRoom?.code ? `Room: ${state.activeRoom.code}` : "Room: none";
    }
  }

  function renderMeta() {
    if (!metaEl) {
      return;
    }
    const gamesPlayed = Math.max(0, Number(state.account?.stats?.gamesPlayed || 0));
    const pills = [
      `${formatCount(gamesPlayed)} game${gamesPlayed === 1 ? "" : "s"} played`,
      state.student ? `Signed in as ${studentName()}` : "Sign in to load your saved progress",
      state.activeRoom?.code ? `Live room ${state.activeRoom.code}` : "No live room open"
    ];
    metaEl.innerHTML = pills.map((pill) => `<span class="meta-pill">${escapeHtml(pill)}</span>`).join("");
  }

  function renderEmptyState() {
    if (!contentEl) {
      return;
    }
    contentEl.innerHTML = `
      <div class="empty-shell">
        <div class="empty-card">
          <div class="empty-graphic" aria-hidden="true">
            <div class="chart-board">
              <div class="chart-grid"></div>
              <div class="chart-axis"></div>
              <div class="chart-bar bar-a"></div>
              <div class="chart-bar bar-b"></div>
              <div class="chart-bar bar-c"></div>
            </div>
            <div class="history-blook">
              <div class="history-face"></div>
              <div class="history-nose"></div>
            </div>
          </div>
          <div class="history-copy">Play your first game to see a history</div>
          <a class="action teal" href="/student-discover">Discover Sets</a>
          <a class="tutorial" href="/play">Learn how to play</a>
        </div>
      </div>
    `;
  }

  function renderHistory() {
    if (!contentEl) {
      return;
    }

    const gamesPlayed = Math.max(0, Number(state.account?.stats?.gamesPlayed || 0));
    const totalCorrect = Math.max(0, Number(state.account?.stats?.totalCorrect || 0));
    const totalScore = Math.max(0, Number(state.account?.stats?.totalScore || 0));
    const bestRank = ordinalPlace(state.account?.stats?.bestRank || 0);
    const bestGame = topMiniGame(state.account);
    const miniGames = playedMiniGames(state.account);
    const accuracy = gamesPlayed > 0 ? Math.round((totalCorrect / Math.max(1, gamesPlayed * 5)) * 100) : 0;

    contentEl.innerHTML = `
      <div class="summary-grid">
        <article class="summary-card">
          <span>Games Played</span>
          <strong>${escapeHtml(formatCount(gamesPlayed))}</strong>
        </article>
        <article class="summary-card">
          <span>Total Correct</span>
          <strong>${escapeHtml(formatCount(totalCorrect))}</strong>
        </article>
        <article class="summary-card">
          <span>Best Rank</span>
          <strong>${escapeHtml(bestRank)}</strong>
        </article>
        <article class="summary-card">
          <span>Total Score</span>
          <strong>${escapeHtml(formatCount(totalScore))}</strong>
        </article>
        <article class="summary-card">
          <span>Top Mini-Game</span>
          <strong>${escapeHtml(bestGame?.name || "None yet")}</strong>
        </article>
        <article class="summary-card">
          <span>Accuracy</span>
          <strong>${escapeHtml(`${accuracy}%`)}</strong>
        </article>
      </div>

      <section class="section">
        <h2>Mini-Game History</h2>
        <div class="mini-grid">
          ${
            miniGames.length > 0
              ? miniGames
                  .map(
                    (game) => `
                      <article class="mini-card">
                        <strong>${escapeHtml(game.name || "Mini-Game")}</strong>
                        <span>${escapeHtml(`${formatCount(game.plays || 0)} plays | ${formatCount(game.wins || 0)} wins`)}</span>
                        <div class="mini-meta">
                          <span class="chip">${escapeHtml(`Best Bonus ${formatCount(game.bestBonus || 0)}`)}</span>
                          <span class="chip">${escapeHtml(`Avg Bonus ${formatCount(game.avgBonus || 0)}`)}</span>
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `<article class="mini-card"><strong>No mini-games recorded yet</strong><span>Correct answers in class will start filling this page.</span></article>`
          }
        </div>
      </section>
    `;
  }

  function renderPage() {
    renderHeader();
    renderMeta();
    const gamesPlayed = Math.max(0, Number(state.account?.stats?.gamesPlayed || 0));
    if (!state.student || !state.account || gamesPlayed <= 0) {
      renderEmptyState();
      return;
    }
    renderHistory();
  }

  async function loadData() {
    const [studentStatus, accountPayload, serverInfo] = await Promise.all([
      fetchJson("/api/student-auth/status").catch(() => ({ loggedIn: false, student: null })),
      fetchJson("/api/account"),
      fetchJson("/api/server-info").catch(() => ({ activeRoom: null }))
    ]);
    state.student = studentStatus?.loggedIn && studentStatus?.student
      ? {
          username: String(studentStatus.student.username || ""),
          displayName: String(studentStatus.student.displayName || "")
        }
      : null;
    state.account = accountPayload?.account || null;
    state.activeRoom = serverInfo?.activeRoom || null;
  }

  try {
    await loadData();
  } catch (_error) {
    state.account = null;
  }

  renderPage();
})();
