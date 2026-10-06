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

  // 5. Proof Portal Breakdown Toggle
  function setupProofPortals() {
    d.addEventListener('click', function(e) {
      var btn = e.target.closest('.proof-portal-btn');
      if (!btn) return;
      var portalId = btn.getAttribute('aria-controls');
      var portal = portalId ? d.getElementById(portalId) : btn.nextElementSibling;
      if (!portal) return;
      var isOpen = portal.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function() {
      setupEmailCopy();
      setupBackToTop();
      setupLinkPrefetch();
      setupProofCountup();
      setupProofPortals();
    });
  } else {
    setupEmailCopy();
    setupBackToTop();
    setupLinkPrefetch();
    setupProofCountup();
    setupProofPortals();
  }
})();
