export function addEvent(el, type, fn, capture) {
  el.addEventListener(type, fn, !!capture)
}

export function removeEvent(el, type, fn, capture) {
  el.removeEventListener(type, fn, !!capture)
}

export function tap(e, eventName) {
  const ev = document.createEvent('Event')

  ev.initEvent(eventName, true, true)
  e = e.changedTouches[0] || e
  ev.pageX = e.pageX
  ev.pageY = e.pageY

  e.target.dispatchEvent(ev)
}

export const hasTouch = 'ontouchstart' in window

export const hasPointer = !!(window.PointerEvent || window.MSPointerEvent)
