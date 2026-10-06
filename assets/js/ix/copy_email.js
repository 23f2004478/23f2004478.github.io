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
