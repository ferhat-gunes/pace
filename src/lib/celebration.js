/**
 * celebration.js - Lightweight mobile haptic & celebratory particle effects
 * Theme-aware: uses Playful Premium palette & star/ribbon shapes when Playful theme is active,
 * and Disciplined Brutalism palette otherwise.
 */

export function isPlayfulThemeActive() {
  if (typeof document === 'undefined') return false;
  const theme = document.documentElement?.getAttribute('data-theme') || '';
  return theme.startsWith('playful');
}

export function getCelebrationColors() {
  return isPlayfulThemeActive()
    ? ['#FF9470', '#72D8C5', '#FFD457', '#A99BEB']
    : ['#C8FF2E', '#F2F0EA', '#9A9891'];
}

export function triggerHaptic(type = 'success') {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'light') {
        navigator.vibrate(20);
      } else if (type === 'success') {
        navigator.vibrate([30, 40, 35]);
      } else if (type === 'celebration') {
        navigator.vibrate([40, 60, 40, 60, 80]);
      }
    } catch {}
  }
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

export function triggerConfetti(originX, originY, options = {}) {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const playful = isPlayfulThemeActive();
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const startX = originX ?? width / 2;
  const startY = originY ?? height / 2;
  const colors = getCelebrationColors();
  const particleCount = options.count ?? (playful ? 34 : 28);
  const shapes = playful ? ['circle', 'star', 'pill'] : ['circle'];

  const particles = Array.from({ length: particleCount }).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (options.compact ? 2.4 : 3.2) + Math.random() * (options.compact ? 4.8 : 6.5);
    return {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (options.compact ? 2.2 : 3.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      radius: 3.5 + Math.random() * 4.5,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.24,
      alpha: 1,
      decay: 0.018 + Math.random() * 0.018,
    };
  });

  let animationFrameId;

  function render() {
    ctx.clearRect(0, 0, width, height);
    let activeParticles = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;

      activeParticles++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy += 0.17;
      p.rotation += p.spin;
      p.alpha -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'star') {
        drawStar(ctx, 0, 0, 4, p.radius * 1.35, p.radius * 0.55);
      } else if (p.shape === 'pill') {
        const w = p.radius * 2.1;
        const h = p.radius * 0.95;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
        } else {
          ctx.rect(-w / 2, -h / 2, w, h);
        }
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  animationFrameId = requestAnimationFrame(render);
}

/**
 * Localized playful spark burst anchored to a tapped button/element.
 * Only fires visual particles when Playful Premium theme is active.
 */
export function triggerPlayfulSparkBurst(targetEl) {
  if (!isPlayfulThemeActive()) return;
  if (typeof window === 'undefined' || !targetEl?.getBoundingClientRect) return;
  const rect = targetEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  triggerConfetti(cx, cy, { count: 22, compact: true });
}
