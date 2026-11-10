// presenter.js — presenter mode: the same page, shown one scene at a time with big type and a control bar.
//
// A "scene" is a chapter (<section class="chapter">, except the "in progress" teaser).
// This is a VIEW over the existing content, so it keeps working when scenes are rewritten.
//
// Open it with the "Presenter mode" link, with ?present in the URL, or by pressing P.
//
// Keys (clicker-friendly; letters are used so the 1-3 stone shortcuts keep working):
//   Right  PageDown  Space  N     next scene        Left  PageUp  P    previous scene
//   R   reveal this scene's hidden explanations     B   let the bot move (when "Bot waits" is on)
//   + / -   text size (0 = automatic)               F   fullscreen       H   hide / show the bar
//   ?   key help                                    Esc leave presenter mode
// While presenter mode is OFF, P turns it on. Once it is ON, P goes to the previous scene.
//
// There is no server, so audience devices cannot follow along live. The bar shows each scene's number,
// which matches the numbers in the audience's top bar: "say: open 2".

(function () {
  const body = document.body;
  const root = document.documentElement;
  const scenes = [...document.querySelectorAll(".chapter:not(.next)")];
  if (scenes.length === 0) return;

  // ---------- tiny persistence (works without localStorage) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window etc.: ignore */ } },
  };

  // ---------- BotGate: lets the presenter decide WHEN the bot replies ----------
  // Boards call BotGate.hold(fn) instead of using their own timer while the gate is enabled.
  const BotGate = {
    enabled: false,
    cb: null,
    hold(cb) { this.cb = cb; refreshBar(); },
    clear() { this.cb = null; refreshBar(); },
    release() { const cb = this.cb; this.cb = null; refreshBar(); if (cb) cb(); },
  };
  window.BotGate = BotGate;

  // ---------- State ----------
  let on = false;
  let idx = 0;
  let zoom = store.get("present.zoom", null);        // null = automatic, from the window width
  let botWaits = store.get("present.botWaits", true);
  let barHidden = false;

  // Automatic text size: as big as the window allows, limited by width AND height so a scene fits on screen
  // when it can. 1920x1080 gives about 1.7; 1366x768 about 1.2. The presenter can nudge it with + and -.
  const autoZoom = () => Math.round(Math.max(1, Math.min(2.2, window.innerWidth / 800, window.innerHeight / 620)) * 100) / 100;
  const currentZoom = () => (zoom === null ? autoZoom() : zoom);
  const sceneNumber = (s) => { const a = document.querySelector(`.journey a[href="#${s.id}"] b`); return a ? a.textContent : String(scenes.indexOf(s)); };
  const sceneName = (s) => { const a = document.querySelector(`.journey a[href="#${s.id}"] span`); return a ? a.textContent : s.id; };

  // ---------- Control bar ----------
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const btn = (label, title, fn, cls) => { const b = el("button", "pbtn" + (cls ? " " + cls : ""), label); b.type = "button"; b.title = title; b.addEventListener("click", () => { fn(); b.blur(); }); return b; };

  const bar = el("div", "pbar");
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Presenter controls");
  bar.hidden = true;

  const info = el("div", "pbar-info");
  const infoCount = el("span", "pbar-count");
  const infoName = el("b", "pbar-name");
  const infoSay = el("span", "pbar-say");
  const infoMore = el("span", "pbar-more", "↓ more");
  info.append(infoCount, infoName, infoSay, infoMore);

  const dots = el("div", "pbar-dots");
  const dotBtns = scenes.map((s, i) => {
    const b = el("button", "pdot", sceneNumber(s));
    b.type = "button";
    b.title = sceneName(s);
    b.addEventListener("click", () => { go(i); b.blur(); });
    dots.appendChild(b);
    return b;
  });

  const actions = el("div", "pbar-actions");
  const bPrev = btn("←", "Previous scene (←)", () => go(idx - 1));
  const bNext = btn("→", "Next scene (→, Space, Page Down)", () => go(idx + 1));
  const bReveal = btn("Reveal", "Show this scene's hidden explanations (R)", reveal);
  const bBot = btn("Bot move", "Let the bot reply now (B)", () => BotGate.release());
  const bWait = btn("", "Make the bot wait for you before it replies", toggleBotWait);
  const bSmaller = btn("A−", "Smaller text (-)", () => setZoom(currentZoom() - 0.2));
  const bBigger = btn("A+", "Bigger text (+)", () => setZoom(currentZoom() + 0.2));
  const bFull = btn("Fullscreen", "Fullscreen (F)", toggleFullscreen);
  const bNotes = btn("Notes", "Open the speaker-notes window: script, timer and controls (S)", openNotes);
  const bKeys = btn("Keys", "Show keyboard shortcuts (?)", toggleHelp);
  const bExit = btn("Exit", "Leave presenter mode (Esc)", exitPresent);
  actions.append(bPrev, bNext, bReveal, bBot, bWait, bSmaller, bBigger, bFull, bNotes, bKeys, bExit);

  const help = el("div", "pbar-help");
  help.hidden = true;
  help.innerHTML = `
    <p><b>Next / previous</b>: → ← &nbsp; Page Down / Page Up &nbsp; Space</p>
    <p><b>R</b> reveal this scene's hidden explanations &nbsp; <b>B</b> let the bot move &nbsp; <b>H</b> hide this bar &nbsp; <b>S</b> speaker notes window</p>
    <p><b>+ / −</b> text size, <b>0</b> automatic &nbsp; <b>F</b> fullscreen &nbsp; <b>Esc</b> leave presenter mode</p>
    <p>Audience devices don't follow your screen. Tell them the scene number from the bar.</p>`;

  bar.append(info, dots, actions, help);
  body.appendChild(bar);

  // ---------- Second window: speaker notes (notes.html) ----------
  // The two windows talk over a BroadcastChannel (same browser, same site, no server). The notes window shows the
  // script, a timer and big control buttons; the projected window stays clean. Either window can drive the scenes.
  const chan = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("last-stone-present") : null;

  function statePayload() {
    const s = scenes[idx];
    return {
      type: "state", on, idx, id: s.id, total: scenes.length,
      scenes: scenes.map((x) => ({ id: x.id, name: sceneName(x), num: sceneNumber(x) })),
      hidden: s.querySelectorAll("[data-after-check][hidden]").length,
      botPending: !!BotGate.cb, botWaits,
    };
  }
  function broadcast() { if (chan) chan.postMessage(statePayload()); }

  // The notes window needs notes.html and talk.json next to this page. The PUBLIC copy of the site leaves them out on
  // purpose (they hold the script and the answers), so the Notes button and the S key only exist when running locally.
  // Add ?notes to the address to force them on, e.g. if you publish the presenter tools too.
  const notesAvailable = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || new URLSearchParams(location.search).has("notes");
  bNotes.hidden = !notesAvailable;

  function openNotes() {
    if (!notesAvailable) return;
    const w = window.open("notes.html", "last-stone-notes", "width=560,height=900");
    if (!w) alert("The browser blocked the notes window. Allow pop-ups for this page and press S again.");
  }

  if (chan) {
    chan.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === "hello") { broadcast(); return; }               // a notes window just opened and wants the current state
      if (m.type !== "cmd") return;
      switch (m.cmd) {
        case "enter": enterPresent(m.i); break;
        case "exit": exitPresent(); break;
        case "go": go(m.i); break;
        case "next": go(idx + 1); break;
        case "prev": go(idx - 1); break;
        case "reveal": if (on) reveal(); break;
        case "bot": BotGate.release(); break;
        case "toggleBotWait": if (on) toggleBotWait(); break;
        default:
      }
    };
  }

  // ---------- Behaviour ----------
  function go(i) {
    if (!on) return;
    const next = Math.max(0, Math.min(scenes.length - 1, i));
    if (BotGate.cb) BotGate.release();                 // don't leave a bot move stuck on a scene we are leaving
    idx = next;
    show();
    window.scrollTo({ top: 0, behavior: "instant" });
    refreshBar();
  }

  function show() {
    scenes.forEach((s, i) => s.classList.toggle("p-current", i === idx));
    body.dataset.scene = scenes[idx].id;                  // boards use this to decide who owns the 1-3 keys (as journey.js does)
    window.dispatchEvent(new Event("resize"));            // charts / trees re-measure their (now visible) boxes
  }

  // New content that appears mid-scene (a revealed rule, the next exercise) scrolls itself into view, so the
  // presenter never has to chase it with the mouse while a clicker is in their hand.
  const gated = (s) => [...s.querySelectorAll("[data-after-check]")];
  function scrollToFresh(before) {
    const fresh = before.find((n) => !n.hidden);
    if (fresh) fresh.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reveal() {
    const before = gated(scenes[idx]).filter((n) => n.hidden);
    before.forEach((n) => { n.hidden = false; });
    setTimeout(() => scrollToFresh(before), 60);
    refreshBar();
  }

  function setZoom(z) {
    zoom = Math.max(1, Math.min(2.6, Math.round(z * 10) / 10));
    store.set("present.zoom", zoom);
    applyZoom();
  }
  function applyZoom() {
    root.style.setProperty("--pz", String(currentZoom()));
    window.dispatchEvent(new Event("resize"));
    setTimeout(refreshBar, 100);
  }

  function toggleBotWait() {
    botWaits = !botWaits;
    store.set("present.botWaits", botWaits);
    BotGate.enabled = on && botWaits;
    if (!BotGate.enabled && BotGate.cb) BotGate.release();   // turning it off lets a waiting bot move now
    refreshBar();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  }

  function toggleHelp() { help.hidden = !help.hidden; }

  function currentIndexFromPage() {
    const link = document.querySelector(".journey a[aria-current]");
    const id = link ? link.getAttribute("href").slice(1) : null;
    const i = scenes.findIndex((s) => s.id === id);
    return i < 0 ? 0 : i;
  }

  function enterPresent(startAt) {
    if (on) return;
    on = true;
    idx = startAt === undefined ? currentIndexFromPage() : startAt;
    body.classList.add("present");
    bar.hidden = barHidden;
    BotGate.enabled = botWaits;
    applyZoom();
    show();
    window.scrollTo({ top: 0, behavior: "instant" });
    refreshBar();
  }

  function exitPresent() {
    if (!on) return;
    const id = scenes[idx].id;
    on = false;
    BotGate.enabled = false;
    if (BotGate.cb) BotGate.release();
    body.classList.remove("present");
    scenes.forEach((s) => s.classList.remove("p-current"));
    bar.hidden = true;
    help.hidden = true;
    root.style.removeProperty("--pz");
    if (document.fullscreenElement) document.exitFullscreen();
    window.dispatchEvent(new Event("resize"));
    const target = document.getElementById(id);
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 56, behavior: "instant" });
    broadcast();
  }

  function refreshBar() {
    if (!on) return;
    broadcast();                                         // keep the notes window in step
    const s = scenes[idx];
    infoCount.textContent = `${idx + 1} / ${scenes.length}`;
    infoName.textContent = sceneName(s);
    infoSay.textContent = `Audience: open ${sceneNumber(s)} in the top bar`;
    dotBtns.forEach((b, i) => { b.classList.toggle("on", i === idx); if (i === idx) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    bPrev.disabled = idx === 0;
    bNext.disabled = idx === scenes.length - 1;
    const hidden = s.querySelectorAll("[data-after-check][hidden]").length;
    bReveal.disabled = hidden === 0;
    bReveal.textContent = hidden ? `Reveal (${hidden})` : "Reveal";
    bBot.disabled = !BotGate.cb;
    bBot.classList.toggle("hot", !!BotGate.cb);
    bWait.textContent = `Bot waits: ${botWaits ? "on" : "off"}`;
    bWait.setAttribute("aria-pressed", String(botWaits));
    const more = root.scrollHeight > window.innerHeight + 24 && window.scrollY + window.innerHeight < root.scrollHeight - 24;
    infoMore.hidden = !more;
  }

  // ---------- Keyboard ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    const typing = tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA";
    const k = e.key;

    if (!on) {
      if ((k === "p" || k === "P") && !typing) { e.preventDefault(); enterPresent(); }
      return;
    }
    if (typing) return;                                 // arrows belong to a focused picker
    const used = (fn) => { e.preventDefault(); fn(); };
    switch (k) {
      case "ArrowRight": case "PageDown": case "n": case "N": return used(() => go(idx + 1));
      case " ": if (tag !== "BUTTON") return used(() => go(idx + 1)); return;   // Space on a focused button presses it
      case "ArrowLeft": case "PageUp": case "p": case "P": return used(() => go(idx - 1));
      case "r": case "R": return used(reveal);
      case "b": case "B": return used(() => BotGate.release());
      case "f": case "F": return used(toggleFullscreen);
      case "h": case "H": return used(() => { barHidden = !barHidden; bar.hidden = barHidden; });
      case "s": case "S": return used(openNotes);
      case "+": case "=": return used(() => setZoom(currentZoom() + 0.2));
      case "-": case "_": return used(() => setZoom(currentZoom() - 0.2));
      case "0": return used(() => { zoom = null; store.set("present.zoom", null); applyZoom(); });
      case "?": return used(toggleHelp);
      case "Escape": return used(exitPresent);
      default:
    }
  });

  // Keep the "more below" hint and Reveal count fresh as the scene changes under the presenter's hands.
  window.addEventListener("scroll", () => { if (on) refreshBar(); }, { passive: true });
  window.addEventListener("resize", () => {
    if (!on) return;
    // Automatic size follows the window (e.g. when it goes fullscreen). Re-fire resize once so charts and
    // trees re-measure; the second pass finds the size unchanged, so there is no loop.
    if (zoom === null && root.style.getPropertyValue("--pz") !== String(autoZoom())) applyZoom();
    refreshBar();
  });
  document.addEventListener("click", () => { if (on) setTimeout(refreshBar, 450); });
  // journey.js reveals things on "attempted". We snapshot what was hidden just before (capture phase runs first),
  // then scroll to the first thing that appeared once journey.js has done its work.
  let hiddenBefore = [];
  document.addEventListener("attempted", () => { if (on) hiddenBefore = gated(scenes[idx]).filter((n) => n.hidden); }, true);
  document.addEventListener("attempted", () => {
    if (!on) return;
    const before = hiddenBefore;
    setTimeout(() => { scrollToFresh(before); refreshBar(); }, 80);
  });

  const enterLink = document.getElementById("enter-present");
  if (enterLink) enterLink.addEventListener("click", () => enterPresent());
  if (new URLSearchParams(location.search).has("present")) enterPresent(0);

  window.Presenter = { enter: enterPresent, exit: exitPresent, go, scenes, isOn: () => on };
})();
