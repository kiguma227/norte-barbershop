(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var FOUNDED = 2014;
  var IMAGE_HOLDERS = '.team-card__media, .gallery__thumb, .about__media, .hero__media';

  function safely(task) {
    try {
      task();
    } catch (error) {
      if (window.console && typeof window.console.error === 'function') {
        window.console.error(error);
      }
    }
  }

  function markBroken(image) {
    var holder = image.closest(IMAGE_HOLDERS);
    if (!holder || holder.classList.contains('img-fallback')) {
      return;
    }
    holder.classList.add('img-fallback');
    holder.setAttribute('data-fallback', image.alt || '');
  }

  function watchImages() {
    var images = document.querySelectorAll('main img');
    Array.prototype.forEach.call(images, function (image) {
      image.addEventListener('error', function () {
        markBroken(image);
      });
      if (image.complete && image.getAttribute('src') && image.naturalWidth === 0) {
        markBroken(image);
      }
    });
  }

  function refreshFallbacks() {
    var holders = document.querySelectorAll('.img-fallback');
    Array.prototype.forEach.call(holders, function (holder) {
      var image = holder.querySelector('img');
      holder.setAttribute('data-fallback', image ? image.alt : '');
    });
  }

  function prepareStats() {
    var now = Norte.schedule ? Norte.schedule.madridNow().year : new Date().getFullYear();
    var years = Math.max(1, now - FOUNDED);
    var nodes = document.querySelectorAll('[data-count-source="years"]');
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.hasAttribute('data-count')) {
        node.setAttribute('data-count', String(years));
        node.textContent = String(years);
      } else {
        node.setAttribute('data-count-value', String(years));
      }
    });
  }

  function setYear() {
    var year = Norte.schedule ? Norte.schedule.madridNow().year : new Date().getFullYear();
    var nodes = document.querySelectorAll('[data-year]');
    Array.prototype.forEach.call(nodes, function (node) {
      node.textContent = String(year);
    });
  }

  function start() {
    safely(prepareStats);
    safely(setYear);
    safely(function () {
      Norte.i18n.init();
    });
    safely(function () {
      Norte.schedule.init();
    });
    safely(function () {
      Norte.header.init();
    });
    safely(function () {
      Norte.hero.init();
    });
    safely(function () {
      Norte.reveal.init();
    });
    safely(function () {
      Norte.gallery.init();
    });
    safely(function () {
      Norte.booking.init();
    });
    safely(watchImages);
    document.addEventListener('norte:langchange', refreshFallbacks);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
