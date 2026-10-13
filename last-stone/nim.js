// nim.js — subtraction game engine + minimax solver. No DOM, runs in Node and the browser.
//
// Rules: one pile of n stones. On your turn remove a number of stones from the allowed
// set `moves` (default [1,2,3]).
//   normal play (default)   whoever takes the LAST stone WINS
//   misere (misere = true)  whoever takes the LAST stone LOSES
//
// Minimax rule, in one line (the same in both versions):
//   a position is WINNING for the player to move if at least one legal move leads
//   to a position that is LOSING for the opponent.
// Only the base case differs. A player with no legal move is stuck, and the previous
// player made the last move:
//   normal: the stuck player has LOST       (so 0 stones is losing)
//   misere: the stuck player has WON        (so 0 stones is winning)
// "Takes the last stone loses" and "makes the last move loses" coincide whenever a
// 1-stone move is allowed, because then the game always ends with 0 stones. For rule
// sets with no 1-move (like [2,5]) we use "makes the last move loses".

(function (root) {
  const DEFAULT_MOVES = [1, 2, 3];

  const legalMoves = (n, moves = DEFAULT_MOVES) => moves.filter((m) => m <= n);

  // win[i] === true  -> the player to move at i stones can force a win.
  // Bottom-up dynamic programming: win[i] only depends on smaller positions.
  function solve(maxN, moves = DEFAULT_MOVES, misere = false) {
    const win = [misere]; // 0 stones: normal play -> mover has lost; misere -> mover has WON
    for (let n = 1; n <= maxN; n++) {
      const legal = legalMoves(n, moves);
      win[n] = legal.length === 0 ? misere : legal.some((m) => !win[n - m]);   // stuck = same verdict as 0 stones
    }
    return win;
  }

  // Smallest-to-largest list of losing positions (for the player to move).
  const losingPositions = (win) => win.flatMap((w, n) => (w ? [] : [n]));

  // A winning move: one that hands the opponent a losing position.
  // Returns null if the position is already lost (no winning move exists).
  function bestMove(n, moves = DEFAULT_MOVES, win, misere = false) {
    win = win || solve(n, moves, misere);
    const m = legalMoves(n, moves).find((m) => !win[n - m]);
    return m === undefined ? null : m;
  }

  // Apply a move; throws on an illegal one so UI bugs surface loudly.
  function applyMove(n, take, moves = DEFAULT_MOVES) {
    if (!legalMoves(n, moves).includes(take)) throw new Error(`illegal move: take ${take} from ${n}`);
    return n - take;
  }

  // Full game tree from n stones, for the visualization.
  //   { n, win, children: [{ take, node: {...} }, ...] }
  // The tree has no merging of repeated positions on purpose: students should see
  // every line of play. Size grows fast, so `maxNodes` guards against huge n.
  function buildTree(n, moves = DEFAULT_MOVES, maxNodes = 5000, misere = false) {
    const win = solve(n, moves, misere);
    let count = 0;
    function build(k) {
      if (++count > maxNodes) throw new Error("tree too large; try fewer stones");
      return {
        n: k,
        win: win[k],
        children: legalMoves(k, moves).map((m) => ({ take: m, node: build(k - m) })),
      };
    }
    return build(n);
  }

  // Bot. mistakeRate = chance of ignoring the winning move and playing randomly.
  //   0   -> perfect player (loses only when the position is already lost)
  //   0.3 -> beatable "casual" player
  // From a lost position no move can save it, so the bot plays randomly and hopes
  // the human slips: that is the best any strategy can do there.
  function createBot(moves = DEFAULT_MOVES, rng = Math.random, mistakeRate = 0, misere = false) {
    let cache = solve(0, moves, misere);
    return {
      choose(n) {
        if (cache.length <= n) cache = solve(n, moves, misere);
        const legal = legalMoves(n, moves);
        const best = bestMove(n, moves, cache, misere);
        if (best === null || rng() < mistakeRate) return legal[Math.floor(rng() * legal.length)];
        return best;
      },
    };
  }

  const Nim = { DEFAULT_MOVES, legalMoves, solve, losingPositions, bestMove, applyMove, buildTree, createBot };
  if (typeof module !== "undefined" && module.exports) module.exports = Nim;
  else root.Nim = Nim;
})(typeof window !== "undefined" ? window : globalThis);
