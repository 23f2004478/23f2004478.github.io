/**
 * Feature: beacon (privacy-first, cookieless, opt-in at build time)
 * Included in the bundle ONLY when site.config.json analytics.enabled is true and an endpoint is set.
 * Sends nothing when Do Not Track or Global Privacy Control is on. No cookies, no storage.
 * Payload: {path, event, key}; pageview adds {ref: referrer host or 'direct', vp: sm|md|lg}. Events: pageview, scroll (25/50/75/100), click (termly|resume|email|linkedin).
 */
(function() {
  'use strict';
  var ENDPOINT = __BEACON_ENDPOINT__;
  var n = navigator, w = window, d = document;
  if (!ENDPOINT || typeof n.sendBeacon !== 'function') return;
  if (n.doNotTrack === '1' || w.doNotTrack === '1' || n.msDoNotTrack === '1' || n.globalPrivacyControl === true) return;

  function send(event, key, extra) {
    try {
      var o = { path: location.pathname, event: event, key: key };
      if (extra) { for (var k in extra) { o[k] = extra[k]; } }
      var body = JSON.stringify(o);
      n.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
    } catch (e) {}
  }
  function refHost() {
    try { return d.referrer ? new URL(d.referrer).hostname : 'direct'; } catch (e) { return 'direct'; }
  }
  function bucket() {
    var v = w.innerWidth;
    return v < 768 ? 'sm' : (v < 1024 ? 'md' : 'lg');
  }
  function keyFor(a) {
    var h = a.getAttribute('href') || '';
    if (/^mailto:/i.test(h)) return 'email';
    if (/termly-iimr\.vercel\.app/i.test(h)) return 'termly';
    if (/linkedin\.com/i.test(h)) return 'linkedin';
    if (/\/resume\/.*\.pdf/i.test(h)) return 'resume';
    return '';
  }
  function init() {
    send('pageview', '', { ref: refHost(), vp: bucket() });
    var fired = {}, ticking = false, marks = [25, 50, 75, 100];
    function onScroll() {
      if (ticking) return;
      ticking = true;
      w.requestAnimationFrame(function() {
        ticking = false;
        var el = d.documentElement;
        var max = el.scrollHeight - w.innerHeight;
        var pct = max > 0 ? (w.scrollY / max) * 100 : 100;
        marks.forEach(function(m) {
          if (pct >= m - 0.5 && !fired[m]) { fired[m] = 1; send('scroll', String(m)); }
        });
      });
    }
    w.addEventListener('scroll', onScroll, { passive: true });
    d.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var k = keyFor(a);
      if (k) send('click', k);
    }, true);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
