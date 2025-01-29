// @ts-check

import { coerce } from './bytes'
import * as Digest from './digest'
import * as varint from './varint'
import { baseX, rfc4648 } from './base'

/** @typedef {Object} UnknownLink */

export function create(version, code, digest) {
  const cidInst = CIDClass.create(version, code, digest);
  const cidStr = cidInst.toString();
  return cidStr;
}

export function decode(bytes) {
  const cidInst = CIDClass.decode(bytes);
  const cidStr = cidInst.toString();
  return cidStr;
}

function format(link, base) {
  const { bytes, version } = link
  switch (version) {
    case 0:
      return toStringV0(
        bytes,
        baseCache(link),
        base ?? base58btc.encoder
      )
    default:
      return toStringV1(
        bytes,
        baseCache(link),
        (base ?? base32.encoder)
      )
  }
}

/** @type {WeakMap<UnknownLink, Map<string, string>>} */
const cache = new WeakMap()

function baseCache (cid) {
  const baseCache = cache.get(cid)
  if (baseCache == null) {
    const baseCache = new Map()
    cache.set(cid, baseCache)
    return baseCache
  }
  return baseCache
}

class CIDClass {

  /**
   * @param {number} version - Version of the CID
   * @param {number} code - Code of the codec content is encoded in, see https://github.com/multiformats/multicodec/blob/master/table.csv
   * @param multihash - (Multi)hash of the of the content.
   */
  constructor (version, code, multihash, bytes) {
    this.code = code
    this.version = version
    this.multihash = multihash
    this.bytes = bytes
  }
 
  toString (base) {
    return format(this, base)
  }

  /**
   * @param {0|1} version - Version of the CID
   * @param {number} code - Code of the codec content is encoded in, see https://github.com/multiformats/multicodec/blob/master/table.csv
   * @param digest - (Multi)hash of the of the content.
   */
  static create(version, code, digest) {
    if (typeof code !== 'number') {
      throw new Error('String codecs are no longer supported')
    }

    if (!(digest.bytes instanceof Uint8Array)) {
      throw new Error('Invalid digest')
    }

    switch (version) {
      case 0: {
        if (code !== DAG_PB_CODE) {
          throw new Error(
            `Version 0 CID must use dag-pb (code: ${DAG_PB_CODE}) block encoding`
          )
        } else {
          return new CIDClass(version, code, digest, digest.bytes)
        }
      }
      case 1: {
        const bytes = encodeCID(version, code, digest.bytes)
        return new CIDClass(version, code, digest, bytes)
      }
      default: {
        throw new Error('Invalid version')
      }
    }
  }

  /**
   * Simplified version of `create` for CIDv0.
   */
  static createV0(digest) {
    return CIDClass.create(0, DAG_PB_CODE, digest)
  }

  /**
   * Simplified version of `create` for CIDv1.
   *
   * @param code - Content encoding format code.
   * @param digest - Multihash of the content.
   */
  static createV1(code, digest) {
    return CIDClass.create(1, code, digest)
  }

  /**
   * Decoded a CID from its binary representation at the beginning of a byte
   * array.
   *
   * Returns an array with the first element containing the CID and the second
   * element containing the remainder of the original byte array. The remainder
   * will be a zero-length byte array if the provided bytes only contained a
   * binary CID representation.
   */
  static decode(bytes) {
    const specs = CIDClass.inspectBytes(bytes)
    const prefixSize = specs.size - specs.multihashSize
    const multihashBytes = coerce(
      bytes.subarray(prefixSize, prefixSize + specs.multihashSize)
    )
    if (multihashBytes.byteLength !== specs.multihashSize) {
      throw new Error('Incorrect length')
    }
    const digestBytes = multihashBytes.subarray(
      specs.multihashSize - specs.digestSize
    )
    const digest = new Digest.Digest(
      specs.multihashCode,
      specs.digestSize,
      digestBytes,
      multihashBytes
    )
    const cid =
      specs.version === 0
        ? CIDClass.createV0(digest)
        : CIDClass.createV1(specs.codec, digest)

    if (specs.size !== bytes.byteLength) {
      throw new Error('Incorrect length')
    }

    return cid
  }

  /**
   * Inspect the initial bytes of a CID to determine its properties.
   *
   * Involves decoding up to 4 varints. Typically this will require only 4 to 6
   * bytes but for larger multicodec code values and larger multihash digest
   * lengths these varints can be quite large. It is recommended that at least
   * 10 bytes be made available in the `initialBytes` argument for a complete
   * inspection.
   * @param {Uint8Array} initialBytes
   */
  static inspectBytes (initialBytes) {
    let offset = 0
    const next = () => {
      const [i, length] = varint.decode(initialBytes.subarray(offset))
      offset += length
      return i
    }

    let version = next()
    let codec = DAG_PB_CODE
    if (version === 18) {
      // CIDv0
      version = 0
      offset = 0
    } else {
      codec = next()
    }

    if (version !== 0 && version !== 1) {
      throw new RangeError(`Invalid CID version ${version}`)
    }

    const prefixSize = offset
    const multihashCode = next() // multihash code
    const digestSize = next() // multihash length
    const size = offset + digestSize
    const multihashSize = size - prefixSize

    return { version, codec, multihashCode, digestSize, multihashSize, size }
  }


}

function toStringV0 (bytes, cache, base) {
  const { prefix } = base
  if (prefix !== base58btc.prefix) {
    throw Error(`Cannot string encode V0 in ${base.name} encoding`)
  }

  const cid = cache.get(prefix)
  if (cid == null) {
    const cid = base.encode(bytes).slice(1)
    cache.set(prefix, cid)
    return cid
  } else {
    return cid
  }
}

function toStringV1(bytes, cache, base) {
  const { prefix } = base
  const cid = cache.get(prefix)
  if (cid == null) {
    const cid = base.encode(bytes)
    cache.set(prefix, cid)
    return cid
  } else {
    return cid
  }
}

const DAG_PB_CODE = 0x70
const SHA_256_CODE = 0x12

function encodeCID (version, code, multihash) {
  const codeOffset = varint.encodingLength(version)
  const hashOffset = codeOffset + varint.encodingLength(code)
  const bytes = new Uint8Array(hashOffset + multihash.byteLength)
  varint.encodeTo(version, bytes, 0)
  varint.encodeTo(code, bytes, codeOffset)
  bytes.set(multihash, hashOffset)
  return bytes
}

const base32 = rfc4648({
  prefix: 'b',
  name: 'base32',
  alphabet: 'abcdefghijklmnopqrstuvwxyz234567',
  bitsPerChar: 5
})

const base58btc = baseX({
  name: 'base58btc',
  prefix: 'z',
  alphabet: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
})