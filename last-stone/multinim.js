// multinim.js — multi-pile Nim engine. No DOM; runs in Node and the browser.
//
// Rules (normal play): several piles of stones. On your turn, pick ONE pile and remove
// any positive number of stones from it. Whoever takes the last stone wins.
//
// Two independent solvers live here on purpose:
//   1. isWinningBrute: plain minimax over every line of play. Knows nothing about XOR.
//   2. nimSum / xorMove: Bouton's theorem (1901). A position is losing for the player
//      to move exactly when the XOR of all pile sizes is 0.
// The tests check that they agree on every position in range, so the theorem is verified
// by computation here rather than assumed.

(function (root) {
  const nimSum = (piles) => piles.reduce((a, b) => a ^ b, 0);

  // Every legal move: take `take` (1..size) from pile index `pile`.
  function legalMoves(piles) {
    const out = [];
    piles.forEach((n, pile) => { for (let take = 1; take <= n; take++) out.push({ pile, take }); });
    return out;
  }

  // Apply a move and return the NEW pile array. Throws on an illegal move so UI bugs surface loudly.
  function applyMove(piles, pile, take) {
    if (!Number.isInteger(pile) || pile < 0 || pile >= piles.length) throw new Error(`no such pile: ${pile}`);
    if (!Number.isInteger(take) || take < 1 || take > piles[pile]) throw new Error(`illegal move: take ${take} from pile ${pile} (${piles[pile]})`);
    const next = piles.slice();
    next[pile] -= take;
    return next;
  }

  // ---------- Solver 1: brute-force minimax ----------
  // Pile order and empty piles don't change the game, so memoize on the sorted non-zero sizes.
  const memo = new Map();
  const key = (piles) => piles.filter((n) => n > 0).sort((a, b) => b - a).join(",");

  function isWinningBrute(piles) {
    const k = key(piles);
    if (memo.has(k)) return memo.get(k);
    // Winning if at least one move leaves the opponent in a losing position.
    // With no stones left there are no moves, so the player to move has lost.
    let win = false;
    for (const m of legalMoves(piles)) {
      if (!isWinningBrute(applyMove(piles, m.pile, m.take))) { win = true; break; }
    }
    memo.set(k, win);
    return win;
  }

  // First move found by brute force that leaves a losing position, or null if already lost.
  function bruteMove(piles) {
    return legalMoves(piles).find((m) => !isWinningBrute(applyMove(piles, m.pile, m.take))) || null;
  }

  // ---------- Solver 2: nim-sum (XOR) ----------
  const isWinningXor = (piles) => nimSum(piles) !== 0;

  // A winning move from the nim-sum, or null if the nim-sum is already 0.
  // Why it exists: if s = nimSum != 0, take the highest set bit of s. An odd number of piles have
  // that bit set, so at least one pile p does, and p XOR s < p. Reduce that pile to p XOR s and the
  // new nim-sum is 0.
  function xorMove(piles) {
    const s = nimSum(piles);
    if (s === 0) return null;
    for (let pile = 0; pile < piles.length; pile++) {
      const target = piles[pile] ^ s;
      if (target < piles[pile]) return { pile, take: piles[pile] - target };
    }
    throw new Error("unreachable: a nonzero nim-sum always has a reducing pile"); // would mean a bug in this file
  }

  // ---------- Explaining the XOR trick (for the chapter UI) ----------
  // Binary rows for each pile, the count of 1s in each bit column, and whether each column is balanced
  // (even). The nim-sum is 0 exactly when every column is even.
  function columns(piles, minWidth = 1) {
    const width = Math.max(minWidth, ...piles.map((n) => n.toString(2).length));
    const rows = piles.map((n) => n.toString(2).padStart(width, "0"));
    const counts = Array.from({ length: width }, (_, c) => rows.filter((r) => r[c] === "1").length);
    return { width, rows, counts, balanced: counts.map((n) => n % 2 === 0), nimSum: nimSum(piles) };
  }

  // ---------- Bot ----------
  // mistakeRate = chance of ignoring the winning move and playing a random legal one.
  // From a losing position nothing can save it, so the bot plays randomly and hopes for a slip.
  function createBot(rng = Math.random, mistakeRate = 0) {
    return {
      choose(piles) {
        const legal = legalMoves(piles);
        if (legal.length === 0) throw new Error("no moves: the game is over");
        const best = xorMove(piles);
        if (best === null || rng() < mistakeRate) return legal[Math.floor(rng() * legal.length)];
        return best;
      },
    };
  }

  const MultiNim = { nimSum, legalMoves, applyMove, isWinningBrute, bruteMove, isWinningXor, xorMove, columns, createBot };
  if (typeof module !== "undefined" && module.exports) module.exports = MultiNim;
  else root.MultiNim = MultiNim;
})(typeof window !== "undefined" ? window : globalThis);
