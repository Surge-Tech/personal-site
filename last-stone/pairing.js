// pairing.js — "the handshake": why the bot can't lose from a multiple of 4.
// 16 stones in four groups of 4. You take 1, 2 or 3; the code takes the rest of that group of 4, so every round
// clears exactly one group and the code always takes the last stone.
//
// reply() is the only logic (tested in Node). createPairing() draws it (browser only).

(function (root) {
  const GROUP = 4, GROUPS = 4;

  // Whatever you take (1..3), the code takes the rest of a four.
  function reply(x) {
    if (!Number.isInteger(x) || x < 1 || x > GROUP - 1) throw new Error(`you can take 1 to ${GROUP - 1}, not ${x}`);
    return GROUP - x;
  }

  const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const REPLY_DELAY = REDUCED ? 0 : 650;

  function createPairing(el) {
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
    const stage = mk("div", "pairing-stage");
    stage.setAttribute("aria-hidden", "true");
    const msg = mk("p", "result nim-status");
    msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
    const takes = mk("div", "takes");
    const again = mk("button", "link", "Start over");
    again.type = "button";
    el.append(stage, msg, takes, again);

    let round, busy, groups;

    function reset() {
      round = 0; busy = false;
      stage.replaceChildren();
      groups = Array.from({ length: GROUPS }, () => {
        const grp = mk("div", "pgroup");
        const stones = Array.from({ length: GROUP }, () => grp.appendChild(mk("span", "pstone")));
        grp._stones = stones;
        stage.appendChild(grp);
        return grp;
      });
      msg.textContent = "Take 1, 2 or 3. Watch what the code takes back.";
      msg.className = "result nim-status";
      draw();
    }

    function draw() {
      takes.querySelectorAll("button").forEach((b) => { b.disabled = busy || round >= GROUPS; });
    }

    // Programmatic or click: you take x, then the code takes the rest of the four.
    function play(x) {
      if (busy || round >= GROUPS) return false;
      const y = reply(x);
      busy = true; draw();
      const grp = groups[GROUPS - 1 - round];           // the rightmost group still standing
      grp._stones.slice(GROUP - x).forEach((s) => s.classList.add("you"));            // you take from the right end
      msg.textContent = `You took ${x}.`;
      setTimeout(() => {
        grp._stones.slice(0, GROUP - x).forEach((s) => s.classList.add("code"));
        grp.classList.add("done");
        grp.dataset.sum = `${x} + ${y} = ${GROUP}`;
        round++; busy = false;
        if (round >= GROUPS) {
          msg.textContent = `The code takes ${y}. ${x} + ${y} = ${GROUP}. Nothing is left: the code took the last stone. It never had to guess.`;
          msg.className = "result nim-status loss";
        } else {
          msg.textContent = `The code takes ${y}. ${x} + ${y} = ${GROUP}. ${GROUP * (GROUPS - round)} left.`;
        }
        draw();
      }, REPLY_DELAY);
      return true;
    }

    for (let x = 1; x < GROUP; x++) {
      const b = mk("button", "move take", `Take ${x}`);
      b.type = "button";
      b.addEventListener("click", () => play(x));
      takes.appendChild(b);
    }
    again.addEventListener("click", reset);
    reset();
    el._pairing = { play, reset, state: () => ({ round, busy }) };
  }

  const Pairing = { reply, GROUP, GROUPS };
  if (typeof module !== "undefined" && module.exports) module.exports = Pairing;
  else {
    root.Pairing = Pairing;
    const init = () => document.querySelectorAll(".pairing").forEach(createPairing);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  }
})(typeof window !== "undefined" ? window : globalThis);
