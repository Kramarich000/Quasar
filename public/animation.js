const starsCanvas = document.getElementById('starsCanvas');
const effectsCanvas = document.getElementById('effectsCanvas');
const starsCtx = starsCanvas.getContext('2d');
const effectsCtx = effectsCanvas.getContext('2d');

let width = (starsCanvas.width = effectsCanvas.width = window.innerWidth);
let height = (starsCanvas.height = effectsCanvas.height = window.innerHeight);

const stars = [];
const starCount = 100;
const meteors = [];
const residualTrails = [];
const explosionParticles = [];

let mouseX = 0,
  mouseY = 0;
let currentX = 0,
  currentY = 0;

const starColors = [
  '#ffffff',
  '#f0f8ff',
  '#e0ffff',
  '#d8f3ff',
  '#fff8dc',
  '#fff2d5',
  '#ffe7c2',
];

function createStars() {
  stars.length = 0;
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.5 + Math.random() * 1.5,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      alpha: Math.random(),
      delta: Math.random() * 0.02 - 0.01,
    });
  }
}

function animateStars() {
  currentX += (mouseX - currentX) * 0.05;
  currentY += (mouseY - currentY) * 0.05;

  starsCtx.clearRect(0, 0, width, height);

  for (const s of stars) {
    s.alpha += s.delta;
    if (s.alpha > 1 || s.alpha < 0) s.delta *= -1;

    const dx = s.x + currentX * 60;
    const dy = s.y + currentY * 60;

    starsCtx.globalAlpha = s.alpha;
    starsCtx.fillStyle = s.color;
    starsCtx.beginPath();
    starsCtx.arc(dx, dy, s.radius, 0, Math.PI * 2);
    starsCtx.fill();
  }
  starsCtx.globalAlpha = 1;
  createMeteors();
  drawMeteors(starsCtx);
  requestAnimationFrame(animateStars);
}

function createMeteors() {
  if (Math.random() < 0.025) {
    const speed = 8 + Math.random() * 8;
    meteors.push({
      x: Math.random() * width,
      y: -20,
      angle: Math.PI * 0.75,
      speed,
      alpha: 1,
      headWidth: 2 + Math.random() * 4,
      trail: [],
    });
  }
}

const MAX_TRAIL_LENGTH = 15;
const MAX_RESIDUAL_TRAILS = 40;
const MAX_METEORS = 10;

const gradientCache = new Map();

function getCoreGradient(ctx, x, y, r, alpha) {
  const key = `${r}|${Math.round(alpha * 100)}`;
  if (!gradientCache.has(key)) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${Math.min(alpha * 2, 1)})`);
    g.addColorStop(1, `rgba(255,255,255,0)`);
    gradientCache.set(key, g);
  }
  return gradientCache.get(key);
}

let cachedAuraGradient = null;
function getCachedAuraGradient(ctx, x, y, radius, alpha) {
  if (
    !cachedAuraGradient ||
    cachedAuraGradient.alpha !== alpha ||
    cachedAuraGradient.radius !== radius
  ) {
    const aura = ctx.createRadialGradient(x, y, 0, x, y, radius);
    aura.addColorStop(0, `rgba(180,200,255,${alpha})`);
    aura.addColorStop(1, `rgba(180,200,255,0)`);
    cachedAuraGradient = { gradient: aura, alpha, radius };
  }
  return cachedAuraGradient.gradient;
}
function drawMeteors(ctx) {
  ctx.shadowBlur = 1;
  ctx.shadowColor = 'rgba(180,200,255,0.1)';
  ctx.globalCompositeOperation = 'lighter';

  const maxTrail = MAX_TRAIL_LENGTH;
  const maxResiduals = MAX_RESIDUAL_TRAILS;

  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];

    const mX = m.x;
    const mY = m.y;
    const angleNoise = (mX - mY) * 0.0000005;
    m.angle += angleNoise * 0.002 * (Math.random() < 0.5 ? 1 : -1);

    m.speed *= 1.065;

    const cosA = Math.cos(m.angle);
    const sinA = Math.sin(m.angle);

    m.x += cosA * m.speed;
    m.y += sinA * m.speed;
    m.alpha -= 0.005;

    const nx = m.x * 0.001;
    const ny = m.y * 0.001;

    const trail = m.trail;
    trail.unshift({ x: m.x + nx, y: m.y + ny, alpha: 1 });
    if (trail.length > maxTrail) trail.pop();

    residualTrails.push({
      trail: trail.slice(),
      width: m.headWidth,
      alpha: m.alpha,
    });
    if (residualTrails.length > maxResiduals) {
      residualTrails.length = maxResiduals;
    }

    ctx.beginPath();
    const trailLen = trail.length;
    const baseAlpha = m.alpha;
    for (let j = 0; j < trailLen - 1; j++) {
      const fade = (1 - j / trailLen) * baseAlpha;
      const p1 = trail[j];
      const p2 = trail[j + 1];
      ctx.strokeStyle = `rgba(180, 200, 255, ${fade})`;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.lineWidth = 1;
    ctx.stroke();

    const headWidth = m.headWidth;
    ctx.fillStyle = getCoreGradient(ctx, m.x, m.y, headWidth, baseAlpha);
    ctx.beginPath();
    ctx.arc(m.x, m.y, headWidth, 0, Math.PI * 2);
    ctx.fill();

    const aura = getCachedAuraGradient(ctx, m.x, m.y, headWidth * 4, baseAlpha);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(m.x, m.y, headWidth * 4, 0, Math.PI * 2);
    ctx.fill();

    if (m.y > height + 100 || baseAlpha <= 0) {
      meteors.splice(i, 1);
    }
  }

  if (meteors.length > MAX_METEORS) meteors.length = MAX_METEORS;

  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = 0.5;

  for (let i = residualTrails.length - 1; i >= 0; i--) {
    const r = residualTrails[i];
    r.alpha -= 0.003;
    if (r.alpha <= 0) {
      residualTrails.splice(i, 1);
      continue;
    }

    const trail = r.trail;
    const alpha = r.alpha;
    const tLen = trail.length;
    ctx.beginPath();
    for (let j = 0; j < tLen - 1; j++) {
      const fade = alpha * (1 - j / tLen) * 0.4;
      const p1 = trail[j];
      const p2 = trail[j + 1];
      ctx.strokeStyle = `rgba(180, 200, 255, ${fade})`;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.lineWidth = r.width * 0.3;
    ctx.stroke();
  }
}
const particleSprite = document.createElement('canvas');
const spriteSize = 64;
particleSprite.width = spriteSize;
particleSprite.height = spriteSize;

const spriteCtx = particleSprite.getContext('2d');

const center = spriteSize / 2;
const radius = spriteSize / 2;

const grad = spriteCtx.createRadialGradient(
  center,
  center,
  0,
  center,
  center,
  radius,
);
grad.addColorStop(0, 'white');
grad.addColorStop(1, 'rgba(255,255,255,0)');

spriteCtx.fillStyle = grad;
spriteCtx.beginPath();
spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
spriteCtx.fill();

function animateEffects() {
  effectsCtx.clearRect(0, 0, width, height);
  effectsCtx.globalCompositeOperation = 'lighter';

  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.alpha -= p.decay;
    p.radius *= 0.98;

    if (p.alpha <= 0.02) {
      explosionParticles.splice(i, 1);
      continue;
    }

    effectsCtx.globalAlpha = p.alpha;

    const size = p.radius * 4;
    effectsCtx.drawImage(
      particleSprite,
      p.x - size / 2,
      p.y - size / 2,
      size,
      size,
    );
  }

  effectsCtx.globalCompositeOperation = 'source-over';
  effectsCtx.globalAlpha = 1;

  requestAnimationFrame(animateEffects);
}

const MAX_PARTICLES = 400;

effectsCanvas.addEventListener('click', (e) => {
  const rect = effectsCanvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const particleCount = 40;
  const angle2PI = Math.PI * 2;
  const colors = starColors;
  const particles = explosionParticles;

  for (let i = 0; i < particleCount; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * angle2PI;
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1 + Math.random() * 2,
      color: colors[(Math.random() * colors.length) | 0],
      alpha: 1,
      decay: 0.004 + Math.random() * 0.006,
    });
  }
});

window.addEventListener('resize', () => {
  width = starsCanvas.width = effectsCanvas.width = window.innerWidth;
  height = starsCanvas.height = effectsCanvas.height = window.innerHeight;
  createStars();
  meteors.length = residualTrails.length = 0;
});
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});
window.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  mouseX = (t.clientX / window.innerWidth) * 2 - 1;
  mouseY = (t.clientY / window.innerHeight) * 2 - 1;
});

createStars();
animateStars();
animateEffects();
