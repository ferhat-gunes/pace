/**
 * celebration.js - Lightweight mobile haptic & celebratory particle effects
 * Zero external dependencies.
 */

export function triggerHaptic(type = 'success') {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'light') {
        navigator.vibrate(25);
      } else if (type === 'success') {
        navigator.vibrate([35, 45, 35]);
      } else if (type === 'celebration') {
        navigator.vibrate([40, 60, 40, 60, 80]);
      }
    } catch {}
  }
}

export function triggerConfetti(originX, originY) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

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
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const startX = originX ?? width / 2;
  const startY = originY ?? height / 2;

  // PACE gamified vibrant sparkle palette
  const colors = [
    '#58CC02', // Vibrant green
    '#1CB0F6', // Electric blue
    '#FF9600', // Bright orange
    '#FFC800', // Gold yellow
    '#CE82FF', // Vivid purple
    '#FF4B4B', // Energetic coral
  ];

  const particleCount = 28;
  const particles = Array.from({ length: particleCount }).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    return {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      radius: 3 + Math.random() * 4,
      alpha: 1,
      decay: 0.02 + Math.random() * 0.02,
      tilt: Math.random() * 10,
      tiltAngle: Math.random() * Math.PI,
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
      p.vy += 0.16; // gravity
      p.alpha -= p.decay;
      p.tiltAngle += 0.1;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
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
