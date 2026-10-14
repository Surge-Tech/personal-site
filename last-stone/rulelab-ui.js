// rulelab-ui.js — the Rule Lab widget (.rulelab). Pick or invent a rule, mark the sizes you think are doomed,
// press Solve and watch the computer work upward from 0, then read the pattern, the long view and the "several rows" check.
//
//   <div class="rulelab" data-n="36" data-rule="1,4"></div>
//     data-n      largest row size on the strip (the long view and the pattern search go much further)
//     data-rule   starting rule id from RuleLab.RULES
//
// Handles for demo.js: el.rulelab.{ setRule, setMoves, setLast, mark, solve, clear, rows, state }.

(function () {
  const LONG = { take: 120, kayles: 300, grundy: 1000 };   // sizes shown in the long view, per rule kind
  const SEARCH = { take: 600, kayles: 600, grundy: 1000 }; // sizes searched for a pattern
  const list = (a, max = 12) => (a.length > max ? a.slice(0, max).join(", ") + ", …" : a.join(", "));
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  function createRuleLab(el) {
    const N = Number(el.dataset.n || 36);
    let rule = { ...RuleLab.byId(el.dataset.rule || "1,4") };
    let customMoves = [1, 2];
    let misere = false;
    let guess = new Set();
    let solved = false, timer = null, shown = -1;   // shown = highest size the animation has filled in so far
    let result = null;                               // RuleLab.analyse() over the strip + the search range

    // ---------- DOM ----------
    const controls = mk("div", "nim-controls");
    const ruleLabel = mk("label", "", "Rule ");
    const sel = mk("select");
    RuleLab.RULES.forEach((r) => sel.add(new Option(r.label, r.id, false, r.id === rule.id)));
    ruleLabel.append(sel);
    const lastLabel = mk("label", "", "Last stone ");
    const last = mk("select");
    last.add(new Option("wins", "wins")); last.add(new Option("loses", "loses"));
    lastLabel.append(last);
    controls.append(ruleLabel, lastLabel);

    const chips = mk("div", "rl-chips");
    chips.append(mk("span", "muted", "You may take: "));
    const chipBtns = [];
    for (let k = 1; k <= 9; k++) {
      const b = mk("button", "rl-chip", String(k));
      b.type = "button";
      b.addEventListener("click", () => {
        const s = new Set(customMoves);
        s.has(k) ? s.delete(k) : s.add(k);
        if (s.size === 0) return;                       // a rule with no moves is not a game
        customMoves = [...s].sort((a, b) => a - b);
        rule = { ...RuleLab.byId("custom"), moves: customMoves };
        reset();
      });
      chipBtns.push(b); chips.append(b);
    }

    const strip = mk("div", "nim-strip rl-strip");
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", "Row sizes. Press to mark a size you think is doomed for the player about to move.");
    const cells = [];
    for (let i = 0; i <= N; i++) {
      const c = mk("button", "cell pcell");
      c.type = "button";
      c.append(mk("span", "rl-n", String(i)), mk("span", "rl-v"));
      if (i === 0) c.disabled = true;
      else c.addEventListener("click", () => { if (solved || timer) return; guess.has(i) ? guess.delete(i) : guess.add(i); render(); });
      cells.push(c); strip.append(c);
    }

    const actions = mk("div", "row tree-btns");
    const btns = mk("span");
    const solveBtn = mk("button", "setup", "Solve");
    const clearBtn = mk("button", "setup", "Clear");
    btns.append(solveBtn, clearBtn);
    const valLabel = mk("label", "check");
    const valBox = mk("input"); valBox.type = "checkbox";
    valLabel.append(valBox, document.createTextNode(" Show Nim values"));
    actions.append(btns, valLabel);

    const msg = mk("p", "tree-explain");
    msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");

    const after = mk("div", "rl-after"); after.hidden = true;
    const pattern = mk("p", "rule rl-pattern");
    const proof = mk("p", "muted rl-proof");
    const plotWrap = mk("figure", "rl-plot");
    const plot = svg("svg", { viewBox: "0 0 600 150", role: "img" });
    const caption = mk("figcaption", "muted");
    plotWrap.append(plot, caption);
    const rowsBox = mk("div", "rl-rows");
    const rowsLabel = mk("label", "", "Several rows ");
    const rowsIn = mk("input"); rowsIn.type = "text"; rowsIn.value = "3, 5, 7"; rowsIn.inputMode = "numeric";
    rowsIn.setAttribute("aria-label", "Row sizes, separated by commas");
    rowsLabel.append(rowsIn);
    const rowsOut = mk("p", "rl-rows-out");
    rowsBox.append(rowsLabel, rowsOut);
    after.append(pattern, proof, plotWrap, rowsBox);

    el.append(controls, chips, strip, actions, msg, after);

    sel.addEventListener("change", () => {
      rule = sel.value === "custom" ? { ...RuleLab.byId("custom"), moves: customMoves } : { ...RuleLab.byId(sel.value) };
      if (rule.kind !== "take") misere = false;
      valBox.checked = rule.kind !== "take";          // splitting rules are only interesting through their values
      reset();
    });
    last.addEventListener("change", () => { misere = last.value === "loses"; reset(); });
    valBox.addEventListener("change", render);
    solveBtn.addEventListener("click", () => solve(false));
    clearBtn.addEventListener("click", reset);
    rowsIn.addEventListener("input", renderRows);

    // ---------- Logic ----------
    function reset() {
      if (timer) { clearInterval(timer); timer = null; }
      guess = new Set(); solved = false; shown = -1;
      const searchN = SEARCH[rule.kind];
      const by = rule.kind === "take" ? "win" : "values";
      result = { strip: RuleLab.analyse(rule, Math.max(N, LONG[rule.kind]), misere), search: RuleLab.analyse(rule, searchN, misere, by), searchN };
      render();
    }

    // Fill the strip in from 0 upward, the way the computer actually reasons (each answer uses the smaller ones).
    function solve(instant) {
      if (solved) return;
      if (timer || instant) { if (timer) clearInterval(timer); timer = null; shown = N; finish(); return; }
      solveBtn.textContent = "Skip";
      timer = setInterval(() => { shown++; render(); if (shown >= N) { clearInterval(timer); timer = null; finish(); } }, 70);
    }
    function finish() {
      solved = true; shown = N; solveBtn.textContent = "Solve";
      render();
      el.dispatchEvent(new CustomEvent("attempted", { bubbles: true }));   // journey.js reveals the scene's explanation
    }

    // ---------- Rendering ----------
    function render() {
      const isTake = rule.kind === "take";
      lastLabel.hidden = !isTake;
      last.value = misere ? "loses" : "wins";
      sel.value = rule.id;
      chips.hidden = rule.id !== "custom";
      chipBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(customMoves.includes(i + 1))));
      valLabel.hidden = misere;
      const showVals = valBox.checked && !misere;
      const truth = new Set(result.strip.losing);

      cells.forEach((c, i) => {
        let cls = "cell pcell";
        const known = i <= shown || i === 0;
        if (i === 0) cls += truth.has(0) ? " lose" : " winbase";
        else if (solved) {
          if (truth.has(i) && guess.has(i)) cls += " lose rl-hit";      // you called it
          else if (truth.has(i)) cls += " lose";
          else if (guess.has(i)) cls += " wrong";
        } else if (known) cls += truth.has(i) ? " lose" : "";
        else if (guess.has(i)) cls += " marked";
        if (i === shown && timer) cls += " rl-now";
        c.className = cls;
        c.setAttribute("aria-pressed", String(guess.has(i)));
        c.querySelector(".rl-v").textContent = showVals && known && (solved || i <= shown) ? String(result.strip.values[i]) : "";
        c.title = i === 0
          ? (truth.has(0) ? "0: no move left, so the player to move has lost (given)" : "0: the other player made the last move, which loses here, so the player to move has won (given)")
          : "";
      });
      solveBtn.disabled = solved;

      // status line
      if (!solved && !timer) {
        msg.textContent = guess.size
          ? `${guess.size} marked. Press Solve and watch the computer work its way up from 0.`
          : "Predict first: tap every size you think is doomed for the player about to move. Then press Solve.";
      } else if (timer) {
        msg.textContent = `Working up from 0… size ${Math.max(shown, 0)}: ${truth.has(shown) ? "doomed, every move hands over a winning size" : "safe, at least one move hands over a doomed size"}.`;
      } else {
        const right = [...guess].filter((g) => truth.has(g)).length;
        const doomed = result.strip.losing.filter((n) => n > 0 && n <= N);
        msg.textContent = guess.size
          ? `You marked ${guess.size}, ${right} right. Doomed sizes: ${list(doomed) || "none above 0"}. Outlined: you called it. Crossed out: those can win.`
          : `Doomed sizes: ${list(doomed) || "none above 0"}.`;
      }

      after.hidden = !solved;
      if (solved) { renderPattern(); renderPlot(); renderRows(); }
    }

    function renderPattern() {
      const s = result.search, p = s.pattern, isTake = rule.kind === "take";
      const what = isTake ? "The doomed sizes" : "The Nim values";
      if (rule.kind === "grundy") {
        pattern.textContent = `No repeat in the first ${result.searchN.toLocaleString()} sizes. From 4 to 12 it looks like it repeats every 3, and then it breaks.`;
        proof.textContent = "Computers have taken this game far beyond any person, and nobody knows whether it ever settles into a repeat. It is an open problem.";
        return;
      }
      if (rule.kind === "kayles") {
        const zeros = s.losing.filter((n) => n > 0).length === 0;
        pattern.textContent = p
          ? `${what} repeat every ${p.period}, but only from size ${p.pre} on.${zeros ? " And no single row is doomed: the first player breaks it into two equal rows and copies every move." : ""}`
          : `${what}: no repeat found yet.`;
        proof.textContent = `${s.proof.status === "proven" ? "Proven. " : ""}${s.proof.reason} Nobody would find size ${p ? p.pre : "71"} by hand.`;
        return;
      }
      pattern.textContent = p
        ? `${what} repeat every ${p.period}${p.pre ? `, from size ${p.pre} on` : ""}: ${list(s.losing, 8)}.`
        : `${what}: no repeat found in the first ${result.searchN} sizes.`;
      proof.textContent = (s.proof.status === "proven" ? "Proven. " : "") + s.proof.reason;
    }

    // Long view: the value of every size up to LONG[kind]. Value-0 sizes (doomed) in the loss colour.
    function renderPlot() {
      plot.replaceChildren();
      if (misere) { plotWrap.hidden = true; return; }
      plotWrap.hidden = false;
      const M = LONG[rule.kind];
      const vals = RuleLab.values(rule, M);
      const top = Math.max(1, ...vals);
      const X = (n) => 24 + (n / M) * 566, Y = (v) => 128 - (v / top) * 112;
      plot.append(svg("line", { x1: 24, y1: 128, x2: 590, y2: 128, class: "rl-axis" }));
      plot.append(Object.assign(svg("text", { x: 2, y: Y(top) + 4, class: "rl-tick" }), { textContent: String(top) }));
      plot.append(Object.assign(svg("text", { x: 14, y: 132, class: "rl-tick" }), { textContent: "0" }));
      plot.append(Object.assign(svg("text", { x: 590, y: 146, "text-anchor": "end", class: "rl-tick" }), { textContent: `size ${M}` }));
      const p = result.search.pattern;
      if (p && p.pre > 0 && p.pre <= M) {
        plot.append(svg("line", { x1: X(p.pre), y1: 10, x2: X(p.pre), y2: 128, class: "rl-mark" }));
        plot.append(Object.assign(svg("text", { x: X(p.pre) + 4, y: 18, class: "rl-tick" }), { textContent: "repeats from here" }));
      }
      const r = M > 400 ? 1.3 : 2;
      vals.forEach((v, n) => plot.append(svg("circle", { cx: X(n), cy: Y(v), r, class: v === 0 ? "rl-dot rl-zero" : "rl-dot" })));
      plot.setAttribute("aria-label", `Nim value of every row size from 0 to ${M}`);
      caption.textContent = `Every row size from 0 to ${M}: how high each dot sits is its Nim value. Dots on the line are doomed sizes.`;
    }

    // Several rows: each row acts like a Nim row of its value, so the binary code from scene 4 applies.
    function renderRows() {
      if (misere) {
        rowsOut.textContent = "With the last stone losing, rows don't add up this simply (that's the twist from scene 5). Switch to “wins” to combine rows.";
        return;
      }
      const rows = rowsIn.value.split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n <= 1000).slice(0, 6);
      if (!rows.length) { rowsOut.textContent = "Type some row sizes, like 3, 5, 7."; return; }
      const c = RuleLab.combine(rule, rows);
      const w = Math.max(1, ...c.values.map((v) => v.toString(2).length));
      const parts = rows.map((r, i) => `${r} acts like ${c.values[i]} (${c.values[i].toString(2).padStart(w, "0")})`);
      rowsOut.textContent = `${parts.join(", ")}. Combined: ${c.xor.toString(2).padStart(w, "0")}. ` +
        (c.moverWins ? "Not balanced: the player to move can win." : "Balanced: the player to move is doomed.");
    }

    reset();

    el.rulelab = {
      setRule(id) { sel.value = id; sel.dispatchEvent(new Event("change")); },
      setMoves(moves) { customMoves = [...new Set(moves)].sort((a, b) => a - b); sel.value = "custom"; sel.dispatchEvent(new Event("change")); },
      setLast(loses) { misere = !!loses && rule.kind === "take"; reset(); },
      mark(...ns) { if (solved) return; ns.forEach((n) => { if (n > 0 && n <= N) guess.add(n); }); render(); },
      solve(instant = true) { solve(instant); },
      clear: reset,
      rows(rs) { rowsIn.value = rs.join(", "); renderRows(); return rowsOut.textContent; },
      state: () => ({ rule: rule.id, moves: rule.moves ? rule.moves.slice() : null, misere, solved, guess: [...guess].sort((a, b) => a - b),
                      losing: result.strip.losing.filter((n) => n <= N), pattern: result.search.pattern, proof: result.search.proof.status,
                      text: pattern.textContent, rowsText: rowsOut.textContent }),
    };
  }

  function init() { document.querySelectorAll(".rulelab").forEach(createRuleLab); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
