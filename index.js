const hasher = require('multihasher')('sha256')
const bent = require('bent')
const bl = require('bl')

const get = bent({'User-Agent': 'wallabees-v0.0.0-pre'})

const getBuffer = stream => {
  return new Promise((resolve, reject) => {
    stream.pipe(bl((err, buff) => {
      /* istanbul ignore next */
      if (err) return reject(err)
      // if (buff.length === 0) return resolve(null)
      resolve(buff)
    }))
  })
}

class Wallabees {
  constructor (storage) {
    this.storage = storage
  }
  async get (_url) {
    let key = await hasher(Buffer.from(_url))
    let cached = await this.storage.get(key)
    if (cached) {
      cached = JSON.parse(cached.toString())
      // TODO: re-do request if cache is out of date.
      return this.storage.get(cached.body)
    } else {
      let res = await get(_url)
      let body = await getBuffer(res)
      let bodyKey = await hasher(body)
      let meta = {
        url: _url,
        headers: res.headers,
        body: bodyKey
      }
      await this.storage.set(bodyKey, body)
      await this.storage.set(key, Buffer.from(JSON.stringify(meta)))
      return body
    }
  }
}

module.exports = (...args) => new Wallabees(...args)
