const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = window.matchMedia('(hover: none)').matches

export function initInteractions() {
  if (!isTouch) {
    initCursorGlow()
    if (!prefersReducedMotion) initTiltCards()
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
// 3D tilt on work cards — pure CSS transforms driven by pointer position,
// with a glare highlight that tracks the cursor via CSS custom properties.
function initTiltCards() {
  const MAX_TILT = 7

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    let rafId = 0

    card.addEventListener(
      'pointermove',
      (e) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect()
          const px = (e.clientX - rect.left) / rect.width
          const py = (e.clientY - rect.top) / rect.height
          const rx = (0.5 - py) * MAX_TILT * 2
          const ry = (px - 0.5) * MAX_TILT * 2
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`
          card.style.setProperty('--glare-x', `${px * 100}%`)
          card.style.setProperty('--glare-y', `${py * 100}%`)
        })
      },
      { passive: true }
    )

    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(rafId)
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
    })
  })
}
