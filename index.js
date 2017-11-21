const hasher = require('multihasher')('sha256')
const bent = require('bent')
const bl = require('bl')
const { parseCacheControl } = require('wreck')

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
  constructor (storage, minexp = 0) {
    this.storage = storage
    this.minexp = minexp
  }
  expires (meta) {
    let expiration = 0
    if (meta.expires) {
      expiration = (new Date(meta.expires)).getTime()
      if (isNaN(expiration)) {
        expiration = 0
      }
    }
    if (meta.control) {
      if (meta.control['max-age']) {
        expiration = meta.ts + (meta.control['max-age'] * 100)
      }
    }
    if (expiration < meta.ts + this.minexp) {
      expiration = meta.ts + this.minexp
    }
    return expiration
  }
  async get (_url) {
    let key = await hasher(Buffer.from(_url))
    let meta = await this.storage.get(key)
    let headers = {'User-Agent': 'wallabees-v0.0.0-pre'}
    if (meta) {
      meta = JSON.parse(meta.toString())
      // TODO: re-do request if cache is out of date.

      if (this.expires(meta) > Date.now()) {
        return this.storage.get(meta.body)
      }

      if (meta.etag) {
        headers['if-none-match'] = meta.etag
      }
    } else {
      meta = {url: _url}
    }

    let get = bent(headers, 200, 304)
    let res = await get(_url)
    let body

    if (res.statusCode === 304) {
      body = await this.storage.get(meta.body)
    } else {
      /* response was 200, enforced by bent */
      body = await getBuffer(res)
      meta.body = await hasher(body)
      await this.storage.set(meta.body, body)
    }

    meta.ts = Date.now()
    meta.expires = res.headers.expires || meta.expires || null
    meta.etag = res.headers.etag || meta.etag || null
    meta.control = res.headers['cache-control']
      ? parseCacheControl(res.headers['cache-control']) : meta.control || null

    await this.storage.set(key, Buffer.from(JSON.stringify(meta)))
    return body
  }
}

module.exports = (...args) => new Wallabees(...args)
