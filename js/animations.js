// js/animations.js — GSAP scroll motion (progressive enhancement)
//
// Robustness contract for GitHub Pages:
//  - If GSAP / ScrollTrigger fail to load (CDN blocked), or the visitor prefers
//    reduced motion, this file bails out early. The site then falls back to the
//    CSS `.reveal` + IntersectionObserver path in script.js, so content is never
//    left hidden. GSAP only ever *enhances* a page that already works without it.

(function () {
  'use strict';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!window.gsap || !window.ScrollTrigger || prefersReduced) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  // Tell CSS that GSAP owns reveals now: neutralize the hidden-by-default state
  // so that if any trigger never fires, the element stays visible (never stuck).
  document.documentElement.classList.add('gsap-ready');

  function reveal(el) {
    gsap.from(el, {
      opacity: 0,
      y: 30,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  }

  function staggerChildren(containerSel, childSel) {
    document.querySelectorAll(containerSel).forEach(function (container) {
      var items = container.querySelectorAll(childSel);
      if (!items.length) return;
      gsap.from(items, {
        opacity: 0,
        y: 38,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: container, start: 'top 82%', once: true }
      });
    });
  }

  function init() {
    // ── 1. Section heading blocks fade up ───────────────────────────────────
    gsap.utils.toArray('.reveal').forEach(function (el) {
      if (el.querySelector('.section-title')) reveal(el);
    });

    // ── 2. Card grids reveal with a clear stagger (the "non-rigid" feel) ─────
    staggerChildren('.about-stats', '.stat-card');
    staggerChildren('.skills-grid', '.skill-card');
    staggerChildren('.projects-grid', '.project-card');
    staggerChildren('.edu-grid', '.edu-card');
    staggerChildren('.cert-grid', '.cert-card');
    staggerChildren('.media-grid', '.photo-card');
    staggerChildren('.timeline', '.timeline-item');

    // Stray reveals not covered above (CTA rows) — keep them lively too.
    document.querySelectorAll('.contact-links').forEach(reveal);

    // ── 3. Calibration count-up on the About metrics (instrument readout) ────
    document.querySelectorAll('.stat-number').forEach(function (el) {
      var raw = el.textContent.trim();
      var m = raw.match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
      if (!m) return;
      var prefix = m[1];
      var target = parseFloat(m[2]);
      var suffix = m[3];
      var decimals = (m[2].split('.')[1] || '').length;
      var counter = { v: 0 };

      gsap.to(counter, {
        v: target,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
        onUpdate: function () {
          el.textContent = prefix + counter.v.toFixed(decimals) + suffix;
        },
        onComplete: function () { el.textContent = raw; }
      });
    });

    // ── 4. Hero parallax — content drifts up & fades as you scroll past ──────
    var heroBody = document.querySelector('.hero-body');
    if (heroBody) {
      gsap.to(heroBody, {
        y: -48,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.4 }
      });
    }
    var hero = document.querySelector('#hero');
    if (hero) {
      gsap.to(hero, {
        backgroundPositionY: '24%',
        ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.4 }
      });
    }

    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Layout can shift after webfonts and lazy images load — refresh then too.
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
