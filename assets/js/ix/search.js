/**
 * Client-Side Instant Search Modal
 * Keyboard shortcuts: Cmd+K / Ctrl+K / '/'
 */
(function() {
  'use strict';
  var d = document;
  var searchIndex = null;
  var backdrop = null;
  var input = null;
  var resultsList = null;
  var selectedIndex = -1;
  var isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  function loadIndex(cb) {
    if (searchIndex) return cb(searchIndex);
    fetch('/assets/search_index.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        searchIndex = data;
        cb(searchIndex);
      })
      .catch(function(err) {
        console.error('Failed to load search index:', err);
      });
  }

  function createModal() {
    if (backdrop) return;
    backdrop = d.createElement('div');
    backdrop.className = 'search-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Site search');

    var kbdHint = isMac ? '⌘K' : 'Ctrl+K';

    backdrop.innerHTML = [
      '<div class="search-modal">',
      '  <div class="search-head">',
      '    <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="9" r="6"></circle><path d="M14 14l4 4"></path></svg>',
      '    <input type="text" class="search-input" placeholder="Search pages, projects, case studies, logs..." autocomplete="off" spellcheck="false" aria-label="Search site">',
      '    <span class="search-kbd">' + kbdHint + '</span>',
      '  </div>',
      '  <ul class="search-results" id="search-results-list" role="listbox" aria-label="Search results"></ul>',
      '  <div class="search-foot">',
      '    <div class="search-foot-keys">',
      '      <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>',
      '      <span><kbd>↵</kbd> Select</span>',
      '      <span><kbd>Esc</kbd> Close</span>',
      '    </div>',
      '    <span>Krishnendu.me Search</span>',
      '  </div>',
      '</div>'
    ].join('\n');

    d.body.appendChild(backdrop);
    input = backdrop.querySelector('.search-input');
    resultsList = backdrop.querySelector('.search-results');

    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) closeSearch();
    });

    input.addEventListener('input', function() {
      performSearch(input.value.trim());
    });

    input.addEventListener('keydown', handleKeyNavigation);
  }

  function openSearch() {
    createModal();
    loadIndex(function() {
      backdrop.hidden = false;
      input.value = '';
      performSearch('');
      input.focus();
      d.body.style.overflow = 'hidden';
    });
  }

  function closeSearch() {
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    d.body.style.overflow = '';
  }

  function performSearch(query) {
    if (!searchIndex) return;
    var q = query.toLowerCase();
    var terms = q.split(/\s+/).filter(Boolean);

    var matches = [];
    if (!terms.length) {
      matches = searchIndex.slice(0, 8);
    } else {
      matches = searchIndex.filter(function(item) {
        var str = (item.title + ' ' + (item.tags || '') + ' ' + (item.desc || '') + ' ' + item.url).toLowerCase();
        return terms.every(function(t) { return str.indexOf(t) !== -1; });
      }).slice(0, 10);
    }

    renderResults(matches, query);
  }

  function renderResults(matches, query) {
    selectedIndex = matches.length > 0 ? 0 : -1;
    if (matches.length === 0) {
      resultsList.innerHTML = '<li class="search-empty">No matching pages found for "' + escapeHtml(query) + '"</li>';
      return;
    }

    var html = matches.map(function(item, idx) {
      var isSel = idx === 0 ? ' is-selected' : '';
      var ariaSel = idx === 0 ? ' aria-selected="true"' : ' aria-selected="false"';
      var tags = item.tags ? '<span class="search-item-tags">' + escapeHtml(item.tags) + '</span>' : '';
      return [
        '<li class="search-item' + isSel + '" role="option"' + ariaSel + ' data-idx="' + idx + '">',
        '  <a href="' + item.url + '">',
        '    <span class="search-item-title">' + escapeHtml(item.title) + '</span>',
        tags,
        '  </a>',
        '</li>'
      ].join('');
    }).join('');

    resultsList.innerHTML = html;
  }

  function handleKeyNavigation(e) {
    var items = resultsList.querySelectorAll('.search-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelection(items);
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && items[selectedIndex]) {
        var link = items[selectedIndex].querySelector('a');
        if (link) {
          e.preventDefault();
          window.location.href = link.href;
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  }

  function updateSelection(items) {
    items.forEach(function(el, i) {
      var isSel = i === selectedIndex;
      el.classList.toggle('is-selected', isSel);
      el.setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Global keyboard shortcuts
  d.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      if (backdrop && !backdrop.hidden && e.key === 'Escape') {
        closeSearch();
      }
      return;
    }

    // Cmd+K or Ctrl+K or '/'
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.metaKey && !e.ctrlKey)) {
      e.preventDefault();
      openSearch();
    }
  });

  // Attach search trigger buttons if present
  d.querySelectorAll('.search-trigger, .search-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      openSearch();
    });
  });

  // Expose API
  window.openSiteSearch = openSearch;
})();
