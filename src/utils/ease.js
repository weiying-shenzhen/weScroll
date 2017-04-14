export default {
  quadratic: (k) => {
    return k * (2 - k)
  },
  circular: (k) => {
    return Math.sqrt(1 - (--k * k))
  },
  back: (k) => {
    const b = 4
    k -= 1
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
      e = 0.4
    if (k === 0) {
      return 0
    }
    if (k === 1) {
      return 1
    }
    return (e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1)
  }
}