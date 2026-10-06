/**
 * metric_popovers.js: Interactive popover behavior for homepage headline metrics.
 * Supports hover on desktop (150ms delay), bottom sheet on mobile, roving focus, ESC, and click outside.
 */
(function() {
  function initMetricPopovers() {
    const pops = Array.from(document.querySelectorAll('.metric-pop, [data-ix~="metric_pop"]'));
    if (!pops.length) return;

    let wasMobile = window.innerWidth < 768;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    pops.forEach(pop => {
      pop.classList.add('is-js-active');
      const summary = pop.querySelector('summary');
      const panel = pop.querySelector('.metric-panel');
      const closeBtn = pop.querySelector('.panel-close');
      const titleLink = pop.querySelector('.metric-title');

      let openTimer = null;
      let closeTimer = null;

      function openPop() {
        clearTimeout(closeTimer);
        // Close siblings
        pops.forEach(p => {
          if (p !== pop && p.open) p.open = false;
        });

        if (!pop.open) {
          pop.open = true;
        }

        // Check vertical space on desktop
        if (window.innerWidth >= 768 && panel) {
          const rect = pop.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 360 && rect.top > 360) {
            pop.classList.add('open-above');
          } else {
            pop.classList.remove('open-above');
          }
        }
      }

      function closePop() {
        clearTimeout(openTimer);
        if (pop.open) {
          pop.open = false;
          pop.classList.remove('open-above');
        }
      }

      // Fine pointer hover handlers
      if (isFinePointer) {
        pop.addEventListener('mouseenter', () => {
          clearTimeout(closeTimer);
          openTimer = setTimeout(openPop, 150);
        });

        pop.addEventListener('mouseleave', () => {
          clearTimeout(openTimer);
          closeTimer = setTimeout(closePop, 200);
        });
      }

      // Title link click should navigate directly
      if (titleLink) {
        titleLink.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      // Close button
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closePop();
          if (summary) summary.focus();
        });
      }

      // Summary click toggle
      if (summary) {
        summary.addEventListener('click', (e) => {
          // If clicked on child interactive elements, do not toggle
          if (e.target.closest('a, button')) return;
          e.preventDefault();
          
          if (!pop.open) {
            openPop();
          } else {
            closePop();
          }
        });
      }
    });

    // Global click outside to close
    document.addEventListener('click', (e) => {
      pops.forEach(pop => {
        if (pop.open && !pop.contains(e.target)) {
          pop.open = false;
          pop.classList.remove('open-above');
        }
      });
    });

    // Global ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        pops.forEach(pop => {
          if (pop.open) {
            pop.open = false;
            pop.classList.remove('open-above');
            const s = pop.querySelector('summary');
            if (s) s.focus();
          }
        });
      }
    });

    // Viewport resize across 768px closes all
    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        pops.forEach(p => {
          p.open = false;
          p.classList.remove('open-above');
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetricPopovers);
  } else {
    initMetricPopovers();
  }
})();
