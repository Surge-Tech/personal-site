// botbuild.js — "build the bot" (scene 2). The room writes the bot's rules together by filling in blanks (the same
// backward induction they did by hand for one pile in scene 0), then launches it and watches it grind through every
// position inside 3 · 5 · 7 (4 x 6 x 8 = 192). The bot it builds is then the one you play.
//
// The bot follows whatever rules the room picked, right or wrong. Wrong rules build a wrong table (or a bot that
// ignores its table), and then the room gets to beat it, find the broken rule, fix it and launch again.
//
//   solve([3, 5, 7], rules)   pure: { trace, label, doomed, moves, ms }   (tested in Node). rules default to CORRECT.
//   botFrom(label, play)      a bot that plays from the table the way rule 5 says
//   <div class="botbuild" data-start="3,5,7"></div>
//   Boards marked <div class="mn-board" data-uses="built-bot"> get the built bot once the run finishes.
//
// The solver knows nothing about binary or the code: it only follows the rules the room wrote down.

(function (root) {
  const MN = () => root.MultiNim || require("./multinim.js");
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const sum = (p) => p.reduce((a, b) => a + b, 0);

  // The right answers (the game: last stone loses). Each key is one blank on the page.
  const CORRECT = { end: "won", winQ: "some", winT: "doomed", loseQ: "every", loseT: "winning", order: "fewest", play: "doomed" };

  function positions(limits) {
    const out = [];
    const rec = (i, acc) => { if (i === limits.length) { out.push(acc); return; } for (let k = 0; k <= limits[i]; k++) rec(i + 1, acc.concat(k)); };
    rec(0, []);
    return out;
  }

  // Backward induction, exactly as the rules on the page say it. Labels: "W" winning, "D" doomed, "?" neither rule fits.
  // In `tries`, a move's result can also be "-": not worked out yet.
  // A move whose result has no label yet (wrong order: it hasn't been worked out) counts as neither doomed nor winning.
  // Both rules are applied. If exactly one fits, that's the label; if both or neither fit, the bot can't decide ("?").
  // The bot stops looking at moves as soon as both rules are settled.
  function solve(limits = [3, 5, 7], rules = CORRECT) {
    const r = { ...CORRECT, ...rules };
    const t0 = now();
    const order = positions(limits).sort((p, q) => sum(p) - sum(q) || p.join().localeCompare(q.join()));
    if (r.order === "most") order.reverse();
    const word = { D: "doomed", W: "winning" };
    const label = new Map();
    const trace = [];
    let moves = 0;
    for (const p of order) {
      if (sum(p) === 0) {
        const v = r.end === "won" ? "W" : "D";
        label.set(p.join(), v);
        trace.push({ p, tries: [], label: v, rule: "end", best: null });
        continue;
      }
      const tries = [];
      // undefined = not decided yet; "some" turns true on the first match, "every" turns false on the first miss
      let r2, r3, hit2 = null, hit3 = null;
      for (const m of MN().legalMoves(p)) {
        const child = MN().applyMove(p, m.pile, m.take);
        const cl = label.has(child.join()) ? label.get(child.join()) : "-";   // "-" = not worked out yet
        tries.push({ move: m, child, label: cl });
        moves++;
        const is2 = word[cl] === r.winT, is3 = word[cl] === r.loseT;
        if (r.winQ === "some" && is2 && r2 === undefined) { r2 = true; hit2 = tries.length - 1; }
        if (r.winQ === "every" && !is2 && r2 === undefined) r2 = false;
        if (r.loseQ === "some" && is3 && r3 === undefined) { r3 = true; hit3 = tries.length - 1; }
        if (r.loseQ === "every" && !is3 && r3 === undefined) r3 = false;
        if (r2 !== undefined && r3 !== undefined) break;
      }
      if (r2 === undefined) r2 = r.winQ === "every";
      if (r3 === undefined) r3 = r.loseQ === "every";
      const v = r2 && !r3 ? "W" : r3 && !r2 ? "D" : "?";
      label.set(p.join(), v);
      const hit = v === "W" ? hit2 : v === "D" ? hit3 : null;
      trace.push({ p, tries, label: v, rule: v === "W" ? "win" : v === "D" ? "doomed" : r2 ? "both" : "none", best: hit === null ? null : tries[hit] });
    }
    return { trace, label, moves, ms: now() - t0, doomed: trace.filter((t) => t.label === "D").map((t) => t.p) };
  }

  // The bot the room built, playing the way rule 5 says:
  //   doomed  look the position up and hand the opponent one its table calls doomed; if none, take one stone
  //   grab    take a whole row, the biggest one
  //   copy    repeat the human's last move (same row, same amount) if it can, otherwise take one stone
  function botFrom(label, play = "doomed") {
    let prev = null;                                   // the position the bot left last time, to work out the human's move
    const one = (piles) => ({ pile: piles.findIndex((n) => n > 0), take: 1 });
    const choose = (piles) => {
      const legal = MN().legalMoves(piles);
      if (legal.length === 0) throw new Error("no moves: the game is over");
      if (play === "grab") {
        const pile = piles.indexOf(Math.max(...piles));
        return { pile, take: piles[pile] };
      }
      if (play === "copy") {
        let last = null;
        if (prev && prev.length === piles.length) {
          const diff = piles.map((n, k) => prev[k] - n);
          const changed = diff.filter((d) => d !== 0);
          if (changed.length === 1 && changed[0] > 0) last = { pile: diff.findIndex((d) => d > 0), take: changed[0] };
        }
        if (last && piles[last.pile] >= last.take) return last;
        if (last) { const k = piles.findIndex((n) => n >= last.take); if (k >= 0) return { pile: k, take: last.take }; }
        return one(piles);
      }
      const good = legal.find((m) => label.get(MN().applyMove(piles, m.pile, m.take).join()) === "D");
      return good || one(piles);
    };
    return {
      choose(piles) {
        const m = choose(piles);
        prev = MN().applyMove(piles, m.pile, m.take);
        return m;
      },
    };
  }

  const BotBuild = { CORRECT, positions, solve, botFrom };
  if (typeof module !== "undefined" && module.exports) { module.exports = BotBuild; return; }
  root.BotBuild = BotBuild;

  // ---------------- Browser widget ----------------
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const dot = (p) => p.join(" · ");
  const ROW = "ABCDEFGH";
  const say = (m) => `take ${m.take} from row ${ROW[m.pile]}`;

  // The bot's rules, as sentences with blanks. Every blank has one right answer and a reason for each wrong one.
  const RULES = [
    { n: 1, title: "The end", parts: ["With no stones left, the player about to move has ",
      { key: "end", answer: "won", options: [["won", "already won"], ["lost", "already lost"]],
        why: { lost: "Remember: the last stone loses. If no stones are left, the other player just took the last one." } }, "."] },
    { n: 2, title: "Winning", parts: ["A position is winning if ",
      { key: "winQ", answer: "some", options: [["some", "at least one"], ["every", "every"]],
        why: { every: "One good move is enough. You only get to play one move anyway." } },
      " move hands the opponent a ",
      { key: "winT", answer: "doomed", options: [["doomed", "doomed"], ["winning", "winning"]],
        why: { winning: "Handing your opponent a winning position helps them, not you." } }, " position."] },
    { n: 3, title: "Doomed", parts: ["A position is doomed if ",
      { key: "loseQ", answer: "every", options: [["some", "at least one"], ["every", "every"]],
        why: { some: "One bad move doesn't doom you. Just don't play it." } },
      " move hands the opponent a ",
      { key: "loseT", answer: "winning", options: [["doomed", "doomed"], ["winning", "winning"]],
        why: { doomed: "A move that hands them a doomed position is a great move. That can't make you doomed." } }, " position."] },
    { n: 4, title: "The order", parts: ["Work through the positions starting from the ",
      { key: "order", answer: "fewest", options: [["fewest", "fewest"], ["most", "most"]],
        why: { most: "To judge a position, the bot needs the answers for where its moves lead. Moves remove stones, so it needs the smaller positions first." } },
      " stones."] },
    { n: 5, title: "Playing", parts: ["On its turn, the bot ",
      { key: "play", answer: "doomed", options: [["doomed", "hands you a doomed position"], ["grab", "takes as many stones as it can"], ["copy", "copies your last move"]],
        why: { grab: "Grabbing stones ignores everything the bot just worked out. Use the table.", copy: "Copying you ignores everything the bot just worked out. Use the table." } },
      ". If it can't, it takes one stone and hopes you slip."] },
  ];
  const BLANKS = RULES.flatMap((r) => r.parts.filter((x) => typeof x === "object").map((b) => ({ ...b, rule: r.n })));

  // How fast the run plays. "try" levels show every move the bot looks at; "pos" levels finish whole positions.
  const SPEEDS = [
    { name: "step by step", ms: 700, per: "try" },
    { name: "slow", ms: 280, per: "try" },
    { name: "medium", ms: 140, per: "pos", n: 1 },
    { name: "fast", ms: 50, per: "pos", n: 1 },
    { name: "very fast", ms: 30, per: "pos", n: 4 },
  ];
  // Auto: slow while the positions are small enough to follow, then faster and faster: the tedious part.
  const autoLevel = (stones) => (stones <= 1 ? 0 : stones === 2 ? 1 : stones <= 4 ? 2 : stones <= 7 ? 3 : 4);
  const SECONDS_PER_MOVE = 10;
  const TRY_TEXT = { D: "doomed for them", W: "winning for them", "?": "the bot couldn't decide that one", "-": "not worked out yet" };

  function humanTime(moves) {
    const s = moves * SECONDS_PER_MOVE;
    if (s < 60) return `${s} seconds`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
    const h = Math.floor(m / 60), r = m % 60;
    return `${h} hour${h === 1 ? "" : "s"}${r ? ` ${r} min` : ""}`;
  }

  function create(el) {
    const limits = (el.dataset.start || "3,5,7").split(",").map(Number);
    const base = solve(limits);                  // the right answers: the grid layout and the pacing come from these
    let res = base;                              // what the bot actually worked out, from the rules the room picked
    let rules = { ...CORRECT };
    const total = base.trace.length;
    const choice = {};
    let built = false, wrong = [];

    // ----- Part 1: the rules -----
    const game = mk("p", "muted bb-game");
    game.innerHTML = `<b>The game:</b> rows of ${limits.join(", ")}. Take any number from one row. The last stone <b>loses</b>.`;
    const list = mk("ol", "bb-rules");
    const chips = {};
    const whys = {};
    RULES.forEach((r) => {
      const li = mk("li", "bb-rule");
      li.dataset.rule = r.n;
      const head = mk("span", "bb-title", r.title);
      const body = mk("span", "bb-body");
      r.parts.forEach((part) => {
        if (typeof part === "string") { body.append(document.createTextNode(part)); return; }
        const grp = mk("span", "bb-blank");
        grp.setAttribute("role", "group");
        grp.setAttribute("aria-label", `Rule ${r.n} blank`);
        chips[part.key] = part.options.map(([v, text]) => {
          const b = mk("button", "bb-chip", text);
          b.type = "button";
          b.setAttribute("aria-pressed", "false");
          b.addEventListener("click", () => pick(part.key, v));
          grp.append(b);
          return { v, b };
        });
        body.append(grp);
      });
      const why = mk("p", "bb-why");
      why.hidden = true;
      whys[r.n] = why;
      li.append(head, body, why);
      list.append(li);
    });

    const launchRow = mk("div", "row tree-btns");
    const launchBtns = mk("span");
    const launch = mk("button", "setup bb-launch", "Launch the bot");
    const answers = mk("button", "link", "Fill in the answers");
    const bCheck = mk("button", "setup", "Check our rules");
    const bEdit = mk("button", "setup", "Change the rules");
    [launch, answers, bCheck, bEdit].forEach((b) => { b.type = "button"; });
    bCheck.hidden = bEdit.hidden = true;
    launchBtns.append(launch, bCheck, bEdit);
    launchRow.append(launchBtns, answers);
    const say1 = mk("p", "tree-explain");
    say1.setAttribute("role", "status");
    say1.setAttribute("aria-live", "polite");

    // ----- Part 2: the run -----
    const run = mk("section", "bb-run");
    run.hidden = true;
    const stats = mk("div", "stats bb-stats");
    const stat = (label) => { const d = mk("div"); const b = mk("b", "", "0"); d.append(b, mk("span", "", label)); stats.append(d); return b; };
    const sPos = stat("positions checked"), sMoves = stat("moves looked at"), sDoomed = stat("doomed found");
    const tedium = mk("p", "muted bb-tedium");

    const ctrl = mk("div", "row tree-btns");
    const ctrlBtns = mk("span");
    const bPause = mk("button", "setup", "Pause");
    const bSlower = mk("button", "setup", "Slower");
    const bFaster = mk("button", "setup", "Faster");
    const bFinish = mk("button", "setup", "Finish now");
    [bPause, bSlower, bFaster, bFinish].forEach((b) => { b.type = "button"; ctrlBtns.append(b); });
    const speedNote = mk("span", "muted bb-speed");
    ctrl.append(ctrlBtns, speedNote);

    const spot = mk("div", "bb-spot");
    spot.setAttribute("aria-live", "polite");
    const spotHead = mk("p", "bb-spot-head");
    const spotTries = mk("ol", "bb-tries");
    const spotVerdict = mk("p", "bb-verdict");
    spot.append(spotHead, spotTries, spotVerdict);

    // Every position as a small square, one column per number of stones left: the bot works left to right.
    const maxStones = sum(limits);
    const gridWrap = mk("div", "bb-grid-wrap");
    const grid = mk("div", "bb-grid");
    grid.setAttribute("role", "img");
    grid.setAttribute("aria-label", `All ${total} positions, grouped by how many stones are left`);
    const cols = [];
    for (let s = 0; s <= maxStones; s++) {
      const c = mk("div", "bb-col");
      c.append(mk("span", "bb-colhead", String(s)));
      grid.append(c);
      cols.push(c);
    }
    const cell = new Map();
    base.trace.forEach((t) => {
      const d = mk("span", "bb-cell");
      d.title = dot(t.p);
      cols[sum(t.p)].append(d);
      cell.set(t.p.join(), d);
    });
    gridWrap.append(grid, mk("p", "muted bb-axis", "Stones left on the board →"));
    const legend = mk("div", "legend");
    legend.innerHTML = `<span><i class="bb-cell bb-w"></i> winning for the player to move</span><span><i class="bb-cell bb-d"></i> doomed</span><span><i class="bb-cell bb-u"></i> the bot couldn't decide</span><span><i class="bb-cell"></i> not checked yet</span>`;

    const doomedHead = mk("p", "kicker", "Doomed for the player to move");
    const doomedGrid = mk("div", "ms-grid");
    run.append(stats, tedium, ctrl, spot, gridWrap, legend, doomedHead, doomedGrid);

    el.append(game, list, launchRow, say1, run);

    // ----- Choosing blanks -----
    function pick(key, v) {
      if (built) return;
      choice[key] = v;
      chips[key].forEach(({ v: w, b }) => { b.setAttribute("aria-pressed", String(w === v)); b.classList.remove("bb-bad"); });
      const blank = BLANKS.find((b) => b.key === key);
      const li = list.querySelector(`[data-rule="${blank.rule}"]`);
      li.classList.remove("bb-wrong");
      whys[blank.rule].hidden = true;
      say1.textContent = "";
    }
    answers.addEventListener("click", () => BLANKS.forEach((b) => pick(b.key, b.answer)));

    function check() {
      const missing = BLANKS.filter((b) => !choice[b.key]);
      if (missing.length) return { missing };
      wrong = BLANKS.filter((b) => choice[b.key] !== b.answer);
      return { missing, wrong };
    }

    launch.addEventListener("click", () => tryLaunch(false));
    // The bot follows whatever the room picked. Wrong rules launch too: then the room beats it and goes looking.
    function tryLaunch(instant) {
      if (built) return false;
      const c = check();
      if (c.missing.length) {
        say1.textContent = `Fill in every blank first. ${c.missing.length} to go.`;
        return false;
      }
      clearMarks();
      rules = { ...choice };
      res = solve(limits, rules);
      built = true;
      Object.values(chips).flat().forEach(({ b }) => { b.disabled = true; });
      answers.hidden = true;
      launch.hidden = true;
      bCheck.hidden = bEdit.hidden = true;
      say1.textContent = "Bot launched. It follows these five rules exactly, right or wrong.";
      start(instant);
      return true;
    }

    function clearMarks() {
      RULES.forEach((r) => { list.querySelector(`[data-rule="${r.n}"]`).classList.remove("bb-wrong"); whys[r.n].hidden = true; whys[r.n].textContent = ""; });
      Object.values(chips).flat().forEach(({ b }) => b.classList.remove("bb-bad"));
    }

    // After a run: say which rules (if any) built the wrong bot, and why.
    function checkRules() {
      clearMarks();
      if (!wrong.length) { say1.textContent = "All five rules are right. This bot can't be beaten from a position it can win."; return; }
      const rulesHit = [...new Set(wrong.map((b) => b.rule))];
      wrong.forEach((b) => {
        list.querySelector(`[data-rule="${b.rule}"]`).classList.add("bb-wrong");
        chips[b.key].find((c) => c.v === choice[b.key]).b.classList.add("bb-bad");
        const w = whys[b.rule];
        w.textContent = (w.textContent ? `${w.textContent} ` : "") + b.why[choice[b.key]];
        w.hidden = false;
      });
      say1.textContent = `Found it: rule${rulesHit.length > 1 ? "s" : ""} ${rulesHit.join(" and ")} built the wrong bot. Change the rules and launch again.`;
    }
    bCheck.addEventListener("click", checkRules);

    // Unlock the blanks so the room can fix the bot and launch again. The old run stays on screen until then.
    function editRules() {
      if (!done) return;
      built = false;
      Object.values(chips).flat().forEach(({ b }) => { b.disabled = false; });
      answers.hidden = false;
      launch.hidden = false;
      bEdit.hidden = bCheck.hidden = true;
      clearMarks();
      say1.textContent = "Change any blank, then launch again.";
    }
    bEdit.addEventListener("click", editRules);

    // ----- The run -----
    let i = 0, j = 0, moves = 0, doomed = 0, timer = null, paused = false, manual = null, done = false;
    // pace by how far through the run we are (the same whichever order the rules say), not by this position's size
    // and by how many moves it has shown, so a run that starts on big positions (wrong order) doesn't crawl
    const byMoves = () => (moves < 4 ? 0 : moves < 14 ? 1 : 2);
    const level = () => (manual !== null ? manual : Math.max(byMoves(), autoLevel(i < total ? sum(base.trace[i].p) : maxStones)));

    function start(instant) {
      run.hidden = false;
      reset();
      if (instant) { finish(); return; }
      schedule();
    }
    function reset() {
      if (timer) clearTimeout(timer);
      timer = null; i = 0; j = 0; moves = 0; doomed = 0; paused = false; done = false;
      cell.forEach((d) => { d.className = "bb-cell"; });
      doomedGrid.replaceChildren();
      spotTries.replaceChildren();
      spotHead.textContent = ""; spotVerdict.textContent = "";
      bPause.textContent = "Pause";
      [bPause, bSlower, bFaster, bFinish].forEach((b) => { b.disabled = false; });
      bFinish.textContent = "Finish now";
      update();
    }
    function schedule() {
      if (done || paused) return;
      timer = setTimeout(tick, SPEEDS[level()].ms);
    }
    function tick() {
      timer = null;
      const sp = SPEEDS[level()];
      if (sp.per === "try") stepTry();
      else for (let k = 0; k < sp.n && i < total; k++) commit(true);
      update();
      if (i >= total) { finish(); return; }
      schedule();
    }

    // Show the next move the bot looks at, or (when it has seen enough) its verdict.
    function stepTry() {
      const t = res.trace[i];
      if (j === 0) {
        spotTries.replaceChildren();
        spotVerdict.textContent = "";
        cell.forEach((d) => d.classList.remove("bb-look"));
        cell.get(t.p.join()).classList.add("bb-now");
        spotHead.textContent = `Checking ${dot(t.p)} (${sum(t.p)} stone${sum(t.p) === 1 ? "" : "s"} left)`;
      }
      if (j < t.tries.length) {
        const tr = t.tries[j];
        cell.forEach((d) => d.classList.remove("bb-look"));
        cell.get(tr.child.join()).classList.add("bb-look");
        const li = mk("li", tr === t.best ? "bb-try-good" : tr.label === "-" || tr.label === "?" ? "bb-try-odd" : "");
        li.textContent = `${say(tr.move)} → ${dot(tr.child)}: ${TRY_TEXT[tr.label]}`;
        spotTries.append(li);
        j++;
        moves++;
        return;
      }
      commit(false);
    }

    // Finish position i. `quick` = the whole position at once (count its moves now).
    function commit(quick) {
      const t = res.trace[i];
      if (quick) moves += t.tries.length - j;
      cell.forEach((d) => d.classList.remove("bb-look", "bb-now"));
      const d = cell.get(t.p.join());
      d.classList.add(t.label === "W" ? "bb-w" : t.label === "D" ? "bb-d" : "bb-u");
      if (t.label === "D") {
        doomed++;
        const c = mk("div", "ms-pos bb-new");
        c.append(mk("div", "ms-dots", dot(t.p)));
        doomedGrid.append(c);
      }
      if (quick) { spotHead.textContent = `Just checked ${dot(t.p)}`; spotTries.replaceChildren(); }
      spotVerdict.textContent = verdict(t);
      i++; j = 0;
    }
    function verdict(t) {
      const n = t.tries.length;
      const all = (what) => (n === 1 ? `the only move hands them a ${what} position.` : `all ${n} moves hand them a ${what} position.`);
      const one = (what) => `${say(t.best.move)} hands them ${dot(t.best.child)}, a ${what} position.`;
      if (t.rule === "end") return `No stones left. Rule 1: the player about to move has already ${rules.end}.`;
      if (t.rule === "win") return rules.winQ === "some" ? `Winning (rule 2): ${one(rules.winT)} The bot stops looking.` : `Winning (rule 2): ${all(rules.winT)}`;
      if (t.rule === "doomed") return rules.loseQ === "some" ? `Doomed (rule 3): ${one(rules.loseT)}` : `Doomed (rule 3): ${all(rules.loseT)}`;
      return t.rule === "both"
        ? "Rule 2 says winning and rule 3 says doomed, so the bot can't decide. It marks this one with a question mark."
        : "Neither rule 2 nor rule 3 fits, so the bot can't decide. It marks this one with a question mark.";
    }

    function update() {
      sPos.textContent = `${i} / ${total}`;
      sMoves.textContent = moves.toLocaleString();
      sDoomed.textContent = String(doomed);
      tedium.textContent = done
        ? `By hand, at ${SECONDS_PER_MOVE} seconds a move, that's about ${humanTime(moves)} of checking. The real calculation took ${res.ms < 1 ? "under a millisecond" : `${res.ms.toFixed(1)} milliseconds`}. We slowed it down so you could watch.`
        : `By hand, at ${SECONDS_PER_MOVE} seconds a move: ${humanTime(moves)} so far.`;
      speedNote.textContent = done ? "" : `Speed: ${SPEEDS[level()].name}${manual === null ? " (auto)" : ""}${paused ? ", paused" : ""}`;
    }

    function finish() {
      if (timer) clearTimeout(timer);
      timer = null;
      while (i < total) commit(true);
      done = true;
      spotHead.textContent = `Done: all ${total} positions.`;
      spotTries.replaceChildren();
      const unknown = res.trace.filter((t) => t.label === "?").length;
      spotVerdict.textContent = `It marked ${res.doomed.length} doomed for the player about to move${unknown ? ` and couldn't decide ${unknown}` : ""}. The bot now has an answer for every position, and it never had to think about why. Play it below.`;
      [bPause, bSlower, bFaster].forEach((b) => { b.disabled = true; });
      bFinish.textContent = "Run it again";
      update();
      bCheck.hidden = bEdit.hidden = false;
      const bot = botFrom(res.label, rules.play);
      document.querySelectorAll('.mn-board[data-uses="built-bot"]').forEach((b) => b._board && b._board.useBot(bot));
      el.dispatchEvent(new CustomEvent("attempted", { bubbles: true }));
    }

    bPause.addEventListener("click", () => {
      if (done) return;
      paused = !paused;
      bPause.textContent = paused ? "Resume" : "Pause";
      if (paused && timer) { clearTimeout(timer); timer = null; }
      update();
      if (!paused) schedule();
    });
    const nudge = (d) => {
      if (done) return;
      manual = Math.max(0, Math.min(SPEEDS.length - 1, level() + d));
      // switching to a whole-position speed mid-position: finish that position first so the count stays honest
      update();
      if (!paused && timer) { clearTimeout(timer); timer = null; schedule(); }
    };
    bSlower.addEventListener("click", () => nudge(-1));
    bFaster.addEventListener("click", () => nudge(1));
    bFinish.addEventListener("click", () => { if (done) { manual = null; reset(); schedule(); } else finish(); });

    el.botbuild = {
      pick, fill: () => answers.click(), checkRules, editRules,
      launch: (instant = true) => tryLaunch(instant),
      finish: () => { if (built && !done) finish(); },
      state: () => ({ built, done, checked: i, total, moves, doomed: res.doomed.map((p) => p.join(",")), unknown: res.trace.filter((t) => t.label === "?").length, wrong: wrong.map((b) => b.key), message: say1.textContent }),
    };
  }

  function init() { document.querySelectorAll(".botbuild").forEach(create); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);
