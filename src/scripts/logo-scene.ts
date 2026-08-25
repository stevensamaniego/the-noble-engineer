import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ---------------------------------------------------------------------------
// About centerpiece — the mark rendered as a floating holographic emblem in a
// real Three.js scene: the logo texture on a slab of z-offset slices (so
// tilting parallaxes like solid geometry, not a flat card), lit by ambient +
// key + accent rim lights, over an additive accent glow. The group tilts
// toward the pointer, sways and breathes at idle, and scales up as the About
// section scrolls into view.
// ---------------------------------------------------------------------------

const ACCENT = 0x00f0ff
const ACCENT_SECONDARY = 0x7b61ff

// Soft radial accent glow, drawn once into a canvas texture
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 256
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0, 240, 255, 0.5)')
  g.addColorStop(0.35, 'rgba(0, 240, 255, 0.16)')
  g.addColorStop(0.65, 'rgba(123, 97, 255, 0.07)')
  g.addColorStop(1, 'rgba(123, 97, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function initLogoScene() {
  const canvas = document.getElementById('logo-canvas') as HTMLCanvasElement | null
  if (!canvas) return
  const container = canvas.parentElement
  if (!container) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const section = canvas.closest('section') || container

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50)
  camera.position.z = 4

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Lighting — soft fill, an angled key so the tilt reads as real shading,
  // and a violet rim from below-left for the holographic cast
  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(2.5, 3, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(ACCENT_SECONDARY, 0.7)
  rim.position.set(-3, -2, 2)
  scene.add(rim)

  // Accent glow behind the emblem
  const glowMaterial = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  })
  const glow = new THREE.Sprite(glowMaterial)
  glow.scale.set(4.8, 4.8, 1)
  glow.position.z = -0.8
  scene.add(glow)

  const group = new THREE.Group()
  scene.add(group)

  // Materials faded in with the scroll entrance: [material, resting opacity]
  const faded: [THREE.Material & { opacity: number }, number][] = []
  const disposables: { dispose(): void }[] = [glowMaterial, glowMaterial.map!]

  new THREE.TextureLoader().load('/logo-tne-white.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
    const img = tex.image as { width: number; height: number }
    const H = 2.3
    const geometry = new THREE.PlaneGeometry(H * (img.width / img.height), H)
    disposables.push(tex, geometry)

    // Depth slices behind the face — additive accent→violet copies at real
    // z offsets, back-to-front so the additive blend stacks cleanly
    const SLICES = 6
    for (let i = SLICES; i >= 1; i--) {
      const material = new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color(ACCENT).lerp(new THREE.Color(ACCENT_SECONDARY), i / SLICES),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const slice = new THREE.Mesh(geometry, material)
      slice.position.z = -i * 0.05
      group.add(slice)
      faded.push([material, 0.17 - i * 0.018])
      disposables.push(material)
    }

    // Front face — lit, with a faint accent self-glow through the artwork
    const frontMaterial = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      roughness: 0.45,
      metalness: 0.25,
      emissive: new THREE.Color(ACCENT),
      emissiveMap: tex,
      emissiveIntensity: 0.22,
      depthWrite: false,
    })
    group.add(new THREE.Mesh(geometry, frontMaterial))
    faded.push([frontMaterial, 1])
    disposables.push(frontMaterial)

    if (prefersReducedMotion) {
      faded.forEach(([m, base]) => (m.opacity = base))
      glowMaterial.opacity = 0.75
      renderer.render(scene, camera)
    }
  })

  // --- Sizing ---------------------------------------------------------------
  const setSize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    if (prefersReducedMotion) renderer.render(scene, camera)
  }
  setSize()
  const resizeObserver = new ResizeObserver(setSize)
  resizeObserver.observe(container)

  // --- Scroll-triggered entrance -------------------------------------------
  const entrance = { p: prefersReducedMotion ? 1 : 0 }
  if (!prefersReducedMotion) {
    gsap.to(entrance, {
      p: 1,
      duration: 1.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 70%' },
    })
  }

  // --- Pointer tilt ---------------------------------------------------------
  // Tracked across the whole section so the emblem feels aware of the cursor
  // before it's directly over the artwork; lerped in the render loop.
  const MAX_TILT = 0.3 // rad, ~17°
  let targetRx = 0
  let targetRy = 0
  if (!prefersReducedMotion) {
    section.addEventListener(
      'pointermove',
      (e) => {
        const rect = container.getBoundingClientRect()
        const px = ((e as PointerEvent).clientX - (rect.left + rect.width / 2)) / rect.width
        const py = ((e as PointerEvent).clientY - (rect.top + rect.height / 2)) / rect.height
        targetRy = THREE.MathUtils.clamp(px, -1, 1) * MAX_TILT
        targetRx = THREE.MathUtils.clamp(py, -1, 1) * MAX_TILT * 0.75
      },
      { passive: true }
    )
    section.addEventListener('pointerleave', () => {
      targetRx = 0
      targetRy = 0
    })
  }

  // --- Render loop — pauses when the section is off-screen or tab hidden ---
  let visible = true
  let rafId = 0
  let lastT = 0
  let t = 0
  let rx = 0
  let ry = 0

  function animate() {
    cancelAnimationFrame(rafId)
    if (!visible || document.hidden) return
    rafId = requestAnimationFrame(animate)

    const now = performance.now()
    const dt = lastT === 0 ? 0.016 : Math.min((now - lastT) / 1000, 0.05)
    lastT = now
    t += dt

    rx += (targetRx - rx) * Math.min(dt * 4, 1)
    ry += (targetRy - ry) * Math.min(dt * 4, 1)

    const e = entrance.p
    // Pointer tilt + slow idle sway; the entrance adds a settling yaw
    group.rotation.x = rx + Math.sin(t * 0.5) * 0.02
    group.rotation.y = ry + Math.sin(t * 0.35) * 0.06 - (1 - e) * 0.6
    // Breathing scale on top of the entrance scale-up
    group.scale.setScalar((0.6 + 0.4 * e) * (1 + 0.012 * Math.sin(t * 0.9)))
    group.position.y = -(1 - e) * 0.7 + Math.sin(t * 0.6) * 0.03

    faded.forEach(([m, base]) => (m.opacity = base * e))
    glowMaterial.opacity = 0.9 * e * (0.8 + 0.2 * Math.sin(t * 1.2))

    renderer.render(scene, camera)
  }

  if (!prefersReducedMotion) {
    new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible
        visible = entry.isIntersecting
        if (visible && !wasVisible) {
          lastT = 0 // swallow the pause so t doesn't jump
          animate()
        }
      },
      { threshold: 0 }
    ).observe(section)

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
      } else if (visible) {
        lastT = 0
        animate()
      }
    })

    animate()
  }

  // Dispose on page teardown (Astro view transitions / bfcache safety)
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
    { once: true }
  )
}
