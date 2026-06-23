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
  gsap.registerPlugin(window.ScrollTrigger);

  // Tell CSS that GSAP owns reveals now: neutralize the hidden-by-default state
  // so that if any trigger never fires, the element stays visible (never stuck).
  document.documentElement.classList.add('gsap-ready');

  function init() {
    // ── 1. Staggered, scroll-triggered reveals (replaces the flat fade) ──────
    // gsap.from() means: only hidden while the entrance tween runs. Any element
    // a trigger misses simply remains in its natural (visible) state.
    if (window.ScrollTrigger.batch) {
      window.ScrollTrigger.batch('.reveal', {
        start: 'top 88%',
        onEnter: function (batch) {
          gsap.from(batch, {
            opacity: 0,
            y: 32,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.09,
            overwrite: true
          });
        }
      });
    }

    // ── 2. Calibration count-up on the About metrics (instrument readout) ────
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
        duration: 1.4,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () {
          el.textContent = prefix + counter.v.toFixed(decimals) + suffix;
        },
        onComplete: function () { el.textContent = raw; }
      });
    });

    // ── 3. Hero parallax — content drifts up & fades as you scroll past ──────
    var heroBody = document.querySelector('.hero-body');
    if (heroBody) {
      gsap.to(heroBody, {
        y: -48,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.4
        }
      });
    }

    // Background gains a subtle depth offset for a non-flat, layered feel.
    var hero = document.querySelector('#hero');
    if (hero) {
      gsap.to(hero, {
        backgroundPositionY: '24%',
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.4
        }
      });
    }

    // Re-measure once fonts/images settle to keep trigger positions accurate.
    window.ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Layout can shift after webfonts and lazy images load — refresh then too.
  window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
})();
