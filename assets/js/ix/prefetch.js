/**
 * Feature: prefetch
 * Hook: [data-ix~="prefetch"] or document links
 * Speculation rules / link prefetching for same-origin navigation
 */
(function() {
  'use strict';
  var prefetched = {};

  function prefetchUrl(url) {
    if (prefetched[url] || !url) return;
    if (url.indexOf('http') === 0 && url.indexOf(window.location.origin) !== 0) return;
    if (url.indexOf('#') === 0 || url.indexOf('mailto:') === 0 || url.indexOf('.pdf') !== -1 || url.indexOf('/archive/') !== -1) return;

    prefetched[url] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  document.addEventListener('mouseover', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && a.origin === window.location.origin) {
      prefetchUrl(a.pathname);
    }
  }, { passive: true });

  document.addEventListener('focusin', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && a.origin === window.location.origin) {
      prefetchUrl(a.pathname);
    }
  }, { passive: true });
})();
