// multinim-ui.js — multi-row board ("take any number from ONE row"). Rules live in multinim.js (last stone wins)
// and misere.js (last stone LOSES). Every <div class="mn-board"> on the page becomes its own board.
//
// Options (data attributes):
//   data-default="3,5,7"      starting rows            data-first="bot"|"human"   who moves first
//   data-last="wins"|"loses"  what taking the LAST stone does (the page also offers a picker)
//   data-bot="0"|"0.3"        0 = perfect bot, 0.3 = slips 30% of the time
//   data-presets="classic"|"endgame"   which starting positions the picker offers
//   data-reveal="2losses"|"win"|"game"  when to tell journey.js a real attempt was made (reveals data-after-check)
//   data-uses="built-bot"     the bot is the one the room builds in scene 2 (botbuild.js calls api.useBot)
//   data-columns="live"       show the rows in binary under the board, plus a "show the winning move" hint
//                             (with the last stone losing, also a card showing which step of the code you are in)
// Boards that should not give the game away simply leave data-columns off.
(function () {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BOT_DELAY = REDUCED ? 0 : 800;
  const FADE_MS = REDUCED ? 0 : 300;
  const LABELS = "ABCDEFGH";
  const PRESETS = {
    classic: [["3,5,7", "3 · 5 · 7"], ["3,4,5", "3 · 4 · 5"], ["1,3,5,7", "1 · 3 · 5 · 7"], ["2,2", "2 · 2"], ["1,2,3", "1 · 2 · 3"]],
    endgame: [["4,1", "4 · 1"], ["5,1,1", "5 · 1 · 1"], ["3,1,1,1", "3 · 1 · 1 · 1"], ["6,1,1,1", "6 · 1 · 1 · 1"]],
    // positions inside 3 · 5 · 7 only: the bot built in scene 2 has a table for those and nothing else
    built: [["3,5,7", "3 · 5 · 7"], ["3,4,5", "3 · 4 · 5"], ["1,2,3", "1 · 2 · 3"], ["2,4,6", "2 · 4 · 6"]],
  };

  // Hover doesn't exist on touch screens, so there the first tap previews a take and the second confirms it.
  let twoStep = window.matchMedia("(hover: none)").matches;
  const boards = [];

  function createBoard(root) {
    const group = PRESETS[root.dataset.presets] ? root.dataset.presets : "classic";
    const cfg = {
      start: root.dataset.default || PRESETS[group][0][0],
      first: root.dataset.first || "bot",
      last: root.dataset.last || "wins",
      bot: root.dataset.bot || "0",
      reveal: root.dataset.reveal || "",
      live: root.dataset.columns === "live",
    };

    // ---------- Markup ----------
    root.innerHTML = `
      <section class="panel nim-controls" aria-label="Game setup">
        <label>Starting rows <select data-r="start">${PRESETS[group].map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>
        <label>First move <select data-r="first"><option value="bot">Bot</option><option value="human">You</option></select></label>
        <label>Last stone <select data-r="last"><option value="wins">wins</option><option value="loses">loses</option></select></label>
        <label>Bot <select data-r="bot"><option value="0">Perfect</option><option value="0.3">Casual (slips 30%)</option></select></label>
        <button type="button" class="link" data-r="new">New game</button>
      </section>
      <p class="muted" data-r="rule"></p>
      <section class="panel" aria-label="Rows">
        <div class="piles" data-r="piles"></div>
        <p class="result nim-status" role="status" aria-live="polite" data-r="status"></p>
        ${cfg.live ? `<div class="row nim-aux"><button type="button" class="setup" data-r="hint">Show the winning move</button></div>
        <ol class="lab-steps" data-r="hintbox"></ol>` : ""}
      </section>
      ${cfg.live ? `<section class="panel" aria-label="Binary view">
        <ol class="codecard" data-r="card" hidden>
          <li data-phase="nim"><b>1</b><span>Two or more rows have more than one stone: make every binary column even.</span></li>
          <li data-phase="last"><b>2</b><span>One big row left: leave an <u>odd</u> number of single stones.</span></li>
          <li data-phase="singles"><b>3</b><span>Only single stones left: leave an <u>odd</u> number.</span></li>
        </ol>
        <p class="kicker">Binary view</p>
        <div class="bintable-wrap" data-r="cols"></div>
      </section>` : ""}
      <section class="panel stats nim-stats" aria-label="Score">
        <div><b data-r="win">0</b><span>your wins</span></div>
        <div><b data-r="loss">0</b><span>bot wins</span></div>
        <div><b data-r="games">0</b><span>games</span></div>
      </section>
      <section class="panel">
        <span class="muted">Moves this game</span>
        <ol class="nim-log" data-r="log"></ol>
      </section>`;
    if (cfg.live) root.classList.add("mn-live");     // wide screens put the binary view beside the board
    const R = {};
    root.querySelectorAll("[data-r]").forEach((n) => { R[n.dataset.r] = n; });
    R.start.value = cfg.start;
    R.first.value = cfg.first;
    R.last.value = cfg.last;
    R.bot.value = cfg.bot;

    let customBot = null;                      // set by api.useBot (botbuild.js): replaces the built-in bot
    let g;                                     // { piles, misere, turn: "human"|"bot"|"animating"|"over", bot, timer, sel, hint }
    const tally = { win: 0, loss: 0 };
    let rows = [];                             // rows[p] = stone buttons of row p (for previews)
    const total = () => g.piles.reduce((a, b) => a + b, 0);
    const describe = (piles) => piles.join(" · ");
    const width = () => Math.max(3, ...g.piles.map((n) => n.toString(2).length), ...R.start.value.split(",").map((n) => Number(n).toString(2).length));

    function newGame() {
      if (g && g.timer) clearTimeout(g.timer);
      if (window.BotGate) BotGate.clear();                  // drop a bot move that was waiting for the presenter
      const misere = R.last.value === "loses";
      const rate = Number(R.bot.value);
      g = {
        piles: R.start.value.split(",").map(Number),
        misere,
        turn: R.first.value,
        bot: customBot || (misere ? Misere.createBot(Math.random, rate) : MultiNim.createBot(Math.random, rate)),
        timer: null, sel: null, hint: null,
      };
      R.rule.textContent = misere ? "Rule: whoever takes the last stone loses." : "Rule: whoever takes the last stone wins.";
      R.log.replaceChildren();
      render();
      statusForTurn();
      if (g.turn === "bot") scheduleBot();
    }

    // ---------- Rendering ----------
    // `removed` = {pile, take} while the stones just taken fade out. g.piles has already dropped by then,
    // so that one row is drawn with n + take stones and the last `take` of them are faded.
    function render(removed = null) {
      g.sel = null;
      g.hint = null;
      rows = [];
      R.piles.replaceChildren(
        ...g.piles.map((n, p) => {
          const row = document.createElement("div");
          row.className = "pile-row";
          const label = document.createElement("span");
          label.className = "pile-label";
          label.textContent = LABELS[p];
          const stones = document.createElement("div");
          stones.className = "stone-row";
          const shown = n + (removed && removed.pile === p ? removed.take : 0);
          const btns = [];
          for (let i = 0; i < shown; i++) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "stone" + (i >= n ? " gone" : "");
            b.disabled = g.turn !== "human" || i >= n;
            b.setAttribute("aria-label", `Take ${n - i} from row ${LABELS[p]}, leaving ${i}`);
            b.addEventListener("mouseenter", () => !twoStep && setPreview(p, i));
            b.addEventListener("focus", () => setPreview(p, i));
            b.addEventListener("mouseleave", () => !twoStep && setPreview(null));
            b.addEventListener("blur", () => !twoStep && setPreview(null));
            b.addEventListener("click", () => onStone(p, i));
            btns.push(b);
            stones.appendChild(b);
          }
          if (n === 0 && !removed) stones.appendChild(Object.assign(document.createElement("span"), { className: "pile-empty", textContent: "empty" }));
          rows.push(btns);
          row.append(label, stones);
          return row;
        })
      );
      R.win.textContent = tally.win;
      R.loss.textContent = tally.loss;
      R.games.textContent = tally.win + tally.loss;
      if (cfg.live) { renderLive(); R.hint.disabled = g.turn !== "human"; }
    }

    // Binary view, hint text and code card (live boards only). Redrawn on its own when the hint is toggled.
    function renderLive() {
      Binary.renderTable(R.cols, g.piles, { width: width(), highlight: g.hint && g.hint.highlight && g.hint.highlight.column !== undefined ? g.hint.highlight : null });
      R.hintbox.replaceChildren(...(g.hint ? g.hint.steps.map((s) => Object.assign(document.createElement("li"), { textContent: s })) : []));
      // The code card only matters when the last stone loses: highlight the step you are on.
      R.card.hidden = !g.misere;
      if (g.misere) {
        const ph = total() === 0 ? null : Misere.phase(g.piles);
        R.card.querySelectorAll("li").forEach((li) => li.classList.toggle("on", li.dataset.phase === ph));
      }
    }

    // Highlight stone i and everything after it in row p: exactly the stones a click would take.
    function setPreview(p, i) {
      rows.forEach((btns) => btns.forEach((b) => b.classList.remove("preview")));
      if (p === null || p === undefined) return;
      rows[p].forEach((b, k) => { if (k >= i && !b.classList.contains("gone")) b.classList.add("preview"); });
    }

    function setStatus(text, cls = "") {
      R.status.textContent = text;
      R.status.className = "result nim-status " + cls;
    }

    function statusForTurn() {
      if (g.turn === "human") setStatus("Your move. Choose a row, then how many to take.");
      else if (g.turn === "bot") setStatus("Bot is thinking…");
    }

    function logMove(who, pile, take) {
      const li = document.createElement("li");
      li.textContent = `${who} took ${take} from ${LABELS[pile]} → ${describe(g.piles)}`;
      R.log.appendChild(li);
    }

    // ---------- Moves ----------
    function onStone(p, i) {
      if (g.turn !== "human") return;
      const take = g.piles[p] - i;
      if (twoStep && !(g.sel && g.sel.pile === p && g.sel.take === take)) {
        g.sel = { pile: p, take };
        setPreview(p, i);
        setStatus(`Take ${take} from row ${LABELS[p]}? Tap the highlighted stones again to confirm.`);
        return;
      }
      applyAndAdvance("human", p, take);
    }

    function applyAndAdvance(who, pile, take) {
      const mine = g;                                       // a "New game" click mid-fade must not touch the new game
      g.piles = MultiNim.applyMove(g.piles, pile, take);    // throws on an illegal move
      g.turn = "animating";                                 // block input during the fade
      logMove(who === "human" ? "You" : "Bot", pile, take);
      setStatus(`${who === "human" ? "You" : "Bot"} took ${take} from row ${LABELS[pile]}.`);
      render({ pile, take });                               // stones fade...
      setTimeout(() => {
        if (mine !== g) return;
        if (total() === 0) return finish(who);
        g.turn = who === "human" ? "bot" : "human";         // ...then the rows redraw and the other side moves
        statusForTurn();
        render();
        if (g.turn === "bot") scheduleBot();
      }, FADE_MS);
    }

    function scheduleBot() {
      const mine = g;                                       // ignore the move if a new game started meanwhile
      const run = () => {
        if (mine !== g) return;
        const m = g.bot.choose(g.piles);
        applyAndAdvance("bot", m.pile, m.take);
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

    function showHint() {
      if (!cfg.live || g.turn !== "human") return;
      g.hint = g.misere ? Misere.explain(g.piles, width()) : Binary.explainMove(g.piles, width());
      renderLive();
    }

    // ---------- Wiring ----------
    R.new.addEventListener("click", newGame);
    [R.start, R.first, R.bot].forEach((el) => el.addEventListener("change", newGame));
    // The two rules are different games, so the score doesn't carry over between them.
    R.last.addEventListener("change", () => { tally.win = 0; tally.loss = 0; newGame(); });
    if (cfg.live) R.hint.addEventListener("click", showHint);

    newGame();

    const api = {
      root, tally, state: () => g, newGame, hint: showHint,
      takeFrom: (pile, take) => { if (g.turn === "human") applyAndAdvance("human", pile, take); },   // programmatic move (demo.js, tests)
      // Reconfigure and restart, e.g. api.setup({ start: "3,5,7", first: "human", last: "loses", bot: "0" })
      setup(o = {}) {
        if (o.start) R.start.value = o.start;
        if (o.first) R.first.value = o.first;
        // Reset the score only when the rule really changes: scene 0's "game 2, the bot goes first" passes the same
        // last-stone rule again, and wiping the volunteer's first loss there would keep the Nimatron line hidden.
        if (o.last && o.last !== R.last.value) { R.last.value = o.last; tally.win = 0; tally.loss = 0; }
        if (o.bot !== undefined) R.bot.value = String(o.bot);
        newGame();
      },
      // Play with someone else's bot ({ choose(piles) }), e.g. the one built in scene 2. The bot picker hides.
      useBot(bot) {
        customBot = bot || null;
        R.bot.closest("label").hidden = !!customBot;
        newGame();
      },
    };
    root._board = api;
    return api;
  }

  document.querySelectorAll(".mn-board").forEach((el) => boards.push(createBoard(el)));
  window.MultiNimUI = { boards, setTwoStep: (v) => { twoStep = v; } };   // handy for debugging in the console
})();
