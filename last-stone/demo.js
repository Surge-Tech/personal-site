// demo.js — scripted live demonstrations for the talk. Inert unless called (from the browser console, or by me
// when I run the talk). Every demo drives the REAL widgets through their public handles, exactly as a person
// would, so what the audience sees is the real thing.
//
//   Demo.go("s3")                      jump to a scene (enters presenter mode if needed)
//   Demo.setup("s6", {first:"human"})  reconfigure a board
//   Demo.line("s1", [2, 1, 3])         play a list of human moves (a number on one-pile boards, [row, take] on multi-row boards)
//   Demo.perfect("s0")                 play the human side perfectly until the game ends
//   Demo.mark("s0", [4, 8, 12]); Demo.check("s0"); Demo.show("s0")      the predict strip
//   Demo.handshake("s0", [1, 3, 2, 2]) the pairing widget
//   Demo.lab([4, 5, 6]); Demo.labMove()   the binary lab
//   Demo.scan("s2", false); Demo.binary("s3")   the microscope: check all 192 positions, then show them in binary
//   Demo.rules("1,4", {mark: [2, 5]}); Demo.ruleSolve(); Demo.ruleRows([3, 5, 7])   the rule lab ("L" scene)
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

    // The rule lab. `rule` is a preset id ("1,4", "kayles", "grundy") or a list of take amounts for "Your own".
    //   opts: { loses: true } last stone loses (take rules only), { mark: [..] } a prediction, { solve: true } solve instantly
    ruleLab() { const el = document.querySelector(".rulelab"); if (!el || !el.rulelab) throw new Error("no rule lab"); return el.rulelab; },
    rules(rule, opts = {}) {
      const L = Demo.ruleLab();
      Array.isArray(rule) ? L.setMoves(rule) : L.setRule(rule);
      if (opts.loses) L.setLast(true);
      if (opts.mark) L.mark(...opts.mark);
      if (opts.solve) L.solve(true);
      return L.state();
    },
    ruleSolve(instant = false) { Demo.ruleLab().solve(instant); },       // animated by default: the room watches it work upward
    ruleRows(rows) { return Demo.ruleLab().rows(rows); },

    // Build the bot (scene 2): fill the blanks, launch, watch it check every position. Pass false to watch it run.
    builder(id = "s2") { const el = scene(id).querySelector(".botbuild"); if (!el || !el.botbuild) throw new Error(`no bot builder in ${id}`); return el.botbuild; },
    build(id = "s2", instant = true) { const b = Demo.builder(id); b.fill(); return b.launch(instant); },

    // The microscope (scene 3): every position inside 3 · 5 · 7, and the doomed ones.
    microscope(id) { const el = scene(id).querySelector(".microscope"); if (!el || !el.microscope) throw new Error(`no microscope in ${id}`); return el.microscope; },
    scan(id, instant = true) { Demo.microscope(id).run(instant); },        // pass false to let the room watch it count
    binary(id, on = true) { Demo.microscope(id).binary(on); },

    // ----- Dry run: every demo the script uses, with checks. Run before a talk (then reload the page). -----
    async dryRun() {
      const results = [];
      const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail === undefined ? "" : String(detail) });
      const guard = async (name, fn) => { try { await fn(); } catch (e) { check(name, false, e.message); } };
      const hiddenIn = (id) => [...scene(id).querySelectorAll("[data-after-check]")].filter((n) => n.hidden).length;

      Demo.go("s1");
      await guard("D1 hustle", async () => {
        // a careless volunteer who goes first still loses to the perfect bot
        Demo.setup("s1", { start: "3,5,7", first: "human", last: "loses", bot: 0 });
        const before = hiddenIn("s1");
        let s = await Demo.line("s1", [[2, 3], [1, 2], [0, 1], [2, 1], [1, 1], [0, 1], [2, 1], [1, 1], [0, 1]], { pause: 150, beat: 120 });
        check("D1 hustle: game 1, the bot beats a careless volunteer", s.turn === "over" && /Bot wins/.test(s.status), s.status);
        // game 2: bot first, held for the presenter; press B and check its opening
        Demo.setup("s1", { start: "3,5,7", first: "bot", last: "loses", bot: 0 });
        await sleep(100);
        Demo.botMove();
        await sleep(700);
        const rows = Demo.state("s1").rows;
        const taken = [3 - rows[0], 5 - rows[1], 7 - rows[2]];
        check("D1 hustle: game 2, the bot opens by taking exactly 1 from one row", taken.filter((t) => t === 1).length === 1 && taken.filter((t) => t === 0).length === 2, rows.join(","));
        s = await Demo.line("s1", [[0, 2], [1, 1], [2, 1], [0, 1], [1, 1], [2, 1], [1, 1], [2, 1], [1, 1], [2, 1]], { pause: 150, beat: 120 });
        check("D1 hustle: game 2, the bot wins again", s.turn === "over" && /Bot wins/.test(s.status), s.status);
        check("D1 hustle: the Nimatron line appears after two losses", hiddenIn("s1") < before, `hidden ${before} -> ${hiddenIn("s1")}`);
      });

      Demo.go("s0");
      await guard("D2 predict", async () => {
        check("D2 hidden before the guess", hiddenIn("s0") >= 2, hiddenIn("s0"));
        Demo.mark("s0", [4, 8, 9]); Demo.check("s0");
        const st = Demo.strip("s0").state();
        check("D2 predict: graded (2 right, 1 wrong)", st.checked && st.guess.length === 3, JSON.stringify(st.guess));
        check("D2 predict: explanation revealed", hiddenIn("s0") <= 1, hiddenIn("s0"));   // the 'win'-staged line is still hidden
        Demo.clear("s0"); Demo.mark("s0", [4, 8, 12, 16, 20, 24]); Demo.check("s0");
        check("D2 predict: perfect answer", /All correct/.test(document.querySelector("#s0 .predict .tree-explain").textContent), document.querySelector("#s0 .predict .tree-explain").textContent);
      });
      await guard("D3 handshake", async () => {
        const st = await Demo.handshake("s0", [1, 3, 2, 2]);
        check("D3 handshake: four rounds, code takes last", st.round === 4, JSON.stringify(st));
        check("D3 handshake: four sums shown", document.querySelectorAll("#s0 .pgroup.done").length === 4, document.querySelectorAll("#s0 .pgroup.done").length);
      });
      await guard("D4 win from 15", async () => {
        const s = await Demo.perfect("s0", { board: 2, pause: 150, beat: 120 });
        check("D4 win from 15: you win", /You win/.test(s.status), s.status);
        check("D4 win from 15: bridge appears", hiddenIn("s0") === 0, hiddenIn("s0"));
      });

      Demo.go("s2");
      await guard("D5 build the bot", async () => {
        const hid = hiddenIn("s2");
        const b = Demo.builder("s2");
        check("D5 build: launch refused with blanks empty", b.launch() === false && /Fill in every blank/.test(b.state().message), b.state().message);
        // a wrong bot launches too, and loses where the right one can't
        b.pick("end", "won"); b.pick("winQ", "some"); b.pick("winT", "doomed"); b.pick("loseQ", "every"); b.pick("loseT", "winning"); b.pick("order", "most"); b.pick("play", "doomed");
        check("D5 build: wrong rules launch anyway", b.launch(true) === true && b.state().done, b.state().message);
        check("D5 build: the wrong bot can't decide most positions", b.state().unknown > 100, b.state().unknown);
        let wb = Demo.board("s2");
        wb.setup({ start: "2,4,6", first: "human" });
        const line = [];
        for (let k = 0; k < 20 && wb.state().turn !== "over"; k++) {
          if (wb.state().turn === "human") { const m = Misere.bruteMove(wb.state().piles) || MultiNim.legalMoves(wb.state().piles)[0]; line.push(m); await Demo.line("s2", [[m.pile, m.take]], { pause: 150, beat: 120 }); }
          else await sleep(200);
        }
        check("D5 build: we beat the wrong bot from 2 · 4 · 6", /You win/.test(wb.state().turn === "over" ? wb.root.querySelector('[data-r="status"]').textContent : ""), wb.root.querySelector('[data-r="status"]').textContent);
        b.checkRules();
        check("D5 build: Check our rules finds rule 4", /rule 4/.test(b.state().message) && b.state().wrong.join() === "order", b.state().message);
        b.editRules();
        b.fill();
        check("D5 build: the right rules launch", b.launch(false) === true && b.state().wrong.length === 0, b.state().message);
        await sleep(1500);
        const mid = b.state();
        check("D5 build: the run is live, not instant", mid.checked > 0 && mid.checked < mid.total, `${mid.checked} / ${mid.total}`);
        b.finish();
        const st = b.state();
        check("D5 build: all 192 checked, 24 doomed, 951 moves", st.done && st.checked === 192 && st.doomed.length === 24 && st.moves === 951, `${st.checked} / ${st.doomed.length} / ${st.moves}`);
        check("D5 build: the doomed list matches the brute-force solver", st.doomed.every((k) => !Misere.isWinningBrute(k.split(",").map(Number))), "");
        check("D5 build: the explanation appears after the run", hiddenIn("s2") < hid, `${hid} -> ${hiddenIn("s2")}`);
        const board = Demo.board("s2");
        check("D5 build: the board plays the bot we built", board.root.querySelector('[data-r="bot"]').closest("label").hidden, "");
        board.setup({ start: "2,4,6", first: "human" });
        await Demo.line("s2", [[2, 1]], { pause: 150, beat: 120 });   // 2 · 4 · 5: the built bot should hand back a doomed position
        const after = board.state().piles;
        check("D5 build: the built bot answers with a doomed position", !Misere.isWinningBrute(after), after.join(","));
      });

      Demo.go("s3");
      await guard("D6 crack", async () => {
        const hid = hiddenIn("s3");
        Demo.binary("s3");
        check("D6 binary view: 20 balanced, 4 odd ones out", document.querySelectorAll("#s3 .ms-bal").length === 20 && document.querySelectorAll("#s3 .ms-odd").length === 4,
          `${document.querySelectorAll("#s3 .ms-bal").length} / ${document.querySelectorAll("#s3 .ms-odd").length}`);
        check("D6 the odd ones out are the odd singles", Demo.microscope("s3").state().odd.join(" ") === "0,0,1 0,1,0 1,0,0 1,1,1", Demo.microscope("s3").state().odd.join(" "));
        check("D6 the proof is revealed", hiddenIn("s3") < hid, `${hid} -> ${hiddenIn("s3")}`);
        Demo.lab([4, 5, 6]); Demo.labMove();
        const steps = [...document.querySelectorAll("#s3 .lab-steps li")].map((l) => l.textContent);
        check("D6 lab: 4·5·6 -> take 1 from A", /taking 1 from row A, leaving 3 · 5 · 6/.test(steps[3] || ""), steps[3]);
        // the twist: a wrong move first, then the right one
        Demo.setup("s3", { start: "5,1,1", first: "human", last: "loses", bot: 0 });
        await Demo.line("s3", [[0, 1]], { pause: 150, beat: 120 });
        Demo.botMove();
        await sleep(700);
        check("D6 twist: after the wrong move the bot plays on", Demo.state("s3").turn !== "over", JSON.stringify(Demo.state("s3").rows));
        Demo.setup("s3", { start: "5,1,1", first: "human", last: "loses", bot: 0 });
        await Demo.line("s3", [[0, 4]], { pause: 150, beat: 120 });
        await Demo.line("s3", [[0, 1], [1, 1], [2, 1]], { pause: 150, beat: 120 });
        const end = Demo.state("s3");
        check("D6 twist: the right move wins", /You win/.test(end.status), end.status);
        check("D6 the code card appears after a game", hiddenIn("s3") === 0, hiddenIn("s3"));
      });

      Demo.go("s4");
      await guard("D7 revenge", async () => {
        Demo.setup("s4", { start: "3,5,7", first: "human", last: "loses", bot: 0 });
        document.querySelector("#s4 .nim-aux button").click();
        const hint = [...document.querySelectorAll("#s4 .lab-steps li")].map((l) => l.textContent);
        check("D7 revenge: hint at 3·5·7 says take 1 from row A", hint.length >= 4 && /taking 1 from row A, leaving 2 · 5 · 7/.test(hint.join(" ")), hint.join(" | ").slice(-110));
        const s = await Demo.perfect("s4", { pause: 150, beat: 120 });
        check("D7 revenge: the code beats the perfect bot", /You win/.test(s.status), s.status);
        check("D7 revenge: closing lines appear", hiddenIn("s4") === 0, hiddenIn("s4"));
        check("D7 revenge: the code card is visible", !document.querySelector("#s4 .codecard").hidden, "");
      });

      Demo.go("s5");
      await guard("D8 rule lab", async () => {
        const hid = hiddenIn("s5");
        let st = Demo.rules("1,4", { mark: [2, 5] });
        Demo.ruleSolve();
        await sleep(3200);                                       // the animated solve takes about 2.5 s for 36 sizes
        st = Demo.ruleLab().state();
        check("D8 take 1 or 4: animated solve finishes", st.solved, JSON.stringify(st));
        check("D8 take 1 or 4: doomed 0, 2, 5, 7, 10, 12", st.losing.slice(0, 6).join(",") === "0,2,5,7,10,12", st.losing.join(","));
        check("D8 take 1 or 4: repeats every 5, proven", st.pattern.period === 5 && st.proof === "proven", st.text);
        check("D8 explanation revealed after a solve", hiddenIn("s5") < hid, `${hid} -> ${hiddenIn("s5")}`);
        st = Demo.rules([1, 2], { loses: true, solve: true });
        check("D8 own rule take 1 or 2, last loses: 1, 4, 7", st.losing.slice(0, 3).join(",") === "1,4,7" && st.misere, st.losing.join(","));
        st = Demo.rules("kayles", { solve: true });
        check("D8 Kayles: every 12 from 71, proven", st.pattern.period === 12 && st.pattern.pre === 71 && st.proof === "proven", st.text);
        const rows = Demo.ruleRows([3, 5, 7]);
        check("D8 Kayles rows 3, 5, 7 act like 3, 4, 2", /3 acts like 3 .*5 acts like 4 .*7 acts like 2 .*Combined: 101\. Not balanced/.test(rows), rows);
        st = Demo.rules("grundy", { solve: true });
        check("D8 Grundy's game: no repeat, not proven", st.pattern === null && st.proof === "none" && /No repeat/.test(st.text), st.text);
        Demo.rules("1,4");                                       // leave it ready for the talk
      });

      Demo.go("s6");
      await guard("D9 classroom", async () => {
        check("D9 the dare is on screen", /hustle someone this week/.test(scene("s6").textContent), "");
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
