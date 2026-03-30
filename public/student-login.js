(async () => {
  const STUDENT_NAME_STORAGE_KEY = "blooketStudentLoginUsername";
  const XP_TARGET = 5;
  const RARITY_ORDER = new Map([
    ["Mystical", 0],
    ["Chroma", 1],
    ["Legendary", 2],
    ["Epic", 3],
    ["Rare", 4],
    ["Uncommon", 5],
    ["Common", 6]
  ]);
  const RARITY_SCORES = {
    Common: 1,
    Uncommon: 2,
    Rare: 5,
    Epic: 12,
    Legendary: 30,
    Chroma: 65,
    Mystical: 120
  };
  const RARITY_SUMMARY_ORDER = [
    { rarity: "Common", icon: "C", color: "#b7c4d8" },
    { rarity: "Uncommon", icon: "U", color: "#32d85d" },
    { rarity: "Rare", icon: "R", color: "#4ba2ff" },
    { rarity: "Epic", icon: "E", color: "#ff7a47" },
    { rarity: "Legendary", icon: "L", color: "#ffcb38" },
    { rarity: "Chroma", icon: "C", color: "#f04bba" },
    { rarity: "Mystical", icon: "M", color: "#9d59ff" }
  ];

  const usernameInput = document.getElementById("studentAuthUsername");
  const passwordInput = document.getElementById("studentAuthPassword");
  const loginBtn = document.getElementById("studentAuthLoginBtn");
  const logoutBtn = document.getElementById("studentAuthLogoutBtn");
  const loginForm = document.getElementById("studentLoginForm");
  const noticeEl = document.getElementById("studentAuthNotice");
  const summaryEl = document.getElementById("studentAuthSummary");
  const roomSummaryEl = document.getElementById("studentRoomSummary");
  const topCoinsEl = document.getElementById("studentTopCoins");
  const joinLiveBtn = document.getElementById("studentJoinLiveBtn");
  const historyJoinLink = document.getElementById("studentHistoryJoinLink");
  const sidebarRoomCodeEl = document.getElementById("studentSidebarRoomCode");
  const miniAvatarEl = document.getElementById("studentMiniAvatar");
  const miniNameEl = document.getElementById("studentMiniName");
  const miniStatusEl = document.getElementById("studentMiniStatus");
  const heroAvatarEl = document.getElementById("studentHeroAvatar");
  const heroNameEl = document.getElementById("studentHeroName");
  const heroTierEl = document.getElementById("studentHeroTier");
  const heroLevelValueEl = document.getElementById("studentHeroLevelValue");
  const heroLevelFillEl = document.getElementById("studentHeroLevelFill");
  const heroStatusEl = document.getElementById("studentHeroStatus");
  const panelCoinsEl = document.getElementById("studentPanelCoins");
  const panelUnlockedEl = document.getElementById("studentPanelUnlocked");
  const sessionSummaryEl = document.getElementById("studentSessionSummary");
  const classPassXpEl = document.getElementById("studentClassPassXp");
  const classPassTrackEl = document.getElementById("studentClassPassTrack");
  const showFreeBlooksInput = document.getElementById("studentShowFreeBlooks");
  const showPackGroupsInput = document.getElementById("studentShowPackGroups");
  const blooksPackListEl = document.getElementById("studentBlooksPackList");
  const blooksScoreValueEl = document.getElementById("studentBlooksScoreValue");
  const blooksTotalValueEl = document.getElementById("studentBlooksTotalValue");
  const blooksUnlockedTotalEl = document.getElementById("studentBlooksUnlockedTotal");
  const blooksRarityGridEl = document.getElementById("studentBlooksRarityGrid");
  const historyCopyEl = document.getElementById("studentHistoryCopy");
  const historyMetaEl = document.getElementById("studentHistoryMeta");
  const collectionGridEl = document.getElementById("studentCollectionGrid");
  const statsGridEl = document.getElementById("studentStatsGrid");

  let authBusy = false;
  let currentStudent = null;
  let currentAccount = null;
  let currentActiveRoom = null;
  let currentBlookCatalog = [];

  function normalizeStudentLoginUsername(value) {
    if (typeof value !== "string") {
      return "";
    }
    const firstToken = value.trim().split(/\s+/)[0] || "";
    return firstToken.toLowerCase().replace(/[^a-z]/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
      loginBtn.textContent = authBusy ? "Logging In..." : "Log In";
      loginBtn.classList.toggle("hidden", loggedIn);
    }
    if (logoutBtn) {
      logoutBtn.disabled = authBusy;
      logoutBtn.classList.toggle("hidden", !loggedIn);
    }
    if (loginForm) {
      loginForm.classList.toggle("hidden", loggedIn);
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
    return Math.max(0, Math.floor(parsed)).toLocaleString("en-US");
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

  function totalDuplicateCount(account) {
    if (!Array.isArray(account?.inventory)) {
      return 0;
    }
    return account.inventory.reduce((sum, row) => sum + Math.max(0, Number(row?.duplicates || 0)), 0);
  }

  function sortInventory(account) {
    const rows = Array.isArray(account?.inventory) ? [...account.inventory] : [];
    const selectedId = String(account?.selectedBlookId || "");
    rows.sort((left, right) => {
      const leftSelected = String(left?.id || "") === selectedId ? 1 : 0;
      const rightSelected = String(right?.id || "") === selectedId ? 1 : 0;
      if (leftSelected !== rightSelected) {
        return rightSelected - leftSelected;
      }

      const leftRarity = RARITY_ORDER.get(String(left?.rarity || "")) ?? 99;
      const rightRarity = RARITY_ORDER.get(String(right?.rarity || "")) ?? 99;
      if (leftRarity !== rightRarity) {
        return leftRarity - rightRarity;
      }

      const leftCount = Math.max(0, Number(left?.count || 0));
      const rightCount = Math.max(0, Number(right?.count || 0));
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }

      return String(left?.name || "").localeCompare(String(right?.name || ""));
    });
    return rows;
  }

  function selectedBlook(account) {
    const inventory = sortInventory(account);
    return inventory[0] || null;
  }

  function levelDescriptor(level) {
    if (level >= 30) return "Legend";
    if (level >= 20) return "Champion";
    if (level >= 12) return "All-Star";
    if (level >= 7) return "Collector";
    if (level >= 3) return "Rising";
    return "Newbie";
  }

  function accountLevel(account) {
    const totalCorrect = Math.max(0, Number(account?.stats?.totalCorrect || 0));
    const level = Math.floor(totalCorrect / XP_TARGET);
    const progress = totalCorrect % XP_TARGET;
    const percent = XP_TARGET > 0 ? Math.max(0, Math.min(100, Math.round((progress / XP_TARGET) * 100))) : 0;
    return {
      level,
      progress,
      target: XP_TARGET,
      percent,
      title: levelDescriptor(level)
    };
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
        const leftWins = Math.max(0, Number(left?.wins || 0));
        const rightWins = Math.max(0, Number(right?.wins || 0));
        return rightWins - leftWins;
      })[0];
  }

  function totalMiniGameWins(account) {
    if (!Array.isArray(account?.miniGames)) {
      return 0;
    }
    return account.miniGames.reduce((sum, row) => sum + Math.max(0, Number(row?.wins || 0)), 0);
  }

  function totalMiniGamePlays(account) {
    if (!Array.isArray(account?.miniGames)) {
      return 0;
    }
    return account.miniGames.reduce((sum, row) => sum + Math.max(0, Number(row?.plays || 0)), 0);
  }

  function fallbackInitials(value) {
    const safe = String(value || "").trim();
    if (!safe) {
      return "S";
    }
    return safe
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || safe.slice(0, 1).toUpperCase();
  }

  function imageMarkup(item, fallbackValue) {
    if (item?.image) {
      return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name || fallbackValue)}" loading="lazy" />`;
    }
    return `<div class="student-avatar-fallback">${escapeHtml(fallbackInitials(fallbackValue))}</div>`;
  }

  function inventoryLookup(account) {
    const lookup = new Map();
    if (!Array.isArray(account?.inventory)) {
      return lookup;
    }
    for (const row of account.inventory) {
      lookup.set(String(row?.id || ""), row);
    }
    return lookup;
  }

  function packSummaryLookup(account) {
    const lookup = new Map();
    if (!Array.isArray(account?.packs)) {
      return lookup;
    }
    for (const row of account.packs) {
      lookup.set(String(row?.id || ""), row);
    }
    return lookup;
  }

  function mergedBlookPacks() {
    const inventory = inventoryLookup(currentAccount);
    const packSummaries = packSummaryLookup(currentAccount);
    const selectedId = String(currentAccount?.selectedBlookId || "");

    return currentBlookCatalog.map((pack) => {
      const summary = packSummaries.get(String(pack?.id || "")) || {};
      const mergedBlooks = Array.isArray(pack?.blooks)
        ? pack.blooks.map((blook) => {
            const owned = inventory.get(String(blook?.id || ""));
            const count = Math.max(0, Number(owned?.count || 0));
            const duplicates = Math.max(0, Number(owned?.duplicates || Math.max(0, count - 1)));
            return {
              ...blook,
              count,
              duplicates,
              unlocked: count > 0,
              selected: String(blook?.id || "") === selectedId
            };
          })
        : [];

      return {
        ...pack,
        openCost: Number(summary?.openCost ?? pack?.openCost ?? 0),
        ownedCount: Number(summary?.ownedCount ?? mergedBlooks.filter((row) => row.unlocked).length),
        duplicateCount: Number(summary?.duplicateCount ?? mergedBlooks.reduce((sum, row) => sum + row.duplicates, 0)),
        totalCount: Number(summary?.totalCount ?? pack?.totalCount ?? mergedBlooks.length),
        blooks: mergedBlooks
      };
    });
  }

  function duplicateSellValueTotal(account) {
    if (!Array.isArray(account?.inventory)) {
      return 0;
    }
    return account.inventory.reduce((sum, row) => {
      const duplicates = Math.max(0, Number(row?.duplicates || 0));
      const sellValueEach = Math.max(0, Number(row?.sellValueEach || 0));
      return sum + duplicates * sellValueEach;
    }, 0);
  }

  function rarityTallies(packs) {
    const tallies = new Map();
    for (const config of RARITY_SUMMARY_ORDER) {
      tallies.set(config.rarity, 0);
    }

    for (const pack of packs) {
      for (const blook of pack?.blooks || []) {
        if (!blook?.unlocked) {
          continue;
        }
        const rarity = String(blook?.rarity || "Common");
        tallies.set(rarity, (tallies.get(rarity) || 0) + 1);
      }
    }

    return tallies;
  }

  function blookScoreFromTallies(tallies) {
    let total = 0;
    for (const [rarity, count] of tallies.entries()) {
      total += Math.max(0, Number(count || 0)) * Math.max(0, Number(RARITY_SCORES[rarity] || 1));
    }
    return total;
  }

  function blookTileMarkup(blook) {
    const safeName = String(blook?.name || "Blook");
    const unlocked = blook?.unlocked === true;
    const image = blook?.image
      ? `<img src="${escapeHtml(blook.image)}" alt="${escapeHtml(safeName)}" loading="lazy" />`
      : `<div class="student-blook-silhouette">${unlocked ? escapeHtml(fallbackInitials(safeName)) : "?"}</div>`;
    const countBadge = unlocked && Number(blook?.count || 0) > 1
      ? `<span class="student-blook-count">${escapeHtml(formatCount(blook.count))}</span>`
      : "";
    const lockBadge = unlocked ? "" : `<span class="student-blook-lock">L</span>`;
    const selectedClass = blook?.selected ? " is-selected" : "";
    const stateClass = unlocked ? "is-unlocked" : "is-locked";
    const meta = unlocked
      ? `${safeName} | ${blook?.rarity || "Unlocked"}${Number(blook?.count || 0) > 1 ? ` | x${formatCount(blook.count)}` : ""}`
      : `${safeName} | Locked`;

    return `
      <div class="student-blook-tile ${stateClass}${selectedClass}" title="${escapeHtml(meta)}">
        ${image}
        ${countBadge}
        ${lockBadge}
      </div>
    `;
  }

  function packMarkup(pack) {
    return `
      <section class="student-blook-pack">
        <div class="student-blook-pack-head">
          <h3>${escapeHtml(pack.name || "Pack")}</h3>
          <div class="student-blook-pack-meta">${escapeHtml(`${formatCount(pack.ownedCount)} / ${formatCount(pack.totalCount)} unlocked`)}</div>
        </div>
        <div class="student-blook-pack-grid">
          ${(pack.blooks || []).map((blook) => blookTileMarkup(blook)).join("")}
        </div>
      </section>
    `;
  }

  function flatBlooksMarkup(packs) {
    const allBlooks = packs.flatMap((pack) => pack?.blooks || []);
    return `
      <section class="student-blook-pack">
        <div class="student-blook-flat-head">
          <h3>All Blooks</h3>
          <div class="student-blook-pack-meta">${escapeHtml(`${formatCount(allBlooks.filter((row) => row.unlocked).length)} unlocked`)}</div>
        </div>
        <div class="student-blook-pack-grid">
          ${allBlooks.map((blook) => blookTileMarkup(blook)).join("")}
        </div>
      </section>
    `;
  }

  function renderBlooksBoard() {
    if (!blooksPackListEl || !blooksRarityGridEl || !blooksScoreValueEl || !blooksTotalValueEl || !blooksUnlockedTotalEl) {
      return;
    }

    if (!Array.isArray(currentBlookCatalog) || currentBlookCatalog.length === 0) {
      blooksPackListEl.innerHTML = `<div class="student-blooks-empty">Loading blook packs...</div>`;
      blooksRarityGridEl.innerHTML = "";
      setText(blooksScoreValueEl, "0");
      setText(blooksTotalValueEl, "0");
      setText(blooksUnlockedTotalEl, "0");
      return;
    }

    const includeFree = showFreeBlooksInput ? showFreeBlooksInput.checked : true;
    const showPackGroups = showPackGroupsInput ? showPackGroupsInput.checked : true;
    let packs = mergedBlookPacks();

    if (!includeFree) {
      packs = packs.filter((pack) => Number(pack?.openCost || 0) > 0);
    }

    if (packs.length === 0) {
      blooksPackListEl.innerHTML = `<div class="student-blooks-empty">No packs match those filters yet.</div>`;
    } else {
      blooksPackListEl.innerHTML = showPackGroups
        ? packs.map((pack) => packMarkup(pack)).join("")
        : flatBlooksMarkup(packs);
    }

    const tallies = rarityTallies(packs);
    const score = blookScoreFromTallies(tallies);
    const unlockedTotal = Array.from(tallies.values()).reduce((sum, count) => sum + Math.max(0, Number(count || 0)), 0);

    blooksRarityGridEl.innerHTML = RARITY_SUMMARY_ORDER.map((item) => `
      <div class="student-blooks-rarity-card">
        <div class="student-blooks-rarity-gem" style="background:${escapeHtml(item.color)}"><span>${escapeHtml(item.icon)}</span></div>
        <strong>${escapeHtml(formatCount(tallies.get(item.rarity) || 0))}</strong>
        <span>${escapeHtml(item.rarity)}</span>
      </div>
    `).join("");

    setText(blooksScoreValueEl, formatCount(score));
    setText(blooksTotalValueEl, formatCount(duplicateSellValueTotal(currentAccount)));
    setText(blooksUnlockedTotalEl, formatCount(unlockedTotal));
  }

  function panelStats(account) {
    const topGame = topMiniGame(account);
    return [
      { label: "Total Tokens", value: formatCount(account?.coins || 0), icon: "T", tone: "gold" },
      { label: "Blooks Unlocked", value: formatCount(unlockedBlookCount(account)), icon: "B", tone: "cyan" },
      { label: "Games Played", value: formatCount(account?.stats?.gamesPlayed || 0), icon: "G", tone: "pink" },
      { label: "Total Correct", value: formatCount(account?.stats?.totalCorrect || 0), icon: "C", tone: "green" },
      { label: "Best Rank", value: ordinalPlace(account?.stats?.bestRank || 0), icon: "R", tone: "blue" },
      { label: "Packs With Unlocks", value: formatCount(ownedPackCount(account)), icon: "P", tone: "orange" },
      { label: "Mini-Game Wins", value: formatCount(totalMiniGameWins(account)), icon: "W", tone: "purple" },
      { label: "Mini-Game Plays", value: formatCount(totalMiniGamePlays(account)), icon: "M", tone: "red" },
      { label: "Top Mini-Game", value: topGame?.name || "None yet", icon: "H", tone: "silver" },
      { label: "Free Pack Opens", value: formatCount(account?.freePackOpensRemaining || 0), icon: "F", tone: "teal" },
      { label: "Duplicates", value: formatCount(totalDuplicateCount(account)), icon: "D", tone: "orange" },
      { label: "Total Score", value: formatCount(account?.stats?.totalScore || 0), icon: "S", tone: "blue" }
    ];
  }

  function renderAvatar(target, item, fallbackValue) {
    if (!target) {
      return;
    }
    target.innerHTML = imageMarkup(item, fallbackValue);
  }

  function renderRoomSummary() {
    const roomCode = String(currentActiveRoom?.code || "").toUpperCase().trim();
    const joinHref = buildJoinHref(roomCode);

    if (joinLiveBtn) {
      joinLiveBtn.href = joinHref;
      joinLiveBtn.textContent = roomCode ? "Play Now!" : "Open Join Page";
    }

    if (historyJoinLink) {
      historyJoinLink.href = joinHref;
      historyJoinLink.textContent = roomCode ? `Join Room ${roomCode}` : "Open Join Page";
    }

    if (sidebarRoomCodeEl) {
      sidebarRoomCodeEl.textContent = roomCode || "No Room";
    }

    if (!roomSummaryEl) {
      return;
    }

    if (!roomCode) {
      roomSummaryEl.textContent = currentStudent
        ? "No live room right now. Your account is ready, so you can wait here for the next code."
        : "No live room right now. Sign in now so your saved account is ready for the next game.";
      return;
    }

    const phase = String(currentActiveRoom?.phase || "lobby").replace(/_/g, " ");
    roomSummaryEl.textContent = `Room ${roomCode} is live right now. Current phase: ${phase}.`;
  }

  function renderClassPass() {
    if (!classPassTrackEl) {
      return;
    }

    const inventory = sortInventory(currentAccount);
    const slots = [];
    for (let index = 0; index < 10; index += 1) {
      slots.push(inventory[index] || null);
    }

    classPassTrackEl.innerHTML = slots.map((item, index) => {
      if (!item) {
        return `
          <article class="student-pass-card">
            <div class="student-pass-thumb"><div class="student-avatar-fallback">+</div></div>
            <strong>Locked</strong>
            <small>Win more blooks</small>
            <span class="student-pass-index">${index + 1}</span>
          </article>
        `;
      }

      return `
        <article class="student-pass-card">
          <div class="student-pass-thumb">${imageMarkup(item, item.name)}</div>
          <strong>${escapeHtml(item.name || "Blook")}</strong>
          <small>${escapeHtml(item.rarity || item.packName || "Unlocked")}</small>
          <span class="student-pass-index">${index + 1}</span>
        </article>
      `;
    }).join("");

    const level = accountLevel(currentAccount);
    setText(classPassXpEl, `${formatCount(level.progress)} / ${formatCount(level.target)} XP`);
  }

  function renderHistory() {
    const loggedIn = Boolean(currentStudent && currentAccount);
    if (!historyCopyEl || !historyMetaEl) {
      return;
    }

    if (!loggedIn) {
      historyCopyEl.textContent = "No Games Played Yet";
      historyMetaEl.textContent = "Sign in to see saved progress, best rank, and your top mini-game.";
      return;
    }

    const gamesPlayed = Math.max(0, Number(currentAccount?.stats?.gamesPlayed || 0));
    const bestRank = ordinalPlace(currentAccount?.stats?.bestRank || 0);
    const topGame = topMiniGame(currentAccount);
    const totalCorrect = formatCount(currentAccount?.stats?.totalCorrect || 0);

    if (gamesPlayed <= 0) {
      historyCopyEl.textContent = "No Games Played Yet";
      historyMetaEl.textContent = `${currentStudent.displayName} is ready to play. Answer questions to start building your history.`;
      return;
    }

    historyCopyEl.textContent = `${formatCount(gamesPlayed)} game${gamesPlayed === 1 ? "" : "s"} played`;
    historyMetaEl.textContent = `Best finish: ${bestRank}. Total correct answers: ${totalCorrect}. Top mode: ${topGame?.name || "Still loading"}.`;
  }

  function renderCollection() {
    if (!collectionGridEl) {
      return;
    }

    const inventory = sortInventory(currentAccount).slice(0, 5);
    const slots = [];
    for (let index = 0; index < 5; index += 1) {
      slots.push(inventory[index] || null);
    }

    collectionGridEl.innerHTML = slots.map((item) => {
      if (!item) {
        return `
          <article class="student-collection-card">
            <div class="student-collection-thumb"><div class="student-avatar-fallback">+</div></div>
            <div class="student-collection-name">New Blook</div>
            <div class="student-collection-meta">Open packs to unlock one</div>
          </article>
        `;
      }

      const metaBits = [item.rarity || "Unlocked", `x${formatCount(item.count || 1)}`];
      return `
        <article class="student-collection-card">
          <div class="student-collection-thumb">${imageMarkup(item, item.name)}</div>
          <div class="student-collection-name">${escapeHtml(item.name || "Blook")}</div>
          <div class="student-collection-meta">${escapeHtml(metaBits.join(" | "))}</div>
        </article>
      `;
    }).join("");
  }

  function renderStats() {
    if (!statsGridEl) {
      return;
    }

    const stats = panelStats(currentAccount);
    statsGridEl.innerHTML = stats.map((item) => `
      <article class="student-stat-card" data-tone="${escapeHtml(item.tone)}">
        <div class="student-stat-icon">${escapeHtml(item.icon)}</div>
        <span class="student-stat-label">${escapeHtml(item.label)}</span>
        <strong class="student-stat-value">${escapeHtml(item.value)}</strong>
      </article>
    `).join("");
  }

  function renderAuthSummary() {
    const loggedIn = Boolean(currentStudent && currentAccount);
    if (!summaryEl) {
      return;
    }

    if (!loggedIn) {
      summaryEl.textContent = "Log in with your classroom first name and password. Your progress stays saved on this server.";
      return;
    }

    summaryEl.textContent = `${currentStudent.displayName} is loaded. Coins, blooks, and classroom stats are ready to use.`;
  }

  function renderHero() {
    const loggedIn = Boolean(currentStudent && currentAccount);
    const featuredBlook = selectedBlook(currentAccount);
    const displayName = loggedIn ? currentStudent.displayName : "Student Dashboard";
    const level = accountLevel(currentAccount);
    const roomCode = String(currentActiveRoom?.code || "").toUpperCase().trim();

    renderAvatar(heroAvatarEl, featuredBlook, displayName);
    renderAvatar(miniAvatarEl, featuredBlook, displayName);

    setText(heroNameEl, displayName);
    setText(heroTierEl, loggedIn ? level.title : "Log in to load your saved account.");
    setText(heroLevelValueEl, formatCount(level.level));
    setText(miniNameEl, loggedIn ? currentStudent.username : "guest");
    setText(miniStatusEl, loggedIn ? `${level.title} player` : "Student dashboard");

    if (heroLevelFillEl) {
      heroLevelFillEl.style.width = `${loggedIn ? level.percent : 0}%`;
    }

    if (panelCoinsEl) {
      panelCoinsEl.textContent = formatCount(currentAccount?.coins || 0);
    }
    if (panelUnlockedEl) {
      panelUnlockedEl.textContent = formatCount(unlockedBlookCount(currentAccount));
    }
    if (topCoinsEl) {
      topCoinsEl.textContent = formatCount(currentAccount?.coins || 0);
    }
    if (sessionSummaryEl) {
      sessionSummaryEl.classList.toggle("hidden", !loggedIn);
    }

    if (!heroStatusEl) {
      return;
    }

    if (!loggedIn) {
      heroStatusEl.textContent = "Sign in with your classroom first name to load saved coins, blooks, and stats.";
      return;
    }

    if (roomCode) {
      heroStatusEl.textContent = `Room ${roomCode} is live. Jump in now or keep browsing your saved blooks before class starts.`;
      return;
    }

    heroStatusEl.textContent = `${currentStudent.displayName}'s account is loaded. You can head to the join page now and wait for the next room code.`;
  }

  function renderPage() {
    const loggedIn = Boolean(currentStudent && currentAccount);

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
    renderRoomSummary();
    renderHero();
    renderBlooksBoard();
    renderClassPass();
    renderHistory();
    renderCollection();
    renderStats();
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

  async function refreshBlookCatalog() {
    const payload = await fetchJson("/api/blooks");
    currentBlookCatalog = Array.isArray(payload?.packs) ? payload.packs : [];
  }

  async function initializePage() {
    try {
      await Promise.all([refreshStudentStatus(), refreshServerInfo(), refreshBlookCatalog()]);
      renderPage();
    } catch (_error) {
      setNotice("Could not load the student dashboard yet. Refresh and try again.", "bad");
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
      if (passwordInput) {
        passwordInput.value = "";
      }
      renderPage();

      const roomCode = String(currentActiveRoom?.code || "").toUpperCase().trim();
      setNotice(
        roomCode
          ? `Logged in as ${currentStudent?.displayName || username}. Room ${roomCode} is ready to join.`
          : `Logged in as ${currentStudent?.displayName || username}. Your saved account is ready.`,
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

  for (const input of [showFreeBlooksInput, showPackGroupsInput]) {
    if (!input) {
      continue;
    }
    input.addEventListener("change", renderBlooksBoard);
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
    Promise.all([
      refreshServerInfo(),
      currentStudent ? refreshStudentStatus() : Promise.resolve()
    ])
      .then(renderPage)
      .catch(() => {
        // Ignore refresh failures until the next poll.
      });
  }, 15000);
})();
