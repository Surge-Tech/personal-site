# Portfolio Site Spec — Nata'ani Bitselley-Romo (Mr. B)

## Overview

A single-page scrolling portfolio site targeting both tech/developer and education professional audiences. Bold, modern aesthetic with a dark navy + teal color palette, with a light mode toggle. Hosted on GitHub Pages.

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | React + Vite | Component-based, fast dev experience |
| Styling | Tailwind CSS | Utility-first, easy to keep consistent |
| Deployment | GitHub Pages | Via `gh-pages` npm package |
| Form backend | Formspree | Free tier, no server needed |
| Font | Space Grotesk | Self-hosted (see Typography section) |

---

## Color Palette

### Dark Mode (default)

| Token | Hex | Usage |
|---|---|---|
| Background | `#0B1120` | Page background (dark navy) |
| Surface | `#1E293B` | Cards, nav, section alternates |
| Primary accent | `#14B8A6` | Teal — buttons, highlights, borders |
| Secondary accent | `#38BDF8` | Sky blue — progress bars, hover states |
| Text primary | `#F8FAFC` | Headings and body text |
| Text muted | `#94A3B8` | Subtitles, captions, labels (~4.6:1 contrast on dark bg — verify at small sizes) |

### Light Mode

| Token | Hex | Usage |
|---|---|---|
| Background | `#F8FAFC` | Page background |
| Surface | `#E2E8F0` | Cards, nav, section alternates |
| Primary accent | `#0D9488` | Teal (darkened for contrast on light bg) |
| Secondary accent | `#0284C7` | Sky blue (darkened for contrast) |
| Text primary | `#0F172A` | Headings and body text |
| Text muted | `#475569` | Subtitles, captions (~5.9:1 on light bg — passes AA) |

The active theme is stored in `localStorage` and toggled with a sun/moon icon button in the nav. System preference (`prefers-color-scheme`) is read on first visit as the default if no preference is stored.

---

## Typography

- **Font family:** Space Grotesk
- **Delivery:** Self-hosted (download from Google Fonts, serve from `/public/fonts/`) to avoid render-blocking from an external CDN and improve Lighthouse scores on GitHub Pages.
- **CSS declaration:** Include `font-display: swap` in the `@font-face` rule so text renders immediately in a fallback font while Space Grotesk loads.
- **Headings:** 700 weight, large tracking, uppercase section labels
- **Body:** 400 weight, `line-height: 1.7`
- **Fallback stack:** `'Space Grotesk', 'Segoe UI', system-ui, sans-serif`

---

## Site Structure (single-page, scroll-based)

```
/ (index)
├── #hero
├── #about
├── #skills
├── #projects
└── #contact
```

Sticky navigation bar at top with smooth-scroll anchor links.

---

## SEO & Meta

Every page head must include:

```html
<title>Nata'ani Bitselley-Romo — Educator & Technologist</title>
<meta name="description" content="Portfolio of Nata'ani Bitselley-Romo (Mr. B) — software developer and educator building bridges between the classroom and the codebase." />

<!-- Open Graph (LinkedIn, Slack, iMessage previews) -->
<meta property="og:title" content="Nata'ani Bitselley-Romo — Educator & Technologist" />
<meta property="og:description" content="Software developer, educator, and builder. Check out my projects and get in touch." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://surge-tech.github.io/<repo-name>/" />
<meta property="og:image" content="https://surge-tech.github.io/<repo-name>/og-preview.png" />

<!-- Twitter card -->
<meta name="twitter:card" content="summary_large_image" />
```

**OG preview image:** A 1200×630px static image (can be a simple branded card with name + tagline on the dark teal background). Create this as a PNG in `/public/og-preview.png`.

These go in `index.html` (Vite's entry point), not in React components, so they're present in the raw HTML served to crawlers.

---

## Sections

### 1. Hero (`#hero`)

**Purpose:** First impression — bold, full-viewport landing area.

**Content:**
- Greeting line: `"Hey, I'm"`
- Name: **Nata'ani Bitselley-Romo** (large, prominent)
- Alias badge: `"Mr. B"` (styled as a tag/chip)
- Tagline: *"Educator + Technologist — building bridges between the classroom and the codebase."*
- Two CTA buttons:
  - **"View My Work"** → scrolls to `#projects`
  - **"Download Resume"** → links to hosted PDF (placeholder until file is provided)
- Subtle animated background (geometric grid or CSS-only particle effect in teal tones)

**Accessibility:** The animation must be wrapped in a CSS `@media (prefers-reduced-motion: reduce)` block or a JS check on `window.matchMedia('(prefers-reduced-motion: reduce)')` — if the user has reduced motion enabled, show a static gradient background instead.

---

### 2. About Me (`#about`)

**Purpose:** Personal story + condensed professional history in one section.

**Layout:** Two-column on desktop (photo left, text right), stacked on mobile.

**Content:**

**Photo:** Placeholder avatar/silhouette (`role="img"`, `aria-label="Photo of Nata'ani Bitselley-Romo"`) until headshot is provided. When a real photo is added, include descriptive `alt` text, e.g. `alt="Nata'ani Bitselley-Romo smiling at the camera"`.

**Bio (draft — review and edit before launch):**

> I'm Nata'ani Bitselley-Romo — educator, developer, and builder. With experience that spans the classroom and the codebase, I bring a perspective most people don't: the patience of a teacher and the precision of an engineer. I believe the best technology is technology that teaches, and the best lessons are the ones that build something real.
>
> My background crosses education and software development — from designing curriculum and supporting learners, to building embedded systems, full-stack apps, and everything in between. I'm driven by curiosity, motivated by impact, and always looking for the next problem worth solving.

**Work experience (condensed, folded into About):**
> *(Placeholder — add 2–4 bullet points or a short timeline of past roles here once content is ready.)*

---

### 3. Skills (`#skills`)

**Purpose:** Show technical and professional competencies with visual proficiency indicators.

**Layout:** Two columns of skill groups, each skill shown as a labeled progress bar.

**Accessibility requirement for progress bars:** Each bar must be a `<div role="progressbar">` with:
- `aria-valuenow` — the numeric percentage
- `aria-valuemin="0"`
- `aria-valuemax="100"`
- `aria-label` — e.g., `"Python: 80%"`

The percentage value should also be rendered as visible text next to the bar so sighted users who rely on text (not just color/width) can read it.

**Skill groups and draft content (edit percentages as needed):**

#### Languages & Markup
| Skill | Proficiency |
|---|---|
| Python | 80% |
| C++ | 65% |
| TypeScript / JavaScript | 75% |
| HTML & CSS | 85% |

#### Tools & Frameworks
| Skill | Proficiency |
|---|---|
| React | 45% |
| Git & GitHub | 85% |
| Arduino / Embedded C++ | 70% |

#### Education & Soft Skills
| Skill | Proficiency |
|---|---|
| Curriculum Design | 85% |
| Technical Communication | 90% |
| Mentorship & Coaching | 85% |
| Problem Solving | 90% |

> **Note:** Percentages are placeholders. Review and adjust all values before launch.

---

### 4. Projects (`#projects`)

**Purpose:** Showcase 4 highlighted GitHub projects from [github.com/Surge-Tech](https://github.com/Surge-Tech).

**Layout:** 2×2 grid of cards on desktop, single column on mobile. Each card is fully visible — no expand/collapse. This gives hiring managers instant access to all info without extra clicks.

**Card anatomy (each card contains):**
- Project title (heading)
- One-sentence description
- Tech tag pills (e.g. `C++`, `Arduino`)
- GitHub link button: `"View on GitHub →"`

**Highlighted Projects:**

#### 1. RFID-Triggered Audio System
- **Repo:** `Surge-Tech/RFID-Triggered-Audio-System`
- **Description:** A hardware project that plays specific audio tracks when the correct RFID tag is scanned.
- **Tags:** C++, Arduino, Embedded Systems, Hardware
- **Why it's featured:** Hands-on hardware and embedded programming — uncommon and memorable.

#### 2. Niche
- **Repo:** `Surge-Tech/Niche`
- **Description:** A productivity app for logging daily tasks, tracking progress, and staying on top of personal goals.
- **Tags:** TypeScript, Web App, Productivity
- **Why it's featured:** Full-stack thinking, real-world use case, strong description.

#### 3. D&D Tables Site
- **Repo:** `Surge-Tech/dnd-tables-site`
- **Description:** A live web tool for generating random tables used in tabletop RPG campaigns.
- **Tags:** Web, JavaScript, Random Generation
- **Why it's featured:** A deployed, usable site with an approachable use case.

#### 4. Mother Cluckers
- **Repo:** `Surge-Tech/mother-cluckers`
- **Description:** A fully packaged game, complete with an installer executable for easy distribution.
- **Tags:** Game Dev, NSIS, Installer Scripting
- **Why it's featured:** End-to-end product thinking — build, package, and ship.

**Below grid:** `"See all projects on GitHub →"` link → `https://github.com/Surge-Tech`

---

### 5. Contact (`#contact`)

**Purpose:** Allow visitors to reach out directly.

**Layout:** Centered card, max-width ~600px, with a form and a GitHub icon link below.

**Form fields:**
- Name (`required`)
- Email (`required`, `type="email"`)
- Message (`required`, `<textarea>`)
- Submit button: `"Send Message"`

**Backend:** [Formspree](https://formspree.io) — create a free account, create a form, paste the endpoint into the `action` attribute. Placeholder: `https://formspree.io/f/YOUR_FORM_ID`

**Spam protection:** Enable Formspree's built-in honeypot field (add `_gotcha` hidden input). Add a client-side debounce on the submit button (disabled for 5 seconds after first click) to reduce accidental double-submits.

**Form states — all three must be designed:**

| State | What the user sees |
|---|---|
| Default | Empty form, active submit button |
| Submitting | Submit button disabled, spinner or "Sending…" text |
| Success | Form replaced by: `"Message sent! I'll get back to you soon."` with a teal checkmark icon |
| Error | Inline error message: `"Something went wrong. Try emailing me directly at [email]."` — keep the form visible so they don't lose their message |

**Contact email:** *(Placeholder — add when ready; also shown in the error state)*

**Privacy note (below form):** One line in muted text: `"Your message is sent via Formspree and is not stored on this site."` Covers basic expectations for any European visitors.

**Below form:**
- GitHub icon link → `https://github.com/Surge-Tech`

---

## Navigation Bar

**Structure:**
- **Left:** Site name / logo — `"Mr. B"` or `"NB"` monogram → clicking scrolls to `#hero` (standard "back to top" convention)
- **Center/Right:** Links — `About · Skills · Projects · Contact`
- **Far right:** `"Download Resume"` outlined teal button + dark/light mode toggle (sun/moon icon)

**Behavior:**
- Transparent background on top of hero → solid surface color on scroll (transition with CSS `backdrop-filter` or a scroll listener)
- Active link highlights as user scrolls through sections (Intersection Observer)

**Mobile (< 640px):**
- Logo left, hamburger icon right
- Hamburger opens a full-screen overlay nav
- Overlay must trap focus (Tab cycles only within the open menu) and close on `Escape`
- Hamburger button needs `aria-expanded` and `aria-controls` attributes
- First focusable element in the menu receives focus when it opens

---

## Footer

```
© 2026 Nata'ani Bitselley-Romo  ·  GitHub  ·  Built with React + Vite
```

- GitHub icon links to `https://github.com/Surge-Tech`
- Centered, muted text style

---

## Responsive Breakpoints

| Breakpoint | Target |
|---|---|
| Mobile | < 640px — single column, stacked layout |
| Tablet | 640px – 1024px — partial grid, scaled type |
| Desktop | > 1024px — full two-column layouts, 2×2 project grid |

---

## Performance Requirements

### Font loading
- Self-host Space Grotesk in `/public/fonts/` (woff2 format only — best compression, ~95% browser support)
- `@font-face` must include `font-display: swap`
- Preload the primary weight: `<link rel="preload" href="/fonts/SpaceGrotesk-Variable.woff2" as="font" type="font/woff2" crossorigin />`

### Image optimization
- When headshot is added: provide a WebP version alongside JPG fallback, use `<picture>` element
- Set `loading="lazy"` on the headshot (it's below the fold on mobile)
- Size the image at 2× the max rendered size for retina, but no larger

### Vite bundle
- In `vite.config.ts`, add manual chunk splitting to keep the initial bundle small:
  ```js
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  ```
- Target Lighthouse performance score ≥ 90 on mobile before launch

---

## Accessibility Checklist

- [ ] Hero animation respects `prefers-reduced-motion`
- [ ] All images have meaningful `alt` text (or `alt=""` for decorative ones)
- [ ] Progress bars use `role="progressbar"` with `aria-valuenow/min/max` and visible text labels
- [ ] Color contrast passes WCAG AA for all text (verify muted text at small sizes)
- [ ] Hamburger menu: `aria-expanded`, `aria-controls`, focus trap, `Escape` to close
- [ ] All interactive elements reachable and operable by keyboard alone
- [ ] Focus ring visible in both dark and light mode (don't `outline: none` without a custom replacement)
- [ ] Form inputs have associated `<label>` elements (not just `placeholder` text)
- [ ] Form error messages are announced to screen readers via `aria-live="polite"`

---

## Deployment Plan

1. Initialize React + Vite project (`npm create vite@latest`)
2. Install dependencies: `tailwindcss`, `gh-pages`
3. Add `"homepage"` field to `package.json`: `"https://surge-tech.github.io/<repo-name>"`
4. Add scripts to `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
5. In `vite.config.ts`, set `base: '/<repo-name>/'` so asset paths resolve correctly under the GitHub Pages subdirectory
6. Create `public/404.html` — GitHub Pages serves this for any URL it can't resolve. For a single-page app using hash-based anchors (`/#about`), a minimal 404 page with a "Go home" link is sufficient. If client-side routing is ever added (React Router with path-based URLs), a redirect script will be needed.
7. Run `npm run deploy` → publishes the `dist/` folder to the `gh-pages` branch
8. In GitHub repo Settings → Pages: set source to `gh-pages` branch, `/ (root)`

---

## Assets Needed Before Launch

- [ ] Professional headshot / photo (provide JPG; we'll generate WebP at build time)
- [ ] Resume PDF (drop into `/public/resume.pdf`)
- [ ] OG preview image — 1200×630px PNG (`/public/og-preview.png`)
- [ ] Formspree account + form endpoint URL
- [ ] Contact email address (for form error state fallback)
- [ ] Final bio text (review draft in About section)
- [ ] Final skill percentages (review draft in Skills section)
- [ ] Confirm the 4 featured projects or swap any out

---

## Open Questions / To Confirm

- [ ] Which GitHub repo should the site live in? (Reuse `personal-site` or create a new one?)
- [ ] What should the GitHub Pages URL be? (e.g., `surge-tech.github.io/portfolio`)
- [ ] Approve or revise the bio draft
- [ ] Approve or revise the skill list and proficiency percentages
- [ ] Confirm the 4 featured projects
