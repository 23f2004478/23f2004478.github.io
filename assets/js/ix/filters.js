/**
 * Instant Client-Side Category Filtering
 * Attaches accessible filter toolbars to Hub pages (/credentials/, /projects/, /work/)
 */
(function() {
  'use strict';
  var d = document;

  function setupFilters() {
    var path = window.location.pathname;

    if (path.indexOf('/credentials') !== -1) {
      setupCredentialsFilters();
    } else if (path.indexOf('/projects') !== -1 && path.replace(/\/$/, '') === '/projects') {
      setupProjectsFilters();
    } else if (path.indexOf('/work') !== -1 && path.replace(/\/$/, '') === '/work') {
      setupWorkFilters();
    }
  }

  function createFilterBar(categories, onSelect, activeId) {
    var bar = d.createElement('nav');
    bar.className = 'filter-bar wrap';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Filter categories');

    var list = d.createElement('div');
    list.className = 'filter-chips';

    categories.forEach(function(cat) {
      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip';
      btn.setAttribute('data-filter', cat.id);
      var isPressed = cat.id === activeId;
      btn.setAttribute('aria-pressed', isPressed ? 'true' : 'false');
      btn.textContent = cat.label;

      btn.addEventListener('click', function() {
        list.querySelectorAll('.filter-chip').forEach(function(b) {
          b.setAttribute('aria-pressed', 'false');
        });
        btn.setAttribute('aria-pressed', 'true');
        onSelect(cat.id);
      });

      list.appendChild(btn);
    });

    bar.appendChild(list);
    return bar;
  }

  function setupCredentialsFilters() {
    var main = d.querySelector('main');
    var article = d.querySelector('article.page-head, article.wrap');
    if (!article || !main) return;

    var sections = {
      'all': d.querySelectorAll('#certifications, #achievements, #education, #skills'),
      'certs': d.querySelectorAll('#certifications'),
      'achieve': d.querySelectorAll('#achievements'),
      'edu': d.querySelectorAll('#education'),
      'skills': d.querySelectorAll('#skills')
    };

    var categories = [
      { id: 'all', label: 'All credentials' },
      { id: 'certs', label: 'Certifications' },
      { id: 'achieve', label: 'Achievements' },
      { id: 'edu', label: 'Education' },
      { id: 'skills', label: 'Skills' }
    ];

    var bar = createFilterBar(categories, function(filterId) {
      var allSections = d.querySelectorAll('#certifications, #achievements, #education, #skills');
      allSections.forEach(function(sec) {
        if (filterId === 'all') {
          sec.hidden = false;
        } else {
          var match = false;
          sections[filterId].forEach(function(target) {
            if (target === sec) match = true;
          });
          sec.hidden = !match;
        }
      });
    }, 'all');

    // Insert before the first section
    var firstSec = d.querySelector('#certifications') || article.querySelector('section');
    if (firstSec) {
      firstSec.parentNode.insertBefore(bar, firstSec);
    }
  }

  function setupProjectsFilters() {
    var rowsList = d.querySelector('section ul.rows');
    if (!rowsList) return;

    var items = rowsList.querySelectorAll('li');
    if (items.length < 3) return;

    var categories = [
      { id: 'all', label: 'All projects' },
      { id: 'ml', label: 'AI & Machine Learning' },
      { id: 'bi', label: 'Power BI & Analytics' },
      { id: 'code', label: 'Python & Web' }
    ];

    var bar = createFilterBar(categories, function(filterId) {
      items.forEach(function(li) {
        var text = li.textContent.toLowerCase();
        if (filterId === 'all') {
          li.hidden = false;
        } else if (filterId === 'ml') {
          var isML = text.indexOf('machine learning') !== -1 || text.indexOf('nlp') !== -1 || text.indexOf('rag') !== -1 || text.indexOf('lora') !== -1 || text.indexOf('k-means') !== -1;
          li.hidden = !isML;
        } else if (filterId === 'bi') {
          var isBI = text.indexOf('power bi') !== -1 || text.indexOf('dax') !== -1 || text.indexOf('analytics') !== -1 || text.indexOf('dashboard') !== -1;
          li.hidden = !isBI;
        } else if (filterId === 'code') {
          var isCode = text.indexOf('python') !== -1 || text.indexOf('fastapi') !== -1 || text.indexOf('typescript') !== -1;
          li.hidden = !isCode;
        }
      });
    }, 'all');

    rowsList.parentNode.insertBefore(bar, rowsList);
  }

  function setupWorkFilters() {
    var caseList = d.querySelector('section#case-studies ul.rows, section ul.rows');
    if (!caseList) return;

    var items = caseList.querySelectorAll('li');
    if (items.length < 3) return;

    var categories = [
      { id: 'all', label: 'All case studies' },
      { id: 'agents', label: 'Multi-agent systems' },
      { id: 'reliability', label: 'Security & Reliability' },
      { id: 'ops', label: 'Finance & Operations' }
    ];

    var bar = createFilterBar(categories, function(filterId) {
      items.forEach(function(li) {
        var text = li.textContent.toLowerCase();
        if (filterId === 'all') {
          li.hidden = false;
        } else if (filterId === 'agents') {
          var isAgent = text.indexOf('platform') !== -1 || text.indexOf('routing') !== -1 || text.indexOf('memory') !== -1;
          li.hidden = !isAgent;
        } else if (filterId === 'reliability') {
          var isRel = text.indexOf('reliability') !== -1 || text.indexOf('security') !== -1;
          li.hidden = !isRel;
        } else if (filterId === 'ops') {
          var isOps = text.indexOf('finance') !== -1 || text.indexOf('linkedin') !== -1;
          li.hidden = !isOps;
        }
      });
    }, 'all');

    caseList.parentNode.insertBefore(bar, caseList);
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', setupFilters);
  } else {
    setupFilters();
  }
})();
