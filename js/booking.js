(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var SERVICES = {
    cut: { minutes: 30, price: 18 },
    cutBeard: { minutes: 45, price: 28 },
    royalShave: { minutes: 30, price: 22 },
    kids: { minutes: 25, price: 14 },
    beard: { minutes: 20, price: 12 }
  };
  var BARBERS = ['marcos', 'alvaro', 'diego'];
  var ORDER = ['name', 'phone', 'service', 'date', 'time'];
  var STEP = 30;
  var LEAD = 30;
  var DEFAULT_MINUTES = 30;
  var WEEKS = 3;
  var AFTERNOON = 840;
  var DAY = 86400000;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var form = null;
  var panel = null;
  var calendar = null;
  var slots = null;
  var summary = null;
  var confirmPanel = null;
  var live = null;
  var fields = {};
  var state = { date: '', time: null, submitted: false, result: null };

  function t(key, params) {
    return Norte.i18n.t(key, params);
  }

  function format() {
    return Norte.i18n.format;
  }

  function iso(date) {
    return date.toISOString().slice(0, 10);
  }

  function parse(value) {
    var parts = value.split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * DAY);
  }

  function scrollBehavior() {
    return reduceMotion.matches ? 'auto' : 'smooth';
  }

  function serviceMinutes() {
    var service = SERVICES[fields.service.value];
    return service ? service.minutes : DEFAULT_MINUTES;
  }

  function slotsFor(value) {
    if (!value) {
      return [];
    }
    var date = parse(value);
    var hours = Norte.schedule.hoursFor(date.getUTCDay());
    if (!hours) {
      return [];
    }
    var now = Norte.schedule.madridNow();
    var isToday = iso(now.date) === value;
    var duration = serviceMinutes();
    var list = [];
    for (var start = hours[0]; start + duration <= hours[1]; start += STEP) {
      if (!isToday || start >= now.minutes + LEAD) {
        list.push(start);
      }
    }
    return list;
  }

  function dayStatus(date, today) {
    var value = iso(date);
    if (value < iso(today)) {
      return 'past';
    }
    if (!Norte.schedule.hoursFor(date.getUTCDay())) {
      return 'closed';
    }
    return slotsFor(value).length ? 'open' : 'full';
  }

  function firstBookable(today) {
    for (var offset = 0; offset < 14; offset += 1) {
      var date = addDays(today, offset);
      if (dayStatus(date, today) === 'open') {
        return date;
      }
    }
    return today;
  }

  function createChoice(name, value, text, label, checked, disabled, extraClass) {
    var option = document.createElement('label');
    option.className = 'choice' + (extraClass ? ' ' + extraClass : '');
    var input = document.createElement('input');
    input.className = 'choice__input';
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = Boolean(checked);
    input.disabled = Boolean(disabled);
    if (label) {
      input.setAttribute('aria-label', label);
    }
    var face = document.createElement('span');
    face.className = 'choice__face';
    face.setAttribute('aria-hidden', 'true');
    var caption = document.createElement('span');
    caption.className = 'choice__label';
    caption.textContent = text;
    face.appendChild(caption);
    option.appendChild(input);
    option.appendChild(face);
    return option;
  }

  function renderCalendar() {
    var fmt = format();
    var today = Norte.schedule.madridNow().date;
    var first = firstBookable(today);
    var start = addDays(first, -((first.getUTCDay() + 6) % 7));
    var end = addDays(start, WEEKS * 7 - 1);
    var fragment = document.createDocumentFragment();

    var head = document.createElement('div');
    head.className = 'calendar__head';
    var month = document.createElement('p');
    month.className = 'calendar__month';
    var monthOptions = start.getUTCFullYear() === end.getUTCFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' };
    month.textContent = fmt.capitalize(fmt.dateRange(start, end, monthOptions));
    head.appendChild(month);
    fragment.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'calendar__grid';
    for (var column = 0; column < 7; column += 1) {
      var weekday = (column + 1) % 7;
      var name = document.createElement('span');
      name.className = 'calendar__weekday' + (Norte.schedule.hoursFor(weekday) ? '' : ' calendar__weekday--closed');
      name.setAttribute('aria-hidden', 'true');
      name.textContent = fmt.weekday(weekday, 'short').replace('.', '');
      grid.appendChild(name);
    }

    var selectionKept = false;
    for (var i = 0; i < WEEKS * 7; i += 1) {
      var date = addDays(start, i);
      var value = iso(date);
      var status = dayStatus(date, today);
      var isToday = value === iso(today);
      var notes = [];
      if (isToday) {
        notes.push(t('booking.date.today'));
      }
      if (status === 'closed') {
        notes.push(t('booking.date.closed'));
      } else if (status === 'full') {
        notes.push(t('booking.date.full'));
      }
      var label = fmt.date(date, { weekday: 'long', day: 'numeric', month: 'long' }) + (notes.length ? ', ' + notes.join(', ') : '');
      var checked = value === state.date && status === 'open';
      if (checked) {
        selectionKept = true;
      }
      var classes = 'day' + (status === 'closed' ? ' day--closed' : '') + (isToday ? ' day--today' : '');
      grid.appendChild(createChoice('date', value, String(date.getUTCDate()), label, checked, status !== 'open', classes));
    }
    fragment.appendChild(grid);

    calendar.textContent = '';
    calendar.appendChild(fragment);
    if (!selectionKept) {
      state.date = '';
    }
  }

  function note(text) {
    var paragraph = document.createElement('p');
    paragraph.className = 'slots__empty';
    paragraph.textContent = text;
    slots.appendChild(paragraph);
  }

  function renderSlots() {
    var fmt = format();
    slots.textContent = '';
    if (!state.date) {
      state.time = null;
      note(t('booking.time.empty'));
      return;
    }
    var list = slotsFor(state.date);
    if (state.time !== null && list.indexOf(state.time) === -1) {
      state.time = null;
    }
    if (!list.length) {
      note(t('booking.time.none'));
      return;
    }
    [
      { key: 'morning', items: list.filter(function (minutes) { return minutes < AFTERNOON; }) },
      { key: 'afternoon', items: list.filter(function (minutes) { return minutes >= AFTERNOON; }) }
    ].forEach(function (group) {
      if (!group.items.length) {
        return;
      }
      var wrapper = document.createElement('div');
      wrapper.className = 'slots__group';
      wrapper.setAttribute('role', 'group');
      wrapper.setAttribute('aria-labelledby', 'booking-slots-' + group.key);
      var title = document.createElement('p');
      title.className = 'slots__label';
      title.id = 'booking-slots-' + group.key;
      title.textContent = t('booking.time.' + group.key);
      var grid = document.createElement('div');
      grid.className = 'slots__grid';
      group.items.forEach(function (minutes) {
        grid.appendChild(createChoice('time', String(minutes), fmt.time(minutes), '', minutes === state.time, false, 'slot'));
      });
      wrapper.appendChild(title);
      wrapper.appendChild(grid);
      slots.appendChild(wrapper);
    });
  }

  function renderSummary() {
    var service = SERVICES[fields.service.value];
    summary.textContent = service ? t('booking.service.summary', {
      duration: format().minutes(service.minutes),
      price: format().price(service.price)
    }) : '';
  }

  function container(name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  function check(name) {
    var value;
    if (name === 'name') {
      value = fields.name.value.trim();
      if (!value) {
        return 'nameRequired';
      }
      return (value.match(/\p{L}/gu) || []).length < 2 ? 'nameShort' : '';
    }
    if (name === 'phone') {
      value = fields.phone.value.trim();
      if (!value) {
        return 'phoneRequired';
      }
      var digits = value.replace(/\D/g, '').length;
      return !/^\+?[\d\s().-]+$/.test(value) || digits < 9 || digits > 15 ? 'phoneInvalid' : '';
    }
    if (name === 'service') {
      return SERVICES[fields.service.value] ? '' : 'service';
    }
    if (name === 'date') {
      return state.date ? '' : 'date';
    }
    if (name === 'time') {
      return state.time !== null && slotsFor(state.date).indexOf(state.time) > -1 ? '' : 'time';
    }
    return '';
  }

  function showError(name, key) {
    var field = container(name);
    var holder = field.querySelector('[data-error]');
    var previous = holder.getAttribute('data-key') || '';
    if (key) {
      holder.textContent = t('booking.errors.' + key);
      holder.setAttribute('data-key', key);
      field.classList.add('is-invalid');
      if (previous !== key) {
        holder.classList.remove('is-shown');
        void holder.offsetWidth;
        holder.classList.add('is-shown');
      }
    } else {
      holder.textContent = '';
      holder.removeAttribute('data-key');
      holder.classList.remove('is-shown');
      field.classList.remove('is-invalid');
    }
    if (fields[name]) {
      if (key) {
        fields[name].setAttribute('aria-invalid', 'true');
      } else {
        fields[name].removeAttribute('aria-invalid');
      }
    }
    return !key;
  }

  function validate(name) {
    return showError(name, check(name));
  }

  function isInvalid(name) {
    return container(name).classList.contains('is-invalid');
  }

  function revalidate(name) {
    if (state.submitted || isInvalid(name)) {
      validate(name);
    }
  }

  function announce(text) {
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 60);
  }

  function focusField(name) {
    var target = fields[name];
    if (!target) {
      var group = container(name);
      target = group.querySelector('input:checked') || group.querySelector('input:not(:disabled)');
      if (!target) {
        group.setAttribute('tabindex', '-1');
        target = group;
      }
    }
    target.focus({ preventScroll: true });
    var rect = target.getBoundingClientRect();
    if (rect.top < 96 || rect.bottom > window.innerHeight - 24) {
      target.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    }
  }

  function renderConfirmation() {
    var result = state.result;
    if (!result) {
      return;
    }
    var fmt = format();
    var service = SERVICES[result.service];
    confirmPanel.querySelector('[data-confirm-text]').textContent = t('booking.success.text', { name: result.name });
    confirmPanel.querySelector('[data-confirm-date]').textContent = fmt.capitalize(fmt.date(parse(result.date), { weekday: 'long', day: 'numeric', month: 'long' }));
    confirmPanel.querySelector('[data-confirm-time]').textContent = fmt.time(result.time);
    confirmPanel.querySelector('[data-confirm-service]').textContent = t('services.items.' + result.service + '.name') + ', ' + t('booking.service.summary', {
      duration: fmt.minutes(service.minutes),
      price: fmt.price(service.price)
    });
    confirmPanel.querySelector('[data-confirm-barber]').textContent = result.barber === 'any' ? t('booking.success.anyBarber') : t('team.' + result.barber + '.name');
  }

  function complete() {
    state.result = {
      name: fields.name.value.trim(),
      date: state.date,
      time: state.time,
      service: fields.service.value,
      barber: BARBERS.indexOf(fields.barber.value) > -1 ? fields.barber.value : 'any'
    };
    renderConfirmation();
    form.hidden = true;
    confirmPanel.hidden = false;
    confirmPanel.classList.remove('is-entering');
    void confirmPanel.offsetWidth;
    confirmPanel.classList.add('is-entering');
    confirmPanel.focus({ preventScroll: true });
    var rect = confirmPanel.getBoundingClientRect();
    if (rect.top < 96 || rect.top > window.innerHeight * 0.5) {
      panel.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    }
    announce(t('booking.success.live', {
      date: format().date(parse(state.result.date), { weekday: 'long', day: 'numeric', month: 'long' }),
      time: format().time(state.result.time)
    }));
  }

  function onSubmit(event) {
    event.preventDefault();
    state.submitted = true;
    if (state.date) {
      renderSlots();
    }
    var firstInvalid = '';
    ORDER.forEach(function (name) {
      if (!validate(name) && !firstInvalid) {
        firstInvalid = name;
      }
    });
    if (firstInvalid) {
      announce(t('booking.errors.summary'));
      focusField(firstInvalid);
      return;
    }
    complete();
  }

  function reset(focusName) {
    form.reset();
    state = { date: '', time: null, submitted: false, result: null };
    ORDER.forEach(function (name) {
      showError(name, '');
    });
    renderSummary();
    renderCalendar();
    renderSlots();
    confirmPanel.hidden = true;
    confirmPanel.classList.remove('is-entering');
    form.hidden = false;
    live.textContent = '';
    if (focusName) {
      fields.name.focus({ preventScroll: true });
    }
  }

  function onServiceChange() {
    renderSummary();
    renderCalendar();
    renderSlots();
    revalidate('service');
    if (state.time === null && (state.submitted || isInvalid('time'))) {
      validate('time');
    }
  }

  function preselect(event) {
    var link = event.target.closest ? event.target.closest('[data-book-service], [data-book-barber]') : null;
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (!confirmPanel.hidden) {
      reset(false);
    }
    var service = link.getAttribute('data-book-service');
    var barber = link.getAttribute('data-book-barber');
    var target = null;
    if (service && SERVICES[service]) {
      fields.service.value = service;
      onServiceChange();
      target = fields.service;
    }
    if (barber && BARBERS.indexOf(barber) > -1) {
      fields.barber.value = barber;
      target = fields.barber;
    }
    panel.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    if (target) {
      target.focus({ preventScroll: true });
    }
  }

  function onLanguage() {
    renderSummary();
    renderCalendar();
    renderSlots();
    renderConfirmation();
    ORDER.forEach(function (name) {
      var holder = container(name).querySelector('[data-error]');
      var key = holder.getAttribute('data-key');
      if (key) {
        holder.textContent = t('booking.errors.' + key);
      }
    });
  }

  function bind() {
    ['name', 'phone'].forEach(function (name) {
      fields[name].addEventListener('input', function () {
        if (isInvalid(name)) {
          validate(name);
        }
      });
      fields[name].addEventListener('blur', function () {
        if (state.submitted || fields[name].value.trim()) {
          validate(name);
        }
      });
    });

    fields.service.addEventListener('change', onServiceChange);

    calendar.addEventListener('change', function (event) {
      if (event.target.name !== 'date') {
        return;
      }
      state.date = event.target.value;
      renderSlots();
      revalidate('date');
      if (state.submitted && state.time === null) {
        validate('time');
      }
    });

    slots.addEventListener('change', function (event) {
      if (event.target.name !== 'time') {
        return;
      }
      state.time = Number(event.target.value);
      revalidate('time');
    });

    form.addEventListener('submit', onSubmit);
    confirmPanel.querySelector('[data-confirm-reset]').addEventListener('click', function () {
      reset(true);
      form.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    });
    document.addEventListener('click', preselect);
    document.addEventListener('norte:langchange', onLanguage);
  }

  function init() {
    form = document.querySelector('[data-booking-form]');
    confirmPanel = document.querySelector('[data-confirm]');
    if (!form || !confirmPanel || !Norte.schedule || !Norte.i18n) {
      return;
    }
    panel = form.parentElement;
    calendar = form.querySelector('[data-calendar]');
    slots = form.querySelector('[data-slots]');
    summary = form.querySelector('[data-service-summary]');
    live = document.querySelector('[data-booking-live]');
    fields = {
      name: form.elements.namedItem('name'),
      phone: form.elements.namedItem('phone'),
      service: form.elements.namedItem('service'),
      barber: form.elements.namedItem('barber')
    };
    renderSummary();
    renderCalendar();
    renderSlots();
    bind();
  }

  Norte.booking = {
    init: init
  };
})();
