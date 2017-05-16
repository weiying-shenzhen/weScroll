export default class Observer {
  constructor() {
    this._events = []
  }
  on(type, fn) {
    let events = this._events[type]
    if (!events) {
      events = []
    }
    events.push(fn)
    this._events[type] = events
  }
  off(type, fn) {
    const events = this._events[type]
    if (!events) return

    const index = events.indexOf(fn)
    if (index > -1) {
      events.splice(index, 1)
    }
  }
  trigger(type) {
    const events = this._events[type]
    if (!events || !events.length) return
    for (let i = 0; i < events.length; i++) {
      events[i].apply(this, [].slice.call(arguments, 1))
    }
  }
}