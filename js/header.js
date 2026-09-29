(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var THRESHOLD = 8;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var header = null;
  var toggle = null;
  var menu = null;
  var anchorY = 0;
  var ticking = false;
  var menuOpen = false;
  var lockCount = 0;

  var scrollLock = {
    lock: function () {
      lockCount += 1;
      if (lockCount === 1) {
        document.documentElement.classList.add('is-locked');
      }
    },
    unlock: function () {
      if (lockCount === 0) {
        return;
      }
      lockCount -= 1;
      if (lockCount === 0) {
        document.documentElement.classList.remove('is-locked');
      }
    }
  };

  function scrollTop() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function show() {
    header.classList.remove('is-hidden');
  }

  function update() {
    ticking = false;
    var y = scrollTop();
    header.classList.toggle('is-scrolled', y > THRESHOLD);

    var pinned = menuOpen || reduceMotion.matches || y <= header.offsetHeight || header.contains(document.activeElement);
    if (pinned) {
      show();
      anchorY = y;
      return;
    }
    if (y > anchorY + THRESHOLD) {
      header.classList.add('is-hidden');
      anchorY = y;
    } else if (y < anchorY - THRESHOLD) {
      show();
      anchorY = y;
    }
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  function setBackgroundInert(state) {
    var targets = document.querySelectorAll('main, .site-footer, .skip-link');
    for (var i = 0; i < targets.length; i += 1) {
      targets[i].inert = state;
      if (state) {
        targets[i].setAttribute('inert', '');
      } else {
        targets[i].removeAttribute('inert');
      }
    }
  }

  function openMenu() {
    if (menuOpen) {
      return;
    }
    menuOpen = true;
    toggle.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    header.classList.add('is-menu-open');
    show();
    setBackgroundInert(true);
    scrollLock.lock();
    var first = menu.querySelector('a');
    if (first) {
      window.setTimeout(function () {
        if (menuOpen) {
          first.focus({ preventScroll: true });
        }
      }, 60);
    }
  }

  function closeMenu(returnFocus) {
    if (!menuOpen) {
      return;
    }
    menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    header.classList.remove('is-menu-open');
    setBackgroundInert(false);
    scrollLock.unlock();
    if (returnFocus) {
      toggle.focus({ preventScroll: true });
    }
  }

  function bindMenu() {
    toggle.addEventListener('click', function () {
      if (menuOpen) {
        closeMenu(true);
      } else {
        openMenu();
      }
    });

    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        closeMenu(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (menuOpen && (event.key === 'Escape' || event.key === 'Esc')) {
        event.preventDefault();
        closeMenu(true);
      }
    });

    var onBreakpoint = function (query) {
      if (query.matches) {
        closeMenu(false);
      }
    };
    if (typeof desktop.addEventListener === 'function') {
      desktop.addEventListener('change', onBreakpoint);
    } else if (typeof desktop.addListener === 'function') {
      desktop.addListener(onBreakpoint);
    }
  }

  function init() {
    header = document.querySelector('[data-header]');
    toggle = document.querySelector('[data-menu-toggle]');
    menu = document.querySelector('[data-menu]');
    if (!header) {
      return;
    }
    anchorY = scrollTop();
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    header.addEventListener('focusin', show);
    if (toggle && menu) {
      bindMenu();
    }
  }

  Norte.scrollLock = scrollLock;
  Norte.header = {
    init: init,
    closeMenu: closeMenu
  };
})();
