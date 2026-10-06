/**
 * Consolidated Interactive Layer - krishnendu.me
 * Zero external dependencies. Modularly compiled.
 */


// === theme-nav.js ===
/**
 * Theme & Nav Controller
 */
(function() {
  'use strict';
  var d = document, r = d.documentElement, k = 'theme';
  r.classList.add('js');

  // Theme toggle
  var t = d.querySelector('.theme-btn, .theme-toggle');
  if (t) {
    t.addEventListener('click', function() {
      var n = r.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', n);
      try { localStorage.setItem(k, n); } catch(e) {}
      t.setAttribute('aria-pressed', n === 'dark');
    });
    t.setAttribute('aria-pressed', r.getAttribute('data-theme') === 'dark');
  }

  // Mobile menu toggle
  var m = d.querySelector('.menu-btn'), l = d.getElementById('navlist');
  if (m && l) {
    m.classList.add('js');
    var q = matchMedia('(max-width:899px)');
    function s(o) {
      l.hidden = !o;
      m.setAttribute('aria-expanded', o);
    }
    s(!q.matches);
    q.addEventListener('change', function() { s(!q.matches); });
    m.addEventListener('click', function() { s(l.hidden); });
    d.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && q.matches && !l.hidden) {
        s(false);
        m.focus();
      }
    });
  }
})();


// === search.js ===
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


// === diagrams.js ===
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


// === reading.js ===
/**
 * Reading Tools: Sticky Table of Contents, Reading Time, Code Copy, Section Anchors, Scroll Progress
 */
(function() {
  'use strict';
  var d = document;

  // 1. Toast notice
  var toast = d.createElement('div');
  toast.className = 'toast-notice';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  d.body.appendChild(toast);
  var toastTimeout = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  // 2. Scroll progress bar
  var sp = d.querySelector('.scroll-progress');
  if (sp) {
    window.addEventListener('scroll', function() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0) {
        var pct = Math.min(100, Math.max(0, (window.scrollY / h) * 100));
        sp.style.width = pct + '%';
      }
    }, { passive: true });
  }

  function slugify(text) {
    return (text || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // 3. Section Anchors (copy link to section)
  function setupHeadingAnchors() {
    var headings = d.querySelectorAll('main h2, main h3');
    headings.forEach(function(h) {
      if (h.closest('.modal, .diag-modal, .search-modal, .proof')) return;
      if (!h.id) {
        var baseSlug = slugify(h.textContent);
        if (!baseSlug) return;
        var slug = baseSlug;
        var count = 1;
        while (d.getElementById(slug)) {
          slug = baseSlug + '-' + (++count);
        }
        h.id = slug;
      }
      var anchor = d.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = '#' + h.id;
      anchor.setAttribute('aria-label', 'Copy link to this section');
      anchor.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px"><path d="M8 12a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1M12 8a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1"/></svg>';

      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        var url = window.location.origin + window.location.pathname + '#' + h.id;
        navigator.clipboard.writeText(url).then(function() {
          showToast('Copied section link');
          history.pushState(null, null, '#' + h.id);
        }).catch(function() {
          window.location.hash = h.id;
        });
      });

      h.appendChild(anchor);
    });
  }

  // 4. Code block copy buttons
  function setupCodeCopy() {
    var pres = d.querySelectorAll('pre');
    pres.forEach(function(pre) {
      var wrap = pre.parentElement;
      if (!wrap.classList.contains('code-wrap')) {
        wrap = d.createElement('div');
        wrap.className = 'code-wrap';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);
      }

      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copy code snippet');
      btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:12px;height:12px"><rect x="6" y="6" width="11" height="11" rx="1.5"/><path d="M4 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V4"/></svg> Copy';

      btn.addEventListener('click', function() {
        var code = pre.querySelector('code') || pre;
        var text = code.textContent;
        navigator.clipboard.writeText(text).then(function() {
          btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:12px;height:12px"><path d="M4 10l4 4 8-8"/></svg> Copied';
          btn.classList.add('is-copied');
          showToast('Copied snippet to clipboard');
          setTimeout(function() {
            btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:12px;height:12px"><rect x="6" y="6" width="11" height="11" rx="1.5"/><path d="M4 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V4"/></svg> Copy';
            btn.classList.remove('is-copied');
          }, 2000);
        });
      });

      wrap.appendChild(btn);
    });
  }

  // 5. Sticky Floating Table of Contents for Long Case Studies & Logs
  function setupStickyTOC() {
    var article = d.querySelector('article.wrap, article.entry-page');
    if (!article) return;

    var headings = article.querySelectorAll('h2');
    if (headings.length < 3) return;

    article.classList.add('has-toc');

    var sidebar = d.createElement('aside');
    sidebar.className = 'toc-sidebar';
    sidebar.setAttribute('aria-label', 'Table of contents');

    var sticky = d.createElement('nav');
    sticky.className = 'page-toc toc-sticky';
    sticky.innerHTML = '<h3 class="toc-title">On this page</h3>';

    var ul = d.createElement('ul');
    ul.className = 'toc-list';

    var links = [];
    headings.forEach(function(h) {
      if (!h.id) {
        var baseSlug = slugify(h.textContent);
        if (!baseSlug) return;
        var slug = baseSlug;
        var count = 1;
        while (d.getElementById(slug)) {
          slug = baseSlug + '-' + (++count);
        }
        h.id = slug;
      }

      var li = d.createElement('li');
      li.className = 'toc-item';
      var a = d.createElement('a');
      a.className = 'toc-link';
      a.href = '#' + h.id;
      // Get heading text without anchor or badges
      var clone = h.cloneNode(true);
      clone.querySelectorAll('.heading-anchor, .tag, .sr-only').forEach(function(el) { el.remove(); });
      a.textContent = clone.textContent.trim();
      li.appendChild(a);
      ul.appendChild(li);
      links.push({ link: a, heading: h });
    });

    sticky.appendChild(ul);
    sidebar.appendChild(sticky);
    article.insertBefore(sidebar, article.firstChild);

    // Active heading tracking via IntersectionObserver or Scroll
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            links.forEach(function(item) {
              item.link.classList.toggle('is-active', item.heading.id === id);
            });
          }
        });
      }, { rootMargin: '-80px 0px -70% 0px' });

      headings.forEach(function(h) { obs.observe(h); });
    }
  }

  // 6. Open details on hash change
  function openDetailsOnHash() {
    var h = location.hash;
    if (!h) return;
    var e = d.getElementById(h.slice(1));
    var x = e && e.closest('details');
    if (x) x.open = true;
  }

  // 7. Reading Time Estimation Badge for articles
  function setupReadingTime() {
    var article = d.querySelector('article.wrap, article.entry-page');
    if (!article) return;
    var text = article.textContent || '';
    var words = text.trim().split(/\s+/).length;
    if (words < 100) return;
    var mins = Math.max(1, Math.round(words / 200));
    var badge = d.createElement('span');
    badge.className = 'reading-time tag mono';
    badge.textContent = mins + ' min read';
    badge.setAttribute('title', words.toLocaleString() + ' words (~200 wpm)');
    
    var panel = article.querySelector('.panel, .entry-meta, .page-head');
    var h1 = article.querySelector('h1');
    if (h1 && h1.nextElementSibling && h1.nextElementSibling.classList.contains('deck')) {
      var deck = h1.nextElementSibling;
      var span = d.createElement('span');
      span.className = 'deck-meta-item';
      span.style.marginLeft = '0.5rem';
      span.appendChild(badge);
      deck.appendChild(span);
    }
  }

  setupHeadingAnchors();
  setupCodeCopy();
  setupStickyTOC();
  setupReadingTime();
  window.addEventListener('hashchange', openDetailsOnHash);
  openDetailsOnHash();
})();


// === filters.js ===
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


// === controls.js ===
/**
 * Interactive Controls & Enhancements:
 * 1. Email Copy Action with Live Feedback Toast
 * 2. Floating Back-to-Top Navigation Button
 * 3. Instant Page Prefetching on Hover/Focus
 * 4. Animated Number Countup for Metric Proofs
 */
(function() {
  'use strict';
  var d = document;

  // 1. Copy Email Helper & Event Delegation
  function setupEmailCopy() {
    var email = 'krishnendu.biswasi22@iimranchi.ac.in';

    d.addEventListener('click', function(e) {
      var mailLink = e.target.closest('a[href^="mailto:"]');
      if (mailLink && (e.altKey || e.metaKey || e.ctrlKey || mailLink.hasAttribute('data-copy-email'))) {
        e.preventDefault();
        var targetEmail = mailLink.getAttribute('href').replace(/^mailto:/i, '').split('?')[0] || email;
        navigator.clipboard.writeText(targetEmail).then(function() {
          if (window.showToast) {
            window.showToast('Copied ' + targetEmail + ' to clipboard');
          } else {
            var toast = d.querySelector('.toast-notice');
            if (toast) {
              toast.textContent = 'Copied ' + targetEmail + ' to clipboard';
              toast.classList.add('is-visible');
              setTimeout(function() { toast.classList.remove('is-visible'); }, 2400);
            }
          }
        });
      }
    });
  }

  // 2. Floating Back-to-Top Button
  function setupBackToTop() {
    var btn = d.createElement('button');
    btn.type = 'button';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top of page');
    btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px"><path d="M10 16V4M4 10l6-6 6 6"/></svg>';

    d.body.appendChild(btn);

    var scrollThreshold = 450;
    var ticking = false;

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          var show = window.scrollY > scrollThreshold;
          btn.classList.toggle('is-visible', show);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var main = d.getElementById('main') || d.querySelector('h1');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    });
  }

  // 3. Fast Prefetching for Internal Links
  function setupLinkPrefetch() {
    var prefetched = {};

    function prefetchUrl(url) {
      if (prefetched[url] || !url || url.indexOf('http') === 0 && url.indexOf(window.location.origin) !== 0) return;
      if (url.indexOf('#') === 0 || url.indexOf('mailto:') === 0 || url.indexOf('.pdf') !== -1) return;

      prefetched[url] = true;
      var link = d.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      d.head.appendChild(link);
    }

    d.addEventListener('mouseover', function(e) {
      var a = e.target.closest('a');
      if (a && a.href && a.origin === window.location.origin) {
        prefetchUrl(a.pathname);
      }
    }, { passive: true });

    d.addEventListener('focusin', function(e) {
      var a = e.target.closest('a');
      if (a && a.href && a.origin === window.location.origin) {
        prefetchUrl(a.pathname);
      }
    }, { passive: true });
  }

  // 4. Accessible Number Countup for Metric Proofs
  function setupProofCountup() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var numbers = d.querySelectorAll('dl.proof dt');
    if (!numbers.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    numbers.forEach(function(el) {
      observer.observe(el);
    });

    function animateCount(el) {
      var raw = el.textContent.trim();
      var match = raw.match(/^([0-9\.]+)(.*)$/);
      if (!match) return;

      var targetNum = parseFloat(match[1]);
      var suffix = match[2];
      var isDecimal = match[1].indexOf('.') !== -1;
      var decimals = isDecimal ? (match[1].split('.')[1].length) : 0;

      var duration = 900;
      var startTime = performance.now();

      function update(now) {
        var elapsed = now - startTime;
        var progress = Math.min(1, elapsed / duration);
        // ease-out cubic
        var ease = 1 - Math.pow(1 - progress, 3);
        var current = targetNum * ease;

        el.textContent = (isDecimal ? current.toFixed(decimals) : Math.round(current)) + suffix;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = raw;
        }
      }

      requestAnimationFrame(update);
    }
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function() {
      setupEmailCopy();
      setupBackToTop();
      setupLinkPrefetch();
      setupProofCountup();
    });
  } else {
    setupEmailCopy();
    setupBackToTop();
    setupLinkPrefetch();
    setupProofCountup();
  }
})();
