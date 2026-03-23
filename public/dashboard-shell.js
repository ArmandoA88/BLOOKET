(() => {
  const routeConfig = {
    "/host.html": {
      nav: "host",
      pane: "pane-host",
      title: "Host Live Game",
      copy: "Launch the existing live classroom flow with the quiz and mini-game logic already in this repo.",
      pill: "Live Host"
    },
    "/my-sets": {
      nav: "my-sets",
      pane: "pane-my-sets",
      title: "My Sets",
      copy: "Question sets already loaded in this repo, ready to host with the same Blooket-style flow.",
      pill: "Dashboard"
    },
    "/discover": {
      nav: "discover",
      pane: "pane-discover",
      title: "Discover",
      copy: "Browse the local question bank and jump straight into hosting from the dashboard.",
      pill: "Discover"
    },
    "/create": {
      nav: "create",
      pane: "pane-create",
      title: "Create",
      copy: "Use the existing import and quiz builder tools from this repository through a Blooket-like dashboard path.",
      pill: "Creator"
    },
    "/favorites": {
      nav: "favorites",
      pane: "pane-favorites",
      title: "Favorites",
      copy: "Featured sets and quick-launch picks generated from the question sets already in this workspace.",
      pill: "Favorites"
    },
    "/history": {
      nav: "history",
      pane: "pane-history",
      title: "History",
      copy: "Live room, server, and mini-game telemetry surfaced from the current local repository state.",
      pill: "History"
    },
    "/homeworks": {
      nav: "homeworks",
      pane: "pane-homeworks",
      title: "Homework",
      copy: "Homework scheduling is not implemented in this repo yet, so this page focuses on ready-to-run follow-up sets.",
      pill: "Homework"
    },
    "/settings": {
      nav: "settings",
      pane: "pane-settings",
      title: "Settings",
      copy: "Authentication status, server URLs, and local repo storage details used by this project.",
      pill: "Settings"
    },
    "/stats": {
      nav: "stats",
      pane: "pane-stats",
      title: "Stats",
      copy: "Mini-game performance metrics and account progress pulled from the existing server APIs.",
      pill: "Stats"
    },
    "/blooks": {
      nav: "blooks",
      pane: "pane-blooks",
      title: "Blooks",
      copy: "All local blook packs bundled in this repository, with preview rosters and pack details.",
      pill: "Blooks"
    },
    "/market": {
      nav: "market",
      pane: "pane-market",
      title: "Market",
      copy: "Open packs with the repo's local economy and inventory data while keeping the Blooket-like route flow.",
      pill: "Market"
    }
  };

  const currentPath = routeConfig[window.location.pathname] ? window.location.pathname : "/host.html";
  const currentRoute = routeConfig[currentPath];
  const pageParams = new URLSearchParams(window.location.search);
  const state = {
    auth: null,
    quizzes: [],
    blooks: [],
    minigames: [],
    minigameStats: [],
    account: null,
    accountKey: "",
    serverInfo: null,
    reward: null
  };

  const titleEl = document.getElementById("dashboardPageTitle");
  const copyEl = document.getElementById("dashboardPageCopy");
  const routePillEl = document.getElementById("dashboardRoutePill");
  const summaryGridEl = document.getElementById("dashboardSummaryGrid");
  const activeRoomCalloutEl = document.getElementById("dashboardActiveRoomCallout");
  const activeRoomLinksEl = document.getElementById("dashboardLinkRail");
  const userAvatarEl = document.getElementById("dashboardUserAvatar");
  const userNameEl = document.getElementById("dashboardUserName");
  const userMetaEl = document.getElementById("dashboardUserMeta");
  const focusNoteEl = document.getElementById("dashboardFocusNote");
  const mySetsGridEl = document.getElementById("mySetsGrid");
  const discoverGridEl = document.getElementById("discoverGrid");
  const favoritesGridEl = document.getElementById("favoritesGrid");
  const historyListEl = document.getElementById("historyList");
  const homeworkListEl = document.getElementById("homeworkList");
  const settingsListEl = document.getElementById("settingsList");
  const statsGridEl = document.getElementById("statsGrid");
  const blooksGridEl = document.getElementById("blooksGrid");
  const marketGridEl = document.getElementById("marketGrid");
  const marketInventoryEl = document.getElementById("marketInventory");
  const marketCoinsEl = document.getElementById("marketCoins");
  const marketFreeOpensEl = document.getElementById("marketFreeOpens");
  const marketRewardEl = document.getElementById("marketReward");
  const createBuilderLinkEl = document.getElementById("createBuilderLink");
  const createImportLinkEl = document.getElementById("createImportLink");
  const createHostLinkEl = document.getElementById("createHostLink");
  const createSetCountEl = document.getElementById("createSetCount");
  const createPackCountEl = document.getElementById("createPackCount");
  const createMiniCountEl = document.getElementById("createMiniCount");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
  }

  function clip(value, limit = 140) {
    const text = String(value || "").trim();
    if (text.length <= limit) {
      return text;
    }
    return `${text.slice(0, Math.max(0, limit - 3)).trim()}...`;
  }

  function pickAccent(index) {
    const accents = [
      "rgba(79, 124, 255, 0.12)",
      "rgba(18, 200, 176, 0.12)",
      "rgba(255, 216, 77, 0.18)",
      "rgba(255, 154, 61, 0.16)"
    ];
    return accents[index % accents.length];
  }

  function fetchJson(url, options = {}) {
    return fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || `Request failed for ${url}`);
      }
      return payload;
    });
  }

  function buildHostHref(setId, focus = "setup") {
    const url = new URL("/host.html", window.location.origin);
    if (setId) {
      url.searchParams.set("set", setId);
    }
    if (focus) {
      url.searchParams.set("focus", focus);
    }
    return `${url.pathname}${url.search}`;
  }

  function buildJoinHref(code) {
    if (!code) {
      return "/play";
    }
    return `/play?code=${encodeURIComponent(code)}`;
  }

  function setPaneVisibility() {
    const panes = Array.from(document.querySelectorAll(".dashboard-pane"));
    for (const pane of panes) {
      pane.classList.toggle("is-active", pane.id === currentRoute.pane);
    }

    const navLinks = Array.from(document.querySelectorAll(".dashboard-nav-link[data-route]"));
    for (const link of navLinks) {
      link.classList.toggle("is-active", link.dataset.route === currentRoute.nav);
    }

    if (titleEl) {
      titleEl.textContent = currentRoute.title;
    }
    if (copyEl) {
      copyEl.textContent = currentRoute.copy;
    }
    if (routePillEl) {
      routePillEl.textContent = currentRoute.pill;
    }
  }

  function renderUserBar() {
    const auth = state.auth;
    const user = auth?.user || null;
    if (userAvatarEl) {
      if (user?.picture) {
        userAvatarEl.src = user.picture;
        userAvatarEl.hidden = false;
      } else {
        userAvatarEl.hidden = true;
      }
    }

    if (userNameEl) {
      userNameEl.textContent =
        user?.name ||
        (auth?.authEnabled ? "Dashboard access requires Google sign-in" : "Local host access is enabled");
    }
    if (userMetaEl) {
      if (user?.email) {
        userMetaEl.textContent = user.email;
      } else if (auth?.authEnabled) {
        userMetaEl.textContent = "Sign in from the home page or directly through Google auth.";
      } else {
        userMetaEl.textContent = "Google auth is optional in this repo. Hosting works locally without it.";
      }
    }
  }

  function renderSummaryGrid() {
    if (!summaryGridEl) {
      return;
    }

    const sets = state.quizzes.length;
    const packs = state.blooks.length;
    const miniGames = state.minigames.length;
    const activeRoom = state.serverInfo?.activeRoom || null;

    const cards = [
      {
        label: "Question Sets",
        value: formatNumber(sets),
        detail: "Built-in and imported sets available to host now."
      },
      {
        label: "Mini-Games",
        value: formatNumber(miniGames),
        detail: "Live bonus rounds already wired into the current server."
      },
      {
        label: "Blook Packs",
        value: formatNumber(packs),
        detail: "Local pack data and images included in this repo."
      }
    ];

    if (activeRoom?.code) {
      cards.push({
        label: "Active Room",
        value: activeRoom.code,
        detail: `Phase: ${String(activeRoom.phase || "lobby").replace(/_/g, " ")}`
      });
    } else {
      cards.push({
        label: "Server",
        value: state.serverInfo?.localhost || "Local",
        detail: "Open a room from Host Live Game to start the join flow."
      });
    }

    summaryGridEl.innerHTML = cards
      .map(
        (card) => `
          <article class="summary-card">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <div class="muted-copy">${escapeHtml(card.detail)}</div>
          </article>
        `
      )
      .join("");
  }

  function renderActiveRoomCallout() {
    if (!activeRoomCalloutEl || !activeRoomLinksEl) {
      return;
    }

    const activeRoom = state.serverInfo?.activeRoom || null;
    if (!activeRoom?.code) {
      activeRoomCalloutEl.innerHTML = `
        <strong>No live room is open right now.</strong>
        <div class="muted-copy">Use <a class="dashboard-nav-link" href="/host.html">Host Live Game</a> to launch the classroom flow.</div>
      `;
      activeRoomLinksEl.innerHTML = `
        <a class="dashboard-action" href="/host.html">Open Host Workspace</a>
        <a class="dashboard-action ghost" href="/play">Open Join Page</a>
      `;
      return;
    }

    const joinHref = buildJoinHref(activeRoom.code);
    activeRoomCalloutEl.innerHTML = `
      <strong>Room ${escapeHtml(activeRoom.code)} is live.</strong>
      <div class="muted-copy">Students can use the exact join flow through <span class="code-strong">${escapeHtml(joinHref)}</span>.</div>
    `;
    activeRoomLinksEl.innerHTML = `
      <a class="dashboard-action secondary" href="${escapeHtml(joinHref)}">Join Active Room</a>
      <a class="dashboard-action ghost" href="${escapeHtml(joinHref)}" target="_blank" rel="noopener">Open Student View</a>
    `;
  }

  function renderCreatePane() {
    if (createBuilderLinkEl) {
      createBuilderLinkEl.href = buildHostHref("", "builder");
    }
    if (createImportLinkEl) {
      createImportLinkEl.href = buildHostHref("", "import");
    }
    if (createHostLinkEl) {
      createHostLinkEl.href = buildHostHref("", "setup");
    }
    if (createSetCountEl) {
      createSetCountEl.textContent = `${formatNumber(state.quizzes.length)} sets ready`;
    }
    if (createPackCountEl) {
      createPackCountEl.textContent = `${formatNumber(state.blooks.length)} packs available`;
    }
    if (createMiniCountEl) {
      createMiniCountEl.textContent = `${formatNumber(state.minigames.length)} mini-games loaded`;
    }
  }

  function renderQuizCards(target, sets, { emptyTitle, emptyCopy, emptyAction } = {}) {
    if (!target) {
      return;
    }

    if (!Array.isArray(sets) || sets.length === 0) {
      target.innerHTML = `
        <div class="dashboard-empty">
          <strong>${escapeHtml(emptyTitle || "Nothing here yet")}</strong>
          <div>${escapeHtml(emptyCopy || "This section will populate once local data is available.")}</div>
          ${emptyAction ? `<a class="dashboard-action" href="${escapeHtml(emptyAction.href)}">${escapeHtml(emptyAction.label)}</a>` : ""}
        </div>
      `;
      return;
    }

    target.innerHTML = sets
      .map((set, index) => {
        const tags = Array.isArray(set.tags) ? set.tags.slice(0, 4) : [];
        return `
          <article class="quiz-card" style="background: linear-gradient(180deg, #fff 0%, ${pickAccent(index)} 100%)">
            <div class="quiz-card-top">
              <div>
                <span class="quiz-chip">${escapeHtml(set.source === "custom" ? "Custom" : "Library")}</span>
                <h3 class="quiz-card-title">${escapeHtml(set.label)}</h3>
              </div>
              <span class="quiz-chip">${escapeHtml(set.category || "Mixed")}</span>
            </div>
            <p class="quiz-card-copy">${escapeHtml(`${formatNumber(set.questionCount)} questions ready for the live host flow.`)}</p>
            <div class="quiz-card-meta">
              <span class="status-chip">${escapeHtml(set.category || "Uncategorized")}</span>
              <span class="status-chip">${escapeHtml(set.source || "built_in")}</span>
            </div>
            <div class="quiz-card-tags">
              ${tags.map((tag) => `<span class="quiz-tag">${escapeHtml(tag)}</span>`).join("")}
            </div>
            <div class="quiz-card-actions">
              <a class="dashboard-action" href="${escapeHtml(buildHostHref(set.id, "setup"))}">Host Live</a>
              <a class="dashboard-action ghost" href="${escapeHtml(buildHostHref(set.id, "builder"))}">Edit Flow</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderMySets() {
    const sorted = state.quizzes
      .slice()
      .sort((left, right) => {
        const leftCustom = left.source === "custom" ? 1 : 0;
        const rightCustom = right.source === "custom" ? 1 : 0;
        return rightCustom - leftCustom || String(left.label).localeCompare(String(right.label));
      });

    renderQuizCards(mySetsGridEl, sorted, {
      emptyTitle: "No local sets found",
      emptyCopy: "Import or build a quiz from the Create route, then come back here to host it."
    });
  }

  function renderDiscover() {
    const discoverSets = state.quizzes
      .slice()
      .sort((left, right) => Number(right.questionCount || 0) - Number(left.questionCount || 0) || String(left.label).localeCompare(String(right.label)));

    renderQuizCards(discoverGridEl, discoverSets, {
      emptyTitle: "Discover is waiting on local data",
      emptyCopy: "Once question sets are available, this route becomes your browse-and-host step."
    });
  }

  function renderFavorites() {
    const favorites = state.quizzes
      .slice()
      .sort((left, right) => Number(right.questionCount || 0) - Number(left.questionCount || 0))
      .slice(0, 4);

    renderQuizCards(favoritesGridEl, favorites, {
      emptyTitle: "Favorites are still empty",
      emptyCopy: "This repo does not store favorite flags yet, so this route highlights the biggest ready-to-host sets."
    });
  }

  function renderHistory() {
    if (!historyListEl) {
      return;
    }

    const activeRoom = state.serverInfo?.activeRoom || null;
    const mostPlayed = state.minigameStats[0] || null;
    const mostMatched = state.minigameStats
      .slice()
      .sort((left, right) => Number(right.completionRate || 0) - Number(left.completionRate || 0))[0] || null;
    const urls = Array.isArray(state.serverInfo?.lanUrls) ? state.serverInfo.lanUrls.slice(0, 3) : [];

    const rows = [
      {
        title: activeRoom?.code ? `Active room ${activeRoom.code}` : "No active room",
        detail: activeRoom?.code
          ? `Current phase: ${String(activeRoom.phase || "lobby").replace(/_/g, " ")}`
          : "No live report or room is currently in memory."
      },
      {
        title: mostPlayed ? `Most played mini-game: ${mostPlayed.name}` : "Mini-game telemetry pending",
        detail: mostPlayed
          ? `${formatNumber(mostPlayed.playerEntries)} entries across ${formatNumber(mostPlayed.sessions)} sessions`
          : "Run a few rooms to build mini-game history."
      },
      {
        title: mostMatched ? `Best completion rate: ${mostMatched.name}` : "Completion stats pending",
        detail: mostMatched
          ? `${mostMatched.completionRate}% completion, ${mostMatched.avgBonus} average bonus`
          : "Completion metrics will appear after live play."
      },
      {
        title: urls.length > 0 ? "LAN share links detected" : "No LAN share links detected",
        detail: urls.length > 0 ? urls.join(" | ") : "If you are on a private network, LAN URLs will appear here."
      }
    ];

    historyListEl.innerHTML = rows
      .map(
        (row) => `
          <article class="history-item">
            <div>
              <strong>${escapeHtml(row.title)}</strong>
              <span>${escapeHtml(row.detail)}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderHomework() {
    if (!homeworkListEl) {
      return;
    }

    const suggested = state.quizzes
      .slice()
      .sort((left, right) => String(left.category || "").localeCompare(String(right.category || "")) || String(left.label).localeCompare(String(right.label)))
      .slice(0, 5);

    if (suggested.length === 0) {
      homeworkListEl.innerHTML = `
        <article class="homework-item">
          <div>
            <strong>No follow-up sets available yet</strong>
            <span>Homework scheduling is not stored in this repo, so this route fills in once question sets exist.</span>
          </div>
        </article>
      `;
      return;
    }

    homeworkListEl.innerHTML = suggested
      .map(
        (set) => `
          <article class="homework-item">
            <div>
              <strong>${escapeHtml(set.label)}</strong>
              <span>${escapeHtml(`${set.category || "Mixed"} | ${formatNumber(set.questionCount)} questions`)}</span>
            </div>
            <a class="dashboard-action ghost" href="${escapeHtml(buildHostHref(set.id, "setup"))}">Host Instead</a>
          </article>
        `
      )
      .join("");
  }

  function renderSettings() {
    if (!settingsListEl) {
      return;
    }

    const auth = state.auth;
    const rows = [
      {
        title: "Authentication",
        detail: auth?.authEnabled
          ? auth?.authenticated
            ? `Signed in as ${auth.user?.name || "Google User"}`
            : "Google auth is enabled, but no host is currently signed in."
          : "Google auth is disabled. Local hosting is open."
      },
      {
        title: "Localhost",
        detail: state.serverInfo?.localhost || "Unavailable"
      },
      {
        title: "LAN URLs",
        detail: Array.isArray(state.serverInfo?.lanUrls) && state.serverInfo.lanUrls.length > 0
          ? state.serverInfo.lanUrls.join(" | ")
          : "No private LAN addresses detected"
      },
      {
        title: "Local Data Files",
        detail: "data/accounts.json | data/minigame-stats.json | data/custom-quizzes.json"
      },
      {
        title: "Dashboard Routes",
        detail: "/my-sets | /discover | /create | /market | /blooks | /stats"
      }
    ];

    settingsListEl.innerHTML = rows
      .map(
        (row) => `
          <article class="settings-row">
            <div>
              <strong>${escapeHtml(row.title)}</strong>
              <span>${escapeHtml(row.detail)}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderStats() {
    if (!statsGridEl) {
      return;
    }

    const rows = state.minigameStats;
    if (!rows.length) {
      statsGridEl.innerHTML = `
        <div class="dashboard-empty">
          <strong>No stats recorded yet</strong>
          <div>Host a room and run mini-games to populate this route.</div>
        </div>
      `;
      return;
    }

    statsGridEl.innerHTML = rows
      .map(
        (row) => `
          <article class="mini-stat-card">
            <span>${escapeHtml(row.name)}</span>
            <strong>${escapeHtml(formatNumber(row.playerEntries))}</strong>
            <div class="muted-copy">${escapeHtml(`${formatNumber(row.sessions)} sessions | ${row.completionRate}% completion | ${row.avgBonus} avg bonus`)}</div>
          </article>
        `
      )
      .join("");
  }

  function renderBlooks() {
    if (!blooksGridEl) {
      return;
    }

    const packs = state.blooks;
    if (!packs.length) {
      blooksGridEl.innerHTML = `
        <div class="dashboard-empty">
          <strong>No packs loaded</strong>
          <div>The local blook catalog could not be read from the server.</div>
        </div>
      `;
      return;
    }

    blooksGridEl.innerHTML = packs
      .map(
        (pack, index) => `
          <article class="pack-card" style="background: linear-gradient(180deg, #fff 0%, ${pickAccent(index)} 100%)">
            <div class="pack-card-top">
              <div>
                <span class="pack-chip">${escapeHtml(`${pack.totalCount} blooks`)}</span>
                <h3 class="pack-card-title">${escapeHtml(pack.name)}</h3>
              </div>
              <span class="pack-chip">${escapeHtml(`${pack.openCost} coins`)}</span>
            </div>
            <p class="pack-card-copy">${escapeHtml(clip(pack.description, 120))}</p>
            <div class="blook-preview-row">
              ${(Array.isArray(pack.blooks) ? pack.blooks.slice(0, 5) : [])
                .map((blook) => `<span class="blook-pill">${escapeHtml(blook.name)}</span>`)
                .join("")}
            </div>
            <div class="pack-card-actions">
              <a class="dashboard-action" href="/market">Open in Market</a>
              <a class="dashboard-action ghost" href="/play?catalog=1#accountPanel">View Catalog</a>
            </div>
          </article>
        `
      )
      .join("");
  }

  function updateMarketSummary() {
    if (marketCoinsEl) {
      marketCoinsEl.textContent = formatNumber(state.account?.coins || 0);
    }
    if (marketFreeOpensEl) {
      marketFreeOpensEl.textContent = formatNumber(state.account?.freePackOpensRemaining || 0);
    }
    if (marketRewardEl) {
      if (state.reward) {
        marketRewardEl.hidden = false;
        marketRewardEl.innerHTML = `
          <div class="market-reward">
            ${escapeHtml(`${state.reward.name} unlocked${state.reward.duplicate ? " again" : ""} | ${state.reward.rarity}`)}
          </div>
        `;
      } else {
        marketRewardEl.hidden = true;
        marketRewardEl.innerHTML = "";
      }
    }
  }

  function renderMarket() {
    updateMarketSummary();

    if (marketGridEl) {
      marketGridEl.innerHTML = state.blooks
        .map(
          (pack, index) => {
            const accountPack = Array.isArray(state.account?.packs)
              ? state.account.packs.find((entry) => entry.id === pack.id)
              : null;
            const ownedCount = Number(accountPack?.ownedCount || 0);
            const duplicateCount = Number(accountPack?.duplicateCount || 0);
            return `
              <article class="market-card" style="background: linear-gradient(180deg, #fff 0%, ${pickAccent(index)} 100%)">
                <div class="market-card-top">
                  <div>
                    <span class="pack-chip">${escapeHtml(`${ownedCount}/${pack.totalCount} owned`)}</span>
                    <h3 class="pack-card-title">${escapeHtml(pack.name)}</h3>
                  </div>
                  <div class="market-card-price">${escapeHtml(`${pack.openCost}`)}</div>
                </div>
                <p class="pack-card-copy">${escapeHtml(clip(pack.description, 120))}</p>
                <div class="pack-card-meta">
                  <span class="status-chip">${escapeHtml(`${duplicateCount} duplicates`)}</span>
                  <span class="status-chip">${escapeHtml(`${pack.sellValueEach} sell value`)}</span>
                </div>
                <div class="blook-preview-row">
                  ${(Array.isArray(pack.blooks) ? pack.blooks.slice(0, 5) : [])
                    .map((blook) => `<span class="blook-pill">${escapeHtml(blook.name)}</span>`)
                    .join("")}
                </div>
                <div class="market-card-actions">
                  <button class="dashboard-action" type="button" data-open-pack="${escapeHtml(pack.id)}">Open Pack</button>
                  <a class="dashboard-action ghost" href="/blooks">Preview Pack</a>
                </div>
              </article>
            `;
          }
        )
        .join("");
    }

    if (marketInventoryEl) {
      const inventory = Array.isArray(state.account?.inventory) ? state.account.inventory.slice(0, 10) : [];
      if (!inventory.length) {
        marketInventoryEl.innerHTML = `
          <div class="dashboard-inline-note">
            Open a pack to start building a local inventory for this market route.
          </div>
        `;
      } else {
        marketInventoryEl.innerHTML = inventory
          .map(
            (item) => `
              <article class="settings-row">
                <div>
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml(`${item.count} owned | ${item.rarity} | ${item.packName}`)}</span>
                </div>
              </article>
            `
          )
          .join("");
      }
    }
  }

  function renderHostFocusNote() {
    if (!focusNoteEl) {
      return;
    }

    if (currentPath !== "/host.html") {
      focusNoteEl.hidden = true;
      return;
    }

    const focus = String(pageParams.get("focus") || "").trim().toLowerCase();
    const setId = String(pageParams.get("set") || "").trim();
    if (!focus && !setId) {
      focusNoteEl.hidden = true;
      return;
    }

    const setLabel = state.quizzes.find((entry) => entry.id === setId)?.label || setId;
    const focusLabels = {
      setup: "host setup",
      builder: "quiz builder",
      import: "quiz import",
      minigame: "mini-game test"
    };
    const focusText = focusLabels[focus] || "host workspace";
    focusNoteEl.hidden = false;
    focusNoteEl.textContent = setLabel
      ? `Loaded ${setLabel} into the ${focusText}.`
      : `Opened the ${focusText}.`;

    const focusTargetMap = {
      builder: "builderQuestions",
      import: "quizUploadTitle",
      setup: "createBtn",
      minigame: "miniGameTestPanel"
    };

    const targetId = focusTargetMap[focus];
    if (!targetId) {
      return;
    }

    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }
      const card = target.closest(".card") || target;
      card.classList.add("dashboard-highlight");
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => card.classList.remove("dashboard-highlight"), 2200);
    }, 450);
  }

  async function openPack(packId) {
    if (!packId) {
      return;
    }

    try {
      const payload = await fetchJson("/api/account/open-pack", {
        method: "POST",
        body: JSON.stringify({
          accountKey: state.accountKey,
          packId
        })
      });
      state.accountKey = payload.accountKey || state.accountKey;
      state.account = payload.account || state.account;
      state.reward = payload.reward || null;
      renderMarket();
    } catch (error) {
      state.reward = {
        name: error?.message || "Pack open failed",
        duplicate: false,
        rarity: "Notice"
      };
      renderMarket();
    }
  }

  function bindEvents() {
    if (marketGridEl) {
      marketGridEl.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open-pack]");
        if (!button) {
          return;
        }
        event.preventDefault();
        openPack(button.getAttribute("data-open-pack"));
      });
    }
  }

  async function loadData() {
    try {
      const [auth, quizzes, blooks, minigames, account, serverInfo] = await Promise.all([
        fetchJson("/api/auth/status"),
        fetchJson("/api/quizzes"),
        fetchJson("/api/blooks"),
        fetchJson("/api/minigames"),
        fetchJson("/api/account"),
        fetchJson("/api/server-info")
      ]);

      state.auth = auth || null;
      state.quizzes = Array.isArray(quizzes?.sets) ? quizzes.sets : [];
      state.blooks = Array.isArray(blooks?.packs) ? blooks.packs : [];
      state.minigames = Array.isArray(minigames?.games) ? minigames.games : [];
      state.minigameStats = Array.isArray(minigames?.stats) ? minigames.stats : [];
      state.account = account?.account || null;
      state.accountKey = account?.accountKey || "";
      state.serverInfo = serverInfo || null;
    } catch (_error) {
      state.auth = state.auth || { authEnabled: false, authenticated: false, user: null };
      state.quizzes = state.quizzes || [];
      state.blooks = state.blooks || [];
      state.minigames = state.minigames || [];
      state.minigameStats = state.minigameStats || [];
    }

    renderUserBar();
    renderSummaryGrid();
    renderActiveRoomCallout();
    renderCreatePane();
    renderMySets();
    renderDiscover();
    renderFavorites();
    renderHistory();
    renderHomework();
    renderSettings();
    renderStats();
    renderBlooks();
    renderMarket();
    renderHostFocusNote();
  }

  setPaneVisibility();
  bindEvents();
  loadData();
})();
