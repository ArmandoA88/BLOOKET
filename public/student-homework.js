(async () => {
  const coinsEl = document.getElementById("studentHomeworkCoins");
  const avatarEl = document.getElementById("studentHomeworkAvatar");
  const nameEl = document.getElementById("studentHomeworkName");
  const statusEl = document.getElementById("studentHomeworkStatus");
  const roomCodeEl = document.getElementById("studentHomeworkRoomCode");
  const contentEl = document.getElementById("studentHomeworkContent");

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
      statusEl.textContent = state.activeRoom?.code ? `Room ${state.activeRoom.code}` : "Homework";
    }
    if (roomCodeEl) {
      roomCodeEl.textContent = state.activeRoom?.code ? `Room: ${state.activeRoom.code}` : "Room: none";
    }
  }

  function renderEmptyState() {
    if (!contentEl) {
      return;
    }
    contentEl.innerHTML = `
      <div class="empty-card">
        <div class="empty-graphic" aria-hidden="true">
          <div class="laptop-screen"></div>
          <div class="laptop-base"></div>
          <div class="laptop-dot"></div>
          <div class="desk"></div>
          <div class="book-stack">
            <div class="book purple"></div>
            <div class="book cream"></div>
            <div class="book teal"></div>
          </div>
          <div class="pencil"></div>
          <div class="mascot">
            <div class="hair"></div>
            <div class="eye left"></div>
            <div class="eye right"></div>
            <div class="snout"></div>
            <div class="nose"></div>
            <div class="mouth"></div>
            <div class="freckle a"></div>
            <div class="freckle b"></div>
            <div class="freckle c"></div>
            <div class="freckle d"></div>
            <div class="paw left"></div>
            <div class="paw right"></div>
          </div>
        </div>
        <p class="copy">Nothing here yet. Create and assign your first homework to get started.</p>
        <a class="tutorial" href="/student-discover">Learn how to</a>
      </div>
    `;
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

  renderHeader();
  renderEmptyState();
})();
