/* ==========================================================================
   PREP HQ: READING STUDY GUIDES
   Pulls text out of PDF, Word (.docx), and text files right in the browser,
   then guesses the list of topics. Students always get to edit the list.
   ========================================================================== */
(function () {
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const MAMMOTH = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";

  const loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve;
      s.onerror = () => reject(new Error("Couldn't load the file reader. Check your internet connection."));
      document.head.appendChild(s);
    });
    return loaded[src];
  }

  async function pdfText(file) {
    await loadScript(PDFJS);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines = [];
    for (let p = 1; p <= Math.min(doc.numPages, 20); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      // Group text pieces into lines by their vertical position.
      let lastY = null, line = "";
      content.items.forEach(it => {
        const y = Math.round(it.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line); line = ""; }
        line += (line && !line.endsWith(" ") && !it.str.startsWith(" ") ? " " : "") + it.str;
        lastY = y;
      });
      if (line) lines.push(line);
    }
    return lines.join("\n");
  }

  async function docxText(file) {
    await loadScript(MAMMOTH);
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }

  async function extract(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) return pdfText(file);
    if (name.endsWith(".docx")) return docxText(file);
    if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) return file.text();
    return null; // images, Google Docs shortcuts, etc.: student types topics instead
  }

  const SKIP = /^(name|date|period|class|teacher|page \d+|due|directions?:?|study guide|exam review|semester exam|final exam|score|points?)\b/i;

  function topicsFromText(text) {
    if (!text) return [];
    const raw = text.split(/\r?\n/).map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    const out = [];
    const seen = new Set();
    const add = t => {
      t = t.replace(/^[\s•●○◦▪■□✓✔\-–—*>]+/, "")
           .replace(/^(\(?[0-9]{1,2}[.)]|\(?[a-zA-Z][.)]|[ivxIVX]{1,4}[.)])\s+/, "")
           .replace(/[_]{2,}.*$/, "")
           .replace(/\s*[:.]+$/, "")
           .trim();
      if (t.length < 3 || t.length > 110) return;
      if (SKIP.test(t)) return;
      if (/^[\d\s.,-]+$/.test(t)) return;
      const key = t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(t);
    };

    // Pass 1: headings like "Unit 3: Ecosystems", "Chapter 4", "Topic", "Section".
    const heading = /^(unit|chapter|ch\.|topic|section|lesson|module|part|week)\s*[\dA-Z]+\b.*$/i;
    raw.forEach(l => { if (heading.test(l)) add(l); });

    // Pass 2: bullets and numbered items.
    if (out.length < 4) {
      const bullet = /^([•●○◦▪■□✓✔\-–*]|\(?\d{1,2}[.)]|\(?[a-z][.)]|[ivx]{1,4}[.)])\s+/i;
      raw.forEach(l => { if (bullet.test(l)) add(l); });
    }

    // Pass 3: short lines that look like titles (few words, starts with a capital).
    if (out.length < 4) {
      raw.forEach(l => {
        const words = l.split(" ").length;
        if (words >= 1 && words <= 8 && /^[A-Z]/.test(l) && !/[?]$/.test(l)) add(l);
      });
    }
    return out.slice(0, 30);
  }

  /* ---------- MindPrint report reader ----------
     Built for the MindPrint Student Profile. In the "My Profile" section each
     category lists its skills strongest first, followed by a "Top Strategy."
     The glossary at the end lists skills in a fixed order, so it's ignored.
     Students always confirm the result before it's saved. */
  // Same length in and out, so positions in the lowercase copy match the original.
  const norm = s => s.replace(/[\u2010-\u2015]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ");
  const squash = s => norm(s).toLowerCase().replace(/\s*-\s*/g, "-").replace(/[^a-z0-9"'&-]+/g, " ").trim();

  function firstIndex(hay, needles, from = 0) {
    let best = -1;
    needles.forEach(n => {
      const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "\\s*-\\s*")}\\b`, "g");
      re.lastIndex = from;
      const m = re.exec(hay);
      if (m && (best === -1 || m.index < best)) best = m.index;
    });
    return best;
  }

  function readMindprint(text) {
    const result = { order: {}, top: {}, strategies: [], found: 0 };
    if (!text) return result;
    const MP = window.CONTENT.mindprint;
    const orig = norm(text);
    const t = orig.toLowerCase();

    // 1) The "My Profile" section only.
    let segStart = t.indexOf("my profile");
    if (segStart === -1) segStart = 0;
    let segEnd = t.length;
    ["subject checklist", "personalized recommendations", "recommended strategies", "glossary of terms"].forEach(m => {
      const i = t.indexOf(m, segStart);
      if (i !== -1 && i < segEnd) segEnd = i;
    });

    // 2) Find where each category box starts (its subtitle is the most reliable marker).
    const anchors = {
      reasoning: ["understanding new concepts", "complex reasoning"],
      memory: ["remembering information"],
      exec: ["organizing & completing", "organizing and completing"]
    };
    const starts = [];
    MP.domains.forEach(d => {
      const seg = t.slice(0, segEnd);
      let at = -1;
      for (const a of anchors[d.id]) { at = seg.indexOf(a, segStart); if (at !== -1) break; }
      if (at !== -1) starts.push({ id: d.id, at });
    });
    starts.sort((a, b) => a.at - b.at);

    // 3) Skills in each box, in the order they appear (strongest first).
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].at : segEnd;
      const chunk = t.slice(s.at, end);
      const dom = MP.domains.find(d => d.id === s.id);
      const topAt = chunk.indexOf("top strategy");
      const listPart = topAt === -1 ? chunk : chunk.slice(0, topAt);
      const hits = dom.skills
        .map(id => ({ id, at: firstIndex(listPart, MP.skills[id].aliases) }))
        .filter(h => h.at !== -1)
        .sort((a, b) => a.at - b.at);
      if (hits.length >= 2) {
        const order = hits.map(h => h.id);
        dom.skills.forEach(id => { if (!order.includes(id)) order.push(id); });
        result.order[s.id] = order;
        result.found += hits.length;
      }
      // Top strategy: the words after "Top Strategy," minus the next box's heading.
      if (topAt !== -1) {
        let raw = orig.slice(s.at + topAt + "top strategy".length, s.at + Math.min(chunk.length, topAt + 90)).trim();
        raw = raw.replace(/\s*(Memory|Executive Functions|Complex Reasoning)\s*$/i, "").trim();
        if (raw && raw.length <= 70) result.top[s.id] = raw;
      }
    });

    // 4) Recommended strategies we know how to use for exam prep.
    const recStart = Math.max(0, t.indexOf("recommended strategies"));
    const glossary = t.indexOf("glossary of terms", recStart);
    const recText = squash(orig.slice(recStart, glossary === -1 ? undefined : glossary));
    const seen = [];
    const add = (name, at) => { if (!seen.some(x => x.name === name)) seen.push({ name, at }); };
    MP.strategies.forEach(st => {
      const at = recText.indexOf(squash(st.name));
      if (at !== -1) add(st.name, at);
    });
    // "Use Your Stronger ___" works with any skill name.
    Object.values(MP.skills).forEach(sk => sk.aliases.forEach(a => {
      const key = squash(`use your stronger ${a}`);
      let at = recText.indexOf(key);
      while (at !== -1) {
        const tail = recText.slice(at + key.length, at + key.length + 15);
        add(`Use Your Stronger ${sk.name}${tail.startsWith(" in group work") ? " in Group Work" : ""}`, at);
        at = recText.indexOf(key, at + key.length);
      }
    }));
    result.strategies = seen.sort((a, b) => a.at - b.at).map(x => x.name);
    return result;
  }

  window.StudyGuide = { extract, topicsFromText, readMindprint };
})();
