export default (el) => {
  let left = -el.offsetLeft,
    top = -el.offsetTop

  // eslint-disable-next-line
  while (el = el.offsetParent) {
    left -= el.offsetLeft
    top -= el.offsetTop
  }
  return {
    left: left,
    top: top
  }
}