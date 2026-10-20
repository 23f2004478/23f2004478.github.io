/**
 * Feature: cold_strip
 * Hook: [data-ix~="cold_strip"] (the "N products, swipe" cue under the chapter 2 cold-open row).
 * Mobile-only (hidden by CSS at >=1024px, where the row is a 3-column grid, not a scroller).
 * Works without JS: the text and dots render, all dots idle. JS upgrade: marks the dot of
 * whichever card is most in view via IntersectionObserver as the row is scrolled/swiped.
 */
(function() {
  'use strict';
  var d = document;
  function init() {
    var hints = [].slice.call(d.querySelectorAll('[data-ix~="cold_strip"]'));
    if (!hints.length || !('IntersectionObserver' in window)) return;
    hints.forEach(function(hint) {
      var strip = hint.previousElementSibling;
      if (!strip || !strip.classList.contains('cold-strip')) return;
      var cards = [].slice.call(strip.querySelectorAll('.cs-card'));
      var dots = [].slice.call(hint.querySelectorAll('.cs-dot'));
      if (!cards.length || !dots.length) return;
      var ratios = cards.map(function() { return 0; });
      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          var i = cards.indexOf(e.target);
          if (i > -1) ratios[i] = e.intersectionRatio;
        });
        var best = 0;
        for (var i = 1; i < ratios.length; i++) if (ratios[i] > ratios[best]) best = i;
        dots.forEach(function(dot, i) { dot.classList.toggle('is-active', i === best && ratios[best] > 0.5); });
      }, {root: strip, threshold: [0, 0.5, 0.75, 1]});
      cards.forEach(function(c) { obs.observe(c); });
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
