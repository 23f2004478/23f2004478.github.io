/**
 * Feature: chart_tooltips
 * Hook: [data-ix~="chart_tooltips"], .chart-svg, .dg.chart, .tl-fig svg, figure.fig svg
 * Focusable and interactive data points with tooltips & show-data toggle
 */
(function() {
  'use strict';
  var d = document;

  var tooltip = d.querySelector('.chart-tooltip');
  if (!tooltip) {
    tooltip = d.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    d.body.appendChild(tooltip);
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function positionTooltip(target, e) {
    var rect = target.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var scrollX = window.pageXOffset || d.documentElement.scrollLeft || 0;
    var scrollY = window.pageYOffset || d.documentElement.scrollTop || 0;

    var centerX = rect.left + (rect.width / 2);
    var targetTop = rect.top;
    var top = targetTop - 8;
    var left = centerX;

    var halfW = tipRect.width / 2;
    var minL = 10 + halfW;
    var maxL = window.innerWidth - 10 - halfW;
    if (maxL < minL) {
      left = window.innerWidth / 2;
    } else if (left < minL) {
      left = minL;
    } else if (left > maxL) {
      left = maxL;
    }

    if (top - tipRect.height < 10) {
      top = rect.bottom + 8;
      tooltip.classList.add('pos-below');
    } else {
      tooltip.classList.remove('pos-below');
    }

    tooltip.style.left = (left + scrollX) + 'px';
    tooltip.style.top = (top + scrollY) + 'px';
  }

  var activeEl = null;

  function hide() {
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
    if (activeEl) {
      activeEl.classList.remove('is-active');
      activeEl = null;
    }
  }

  function showMilestone(dot, e) {
    if (activeEl && activeEl !== dot) {
      activeEl.classList.remove('is-active');
    }
    activeEl = dot;
    dot.classList.add('is-active');

    var dotDate = dot.getAttribute('data-date') || '';
    var dotLabel = dot.getAttribute('data-label') || '';
    var dotCat = dot.getAttribute('data-cat') || '';

    var svg = dot.closest('svg') || dot.ownerSVGElement;
    var sameDayDots = svg && dotDate ? Array.prototype.slice.call(svg.querySelectorAll('.ms-dot[data-date="' + dotDate + '"]')) : [dot];

    var html = '<div class="tip-head">' + esc(dotDate) + '</div>';
    if (sameDayDots.length > 1) {
      sameDayDots.forEach(function(d2) {
        var c = d2.getAttribute('data-cat') || '';
        var l = d2.getAttribute('data-label') || '';
        var isCurrent = (d2 === dot);
        html += '<div class="tip-row' + (isCurrent ? ' is-current' : '') + '">' +
                (c ? '<span class="tip-cat">' + esc(c) + ':</span> ' : '') +
                '<span class="tip-label">' + esc(l) + '</span>' +
                '</div>';
      });
    } else {
      html += '<div class="tip-row is-current">' +
              (dotCat ? '<span class="tip-cat">' + esc(dotCat) + ':</span> ' : '') +
              '<span class="tip-label">' + esc(dotLabel) + '</span>' +
              '</div>';
    }

    tooltip.innerHTML = html;
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
    positionTooltip(dot, e);
  }

  function showBar(bar, svg, e) {
    if (activeEl && activeEl !== bar) {
      activeEl.classList.remove('is-active');
    }
    activeEl = bar;
    bar.classList.add('is-active');

    var tipText = bar.getAttribute('aria-label');
    if (!tipText) {
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

      tipText = label ? (label + (val ? ': ' + val : '')) : val;
      if (!tipText) {
        var title = bar.querySelector('title') || svg.querySelector('title');
        tipText = title ? title.textContent.trim() : 'Metric data point';
      }
      bar.setAttribute('aria-label', tipText);
    }

    tooltip.innerHTML = '<div class="tip-row">' + esc(tipText) + '</div>';
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
    positionTooltip(bar, e);
  }

  function setupChartTooltips() {
    // Setup milestone dots
    var dots = d.querySelectorAll('.ms-dot');
    dots.forEach(function(dot) {
      if (!dot.hasAttribute('tabindex')) {
        dot.setAttribute('tabindex', '0');
      }
      if (!dot.hasAttribute('role')) {
        dot.setAttribute('role', 'graphics-symbol');
      }

      dot.addEventListener('mouseenter', function(e) { showMilestone(dot, e); });
      dot.addEventListener('mouseleave', function() {
        if (d.activeElement !== dot) hide();
      });
      dot.addEventListener('focus', function(e) { showMilestone(dot, e); });
      dot.addEventListener('blur', hide);
      dot.addEventListener('click', function(e) {
        e.stopPropagation();
        showMilestone(dot, e);
      });
    });

    // Setup bar charts and other points
    var chartSvgs = d.querySelectorAll('[data-ix~="chart_tooltips"], .chart-svg, .dg.chart, .tl-fig svg, figure.fig svg');
    chartSvgs.forEach(function(svg) {
      var bars = svg.querySelectorAll('rect.bar-a, rect.bar-n, circle.pt');
      bars.forEach(function(bar) {
        if (!bar.hasAttribute('tabindex')) {
          bar.setAttribute('tabindex', '0');
        }
        if (!bar.hasAttribute('role')) {
          bar.setAttribute('role', 'graphics-symbol');
        }

        bar.addEventListener('mouseenter', function(e) { showBar(bar, svg, e); });
        bar.addEventListener('mouseleave', function() {
          if (d.activeElement !== bar) hide();
        });
        bar.addEventListener('focus', function(e) { showBar(bar, svg, e); });
        bar.addEventListener('blur', hide);
        bar.addEventListener('click', function(e) {
          e.stopPropagation();
          showBar(bar, svg, e);
        });
      });
    });

    // Global dismiss handlers
    d.addEventListener('click', function(e) {
      if (!e.target.closest('.ms-dot, rect.bar-a, rect.bar-n, circle.pt, .chart-tooltip')) {
        hide();
      }
    });

    d.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        hide();
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
