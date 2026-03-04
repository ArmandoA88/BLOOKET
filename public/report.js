const reportModeIcon = document.getElementById("reportModeIcon");
const reportSetTitle = document.getElementById("reportSetTitle");
const reportHostName = document.getElementById("reportHostName");
const reportNotice = document.getElementById("reportNotice");
const reportAccuracyRing = document.getElementById("reportAccuracyRing");
const reportAccuracyPct = document.getElementById("reportAccuracyPct");
const reportDateText = document.getElementById("reportDateText");
const reportTotalCorrect = document.getElementById("reportTotalCorrect");
const reportTotalIncorrect = document.getElementById("reportTotalIncorrect");
const reportTotalStudents = document.getElementById("reportTotalStudents");
const reportTotalAnswers = document.getElementById("reportTotalAnswers");
const reportDeleteBtn = document.getElementById("reportDeleteBtn");
const reportDownloadBtn = document.getElementById("reportDownloadBtn");
const reportLeaderboardRows = document.getElementById("reportLeaderboardRows");
const reportQuestionRows = document.getElementById("reportQuestionRows");
const reportQuestionSort = document.getElementById("reportQuestionSort");

const MODE_ICON_BY_ID = {
  classic: "/assets/games/question.svg",
  gold: "/assets/games/question.svg",
  crypto: "/assets/games/tap.svg",
  fishing: "/assets/games/soccer.svg",
  brawl: "/assets/games/sequence.svg"
};

const query = new URLSearchParams(window.location.search);
const requestedCode = sanitizeCode(query.get("code"));

let reportPayload = null;

function sanitizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeText(value, fallback = "") {
  const output = String(value || "").trim();
  return output.length > 0 ? output : fallback;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ordinalPlace(rank) {
  const n = Math.max(1, Math.floor(numberValue(rank, 1)));
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`;
  }
  const mod10 = n % 10;
  if (mod10 === 1) {
    return `${n}st`;
  }
  if (mod10 === 2) {
    return `${n}nd`;
  }
  if (mod10 === 3) {
    return `${n}rd`;
  }
  return `${n}th`;
}

function formatDateTime(input) {
  const date = new Date(numberValue(input, Date.now()));
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function showNotice(message, tone = "") {
  if (!reportNotice) {
    return;
  }
  reportNotice.textContent = String(message || "");
  reportNotice.classList.remove("hidden", "good", "bad", "warn");
  if (tone) {
    reportNotice.classList.add(tone);
  }
}

function hideNotice() {
  if (!reportNotice) {
    return;
  }
  reportNotice.classList.add("hidden");
  reportNotice.classList.remove("good", "bad", "warn");
  reportNotice.textContent = "";
}

function setRingProgress(element, pct) {
  if (!element) {
    return;
  }
  const safePct = Math.max(0, Math.min(100, Math.round(numberValue(pct, 0))));
  element.style.setProperty("--report-pct", `${safePct}%`);
}

function renderSummary(report) {
  const totals = report?.totals || {};
  const setLabel = safeText(report?.questionSetLabel, "Quiz Set");
  const modeLabel = safeText(report?.modeLabel, "Classic Quiz");
  const hostName = safeText(report?.hostName, "Host");
  const modeId = String(report?.mode || "classic").toLowerCase();
  const modeIcon = MODE_ICON_BY_ID[modeId] || MODE_ICON_BY_ID.classic;
  const accuracyPct = Math.max(0, Math.min(100, Math.round(numberValue(totals.accuracyPct, 0))));

  if (reportModeIcon) {
    reportModeIcon.src = modeIcon;
    reportModeIcon.alt = modeLabel;
  }
  if (reportSetTitle) {
    reportSetTitle.textContent = setLabel;
  }
  if (reportHostName) {
    reportHostName.textContent = hostName;
  }
  if (reportAccuracyPct) {
    reportAccuracyPct.textContent = `${accuracyPct}%`;
  }
  if (reportDateText) {
    reportDateText.textContent = formatDateTime(report?.finishedAt);
  }
  if (reportTotalCorrect) {
    reportTotalCorrect.textContent = String(Math.max(0, Math.round(numberValue(totals.totalCorrect, 0))));
  }
  if (reportTotalIncorrect) {
    reportTotalIncorrect.textContent = String(Math.max(0, Math.round(numberValue(totals.totalIncorrect, 0))));
  }
  if (reportTotalStudents) {
    reportTotalStudents.textContent = String(Math.max(0, Math.round(numberValue(totals.totalStudents, 0))));
  }
  if (reportTotalAnswers) {
    reportTotalAnswers.textContent = String(Math.max(0, Math.round(numberValue(totals.totalAnswers, 0))));
  }
  setRingProgress(reportAccuracyRing, accuracyPct);
}

function renderLeaderboard(report) {
  if (!reportLeaderboardRows) {
    return;
  }
  const rows = Array.isArray(report?.leaderboard) ? report.leaderboard : [];
  if (rows.length === 0) {
    reportLeaderboardRows.innerHTML = `<div class="report-empty">No player leaderboard data.</div>`;
    return;
  }

  reportLeaderboardRows.innerHTML = rows
    .map((row) => {
      const rank = ordinalPlace(row?.rank);
      const name = safeText(row?.name, "Player");
      const accuracy = Math.max(0, Math.min(100, Math.round(numberValue(row?.accuracyPct, 0))));
      const correctCount = Math.max(0, Math.round(numberValue(row?.correctCount, 0)));
      const weight = Math.max(0, Math.round(numberValue(row?.weightLbs, row?.score)));
      return `
      <article class="report-leader-row">
        <div class="report-leader-place">${escapeHtml(rank)}</div>
        <div class="report-leader-student">
          <span class="report-leader-blook">${escapeHtml(row?.blook?.icon || "[]")}</span>
          <span>${escapeHtml(name)}</span>
        </div>
        <div class="report-leader-accuracy">
          <span class="report-leader-percent">${accuracy}%</span>
          <div class="report-leader-bar">
            <span style="width:${accuracy}%"></span>
          </div>
          <span class="report-leader-correct">${correctCount}</span>
        </div>
        <div class="report-leader-weight">${weight}</div>
      </article>`;
    })
    .join("");
}

function compareQuestions(left, right, sortValue) {
  const leftIndex = Math.max(1, Math.round(numberValue(left?.index, 1)));
  const rightIndex = Math.max(1, Math.round(numberValue(right?.index, 1)));
  if (sortValue === "incorrect") {
    const leftIncorrect = Math.round(numberValue(left?.incorrectPct, 0));
    const rightIncorrect = Math.round(numberValue(right?.incorrectPct, 0));
    if (leftIncorrect !== rightIncorrect) {
      return rightIncorrect - leftIncorrect;
    }
  }
  return leftIndex - rightIndex;
}

function renderQuestions(report) {
  if (!reportQuestionRows) {
    return;
  }
  const sortValue = String(reportQuestionSort?.value || "index");
  const questions = Array.isArray(report?.questions) ? [...report.questions] : [];
  if (questions.length === 0) {
    reportQuestionRows.innerHTML = `<div class="report-empty">No question-level data collected.</div>`;
    return;
  }

  questions.sort((left, right) => compareQuestions(left, right, sortValue));

  reportQuestionRows.innerHTML = questions
    .map((question) => {
      const questionNumber = Math.max(1, Math.round(numberValue(question?.index, 1)));
      const prompt = safeText(question?.prompt, `Question ${questionNumber}`);
      const correctCount = Math.max(0, Math.round(numberValue(question?.correctCount, 0)));
      const incorrectCount = Math.max(0, Math.round(numberValue(question?.incorrectCount, 0)));
      const totalAnswers = Math.max(0, Math.round(numberValue(question?.totalAnswers, 0)));
      const incorrectPct = Math.max(0, Math.min(100, Math.round(numberValue(question?.incorrectPct, 0))));
      const correctPct = totalAnswers > 0 ? Math.max(0, 100 - incorrectPct) : 0;
      return `
      <article class="report-question-row">
        <div class="report-question-copy">
          <div class="report-question-label">Question ${questionNumber}</div>
          <div class="report-question-prompt">${escapeHtml(prompt)}</div>
          <div class="report-question-stats">
            <span>Correct: ${correctCount}</span>
            <span>Incorrect: ${incorrectCount}</span>
            <span>Answers: ${totalAnswers}</span>
          </div>
        </div>
        <div class="report-question-ring" style="--report-pct:${correctPct}%;">
          <strong>${correctCount}/${Math.max(totalAnswers, 1)}</strong>
          <span>Correct</span>
        </div>
      </article>`;
    })
    .join("");
}

function toCsvRow(cells) {
  return cells
    .map((cell) => {
      const raw = String(cell ?? "");
      if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
        return `"${raw.replace(/\"/g, "\"\"")}"`;
      }
      return raw;
    })
    .join(",");
}

function buildCsv(report) {
  const totals = report?.totals || {};
  const rows = [];

  rows.push(toCsvRow(["Report Code", safeText(report?.code)]));
  rows.push(toCsvRow(["Mode", safeText(report?.modeLabel)]));
  rows.push(toCsvRow(["Question Set", safeText(report?.questionSetLabel)]));
  rows.push(toCsvRow(["Host", safeText(report?.hostName)]));
  rows.push(toCsvRow(["Finished At", formatDateTime(report?.finishedAt)]));
  rows.push(toCsvRow(["Accuracy (%)", Math.round(numberValue(totals.accuracyPct, 0))]));
  rows.push(toCsvRow(["Total Correct", Math.round(numberValue(totals.totalCorrect, 0))]));
  rows.push(toCsvRow(["Total Incorrect", Math.round(numberValue(totals.totalIncorrect, 0))]));
  rows.push(toCsvRow(["Total Answers", Math.round(numberValue(totals.totalAnswers, 0))]));
  rows.push(toCsvRow(["Total Students", Math.round(numberValue(totals.totalStudents, 0))]));
  rows.push("");
  rows.push("Leaderboard");
  rows.push(toCsvRow(["Rank", "Student", "Accuracy (%)", "Correct", "Answers", "Weight (lbs)"]));

  const leaderboard = Array.isArray(report?.leaderboard) ? report.leaderboard : [];
  for (const row of leaderboard) {
    rows.push(
      toCsvRow([
        Math.round(numberValue(row?.rank, 0)),
        safeText(row?.name),
        Math.round(numberValue(row?.accuracyPct, 0)),
        Math.round(numberValue(row?.correctCount, 0)),
        Math.round(numberValue(row?.answerCount, 0)),
        Math.round(numberValue(row?.weightLbs, 0))
      ])
    );
  }

  rows.push("");
  rows.push("Questions");
  rows.push(toCsvRow(["Question #", "Prompt", "Correct", "Incorrect", "Answers", "Incorrect (%)"]));
  const questions = Array.isArray(report?.questions) ? report.questions : [];
  for (const question of questions) {
    rows.push(
      toCsvRow([
        Math.round(numberValue(question?.index, 0)),
        safeText(question?.prompt),
        Math.round(numberValue(question?.correctCount, 0)),
        Math.round(numberValue(question?.incorrectCount, 0)),
        Math.round(numberValue(question?.totalAnswers, 0)),
        Math.round(numberValue(question?.incorrectPct, 0))
      ])
    );
  }

  return rows.join("\n");
}

function downloadCurrentReport() {
  if (!reportPayload) {
    showNotice("No report loaded yet.", "bad");
    return;
  }

  const csv = buildCsv(reportPayload);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const stamp = new Date(numberValue(reportPayload?.finishedAt, Date.now())).toISOString().slice(0, 10);
  const code = sanitizeCode(reportPayload?.code || "report");

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${code}-${stamp}.csv`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
  showNotice("Report downloaded.", "good");
}

async function deleteCurrentReport() {
  const code = sanitizeCode(reportPayload?.code || requestedCode);
  if (!code) {
    showNotice("Report code is missing.", "bad");
    return;
  }
  const confirmed = window.confirm(`Delete report ${code}? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/reports/${encodeURIComponent(code)}`, {
      method: "DELETE"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Delete failed.");
    }
    window.location.href = "/";
  } catch (error) {
    showNotice(error?.message || "Delete failed.", "bad");
  }
}

async function loadReport() {
  if (!requestedCode) {
    showNotice("Missing report code. Use /report.html?code=ABC123", "bad");
    if (reportDeleteBtn) {
      reportDeleteBtn.disabled = true;
    }
    if (reportDownloadBtn) {
      reportDownloadBtn.disabled = true;
    }
    return;
  }

  showNotice("Loading report...", "warn");
  try {
    const response = await fetch(`/api/reports/${encodeURIComponent(requestedCode)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok || !payload?.report) {
      throw new Error(payload?.message || "Report not found.");
    }

    reportPayload = payload.report;
    renderSummary(reportPayload);
    renderLeaderboard(reportPayload);
    renderQuestions(reportPayload);
    if (reportDeleteBtn) {
      reportDeleteBtn.disabled = false;
    }
    if (reportDownloadBtn) {
      reportDownloadBtn.disabled = false;
    }
    hideNotice();
  } catch (error) {
    reportPayload = null;
    showNotice(error?.message || "Unable to load report.", "bad");
    if (reportDeleteBtn) {
      reportDeleteBtn.disabled = true;
    }
    if (reportDownloadBtn) {
      reportDownloadBtn.disabled = true;
    }
  }
}

if (reportDownloadBtn) {
  reportDownloadBtn.addEventListener("click", downloadCurrentReport);
}

if (reportDeleteBtn) {
  reportDeleteBtn.addEventListener("click", deleteCurrentReport);
}

if (reportQuestionSort) {
  reportQuestionSort.addEventListener("change", () => {
    renderQuestions(reportPayload);
  });
}

loadReport();
