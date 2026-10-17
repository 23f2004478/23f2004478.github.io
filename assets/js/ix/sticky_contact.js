/**
 * Feature: sticky_contact
 * Hook: #sticky-bar (rendered only when site.config.json features.sticky_contact is true)
 * Mobile bottom bar (Resume, Email me). Shown after the hero leaves the viewport;
 * hidden while the contact section or footer is visible and while a field has focus.
 */
(function() {
  'use strict';
  var d = document;
  function init() {
    var bar = d.getElementById('sticky-bar');
    var hero = d.querySelector('.hero-actions') || d.querySelector('.hero');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;
    var past = false, atEnd = false, typing = false;
    var root = d.documentElement;
    function render() {
      var on = past && !atEnd && !typing;
      if (on) bar.removeAttribute('hidden'); else bar.setAttribute('hidden', '');
      bar.classList.toggle('is-on', on);
      root.classList.toggle('sticky-on', on);
    }
    root.classList.add('has-sticky');
    new IntersectionObserver(function(es) {
      var e = es[es.length - 1];
      past = !e.isIntersecting && e.boundingClientRect.bottom < 0;
      render();
    }).observe(hero);
    var endEls = [d.getElementById('contact'), d.querySelector('.site-foot')].filter(Boolean);
    var vis = new Map();
    var endObs = new IntersectionObserver(function(es) {
      es.forEach(function(e) { vis.set(e.target, e.isIntersecting); });
      atEnd = endEls.some(function(el) { return vis.get(el); });
      render();
    });
    endEls.forEach(function(el) { endObs.observe(el); });
    function isField(el) { return el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName); }
    d.addEventListener('focusin', function(e) { typing = isField(e.target); render(); });
    d.addEventListener('focusout', function() { typing = false; render(); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
