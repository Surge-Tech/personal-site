// tree-ui.js — wires the Nim game-tree panel. Layout/drawing is in tree.js, rules in nim.js.
(function () {
  const $ = (id) => document.getElementById(id);
  const nSel = $("tree-n"), maxSel = $("tree-max");
  for (let i = 3; i <= 8; i++) nSel.add(new Option(i, i, i === 6, i === 6));
  for (let k = 2; k <= 4; k++) maxSel.add(new Option(k, k, k === 3, k === 3));

  let layout, win, moves, solved; // solved = highest stone count labeled so far (-1 = none)
  let tree, lastColW;
  let misere = false;             // true: whoever takes the LAST stone loses

  // Column spacing that makes the tree fit its box when it can (deepest line = n moves).
  // Clamped so labels stay readable; below the floor the box scrolls sideways instead.
  function fitColW() {
    const boxW = document.querySelector(".tree-scroll").clientWidth;
    if (!boxW) return 46;                         // hidden tab: no width to measure
    return Math.max(30, Math.min(46, Math.floor((boxW - 2 * 22 - 4) / Number(nSel.value))));
  }

  function relayout() {
    lastColW = fitColW();
    layout = Tree.layoutTree(tree, { colW: lastColW });
  }

  function rebuild() {
    const n = Number(nSel.value);
    moves = Array.from({ length: Number(maxSel.value) }, (_, i) => i + 1);
    misere = $("tree-last").value === "loses";
    win = Nim.solve(n, moves, misere);
    tree = Nim.buildTree(n, moves, 5000, misere);
    $("tree-note").hidden = !misere;
    relayout();
    solved = -1;
    $("tree-explain").textContent = "Press Step to start at the bottom: positions with 0 stones.";
    update();
  }

  function update() {
    Tree.draw($("tree-svg"), layout, solved, $("tree-best").checked);
    const n = Number(nSel.value);
    $("tree-step").disabled = solved >= n;
    $("tree-all").disabled = solved >= n;
  }

  function step() {
    if (solved >= Number(nSel.value)) return;
    solved++;
    $("tree-explain").textContent = Tree.explainStep(solved, moves, win, misere);
    update();
  }

  function solveAll() {
    solved = Number(nSel.value);
    const lose = Nim.losingPositions(win);
    $("tree-explain").textContent =
      `All labeled. Losing positions (squares): ${lose.join(", ")}. Whoever must move from one of these loses against a perfect opponent.`;
    update();
  }

  $("tree-step").addEventListener("click", step);
  $("tree-all").addEventListener("click", solveAll);
  $("tree-reset").addEventListener("click", rebuild);
  $("tree-best").addEventListener("change", update);
  nSel.addEventListener("change", rebuild);
  maxSel.addEventListener("change", rebuild);
  $("tree-last").addEventListener("change", rebuild);
  // Rotating the phone or showing the Nim tab changes the box width: re-fit, keeping progress.
  window.addEventListener("resize", () => {
    if (fitColW() !== lastColW) { relayout(); update(); }
  });
  rebuild();
})();
