// rulelab.js — the Rule Lab engine: solve one-row games under rules the audience invents. No DOM; runs in Node and the browser.
//
// Three families of rules, all "impartial" (both players have the same moves):
//   take    take any amount from a fixed list, e.g. [1, 3, 4]               (subtraction games, like scene 1)
//   kayles  take 1 or 2 stones that sit next to each other; taking from the
//           middle breaks the row into two rows                              (Kayles, octal code 0.77)
//   grundy  don't take anything: split one row into two UNEQUAL rows       (Grundy's game; its pattern is an open problem)
//
// The engine computes each row size's Grundy value (its "Nim value"): the size of the single Nim row it behaves like.
//   value(n) = mex { value of every position one move away }      mex = smallest whole number NOT in the set
//   a position made of several rows is worth the XOR of its rows' values      (Sprague-Grundy theorem)
// So the doomed sizes (player to move loses, last move wins) are exactly the sizes with value 0.
//
// The "last stone loses" switch is offered only for take rules. There we only need win/lose, not values, because a
// single row never splits. (Misere values do not add up by XOR, which is why the twist in scene 5 exists at all.)
//
// Pattern finding and proof. findPeriod() looks for "repeats every p, from size e on" in the computed range. That alone
// is evidence, not proof. certify() says when the computer's evidence is ALSO a proof:
//   take   each answer depends only on the K = max(moves) answers before it, so once K answers in a row repeat,
//          everything after them repeats forever. Needs the repeat checked on K consecutive sizes.
//   kayles Guy-Smith periodicity theorem for octal games (Winning Ways, ch. 4): if value(n + p) = value(n) for all n
//          with e <= n < 2e + p + t (t = most stones one move removes, 2 for Kayles), then it holds for every n >= e.
//   grundy no theorem applies. Whether its values ever repeat is unknown (Berlekamp, Conway and Guy conjectured yes).

(function (root) {
  const RULES = [
    { id: "1-3", label: "Take 1, 2 or 3", kind: "take", moves: [1, 2, 3] },
    { id: "1-5", label: "Take 1 to 5", kind: "take", moves: [1, 2, 3, 4, 5] },
    { id: "1,4", label: "Take 1 or 4", kind: "take", moves: [1, 4] },
    { id: "1,3,4", label: "Take 1, 3 or 4", kind: "take", moves: [1, 3, 4] },
    { id: "2,5", label: "Take 2 or 5", kind: "take", moves: [2, 5] },
    { id: "kayles", label: "Take 1 or 2 side by side; the row can break in two", kind: "kayles" },
    { id: "grundy", label: "Split a row into two unequal rows", kind: "grundy" },
    { id: "custom", label: "Your own: take…", kind: "take", moves: [1, 2] },
  ];
  const byId = (id) => RULES.find((r) => r.id === id);

  // Smallest whole number not in the set.
  function mex(set) { let m = 0; while (set.has(m)) m++; return m; }

  const norm = (moves) => [...new Set(moves.map(Number).filter((m) => Number.isInteger(m) && m > 0))].sort((a, b) => a - b);

  // Grundy values for row sizes 0..N (normal play: whoever moves last wins).
  function values(rule, N) {
    const g = [];
    for (let n = 0; n <= N; n++) {
      const reach = new Set();
      if (rule.kind === "take") {
        for (const m of norm(rule.moves)) if (m <= n) reach.add(g[n - m]);
      } else if (rule.kind === "kayles") {
        // remove r = 1 or 2 adjacent stones; what is left is a row of a and a row of n - r - a (either may be 0)
        for (const r of [1, 2]) if (r <= n) for (let a = 0; 2 * a <= n - r; a++) reach.add(g[a] ^ g[n - r - a]);
      } else if (rule.kind === "grundy") {
        // split n into a + b with 1 <= a < b
        for (let a = 1; 2 * a < n; a++) reach.add(g[a] ^ g[n - a]);
      } else throw new Error("unknown rule kind: " + rule.kind);
      g.push(mex(reach));
    }
    return g;
  }

  // win[n] = can the player to move from a single row of n force a win?
  // Normal play: win = value != 0. Misere (take rules only): the stuck player has WON (same convention as nim.js).
  function outcomes(rule, N, misere = false) {
    if (!misere) return values(rule, N).map((v) => v !== 0);
    if (rule.kind !== "take") throw new Error("last-stone-loses is only offered for take rules");
    const moves = norm(rule.moves), win = [];
    for (let n = 0; n <= N; n++) {
      const legal = moves.filter((m) => m <= n);
      win[n] = legal.length === 0 ? true : legal.some((m) => !win[n - m]);
    }
    return win;
  }

  const losing = (win) => win.flatMap((w, n) => (w ? [] : [n]));

  // Smallest period p (then the earliest start e) such that seq[n + p] === seq[n] for every n from e to the end of the data,
  // with the repeat seen over at least `minSpan` sizes and at least two full periods. Returns { pre: e, period: p, span } or null.
  function findPeriod(seq, { maxPeriod = Math.floor(seq.length / 3), minSpan = 1 } = {}) {
    for (let p = 1; p <= maxPeriod; p++) {
      let e = 0;
      for (let n = seq.length - p - 1; n >= 0; n--) if (seq[n] !== seq[n + p]) { e = n + 1; break; }
      const span = seq.length - p - e;            // number of n with seq[n] === seq[n + p] checked, from e on
      if (span >= Math.max(minSpan, 2 * p)) return { pre: e, period: p, span };
    }
    return null;
  }

  // Is the pattern found in the computed data guaranteed to go on forever?
  //   { status: "proven" | "evidence" | "none", reason }
  function certify(rule, found) {
    if (!found) return { status: "none", reason: "No repeat found in the sizes computed." };
    const { pre: e, period: p, span } = found;
    if (rule.kind === "take") {
      const K = Math.max(...norm(rule.moves));
      return span >= K
        ? { status: "proven", reason: `Each answer depends only on the ${K} before it, and a full run of ${K} answers repeats, so the pattern can never break.` }
        : { status: "evidence", reason: "Not enough sizes computed to be sure." };
    }
    if (rule.kind === "kayles") {
      const t = 2, need = 2 * e + p + t;                   // Guy-Smith: check e <= n < 2e + p + t
      return e + span >= need
        ? { status: "proven", reason: `The Guy–Smith theorem: once the repeat holds from ${e} up to ${need - 1}, it holds forever. The computer checked that.` }
        : { status: "evidence", reason: `It looks periodic, but the Guy–Smith check needs sizes up to ${need - 1}.` };
    }
    return { status: "evidence", reason: "It looks like it repeats here, but no theorem guarantees it will keep repeating." };
  }

  // Analyse a rule over sizes 0..N: values (normal play only), win/lose, doomed sizes, and the pattern.
  //   by: "values" (default when there are values) or "win" (look for the pattern in the doomed sizes only; the lab uses
  //   this for take rules, where the doomed sizes are what the audience is asked about).
  function analyse(rule, N, misere = false, by = "values") {
    const win = outcomes(rule, N, misere);
    const vals = misere ? null : values(rule, N);
    const seq = vals && by === "values" ? vals : win.map((w) => (w ? 1 : 0));
    // For take rules the repeat must also cover one full window of K answers, so the proof check can pass.
    // For the other kinds a short coincidence at the end of the data is easy to find (Grundy's game "repeats every 3"
    // over its last 16 sizes out of 600), so demand the repeat cover at least half of everything computed.
    const minSpan = rule.kind === "take" ? Math.max(...norm(rule.moves)) : Math.ceil(seq.length / 2);
    const found = findPeriod(seq, { minSpan });
    return { values: vals, win, losing: losing(win), pattern: found, proof: certify(rule, found) };
  }

  // Several rows at once (normal play): each row acts like a Nim row of its value, so XOR the values.
  function combine(rule, rows) {
    const N = Math.max(0, ...rows);
    const g = values(rule, N);
    const vals = rows.map((r) => g[r]);
    const x = vals.reduce((a, b) => a ^ b, 0);
    return { values: vals, xor: x, moverWins: x !== 0 };
  }

  // Full brute force for a multi-row position (normal play), WITHOUT using values. Used by the tests to check combine().
  function bruteWins(rule, rows, memo = new Map()) {
    const key = rows.filter((r) => r > 0).sort((a, b) => a - b).join(",");
    if (memo.has(key)) return memo.get(key);
    const rs = key ? key.split(",").map(Number) : [];
    let win = false;
    outer: for (let i = 0; i < rs.length; i++) {
      const n = rs[i], rest = rs.slice(0, i).concat(rs.slice(i + 1));
      const nexts = [];
      if (rule.kind === "take") for (const m of norm(rule.moves)) { if (m <= n) nexts.push([n - m]); }
      if (rule.kind === "kayles") for (const r of [1, 2]) if (r <= n) for (let a = 0; 2 * a <= n - r; a++) nexts.push([a, n - r - a]);
      if (rule.kind === "grundy") for (let a = 1; 2 * a < n; a++) nexts.push([a, n - a]);
      for (const nx of nexts) if (!bruteWins(rule, rest.concat(nx), memo)) { win = true; break outer; }
    }
    memo.set(key, win);
    return win;
  }

  const RuleLab = { RULES, byId, mex, values, outcomes, losing, findPeriod, certify, analyse, combine, bruteWins };
  if (typeof module !== "undefined" && module.exports) module.exports = RuleLab;
  else root.RuleLab = RuleLab;
})(typeof window !== "undefined" ? window : globalThis);
