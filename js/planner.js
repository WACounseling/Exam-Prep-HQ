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
    const tut = (state.tutorials || []).filter(t => t.date === date && t.start && t.end).map(t => [D.toMin(t.start), D.toMin(t.end)]);
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
          t += len + 10; // 10-minute break between sessions
        }
      });
    }
    return slots;
  }

  /* ---------- Tasks: what needs to be studied ---------- */
  function topicsFor(state, examId) {
    const cls = state.classes[examId];
    if (cls.topics && cls.topics.length) return cls.topics.filter(t => t.text && t.text.trim());
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
        if (!isNaN(grade) && grade < 80 && conf <= 3) reps = Math.min(4, reps + 1);
        if (!isNaN(grade) && grade >= 93 && conf >= 4) reps = 1;
        const weight = (6 - conf) + (isNaN(grade) ? 0 : grade < 80 ? 2 : grade < 88 ? 1 : 0);
        for (let r = 0; r < reps; r++) {
          const kind = r === 0 ? "rebuild" : (r === reps - 1 && reps >= 3 ? "mix" : "quiz");
          tasks.push({ classId: e.id, topicId: t.id, topicText: t.text, rep: r, reps, kind, weight, deadline, earliest: null, done: false });
        }
      });
      tasks.push({ classId: e.id, topicId: "final", topicText: "Whole study guide", rep: 99, kind: "test", weight: 99, deadline, earliest: D.addDays(e.date, -3), done: false });
    });
    return tasks;
  }

  /* ---------- Personalized tips ---------- */
  function mp(state, skill) { return window.Store.mpLevel(skill); }
  const has = name => window.Store.mpHasStrategy(name);

  function tipFor(task, state) {
    const subj = task.classId;
    const strongVisual = mp(state, "spatial") === "strength" || mp(state, "visualMemory") === "strength";
    const strongVerbal = mp(state, "verbal") === "strength" || mp(state, "verbalMemory") === "strength";
    const extras = [];
    let tip = "";

    if (task.kind === "rebuild") {
      if (subj === "math") tip = "Redo 3 worked examples from your notes, then try 3 similar problems on your own.";
      else if (strongVisual) tip = "Turn your notes on this into a one-page concept map or sketch. Labels and arrows only.";
      else if (strongVerbal) tip = "Write a 5-sentence summary in your own words, then explain it out loud.";
      else if (subj === "lang") tip = "Make 10 flashcards: the word or phrase on one side, meaning and an example on the other.";
      else tip = "Make 10 flashcards with a question on the front and the answer on the back.";
    } else if (task.kind === "quiz") {
      if (subj === "math") tip = "Do 6 practice problems without notes. Then check and fix every mistake.";
      else tip = "Blurt it: write everything you remember for 5 minutes, then check your notes and fill gaps in a new color.";
    } else if (task.kind === "mix") {
      tip = subj === "math"
        ? "Mixed practice: pick problems from this topic and two others, shuffle them, and solve."
        : "Teach it: explain this topic out loud to someone (or a pet) without notes, then quiz yourself on what you skipped.";
    } else if (task.kind === "review") {
      tip = subj === "math"
        ? "Quick review: redo 4 problems you missed before, without looking at the answers first."
        : "Quick review: run through your flashcards or map. Set aside the ones you miss and go through those twice.";
    } else if (task.kind === "test") {
      const mins = window.Store.examMinutes();
      tip = `Practice exam: answer study guide items and old quiz questions without notes. The real exam is ${mins} minutes${mins > CFG.EXAM_MINUTES ? " with your extended time, so practice using all of it" : ""}. Finish by packing your bag for tomorrow.`;
      if (has("Make a Test Plan") || mp(state, "speed") === "support") extras.push("Start by making a test plan: which sections first and how long for each.");
      if (has("Use a Visual Timer")) extras.push("Use a visual timer.");
      if (has("Pause to Take Feedback")) extras.push("Afterward, pause and review every mistake.");
    } else if (task.kind === "gear") {
      tip = "Gather each class's study guide, notes, and old quizzes. Put each class in one folder and upload study guides to Exam Prep HQ.";
    }

    if (task.kind !== "test" && task.kind !== "gear") {
      if (subj === "math" && (has("Talk Through Math Problems") || mp(state, "verbal") === "strength")) extras.push("Talk through each step out loud.");
      else if (subj !== "math" && (has("Say it Aloud to Remember") || mp(state, "verbalMemory") === "strength")) extras.push("Say key ideas out loud as you go.");
      if ((task.kind === "quiz" || task.kind === "review") && has("Pause to Take Feedback")) extras.push("Pause to look at what you missed before moving on.");
    }
    if (mp(state, "attention") === "support") extras.push("Split this into two short sprints with a movement break.");
    if (mp(state, "workingMemory") === "support" && (subj === "math" || subj === "science")) extras.push("Write every step down.");
    // Skip extras that repeat what the main tip already says.
    const fresh = extras.filter(x => !(/out loud/i.test(x) && /out loud/i.test(tip)));
    return [tip].concat(fresh.slice(0, 2)).join(" ");
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
        classId: task.classId, topicId: task.topicId, topicText: task.topicText,
        kind: task.kind, title: titleFor(task, state), tip: tipFor(task, state), done: false
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

  window.Planner = { generate, buildSlots, topicsFor };
})();
