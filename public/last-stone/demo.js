// demo.js — scripted live demonstrations for the talk. Inert unless called (from the browser console, or by me
// when I run the talk). Every demo drives the REAL widgets through their public handles, exactly as a person
// would, so what the audience sees is the real thing.
//
//   Demo.go("s3")                      jump to a scene (enters presenter mode if needed)
//   Demo.setup("s6", {first:"human"})  reconfigure a board
//   Demo.line("s0", [2, 1, 3])         play a list of human moves (a number on one-pile boards, [row, take] on multi-row boards)
//   Demo.perfect("s1")                 play the human side perfectly until the game ends
//   Demo.mark("s1", [4, 8, 12]); Demo.check("s1"); Demo.show("s1")      the predict strip
//   Demo.rule("s2", "1-5", true)       choose a rule set (and last stone loses) on a picker strip
//   Demo.handshake("s1", [1, 3, 2, 2]) the pairing widget
//   Demo.lab([4, 5, 6]); Demo.labMove()   the binary lab
//   Demo.state("s3")                   what is on a board right now (for narration / checks)
//   Demo.dryRun()                      run every demo in the script and report pass / fail (used before a talk)
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const scene = (id) => {
    const el = typeof id === "number" ? (window.Presenter ? Presenter.scenes[id] : null) : document.getElementById(id);
    if (!el) throw new Error(`no such scene: ${id}`);
    return el;
  };
  const boardIn = (id, i = 0) => {
    const el = [...scene(id).querySelectorAll(".nim-board, .mn-board")][i];
    if (!el || !el._board) throw new Error(`no board #${i} in scene ${id}`);
    return el._board;
  };
  const isMulti = (b) => b.root.classList.contains("mn-board");

  // Wait until it is the human's turn again (or the game is over). If the presenter's BotGate is holding the bot's
  // reply, release it after `pause` ms, as a presenter pressing B would.
  async function waitTurn(b, { pause = 900, timeout = 15000 } = {}) {
    const t0 = Date.now();
    for (;;) {
      const turn = b.state().turn;
      if (turn === "human" || turn === "over") return turn;
      if (turn === "bot" && window.BotGate && BotGate.cb) { await sleep(pause); BotGate.release(); }
      if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for the bot (turn=${turn})`);
      await sleep(40);
    }
  }

  const Demo = {
    sleep, waitTurn,

    go(target) {
      if (window.Presenter && !Presenter.isOn()) Presenter.enter(0);
      const i = typeof target === "number" ? target : Presenter.scenes.findIndex((s) => s.id === target);
      if (i < 0) throw new Error(`no such scene: ${target}`);
      Presenter.go(i);
      return i;
    },
    reveal(id) { scene(id).querySelectorAll("[data-after-check]").forEach((n) => { n.hidden = false; }); },
    botMove() { if (window.BotGate) BotGate.release(); },

    board: (id, i = 0) => boardIn(id, i),
    setup(id, opts, i = 0) { boardIn(id, i).setup(opts); },

    // What is on a board right now.
    state(id, i = 0) {
      const b = boardIn(id, i), g = b.state();
      return { turn: g.turn, misere: !!g.misere, ...(isMulti(b) ? { rows: g.piles.slice() } : { stones: g.n }),
               status: b.root.querySelector(".nim-status").textContent, score: { ...b.tally } };
    },

    // Play a list of human moves. One-pile boards: numbers. Multi-row boards: [row, take] pairs. Moves are clipped to
    // what is legal, so a script written for one bot reply still runs if the bot answered differently.
    async line(id, moves, opts = {}) {
      const b = boardIn(id, opts.board || 0);
      await waitTurn(b, opts);
      for (const m of moves) {
        if (b.state().turn !== "human") break;
        if (isMulti(b)) {
          const [row, take] = m;
          const have = b.state().piles[row] || 0;
          if (have > 0) b.takeFrom(row, Math.min(take, have));
        } else {
          b.take(Math.min(m, b.state().n));
        }
        await sleep(opts.beat || 350);
        await waitTurn(b, opts);
      }
      return Demo.state(id, opts.board || 0);
    },

    // Play the human side perfectly (the code), until the game ends.
    async perfect(id, opts = {}) {
      const b = boardIn(id, opts.board || 0);
      await waitTurn(b, opts);
      for (let guard = 0; guard < 60 && b.state().turn === "human"; guard++) {
        const g = b.state();
        if (isMulti(b)) {
          const m = (g.misere ? Misere.codeMove(g.piles) : MultiNim.xorMove(g.piles)) || MultiNim.legalMoves(g.piles)[0];
          b.takeFrom(m.pile, m.take);
        } else {
          const k = Nim.bestMove(g.n, Nim.DEFAULT_MOVES, undefined, g.misere);
          b.take(k === null ? 1 : k);
        }
        await sleep(opts.beat || 350);
        await waitTurn(b, opts);
      }
      return Demo.state(id, opts.board || 0);
    },

    // The predict strip.
    strip(id, i = 0) { const el = scene(id).querySelectorAll(".predict")[i]; if (!el || !el.predict) throw new Error("no predict strip"); return el.predict; },
    mark(id, ns, i = 0) { Demo.strip(id, i).mark(...ns); },
    check(id, i = 0) { Demo.strip(id, i).check(); },
    show(id, i = 0) { Demo.strip(id, i).show(); },
    clear(id, i = 0) { Demo.strip(id, i).clear(); },
    rule(id, ruleId, loses = false, i = 0) { const s = Demo.strip(id, i); s.setRule(ruleId); s.setLast(loses); },

    // The handshake widget: you take each number in turn, the code answers.
    async handshake(id, xs = [1, 3, 2, 2]) {
      const el = scene(id).querySelector(".pairing");
      if (!el || !el._pairing) throw new Error("no pairing widget");
      for (const x of xs) {
        while (el._pairing.state().busy) await sleep(40);
        el._pairing.play(x);
        await sleep(900);
      }
      return el._pairing.state();
    },

    // The binary lab.
    lab(piles) { const el = document.querySelector(".binlab"); el.binlab.set(piles); return el.binlab.state(); },
    labMove() { document.querySelector(".binlab").binlab.showMove(); },

    // ----- Dry run: every demo the script uses, with checks. Run before a talk (then reload the page). -----
    async dryRun() {
      const results = [];
      const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail === undefined ? "" : String(detail) });
      const guard = async (name, fn) => { try { await fn(); } catch (e) { check(name, false, e.message); } };
      const hiddenIn = (id) => [...scene(id).querySelectorAll("[data-after-check]")].filter((n) => n.hidden).length;

      Demo.go("s0");

      await guard("D1 wall: bot first at 15, the human loses", async () => {
        Demo.setup("s0", { first: "bot", bot: 0 });
        const before = hiddenIn("s0");
        await Demo.line("s0", [2, 1, 3, 3, 1, 2, 3], { pause: 150, beat: 120 });
        const s = Demo.state("s0");
        check("D1 wall: the bot wins", s.turn === "over" && /Bot wins/.test(s.status), s.status);
        // the second loss reveals the hook line
        Demo.setup("s0", { first: "bot", bot: 0 });
        await Demo.line("s0", [1, 1, 1, 1, 1, 1, 1, 1], { pause: 150, beat: 120 });
        check("D1 wall: the hook line appears after two losses", hiddenIn("s0") < before, `hidden ${before} -> ${hiddenIn("s0")}`);
      });

      Demo.go("s1");
      await guard("D2 predict", async () => {
        check("D2 hidden before the guess", hiddenIn("s1") >= 2, hiddenIn("s1"));
        Demo.mark("s1", [4, 8, 9]); Demo.check("s1");
        const st = Demo.strip("s1").state();
        check("D2 predict: graded (2 right, 1 wrong)", st.checked && st.guess.length === 3, JSON.stringify(st.guess));
        check("D2 predict: explanation revealed", hiddenIn("s1") === 1 || hiddenIn("s1") === 0, hiddenIn("s1"));   // the 'win'-staged line is still hidden
        Demo.clear("s1"); Demo.mark("s1", [4, 8, 12, 16, 20, 24]); Demo.check("s1");
        check("D2 predict: perfect answer", /All correct/.test(document.querySelector("#s1 .predict .tree-explain").textContent), document.querySelector("#s1 .predict .tree-explain").textContent);
      });
      await guard("D3 handshake", async () => {
        const st = await Demo.handshake("s1", [1, 3, 2, 2]);
        check("D3 handshake: four rounds, code takes last", st.round === 4, JSON.stringify(st));
        check("D3 handshake: four sums shown", document.querySelectorAll("#s1 .pgroup.done").length === 4, document.querySelectorAll("#s1 .pgroup.done").length);
      });
      await guard("D4 win from 15", async () => {
        const s = await Demo.perfect("s1", { pause: 150, beat: 120 });
        check("D4 win from 15: you win", /You win/.test(s.status), s.status);
        check("D4 win from 15: bridge appears", hiddenIn("s1") === 0, hiddenIn("s1"));
      });

      Demo.go("s2");
      await guard("D5 adapts", async () => {
        Demo.rule("s2", "1-5", false); Demo.show("s2");
        const win = Demo.strip("s2").state().truth.join(",");
        check("D5 take 1-5: multiples of 6", win === "0,6,12,18,24,30", win);
        Demo.rule("s2", "1-5", true); Demo.show("s2");
        const lose = Demo.strip("s2").state().truth.join(",");
        check("D5 take 1-5, last stone loses: 1 mod 6", lose === "1,7,13,19,25", lose);
        Demo.rule("s2", "1,3,4", false); Demo.show("s2");
        check("D5 odd rule set shown", Demo.strip("s2").state().truth.join(",") === "0,2,7,9,14,16,21,23,28,30", Demo.strip("s2").state().truth.join(","));
      });

      Demo.go("s3");
      await guard("D6 3-5-7 wall", async () => {
        Demo.setup("s3", { start: "3,5,7", first: "bot", last: "loses", bot: 0 });
        const s = await Demo.line("s3", [[2, 3], [1, 2], [0, 1], [2, 1], [1, 1], [0, 1], [2, 1], [1, 1], [0, 1]], { pause: 150, beat: 120 });
        check("D6 3-5-7: the bot beats a careless human", s.turn === "over" && /Bot wins/.test(s.status), s.status);
        // a fresh game: the bot is held for the presenter, so press B, then check its opening
        Demo.setup("s3", { start: "3,5,7", first: "bot", last: "loses", bot: 0 });
        await sleep(100);
        Demo.botMove();
        await sleep(700);
        const rows = Demo.state("s3").rows;
        const taken = [3 - rows[0], 5 - rows[1], 7 - rows[2]];
        check("D6 3-5-7: the bot opens by taking exactly 1 from one row", taken.filter((t) => t === 1).length === 1 && taken.filter((t) => t === 0).length === 2, rows.join(","));
      });

      Demo.go("s4");
      await guard("D7 lab", async () => {
        const hid = hiddenIn("s4");
        for (const p of [[3, 5, 6], [4, 5, 6], [3, 4, 5], [5, 6, 7]]) Demo.lab(p);   // 5 distinct positions including the start
        check("D7 lab: rule revealed after exploring", hiddenIn("s4") < hid, `${hid} -> ${hiddenIn("s4")}`);
        Demo.lab([4, 5, 6]); Demo.labMove();
        const steps = [...document.querySelectorAll("#s4 .lab-steps li")].map((l) => l.textContent);
        check("D7 lab: winning-move walkthrough has 4 steps", steps.length === 4, steps.length);
        check("D7 lab: 4·5·6 -> take 1 from A", /taking 1 from row A, leaving 3 · 5 · 6/.test(steps[3] || ""), steps[3]);
      });

      Demo.go("s5");
      await guard("D8 twist", async () => {
        // The wrong move first: from 5 · 1 · 1, taking 1 leaves 4 · 1 · 1, and the bot answers by shrinking the big row so three singles (odd) are left for you.
        Demo.setup("s5", { start: "5,1,1", first: "human", last: "loses", bot: 0 });
        await Demo.line("s5", [[0, 1]], { pause: 150, beat: 120 });
        Demo.botMove();
        await sleep(700);
        const afterWrong = Demo.state("s5");
        check("D8 twist: after the wrong move the bot plays on (game not over, bot has replied)", afterWrong.turn !== "over", JSON.stringify(afterWrong.rows));
        // The right move: take 4, leaving three single stones (odd).
        Demo.setup("s5", { start: "5,1,1", first: "human", last: "loses", bot: 0 });
        await Demo.line("s5", [[0, 4]], { pause: 150, beat: 120 });
        await Demo.line("s5", [[0, 1], [1, 1], [2, 1]], { pause: 150, beat: 120 });
        const end = Demo.state("s5");
        check("D8 twist: the right move wins", /You win/.test(end.status), end.status);
        check("D8 twist: the rule is revealed after a game", hiddenIn("s5") === 0, hiddenIn("s5"));
      });

      Demo.go("s6");
      await guard("D9 finale", async () => {
        Demo.setup("s6", { start: "3,5,7", first: "human", last: "loses", bot: 0 });
        document.querySelector("#s6 .nim-aux button").click();
        const hint = [...document.querySelectorAll("#s6 .lab-steps li")].map((l) => l.textContent);
        check("D9 finale: hint at 3·5·7 says take 1 from row A", hint.length >= 4 && /taking 1 from row A, leaving 2 · 5 · 7/.test(hint.join(" ")), hint.join(" | ").slice(-110));
        const s = await Demo.perfect("s6", { pause: 150, beat: 120 });
        check("D9 finale: the code beats the perfect bot", /You win/.test(s.status), s.status);
        check("D9 finale: closing lines appear", hiddenIn("s6") === 0, hiddenIn("s6"));
        const card = [...document.querySelectorAll("#s6 .codecard li")].map((l) => l.className);
        check("D9 finale: the code card is visible in misere", !document.querySelector("#s6 .codecard").hidden, card.join("|"));
      });

      Demo.go("why");
      await guard("D10 proof", async () => {
        document.getElementById("tree-all").click();
        check("D10 proof: tree drawn", document.querySelectorAll("#tree-svg .tn").length > 20, document.querySelectorAll("#tree-svg .tn").length);
      });

      const failed = results.filter((r) => !r.ok);
      return { passed: results.length - failed.length, failed: failed.length, failures: failed, all: results };
    },
  };
  window.Demo = Demo;
})();
