(async () => {
  const coinsEl = document.getElementById("studentSettingsCoins");
  const avatarEl = document.getElementById("studentSettingsAvatar");
  const nameEl = document.getElementById("studentSettingsName");
  const statusEl = document.getElementById("studentSettingsStatus");
  const roomCodeEl = document.getElementById("studentSettingsRoomCode");
  const usernameEl = document.getElementById("studentSettingsUsername");
  const emailEl = document.getElementById("studentSettingsEmail");
  const layoutEl = document.getElementById("studentSettingsLayout");
  const joinedEl = document.getElementById("studentSettingsJoined");
  const planEl = document.getElementById("studentSettingsPlan");
  const planTierEl = document.getElementById("studentSettingsPlanTier");
  const sectionLinks = Array.from(document.querySelectorAll(".settings-nav a"));

  const state = {
    auth: null,
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

  function formatLongDate(value) {
    const safe = String(value || "").trim();
    if (!safe) {
      return "Not available";
    }
    const parsed = new Date(safe);
    if (Number.isNaN(parsed.getTime())) {
      return "Not available";
    }
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(parsed);
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

  function accountSlug(accountId) {
    const safe = String(accountId || "").trim();
    if (!safe) {
      return "guest";
    }
    if (safe.startsWith("student:")) {
      return safe.slice("student:".length) || "student";
    }
    if (safe.startsWith("guest:")) {
      return "guest";
    }
    return safe;
  }

  function studentName() {
    return state.student?.displayName || state.auth?.user?.name || state.student?.username || accountSlug(state.account?.id) || "Student";
  }

  function studentUsername() {
    return state.student?.username || state.auth?.user?.name || accountSlug(state.account?.id);
  }

  function studentEmail() {
    return state.auth?.user?.email || "Not available for student accounts";
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
      statusEl.textContent = state.activeRoom?.code ? `Room ${state.activeRoom.code}` : "Settings";
    }
    if (roomCodeEl) {
      roomCodeEl.textContent = state.activeRoom?.code ? `Room: ${state.activeRoom.code}` : "Room: none";
    }
  }

  function renderProfile() {
    if (usernameEl) {
      usernameEl.textContent = studentUsername();
    }
    if (emailEl) {
      emailEl.textContent = studentEmail();
      emailEl.classList.toggle("muted", !state.auth?.user?.email);
    }
    if (layoutEl) {
      layoutEl.textContent = "Student";
    }
    if (joinedEl) {
      joinedEl.textContent = formatLongDate(state.account?.createdAt);
    }
    if (planEl) {
      planEl.textContent = "Blooket";
    }
    if (planTierEl) {
      planTierEl.textContent = "Starter";
    }
  }

  function updateNavState() {
    const currentHash = window.location.hash || "#profileSection";
    for (const link of sectionLinks) {
      link.classList.toggle("is-active", link.getAttribute("href") === currentHash);
    }
  }

  async function loadData() {
    const [authStatus, studentStatus, accountPayload, serverInfo] = await Promise.all([
      fetchJson("/api/auth/status").catch(() => ({ authEnabled: false, authenticated: false, user: null })),
      fetchJson("/api/student-auth/status").catch(() => ({ loggedIn: false, student: null, account: null })),
      fetchJson("/api/account"),
      fetchJson("/api/server-info").catch(() => ({ activeRoom: null }))
    ]);

    state.auth = authStatus || null;
    state.student = studentStatus?.loggedIn && studentStatus?.student
      ? {
          username: String(studentStatus.student.username || ""),
          displayName: String(studentStatus.student.displayName || "")
        }
      : null;
    state.account = studentStatus?.loggedIn && studentStatus?.account ? studentStatus.account : accountPayload?.account || null;
    state.activeRoom = serverInfo?.activeRoom || null;
  }

  window.addEventListener("hashchange", updateNavState);
  updateNavState();

  try {
    await loadData();
  } catch (_error) {
    state.account = null;
  }

  renderHeader();
  renderProfile();
})();
