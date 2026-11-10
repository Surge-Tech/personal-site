// journey.js — progress bar, scroll-spy, and staged reveals for the scene-by-scene story.
//
// body.dataset.scene = id of the scene currently on screen. Boards use it so the 1-3 keys only act on the
// board that is visible (presenter.js sets the same value while presenting).
//
// Staged reveals. Hidden explanations are marked with data-after-check:
//   data-after-check            appears after the student's first real attempt in that scene
//   data-after-check="win"      appears only when a board reports the stage "win" (or "game", "2losses", ...)
// Anything inside the scene can report an attempt:
//   el.dispatchEvent(new CustomEvent("attempted", { bubbles: true, detail: { stage: "win" } }))
// An event with no stage (a checked guess) reveals only the unstaged items. The presenter's R key reveals everything.
(function () {
  const chapters = [...document.querySelectorAll(".chapter")];
  const links = [...document.querySelectorAll(".journey a")];

  let ticking = false;
  function update() {
    ticking = false;
    if (document.body.classList.contains("present")) return;   // presenter.js drives the scene while presenting
    // The "current" chapter is the last one whose top has passed 35% of the viewport height.
    const line = window.innerHeight * 0.35;
    let current = chapters[0];
    for (const c of chapters) if (c.getBoundingClientRect().top <= line) current = c;
    document.body.dataset.scene = current.id;
    links.forEach((a) => {
      const on = a.getAttribute("href") === "#" + current.id;
      if (on) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current");
    });
  }
  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();

  document.addEventListener("attempted", (e) => {
    const chapter = e.target.closest(".chapter");
    if (!chapter) return;
    const stage = e.detail && e.detail.stage;
    chapter.querySelectorAll("[data-after-check]").forEach((n) => {
      const wants = n.getAttribute("data-after-check");           // "" = any unstaged attempt, otherwise a stage name
      if (wants === "" ? !stage : wants === stage) n.hidden = false;
    });
  });
})();
