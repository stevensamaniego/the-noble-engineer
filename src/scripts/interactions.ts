const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = window.matchMedia('(hover: none)').matches

export function initInteractions() {
  if (!isTouch) {
    initCursorGlow()
    if (!prefersReducedMotion) {
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
