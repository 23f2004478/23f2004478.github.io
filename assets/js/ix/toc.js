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
