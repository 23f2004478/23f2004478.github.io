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
