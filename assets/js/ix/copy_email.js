/**
 * Feature: copy_email
 * Hook: [data-ix~="copy_email"], a[href^="mailto:"]
 * Interactive email copy button with aria-live toast notification
 */
(function() {
  'use strict';
  var d = document;

  // Global toast helper
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
    }, 2000);
  }
  window.showToast = showToast;

  function setupCopyEmail() {
    var mailLinks = d.querySelectorAll('[data-ix~="copy_email"], a[href^="mailto:"]');
    mailLinks.forEach(function(link) {
      if (link.dataset.copySetup) return;
      link.dataset.copySetup = 'true';

      var email = link.getAttribute('href').replace(/^mailto:/, '').split('?')[0];

      // Add a quick copy button if it's a prominent contact row or text
      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-btn copy-email-btn';
      btn.setAttribute('aria-label', 'Copy email address ' + email);
      btn.innerHTML = '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px"><rect x="6" y="6" width="11" height="11" rx="1.5"/><path d="M4 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V4"/></svg>';

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(email).then(function() {
          showToast('Email copied: ' + email);
        }).catch(function() {
          showToast('Email: ' + email);
        });
      });

      if (link.parentNode && (link.classList.contains('reach-item') || link.closest('.foot-links') || link.closest('.hero-contact'))) {
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
