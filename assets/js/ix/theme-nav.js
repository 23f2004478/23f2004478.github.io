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
