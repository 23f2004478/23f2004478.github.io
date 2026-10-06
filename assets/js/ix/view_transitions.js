/**
 * Feature: view_transitions
 * Hook: [data-ix~="view_transitions"] or HTML document
 * Smooth cross-document view transitions with motion reduction support
 */
(function() {
  'use strict';
  if (!('startViewTransition' in document)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Intercept in-app navigation clicks if full SPA-like transitions are requested
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a || !a.href || a.target || a.hasAttribute('download')) return;
    if (a.origin !== window.location.origin) return;
    if (a.pathname.indexOf('/resume/') !== -1 || a.pathname.indexOf('/archive/') !== -1) return;
    if (a.pathname === window.location.pathname && a.hash) return;

    // Support smooth morph for same-origin links
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  });
})();
