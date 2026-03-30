(async () => {
  const SUBJECTS = [
    { id: "all", label: "All", icon: "■", accent: "#6b6b6b" },
    { id: "Math", label: "Math", icon: "▦", accent: "#4b63ff" },
    { id: "ELA", label: "ELA", icon: "✎", accent: "#ea4127" },
    { id: "Social Studies", label: "Social Studies", icon: "◍", accent: "#5cc925" },
    { id: "Science", label: "Science", icon: "⚗", accent: "#ad5cd4" },
    { id: "Languages", label: "Languages", icon: "A", accent: "#a3a3a3" },
    { id: "Creative Arts", label: "Creative Arts", icon: "✿", accent: "#f06cc0" },
    { id: "Trivia", label: "Trivia", icon: "◌", accent: "#ff9438" }
  ];
  const SUBJECT_THEME = {
    Math: { background: "linear-gradient(135deg,#275eff 0%,#22b6ff 100%)", word: "MATH" },
    ELA: { background: "linear-gradient(135deg,#ff7d36 0%,#ffb04a 100%)", word: "WORDS" },
    "Social Studies": { background: "linear-gradient(135deg,#29c458 0%,#0a8d98 100%)", word: "WORLD" },
    Science: { background: "linear-gradient(135deg,#4d72ff 0%,#7a56d1 100%)", word: "SCIENCE" },
    Languages: { background: "linear-gradient(135deg,#8d8d95 0%,#585b69 100%)", word: "LANG" },
    "Creative Arts": { background: "linear-gradient(135deg,#ff5ba9 0%,#ff8c59 100%)", word: "CREATE" },
    Trivia: { background: "linear-gradient(135deg,#1a7a67 0%,#0f4459 100%)", word: "QUIZ" },
    General: { background: "linear-gradient(135deg,#07b1c5 0%,#6c64ff 100%)", word: "MIX" }
  };

  const coinsEl = document.getElementById("studentDiscoverCoins");
  const avatarEl = document.getElementById("studentDiscoverAvatar");
  const nameEl = document.getElementById("studentDiscoverName");
  const statusEl = document.getElementById("studentDiscoverStatus");
  const roomCodeEl = document.getElementById("studentDiscoverRoomCode");
  const searchEl = document.getElementById("studentDiscoverSearch");
  const metaEl = document.getElementById("studentDiscoverMeta");
  const featuredEl = document.getElementById("studentDiscoverFeatured");
  const subjectsEl = document.getElementById("studentDiscoverSubjects");
  const popularEl = document.getElementById("studentDiscoverPopular");
  const playLinkEl = document.getElementById("studentDiscoverPlayLink");

  const state = {
    student: null,
    account: null,
    quizzes: [],
    activeRoom: null,
    search: "",
    subject: "all"
  };
  const FAVORITES_STORAGE_KEY = "blooketStudentFavoriteSetIds";

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

  function favoriteSet() {
    return new Set(readFavoriteIds());
  }

  function isFavoriteSet(setId) {
    return favoriteSet().has(String(setId || ""));
  }

  function toggleFavoriteSet(setId) {
    const safeId = String(setId || "");
    if (!safeId) {
      return false;
    }
    const ids = readFavoriteIds();
    const index = ids.indexOf(safeId);
    if (index >= 0) {
      ids.splice(index, 1);
      writeFavoriteIds(ids);
      return false;
    }
    ids.unshift(safeId);
    writeFavoriteIds(Array.from(new Set(ids)).slice(0, 60));
    return true;
  }

  function formatCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)).toLocaleString("en-US") : "0";
  }

  function formatCompact(value) {
    const parsed = Math.max(0, Number(value || 0));
    if (parsed >= 1000000) {
      return `${(parsed / 1000000).toFixed(parsed >= 10000000 ? 0 : 1)}M`;
    }
    if (parsed >= 1000) {
      return `${(parsed / 1000).toFixed(parsed >= 100000 ? 0 : 1)}K`;
    }
    return String(Math.round(parsed));
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

  function hashSeed(value) {
    return Array.from(String(value || "")).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  }

  function stableNumber(value, min, max) {
    const floor = Math.min(min, max);
    const ceil = Math.max(min, max);
    return floor + (hashSeed(value) % (ceil - floor + 1));
  }

  function normalizedSubject(set) {
    const category = String(set?.category || "").trim();
    const label = String(set?.label || "").toLowerCase();
    const tags = Array.isArray(set?.tags) ? set.tags.map((tag) => String(tag).toLowerCase()) : [];
    const haystack = `${category} ${label} ${tags.join(" ")}`.toLowerCase();
    if (category === "Math" || /math|multiply|multiplication|algebra|geometry/.test(haystack)) {
      return "Math";
    }
    if (category === "Science" || /science|biology|chemistry|physics|space|stem/.test(haystack)) {
      return "Science";
    }
    if (category === "Social Studies" || /history|geography|social/.test(haystack)) {
      return "Social Studies";
    }
    if (category === "ELA" || /reading|word|vocab|grammar|ela|literature/.test(haystack)) {
      return "ELA";
    }
    if (category === "Languages" || /spanish|french|language/.test(haystack)) {
      return "Languages";
    }
    if (category === "Creative Arts" || /art|music|creative/.test(haystack)) {
      return "Creative Arts";
    }
    if (category === "General" || /trivia|general|mixed/.test(haystack)) {
      return "Trivia";
    }
    return category || "Trivia";
  }

  function setTheme(subject) {
    return SUBJECT_THEME[subject] || SUBJECT_THEME.General;
  }

  function heroWord(set, subject) {
    const primaryTag = Array.isArray(set?.tags) && set.tags[0] ? String(set.tags[0]).toUpperCase() : "";
    return primaryTag && primaryTag.length <= 10 ? primaryTag : setTheme(subject).word;
  }

  function playHref() {
    return state.activeRoom?.code ? `/play?code=${encodeURIComponent(state.activeRoom.code)}` : "/play";
  }

  function decoratedSets() {
    return (Array.isArray(state.quizzes) ? state.quizzes : []).map((set) => {
      const subject = normalizedSubject(set);
      return {
        ...set,
        subject,
        theme: setTheme(subject),
        creator: set.source === "uploaded" ? "Classroom Creator" : "Blooket Curriculum",
        verified: set.source !== "uploaded",
        plays: stableNumber(`${set.id}-${set.questionCount}`, 18000, 820000),
        heroWord: heroWord(set, subject),
        favorite: isFavoriteSet(set.id)
      };
    });
  }

  function filteredSets() {
    const search = state.search.trim().toLowerCase();
    return decoratedSets().filter((set) => {
      if (state.subject !== "all" && set.subject !== state.subject) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = [set.label, set.category, set.subject, ...(Array.isArray(set.tags) ? set.tags : [])].join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }

  function subjectCounts() {
    const counts = new Map();
    counts.set("all", decoratedSets().length);
    for (const subject of SUBJECTS) {
      if (subject.id !== "all") {
        counts.set(subject.id, 0);
      }
    }
    for (const set of decoratedSets()) {
      counts.set(set.subject, (counts.get(set.subject) || 0) + 1);
    }
    return counts;
  }

  function renderMeta(sets) {
    if (!metaEl) {
      return;
    }
    const pills = [
      `${formatCount(sets.length)} set${sets.length === 1 ? "" : "s"} showing`,
      state.subject === "all" ? "All subjects" : state.subject,
      state.activeRoom?.code ? `Live room ${state.activeRoom.code}` : "No live room open"
    ];
    metaEl.innerHTML = pills.map((pill) => `<span class="meta-pill">${escapeHtml(pill)}</span>`).join("");
  }

  function renderSubjects() {
    if (!subjectsEl) {
      return;
    }
    const counts = subjectCounts();
    subjectsEl.innerHTML = SUBJECTS.map((subject) => `
      <button class="subject ${subject.id === state.subject ? "is-active" : ""}" type="button" data-subject="${escapeHtml(subject.id)}">
        <span class="subject-inner">
          <span class="subject-dot" style="background:${escapeHtml(subject.accent)}">${escapeHtml(subject.icon)}</span>
          <span class="subject-label">${escapeHtml(subject.label)}</span>
          <span class="card-meta">${escapeHtml(formatCount(counts.get(subject.id) || 0))}</span>
        </span>
      </button>
    `).join("");
  }

  function renderCard(set) {
    const favoriteLabel = set.favorite ? "Remove Favorite" : "Favorite";
    const favoriteText = set.favorite ? "Saved" : "Save";
    return `
      <article class="card-shell">
        <button class="favorite-btn ${set.favorite ? "is-active" : ""}" type="button" data-favorite-set="${escapeHtml(set.id)}" aria-label="${escapeHtml(favoriteLabel)}" title="${escapeHtml(favoriteLabel)}">${escapeHtml(favoriteText)}</button>
        <a class="card-wrap" href="${escapeHtml(playHref())}">
          <article class="card">
            <div class="card-hero" style="--hero-bg:${escapeHtml(set.theme.background)}">
              <div class="card-badge ${set.verified ? "" : "community"}">${escapeHtml(set.verified ? "Teacher Verified" : "Community Set")}</div>
              <div class="card-word">${escapeHtml(set.heroWord)}</div>
              <div class="card-pill">${escapeHtml(`${formatCount(set.questionCount)} Questions`)}</div>
            </div>
            <div class="card-body">
              <h3 class="card-title">${escapeHtml(set.label)}</h3>
              <div class="card-meta">
                <span>▶ ${escapeHtml(formatCompact(set.plays))}</span>
                <span>◉ ${escapeHtml(set.creator)}</span>
              </div>
            </div>
          </article>
        </a>
      </article>
    `;
  }

  function renderEmpty(target, title, copy) {
    if (!target) {
      return;
    }
    target.innerHTML = `<div class="empty"><strong>${escapeHtml(title)}</strong><div>${escapeHtml(copy)}</div></div>`;
  }

  function renderCards() {
    const sets = filteredSets();
    renderMeta(sets);
    if (!sets.length) {
      renderEmpty(featuredEl, "No sets match that search", "Try a different keyword or switch subjects.");
      renderEmpty(popularEl, "Nothing to show yet", "Add or import more quiz sets to grow the discover page.");
      return;
    }
    featuredEl.innerHTML = sets
      .slice()
      .sort((left, right) => Number(right.questionCount || 0) - Number(left.questionCount || 0) || left.label.localeCompare(right.label))
      .slice(0, 8)
      .map(renderCard)
      .join("");
    popularEl.innerHTML = sets
      .slice()
      .sort((left, right) => Number(right.plays || 0) - Number(left.plays || 0) || left.label.localeCompare(right.label))
      .map(renderCard)
      .join("");
  }

  function renderHeader() {
    const studentName = state.student?.displayName || state.student?.username || "Student";
    const avatarSource = selectedBlook(state.account);
    if (coinsEl) {
      coinsEl.textContent = formatCount(state.account?.coins || 0);
    }
    if (avatarEl) {
      avatarEl.innerHTML = avatarMarkup(avatarSource, studentName);
    }
    if (nameEl) {
      nameEl.textContent = studentName;
    }
    if (statusEl) {
      statusEl.textContent = state.activeRoom?.code ? `Room ${state.activeRoom.code}` : "Browse local sets";
    }
    if (roomCodeEl) {
      roomCodeEl.textContent = state.activeRoom?.code ? `Room: ${state.activeRoom.code}` : "Room: none";
    }
    if (playLinkEl) {
      playLinkEl.href = playHref();
      playLinkEl.textContent = state.activeRoom?.code ? `Join Room ${state.activeRoom.code}` : "Play a Live Game";
    }
  }

  function renderPage() {
    renderHeader();
    renderSubjects();
    renderCards();
  }

  function bindEvents() {
    if (searchEl) {
      searchEl.addEventListener("input", () => {
        state.search = searchEl.value || "";
        renderCards();
      });
    }
    if (subjectsEl) {
      subjectsEl.addEventListener("click", (event) => {
        const button = event.target.closest("[data-subject]");
        if (!button) {
          return;
        }
        const nextSubject = String(button.getAttribute("data-subject") || "all");
        state.subject = nextSubject === state.subject ? "all" : nextSubject;
        renderPage();
      });
    }
    document.addEventListener("click", (event) => {
      const favoriteButton = event.target.closest("[data-favorite-set]");
      if (!favoriteButton) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      toggleFavoriteSet(favoriteButton.getAttribute("data-favorite-set"));
      renderPage();
    });
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

  bindEvents();
  try {
    await loadData();
  } catch (_error) {
    state.quizzes = [];
  }
  renderPage();
})();
