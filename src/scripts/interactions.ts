const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = window.matchMedia('(hover: none)').matches

export function initInteractions() {
  if (!isTouch) {
    initCursorGlow()
    if (!prefersReducedMotion) {
      initLogoScene()
      initMagnetic()
    }
  }
}

// ---------------------------------------------------------------------------
// Soft radial glow that trails the cursor. Lerped in rAF; the loop idles out
// once the glow has caught up, so it costs nothing while the mouse is still.
function initCursorGlow() {
  const glow = document.getElementById('cursor-glow')
  if (!glow) return

  let targetX = -300
  let targetY = -300
  let x = targetX
  let y = targetY
  let rafId = 0
  let running = false

  const tick = () => {
    x += (targetX - x) * 0.12
    y += (targetY - y) * 0.12
    glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.5) {
      rafId = requestAnimationFrame(tick)
    } else {
      running = false
    }
  }

  document.addEventListener(
    'mousemove',
    (e) => {
      targetX = e.clientX
      targetY = e.clientY
      glow.classList.add('is-visible')
      if (!running) {
        running = true
        rafId = requestAnimationFrame(tick)
      }
    },
    { passive: true }
  )

  document.addEventListener('mouseleave', () => {
    glow.classList.remove('is-visible')
    cancelAnimationFrame(rafId)
    running = false
  })
}

// ---------------------------------------------------------------------------
// About logo: the layered mark tilts toward the pointer in true 3D. Rotation
// targets are lerped in rAF and written as CSS custom properties consumed by
// .logo-stack — the layer translateZ offsets do the parallax for free.
function initLogoScene() {
  const scene = document.querySelector<HTMLElement>('[data-logo-scene]')
  if (!scene) return
  const stack = scene.querySelector<HTMLElement>('.logo-stack')
  if (!stack) return

  const MAX_TILT = 14
  let targetRx = 0
  let targetRy = 0
  let rx = 0
  let ry = 0
  let rafId = 0
  let running = false

  const tick = () => {
    rx += (targetRx - rx) * 0.08
    ry += (targetRy - ry) * 0.08
    stack.style.setProperty('--rx', `${rx.toFixed(3)}deg`)
    stack.style.setProperty('--ry', `${ry.toFixed(3)}deg`)
    if (Math.abs(targetRx - rx) + Math.abs(targetRy - ry) > 0.01) {
      rafId = requestAnimationFrame(tick)
    } else {
      running = false
    }
  }

  const start = () => {
    if (!running) {
      running = true
      rafId = requestAnimationFrame(tick)
    }
  }

  // Track the pointer across the whole section so the logo feels aware of the
  // cursor before it's directly over the artwork.
  const zone = scene.closest('section') || scene
  zone.addEventListener(
    'pointermove',
    (e) => {
      const rect = scene.getBoundingClientRect()
      const px = ((e as PointerEvent).clientX - (rect.left + rect.width / 2)) / rect.width
      const py = ((e as PointerEvent).clientY - (rect.top + rect.height / 2)) / rect.height
      targetRy = Math.max(-1, Math.min(1, px)) * MAX_TILT
      targetRx = Math.max(-1, Math.min(1, -py)) * MAX_TILT
      start()
    },
    { passive: true }
  )
  zone.addEventListener('pointerleave', () => {
    targetRx = 0
    targetRy = 0
    start()
  })
}

// ---------------------------------------------------------------------------
// Magnetic elements: [data-magnetic] drifts toward the cursor while hovered
// and springs back on leave. Kept subtle — this is an accent, not a toy.
function initMagnetic() {
  const STRENGTH = 0.25

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    let rafId = 0

    el.addEventListener(
      'pointermove',
      (e) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect()
          const dx = e.clientX - (rect.left + rect.width / 2)
          const dy = e.clientY - (rect.top + rect.height / 2)
          el.style.transform = `translate(${dx * STRENGTH}px, ${dy * STRENGTH}px)`
        })
      },
      { passive: true }
    )

    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(rafId)
      el.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
      el.style.transform = 'translate(0, 0)'
      setTimeout(() => {
        el.style.transition = ''
      }, 500)
    })
  })
}
