/* ==========================================================================
   PREP HQ: THE PLAN BUILDER
   Turns grades, study guide topics, confidence, busy times, and MindPrint
   info into spaced study sessions that finish before each exam.
   ========================================================================== */
(function () {
  const CFG = window.PREP_CONFIG;
  const { D, uid } = window.Store;

  /* ---------- Free time on one day ---------- */
  function busyOn(state, date) {
    const dow = D.dow(date);
    const tut = (state.tutorials || []).filter(t => t.date === date && t.start && t.end).map(t => [D.toMin(t.start), D.toMin(t.end)])
      .concat((state.skips || []).filter(k => k.date === date).map(k => [D.toMin(k.start), D.toMin(k.end)]));
    return tut.concat(state.busy
      .filter(b => (b.type === "weekly" && (b.days || []).includes(dow)) || (b.type === "once" && b.date === date))
      .filter(b => b.start && b.end)
      .map(b => [D.toMin(b.start), D.toMin(b.end)]));
  }

  function subtract(win, blocks) {
    let free = [win];
    blocks.forEach(([bs, be]) => {
      const next = [];
      free.forEach(([fs, fe]) => {
        if (be <= fs || bs >= fe) { next.push([fs, fe]); return; }
        if (bs > fs) next.push([fs, bs]);
        if (be < fe) next.push([be, fe]);
      });
      free = next;
    });
    return free;
  }

  function buildSlots(state, startDate) {
    const p = state.prefs;
    const exams = CFG.EXAMS;
    const examDates = new Set(exams.map(e => e.date));
    const lastExam = exams.map(e => e.date).sort().slice(-1)[0];
    const len = Number(p.sessionLen) || 30;
    const slots = [];
    for (let d = startDate; d < lastExam; d = D.addDays(d, 1)) {
      if ((p.offDates || []).includes(d)) continue;
      if (Number(p.freeDay) >= 0 && D.dow(d) === Number(p.freeDay) && !examDates.has(D.addDays(d, 1))) continue;
      const weekend = D.isWeekend(d);
      const win = weekend ? [D.toMin(p.weekendStart), D.toMin(p.weekendEnd)] : [D.toMin(p.weekdayStart), D.toMin(p.weekdayEnd)];
      if (!(win[1] > win[0])) continue;
      let cap = Number(weekend ? p.maxWeekend : p.maxWeekday) || 0;
      if (examDates.has(d)) cap = Math.max(1, cap - 1);   // lighter load on exam days
      if (d === D.today()) {
        // Don't schedule sessions that have already started today.
        const now = new Date();
        win[0] = Math.max(win[0], Math.ceil((now.getHours() * 60 + now.getMinutes() + 10) / 15) * 15);
      }
      let count = 0;
      subtract(win, busyOn(state, d)).forEach(([a, b]) => {
        let t = a;
        while (t + len <= b && count < cap) {
          slots.push({ date: d, start: t, end: t + len });
          count++;
          // 10-minute break after each session. With extra breaks on, the session's own
          // mini-breaks (5 minutes between 15-minute sprints) are added on top, so study time stays the same.
          t += len + 10 + (p.extraBreaks ? 5 * (Math.ceil(len / 15) - 1) : 0);
        }
      });
    }
    return slots;
  }

  /* ---------- Tasks: what needs to be studied ---------- */
  // Split a long list into even groups of about 3 ("Grammar" with 7 parts -> 3 + 2 + 2).
  function chunk(list) {
    const groups = Math.ceil(list.length / 3);
    const out = [];
    let i = 0;
    for (let g = 0; g < groups; g++) {
      const size = Math.ceil((list.length - i) / (groups - g));
      out.push(list.slice(i, i + size));
      i += size;
    }
    return out;
  }

  function topicsFor(state, examId) {
    const cls = state.classes[examId];
    if (cls.topics && cls.topics.length) {
      const out = [];
      cls.topics.filter(t => t.text && t.text.trim()).forEach(t => {
        const details = (t.details || []).filter(Boolean);
        if (details.length > 4) {
          // Big sections become smaller study sessions, each with the same rating.
          chunk(details).forEach((part, k) => out.push({ id: `${t.id}-p${k}`, baseId: t.id, name: t.text, items: part, text: `${t.text}: ${part.join(", ")}`, conf: t.conf, isPart: true, resources: t.resources || [] }));
        } else {
          out.push({ id: t.id, baseId: t.id, name: t.text, items: details, text: details.length ? `${t.text}: ${details.join(", ")}` : t.text, conf: t.conf, resources: t.resources || [] });
        }
      });
      return out;
    }
    return (window.CONTENT.defaultTopics[examId] || ["Study guide review"]).map((text, i) => ({
      id: `default-${examId}-${i}`, text, conf: Number(cls.confidence) || 3, isDefault: true
    }));
  }

  function buildTasks(state) {
    const tasks = [];
    CFG.EXAMS.forEach(e => {
      const cls = state.classes[e.id];
      const grade = window.Store.gradeNum(cls.grade);
      const deadline = D.addDays(e.date, -1);
      topicsFor(state, e.id).forEach(t => {
        const conf = Number(t.conf) || Number(cls.confidence) || 3;
        let reps = conf <= 2 ? 3 : conf === 3 ? 2 : 1;
        if (t.isPart) reps = Math.min(reps, 2);   // parts are smaller, so 2 rounds is plenty
        if (!isNaN(grade) && grade < 80 && conf <= 3 && !t.isPart) reps = Math.min(4, reps + 1);
        if (!isNaN(grade) && grade >= 93 && conf >= 4) reps = 1;
        const weight = (6 - conf) + (isNaN(grade) ? 0 : grade < 80 ? 2 : grade < 88 ? 1 : 0);
        for (let r = 0; r < reps; r++) {
          const kind = r === 0 ? "rebuild" : (r === reps - 1 && reps >= 3 ? "mix" : "quiz");
          tasks.push({ classId: e.id, topicId: t.id, baseId: t.baseId || t.id, topicText: t.text, name: t.name || t.text, items: t.items || [], resources: t.resources || [], rep: r, reps, kind, weight, deadline, earliest: null, done: false });
        }
      });
      const allRes = [];
      topicsFor(state, e.id).forEach(t => (t.resources || []).forEach(r => { if (!allRes.includes(r)) allRes.push(r); }));
      tasks.push({ classId: e.id, topicId: "final", baseId: "final", topicText: "Whole study guide", resources: allRes.slice(0, 3), rep: 99, kind: "test", weight: 99, deadline, earliest: D.addDays(e.date, -3), done: false });

      // Every class gets at least MIN_SESSIONS study sessions (plus its practice exam),
      // even if the student skipped its study guide or feels great about it.
      const MIN_SESSIONS = 5;
      const mine = tasks.filter(t => t.classId === e.id && t.kind !== "test");
      const firsts = mine.filter(t => t.rep === 0);
      let k = 0;
      while (mine.length < MIN_SESSIONS && firsts.length && k < 20) {
        const base = firsts[k % firsts.length];
        const reps = tasks.filter(t => t.classId === e.id && t.topicId === base.topicId && t.kind !== "test").length;
        const extra = Object.assign({}, base, { rep: reps, kind: "review", done: false, earliest: null });
        tasks.push(extra); mine.push(extra); k++;
      }
    });
    return tasks;
  }

  /* ---------- Personalized tips ---------- */
  function mp(state, skill) { return window.Store.mpLevel(skill); }
  const has = name => window.Store.mpHasStrategy(name);

  // What kind of topic is this? Used to pick a study method that fits.
  // The section name ("Figures of Speech: ...") decides first, then the details.
  function kindOf(task) {
    const full = (task.topicText || "").toLowerCase();
    const name = full.split(":")[0];
    const k = kindOfText(name, task.classId);
    return k !== "general" ? k : kindOfText(full, task.classId);
  }
  function kindOfText(t, classId) {
    const task = { classId };
    if (task.classId === "math" || /\b(equation|slope|function|graph|fraction|ratio|algebra|geometry|integer|expression|inequalit|probabilit|statistic)/.test(t)) return "math";
    if (/\b(grammar|comma|semicolon|participle|gerund|infinitive|verbal|voice|fragment|run-on|punctuation|clause|phrase|sentence|verb tense|conjugat|agreement)/.test(t)) return "grammar";
    if (/\b(vocab|word list|key terms|terms|definitions)/.test(t)) return "vocab";
    if (/\b(figure|figurative|simile|metaphor|literary (terms|devices)|personification|irony)/.test(t)) return "devices";
    if (/\b(writing|essay|paragraph|thesis|response)/.test(t)) return "writing";
    if (/\b(literature|shakespeare|story|stories|novel|play|poem|poetry|chapter|act |character|theme|reading|passage)/.test(t)) return "literature";
    if (/\b(people|dates|events|war|revolution|empire|government|map|document|cause)/.test(t)) return "history";
    if (/\b(lab|diagram|process|cycle|cell|photosynth|genetic|punnett|force|energy|ecosystem|element|reaction)/.test(t)) return "science";
    return "general";
  }

  /* ---------- Overview + numbered steps, built from the study guide ---------- */
  const joinList = list => list.length <= 1 ? (list[0] || "") : list.length === 2 ? `${list[0]} and ${list[1]}` : `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
  // "Review sheets pgs. 2-5" -> "review sheets pgs. 2-5" (keeps names like "Veracross" capitalized)
  const lc = t => /^[A-Z][a-z]/.test(t) && !/^(Veracross|Quizlet|Google|Shakespeare|The )/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;

  // Pick the teacher's resources that fit a purpose: strong matches first, then weaker ones.
  function pickRes(res, purpose) {
    const R = res || [];
    const tests = {
      learn: [/review sheet|study guide|notes|slideshow|handout|lesson/i, /pg|page|packet/i],
      practice: [/practice|workbook|worksheet|problem|exercise/i, /pretest|quizlet|packet/i],
      check: [/test analysis|old (quiz|test)|answer|key/i, /review sheet|quiz/i],
      vocab: [/vocab|word list|flashcard/i, /quizlet|pretest|list/i]
    };
    for (const re of tests[purpose]) { const hit = R.filter(r => re.test(r)); if (hit.length) return hit.slice(0, 2).map(lc); }
    return R.slice(0, 2).map(lc);
  }

  function otherTopics(state, task, n) {
    return topicsFor(state, task.classId).map(t => t.name || t.text)
      .filter((v, i, a) => a.indexOf(v) === i && v !== task.name).slice(0, n);
  }

  function buildSteps(task, state) {
    const kind = kindOf(task);
    const name = task.name || task.topicText;
    const items = (task.items || []).length ? task.items : [];
    const what = items.length ? joinList(items) : name;
    const res = task.resources || [];
    const learn = pickRes(res, "learn"), practice = pickRes(res, "practice"), check = pickRes(res, "check"), vocab = pickRes(res, "vocab");
    const open = list => list.length ? `Open your ${list[0]}${list[1] ? ` (also helpful: ${list[1]})` : ""}.` : "Open your notes, study guide, and old quizzes for this topic.";
    const one = list => list.length ? list[0] : "";
    const fromGuide = res.length > 0;
    let overview = "", steps = [];

    if (task.kind === "gear") {
      overview = "Get everything in one place so the rest of your sessions go faster.";
      steps = ["Find each class's study guide, notes, and old quizzes.", "Put each class's materials in one folder (paper or digital).", "On My classes, check that each class shows “✓ Study guide loaded.” If one doesn't, upload it there.", "Star any old quiz questions you got wrong. Those are great to review."];
      return { overview, steps };
    }

    if (task.kind === "test") {
      const all = otherTopics(state, task, 8);
      const g = window.GUIDES && state.classes[task.classId] && state.classes[task.classId].course ? window.GUIDES[state.classes[task.classId].course] : null;
      overview = `Practice exam: a run-through of the whole ${window.Store.className(task.classId)} study guide, the day before the real thing.`;
      steps = [
        `${res.length ? `Gather your ${joinList(res.slice(0, 3).map(lc))}` : "Gather your study guide"} and any old quizzes.`,
        `Without notes, answer questions from every section${all.length ? `: ${joinList(all)}` : ""}.`,
        "Check your answers against the study guide. Mark everything you missed.",
        "Spend the last few minutes on just the parts you missed.",
        `Pack your bag for tomorrow${g && g.bring ? `: ${lc(g.bring)}` : ""}.`
      ];
      return { overview, steps };
    }

    if (task.kind === "rebuild") {
      overview = `First round on ${name}. ${fromGuide ? "Use your teacher's materials to build" : "Build"} a study tool you'll use again.`;
      const s1 = open(learn);
      const map = {
        grammar: [s1, `Read the rule for each: ${what}.`, `On a fresh page, redo the practice sentences for ${what} without looking at your old answers.`, `Check your work${check.length ? ` with your ${one(check)}` : ""} and circle anything you missed.`, "For each one you missed, write the rule in your own words."],
        devices: [s1, `For each one (${what}), write the definition in your own words.`, "Write your own example for each.", "Find one real example of each in something you've read this semester."],
        vocab: [open(vocab.length ? vocab : learn), `Make flashcards for ${what}: the word on the front, the meaning and your own sentence on the back.`, "Say each word and its meaning out loud.", "Put the ones you don't know yet in a separate pile."],
        literature: [s1, `For ${what}, write the main characters, setting, what happens, and the big themes.`, "Add one important moment or quote for each.", "Explain each one out loud in about a minute."],
        writing: [s1, `Write the parts of the ${what} from memory.`, `Check them against your ${learn.length ? one(learn) : "notes"} and fix anything you missed.`, "Outline one practice paragraph using that format."],
        math: [s1, `Find the examples for ${what} and redo 3 of them, showing every step.`, `Try 3 similar problems on your own${practice.length && one(practice) !== one(learn) ? ` from your ${one(practice)}` : ""}.`, "Check your answers. For each mistake, write what went wrong."],
        history: [s1, `Make a timeline or cause-and-effect chart for ${what}.`, "Add the key people, places, and dates.", "Explain it out loud from start to finish."],
        science: [s1, `Draw and label the key diagram or process for ${what} from memory.`, "Check it against your notes and fix or color the parts you missed.", "Explain each step out loud."],
        general: [s1, `Write a question and answer for each part of ${what}.`, "Read through them once, then cover the answers and quiz yourself.", "Put a star by anything you missed."]
      };
      steps = map[kind] || map.general;
    } else if (task.kind === "quiz" || task.kind === "review") {
      const quick = task.kind === "review";
      overview = quick
        ? `Quick review of ${name} to keep it fresh.`
        : `Practice round on ${name}. Pull it from memory, then check. This is what makes it stick.`;
      const practiceStep = {
        grammar: `Redo the ${what} practice sentences${practice.length ? ` from your ${one(practice)}` : ""} without notes.`,
        devices: `Cover the definitions. Name each one (${what}) and give an example from memory.`,
        vocab: `Quiz yourself with your flashcards${vocab.length ? ` or your ${one(vocab)}` : ""}. Go through the misses twice.`,
        literature: `Without notes, answer for ${what}: Who are the main characters? What happens? Why does it matter?`,
        writing: `Write one practice paragraph in 15 minutes using the ${what}.`,
        math: `Do 6 practice problems on ${what}${practice.length ? ` from your ${one(practice)}` : ""} without notes.`,
        history: `Without notes, explain the causes, events, and results for ${what}.`,
        science: `Without notes, explain ${what} step by step, or redraw the diagram.`,
        general: `Without notes, answer your own questions about ${what}.`
      }[kind] || `Without notes, answer your own questions about ${what}.`;
      steps = quick
        ? [open(check.length ? check : learn), `Look over ${what}. Spend extra time on anything you missed last time.`, practiceStep, "Circle anything that's still shaky."]
        : [`Close everything. On a blank page, write all you remember about ${what} for 5 minutes.`, `Now open your ${learn.length ? one(learn) : "notes"} and check. Fill in what you missed in a different color.`, practiceStep, "Circle what you missed. That's your focus next time."];
    } else if (task.kind === "mix") {
      const others = otherTopics(state, task, 2);
      overview = `Mix it up. Practice ${name} together with other topics, the way the exam will.`;
      steps = [
        others.length ? `Pick a few questions on ${what}, plus a few on ${joinList(others)}.` : `Pick practice questions on ${what} and on other units.`,
        `Shuffle them and answer them without notes${practice.length ? ` (use your ${one(practice)})` : ""}.`,
        `Check your answers${check.length ? ` with your ${one(check)}` : ""}.`,
        `Teach ${name} out loud to someone (or a pet) in 2 minutes.`
      ];
    }
    return { overview, steps };
  }

  function tipFor(task, state) {
    const subj = task.classId;
    const kind = kindOf(task);
    const { overview, steps } = buildSteps(task, state);
    const extras = [];
    if (task.kind === "test") {
      if (has("Make a Test Plan") || mp(state, "speed") === "support") extras.push("Start by making a test plan: which sections first and how long for each.");
      if (has("Use a Visual Timer")) extras.push("Use a visual timer.");
      const mins = window.Store.examMinutes();
      extras.push(`The real exam is ${mins} minutes${mins > CFG.EXAM_MINUTES ? " with your extended time" : ""}.`);
    } else if (task.kind !== "gear") {
      if (kind === "math" && (has("Talk Through Math Problems") || mp(state, "verbal") === "strength")) extras.push("Talk through each step out loud.");
      else if (kind !== "math" && (has("Say it Aloud to Remember") || mp(state, "verbalMemory") === "strength")) extras.push("Say key ideas out loud as you go.");
      if ((task.kind === "quiz" || task.kind === "review") && has("Pause to Take Feedback")) extras.push("Pause to look at what you missed before moving on.");
      if (task.kind === "rebuild" && (mp(state, "spatial") === "strength" || mp(state, "visualMemory") === "strength")) extras.push("Add sketches, arrows, or colors. Pictures help you remember.");
    }
    if (mp(state, "attention") === "support") extras.push("Split this into two short sprints with a movement break.");
    if (mp(state, "workingMemory") === "support" && (subj === "math" || subj === "science")) extras.push("Write every step down.");
    const tips = extras.filter(x => !(/out loud/i.test(x) && steps.some(st => /out loud/i.test(st)))).slice(0, 2);
    return { overview, steps, extra: tips.join(" ") };
  }

  function instructions(task, state) {
    const t = tipFor(task, state);
    const flat = `${t.overview} ${t.steps.map((x, i) => `${i + 1}. ${x}`).join(" ")}${t.extra ? ` Tip: ${t.extra}` : ""}`;
    return { overview: t.overview, steps: t.steps, extra: t.extra, tip: flat };
  }

  function titleFor(task, state) {
    const cls = window.Store.className(task.classId);
    switch (task.kind) {
      case "rebuild": return `${cls}: build it`;
      case "quiz": return `${cls}: quiz yourself`;
      case "mix": return `${cls}: mix and teach`;
      case "review": return `${cls}: quick review`;
      case "test": return `${cls}: practice exam`;
      case "gear": return "Gear check: get organized";
      default: return cls;
    }
  }

  /* ---------- The scheduler ---------- */
  function generate(state) {
    const today = D.today();
    const startDate = state.prefs.startDate > today ? state.prefs.startDate : today;
    const warnings = [];

    // Keep finished sessions from an earlier plan.
    const old = (state.plan && state.plan.sessions) || [];
    const kept = old.filter(s => s.done);

    const tasks = buildTasks(state);
    kept.forEach(s => {
      const match = tasks.find(t => !t.done && t.classId === s.classId && t.topicId === s.topicId && t.kind === s.kind);
      if (match) { match.done = true; match.doneDate = s.date; }
    });
    // Later reps can't happen before the next spacing gap after a finished rep.
    tasks.forEach(t => {
      if (t.done || t.kind === "test") return;
      const prev = tasks.find(x => x.done && x.classId === t.classId && x.topicId === t.topicId && x.rep === t.rep - 1);
      if (prev) t.earliest = D.addDays(prev.doneDate, 2);
    });

    const slots = buildSlots(state, startDate);
    const sessions = [];
    const place = (slot, task) => {
      slot.task = task;
      task.done = true; task.scheduled = slot.date;
      sessions.push({
        id: uid(), date: slot.date, start: D.toTime(slot.start), end: D.toTime(slot.end),
        classId: task.classId, topicId: task.topicId, baseId: task.baseId || task.topicId, topicText: task.topicText, resources: task.resources || [],
        kind: task.kind, title: titleFor(task, state), ...instructions(task, state), done: false
      });
    };

    // 1) Kick-off gear check in the very first slot (unless already done).
    if (!kept.some(s => s.kind === "gear") && slots.length) {
      place(slots[0], { classId: "general", topicId: "gear", topicText: "All classes", kind: "gear" });
    }

    // 2) Reserve a practice exam as close to each exam as possible (ideally the day before).
    CFG.EXAMS.forEach(e => {
      const t = tasks.find(x => x.classId === e.id && x.kind === "test" && !x.done);
      if (!t) return;
      const candidates = slots.filter(s => !s.task && s.date <= t.deadline && s.date >= t.earliest);
      const pick = candidates.reverse().find(s => !slots.some(o => o.task && o.date === s.date && o.task.kind === "test")) || candidates[0];
      if (pick) place(pick, t);
    });

    // 3) If there's lots of time, add extra quick reviews for the shakiest topics
    //    (more spaced retrieval), but leave about 1 in 5 slots free for real life.
    const openCount = slots.filter(s => !s.task).length;
    const todo = () => tasks.filter(t => !t.done && t.kind !== "test").length;
    const target = Math.floor(openCount * 0.8);
    const byNeed = [];
    CFG.EXAMS.forEach(e => topicsFor(state, e.id).forEach(t => {
      const first = tasks.find(x => x.classId === e.id && x.topicId === t.id && x.rep === 0);
      if (first) byNeed.push(first);
    }));
    byNeed.sort((a, b) => b.weight - a.weight);
    let guard = 0;
    while (todo() < target && byNeed.length && guard++ < 200) {
      const base = byNeed[guard % byNeed.length];
      const reps = tasks.filter(x => x.classId === base.classId && x.topicId === base.topicId && x.kind !== "test");
      if (reps.length >= 5) { if (byNeed.every(b => tasks.filter(x => x.classId === b.classId && x.topicId === b.topicId).length >= 5)) break; continue; }
      tasks.push(Object.assign({}, base, { rep: reps.length, kind: "review", done: false, earliest: null, scheduled: null }));
    }

    // Spread the free slots evenly, preferring the last slot of the day so evenings end earlier.
    const open = slots.filter(s => !s.task);
    const freeCount = Math.max(0, open.length - todo());
    for (let k = 0; k < freeCount; k++) {
      let idx = Math.min(open.length - 1, Math.floor((k + 0.5) * open.length / freeCount));
      const day = open[idx].date;
      const lastOfDay = open.map((s, j) => (s.date === day && !s.free ? j : -1)).filter(j => j >= 0).pop();
      if (lastOfDay !== undefined) idx = lastOfDay;
      if (!open[idx].free) open[idx].free = true;
    }

    // 4) Fill the rest, spreading classes out in proportion to how much each needs.
    const recent = [];
    const fill = (slot, i, list) => {
      const sameDay = slots.filter(s => s.date === slot.date && s.task).map(s => s.task);
      const prevTask = i > 0 && list[i - 1].date === slot.date ? list[i - 1].task : null;
      let best = null, bestScore = -1;

      CFG.EXAMS.forEach(e => {
        if (slot.date > D.addDays(e.date, -1)) return;
        const remaining = tasks.filter(t => t.classId === e.id && !t.done && t.kind !== "test");
        if (!remaining.length) return;
        const eligible = remaining.filter(t => {
          if (t.earliest && t.earliest > slot.date) return false;
          if (t.rep > 0 && !tasks.some(x => x.classId === t.classId && x.topicId === t.topicId && x.rep === t.rep - 1 && x.done)) return false;
          if (sameDay.some(x => x.classId === t.classId && x.topicId === t.topicId)) return false;
          return true;
        });
        if (!eligible.length) return;
        const avail = list.slice(i).filter(s => !s.task && s.date <= e.date).length || 1;
        let score = remaining.length / avail;
        const todayCount = sameDay.filter(x => x.classId === e.id).length;
        if (score < 1) {
          if (prevTask && prevTask.classId === e.id) score *= 0.5;
          if (todayCount >= 2) score *= 0.2;
          // Variety: a class that showed up in the last few sessions waits its turn.
          const lately = recent.slice(-3).filter(c => c === e.id).length;
          score *= Math.pow(0.5, lately);
        }
        if (score > bestScore) {
          bestScore = score;
          eligible.sort((a, b) => a.rep - b.rep || b.weight - a.weight);
          best = eligible[0];
        }
      });

      if (best) {
        place(slot, best);
        recent.push(best.classId);
        // Space the next round of this topic at least two days later (one if time is short).
        const next = tasks.find(t => t.classId === best.classId && t.topicId === best.topicId && t.rep === best.rep + 1);
        if (next) {
          let e = D.addDays(slot.date, 2);
          if (e > next.deadline) e = D.addDays(slot.date, 1);
          next.earliest = e;
        }
      }
    };
    const working = open.filter(s => !s.free);
    working.forEach((slot, i) => fill(slot, i, working));
    // Second pass: if anything is still left, use the free slots after all.
    if (tasks.some(t => !t.done)) {
      const spare = open.filter(s => s.free && !s.task);
      spare.forEach((slot, i) => fill(slot, i, spare));
    }

    // 5) Report anything that didn't fit.
    CFG.EXAMS.forEach(e => {
      const missing = tasks.filter(t => t.classId === e.id && !t.done);
      if (missing.length) {
        warnings.push(`${missing.length} ${window.Store.className(e.id)} session${missing.length > 1 ? "s" : ""} didn't fit before the exam. Try adding study time, shortening sessions, or removing a busy block.`);
      }
    });
    if (!slots.length) warnings.push("There's no open study time between now and exams. Check your study times and busy blocks.");

    const all = kept.concat(sessions).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    return { generatedAt: Date.now(), startDate, sessions: all, warnings, freeSlots: slots.filter(s => !s.task).length, totalSlots: slots.length };
  }

  // "Add a session today": one extra practice session, starting now, on the shakiest
  // topic for the soonest exam (skipping anything already done or scheduled today).
  function extraSession(state) {
    const today = D.today();
    const len = Number(state.prefs.sessionLen) || 30;
    const usedToday = new Set((state.plan ? state.plan.sessions : []).filter(x => x.date === today).map(x => x.classId + "|" + x.topicId));
    const cands = [];
    CFG.EXAMS.filter(e => e.date > today).forEach(e => {
      const days = D.diff(today, e.date);
      topicsFor(state, e.id).forEach(t => {
        if (usedToday.has(e.id + "|" + t.id)) return;
        const conf = Number(t.conf) || Number(state.classes[e.id].confidence) || 3;
        cands.push({ e, t, score: days + 3 * conf });
      });
    });
    if (!cands.length) return null;
    cands.sort((a, b) => a.score - b.score);
    const { e, t } = cands[0];
    const now = new Date();
    const startMin = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5;
    const task = { classId: e.id, topicId: t.id, baseId: t.baseId || t.id, topicText: t.text, name: t.name || t.text, items: t.items || [], resources: t.resources || [], kind: "quiz" };
    return {
      id: uid(), date: today, start: D.toTime(Math.min(startMin, 23 * 60)), end: D.toTime(Math.min(startMin + len, 23 * 60 + 59)),
      classId: e.id, topicId: t.id, baseId: task.baseId, topicText: t.text, resources: task.resources,
      kind: "quiz", isExtra: true, title: `${window.Store.className(e.id)}: extra practice`, ...instructions(task, state), done: false
    };
  }

  window.Planner = { generate, buildSlots, topicsFor, extraSession };
})();
