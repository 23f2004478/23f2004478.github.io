/**
 * metric_popovers.js: popover behaviour for the homepage metric cards.
 * Desktop: hover (150ms) or click opens; mobile: bottom sheet on tap.
 * Close: X button (click, tap, Enter, Space), Escape, click outside. Focus returns to the card summary.
 * v6: delegated close handler in capture phase, direct touch/click bindings, hover re-open suppressed right after an explicit close,
 * panels flip to the right edge when they would leave the viewport.
 */
(function() {
  function initMetricPopovers() {
    var pops = Array.prototype.slice.call(document.querySelectorAll('.metric-pop, [data-ix~="metric_pop"]'));
    if (!pops.length) return;

    var wasMobile = window.innerWidth < 768;
    var isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function place(pop) {
      var panel = pop.querySelector('.metric-panel');
      pop.classList.remove('open-above', 'open-right');
      if (window.innerWidth < 768 || !panel) return;
      var rect = pop.getBoundingClientRect();
      if (window.innerHeight - rect.bottom < 360 && rect.top > 360) pop.classList.add('open-above');
      var w = panel.offsetWidth || 320;
      if (rect.left + w > document.documentElement.clientWidth - 8) pop.classList.add('open-right');
    }

    function openPop(pop) {
      clearTimeout(pop._closeT);
      pops.forEach(function(p) { if (p !== pop && p.open) closePop(p, false); });
      if (!pop.open) pop.open = true;
      var s = pop.querySelector('summary');
      if (s) s.setAttribute('aria-expanded', 'true');
      place(pop);
    }

    function closePop(pop, restoreFocus) {
      clearTimeout(pop._openT);
      clearTimeout(pop._closeT);
      var s = pop.querySelector('summary');
      if (pop.open) pop.open = false;
      pop.classList.remove('open-above', 'open-right');
      if (s) {
        s.setAttribute('aria-expanded', 'false');
        if (restoreFocus) s.focus({ preventScroll: true });
      }
    }

    pops.forEach(function(pop) {
      pop.classList.add('is-js-active');
      var summary = pop.querySelector('summary');
      var closeBtn = pop.querySelector('.panel-close');
      pop._suppressUntil = 0;

      if (isFinePointer) {
        pop.addEventListener('mouseenter', function() {
          clearTimeout(pop._closeT);
          if (Date.now() < pop._suppressUntil) return;
          pop._openT = setTimeout(function() { openPop(pop); }, 150);
        });
        pop.addEventListener('mouseleave', function() {
          clearTimeout(pop._openT);
          var ae = document.activeElement;
          if (pop.contains(ae) && ae !== summary) return;
          pop._closeT = setTimeout(function() { closePop(pop, false); }, 200);
        });
      }

      if (summary) {
        summary.addEventListener('click', function(e) {
          if (e.target.closest('a, button')) return;
          e.preventDefault();
          if (pop.open) {
            pop._suppressUntil = Date.now() + 600;
            closePop(pop, false);
          } else {
            openPop(pop);
          }
        });
      }

      if (closeBtn) {
        function handleDirectClose(e) {
          e.preventDefault();
          e.stopPropagation();
          pop._suppressUntil = Date.now() + 600;
          closePop(pop, true);
        }
        closeBtn.addEventListener('click', handleDirectClose);
        closeBtn.addEventListener('touchend', handleDirectClose);
      }
    });

    // Delegated close: every X, however it is activated (mouse, touch, pen, keyboard Enter/Space)
    document.addEventListener('click', function(e) {
      var btn = e.target.closest && e.target.closest('.panel-close');
      if (btn) {
        var pop = btn.closest('.metric-pop');
        if (pop) {
          e.preventDefault();
          e.stopPropagation();
          pop._suppressUntil = Date.now() + 600;
          closePop(pop, true);
        }
        return;
      }
      pops.forEach(function(pop) {
        if (pop.open && !pop.contains(e.target)) closePop(pop, false);
      });
    }, true);

    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      pops.forEach(function(pop) {
        if (pop.open) {
          pop._suppressUntil = Date.now() + 600;
          closePop(pop, true);
        }
      });
    });

    window.addEventListener('resize', function() {
      var isMobile = window.innerWidth < 768;
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        pops.forEach(function(p) { closePop(p, false); });
      } else {
        pops.forEach(function(p) { if (p.open) place(p); });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetricPopovers);
  } else {
    initMetricPopovers();
  }
})();
