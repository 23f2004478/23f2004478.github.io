/**
 * Theme & UI Interactions - krishnendu.me
 * Zero external dependencies. Minimal payload.
 */

(function () {
  'use strict';

  var storageKey = 'krishnendu_theme';
  var root = document.documentElement;

  // Function to get current theme
  function getTheme() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var paramTheme = urlParams.get('theme');
      if (paramTheme === 'light' || paramTheme === 'dark') {
        return paramTheme;
      }
    } catch (e) {}
    var stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Apply theme to DOM
  function applyTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
    updateButtons(theme);
  }

  function updateButtons(theme) {
    var toggles = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < toggles.length; i++) {
      var btn = toggles[i];
      var isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/></svg>';
    }
  }

  // Toggle theme handler
  function toggleTheme() {
    var current = getTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  // Initialize
  var initialTheme = getTheme();
  applyTheme(initialTheme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem(storageKey)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  function initEvents() {
    updateButtons(getTheme());

    var toggles = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', toggleTheme);
    }

    // Mobile nav toggle
    var mobileToggle = document.querySelector('.mobile-nav-toggle');
    var mainNav = document.querySelector('.main-nav');
    if (mobileToggle && mainNav) {
      mobileToggle.addEventListener('click', function () {
        var isOpen = mainNav.classList.toggle('is-open');
        mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }
})();
