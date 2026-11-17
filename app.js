/* ==========================================================================
   EXAM PREP HQ: THE APP
   Built to feel simple for a middle schooler working on their own:
   a 5-step guided setup, a "Today" home page, and five tabs.
   Optional extras (study guides, MindPrint, tutorials, Google Calendar)
   are suggested one at a time after the plan exists.
   ========================================================================== */
(function () {
  const CFG = window.PREP_CONFIG;
  const C = window.CONTENT;
  const S = window.Store;
  const { D, uid } = S;
  const st = () => S.state;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const TABS = [
    { id: "today", label: "Today", icon: "🏠" },
    { id: "plan", label: "My plan", icon: "🗓️" },
    { id: "classes", label: "My classes", icon: "📚" },
    { id: "week", label: "My week", icon: "⏰" },
    { id: "tips", label: "Tips", icon: "💡" }
  ];

  const WIZ_STEPS = 5;

  // Study-time choices (students pick one instead of typing times).
  const WEEKDAY_TIMES = [
    { start: "16:00", end: "18:00", label: "After tutorials", sub: "4 to 6 p.m." },
    { start: "18:30", end: "20:30", label: "After dinner", sub: "6:30 to 8:30 p.m." },
    { start: "16:00", end: "20:30", label: "Either one", sub: "4 to 8:30 p.m." }
  ];
  const WEEKEND_TIMES = [
    { start: "10:00", end: "12:30", label: "Mornings", sub: "10 a.m. to 12:30 p.m." },
    { start: "13:00", end: "17:00", label: "Afternoons", sub: "1 to 5 p.m." },
    { start: "10:00", end: "17:00", label: "Either one", sub: "10 a.m. to 5 p.m." }
  ];

  const ui = { dayChecks: {}, tutClass: null, openProj: null, busyType: "weekly", busyLabel: "", busyOpen: false, openClass: null, showPast: false, flipped: {}, examChecks: {}, mpEdit: false, mpAll: false, sync: "local" };

  const BADGES = [
    { id: "plan", e: "🗺️", name: "Plan made", test: s => !!s.plan },
    { id: "first", e: "⭐", name: "First session", test: s => doneCount(s) >= 1 },
    { id: "five", e: "🔥", name: "Five done", test: s => doneCount(s) >= 5 },
    { id: "guide", e: "📄", name: "Study guide added", test: s => Object.values(s.classes).some(c => c.topics.length) },
    { id: "tutorial", e: "🙋", name: "Went to tutorials", test: s => (s.tutorials || []).some(t => t.done) },
    { id: "half", e: "🏔️", name: "Halfway there", test: s => pct(s) >= 50 },
    { id: "ready", e: "🏆", name: "Exam ready", test: s => !!s.plan && s.plan.sessions.filter(x => x.kind === "test").length >= 5 && s.plan.sessions.filter(x => x.kind === "test").every(x => x.done) }
  ];

  function doneCount(s) { return s.plan ? s.plan.sessions.filter(x => x.done).length : 0; }
  function pct(s) { return s.plan && s.plan.sessions.length ? Math.round(100 * doneCount(s) / s.plan.sessions.length) : 0; }
  function askTopics(classId) { return window.Exports.askTopics(classId); }

  /* ---------- Saving, badges, feedback ---------- */
  function save(opts = {}) {
    if (opts.planInputs) st().planStale = !!st().plan;
    S.save();
    checkBadges();
  }

  function checkBadges() {
    const s = st();
    const fresh = BADGES.filter(b => !s.earnedBadges.includes(b.id) && b.test(s));
    if (!fresh.length) return;
    fresh.forEach(b => s.earnedBadges.push(b.id));
    S.persistLocal();
    toast(fresh.length === 1 ? `${fresh[0].e} Badge earned: ${fresh[0].name}` : `${fresh.map(b => b.e).join(" ")} ${fresh.length} badges earned`);
    confetti();
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = document.createElement("div");
    wrap.className = "confetti";
    const colors = ["#9d2235", "#ffc513", "#6fccdd", "#47a972", "#f4a72a", "#0d2b46"];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.4 + "s";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 2300);
  }

  function openModal(html) { const m = $("#modal"); m.innerHTML = html; if (!m.open) m.showModal(); }
  function closeModal() { clearInterval(breatheTimer); const m = $("#modal"); if (m.open) m.close(); }

  /* ---------- Display settings: text size, easier font, high contrast (saved on this device) ---------- */
  const DISPLAY_KEY = "examPrepHQ.display";
  function getDisplay() { try { return Object.assign({ size: "1", font: "default", contrast: "off" }, JSON.parse(localStorage.getItem(DISPLAY_KEY) || "{}")); } catch (e) { return { size: "1", font: "default", contrast: "off" }; } }
  function applyDisplay() {
    const d = getDisplay(), root = document.documentElement;
    root.style.fontSize = `${Number(d.size) * 100}%`;
    root.classList.toggle("hc", d.contrast === "on");
    root.classList.toggle("readable", d.font === "readable");
    if (d.font === "readable" && !document.getElementById("readable-font")) {
      const l = document.createElement("link");
      l.id = "readable-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap";
      document.head.appendChild(l);
    }
  }
  function setDisplay(key, v) {
    const d = getDisplay(); d[key] = v;
    try { localStorage.setItem(DISPLAY_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
    applyDisplay();
  }
  function displayModal() {
    const d = getDisplay();
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button type="button" data-act="display-set" data-key="${key}" data-v="${v}" aria-pressed="${d[key] === v}">${l}</button>`).join("")}</div>`;
    openModal(`<div class="modal-body"><h3>Text and display</h3>
      <div class="field"><label>Text size</label>${seg("size", [["1", "Normal"], ["1.15", "Large"], ["1.3", "Extra large"]])}</div>
      <div class="field"><label>Font</label>${seg("font", [["default", "Standard"], ["readable", "Easier to read"]])}</div>
      <div class="field"><label>Contrast</label>${seg("contrast", [["off", "Standard"], ["on", "High contrast"]])}</div>
      <p class="xs muted">These settings are saved on this device. Tip: tap 🔊 next to any instruction to hear it read aloud.</p></div>
      <div class="modal-foot"><button class="btn" data-act="modal-close">Done</button></div>`);
  }

  /* ---------- Demo mode (for advisory): a made-up student, rebuilt fresh with dates from today ---------- */
  function buildDemo() {
    const s = st();
    const today = D.today();
    const weekdayFrom = n => { let d = D.addDays(today, n); while (D.isWeekend(d)) d = D.addDays(d, 1); return d; };
    s.profile = { name: "Maya", gradeLevel: "8", langChoice: "World Language", langName: "Spanish" };
    const t = (text, conf, details = [], resources = []) => ({ id: uid(), text, conf, details, resources });
    Object.assign(s.classes.english, { grade: "A-", confidence: 4, topics: [
      t("Grammar", 3, ["Participles", "Gerunds", "Infinitives", "Commas", "Semicolons", "Active/Passive Voice", "Fragments/Run-ons/Comma Splice"], ["Review sheets pgs. 2-5", "Practice sheets in workbook"]),
      t("Vocabulary", 4, ["Vocabulary from Literature"], ["Pretest pgs. 6-7", "Vocabulary lists"]),
      t("Literature", 3, ["Shakespeare/The Globe Theater", "The Taming of the Shrew", "“Aucassin and Nicolette”", "“Cupid and Psyche”"], ["Review sheets pgs. 8-11"]),
      t("Figures of Speech", 2, ["Simile", "Metaphor", "Personification", "Hyperbole", "Alliteration", "Onomatopoeia", "Irony", "Allusion", "Anaphora", "Foreshadowing"], ["Review sheets pg. 12"]),
      t("Writing", 4, ["One idea paragraph format"], ["Review sheet pgs. 13-14"])] });
    Object.assign(s.classes.math, { grade: "C+", confidence: 2, questions: "How do I know whether to use substitution or elimination?", topics: [
      t("Unit 3: Linear Equations", 3, ["Slope", "Graphing lines"]), t("Unit 4: Systems of Equations", 2, ["Substitution", "Elimination", "Word problems"]), t("Unit 5: Functions", 1, ["Function notation", "Domain and range"])] });
    Object.assign(s.classes.science, { grade: "B", confidence: 3, topics: [t("Cells and organelles", 4), t("Photosynthesis and respiration", 2), t("Genetics and Punnett squares", 3)] });
    Object.assign(s.classes.social, { grade: "B", confidence: 3 });
    Object.assign(s.classes.lang, { grade: "A-", confidence: 4 });
    s.busy = [{ id: uid(), label: "Soccer practice", type: "weekly", days: [1, 3], start: "16:00", end: "17:45" }, { id: uid(), label: "Piano lesson", type: "weekly", days: [4], start: "18:30", end: "19:15" }];
    s.tutorials = [{ id: uid(), classId: "math", date: weekdayFrom(2), start: CFG.TUTORIAL_START, end: CFG.TUTORIAL_END, done: false }];
    Object.assign(s.prefs, { startDate: today, weekendStart: "13:00", weekendEnd: "17:00" });
    s.accom = { extended: "1.5", customMinutes: "" };
    s.mindprint = { order: { reasoning: ["verbal", "abstract", "spatial"], memory: ["verbalMemory", "visualMemory"], exec: ["workingMemory", "attention", "speed", "flexible"] }, strongest: "reasoning", top: {}, strategies: ["Space Out Studying", "Say it Aloud to Remember", "Quiz Yourself - Active Recall", "Make a Test Plan", "Pace Yourself on Tests", "Pause, Notice, Choose"] };
    s.onboarded = true;
    s.plan = window.Planner.generate(s);
    S.persistLocal();
  }

  function demoBanner() {
    return S.demo ? `<div class="demo-banner" role="note"><b>Demo mode:</b> this is a made-up student, Maya. Nothing here is saved to anyone's account.
      <button class="linkish" data-act="demo-reset">Reset demo</button> <a href="${location.pathname}">Exit demo</a></div>` : "";
  }

  /* ---------- Header ---------- */
  function renderBrand() {
    $("#brand").innerHTML = CFG.LOGO_URL
      ? `<img src="${esc(CFG.LOGO_URL)}" alt="${esc(CFG.SCHOOL_NAME)}"><span class="brand-text"><span class="brand-app">Exam Prep HQ</span></span>`
      : `<span class="brand-text"><span class="brand-school">${esc(CFG.SCHOOL_NAME.toUpperCase())}</span><span class="brand-app">Exam Prep HQ</span></span>`;
  }

  const startOverBtn = `<button class="btn small start-over" data-act="display" aria-label="Text and display settings"><span aria-hidden="true">Aa</span></button><button class="btn small start-over" data-act="start-over" aria-label="Start over"><span aria-hidden="true">↺</span><span class="so-text">Start over</span></button>`;

  function renderAccount() {
    const a = $("#account");
    if (!window.Drive.enabled()) { a.innerHTML = `<span class="sync"><span class="sync-text">Saved on this device</span></span>${startOverBtn}`; return; }
    if (!window.Drive.user) { a.innerHTML = `${startOverBtn}<button class="btn light small" data-act="signin">Sign in with Google</button>`; return; }
    const labels = { saving: ["", "Saving..."], saved: ["ok", "Saved to Drive"], reconnect: ["warn", "Not saving"], error: ["warn", "Save failed"], local: ["", "Saved on this device"] };
    const [cls, txt] = labels[ui.sync] || labels.saved;
    const u = window.Drive.user;
    a.innerHTML = `
      <span class="sync ${cls}"><span class="sync-text">${txt}</span></span>
      ${ui.sync === "reconnect" || ui.sync === "error" ? `<button class="btn light small" data-act="reconnect">Reconnect</button>` : ""}
      ${startOverBtn}
      <button class="avatar" data-act="account-menu" aria-label="Account: ${esc(u.email || "")}">${esc((u.given_name || u.name || "?").charAt(0).toUpperCase())}</button>`;
  }

  function renderTabs(current) {
    $("#tabs").innerHTML = TABS.map(r =>
      `<a class="tab" href="#${r.id}" ${r.id === current ? 'aria-current="page"' : ""}><span aria-hidden="true">${r.icon}</span>${r.label}</a>`).join("");
  }

  /* ---------- Shared pieces ---------- */
  function colorVars(id) {
    const e = S.exam(id);
    return e ? `--c:${e.color};--tint:${e.tint};` : "--c:#9d2235;--tint:#f6e3e1;";
  }

  function confButtons(act, current, extra = "") {
    const sel = C.confidence.find(c => c.v === Number(current));
    return C.confidence.map(c =>
      `<button type="button" data-act="${act}" data-v="${c.v}" ${extra} aria-pressed="${Number(current) === c.v}" title="${c.label}" aria-label="${c.label}">${c.emoji}</button>`).join("")
      + `<span class="conf-label" aria-hidden="true">${sel ? sel.label : ""}</span>`;
  }

  // Read text aloud with the browser's built-in voice (free, works offline).
  function speak(text) {
    if (!("speechSynthesis" in window)) { toast("Read-aloud isn't available in this browser."); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
  const speakBtn = text => ("speechSynthesis" in window) ? `<button type="button" class="icon-btn speak" data-act="speak" data-text="${esc(text)}" aria-label="Read aloud">🔊</button>` : "";

  // Letter grades only: a dropdown, so a number can never be entered.
  function gradePicker(id, value, label, small) {
    return `<label class="${small ? "sr-only" : ""}" for="g-${id}">${label}</label>
      <select id="g-${id}" class="grade-select" data-bind="classes.${id}.grade" data-plan="1" data-rerender="1">
        <option value="" ${value ? "" : "selected"}>${small ? "Grade" : "Not sure"}</option>
        ${S.letters().map(l => `<option value="${l}" ${value === l ? "selected" : ""}>${l}</option>`).join("")}
      </select>`;
  }

  // Optional, folded-away projection. Letters only, always with the disclaimer.
  function projection(e) {
    if (!CFG.GRADE_PROJECTION) return "";
    const c = st().classes[e.id];
    const pct = Math.round(CFG.EXAM_WEIGHT * 100);
    const examLetters = ["A", "B", "C", "D"];
    const body = c.grade
      ? `<p class="small" style="margin:0 0 8px">Your grade now: <b>${esc(c.grade)}</b>. If you get this on the exam, your semester grade could be about:</p>
         <div class="proj">${examLetters.map(x => `<div><span class="xs muted">Exam ${x}</span><b>${esc(S.project(c.grade, x))}</b></div>`).join("")}</div>
         <p class="xs muted" style="margin:8px 0 0">Your work all semester counts for ${100 - pct}%. The exam counts for ${pct}%.</p>`
      : `<p class="small muted" style="margin:0">Pick your current grade above to see this.</p>`;
    return `<details class="more proj-box" ${ui.openProj === e.id ? "open" : ""} data-proj="${e.id}">
      <summary class="small">What could my semester grade be?</summary>
      <div class="disclaimer" role="note"><b>This is only a projection.</b> It's based on the grade you entered today. It is not an official grade, and it doesn't guarantee any grade. Your teacher's gradebook is the only official grade.</div>
      ${body}
    </details>`;
  }

  function gates(small) {
    const today = D.today();
    return `<div class="gates ${small ? "small" : ""}" aria-label="Exam countdown">${CFG.EXAMS.map(e => {
      const n = D.diff(today, e.date);
      const num = n < 0 ? "✓" : String(n);
      const unit = n < 0 ? "done" : n === 0 ? "today" : n === 1 ? "day" : "days";
      return `<div class="gate ${n < 0 ? "past" : ""}" style="${colorVars(e.id)}">
        <div class="icon" aria-hidden="true">${e.icon}</div>
        <div class="num">${num}</div><div class="unit">${unit}</div>
        <div class="subj">${esc(S.className(e.id))}</div>
        <div class="when">${D.pretty(e.date, false)}</div>
      </div>`;
    }).join("")}</div>`;
  }

  function sessionCard(x, opts = {}) {
    const late = !x.done && x.date < D.today();
    const res = (x.resources || []).slice(0, 3);
    const startable = !x.done && x.date <= D.today();
    return `<div class="session ${x.done ? "done" : ""}" style="${colorVars(x.classId)}">
      <button class="check" data-act="toggle-session" data-id="${x.id}" aria-pressed="${!!x.done}" aria-label="Mark ${esc(x.title)} done">${x.done ? "✓" : ""}</button>
      <div class="s-main">
        <div class="time">${D.clock(x.start)} to ${D.clock(x.end)}</div>
        <div class="s-title">${esc(x.title)}</div>
        <div class="s-topic">${esc(x.topicText)}</div>
        <p class="s-tip">${esc(x.tip)} ${speakBtn(`${x.title}. ${x.topicText}. ${x.tip}`)}</p>
        ${res.length ? `<p class="s-use"><b>Use:</b> ${esc(res.join("; "))}</p>` : ""}
        ${!x.done ? `<div class="s-actions">
          ${startable || opts.big ? `<button class="btn small start-btn" data-act="focus" data-id="${x.id}">▶ ${late ? "Do it now" : "Start"}</button>` : ""}
          <button class="linkish small" data-act="move-session" data-id="${x.id}">${late ? "Move to a new time" : "Can't do it? Move it"}</button>
        </div>` : ""}
        ${late ? `<p class="xs" style="margin:6px 0 0;color:var(--red)">You missed this one. No problem: do it now or move it.</p>` : ""}
      </div>
    </div>`;
  }

  function tutorialPill(t) {
    const topics = askTopics(t.classId).slice(0, 3);
    return `<div class="tut-pill"><span aria-hidden="true">🙋</span><span><b>${esc(S.className(t.classId))} tutorial, ${D.clock(t.start)}</b>${topics.length ? `<br><span class="small">Ask about: ${esc(topics.join("; "))}</span>` : ""}</span></div>`;
  }

  /* ======================================================================
     FOCUS SCREEN: Start -> timer -> check-in -> break
     ====================================================================== */
  const focus = { id: null, steps: [], i: 0, end: 0, left: 0, paused: false, timer: null, picked: null, stuck: false };

  function focusSteps(lenMin) {
    const steps = [];
    if (st().prefs.extraBreaks) {
      const n = Math.max(1, Math.ceil(lenMin / 15));
      const base = Math.floor(lenMin / n), extra = lenMin - base * n;
      for (let k = 0; k < n; k++) {
        steps.push({ type: "work", min: base + (k < extra ? 1 : 0), label: n > 1 ? `Sprint ${k + 1} of ${n}` : "Focus time" });
        if (k < n - 1) steps.push({ type: "mini", min: 5, label: "Short break" });
      }
    } else {
      steps.push({ type: "work", min: lenMin, label: "Focus time" });
    }
    steps.push({ type: "checkin" });
    steps.push({ type: "break", min: 10, label: "Break time" });
    return steps;
  }

  function openFocus(id) {
    const x = st().plan.sessions.find(y => y.id === id);
    if (!x) return;
    clearInterval(focus.timer);
    Object.assign(focus, { id, steps: focusSteps(Number(st().prefs.sessionLen) || 30), i: 0, paused: false, picked: null, stuck: false });
    startStep();
    const d = $("#focus");
    if (!d.open) d.showModal();
  }

  function startStep() {
    const step = focus.steps[focus.i];
    clearInterval(focus.timer);
    if (step.min) {
      focus.left = step.min * 60;
      focus.end = Date.now() + focus.left * 1000;
      focus.timer = setInterval(tick, 500);
    }
    renderFocus();
  }

  function tick() {
    if (focus.paused) return;
    focus.left = Math.max(0, Math.round((focus.end - Date.now()) / 1000));
    const t = $("#focus .f-time");
    if (t) t.textContent = mmss(focus.left);
    const step = focus.steps[focus.i];
    if (step && step.min) {
      const bar = $("#focus .f-ring");
      if (bar) bar.style.setProperty("--p", String(100 - Math.round(100 * focus.left / (step.min * 60))));
    }
    if (focus.left <= 0) {
      clearInterval(focus.timer);
      if (navigator.vibrate) navigator.vibrate(200);
      nextStep();
    }
  }
  const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  function nextStep() {
    if (focus.i < focus.steps.length - 1) { focus.i++; startStep(); }
    else closeFocus();
  }

  function closeFocus() {
    clearInterval(focus.timer);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const d = $("#focus");
    if (d.open) d.close();
    focus.id = null;
    render();
  }

  function renderFocus() {
    const x = st().plan.sessions.find(y => y.id === focus.id);
    if (!x) return;
    const step = focus.steps[focus.i];
    const res = (x.resources || []).slice(0, 3);
    const head = `<div class="f-head" style="${colorVars(x.classId)}">
        <div><div class="f-class">${esc(x.title)}</div><div class="f-topic">${esc(x.topicText)}</div></div>
        <button class="icon-btn f-close" data-act="focus-close" aria-label="Close">✕</button>
      </div>`;
    let body = "";
    if (step.type === "work") {
      body = `
        <p class="f-label">${esc(step.label)}</p>
        <div class="f-ring" style="--p:0"><span class="f-time" role="timer" aria-live="off">${mmss(focus.left)}</span></div>
        <div class="f-task"><p><b>What to do:</b> ${esc(x.tip)} ${speakBtn(x.tip)}</p>
          ${res.length ? `<p class="s-use"><b>Use:</b> ${esc(res.join("; "))}</p>` : ""}</div>
        <div class="btn-row f-actions">
          <button class="btn ghost" data-act="focus-pause">${focus.paused ? "▶ Resume" : "⏸ Pause"}</button>
          <button class="btn" data-act="focus-next">I'm done</button>
        </div>
        <p class="f-help"><button class="linkish small" data-act="overwhelmed">Feeling overwhelmed?</button></p>`;
    } else if (step.type === "mini") {
      body = `
        <p class="f-label">${esc(step.label)}</p>
        <div class="f-ring rest" style="--p:0"><span class="f-time" role="timer">${mmss(focus.left)}</span></div>
        <p class="f-rest">Stand up, stretch, and get some water. Your next sprint starts when the timer ends.</p>
        <div class="btn-row f-actions"><button class="btn" data-act="focus-next">Start next sprint now</button></div>`;
    } else if (step.type === "checkin") {
      const cls = st().classes[x.classId];
      const topic = cls && cls.topics.find(t => t.id === x.baseId);
      const current = focus.picked || (topic ? topic.conf : null);
      body = `
        <p class="f-big">Nice work. 🎉</p>
        <p><b>How does ${topic ? `“${esc(topic.text)}”` : "this topic"} feel now?</b></p>
        <div class="conf big-conf" role="group" aria-label="How it feels now">${confButtons("focus-feel", current)}</div>
        <p class="xs muted">Your plan adjusts to your answer: shaky topics get more practice, solid ones get less.</p>
        ${x.classId !== "general" ? (focus.stuck
          ? `<div class="note small" style="margin-top:10px">Added to your questions for your teacher. <a href="#week" data-act="focus-tutorial" data-class="${x.classId}">Plan a tutorial</a></div>`
          : `<p style="margin-top:12px"><button class="btn small ghost" data-act="focus-stuck">🙋 Stuck? Ask my teacher</button></p>`) : ""}
        <div class="btn-row f-actions"><button class="btn big" data-act="focus-save">Save and take a break</button></div>`;
    } else {
      const later = st().plan.sessions.find(y => !y.done && y.date === D.today() && y.id !== focus.id);
      body = `
        <p class="f-label">${esc(step.label)}</p>
        <div class="f-ring rest" style="--p:0"><span class="f-time" role="timer">${mmss(focus.left)}</span></div>
        <p class="f-rest">Move around, get a snack, look at something far away. You earned it.</p>
        ${later ? `<p class="small">Up next today: <b>${esc(later.title)}</b> at ${D.clock(later.start)}</p>` : `<p class="small">That's everything for today.</p>`}
        <div class="btn-row f-actions"><button class="btn" data-act="focus-close">Done</button></div>`;
    }
    $("#focus").innerHTML = `<div class="f-wrap">${head}<div class="f-body">${body}</div></div>`;
    document.title = step.min ? `${mmss(focus.left)} ${step.type === "work" ? "Focus" : "Break"} | Exam Prep HQ` : "Exam Prep HQ";
  }

  function saveCheckin() {
    const s = st();
    const x = s.plan.sessions.find(y => y.id === focus.id);
    if (!x) return;
    x.done = true;
    let changed = false;
    const cls = s.classes[x.classId];
    const topic = cls && cls.topics.find(t => t.id === x.baseId);
    if (topic && focus.picked && Number(topic.conf) !== focus.picked) { topic.conf = focus.picked; changed = true; }
    save();
    if (changed) { rebuildQuiet(); toast("Got it. Your plan adjusted to how that topic feels."); }
    else toast("Session done. Nice work.");
    nextStep();
  }

  function saveCheckinIfNeeded() {
    const x = st().plan && st().plan.sessions.find(y => y.id === focus.id);
    if (x && !x.done && focus.steps[focus.i] && focus.steps[focus.i].type === "checkin") { focus.i = focus.steps.length - 1; saveCheckin(); }
  }

  function addStuck(x) {
    const cls = st().classes[x.classId];
    if (!cls) return;
    const line = `Stuck on: ${x.topicText}`;
    if (!(cls.questions || "").includes(line)) cls.questions = (cls.questions ? cls.questions.trim() + "\n" : "") + line;
    save();
  }

  // Rebuild in the background (keeps finished sessions); used by check-ins and Catch me up.
  function rebuildQuiet() {
    const s = st();
    s.plan = window.Planner.generate(s);
    s.planStale = false;
    save();
  }

  /* ======================================================================
     TODAY
     ====================================================================== */
  function pageToday() {
    const s = st();
    const today = D.today();
    const firstExam = CFG.EXAMS.map(e => e.date).sort()[0];
    const toFirst = D.diff(today, firstExam);

    if (!s.plan) {
      return `
        <section class="hero brick">
          <h1>${toFirst > 0 ? `Exams start in ${toFirst} day${toFirst === 1 ? "" : "s"}.` : "Exams are here."}</h1>
          <p>Let's make a plan so you're ready, without the stress.</p>
          <div class="btn-row"><a class="btn light big" href="#start/1">Make my plan</a><span class="hero-note">Takes about 5 minutes</span></div>
          ${gates(false)}
        </section>
        <section class="how" aria-labelledby="how-h">
          <h2 id="how-h">How it works</h2>
          <ol class="how-steps">${C.howItWorks.map(h => `<li><span class="how-emoji" aria-hidden="true">${h.emoji}</span><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join("")}</ol>
          <p class="small muted" style="margin-top:14px">Just want study tips? <a href="#tips">Browse tips</a>.</p>
        </section>`;
    }

    const todays = s.plan.sessions.filter(x => x.date === today);
    const tutsToday = (s.tutorials || []).filter(t => t.date === today && !t.done);
    const examToday = CFG.EXAMS.find(e => e.date === today);
    const next = s.plan.sessions.filter(x => !x.done && x.date > today).slice(0, 1);
    const allDone = todays.length && todays.every(x => x.done);
    const name = s.profile.name ? `, ${esc(s.profile.name)}` : "";

    let todayBody;
    const missedList = missedSessions();
    const missedHTML = missedList.length ? `<div class="missed-box"><h3 class="h4">Missed ${missedList.length === 1 ? "session" : `sessions (${missedList.length})`}</h3>
      <p class="xs muted" style="margin:-4px 0 8px">Do it now, move it, or tap “Make up missed sessions” to move them all.</p>
      <div class="sessions">${missedList.slice(0, 2).map(x => sessionCard(x)).join("")}</div></div>` : "";
    if (todays.length) {
      todayBody = `${allDone ? `<p class="win">🎉 You're done for today${name}. Go enjoy your evening.</p>` : ""}<div class="sessions">${todays.map(sessionCard).join("")}</div>`;
    } else {
      todayBody = missedList.length ? `<p class="small muted">Nothing else scheduled today.</p>` : `<p class="win">😌 No studying today. Enjoy it.</p>`;
    }
    if (next.length && (allDone || !todays.length)) {
      todayBody += `<h3 class="h4" style="margin-top:16px">Next up: ${D.pretty(next[0].date)}</h3><div class="sessions">${sessionCard(next[0])}</div>`;
    }

    return `
      <section class="hero brick compact">
        <h1>Hi${name}.</h1>
        <p>${toFirst > 0 ? `${toFirst} day${toFirst === 1 ? "" : "s"} until your first exam. You've got a plan.` : "It's exam time. You've prepared for this."}</p>
        ${gates(true)}
      </section>

      ${tourCard()}
      ${s.planStale ? `<div class="warn" style="margin-top:18px">You changed some things. <button class="btn small" data-act="build">Update my plan</button></div>` : ""}
      ${catchUpBanner()}
      ${examDayCard()}

      <div class="grid today-grid" style="margin-top:20px">
        <section class="panel today-card" aria-labelledby="today-h">
          <h2 id="today-h">Today <span class="muted" style="font-weight:600;font-size:1rem">${D.pretty(today)}</span></h2>
          ${tutsToday.map(tutorialPill).join("")}
          ${missedHTML}
          ${todayBody}
        </section>

        <div class="stack">
          <section class="panel">
            <h3>My progress</h3>
            <div class="bar" role="img" aria-label="${pct(s)} percent done"><span style="width:${pct(s)}%"></span></div>
            <p class="small" style="margin:8px 0 0"><b>${doneCount(s)}</b> of ${s.plan.sessions.length} sessions done</p>
            ${s.earnedBadges.length ? `<p class="badge-row" aria-label="Badges earned">${BADGES.filter(b => s.earnedBadges.includes(b.id)).map(b => `<span title="${b.name}">${b.e}</span>`).join("")}</p>` : ""}
          </section>
          ${planTools(true)}
          <button class="panel calm-btn" data-act="overwhelmed"><span aria-hidden="true">😮‍💨</span><span><b>Feeling overwhelmed?</b><span class="small">Breathe, add breaks, or talk to someone.</span></span></button>
          ${nudges()}
        </div>
      </div>

      ${tipOfTheDay()}`;
  }

  function tourCard() {
    if (st().tourDone) return "";
    return `<section class="panel tour" aria-labelledby="tour-h" style="margin-top:18px">
      <h2 id="tour-h" class="h3">3 things to know</h2>
      <ol class="tour-list">
        <li><b>Tap ▶ Start</b> on a session. You get a timer, clear steps, and a break.</li>
        <li><b>Tap a face when you finish.</b> Your plan adjusts to how each topic feels.</li>
        <li><b>Print it, add it to your calendar, or make up a missed session</b> with the buttons on Today and My plan.</li>
      </ol>
      <button class="btn small" data-act="tour-done">Got it</button>
    </section>`;
  }

  function missedSessions() {
    const s = st();
    return s.plan ? s.plan.sessions.filter(x => !x.done && x.date < D.today()) : [];
  }

  function catchUpBanner() {
    const n = missedSessions().length;
    if (!n) return "";
    return `<div class="warn catch" style="margin-top:18px"><span>You have ${n} missed session${n === 1 ? "" : "s"}. That's OK.</span> <button class="btn small" data-act="catch-up">Catch me up</button></div>`;
  }

  // Night before an exam, and exam morning: a short, calm checklist.
  function examDayCard() {
    const today = D.today();
    const examToday = CFG.EXAMS.find(e => e.date === today);
    const examTomorrow = CFG.EXAMS.find(e => e.date === D.addDays(today, 1));
    const mins = S.examMinutes();
    const extra = mins > CFG.EXAM_MINUTES;
    const preview = Math.round(mins * 0.07), check = Math.round(mins * 0.15), answer = mins - preview - check;
    const half = preview + Math.round(answer / 2);
    const list = (key, items) => `<ul class="checklist">${items.map((t, i) => `<li><label><input type="checkbox" data-daycheck="${key}-${i}" ${ui.dayChecks[`${key}-${i}`] ? "checked" : ""}> ${t}</label></li>`).join("")}</ul>`;
    let html = "";
    if (examToday) {
      html += `<section class="panel day-card" style="${colorVars(examToday.id)}" aria-labelledby="ed-h">
        <h2 id="ed-h">⭐ ${esc(S.className(examToday.id))} exam today</h2>
        <p>You've prepared for this. A calm start helps.</p>
        ${list("morning-" + examToday.id, ["Eat breakfast", "Bring your supplies, water, and a snack", "Know which room you're in", "One slow breath: in for 4, out for 6"])}
        <p class="small"><b>Your pacing plan for ${mins} minutes${extra ? " (with your extended time)" : ""}:</b> look it over for ${preview} minutes, answer for ${answer}, check for ${check}. Around minute ${half}, you should be about halfway.${extra ? " Use all of your time." : ""}</p>
        <button class="btn small ghost" data-act="breathe">Breathe with me (1 minute)</button>
      </section>`;
    }
    if (examTomorrow) {
      html += `<section class="panel day-card" style="${colorVars(examTomorrow.id)}" aria-labelledby="nb-h">
        <h2 id="nb-h">🌙 ${esc(S.className(examTomorrow.id))} exam tomorrow</h2>
        <p>Tonight is for a light review and a good night's sleep, not cramming.</p>
        ${list("night-" + examTomorrow.id, ["Do tonight's practice exam session", "Pack your supplies (pens, pencils, highlighter, calculator if allowed), water, and a snack", "Light review only, nothing new", "Screens off early and lights out on time"])}
        ${extra ? `<p class="small">Remember: you have <b>${mins} minutes</b>. Plan to use all of them.</p>` : ""}
      </section>`;
    }
    return html ? `<div class="stack" style="margin-top:18px">${html}</div>` : "";
  }

  function catchUp() {
    rebuildQuiet();
    const s = st();
    const today = D.today();
    const examIn = id => { const e = S.exam(id); return e ? D.diff(today, e.date) : 99; };
    const confOf = x => { const c = s.classes[x.classId]; const t = c && c.topics.find(y => y.id === x.baseId); return t ? Number(t.conf) : (c ? Number(c.confidence) : 3); };
    const seen = new Set();
    const top = s.plan.sessions.filter(x => !x.done && x.date >= today && x.classId !== "general")
      .map(x => ({ x, score: examIn(x.classId) + 3 * confOf(x) }))
      .sort((a, b) => a.score - b.score)
      .filter(o => { const k = o.x.classId + o.x.baseId; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 3).map(o => o.x);
    render();
    openModal(`<div class="modal-body"><h3>You're caught up 👍</h3>
      <p>Missed sessions moved to new times. Finished ones stayed checked off.</p>
      ${top.length ? `<h4>Short on time? Do these first</h4><p class="small muted">Your shakiest topics for your soonest exams.</p>
        <ol class="priority">${top.map(x => `<li><b>${esc(x.title)}</b><br><span class="small">${esc(x.topicText)}. ${D.pretty(x.date)}, ${D.clock(x.start)}</span></li>`).join("")}</ol>` : ""}
      ${s.drive.calendarSyncedAt ? `<p class="small muted">Tip: tap “Update Google Calendar” in Save my plan so your reminders match.</p>` : ""}</div>
      <div class="modal-foot"><button class="btn" data-act="modal-close">OK</button></div>`);
  }

  function overwhelmedModal() {
    const s = st();
    const next = s.plan && s.plan.sessions.find(x => !x.done && x.date >= D.today());
    const on = !!s.prefs.extraBreaks;
    const target = $("#focus").open ? $("#focus") : null;
    const html = `
      <div class="modal-body calm">
        <h3>Feeling overwhelmed? That's normal.</h3>
        <p class="muted">Lots of students feel this way before exams. Here are a few things that help.</p>
        <div class="calm-row"><span class="e" aria-hidden="true">🫁</span><div><b>Breathe for one minute</b><p class="small">Slow breathing calms your body down fast.</p><button class="btn small" data-act="breathe">Breathe with me</button></div></div>
        <div class="calm-row"><span class="e" aria-hidden="true">💬</span><div><b>Talk to someone</b><p class="small">A parent, your advisor, a teacher, or a school counselor. You don't have to handle stress alone, and asking for help is a strong move. If you're having a really hard time, tell an adult today.</p></div></div>
        <div class="calm-row"><span class="e" aria-hidden="true">☕</span><div><b>Add more breaks</b><p class="small">Same study time, split into 15-minute sprints with 5-minute breaks in between.</p>
          <button class="btn small ${on ? "" : "ghost"}" data-act="extra-breaks" aria-pressed="${on}">${on ? "✓ Extra breaks are on" : "Turn on extra breaks"}</button></div></div>
        ${next && !target ? `<div class="calm-row"><span class="e" aria-hidden="true">👣</span><div><b>Just start</b><p class="small">Starting is the hardest part. Begin your next session and focus on the first 5 minutes.</p><button class="btn small ghost" data-act="focus-from-calm" data-id="${next.id}">Start my next session</button></div></div>` : ""}
      </div>
      <div class="modal-foot"><button class="btn" data-act="modal-close">Close</button></div>`;
    openModal(html);
  }

  // One minute of guided breathing: in for 4, out for 6.
  let breatheTimer = null;
  function breathe() {
    openModal(`<div class="modal-body breathe-box">
      <div class="breathe-circle" aria-hidden="true"></div>
      <p class="breathe-text" aria-live="polite">Get comfortable.</p>
      <p class="small muted breathe-count"></p></div>
      <div class="modal-foot"><button class="btn ghost" data-act="breathe-stop">Stop</button></div>`);
    let cycle = 0, t0 = Date.now();
    clearInterval(breatheTimer);
    const circle = $(".breathe-circle"), text = $(".breathe-text"), count = $(".breathe-count");
    const stepFn = () => {
      const el = (Date.now() - t0) / 1000;
      const inCycle = el % 10;
      cycle = Math.floor(el / 10);
      if (cycle >= 6) { clearInterval(breatheTimer); text.textContent = "Nice. Notice how you feel."; circle.className = "breathe-circle"; count.textContent = ""; return; }
      const inhale = inCycle < 4;
      text.textContent = inhale ? `Breathe in… ${4 - Math.floor(inCycle)}` : `Breathe out… ${6 - Math.floor(inCycle - 4)}`;
      circle.className = "breathe-circle " + (inhale ? "in" : "out");
      count.textContent = `Breath ${cycle + 1} of 6`;
    };
    stepFn();
    breatheTimer = setInterval(stepFn, 250);
  }

  // Suggest at most two optional upgrades at a time.
  function nudges() {
    const s = st();
    const list = [];
    const missing = CFG.EXAMS.filter(e => !s.classes[e.id].topics.length && e.date >= D.today()).sort((a, b) => a.date.localeCompare(b.date));
    if (missing.length) list.push({ e: "📄", t: `Add your ${S.className(missing[0].id)} study guide`, d: `So your plan covers exactly what's on that exam.${missing.length > 1 ? ` (${missing.length - 1} more after that)` : ""}`, href: "#classes", open: missing[0].id });
    if (!(s.tutorials || []).length) list.push({ e: "🙋", t: "Plan a tutorial", d: "3:15 to 3:40 p.m. with your teacher.", href: "#week" });
    if (!S.mpIsSet()) list.push({ e: "🧩", t: "Add your MindPrint", d: "Get study tips that fit how you learn.", href: "#tips/mindprint" });
    if (!list.length) return "";
    return `<section class="panel nudges" aria-labelledby="nudge-h">
      <h3 id="nudge-h">Make your plan even better</h3>
      ${list.slice(0, 2).map(n => n.href
        ? `<a class="nudge" href="${n.href}" ${n.open ? `data-act="open-class" data-class="${n.open}"` : ""}><span class="e" aria-hidden="true">${n.e}</span><span><b>${n.t}</b><span class="small">${n.d}</span></span></a>`
        : `<button class="nudge" data-act="${n.act}"><span class="e" aria-hidden="true">${n.e}</span><span><b>${n.t}</b><span class="small">${n.d}</span></span></button>`).join("")}
    </section>`;
  }

  function tipOfTheDay() {
    const cards = C.tips.filter(t => t.cards).flatMap(t => t.cards.map(c => Object.assign({ topic: t.id }, c)));
    const day = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000);
    const c = cards[day % cards.length];
    return `<section class="panel tip-day" aria-labelledby="tod-h" style="margin-top:20px">
      <span class="tod-emoji" aria-hidden="true">💡</span>
      <div><h3 id="tod-h">Tip of the day: ${esc(c.title)}</h3><p style="margin:0">${esc(c.body)} <b>Try it:</b> ${esc(c.try)}</p>
      <a class="small" href="#tips/${c.topic}">More tips like this</a></div>
    </section>`;
  }

  /* ======================================================================
     GUIDED SETUP (#start/1 ... #start/5, then #start/done)
     ====================================================================== */
  function pageStart(step) {
    if (step === "done") return wizardDone();
    const n = Math.min(WIZ_STEPS, Math.max(1, Number(step) || 1));
    const steps = { 1: wizAboutYou, 2: wizClasses, 3: wizBusy, 4: wizStudyTimes, 5: wizExtras };
    const last = n === WIZ_STEPS;
    return `
      <section class="wizard" aria-labelledby="wiz-h">
        <div class="wiz-progress">
          <span class="small">Step ${n} of ${WIZ_STEPS}</span>
          <div class="bar"><span style="width:${(n / WIZ_STEPS) * 100}%"></span></div>
        </div>
        ${steps[n]()}
        <div class="wiz-nav">
          ${n > 1 ? `<a class="btn ghost" href="#start/${n - 1}">Back</a>` : `<a class="btn ghost" href="#today">Cancel</a>`}
          ${last ? `<button class="btn big" data-act="wiz-finish">Make my plan</button>` : `<a class="btn big" href="#start/${n + 1}">Next</a>`}
        </div>
      </section>`;
  }

  function wizAboutYou() {
    const p = st().profile;
    const lastExam = CFG.EXAMS.find(e => e.id === "lang");
    return `
      <h1 id="wiz-h">First, a little about you</h1>
      <div class="field"><label for="p-name">What's your first name? <span class="muted">(optional)</span></label><input id="p-name" type="text" data-bind="profile.name" value="${esc(p.name)}" autocomplete="given-name"></div>
      <div class="field"><label>What grade are you in?</label><div class="seg">${["7", "8"].map(g => `<button type="button" data-act="set" data-path="profile.gradeLevel" data-v="${g}" aria-pressed="${p.gradeLevel === g}">${g}th grade</button>`).join("")}</div></div>
      <div class="field"><label>Is your last exam (${D.pretty(lastExam.date, false)}) World Language or Literature?</label><div class="seg">${["World Language", "Literature"].map(g => `<button type="button" data-act="set" data-path="profile.langChoice" data-v="${g}" aria-pressed="${p.langChoice === g}">${g}</button>`).join("")}</div></div>
      ${p.langChoice === "World Language" ? `<div class="field"><label for="p-lang">Which language? <span class="muted">(optional)</span></label><input id="p-lang" type="text" data-bind="profile.langName" value="${esc(p.langName)}" placeholder="Spanish, French, Latin..."></div>` : ""}`;
  }

  function wizClasses() {
    const s = st();
    return `
      <h1 id="wiz-h">How are your classes going?</h1>
      <p class="muted">Pick your letter grade and tap the face that matches how you feel. Classes you're less sure about get more study time. Not sure of your grade? Skip it.</p>
      <div class="wiz-classes">${CFG.EXAMS.map(e => {
        const c = s.classes[e.id];
        return `<div class="wiz-class" style="${colorVars(e.id)}">
          <div class="wc-name"><span aria-hidden="true">${e.icon}</span><span><b>${esc(S.className(e.id))}</b><span class="xs muted">Exam ${D.pretty(e.date, false)}</span></span></div>
          <div class="wc-grade">${gradePicker(e.id, c.grade, `${esc(S.className(e.id))} letter grade`, true)}</div>
          <div class="conf" role="group" aria-label="How you feel about ${esc(S.className(e.id))}">${confButtons("class-conf", c.confidence, `data-class="${e.id}"`)}</div>
        </div>`;
      }).join("")}</div>`;
  }

  function wizBusy() {
    return `
      <h1 id="wiz-h">What's already on your calendar?</h1>
      <p class="muted">Add things like practices, rehearsals, or lessons so your plan works around them. Nothing to add? Just tap Next.</p>
      ${busyEditor()}`;
  }

  function wizStudyTimes() {
    return `<h1 id="wiz-h">When do you like to study?</h1>${studyTimeChoices()}`;
  }

  function wizExtras() {
    const s = st();
    const opts = [["none", "No"], ["1.5", "Time and a half"], ["2", "Double time"], ["unsure", "Not sure"]];
    return `
      <h1 id="wiz-h">Two last questions</h1>
      <p class="muted">Both are optional.</p>
      <div class="field"><label>Do you get extended time on tests?</label>
        <div class="seg">${opts.map(([v, l]) => `<button type="button" data-act="set" data-path="accom.extended" data-plan="1" data-v="${v}" aria-pressed="${s.accom.extended === v}">${l}</button>`).join("")}</div>
        ${s.accom.extended === "unsure" ? `<p class="xs muted" style="margin:6px 0 0">That's OK. Ask your advisor, then update it in Tips &gt; Extended time.</p>` : ""}
      </div>
      <div class="field" style="margin-top:20px"><label>Do you have your MindPrint report?</label>
        ${S.mpIsSet() ? `<p class="small">✓ MindPrint added.</p>` : `
        <label class="drop" data-mpdrop>
          <input type="file" accept=".pdf,.docx,.txt,image/*" data-mpupload>
          📤 Upload my MindPrint report<br><span class="xs muted">The PDF from MindPrint. You can skip this and add it later.</span>
        </label>`}
      </div>`;
  }

  function wizardDone() {
    const s = st();
    if (!s.plan) return `<section class="wizard"><h1>Let's make your plan</h1><a class="btn big" href="#start/1">Start</a></section>`;
    const first = s.plan.sessions.find(x => !x.done && x.date >= D.today());
    return `
      <section class="wizard done-screen">
        <div class="big-emoji" aria-hidden="true">🎉</div>
        <h1>Your plan is ready${s.profile.name ? `, ${esc(s.profile.name)}` : ""}.</h1>
        <p>You have <b>${s.plan.sessions.length} short study sessions</b> before exams. You don't have to figure out what to study. Just open Exam Prep HQ and do what's on Today.</p>
        ${first ? `<h3 style="margin-top:18px">Your first session: ${D.pretty(first.date)}</h3><div class="sessions" style="text-align:left">${sessionCard(first)}</div>` : ""}
        <h3 style="margin-top:24px">Put it where you'll see it</h3>
        <div class="btn-row" style="justify-content:center">
          ${window.Drive.enabled() ? `<button class="btn" data-act="exp-gcal">🔔 Add to Google Calendar</button>` : ""}
          <button class="btn ${window.Drive.enabled() ? "ghost" : ""}" data-act="exp-print">🖨️ Print it</button>
        </div>
        <p style="margin-top:24px"><a class="btn ghost" href="#today">Go to Today</a></p>
      </section>`;
  }

  /* ---------- Shared editors (used in setup and on My week) ---------- */
  const PRESETS = [["⚽", "Practice"], ["🏀", "Game"], ["🎭", "Rehearsal"], ["🎵", "Lesson"], ["📖", "Tutoring"], ["🙏", "Religious service"], ["🍽️", "Family time"], ["➕", "Something else"]];

  function busyEditor() {
    const s = st();
    const list = s.busy.length ? `<ul class="busy-list">${s.busy.map(b => `
      <li class="busy-item">
        <span class="grow"><b>${esc(b.label || "Busy")}</b><br><span class="when">${b.type === "weekly"
          ? `Every ${(b.days || []).map(d => D.daysShort[d]).join(", ")}`
          : D.pretty(b.date)}, ${D.clock(b.start)} to ${D.clock(b.end)}</span></span>
        <button class="icon-btn" data-act="busy-del" data-id="${b.id}" aria-label="Remove ${esc(b.label)}">🗑️</button>
      </li>`).join("")}</ul>` : "";

    const form = ui.busyOpen ? `
      <form data-busyform class="busy-form">
        <div class="field"><label for="b-label">What is it?</label><input id="b-label" type="text" value="${esc(ui.busyLabel === "Something else" ? "" : ui.busyLabel)}" required></div>
        <div class="field"><label>How often?</label>
          <div class="seg">
            <button type="button" data-act="busy-type" data-v="weekly" aria-pressed="${ui.busyType === "weekly"}">Every week</button>
            <button type="button" data-act="busy-type" data-v="once" aria-pressed="${ui.busyType === "once"}">Just once</button>
          </div>
        </div>
        ${ui.busyType === "weekly"
          ? `<fieldset class="field" style="border:0;padding:0;margin:0 0 14px"><legend class="small" style="font-weight:600;margin-bottom:4px">Which days?</legend><div class="daypick">${D.daysShort.map((d, i) => `<label><input type="checkbox" name="day" value="${i}"><span>${d}</span></label>`).join("")}</div></fieldset>`
          : `<div class="field"><label for="b-date">Date</label><input id="b-date" type="date" required min="${D.today()}"></div>`}
        <div class="fields">
          <div class="field"><label for="b-start">Starts</label><input id="b-start" type="time" value="16:00" required></div>
          <div class="field"><label for="b-end">Ends (with travel)</label><input id="b-end" type="time" value="17:30" required></div>
        </div>
        <div class="btn-row"><button class="btn" type="submit">Add it</button><button class="btn ghost" type="button" data-act="busy-cancel">Cancel</button></div>
      </form>` : `<div class="chips" style="margin-top:12px">${PRESETS.map(([e, l]) => `<button class="chip" type="button" data-act="preset" data-label="${l}">${e} ${l}</button>`).join("")}</div>`;

    return `${list}${form}`;
  }

  function studyTimeChoices() {
    const p = st().prefs;
    const pick = (list, which) => list.map(o => {
      const on = p[`${which}Start`] === o.start && p[`${which}End`] === o.end;
      return `<button type="button" class="choice" data-act="study-time" data-which="${which}" data-start="${o.start}" data-end="${o.end}" aria-pressed="${on}"><b>${o.label}</b><span>${o.sub}</span></button>`;
    }).join("");
    const free = [[-1, "No"], [6, "Saturday"], [0, "Sunday"]];
    return `
      <div class="field"><label>On school days</label><div class="choices">${pick(WEEKDAY_TIMES, "weekday")}</div></div>
      <div class="field"><label>On weekends</label><div class="choices">${pick(WEEKEND_TIMES, "weekend")}</div></div>
      <div class="field"><label>Want one day a week with no studying at all?</label>
        <div class="seg">${free.map(([v, l]) => `<button type="button" data-act="set" data-path="prefs.freeDay" data-num="1" data-plan="1" data-v="${v}" aria-pressed="${Number(p.freeDay) === v}">${l}</button>`).join("")}</div>
        <p class="xs muted" style="margin:6px 0 0">Rest helps your memory. Each session is ${p.sessionLen} minutes with a break after.</p>
      </div>`;
  }

  /* ======================================================================
     MY PLAN
     ====================================================================== */
  function pagePlan() {
    const s = st();
    if (!s.plan) {
      return `<div class="page-head"><h1>My plan</h1></div>
        <section class="panel empty"><p class="big-emoji" aria-hidden="true">🗓️</p><h3>You don't have a plan yet</h3><p>It takes about 5 minutes.</p><a class="btn big" href="#start/1">Make my plan</a></section>`;
    }
    const plan = s.plan;
    const today = D.today();
    const thisWeek = D.addDays(today, -D.dow(today));
    const dates = new Set(plan.sessions.map(x => x.date));
    CFG.EXAMS.forEach(e => dates.add(e.date));
    (s.tutorials || []).forEach(t => dates.add(t.date));

    const weeks = {};
    Array.from(dates).sort().forEach(d => { const w = D.addDays(d, -D.dow(d)); (weeks[w] = weeks[w] || []).push(d); });
    const weekKeys = Object.keys(weeks).sort();
    const past = weekKeys.filter(w => w < thisWeek);
    const current = weekKeys.filter(w => w >= thisWeek);

    const dayHTML = d => {
      const exams = CFG.EXAMS.filter(e => e.date === d);
      const tuts = (s.tutorials || []).filter(t => t.date === d);
      const ses = plan.sessions.filter(x => x.date === d);
      return `<div class="day ${d === today ? "today" : ""}">
        <div class="day-label"><b>${D.days[D.dow(d)]}</b><span>${D.pretty(d, false)}${d === today ? ", today" : ""}</span></div>
        <div class="sessions">
          ${exams.map(e => `<div class="exam-pill" style="${colorVars(e.id)}">⭐ ${esc(S.className(e.id))} exam (${S.examMinutes()} min)</div>`).join("")}
          ${tuts.map(tutorialPill).join("")}
          ${ses.map(sessionCard).join("")}
        </div>
      </div>`;
    };
    const weekHTML = (w, open) => {
      const n = weeks[w].reduce((c, d) => c + plan.sessions.filter(x => x.date === d).length, 0);
      const done = weeks[w].reduce((c, d) => c + plan.sessions.filter(x => x.date === d && x.done).length, 0);
      const label = w === thisWeek ? "This week" : w === D.addDays(thisWeek, 7) ? "Next week" : `Week of ${D.pretty(w, false)}`;
      return `<details class="week" ${open ? "open" : ""}>
        <summary><h2 class="h3">${label}</h2><span class="small muted">${done} of ${n} done</span></summary>
        ${weeks[w].map(dayHTML).join("")}
      </details>`;
    };

    return `
      <div class="page-head"><h1>My plan</h1><p>Check off each session when you finish it.</p></div>
      ${planTools(false)}
      ${s.planStale ? `<div class="warn">You changed some things. Tap <b>Update my plan</b> to catch up. Finished sessions stay checked off.</div>` : ""}
      ${catchUpBanner()}
      ${calendarStale() ? `<div class="warn">Your Google Calendar has an old version. <button class="linkish" data-act="exp-gcal">Update it</button></div>` : ""}
      ${plan.warnings.map(w => `<div class="warn">${esc(w)}</div>`).join("")}
      ${past.length ? `<p class="no-print"><button class="linkish small" data-act="toggle-past">${ui.showPast ? "Hide" : "Show"} past weeks</button></p>${ui.showPast ? past.map(w => weekHTML(w, false)).join("") : ""}` : ""}
      ${current.map((w, i) => weekHTML(w, i === 0)).join("")}
      <p class="small muted no-print" style="margin-top:30px">Want to start over? <button class="linkish" data-act="start-over">Start over</button></p>`;
  }

  // The three things students look for most, always visible and clearly named.
  function planTools(compact) {
    const missed = missedSessions().length;
    return `<section class="plan-tools no-print ${compact ? "compact" : ""}" aria-label="Plan tools">
      <button class="tool" data-act="exp-print"><span class="e" aria-hidden="true">🖨️</span><b>Print my plan</b><span>The whole schedule, as a checklist</span></button>
      <button class="tool" data-act="add-calendar"><span class="e" aria-hidden="true">📅</span><b>Add to my calendar</b><span>${st().drive.calendarSyncedAt ? (calendarStale() ? "Your calendar needs an update" : "Update it anytime") : "Google or Apple Calendar"}</span></button>
      <button class="tool ${missed ? "alert" : ""}" data-act="make-up"><span class="e" aria-hidden="true">🔁</span><b>Make up missed sessions${missed ? ` (${missed})` : ""}</b><span>${missed ? "Move them to new times" : "No missed sessions right now"}</span></button>
    </section>
    ${compact ? "" : `<p class="small no-print tools-more"><button class="linkish" data-act="build">Update my plan</button> after changing your classes or week. <button class="linkish" data-act="save-menu">More ways to save or share</button></p>`}`;
  }

  // Add to calendar: direct Google Calendar sync when sign-in is on; otherwise a calendar file with clear steps.
  function addCalendar() {
    if (window.Drive.enabled()) { syncGoogleCalendar(); return; }
    openModal(`<div class="modal-body">
      <h3>📅 Add your plan to your calendar</h3>
      <ol class="steps-list">
        <li><b>Download your calendar file.</b><br><button class="btn small" data-act="exp-ics" style="margin-top:6px">Download calendar file</button></li>
        <li><b>Google Calendar:</b> on a computer, open the import page, choose the file you just downloaded, pick a calendar, and click Import.<br>
          <a class="btn small ghost" style="margin-top:6px" href="https://calendar.google.com/calendar/r/settings/export" target="_blank" rel="noopener">Open Google Calendar import</a></li>
        <li><b>Apple Calendar or Outlook:</b> just open the downloaded file.</li>
      </ol>
      <p class="xs muted">Google Calendar doesn't keep reminders from imported files. To get reminders, turn on default notifications in Google Calendar's settings. If your plan changes, download a new file and import it again.</p>
    </div><div class="modal-foot"><button class="btn" data-act="modal-close">Done</button></div>`);
  }

  // Make up missed sessions: reschedule them, or explain how to move one ahead of time.
  function makeUp() {
    if (missedSessions().length) { catchUp(); return; }
    openModal(`<div class="modal-body"><h3>You're all caught up 👍</h3>
      <p>You don't have any missed sessions.</p>
      <p><b>Can't do a session?</b> Tap <b>Move it</b> on that session and it moves to your next open time. Your finished sessions always stay checked off.</p></div>
      <div class="modal-foot"><button class="btn" data-act="modal-close">OK</button></div>`);
  }

  // Move one session: ask "later that day" or "another day", then block that time and rebuild.
  function moveMenu(id) {
    const x = st().plan.sessions.find(y => y.id === id);
    if (!x) return;
    const late = x.date < D.today();
    if (late) { moveSession(id, "day"); return; }
    const isToday = x.date === D.today();
    openModal(`<div class="modal-body"><h3>Move this session</h3>
      <p><b>${esc(x.title)}</b><br><span class="small">${esc(x.topicText)}</span></p>
      <div class="save-options one-col">
        <button class="dl" data-act="move-go" data-id="${x.id}" data-how="slot"><span class="e" aria-hidden="true">⏰</span><b>Later ${isToday ? "today" : "that day"}</b><span>Move it to the next open time.</span></button>
        <button class="dl" data-act="move-go" data-id="${x.id}" data-how="day"><span class="e" aria-hidden="true">📆</span><b>Another day</b><span>${isToday ? "Today's not going to work. Move it to another day." : "Move it to a different day."}</span></button>
      </div></div>
      <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Cancel</button></div>`);
  }

  function moveSession(id, how) {
    const s = st();
    const x = s.plan.sessions.find(y => y.id === id);
    if (!x) return;
    s.skips = (s.skips || []).filter(k => k.date >= D.addDays(D.today(), -14));
    // "slot": block just this time. "day": block from this time to the end of that day.
    s.skips.push({ date: x.date, start: x.start, end: how === "day" ? "23:59" : x.end });
    rebuildQuiet();
    const moved = st().plan.sessions.find(y => !y.done && y.classId === x.classId && y.topicId === x.topicId && y.kind === x.kind);
    closeModal();
    render();
    toast(moved ? `Moved to ${D.pretty(moved.date)} at ${D.clock(moved.start)}` : "Moved. Check My plan for the new time.");
  }

  function calendarStale() {
    const s = st();
    const synced = s.drive.calendarSyncedAt || 0;
    if (!synced || !s.plan) return false;
    return synced < Math.max(s.plan.generatedAt || 0, s.tutorialsUpdatedAt || 0);
  }

  function saveMenu() {
    const on = window.Drive.enabled();
    const signedIn = !!window.Drive.user;
    openModal(`
      <div class="modal-body">
        <h3>Save or share my plan</h3>
        <div class="save-options">
          ${on ? `<button class="dl featured" data-act="exp-gcal"><span class="e" aria-hidden="true">🔔</span><b>${st().drive.calendarSyncedAt ? "Update" : "Add to"} Google Calendar</b><span>Get a reminder before every session.</span></button>` : ""}
          <button class="dl" data-act="exp-print"><span class="e" aria-hidden="true">🖨️</span><b>Print it</b><span>Or save it as a PDF.</span></button>
          <button class="dl" data-act="share"><span class="e" aria-hidden="true">📤</span><b>Share with a parent or advisor</b><span>So they know when you're studying.</span></button>
        </div>
        <details class="more">
          <summary class="small">More ways to save</summary>
          <div class="save-options small-options">
            <button class="dl" data-act="exp-gdoc" ${signedIn ? "" : "disabled"}><b>Google Doc</b><span>${signedIn ? "Saved in your Drive" : "Sign in first"}</span></button>
            <button class="dl" data-act="exp-gsheet" ${signedIn ? "" : "disabled"}><b>Google Sheet</b><span>${signedIn ? "Saved in your Drive" : "Sign in first"}</span></button>
            <button class="dl" data-act="exp-word"><b>Word file</b><span>Download</span></button>
            <button class="dl" data-act="exp-ics"><b>Calendar file</b><span>For Apple Calendar or Outlook</span></button>
            <button class="dl" data-act="exp-csv"><b>Spreadsheet</b><span>For Excel or Numbers</span></button>
          </div>
        </details>
      </div>
      <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button></div>`);
  }

  function startOverMenu() {
    const hasAnything = !!st().plan || Object.values(st().classes).some(c => c.grade || c.topics.length) || st().busy.length;
    openModal(`
      <div class="modal-body">
        <h3>Start over</h3>
        <div class="save-options one-col">
          <button class="dl" data-act="redo-setup"><span class="e" aria-hidden="true">✏️</span><b>Redo setup</b><span>Go through the 5 setup questions again. Your answers so far stay filled in, and you can change them.</span></button>
          <button class="dl danger" data-act="erase-ask" ${hasAnything ? "" : "disabled"}><span class="e" aria-hidden="true">🗑️</span><b>Erase everything</b><span>Clear all classes, study guides, busy times, tutorials, MindPrint, and your plan. Start completely fresh.</span></button>
        </div>
      </div>
      <p class="xs muted" style="padding:0 24px">Teachers: <a href="${location.pathname}?demo" target="_blank" rel="noopener">open a demo student</a> to show the site in advisory.</p>
      <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Cancel</button></div>`);
  }

  function eraseConfirm() {
    const signedIn = !!window.Drive.user;
    const onCal = !!st().drive.calendarSyncedAt;
    openModal(`
      <div class="modal-body">
        <h3>Erase everything?</h3>
        <p>This clears all your classes, study guides, busy times, tutorials, MindPrint, and your plan${signedIn ? ", on this device and in your Google Drive" : " on this device"}. <b>This can't be undone.</b></p>
        ${onCal ? `<p class="small muted">Your Google Calendar events stay until you make a new plan and tap "Add to Google Calendar" again, which replaces them.</p>` : ""}
      </div>
      <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Keep my stuff</button><button class="btn danger-btn" data-act="erase-all">Yes, erase everything</button></div>`);
  }

  function eraseAll() {
    S.reset();
    Object.assign(ui, { openClass: null, openProj: null, showPast: false, flipped: {}, examChecks: {}, mpEdit: false, mpAll: false, busyOpen: false, busyLabel: "", busyType: "weekly" });
    closeModal();
    location.hash = "#today";
    render();
    toast("Everything's cleared. Tap “Make my plan” to start fresh.");
  }

  function shareModal() {
    const on = window.Drive.enabled(), signedIn = !!window.Drive.user;
    if (!on) {
      openModal(`<div class="modal-body"><h3>Share my plan</h3>
        <p>Print your plan or download it as a Word file, then give it to a parent or email it to your advisor.</p>
        <div class="btn-row"><button class="btn" data-act="exp-print">🖨️ Print it</button><button class="btn ghost" data-act="exp-word">📄 Word file</button></div></div>
        <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button></div>`);
      return;
    }
    openModal(`<form method="dialog"><div class="modal-body"><h3>Share my plan</h3>
      <p>We'll make a Google Doc of your plan and share it with them. They can see it but not change it.</p>
      ${signedIn ? "" : `<p class="small muted">You'll be asked to sign in with Google first.</p>`}
      <label for="share-email">Their email address</label>
      <input id="share-email" type="email" required autocomplete="email" placeholder="parent@example.com">
      <p class="xs muted" style="margin-top:6px">Your school may only allow sharing with school email addresses. If it doesn't work, print it instead.</p></div>
      <div class="modal-foot"><button class="btn ghost" type="button" data-act="modal-close">Cancel</button><button class="btn" type="submit">Share</button></div></form>`);
    $("#modal form").addEventListener("submit", async ev => {
      ev.preventDefault();
      const email = $("#share-email").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("Check the email address."); return; }
      try {
        if (!window.Drive.user) await signIn(false);
        if (!window.Drive.user) return;
        toast("Sharing...");
        const doc = await window.Exports.googleDoc();
        await window.Drive.shareWith(doc.id, email);
        openModal(`<div class="modal-body"><h3>Shared 📤</h3><p>${esc(email)} will get an email with a link to your plan. If you update your plan later, share it again so they see the newest version.</p></div>
          <div class="modal-foot"><button class="btn" data-act="modal-close">OK</button></div>`);
      } catch (err) {
        toast(/domain|permission|forbidden|not allowed/i.test(err.message) ? "Your school doesn't allow sharing with that address. Try printing it instead." : `Couldn't share: ${err.message}`);
      }
    });
  }

  function buildPlan() {
    const s = st();
    s.plan = window.Planner.generate(s);
    s.planStale = false;
    save();
    toast(s.drive.calendarSyncedAt ? "Plan updated. Update Google Calendar to match." : "Your plan is updated.");
  }

  /* ======================================================================
     MY CLASSES
     ====================================================================== */
  function pageClasses() {
    const s = st();
    return `
      <div class="page-head"><h1>My classes</h1><p>Add your study guide topics so your plan knows exactly what to study. Tap a class to open it.</p></div>
      <div class="stack">${CFG.EXAMS.map(e => classCard(e)).join("")}</div>
      ${s.plan && s.planStale ? `<div class="btn-row" style="margin-top:20px"><button class="btn big" data-act="build">Update my plan</button></div>` : ""}`;
  }

  function classCard(e) {
    const c = st().classes[e.id];
    const name = S.className(e.id);
    const open = ui.openClass === e.id;
    const feel = C.confidence.find(x => x.v === Number(c.confidence));
    const status = c.topics.length ? `${c.topics.length} topic${c.topics.length === 1 ? "" : "s"}` : "No study guide yet";

    const body = !open ? "" : `
      <div class="class-body">
        <div>
          <div class="field">${gradePicker(e.id, c.grade, "My letter grade", false)}</div>
          <div class="field"><label id="cl-${e.id}">How I feel about this class</label><div class="conf" role="group" aria-labelledby="cl-${e.id}">${confButtons("class-conf", c.confidence, `data-class="${e.id}"`)}</div></div>
          <label class="drop" data-drop="${e.id}">
            <input type="file" accept=".pdf,.docx,.txt,image/*" multiple data-upload="${e.id}">
            📤 Upload study guide<br><span class="xs muted">PDF, Word, or photo</span>
          </label>
          ${c.guides.length ? `<ul class="guide-files">${c.guides.map((g, i) => `<li>📄 ${g.link ? `<a href="${esc(g.link)}" target="_blank" rel="noopener">${esc(g.name)}</a>` : esc(g.name)} <button class="icon-btn" data-act="guide-del" data-class="${e.id}" data-i="${i}" aria-label="Remove ${esc(g.name)}">✕</button></li>`).join("")}</ul>` : ""}
          <button class="linkish small" style="margin-top:8px" data-act="paste" data-class="${e.id}">Or paste the text</button>
          ${projection(e)}
        </div>
        <div>
          <h2 class="h4">Study guide topics</h2>
          ${c.topics.length ? `<p class="xs muted" style="margin:-4px 0 6px">Tap a face for each one. Shaky topics get more practice.</p><ul class="topics">${c.topics.map(t => `
            <li class="topic">
              <span class="topic-name"><input type="text" value="${esc(t.text)}" data-topic="${e.id}|${t.id}" aria-label="Topic name">${(t.details || []).length ? `<span class="topic-details">${esc(t.details.join(", "))}</span>` : ""}${(t.resources || []).length ? `<span class="topic-details"><b>Use:</b> ${esc(t.resources.join("; "))}</span>` : ""}</span>
              <div class="conf" role="group" aria-label="How you feel about ${esc(t.text)}">${confButtons("topic-conf", t.conf, `data-class="${e.id}" data-id="${t.id}"`)}</div>
              <button class="icon-btn" data-act="topic-del" data-class="${e.id}" data-id="${t.id}" aria-label="Delete ${esc(t.text)}">🗑️</button>
            </li>`).join("")}</ul>` : `<p class="small muted">Upload your study guide and we'll find the topics. Or type them below.</p>`}
          <form class="btn-row" style="margin-top:10px" data-addtopic="${e.id}">
            <label class="sr-only" for="add-${e.id}">Add a topic</label>
            <input id="add-${e.id}" type="text" placeholder="Add a topic" style="flex:1;min-width:160px">
            <button class="btn small" type="submit">Add</button>
          </form>
          <label for="q-${e.id}" style="margin-top:16px">Questions for my teacher <span class="muted">(bring these to tutorials)</span></label>
          <textarea id="q-${e.id}" data-bind="classes.${e.id}.questions" placeholder="${esc(QUESTION_EXAMPLES[e.id] || "")}">${esc(c.questions)}</textarea>
        </div>
      </div>`;

    return `<section class="class-card ${open ? "open" : ""}" style="${colorVars(e.id)}">
      <button class="class-head" data-act="class-toggle" data-class="${e.id}" aria-expanded="${open}">
        <span class="icon" aria-hidden="true">${e.icon}</span>
        <span class="ch-text"><b>${esc(name)}</b><span class="xs">Exam ${D.pretty(e.date)}</span></span>
        <span class="ch-meta">${c.grade ? `<span class="pill">${esc(c.grade)}</span>` : ""}<span aria-label="${feel ? feel.label : ""}">${feel ? feel.emoji : ""}</span><span class="xs ${c.topics.length ? "" : "muted"}">${status}</span></span>
        <span class="chev" aria-hidden="true">${open ? "▲" : "▼"}</span>
      </button>
      ${body}
    </section>`;
  }

  const QUESTION_EXAMPLES = {
    english: "Like: How do I pick strong evidence for a theme paragraph?",
    science: "Like: What's the difference between mitosis and meiosis?",
    social: "Like: How do I explain causes in a short answer?",
    math: "Like: When do I flip the inequality sign?",
    lang: "Like: When do I use one verb tense instead of another?"
  };

  /* ======================================================================
     MY WEEK
     ====================================================================== */
  function pageWeek() {
    const s = st();
    const p = s.prefs;
    const today = D.today();
    const lastExam = CFG.EXAMS.map(e => e.date).sort().slice(-1)[0];
    const tuts = (s.tutorials || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const tutTime = `${D.clock(CFG.TUTORIAL_START)} to ${D.clock(CFG.TUTORIAL_END)}`;

    return `
      <div class="page-head"><h1>My week</h1><p>Tell your plan what's going on, and it works around it.</p></div>

      <section class="panel" aria-labelledby="tut-h">
        <div class="panel-title"><h2 class="h3" id="tut-h">🙋 Tutorials <span class="small muted" style="font-weight:500">${tutTime}</span></h2></div>
        <form class="tut-form" data-tutform>
          <div class="field"><label for="t-class">Which class?</label>
            <select id="t-class">${CFG.EXAMS.map(e => `<option value="${e.id}" ${ui.tutClass === e.id ? "selected" : ""}>${esc(S.className(e.id))}</option>`).join("")}</select></div>
          <div class="field"><label for="t-date">Which day?</label><input id="t-date" type="date" min="${today}" max="${lastExam}" required></div>
          <button class="btn" type="submit">Add tutorial</button>
        </form>
        ${tuts.length ? `<ul class="busy-list">${tuts.map(t => `
          <li class="busy-item tut-item ${t.done ? "done" : ""}" style="${colorVars(t.classId)}">
            <button class="check" data-act="tut-done" data-id="${t.id}" aria-pressed="${!!t.done}" aria-label="I went to the ${esc(S.className(t.classId))} tutorial">${t.done ? "✓" : ""}</button>
            <span class="grow"><b>${esc(S.className(t.classId))}</b><br><span class="when">${D.pretty(t.date)}${t.done ? ", went ✓" : ""}</span></span>
            <button class="icon-btn" data-act="tut-del" data-id="${t.id}" aria-label="Remove">🗑️</button>
          </li>`).join("")}</ul>` : `<p class="small muted" style="margin-top:10px">Start with the class you feel shakiest about. <a href="#tips/tutorials">How to get the most from tutorials</a></p>`}
      </section>

      <section class="panel" style="margin-top:20px" aria-labelledby="busy-h">
        <div class="panel-title"><h2 class="h3" id="busy-h">📅 Busy times</h2></div>
        <p class="small muted">Practices, rehearsals, lessons, family plans.</p>
        ${busyEditor()}
      </section>

      <section class="panel" style="margin-top:20px" aria-labelledby="study-h">
        <div class="panel-title"><h2 class="h3" id="study-h">📚 When I study</h2></div>
        ${studyTimeChoices()}
        <details class="more">
          <summary class="small">More options</summary>
          <div class="fields" style="margin-top:12px">
            <div class="field"><label for="wd-s">School days from</label><input id="wd-s" type="time" data-bind="prefs.weekdayStart" data-plan="1" data-rerender="1" value="${p.weekdayStart}"></div>
            <div class="field"><label for="wd-e">until</label><input id="wd-e" type="time" data-bind="prefs.weekdayEnd" data-plan="1" data-rerender="1" value="${p.weekdayEnd}"></div>
            <div class="field"><label for="we-s">Weekends from</label><input id="we-s" type="time" data-bind="prefs.weekendStart" data-plan="1" data-rerender="1" value="${p.weekendStart}"></div>
            <div class="field"><label for="we-e">until</label><input id="we-e" type="time" data-bind="prefs.weekendEnd" data-plan="1" data-rerender="1" value="${p.weekendEnd}"></div>
          </div>
          <div class="field"><label>Session length</label><div class="seg">${[20, 25, 30, 45].map(v => `<button type="button" data-act="set" data-path="prefs.sessionLen" data-num="1" data-plan="1" data-v="${v}" aria-pressed="${Number(p.sessionLen) === v}">${v} min</button>`).join("")}</div></div>
          <div class="field"><label>Most sessions on a school day</label><div class="seg">${[1, 2, 3].map(v => `<button type="button" data-act="set" data-path="prefs.maxWeekday" data-num="1" data-plan="1" data-v="${v}" aria-pressed="${Number(p.maxWeekday) === v}">${v}</button>`).join("")}</div></div>
          <div class="field"><label>Days off (no studying)</label>
            <form class="btn-row" data-offform><label class="sr-only" for="off-date">Day off</label><input id="off-date" type="date" style="max-width:200px" required><button class="btn small" type="submit">Add</button></form>
            <div class="chips" style="margin-top:8px">${(p.offDates || []).sort().map(d => `<button class="chip" data-act="off-del" data-d="${d}" aria-label="Remove ${D.pretty(d)}">${D.pretty(d)} ✕</button>`).join("")}</div>
          </div>
        </details>
      </section>

      ${s.plan ? `<div class="btn-row" style="margin-top:20px"><button class="btn big" data-act="build">Update my plan</button></div>` : `<div class="btn-row" style="margin-top:20px"><a class="btn big" href="#start/1">Make my plan</a></div>`}`;
  }

  /* ======================================================================
     TIPS
     ====================================================================== */
  function pageTips(id) {
    if (!id) {
      return `
        <div class="page-head"><h1>Tips</h1><p>Short and useful. Pick one.</p></div>
        <div class="tip-grid">${C.tips.map(t => `<a class="tip-card" href="#tips/${t.id}"><span class="e" aria-hidden="true">${t.emoji}</span><b>${esc(t.title)}</b><span>${esc(t.blurb)}</span></a>`).join("")}</div>`;
    }
    const t = C.tips.find(x => x.id === id);
    if (!t) return pageTips();
    const back = `<a class="back" href="#tips">← All tips</a>`;
    const head = `<div class="page-head">${back}<h1><span aria-hidden="true">${t.emoji}</span> ${esc(t.title)}</h1></div>`;

    if (id === "tutorials") return head + tipsTutorials();
    if (id === "time") return head + tipsTime();
    if (id === "mindprint") return head + tipsMindprint();
    if (id === "myths") return head + `<p class="muted">Guess, then tap to flip.</p><div class="myths">${C.myths.map((m, i) => `
      <button class="flip" data-act="flip" data-i="${i}" aria-pressed="${!!ui.flipped[i]}">
        <span class="flip-inner">
          <span class="face front"><span style="font-weight:700;font-size:1.05rem">${esc(m.claim)}</span><small>Tap to flip</small></span>
          <span class="face back"><span class="verdict ${m.answer.toLowerCase()}">${m.answer}</span><span class="small">${esc(m.why)}</span></span>
        </span>
      </button>`).join("")}</div>`;
    if (t.checklist) return head + `<section class="panel"><ul class="checklist">${t.checklist.map((c, i) => `<li><label><input type="checkbox" data-examcheck="${i}" ${ui.examChecks[i] ? "checked" : ""}> ${esc(c)}</label></li>`).join("")}</ul></section>`;
    return head + `<p class="muted">${esc(t.blurb)}</p><div class="tip-list">${t.cards.map(c => `
      <section class="tip-item"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p><div class="try"><b>Try it:</b> ${esc(c.try)}</div></section>`).join("")}</div>`;
  }

  function tipsTutorials() {
    const T = C.tutorials;
    const s = st();
    const topics = CFG.EXAMS.map(e => ({ e, list: askTopics(e.id).slice(0, 3) })).filter(x => x.list.length);
    return `
      <p class="lead">${esc(T.intro)} They're ${D.clock(CFG.TUTORIAL_START)} to ${D.clock(CFG.TUTORIAL_END)}</p>
      <div class="phases">${T.phases.map(ph => `<section class="panel phase"><h2 class="h3"><span aria-hidden="true">${ph.emoji}</span> ${esc(ph.title)}</h2><ul>${ph.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></section>`).join("")}</div>
      <div class="grid two" style="margin-top:20px;align-items:start">
        <section class="panel"><h3>Topics to ask about</h3>
          ${topics.length ? topics.map(x => `<div class="ask" style="${colorVars(x.e.id)}"><b>${esc(S.className(x.e.id))}</b><ul>${x.list.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")
            : `<p class="small muted">These come from the topics you rate on <a href="#classes">My classes</a>. Your shakiest ones show up here.</p>`}
          <a class="btn small" href="#week" style="margin-top:10px">Plan a tutorial</a>
        </section>
        <section class="panel"><h3>Questions that work</h3>
          <ul class="starters">${T.starters.map(q => `<li>"${esc(q)}"</li>`).join("")}</ul>
          <h4 style="margin-top:16px">Need to email your teacher?</h4>
          <div class="try small email">${esc(T.email)}</div>
          <button class="btn small ghost" style="margin-top:8px" data-act="copy-email">Copy this email</button>
        </section>
      </div>`;
  }

  function tipsTime() {
    const s = st();
    const a = s.accom;
    const base = CFG.EXAM_MINUTES;
    const total = S.examMinutes();
    const preview = Math.round(total * 0.07), check = Math.round(total * 0.15), answer = total - preview - check;
    const half = preview + Math.round(answer / 2);
    const E = C.extended;
    const opts = [["none", "No"], ["1.5", "Time and a half"], ["2", "Double time"], ["custom", "Something else"]];
    return `
      <section class="panel">
        <div class="field"><label>Do you get extended time on tests?</label>
          <div class="seg">${opts.map(([v, l]) => `<button type="button" data-act="set" data-path="accom.extended" data-plan="1" data-v="${v}" aria-pressed="${a.extended === v}">${l}</button>`).join("")}</div></div>
        ${a.extended === "custom" ? `<div class="field"><label for="cm">Minutes per exam</label><input id="cm" type="number" min="${base}" max="300" data-bind="accom.customMinutes" data-plan="1" data-rerender="1" value="${esc(a.customMinutes)}" style="max-width:140px"></div>` : ""}
        <p class="xs muted">Not sure? Ask your advisor.</p>
        <div class="bignum">${total} minutes</div>
        <h2 class="h4" style="margin-top:14px">Your pacing plan</h2>
        <div class="pace" role="img" aria-label="Look over ${preview} minutes, answer ${answer} minutes, check ${check} minutes">
          <div class="p1" style="flex:${preview}">${preview}m</div><div class="p2" style="flex:${answer}">Answer: ${answer} min</div><div class="p3" style="flex:${check}">Check ${check}m</div>
        </div>
        <div class="pace-label"><span>Look it over</span><span>Minute ${half}: about halfway</span><span>Check your work</span></div>
      </section>
      <div class="grid two" style="margin-top:20px">
        <section class="panel"><h3>Why it matters</h3>${E.why.map(w => `<p><b>${esc(w.title)}.</b> ${esc(w.body)}</p>`).join("")}</section>
        <section class="panel"><h3>Slow down on purpose</h3><ul>${E.slowDown.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>
      </div>`;
  }

  /* ---------- MindPrint ---------- */
  function tipsMindprint() {
    const s = st();
    const set = S.mpIsSet();
    const upload = `
      <label class="drop big-drop" data-mpdrop>
        <input type="file" accept=".pdf,.docx,.txt,image/*" data-mpupload>
        📤 Upload my MindPrint report<br><span class="xs muted">The PDF from MindPrint. We'll read it and you check it.</span>
      </label>
      ${s.mindprintReport ? `<p class="small" style="margin:8px 0 0">📄 ${s.mindprintReport.link ? `<a href="${esc(s.mindprintReport.link)}" target="_blank" rel="noopener">${esc(s.mindprintReport.name)}</a>` : esc(s.mindprintReport.name)}</p>` : ""}`;

    if (!set && !ui.mpEdit) {
      return `
        <p class="lead">MindPrint shows how your brain learns best. Add yours and your study sessions will play to your strengths.</p>
        <section class="panel">${upload}
          <p class="small" style="margin:12px 0 0">No PDF? <button class="linkish" data-act="mp-edit">Enter it yourself</button>. Don't have a report at all? Ask your advisor.</p>
        </section>`;
    }
    return `
      ${set ? `<section class="panel playbook">${playbookHTML()}</section>` : ""}
      <p style="margin-top:16px">${ui.mpEdit ? "" : `<button class="linkish" data-act="mp-edit">Change my MindPrint</button>`}</p>
      ${ui.mpEdit ? mpEditor(upload) : ""}`;
  }

  function mpEditor(upload) {
    const MP = C.mindprint;
    const m = st().mindprint;
    return `
      <section class="panel" style="margin-top:12px">
        <h3>My MindPrint profile</h3>
        ${upload}
        <p class="small muted" style="margin-top:14px">Or match your report by hand: use ▲ ▼ so each box lists your skills in the same order as your report (strongest first). Then tap the box that's highlighted on your report.</p>
        <div class="mp-boxes">${MP.domains.map(d => {
          const order = m.order[d.id] || d.skills;
          const isSet = !!m.order[d.id];
          const strongest = m.strongest === d.id;
          return `<div class="mp-box ${strongest ? "strongest" : ""} ${isSet ? "" : "unset"}">
            <div class="mp-box-head"><h4>${esc(d.name)}</h4></div>
            <ol class="mp-rank">${order.map((id, i) => `<li class="${i === 0 && isSet ? "first" : ""}">
              <span class="mp-name">${esc(MP.skills[id].name)}</span>
              <span class="mp-move">
                <button class="icon-btn" data-act="mp-move" data-cat="${d.id}" data-skill="${id}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(MP.skills[id].name)} up">▲</button>
                <button class="icon-btn" data-act="mp-move" data-cat="${d.id}" data-skill="${id}" data-dir="1" ${i === order.length - 1 ? "disabled" : ""} aria-label="Move ${esc(MP.skills[id].name)} down">▼</button>
              </span></li>`).join("")}</ol>
            ${isSet ? "" : `<button class="btn small" data-act="mp-confirm" data-cat="${d.id}">Matches my report</button>`}
            <button class="mp-star" data-act="mp-strongest" data-cat="${d.id}" aria-pressed="${strongest}">${strongest ? "★ Highlighted on my report" : "☆ Highlighted on my report?"}</button>
          </div>`;
        }).join("")}</div>
        <div class="btn-row" style="margin-top:14px"><button class="btn" data-act="mp-done">Done</button>
        ${S.mpIsSet() ? `<button class="linkish small" data-act="mp-clear">Clear my MindPrint</button>` : ""}</div>
      </section>`;
  }

  function playbookHTML() {
    const MP = C.mindprint;
    const m = st().mindprint;
    const doms = MP.domains.filter(d => m.order[d.id]);
    const strongestDom = MP.domains.find(d => d.id === m.strongest && m.order[d.id]);
    const superSkill = strongestDom ? MP.skills[m.order[strongestDom.id][0]] : null;

    const known = (m.strategies || []).map(name => {
      const def = MP.strategies.find(x => x.name.toLowerCase() === name.toLowerCase());
      return def && def.when === "test" ? def : null;
    }).filter(Boolean);
    const shown = ui.mpAll ? known : known.slice(0, 3);

    return `
      ${superSkill ? `<div class="superpower"><span class="sp-emoji" aria-hidden="true">${superSkill.icon}</span><div><b>Your superpower: ${esc(superSkill.name)}</b><span class="small">When you're stuck, start here.</span></div></div>` : ""}
      <div class="pb-cols">
        <div><h2 class="pb-sub h3">Lean on these</h2><ul class="pb-simple">${doms.map(d => {
          const sk = MP.skills[m.order[d.id][0]];
          return `<li><b>${esc(sk.name)}:</b> ${esc(sk.strength[0])}</li>`;
        }).join("")}</ul></div>
        <div><h2 class="pb-sub h3">Work around these</h2><ul class="pb-simple">${doms.map(d => {
          const list = m.order[d.id];
          const sk = MP.skills[list[list.length - 1]];
          return `<li><b>${esc(sk.name)}:</b> ${esc(sk.support[0])}</li>`;
        }).join("")}</ul></div>
      </div>
      ${known.length ? `<h2 class="pb-sub h3">From your report, for exam day</h2>
        <ul class="strat-list">${shown.map(k => `<li><b>${esc(k.name)}</b><span>${esc(k.use)}</span></li>`).join("")}</ul>
        ${known.length > 3 ? `<button class="linkish small" data-act="mp-all">${ui.mpAll ? "Show less" : `Show all ${known.length}`}</button>` : ""}` : ""}
      <p class="small muted" style="margin-top:12px">Your study sessions already include these ideas.</p>`;
  }

  /* ======================================================================
     UPLOADS
     ====================================================================== */
  async function handleFiles(classId, files) {
    const c = st().classes[classId];
    const name = S.className(classId);
    let found = [], unreadable = 0;
    for (const file of files) {
      toast(`Reading ${file.name}...`);
      const record = { name: file.name, link: "" };
      if (window.Drive.user) {
        try { const r = await window.Drive.uploadGuide(file, name); record.link = r.webViewLink || ""; }
        catch (err) { toast(`Couldn't save to Drive: ${err.message}`); }
      }
      c.guides.push(record);
      try {
        const r = await window.StudyGuide.readGuide(file);
        if (!r.readable) unreadable++; else found = found.concat(r.topics);
      } catch (err) { unreadable++; }
    }
    save({ planInputs: true });
    render();
    if (found.length) reviewTopics(classId, found);
    else if (unreadable) toast("Saved. We can't read photos, so type the topics in.");
    else toast("We couldn't find topics in that file. Type them in instead.");
  }

  function reviewTopics(classId, list) {
    // list items are { text, details } (older callers may pass plain strings)
    const items = list.map(x => typeof x === "string" ? { text: x, details: [] } : x);
    const existing = new Set(st().classes[classId].topics.map(t => t.text.toLowerCase()));
    const seen = new Set();
    const fresh = items.filter(t => { const k = t.text.toLowerCase(); if (existing.has(k) || seen.has(k)) return false; seen.add(k); return true; });
    if (!fresh.length) { toast("Those topics are already on your list."); return; }
    openModal(`
      <form method="dialog">
        <div class="modal-body">
          <h3>We found ${fresh.length} topic${fresh.length === 1 ? "" : "s"}</h3>
          <p class="muted">Uncheck anything that isn't really a topic. You can rename them after.</p>
          <ul class="pick-list">${fresh.map((t, i) => `<li><label><input type="checkbox" name="t" value="${i}" checked>
            <span><b>${esc(t.text)}</b>${t.details.length ? `<br><span class="small muted">${esc(t.details.join(", "))}</span>` : ""}${(t.resources || []).length ? `<br><span class="xs"><b>Use:</b> ${esc(t.resources.join("; "))}</span>` : ""}</span></label></li>`).join("")}</ul>
        </div>
        <div class="modal-foot"><button class="btn ghost" type="button" data-act="modal-close">Cancel</button><button class="btn" type="submit">Add them</button></div>
      </form>`);
    $("#modal form").addEventListener("submit", ev => {
      ev.preventDefault();
      const picks = $$("#modal input[name=t]:checked").map(i => fresh[Number(i.value)]);
      const c = st().classes[classId];
      picks.forEach(t => c.topics.push({ id: uid(), text: t.text, details: t.details || [], resources: t.resources || [], conf: Number(c.confidence) || 3 }));
      closeModal();
      save({ planInputs: true });
      render();
      toast(`Added ${picks.length}. Now tap a face for each one.`);
    });
  }

  function pasteModal(classId) {
    openModal(`
      <form method="dialog">
        <div class="modal-body">
          <h3>Paste your study guide</h3>
          <label for="paste-box" class="sr-only">Study guide text</label>
          <textarea id="paste-box" style="min-height:220px" placeholder="Paste the text here"></textarea>
        </div>
        <div class="modal-foot"><button class="btn ghost" type="button" data-act="modal-close">Cancel</button><button class="btn" type="submit">Find topics</button></div>
      </form>`);
    $("#modal form").addEventListener("submit", ev => {
      ev.preventDefault();
      const list = window.StudyGuide.readPasted($("#paste-box").value);
      closeModal();
      if (list.length) reviewTopics(classId, list); else toast("We couldn't find topics. Try adding them one at a time.");
    });
  }

  async function handleMindprint(file) {
    toast("Reading your report...");
    const rec = { name: file.name, link: "" };
    if (window.Drive.user) {
      try { const r = await window.Drive.uploadToSubfolder(file, "MindPrint", "mindprintFolderId", `MindPrint report - ${file.name}`); rec.link = r.webViewLink || ""; }
      catch (err) { toast(`Couldn't save to Drive: ${err.message}`); }
    }
    st().mindprintReport = rec;
    save();
    let found = null, readable = true;
    try {
      const text = await window.StudyGuide.extract(file);
      if (text == null) readable = false; else found = window.StudyGuide.readMindprint(text);
    } catch (e) { readable = false; }
    render();
    if (found && Object.keys(found.order || {}).length) reviewMindprint(found);
    else {
      ui.mpEdit = true;
      render();
      openModal(`<div class="modal-body"><h3>We saved your report</h3>
        <p>${readable ? "We couldn't read the skills from it." : "We can't read photos."} Open your report and use ▲ ▼ to put the skills in the same order. It takes about a minute.</p></div>
        <div class="modal-foot"><button class="btn" data-act="modal-close">OK</button></div>`);
    }
  }

  function reviewMindprint(found) {
    const MP = C.mindprint;
    const cats = MP.domains.filter(d => found.order[d.id]);
    openModal(`
      <form method="dialog">
        <div class="modal-body">
          <h3>Does this match your report?</h3>
          <div class="mp-boxes compact">${cats.map(d => `
            <div class="mp-box"><div class="mp-box-head"><h4>${esc(d.name)}</h4></div>
              <ol class="mp-rank">${found.order[d.id].map(id => `<li><span class="mp-name">${esc(MP.skills[id].name)}</span></li>`).join("")}</ol>
            </div>`).join("")}</div>
          <fieldset style="border:0;padding:0;margin:14px 0 0">
            <legend style="font-weight:700;margin-bottom:6px">Which box is highlighted on your report?</legend>
            <div class="seg">${MP.domains.map(d => `<label class="seg-radio"><input type="radio" name="strongest" value="${d.id}"><span>${esc(d.name)}</span></label>`).join("")}
              <label class="seg-radio"><input type="radio" name="strongest" value="" checked><span>Not sure</span></label></div>
          </fieldset>
        </div>
        <div class="modal-foot"><button class="btn ghost" type="button" data-act="mp-fix">No, let me fix it</button><button class="btn" type="submit">Yes, save it</button></div>
      </form>`);
    const apply = () => {
      const m = st().mindprint;
      Object.assign(m.order, found.order);
      Object.assign(m.top, found.top);
      if (found.strategies.length) m.strategies = found.strategies;
      const pick = $("#modal input[name=strongest]:checked");
      if (pick && pick.value) m.strongest = pick.value;
    };
    $("#modal form").addEventListener("submit", ev => {
      ev.preventDefault();
      apply();
      ui.mpEdit = false;
      closeModal();
      save({ planInputs: true });
      render();
      toast("MindPrint saved.");
    });
    $("#modal [data-act=mp-fix]").addEventListener("click", ev => {
      ev.stopPropagation();
      apply();
      ui.mpEdit = true;
      closeModal();
      save({ planInputs: true });
      render();
    });
  }

  /* ---------- Google Calendar ---------- */
  async function syncGoogleCalendar() {
    if (!st().plan) { toast("Make your plan first."); return; }
    try {
      if (!window.Drive.user) await signIn(true);
      else await window.Drive.connectCalendar();
      if (!window.Drive.user) return;
      if (!window.Drive.hasCalendar()) throw new Error("Calendar permission wasn't given. Try again and check the Google Calendar box.");
      closeModal();
      toast("Adding to Google Calendar...");
      const n = await window.Drive.syncCalendar(window.Exports.googleEvents(), (done, total) => {
        $("#toast").textContent = `Adding to Google Calendar: ${Math.round(100 * done / total)}%`;
      });
      st().drive.calendarSyncedAt = Date.now();
      save({ now: true });
      render();
      openModal(`<div class="modal-body"><h3>🔔 It's on your Google Calendar</h3>
        <p>${n} events are in a calendar called <b>Exam Prep HQ</b>. You'll get a reminder 10 minutes before each session.</p>
        <p class="small muted">If you update your plan, tap "Update Google Calendar" so it matches.</p></div>
        <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button><a class="btn" href="https://calendar.google.com" target="_blank" rel="noopener">Open Google Calendar</a></div>`);
    } catch (err) {
      toast(`Couldn't update Google Calendar: ${err.message}`);
    }
  }

  /* ======================================================================
     ROUTER + RENDER
     ====================================================================== */
  function route() {
    const [page, sub] = (location.hash || "#today").slice(1).split("/");
    const known = ["today", "plan", "classes", "week", "tips", "start"];
    return { page: known.includes(page) ? page : "today", sub };
  }

  let lastKey = null;
  function render() {
    const r = route();
    renderTabs(r.page === "start" ? "" : r.page);
    renderAccount();
    document.body.classList.toggle("in-setup", r.page === "start");
    const html = r.page === "today" ? pageToday() : r.page === "plan" ? pagePlan() : r.page === "classes" ? pageClasses()
      : r.page === "week" ? pageWeek() : r.page === "tips" ? pageTips(r.sub) : pageStart(r.sub);
    $("#main").innerHTML = demoBanner() + html;
    const tab = TABS.find(x => x.id === r.page);
    document.title = `${tab ? tab.label : "Make my plan"} | Exam Prep HQ`;
    bindDrops();
    const key = r.page + "/" + (r.sub || "");
    if (key !== lastKey) {
      if (lastKey !== null) { window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); }
      lastKey = key;
    }
  }

  function rerenderKeepFocus(el) {
    const key = el && el.dataset ? JSON.stringify(el.dataset) : null;
    render();
    if (!key) return;
    const match = $$("[data-act]").find(x => JSON.stringify(x.dataset) === key);
    if (match) match.focus({ preventScroll: true });
  }

  function setPath(path, value) {
    const parts = path.split(".");
    let o = st();
    parts.slice(0, -1).forEach(p => { o = o[p]; });
    o[parts[parts.length - 1]] = value;
  }

  function bindDrops() {
    const wire = (sel, fn) => $$(sel).forEach(z => {
      z.addEventListener("dragover", e => { e.preventDefault(); z.classList.add("over"); });
      z.addEventListener("dragleave", () => z.classList.remove("over"));
      z.addEventListener("drop", e => { e.preventDefault(); z.classList.remove("over"); if (e.dataTransfer.files.length) fn(z, Array.from(e.dataTransfer.files)); });
    });
    wire("[data-drop]", (z, files) => handleFiles(z.dataset.drop, files));
    wire("[data-mpdrop]", (z, files) => handleMindprint(files[0]));
  }

  /* ---------- Clicks ---------- */
  document.addEventListener("click", async e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const s = st();
    switch (el.dataset.act) {
      case "set":
        setPath(el.dataset.path, el.dataset.num ? Number(el.dataset.v) : el.dataset.v);
        save({ planInputs: !!el.dataset.plan });
        rerenderKeepFocus(el);
        break;
      case "study-time":
        s.prefs[`${el.dataset.which}Start`] = el.dataset.start;
        s.prefs[`${el.dataset.which}End`] = el.dataset.end;
        save({ planInputs: true });
        rerenderKeepFocus(el);
        break;
      case "class-conf": {
        const c = s.classes[el.dataset.class];
        const old = Number(c.confidence);
        c.confidence = Number(el.dataset.v);
        c.topics.forEach(t => { if (Number(t.conf) === old) t.conf = c.confidence; });
        save({ planInputs: true });
        rerenderKeepFocus(el);
        break;
      }
      case "topic-conf": {
        const t = s.classes[el.dataset.class].topics.find(x => x.id === el.dataset.id);
        if (t) t.conf = Number(el.dataset.v);
        save({ planInputs: true });
        rerenderKeepFocus(el);
        break;
      }
      case "topic-del":
        s.classes[el.dataset.class].topics = s.classes[el.dataset.class].topics.filter(x => x.id !== el.dataset.id);
        save({ planInputs: true }); render(); break;
      case "guide-del":
        s.classes[el.dataset.class].guides.splice(Number(el.dataset.i), 1);
        save(); render(); break;
      case "class-toggle":
        ui.openClass = ui.openClass === el.dataset.class ? null : el.dataset.class;
        rerenderKeepFocus(el); break;
      case "paste": pasteModal(el.dataset.class); break;
      case "modal-close": closeModal(); break;

      case "preset": ui.busyOpen = true; ui.busyLabel = el.dataset.label; ui.busyType = "weekly"; render(); { const i = $("#b-label"); if (i) i.focus(); } break;
      case "busy-cancel": ui.busyOpen = false; render(); break;
      case "busy-type": ui.busyLabel = ($("#b-label") || {}).value || ""; ui.busyType = el.dataset.v; rerenderKeepFocus(el); break;
      case "busy-del": s.busy = s.busy.filter(b => b.id !== el.dataset.id); save({ planInputs: true }); render(); break;
      case "off-del": s.prefs.offDates = s.prefs.offDates.filter(d => d !== el.dataset.d); save({ planInputs: true }); render(); break;

      case "tut-done": {
        const t = s.tutorials.find(x => x.id === el.dataset.id);
        if (t) { t.done = !t.done; if (t.done) toast("Nice. If a topic feels better now, tap a happier face on My classes."); }
        s.tutorialsUpdatedAt = Date.now(); save(); rerenderKeepFocus(el); break;
      }
      case "tut-del": s.tutorials = s.tutorials.filter(x => x.id !== el.dataset.id); s.tutorialsUpdatedAt = Date.now(); save({ planInputs: true }); render(); break;

      case "wiz-finish":
        s.plan = window.Planner.generate(s);
        s.planStale = false;
        s.onboarded = true;
        save();
        location.hash = "#start/done";
        confetti();
        break;
      case "build": buildPlan(); render(); break;
      case "toggle-session": {
        const x = s.plan.sessions.find(y => y.id === el.dataset.id);
        if (x) { x.done = !x.done; if (x.done) toast(["Nice work.", "Done. Another one down.", "That's how it's done.", "Keep it up."][Math.floor(Math.random() * 4)]); }
        save(); rerenderKeepFocus(el); break;
      }
      case "toggle-past": ui.showPast = !ui.showPast; render(); break;
      case "reset":
      case "start-over": startOverMenu(); break;
      case "redo-setup": closeModal(); location.hash = "#start/1"; break;
      case "erase-ask": eraseConfirm(); break;
      case "erase-all": eraseAll(); break;

      case "focus": openFocus(el.dataset.id); break;
      case "tour-done": s.tourDone = true; save(); render(); break;
      case "catch-up": catchUp(); break;
      case "overwhelmed": overwhelmedModal(); break;
      case "breathe": breathe(); break;
      case "breathe-stop": clearInterval(breatheTimer); closeModal(); break;
      case "extra-breaks":
        s.prefs.extraBreaks = !s.prefs.extraBreaks;
        if (s.plan) rebuildQuiet(); else save();
        toast(s.prefs.extraBreaks ? "Extra breaks are on. Same study time, more breathing room." : "Extra breaks are off.");
        overwhelmedModal();
        if ($("#focus").open) { const cur = focus.steps[focus.i]; if (cur && cur.type === "work" && focus.i === 0) { focus.steps = focusSteps(Number(s.prefs.sessionLen) || 30); startStep(); } }
        break;
      case "focus-from-calm": closeModal(); openFocus(el.dataset.id); break;
      case "open-class": ui.openClass = el.dataset.class; break;
      case "focus-close": closeFocus(); break;
      case "focus-next": nextStep(); break;
      case "focus-pause":
        focus.paused = !focus.paused;
        if (!focus.paused) focus.end = Date.now() + focus.left * 1000;
        renderFocus(); break;
      case "focus-feel": focus.picked = Number(el.dataset.v); renderFocus(); { const b = $(`#focus [data-act="focus-feel"][data-v="${el.dataset.v}"]`); if (b) b.focus(); } break;
      case "focus-stuck": { const x = s.plan.sessions.find(y => y.id === focus.id); if (x) addStuck(x); focus.stuck = true; renderFocus(); break; }
      case "focus-save": saveCheckin(); break;
      case "focus-tutorial": e.preventDefault(); ui.tutClass = el.dataset.class; saveCheckinIfNeeded(); closeFocus(); location.hash = "#week"; break;
      case "speak": e.stopPropagation(); speak(el.dataset.text); break;
      case "save-menu": saveMenu(); break;
      case "add-calendar": addCalendar(); break;
      case "make-up": makeUp(); break;
      case "move-session": moveMenu(el.dataset.id); break;
      case "move-go": moveSession(el.dataset.id, el.dataset.how); break;
      case "share": shareModal(); break;
      case "display": displayModal(); break;
      case "display-set": setDisplay(el.dataset.key, el.dataset.v); displayModal(); break;
      case "demo-reset": localStorage.removeItem("examPrepHQ.demo"); location.reload(); break;
      case "exp-print": try { window.Exports.print(); } catch (err) { toast(err.message); } break;
      case "exp-word": window.Exports.word(); toast("Downloaded."); break;
      case "exp-csv": window.Exports.csv(); toast("Downloaded."); break;
      case "exp-ics": window.Exports.ics(); toast("Calendar file downloaded. Now import it (step 2)."); break;
      case "exp-gcal": await syncGoogleCalendar(); break;
      case "exp-gdoc":
      case "exp-gsheet": {
        toast("Saving to your Drive...");
        try {
          const r = el.dataset.act === "exp-gdoc" ? await window.Exports.googleDoc() : await window.Exports.googleSheet();
          openModal(`<div class="modal-body"><h3>Saved to Google Drive</h3><p>It's in your ${esc(CFG.DRIVE_FOLDER_NAME)} folder.</p></div>
            <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button><a class="btn" href="${esc(r.webViewLink)}" target="_blank" rel="noopener">Open it</a></div>`);
        } catch (err) { toast(`Couldn't save: ${err.message}`); }
        break;
      }

      case "flip": ui.flipped[el.dataset.i] = !ui.flipped[el.dataset.i]; el.setAttribute("aria-pressed", String(!!ui.flipped[el.dataset.i])); break;
      case "copy-email":
        try { await navigator.clipboard.writeText(C.tutorials.email); toast("Copied. Paste it into an email and fill in the blanks."); }
        catch (err) { toast("Couldn't copy. Select the text and copy it instead."); }
        break;

      case "mp-edit": ui.mpEdit = true; render(); break;
      case "mp-done": ui.mpEdit = false; render(); break;
      case "mp-all": ui.mpAll = !ui.mpAll; render(); break;
      case "mp-move": {
        const dom = C.mindprint.domains.find(d => d.id === el.dataset.cat);
        const list = (s.mindprint.order[dom.id] || dom.skills).slice();
        const i = list.indexOf(el.dataset.skill), j = i + Number(el.dataset.dir);
        if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
        s.mindprint.order[dom.id] = list;
        save({ planInputs: true }); rerenderKeepFocus(el); break;
      }
      case "mp-confirm": {
        const dom = C.mindprint.domains.find(d => d.id === el.dataset.cat);
        s.mindprint.order[dom.id] = dom.skills.slice();
        save({ planInputs: true }); render(); break;
      }
      case "mp-strongest":
        s.mindprint.strongest = s.mindprint.strongest === el.dataset.cat ? "" : el.dataset.cat;
        save({ planInputs: true }); rerenderKeepFocus(el); break;
      case "mp-clear": s.mindprint = { order: {}, strongest: "", top: {}, strategies: [] }; ui.mpEdit = false; save({ planInputs: true }); render(); break;

      case "signin":
      case "reconnect": await signIn(false); break;
      case "account-menu": {
        const u = window.Drive.user;
        openModal(`<div class="modal-body"><h3>Signed in</h3><p>${esc(u.name || "")}<br><span class="muted">${esc(u.email || "")}</span></p>
          <p class="small muted">Your plan saves to your Google Drive automatically.</p>
          <p><a href="${window.Drive.folderLink()}" target="_blank" rel="noopener">📁 Open my Exam Prep folder</a></p></div>
          <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button><button class="btn" data-act="signout">Sign out</button></div>`);
        break;
      }
      case "signout": window.Drive.signOut(); ui.sync = "local"; closeModal(); render(); toast("Signed out. Your plan is still saved on this device."); break;
    }
  });

  document.addEventListener("change", e => {
    const el = e.target;
    if (el.dataset.bind) {
      setPath(el.dataset.bind, el.value);
      save({ planInputs: !!el.dataset.plan });
      if (el.dataset.rerender) render();
    }
    if (el.dataset.upload && el.files.length) handleFiles(el.dataset.upload, Array.from(el.files));
    if (el.dataset.mpupload !== undefined && el.files.length) handleMindprint(el.files[0]);
    if (el.dataset.examcheck !== undefined) ui.examChecks[el.dataset.examcheck] = el.checked;
    if (el.dataset.daycheck !== undefined) ui.dayChecks[el.dataset.daycheck] = el.checked;
  });

  document.addEventListener("toggle", e => {
    const d = e.target;
    if (d.dataset && d.dataset.proj) ui.openProj = d.open ? d.dataset.proj : (ui.openProj === d.dataset.proj ? null : ui.openProj);
  }, true);

  document.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset.topic) {
      const [cid, tid] = el.dataset.topic.split("|");
      const t = st().classes[cid].topics.find(x => x.id === tid);
      if (t) { t.text = el.value; save({ planInputs: true }); }
    }
  });

  document.addEventListener("submit", e => {
    const f = e.target;
    if (f.dataset.addtopic !== undefined) {
      e.preventDefault();
      const input = $("input", f);
      const text = input.value.trim();
      if (!text) return;
      const c = st().classes[f.dataset.addtopic];
      c.topics.push({ id: uid(), text, conf: Number(c.confidence) || 3 });
      save({ planInputs: true });
      render();
      const again = $(`#add-${f.dataset.addtopic}`);
      if (again) again.focus();
    }
    if (f.dataset.busyform !== undefined) {
      e.preventDefault();
      const label = $("#b-label").value.trim();
      const start = $("#b-start").value, end = $("#b-end").value;
      if (end <= start) { toast("The end time needs to be after the start time."); return; }
      const item = { id: uid(), label, type: ui.busyType, start, end };
      if (ui.busyType === "weekly") {
        item.days = $$("input[name=day]:checked", f).map(i => Number(i.value));
        if (!item.days.length) { toast("Pick at least one day."); return; }
      } else item.date = $("#b-date").value;
      st().busy.push(item);
      ui.busyLabel = ""; ui.busyOpen = false;
      save({ planInputs: true });
      render();
      toast(`Added ${label}.`);
    }
    if (f.dataset.tutform !== undefined) {
      e.preventDefault();
      const date = $("#t-date").value;
      if (!date) { toast("Pick a day."); return; }
      if (D.isWeekend(date)) { toast("Tutorials are on school days. Pick a weekday."); return; }
      const classId = $("#t-class").value;
      if (st().tutorials.some(t => t.date === date)) { toast("You already have a tutorial that day. Pick another day."); return; }
      st().tutorials.push({ id: uid(), classId, date, start: CFG.TUTORIAL_START, end: CFG.TUTORIAL_END, done: false });
      st().tutorialsUpdatedAt = Date.now();
      save({ planInputs: true });
      render();
      toast(`Added: ${S.className(classId)} tutorial, ${D.pretty(date)}.`);
    }
    if (f.dataset.offform !== undefined) {
      e.preventDefault();
      const d = $("#off-date").value;
      if (d && !st().prefs.offDates.includes(d)) st().prefs.offDates.push(d);
      save({ planInputs: true });
      render();
    }
  });

  /* ---------- Google sign-in + sync ---------- */
  async function signIn(withCalendar) {
    try {
      ui.sync = "saving";
      renderAccount();
      await window.Drive.signIn(withCalendar === true);
      const remote = await window.Drive.loadData();
      const drive = st().drive;
      if (remote && remote.updatedAt > (st().updatedAt || 0)) {
        S.replace(Object.assign(remote, { drive }));
        toast("Loaded your plan from Google Drive.");
      } else {
        await window.Drive.saveData(st());
        S.persistLocal();
        toast("Signed in. Your plan now saves to Google Drive.");
      }
      ui.sync = "saved";
      render();
    } catch (err) {
      ui.sync = window.Drive.user ? "error" : "local";
      renderAccount();
      toast(err.message || "Sign-in didn't finish.");
    }
  }

  S.onSave(async state => {
    if (!window.Drive.user) return;
    if (!window.Drive.signedIn()) { ui.sync = "reconnect"; renderAccount(); return; }
    ui.sync = "saving"; renderAccount();
    try { await window.Drive.saveData(state); S.persistLocal(); ui.sync = "saved"; }
    catch (err) { ui.sync = "error"; }
    renderAccount();
  });

  $("#focus").addEventListener("cancel", ev => { ev.preventDefault(); closeFocus(); });

  /* ---------- Start ---------- */
  window.addEventListener("hashchange", render);
  applyDisplay();
  if (S.demo && !st().plan) buildDemo();
  renderBrand();
  render();
  if (window.Drive.enabled()) window.Drive.init().catch(() => {});
})();
