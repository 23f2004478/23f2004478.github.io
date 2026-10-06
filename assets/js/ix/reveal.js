/**
 * Feature: reveal
 * Hook: [data-ix~="reveal"]
 * Smooth scroll-reveal for sections and lists with capped stagger
 */
(function() {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initReveal() {
    var targets = document.querySelectorAll('[data-ix~="reveal"], section.section:not(.hero)');
    if (!targets.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function(el) {
      // Never hide/reveal hero or first screen elements
      if (el.closest('.hero, .site-head')) return;
      el.classList.add('reveal-init');
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
})();
