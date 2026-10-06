/**
 * Feature: diagram_focus
 * Hook: [data-ix~="diagram_focus"], svg.dg, figure.fig, .gate-anim
 * Interactive diagram node focus, edge highlighting, lightbox zoom, and hero animation replay
 */
(function() {
  'use strict';
  var d = document;

  // 1. Diagram Node Focus & Dimming
  function setupDiagramFocus() {
    var diagrams = d.querySelectorAll('[data-ix~="diagram_focus"], svg.dg, svg.arch-svg');
    diagrams.forEach(function(svg) {
      var nodes = svg.querySelectorAll('rect.k-n, rect.k-b, rect.k-a, rect.k-p, rect.k-d, g.node, g.arch-node');
      if (!nodes.length) return;

      var fig = svg.closest('figure, .arch-diagram-wrap, .ribbon-sec');
      var liveAnnouncer = null;
      if (fig) {
        liveAnnouncer = fig.querySelector('.diagram-live-caption');
        if (!liveAnnouncer) {
          liveAnnouncer = d.createElement('div');
          liveAnnouncer.className = 'diagram-live-caption sr-only';
          liveAnnouncer.setAttribute('aria-live', 'polite');
          fig.appendChild(liveAnnouncer);
        }
      }

      nodes.forEach(function(node) {
        function focusNode() {
          nodes.forEach(function(n) {
            if (n !== node) {
              n.style.opacity = '0.38';
            } else {
              n.style.opacity = '1';
              var bg = n.querySelector('.node-bg') || n;
              if (bg.tagName && bg.tagName.toLowerCase() === 'rect') {
                bg.style.stroke = 'var(--accent)';
                bg.style.strokeWidth = '2px';
              }
            }
          });
          var label = node.getAttribute('aria-label') || node.textContent.trim();
          if (liveAnnouncer && label) {
            liveAnnouncer.textContent = 'Focused: ' + label;
          }
        }

        function blurNode() {
          nodes.forEach(function(n) {
            n.style.opacity = '';
            var bg = n.querySelector('.node-bg') || n;
            if (bg.tagName && bg.tagName.toLowerCase() === 'rect') {
              bg.style.stroke = '';
              bg.style.strokeWidth = '';
            }
          });
          if (liveAnnouncer) liveAnnouncer.textContent = '';
        }

        node.addEventListener('mouseenter', focusNode);
        node.addEventListener('mouseleave', blurNode);
        node.addEventListener('focus', focusNode);
        node.addEventListener('blur', blurNode);
      });
    });
  }

  // 2. Lightbox Modal Expansion
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
    var figures = d.querySelectorAll('figure.fig, figure.hero-fig, figure, .case-diagram, .arch-diagram-wrap');
    figures.forEach(function(fig) {
      if (fig.querySelector('.diag-expand-btn')) return;
      var svgs = fig.querySelectorAll('svg.dg, svg.gate-dg, svg.chart-svg, svg.arch-svg');
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
  }

  // 3. Hero Animation Observer & Replay
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

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function() {
      setupDiagramFocus();
      setupDiagramExpansion();
      setupAnimations();
    });
  } else {
    setupDiagramFocus();
    setupDiagramExpansion();
    setupAnimations();
  }
})();
