(async () => {
  const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Chroma", "Mystical"];
  const RARITY_SCORES = {
    Common: 1,
    Uncommon: 2,
    Rare: 5,
    Epic: 12,
    Legendary: 30,
    Chroma: 65,
    Mystical: 120
  };
  const PACK_PALETTES = [
    { start: "#b05ac9", end: "#8b3fb0" },
    { start: "#6f9861", end: "#4c7242" },
    { start: "#3cbce2", end: "#1f87bb" },
    { start: "#d67d33", end: "#b55a19" },
    { start: "#195e73", end: "#0f3e52" },
    { start: "#61884a", end: "#3f6431" },
    { start: "#2d86f0", end: "#1252ce" },
    { start: "#ff9833", end: "#fb6d00" },
    { start: "#42bf6c", end: "#269153" },
    { start: "#393c9d", end: "#171753" },
    { start: "#a4a4a4", end: "#757575" },
    { start: "#7a4cbc", end: "#4b2b77" }
  ];
  const WEEKLY_SHOP_ITEMS = [
    { name: "Japanese Garden View", price: 200, rarity: "Uncommon", artClass: "theme-garden", artLabel: "" },
    { name: "Sushi", price: 500, rarity: "Rare", artClass: "theme-sushi", artLabel: "S" },
    { name: "Gardener", price: 100, rarity: "Uncommon", artClass: "theme-title", artLabel: "Title" },
    { name: "Adventurer", price: 150, rarity: "Uncommon", artClass: "theme-title", artLabel: "Title" }
  ];

  const marketCoinsEl = document.getElementById("studentMarketCoins");
  const marketAvatarEl = document.getElementById("studentMarketAvatar");
  const marketNameEl = document.getElementById("studentMarketName");
  const marketStatusEl = document.getElementById("studentMarketStatus");
  const marketRoomCodeEl = document.getElementById("studentMarketRoomCode");
  const marketNoticeEl = document.getElementById("studentMarketNotice");
  const marketPackGridEl = document.getElementById("studentMarketPackGrid");
  const weeklyShopGridEl = document.getElementById("studentWeeklyShopGrid");
  const marketMascotEl = document.getElementById("studentMarketMascot");
  const marketRarityGridEl = document.getElementById("studentMarketRarityGrid");
  const marketBlooksTotalEl = document.getElementById("studentMarketBlooksTotal");
  const marketValueTotalEl = document.getElementById("studentMarketValueTotal");
  const instantOpenInput = document.getElementById("studentMarketInstantOpen");
  const marketRevealOverlayEl = document.getElementById("marketRevealOverlay");
  const marketRevealCardEl = document.getElementById("marketRevealCard");
  const marketRevealBodyEl = document.getElementById("marketRevealBody");
  const marketRevealFireworksEl = document.getElementById("marketRevealFireworks");

  const state = {
    student: null,
    account: null,
    accountKey: "",
    packs: [],
    activeRoom: null,
    reward: null,
    instantOpen: false
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
    if (!Number.isFinite(parsed)) {
      return "0";
    }
    return Math.max(0, Math.floor(parsed)).toLocaleString("en-US");
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

  function avatarMarkup(item, fallbackValue) {
    if (item?.image) {
      return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name || fallbackValue)}" />`;
    }
    return `<div class="student-avatar-fallback">${escapeHtml(fallbackInitials(fallbackValue))}</div>`;
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

  function inventoryLookup(account) {
    const lookup = new Map();
    if (!Array.isArray(account?.inventory)) {
      return lookup;
    }
    for (const item of account.inventory) {
      lookup.set(String(item?.id || ""), item);
    }
    return lookup;
  }

  function packSummaryLookup(account) {
    const lookup = new Map();
    if (!Array.isArray(account?.packs)) {
      return lookup;
    }
    for (const item of account.packs) {
      lookup.set(String(item?.id || ""), item);
    }
    return lookup;
  }

  function mergedPacks() {
    const inventory = inventoryLookup(state.account);
    const summaries = packSummaryLookup(state.account);

    return state.packs.map((pack) => {
      const summary = summaries.get(String(pack?.id || "")) || {};
      const blooks = Array.isArray(pack?.blooks)
        ? pack.blooks.map((blook) => {
            const owned = inventory.get(String(blook?.id || ""));
            return {
              ...blook,
              count: Math.max(0, Number(owned?.count || 0)),
              unlocked: Math.max(0, Number(owned?.count || 0)) > 0
            };
          })
        : [];

      return {
        ...pack,
        totalCount: Number(summary?.totalCount ?? pack?.totalCount ?? blooks.length),
        ownedCount: Number(summary?.ownedCount ?? blooks.filter((item) => item.unlocked).length),
        duplicateCount: Number(summary?.duplicateCount ?? 0),
        openCost: Number(summary?.openCost ?? pack?.openCost ?? 0),
        sellValueEach: Number(summary?.sellValueEach ?? pack?.sellValueEach ?? 0),
        blooks
      };
    });
  }

  function duplicateValueTotal(account) {
    if (!Array.isArray(account?.inventory)) {
      return 0;
    }

    return account.inventory.reduce((sum, item) => {
      const duplicates = Math.max(0, Number(item?.duplicates || 0));
      const sellValueEach = Math.max(0, Number(item?.sellValueEach || 0));
      return sum + duplicates * sellValueEach;
    }, 0);
  }

  function rarityTallies(account) {
    const tallies = new Map();
    for (const rarity of RARITY_ORDER) {
      tallies.set(rarity, 0);
    }

    if (!Array.isArray(account?.inventory)) {
      return tallies;
    }

    for (const item of account.inventory) {
      const rarity = String(item?.rarity || "Common");
      tallies.set(rarity, (tallies.get(rarity) || 0) + 1);
    }

    return tallies;
  }

  function blookScore(account) {
    const tallies = rarityTallies(account);
    let total = 0;
    for (const [rarity, count] of tallies.entries()) {
      total += Math.max(0, Number(count || 0)) * Math.max(0, Number(RARITY_SCORES[rarity] || 1));
    }
    return total;
  }

  function packPalette(index) {
    return PACK_PALETTES[index % PACK_PALETTES.length];
  }

  function canOpenPack(pack) {
    const coins = Math.max(0, Number(state.account?.coins || 0));
    const freeOpens = Math.max(0, Number(state.account?.freePackOpensRemaining || 0));
    return freeOpens > 0 || Number(pack?.openCost || 0) <= 0 || coins >= Number(pack?.openCost || 0);
  }

  function setNotice(message, tone = "") {
    if (!marketNoticeEl) {
      return;
    }

    if (!message) {
      marketNoticeEl.classList.add("hidden");
      marketNoticeEl.classList.remove("good", "bad");
      marketNoticeEl.textContent = "";
      return;
    }

    marketNoticeEl.classList.remove("hidden", "good", "bad");
    if (tone) {
      marketNoticeEl.classList.add(tone);
    }
    marketNoticeEl.textContent = message;
  }

  function buildStyleVars(vars) {
    return Object.entries(vars)
      .map(([key, value]) => `--${key}:${value}`)
      .join(";");
  }

  function raritySlug(rarity) {
    return String(rarity || "common")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
  }

  function buildMarketRevealFireworks() {
    const bursts = Array.from({ length: 7 }, (_value, index) => `
      <span class="market-reveal-burst" style="${buildStyleVars({
        left: `${10 + index * 12}%`,
        top: `${10 + (index % 3) * 18}%`,
        hue: `${index * 48}`,
        delay: `${index * 0.08}s`,
        scale: 0.82 + (index % 4) * 0.12
      })}"></span>
    `).join("");

    const sparks = Array.from({ length: 22 }, (_value, index) => `
      <span class="market-reveal-spark" style="${buildStyleVars({
        left: `${6 + (index * 4) % 90}%`,
        top: `${8 + (index * 11) % 78}%`,
        hue: `${30 + index * 13}`,
        delay: `${index * 0.04}s`,
        driftX: `${-50 + (index % 7) * 16}px`,
        driftY: `${-26 + (index % 5) * 12}px`
      })}"></span>
    `).join("");

    return `${bursts}${sparks}`;
  }

  function renderMarketRevealBody(reward) {
    const rarity = reward?.rarity || "Common";
    const duplicate = reward?.duplicate === true;
    const image = reward?.image
      ? `<img src="${escapeHtml(reward.image)}" class="blook-image market-reveal-image" alt="${escapeHtml(reward.name || "Unlocked blook")}" />`
      : `<span class="blook-emoji market-reveal-emoji">${escapeHtml(reward?.icon || "?")}</span>`;

    return `
      <div class="market-reveal-pack-line">
        <span class="market-reveal-pack-pill">${escapeHtml(reward?.packName || "Mystery Pack")}</span>
        <span class="market-reveal-pack-pill">${escapeHtml(rarity)}</span>
      </div>
      <div class="market-reveal-stage">
        <div class="market-reveal-seal-wrap" aria-hidden="true">
          <div class="market-reveal-seal">${escapeHtml(duplicate ? "Again" : "New")}</div>
        </div>
        <div class="market-reveal-blook-wrap">
          <div class="market-reveal-halo"></div>
          ${image}
        </div>
      </div>
      <div class="market-reveal-copy">
        <span class="market-reveal-kicker">${escapeHtml(duplicate ? "Unlocked Again" : "New Unlock")}</span>
        <h2 id="marketRevealTitle">${escapeHtml(reward?.name || "Mystery Blook")}</h2>
        <div class="market-reveal-rarity">${escapeHtml(rarity)}</div>
        <p>${escapeHtml(duplicate ? "Another copy joined your collection." : "This blook is now in your collection.")}</p>
        <div class="market-reveal-meta">
          <span>${escapeHtml(`${formatCount(reward?.count || 1)} owned`)}</span>
          <span>${escapeHtml(reward?.packName || "Pack")}</span>
        </div>
      </div>
      <div class="market-reveal-actions">
        <button class="dashboard-action" type="button" data-close-market-reveal>Back to Market</button>
        <div class="market-reveal-hint">Press Esc or click outside to continue</div>
      </div>
    `;
  }

  function hideReveal() {
    if (!marketRevealOverlayEl) {
      return;
    }
    marketRevealOverlayEl.classList.remove("is-visible", "is-revealed");
    marketRevealOverlayEl.setAttribute("aria-hidden", "true");
    marketRevealOverlayEl.hidden = true;
    document.body.classList.remove("market-reveal-open");
  }

  function showReveal(reward) {
    if (!marketRevealOverlayEl || !marketRevealBodyEl || !marketRevealFireworksEl || !reward?.id) {
      return;
    }
    marketRevealFireworksEl.innerHTML = buildMarketRevealFireworks();
    marketRevealBodyEl.innerHTML = renderMarketRevealBody(reward);
    if (marketRevealCardEl) {
      marketRevealCardEl.className = `market-reveal-card rarity-${escapeHtml(raritySlug(reward.rarity))}`;
    }
    marketRevealOverlayEl.hidden = false;
    marketRevealOverlayEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("market-reveal-open");
    window.requestAnimationFrame(() => {
      marketRevealOverlayEl.classList.add("is-visible");
      window.setTimeout(() => {
        marketRevealOverlayEl.classList.add("is-revealed");
      }, 24);
    });
  }

  function renderPackGrid() {
    if (!marketPackGridEl) {
      return;
    }

    const packs = mergedPacks();
    if (!packs.length) {
      marketPackGridEl.innerHTML = `<div class="student-market-notice">No packs loaded yet.</div>`;
      return;
    }

    marketPackGridEl.innerHTML = packs.map((pack, index) => {
      const palette = packPalette(index);
      const mainArt = pack?.blooks?.[0];
      const accentArt = pack?.blooks?.find((item) => item?.id !== mainArt?.id) || pack?.blooks?.[1];
      const disabled = !canOpenPack(pack);
      const price = Number(pack?.openCost || 0) <= 0 ? "Free" : formatCount(pack.openCost);

      return `
        <button
          class="student-pack-card"
          type="button"
          data-open-pack="${escapeHtml(pack.id)}"
          style="background:linear-gradient(180deg, ${palette.start} 0%, ${palette.end} 100%);${disabled ? "opacity:0.72;" : ""}"
          ${disabled ? "disabled" : ""}
        >
          <div class="student-pack-wrapper">
            <h3 class="student-pack-name">${escapeHtml(pack.name)}</h3>
            <div class="student-pack-art">
              <div class="student-pack-art-main">
                ${mainArt?.image ? `<img src="${escapeHtml(mainArt.image)}" class="student-pack-image" alt="${escapeHtml(mainArt.name || pack.name)}" />` : `<div class="student-pack-art-fallback">${escapeHtml(fallbackInitials(pack.name))}</div>`}
              </div>
              <div class="student-pack-art-accent">
                ${accentArt?.image ? `<img src="${escapeHtml(accentArt.image)}" class="student-pack-image" alt="${escapeHtml(accentArt.name || pack.name)}" />` : `<div class="student-pack-art-fallback">B</div>`}
              </div>
            </div>
            <div class="student-pack-footer">
              <span class="student-pack-price">B ${escapeHtml(price)}</span>
              <span class="student-pack-owned">${escapeHtml(`${formatCount(pack.ownedCount)}/${formatCount(pack.totalCount)}`)}</span>
            </div>
          </div>
        </button>
      `;
    }).join("");
  }

  function renderWeeklyShop() {
    if (!weeklyShopGridEl) {
      return;
    }

    weeklyShopGridEl.innerHTML = WEEKLY_SHOP_ITEMS.map((item, index) => {
      const palette = packPalette(index + 3);
      return `
        <article class="student-weekly-card" style="background:linear-gradient(180deg, ${palette.start} 0%, ${palette.end} 100%)">
          <h3>${escapeHtml(item.name)}</h3>
          <div class="student-weekly-art ${escapeHtml(item.artClass)}">${escapeHtml(item.artLabel || (item.artClass === "theme-sushi" ? "Sushi" : ""))}</div>
          <div class="student-weekly-footer">
            <span class="student-weekly-price">B ${escapeHtml(formatCount(item.price))}</span>
            <span class="student-weekly-rarity ${item.rarity === "Rare" ? "rare" : ""}">${escapeHtml(item.rarity)}</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderSidebar() {
    const roomCode = String(state.activeRoom?.code || "").toUpperCase().trim();
    if (marketRoomCodeEl) {
      marketRoomCodeEl.textContent = roomCode || "No Room";
    }
  }

  function renderTopbar() {
    const student = state.student;
    const account = state.account;
    const featuredBlook = selectedBlook(account);
    const freeOpens = Math.max(0, Number(account?.freePackOpensRemaining || 0));

    if (marketCoinsEl) {
      marketCoinsEl.textContent = `B ${formatCount(account?.coins || 0)}`;
    }
    if (marketAvatarEl) {
      marketAvatarEl.innerHTML = avatarMarkup(featuredBlook, student?.displayName || "guest");
    }
    if (marketNameEl) {
      marketNameEl.textContent = student?.displayName || "guest";
    }
    if (marketStatusEl) {
      marketStatusEl.textContent = student
        ? (freeOpens > 0 ? `${formatCount(freeOpens)} free open${freeOpens === 1 ? "" : "s"} ready` : "Student market")
        : "Guest market";
    }
    if (marketMascotEl) {
      marketMascotEl.innerHTML = avatarMarkup(featuredBlook, student?.displayName || "Blook");
    }
  }

  function renderSideSummary() {
    if (!marketRarityGridEl || !marketBlooksTotalEl || !marketValueTotalEl) {
      return;
    }

    const tallies = rarityTallies(state.account);
    const summaryRows = [
      { label: "Common", value: tallies.get("Common") || 0 },
      { label: "Rare", value: tallies.get("Rare") || 0 },
      { label: "Epic", value: tallies.get("Epic") || 0 },
      { label: "Legendary", value: tallies.get("Legendary") || 0 }
    ];

    marketRarityGridEl.innerHTML = summaryRows.map((row) => `
      <div class="student-stall-rarity-card">
        <strong>${escapeHtml(formatCount(row.value))}</strong>
        <span>${escapeHtml(row.label)}</span>
      </div>
    `).join("");

    const blooksTotal = Array.from(tallies.values()).reduce((sum, count) => sum + Math.max(0, Number(count || 0)), 0);
    if (marketBlooksTotalEl) {
      marketBlooksTotalEl.textContent = formatCount(blooksTotal);
    }
    if (marketValueTotalEl) {
      marketValueTotalEl.textContent = formatCount(duplicateValueTotal(state.account));
    }
  }

  function renderPage() {
    renderSidebar();
    renderTopbar();
    renderPackGrid();
    renderWeeklyShop();
    renderSideSummary();

    if (!state.student) {
      setNotice("Guest market loaded. Log in on the student dashboard if you want these pack opens tied to your classroom account.");
    } else if (!state.reward) {
      setNotice("");
    }
  }

  async function openPack(packId) {
    if (!packId) {
      return;
    }

    setNotice("");
    try {
      const payload = await fetchJson("/api/account/open-pack", {
        method: "POST",
        body: JSON.stringify({
          accountKey: state.accountKey,
          packId
        })
      });

      state.account = payload.account || state.account;
      state.accountKey = payload.accountKey || state.accountKey;
      state.reward = payload.reward || null;
      renderPage();

      if (state.instantOpen) {
        setNotice(`${state.reward?.name || "Blook"} unlocked${state.reward?.duplicate ? " again" : ""}.`, "good");
      } else {
        showReveal(state.reward);
      }
    } catch (error) {
      setNotice(error?.message || "Could not open that pack.", "bad");
    }
  }

  function bindEvents() {
    if (marketPackGridEl) {
      marketPackGridEl.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open-pack]");
        if (!button || button.disabled) {
          return;
        }
        event.preventDefault();
        openPack(button.getAttribute("data-open-pack"));
      });
    }

    if (instantOpenInput) {
      instantOpenInput.addEventListener("change", () => {
        state.instantOpen = instantOpenInput.checked;
        const label = instantOpenInput.closest(".student-market-toggle")?.querySelector("span");
        if (label) {
          label.textContent = `Instant Open: ${state.instantOpen ? "On" : "Off"}`;
        }
      });
    }

    if (marketRevealOverlayEl) {
      marketRevealOverlayEl.addEventListener("click", (event) => {
        if (event.target === marketRevealOverlayEl || event.target.closest("[data-close-market-reveal]")) {
          event.preventDefault();
          hideReveal();
        }
      });
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && marketRevealOverlayEl && !marketRevealOverlayEl.hidden) {
        event.preventDefault();
        hideReveal();
      }
    });
  }

  async function loadData() {
    try {
      const [studentStatus, accountPayload, blooksPayload, serverInfo] = await Promise.all([
        fetchJson("/api/student-auth/status").catch(() => ({ loggedIn: false, student: null })),
        fetchJson("/api/account"),
        fetchJson("/api/blooks"),
        fetchJson("/api/server-info").catch(() => ({ activeRoom: null }))
      ]);

      state.student = studentStatus?.loggedIn && studentStatus?.student
        ? {
            username: String(studentStatus.student.username || ""),
            displayName: String(studentStatus.student.displayName || "")
          }
        : null;
      state.account = accountPayload?.account || null;
      state.accountKey = String(accountPayload?.accountKey || "");
      state.packs = Array.isArray(blooksPayload?.packs) ? blooksPayload.packs : [];
      state.activeRoom = serverInfo?.activeRoom || null;
      renderPage();
    } catch (error) {
      setNotice(error?.message || "Could not load the student market yet.", "bad");
      renderPage();
    }
  }

  bindEvents();
  await loadData();
})();
