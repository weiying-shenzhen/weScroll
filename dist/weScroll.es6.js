'use strict';

let assign;
if (typeof Object.assign !== 'function') {
  assign = function assign(target) {
    if (target === undefined || target === null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }

    let output = Object(target);
    for (let index = 1; index < arguments.length; index++) {
      const source = arguments[index];
      if (source !== undefined && source !== null) {
        for (const nextKey in source) {
          if (source.hasOwnProperty(nextKey)) {
            output[nextKey] = source[nextKey];
          }
        }
      }
    }
    return output
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
  const ev = document.createEvent('Event');

  ev.initEvent(eventName, true, true);
  e = e.changedTouches[0] || e;
  ev.pageX = e.pageX;
  ev.pageY = e.pageY;

  e.target.dispatchEvent(ev);
}

const hasTouch = 'ontouchstart' in window;

const hasPointer = !!(window.PointerEvent || window.MSPointerEvent);

var ease = {
  quadratic: (k) => {
    return k * (2 - k)
  },
  circular: (k) => {
    return Math.sqrt(1 - (--k * k))
  },
  back: (k) => {
    const b = 4;
    k -= 1;
    return k * k * ((b + 1) * k + b) + 1
  },
  bounce: (k) => {
    // eslint-disable-next-line
    if ((k /= 1) < (1 / 2.75)) {
      return 7.5625 * k * k
    } else if (k < (2 / 2.75)) {
      return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75
    } else if (k < (2.5 / 2.75)) {
      return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375
    } else {
      return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375
    }
  },
  elastic: (k) => {
    const f = 0.22,
      e = 0.4;
    if (k === 0) {
      return 0
    }
    if (k === 1) {
      return 1
    }
    return (e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1)
  }
};

class Observer {
  constructor() {
    this._events = [];
  }
  on(type, fn) {
    let events = this._events[type];
    if (!events) {
      events = [];
    }
    events.push(fn);
    this._events[type] = events;
  }
  off(type, fn) {
    const events = this._events[type];
    if (!events) return

    const index = events.indexOf(fn);
    if (index > -1) {
      events.splice(index, 1);
    }
  }
  trigger(type) {
    const events = this._events[type];
    if (!events || !events.length) return
    for (let i = 0; i < events.length; i++) {
      events[i].apply(this, [].slice.call(arguments, 1));
    }
  }
}

var offset = (el) => {
  let left = -el.offsetLeft,
    top = -el.offsetTop;

  // eslint-disable-next-line
  while (el = el.offsetParent) {
    left -= el.offsetLeft;
    top -= el.offsetTop;
  }
  return {
    left: left,
    top: top
  }
};

var raf = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame || function(callback){ window.setTimeout(callback, 1000 / 60); };

const defaultOptions = {
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

  preventDefault: true,

  bindToWrapper: true
};
/**
 * weScroll: Canvas scroll library for Muti Touch, Zooming, based on IScroll-zom 5
 *
 */
class WeScroll {
  /**
   * create a WeScroll instance
   *
   * @param  {String|HTMLElement} el     - wrapper of Canvas
   * @param  {Obect} options             - options for settings
   *
   */
  constructor(el, options) {
    this.wrapper = typeof el === 'string' ? document.querySelector(el) : el;
    this.options = assign$1({}, defaultOptions, options);
    this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;
    const margin = this.options.margin;
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
  _init() {
    this.observer = new Observer();
    this._initEvents();
    this._initEaseFn();
  }
  _initEaseFn(){
    const userEase = this.options.ease;
    const defaultFn = ease.circular;
    if (!userEase) {
      this.easingFn = defaultFn;
      return
    }
    if (typeof userEase === "string") {
      this.easingFn = ease[userEase] ? ease[userEase] : defaultFn;
    }
    if (typeof userEase === "function") {
      this.easingFn = userEase;
    }
  }
  destroy() {
    this._initEvents(true);
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = null;
    this.observer.trigger('destroy');
  }
  _start(e) {
    if (this._ticking || !this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault();
    }

    let point = e.touches ? e.touches[0] : e;

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
  _move(e) {
    if (!this.enabled || this._ticking) return

    if (this.options.preventDefault) {
      e.preventDefault();
    }

    let point = e.touches ? e.touches[0] : e,
      deltaX = point.pageX - this.pointX,
      deltaY = point.pageY - this.pointY,
      timestamp = Date.now(),
      newX, newY,
      absDistX, absDistY;

    this.pointX = point.pageX;
    this.pointY = point.pageY;

    this.distX += deltaX;
    this.distY += deltaY;
    absDistX = Math.abs(this.distX);
    absDistY = Math.abs(this.distY);

    // We need to move at least 10 pixels for the scrolling to initiate
    if (timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10)) {
      return
    }

    // If you are scrolling in one direction lock the other
    if (!this.directionLocked) {
      if (absDistX > absDistY + this.options.directionLockThreshold) {
        this.directionLocked = 'h'; // lock horizontally
      } else if (absDistY >= absDistX + this.options.directionLockThreshold) {
        this.directionLocked = 'v'; // lock vertically
      } else {
        this.directionLocked = 'n'; // no lock
      }
    }

    if (this.directionLocked === 'h') {
      deltaY = 0;
    } else if (this.directionLocked === 'v') {
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
  _end(e) {
    if (!this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault();
    }

    let newX = Math.round(this.x),
      newY = Math.round(this.y),
      time = 0,
      easing = '';

    this.endTime = Date.now();

    // reset if we are outside of the boundaries
    if (this.resetPosition(this.options.bounceTime)) {
      return
    }

    this._scrollTo(newX, newY); // ensures that the last position is rounded

    // we scrolled less than 10 pixels
    if (!this.moved) {
      if (this.options.tap && !this.scaled) {
        if (!this.zoomEndTime ||
          (this.zoomEndTime &&
          ((this.zoomEndTime + 200) < Date.now()))
        ) {
          tap(e, this.options.tap);
        }
      }

      this.observer.trigger('scrollCancel');
      return
    }

    if (newX !== this.x || newY !== this.y) {
      // change easing function when scroller goes out of the boundaries
      if (newX > this.options.marginLeft || newX < this.maxScrollX || newY > this.options.marginTop || newY < this.maxScrollY) {
        easing = this.easingFn;
      }

      this._scrollTo(newX, newY, time, easing);
      return
    }

    this.observer.trigger('scrollEnd');
  }
  _resize() {
    let that = this;

    clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(function() {
      that.refresh();
    }, this.options.resizePolling);
  }
  _adjustPosition(x, y){
      let newX = x,
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
      return [newX, newY]
  }
  /**
   * reset scroller's position, if out of boundary, reset it back
   *
   */
  resetPosition(time = 0) {
    const [x, y] = this._adjustPosition(this.x, this.y);

    if (x === this.x && y === this.y) return false

    this._scrollTo(x, y, time, ease.circular);

    return true
  }
  /**
   * set disable
   *
   */
  disable() {
    this.enabled = false;
  }
  /**
   * set enable
   *
   */
  enable() {
    this.enabled = true;
  }
  /**
   * refresh scroller setttings
   *
   */
  refresh() {
    this.wrapperWidth = this.wrapper.clientWidth;
    this.wrapperHeight = this.wrapper.clientHeight;
    this.wrapperOffset = offset(this.wrapper);
    this._refreshScroller();
    this.observer.trigger('refresh');
  }
  _refreshScroller(){
    this.scrollerWidth = Math.round((this.options.contentWidth || this.wrapperWidth) * this.scale);
    this.scrollerHeight = Math.round((this.options.contentHeight || this.wrapperHeight) * this.scale);

    this.maxScrollX = this.wrapperWidth - this.scrollerWidth - this.options.marginRight;
    this.maxScrollY = Math.min(this.options.marginTop, this.wrapperHeight - this.scrollerHeight - this.options.marginBottom);

    this.endTime = 0;
    this.directionX = 0;
    this.directionY = 0;
  }
  _render(x, y) {
    if (this._ticking) return

    let render = function() {
      this.options.render(x, y, this.scale);

      this.x = x;
      this.y = y;

      this._ticking = false;
    };

    if (!this._ticking) {
      let update = render.bind(this);
      raf(update);
      this._ticking = true;
    }
  }
  _zoomStart(e) {
    let c1 = Math.abs(e.touches[0].pageX - e.touches[1].pageX),
      c2 = Math.abs(e.touches[0].pageY - e.touches[1].pageY);

    this.touchesDistanceStart = Math.sqrt(c1 * c1 + c2 * c2);
    this.startScale = this.scale;

    this.originX = Math.abs(e.touches[0].pageX + e.touches[1].pageX) / 2 + this.wrapperOffset.left - this.x;
    this.originY = Math.abs(e.touches[0].pageY + e.touches[1].pageY) / 2 + this.wrapperOffset.top - this.y;

    this.observer.trigger('zoomStart');
  }
  _zoom(e) {
    if (!this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault();
    }

    let c1 = Math.abs(e.touches[0].pageX - e.touches[1].pageX),
      c2 = Math.abs(e.touches[0].pageY - e.touches[1].pageY),
      distance = Math.sqrt(c1 * c1 + c2 * c2),
      scale = 1 / this.touchesDistanceStart * distance * this.startScale,
      lastScale,
      x, y;

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
  _zoomEnd(e) {
    if (!this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault();
    }

    if (this.scale > this.options.zoomMax) {
      this.scale = this.options.zoomMax;
    } else if (this.scale < this.options.zoomMin) {
      this.scale = this.options.zoomMin;
    }

    this._refreshScroller();

    const lastScale = this.scale / this.startScale;
    const x = this.originX - this.originX * lastScale + this.startX;
    const y = this.originY - this.originY * lastScale + this.startY;

    const [newX, newY] = this._adjustPosition(x, y);

    if (this.x !== newX || this.y !== newY) {
      this._scrollTo(newX, newY, this.options.bounceTime);
    }

    this.scaled = false;
    this.zoomEndTime = Date.now();

    this.observer.trigger('zoomEnd');
  }
  _getDestinationPosition(x, y) {
    let destX = x === undefined ? this.scrollerWidth / 2 : x * this.scale;
    let destY = y === undefined ? this.scrollerHeight / 2 : y * this.scale;

    destX = this.wrapperWidth / 2 - destX;
    destY = this.wrapperHeight / 2 - destY;

    const [newX, newY] = this._adjustPosition(destX, destY);

    return {
      x: newX,
      y: newY
    }
  }
  _animate(destX, destY, duration, easingFn) {
    let that = this,
      startX = this.x,
      startY = this.y,
      startTime = Date.now(),
      destTime = startTime + duration;

    function step() {
      let now = Date.now(),
        newX, newY,
        easing;

      if (now >= destTime) {
        that.isAnimating = false;
        that._render(destX, destY);
        return
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
  _scrollTo(x, y, time, easing) {
    easing = easing || this.easingFn;

    if (!time) {
      this._render(x, y);
      this.observer.trigger('scrollEnd');
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
  scrollTo(x, y, time, easing) {
    time = time === undefined ? this.options.duration : time;
    easing = easing || this.easingFn;

    x = -x * this.scale + this.wrapperWidth / 2;
    y = -y * this.scale + this.wrapperHeight / 2;

    const [newX, newY] = this._adjustPosition(x, y);

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
  zoom(scale, x, y, duration) {
    if (scale < this.options.zoomMin) {
      scale = this.options.zoomMin;
    } else if (scale > this.options.zoomMax) {
      scale = this.options.zoomMax;
    }

    if (scale === this.scale) return

    duration = duration === undefined ? 300 : duration;

    let that = this,
      beginScale = that.scale,
      startTime = Date.now(),
      destTime = startTime + duration,
      easingFn = this.easingFn;

    function step() {
      let now = Date.now(),
        newDest,
        newScale,
        dest,
        easing;

      if (now >= destTime) {
        that.isAnimating = false;
        that.scale = scale;
        that._refreshScroller();
        dest = that._getDestinationPosition(x, y);
        that._render(dest.x, dest.y);
        return
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
  on(eventType, fn){
    this.observer.on(eventType, fn);
  }
  off(eventType, fn){
    this.observer.off(eventType, fn);
  }
  _initEvents(remove) {
    const eventType = remove ? removeEvent : addEvent,
      target = this.options.bindToWrapper ? this.wrapper : window,
      handleFunc = this._handleEvent.bind(this);

    eventType(window, 'resize', handleFunc);

    if (!this.options.disableMouse) {
      eventType(this.wrapper, 'mousedown', handleFunc);
      const events = ["mousemove", "mousecancel", "mouseup"];
      events.forEach((type) => {
        eventType(target, type, handleFunc);
      });
    }

    if (hasTouch && !this.options.disableTouch) {
      eventType(this.wrapper, 'touchstart', handleFunc);
      const events = ["touchmove", "touchcancel", "touchend"];
      events.forEach((type) => {
        eventType(target, type, handleFunc);
      });
    }
  }
  _handleEvent(e) {
    switch (e.type) {
      case 'touchstart':
      case 'pointerdown':
      case 'MSPointerDown':
      case 'mousedown':
        this._start(e);
        if (this.options.zoom && e.touches && e.touches.length > 1) {
          this._zoomStart(e);
        }
        break
      case 'touchmove':
      case 'pointermove':
      case 'MSPointerMove':
      case 'mousemove':
        if (this.options.zoom && e.touches && e.touches[1]) {
          this._zoom(e);
          return
        }
        this._move(e);
        break
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
          return
        }
        this._end(e);
        break
      case 'orientationchange':
      case 'resize':
        this._resize();
        break
      default:
        break
    }
  }
}

module.exports = WeScroll;
