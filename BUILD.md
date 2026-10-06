# The Noble Engineer — Build Doc

> The history of how this was made. Update the Build Log every time the project is touched.

## What it is
The marketing site for The Noble Engineer, an El Paso, TX technology consultancy (custom software, infrastructure, system integration, IT strategy & operations). It is a single-page site with an Orion-constellation Three.js hero, a 3D logo, and scroll-driven storytelling sections. It is served at https://thenobleengineer.com via GitHub Pages.

## Stack & architecture
- **Framework:** Astro 7 (`astro ^7.2.7`), static output to `dist/`. TypeScript scripts under `src/scripts/`.
- **Styling:** Tailwind CSS 4 via `@tailwindcss/vite`; custom CSS in `src/styles/global.css`. Fonts: Inter, JetBrains Mono, Playfair Display (italic, for "human" moments), from Google Fonts.
- **Motion / 3D:** Three.js (`^0.185`), GSAP (`^3.15`, incl. SplitText/ScrollTrigger), Lenis smooth scroll.
- **Node:** `>=22.12.0` (CI uses Node 22).
- **Hosting:** GitHub Pages via GitHub Actions; custom domain from `public/CNAME`.
- **Layout of the code:**
  - `src/layouts/Layout.astro`: page shell, nav, footer, preloader markup
  - `src/pages/index.astro`: sections `#hero`, `#problem`, `#services`, `#proof`, `#about`, `#contact`
  - `src/scripts/hero.ts`: fixed full-viewport Three.js canvas (Orion constellation, procedural nebula, starfield, 3D logo emblem)
  - `src/scripts/preloader.ts`: circuit-tree intro animation
  - `src/scripts/animations.ts`: GSAP load timeline and scroll reveals
  - `src/scripts/interactions.ts`: magnetic hover and pointer interactions
- **Flow:** browser loads static HTML → preloader plays → hero canvas renders continuously behind all sections → GSAP/ScrollTrigger reveal sections on scroll.

## How to run, build, deploy
- Install: `npm ci`
- Dev: `npm run dev` (AGENTS.md says to use `astro dev --background` and manage it with `astro dev stop|status|logs`)
- Build: `npm run build` (output in `dist/`); preview: `npm run preview`
- Deploy: push to `main`. `.github/workflows/deploy.yml` runs `npm ci` and `npm run build`, uploads `dist/` with `actions/upload-pages-artifact@v3`, and deploys with `actions/deploy-pages@v4`. It can also be triggered manually (`workflow_dispatch`).

## Configuration
- No env vars or secrets are used by the site or the build.
- `astro.config.mjs` sets `site: 'https://thenobleengineer.com'`.
- `public/CNAME`: custom domain for GitHub Pages.
- The workflow uses GitHub's built-in Pages OIDC permissions (`pages: write`, `id-token: write`). No stored secrets.

## Key decisions
- 2026-08-25 — Astro + Three.js + GSAP + Tailwind, statically deployed to GitHub Pages (fb1be46). Reason not recorded.
- 2026-08-25 — Use the custom domain thenobleengineer.com instead of the github.io path (3bd117d). Reason not recorded.
- 2026-08-25 — Present the content as generalized service offerings, with no project names, company names, or specific numbers (e4bd9aa). This replaced the portfolio-style project cards added in 5f40e8c. Reason not recorded.
- 2026-08-25 — Replace card grids with full-width editorial sections (f22cd50). Reason not recorded.
- 2026-08-25 — Draw the constellation from real J2000 RA/Dec star positions and apparent magnitudes so the figure keeps the true sky's proportions (5498210). The goal was "real Orion sky proportions."
- 2026-08-25 — Restructure below the hero as a persuasion arc (wonder → tension → authority → proof → intimacy → resolution) using curiosity gap, loss aversion, social proof, scarcity and reciprocity. Accent color is reserved for a few elements (c247a60). The reasoning is in the commit message.
- 2026-08-25 — Merge the 3D logo into the hero scene, replacing the title text and using a single renderer. `logo-scene.ts` was deleted (afb1371). Reason not recorded beyond the commit description.
- 2026-08-25 — Limit logo rotation to the Y axis (c986f4d). Reason: so the logo "doesn't slant when tracking the cursor."

## Build log
### 2026-08-25 — Scaffold, hero, redesigns, preloader (one session, ~15:30–18:05 MDT)
- **Scaffold** (fb1be46): Astro minimal template plus Three.js, GSAP, Tailwind, Lenis, and the GitHub Pages deploy workflow.
- **Custom domain** (3bd117d): added `public/CNAME` and set `site` in the Astro config.
- **Hero** (1255370): Orion constellation scene with a procedural nebula.
- **Storytelling pass** (d93fc59): nav drop-in, char-by-char title build (SplitText), section split-reveals, parallax layers, 3D-tilt work cards, animated SVG capability icons.
- **Narrow viewports** (b67db51): the constellation fell off-screen on narrow aspect ratios. Fixed by centering and scaling it down.
- **Content** (5f40e8c): added real content and the TNE logo (`public/logo-tne.png`). (e4bd9aa): rewrote the content as service offerings and renamed nav "Work" to "Services".
- **Full-site redesign** (f22cd50): completed the constellation (club, shield, sword); added logo cutouts (`logo-tne-mark.png`, `logo-tne-white.png`) and editorial layouts.
  - Bug fixed: an unlayered `* { margin: 0 }` reset was overriding Tailwind utilities, so `mx-auto` never applied and containers were left-flush site-wide.
- **Accurate sky + 3D emblem** (5498210): constellation now uses real star data; the About logo became a Three.js depth-sliced slab (`logo-scene.ts`) replacing a CSS mask stack.
- **Persuasion-driven redesign below the hero** (c247a60): new `#problem` and `#proof` sections, About rewritten as a story, Playfair Display italic added, footer "El Paso, TX — serving clients nationwide".
- **Logo into the hero** (afb1371): emblem rendered at z=2 in the hero scene; logo entrance driven by the load timeline; glitch effect removed; `logo-scene.ts` deleted.
- **Persistent backdrop** (b8f7dc8): the hero canvas became a fixed full-viewport backdrop that sections scroll over. Sword stars and lines were removed, and the opening line now fades in on scroll.
- **Rotation lock** (c986f4d): Y-axis spin only.
- **Preloader** (9cee4bb, then rebuilt in 0307586): circuit-trace intro, replaced the same evening with a "premium circuit-tree" animation.
- **Who:** commits authored as Orion (AI assistant). Most carry Claude Code co-author trailers. 5f40e8c and e4bd9aa have none.
- The deploy workflow ran successfully for the last five pushes that day.

### 2026-10-06 — Build doc
- Added this BUILD.md, reconstructed from git history and project notes (Orion).

## Current status & next steps
- **Status:** live in production at thenobleengineer.com. No commits since 2026-08-25.
- Notes from 2026-08-25 say interactive 3D features were still being built that day. No later open items are recorded.
- No open TODOs or waiting-on items are recorded.

## Gotchas
- **Global CSS resets must be inside a Tailwind layer.** An unlayered `* { margin: 0 }` silently overrides Tailwind 4 utilities such as `mx-auto` (fixed in f22cd50).
- **The hero canvas is a fixed, continuously rendering backdrop.** Sections need semi-transparent backgrounds for the stars to show through (b8f7dc8).
- **Check narrow aspect ratios.** Off-center 3D placement can push the constellation off-screen (b67db51).
- **Avoid pointer-driven X-axis tilt on the logo.** It makes the emblem slant (c986f4d).
- **Every push to `main` deploys to production.** There is no staging branch.
