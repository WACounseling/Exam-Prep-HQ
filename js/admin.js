/* ==========================================================================
   EXAM PREP HQ: STUDY GUIDE MANAGER (staff page, admin.html)
   Load a study guide once per course. Students who pick that course get its
   topics automatically. Nothing goes live until guides.js is uploaded to GitHub.
   ========================================================================== */
(function () {
  const CFG = window.PREP_CONFIG;
  const DRAFT_KEY = "examPrepHQ.adminDraft";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const published = JSON.parse(JSON.stringify(window.GUIDES || {}));
  let guides = JSON.parse(JSON.stringify(published));
  let unsaved = false;
  // The guide being edited
  let edit = { courses: [], topics: [], examTime: "", bring: "", file: "", source: "", parts: [] };
  const PERIODS = ["A", "B", "C", "D", "E", "F", "G"];

  const EXAM_NAMES = Object.fromEntries(CFG.EXAMS.map(e => [e.id, e.name]));

  function saveDraft() {
    unsaved = JSON.stringify(guides) !== JSON.stringify(published);
    try { if (unsaved) localStorage.setItem(DRAFT_KEY, JSON.stringify(guides)); else localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
  }
  function openModal(html) { const m = $("#modal"); m.innerHTML = html; if (!m.open) m.showModal(); }
  function closeModal() { const m = $("#modal"); if (m.open) m.close(); }

  /* ---------- Page ---------- */
  function render() {
    const count = Object.keys(guides).length;
    const total = Object.values(CFG.COURSES).reduce((n, groups) => n + groups.reduce((m, g) => m + g.list.length, 0), 0);
    $("#main").innerHTML = `
      <div class="page-head">
        <h1>Study guide manager</h1>
        <p>Load each exam review guide once. Students who pick that class get its topics automatically. <b>Nothing changes for students until you download guides.js and upload it to GitHub</b> (step 3).</p>
      </div>
      ${unsaved ? `<div class="warn">You have changes that aren't on the site yet. When you're done, go to step 3 and download guides.js.</div>` : ""}

      <section class="panel">
        <h2 class="h3">1. Courses <span class="small muted" style="font-weight:500">${count} of ${total} have a guide</span></h2>
        <div class="course-groups">${Object.entries(CFG.COURSES).map(([examId, groups]) => groups.map(g => `
          <div class="course-group">
            <h3 class="h4">${esc(g.group)} <span class="xs muted">(${esc(EXAM_NAMES[examId])} exam)</span></h3>
            <ul class="course-list">${g.list.map(c => {
              const has = guides[c];
              return `<li class="${has ? "has" : ""}">
                <span class="c-name">${has ? "✓" : "○"} ${esc(c)}</span>
                <span class="c-meta xs">${has ? `${has.topics.length} topics, ${esc(has.updated || "")}` : "No guide yet"}</span>
                <span class="c-act">
                  <button class="linkish small" data-act="edit" data-course="${esc(c)}">${has ? "Edit" : "Add"}</button>
                  ${has ? `<button class="linkish small" data-act="remove" data-course="${esc(c)}">Remove</button>` : ""}
                </span>
              </li>`;
            }).join("")}</ul>
          </div>`).join("")).join("")}</div>
      </section>

      <section class="panel" id="editor" style="margin-top:20px">${editorHTML()}</section>

      <section class="panel" style="margin-top:20px">
        <h2 class="h3">3. Put it on the site</h2>
        <ol class="steps-list">
          <li><button class="btn" data-act="download">⬇️ Download guides.js</button></li>
          <li>On GitHub, open your repository, then the <b>js</b> folder, then <b>guides.js</b>. Click the <b>✏️ pencil</b>, select all, and paste the new file's contents. Or use <b>Add file &gt; Upload files</b> and drop the new guides.js into the js folder to replace it.</li>
          <li>Click <b>Commit changes</b>. Within a couple of minutes, students who picked those classes get the topics automatically.</li>
          <li><b>Optional:</b> to let students open the original PDF, upload it to a folder named <b>guides</b> in your repository, using the exact file name shown in the guide's “PDF link” box.</li>
        </ol>
        <p class="small muted">Your work is also saved in this browser, so you can close this page and continue later.</p>
      </section>`;
  }

  function editorHTML() {
    const chosen = new Set(edit.courses);
    const topics = edit.topics.map((t, i) => `
      <div class="t-row" data-i="${i}">
        <div class="t-head"><span class="t-num">${i + 1}</span>
          <input type="text" class="t-text" data-i="${i}" value="${esc(t.text)}" aria-label="Topic ${i + 1} name" placeholder="Topic name, like Grammar">
          <button class="icon-btn" data-act="t-up" data-i="${i}" aria-label="Move topic up" ${i === 0 ? "disabled" : ""}>▲</button>
          <button class="icon-btn" data-act="t-down" data-i="${i}" aria-label="Move topic down" ${i === edit.topics.length - 1 ? "disabled" : ""}>▼</button>
          <button class="icon-btn" data-act="t-del" data-i="${i}" aria-label="Remove topic">🗑️</button></div>
        ${edit.parts.length ? `<label class="t-part small">Practice for: <select class="t-partsel" data-i="${i}"><option value="">Exam day</option>${edit.parts.map(p => `<option value="${esc(p.name)}" ${t.part === p.name ? "selected" : ""}>${esc(p.name)} (in class)</option>`).join("")}</select></label>` : ""}
        <div class="t-cols">
          <label>What's covered <span class="xs muted">(one per line)</span><textarea class="t-details" data-i="${i}" rows="3">${esc((t.details || []).join("\n"))}</textarea></label>
          <label>How to study / what to use <span class="xs muted">(one per line)</span><textarea class="t-res" data-i="${i}" rows="3">${esc((t.resources || []).join("\n"))}</textarea></label>
        </div>
      </div>`).join("");

    return `
      <h2 class="h3">2. Add or update a guide</h2>
      <h3 class="h4">Which classes use this guide?</h3>
      <p class="small muted">Pick every class that uses the same review guide (for example, English 8 CP and English 8 EP).</p>
      <div class="pick-courses">${Object.values(CFG.COURSES).flat().map(g => `
        <fieldset><legend>${esc(g.group)}</legend>${g.list.map(c => `<label class="pc"><input type="checkbox" class="pick-course" value="${esc(c)}" ${chosen.has(c) ? "checked" : ""}> ${esc(c)}${guides[c] ? ' <span class="xs muted">✓</span>' : ""}</label>`).join("")}</fieldset>`).join("")}</div>

      <h3 class="h4" style="margin-top:18px">The study guide</h3>
      <div class="btn-row">
        <label class="drop small-drop" data-drop>
          <input type="file" accept=".pdf,.docx,.txt" id="guide-file">
          📤 Upload the study guide (PDF or Word)
        </label>
        <button class="btn ghost small" data-act="paste">Or paste its text</button>
        <button class="btn ghost small" data-act="t-add">+ Add a topic by hand</button>
      </div>
      ${edit.source ? `<p class="small">Read from <b>${esc(edit.source)}</b>. Check the topics below and fix anything that's off.</p>` : ""}

      ${edit.topics.length ? `<h3 class="h4" style="margin-top:18px">Topics students will see (${edit.topics.length})</h3><div class="t-list">${topics}</div>
        <button class="btn ghost small" data-act="t-add" style="margin-top:8px">+ Add a topic</button>` : `<p class="small muted" style="margin-top:12px">Upload or paste a guide to fill in topics, or add them by hand.</p>`}

      <h3 class="h4" style="margin-top:18px">In-class exam parts <span class="small muted" style="font-weight:500">(optional, like listening, essay, or speaking before exam day)</span></h3>
      <p class="small muted">Topics marked "Practice for" a part are planned to finish the day before that part.</p>
      <div class="parts-ed">${edit.parts.map((p, i) => `
        <div class="part-row" data-i="${i}">
          <input type="text" class="p-name" data-i="${i}" value="${esc(p.name)}" placeholder="Speaking" aria-label="Part ${i + 1} name">
          <label class="small"><input type="checkbox" class="p-byper" data-i="${i}" ${p.dates ? "checked" : ""}> Different dates by period</label>
          ${p.dates
            ? `<div class="p-periods">${PERIODS.map(k => `<label class="xs">${k}<input type="date" class="p-pdate" data-i="${i}" data-k="${k}" value="${esc((p.dates || {})[k] || "")}"></label>`).join("")}</div>`
            : `<input type="date" class="p-date" data-i="${i}" value="${esc(p.date || "")}" aria-label="Part ${i + 1} date">`}
          <button class="icon-btn" data-act="p-del" data-i="${i}" aria-label="Remove part">🗑️</button>
        </div>`).join("")}</div>
      <button class="btn ghost small" data-act="p-add">+ Add an in-class part</button>

      <h3 class="h4" style="margin-top:18px">Exam details <span class="small muted" style="font-weight:500">(optional, shown to students)</span></h3>
      <div class="fields">
        <div class="field"><label for="g-time">Exam time</label><input id="g-time" type="text" value="${esc(edit.examTime)}" placeholder="8:50 to 10 a.m."></div>
        <div class="field"><label for="g-bring">What to bring</label><input id="g-bring" type="text" value="${esc(edit.bring)}" placeholder="A pen, a pencil, and a highlighter"></div>
        <div class="field"><label for="g-file">PDF link <span class="xs muted">(file in the guides folder)</span></label><input id="g-file" type="text" value="${esc(edit.file)}" placeholder="guides/english-8-hp.pdf"></div>
      </div>

      <div class="btn-row" style="margin-top:12px">
        <button class="btn big" data-act="save">Save this guide</button>
        <button class="btn ghost" data-act="clear">Clear the form</button>
      </div>`;
  }

  /* ---------- Reading the form ---------- */
  function readForm() {
    edit.courses = $$(".pick-course:checked").map(i => i.value);
    $$(".t-text").forEach(i => { edit.topics[i.dataset.i].text = i.value; });
    $$(".t-details").forEach(i => { edit.topics[i.dataset.i].details = i.value.split("\n").map(x => x.trim()).filter(Boolean); });
    $$(".t-res").forEach(i => { edit.topics[i.dataset.i].resources = i.value.split("\n").map(x => x.trim()).filter(Boolean); });
    $$(".t-partsel").forEach(i => { edit.topics[i.dataset.i].part = i.value; });
    $$(".p-name").forEach(i => { edit.parts[i.dataset.i].name = i.value.trim(); });
    $$(".p-date").forEach(i => { edit.parts[i.dataset.i].date = i.value; });
    $$(".p-pdate").forEach(i => { const p = edit.parts[i.dataset.i]; p.dates = p.dates || {}; if (i.value) p.dates[i.dataset.k] = i.value; else delete p.dates[i.dataset.k]; });
    const t = $("#g-time"), b = $("#g-bring"), f = $("#g-file");
    if (t) edit.examTime = t.value.trim();
    if (b) edit.bring = b.value.trim();
    if (f) edit.file = f.value.trim();
  }
  function rerenderEditor() { $("#editor").innerHTML = editorHTML(); bindDrop(); }

  /* ---------- Reading a study guide ---------- */
  async function readFile(file) {
    readForm();
    toast(`Reading ${file.name}...`);
    try {
      const r = await window.StudyGuide.readGuide(file);
      if (!r.readable || !r.topics.length) { toast("Couldn't find topics in that file. Paste its text or add topics by hand."); return; }
      edit.topics = r.topics.map(t => ({ text: t.text, details: t.details || [], resources: t.resources || [] }));
      edit.source = file.name;
      if (!edit.file && /\.pdf$/i.test(file.name)) edit.file = `guides/${slug(edit.courses[0] || file.name.replace(/\.pdf$/i, ""))}.pdf`;
      rerenderEditor();
      toast(`Found ${edit.topics.length} topics. Check them below.`);
    } catch (e) {
      toast("Couldn't read that file. Paste its text instead.");
    }
  }

  function bindDrop() {
    const z = $("[data-drop]");
    if (!z) return;
    z.addEventListener("dragover", e => { e.preventDefault(); z.classList.add("over"); });
    z.addEventListener("dragleave", () => z.classList.remove("over"));
    z.addEventListener("drop", e => { e.preventDefault(); z.classList.remove("over"); if (e.dataTransfer.files.length) readFile(e.dataTransfer.files[0]); });
  }

  /* ---------- Actions ---------- */
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "edit") {
      const c = el.dataset.course, g = guides[c];
      edit = g ? { courses: Object.keys(guides).filter(k => JSON.stringify(guides[k].topics) === JSON.stringify(g.topics) && JSON.stringify(guides[k].parts || []) === JSON.stringify(g.parts || [])), topics: JSON.parse(JSON.stringify(g.topics)), examTime: g.examTime || "", bring: g.bring || "", file: g.file || "", source: "", parts: JSON.parse(JSON.stringify(g.parts || [])) }
               : { courses: [c], topics: [], examTime: "", bring: "", file: "", source: "", parts: [] };
      rerenderEditor();
      $("#editor").scrollIntoView({ behavior: "smooth" });
    }
    if (act === "remove") {
      const c = el.dataset.course;
      openModal(`<div class="modal-body"><h3>Remove the ${esc(c)} guide?</h3><p>Students who already have its topics keep them. New students won't get them. This goes live when you upload guides.js.</p></div>
        <div class="modal-foot"><button class="btn ghost" data-act="modal-close">Cancel</button><button class="btn" data-act="remove-yes" data-course="${esc(c)}">Remove</button></div>`);
    }
    if (act === "remove-yes") { delete guides[el.dataset.course]; saveDraft(); closeModal(); render(); bindDrop(); toast("Removed. Download guides.js to update the site."); }
    if (act === "modal-close") closeModal();
    if (act === "t-add") { readForm(); edit.topics.push({ text: "", details: [], resources: [] }); rerenderEditor(); const last = $$(".t-text").pop(); if (last) last.focus(); }
    if (act === "t-del") { readForm(); edit.topics.splice(Number(el.dataset.i), 1); rerenderEditor(); }
    if (act === "t-up" || act === "t-down") {
      readForm();
      const i = Number(el.dataset.i), j = i + (act === "t-up" ? -1 : 1);
      [edit.topics[i], edit.topics[j]] = [edit.topics[j], edit.topics[i]];
      rerenderEditor();
    }
    if (act === "paste") {
      readForm();
      openModal(`<form method="dialog"><div class="modal-body"><h3>Paste the study guide text</h3>
        <textarea id="paste-box" style="min-height:240px"></textarea></div>
        <div class="modal-foot"><button class="btn ghost" type="button" data-act="modal-close">Cancel</button><button class="btn" type="submit">Find topics</button></div></form>`);
      $("#modal form").addEventListener("submit", ev => {
        ev.preventDefault();
        const t = window.StudyGuide.readPasted($("#paste-box").value);
        closeModal();
        if (!t.length) { toast("Couldn't find topics. Add them by hand."); return; }
        edit.topics = t.map(x => ({ text: x.text, details: x.details || [], resources: x.resources || [] }));
        edit.source = "pasted text";
        rerenderEditor();
      });
    }
    if (act === "clear") { edit = { courses: [], topics: [], examTime: "", bring: "", file: "", source: "", parts: [] }; rerenderEditor(); }
    if (act === "p-add") { readForm(); edit.parts.push({ name: "", date: "" }); rerenderEditor(); const last = $$(".p-name").pop(); if (last) last.focus(); }
    if (act === "p-del") { readForm(); edit.parts.splice(Number(el.dataset.i), 1); rerenderEditor(); }
    if (act === "save") {
      readForm();
      const topics = edit.topics.filter(t => t.text.trim());
      if (!edit.courses.length) { toast("Pick at least one class for this guide."); return; }
      if (!topics.length) { toast("Add at least one topic."); return; }
      edit.courses.forEach(c => {
        const parts = edit.parts.filter(p => p.name && (p.date || (p.dates && Object.keys(p.dates).length)))
          .map(p => Object.assign({ name: p.name, where: "In class" }, p.dates && Object.keys(p.dates).length ? { dates: p.dates } : { date: p.date }));
        const names = new Set(parts.map(p => p.name));
        const clean = topics.map(t => { const x = Object.assign({}, t); if (!x.part || !names.has(x.part)) delete x.part; return x; });
        guides[c] = Object.assign({ updated: today(), file: edit.file, examTime: edit.examTime, bring: edit.bring, topics: JSON.parse(JSON.stringify(clean)) }, parts.length ? { parts } : {});
      });
      saveDraft();
      const names = edit.courses.join(", ");
      render(); bindDrop();
      toast(`Saved for ${names}. Download guides.js when you're done.`);
    }
    if (act === "download") {
      const sorted = Object.fromEntries(Object.keys(guides).sort().map(k => [k, guides[k]]));
      const header = `/* ==========================================================================
   EXAM PREP HQ: PRELOADED STUDY GUIDES
   One entry per course. Students who pick a course get its topics automatically.

   Don't edit this by hand: open admin.html on your site, add or update guides,
   then download the new guides.js and upload it here (replacing this file).
   Downloaded ${today()}.
   ========================================================================== */
`;
      const text = header + "window.GUIDES = " + JSON.stringify(sorted, null, 2) + ";\n";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
      a.download = "guides.js";
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast("Downloaded guides.js. Now upload it to the js folder on GitHub (step 3).");
    }
  });

  document.addEventListener("change", e => {
    if (e.target.classList.contains("p-byper")) {
      readForm();
      const p = edit.parts[e.target.dataset.i];
      if (e.target.checked) { p.dates = {}; delete p.date; } else { p.date = Object.values(p.dates || {}).sort()[0] || ""; delete p.dates; }
      rerenderEditor();
    }
    if (e.target.classList.contains("p-name")) { readForm(); rerenderEditor(); }
    if (e.target.id === "guide-file" && e.target.files.length) readFile(e.target.files[0]);
  });

  window.addEventListener("beforeunload", e => { if (unsaved) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Start: pick up an unfinished draft ---------- */
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { draft = null; }
  render(); bindDrop();
  if (draft && JSON.stringify(draft) !== JSON.stringify(published)) {
    openModal(`<div class="modal-body"><h3>Continue where you left off?</h3><p>You have guide changes in this browser that aren't on the site yet.</p></div>
      <div class="modal-foot"><button class="btn ghost" id="draft-no">Start from what's on the site</button><button class="btn" id="draft-yes">Continue</button></div>`);
    $("#draft-yes").addEventListener("click", () => { guides = draft; saveDraft(); closeModal(); render(); bindDrop(); });
    $("#draft-no").addEventListener("click", () => { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } closeModal(); });
  }
})();
