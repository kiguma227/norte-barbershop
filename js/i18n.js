(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var dictionaries = window.NORTE_I18N || {};
  var SUPPORTED = ['es', 'en', 'ru'];
  var FALLBACK = 'es';
  var LOCALES = { es: 'es-ES', en: 'en-GB', ru: 'ru-RU' };
  var STORAGE_KEY = 'norte-lang';
  var FADE_OUT = 90;
  var FADE_IN = 110;
  var root = document.documentElement;
  var current = FALLBACK;
  var formatters = {};
  var fadeTimer = 0;

  function normalize(value) {
    if (!value) {
      return null;
    }
    var code = String(value).trim().toLowerCase().slice(0, 2);
    return SUPPORTED.indexOf(code) > -1 && dictionaries[code] ? code : null;
  }

  function readStorage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      return;
    }
  }

  function fromUrl() {
    try {
      return normalize(new URLSearchParams(window.location.search).get('lang'));
    } catch (error) {
      return null;
    }
  }

  function fromBrowser() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < list.length; i += 1) {
      var code = normalize(list[i]);
      if (code) {
        return code;
      }
    }
    return null;
  }

  function detect() {
    return fromUrl() || normalize(readStorage()) || fromBrowser() || FALLBACK;
  }

  function lookup(dictionary, key) {
    return key.split('.').reduce(function (node, part) {
      return node && Object.prototype.hasOwnProperty.call(node, part) ? node[part] : undefined;
    }, dictionary);
  }

  function interpolate(text, params) {
    if (!params) {
      return text;
    }
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
    });
  }

  function locale() {
    return LOCALES[current];
  }

  function getFormatter(kind, options) {
    var id = current + '|' + kind + '|' + JSON.stringify(options);
    if (!Object.prototype.hasOwnProperty.call(formatters, id)) {
      try {
        if (kind === 'number') {
          formatters[id] = new Intl.NumberFormat(locale(), options);
        } else if (kind === 'plural') {
          formatters[id] = new Intl.PluralRules(locale());
        } else {
          formatters[id] = new Intl.DateTimeFormat(locale(), options);
        }
      } catch (error) {
        formatters[id] = null;
      }
    }
    return formatters[id];
  }

  function pluralCategory(count) {
    var rules = getFormatter('plural', {});
    return rules ? rules.select(count) : (count === 1 ? 'one' : 'other');
  }

  function t(key, params) {
    var value = lookup(dictionaries[current], key);
    if (value === undefined) {
      value = lookup(dictionaries[FALLBACK], key);
    }
    if (value && typeof value === 'object') {
      var count = params && typeof params.count === 'number' ? params.count : 0;
      var category = pluralCategory(count);
      value = value[category] !== undefined ? value[category] : value.other;
    }
    return typeof value === 'string' ? interpolate(value, params) : key;
  }

  function tidy(text) {
    return String(text).replace(/ /g, ' ');
  }

  function pad(value) {
    return (value < 10 ? '0' : '') + value;
  }

  function minutesToDate(minutes) {
    return new Date(Date.UTC(2024, 0, 1, Math.floor(minutes / 60), minutes % 60));
  }

  var TIME_OPTIONS = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' };

  var format = {
    price: function (amount) {
      var formatter = getFormatter('number', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return formatter ? tidy(formatter.format(amount)) : amount + ' €';
    },
    minutes: function (value) {
      var formatter = getFormatter('number', { style: 'unit', unit: 'minute', unitDisplay: 'short' });
      return formatter ? tidy(formatter.format(value)) : value + ' min';
    },
    number: function (value) {
      var formatter = getFormatter('number', {});
      return formatter ? tidy(formatter.format(value)) : String(value);
    },
    date: function (date, options) {
      var formatter = getFormatter('date', Object.assign({ timeZone: 'UTC' }, options));
      return formatter ? tidy(formatter.format(date)) : date.toISOString().slice(0, 10);
    },
    dateRange: function (from, to, options) {
      var formatter = getFormatter('date', Object.assign({ timeZone: 'UTC' }, options));
      if (formatter && typeof formatter.formatRange === 'function') {
        return tidy(formatter.formatRange(from, to));
      }
      return format.date(from, options) + ' – ' + format.date(to, options);
    },
    time: function (minutes) {
      var formatter = getFormatter('date', TIME_OPTIONS);
      return formatter ? tidy(formatter.format(minutesToDate(minutes))) : pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
    },
    timeRange: function (from, to) {
      var formatter = getFormatter('date', TIME_OPTIONS);
      if (formatter && typeof formatter.formatRange === 'function') {
        return tidy(formatter.formatRange(minutesToDate(from), minutesToDate(to)));
      }
      return format.time(from) + '–' + format.time(to);
    },
    weekday: function (dayIndex, style) {
      return format.date(new Date(Date.UTC(2024, 0, 7 + dayIndex)), { weekday: style || 'long' });
    },
    capitalize: function (text) {
      return text ? text.charAt(0).toLocaleUpperCase(locale()) + text.slice(1) : text;
    }
  };

  function applyTexts() {
    var textNodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < textNodes.length; i += 1) {
      var value = t(textNodes[i].getAttribute('data-i18n'));
      if (textNodes[i].textContent !== value) {
        textNodes[i].textContent = value;
      }
    }

    var countNodes = document.querySelectorAll('[data-i18n-count]');
    for (var j = 0; j < countNodes.length; j += 1) {
      var count = Number(countNodes[j].getAttribute('data-count-value')) || 0;
      countNodes[j].textContent = t(countNodes[j].getAttribute('data-i18n-count'), { count: count });
    }

    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    for (var k = 0; k < attrNodes.length; k += 1) {
      var pairs = attrNodes[k].getAttribute('data-i18n-attr').split('|');
      for (var p = 0; p < pairs.length; p += 1) {
        var separator = pairs[p].indexOf(':');
        if (separator > 0) {
          attrNodes[k].setAttribute(pairs[p].slice(0, separator).trim(), t(pairs[p].slice(separator + 1).trim()));
        }
      }
    }
  }

  function applyFormats() {
    var prices = document.querySelectorAll('[data-price]');
    for (var i = 0; i < prices.length; i += 1) {
      prices[i].textContent = format.price(Number(prices[i].getAttribute('data-price')));
    }
    var durations = document.querySelectorAll('[data-duration]');
    for (var j = 0; j < durations.length; j += 1) {
      durations[j].textContent = format.minutes(Number(durations[j].getAttribute('data-duration')));
    }
  }

  function applySwitcher() {
    var links = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < links.length; i += 1) {
      if (links[i].getAttribute('data-lang') === current) {
        links[i].setAttribute('aria-current', 'true');
      } else {
        links[i].removeAttribute('aria-current');
      }
    }
  }

  function updateUrl() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.get('lang') === current) {
        return;
      }
      url.searchParams.set('lang', current);
      window.history.replaceState(window.history.state, '', url.href);
    } catch (error) {
      return;
    }
  }

  function commit(lang) {
    current = lang;
    root.setAttribute('lang', current);
    applyTexts();
    applyFormats();
    applySwitcher();
    document.title = t('meta.title');
    document.dispatchEvent(new CustomEvent('norte:langchange', { detail: { lang: current, locale: locale() } }));
  }

  function fadeSwap(run) {
    window.clearTimeout(fadeTimer);
    root.classList.remove('is-lang-in');
    root.classList.add('is-lang-out');
    fadeTimer = window.setTimeout(function () {
      run();
      root.classList.remove('is-lang-out');
      root.classList.add('is-lang-in');
      fadeTimer = window.setTimeout(function () {
        root.classList.remove('is-lang-in');
      }, FADE_IN + 20);
    }, FADE_OUT);
  }

  function setLang(lang, options) {
    var next = normalize(lang);
    if (!next) {
      return;
    }
    writeStorage(next);
    if (next === current) {
      updateUrl();
      return;
    }
    var run = function () {
      commit(next);
      updateUrl();
    };
    if (options && options.animate === false) {
      run();
      return;
    }
    if (typeof document.startViewTransition === 'function') {
      try {
        document.startViewTransition(run);
        return;
      } catch (error) {
        run();
        return;
      }
    }
    fadeSwap(run);
  }

  function bindSwitcher() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('[data-lang]') : null;
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      setLang(link.getAttribute('data-lang'));
    });
  }

  function init() {
    commit(detect());
    bindSwitcher();
  }

  Norte.i18n = {
    init: init,
    t: t,
    setLang: setLang,
    format: format,
    lang: function () {
      return current;
    },
    locale: locale,
    onChange: function (handler) {
      document.addEventListener('norte:langchange', handler);
    }
  };
})();
