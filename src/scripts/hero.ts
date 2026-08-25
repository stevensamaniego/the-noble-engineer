import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Orion constellation — normalized 2D star chart (x right, y up).
// The seven canonical bright stars plus Meissa (the head).
// ---------------------------------------------------------------------------
const ORION_STARS: { name: string; x: number; y: number; mag: number }[] = [
  { name: 'Betelgeuse', x: -1.35, y: 1.45, mag: 1.0 },
  { name: 'Meissa', x: -0.3, y: 2.15, mag: 0.55 },
  { name: 'Bellatrix', x: 0.95, y: 1.35, mag: 0.75 },
  { name: 'Alnitak', x: -0.45, y: -0.05, mag: 0.8 },
  { name: 'Alnilam', x: 0.0, y: 0.1, mag: 0.85 },
  { name: 'Mintaka', x: 0.45, y: 0.22, mag: 0.75 },
  { name: 'Saiph', x: -0.95, y: -1.75, mag: 0.7 },
  { name: 'Rigel', x: 1.1, y: -1.65, mag: 1.0 },
]

// Index pairs into ORION_STARS forming the classic stick figure
const ORION_LINES: [number, number][] = [
  [0, 1], // Betelgeuse — Meissa
  [1, 2], // Meissa — Bellatrix
  [0, 3], // Betelgeuse — Alnitak
  [2, 5], // Bellatrix — Mintaka
  [3, 4], // Alnitak — Alnilam
  [4, 5], // Alnilam — Mintaka
  [3, 6], // Alnitak — Saiph
  [5, 7], // Mintaka — Rigel
]


// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------
const starVertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;

  attribute vec3 aStart;
  attribute float aSize;
  attribute float aDelay;
  attribute float aSeed;
  attribute float aIsStar;

  varying float vAlpha;
  varying float vIsStar;

  void main() {
    // Per-particle staggered ease-out toward the target position
    float p = clamp((uProgress - aDelay) / max(1.0 - aDelay, 0.001), 0.0, 1.0);
    float eased = 1.0 - pow(1.0 - p, 3.0);
    vec3 pos = mix(aStart, position, eased);

    // Gentle drift once (mostly) formed
    float drift = eased * 0.06;
    pos.x += sin(uTime * 0.35 + aSeed * 12.0) * drift;
    pos.y += cos(uTime * 0.28 + aSeed * 17.0) * drift;
    pos.z += sin(uTime * 0.22 + aSeed * 23.0) * drift * 1.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.72 + 0.28 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 40.0);
    vAlpha = eased * twinkle;
    vIsStar = aIsStar;

    gl_PointSize = aSize * uPixelRatio * (1.0 + 0.15 * sin(uTime + aSeed * 30.0)) * (30.0 / -mvPosition.z);
  }
`

const starFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uStarColor;

  varying float vAlpha;
  varying float vIsStar;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    // Soft core with wide glow falloff
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 2.2);
    vec3 color = mix(uColor, uStarColor, vIsStar);
    gl_FragColor = vec4(color, glow * vAlpha);
  }
`

const nebulaVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const nebulaFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;

  // Cheap value-noise fbm — enough for a soft drifting nebula
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < OCTAVES; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(11.3, 7.7);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 drift = vec2(uTime * 0.012, -uTime * 0.008) + uMouse * 0.03;

    float n1 = fbm(uv * 3.0 + drift);
    float n2 = fbm(uv * 5.5 - drift * 1.4 + n1 * 0.6);

    vec3 void_ = vec3(0.039, 0.039, 0.059);          // #0a0a0f
    vec3 deepBlue = vec3(0.04, 0.07, 0.16);
    vec3 purple = vec3(0.13, 0.09, 0.24);
    vec3 cyan = vec3(0.0, 0.35, 0.42);

    vec3 color = void_;
    color = mix(color, deepBlue, smoothstep(0.35, 0.85, n1));
    color = mix(color, purple, smoothstep(0.55, 0.95, n2) * 0.7);
    color = mix(color, cyan, pow(smoothstep(0.62, 1.0, n1 * n2 * 1.8), 2.0) * 0.35);

    // Vignette keeps the edges anchored to the page background
    float vig = smoothstep(1.05, 0.35, length(uv - 0.5));
    color = mix(void_, color, vig);

    gl_FragColor = vec4(color, 1.0);
  }
`

// ---------------------------------------------------------------------------

export function initHero() {
  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null
  if (!canvas) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile = window.matchMedia('(max-width: 768px)').matches || navigator.maxTouchPoints > 1

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.z = 8

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)

  // --- Nebula backdrop -----------------------------------------------------
  const nebulaUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  }
  const nebulaMaterial = new THREE.ShaderMaterial({
    vertexShader: nebulaVertexShader,
    fragmentShader: nebulaFragmentShader,
    uniforms: nebulaUniforms,
    defines: { OCTAVES: isMobile ? 3 : 5 },
    depthWrite: false,
  })
  // Plane far behind the particles, sized to overfill the frustum
  const nebulaZ = -30
  const nebulaHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - nebulaZ) * 1.4
  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(nebulaHeight * Math.max(camera.aspect * 1.3, 2.5), nebulaHeight),
    nebulaMaterial
  )
  nebula.position.z = nebulaZ
  scene.add(nebula)

  // --- Particles: ambient field + constellation stars ----------------------
  const ambientCount = isMobile ? 450 : 1600
  const starCount = ORION_STARS.length
  const total = ambientCount + starCount

  const targets = new Float32Array(total * 3)
  const starts = new Float32Array(total * 3)
  const sizes = new Float32Array(total)
  const delays = new Float32Array(total)
  const seeds = new Float32Array(total)
  const isStar = new Float32Array(total)

  const scatter = (i: number) => {
    // Scattered start positions in a broad shell around the camera view
    const r = 14 + Math.random() * 18
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    starts[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6
    starts[i * 3 + 2] = r * Math.cos(phi) * 0.5 - 6
  }

  // Ambient starfield targets — wide, deep spread
  for (let i = 0; i < ambientCount; i++) {
    targets[i * 3] = (Math.random() - 0.5) * 30
    targets[i * 3 + 1] = (Math.random() - 0.5) * 16
    targets[i * 3 + 2] = -Math.random() * 22
    scatter(i)
    sizes[i] = 1.2 + Math.random() * 2.2
    delays[i] = Math.random() * 0.55
    seeds[i] = Math.random()
    isStar[i] = 0
  }

  // Constellation targets — right of center on wide screens so the headline
  // breathes; centered (and smaller) on narrow screens where that space
  // doesn't exist.
  const narrow = camera.aspect < 1
  const CONSTELLATION_SCALE = narrow ? 1.1 : 1.6
  const cx = narrow ? 0 : 2.6
  const cy = 0.2
  for (let s = 0; s < starCount; s++) {
    const i = ambientCount + s
    const star = ORION_STARS[s]
    targets[i * 3] = cx + star.x * CONSTELLATION_SCALE
    targets[i * 3 + 1] = cy + star.y * CONSTELLATION_SCALE
    targets[i * 3 + 2] = -1.5
    scatter(i)
    sizes[i] = 4 + star.mag * 4
    delays[i] = 0.3 + Math.random() * 0.3
    seeds[i] = Math.random()
    isStar[i] = 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(targets, 3))
  geometry.setAttribute('aStart', new THREE.BufferAttribute(starts, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
  geometry.setAttribute('aIsStar', new THREE.BufferAttribute(isStar, 1))

  const particleUniforms = {
    uProgress: { value: prefersReducedMotion ? 1 : 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uColor: { value: new THREE.Color(0x8ab8d8) },
    uStarColor: { value: new THREE.Color(0x00f0ff) },
  }
  const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: particleUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const particles = new THREE.Points(geometry, particleMaterial)
  scene.add(particles)

  // --- Constellation lines -------------------------------------------------
  const linePositions = new Float32Array(ORION_LINES.length * 2 * 3)
  ORION_LINES.forEach(([a, b], li) => {
    const pa = ORION_STARS[a]
    const pb = ORION_STARS[b]
    linePositions.set(
      [cx + pa.x * CONSTELLATION_SCALE, cy + pa.y * CONSTELLATION_SCALE, -1.5,
       cx + pb.x * CONSTELLATION_SCALE, cy + pb.y * CONSTELLATION_SCALE, -1.5],
      li * 6
    )
  })
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  })
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
  scene.add(lines)

  // --- Interaction ---------------------------------------------------------
  let mouseX = 0
  let mouseY = 0
  const onMouseMove = (e: MouseEvent) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2
  }
  document.addEventListener('mousemove', onMouseMove, { passive: true })

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  // --- Render loop — pauses when the hero is off-screen or tab is hidden ---
  let visible = true
  let rafId = 0
  let lastT = 0
  const FORMATION_DURATION = 3.2
  let lineTargetOpacity = 0

  const heroSection = canvas.closest('section')
  if (heroSection) {
    new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible
        visible = entry.isIntersecting
        if (visible && !wasVisible) {
          lastT = 0 // swallow the pause so uTime doesn't jump
          animate()
        }
      },
      { threshold: 0 }
    ).observe(heroSection)
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId)
    } else if (visible) {
      lastT = 0
      animate()
    }
  })

  function animate() {
    cancelAnimationFrame(rafId)
    if (!visible || document.hidden) return
    rafId = requestAnimationFrame(animate)

    const now = performance.now()
    const dt = lastT === 0 ? 0.016 : Math.min((now - lastT) / 1000, 0.05)
    lastT = now
    particleUniforms.uTime.value += dt
    nebulaUniforms.uTime.value += dt

    // Formation progress
    if (particleUniforms.uProgress.value < 1) {
      particleUniforms.uProgress.value = Math.min(1, particleUniforms.uProgress.value + dt / FORMATION_DURATION)
    }
    // Constellation lines fade in near the end of formation
    if (particleUniforms.uProgress.value > 0.82) {
      lineTargetOpacity = 0.28
    }
    lineMaterial.opacity += (lineTargetOpacity - lineMaterial.opacity) * Math.min(dt * 1.5, 1)

    // Mouse-reactive camera — Steven's favorite part, keep it smooth
    if (!prefersReducedMotion) {
      camera.position.x += (mouseX * 0.6 - camera.position.x) * Math.min(dt * 2.5, 1)
      camera.position.y += (-mouseY * 0.4 - camera.position.y) * Math.min(dt * 2.5, 1)
      camera.lookAt(0, 0, -2)
      nebulaUniforms.uMouse.value.set(mouseX, mouseY)
    }

    renderer.render(scene, camera)
  }

  animate()

  // Dispose on page teardown (Astro view transitions / bfcache safety)
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(rafId)
    geometry.dispose()
    lineGeometry.dispose()
    particleMaterial.dispose()
    lineMaterial.dispose()
    nebula.geometry.dispose()
    nebulaMaterial.dispose()
    renderer.dispose()
  }, { once: true })
}
