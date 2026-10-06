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
    m.addEventListener('click', function() { s(!n.classList.contains('is-open')); });
    n.addEventListener('click', function(e) { if (q.matches && e.target.closest('a')) s(false); });
    d.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && n.classList.contains('is-open')) { s(false); m.focus(); }
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
