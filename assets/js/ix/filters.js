/**
 * Feature: filters
 * Hook: [data-ix~="filters"], section#education, section#certifications, section#case-studies, section#projects-list
 * Dynamic category filter chips for list hubs with URL hash sync & live counts
 */
(function() {
  'use strict';
  var d = document;

  function initPageFilters() {
    var path = window.location.pathname;

    if (path.indexOf('/credentials') !== -1) {
      setupCredentialsFilters();
    } else if (path.indexOf('/projects') !== -1) {
      setupProjectsFilters();
    } else if (path.indexOf('/work') !== -1 && path.replace(/\/$/, '') === '/work') {
      setupWorkFilters();
    }
  }

  // 1. Credentials filtering
  function setupCredentialsFilters() {
    var main = d.querySelector('main');
    if (!main || d.querySelector('.filter-bar')) return;

    var sections = main.querySelectorAll('section');
    if (!sections.length) return;

    var categories = [
      { id: 'all', label: 'All credentials' },
      { id: 'education', label: 'Degrees' },
      { id: 'certifications', label: 'Certifications' },
      { id: 'skills', label: 'Skills by evidence' }
    ];

    createFilterUI(main, categories, function(catId) {
      var visibleCount = 0;
      sections.forEach(function(sec) {
        var sid = sec.id || '';
        var match = (catId === 'all') ||
                    (catId === 'education' && (sid === 'education' || sec.querySelector('#education-heading'))) ||
                    (catId === 'certifications' && (sid === 'certifications' || sec.querySelector('#certifications-heading'))) ||
                    (catId === 'skills' && (sid === 'skills' || sec.querySelector('#skills-heading')));

        sec.hidden = !match;
        if (match) visibleCount++;
      });
      return visibleCount;
    });
  }

  // 2. Projects filtering
  function setupProjectsFilters() {
    var main = d.querySelector('main');
    if (!main || d.querySelector('.filter-bar')) return;

    var items = main.querySelectorAll('section, article, .project-card, .entry');
    if (items.length < 2) return;

    var categories = [
      { id: 'all', label: 'All projects' },
      { id: 'ml', label: 'Machine learning & research' },
      { id: 'systems', label: 'Agent systems & data' }
    ];

    createFilterUI(main, categories, function(catId) {
      var count = 0;
      items.forEach(function(item) {
        var text = (item.textContent || '').toLowerCase();
        var match = (catId === 'all') ||
                    (catId === 'ml' && (text.indexOf('ficta') !== -1 || text.indexOf('churn') !== -1 || text.indexOf('recall') !== -1 || text.indexOf('model') !== -1)) ||
                    (catId === 'systems' && (text.indexOf('agent') !== -1 || text.indexOf('ledger') !== -1 || text.indexOf('pipeline') !== -1 || text.indexOf('engine') !== -1));

        item.hidden = !match;
        if (match) count++;
      });
      return count;
    });
  }

  // 3. Work filtering
  function setupWorkFilters() {
    var main = d.querySelector('main');
    if (!main || d.querySelector('.filter-bar')) return;

    var items = main.querySelectorAll('#case-studies .rows li, .case-grid > *');
    if (items.length < 2) return;

    var categories = [
      { id: 'all', label: 'All agent systems' },
      { id: 'infra', label: 'Platform & routing' },
      { id: 'tools', label: 'Ledger & memory' }
    ];

    createFilterUI(main, categories, function(catId) {
      var count = 0;
      items.forEach(function(item) {
        var text = (item.textContent || '').toLowerCase();
        var match = (catId === 'all') ||
                    (catId === 'infra' && (text.indexOf('platform') !== -1 || text.indexOf('routing') !== -1 || text.indexOf('multi-agent') !== -1)) ||
                    (catId === 'tools' && (text.indexOf('ledger') !== -1 || text.indexOf('memory') !== -1 || text.indexOf('linkedin') !== -1 || text.indexOf('reliability') !== -1));

        item.hidden = !match;
        if (match) count++;
      });
      return count;
    });
  }

  function createFilterUI(container, categories, filterFn) {
    var bar = d.createElement('div');
    bar.className = 'filter-bar wrap';
    bar.setAttribute('data-ix', 'filters');
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Filter items by category');

    var liveStatus = d.createElement('span');
    liveStatus.className = 'filter-status sr-only';
    liveStatus.setAttribute('aria-live', 'polite');

    var currentCat = 'all';
    var hashMatch = location.hash.match(/#cat=([a-z0-9_-]+)/);
    if (hashMatch && categories.some(function(c) { return c.id === hashMatch[1]; })) {
      currentCat = hashMatch[1];
    }

    var buttons = [];

    categories.forEach(function(cat) {
      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip' + (cat.id === currentCat ? ' is-active' : '');
      btn.setAttribute('data-cat', cat.id);
      btn.setAttribute('aria-pressed', cat.id === currentCat ? 'true' : 'false');
      btn.textContent = cat.label;

      btn.addEventListener('click', function() {
        if (currentCat === cat.id) return;
        currentCat = cat.id;

        buttons.forEach(function(b) {
          var isCur = b.getAttribute('data-cat') === currentCat;
          b.classList.toggle('is-active', isCur);
          b.setAttribute('aria-pressed', isCur ? 'true' : 'false');
        });

        if (currentCat === 'all') {
          history.replaceState(null, null, window.location.pathname);
        } else {
          history.replaceState(null, null, '#cat=' + currentCat);
        }

        applyFilter();
      });

      buttons.push(btn);
      bar.appendChild(btn);
    });

    bar.appendChild(liveStatus);

    var targetInsert = container.querySelector('.page-head, h1');
    if (targetInsert && targetInsert.parentNode) {
      targetInsert.parentNode.insertBefore(bar, targetInsert.nextSibling);
    } else {
      container.insertBefore(bar, container.firstChild);
    }

    function applyFilter() {
      if ('startViewTransition' in d && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        d.startViewTransition(function() {
          var count = filterFn(currentCat);
          liveStatus.textContent = 'Showing ' + count + ' items';
        });
      } else {
        var count = filterFn(currentCat);
        liveStatus.textContent = 'Showing ' + count + ' items';
      }
    }

    applyFilter();
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', initPageFilters);
  } else {
    initPageFilters();
  }
})();
