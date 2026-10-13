// nim-ui.js — the one-pile board ("take 1 to k"), as a factory. Every <div class="nim-board"> on the page
// becomes its own independent board. Rules live in nim.js.
//
// Options (data attributes on the div):
//   data-start="15"   pile size              data-max="3"          most you may take in one turn
//   data-first="bot"|"human"   who moves first   data-last="wins"|"loses"   what taking the LAST stone does
//   data-bot="0"|"0.3"         0 = perfect bot, 0.3 = slips 30% of the time
//   data-reveal="2losses"|"win"|"game"   when to tell journey.js a real attempt was made, so it reveals the
//                                        scene's hidden explanations (see data-after-check in journey.js)
//   data-hide="first,last,bot"          comma list of controls to hide
//
// Deliberately NO hint here: finding the pattern is the point.
(function () {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BOT_DELAY = REDUCED ? 0 : 800;   // theater: the bot's answer is instant, the pause makes it feel like a turn
  const FADE_MS = REDUCED ? 0 : 300;
  const boards = [];

  function createBoard(root) {
    const cfg = {
      start: Number(root.dataset.start || 15),
      max: Number(root.dataset.max || 3),
      first: root.dataset.first || "bot",
      last: root.dataset.last || "wins",
      bot: root.dataset.bot || "0",
      reveal: root.dataset.reveal || "",
      hide: (root.dataset.hide || "").split(",").map((s) => s.trim()).filter(Boolean),
    };
    const MOVES = Array.from({ length: cfg.max }, (_, i) => i + 1);

    // ---------- Markup ----------
    root.innerHTML = `
      <section class="panel nim-controls" aria-label="Game setup">
        <label data-c="first">First move <select data-r="first"><option value="bot">Bot</option><option value="human">You</option></select></label>
        <label data-c="last">Last stone <select data-r="last"><option value="wins">wins</option><option value="loses">loses</option></select></label>
        <label data-c="bot">Bot <select data-r="bot"><option value="0">Perfect</option><option value="0.3">Casual (slips 30%)</option></select></label>
        <button type="button" class="link" data-r="new">New game</button>
      </section>
      <p class="muted" data-r="rule"></p>
      <section class="panel nim-board" aria-label="Pile">
        <div class="pile" data-r="pile" aria-hidden="true"></div>
        <p class="result nim-status" role="status" aria-live="polite" data-r="status"></p>
        <div class="takes" data-r="takes" aria-label="Take stones"></div>
      </section>
      <section class="panel stats nim-stats" aria-label="Score">
        <div><b data-r="win">0</b><span>your wins</span></div>
        <div><b data-r="loss">0</b><span>bot wins</span></div>
        <div><b data-r="games">0</b><span>games</span></div>
      </section>
      <section class="panel">
        <span class="muted">Moves this game</span>
        <ol class="nim-log" data-r="log"></ol>
      </section>`;
    const R = {};
    root.querySelectorAll("[data-r]").forEach((n) => { R[n.dataset.r] = n; });
    cfg.hide.forEach((c) => { const l = root.querySelector(`[data-c="${c}"]`); if (l) l.hidden = true; });
    R.first.value = cfg.first;
    R.last.value = cfg.last;
    R.bot.value = cfg.bot;

    let g;                                  // { misere, bot, n, turn: "human"|"bot"|"animating"|"over", timer }
    const tally = { win: 0, loss: 0 };

    function newGame() {
      if (g && g.timer) clearTimeout(g.timer);
      if (window.BotGate) BotGate.clear();           // drop a bot move that was waiting for the presenter
      const misere = R.last.value === "loses";       // true: whoever takes the LAST stone loses
      g = {
        misere,
        bot: Nim.createBot(MOVES, Math.random, Number(R.bot.value), misere),
        n: cfg.start, turn: R.first.value, timer: null,
      };
      R.rule.textContent = misere ? "Rule: whoever takes the last stone loses." : "Rule: whoever takes the last stone wins.";
      R.log.replaceChildren();
      buildTakeButtons();
      render();
      statusForTurn();
      if (g.turn === "bot") scheduleBot();
    }

    function buildTakeButtons() {
      R.takes.replaceChildren(
        ...MOVES.map((m) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "move take";
          b.dataset.take = m;
          b.innerHTML = `Take ${m} <kbd>${m}</kbd>`;
          b.addEventListener("click", () => humanMove(m));
          return b;
        })
      );
    }

    // ---------- Rendering ----------
    function render(removing = 0) {
      // Pile: one div per stone. g.n has already dropped by the time we animate, so draw
      // n + removing stones and fade the last `removing` of them; the next render drops them.
      R.pile.replaceChildren(
        ...Array.from({ length: g.n + removing }, (_, i) => {
          const d = document.createElement("div");
          d.className = "stone" + (i >= g.n ? " gone" : "");
          return d;
        })
      );
      root.querySelectorAll(".take").forEach((b) => {
        b.disabled = g.turn !== "human" || Number(b.dataset.take) > g.n;
      });
      R.win.textContent = tally.win;
      R.loss.textContent = tally.loss;
      R.games.textContent = tally.win + tally.loss;
    }

    function setStatus(text, cls = "") {
      R.status.textContent = text;
      R.status.className = "result nim-status " + cls;
    }

    function statusForTurn() {
      if (g.turn === "human") setStatus(`Your move. ${g.n} stone${g.n === 1 ? "" : "s"} left.`);
      else if (g.turn === "bot") setStatus("Bot is thinking…");
    }

    function logMove(who, take) {
      const li = document.createElement("li");
      li.textContent = `${who} took ${take} → ${g.n} left`;
      R.log.appendChild(li);
    }

    // ---------- Moves ----------
    function applyAndAdvance(who, take) {
      const mine = g;                                // a "New game" click mid-fade must not touch the new game
      g.n = Nim.applyMove(g.n, take, MOVES);         // throws on an illegal move
      g.turn = "animating";                          // block input during the fade
      logMove(who === "human" ? "You" : "Bot", take);
      setStatus(`${who === "human" ? "You" : "Bot"} took ${take}.`);
      render(take);                                  // stones fade...
      setTimeout(() => {
        if (mine !== g) return;
        if (g.n === 0) return finish(who);
        g.turn = who === "human" ? "bot" : "human";  // ...then the pile redraws and the other side moves
        statusForTurn();
        render();
        if (g.turn === "bot") scheduleBot();
      }, FADE_MS);
    }

    function humanMove(take) {
      if (g.turn !== "human") return;
      applyAndAdvance("human", take);
    }

    function scheduleBot() {
      const mine = g;                                // ignore the move if a new game started meanwhile
      const run = () => {
        if (mine !== g) return;
        applyAndAdvance("bot", g.bot.choose(g.n));
      };
      // Presenter mode can make the bot wait for a keypress (BotGate lives in presenter.js).
      if (window.BotGate && BotGate.enabled) {
        setStatus("Bot is ready. Presenter: press B.");
        BotGate.hold(run);
        return;
      }
      setStatus("Bot is thinking…");
      g.timer = setTimeout(run, BOT_DELAY);
    }

    // `taker` is whoever took the last stone. Normal play: they win. Misere: they LOSE.
    function finish(taker) {
      g.turn = "over";
      const humanWon = g.misere ? taker === "bot" : taker === "human";
      if (humanWon) tally.win++; else tally.loss++;
      const text = {
        "normal:human": "You took the last stone. You win.",
        "normal:bot": "Bot took the last stone. Bot wins.",
        "misere:human": "You took the last stone, so you lose. Bot wins.",
        "misere:bot": "Bot took the last stone, so it loses. You win.",
      }[`${g.misere ? "misere" : "normal"}:${taker}`];
      setStatus(text, humanWon ? "win" : "loss");
      render();
      // Tell journey.js a real attempt was made so the scene's hidden explanations can appear.
      const fire = (stage) => root.dispatchEvent(new CustomEvent("attempted", { bubbles: true, detail: { stage } }));
      if (cfg.reveal === "game") fire("game");
      if (cfg.reveal === "win" && humanWon) fire("win");
      if (cfg.reveal === "2losses" && tally.loss >= 2) fire("2losses");
    }

    // ---------- Wiring ----------
    R.new.addEventListener("click", newGame);
    [R.first, R.bot].forEach((el) => el.addEventListener("change", newGame));
    // The two rules are different games, so the score doesn't carry over between them.
    R.last.addEventListener("change", () => { tally.win = 0; tally.loss = 0; newGame(); });

    newGame();

    const api = {
      root, tally, state: () => g, newGame,
      take: (k) => humanMove(k),                    // programmatic move (used by demo.js and tests)
      // Reconfigure and restart, e.g. api.setup({ first: "human", last: "loses", bot: "0" })
      setup(o = {}) {
        if (o.first) R.first.value = o.first;
        if (o.last) { R.last.value = o.last; tally.win = 0; tally.loss = 0; }
        if (o.bot !== undefined) R.bot.value = String(o.bot);
        if (o.start) cfg.start = Number(o.start);
        newGame();
      },
    };
    root._board = api;
    return api;
  }

  document.querySelectorAll(".nim-board").forEach((el) => boards.push(createBoard(el)));

  // Keys 1..k take stones, but only on the board whose scene is on screen (journey.js / presenter.js set body.dataset.scene).
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
    const k = Number(e.key);
    if (!(k >= 1 && k <= 9)) return;
    const board = boards.find((b) => b.root.closest(".chapter") && b.root.closest(".chapter").id === document.body.dataset.scene);
    if (!board) return;
    const st = board.state();
    if (k <= Math.min(board.root.querySelectorAll(".take").length, st.n)) board.take(k);
  });

  window.NimBoards = boards;
})();
