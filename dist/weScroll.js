(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.WeScroll = factory());
}(this, (function () { 'use strict';

var assign = void 0;
if (typeof Object.assign !== 'function') {
  assign = function assign(target) {
    if (target === undefined || target === null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var output = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source !== undefined && source !== null) {
        for (var nextKey in source) {
          if (source.hasOwnProperty(nextKey)) {
            output[nextKey] = source[nextKey];
          }
        }
      }
    }
    return output;
  };
} else {
  assign = Object.assign;
}

var assign$1 = assign;

function addEvent(el, type, fn, capture) {
  el.addEventListener(type, fn, !!capture);
}

function removeEvent(el, type, fn, capture) {
  el.removeEventListener(type, fn, !!capture);
}

function tap(e, eventName) {
  var ev = document.createEvent('Event');

  ev.initEvent(eventName, true, true);
  e = e.changedTouches[0] || e;
  ev.pageX = e.pageX;
  ev.pageY = e.pageY;

  e.target.dispatchEvent(ev);
}

var hasTouch = 'ontouchstart' in window;

var hasPointer = !!(window.PointerEvent || window.MSPointerEvent);

var ease = {
  quadratic: function quadratic(k) {
    return k * (2 - k);
  },
  circular: function circular(k) {
    return Math.sqrt(1 - --k * k);
  },
  back: function back(k) {
    var b = 4;
    k -= 1;
    return k * k * ((b + 1) * k + b) + 1;
  },
  bounce: function bounce(k) {
    // eslint-disable-next-line
    if ((k /= 1) < 1 / 2.75) {
      return 7.5625 * k * k;
    } else if (k < 2 / 2.75) {
      return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
    } else if (k < 2.5 / 2.75) {
      return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
    } else {
      return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
    }
  },
  elastic: function elastic(k) {
    var f = 0.22,
        e = 0.4;
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    return e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1;
  }
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();



























var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var Observer = function () {
  function Observer() {
    classCallCheck(this, Observer);

    this._events = [];
  }

  createClass(Observer, [{
    key: "on",
    value: function on(type, fn) {
      var events = this._events[type];
      if (!events) {
        events = [];
      }
      events.push(fn);
      this._events[type] = events;
    }
  }, {
    key: "off",
    value: function off(type, fn) {
      var events = this._events[type];
      if (!events) return;

      var index = events.indexOf(fn);
      if (index > -1) {
        events.splice(index, 1);
      }
    }
  }, {
    key: "trigger",
    value: function trigger(type) {
      var events = this._events[type];
      if (!events || !events.length) return;
      for (var i = 0; i < events.length; i++) {
        events[i].apply(this, [].slice.call(arguments, 1));
      }
    }
  }]);
  return Observer;
}();

var offset = (function (el) {
  var left = -el.offsetLeft,
      top = -el.offsetTop;

  // eslint-disable-next-line
  while (el = el.offsetParent) {
    left -= el.offsetLeft;
    top -= el.offsetTop;
  }
  return {
    left: left,
    top: top
  };
});

var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
  window.setTimeout(callback, 1000 / 60);
};

var defaultOptions = {
  zoomMin: 1,
  zoomMax: 4,
  startZoom: 1,

  disablePointer: !hasPointer,
  disableTouch: hasPointer || !hasTouch,
  disableMouse: hasPointer || hasTouch,
  startX: 0,
  startY: 0,
  directionLockThreshold: 5,

  margin: 0,

  bounce: true,
  bounceTime: 480,
  duration: 300,

  freeScroll: false,

  preventDefault: true,

  bindToWrapper: true
};
/**
 * weScroll: Canvas scroll library for Muti Touch, Zooming, based on IScroll-zom 5
 *
 */

var WeScroll = function () {
  /**
   * create a WeScroll instance
   *
   * @param  {String|HTMLElement} el     - wrapper of Canvas
   * @param  {Obect} options             - options for settings
   *
   */
  function WeScroll(el, options) {
    classCallCheck(this, WeScroll);

    this.wrapper = typeof el === 'string' ? document.querySelector(el) : el;
    this.options = assign$1({}, defaultOptions, options);
    this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;
    var margin = this.options.margin;
    this.options.marginTop = this.options.marginTop || margin;
    this.options.marginBottom = this.options.marginBottom || margin;
    this.options.marginLeft = this.options.marginLeft || margin;
    this.options.marginRight = this.options.marginRight || margin;

    if (this.options.tap === true) {
      this.options.tap = 'tap';
    }

    this.x = 0;
    this.y = 0;
    this.directionX = 0;
    this.directionY = 0;
    this.scale = Math.min(Math.max(this.options.startZoom, this.options.zoomMin), this.options.zoomMax);

    this._init();
    this.refresh();
    this._scrollTo(this.options.startX, this.options.startY);
    this.enable();
    this._ticking = false;
  }

  createClass(WeScroll, [{
    key: '_init',
    value: function _init() {
      this.observer = new Observer();
      this._initEvents();
      this._initEaseFn();
    }
  }, {
    key: '_initEaseFn',
    value: function _initEaseFn() {
      var userEase = this.options.ease;
      var defaultFn = ease.circular;
      if (!userEase) {
        this.easingFn = defaultFn;
        return;
      }
      if (typeof userEase === "string") {
        this.easingFn = ease[userEase] ? ease[userEase] : defaultFn;
      }
      if (typeof userEase === "function") {
        this.easingFn = userEase;
      }
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this._initEvents(true);
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
      this.observer.trigger('destroy');
    }
  }, {
    key: '_start',
    value: function _start(e) {
      if (this._ticking || !this.enabled) return;

      if (this.options.preventDefault) {
        e.preventDefault();
      }

      var point = e.touches ? e.touches[0] : e;

      this.moved = false;
      this.distX = 0;
      this.distY = 0;
      this.directionX = 0;
      this.directionY = 0;
      this.directionLocked = 0;

      this.startTime = Date.now();

      if (this.isAnimating) {
        this.isAnimating = false;
        this.observer.trigger('scrollEnd');
      }

      this.startX = this.x;
      this.startY = this.y;
      this.absStartX = this.x;
      this.absStartY = this.y;
      this.pointX = point.pageX;
      this.pointY = point.pageY;

      this.observer.trigger('beforeScrollStart');
    }
  }, {
    key: '_move',
    value: function _move(e) {
      if (!this.enabled || this._ticking) return;

      if (this.options.preventDefault) {
        e.preventDefault();
      }

      var point = e.touches ? e.touches[0] : e,
          deltaX = point.pageX - this.pointX,
          deltaY = point.pageY - this.pointY,
          timestamp = Date.now(),
          newX = void 0,
          newY = void 0,
          absDistX = void 0,
          absDistY = void 0;

      this.pointX = point.pageX;
      this.pointY = point.pageY;

      this.distX += deltaX;
      this.distY += deltaY;
      absDistX = Math.abs(this.distX);
      absDistY = Math.abs(this.distY);

      // We need to move at least 10 pixels for the scrolling to initiate
      if (timestamp - this.endTime > 300 && absDistX < 10 && absDistY < 10) {
        return;
      }
      if (!this.directionLocked && !this.options.freeScroll) {
        if (absDistX > absDistY + this.options.directionLockThreshold) {
          this.directionLocked = 'h';
        } else if (absDistY >= absDistX + this.options.directionLockThreshold) {
          this.directionLocked = 'v';
        } else {
          this.directionLocked = 'n'; // no lock
        }
      }

      if (this.directionLocked == 'h') {
        deltaY = 0;
      } else if (this.directionLocked == 'v') {
        deltaX = 0;
      }
      newX = this.x + deltaX;
      newY = this.y + deltaY;

      // Slow down if outside of the boundaries
      if (newX > 0 || newX < this.maxScrollX) {
        newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
      }
      if (newY > 0 || newY < this.maxScrollY) {
        newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
      }

      this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
      this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

      if (!this.moved) {
        this.observer.trigger('scrollStart');
      }

      if (timestamp - this.startTime > 300) {
        this.startTime = timestamp;
        this.startX = this.x;
        this.startY = this.y;
      }

      this._render(newX, newY);
      this.moved = true;
    }
  }, {
    key: '_end',
    value: function _end(e) {
      if (!this.enabled) return;

      if (this.options.preventDefault) {
        e.preventDefault();
      }

      var newX = Math.round(this.x),
          newY = Math.round(this.y),
          time = 0,
          easing = '';

      this.endTime = Date.now();

      // reset if we are outside of the boundaries
      if (this.resetPosition(this.options.bounceTime)) {
        return;
      }

      this._scrollTo(newX, newY); // ensures that the last position is rounded
      // we scrolled less than 10 pixels
      if (!this.moved) {
        if (this.options.tap && !this.scaled) {
          if (!this.zoomEndTime || this.zoomEndTime && this.zoomEndTime + 200 < Date.now()) {
            tap(e, this.options.tap);
          }
        }

        this.observer.trigger('scrollCancel');
        return;
      }

      if (newX !== this.x || newY !== this.y) {
        // change easing function when scroller goes out of the boundaries
        if (newX > this.options.marginLeft || newX < this.maxScrollX || newY > this.options.marginTop || newY < this.maxScrollY) {
          easing = this.easingFn;
        }

        this._scrollTo(newX, newY, time, easing);
        return;
      }

      this.observer.trigger('scrollEnd');
    }
  }, {
    key: '_resize',
    value: function _resize() {
      var that = this;

      clearTimeout(this.resizeTimeout);

      this.resizeTimeout = setTimeout(function () {
        that.refresh();
      }, this.options.resizePolling);
    }
  }, {
    key: '_adjustPosition',
    value: function _adjustPosition(x, y) {
      var newX = x,
          newY = y;

      if (newX > this.options.marginLeft) {
        newX = this.options.marginLeft;
      } else if (newX < this.maxScrollX) {
        newX = this.maxScrollX;
      }

      if (newY > this.options.marginTop) {
        newY = this.options.marginTop;
      } else if (newY < this.maxScrollY) {
        newY = this.maxScrollY;
      }
      return [newX, newY];
    }
    /**
     * reset scroller's position, if out of boundary, reset it back
     *
     */

  }, {
    key: 'resetPosition',
    value: function resetPosition() {
      var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      var _adjustPosition2 = this._adjustPosition(this.x, this.y),
          _adjustPosition3 = slicedToArray(_adjustPosition2, 2),
          x = _adjustPosition3[0],
          y = _adjustPosition3[1];

      if (x === this.x && y === this.y) return false;

      this._scrollTo(x, y, time, this.easingFn);

      return true;
    }
    /**
     * set disable
     *
     */

  }, {
    key: 'disable',
    value: function disable() {
      this.enabled = false;
    }
    /**
     * set enable
     *
     */

  }, {
    key: 'enable',
    value: function enable() {
      this.enabled = true;
    }
    /**
     * refresh scroller setttings
     *
     */

  }, {
    key: 'refresh',
    value: function refresh() {
      this.wrapperWidth = this.wrapper.clientWidth;
      this.wrapperHeight = this.wrapper.clientHeight;
      this.wrapperOffset = offset(this.wrapper);
      this._refreshScroller();
      this.observer.trigger('refresh');
    }
  }, {
    key: '_refreshScroller',
    value: function _refreshScroller() {
      this.scrollerWidth = Math.round((this.options.contentWidth || this.wrapperWidth) * this.scale);
      this.scrollerHeight = Math.round((this.options.contentHeight || this.wrapperHeight) * this.scale);

      this.maxScrollX = this.wrapperWidth - this.scrollerWidth - this.options.marginRight;
      this.maxScrollY = Math.min(this.options.marginTop, this.wrapperHeight - this.scrollerHeight - this.options.marginBottom);

      this.endTime = 0;
      this.directionX = 0;
      this.directionY = 0;
    }
  }, {
    key: '_render',
    value: function _render(x, y) {
      if (this._ticking) return;

      var render = function render() {
        this.options.render(x, y, this.scale);

        this.x = x;
        this.y = y;

        this._ticking = false;
      };

      if (!this._ticking) {
        var update = render.bind(this);
        raf(update);
        this._ticking = true;
      }
    }
  }, {
    key: '_zoomStart',
    value: function _zoomStart(e) {
      var c1 = Math.abs(e.touches[0].pageX - e.touches[1].pageX),
          c2 = Math.abs(e.touches[0].pageY - e.touches[1].pageY);

      this.touchesDistanceStart = Math.sqrt(c1 * c1 + c2 * c2);
      this.startScale = this.scale;

      this.originX = Math.abs(e.touches[0].pageX + e.touches[1].pageX) / 2 + this.wrapperOffset.left - this.x;
      this.originY = Math.abs(e.touches[0].pageY + e.touches[1].pageY) / 2 + this.wrapperOffset.top - this.y;

      this.observer.trigger('zoomStart');
    }
  }, {
    key: '_zoom',
    value: function _zoom(e) {
      if (!this.enabled) return;

      if (this.options.preventDefault) {
        e.preventDefault();
      }

      var c1 = Math.abs(e.touches[0].pageX - e.touches[1].pageX),
          c2 = Math.abs(e.touches[0].pageY - e.touches[1].pageY),
          distance = Math.sqrt(c1 * c1 + c2 * c2),
          scale = 1 / this.touchesDistanceStart * distance * this.startScale,
          lastScale = void 0,
          x = void 0,
          y = void 0;

      this.scaled = true;

      if (scale < this.options.zoomMin) {
        scale = 0.5 * this.options.zoomMin * Math.pow(2.0, scale / this.options.zoomMin);
      } else if (scale > this.options.zoomMax) {
        scale = 2.0 * this.options.zoomMax * Math.pow(0.5, this.options.zoomMax / scale);
      }

      lastScale = scale / this.startScale;
      x = this.originX - this.originX * lastScale + this.startX;
      y = this.originY - this.originY * lastScale + this.startY;

      this.scale = scale;

      this._scrollTo(x, y, 0);
    }
  }, {
    key: '_zoomEnd',
    value: function _zoomEnd(e) {
      if (!this.enabled) return;

      if (this.options.preventDefault) {
        e.preventDefault();
      }

      if (this.scale > this.options.zoomMax) {
        this.scale = this.options.zoomMax;
      } else if (this.scale < this.options.zoomMin) {
        this.scale = this.options.zoomMin;
      }

      this._refreshScroller();

      var lastScale = this.scale / this.startScale;
      var x = this.originX - this.originX * lastScale + this.startX;
      var y = this.originY - this.originY * lastScale + this.startY;

      var _adjustPosition4 = this._adjustPosition(x, y),
          _adjustPosition5 = slicedToArray(_adjustPosition4, 2),
          newX = _adjustPosition5[0],
          newY = _adjustPosition5[1];

      if (this.x !== newX || this.y !== newY) {
        this._scrollTo(newX, newY, this.options.bounceTime);
      }

      this.scaled = false;
      this.zoomEndTime = Date.now();

      this.observer.trigger('zoomEnd');
    }
  }, {
    key: '_getDestinationPosition',
    value: function _getDestinationPosition(x, y) {
      var destX = x === undefined ? this.scrollerWidth / 2 : x * this.scale;
      var destY = y === undefined ? this.scrollerHeight / 2 : y * this.scale;

      destX = this.wrapperWidth / 2 - destX;
      destY = this.wrapperHeight / 2 - destY;

      var _adjustPosition6 = this._adjustPosition(destX, destY),
          _adjustPosition7 = slicedToArray(_adjustPosition6, 2),
          newX = _adjustPosition7[0],
          newY = _adjustPosition7[1];

      return {
        x: newX,
        y: newY
      };
    }
  }, {
    key: '_animate',
    value: function _animate(destX, destY, duration, easingFn) {
      var that = this,
          startX = this.x,
          startY = this.y,
          startTime = Date.now(),
          destTime = startTime + duration;

      function step() {
        var now = Date.now(),
            newX = void 0,
            newY = void 0,
            easing = void 0;

        if (now >= destTime) {
          that._render(destX, destY);
          that.isAnimating = false;
          that.observer.trigger('scrollEnd');
          return;
        }

        now = (now - startTime) / duration;
        easing = easingFn(now);
        newX = (destX - startX) * easing + startX;
        newY = (destY - startY) * easing + startY;
        that._render(newX, newY);

        if (that.isAnimating) {
          raf(step);
        }
      }

      this.isAnimating = true;
      step();
    }
  }, {
    key: '_scrollTo',
    value: function _scrollTo(x, y, time, easing) {
      easing = easing || this.easingFn;

      if (!time) {
        this._render(x, y);
      } else {
        this._animate(x, y, time, easing);
      }
    }
    /**
     * scroll to specific postion of scroller
     *
     * @param  {Number} x        - offset x
     * @param  {Number} y        - offset y
     * @param  {Number} time     - transition time
     * @param  {Function} easing - easing funtions
     *
     */

  }, {
    key: 'scrollTo',
    value: function scrollTo(x, y, time, easing) {
      time = time === undefined ? this.options.duration : time;
      easing = easing || this.easingFn;

      x = -x * this.scale + this.wrapperWidth / 2;
      y = -y * this.scale + this.wrapperHeight / 2;

      var _adjustPosition8 = this._adjustPosition(x, y),
          _adjustPosition9 = slicedToArray(_adjustPosition8, 2),
          newX = _adjustPosition9[0],
          newY = _adjustPosition9[1];

      this._scrollTo(newX, newY, time, easing);
    }
    /**
     * zoom to specific postion of scroller and scale Canvas
     *
     * @param  {Number} scale    - scale
     * @param  {Number} x        - offset x
     * @param  {Number} y        - offset y
     * @param  {Number} duration - transition time
     *
     */

  }, {
    key: 'zoom',
    value: function zoom(scale, x, y, duration) {
      if (scale < this.options.zoomMin) {
        scale = this.options.zoomMin;
      } else if (scale > this.options.zoomMax) {
        scale = this.options.zoomMax;
      }

      if (scale === this.scale) return;

      duration = duration === undefined ? 300 : duration;

      var that = this,
          beginScale = that.scale,
          startTime = Date.now(),
          destTime = startTime + duration,
          easingFn = this.easingFn;

      function step() {
        var now = Date.now(),
            newDest = void 0,
            newScale = void 0,
            dest = void 0,
            easing = void 0;

        if (now >= destTime) {
          that.isAnimating = false;
          that.scale = scale;
          that._refreshScroller();
          dest = that._getDestinationPosition(x, y);
          that._render(dest.x, dest.y);
          return;
        }

        now = (now - startTime) / duration;
        easing = easingFn(now);

        newScale = (scale - beginScale) * easing + beginScale;
        that.scale = newScale;
        that._refreshScroller();

        newDest = that._getDestinationPosition(x, y);
        that._render(newDest.x, newDest.y);

        if (that.isAnimating) {
          raf(step);
        }
      }
      this.isAnimating = true;
      step();
    }
  }, {
    key: 'on',
    value: function on(eventType, fn) {
      this.observer.on(eventType, fn);
    }
  }, {
    key: 'off',
    value: function off(eventType, fn) {
      this.observer.off(eventType, fn);
    }
  }, {
    key: '_initEvents',
    value: function _initEvents(remove) {
      var eventType = remove ? removeEvent : addEvent,
          target = this.options.bindToWrapper ? this.wrapper : window,
          handleFunc = this._handleEvent.bind(this);

      eventType(window, 'resize', handleFunc);

      if (!this.options.disableMouse) {
        eventType(this.wrapper, 'mousedown', handleFunc);
        var events = ["mousemove", "mousecancel", "mouseup"];
        events.forEach(function (type) {
          eventType(target, type, handleFunc);
        });
      }

      if (hasTouch && !this.options.disableTouch) {
        eventType(this.wrapper, 'touchstart', handleFunc);
        var _events = ["touchmove", "touchcancel", "touchend"];
        _events.forEach(function (type) {
          eventType(target, type, handleFunc);
        });
      }
    }
  }, {
    key: '_handleEvent',
    value: function _handleEvent(e) {
      switch (e.type) {
        case 'touchstart':
        case 'pointerdown':
        case 'MSPointerDown':
        case 'mousedown':
          this._start(e);
          if (this.options.zoom && e.touches && e.touches.length > 1) {
            this._zoomStart(e);
          }
          break;
        case 'touchmove':
        case 'pointermove':
        case 'MSPointerMove':
        case 'mousemove':
          if (this.options.zoom && e.touches && e.touches[1]) {
            this._zoom(e);
            return;
          }
          this._move(e);
          break;
        case 'touchend':
        case 'pointerup':
        case 'MSPointerUp':
        case 'mouseup':
        case 'touchcancel':
        case 'pointercancel':
        case 'MSPointerCancel':
        case 'mousecancel':
          if (this.scaled) {
            this._zoomEnd(e);
            return;
          }
          this._end(e);
          break;
        case 'orientationchange':
        case 'resize':
          this._resize();
          break;
        default:
          break;
      }
    }
  }]);
  return WeScroll;
}();

return WeScroll;

})));
