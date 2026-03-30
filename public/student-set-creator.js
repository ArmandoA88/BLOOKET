(async () => {
  const coinsEl = document.getElementById("studentCreatorCoins");
  const avatarEl = document.getElementById("studentCreatorAvatar");
  const nameEl = document.getElementById("studentCreatorName");
  const statusEl = document.getElementById("studentCreatorStatus");
  const roomCodeEl = document.getElementById("studentCreatorRoomCode");
  const methodsEl = document.getElementById("studentCreatorMethods");
  const titleEl = document.getElementById("studentCreatorTitleInput");
  const descriptionEl = document.getElementById("studentCreatorDescriptionInput");
  const publicToggleEl = document.getElementById("studentCreatorPublicToggle");
  const privacyLabelEl = document.getElementById("studentCreatorPrivacyLabel");
  const manualPanelEl = document.getElementById("studentCreatorManualPanel");
  const quizletPanelEl = document.getElementById("studentCreatorQuizletPanel");
  const csvPanelEl = document.getElementById("studentCreatorCsvPanel");
  const quizletInputEl = document.getElementById("studentCreatorQuizletInput");
  const fileInputEl = document.getElementById("studentCreatorFileInput");
  const createBtnEl = document.getElementById("studentCreatorCreateBtn");
  const noticeEl = document.getElementById("studentCreatorNotice");
  const coverStageEl = document.getElementById("studentCreatorCoverStage");
  const coverUrlBtnEl = document.getElementById("studentCreatorCoverUrlBtn");
  const coverFileBtnEl = document.getElementById("studentCreatorCoverFileBtn");
  const coverGalleryBtnEl = document.getElementById("studentCreatorCoverGalleryBtn");
  const coverUrlRowEl = document.getElementById("studentCreatorCoverUrlRow");
  const coverUrlInputEl = document.getElementById("studentCreatorCoverUrlInput");
  const coverApplyBtnEl = document.getElementById("studentCreatorCoverApplyBtn");
  const coverFileInputEl = document.getElementById("studentCreatorCoverFileInput");
  const galleryEl = document.getElementById("studentCreatorGallery");
  const galleryGridEl = document.getElementById("studentCreatorGalleryGrid");
  const builderSectionEl = document.getElementById("studentCreatorBuilderSection");
  const builderTitleEl = document.getElementById("studentCreatorBuilderTitle");
  const builderCopyEl = document.getElementById("studentCreatorBuilderCopy");
  const categoryEl = document.getElementById("studentCreatorCategoryInput");
  const tagsEl = document.getElementById("studentCreatorTagsInput");
  const questionsEl = document.getElementById("studentCreatorQuestions");
  const addQuestionBtnEl = document.getElementById("studentCreatorAddQuestionBtn");
  const saveBtnEl = document.getElementById("studentCreatorSaveBtn");
  const pageParams = new URLSearchParams(window.location.search);

  const state = {
    student: null,
    account: null,
    activeRoom: null,
    method: "manual",
    questions: [],
    editingSetId: "",
    gallery: [],
    coverImage: "",
    coverPreview: "",
    coverSource: "",
    coverFileName: ""
  };

  function normalizeMethod(value) {
    const safe = String(value || "").trim().toLowerCase();
    if (safe === "quizlet" || safe === "csv") {
      return safe;
    }
    return "manual";
  }

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

  function validCoverUrl(value) {
    const safe = String(value || "").trim();
    if (!safe) {
      return "";
    }
    if (/^https?:\/\//i.test(safe) || safe.startsWith("/")) {
      return safe;
    }
    if (/^assets\//i.test(safe)) {
      return `/${safe}`;
    }
    return "";
  }

  function blankQuestion() {
    return {
      prompt: "",
      image: "",
      options: ["", "", "", ""],
      answerIndex: 0,
      explanation: ""
    };
  }

  function ensureMinimumQuestions(count = 5) {
    while (state.questions.length < count) {
      state.questions.push(blankQuestion());
    }
  }

  function setNotice(message, tone = "") {
    if (!noticeEl) {
      return;
    }
    if (!message) {
      noticeEl.className = "notice hidden";
      noticeEl.textContent = "";
      return;
    }
    noticeEl.className = `notice ${tone}`.trim();
    noticeEl.textContent = message;
  }

  function currentVisibility() {
    return publicToggleEl?.checked ? "public" : "private";
  }

  function persistentCoverValue() {
    return state.coverSource === "file" ? "" : state.coverImage;
  }

  function updatePrivacyLabel() {
    if (privacyLabelEl) {
      privacyLabelEl.textContent = publicToggleEl?.checked ? "Public (Playable by everyone)" : "Private (Only visible here)";
    }
  }

  function updateCreateButton() {
    const hasTitle = String(titleEl?.value || "").trim().length > 0;
    const hasQuizlet = String(quizletInputEl?.value || "").trim().length > 0;
    const hasFile = Boolean(fileInputEl?.files && fileInputEl.files[0]);
    const ready = hasTitle && (state.method === "manual" || (state.method === "quizlet" && hasQuizlet) || (state.method === "csv" && hasFile));
    if (createBtnEl) {
      createBtnEl.disabled = !ready;
      createBtnEl.classList.toggle("ready", ready);
    }
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
      statusEl.textContent = state.activeRoom?.code ? `Room ${state.activeRoom.code}` : "Question set creator";
    }
    if (roomCodeEl) {
      roomCodeEl.textContent = state.activeRoom?.code ? `Room: ${state.activeRoom.code}` : "Room: none";
    }
  }

  function renderMethodPanels() {
    const tabs = Array.from(methodsEl?.querySelectorAll("[data-method]") || []);
    for (const tab of tabs) {
      tab.classList.toggle("is-active", tab.getAttribute("data-method") === state.method);
    }
    manualPanelEl?.classList.toggle("hidden", state.method !== "manual");
    quizletPanelEl?.classList.toggle("hidden", state.method !== "quizlet");
    csvPanelEl?.classList.toggle("hidden", state.method !== "csv");
    updateCreateButton();
  }

  function renderCoverStage() {
    if (!coverStageEl) {
      return;
    }
    if (!state.coverPreview) {
      coverStageEl.classList.remove("has-image");
      coverStageEl.innerHTML = `
        <div class="cover-copy">
          <strong>Cover Image</strong>
          <span>Drag and drop is optional here. Use a URL, file preview, or gallery image.</span>
        </div>
      `;
      return;
    }
    coverStageEl.classList.add("has-image");
    coverStageEl.innerHTML = `<img src="${escapeHtml(state.coverPreview)}" alt="Cover preview" />`;
  }

  function renderGallery() {
    if (!galleryGridEl) {
      return;
    }
    galleryGridEl.innerHTML = state.gallery
      .map(
        (item) => `
          <button class="gallery-item ${item.image === state.coverImage ? "is-active" : ""}" type="button" data-gallery-image="${escapeHtml(item.image)}">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name || "Gallery image")}" />
          </button>
        `
      )
      .join("");
  }

  function renderBuilder() {
    if (!questionsEl) {
      return;
    }
    questionsEl.innerHTML = state.questions
      .map((question, index) => {
        const q = {
          prompt: String(question.prompt || ""),
          image: String(question.image || ""),
          options: Array.isArray(question.options) ? question.options.slice(0, 4) : ["", "", "", ""],
          answerIndex: Math.max(0, Math.min(3, Number(question.answerIndex || 0))),
          explanation: String(question.explanation || "")
        };
        while (q.options.length < 4) {
          q.options.push("");
        }
        const answerOptions = ["A", "B", "C", "D"]
          .map((label, optionIndex) => `<option value="${optionIndex}"${q.answerIndex === optionIndex ? " selected" : ""}>${label}</option>`)
          .join("");

        return `
          <article class="builder-card" data-row="${index}">
            <div class="builder-card-top">
              <strong>Question ${index + 1}</strong>
              <button class="mini-btn" type="button" data-remove-row="${index}">Remove</button>
            </div>
            <div class="builder-grid">
              <input class="input" data-row="${index}" data-field="prompt" maxlength="240" value="${escapeHtml(q.prompt)}" placeholder="Question prompt" />
              <input class="input" data-row="${index}" data-field="image" maxlength="400" value="${escapeHtml(q.image)}" placeholder="Image URL (optional)" />
              <div class="builder-options">
                ${q.options
                  .map(
                    (option, optionIndex) => `
                      <input class="input" data-row="${index}" data-option="${optionIndex}" maxlength="160" value="${escapeHtml(option)}" placeholder="Option ${String.fromCharCode(65 + optionIndex)}" />
                    `
                  )
                  .join("")}
              </div>
              <div class="builder-options">
                <select class="builder-select" data-row="${index}" data-field="answerIndex">${answerOptions}</select>
                <input class="input" data-row="${index}" data-field="explanation" maxlength="240" value="${escapeHtml(q.explanation)}" placeholder="Explanation (optional)" />
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function applyLoadedSet(setPayload) {
    if (!setPayload || typeof setPayload !== "object") {
      return;
    }
    state.editingSetId = String(setPayload.id || "");
    state.method = normalizeMethod(setPayload.creationMethod || "manual");
    if (titleEl) {
      titleEl.value = String(setPayload.label || "");
    }
    if (descriptionEl) {
      descriptionEl.value = String(setPayload.description || "");
    }
    if (publicToggleEl) {
      publicToggleEl.checked = String(setPayload.visibility || "public") !== "private";
    }
    if (categoryEl) {
      categoryEl.value = String(setPayload.category || "");
    }
    if (tagsEl) {
      tagsEl.value = Array.isArray(setPayload.tags) ? setPayload.tags.join(", ") : String(setPayload.tags || "");
    }
    state.coverImage = validCoverUrl(setPayload.coverImage || "");
    state.coverPreview = state.coverImage;
    state.coverSource = state.coverImage ? "loaded" : "";
    state.questions = Array.isArray(setPayload.questions)
      ? setPayload.questions.map((question) => ({
          prompt: String(question?.prompt || ""),
          image: String(question?.image || ""),
          options: Array.isArray(question?.options) ? question.options.map((option) => String(option || "")).slice(0, 4) : ["", "", "", ""],
          answerIndex: Math.max(0, Math.min(3, Number(question?.answerIndex || 0))),
          explanation: String(question?.explanation || "")
        }))
      : [];
    renderMethodPanels();
    updatePrivacyLabel();
    renderCoverStage();
    renderGallery();
    openBuilder("Edit your saved set below, then press Save Set to update it.");
    updateCreateButton();
    setNotice(`Loaded "${String(setPayload.label || "Custom Set")}" into the builder.`, "good");
  }

  function openBuilder(copy) {
    ensureMinimumQuestions(5);
    if (builderTitleEl) {
      builderTitleEl.textContent = String(titleEl?.value || "").trim() || "Build Questions";
    }
    if (builderCopyEl) {
      builderCopyEl.textContent = copy || "Add at least 5 questions, then save the set into the local quiz library.";
    }
    builderSectionEl?.classList.remove("hidden");
    renderBuilder();
    builderSectionEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function shuffledDistractors(entries, index) {
    const pool = entries
      .filter((_entry, entryIndex) => entryIndex !== index)
      .map((entry) => String(entry.definition || "").trim())
      .filter(Boolean);
    const unique = [];
    for (const value of pool) {
      if (!unique.includes(value)) {
        unique.push(value);
      }
    }
    return unique.slice(0, 3);
  }

  function parseQuizletCards(text) {
    const lines = String(text || "")
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
    const entries = [];
    for (const line of lines) {
      let term = "";
      let definition = "";
      const tabSplit = line.split("\t").map((piece) => piece.trim()).filter(Boolean);
      if (tabSplit.length >= 2) {
        [term] = tabSplit;
        definition = tabSplit.slice(1).join(" ");
      } else {
        const match = line.match(/^(.+?)\s(?:\-\s|:\s|\|\s|=>\s)(.+)$/);
        if (match) {
          term = match[1].trim();
          definition = match[2].trim();
        }
      }
      if (term && definition) {
        entries.push({ term, definition });
      }
    }
    if (entries.length < 5) {
      throw new Error("Paste at least 5 term and definition pairs.");
    }

    return entries.map((entry, index) => {
      const distractors = shuffledDistractors(entries, index);
      if (distractors.length < 3) {
        throw new Error("Need at least 4 unique definitions in the Quizlet import.");
      }
      const answerIndex = index % 4;
      const options = distractors.slice();
      options.splice(answerIndex, 0, entry.definition);
      return {
        prompt: `What matches "${entry.term}"?`,
        image: "",
        options,
        answerIndex,
        explanation: "Imported from Quizlet-style terms."
      };
    });
  }

  async function uploadCsvSet() {
    const file = fileInputEl?.files && fileInputEl.files[0];
    if (!file) {
      throw new Error("Choose a CSV, Excel, or JSON file first.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", String(titleEl?.value || "").trim());
    formData.append("description", String(descriptionEl?.value || "").trim());
    formData.append("visibility", currentVisibility());
    formData.append("creationMethod", "csv");
    formData.append("coverImage", persistentCoverValue());
    formData.append("uploadedBy", studentName());

    const response = await fetch("/api/quizzes/upload", {
      method: "POST",
      body: formData,
      credentials: "same-origin"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Could not import this file.");
    }
    const set = payload?.set || null;
    setNotice(`Imported "${set?.label || "Quiz"}" with ${Number(set?.questionCount || 0)} questions.`, "good");
  }

  async function saveSet() {
    const title = String(titleEl?.value || "").trim();
    if (!title) {
      setNotice("Enter a title before saving.", "bad");
      return;
    }
    const payloadQuestions = state.questions.map((question) => ({
      prompt: String(question.prompt || "").trim(),
      image: String(question.image || "").trim(),
      options: Array.isArray(question.options) ? question.options.map((option) => String(option || "").trim()) : [],
      answerIndex: Number(question.answerIndex || 0),
      explanation: String(question.explanation || "").trim()
    }));

    saveBtnEl.disabled = true;
    setNotice("Saving custom set...");
    try {
      const payload = await fetchJson("/api/quizzes/custom/save", {
        method: "POST",
        body: JSON.stringify({
          id: state.editingSetId || undefined,
          title,
          description: String(descriptionEl?.value || "").trim(),
          coverImage: persistentCoverValue(),
          visibility: currentVisibility(),
          creationMethod: state.method,
          category: String(categoryEl?.value || "").trim(),
          tags: String(tagsEl?.value || "").trim(),
          uploadedBy: studentName(),
          questions: payloadQuestions
        })
      });
      state.editingSetId = String(payload?.set?.id || "");
      setNotice(`Saved "${payload?.set?.label || title}" with ${Number(payload?.set?.questionCount || 0)} questions.`, "good");
    } catch (error) {
      setNotice(error?.message || "Could not save this set.", "bad");
    } finally {
      saveBtnEl.disabled = false;
    }
  }

  async function handleCreate() {
    setNotice("");
    const title = String(titleEl?.value || "").trim();
    if (!title) {
      setNotice("Enter a title first.", "bad");
      return;
    }

    if (state.method === "csv") {
      createBtnEl.disabled = true;
      try {
        await uploadCsvSet();
      } catch (error) {
        setNotice(error?.message || "Could not import this file.", "bad");
      } finally {
        updateCreateButton();
      }
      return;
    }

    state.editingSetId = "";
    if (state.method === "quizlet") {
      try {
        state.questions = parseQuizletCards(String(quizletInputEl?.value || ""));
        openBuilder("Quizlet-style cards converted into multiple-choice questions. Review them before saving.");
        setNotice("Quizlet import converted into an editable question set.", "good");
      } catch (error) {
        setNotice(error?.message || "Could not parse Quizlet import.", "bad");
      }
      return;
    }

    state.questions = [];
    ensureMinimumQuestions(5);
    openBuilder("Start with blank questions, then save the finished set into the local quiz library.");
    setNotice("Manual builder ready. Add your questions below.", "good");
  }

  function applyCoverUrl(value) {
    const next = validCoverUrl(value);
    if (!next) {
      setNotice("Use an http(s) image URL or a local /assets/... path.", "bad");
      return;
    }
    state.coverImage = next;
    state.coverPreview = next;
    state.coverSource = "url";
    state.coverFileName = "";
    renderCoverStage();
    renderGallery();
    setNotice("Cover image updated.", "good");
  }

  function applyCoverFile(file) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.coverPreview = String(reader.result || "");
      state.coverImage = "";
      state.coverSource = "file";
      state.coverFileName = file.name || "";
      renderCoverStage();
      renderGallery();
      setNotice("Local file preview loaded. Use URL or gallery if you want the cover to persist after save.", "good");
    };
    reader.readAsDataURL(file);
  }

  function bindEvents() {
    methodsEl?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-method]");
      if (!button) {
        return;
      }
      state.method = String(button.getAttribute("data-method") || "manual");
      renderMethodPanels();
    });

    titleEl?.addEventListener("input", updateCreateButton);
    descriptionEl?.addEventListener("input", () => setNotice(""));
    quizletInputEl?.addEventListener("input", updateCreateButton);
    fileInputEl?.addEventListener("change", updateCreateButton);
    publicToggleEl?.addEventListener("change", updatePrivacyLabel);
    publicToggleEl?.addEventListener("change", () => setNotice(""));
    createBtnEl?.addEventListener("click", handleCreate);
    saveBtnEl?.addEventListener("click", saveSet);
    addQuestionBtnEl?.addEventListener("click", () => {
      state.questions.push(blankQuestion());
      renderBuilder();
    });

    coverUrlBtnEl?.addEventListener("click", () => {
      coverUrlRowEl?.classList.toggle("hidden");
      galleryEl?.classList.add("hidden");
    });
    coverFileBtnEl?.addEventListener("click", () => coverFileInputEl?.click());
    coverGalleryBtnEl?.addEventListener("click", () => {
      galleryEl?.classList.toggle("hidden");
      coverUrlRowEl?.classList.add("hidden");
    });
    coverApplyBtnEl?.addEventListener("click", () => applyCoverUrl(String(coverUrlInputEl?.value || "")));
    coverFileInputEl?.addEventListener("change", () => applyCoverFile(coverFileInputEl.files && coverFileInputEl.files[0]));

    coverStageEl?.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    coverStageEl?.addEventListener("drop", (event) => {
      event.preventDefault();
      const file = event.dataTransfer?.files && event.dataTransfer.files[0];
      if (file) {
        applyCoverFile(file);
      }
    });

    galleryGridEl?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-gallery-image]");
      if (!button) {
        return;
      }
      const image = String(button.getAttribute("data-gallery-image") || "");
      state.coverImage = image;
      state.coverPreview = image;
      state.coverSource = "gallery";
      state.coverFileName = "";
      renderCoverStage();
      renderGallery();
      setNotice("Gallery cover selected.", "good");
    });

    questionsEl?.addEventListener("input", (event) => {
      const row = Number(event.target?.dataset?.row);
      if (!Number.isInteger(row) || !state.questions[row]) {
        return;
      }
      if ("option" in event.target.dataset) {
        const optionIndex = Number(event.target.dataset.option);
        if (Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < 4) {
          state.questions[row].options[optionIndex] = event.target.value || "";
        }
        return;
      }
      const field = String(event.target.dataset.field || "");
      if (field && field !== "answerIndex") {
        state.questions[row][field] = event.target.value || "";
      }
    });

    questionsEl?.addEventListener("change", (event) => {
      const row = Number(event.target?.dataset?.row);
      if (!Number.isInteger(row) || !state.questions[row]) {
        return;
      }
      if (String(event.target.dataset.field || "") === "answerIndex") {
        state.questions[row].answerIndex = Math.max(0, Math.min(3, Number(event.target.value || 0)));
      }
    });

    questionsEl?.addEventListener("click", (event) => {
      const removeIndex = Number(event.target.closest("[data-remove-row]")?.getAttribute("data-remove-row"));
      if (!Number.isInteger(removeIndex)) {
        return;
      }
      state.questions.splice(removeIndex, 1);
      ensureMinimumQuestions(5);
      renderBuilder();
    });
  }

  async function loadData() {
    const [studentStatus, accountPayload, blooksPayload, serverInfo] = await Promise.all([
      fetchJson("/api/student-auth/status").catch(() => ({ loggedIn: false, student: null })),
      fetchJson("/api/account"),
      fetchJson("/api/blooks").catch(() => ({ packs: [] })),
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
    state.gallery = (Array.isArray(blooksPayload?.packs) ? blooksPayload.packs : [])
      .flatMap((pack) => (Array.isArray(pack?.blooks) ? pack.blooks : []))
      .filter((blook) => blook?.image)
      .slice(0, 18)
      .map((blook) => ({
        name: String(blook.name || ""),
        image: String(blook.image || "")
      }));

    const requestedSetId = String(pageParams.get("set") || "").trim();
    if (requestedSetId) {
      try {
        const requestedSet = await fetchJson(`/api/quizzes/custom/${encodeURIComponent(requestedSetId)}`);
        applyLoadedSet(requestedSet?.set || null);
      } catch (error) {
        setNotice(error?.message || "Could not load that saved set.", "bad");
      }
    }
  }

  bindEvents();
  updatePrivacyLabel();
  renderMethodPanels();
  renderCoverStage();

  try {
    await loadData();
  } catch (_error) {
    state.gallery = [];
  }

  renderHeader();
  renderGallery();
  updateCreateButton();
})();
