/* ==========================================================================
   PREP HQ: THE APP
   Pages: Home, My classes, My calendar, My plan, MindPrint, Strategy lab,
   Extended time. Everything renders from Store.state.
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

  const ROUTES = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "classes", label: "My classes", icon: "📚" },
    { id: "calendar", label: "My calendar", icon: "🗓️" },
    { id: "plan", label: "My plan", icon: "✅" },
    { id: "tutorials", label: "Tutorials", icon: "🙋" },
    { id: "mindprint", label: "MindPrint", icon: "🧩" },
    { id: "lab", label: "Strategy lab", icon: "🧠" },
    { id: "time", label: "Extended time", icon: "⏱️" }
  ];

  const ui = { labTab: "study", planFilter: "all", sync: "local", flipped: {}, busyType: "weekly", busyLabel: "", examChecks: {} };

  const BADGES = [
    { id: "classes", e: "🚀", name: "Ready to roll", test: s => gradesEntered(s) >= 3 },
    { id: "guide", e: "📄", name: "Guide added", test: s => Object.values(s.classes).some(c => c.topics.length) },
    { id: "plan", e: "🗺️", name: "Plan built", test: s => !!s.plan },
    { id: "first", e: "⭐", name: "First session", test: s => doneCount(s) >= 1 },
    { id: "five", e: "🔥", name: "Five down", test: s => doneCount(s) >= 5 },
    { id: "half", e: "🏔️", name: "Halfway there", test: s => pct(s) >= 50 },
    { id: "mind", e: "🧩", name: "Know your brain", test: s => !!(s.mindprint.order && Object.keys(s.mindprint.order).length >= 2) },
    { id: "ready", e: "🏆", name: "Exam ready", test: s => !!s.plan && s.plan.sessions.filter(x => x.kind === "test").length >= 5 && s.plan.sessions.filter(x => x.kind === "test").every(x => x.done) }
  ];

  function gradesEntered(s) { return Object.values(s.classes).filter(c => String(c.grade).trim() !== "").length; }
  function doneCount(s) { return s.plan ? s.plan.sessions.filter(x => x.done).length : 0; }
  function pct(s) { return s.plan && s.plan.sessions.length ? Math.round(100 * doneCount(s) / s.plan.sessions.length) : 0; }

  /* ---------- Saving + badges ---------- */
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

  /* ---------- Toast, confetti, modal ---------- */
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
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 2300);
  }

  function openModal(html) {
    const m = $("#modal");
    m.innerHTML = html;
    if (!m.open) m.showModal();
  }
  function closeModal() { const m = $("#modal"); if (m.open) m.close(); }

  /* ---------- Header ---------- */
  function renderBrand() {
    const b = $("#brand");
    b.innerHTML = CFG.LOGO_URL
      ? `<img src="${esc(CFG.LOGO_URL)}" alt="${esc(CFG.SCHOOL_NAME)}"><span class="brand-text"><span class="brand-app">Exam Prep HQ</span></span>`
      : `<span class="brand-text"><span class="brand-school">${esc(CFG.SCHOOL_NAME.toUpperCase())}</span><span class="brand-app">Exam Prep HQ</span></span>`;
  }

  function renderAccount() {
    const a = $("#account");
    if (!window.Drive.enabled()) {
      a.innerHTML = `<span class="sync"><span class="sync-text">Saved on this device</span></span>`;
      return;
    }
    if (!window.Drive.user) {
      a.innerHTML = `<button class="btn light small" data-act="signin">Sign in with Google</button>`;
      return;
    }
    const labels = { saving: ["", "Saving to Drive"], saved: ["ok", "Saved to Drive"], reconnect: ["warn", "Not saving"], error: ["warn", "Save failed"], local: ["", "Saved on this device"] };
    const [cls, txt] = labels[ui.sync] || labels.saved;
    const u = window.Drive.user;
    a.innerHTML = `
      <span class="sync ${cls}"><span class="sync-text">${txt}</span></span>
      ${ui.sync === "reconnect" || ui.sync === "error" ? `<button class="btn light small" data-act="reconnect">Reconnect</button>` : ""}
      <a class="btn light small" href="${window.Drive.folderLink()}" target="_blank" rel="noopener">📁 My Drive folder</a>
      <button class="avatar" data-act="account-menu" aria-label="Account: ${esc(u.email || "")}" title="${esc(u.email || "")}">${esc((u.given_name || u.name || "?").charAt(0).toUpperCase())}</button>`;
  }

  function renderTabs(current) {
    $("#tabs").innerHTML = ROUTES.map(r =>
      `<a class="tab" href="#${r.id}" ${r.id === current ? 'aria-current="page"' : ""}><span aria-hidden="true">${r.icon}</span>${r.label}</a>`).join("");
  }

  /* ---------- Shared bits ---------- */
  function classColorVars(id) {
    const e = S.exam(id);
    return e ? `--c:${e.color};--tint:${e.tint};` : "--c:#9d2235;--tint:#f6e3e1;";
  }

  function confButtons(act, current, extra = "") {
    return C.confidence.map(c =>
      `<button type="button" data-act="${act}" data-v="${c.v}" ${extra} aria-pressed="${Number(current) === c.v}" title="${c.label}" aria-label="${c.label}">${c.emoji}</button>`).join("");
  }

  function daysLabel(n) {
    if (n < 0) return { num: "✓", unit: "done" };
    if (n === 0) return { num: "0", unit: "today" };
    return { num: String(n), unit: n === 1 ? "day to go" : "days to go" };
  }

  // Shakiest topics for a class: rated 1-2, or 3 if nothing is lower.
  function hitList(classId) { return window.Exports.hitList(classId); }

  function nextTutorial() {
    const now = D.today();
    return (st().tutorials || []).filter(t => !t.done && t.date >= now).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
  }

  function howToSection(open) {
    const H = C.howTo;
    return `
      <details class="howto" ${open ? "open" : ""}>
        <summary><h2>How to use Exam Prep HQ</h2>${open ? "" : `<span class="small muted howto-hint">Tap to see the routine</span>`}</summary>
        <p class="howto-intro">${esc(H.intro)}</p>
        <ol class="routine">${H.routine.map(r => `
          <li>
            <span class="r-when">${esc(r.when)}</span>
            <span class="r-emoji" aria-hidden="true">${r.emoji}</span>
            <b>${esc(r.title)}</b>
            <span class="small">${esc(r.body)}</span>
          </li>`).join("")}</ol>
        <div class="tips">${H.tips.map(t => `<div class="tip"><b>${esc(t.title)}</b><span class="small">${esc(t.body)}</span></div>`).join("")}</div>
      </details>`;
  }

  function tutorialTeaser() {
    const s = st();
    const items = [];
    CFG.EXAMS.forEach(e => hitList(e.id).slice(0, 2).forEach(t => items.push({ id: e.id, t })));
    const next = nextTutorial();
    return `
      <section class="panel teaser" aria-labelledby="tut-teaser-h">
        <div class="teaser-text">
          <h3 id="tut-teaser-h">Make your tutorials count</h3>
          <p class="small" style="margin-bottom:10px">${esc(C.tutorials.intro.split(". ").slice(0, 2).join(". "))}.</p>
          ${next ? `<p class="small" style="margin:0 0 10px"><b>Next tutorial:</b> ${esc(S.className(next.classId))}, ${D.pretty(next.date)} at ${D.clock(next.start)}</p>` : ""}
          <a class="btn small" href="#tutorials">${s.tutorials.length ? "See my tutorial plan" : "Plan my tutorials"}</a>
        </div>
        <div>
          <h4 class="small" style="margin-bottom:6px">Your hit list (topics to bring)</h4>
          ${items.length ? `<ul class="hit-mini">${items.slice(0, 5).map(i => `<li style="${classColorVars(i.id)}"><span>${esc(S.className(i.id))}</span>${esc(i.t)}</li>`).join("")}</ul>`
            : `<p class="small muted">Rate your study guide topics on <a href="#classes">My classes</a> and your shakiest ones show up here.</p>`}
        </div>
      </section>`;
  }

  /* ======================================================================
     HOME
     ====================================================================== */
  function pageHome() {
    const s = st();
    const today = D.today();
    const name = s.profile.name ? `, ${esc(s.profile.name)}` : "";
    const first = CFG.EXAMS.map(e => e.date).sort()[0];
    const toFirst = D.diff(today, first);

    const gates = CFG.EXAMS.map(e => {
      const n = D.diff(today, e.date);
      const l = daysLabel(n);
      return `<div class="gate ${n < 0 ? "past" : ""}" style="${classColorVars(e.id)}">
        <div class="icon" aria-hidden="true">${e.icon}</div>
        <div class="num">${l.num}</div><div class="unit">${l.unit}</div>
        <div class="subj">${esc(S.className(e.id))}</div>
        <div class="when">${D.pretty(e.date)}</div>
      </div>`;
    }).join("");

    const headline = toFirst > 0
      ? `${toFirst} day${toFirst === 1 ? "" : "s"} until your first exam${name}.`
      : `Exam week is here${name}.`;
    const cta = s.plan
      ? `<a class="btn light big" href="#plan">See my plan</a><a class="btn ghost big" style="color:#fff;border-color:#fff" href="#lab">Study tips</a>`
      : `<a class="btn light big" href="#classes">Build my plan</a><a class="btn ghost big" style="color:#fff;border-color:#fff" href="#lab">Study tips</a>`;

    const steps = [
      { done: gradesEntered(s) >= 3, title: "Add your classes and grades", sub: "Your grade and how you feel about each class.", href: "#classes" },
      { done: Object.values(s.classes).some(c => c.topics.length), title: "Add your study guides", sub: "Upload them or type the topics, then rate each one.", href: "#classes" },
      { done: s.busy.length > 0 || s.calendarChecked, title: "Add what's already on your calendar", sub: "Practices, rehearsals, family plans, and when you like to study.", href: "#calendar" },
      { done: !!s.plan, title: "Build your plan", sub: "Exam Prep HQ spaces out study sessions for each part of each study guide.", href: "#plan" }
    ];

    const upNext = s.plan
      ? s.plan.sessions.filter(x => !x.done && x.date >= today).slice(0, 3)
      : [];
    const nextHTML = s.plan
      ? (upNext.length ? `<div class="sessions">${upNext.map(sessionCard).join("")}</div>
          <p class="small" style="margin-top:12px"><a href="#plan">See the whole plan</a></p>`
        : `<p>Nothing left on your plan. Nice work. Rest up and take care of yourself.</p>`)
      : `<ol class="steps">${steps.map(x => `<li class="${x.done ? "done" : ""}"><div><b>${x.title}</b><span class="small muted">${x.sub}</span></div><a class="btn small ${x.done ? "ghost" : ""}" href="${x.href}">${x.done ? "Edit" : "Start"}</a></li>`).join("")}</ol>`;

    const signin = window.Drive.enabled() && !window.Drive.user ? `
      <div class="panel signin-card">
        <div class="g" aria-hidden="true">☁️</div>
        <div>
          <h4 style="margin:0 0 4px">Save everything to your Google Drive</h4>
          <p class="small muted" style="margin:0 0 10px">Sign in with your school Google account. Exam Prep HQ makes an "${esc(CFG.DRIVE_FOLDER_NAME)}" folder for your plan, study guides, and schedules, so you can use it on any computer.</p>
          <button class="btn small" data-act="signin">Sign in with Google</button>
        </div>
      </div>` : "";

    return `
      <section class="hero brick" aria-labelledby="hero-title">
        <h1 id="hero-title">${headline}</h1>
        <p>Five exams, ${CFG.EXAM_MINUTES} minutes each. Exam Prep HQ helps you turn your study guides into a plan that fits around practices, family time, and sleep.</p>
        <div class="btn-row">${cta}</div>
        <div class="gates" aria-label="Exam countdown">${gates}</div>
      </section>

      ${howToSection(!s.plan)}

      <div class="grid two" style="margin-top:24px">
        <section class="panel" aria-labelledby="next-title">
          <div class="panel-title"><h3 id="next-title">${s.plan ? "Up next" : "Get set up"}</h3></div>
          ${nextHTML}
        </section>
        <div class="stack">
          ${signin}
          <section class="panel" aria-labelledby="prog-title">
            <div class="panel-title"><h3 id="prog-title">Your progress</h3></div>
            <div class="progress-wrap">
              <div class="ring" style="--p:${pct(s)}" role="img" aria-label="${pct(s)} percent of study sessions done"><span>${pct(s)}%</span></div>
              <div>
                <p style="margin:0 0 4px"><b>${doneCount(s)}</b> of ${s.plan ? s.plan.sessions.length : 0} study sessions done</p>
                <p class="small muted" style="margin:0">Check off sessions on your plan to fill the ring.</p>
              </div>
            </div>
            <h4 style="margin-top:18px">Badges</h4>
            <div class="badges">${BADGES.map(b => {
              const e = s.earnedBadges.includes(b.id);
              return `<span class="badge ${e ? "earned" : "locked"}"><span class="e" aria-hidden="true">${b.e}</span>${b.name}<span class="sr-only">${e ? " (earned)" : " (not yet)"}</span></span>`;
            }).join("")}</div>
          </section>
        </div>
      </div>

      ${tutorialTeaser()}

      ${s.plan ? `<section class="panel" style="margin-top:20px"><div class="panel-title"><h3>Your setup</h3></div><ol class="steps">${steps.map(x => `<li class="${x.done ? "done" : ""}"><div><b>${x.title}</b><span class="small muted">${x.sub}</span></div><a class="btn small ghost" href="${x.href}">Edit</a></li>`).join("")}</ol></section>` : ""}

      <section style="margin-top:28px" aria-labelledby="explore-title">
        <h2 id="explore-title">Explore</h2>
        <div class="downloads">
          ${C.lab.map(t => `<a class="dl" href="#lab" data-act="lab-go" data-tab="${t.id}" style="text-decoration:none;color:inherit"><span class="e" aria-hidden="true">${t.emoji}</span><b>${t.title}</b><span>${esc(t.blurb.split(". ")[0].replace(/\.$/, ""))}.</span></a>`).join("")}
          <a class="dl" href="#time" style="text-decoration:none;color:inherit"><span class="e" aria-hidden="true">⏱️</span><b>Extended time</b><span>How to use every minute you have.</span></a>
          <a class="dl" href="#mindprint" style="text-decoration:none;color:inherit"><span class="e" aria-hidden="true">🧩</span><b>MindPrint match</b><span>Study strategies picked for how you learn.</span></a>
        </div>
      </section>`;
  }

  /* ======================================================================
     MY CLASSES
     ====================================================================== */
  function pageClasses() {
    const s = st();
    const p = s.profile;
    return `
      <div class="page-head">
        <h1>My classes</h1>
        <p>For each class, add your current grade, your study guide, and how confident you feel. Be honest: the shaky stuff gets more study time.</p>
      </div>

      <section class="panel" style="margin-bottom:20px">
        <div class="fields">
          <div class="field"><label for="p-name">First name (optional)</label><input id="p-name" type="text" data-bind="profile.name" value="${esc(p.name)}" autocomplete="given-name"></div>
          <div class="field"><label>Grade</label><div class="seg">${["7", "8"].map(g => `<button type="button" data-act="set" data-path="profile.gradeLevel" data-v="${g}" aria-pressed="${p.gradeLevel === g}">${g}th grade</button>`).join("")}</div></div>
          <div class="field"><label>Your last exam is</label><div class="seg">${["World Language", "Literature"].map(g => `<button type="button" data-act="set" data-path="profile.langChoice" data-v="${g}" aria-pressed="${p.langChoice === g}">${g}</button>`).join("")}</div></div>
          ${p.langChoice === "World Language" ? `<div class="field"><label for="p-lang">Which language?</label><input id="p-lang" type="text" data-bind="profile.langName" data-rerender="1" value="${esc(p.langName)}" placeholder="Spanish, French, Latin..."></div>` : ""}
        </div>
      </section>

      <div class="stack">${CFG.EXAMS.map(classCard).join("")}</div>

      <div class="btn-row" style="margin-top:24px">
        <a class="btn big" href="#calendar">Next: my calendar</a>
      </div>`;
  }

  function classCard(e) {
    const c = st().classes[e.id];
    const name = S.className(e.id);
    const guides = c.guides.length ? `<ul class="guide-files">${c.guides.map((g, i) =>
      `<li>📄 ${g.link ? `<a href="${esc(g.link)}" target="_blank" rel="noopener">${esc(g.name)}</a>` : esc(g.name)}
        <button class="icon-btn" data-act="guide-del" data-class="${e.id}" data-i="${i}" aria-label="Remove ${esc(g.name)}">✕</button></li>`).join("")}</ul>` : "";
    const topics = c.topics.length
      ? `<ul class="topics">${c.topics.map(t => `
          <li class="topic">
            <input type="text" value="${esc(t.text)}" data-topic="${e.id}|${t.id}" aria-label="Topic name">
            <div class="conf" role="group" aria-label="How confident: ${esc(t.text)}">${confButtons("topic-conf", t.conf, `data-class="${e.id}" data-id="${t.id}"`)}</div>
            <button class="icon-btn" data-act="topic-del" data-class="${e.id}" data-id="${t.id}" aria-label="Delete topic ${esc(t.text)}">🗑️</button>
          </li>`).join("")}</ul>`
      : `<p class="small muted">No topics yet. Upload or paste your study guide, or type the topics below. If you skip this, your plan uses general review topics for ${esc(name)}.</p>`;

    return `
      <section class="class-card" style="${classColorVars(e.id)}" aria-labelledby="h-${e.id}">
        <div class="class-head">
          <span class="icon" aria-hidden="true">${e.icon}</span>
          <div><h3 id="h-${e.id}">${esc(name)}</h3><span class="date">Exam: ${D.pretty(e.date)}</span></div>
        </div>
        <div class="class-body">
          <div>
            <div class="field">
              <label for="g-${e.id}">Current grade</label>
              <input id="g-${e.id}" type="text" inputmode="decimal" data-bind="classes.${e.id}.grade" data-plan="1" value="${esc(c.grade)}" placeholder="Like 88 or B+">
            </div>
            <div class="field">
              <label id="cl-${e.id}">How do you feel about this class overall?</label>
              <div class="conf" role="group" aria-labelledby="cl-${e.id}">${confButtons("class-conf", c.confidence, `data-class="${e.id}"`)}</div>
            </div>
            <div class="field">
              <label class="drop" data-drop="${e.id}">
                <input type="file" accept=".pdf,.docx,.txt,image/*" multiple data-upload="${e.id}">
                📤 Upload study guide<br><span class="xs muted">PDF, Word, or photo. Drag it here or tap.</span>
              </label>
              ${guides}
              <button class="linkish small" style="margin-top:8px" data-act="paste" data-class="${e.id}">Paste the study guide text instead</button>
            </div>
          </div>
          <div>
            <h4>Study guide topics <span class="small muted" style="font-weight:500">(rate each one 😵 to 😎)</span></h4>
            ${topics}
            <form class="btn-row" style="margin-top:10px" data-addtopic="${e.id}">
              <label class="sr-only" for="add-${e.id}">Add a topic</label>
              <input id="add-${e.id}" type="text" placeholder="Add a topic, like &quot;Unit 3: Ecosystems&quot;" style="flex:1;min-width:180px">
              <button class="btn small" type="submit">Add</button>
            </form>
          </div>
        </div>
      </section>`;
  }

  async function handleFiles(classId, files) {
    const c = st().classes[classId];
    const name = S.className(classId);
    let found = [];
    let unreadable = 0;
    for (const file of files) {
      toast(`Reading ${file.name}...`);
      const record = { name: file.name, link: "" };
      if (window.Drive.user) {
        try { const r = await window.Drive.uploadGuide(file, name); record.link = r.webViewLink || ""; }
        catch (err) { toast(`Couldn't save to Drive: ${err.message}`); }
      }
      c.guides.push(record);
      try {
        const text = await window.StudyGuide.extract(file);
        if (text == null) unreadable++;
        else found = found.concat(window.StudyGuide.topicsFromText(text));
      } catch (err) { unreadable++; }
    }
    save({ planInputs: true });
    render();
    if (found.length) reviewTopics(classId, found);
    else if (unreadable) toast(`Saved. Exam Prep HQ can't read that file type, so type the topics on the right.`);
    else toast("Couldn't spot topics in that file. Type them in or paste the text.");
  }

  function reviewTopics(classId, list) {
    const existing = new Set(st().classes[classId].topics.map(t => t.text.toLowerCase()));
    const fresh = Array.from(new Set(list)).filter(t => !existing.has(t.toLowerCase()));
    if (!fresh.length) { toast("Those topics are already on your list."); return; }
    openModal(`
      <form method="dialog" data-review="${classId}">
        <div class="modal-body">
          <h3>We found ${fresh.length} possible topics</h3>
          <p class="muted">Keep the ones that are really on your ${esc(S.className(classId))} study guide. You can rename them after.</p>
          <ul class="pick-list">${fresh.map((t, i) => `<li><label><input type="checkbox" name="t" value="${i}" checked> ${esc(t)}</label></li>`).join("")}</ul>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" data-act="modal-close">Cancel</button>
          <button class="btn" type="submit">Add checked topics</button>
        </div>
      </form>`);
    $("#modal form").addEventListener("submit", ev => {
      ev.preventDefault();
      const picks = $$("#modal input[name=t]:checked").map(i => fresh[Number(i.value)]);
      const c = st().classes[classId];
      picks.forEach(text => c.topics.push({ id: uid(), text, conf: Number(c.confidence) || 3 }));
      closeModal();
      save({ planInputs: true });
      render();
      toast(`Added ${picks.length} topic${picks.length === 1 ? "" : "s"}. Now rate how you feel about each one.`);
    });
  }

  function pasteModal(classId) {
    openModal(`
      <form method="dialog">
        <div class="modal-body">
          <h3>Paste your ${esc(S.className(classId))} study guide</h3>
          <p class="muted">Copy the text from your study guide (from Google Docs, Canvas, or a PDF) and paste it here.</p>
          <label for="paste-box" class="sr-only">Study guide text</label>
          <textarea id="paste-box" style="min-height:220px"></textarea>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" data-act="modal-close">Cancel</button>
          <button class="btn" type="submit">Find topics</button>
        </div>
      </form>`);
    $("#modal form").addEventListener("submit", ev => {
      ev.preventDefault();
      const list = window.StudyGuide.topicsFromText($("#paste-box").value);
      closeModal();
      if (list.length) reviewTopics(classId, list);
      else toast("Couldn't spot topics. Try adding them one at a time.");
    });
  }

  /* ======================================================================
     MY CALENDAR
     ====================================================================== */
  const PRESETS = [
    ["⚽", "Practice"], ["🏀", "Game"], ["🎭", "Rehearsal"], ["🎵", "Music lesson"], ["📖", "Tutoring"],
    ["🙏", "Religious service"], ["🍽️", "Family dinner"], ["🚗", "Travel"], ["🩺", "Appointment"], ["🎉", "Event"]
  ];

  function pageCalendar() {
    const s = st();
    const p = s.prefs;
    const busyList = s.busy.length ? `<ul class="busy-list">${s.busy.map(b => `
      <li class="busy-item">
        <span class="grow"><b>${esc(b.label || "Busy")}</b><br><span class="when">${b.type === "weekly"
          ? `Every ${(b.days || []).map(d => D.daysShort[d]).join(", ") || "(no days picked)"}`
          : D.pretty(b.date)}, ${D.clock(b.start)} to ${D.clock(b.end)}</span></span>
        <button class="icon-btn" data-act="busy-del" data-id="${b.id}" aria-label="Remove ${esc(b.label)}">🗑️</button>
      </li>`).join("")}</ul>` : `<p class="small muted">Nothing added yet.</p>`;

    const seg = (path, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button type="button" data-act="set" data-path="${path}" data-num="1" data-plan="1" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join("")}</div>`;

    return `
      <div class="page-head">
        <h1>My calendar</h1>
        <p>Add what's already on your schedule, then tell Exam Prep HQ when you like to study. Your plan only uses the open time.</p>
      </div>
      <div class="grid two">
        <section class="panel" aria-labelledby="busy-h">
          <div class="panel-title"><h3 id="busy-h">Already on my calendar</h3></div>
          <p class="small muted">Quick add:</p>
          <div class="chips" style="margin-bottom:14px">${PRESETS.map(([e, l]) => `<button class="chip" type="button" data-act="preset" data-label="${l}">${e} ${l}</button>`).join("")}</div>
          <form data-busyform>
            <div class="field"><label for="b-label">What is it?</label><input id="b-label" type="text" value="${esc(ui.busyLabel)}" placeholder="Soccer practice" required></div>
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
              <div class="field"><label for="b-end">Ends (include travel)</label><input id="b-end" type="time" value="17:30" required></div>
            </div>
            <button class="btn" type="submit">Add to my calendar</button>
          </form>
          <h4 style="margin-top:22px">My list</h4>
          ${busyList}
        </section>

        <section class="panel" aria-labelledby="study-h">
          <div class="panel-title"><h3 id="study-h">When I can study</h3></div>
          <div class="fields">
            <div class="field"><label for="wd-s">School days from</label><input id="wd-s" type="time" data-bind="prefs.weekdayStart" data-plan="1" value="${p.weekdayStart}"></div>
            <div class="field"><label for="wd-e">until</label><input id="wd-e" type="time" data-bind="prefs.weekdayEnd" data-plan="1" value="${p.weekdayEnd}"></div>
          </div>
          <div class="fields">
            <div class="field"><label for="we-s">Weekends from</label><input id="we-s" type="time" data-bind="prefs.weekendStart" data-plan="1" value="${p.weekendStart}"></div>
            <div class="field"><label for="we-e">until</label><input id="we-e" type="time" data-bind="prefs.weekendEnd" data-plan="1" value="${p.weekendEnd}"></div>
          </div>
          <div class="field"><label>Study session length</label>${seg("prefs.sessionLen", [[20, "20 min"], [25, "25 min"], [30, "30 min"], [45, "45 min"]], p.sessionLen)}
            <p class="xs muted" style="margin:6px 0 0">Each session is followed by a 10-minute break.</p></div>
          <div class="field"><label>Most sessions on a school day</label>${seg("prefs.maxWeekday", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], p.maxWeekday)}</div>
          <div class="field"><label>Most sessions on a weekend day</label>${seg("prefs.maxWeekend", [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]], p.maxWeekend)}</div>
          <div class="field"><label>Keep one day a week totally free</label>${seg("prefs.freeDay", [[-1, "No"], [5, "Friday"], [6, "Saturday"], [0, "Sunday"]], p.freeDay)}
            <p class="xs muted" style="margin:6px 0 0">Rest helps memory. If an exam is the next day, you'll still get a short review.</p></div>
          <div class="field"><label for="start">Start my plan on</label><input id="start" type="date" data-bind="prefs.startDate" data-plan="1" value="${p.startDate}"></div>

          <h4 style="margin-top:20px">Days off (no studying)</h4>
          <p class="small muted">Holidays, trips, or days you know will be packed.</p>
          <form class="btn-row" data-offform>
            <label class="sr-only" for="off-date">Day off</label>
            <input id="off-date" type="date" style="max-width:200px" required>
            <button class="btn small" type="submit">Add day off</button>
          </form>
          <div class="chips" style="margin-top:10px">${(p.offDates || []).sort().map(d => `<button class="chip" data-act="off-del" data-d="${d}" aria-label="Remove ${D.pretty(d)}">${D.pretty(d)} ✕</button>`).join("")}</div>
        </section>
      </div>
      <div class="btn-row" style="margin-top:24px">
        <a class="btn big" href="#plan" data-act="cal-done">Next: build my plan</a>
      </div>`;
  }

  /* ======================================================================
     MY PLAN
     ====================================================================== */
  function sessionCard(x) {
    const late = !x.done && x.date < D.today();
    return `<div class="session ${x.done ? "done" : ""}" style="${classColorVars(x.classId)}">
      <button class="check" data-act="toggle-session" data-id="${x.id}" aria-pressed="${!!x.done}" aria-label="Mark ${esc(x.title)} done">${x.done ? "✓" : ""}</button>
      <div>
        <div class="time">${D.short(x.date)}, ${D.clock(x.start)} to ${D.clock(x.end)}</div>
        <div class="s-title">${esc(x.title)}</div>
        <div class="s-topic">${esc(x.topicText)}</div>
        <p class="s-tip">${esc(x.tip)}</p>
        ${late ? `<p class="xs" style="margin:4px 0 0;color:var(--red)">Missed this one? That's OK. Rebuild your plan and it moves to a new time.</p>` : ""}
      </div>
    </div>`;
  }

  function calendarStale() {
    const s = st();
    const synced = s.drive.calendarSyncedAt || 0;
    if (!synced || !s.plan) return false;
    return synced < Math.max(s.plan.generatedAt || 0, s.tutorialsUpdatedAt || 0);
  }

  function pagePlan() {
    const s = st();
    if (!s.plan) {
      const g = gradesEntered(s);
      const t = Object.values(s.classes).reduce((n, c) => n + c.topics.length, 0);
      return `
        <div class="page-head"><h1>My plan</h1><p>Exam Prep HQ builds study sessions for every part of every study guide, spaced out so you remember more.</p></div>
        <section class="panel">
          <h3>Ready to build?</h3>
          <ul>
            <li>${g} of 5 grades added ${g < 5 ? `(<a href="#classes">add more</a>)` : "✓"}</li>
            <li>${t} study guide topics ${t ? "✓" : `(<a href="#classes">add some</a>, or we'll use general review topics)`}</li>
            <li>${s.busy.length} things on your calendar ${s.busy.length ? "✓" : `(<a href="#calendar">add them</a>)`}</li>
            <li>${S.mpIsSet() ? "MindPrint added ✓" : `MindPrint not added (<a href="#mindprint">optional</a>)`}</li>
          </ul>
          <button class="btn big" data-act="build">Build my plan</button>
        </section>`;
    }

    const plan = s.plan;
    const today = D.today();
    const filtered = plan.sessions.filter(x => ui.planFilter === "all" || x.classId === ui.planFilter || (ui.planFilter !== "all" && x.classId === "general"));
    const dates = new Set(filtered.map(x => x.date));
    CFG.EXAMS.forEach(e => { if (ui.planFilter === "all" || ui.planFilter === e.id) dates.add(e.date); });
    const tuts = (s.tutorials || []).filter(t => ui.planFilter === "all" || ui.planFilter === t.classId);
    tuts.forEach(t => dates.add(t.date));
    const sorted = Array.from(dates).sort();

    const weeks = {};
    sorted.forEach(d => { const w = D.addDays(d, -D.dow(d)); (weeks[w] = weeks[w] || []).push(d); });

    const weeksHTML = Object.keys(weeks).sort().map(w => {
      const label = D.addDays(w, 6) < today ? `Week of ${D.pretty(w, false)} (past)` : w <= today && today <= D.addDays(w, 6) ? "This week" : `Week of ${D.pretty(w, false)}`;
      const days = weeks[w].map(d => {
        const exams = CFG.EXAMS.filter(e => e.date === d && (ui.planFilter === "all" || ui.planFilter === e.id));
        const busy = s.busy.filter(b => (b.type === "weekly" && (b.days || []).includes(D.dow(d))) || (b.type === "once" && b.date === d));
        const ses = filtered.filter(x => x.date === d);
        return `<div class="day ${d === today ? "today" : ""}">
          <div class="day-label"><b>${D.days[D.dow(d)]}</b><span>${D.pretty(d, false)}${d === today ? ", today" : ""}</span></div>
          <div class="sessions">
            ${exams.map(e => `<div class="exam-pill" style="${classColorVars(e.id)}"><span aria-hidden="true">⭐</span>${esc(S.className(e.id))} exam, ${S.examMinutes()} minutes. You've prepared for this.</div>`).join("")}
            ${tuts.filter(t => t.date === d).sort((a, b) => a.start.localeCompare(b.start)).map(t => `<div class="tut-pill" style="${classColorVars(t.classId)}"><span aria-hidden="true">🙋</span><span><b>${esc(S.className(t.classId))} tutorial, ${D.clock(t.start)}</b>${hitList(t.classId).length ? `<br><span class="small">Bring: ${esc(hitList(t.classId).slice(0, 3).join("; "))}</span>` : ""}</span></div>`).join("")}
            ${ses.length ? busy.map(b => `<div class="busy-pill">${D.clock(b.start)}: ${esc(b.label)}</div>`).join("") : ""}
            ${ses.map(sessionCard).join("")}
          </div>
        </div>`;
      }).join("");
      return `<section class="week"><h3>${label}</h3>${days}</section>`;
    }).join("");

    const signedIn = !!window.Drive.user;
    const free = plan.freeSlots || 0;

    return `
      <div class="page-head"><h1>My plan</h1><p>Each session links to a part of your study guide. Check it off when you're done.</p></div>

      <div class="plan-bar no-print">
        <div class="btn-row">
          <button class="btn" data-act="build">Rebuild my plan</button>
          <span class="small muted">${plan.sessions.length} sessions, ${doneCount(s)} done. ${free ? `${free} open slots left free for downtime.` : ""}</span>
        </div>
        <div class="filter" role="group" aria-label="Show classes">
          <button data-act="filter" data-v="all" aria-pressed="${ui.planFilter === "all"}">All</button>
          ${CFG.EXAMS.map(e => `<button data-act="filter" data-v="${e.id}" style="${classColorVars(e.id)}" aria-pressed="${ui.planFilter === e.id}">${esc(e.id === "lang" ? S.className("lang") : e.short)}</button>`).join("")}
        </div>
      </div>

      ${s.planStale ? `<div class="warn">You changed some of your info since this plan was built. <button class="linkish" data-act="build">Rebuild it</button> to catch up. Finished sessions stay checked off.</div>` : ""}
      ${plan.warnings.map(w => `<div class="warn">${esc(w)}</div>`).join("")}
      ${calendarStale() ? `<div class="warn">Your Google Calendar shows an older version of your plan. <button class="linkish" data-act="exp-gcal">Update Google Calendar</button></div>` : ""}

      <section class="panel no-print" aria-labelledby="dl-h" style="margin:16px 0">
        <div class="panel-title"><h3 id="dl-h">Download or save my schedule</h3></div>
        <div class="downloads">
          <button class="dl featured" data-act="exp-gcal" ${window.Drive.enabled() ? "" : "disabled"}><span class="e" aria-hidden="true">🔔</span><b>${s.drive.calendarSyncedAt ? "Update Google Calendar" : "Add to Google Calendar"}</b><span>${window.Drive.enabled()
            ? "Every session, tutorial, and exam goes into its own Exam Prep HQ calendar, with reminders."
            : "Not turned on for this site yet. Use the calendar file instead."}</span></button>
          <button class="dl" data-act="exp-print"><span class="e" aria-hidden="true">🖨️</span><b>Print or save as PDF</b><span>A printable checklist by day.</span></button>
          <button class="dl" data-act="exp-gdoc" ${signedIn ? "" : "disabled"}><span class="e" aria-hidden="true">📝</span><b>Google Doc</b><span>${signedIn ? "Editable, saved in your Drive folder." : "Sign in with Google to use this."}</span></button>
          <button class="dl" data-act="exp-gsheet" ${signedIn ? "" : "disabled"}><span class="e" aria-hidden="true">📊</span><b>Google Sheet</b><span>${signedIn ? "Sort and edit in a spreadsheet." : "Sign in with Google to use this."}</span></button>
          <button class="dl" data-act="exp-ics"><span class="e" aria-hidden="true">📅</span><b>Calendar file (.ics)</b><span>For Apple Calendar or Outlook, with reminders.</span></button>
          <button class="dl" data-act="exp-word"><span class="e" aria-hidden="true">📄</span><b>Word document</b><span>Editable in Word or Pages.</span></button>
          <button class="dl" data-act="exp-csv"><span class="e" aria-hidden="true">🧮</span><b>Spreadsheet (CSV)</b><span>Opens in Excel or Numbers.</span></button>
        </div>
      </section>

      ${weeksHTML}

      <p class="small muted no-print" style="margin-top:30px">Want to start completely over? <button class="linkish" data-act="reset">Erase all my Exam Prep HQ info</button></p>`;
  }

  function buildPlan() {
    const s = st();
    s.plan = window.Planner.generate(s);
    s.planStale = false;
    save();
    render();
    toast(s.plan.warnings.length ? "Plan built, with a few notes to check."
      : s.drive.calendarSyncedAt ? "Plan rebuilt. Update Google Calendar to match." : "Your plan is ready.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ======================================================================
     TUTORIALS
     ====================================================================== */
  const QUESTION_EXAMPLES = {
    english: "Like: How do I pick strong evidence for a theme paragraph?",
    science: "Like: What's the difference between mitosis and meiosis?",
    social: "Like: How do I explain the causes of an event in a short answer?",
    math: "Like: When do I flip the inequality sign?",
    lang: "Like: When do I use one verb tense instead of another?"
  };

  function pageTutorials() {
    const s = st();
    const T = C.tutorials;
    const today = D.today();
    const list = (s.tutorials || []).slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const lastExam = CFG.EXAMS.map(e => e.date).sort().slice(-1)[0];

    const planned = list.length ? `<ul class="busy-list">${list.map(t => `
      <li class="busy-item tut-item ${t.done ? "done" : ""}" style="${classColorVars(t.classId)}">
        <button class="check" data-act="tut-done" data-id="${t.id}" aria-pressed="${!!t.done}" aria-label="Mark ${esc(S.className(t.classId))} tutorial done">${t.done ? "✓" : ""}</button>
        <span class="grow"><b>${esc(S.className(t.classId))}</b><br><span class="when">${D.pretty(t.date)}, ${D.clock(t.start)} to ${D.clock(t.end)}${t.date < today && !t.done ? " (did you go?)" : ""}</span></span>
        <button class="icon-btn" data-act="tut-del" data-id="${t.id}" aria-label="Remove ${esc(S.className(t.classId))} tutorial">🗑️</button>
      </li>`).join("")}</ul>` : `<p class="small muted">No tutorials planned yet. Aim for at least one for each class you rated lowest.</p>`;

    const hit = CFG.EXAMS.map(e => {
      const c = s.classes[e.id];
      const topics = hitList(e.id);
      return `<section class="class-card hit-card" style="${classColorVars(e.id)}">
        <div class="class-head"><span class="icon" aria-hidden="true">${e.icon}</span><div><h3>${esc(S.className(e.id))}</h3><span class="date">Exam: ${D.pretty(e.date)}</span></div></div>
        <div style="padding:16px 20px">
          <h4 class="small">Shakiest topics</h4>
          ${topics.length ? `<ul class="hit-topics">${topics.slice(0, 4).map(t => `<li>${esc(t)}</li>`).join("")}</ul>`
            : `<p class="small muted">${c.topics.length ? "Nice: nothing rated shaky right now." : `Add and rate topics on <a href="#classes">My classes</a>.`}</p>`}
          <label for="q-${e.id}" style="margin-top:10px">My questions to ask</label>
          <textarea id="q-${e.id}" data-bind="classes.${e.id}.questions" placeholder="${esc(QUESTION_EXAMPLES[e.id] || "Like: Can you show me how to start number 4?")}">${esc(c.questions)}</textarea>
        </div>
      </section>`;
    }).join("");

    return `
      <div class="page-head"><h1>Tutorials</h1><p>${esc(T.intro)}</p></div>

      <div class="phases">${T.phases.map(ph => `
        <section class="panel phase">
          <div class="panel-title"><span class="phase-emoji" aria-hidden="true">${ph.emoji}</span><h3>${esc(ph.title)}</h3></div>
          <ul>${ph.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
        </section>`).join("")}</div>

      <div class="grid two" style="margin-top:20px">
        <section class="panel" aria-labelledby="tut-plan-h">
          <div class="panel-title"><h3 id="tut-plan-h">Plan a tutorial</h3></div>
          <p class="small muted">Add tutorials you're going to. They show up on your plan and in your calendar, and Exam Prep HQ won't schedule study sessions at the same time.</p>
          <form data-tutform>
            <div class="field"><label for="t-class">Class</label>
              <select id="t-class">${CFG.EXAMS.map(e => `<option value="${e.id}">${esc(S.className(e.id))}</option>`).join("")}</select></div>
            <div class="fields">
              <div class="field"><label for="t-date">Date</label><input id="t-date" type="date" min="${today}" max="${lastExam}" required></div>
              <div class="field"><label for="t-start">Starts</label><input id="t-start" type="time" value="08:00" required></div>
              <div class="field"><label for="t-end">Ends</label><input id="t-end" type="time" value="08:30" required></div>
            </div>
            <button class="btn" type="submit">Add tutorial</button>
          </form>
          <h4 style="margin-top:20px">My tutorials</h4>
          ${planned}
        </section>

        <section class="panel" aria-labelledby="starters-h">
          <div class="panel-title"><h3 id="starters-h">Questions that get great answers</h3></div>
          <ul class="starters">${T.starters.map(q => `<li>"${esc(q)}"</li>`).join("")}</ul>
          <h4 style="margin-top:18px">Swap this for that</h4>
          ${T.avoid.map(a => `<div class="swap"><span class="swap-no">${esc(a.title)}</span><span class="swap-yes">${esc(a.fix)}</span></div>`).join("")}
        </section>
      </div>

      <h2 style="margin-top:30px">My hit list</h2>
      <p class="muted">Your lowest-rated topics for each class. Write your questions here, then bring this page (or your printed plan) to tutorials.</p>
      <div class="grid hit-grid">${hit}</div>`;
  }

  /* ======================================================================
     MINDPRINT
     ====================================================================== */
  function pageMindprint() {
    const s = st();
    const MP = C.mindprint;
    const m = s.mindprint;
    const isSet = S.mpIsSet();

    const boxes = MP.domains.map(d => {
      const set = !!m.order[d.id];
      const order = m.order[d.id] || d.skills;
      const strongest = m.strongest === d.id;
      return `
        <section class="mp-box ${strongest ? "strongest" : ""} ${set ? "" : "unset"}" aria-labelledby="mpb-${d.id}">
          <div class="mp-box-head">
            <h4 id="mpb-${d.id}">${esc(d.name)}</h4>
            <span class="xs">${esc(d.sub)}</span>
          </div>
          <ol class="mp-rank">${order.map((id, i) => `
            <li class="${i === 0 && set ? "first" : ""}">
              <span class="mp-name"><span aria-hidden="true">${MP.skills[id].icon}</span> ${esc(MP.skills[id].name)}</span>
              <span class="mp-move">
                <button class="icon-btn" data-act="mp-move" data-cat="${d.id}" data-skill="${id}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(MP.skills[id].name)} up">▲</button>
                <button class="icon-btn" data-act="mp-move" data-cat="${d.id}" data-skill="${id}" data-dir="1" ${i === order.length - 1 ? "disabled" : ""} aria-label="Move ${esc(MP.skills[id].name)} down">▼</button>
              </span>
            </li>`).join("")}</ol>
          ${set ? "" : `<button class="btn small" data-act="mp-confirm" data-cat="${d.id}">This matches my report</button>`}
          <label class="mp-top-label" for="mpt-${d.id}">Top Strategy <span class="xs muted">(optional)</span></label>
          <input id="mpt-${d.id}" type="text" data-bind="mindprint.top.${d.id}" data-rerender="1" value="${esc(m.top[d.id] || "")}" placeholder="Copy it from your report">
          <button class="mp-star" data-act="mp-strongest" data-cat="${d.id}" aria-pressed="${strongest}">${strongest ? "★ My strongest category" : "☆ This box is highlighted on my report"}</button>
        </section>`;
    }).join("");

    return `
      <div class="page-head"><h1>MindPrint match</h1><p>Your MindPrint profile shows how your brain learns best. Add it here and Exam Prep HQ builds your study sessions around your stronger skills.</p></div>

      <section class="panel">
        <h3>Add your MindPrint profile</h3>
        <p class="small muted">Don't have your report? Ask your advisor or learning specialist.</p>
        <div class="mp-ways">
          <div class="mp-way">
            <h4>Option 1: Upload your report</h4>
            <label class="drop" data-mpdrop>
              <input type="file" accept=".pdf,.docx,.txt,image/*" data-mpupload>
              📤 Upload your MindPrint Student Profile<br><span class="xs muted">The PDF works best. Exam Prep HQ reads it and you check that it's right.</span>
            </label>
            ${s.mindprintReport ? `<p class="small" style="margin:8px 0 0">📄 ${s.mindprintReport.link ? `<a href="${esc(s.mindprintReport.link)}" target="_blank" rel="noopener">${esc(s.mindprintReport.name)}</a>` : esc(s.mindprintReport.name)}
              <button class="icon-btn" data-act="mp-report-del" aria-label="Remove report from this list">✕</button></p>` : ""}
          </div>
          <div class="mp-way">
            <h4>Option 2: Enter it yourself</h4>
            <p class="small" style="margin:0">Open your report to the "My Profile" boxes. Use ▲ and ▼ below so each box lists your skills in the same order, strongest first. Then mark the box that's highlighted on your report.</p>
          </div>
        </div>
        <p class="xs muted" style="margin:10px 0 0">Your report stays private. It's read on this device${window.Drive.user ? " and saved only in the MindPrint folder in your own Google Drive" : ""}. It's never sent anywhere else.</p>
      </section>

      <h2 style="margin-top:28px">My Profile</h2>
      <p class="muted">Strongest skill first in each box. The last skill could sometimes be a "blocker," and that's OK: you can use your stronger skills to work around it.</p>
      <div class="mp-boxes">${boxes}</div>
      ${isSet ? `<p style="margin-top:10px"><button class="linkish small" data-act="mp-clear">Clear my MindPrint profile</button></p>` : ""}

      <section class="panel playbook" style="margin-top:24px" aria-labelledby="pb-h">
        <div class="panel-title"><h3 id="pb-h">My study playbook</h3></div>
        ${isSet ? playbookHTML() : `<p class="muted">Upload your report or put the skills in order above, and your personal playbook appears here.</p>`}
      </section>`;
  }

  function playbookHTML() {
    const s = st();
    const MP = C.mindprint;
    const m = s.mindprint;
    const doms = MP.domains.filter(d => m.order[d.id]);
    const strongestDom = MP.domains.find(d => d.id === m.strongest);
    const superSkill = strongestDom && m.order[strongestDom.id] ? MP.skills[m.order[strongestDom.id][0]] : null;

    const lean = doms.map(d => {
      const sk = MP.skills[m.order[d.id][0]];
      return `<div class="pb-item"><h4><span class="tag strength">Start here</span> ${esc(sk.name)}</h4><ul>${sk.strength.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
    }).join("");
    const watch = doms.map(d => {
      const list = m.order[d.id];
      const sk = MP.skills[list[list.length - 1]];
      return `<div class="pb-item"><h4><span class="tag support">Work around</span> ${esc(sk.name)}</h4><ul>${sk.support.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
    }).join("");

    const tops = MP.domains.filter(d => m.top[d.id]).map(d => `<li><b>${esc(m.top[d.id])}</b> <span class="xs muted">(${esc(d.name)})</span></li>`).join("");

    const known = (m.strategies || []).map(name => {
      const def = MP.strategies.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (def) return { name, when: def.when, use: def.use };
      const sk = Object.values(MP.skills).find(k => name.toLowerCase().includes(k.name.toLowerCase()));
      return sk ? { name, when: "study", use: sk.strength[0] } : null;
    }).filter(Boolean);
    const group = (when, title) => {
      const items = known.filter(k => k.when === when);
      return items.length ? `<div><h4>${title}</h4><ul class="strat-list">${items.map(k => `<li><b>${esc(k.name)}</b><span>${esc(k.use)}</span></li>`).join("")}</ul></div>` : "";
    };

    return `
      ${superSkill ? `<div class="superpower"><span class="sp-emoji" aria-hidden="true">${superSkill.icon}</span><div><b>Your superpower: ${esc(superSkill.name)}</b><span class="small">Your strongest skill in your strongest category. When you're stuck, start here.</span></div></div>` : `<p class="small muted">Tip: mark the highlighted box from your report to see your superpower.</p>`}
      <div class="pb-cols">
        <div><h3 class="pb-sub">Lean on your stronger skills</h3>${lean}</div>
        <div><h3 class="pb-sub">Work around possible blockers</h3>${watch}</div>
      </div>
      ${tops ? `<h3 class="pb-sub">Your top MindPrint strategies</h3><ul>${tops}</ul>` : ""}
      ${known.length ? `<h3 class="pb-sub">Your MindPrint strategies, for exam prep</h3>
        <p class="small muted">From the recommendations on your report. Find the full versions in your MindPrint Toolbox.</p>
        <div class="pb-cols">${group("study", "While you study")}<div>${group("test", "On exam day")}${group("plan", "Planning")}</div></div>` : ""}
      <p class="small muted" style="margin-top:12px">Your study sessions use these too. ${s.plan ? `<button class="linkish" data-act="build">Rebuild my plan</button> to add them.` : ""}</p>`;
  }

  /* ======================================================================
     STRATEGY LAB
     ====================================================================== */
  function pageLab() {
    const tabs = C.lab.map(t => `<button data-act="lab-tab" data-v="${t.id}" aria-pressed="${ui.labTab === t.id}">${t.emoji} ${t.title}</button>`).join("")
      + `<button data-act="lab-tab" data-v="myths" aria-pressed="${ui.labTab === "myths"}">🤔 Myth or fact?</button>`;

    let body;
    if (ui.labTab === "myths") {
      body = `
        <div class="lab-intro"><div class="big-emoji" aria-hidden="true">🤔</div><div><h2 style="margin:0 0 4px">Myth or fact?</h2><p class="muted" style="margin:0">Guess, then tap a card to flip it.</p></div></div>
        <div class="myths">${C.myths.map((m, i) => `
          <button class="flip" data-act="flip" data-i="${i}" aria-pressed="${!!ui.flipped[i]}" aria-label="${esc(m.claim)} ${ui.flipped[i] ? `${m.answer}. ${esc(m.why)}` : "Tap to reveal."}">
            <span class="flip-inner">
              <span class="face front"><span style="font-weight:700;font-size:1.05rem">${esc(m.claim)}</span><small>Tap to flip</small></span>
              <span class="face back"><span class="verdict ${m.answer.toLowerCase()}">${m.answer}</span><span class="small">${esc(m.why)}</span></span>
            </span>
          </button>`).join("")}</div>`;
    } else {
      const t = C.lab.find(x => x.id === ui.labTab) || C.lab[0];
      const cards = t.checklist
        ? `<section class="panel"><ul class="checklist">${t.checklist.map((c, i) => `<li><label><input type="checkbox" data-examcheck="${i}" ${ui.examChecks[i] ? "checked" : ""}> ${esc(c)}</label></li>`).join("")}</ul></section>`
        : t.cards.map((c, i) => `
          <details class="strat" ${i === 0 ? "open" : ""}>
            <summary>${esc(c.title)}</summary>
            <div class="body"><p>${esc(c.body)}</p><div class="try"><b>Try it:</b> ${esc(c.try)}</div></div>
          </details>`).join("");
      body = `
        <div class="lab-intro"><div class="big-emoji" aria-hidden="true">${t.emoji}</div><div><h2 style="margin:0 0 4px">${t.title}</h2><p class="muted" style="margin:0">${esc(t.blurb)}</p></div></div>
        ${cards}
        ${t.id === "testday" ? `<p class="small" style="margin-top:14px">Have extended time? <a href="#time">See how to pace it</a>.</p>` : ""}`;
    }

    return `
      <div class="page-head"><h1>Strategy lab</h1><p>Short, science-backed ways to study, take tests, and stay balanced.</p></div>
      <div class="lab-nav" role="group" aria-label="Topics">${tabs}</div>
      ${body}`;
  }

  /* ======================================================================
     EXTENDED TIME
     ====================================================================== */
  function pageTime() {
    const s = st();
    const a = s.accom;
    const base = CFG.EXAM_MINUTES;
    const total = S.examMinutes();
    const preview = Math.round(total * 0.07);
    const check = Math.round(total * 0.15);
    const answer = total - preview - check;
    const half = preview + Math.round(answer / 2);
    const E = C.extended;
    const opts = [["none", "No"], ["1.5", "Time and a half"], ["2", "Double time"], ["custom", "Something else"]];

    return `
      <div class="page-head"><h1>Extended time</h1><p>If you have extended time, it's yours to use. Here's why it matters and how to make every minute count.</p></div>

      <div class="grid two">
        <section class="panel">
          <h3>My exam time</h3>
          <div class="field"><label>Do you have extended time on exams?</label>
            <div class="seg">${opts.map(([v, l]) => `<button type="button" data-act="set" data-path="accom.extended" data-plan="1" data-v="${v}" aria-pressed="${a.extended === v}">${l}</button>`).join("")}</div>
          </div>
          ${a.extended === "custom" ? `<div class="field"><label for="cm">Total minutes per exam</label><input id="cm" type="number" min="${base}" max="300" data-bind="accom.customMinutes" data-plan="1" data-rerender="1" value="${esc(a.customMinutes)}" style="max-width:160px"></div>` : ""}
          <p class="muted small">Not sure? Ask your advisor or learning specialist. This stays in your own plan.</p>
          <div class="bignum">${total} min</div>
          <p>${total > base ? `That's ${total - base} more minutes than the standard ${base}.` : `The standard exam time is ${base} minutes.`}</p>
        </section>

        <section class="panel">
          <h3>A pacing plan for ${total} minutes</h3>
          <div class="pace" role="img" aria-label="Preview ${preview} minutes, answer ${answer} minutes, check ${check} minutes">
            <div class="p1" style="flex:${preview}">${preview}m</div>
            <div class="p2" style="flex:${answer}">Answer: ${answer} min</div>
            <div class="p3" style="flex:${check}">Check ${check}m</div>
          </div>
          <div class="pace-label"><span>Start</span><span>Minute ${half}: about halfway</span><span>Minute ${total}</span></div>
          <ol style="margin-top:14px">
            <li><b>Preview (${preview} min):</b> flip through the exam, find the big-point sections, and jot down anything you're afraid you'll forget.</li>
            <li><b>Answer (${answer} min):</b> do what you know first, circle hard questions, and come back. Around minute ${half}, check that you're about halfway.</li>
            <li><b>Check (${check} min):</b> answer every circled question, reread written answers, and recheck math.</li>
          </ol>
          ${s.plan && total > base ? `<p class="small muted">Your practice exam sessions remind you to practice with all ${total} minutes.</p>` : ""}
        </section>
      </div>

      <h2 style="margin-top:30px">Why extended time matters</h2>
      <div class="grid two">${E.why.map(w => `<section class="panel"><h3>${esc(w.title)}</h3><p style="margin:0">${esc(w.body)}</p></section>`).join("")}</div>

      <div class="grid two" style="margin-top:20px">
        <section class="panel"><h3>Slow down on purpose</h3><ul>${E.slowDown.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>
        <section class="panel"><h3>Speak up</h3><ul>${E.talk.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="try small"><b>Say it like this:</b> "Hi, I have extended time on exams. Can you tell me where I'll take the ${esc(S.className("english"))} exam?"</div>
        </section>
      </div>`;
  }

  /* ---------- MindPrint report upload ---------- */
  async function handleMindprint(file) {
    toast("Reading your report...");
    const rec = { name: file.name, link: "" };
    if (window.Drive.user) {
      try {
        const r = await window.Drive.uploadToSubfolder(file, "MindPrint", "mindprintFolderId", `MindPrint report - ${file.name}`);
        rec.link = r.webViewLink || "";
      } catch (err) { toast(`Couldn't save to Drive: ${err.message}`); }
    }
    st().mindprintReport = rec;
    save();
    let found = null;
    let readable = true;
    try {
      const text = await window.StudyGuide.extract(file);
      if (text == null) readable = false;
      else found = window.StudyGuide.readMindprint(text);
    } catch (e) { readable = false; }
    render();
    if (found && Object.keys(found.order || {}).length) reviewMindprint(found);
    else openModal(`<div class="modal-body"><h3>Your report is saved</h3>
      <p>${readable ? "Exam Prep HQ couldn't find the “My Profile” boxes in this file." : "Exam Prep HQ can't read photos or this file type automatically."}
      Keep your report open and put the skills in each box in the same order. It takes about a minute.</p></div>
      <div class="modal-foot"><button class="btn" data-act="modal-close">OK</button></div>`);
  }

  function reviewMindprint(found) {
    const MP = C.mindprint;
    const cats = MP.domains.filter(d => found.order[d.id]);
    const missing = MP.domains.filter(d => !found.order[d.id]);
    openModal(`
      <form method="dialog">
        <div class="modal-body">
          <h3>Here's what we read from your report</h3>
          <p class="muted">Compare this with the "My Profile" boxes on your report. You can fix the order afterward with ▲ and ▼.</p>
          <div class="mp-boxes compact">${cats.map(d => `
            <div class="mp-box">
              <div class="mp-box-head"><h4>${esc(d.name)}</h4></div>
              <ol class="mp-rank">${found.order[d.id].map(id => `<li><span class="mp-name">${esc(MP.skills[id].name)}</span></li>`).join("")}</ol>
              ${found.top[d.id] ? `<p class="xs" style="margin:6px 0 0"><b>Top Strategy:</b> ${esc(found.top[d.id])}</p>` : ""}
            </div>`).join("")}</div>
          ${missing.length ? `<p class="small warn" style="margin-top:12px">We couldn't find the ${missing.map(d => d.name).join(" and ")} box. Put those skills in order yourself after you save.</p>` : ""}
          ${found.strategies.length ? `<p class="small" style="margin-top:12px">We also found <b>${found.strategies.length} recommended strategies</b> and will show you how to use them for exams.</p>` : ""}
          <fieldset style="border:0;padding:0;margin:14px 0 0">
            <legend style="font-weight:700;margin-bottom:6px">Which box is highlighted on your report? <span class="small muted" style="font-weight:500">(It's taller, with a colored border.)</span></legend>
            <div class="seg">${MP.domains.map(d => `<label class="seg-radio"><input type="radio" name="strongest" value="${d.id}"><span>${esc(d.name)}</span></label>`).join("")}
              <label class="seg-radio"><input type="radio" name="strongest" value="" checked><span>Not sure</span></label></div>
          </fieldset>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" data-act="modal-close">Cancel</button>
          <button class="btn" type="submit">Looks right, save it</button>
        </div>
      </form>`);
    $("#modal form").addEventListener("submit", ev => {
      ev.preventDefault();
      const m = st().mindprint;
      Object.assign(m.order, found.order);
      Object.assign(m.top, found.top);
      if (found.strategies.length) m.strategies = found.strategies;
      const pick = $("#modal input[name=strongest]:checked");
      if (pick && pick.value) m.strongest = pick.value;
      closeModal();
      save({ planInputs: true });
      render();
      toast("MindPrint profile saved. Your playbook is ready.");
    });
  }

  /* ---------- Google Calendar ---------- */
  async function syncGoogleCalendar() {
    const s = st();
    if (!s.plan) { toast("Build your plan first, then add it to Google Calendar."); return; }
    try {
      if (!window.Drive.user) await signIn(true);
      else await window.Drive.connectCalendar();
      if (!window.Drive.user) return;
      if (!window.Drive.hasCalendar()) throw new Error("Calendar permission wasn't given. Try again and check the Google Calendar box.");
      const events = window.Exports.googleEvents();
      toast("Adding to Google Calendar...");
      const n = await window.Drive.syncCalendar(events, (done, total) => {
        $("#toast").textContent = `Updating Google Calendar: ${Math.round(100 * done / total)}%`;
      });
      st().drive.calendarSyncedAt = Date.now();
      save({ now: true });
      render();
      openModal(`<div class="modal-body"><h3>It's on your Google Calendar</h3>
        <p>${n} events are in a new calendar called <b>Exam Prep HQ</b>. You'll get a reminder 10 minutes before each study session, the night before and 15 minutes before each tutorial, and at 6 p.m. the night before each exam.</p>
        <p class="small muted">Rebuilt your plan or added a tutorial? Press "Update Google Calendar" again and it replaces the old events. Your other calendars are never touched.</p></div>
        <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button><a class="btn" href="https://calendar.google.com" target="_blank" rel="noopener">Open Google Calendar</a></div>`);
    } catch (err) {
      toast(`Couldn't update Google Calendar: ${err.message}`);
    }
  }

  /* ======================================================================
     ROUTER + RENDER
     ====================================================================== */
  const PAGES = { home: pageHome, classes: pageClasses, calendar: pageCalendar, plan: pagePlan, tutorials: pageTutorials, mindprint: pageMindprint, lab: pageLab, time: pageTime };
  let lastRoute = null;

  function route() {
    const r = (location.hash || "#home").slice(1);
    return PAGES[r] ? r : "home";
  }

  function render() {
    const r = route();
    renderTabs(r);
    renderAccount();
    $("#main").innerHTML = PAGES[r]();
    const page = ROUTES.find(x => x.id === r);
    document.title = `${page.label} | Exam Prep HQ`;
    bindPage();
    if (r !== lastRoute) {
      if (lastRoute !== null) { window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); }
      lastRoute = r;
    }
  }

  // Re-render but put keyboard focus back on the same control.
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

  function bindPage() {
    $$("[data-mpdrop]").forEach(z => {
      z.addEventListener("dragover", e => { e.preventDefault(); z.classList.add("over"); });
      z.addEventListener("dragleave", () => z.classList.remove("over"));
      z.addEventListener("drop", e => {
        e.preventDefault(); z.classList.remove("over");
        if (e.dataTransfer.files.length) handleMindprint(e.dataTransfer.files[0]);
      });
    });
    // Drag and drop study guides
    $$("[data-drop]").forEach(z => {
      z.addEventListener("dragover", e => { e.preventDefault(); z.classList.add("over"); });
      z.addEventListener("dragleave", () => z.classList.remove("over"));
      z.addEventListener("drop", e => {
        e.preventDefault(); z.classList.remove("over");
        if (e.dataTransfer.files.length) handleFiles(z.dataset.drop, Array.from(e.dataTransfer.files));
      });
    });
  }

  /* ---------- Event delegation ---------- */
  document.addEventListener("click", async e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const s = st();

    switch (act) {
      case "set": {
        const v = el.dataset.num ? Number(el.dataset.v) : el.dataset.v;
        setPath(el.dataset.path, v);
        save({ planInputs: !!el.dataset.plan });
        rerenderKeepFocus(el);
        break;
      }
      case "class-conf": {
        const c = s.classes[el.dataset.class];
        const old = Number(c.confidence);
        c.confidence = Number(el.dataset.v);
        // Topics that still match the old overall rating follow the new one.
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
      case "topic-del": {
        const c = s.classes[el.dataset.class];
        c.topics = c.topics.filter(x => x.id !== el.dataset.id);
        save({ planInputs: true });
        render();
        break;
      }
      case "guide-del": {
        s.classes[el.dataset.class].guides.splice(Number(el.dataset.i), 1);
        save();
        render();
        toast("Removed from this list. If it's in your Drive folder, it's still there.");
        break;
      }
      case "paste": pasteModal(el.dataset.class); break;
      case "modal-close": closeModal(); break;

      case "preset": {
        ui.busyLabel = el.dataset.label;
        const input = $("#b-label");
        if (input) { input.value = el.dataset.label; input.focus(); }
        break;
      }
      case "busy-type": {
        ui.busyLabel = ($("#b-label") || {}).value || "";
        ui.busyType = el.dataset.v;
        rerenderKeepFocus(el);
        break;
      }
      case "busy-del": {
        s.busy = s.busy.filter(b => b.id !== el.dataset.id);
        save({ planInputs: true });
        render();
        break;
      }
      case "off-del": {
        s.prefs.offDates = s.prefs.offDates.filter(d => d !== el.dataset.d);
        save({ planInputs: true });
        render();
        break;
      }
      case "cal-done": s.calendarChecked = true; save(); break;

      case "build": buildPlan(); break;
      case "toggle-session": {
        const x = s.plan.sessions.find(y => y.id === el.dataset.id);
        if (x) {
          x.done = !x.done;
          if (x.done) toast(["Nice work.", "Another one done.", "That's how it's done.", "Progress."][Math.floor(Math.random() * 4)]);
        }
        save();
        rerenderKeepFocus(el);
        break;
      }
      case "filter": ui.planFilter = el.dataset.v; rerenderKeepFocus(el); break;
      case "reset": {
        if (confirm("Erase all your Exam Prep HQ classes, calendar, and plan? This can't be undone.")) {
          S.reset();
          ui.planFilter = "all";
          location.hash = "#home";
          render();
          toast("Everything's cleared. Fresh start.");
        }
        break;
      }

      case "exp-print": try { window.Exports.print(); } catch (err) { toast(err.message); } break;
      case "exp-word": window.Exports.word(); toast("Downloaded. Open it in Word to edit."); break;
      case "exp-csv": window.Exports.csv(); toast("Downloaded. Open it in Excel, Numbers, or Google Sheets."); break;
      case "exp-ics": window.Exports.ics(); calendarHelp(); break;
      case "exp-gdoc":
      case "exp-gsheet": {
        el.disabled = true;
        toast("Saving to your Drive...");
        try {
          const r = act === "exp-gdoc" ? await window.Exports.googleDoc() : await window.Exports.googleSheet();
          openModal(`<div class="modal-body"><h3>Saved to Google Drive</h3><p>"${esc(r.name)}" is in your ${esc(CFG.DRIVE_FOLDER_NAME)} folder, inside My Schedules. You can edit it however you like.</p></div>
            <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button><a class="btn" href="${esc(r.webViewLink)}" target="_blank" rel="noopener">Open it</a></div>`);
        } catch (err) { toast(`Couldn't save: ${err.message}`); }
        el.disabled = false;
        break;
      }

      case "mp-move": {
        const m = s.mindprint;
        const dom = C.mindprint.domains.find(d => d.id === el.dataset.cat);
        const list = (m.order[dom.id] || dom.skills).slice();
        const i = list.indexOf(el.dataset.skill), j = i + Number(el.dataset.dir);
        if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; }
        m.order[dom.id] = list;
        save({ planInputs: true });
        rerenderKeepFocus(el);
        break;
      }
      case "mp-confirm": {
        const dom = C.mindprint.domains.find(d => d.id === el.dataset.cat);
        s.mindprint.order[dom.id] = dom.skills.slice();
        save({ planInputs: true });
        render();
        break;
      }
      case "mp-strongest": {
        s.mindprint.strongest = s.mindprint.strongest === el.dataset.cat ? "" : el.dataset.cat;
        save({ planInputs: true });
        rerenderKeepFocus(el);
        break;
      }
      case "mp-clear": s.mindprint = { order: {}, strongest: "", top: {}, strategies: [] }; save({ planInputs: true }); render(); break;
      case "mp-report-del": s.mindprintReport = null; save(); render(); toast("Removed from this list. If it's in your Drive folder, it's still there."); break;

      case "tut-done": {
        const t = s.tutorials.find(x => x.id === el.dataset.id);
        if (t) {
          t.done = !t.done;
          if (t.done) toast("Nice. Rerate that topic on My classes if it feels better now.");
        }
        s.tutorialsUpdatedAt = Date.now();
        save();
        rerenderKeepFocus(el);
        break;
      }
      case "tut-del": {
        s.tutorials = s.tutorials.filter(x => x.id !== el.dataset.id);
        s.tutorialsUpdatedAt = Date.now();
        save({ planInputs: true });
        render();
        break;
      }
      case "exp-gcal": await syncGoogleCalendar(); break;

      case "lab-tab": ui.labTab = el.dataset.v; rerenderKeepFocus(el); break;
      case "lab-go": ui.labTab = el.dataset.tab; break;
      case "flip": ui.flipped[el.dataset.i] = !ui.flipped[el.dataset.i]; el.setAttribute("aria-pressed", String(!!ui.flipped[el.dataset.i])); break;

      case "signin":
      case "reconnect": await signIn(false); break;
      case "account-menu": {
        const u = window.Drive.user;
        openModal(`<div class="modal-body"><h3>Signed in</h3><p>${esc(u.name || "")}<br><span class="muted">${esc(u.email || "")}</span></p>
          <p class="small muted">Your plan saves to the "${esc(CFG.DRIVE_FOLDER_NAME)}" folder in your Google Drive. Exam Prep HQ can only see files it made, not the rest of your Drive.</p></div>
          <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Close</button><button class="btn" data-act="signout">Sign out</button></div>`);
        break;
      }
      case "signout": {
        window.Drive.signOut();
        ui.sync = "local";
        closeModal();
        render();
        toast("Signed out. Your plan is still saved on this device.");
        break;
      }
    }
  });

  // Text inputs bound to state
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
  });

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
      } else {
        item.date = $("#b-date").value;
      }
      st().busy.push(item);
      ui.busyLabel = "";
      save({ planInputs: true });
      render();
      toast(`Added ${label}.`);
    }
    if (f.dataset.tutform !== undefined) {
      e.preventDefault();
      const start = $("#t-start").value, end = $("#t-end").value, date = $("#t-date").value;
      if (!date) { toast("Pick a date."); return; }
      if (end <= start) { toast("The end time needs to be after the start time."); return; }
      const classId = $("#t-class").value;
      st().tutorials.push({ id: uid(), classId, date, start, end, done: false });
      st().tutorialsUpdatedAt = Date.now();
      save({ planInputs: true });
      render();
      toast(`Added ${S.className(classId)} tutorial on ${D.pretty(date)}.`);
      return;
    }
    if (f.dataset.offform !== undefined) {
      e.preventDefault();
      const d = $("#off-date").value;
      if (d && !st().prefs.offDates.includes(d)) st().prefs.offDates.push(d);
      save({ planInputs: true });
      render();
    }
  });

  function calendarHelp() {
    openModal(`<div class="modal-body"><h3>Add your plan to a calendar</h3>
      <p><b>Google Calendar:</b> on a computer, open Google Calendar, click the gear (Settings), choose Import &amp; export, then pick the "Exam Prep Plan.ics" file you just downloaded.</p>
      <p><b>Apple Calendar:</b> double-click the downloaded file and choose which calendar to add it to.</p>
      <p class="small muted">Tip: import it into a new calendar named "Exam Prep" so it's easy to remove later if you rebuild your plan.</p></div>
      <div class="modal-foot"><button class="btn" data-act="modal-close">Got it</button></div>`);
  }

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
    try {
      await window.Drive.saveData(state);
      S.persistLocal();
      ui.sync = "saved";
    } catch (err) {
      ui.sync = "error";
    }
    renderAccount();
  });

  /* ---------- Start ---------- */
  window.addEventListener("hashchange", render);
  renderBrand();
  render();
  if (window.Drive.enabled()) window.Drive.init().catch(() => {});
})();
