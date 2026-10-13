// predict.js — "predict, then check" strip for subtraction games.
// The student marks which pile sizes they think are LOSING for the player about to move,
// then the page grades them against the real answer from nim.js.
//
// scoreGuess() is pure (tested in Node). createPredictStrip() builds the DOM (browser only).

(function (root) {
  // Compare a guess to the truth. Both are arrays of pile sizes.
  //   correct: guessed and really losing    missed: really losing, not guessed
  //   wrong:   guessed but actually winning
  function scoreGuess(guess, truth) {
    const g = new Set(guess), t = new Set(truth);
    return {
      correct: [...g].filter((n) => t.has(n)).sort((a, b) => a - b),
      missed: [...t].filter((n) => !g.has(n)).sort((a, b) => a - b),
      wrong: [...g].filter((n) => !t.has(n)).sort((a, b) => a - b),
    };
  }

  // Rule sets a student can pick from. `moves` = how many stones may be taken in one turn.
  const RULES = [
    { id: "1-3", label: "Take 1, 2 or 3", moves: [1, 2, 3] },
    { id: "1-2", label: "Take 1 or 2", moves: [1, 2] },
    { id: "1-4", label: "Take 1, 2, 3 or 4", moves: [1, 2, 3, 4] },
    { id: "1-5", label: "Take 1 to 5", moves: [1, 2, 3, 4, 5] },
    { id: "1,3,4", label: "Take 1, 3 or 4 (not 2)", moves: [1, 3, 4] },
    { id: "2,5", label: "Take 2 or 5 only", moves: [2, 5] },
  ];

  const list = (a) => (a.length ? a.join(", ") : "none");

  // root element options (data attributes):
  //   data-rules="1-3"            fixed rule set, no picker
  //   data-rules="pick"           show a picker with every rule set
  //   data-n="24"                 largest pile size shown
  //   data-last="loses"           start in misere mode (last stone LOSES); in "pick" mode a picker is shown too
  function createPredictStrip(el) {
    const N = Number(el.dataset.n || 24);
    const pick = el.dataset.rules === "pick";
    let misere = el.dataset.last === "loses";
    let rule = RULES.find((r) => r.id === (pick ? "1-5" : el.dataset.rules || "1-3"));
    let guess = new Set();
    let checked = false;
    let revealed = false;             // true after "Show the answer" (changes the wording of the message)
    let truth = [];

    const ui = {};
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

    // ---- Build the DOM once ----
    if (pick) {
      const wrap = mk("div", "nim-controls");
      const label = mk("label", "", "Rule ");
      ui.sel = mk("select");
      RULES.forEach((r) => ui.sel.add(new Option(r.label, r.id, false, r === rule)));
      label.appendChild(ui.sel);
      wrap.appendChild(label);
      const lastLabel = mk("label", "", "Last stone ");
      ui.last = mk("select");
      ui.last.add(new Option("wins", "wins", false, !misere));
      ui.last.add(new Option("loses", "loses", false, misere));
      lastLabel.appendChild(ui.last);
      wrap.appendChild(lastLabel);
      el.appendChild(wrap);
      ui.sel.addEventListener("change", () => { rule = RULES.find((r) => r.id === ui.sel.value); reset(); });
      ui.last.addEventListener("change", () => { misere = ui.last.value === "loses"; reset(); });
    }
    ui.strip = mk("div", "nim-strip predict-strip");
    ui.strip.setAttribute("role", "group");
    ui.strip.setAttribute("aria-label", "Pile sizes. Press to mark a size you think is losing.");
    ui.actions = mk("div", "row tree-btns");
    const btns = mk("span");
    ui.check = mk("button", "setup", "Check my guess");
    ui.show = mk("button", "setup", "Show the answer");
    ui.clear = mk("button", "setup", "Clear");
    btns.append(ui.check, ui.show, ui.clear);
    ui.actions.appendChild(btns);
    ui.msg = mk("p", "tree-explain");
    ui.msg.setAttribute("role", "status");
    ui.msg.setAttribute("aria-live", "polite");
    el.append(ui.strip, ui.actions, ui.msg);

    ui.cells = [];
    for (let i = 0; i <= N; i++) {
      const c = mk("button", "cell pcell", String(i));
      c.type = "button";
      c.dataset.n = i;
      if (i === 0) c.disabled = true;      // the given base case; its title is set in render() because it depends on the rule
      else c.addEventListener("click", () => { checked = false; revealed = false; guess.has(i) ? guess.delete(i) : guess.add(i); render(); });
      ui.cells.push(c);
      ui.strip.appendChild(c);
    }
    ui.check.addEventListener("click", () => { checked = true; revealed = false; render(); });
    ui.show.addEventListener("click", () => { guess = new Set(truth.filter((n) => n > 0)); checked = true; revealed = true; render(); });
    ui.clear.addEventListener("click", reset);

    function reset() {
      guess = new Set();
      checked = false;
      revealed = false;
      truth = Nim.losingPositions(Nim.solve(N, rule.moves, misere));
      render();
    }

    function render() {
      if (checked) el.dispatchEvent(new CustomEvent("attempted", { bubbles: true }));   // journey.js reveals the explanations
      const t = truth.filter((n) => n > 0);                 // 0 is given, so grade 1..N only
      const s = scoreGuess([...guess], t);
      ui.cells.forEach((c, i) => {
        const on = guess.has(i);
        let cls = "cell pcell";
        if (i === 0) {
          // The given base case. Normal play: 0 stones is LOSING. Misere: 0 stones is a WIN for the player to move.
          cls += misere ? " winbase" : " lose";
          c.title = misere
            ? "0 stones: the other player just took the last stone, which loses here, so the player to move has won (given)"
            : "0 stones: the player to move has already lost (given)";
        }
        else if (checked && s.correct.includes(i)) cls += " lose";
        else if (checked && s.missed.includes(i)) cls += " missed";
        else if (checked && s.wrong.includes(i)) cls += " wrong";
        else if (on) cls += " marked";
        c.className = cls;
        c.setAttribute("aria-pressed", String(on));
      });
      ui.check.disabled = guess.size === 0 && !checked;

      if (!checked) {
        ui.msg.textContent = guess.size
          ? `${guess.size} marked. Press Check when you're ready.`
          : misere
            ? "Mark the pile sizes you think are losing for the player about to move. Here the player who takes the last stone loses, so 0 stones is already a win for the player to move."
            : "Mark the pile sizes you think are losing for the player about to move. 0 is already filled in for you.";
        return;
      }
      if (revealed) {
        ui.msg.textContent = `The losing positions are ${list(truth)}. What do they have in common?`;
      } else if (s.wrong.length === 0 && s.missed.length === 0) {
        ui.msg.textContent = `All correct. The losing positions are ${list(truth)}.`;
      } else {
        const bits = [`You marked ${guess.size}: ${s.correct.length} right.`];
        if (s.wrong.length) bits.push(`Crossed out (${list(s.wrong)}): the player to move can win from these.`);
        if (s.missed.length) bits.push(`Dashed (${list(s.missed)}): losing positions you haven't marked.`);
        ui.msg.textContent = bits.join(" ");
      }
    }

    reset();

    // Handles for demo.js and tests: drive the strip exactly like a student would.
    el.predict = {
      mark(...ns) { ns.forEach((n) => { if (n > 0 && n <= N) guess.add(n); }); checked = false; revealed = false; render(); },
      check() { checked = true; revealed = false; render(); },
      show() { guess = new Set(truth.filter((n) => n > 0)); checked = true; revealed = true; render(); },
      clear: reset,
      setRule(id) { rule = RULES.find((r) => r.id === id) || rule; if (ui.sel) ui.sel.value = rule.id; reset(); },
      setLast(loses) { misere = !!loses; if (ui.last) ui.last.value = misere ? "loses" : "wins"; reset(); },
      state: () => ({ guess: [...guess].sort((x, y) => x - y), truth: truth.slice(), checked, misere, rule: rule.id }),
    };
  }

  function init() { document.querySelectorAll(".predict").forEach(createPredictStrip); }

  const Predict = { scoreGuess, RULES };
  if (typeof module !== "undefined" && module.exports) module.exports = Predict;
  else {
    root.Predict = Predict;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(typeof window !== "undefined" ? window : globalThis);
