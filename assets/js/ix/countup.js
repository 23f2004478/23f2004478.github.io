/**
 * Feature: countup
 * Hook: [data-ix~="countup"], dl.proof dt
 * Animated count-up for key proof metrics
 */
(function() {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initCountup() {
    var targets = document.querySelectorAll('[data-ix~="countup"], dl.proof dt');
    if (!targets.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    targets.forEach(function(el) {
      if (!el.hasAttribute('aria-label')) {
        el.setAttribute('aria-label', el.textContent.trim());
      }
      observer.observe(el);
    });

    function animateCount(el) {
      var raw = el.textContent.trim();
      var match = raw.match(/^([0-9\.]+)(.*)$/);
      if (!match) return;

      var targetNum = parseFloat(match[1]);
      var suffix = match[2];
      var isDecimal = match[1].indexOf('.') !== -1;
      var decimals = isDecimal ? (match[1].split('.')[1].length) : 0;

      var duration = 600;
      var startTime = performance.now();

      function update(now) {
        var elapsed = now - startTime;
        var progress = Math.min(1, elapsed / duration);
        var ease = 1 - Math.pow(1 - progress, 3);
        var current = targetNum * ease;

        el.textContent = (isDecimal ? current.toFixed(decimals) : Math.round(current)) + suffix;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = raw;
        }
      }

      requestAnimationFrame(update);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountup);
  } else {
    initCountup();
  }
})();
