(async () => {
  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  }

  function setHref(id, value) {
    const node = document.getElementById(id);
    if (node && value) {
      node.href = value;
    }
  }

  function show(id, shouldShow) {
    const node = document.getElementById(id);
    if (node) {
      node.hidden = !shouldShow;
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Request failed for ${url}`);
    }
    return response.json();
  }

  try {
    const [auth, studentAuth, quizzes, blooks, minigames, serverInfo] = await Promise.all([
      fetchJson("/api/auth/status"),
      fetchJson("/api/student-auth/status").catch(() => null),
      fetchJson("/api/quizzes"),
      fetchJson("/api/blooks"),
      fetchJson("/api/minigames"),
      fetchJson("/api/server-info")
    ]);

    const setCount = Array.isArray(quizzes?.sets) ? quizzes.sets.length : 0;
    const packCount = Array.isArray(blooks?.packs) ? blooks.packs.length : 0;
    const modeCount = Array.isArray(minigames?.games) ? minigames.games.length : 0;
    const activeRoom = serverInfo?.activeRoom || null;

    setText("metricSetCount", String(setCount));
    setText("metricModeCount", String(modeCount));
    setText("metricPackCount", String(packCount));
    setText("featureSetCount", `${setCount} question sets ready`);
    setText("featureModeCount", `${modeCount} mini-games available`);
    setText("featurePackCount", `${packCount} blook packs loaded`);

    const joinHref = activeRoom?.code ? `/play?code=${encodeURIComponent(activeRoom.code)}` : "/play";
    setHref("homeJoinLink", joinHref);
    setHref("homeSecondaryAction", joinHref);
    setHref("footerRoomLink", joinHref);

    if (activeRoom?.code) {
      setText("activeRoomCode", activeRoom.code);
      setText("footerRoomCopy", `Active room: ${activeRoom.code}`);
      show("homeActiveRoom", true);
    } else {
      setText("footerRoomCopy", "No live room open yet");
      show("homeActiveRoom", false);
    }

    const dashboardTarget =
      auth?.authEnabled && !auth?.authenticated
        ? `/auth/google?next=${encodeURIComponent("/my-sets")}`
        : "/my-sets";
    const dashboardLabel =
      auth?.authEnabled && !auth?.authenticated ? "Log in to Dashboard" : "Open Dashboard";

    setHref("homePrimaryAction", dashboardTarget);
    setHref("homeDashboardLink", dashboardTarget);
    setText("homePrimaryActionLabel", dashboardLabel);

    if (studentAuth?.loggedIn && studentAuth?.student) {
      const studentName = studentAuth.student.displayName || studentAuth.student.username || "Student";
      const studentCoins = Math.max(0, Number(studentAuth?.account?.coins || 0));
      setText("homeAuthSummary", `Student account ready: ${studentName} with ${studentCoins} saved coins.`);
    } else if (auth?.authenticated && auth?.user?.name) {
      setText("homeAuthSummary", `Signed in as ${auth.user.name}`);
    } else if (auth?.authEnabled) {
      setText("homeAuthSummary", "Google sign-in is enabled for host access.");
    } else {
      setText("homeAuthSummary", "Host access is open locally. Students can use Student Login to load saved coins and blooks.");
    }
  } catch (_error) {
    setText("homeAuthSummary", "Local game flow is ready even if dashboard stats could not load.");
    setText("featureSetCount", "Question sets available locally");
    setText("featureModeCount", "Mini-games available locally");
    setText("featurePackCount", "Blook packs available locally");
  }
})();
