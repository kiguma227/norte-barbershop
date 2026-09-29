(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var TIME_ZONE = 'Europe/Madrid';
  var HOURS = {
    0: null,
    1: [600, 1200],
    2: [600, 1200],
    3: [600, 1200],
    4: [600, 1200],
    5: [600, 1200],
    6: [600, 960]
  };
  var partsFormatter = null;

  try {
    partsFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
  } catch (error) {
    partsFormatter = null;
  }

  function madridNow() {
    var now = new Date();
    var parts = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    };
    if (partsFormatter) {
      partsFormatter.formatToParts(now).forEach(function (part) {
        if (part.type !== 'literal') {
          parts[part.type] = Number(part.value);
        }
      });
    }
    var date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    return {
      date: date,
      year: parts.year,
      weekday: date.getUTCDay(),
      minutes: (parts.hour % 24) * 60 + parts.minute
    };
  }

  function hoursFor(weekday) {
    return HOURS[weekday] || null;
  }

  function status() {
    var now = madridNow();
    var today = hoursFor(now.weekday);
    if (today && now.minutes < today[0]) {
      return { open: false, key: 'opensToday', time: today[0] };
    }
    if (today && now.minutes < today[1]) {
      return { open: true, key: 'openUntil', time: today[1] };
    }
    for (var offset = 1; offset <= 7; offset += 1) {
      var weekday = (now.weekday + offset) % 7;
      var hours = hoursFor(weekday);
      if (hours) {
        return { open: false, key: offset === 1 ? 'opensTomorrow' : 'opensMonday', time: hours[0] };
      }
    }
    return { open: false, key: 'opensTomorrow', time: 600 };
  }

  function renderStatus() {
    var holder = document.querySelector('[data-status]');
    var text = document.querySelector('[data-status-text]');
    if (!holder || !text || !Norte.i18n) {
      return;
    }
    var current = status();
    text.textContent = Norte.i18n.t('hero.status.' + current.key, { time: Norte.i18n.format.time(current.time) });
    holder.classList.toggle('is-closed', !current.open);
  }

  function dayLabel(range) {
    var format = Norte.i18n.format;
    var bounds = range.split('-').map(Number);
    var first = format.capitalize(format.weekday(bounds[0]));
    if (bounds.length < 2) {
      return first;
    }
    return first + ' – ' + format.weekday(bounds[1]);
  }

  function includesDay(range, weekday) {
    var bounds = range.split('-').map(Number);
    var from = bounds[0];
    var to = bounds.length > 1 ? bounds[1] : bounds[0];
    return weekday >= from && weekday <= to;
  }

  function renderHours() {
    if (!Norte.i18n) {
      return;
    }
    var today = madridNow().weekday;
    var rows = document.querySelectorAll('[data-hours] [data-days]');
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var range = row.getAttribute('data-days');
      var day = row.querySelector('.hours__day');
      var time = row.querySelector('.hours__time');
      var isToday = includesDay(range, today);
      day.textContent = dayLabel(range);
      if (isToday) {
        var marker = document.createElement('span');
        marker.className = 'hours__today';
        marker.textContent = Norte.i18n.t('contact.today');
        day.appendChild(marker);
      }
      row.classList.toggle('is-today', isToday);
      if (row.hasAttribute('data-open') && time) {
        time.textContent = Norte.i18n.format.timeRange(Number(row.getAttribute('data-open')), Number(row.getAttribute('data-close')));
      }
    }
  }

  function render() {
    renderStatus();
    renderHours();
  }

  function init() {
    render();
    document.addEventListener('norte:langchange', render);
    window.setInterval(renderStatus, 60000);
  }

  Norte.schedule = {
    init: init,
    madridNow: madridNow,
    hoursFor: hoursFor
  };
})();
