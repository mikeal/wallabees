# wallabees

HTTP Client Cache

```javascript
const store = new Map()

/* Abstract Storage Spec */
const storage = {
  get: async key => store.get(key),
  set: async (key, value) => store.set(key, value)
}

const wallabees = require('wallabees')
const httpCache = wallabees(storage, 60 * 60 * 1000 /* on hour min cache */)

let bodyBuffer = await httpCache.get('https://www.google.com')
```

The storage API is used for two things

* Meta information about every URL in the cache. Storage key is a hash of the URL.
* The response body buffer of every request ever. Storage key is the hash of the response body, which means the same data is never stored twice.

However, this means that response bodies are cached forever even after they change.

`TODO: Create an API for removing orphaned body keys.`
