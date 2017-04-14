export default class Observer {
  constructor() {
    this._events = []
  }
  on(type, fn) {
    if (!this._events[type]) {
      this._events[type] = []
    }
    this._events[type].push(fn)
  }
  off(type, fn) {
    if (!this._events[type]) return
    const index = this._events[type].indexOf(fn)

    if (index > -1) {
      this._events[type].splice(index, 1)
    }
  }
  trigger(type) {
    if (!this._events[type]) return
    let i = 0,
      l = this._events[type].length

    if (!l) return

    for (; i < l; i++) {
      this._events[type][i].apply(this, [].slice.call(arguments, 1))
    }
  }
}