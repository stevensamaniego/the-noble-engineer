import gsap from 'gsap'

// ---------------------------------------------------------------------------
// Circuit-tree preloader — a tree routed like PCB traces draws itself as one
// signal propagating up from the trunk. Timing is declarative in the markup:
// each trace/pad carries data-t (its start offset in seconds), derived so a
// branch begins the instant the parent trace's signal passes its fork. Traces
// draw at a constant px/s with a linear ease, so the whole tree reads as
// electricity flowing through a board rather than choreographed tweens.
//
// The hero Three.js scene boots underneath from t=0 (hero.ts is untouched),
// so the constellation is already formed when the veil lifts at ~2s.
// ---------------------------------------------------------------------------

const VISITED_KEY = 'tne-visited'
const SIGNAL_SPEED = 180 // px per second along branch traces (trunk sets data-dur)
const REVEAL_AT = 2.02 // when the veil starts lifting
const FADE_DURATION = 0.5

// Resolves the moment 'preloader-done' fires (or immediately when the
// preloader is skipped). animations.ts gates the hero load sequence on this
// promise — same semantics as the event, without a listener race.
let resolveDone: (() => void) | null = null
export const preloaderDone = new Promise<void>((resolve) => {
  resolveDone = resolve
})

export function initPreloader() {
  const done = () => {
    window.dispatchEvent(new CustomEvent('preloader-done'))
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

  const svg = root.querySelector<SVGSVGElement>('#circuit-tree')
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
  const traces = Array.from(svg.querySelectorAll<SVGGeometryElement>('.pl-draw'))
  const nodes = Array.from(svg.querySelectorAll<SVGGraphicsElement>('.pl-node'))
  const word = document.getElementById('preloader-word')

  const reveal = () => {
    try {
      sessionStorage.setItem(VISITED_KEY, '1')
    } catch {
      /* storage unavailable — replay next load, no harm */
    }
    document.body.style.overflow = ''
    done() // hero entrance starts underneath as the veil dissolves
    gsap.to(root, {
      autoAlpha: 0,
      duration: FADE_DURATION,
      ease: 'power2.inOut',
      onComplete: () => root.remove(),
    })
  }

  const tl = gsap.timeline()

  // --- 1–2. Traces — constant signal speed, branches fork off mid-draw ------
  traces.forEach((el) => {
    const len = el.getTotalLength()
    const t = parseFloat(el.dataset.t || '0')
    const dur = el.dataset.dur ? parseFloat(el.dataset.dur) : len / SIGNAL_SPEED
    gsap.set(el, { visibility: 'visible', strokeDasharray: len, strokeDashoffset: len })
    tl.to(el, { strokeDashoffset: 0, duration: dur, ease: 'none' }, t)
  })

  // --- 3. Pads — junctions pop as the signal passes, terminals as it lands --
  nodes.forEach((el) => {
    const t = parseFloat(el.dataset.t || '0')
    gsap.set(el, { scale: 0, transformOrigin: '50% 50%' })
    tl.to(el, { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(3.5)' }, t)
  })

  // --- 4. Hold — one soft power pulse through the finished board ------------
  tl.to(emblem, { filter: 'brightness(1.22)', duration: 0.16, ease: 'power2.in' }, 1.72)
  tl.to(emblem, { filter: 'brightness(1)', duration: 0.4, ease: 'power2.out' }, 1.88)

  if (word) {
    tl.fromTo(
      word,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      1.78
    )
  }

  // --- 5. Reveal — the veil lifts while the pulse settles beneath it --------
  tl.call(reveal, [], REVEAL_AT)
}
