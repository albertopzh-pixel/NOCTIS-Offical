/* ==================================================================
   NØCTIS — script.js
   Loader cinematográfico · Canvas de partículas · Cursor premium ·
   Scroll reveal (IntersectionObserver) · GSAP opcional para detalles
   ================================================================== */

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ---------------- LOADER: barra 0 -> 100% en 2s ---------------- */
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPct = document.getElementById('loaderPct');

  (function runLoader() {
    const duration = 2000;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      loaderFill.style.width = pct + '%';
      loaderPct.textContent = pct + '%';
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        loader.classList.add('is-hidden');
        document.body.style.overflow = '';
        setTimeout(() => { loader.style.display = 'none'; }, 650);
      }
    }
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(tick);
  })();

  /* ---------------- CURSOR PREMIUM (dot + follower con lerp) ---------------- */
  if (!isTouch) {
    const dot = document.getElementById('cursorDot');
    const follower = document.getElementById('cursorFollower');
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let followerX = mouseX, followerY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    });

    function animateFollower() {
      followerX += (mouseX - followerX) * 0.16;
      followerY += (mouseY - followerY) * 0.16;
      follower.style.transform = `translate(${followerX}px, ${followerY}px) translate(-50%,-50%)`;
      requestAnimationFrame(animateFollower);
    }
    animateFollower();

    document.querySelectorAll('a, button, .btn').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        dot.classList.add('is-active');
        follower.classList.add('is-active');
      });
      el.addEventListener('mouseleave', () => {
        dot.classList.remove('is-active');
        follower.classList.remove('is-active');
      });
    });
  }

  /* ---------------- CANVAS DE PARTÍCULAS (hero) ---------------- */
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  const heroSection = document.getElementById('hero');

  const PARTICLE_COLOR = getComputedStyle(document.documentElement)
    .getPropertyValue('--particle-color').trim() || '139,92,246';

  let particles = [];
  let w = 0, h = 0, dpr = 1;
  let mouse = { x: -9999, y: -9999 };
  let heroVisible = true;
  let rafId = null;

  // menos partículas en pantallas chicas para no sacrificar rendimiento
  function particleCount() {
    return window.innerWidth < 640 ? 45 : 80;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR: performance
    w = canvas.clientWidth = heroSection.offsetWidth;
    h = canvas.clientHeight = heroSection.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticles() {
    const count = particleCount();
    particles = new Array(count).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6,
      alpha: Math.random() * 0.5 + 0.25
    }));
  }

  function step() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      // deriva suave
      p.x += p.vx;
      p.y += p.vy;

      // repulsión del mouse
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      const repelRadius = 90;
      if (dist < repelRadius) {
        const force = (repelRadius - dist) / repelRadius;
        p.x += (dx / (dist || 1)) * force * 3.2;
        p.y += (dy / (dist || 1)) * force * 3.2;
      }

      // rebote en bordes
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      p.x = Math.max(0, Math.min(w, p.x));
      p.y = Math.max(0, Math.min(h, p.y));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${PARTICLE_COLOR},${p.alpha})`;
      ctx.fill();
    }
    if (heroVisible) rafId = requestAnimationFrame(step);
  }

  function initParticles() {
    if (reducedMotion) return; // respeta accesibilidad, no animamos
    resize();
    makeParticles();
    if (!rafId) rafId = requestAnimationFrame(step);
  }

  window.addEventListener('resize', () => {
    resize();
    makeParticles();
  });

  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  heroSection.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  // pausa el canvas si el hero sale de pantalla: cuida rendimiento en scroll largo
  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible && !rafId && !reducedMotion) rafId = requestAnimationFrame(step);
      if (!heroVisible && rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }, { threshold: 0.05 });
    heroObserver.observe(heroSection);
  }

  window.addEventListener('load', initParticles);

  /* ---------------- SCROLL REVEAL ---------------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------- GSAP: detalle sutil en nav al hacer scroll ---------------- */
  if (window.gsap && window.ScrollTrigger && !reducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to('.nav', {
      backgroundColor: 'rgba(0,0,0,.55)',
      backdropFilter: 'blur(14px)',
      scrollTrigger: { trigger: document.body, start: '80px top', toggleActions: 'play none none reverse' }
    });
  }
})();
