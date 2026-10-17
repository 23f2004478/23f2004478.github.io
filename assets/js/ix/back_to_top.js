/**
 * Feature: back_to_top
 * Hook: [data-ix~="back_to_top"], document.body
 * Floating Back-to-Top Navigation Button after 1.5 viewports
 */
(function() {
  'use strict';
  var d = document;

  function initBackToTop() {
    var btn = d.createElement('button');
    btn.type = 'button';
    btn.className = 'back-to-top';
    btn.setAttribute('data-ix', 'back_to_top');
    btn.setAttribute('aria-label', 'Back to top of page');
    btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px"><path d="M10 16V4M4 10l6-6 6 6"/></svg>';

    d.body.appendChild(btn);

    var threshold = window.innerHeight * 1.5;
    var ticking = false;

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          var show = window.scrollY > threshold;
          btn.classList.toggle('is-visible', show);
          if (window.innerWidth < 768) {
            var br = btn.getBoundingClientRect(), over = false, figs = d.querySelectorAll('.fig');
            for (var i = 0; i < figs.length && !over; i++) {
              var fr = figs[i].getBoundingClientRect();
              over = fr.bottom > br.top - 8 && fr.top < br.bottom + 8 && fr.right > br.left - 8 && fr.left < br.right + 8;
            }
            btn.classList.toggle('is-over-fig', over);
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      var main = d.getElementById('main') || d.querySelector('h1');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    });
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', initBackToTop);
  } else {
    initBackToTop();
  }
})();
