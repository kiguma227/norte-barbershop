(function () {
  'use strict';

  var Norte = window.Norte = window.Norte || {};
  var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var DURATION = 400;
  var FAST = 200;
  var SHIFT = 32;
  var SWIPE_X = 60;
  var SWIPE_Y = 90;
  var REST_TRANSFORM = 'translate(0px, 0px) scale(1)';
  var REST_CLIP = 'inset(0px 0px 0px 0px round 2px)';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var dialog = null;
  var stage = null;
  var image = null;
  var backdrop = null;
  var ui = null;
  var caption = null;
  var counter = null;
  var closeButton = null;
  var thumbs = [];
  var index = -1;
  var box = null;
  var isOpen = false;
  var busy = false;
  var closing = false;
  var drag = null;
  var suppressClick = false;

  function t(key, params) {
    return Norte.i18n ? Norte.i18n.t(key, params) : key;
  }

  function stop(element) {
    if (element && typeof element.getAnimations === 'function') {
      element.getAnimations().forEach(function (animation) {
        animation.cancel();
      });
    }
  }

  function stopAll() {
    stop(image);
    stop(backdrop);
    stop(ui);
  }

  function animate(element, keyframes, duration, onDone, delay) {
    if (typeof element.animate !== 'function') {
      if (onDone) {
        onDone();
      }
      return null;
    }
    var animation = element.animate(keyframes, {
      duration: duration,
      delay: delay || 0,
      easing: EASE,
      fill: 'both'
    });
    animation.onfinish = function () {
      if (onDone) {
        onDone();
      }
    };
    return animation;
  }

  function area() {
    var width = dialog.clientWidth || window.innerWidth;
    var height = dialog.clientHeight || window.innerHeight;
    var wide = width >= 768;
    var sideX = wide ? 96 : 16;
    var top = 72;
    var bottom = wide ? 80 : 144;
    return {
      x: sideX,
      y: top,
      width: Math.max(120, width - sideX * 2),
      height: Math.max(120, height - top - bottom)
    };
  }

  function fit(thumb) {
    var naturalWidth = Number(thumb.getAttribute('data-width')) || 1600;
    var naturalHeight = Number(thumb.getAttribute('data-height')) || 1067;
    var frame = area();
    var scale = Math.min(frame.width / naturalWidth, frame.height / naturalHeight, 1);
    var width = Math.round(naturalWidth * scale);
    var height = Math.round(naturalHeight * scale);
    return {
      left: Math.round(frame.x + (frame.width - width) / 2),
      top: Math.round(frame.y + (frame.height - height) / 2),
      width: width,
      height: height
    };
  }

  function place(rect) {
    box = rect;
    image.style.left = rect.left + 'px';
    image.style.top = rect.top + 'px';
    image.style.width = rect.width + 'px';
    image.style.height = rect.height + 'px';
  }

  function share(value, fallback) {
    if (!value || value.indexOf('%') === -1) {
      return fallback;
    }
    var number = parseFloat(value);
    return isNaN(number) ? fallback : number / 100;
  }

  function geometry(thumb) {
    var rect = thumb.getBoundingClientRect();
    var picture = thumb.querySelector('img');
    var position = picture ? window.getComputedStyle(picture).objectPosition.split(' ') : [];
    var scale = Math.max(rect.width / box.width, rect.height / box.height);
    var spareX = box.width - rect.width / scale;
    var spareY = box.height - rect.height / scale;
    var left = spareX * share(position[0], 0.5);
    var top = spareY * share(position[1] || position[0], 0.5);
    var x = rect.left - box.left - left * scale;
    var y = rect.top - box.top - top * scale;
    return {
      transform: 'translate(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px) scale(' + scale.toFixed(5) + ')',
      clip: 'inset(' + top.toFixed(2) + 'px ' + (spareX - left).toFixed(2) + 'px ' + (spareY - top).toFixed(2) + 'px ' + left.toFixed(2) + 'px round ' + (2 / scale).toFixed(2) + 'px)'
    };
  }

  function snapshot() {
    var imageStyle = window.getComputedStyle(image);
    return {
      transform: imageStyle.transform && imageStyle.transform !== 'none' ? imageStyle.transform : REST_TRANSFORM,
      clip: imageStyle.clipPath && imageStyle.clipPath !== 'none' ? imageStyle.clipPath : REST_CLIP,
      opacity: imageStyle.opacity,
      backdrop: window.getComputedStyle(backdrop).opacity,
      ui: window.getComputedStyle(ui).opacity
    };
  }

  function describe(i) {
    var picture = thumbs[i].querySelector('img');
    var text = picture ? picture.alt : '';
    image.alt = text;
    caption.textContent = text;
    counter.textContent = t('gallery.counter', { current: i + 1, total: thumbs.length });
  }

  function fill(i) {
    var picture = thumbs[i].querySelector('img');
    image.removeAttribute('data-full');
    image.src = picture ? picture.currentSrc || picture.src : thumbs[i].getAttribute('data-full');
    describe(i);
  }

  function loadFull(i) {
    var source = thumbs[i].getAttribute('data-full');
    if (!source || image.getAttribute('data-full') === source) {
      return;
    }
    var loader = new Image();
    var apply = function () {
      if (isOpen && index === i) {
        image.src = source;
        image.setAttribute('data-full', source);
      }
    };
    loader.decoding = 'async';
    loader.onload = function () {
      if (typeof loader.decode === 'function') {
        loader.decode().then(apply, apply);
      } else {
        apply();
      }
    };
    loader.src = source;
  }

  function ensureVisible(thumb) {
    var rect = thumb.getBoundingClientRect();
    var viewport = window.innerHeight;
    if (rect.top >= 0 && rect.bottom <= viewport) {
      return;
    }
    var root = document.documentElement;
    var previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, (window.scrollY || window.pageYOffset) + rect.top - (viewport - rect.height) / 2));
    root.style.scrollBehavior = previous;
  }

  function cleanup(focusThumb) {
    var thumb = thumbs[index];
    stopAll();
    image.style.transform = '';
    backdrop.style.opacity = '';
    if (thumb) {
      thumb.classList.remove('is-source');
    }
    if (isOpen && Norte.scrollLock) {
      Norte.scrollLock.unlock();
    }
    isOpen = false;
    busy = false;
    closing = false;
    drag = null;
    if (focusThumb && thumb) {
      thumb.focus({ preventScroll: true });
    }
  }

  function open(i) {
    if (isOpen || !thumbs[i]) {
      return;
    }
    var thumb = thumbs[i];
    isOpen = true;
    busy = true;
    index = i;
    fill(i);
    dialog.showModal();
    if (Norte.scrollLock) {
      Norte.scrollLock.lock();
    }
    place(fit(thumb));
    thumb.classList.add('is-source');
    closeButton.focus({ preventScroll: true });
    loadFull(i);

    var done = function () {
      stop(image);
      busy = false;
    };
    var release = function (element) {
      return function () {
        stop(element);
      };
    };

    if (reduceMotion.matches) {
      animate(image, [{ opacity: 0 }, { opacity: 1 }], DURATION, done);
      animate(backdrop, [{ opacity: 0 }, { opacity: 1 }], DURATION, release(backdrop));
      animate(ui, [{ opacity: 0 }, { opacity: 1 }], DURATION, release(ui));
      return;
    }

    var from = geometry(thumb);
    animate(image, [
      { transform: from.transform, clipPath: from.clip },
      { transform: REST_TRANSFORM, clipPath: REST_CLIP }
    ], DURATION, done);
    animate(backdrop, [{ opacity: 0 }, { opacity: 1 }], DURATION, release(backdrop));
    animate(ui, [{ opacity: 0 }, { opacity: 1 }], DURATION, release(ui), DURATION * 0.4);
  }

  function close() {
    if (!isOpen || closing) {
      return;
    }
    closing = true;
    busy = true;
    var thumb = thumbs[index];
    var start = snapshot();
    stopAll();
    image.style.transform = '';
    backdrop.style.opacity = '';
    ensureVisible(thumb);

    var finish = function () {
      dialog.close();
      cleanup(true);
    };

    if (reduceMotion.matches) {
      animate(image, [{ opacity: start.opacity }, { opacity: 0 }], FAST, finish);
      animate(backdrop, [{ opacity: start.backdrop }, { opacity: 0 }], FAST);
      animate(ui, [{ opacity: start.ui }, { opacity: 0 }], FAST);
      return;
    }

    var to = geometry(thumb);
    animate(image, [
      { transform: start.transform, clipPath: start.clip, opacity: start.opacity },
      { transform: to.transform, clipPath: to.clip, opacity: 1 }
    ], DURATION, finish);
    animate(backdrop, [{ opacity: start.backdrop }, { opacity: 0 }], DURATION);
    animate(ui, [{ opacity: start.ui }, { opacity: 0 }], FAST);
  }

  function go(step, fromX) {
    if (!isOpen || busy || thumbs.length < 2) {
      return;
    }
    busy = true;
    var next = (index + step + thumbs.length) % thumbs.length;
    var direction = step > 0 ? 1 : -1;
    var startX = fromX || 0;
    var shift = reduceMotion.matches ? 0 : SHIFT;
    stop(image);
    image.style.transform = '';

    animate(image, [
      { opacity: 1, transform: 'translate(' + startX + 'px, 0px)' },
      { opacity: 0, transform: 'translate(' + (startX - direction * shift) + 'px, 0px)' }
    ], FAST, function () {
      stop(image);
      thumbs[index].classList.remove('is-source');
      index = next;
      thumbs[index].classList.add('is-source');
      fill(index);
      place(fit(thumbs[index]));
      loadFull(index);
      animate(image, [
        { opacity: 0, transform: 'translate(' + direction * shift + 'px, 0px)' },
        { opacity: 1, transform: 'translate(0px, 0px)' }
      ], DURATION, function () {
        stop(image);
        busy = false;
      });
    });
  }

  function onPointerDown(event) {
    if (!isOpen || busy || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, axis: '' };
    try {
      stage.setPointerCapture(event.pointerId);
    } catch (error) {
      return;
    }
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    drag.dx = event.clientX - drag.x;
    drag.dy = event.clientY - drag.y;
    if (!drag.axis && Math.abs(drag.dx) + Math.abs(drag.dy) > 10) {
      drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? 'x' : 'y';
    }
    if (drag.axis === 'x') {
      image.style.transform = 'translate(' + drag.dx + 'px, 0px)';
    } else if (drag.axis === 'y') {
      var pull = Math.max(0, drag.dy);
      var progress = Math.min(pull / 400, 1);
      var scale = 1 - progress * 0.15;
      var offsetX = box.width * (1 - scale) / 2;
      var offsetY = pull + box.height * (1 - scale) / 2;
      image.style.transform = 'translate(' + offsetX.toFixed(1) + 'px, ' + offsetY.toFixed(1) + 'px) scale(' + scale.toFixed(4) + ')';
      backdrop.style.opacity = String(1 - progress * 0.7);
    }
  }

  function settle() {
    var from = image.style.transform;
    var fade = backdrop.style.opacity;
    image.style.transform = '';
    backdrop.style.opacity = '';
    if (from) {
      animate(image, [{ transform: from }, { transform: REST_TRANSFORM }], FAST, function () {
        stop(image);
      });
    }
    if (fade) {
      animate(backdrop, [{ opacity: fade }, { opacity: 1 }], FAST, function () {
        stop(backdrop);
      });
    }
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    var gesture = drag;
    drag = null;
    if (!gesture.axis) {
      return;
    }
    suppressClick = true;
    window.setTimeout(function () {
      suppressClick = false;
    }, 0);
    if (event.type === 'pointerup' && gesture.axis === 'x' && Math.abs(gesture.dx) > SWIPE_X && thumbs.length > 1) {
      go(gesture.dx < 0 ? 1 : -1, gesture.dx);
      return;
    }
    if (event.type === 'pointerup' && gesture.axis === 'y' && gesture.dy > SWIPE_Y) {
      close();
      return;
    }
    settle();
  }

  function onKeydown(event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
  }

  function onResize() {
    if (isOpen && !busy && thumbs[index]) {
      place(fit(thumbs[index]));
    }
  }

  function fallback() {
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var source = thumb.getAttribute('data-full');
        if (source) {
          window.location.href = source;
        }
      });
    });
  }

  function init() {
    dialog = document.querySelector('[data-lightbox]');
    thumbs = Array.prototype.slice.call(document.querySelectorAll('[data-gallery] .gallery__thumb'));
    if (!dialog || !thumbs.length) {
      return;
    }
    if (typeof dialog.showModal !== 'function') {
      fallback();
      return;
    }
    stage = dialog.querySelector('[data-lightbox-stage]');
    image = dialog.querySelector('[data-lightbox-img]');
    backdrop = dialog.querySelector('[data-lightbox-backdrop]');
    ui = dialog.querySelector('[data-lightbox-ui]');
    caption = dialog.querySelector('[data-lightbox-caption]');
    counter = dialog.querySelector('[data-lightbox-counter]');
    closeButton = dialog.querySelector('[data-lightbox-close]');

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () {
        open(i);
      });
    });
    closeButton.addEventListener('click', close);
    dialog.querySelector('[data-lightbox-prev]').addEventListener('click', function () {
      go(-1);
    });
    dialog.querySelector('[data-lightbox-next]').addEventListener('click', function () {
      go(1);
    });
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      close();
    });
    dialog.addEventListener('close', function () {
      if (isOpen) {
        cleanup(true);
      }
    });
    dialog.addEventListener('keydown', onKeydown);
    stage.addEventListener('click', function () {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      close();
    });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('norte:langchange', function () {
      if (isOpen) {
        describe(index);
      }
    });
  }

  Norte.gallery = {
    init: init
  };
})();
