// @ts-check

import { Token, Type } from './token'
import { assertEnoughData, decodeErrPrefix } from './common'
import { readUint8, readUint16, readUint32, readUint64 } from './0uint'
import { toString, slice } from './byte-utils'

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} prefix
 * @param {number} length
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
function toToken (data, pos, prefix, length, options) {
  const totLength = prefix + length
  assertEnoughData(data, pos, totLength)
  const tok = new Token(Type.string, toString(data, pos + prefix, pos + totLength), totLength)
  if (options.retainStringBytes === true) {
    tok.byteValue = slice(data, pos + prefix, pos + totLength)
  }
  return tok
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeStringCompact (data, pos, minor, options) {
  return toToken(data, pos, 1, minor, options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeString8 (data, pos, _minor, options) {
  return toToken(data, pos, 2, readUint8(data, pos + 1, options), options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeString16 (data, pos, _minor, options) {
  return toToken(data, pos, 3, readUint16(data, pos + 1, options), options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeString32 (data, pos, _minor, options) {
  return toToken(data, pos, 5, readUint32(data, pos + 1, options), options)
}

// TODO: maybe we shouldn't support this ..
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeString64 (data, pos, _minor, options) {
  const l = readUint64(data, pos + 1, options)
  if (typeof l === 'bigint') {
    throw new Error(`${decodeErrPrefix} 64-bit integer string lengths not supported`)
  }
  return toToken(data, pos, 9, l, options)
}
