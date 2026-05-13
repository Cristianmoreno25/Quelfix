// Redirigir si ya hay sesión activa
getSession().then(session => { if (session) redirectByRole(); });

// ── GSAP setup ────────────────────────────────────────────────────
gsap.registerPlugin(ScrollTrigger);

// ── Navbar: se oscurece al hacer scroll ───────────────────────────
ScrollTrigger.create({
  start: 'top -20',
  onUpdate: self => {
    document.getElementById('qnav').classList.toggle('scrolled', self.progress > 0);
  },
});

// ── Hero: animaciones de entrada (carga inicial) ──────────────────
// ── Hero: typewriter ──────────────────────────────────────────────
const typewriterText = 'Código revisado.';
const twEl  = document.getElementById('hero-typewriter');
const curEl = document.getElementById('hero-cursor');
let twIndex = 0;

function typeWriter() {
  if (!twEl) return;
  if (twIndex <= typewriterText.length) {
    twEl.textContent = typewriterText.slice(0, twIndex);
    twIndex++;
    setTimeout(typeWriter, 68);
  } else {
    setTimeout(() => { if (curEl) curEl.style.display = 'none'; }, 1500);
  }
}

// Evita glitches al cambiar entre desktop/movil durante la respiracion
const floatingCardsMM = gsap.matchMedia();
const floatingSelectors = ['.mcard--main', '.mcard--left', '.mcard--right'];

function initFloatingCards() {
  floatingCardsMM.add('(prefers-reduced-motion: no-preference) and (min-width: 981px)', () => {
    const tweens = [
      gsap.to('.mcard--main', {
        y: -12,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        force3D: true,
      }),
      gsap.to('.mcard--left', {
        y: -8,
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.45,
        force3D: true,
      }),
      gsap.to('.mcard--right', {
        y: -10,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.9,
        force3D: true,
      }),
    ];

    return () => {
      tweens.forEach(tween => tween.kill());
      gsap.set(floatingSelectors, { clearProps: 'transform' });
    };
  });

  floatingCardsMM.add('(prefers-reduced-motion: no-preference) and (max-width: 980px)', () => {
    const tweens = [
      gsap.to('.mcard--main', {
        y: -4,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        force3D: true,
      }),
      gsap.to('.mcard--left', {
        y: -3,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.35,
        force3D: true,
      }),
      gsap.to('.mcard--right', {
        y: -4,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.7,
        force3D: true,
      }),
    ];

    return () => {
      tweens.forEach(tween => tween.kill());
      gsap.set(floatingSelectors, { clearProps: 'transform' });
    };
  });
}

// ── Hero: animaciones de entrada ──────────────────────────────────
const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });

heroTL
  .from('#hero-pill',   { opacity: 0, y: 24, duration: 0.65 })
  .from('#hero-line-1', { opacity: 0, y: 36, duration: 0.75 }, '-=0.35')
  .add(() => typeWriter(),                                       '+=0.1')
  .from('#hero-sub',    { opacity: 0, y: 24, duration: 0.65 }, '+=0.95')
  .from('#hero-actions',{ opacity: 0, y: 20, duration: 0.55 }, '-=0.4')
  .from('#hero-trust',  { opacity: 0, y: 14, duration: 0.5  }, '-=0.35')
  .from('#hero-visual', { opacity: 0, y: 44, duration: 0.9, ease: 'power2.out' }, '-=0.5')
  .call(() => initFloatingCards());

// ── Stats: contador animado al entrar en viewport ─────────────────
document.querySelectorAll('.sitem__n[data-to]').forEach(el => {
  const target = parseInt(el.dataset.to, 10);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to({ val: 0 }, {
        val: target,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate() { el.textContent = Math.round(this.targets()[0].val); },
        onComplete() { el.textContent = target; },
      });
    },
  });
});

// ── Features: cards con stagger al hacer scroll ───────────────────
gsap.from('.feat-card', {
  scrollTrigger: {
    trigger: '.feat-grid',
    start: 'top 80%',
  },
  opacity: 0,
  y: 48,
  duration: 0.65,
  stagger: 0.1,
  ease: 'power2.out',
});

// ── Roles: reveal secuencial por fila ────────────────────────────
gsap.from('.ritem', {
  scrollTrigger: {
    trigger: '.rstack',
    start: 'top 82%',
  },
  opacity: 0,
  x: -32,
  duration: 0.55,
  stagger: 0.1,
  ease: 'power2.out',
});

// ── Ticket Flow: reveal alternado por scroll ─────────────────────
gsap.from('.tstep', {
  scrollTrigger: {
    trigger: '#ticket-flow',
    start: 'top 78%',
  },
  opacity: 0,
  y: 26,
  duration: 0.55,
  stagger: 0.1,
  ease: 'power2.out',
});

// ── CTA: entrada dramática ────────────────────────────────────────
gsap.from('#cta-title', {
  scrollTrigger: {
    trigger: '.cta-sec',
    start: 'top 80%',
  },
  opacity: 0,
  y: 50,
  duration: 0.9,
  ease: 'power3.out',
});
gsap.from('.cta-sub, .cta-sec .hbtn', {
  scrollTrigger: {
    trigger: '.cta-sec',
    start: 'top 75%',
  },
  opacity: 0,
  y: 30,
  duration: 0.7,
  stagger: 0.15,
  ease: 'power2.out',
});

// ── Smooth scroll para anclajes internos ──────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
