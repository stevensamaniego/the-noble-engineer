import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText)

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function initAnimations() {
  if (prefersReducedMotion) {
    // Show everything immediately — no motion, no opacity traps
    gsap.set('[data-animate], [data-hero-reveal], [data-hero-title], [data-split], nav', { opacity: 1, y: 0 })
    initNavHighlight()
    return
  }

  const lenis = initSmoothScroll()
  initLoadSequence()
  initHeadingReveals()
  initSectionReveals()
  initParallax()
  initNavHighlight()
  initScrollProgress()

  return lenis
}

// ---------------------------------------------------------------------------
function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  // Route anchor clicks through Lenis so nav jumps are smooth too
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')
      if (!id || id === '#') return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: -70 })
    })
  })

  return lenis
}

// ---------------------------------------------------------------------------
// Page load: nav drops in, then the hero copy builds line by line while the
// constellation forms behind it.
function initLoadSequence() {
  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    // Glitch only kicks in after the title has fully assembled — the CSS
    // pseudo-element overlay would clash with the per-char entrance.
    onComplete: () => document.querySelector('[data-glitch]')?.classList.add('glitch-on'),
  })

  tl.fromTo('nav', { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.15)

  const title = document.querySelector('[data-hero-title]')
  if (title) {
    const split = SplitText.create(title, { type: 'chars', charsClass: 'hero-char' })
    gsap.set(title, { opacity: 1 })
    tl.from(
      split.chars,
      {
        y: 80,
        opacity: 0,
        rotationX: -60,
        transformOrigin: '50% 100%',
        duration: 0.9,
        stagger: 0.028,
        ease: 'power4.out',
      },
      0.45
    )
  }

  tl.fromTo(
    '[data-hero-reveal="eyebrow"]',
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7 },
    0.35
  )
  tl.fromTo(
    '[data-hero-reveal="subtitle"]',
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8 },
    1.15
  )
  tl.fromTo(
    '[data-hero-reveal="scroll-hint"]',
    { opacity: 0 },
    { opacity: 1, duration: 1 },
    1.7
  )
}

// ---------------------------------------------------------------------------
// Section headings: word-by-word rise with a letter-spacing settle — headings
// arrive tracked-wide and tighten into place.
function initHeadingReveals() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words,chars' })
    gsap.set(el, { opacity: 1 })

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 85%' },
    })
    tl.from(split.chars, {
      y: 50,
      opacity: 0,
      duration: 0.7,
      stagger: 0.015,
      ease: 'power3.out',
    })
    tl.fromTo(
      el,
      { letterSpacing: '0.06em' },
      { letterSpacing: '0em', duration: 1.1, ease: 'power2.out' },
      0
    )
  })
}

// ---------------------------------------------------------------------------
// Generic reveals: single elements fade up; groups stagger their children.
function initSectionReveals() {
  document.querySelectorAll<HTMLElement>('[data-animate="fade-up"]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: parseFloat(el.dataset.delay || '0'),
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      }
    )
  })

  document.querySelectorAll<HTMLElement>('[data-animate-group]').forEach((group) => {
    gsap.fromTo(
      group.children,
      { opacity: 0, y: 56, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 82%' },
      }
    )
  })
}

// ---------------------------------------------------------------------------
// Parallax: data-parallax="0.3" drifts the element at 30% of scroll speed.
function initParallax() {
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax || '0.2')
    gsap.to(el, {
      y: () => -(window.innerHeight * speed),
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') || el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Nav: highlight the link for the section currently in view.
function initNavHighlight() {
  const links = new Map<string, HTMLAnchorElement>()
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((a) => {
    const id = a.getAttribute('href')?.slice(1)
    if (id) links.set(id, a)
  })
  if (!links.size) return

  links.forEach((link, id) => {
    const section = document.getElementById(id)
    if (!section) return
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => link.classList.toggle('nav-active', self.isActive),
    })
  })
}

// ---------------------------------------------------------------------------
// Thin scroll-progress bar pinned under the nav.
function initScrollProgress() {
  const bar = document.querySelector<HTMLElement>('[data-scroll-progress]')
  if (!bar) return
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  })
}
