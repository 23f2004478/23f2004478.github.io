/**
 * Feature: chapters
 * Hook: nav.chrail (desktop rail), nav.chbar (mobile sticky bar), built by gen_home.
 * Works without JS (anchors, :target, native details). JS adds: current chapter, bar label, bar shown after the
 * hero, close on tap/Escape/outside, thin progress bar.
 */
(function() {
  'use strict';
  var d = document;
  function init() {
    var rail = d.querySelector('.chrail'), bar = d.getElementById('chbar');
    var secs = [].slice.call(d.querySelectorAll('main .ch'));
    if (!rail || !bar || !secs.length || !('IntersectionObserver' in window)) return;
    var root = d.documentElement, det = bar.querySelector('details'), cur = bar.querySelector('.chbar-cur');
    var total = secs.length;
    var items = secs.map(function(s) {
      var h = s.querySelector('h2[id]');
      return {sec: s, id: h.id, title: h.textContent.trim()};
    });
    var links = [].slice.call(rail.querySelectorAll('a')).concat([].slice.call(bar.querySelectorAll('li a')));
    function setCurrent(i) {
      links.forEach(function(a) {
        if (a.getAttribute('href') === '#' + items[i].id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      cur.textContent = 'Chapter ' + (i + 1) + ' of ' + total + ': ' + items[i].title;
    }
    root.classList.add('ch-live');
    var idx = 0;
    function pick() {
      var line = Math.min(window.innerHeight * 0.35, 140), best = 0;
      items.forEach(function(it, i) { if (it.sec.getBoundingClientRect().top <= line) best = i; });
      if (best !== idx || !cur.dataset.set) { idx = best; cur.dataset.set = '1'; setCurrent(best); }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function() {
        ticking = false; pick();
        var h = root.scrollHeight - window.innerHeight;
        if (prog && h > 0) prog.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / h)) + ')';
      });
    }
    var prog = d.createElement('div'); prog.className = 'chprog'; prog.setAttribute('aria-hidden', 'true');
    d.body.appendChild(prog);
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    pick();
    var hero = d.querySelector('.hero');
    if (hero) {
      new IntersectionObserver(function(es) {
        var e = es[es.length - 1];
        var past = !e.isIntersecting && e.boundingClientRect.bottom < 0;
        bar.classList.toggle('is-on', past);
        if (!past) det.open = false;
      }).observe(hero);
    }
    bar.addEventListener('click', function(e) { if (e.target.closest && e.target.closest('li a')) det.open = false; });
    d.addEventListener('click', function(e) { if (det.open && !bar.contains(e.target)) det.open = false; });
    d.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && det.open) { det.open = false; var s = det.querySelector('summary'); if (s) s.focus(); }
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
