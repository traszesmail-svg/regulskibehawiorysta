require.extensions['.css'] = (module) => {
  module.exports = new Proxy(Object.create(null), {
    get(_target, className) {
      return typeof className === 'string' ? className : undefined
    },
  })
}
