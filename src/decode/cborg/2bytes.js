// @ts-check

import { Token, Type } from './token'
import { assertEnoughData, decodeErrPrefix } from './common'
import { readUint8, readUint16, readUint32, readUint64 } from './0uint'
import { compare, slice } from './byte-utils'

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} prefix
 * @param {number} length
 * @returns {Token}
 */
function toToken (data, pos, prefix, length) {
  assertEnoughData(data, pos, prefix + length)
  const buf = slice(data, pos + prefix, pos + prefix + length)
  return new Token(Type.bytes, buf, prefix + length)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} minor
 * @param {import('./decode').DecodeOptions} _options
 * @returns {Token}
 */
export function decodeBytesCompact (data, pos, minor, _options) {
  return toToken(data, pos, 1, minor)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes8 (data, pos, _minor, options) {
  return toToken(data, pos, 2, readUint8(data, pos + 1, options))
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes16 (data, pos, _minor, options) {
  return toToken(data, pos, 3, readUint16(data, pos + 1, options))
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes32 (data, pos, _minor, options) {
  return toToken(data, pos, 5, readUint32(data, pos + 1, options))
}

// TODO: maybe we shouldn't support this ..
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode').DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes64 (data, pos, _minor, options) {
  const l = readUint64(data, pos + 1, options)
  if (typeof l === 'bigint') {
    throw new Error(`${decodeErrPrefix} 64-bit integer bytes lengths not supported`)
  }
  return toToken(data, pos, 9, l)
}

/**
 * @param {Uint8Array} b1
 * @param {Uint8Array} b2
 * @returns {number}
 */
export function compareBytes (b1, b2) {
  return b1.length < b2.length ? -1 : b1.length > b2.length ? 1 : compare(b1, b2)
}
