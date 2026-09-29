(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var COUNT_DURATION = 900;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function formatCount(value) {
    return Norte.i18n ? Norte.i18n.format.number(value) : String(value);
  }

  function setFinal(node) {
    node.textContent = formatCount(Number(node.getAttribute('data-count')));
  }

  function countUp(container) {
    var nodes = container.querySelectorAll('[data-count]');
    Array.prototype.forEach.call(nodes, function (node) {
      var target = Number(node.getAttribute('data-count'));
      if (reduceMotion.matches || !target) {
        setFinal(node);
        return;
      }
      var start = 0;
      node.setAttribute('data-counting', '');
      node.textContent = formatCount(0);
      var frame = function (now) {
        if (!start) {
          start = now;
        }
        var progress = Math.min(1, (now - start) / COUNT_DURATION);
        var eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = formatCount(Math.round(target * eased));
        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          node.removeAttribute('data-counting');
          setFinal(node);
        }
      };
      window.requestAnimationFrame(frame);
    });
  }

  function reveal(element) {
    element.classList.add('is-visible');
    if (element.hasAttribute('data-stats')) {
      countUp(element);
    }
  }

  function refreshCounts() {
    var nodes = document.querySelectorAll('[data-count]:not([data-counting])');
    Array.prototype.forEach.call(nodes, setFinal);
  }

  function init() {
    var targets = document.querySelectorAll('[data-reveal], [data-reveal-clip]');
    refreshCounts();
    document.addEventListener('norte:langchange', refreshCounts);

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(targets, reveal);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    Array.prototype.forEach.call(targets, function (target) {
      observer.observe(target);
    });
  }

  Norte.reveal = {
    init: init
  };
})();
