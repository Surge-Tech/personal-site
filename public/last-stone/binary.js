// binary.js — Chapter 6: the binary view of Nim piles.
//   explainMove()  pure: the step-by-step "balance the columns" walkthrough (tested in Node)
//   renderTable()  draws piles in binary with a count of 1s per column (browser only)
//   createLab()    the editable lab widget (browser only)
//
// "Balanced" = every bit column holds an even number of 1s. That is exactly "nim-sum is 0".

(function (root) {
  // The engine is a global in the browser (multinim.js loads first); under Node we require it.
  const MN = () => root.MultiNim || require("./multinim.js");
  const LABELS = "ABCDEFGH";
  const place = (width, c) => 2 ** (width - 1 - c);                 // column c (0 = leftmost) -> 8, 4, 2, 1 ...
  const bin = (n, width) => n.toString(2).padStart(width, "0");
  const describe = (piles) => piles.join(" · ");

  // "the 4s column" / "the 4s and 1s columns" / "the 8s, 2s and 1s columns"
  function columnNames(cols, width) {
    const names = cols.map((c) => place(width, c) + "s");
    if (names.length === 1) return `the ${names[0]} column`;
    return `the ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} columns`;
  }

  // Walkthrough for the winning move from `piles`, built from the same rule the engine uses:
  //   1. find the leftmost column with an odd number of 1s
  //   2. pick a pile that has a 1 in that column
  //   3. flip that pile's bits in EVERY odd column (this is XOR with the nim-sum)
  // Step 3 makes the pile smaller (its leftmost flipped bit goes 1 -> 0), so it is a legal take.
  function explainMove(piles, width = 3) {
    const col = MN().columns(piles, width);
    const oddCols = col.balanced.flatMap((b, c) => (b ? [] : [c]));
    if (oddCols.length === 0) {
      return {
        balanced: true, oddCols, move: null, highlight: null,
        steps: ["Every column already has an even number of 1s, so this position is balanced. Any move you make will leave an odd column for your opponent to fix. Take a small number and hope they slip."],
      };
    }
    const c = oddCols[0];
    const v = place(col.width, c);
    const pile = piles.findIndex((p) => (p & v) !== 0);          // first pile with a 1 in column c
    const from = piles[pile], to = from ^ col.nimSum, take = from - to;
    const after = piles.slice(); after[pile] = to;
    return {
      balanced: false, oddCols, pile, from, to, take, after,
      move: { pile, take },
      highlight: { pile, column: c },
      steps: [
        `The ${v}s column is the leftmost one with an odd number of 1s (it has ${col.counts[c]}).`,
        `Pick a row with a 1 in that column: row ${LABELS[pile]} (${from} is ${bin(from, col.width)}).`,
        `Flip that row's digit in every odd column (${columnNames(oddCols, col.width)}). ${from} (${bin(from, col.width)}) becomes ${to} (${bin(to, col.width)}).`,
        `That is taking ${take} from row ${LABELS[pile]}, leaving ${describe(after)}. Now every column has an even number of 1s.`,
      ],
    };
  }

  // ---------- DOM (browser only) ----------
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // opts: { width, highlight: {pile, column}, editable: { max, onStep(pileIndex, delta) } }
  function renderTable(container, piles, opts = {}) {
    const width = opts.width || 3;
    const col = MN().columns(piles, width);
    const hl = opts.highlight || null;
    const ed = opts.editable || null;

    const t = mk("table", "bintable");
    t.appendChild(mk("caption", "sr-only", "Row sizes in binary, with the number of 1s in each column"));

    const head = mk("tr");
    head.append(mk("th", "", ""), mk("th", "dec", "Size"));
    for (let c = 0; c < col.width; c++) head.appendChild(mk("th", "place" + (hl && hl.column === c ? " hl-col" : ""), String(place(col.width, c))));
    const thead = mk("thead"); thead.appendChild(head); t.appendChild(thead);

    const body = mk("tbody");
    piles.forEach((n, i) => {
      const tr = mk("tr");
      tr.appendChild(Object.assign(mk("th", "", LABELS[i]), { scope: "row" }));
      const dec = mk("td", "dec");
      if (ed) {
        const minus = mk("button", "step", "−"), plus = mk("button", "step", "+");
        minus.type = plus.type = "button";
        minus.dataset.step = `${i},-1`; plus.dataset.step = `${i},1`;
        minus.setAttribute("aria-label", `Remove one stone from row ${LABELS[i]}`);
        plus.setAttribute("aria-label", `Add one stone to row ${LABELS[i]}`);
        minus.disabled = n <= 0; plus.disabled = n >= ed.max;
        minus.addEventListener("click", () => ed.onStep(i, -1));
        plus.addEventListener("click", () => ed.onStep(i, 1));
        dec.append(minus, mk("span", "num", String(n)), plus);
      } else dec.textContent = n;
      tr.appendChild(dec);
      for (let c = 0; c < col.width; c++) {
        const one = col.rows[i][c] === "1";
        const hot = hl && hl.pile === i && hl.column === c;
        tr.appendChild(mk("td", "bit" + (one ? " one" : "") + (hot ? " hl-cell" : "") + (hl && hl.column === c ? " hl-col" : ""), col.rows[i][c]));
      }
      body.appendChild(tr);
    });
    t.appendChild(body);

    const foot = mk("tfoot");
    const counts = mk("tr"), parity = mk("tr");
    counts.append(Object.assign(mk("th", "", "1s in column"), { scope: "row" }), mk("td"));
    parity.append(Object.assign(mk("th", "", "even or odd?"), { scope: "row" }), mk("td"));
    for (let c = 0; c < col.width; c++) {
      counts.appendChild(mk("td", "cnt" + (hl && hl.column === c ? " hl-col" : ""), String(col.counts[c])));
      parity.appendChild(mk("td", "par " + (col.balanced[c] ? "even" : "odd") + (hl && hl.column === c ? " hl-col" : ""), col.balanced[c] ? "even" : "odd"));
    }
    foot.append(counts, parity);
    t.appendChild(foot);
    container.replaceChildren(t);
    return col;
  }

  // ---------- The editable lab ----------
  const PRESETS = ["1,2,3", "4,5,6", "3,5,6", "3,4,5", "2,2", "1,3,5,7", "5,6,7"];
  const REVEAL_AFTER = 5;   // distinct positions looked at before the rule is revealed (see journey.js)

  function createLab(el) {
    const MAX = 15, WIDTH = 4;
    let piles = (el.dataset.piles || "1,2,3").split(",").map(Number);
    const seen = new Set();
    let fired = false, steps = null, lastFocus = null;
    const key = (p) => p.slice().sort((a, b) => b - a).join(",");

    const presets = mk("div", "lab-presets");
    PRESETS.forEach((s) => {
      const b = mk("button", "setup", s.split(",").join(" · "));
      b.type = "button";
      b.addEventListener("click", () => { piles = s.split(",").map(Number); changed(); });
      presets.appendChild(b);
    });
    const tableBox = mk("div", "bintable-wrap");
    const verdict = mk("p", "lab-verdict");
    verdict.setAttribute("role", "status"); verdict.setAttribute("aria-live", "polite");
    const sizeRow = mk("div", "row tree-btns");
    const addB = mk("button", "setup", "Add a row"), remB = mk("button", "setup", "Remove a row");
    addB.type = remB.type = "button";
    const sizeBtns = mk("span"); sizeBtns.append(addB, remB); sizeRow.appendChild(sizeBtns);
    addB.addEventListener("click", () => { if (piles.length < 4) { piles.push(1); changed(); } });
    remB.addEventListener("click", () => { if (piles.length > 2) { piles.pop(); changed(); } });

    // Hidden until the rule is revealed: the winning-move walkthrough.
    const moveBox = mk("div", "lab-move");
    moveBox.setAttribute("data-after-check", ""); moveBox.hidden = true;
    const showB = mk("button", "setup", "Show the winning move");
    const makeB = mk("button", "setup", "Make this move");
    showB.type = makeB.type = "button"; makeB.hidden = true;
    const stepsOl = mk("ol", "lab-steps");
    moveBox.append(showB, makeB, stepsOl);
    showB.addEventListener("click", () => { steps = explainMove(piles, WIDTH); draw(); });
    makeB.addEventListener("click", () => { if (steps && steps.move) { piles[steps.pile] = steps.to; changed(); } });

    el.append(presets, tableBox, verdict, sizeRow, moveBox);

    function changed() {
      steps = null;
      seen.add(key(piles));
      draw();
      if (!fired && seen.size >= REVEAL_AFTER) { fired = true; el.dispatchEvent(new CustomEvent("attempted", { bubbles: true })); }
    }

    function draw() {
      const col = renderTable(tableBox, piles, {
        width: WIDTH,
        highlight: steps && steps.highlight,
        editable: { max: MAX, onStep: (i, d) => { lastFocus = `${i},${d}`; piles[i] += d; changed(); } },
      });
      if (lastFocus) { const b = tableBox.querySelector(`[data-step="${lastFocus}"]`); if (b && !b.disabled) b.focus(); lastFocus = null; }
      // Neutral wording on purpose: what "balanced" MEANS for the game is the thing to discover.
      verdict.textContent = col.nimSum === 0
        ? "Balanced: every column has an even number of 1s."
        : `Not balanced: ${columnNames(col.balanced.flatMap((b, c) => (b ? [] : [c])), col.width)} ${col.balanced.filter((b) => !b).length === 1 ? "has" : "have"} an odd number of 1s.`;
      addB.disabled = piles.length >= 4; remB.disabled = piles.length <= 2;
      stepsOl.replaceChildren(...(steps ? steps.steps.map((s) => mk("li", "", s)) : []));
      makeB.hidden = !(steps && steps.move);
    }

    seen.add(key(piles));
    draw();

    // Handles for demo.js and tests.
    el.binlab = {
      set(arr) { piles = arr.slice(); changed(); },
      showMove() { steps = explainMove(piles, WIDTH); draw(); },
      state: () => ({ piles: piles.slice(), seen: seen.size, revealed: fired }),
    };
  }

  function init() { document.querySelectorAll(".binlab").forEach(createLab); }

  const Binary = { explainMove, renderTable, REVEAL_AFTER };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Binary;
  } else {
    root.Binary = Binary;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(typeof window !== "undefined" ? window : globalThis);
