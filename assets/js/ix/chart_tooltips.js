/**
 * Feature: chart_tooltips
 * Hook: [data-ix~="chart_tooltips"], .chart-svg, .dg.chart
 * Focusable and interactive data points with tooltips & show-data toggle
 */
(function() {
  'use strict';
  var d = document;

  var tooltip = d.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-hidden', 'true');
  d.body.appendChild(tooltip);

  function positionTooltip(x, y) {
    tooltip.style.left = x + 'px';
    tooltip.style.top = (y - 12) + 'px';
  }

  function setupChartTooltips() {
    var chartSvgs = d.querySelectorAll('[data-ix~="chart_tooltips"], .chart-svg, .dg.chart');
    chartSvgs.forEach(function(svg) {
      var bars = svg.querySelectorAll('rect.bar-a, rect.bar-n, circle.pt');
      bars.forEach(function(bar) {
        bar.setAttribute('tabindex', '0');
        bar.setAttribute('role', 'graphics-symbol');

        var y = parseFloat(bar.getAttribute('y') || bar.getAttribute('cy') || 0);
        var height = parseFloat(bar.getAttribute('height') || 0);
        var centerY = y + height / 2;

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
          tipText = title ? title.textContent.trim() : 'Metric data point';
        }
        bar.setAttribute('aria-label', tipText);

        function show(e) {
          tooltip.textContent = tipText;
          tooltip.classList.add('is-visible');
          tooltip.setAttribute('aria-hidden', 'false');
          var rect = bar.getBoundingClientRect();
          var clientX = e.clientX || (rect.left + rect.width / 2);
          var clientY = e.clientY || rect.top;
          positionTooltip(clientX, clientY);
        }

        function hide() {
          tooltip.classList.remove('is-visible');
          tooltip.setAttribute('aria-hidden', 'true');
        }

        bar.addEventListener('mouseenter', show);
        bar.addEventListener('mousemove', function(e) { positionTooltip(e.clientX, e.clientY); });
        bar.addEventListener('mouseleave', hide);
        bar.addEventListener('focus', show);
        bar.addEventListener('blur', hide);
        bar.addEventListener('click', function(e) {
          e.stopPropagation();
          show(e);
        });
      });
    });

    d.addEventListener('click', function(e) {
      if (!e.target.closest('.chart-svg, .dg.chart')) {
        tooltip.classList.remove('is-visible');
        tooltip.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Show data toggle
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

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function() {
      setupChartTooltips();
      setupShowData();
    });
  } else {
    setupChartTooltips();
    setupShowData();
  }
})();
