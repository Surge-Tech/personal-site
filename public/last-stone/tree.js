// tree.js — game-tree layout, step-by-step explanation, and SVG drawing for Nim.
// layoutTree() and explainStep() are pure (tested in Node). draw() needs a browser.
//
// The tree grows left to right: the root (starting pile) is on the left, leaves
// (0 stones) on the right. Leaves stack vertically, so even 80+ leaves fit a phone
// width and just scroll down.

(function (root) {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Turn buildTree()'s nested object into positioned nodes and edges.
  //   leaf y = next free slot; internal y = midpoint of first and last child.
  // x depends only on depth (how many moves have been made).
  function layoutTree(tree, opt = {}) {
    const colW = opt.colW || 46, rowH = opt.rowH || 22, pad = opt.pad || 22, top = opt.top || 30;
    const nodes = [], edges = [];
    let leaves = 0, maxDepth = 0;

    function walk(node, depth, parent, take) {
      const o = { id: nodes.length, n: node.n, win: node.win, depth, slot: 0 };
      nodes.push(o);
      if (parent) edges.push({ from: parent, to: o, take });
      maxDepth = Math.max(maxDepth, depth);
      if (node.children.length === 0) {
        o.slot = leaves++;
      } else {
        const slots = node.children.map((c) => walk(c.node, depth + 1, o, c.take).slot);
        o.slot = (slots[0] + slots[slots.length - 1]) / 2;
      }
      return o;
    }
    walk(tree, 0, null, 0);

    for (const o of nodes) { o.x = pad + o.depth * colW; o.y = top + pad + o.slot * rowH; }
    return {
      nodes, edges, leaves, maxDepth,
      width: pad * 2 + maxDepth * colW,
      height: top + pad * 2 + (leaves - 1) * rowH,
      colW, top,
    };
  }

  // Plain-English explanation of how position k gets its label, using the minimax rule.
  // `win` is the solved array from Nim.solve; every smaller position is already known.
  // misere = true: the player who takes the last stone LOSES, so with 0 stones the player to move has WON.
  function explainStep(k, moves, win, misere = false) {
    if (k === 0) {
      return misere
        ? "0 stones: nobody can move. The other player just took the last stone, and in this version that loses, so the player to move has won. 0 is WINNING."
        : "0 stones: nobody can move. The other player just took the last stone, so the player to move has already lost. 0 is LOSING.";
    }
    const legal = moves.filter((m) => m <= k);
    const stones = `${k} stone${k === 1 ? "" : "s"}`;
    if (legal.length === 0) {
      return `${stones}: no move is allowed, so the player to move is stuck. ${k} is ${win[k] ? "WINNING" : "LOSING"}.`;
    }
    const parts = legal.map((m) => `take ${m} → ${k - m} (${win[k - m] ? "opponent wins" : "opponent loses"})`);
    const verdict = win[k]
      ? `At least one move leaves the opponent in a losing position, so ${k} is WINNING.`
      : `Every move leaves the opponent in a winning position, so ${k} is LOSING.`;
    return `${stones}: ${parts.join("; ")}. ${verdict}`;
  }

  // ---------- Drawing (browser only) ----------
  function el(name, attrs = {}, text) {
    const e = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // solvedUpTo: positions with n <= solvedUpTo are colored; -1 means none yet.
  // showBest: thicken the edges that are winning moves (win-node -> losing child).
  function draw(svg, L, solvedUpTo, showBest) {
    svg.replaceChildren();
    svg.setAttribute("width", L.width);
    svg.setAttribute("height", L.height);
    svg.setAttribute("viewBox", `0 0 ${L.width} ${L.height}`);

    // Column headers: whose turn it is at each depth (they alternate).
    for (let d = 0; d <= L.maxDepth; d++) {
      const x = 22 + d * L.colW;
      svg.appendChild(el("text", { x, y: 14, class: "tn-head", "text-anchor": "middle" }, d % 2 === 0 ? "1st" : "2nd"));
    }

    const edgeG = el("g"), nodeG = el("g");
    for (const e of L.edges) {
      const solved = e.from.n <= solvedUpTo;
      const best = showBest && solved && e.from.win && !e.to.win;
      const line = el("line", { x1: e.from.x, y1: e.from.y, x2: e.to.x, y2: e.to.y, class: "te" + (best ? " te-best" : "") });
      edgeG.appendChild(line);
      edgeG.appendChild(el("text", {
        x: (e.from.x + e.to.x) / 2, y: (e.from.y + e.to.y) / 2 - 3, class: "te-label", "text-anchor": "middle",
      }, "−" + e.take));
    }
    for (const o of L.nodes) {
      const solved = o.n <= solvedUpTo;
      const cls = "tn " + (!solved ? "tn-u" : o.win ? "tn-w" : "tn-l");
      const shape = o.win || !solved
        ? el("circle", { cx: o.x, cy: o.y, r: 9, class: cls })
        : el("rect", { x: o.x - 9, y: o.y - 9, width: 18, height: 18, rx: 3, class: cls });
      const tip = el("title", {}, !solved ? `${o.n} stones: not solved yet`
        : `${o.n} stones: the player to move ${o.win ? "can force a win" : "loses with best play"}`);
      shape.appendChild(tip);
      nodeG.appendChild(shape);
      nodeG.appendChild(el("text", { x: o.x, y: o.y + 3.5, class: "tn-num" + (solved ? " tn-num-s" : ""), "text-anchor": "middle" }, o.n));
    }
    svg.appendChild(edgeG);
    svg.appendChild(nodeG);
  }

  const Tree = { layoutTree, explainStep, draw };
  if (typeof module !== "undefined" && module.exports) module.exports = Tree;
  else root.Tree = Tree;
})(typeof window !== "undefined" ? window : globalThis);
