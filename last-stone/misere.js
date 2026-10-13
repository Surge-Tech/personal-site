// misere.js — MISERE multi-pile Nim: same moves as Nim, but whoever takes the LAST stone LOSES.
// This is the classic 3-5-7 game. No DOM; runs in Node and the browser. Moves, applyMove and the
// binary helpers come from multinim.js; only the winning/losing logic differs.
//
// The cheat code (verified against brute force in sim_misere.py and test_misere.js):
//   1. While at least TWO piles have 2+ stones: play exactly like ordinary Nim
//      (leave every binary column with an even number of 1s).
//   2. When exactly ONE pile has 2+ stones: take from it so an ODD number of single stones is left.
//   3. When only single stones remain: take one. Winning means an odd number is left after your move.

(function (root) {
  const MN = () => root.MultiNim || require("./multinim.js");

  const bigCount = (piles) => piles.filter((n) => n >= 2).length;
  const singles = (piles) => piles.filter((n) => n === 1).length;
  const total = (piles) => piles.reduce((a, b) => a + b, 0);

  // ---------- Solver 1: brute-force minimax (knows nothing about the strategy) ----------
  const memo = new Map();
  const key = (piles) => piles.filter((n) => n > 0).sort((a, b) => b - a).join(",");

  function isWinningBrute(piles) {
    // With no stones left the player to move has WON: the opponent just took the last stone and lost.
    if (total(piles) === 0) return true;
    const k = key(piles);
    if (memo.has(k)) return memo.get(k);
    let win = false;
    for (const m of MN().legalMoves(piles)) {
      if (!isWinningBrute(MN().applyMove(piles, m.pile, m.take))) { win = true; break; }
    }
    memo.set(k, win);
    return win;
  }

  function bruteMove(piles) {
    const { legalMoves, applyMove } = MN();
    return legalMoves(piles).find((m) => !isWinningBrute(applyMove(piles, m.pile, m.take))) || null;
  }

  // ---------- Solver 2: the cheat code ----------
  // Which phase of the code applies to this position?
  //   "nim"    two or more big piles: ordinary Nim strategy
  //   "last"   exactly one big pile: leave an odd number of singles
  //   "singles" only singles (or nothing) left
  function phase(piles) {
    const big = bigCount(piles);
    return big >= 2 ? "nim" : big === 1 ? "last" : "singles";
  }

  // Is the player to move in a LOSING position, according to the code?
  function isLosingByCode(piles) {
    switch (phase(piles)) {
      case "nim": return MN().nimSum(piles) === 0;
      case "last": return false;                       // you can always leave an odd number of singles
      default: return singles(piles) % 2 === 1;        // only singles: losing when the count is odd
    }
  }

  // The move the code recommends, or null if the position is already lost (or the game is over).
  function codeMove(piles) {
    switch (phase(piles)) {
      case "nim": return MN().xorMove(piles);          // null when the nim-sum is already 0
      case "last": {
        const pile = piles.findIndex((n) => n >= 2);
        const b = piles[pile];
        // Leaving it as 1 adds one single; taking it all adds none. Pick whichever makes the count odd.
        return { pile, take: singles(piles) % 2 === 0 ? b - 1 : b };
      }
      default: {
        if (singles(piles) % 2 === 1) return null;     // lost: every move leaves an even number
        return { pile: piles.findIndex((n) => n === 1), take: 1 };
      }
    }
  }

  // ---------- Explanation (for the hint button and the code card) ----------
  // Same shape as Binary.explainMove: { phase, move, highlight, steps }. The steps are written for a player who
  // is learning the code, one short sentence each.
  const LABELS = "ABCDEFGH";
  const B = () => root.Binary || require("./binary.js");

  function explain(piles, width = 3) {
    const ph = phase(piles);
    if (total(piles) === 0) return { phase: ph, move: null, highlight: null, steps: [] };

    if (ph === "nim") {
      // Phase 1: play ordinary Nim. Binary.explainMove already walks through the columns.
      const ex = B().explainMove(piles, width);
      return {
        ...ex, phase: ph,
        steps: ["Two or more rows still have more than one stone, so play the binary code: make every column even.", ...ex.steps],
      };
    }

    const s = singles(piles);
    if (ph === "last") {
      const pile = piles.findIndex((n) => n >= 2);
      const big = piles[pile];
      const take = s % 2 === 0 ? big - 1 : big;
      const left = s % 2 === 0 ? s + 1 : s;
      return {
        phase: ph, move: { pile, take }, highlight: { pile },
        steps: [
          `Only one row (${LABELS[pile]}) still has more than one stone. The other rows are single stones: there ${s === 1 ? "is 1" : `are ${s}`}.`,
          "The end of the game is decided by the single stones, because whoever has to take the last one loses. You want to leave an ODD number of them.",
          s % 2 === 0
            ? `There ${s === 0 ? "are none" : `are ${s} (even)`}, so shrink row ${LABELS[pile]} down to one stone: take ${take}. That leaves ${left} single stones.`
            : `There ${s === 1 ? "is 1 (odd)" : `are ${s} (odd)`}, so take row ${LABELS[pile]} away completely: take ${take}. That leaves ${left} single stone${left === 1 ? "" : "s"}.`,
          "Now your opponent has to take them one at a time, and the last one is theirs.",
        ],
      };
    }

    // Only single stones remain.
    if (s % 2 === 1) {
      return {
        phase: ph, move: null, highlight: null,
        steps: [`Only single stones are left, and there ${s === 1 ? "is 1" : `are ${s}`} (odd). Whatever you take, an even number is left for your opponent, so you are the one in trouble. Take one and hope they slip.`],
      };
    }
    return {
      phase: ph, move: { pile: piles.findIndex((n) => n === 1), take: 1 }, highlight: { pile: piles.findIndex((n) => n === 1) },
      steps: [`Only single stones are left, and there are ${s} (even). Take one: that leaves ${s - 1}, an odd number, and your opponent will be the one who takes the last stone.`],
    };
  }

  // ---------- Bot ----------
  // mistakeRate = chance of ignoring the code and playing a random legal move.
  function createBot(rng = Math.random, mistakeRate = 0) {
    return {
      choose(piles) {
        const legal = MN().legalMoves(piles);
        if (legal.length === 0) throw new Error("no moves: the game is over");
        const best = codeMove(piles);
        if (best === null || rng() < mistakeRate) return legal[Math.floor(rng() * legal.length)];
        return best;
      },
    };
  }

  const Misere = { phase, isWinningBrute, bruteMove, isLosingByCode, codeMove, explain, createBot };
  if (typeof module !== "undefined" && module.exports) module.exports = Misere;
  else root.Misere = Misere;
})(typeof window !== "undefined" ? window : globalThis);
