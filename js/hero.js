(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var PARALLAX = 0.14;
  var FONT_TIMEOUT = 1200;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hero = null;
  var title = null;
  var played = false;
  var lastWidth = 0;
  var resizeTimer = 0;

  function sourceText() {
    return Norte.i18n ? Norte.i18n.t('hero.title') : title.textContent;
  }

  function whenFontsReady(callback) {
    var done = false;
    var run = function () {
      if (!done) {
        done = true;
        callback();
      }
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run, run);
      window.setTimeout(run, FONT_TIMEOUT);
    } else {
      run();
    }
  }

  function measureLines(text) {
    var words = [];
    var fragment = document.createDocumentFragment();
    var segments = text.split('\n');
    segments.forEach(function (segment, segmentIndex) {
      var parts = segment.split(/ +/).filter(Boolean);
      parts.forEach(function (part, partIndex) {
        var word = document.createElement('span');
        word.textContent = part;
        fragment.appendChild(word);
        words.push(word);
        if (partIndex < parts.length - 1) {
          fragment.appendChild(document.createTextNode(' '));
        }
      });
      if (segmentIndex < segments.length - 1) {
        fragment.appendChild(document.createElement('br'));
      }
    });
    title.textContent = '';
    title.appendChild(fragment);

    var lines = [];
    var top = null;
    words.forEach(function (word) {
      var offset = word.offsetTop;
      if (top === null || Math.abs(offset - top) > 4) {
        lines.push([]);
        top = offset;
      }
      lines[lines.length - 1].push(word.textContent);
    });
    return lines;
  }

  function split() {
    var text = sourceText();
    try {
      var lines = measureLines(text);
      if (!lines.length) {
        throw new Error('empty title');
      }
      var fragment = document.createDocumentFragment();
      lines.forEach(function (words, index) {
        var line = document.createElement('span');
        line.className = 'hero__line';
        line.setAttribute('aria-hidden', 'true');
        var inner = document.createElement('span');
        inner.className = 'hero__line-inner';
        inner.style.setProperty('--line', index);
        inner.textContent = words.join(' ');
        line.appendChild(inner);
        fragment.appendChild(line);
      });
      title.textContent = '';
      title.appendChild(fragment);
      title.setAttribute('aria-label', text.replace(/\s*\n\s*/g, ' '));
      lastWidth = title.clientWidth;
      return true;
    } catch (error) {
      title.textContent = text;
      title.removeAttribute('aria-label');
      return false;
    }
  }

  function reveal() {
    hero.classList.add('is-intro');
    void title.offsetWidth;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        hero.classList.add('is-played');
      });
    });
  }

  function play() {
    if (played) {
      return;
    }
    played = true;
    split();
    reveal();
  }

  function resplit() {
    if (!played) {
      return;
    }
    split();
  }

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (title.clientWidth !== lastWidth) {
        resplit();
      }
    }, 150);
  }

  function onLanguage() {
    resplit();
    whenFontsReady(resplit);
  }

  function setupParallax() {
    var media = hero.querySelector('[data-parallax]');
    var native = window.CSS && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: scroll()');
    if (!media || native) {
      return;
    }
    var ticking = false;
    var update = function () {
      ticking = false;
      if (reduceMotion.matches) {
        media.style.transform = '';
        return;
      }
      var y = window.scrollY || window.pageYOffset || 0;
      if (y > hero.offsetHeight) {
        return;
      }
      media.style.transform = 'translate3d(0, ' + (y * PARALLAX).toFixed(1) + 'px, 0)';
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  function init() {
    hero = document.querySelector('[data-hero]');
    title = document.querySelector('[data-hero-title]');
    if (!hero || !title) {
      return;
    }
    try {
      whenFontsReady(play);
    } catch (error) {
      hero.classList.add('is-intro', 'is-played');
    }
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('norte:langchange', onLanguage);
    setupParallax();
  }

  Norte.hero = {
    init: init
  };
})();
