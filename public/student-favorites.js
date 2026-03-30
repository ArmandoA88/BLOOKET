(async () => {
  const FAVORITES_STORAGE_KEY = "blooketStudentFavoriteSetIds";
  const coinsEl = document.getElementById("studentFavoritesCoins");
  const avatarEl = document.getElementById("studentFavoritesAvatar");
  const nameEl = document.getElementById("studentFavoritesName");
  const statusEl = document.getElementById("studentFavoritesStatus");
  const roomCodeEl = document.getElementById("studentFavoritesRoomCode");
  const metaEl = document.getElementById("studentFavoritesMeta");
  const contentEl = document.getElementById("studentFavoritesContent");

  const state = {
    student: null,
    account: null,
    quizzes: [],
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

  function readFavoriteIds() {
    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.map((value) => String(value || "")).filter(Boolean) : [];
    } catch (_error) {
      return [];
    }
  }

  function writeFavoriteIds(ids) {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
    } catch (_error) {
      return;
    }
  }

  function formatCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)).toLocaleString("en-US") : "0";
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

  function favoriteSets() {
    const ids = readFavoriteIds();
    const byId = new Map((Array.isArray(state.quizzes) ? state.quizzes : []).map((set) => [String(set?.id || ""), set]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  function gradientForSet(set) {
    const seed = String(set?.id || "");
    const palettes = [
      ["#55a6ff", "#6f63ff"],
      ["#14c7d8", "#0b9ac6"],
      ["#ff8d3f", "#ff5a57"],
      ["#79c840", "#1ba857"],
      ["#a858d7", "#6c49d8"]
    ];
    return palettes[seed.length % palettes.length];
  }

  function removeFavorite(setId) {
    const safeId = String(setId || "");
    writeFavoriteIds(readFavoriteIds().filter((id) => id !== safeId));
    renderPage();
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
      statusEl.textContent = state.activeRoom?.code ? `Room ${state.activeRoom.code}` : "Favorite sets";
    }
    if (roomCodeEl) {
      roomCodeEl.textContent = state.activeRoom?.code ? `Room: ${state.activeRoom.code}` : "Room: none";
    }
  }

  function renderMeta(sets) {
    if (!metaEl) {
      return;
    }
    const pills = [
      `${formatCount(sets.length)} favorite set${sets.length === 1 ? "" : "s"}`,
      state.student ? `Signed in as ${studentName()}` : "Student favorites are stored on this browser",
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
          <h2>You don't have any favorites :(</h2>
          <a class="action teal" href="/student-discover">Discover Favorites</a>
          <a class="tutorial" href="/student-discover">Learn How to Favorite Sets</a>
        </div>
      </div>
    `;
  }

  function renderSets(sets) {
    if (!contentEl) {
      return;
    }
    contentEl.innerHTML = `
      <div class="toolbar">
        <a class="action teal" href="/student-discover">Discover Favorites</a>
        <a class="ghost" href="/student-discover">Browse All Sets</a>
      </div>
      <div class="grid">
        ${sets
          .map((set) => {
            const [start, end] = gradientForSet(set);
            const hero = set.coverImage
              ? `<div class="card-hero has-cover"><img src="${escapeHtml(set.coverImage)}" alt="${escapeHtml(set.label || "Set cover")}" /></div>`
              : `<div class="card-hero" style="background:linear-gradient(135deg,${escapeHtml(start)} 0%,${escapeHtml(end)} 100%)">${escapeHtml((set.category || "QUIZ").toUpperCase())}</div>`;
            const description = String(set.description || "").trim() || "Saved to your favorites from Discover.";
            return `
              <article class="card-shell">
                <button class="favorite-btn" type="button" data-remove-favorite="${escapeHtml(set.id || "")}" aria-label="Remove Favorite" title="Remove Favorite">Saved</button>
                <article class="card">
                  ${hero}
                  <div class="card-body">
                    <h2 class="card-title">${escapeHtml(set.label || "Favorite Set")}</h2>
                    <p class="card-copy">${escapeHtml(description)}</p>
                    <div class="chip-row">
                      <span class="chip">${escapeHtml(`${formatCount(set.questionCount || 0)} Questions`)}</span>
                      <span class="chip">${escapeHtml(set.category || "Mixed")}</span>
                      <span class="chip">${escapeHtml(set.source === "uploaded" ? "Custom" : "Library")}</span>
                    </div>
                    <div class="card-actions">
                      <a class="action teal" href="/student-discover">Open in Discover</a>
                      <a class="ghost" href="/play">Play</a>
                    </div>
                  </div>
                </article>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPage() {
    renderHeader();
    const sets = favoriteSets();
    renderMeta(sets);
    if (!sets.length) {
      renderEmptyState();
      return;
    }
    renderSets(sets);
  }

  async function loadData() {
    const [studentStatus, accountPayload, quizzesPayload, serverInfo] = await Promise.all([
      fetchJson("/api/student-auth/status").catch(() => ({ loggedIn: false, student: null })),
      fetchJson("/api/account"),
      fetchJson("/api/quizzes").catch(() => ({ ok: true, sets: [] })),
      fetchJson("/api/server-info").catch(() => ({ activeRoom: null }))
    ]);
    state.student = studentStatus?.loggedIn && studentStatus?.student
      ? {
          username: String(studentStatus.student.username || ""),
          displayName: String(studentStatus.student.displayName || "")
        }
      : null;
    state.account = accountPayload?.account || null;
    state.quizzes = Array.isArray(quizzesPayload?.sets) ? quizzesPayload.sets : [];
    state.activeRoom = serverInfo?.activeRoom || null;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-favorite]");
    if (!button) {
      return;
    }
    event.preventDefault();
    removeFavorite(button.getAttribute("data-remove-favorite"));
  });

  try {
    await loadData();
  } catch (_error) {
    state.quizzes = [];
  }

  renderPage();
})();
