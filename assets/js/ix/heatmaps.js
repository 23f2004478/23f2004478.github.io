/**
 * heatmaps.js: Interactive GitHub-style activity grid logic.
 * Handles roving tabindex, tooltips on hover/focus, mobile tap display, and right-aligned initial scroll.
 */
(function() {
  function initHeatmaps() {
    const heatmaps = Array.from(document.querySelectorAll('.heatmap, [data-ix~="heatmap"]'));
    if (!heatmaps.length) return;

    // Create shared floating tooltip if not present
    let tooltip = document.querySelector('.heatmap-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'heatmap-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      tooltip.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tooltip);
    }

    heatmaps.forEach(hm => {
      const scrollContainer = hm.querySelector('.heatmap__scroll');
      const table = hm.querySelector('table');
      const activeDisplay = hm.closest('.metric-panel')?.querySelector('.panel-active-val');
      const metricType = hm.getAttribute('data-metric') || 'hours';

      if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
        // Initial scroll to right end for latest entries
        scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      }

      if (!table) return;

      const cells = Array.from(table.querySelectorAll('td[data-date]'));
      if (!cells.length) return;

      // Ensure first cell has tabindex 0, others -1
      cells.forEach((td, idx) => {
        td.setAttribute('tabindex', idx === 0 ? '0' : '-1');
      });

      function formatTip(td) {
        const d = td.getAttribute('data-date');
        const v = parseFloat(td.getAttribute('data-value') || '0');
        if (!d) return '';
        const dateObj = new Date(d + 'T00:00:00+05:30');
        const dateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        
        let valStr = '';
        if (metricType === 'hours') {
          valStr = v === 0 ? '0 hours' : (v.toFixed(1) + ' h');
        } else {
          if (v === 0) valStr = '0 tokens';
          else if (v >= 1e9) valStr = (v / 1e9).toFixed(2) + ' B tokens';
          else if (v >= 1e6) valStr = (v / 1e6).toFixed(1) + ' M tokens';
          else if (v >= 1e3) valStr = (v / 1e3).toFixed(1) + ' k tokens';
          else valStr = v.toLocaleString() + ' tokens';
        }

        const isToday = td.hasAttribute('data-today');
        return `${dateStr}: ${valStr}${isToday ? ' (today)' : ''}`;
      }

      function showTip(td) {
        const text = formatTip(td);
        if (!text) return;

        if (activeDisplay) {
          // Inside a metric popover panel: update the dedicated active status display above the grid.
          // Do not show floating tooltip to avoid duplicate text and cell occlusion.
          activeDisplay.textContent = text;
          hideTip();
          return;
        }

        tooltip.textContent = text;
        tooltip.classList.add('is-visible');
        tooltip.setAttribute('aria-hidden', 'false');

        const rect = td.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

        // Clamp to viewport
        if (top < 8) {
          top = rect.bottom + 8;
        }
        if (left < 8) left = 8;
        if (left + tipRect.width > window.innerWidth - 8) {
          left = window.innerWidth - tipRect.width - 8;
        }

        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left + window.scrollX}px`;
      }

      function hideTip() {
        tooltip.classList.remove('is-visible');
        tooltip.setAttribute('aria-hidden', 'true');
      }

      // Cell events
      cells.forEach(td => {
        td.addEventListener('mouseenter', () => showTip(td));
        td.addEventListener('mouseleave', hideTip);
        td.addEventListener('focus', () => showTip(td));
        td.addEventListener('blur', hideTip);

        td.addEventListener('click', () => {
          showTip(td);
        });

        // Keyboard roving navigation
        td.addEventListener('keydown', (e) => {
          const row = td.parentElement;
          const tbody = row.parentElement;
          const allRows = Array.from(tbody.querySelectorAll('tr'));
          const rowIdx = allRows.indexOf(row);
          const rowCells = Array.from(row.querySelectorAll('td'));
          const colIdx = rowCells.indexOf(td);

          let targetTd = null;

          if (e.key === 'ArrowRight') {
            e.preventDefault();
            // Move right in current row
            for (let c = colIdx + 1; c < rowCells.length; c++) {
              if (!rowCells[c].classList.contains('is-void') && rowCells[c].hasAttribute('data-date')) {
                targetTd = rowCells[c];
                break;
              }
            }
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            // Move left in current row
            for (let c = colIdx - 1; c >= 0; c--) {
              if (!rowCells[c].classList.contains('is-void') && rowCells[c].hasAttribute('data-date')) {
                targetTd = rowCells[c];
                break;
              }
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            // Move down in same column
            for (let r = rowIdx + 1; r < allRows.length; r++) {
              const rCells = Array.from(allRows[r].querySelectorAll('td'));
              if (rCells[colIdx] && !rCells[colIdx].classList.contains('is-void') && rCells[colIdx].hasAttribute('data-date')) {
                targetTd = rCells[colIdx];
                break;
              }
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            // Move up in same column
            for (let r = rowIdx - 1; r >= 0; r--) {
              const rCells = Array.from(allRows[r].querySelectorAll('td'));
              if (rCells[colIdx] && !rCells[colIdx].classList.contains('is-void') && rCells[colIdx].hasAttribute('data-date')) {
                targetTd = rCells[colIdx];
                break;
              }
            }
          } else if (e.key === 'Home') {
            e.preventDefault();
            // First valid cell in row
            targetTd = rowCells.find(c => !c.classList.contains('is-void') && c.hasAttribute('data-date'));
          } else if (e.key === 'End') {
            e.preventDefault();
            // Last valid cell in row
            targetTd = [...rowCells].reverse().find(c => !c.classList.contains('is-void') && c.hasAttribute('data-date'));
          }

          if (targetTd) {
            cells.forEach(c => c.setAttribute('tabindex', '-1'));
            targetTd.setAttribute('tabindex', '0');
            targetTd.focus();
            showTip(targetTd);
          }
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeatmaps);
  } else {
    initHeatmaps();
  }
})();
