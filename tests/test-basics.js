const inmem = require('./inmem')
const wallabees = require('../')
const http = require('http')
const promisify = require('util').promisify
const _test = require('tap').test

const paths = {}

const handler = (req, res) => {
  /* istanbul ignore else */
  if (paths[req.url]) {
    return paths[req.url](req, res)
  }
  /* istanbul ignore next */
  throw new Error('No test path.')
}

const test = (str, fn) => {
  _test(str, async t => {
    let server = http.createServer(handler)
    await promisify(cb => server.listen(3000, cb))()
    await fn(t)
    await promisify(cb => server.close(cb))()
  })
}

const u = path => 'http://localhost:3000' + path

test('basic GET', async t => {
  t.plan(2)
  let cache = wallabees(inmem, 1000)
  paths['/basic'] = (req, res) => {
    res.end('ok')
  }
  let body = await cache.get(u('/basic'))
  t.same('ok', body.toString())
  paths['/basic'] = /* istanbul ignore next */ (req, res) => {
    res.end('not-ok')
  }
  let body2 = await cache.get(u('/basic'))
  t.same(body, body2)
})

test('basic GET etag', async t => {
  t.plan(3)
  let cache = wallabees(inmem)
  paths['/etag'] = (req, res) => {
    if (req.headers['if-none-match'] === '"1234"') {
      res.statusCode = 304
      t.ok(true)
      return res.end()
    }
    res.setHeader('etag', '"1234"')
    res.end('ok')
  }
  let body = await cache.get(u('/etag'))
  t.same('ok', body.toString())
  let body2 = await cache.get(u('/etag'))
  t.same(body, body2)
})

test('non 200 response', async t => {
  t.plan(2)
  paths['/404'] = (req, res) => {
    res.statusCode = 404
    res.end()
  }

  let cache = wallabees(inmem)
  try {
    await cache.get(u('/404'))
  } catch (e) {
    t.type(e, 'Error')
    t.same(e.message, 'Incorrect statusCode: 404')
  }
})

test('expires header', async t => {
  t.plan(3)
  let cache = wallabees(inmem)
  let first = true
  paths['/expires'] = (req, res) => {
    t.ok(first)
    first = false
    res.setHeader('expires', (new Date(Date.now() + 1000)).toString())
    res.end('ok')
  }
  let body = await cache.get(u('/expires'))
  t.same('ok', body.toString())
  let body2 = await cache.get(u('/expires'))
  t.same(body, body2)
})

test('cache-control max-age', async t => {
  t.plan(3)
  let cache = wallabees(inmem)
  let first = true
  paths['/max-age'] = (req, res) => {
    t.ok(first)
    first = false
    res.setHeader('cache-control', 'max-age=60')
    res.end('ok')
  }
  let body = await cache.get(u('/max-age'))
  t.same('ok', body.toString())
  let body2 = await cache.get(u('/max-age'))
  t.same(body, body2)
})

test('invalid expiration', async t => {
  t.plan(4)
  let cache = wallabees(inmem)
  paths['/invalid-exp'] = (req, res) => {
    t.ok(true)
    res.setHeader('expires', 'nope')
    res.end('ok')
  }
  let body = await cache.get(u('/invalid-exp'))
  t.same('ok', body.toString())
  let body2 = await cache.get(u('/invalid-exp'))
  t.same(body, body2)
})

test('no-cache in cache-control', async t => {
  t.plan(2)
  let cache = wallabees(inmem, 1000)
  paths['/no-cache'] = (req, res) => {
    res.setHeader('cache-control', 'no-cache')
    res.end('ok')
  }
  let body = await cache.get(u('/no-cache'))
  t.same('ok', body.toString())
  paths['/no-cache'] = /* istanbul ignore next */ (req, res) => {
    res.end('not-ok')
  }
  let body2 = await cache.get(u('/no-cache'))
  t.same(body, body2)
})
