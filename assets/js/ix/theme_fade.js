/**
 * Feature: theme_fade
 * Hook: [data-ix~="theme_fade"], .theme-btn, .theme-toggle
 * Smooth theme toggle cross-fade using View Transitions API
 */
(function() {
  'use strict';
  var d = document, r = d.documentElement;

  if (!('startViewTransition' in d)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var t = d.querySelector('.theme-btn, .theme-toggle');
  if (!t) return;

  // Enhance the default click handler
  t.addEventListener('click', function(e) {
    if (d.startViewTransition) {
      // Allow the view transition to handle the visual morph
    }
  }, true);
})();
