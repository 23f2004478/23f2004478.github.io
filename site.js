/**
 * Krishnendu Biswas: Interactive Client Layer (krishnendu.me)
 * Modules included (15): core_theme_nav, view_transitions, prefetch, search, reveal, countup, toc, back_to_top, chart_tooltips, diagram_focus, copy_email, filters, theme_fade, metric_popovers, heatmaps
 * Zero external dependencies. Config-driven build.
 */


// === Module: core_theme_nav (core_theme_nav.js) ===
/**
 * Core Theme & Navigation (baseline layer)
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

  // Mobile menu toggle. Breakpoint must match base.css (@media min-width:961px).
  var m = d.querySelector('.menu-btn'), n = d.querySelector('.site-head .nav');
  if (m && n) {
    var q = matchMedia('(max-width:960px)');
    var s = function(o) {
      n.classList.toggle('is-open', o);
      m.setAttribute('aria-expanded', o ? 'true' : 'false');
      m.setAttribute('aria-label', o ? 'Close navigation menu' : 'Open navigation menu');
    };
    s(false);
    q.addEventListener('change', function() { s(false); });
    m.addEventListener('click', function(e) {
      e.stopPropagation();
      s(!n.classList.contains('is-open'));
    });
    n.addEventListener('click', function(e) {
      if (q.matches && e.target.closest('a')) s(false);
    });
    d.addEventListener('click', function(e) {
      if (q.matches && n.classList.contains('is-open') && !m.contains(e.target) && !n.contains(e.target)) {
        s(false);
      }
    });
    d.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && n.classList.contains('is-open')) {
        s(false);
        m.focus();
      }
    });
  }

  // Proof portal breakdown toggle
  d.addEventListener('click', function(e) {
    var btn = e.target.closest('.proof-portal-btn');
    if (!btn) return;
    var portalId = btn.getAttribute('aria-controls');
    var portal = portalId ? d.getElementById(portalId) : btn.nextElementSibling;
    if (!portal) return;
    var isOpen = portal.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
})();


// === Module: view_transitions (view_transitions.js) ===
/**
 * Feature: view_transitions
 * Hook: [data-ix~="view_transitions"] or HTML document
 * Smooth cross-document view transitions with motion reduction support
 */
(function() {
  'use strict';
  if (!('startViewTransition' in document)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Intercept in-app navigation clicks if full SPA-like transitions are requested
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a || !a.href || a.target || a.hasAttribute('download')) return;
    if (a.origin !== window.location.origin) return;
    if (a.pathname.indexOf('/resume/') !== -1 || a.pathname.indexOf('/archive/') !== -1) return;
    if (a.pathname === window.location.pathname && a.hash) return;

    // Support smooth morph for same-origin links
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  });
})();


// === Module: prefetch (prefetch.js) ===
/**
 * Feature: prefetch
 * Hook: [data-ix~="prefetch"] or document links
 * Speculation rules / link prefetching for same-origin navigation
 */
(function() {
  'use strict';
  var prefetched = {};

  function prefetchUrl(url) {
    if (prefetched[url] || !url) return;
    if (url.indexOf('http') === 0 && url.indexOf(window.location.origin) !== 0) return;
    if (url.indexOf('#') === 0 || url.indexOf('mailto:') === 0 || url.indexOf('.pdf') !== -1 || url.indexOf('/archive/') !== -1) return;

    prefetched[url] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  document.addEventListener('mouseover', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && a.origin === window.location.origin) {
      prefetchUrl(a.pathname);
    }
  }, { passive: true });

  document.addEventListener('focusin', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && a.origin === window.location.origin) {
      prefetchUrl(a.pathname);
    }
  }, { passive: true });
})();


// === Module: search (search.js) ===
/**
 * Feature: search
 * Hook: [data-ix~="search"], [data-ix~="search_inline"], .search-trigger, .search-btn, Cmd+K, '/'
 * Accessible Command Palette Site Search & Inline Search Support
 */
(function() {
  'use strict';
  var d = document;
  var searchIndex = null;
  var backdrop = null;
  var input = null;
  var resultsList = null;
  var selectedIndex = -1;
  var isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

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
      '<div class="search-modal" data-ix="search">',
      '  <div class="search-head">',
      '    <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="9" r="6"></circle><path d="M14 14l4 4"></path></svg>',
      '    <input type="text" class="search-input" placeholder="Search pages, projects, case studies, logs..." autocomplete="off" spellcheck="false" aria-label="Search site">',
      '    <span class="search-kbd">' + kbdHint + '</span>',
      '    <button type="button" class="icon-btn search-close" aria-label="Close search (Esc)">',
      '      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>',
      '    </button>',
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
    var closeBtn = backdrop.querySelector('.search-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeSearch();
      });
    }

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
    backdrop.hidden = false;
    input.value = '';
    input.focus();
    d.body.style.overflow = 'hidden';
    loadIndex(function() {
      performSearch('');
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
        '<li class="search-item' + isSel + '" role="option"' + ariaSel + '>',
        '  <a href="' + escapeHtml(item.url) + '">',
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
      if (backdrop && !backdrop.hidden && (e.key === 'Escape' || e.key === 'Esc')) {
        closeSearch();
      }
      return;
    }

    if (e.key === 'Escape' || e.key === 'Esc') {
      if (backdrop && !backdrop.hidden) {
        closeSearch();
        return;
      }
    }

    // Cmd+K or Ctrl+K or '/'
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.metaKey && !e.ctrlKey)) {
      e.preventDefault();
      openSearch();
    }
  });

  // Attach search trigger buttons if present
  function attachTriggers() {
    d.querySelectorAll('.search-trigger, .search-btn, [data-ix~="search"]').forEach(function(btn) {
      if (btn.tagName === 'BUTTON' || btn.tagName === 'A') {
        if (!btn.dataset.searchBound) {
          btn.dataset.searchBound = 'true';
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            openSearch();
          });
        }
      }
    });
  }

  // Inline search support (e.g. 404 page)
  function setupInlineSearch() {
    var inlineWraps = d.querySelectorAll('[data-ix~="search_inline"], .search-inline-wrap');
    inlineWraps.forEach(function(wrap) {
      var inlineInput = wrap.querySelector('.search-inline-input');
      var inlineResults = wrap.querySelector('.search-inline-results');
      if (!inlineInput || !inlineResults) return;

      inlineInput.addEventListener('focus', function() {
        loadIndex(function() {});
      });

      inlineInput.addEventListener('input', function() {
        var query = inlineInput.value.trim();
        if (!query) {
          inlineResults.hidden = true;
          inlineResults.innerHTML = '';
          return;
        }
        loadIndex(function(index) {
          var q = query.toLowerCase();
          var terms = q.split(/\s+/).filter(Boolean);
          var matches = index.filter(function(item) {
            var str = (item.title + ' ' + (item.tags || '') + ' ' + (item.desc || '') + ' ' + item.url).toLowerCase();
            return terms.every(function(t) { return str.indexOf(t) !== -1; });
          }).slice(0, 6);

          inlineResults.hidden = false;
          if (!matches.length) {
            inlineResults.innerHTML = '<li class="search-empty">No matching pages found for "' + escapeHtml(query) + '"</li>';
            return;
          }
          inlineResults.innerHTML = matches.map(function(item) {
            return '<li class="search-item"><a href="' + escapeHtml(item.url) + '"><span class="search-item-title">' + escapeHtml(item.title) + '</span>' + (item.tags ? '<span class="search-item-tags">' + escapeHtml(item.tags) + '</span>' : '') + '</a></li>';
          }).join('');
        });
      });
    });
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function() {
      attachTriggers();
      setupInlineSearch();
    });
  } else {
    attachTriggers();
    setupInlineSearch();
  }

  // Expose API
  window.openSiteSearch = openSearch;
})();


// === Module: reveal (reveal.js) ===
/**
 * Feature: reveal
 * Hook: [data-ix~="reveal"]
 * Smooth scroll-reveal for sections and lists with capped stagger
 */
(function() {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initReveal() {
    var targets = document.querySelectorAll('[data-ix~="reveal"], section.section:not(.hero)');
    if (!targets.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function(el) {
      // Never hide/reveal hero or first screen elements
      if (el.closest('.hero, .site-head')) return;
      el.classList.add('reveal-init');
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
})();


// === Module: countup (countup.js) ===
/**
 * Feature: countup
 * Hook: [data-ix~="countup"], dl.proof dt
 * Animated count-up for key proof metrics
 */
(function() {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initCountup() {
    var targets = document.querySelectorAll('[data-ix~="countup"], dl.proof dt');
    if (!targets.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    targets.forEach(function(el) {
      if (!el.hasAttribute('aria-label')) {
        el.setAttribute('aria-label', el.textContent.trim());
      }
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

      var duration = 600;
      var startTime = performance.now();

      function update(now) {
        var elapsed = now - startTime;
        var progress = Math.min(1, elapsed / duration);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountup);
  } else {
    initCountup();
  }
})();


// === Module: toc (toc.js) ===
/**
 * Feature: toc
 * Hook: [data-ix~="toc"], article.wrap, article.entry-page
 * Sticky Table of Contents rail, mobile collapsible TOC, section anchors, and code copy
 */
(function() {
  'use strict';
  var d = document;

  function slugify(text) {
    return (text || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Heading anchors
  function setupHeadingAnchors() {
    var headings = d.querySelectorAll('main h2, main h3');
    headings.forEach(function(h) {
      if (h.closest('.modal, .diag-modal, .search-modal, .proof, summary, .internship-summary, details')) return;
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
          if (window.showToast) window.showToast('Copied section link');
          history.pushState(null, null, '#' + h.id);
        }).catch(function() {
          window.location.hash = h.id;
        });
      });

      h.appendChild(anchor);
    });
  }

  // Sticky TOC
  function setupStickyTOC() {
    var article = d.querySelector('article.wrap, article.entry-page, [data-ix~="toc"]');
    if (!article) return;

    var headings = article.querySelectorAll('h2');
    if (headings.length < 3) return;

    article.classList.add('has-toc');

    // Desktop sticky sidebar
    var sidebar = d.createElement('aside');
    sidebar.className = 'toc-sidebar';
    sidebar.setAttribute('aria-label', 'Table of contents');

    var sticky = d.createElement('nav');
    sticky.className = 'page-toc toc-sticky';
    sticky.innerHTML = '<h3 class="toc-title">On this page</h3>';

    var ul = d.createElement('ul');
    ul.className = 'toc-list';

    // Mobile collapsible TOC
    var mobileDetails = d.createElement('details');
    mobileDetails.className = 'mobile-toc full-flow';
    mobileDetails.innerHTML = '<summary>On this page</summary>';
    var mobileUl = d.createElement('ul');
    mobileUl.className = 'mobile-toc-list';
    mobileDetails.appendChild(mobileUl);

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
      var clone = h.cloneNode(true);
      clone.querySelectorAll('.heading-anchor, .tag, .sr-only').forEach(function(el) { el.remove(); });
      var titleText = clone.textContent.trim();
      a.textContent = titleText;
      li.appendChild(a);
      ul.appendChild(li);

      var mLi = d.createElement('li');
      var mA = d.createElement('a');
      mA.href = '#' + h.id;
      mA.textContent = titleText;
      mLi.appendChild(mA);
      mobileUl.appendChild(mLi);

      links.push({ link: a, heading: h });
    });

    sticky.appendChild(ul);
    sidebar.appendChild(sticky);
    article.insertBefore(sidebar, article.firstChild);

    var headIn = article.querySelector('.page-head, .entry-meta, h1');
    if (headIn && headIn.nextElementSibling) {
      headIn.parentNode.insertBefore(mobileDetails, headIn.nextElementSibling);
    }

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

  // Code Copy
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
          if (window.showToast) window.showToast('Copied snippet to clipboard');
          setTimeout(function() {
            btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:12px;height:12px"><rect x="6" y="6" width="11" height="11" rx="1.5"/><path d="M4 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V4"/></svg> Copy';
            btn.classList.remove('is-copied');
          }, 2000);
        });
      });

      wrap.appendChild(btn);
    });
  }

  function openDetailsOnHash() {
    var h = location.hash;
    if (!h) return;
    var e = d.getElementById(h.slice(1));
    var x = e && e.closest('details');
    if (x) x.open = true;
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function() {
      setupHeadingAnchors();
      setupStickyTOC();
      setupCodeCopy();
      openDetailsOnHash();
    });
  } else {
    setupHeadingAnchors();
    setupStickyTOC();
    setupCodeCopy();
    openDetailsOnHash();
  }
  window.addEventListener('hashchange', openDetailsOnHash);
})();


// === Module: back_to_top (back_to_top.js) ===
/**
 * Feature: back_to_top
 * Hook: [data-ix~="back_to_top"], document.body
 * Floating Back-to-Top Navigation Button after 1.5 viewports
 */
(function() {
  'use strict';
  var d = document;

  function initBackToTop() {
    var btn = d.createElement('button');
    btn.type = 'button';
    btn.className = 'back-to-top';
    btn.setAttribute('data-ix', 'back_to_top');
    btn.setAttribute('aria-label', 'Back to top of page');
    btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px"><path d="M10 16V4M4 10l6-6 6 6"/></svg>';

    d.body.appendChild(btn);

    var threshold = window.innerHeight * 1.5;
    var ticking = false;

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          var show = window.scrollY > threshold;
          btn.classList.toggle('is-visible', show);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      var main = d.getElementById('main') || d.querySelector('h1');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    });
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', initBackToTop);
  } else {
    initBackToTop();
  }
})();


// === Module: chart_tooltips (chart_tooltips.js) ===
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


// === Module: diagram_focus (diagram_focus.js) ===
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


// === Module: copy_email (copy_email.js) ===
/**
 * Feature: copy_email
 * Hook: [data-ix~="copy_email"], a[href^="mailto:"]
 * Interactive email copy button with fallback and aria-live toast notification
 */
(function() {
  'use strict';
  var d = document;

  var toastEl = null;
  var toastTimer = null;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = d.createElement('div');
      toastEl.className = 'toast-notice';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      d.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove('is-visible');
    }, 2500);
  }
  window.showToast = showToast;

  function copyText(text, onSuccess, onError) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(function() {
        fallbackCopy(text, onSuccess, onError);
      });
    } else {
      fallbackCopy(text, onSuccess, onError);
    }
  }

  function fallbackCopy(text, onSuccess, onError) {
    try {
      var ta = d.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      d.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = d.execCommand('copy');
      d.body.removeChild(ta);
      if (ok) {
        onSuccess();
      } else if (onError) {
        onError();
      }
    } catch (err) {
      if (onError) onError();
    }
  }

  function setupCopyEmail() {
    var mailLinks = d.querySelectorAll('[data-ix~="copy_email"], a[href^="mailto:"]');
    mailLinks.forEach(function(link) {
      if (link.dataset.copySetup) return;
      link.dataset.copySetup = 'true';

      var rawHref = link.getAttribute('href') || '';
      var email = rawHref.replace(/^mailto:/i, '').split('?')[0].trim();
      if (!email) return;

      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-btn copy-email-btn';
      btn.setAttribute('aria-label', 'Copy email address ' + email);
      btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px"><rect x="6" y="6" width="11" height="11" rx="1.5"/><path d="M4 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V4"/></svg>';

      function doCopy(e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        copyText(email, function() {
          showToast('Email copied to clipboard: ' + email);
        }, function() {
          showToast('Email: ' + email);
        });
      }

      btn.addEventListener('click', doCopy);

      if (link.parentNode && (link.classList.contains('reach-item') || link.closest('.foot-links') || link.closest('.hero-contact') || link.closest('.textlinks') || link.closest('.reach-row'))) {
        link.parentNode.insertBefore(btn, link.nextSibling);
      }
    });
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', setupCopyEmail);
  } else {
    setupCopyEmail();
  }
})();


// === Module: filters (filters.js) ===
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


// === Module: theme_fade (theme_fade.js) ===
/**
 * Feature: theme_fade
 * Hook: [data-ix~="theme_fade"], .theme-btn, .theme-toggle
 * Smooth theme toggle cross-fade using View Transitions API
 */
(function() {
  'use strict';
  var d = document, r = d.documentElement;

  if (!('startViewTransition' in d)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var t = d.querySelector('.theme-btn, .theme-toggle');
  if (!t) return;

  // Enhance the default click handler
  t.addEventListener('click', function(e) {
    if (d.startViewTransition) {
      // Allow the view transition to handle the visual morph
    }
  }, true);
})();


// === Module: metric_popovers (metric_popovers.js) ===
/**
 * metric_popovers.js: popover behaviour for the homepage metric cards.
 * Desktop: hover (150ms) or click opens; mobile: bottom sheet on tap.
 * Close: X button (click, tap, Enter, Space), Escape, click outside. Focus returns to the card summary.
 * v6: delegated close handler in capture phase, direct touch/click bindings, hover re-open suppressed right after an explicit close,
 * panels flip to the right edge when they would leave the viewport.
 */
(function() {
  function initMetricPopovers() {
    var pops = Array.prototype.slice.call(document.querySelectorAll('.metric-pop, [data-ix~="metric_pop"]'));
    if (!pops.length) return;

    var wasMobile = window.innerWidth < 768;
    var isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function place(pop) {
      var panel = pop.querySelector('.metric-panel');
      pop.classList.remove('open-above', 'open-right');
      if (window.innerWidth < 768 || !panel) return;
      var rect = pop.getBoundingClientRect();
      if (window.innerHeight - rect.bottom < 360 && rect.top > 360) pop.classList.add('open-above');
      var w = panel.offsetWidth || 320;
      if (rect.left + w > document.documentElement.clientWidth - 8) pop.classList.add('open-right');
    }

    function openPop(pop) {
      clearTimeout(pop._closeT);
      pops.forEach(function(p) { if (p !== pop && p.open) closePop(p, false); });
      if (!pop.open) pop.open = true;
      var s = pop.querySelector('summary');
      if (s) s.setAttribute('aria-expanded', 'true');
      place(pop);
    }

    function closePop(pop, restoreFocus) {
      clearTimeout(pop._openT);
      clearTimeout(pop._closeT);
      var s = pop.querySelector('summary');
      if (pop.open) pop.open = false;
      pop.classList.remove('open-above', 'open-right');
      if (s) {
        s.setAttribute('aria-expanded', 'false');
        if (restoreFocus) s.focus({ preventScroll: true });
      }
    }

    pops.forEach(function(pop) {
      pop.classList.add('is-js-active');
      var summary = pop.querySelector('summary');
      var closeBtn = pop.querySelector('.panel-close');
      pop._suppressUntil = 0;

      if (isFinePointer) {
        pop.addEventListener('mouseenter', function() {
          clearTimeout(pop._closeT);
          if (Date.now() < pop._suppressUntil) return;
          pop._openT = setTimeout(function() { openPop(pop); }, 150);
        });
        pop.addEventListener('mouseleave', function() {
          clearTimeout(pop._openT);
          var ae = document.activeElement;
          if (pop.contains(ae) && ae !== summary) return;
          pop._closeT = setTimeout(function() { closePop(pop, false); }, 200);
        });
      }

      if (summary) {
        summary.addEventListener('click', function(e) {
          if (e.target.closest('a, button')) return;
          e.preventDefault();
          if (pop.open) {
            pop._suppressUntil = Date.now() + 600;
            closePop(pop, false);
          } else {
            openPop(pop);
          }
        });
      }

      if (closeBtn) {
        function handleDirectClose(e) {
          e.preventDefault();
          e.stopPropagation();
          pop._suppressUntil = Date.now() + 600;
          closePop(pop, true);
        }
        closeBtn.addEventListener('click', handleDirectClose);
        closeBtn.addEventListener('touchend', handleDirectClose);
      }
    });

    // Delegated close: every X, however it is activated (mouse, touch, pen, keyboard Enter/Space)
    document.addEventListener('click', function(e) {
      var btn = e.target.closest && e.target.closest('.panel-close');
      if (btn) {
        var pop = btn.closest('.metric-pop');
        if (pop) {
          e.preventDefault();
          e.stopPropagation();
          pop._suppressUntil = Date.now() + 600;
          closePop(pop, true);
        }
        return;
      }
      pops.forEach(function(pop) {
        if (pop.open && !pop.contains(e.target)) closePop(pop, false);
      });
    }, true);

    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      pops.forEach(function(pop) {
        if (pop.open) {
          pop._suppressUntil = Date.now() + 600;
          closePop(pop, true);
        }
      });
    });

    window.addEventListener('resize', function() {
      var isMobile = window.innerWidth < 768;
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        pops.forEach(function(p) { closePop(p, false); });
      } else {
        pops.forEach(function(p) { if (p.open) place(p); });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetricPopovers);
  } else {
    initMetricPopovers();
  }
})();


// === Module: heatmaps (heatmaps.js) ===
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
        tooltip.textContent = text;
        tooltip.classList.add('is-visible');
        tooltip.setAttribute('aria-hidden', 'false');

        const rect = td.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tipRect.height - 6;
        let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

        // Flip below if too close to top
        if (top < 8) {
          top = rect.bottom + 6;
        }
        // Clamp horizontal
        if (left < 8) left = 8;
        if (left + tipRect.width > window.innerWidth - 8) {
          left = window.innerWidth - tipRect.width - 8;
        }

        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left + window.scrollX}px`;

        if (activeDisplay) {
          activeDisplay.textContent = text;
        }
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

