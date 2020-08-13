import crypto from 'crypto';
import util from 'util';
import stream from 'stream';

class FiggyPudding {
  constructor (specs, opts, providers) {
    this.__specs = specs || {};
    Object.keys(this.__specs).forEach(alias => {
      if (typeof this.__specs[alias] === 'string') {
        const key = this.__specs[alias];
        const realSpec = this.__specs[key];
        if (realSpec) {
          const aliasArr = realSpec.aliases || [];
          aliasArr.push(alias, key);
          realSpec.aliases = [...(new Set(aliasArr))];
          this.__specs[alias] = realSpec;
        } else {
          throw new Error(`Alias refers to invalid key: ${key} -> ${alias}`)
        }
      }
    });
    this.__opts = opts || {};
    this.__providers = reverse((providers).filter(
      x => x != null && typeof x === 'object'
    ));
    this.__isFiggyPudding = true;
  }
  get (key) {
    return pudGet(this, key, true)
  }
  get [Symbol.toStringTag] () { return 'FiggyPudding' }
  forEach (fn, thisArg = this) {
    for (let [key, value] of this.entries()) {
      fn.call(thisArg, value, key, this);
    }
  }
  toJSON () {
    const obj = {};
    this.forEach((val, key) => {
      obj[key] = val;
    });
    return obj
  }
  * entries (_matcher) {
    for (let key of Object.keys(this.__specs)) {
      yield [key, this.get(key)];
    }
    const matcher = _matcher || this.__opts.other;
    if (matcher) {
      const seen = new Set();
      for (let p of this.__providers) {
        const iter = p.entries ? p.entries(matcher) : entries(p);
        for (let [key, val] of iter) {
          if (matcher(key) && !seen.has(key)) {
            seen.add(key);
            yield [key, val];
          }
        }
      }
    }
  }
  * [Symbol.iterator] () {
    for (let [key, value] of this.entries()) {
      yield [key, value];
    }
  }
  * keys () {
    for (let [key] of this.entries()) {
      yield key;
    }
  }
  * values () {
    for (let [, value] of this.entries()) {
      yield value;
    }
  }
  concat (...moreConfig) {
    return new Proxy(new FiggyPudding(
      this.__specs,
      this.__opts,
      reverse(this.__providers).concat(moreConfig)
    ), proxyHandler)
  }
}
try {
  const util$1 = util;
  FiggyPudding.prototype[util$1.inspect.custom] = function (depth, opts) {
    return (
      this[Symbol.toStringTag] + ' '
    ) + util$1.inspect(this.toJSON(), opts)
  };
} catch (e) {}

function BadKeyError (key) {
  throw Object.assign(new Error(
    `invalid config key requested: ${key}`
  ), {code: 'EBADKEY'})
}

function pudGet (pud, key, validate) {
  let spec = pud.__specs[key];
  if (validate && !spec && (!pud.__opts.other || !pud.__opts.other(key))) {
    BadKeyError(key);
  } else {
    if (!spec) { spec = {}; }
    let ret;
    for (let p of pud.__providers) {
      ret = tryGet(key, p);
      if (ret === undefined && spec.aliases && spec.aliases.length) {
        for (let alias of spec.aliases) {
          if (alias === key) { continue }
          ret = tryGet(alias, p);
          if (ret !== undefined) {
            break
          }
        }
      }
      if (ret !== undefined) {
        break
      }
    }
    if (ret === undefined && spec.default !== undefined) {
      if (typeof spec.default === 'function') {
        return spec.default(pud)
      } else {
        return spec.default
      }
    } else {
      return ret
    }
  }
}

function tryGet (key, p) {
  let ret;
  if (p.__isFiggyPudding) {
    ret = pudGet(p, key, false);
  } else if (typeof p.get === 'function') {
    ret = p.get(key);
  } else {
    ret = p[key];
  }
  return ret
}

const proxyHandler = {
  has (obj, prop) {
    return prop in obj.__specs && pudGet(obj, prop, false) !== undefined
  },
  ownKeys (obj) {
    return Object.keys(obj.__specs)
  },
  get (obj, prop) {
    if (
      typeof prop === 'symbol' ||
      prop.slice(0, 2) === '__' ||
      prop in FiggyPudding.prototype
    ) {
      return obj[prop]
    }
    return obj.get(prop)
  },
  set (obj, prop, value) {
    if (
      typeof prop === 'symbol' ||
      prop.slice(0, 2) === '__'
    ) {
      obj[prop] = value;
      return true
    } else {
      throw new Error('figgyPudding options cannot be modified. Use .concat() instead.')
    }
  },
  deleteProperty () {
    throw new Error('figgyPudding options cannot be deleted. Use .concat() and shadow them instead.')
  }
};

function reverse (arr) {
  const ret = [];
  arr.forEach(x => ret.unshift(x));
  return ret
}

function entries (obj) {
  return Object.keys(obj).map(k => [k, obj[k]])
}

const Transform = stream.Transform;

const NODE_HASHES = new Set(crypto.getHashes());

// This is a Best Effort™ at a reasonable priority for hash algos
const DEFAULT_PRIORITY = [
  'md5', 'whirlpool', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512',
  // TODO - it's unclear _which_ of these Node will actually use as its name
  //        for the algorithm, so we guesswork it based on the OpenSSL names.
  'sha3',
  'sha3-256', 'sha3-384', 'sha3-512',
  'sha3_256', 'sha3_384', 'sha3_512'
].filter(algo => NODE_HASHES.has(algo));
