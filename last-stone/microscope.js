// microscope.js — "the computer as a microscope" (scenes 2 and 3). The computer checks every position inside 3 · 5 · 7
// (each row anywhere from empty to full: 4 x 6 x 8 = 192 positions) and lists the doomed ones. People then hunt for the pattern.
//
//   scan([3, 5, 7], misere)  pure: { total, doomed: [[a,b,c], ...], balanced: [...], swaps }   (tested in Node)
//   <div class="microscope" data-start="3,5,7" data-binary="off|toggle"></div>
//     off     scene 2: a "Check all 192" button, then the list (no binary yet: the room is supposed to get stuck)
//     toggle  scene 3: the list is already there, plus "Write them in binary", which shows each position's columns
//             and marks the balanced ones. The 4 that are not balanced are all made of single stones: the twist.
//
// "Doomed" uses the brute-force solver in misere.js (it tries every line of play), not the code, so the list is evidence.

(function (root) {
  const X = () => root.Misere || require("./misere.js");
  const MN = () => root.MultiNim || require("./multinim.js");

  function positions(limits) {
    const out = [];
    const rec = (i, acc) => { if (i === limits.length) { out.push(acc); return; } for (let k = 0; k <= limits[i]; k++) rec(i + 1, acc.concat(k)); };
    rec(0, []);
    return out;
  }

  // Every position inside `limits`, with the player to move doomed or not. misere = the last stone loses (the real game).
  function scan(limits = [3, 5, 7], misere = true) {
    const all = positions(limits);
    const doomedTest = misere ? (p) => !X().isWinningBrute(p) : (p) => MN().nimSum(p) === 0;
    const doomed = all.filter(doomedTest);
    const balanced = all.filter((p) => MN().nimSum(p) === 0);
    const k = (p) => p.join(",");
    const dk = new Set(doomed.map(k)), bk = new Set(balanced.map(k));
    return {
      total: all.length,
      doomed,
      balanced,
      // where "doomed" and "balanced" disagree: doomed but not balanced, and balanced but safe
      swaps: { doomedNotBalanced: doomed.filter((p) => !bk.has(k(p))), balancedNotDoomed: balanced.filter((p) => !dk.has(k(p))) },
    };
  }

  const Microscope = { positions, scan };
  if (typeof module !== "undefined" && module.exports) { module.exports = Microscope; return; }
  root.Microscope = Microscope;

  // ---------------- Browser widget ----------------
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const dot = (p) => p.join(" · ");

  function create(el) {
    const limits = (el.dataset.start || "3,5,7").split(",").map(Number);
    const mode = el.dataset.binary || "off";
    const res = scan(limits, true);
    const width = Math.max(...limits).toString(2).length;
    let shown = mode === "toggle" ? res.doomed.length : 0, binary = false, timer = null;

    const actions = mk("div", "row tree-btns");
    const btns = mk("span");
    const go = mk("button", "setup", `Check all ${res.total} positions`);
    const bin = mk("button", "setup", "Write them in binary");
    btns.append(mode === "off" ? go : bin);
    actions.append(btns);
    const msg = mk("p", "tree-explain"); msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
    const grid = mk("div", "ms-grid");
    el.append(actions, msg, grid);

    go.addEventListener("click", () => run(false));
    bin.addEventListener("click", () => { binary = !binary; render(); if (binary) el.dispatchEvent(new CustomEvent("attempted", { bubbles: true })); });

    // The scan, shown as the computer walking through all 192 positions; doomed ones drop into the list as it finds them.
    let checked = mode === "toggle" ? res.total : 0;
    const all = positions(limits);
    function run(instant) {
      if (timer || checked === res.total) { finish(); return; }
      if (instant) { finish(); return; }
      go.textContent = "Skip";
      timer = setInterval(() => {
        checked = Math.min(res.total, checked + 4);
        shown = res.doomed.filter((p) => all.findIndex((q) => q.join() === p.join()) < checked).length;
        render();
        if (checked === res.total) finish();
      }, 40);
    }
    function finish() {
      if (timer) { clearInterval(timer); timer = null; }
      checked = res.total; shown = res.doomed.length; go.disabled = true; go.textContent = `Checked all ${res.total}`;
      render();
      el.dispatchEvent(new CustomEvent("attempted", { bubbles: true }));
    }

    function render() {
      grid.replaceChildren();
      const odd = new Set(res.swaps.doomedNotBalanced.map((p) => p.join()));
      res.doomed.slice(0, shown).forEach((p) => {
        const c = mk("div", "ms-pos");
        c.append(mk("div", "ms-dots", dot(p)));
        if (binary) {
          const b = mk("div", "ms-bin");
          p.forEach((n) => b.append(mk("div", "", n.toString(2).padStart(width, "0"))));
          const counts = [...Array(width)].map((_, i) => p.filter((n) => (n >> (width - 1 - i)) & 1).length);
          const foot = mk("div", "ms-count");
          counts.forEach((k) => foot.append(mk("span", k % 2 ? "odd" : "", String(k))));
          b.append(foot);
          c.append(b);
          c.classList.add(odd.has(p.join()) ? "ms-odd" : "ms-bal");
        }
        grid.append(c);
      });
      if (mode === "off") {
        msg.textContent = checked === 0
          ? `Every way 3 · 5 · 7 can look partway through a game: ${res.total} positions. Too many to check by hand.`
          : checked < res.total
            ? `Checking… ${checked} of ${res.total}. Doomed so far: ${shown}.`
            : `Checked all ${res.total}. ${res.doomed.length} are doomed for the player about to move. What do they have in common?`;
      } else {
        msg.textContent = binary
          ? `Bottom line: how many 1s each column has. ${res.doomed.length - odd.size} of the ${res.doomed.length} are balanced: every column even. The other ${odd.size} are all single stones.`
          : `The same ${res.doomed.length} doomed positions. Now write each row in binary: 8s, 4s, 2s and 1s.`;
      }
    }
    render();

    el.microscope = {
      run(instant = true) { run(instant); },
      binary(on = true) { if (binary !== on) bin.click(); },
      state: () => ({ checked, shown, binary, doomed: res.doomed.map((p) => p.join(",")), odd: res.swaps.doomedNotBalanced.map((p) => p.join(",")) }),
    };
  }

  function init() { document.querySelectorAll(".microscope").forEach(create); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);
