import assign from './utils/assign'
import {
  addEvent,
  removeEvent,
  hasPointer,
  hasTouch,
  tap
} from './utils/event'
import ease from './utils/ease'
import Observer from './utils/observer'
import offset from './utils/offset'
import raf from './utils/raf'

const defaultOptions = {
  zoomMin: 1,
  zoomMax: 4,
  startZoom: 1,

  disablePointer: !hasPointer,
  disableTouch: hasPointer || !hasTouch,
  disableMouse: hasPointer || hasTouch,
  startX: 0,
  startY: 0,
  scrollY: true,
  directionLockThreshold: 5,

  bounce: true,
  bounceTime: 480,
  duration: 300,

  preventDefault: true,

  bindToWrapper: typeof window.onmousedown === "undefined"
}

export default class WeScroll {
  constructor(el, options) {
    this.wrapper = typeof el === 'string' ? document.querySelector(el) : el
    this.options = assign({}, defaultOptions, options)
    this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault

    if (this.options.tap === true) {
      this.options.tap = 'tap'
    }

    this.x = 0
    this.y = 0
    this.directionX = 0
    this.directionY = 0
    this.boundaryPadding = this.options.boundaryPadding || 20

    this.scale = Math.min(Math.max(this.options.startZoom, this.options.zoomMin), this.options.zoomMax)

    this._init()
    this.refresh()

    this.scrollTo(this.options.startX, this.options.startY)
    this.enable()
    this._ticking = false
  }
  _init() {
    this.observer = new Observer()
    this._initEvents()
  }
  destroy() {
    this._initEvents(true)
    clearTimeout(this.resizeTimeout)
    this.resizeTimeout = null
    this.observer.trigger('destroy')
  }
  _start(e) {
    if (this._ticking || !this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault()
    }

    let point = e.touches ? e.touches[0] : e

    this.moved = false
    this.distX = 0
    this.distY = 0
    this.directionX = 0
    this.directionY = 0
    this.directionLocked = 0

    this.startTime = Date.now()

    if (this.isAnimating) {
      this.isAnimating = false
      this.observer.trigger('scrollEnd')
    }

    this.startX = this.x
    this.startY = this.y
    this.absStartX = this.x
    this.absStartY = this.y
    this.pointX = point.pageX
    this.pointY = point.pageY

    this.observer.trigger('beforeScrollStart')
  }
  _move(e) {
    if (!this.enabled || this._ticking) return

    if (this.options.preventDefault) {
      e.preventDefault()
    }

    let point = e.touches ? e.touches[0] : e,
      deltaX = point.pageX - this.pointX,
      deltaY = point.pageY - this.pointY,
      timestamp = Date.now(),
      newX, newY,
      absDistX, absDistY

    this.pointX = point.pageX
    this.pointY = point.pageY

    this.distX += deltaX
    this.distY += deltaY
    absDistX = Math.abs(this.distX)
    absDistY = Math.abs(this.distY)

    // We need to move at least 10 pixels for the scrolling to initiate
    if (timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10)) {
      return
    }

    // If you are scrolling in one direction lock the other
    if (!this.directionLocked) {
      if (absDistX > absDistY + this.options.directionLockThreshold) {
        this.directionLocked = 'h' // lock horizontally
      } else if (absDistY >= absDistX + this.options.directionLockThreshold) {
        this.directionLocked = 'v' // lock vertically
      } else {
        this.directionLocked = 'n' // no lock
      }
    }

    if (this.directionLocked === 'h') {
      deltaY = 0
    } else if (this.directionLocked === 'v') {
      deltaX = 0
    }

    newX = this.x + deltaX
    newY = this.y + deltaY

    // Slow down if outside of the boundaries
    if (newX > 0 || newX < this.maxScrollX) {
      newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX
    }
    if (newY > 0 || newY < this.maxScrollY) {
      newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY
    }

    this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0
    this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0

    if (!this.moved) {
      this.observer.trigger('scrollStart')
    }

    if (timestamp - this.startTime > 300) {
      this.startTime = timestamp
      this.startX = this.x
      this.startY = this.y
    }

    this._render(newX, newY)
    this.moved = true
  }
  _end(e) {
    if (this._ticking || !this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault()
    }

    let newX = Math.round(this.x),
      newY = Math.round(this.y),
      time = 0,
      easing = ''

    this.endTime = Date.now()

    // reset if we are outside of the boundaries
    if (this.resetPosition(this.options.bounceTime)) {
      return
    }

    this.scrollTo(newX, newY) // ensures that the last position is rounded

    // we scrolled less than 10 pixels
    if (!this.moved) {
      if (this.options.tap) {
        tap(e, this.options.tap)
      }

      this.observer.trigger('scrollCancel')
      return
    }

    if (newX !== this.x || newY !== this.y) {
      // change easing function when scroller goes out of the boundaries
      if (newX > this.boundaryPadding || newX < this.maxScrollX || newY > this.boundaryPadding || newY < this.maxScrollY) {
        easing = ease.quadratic
      }

      this.scrollTo(newX, newY, time, easing)
      return
    }

    this.observer.trigger('scrollEnd')
  }
  _resize() {
    let that = this

    clearTimeout(this.resizeTimeout)

    this.resizeTimeout = setTimeout(function() {
      that.refresh()
    }, this.options.resizePolling)
  }
  resetPosition(time) {
    let x = this.x,
      y = this.y

    time = time || 0

    if (this.x > this.boundaryPadding) {
      x = this.boundaryPadding
    } else if (this.x < this.maxScrollX) {
      x = this.maxScrollX
    }

    if (this.y > this.boundaryPadding) {
      y = this.boundaryPadding
    } else if (this.y < this.maxScrollY) {
      y = this.maxScrollY
    }

    if (x === this.x && y === this.y) return false

    this.scrollTo(x, y, time, ease.circular)

    return true
  }
  disable() {
    this.enabled = false
  }
  enable() {
    this.enabled = true
  }
  refresh() {
    this.wrapperWidth = this.wrapperWidth || this.wrapper.clientWidth
    this.wrapperHeight = this.wrapperHeight || this.wrapper.clientHeight

    this.scrollerWidth = Math.round(this.options.contentWidth * this.scale)
    this.scrollerHeight = Math.round(this.options.contentHeight * this.scale)

    this.maxScrollX = this.wrapperWidth - this.scrollerWidth - this.boundaryPadding
    this.maxScrollY = this.wrapperHeight - this.scrollerHeight - this.boundaryPadding
    this.maxScrollY = Math.min(this.boundaryPadding, this.maxScrollY)

    this.endTime = 0
    this.directionX = 0
    this.directionY = 0

    this.wrapperOffset = this.wrapperOffset || offset(this.wrapper)

    this.observer.trigger('refresh')
  }
  _render(x, y) {
    if (this._ticking) return

    let render = function() {
      this.options.render(x, y, this.scale)

      this.x = x
      this.y = y

      this._ticking = false
    }

    if (!this._ticking) {
      let update = render.bind(this)
      raf(update)
      this._ticking = true
    }
  }
  _zoomStart(e) {
    let c1 = Math.abs(e.touches[0].pageX - e.touches[1].pageX),
      c2 = Math.abs(e.touches[0].pageY - e.touches[1].pageY)

    this.touchesDistanceStart = Math.sqrt(c1 * c1 + c2 * c2)
    this.startScale = this.scale

    this.originX = Math.abs(e.touches[0].pageX + e.touches[1].pageX) / 2 + this.wrapperOffset.left - this.x
    this.originY = Math.abs(e.touches[0].pageY + e.touches[1].pageY) / 2 + this.wrapperOffset.top - this.y

    this.observer.trigger('zoomStart')
  }
  _zoom(e) {
    if (!this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault()
    }

    let c1 = Math.abs(e.touches[0].pageX - e.touches[1].pageX),
      c2 = Math.abs(e.touches[0].pageY - e.touches[1].pageY),
      distance = Math.sqrt(c1 * c1 + c2 * c2),
      scale = 1 / this.touchesDistanceStart * distance * this.startScale,
      lastScale,
      x, y

    this.scaled = true

    if (scale < this.options.zoomMin) {
      scale = 0.5 * this.options.zoomMin * Math.pow(2.0, scale / this.options.zoomMin)
    } else if (scale > this.options.zoomMax) {
      scale = 2.0 * this.options.zoomMax * Math.pow(0.5, this.options.zoomMax / scale)
    }

    lastScale = scale / this.startScale
    x = this.originX - this.originX * lastScale + this.startX
    y = this.originY - this.originY * lastScale + this.startY

    this.scale = scale

    this.scrollTo(x, y, 0)
  }
  _zoomEnd(e) {
    if (!this.enabled) return

    if (this.options.preventDefault) {
      e.preventDefault()
    }

    let newX, newY,
      lastScale

    this.initiated = 0

    if (this.scale > this.options.zoomMax) {
      this.scale = this.options.zoomMax
    } else if (this.scale < this.options.zoomMin) {
      this.scale = this.options.zoomMin
    }

    // Update boundaries
    this.refresh()

    lastScale = this.scale / this.startScale

    newX = this.originX - this.originX * lastScale + this.startX
    newY = this.originY - this.originY * lastScale + this.startY

    if (newX > this.boundaryPadding) {
      newX = this.boundaryPadding
    } else if (newX < this.maxScrollX) {
      newX = this.maxScrollX
    }

    if (newY > this.boundaryPadding) {
      newY = this.boundaryPadding
    } else if (newY < this.maxScrollY) {
      newY = this.maxScrollY
    }

    if (this.x !== newX || this.y !== newY) {
      this.scrollTo(newX, newY, this.options.bounceTime)
    }

    this.scaled = false

    this.observer.trigger('zoomEnd')
  }
  _getDestinationPosition(x, y) {
    let destX = x === undefined ? this.scrollerWidth / 2 : x * this.scale
    let destY = y === undefined ? this.scrollerHeight / 2 : y * this.scale

    destX = this.wrapperWidth / 2 - destX
    destY = this.wrapperHeight / 2 - destY

    if (destX > this.boundaryPadding) {
      destX = this.boundaryPadding
    } else if (destX < this.maxScrollX) {
      destY = this.maxScrollX
    }

    if (destY > this.boundaryPadding) {
      destY = this.boundaryPadding
    } else if (destY < this.maxScrollY) {
      destY = this.maxScrollY
    }

    return {
      x: destX,
      y: destY
    }
  }
  _animate(destX, destY, duration, easingFn) {
    let that = this,
      startX = this.x,
      startY = this.y,
      startTime = Date.now(),
      destTime = startTime + duration

    function step() {
      let now = Date.now(),
        newX, newY,
        easing

      if (now >= destTime) {
        that.isAnimating = false
        that._render(destX, destY)
        return
      }

      now = (now - startTime) / duration
      easing = easingFn(now)
      newX = (destX - startX) * easing + startX
      newY = (destY - startY) * easing + startY
      that._render(newX, newY)

      if (that.isAnimating) {
        raf(step)
      }
    }

    this.isAnimating = true
    step()
  }
  scrollTo(x, y, time, easing) {
    easing = easing || ease.circular

    if (!time) {
      this._render(x, y)
    } else {
      this._animate(x, y, time, easing)
    }
  }
  scrollToPoint(x, y, time, easing) {
    time = time === undefined ? this.options.duration : time
    easing = easing || ease.circular

    x = -x * this.scale + this.wrapperWidth / 2
    y = -y * this.scale + this.wrapperHeight / 2

    if (x > this.boundaryPadding) {
      x = this.boundaryPadding
    } else if (x < this.maxScrollX) {
      x = this.maxScrollX
    }

    if (y > this.boundaryPadding) {
      y = this.boundaryPadding
    } else if (y < this.maxScrollY) {
      y = this.maxScrollY
    }

    this.scrollTo(x, y, time, easing)
  }
  zoom(scale, x, y, duration) {
    if (scale < this.options.zoomMin) {
      scale = this.options.zoomMin
    } else if (scale > this.options.zoomMax) {
      scale = this.options.zoomMax
    }

    if (scale === this.scale) return

    duration = duration === undefined ? 300 : duration

    let that = this,
      beginScale = that.scale,
      startTime = Date.now(),
      destTime = startTime + duration,
      easingFn = ease.circular

    function step() {
      let now = Date.now(),
        newDest,
        newScale,
        dest,
        easing

      if (now >= destTime) {
        that.isAnimating = false
        that.scale = scale
        that.refresh()
        dest = that._getDestinationPosition(x, y)
        that._render(dest.x, dest.y)
        return
      }

      now = (now - startTime) / duration
      easing = easingFn(now)

      newScale = (scale - beginScale) * easing + beginScale
      that.scale = newScale
      that.refresh()

      newDest = that._getDestinationPosition(x, y)
      that._render(newDest.x, newDest.y)

      if (that.isAnimating) {
        raf(step)
      }
    }
    this.isAnimating = true
    step()
  }
  _initEvents(remove) {
    const eventType = remove ? removeEvent : addEvent,
      target = this.options.bindToWrapper ? this.wrapper : window,
      handleFunc = this._handleEvent.bind(this)

    eventType(window, 'resize', handleFunc)

    if (this.options.click) {
      eventType(this.wrapper, 'click', handleFunc, true)
    }

    if (!this.options.disableMouse) {
      eventType(this.wrapper, 'mousedown', handleFunc)
      const events = ["mousemove", "mousecancel", "mouseup"]
      events.forEach((type) => {
        eventType(target, type, handleFunc)
      })
    }

    if (hasTouch && !this.options.disableTouch) {
      eventType(this.wrapper, 'touchstart', handleFunc)
      const events = ["touchmove", "touchcancel", "touchend"]
      events.forEach((type) => {
        eventType(target, type, handleFunc)
      })
    }
  }
  _handleEvent(e) {
    switch (e.type) {
      case 'touchstart':
      case 'pointerdown':
      case 'MSPointerDown':
      case 'mousedown':
        this._start(e)
        if (this.options.zoom && e.touches && e.touches.length > 1) {
          this._zoomStart(e)
        }
        break
      case 'touchmove':
      case 'pointermove':
      case 'MSPointerMove':
      case 'mousemove':
        if (this.options.zoom && e.touches && e.touches[1]) {
          this._zoom(e)
          return
        }
        this._move(e)
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
          this._zoomEnd(e)
          return
        }
        this._end(e)
        break
      case 'orientationchange':
      case 'resize':
        this._resize()
        break
      default:
        break
    }
  }
}