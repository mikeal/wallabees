const store = new Map()

module.exports = {
  get: async key => store.get(key),
  set: async (key, value) => store.set(key, value)
}
