/**
 * Interactive Diagrams, Chart Tooltips and Lightbox Zoom
 */
(function() {
  'use strict';
  var d = document;

  // 1. Chart bar tooltips
  var tooltip = d.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-hidden', 'true');
  d.body.appendChild(tooltip);

  function setupChartTooltips() {
    var chartSvgs = d.querySelectorAll('.chart-svg, .dg.chart');
    chartSvgs.forEach(function(svg) {
      var bars = svg.querySelectorAll('rect.bar-a, rect.bar-n');
      bars.forEach(function(bar) {
        // Find associated label text if possible
        var y = parseFloat(bar.getAttribute('y') || 0);
        var height = parseFloat(bar.getAttribute('height') || 0);
        var centerY = y + height / 2;

        // Look for sibling text with close y
        var texts = svg.querySelectorAll('text');
        var label = '';
        var val = '';
        texts.forEach(function(txt) {
          var ty = parseFloat(txt.getAttribute('y') || 0);
          if (Math.abs(ty - centerY) < 16) {
            if (txt.getAttribute('text-anchor') === 'end') {
              label = txt.textContent.trim();
            } else if (txt.classList.contains('mono-n') || txt.classList.contains('mono')) {
              val = txt.textContent.trim();
            }
          }
        });

        var tipText = label ? (label + (val ? ': ' + val : '')) : val;
        if (!tipText) {
          var title = svg.querySelector('title');
          tipText = title ? title.textContent.trim() : 'Metric';
        }

        bar.addEventListener('mouseenter', function(e) {
          tooltip.textContent = tipText;
          tooltip.classList.add('is-visible');
          positionTooltip(e.clientX, e.clientY);
        });

        bar.addEventListener('mousemove', function(e) {
          positionTooltip(e.clientX, e.clientY);
        });

        bar.addEventListener('mouseleave', function() {
          tooltip.classList.remove('is-visible');
        });
      });
    });
  }

  function positionTooltip(x, y) {
    tooltip.style.left = x + 'px';
    tooltip.style.top = (y - 12) + 'px';
  }

  // 2. Diagram Lightbox Expansion
  var diagModal = null;
  function createDiagModal() {
    if (diagModal) return;
    diagModal = d.createElement('div');
    diagModal.className = 'diag-modal-backdrop';
    diagModal.hidden = true;
    diagModal.setAttribute('role', 'dialog');
    diagModal.setAttribute('aria-modal', 'true');
    diagModal.innerHTML = [
      '<div class="diag-modal">',
      '  <div class="diag-modal-head">',
      '    <h3 class="diag-modal-title">Diagram View</h3>',
      '    <button class="icon-btn diag-close-btn" type="button" aria-label="Close diagram view">',
      '      <svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l12 12M16 4L4 16"/></svg>',
      '    </button>',
      '  </div>',
      '  <div class="diag-modal-body"></div>',
      '</div>'
    ].join('\n');

    d.body.appendChild(diagModal);
    diagModal.querySelector('.diag-close-btn').addEventListener('click', closeDiagModal);
    diagModal.addEventListener('click', function(e) {
      if (e.target === diagModal) closeDiagModal();
    });

    d.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && diagModal && !diagModal.hidden) {
        closeDiagModal();
      }
    });
  }

  function openDiagModal(svgEl, title) {
    createDiagModal();
    var body = diagModal.querySelector('.diag-modal-body');
    var titleEl = diagModal.querySelector('.diag-modal-title');
    titleEl.textContent = title || 'Diagram View';

    var clone = svgEl.cloneNode(true);
    clone.classList.remove('wide', 'narrow', 'topo-w', 'topo-n');
    clone.removeAttribute('style');
    body.innerHTML = '';
    body.appendChild(clone);

    diagModal.hidden = false;
    d.body.style.overflow = 'hidden';
  }

  function closeDiagModal() {
    if (!diagModal || diagModal.hidden) return;
    diagModal.hidden = true;
    d.body.style.overflow = '';
  }

  function setupDiagramExpansion() {
    var figures = d.querySelectorAll('figure.fig, figure.hero-fig, figure, .case-diagram');
    figures.forEach(function(fig) {
      if (fig.querySelector('.diag-expand-btn')) return;
      var svgs = fig.querySelectorAll('svg.dg, svg.gate-dg, svg.chart-svg');
      if (!svgs.length) return;

      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'diag-expand-btn';
      btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px"><path d="M13 3h4v4M7 17H3v-4M17 3l-6 6M3 17l6-6"/></svg> Expand diagram';
      btn.setAttribute('aria-label', 'Expand diagram to full view');

      btn.addEventListener('click', function() {
        var visibleSvg = null;
        svgs.forEach(function(s) {
          if (getComputedStyle(s).display !== 'none') visibleSvg = s;
        });
        if (!visibleSvg) visibleSvg = svgs[0];

        var cap = fig.querySelector('figcaption, h2, h3');
        var title = cap ? cap.textContent.replace(/Show data|Hide data/g, '').trim().slice(0, 50) : 'Diagram View';
        openDiagModal(visibleSvg, title);
      });

      var cap = fig.querySelector('figcaption');
      if (cap) {
        cap.appendChild(btn);
      } else {
        fig.appendChild(btn);
      }
    });

    // Also handle standalone SVGs not inside a figure
    d.querySelectorAll('svg.dg, svg.chart-svg, svg.gate-dg').forEach(function(svg) {
      if (svg.closest('figure, .diag-modal-body, [hidden]')) return;
      if (svg.parentElement.querySelector('.diag-expand-btn')) return;

      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'diag-expand-btn';
      btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px"><path d="M13 3h4v4M7 17H3v-4M17 3l-6 6M3 17l6-6"/></svg> Expand diagram';
      btn.setAttribute('aria-label', 'Expand diagram to full view');

      btn.addEventListener('click', function() {
        var title = svg.getAttribute('aria-label') || (svg.querySelector('title') ? svg.querySelector('title').textContent : 'Diagram View');
        openDiagModal(svg, title);
      });

      svg.insertAdjacentElement('afterend', btn);
    });
  }

  // 3. Show data table toggle
  function setupShowData() {
    d.querySelectorAll('.show-data').forEach(function(b) {
      var p = d.getElementById(b.getAttribute('aria-controls'));
      if (!p) return;
      b.hidden = false;
      b.addEventListener('click', function() {
        var o = p.classList.toggle('sr-only');
        b.setAttribute('aria-expanded', !o);
        b.textContent = o ? 'Show data' : 'Hide data';
      });
    });
  }

  // 4. Animation intersection observer & replay
  function setupAnimations() {
    d.querySelectorAll('.anim-replay').forEach(function(b) {
      b.addEventListener('click', function() {
        var f = b.closest('figure') || d.querySelector('.gate-anim');
        if (f) {
          f.classList.remove('on');
          void f.offsetWidth;
          f.classList.add('on');
        }
      });
    });

    var g = d.querySelectorAll('.draw, .gate-anim');
    if (g.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(es) {
        es.forEach(function(e) {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.2 });
      g.forEach(function(x) { io.observe(x); });
    } else {
      g.forEach(function(x) { x.classList.add('on'); });
    }
  }

  setupChartTooltips();
  setupDiagramExpansion();
  setupShowData();
  setupAnimations();
})();
