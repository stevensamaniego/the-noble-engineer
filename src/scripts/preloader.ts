import gsap from 'gsap'

// ---------------------------------------------------------------------------
// Circuit-trace preloader — the TNE tree draws itself like a signal racing
// through a PCB: trunk first, branches forking outward with organic stagger,
// nodes pulsing as the signal arrives, then the figure, wordmark, and a
// one-shot brightness pulse before the veil lifts.
//
// The hero Three.js scene boots underneath from t=0 (hero.ts is untouched),
// so the constellation is already mostly formed when the preloader fades.
// ---------------------------------------------------------------------------

const VISITED_KEY = 'tne-visited'

// Resolves the moment the reveal begins (or immediately when the preloader is
// skipped). animations.ts gates the hero load sequence on this promise so the
// nav/eyebrow/logo entrance plays against a visible page, not behind the veil.
let resolveDone: (() => void) | null = null
export const preloaderDone = new Promise<void>((resolve) => {
  resolveDone = resolve
})

export function initPreloader() {
  const done = () => {
    resolveDone?.()
    resolveDone = null
  }

  const root = document.getElementById('preloader')
  if (!root) {
    done()
    return
  }

  const skip = () => {
    document.body.style.overflow = ''
    root.remove()
    done()
  }

  let visited = false
  try {
    visited = !!sessionStorage.getItem(VISITED_KEY)
  } catch {
    // storage unavailable (private mode) — just play every time
  }
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (visited || prefersReducedMotion) {
    skip()
    return
  }

  const svg = root.querySelector<SVGSVGElement>('#circuit-logo')
  const emblem = document.getElementById('preloader-emblem')
  if (!svg || !emblem) {
    skip()
    return
  }

  // Freeze scroll while the intro owns the screen
  document.body.style.overflow = 'hidden'

  try {
    play(root, svg, emblem, done)
  } catch {
    // Never leave the site trapped behind the overlay
    skip()
  }
}

// ---------------------------------------------------------------------------
function play(root: HTMLElement, svg: SVGSVGElement, emblem: HTMLElement, done: () => void) {
  const trunk = svg.querySelector<SVGGeometryElement>('.pl-trunk')!
  const branches = Array.from(svg.querySelectorAll<SVGGElement>('.pl-branch'))
  const junctions = Array.from(svg.querySelectorAll<SVGCircleElement>('.pl-junction'))
  const traces = Array.from(svg.querySelectorAll<SVGGeometryElement>('.pl-trace'))
  const rules = Array.from(svg.querySelectorAll<SVGGeometryElement>('.pl-rule'))
  const figure = svg.querySelector('.pl-figure')
  const wordmark = svg.querySelector('.pl-wordmark')

  // Prime a stroke for dash-drawing and flip it visible (CSS hides all
  // drawable strokes until JS takes over, so the first paint is pure void)
  const prep = (el: SVGGeometryElement) => {
    const len = el.getTotalLength()
    gsap.set(el, { visibility: 'visible', strokeDasharray: len, strokeDashoffset: len })
    return len
  }

  gsap.set(svg.querySelectorAll('.pl-node'), { scale: 0, transformOrigin: '50% 50%' })
  gsap.set(emblem, { filter: 'brightness(1)' })

  const reveal = () => {
    try {
      sessionStorage.setItem(VISITED_KEY, '1')
    } catch {
      /* storage unavailable — replay next load, no harm */
    }
    document.body.style.overflow = ''
    done() // hero entrance starts underneath as the veil dissolves
    gsap.to(svg, { scale: 1.04, duration: 0.7, ease: 'power2.in' })
    gsap.to(root, {
      autoAlpha: 0,
      duration: 0.7,
      ease: 'power2.inOut',
      onComplete: () => root.remove(),
    })
  }

  const tl = gsap.timeline({ onComplete: reveal })

  // --- 1. Trunk — the first signal, racing bottom → top --------------------
  prep(trunk)
  tl.to(trunk, { strokeDashoffset: 0, duration: 0.85, ease: 'power2.inOut' }, 0.18)

  // Junction nodes pop as the signal passes each fork point
  tl.to(
    junctions,
    { opacity: 1, scale: 1, duration: 0.3, stagger: 0.13, ease: 'back.out(3)' },
    0.5
  )

  // --- 2. Branches fork outward, bottom pair first ---------------------------
  branches.forEach((branch, i) => {
    const t0 = 0.46 + i * 0.12
    const strokes = Array.from(branch.querySelectorAll<SVGGeometryElement>('path, line'))
    strokes.forEach((stroke, j) => {
      const len = prep(stroke)
      tl.to(
        stroke,
        // Longer branches take longer — organic, not metronomic
        { strokeDashoffset: 0, duration: Math.min(0.65, 0.28 + len / 420), ease: 'power2.out' },
        t0 + j * 0.22
      )
    })
    tl.to(
      branch.querySelectorAll('.pl-node'),
      { opacity: 1, scale: 1, duration: 0.35, stagger: 0.1, ease: 'back.out(2.8)' },
      t0 + 0.42
    )
  })

  // --- 3. Circuit traces run off-screen — the tree joins a larger board ----
  traces.forEach((trace, i) => {
    prep(trace)
    tl.to(
      trace,
      { strokeDashoffset: 0, duration: 0.55, ease: 'power1.out' },
      1.5 + i * 0.07
    )
  })

  // --- 4. Figure, baseline rules, wordmark ----------------------------------
  if (figure) tl.to(figure, { opacity: 0.92, duration: 0.6, ease: 'power2.out' }, 1.6)

  rules.forEach((rule) => {
    prep(rule)
    tl.to(rule, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, 1.62)
  })

  if (wordmark) {
    tl.fromTo(
      wordmark,
      { opacity: 0, letterSpacing: '0.5em' },
      { opacity: 1, letterSpacing: '0.32em', duration: 0.6, ease: 'power2.out' },
      1.8
    )
  }

  // --- 5. Power surge — one brightness pulse through the whole board --------
  tl.to(
    emblem,
    { filter: 'brightness(1.35)', duration: 0.22, ease: 'power2.in', yoyo: true, repeat: 1 },
    2.05
  )

  // --- 6. Hold the finished mark, then reveal (via onComplete) --------------
  tl.to({}, { duration: 0.4 }, 2.5)
}
