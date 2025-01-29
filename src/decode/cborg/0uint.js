// @ts-check
/* globals BigInt */

import { Token, Type } from './token.js'
import { decodeErrPrefix, assertEnoughData } from './common.js'

export const uintBoundaries = [24, 256, 65536, 4294967296, BigInt('18446744073709551616')]

/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {number}
 */
export function readUint8 (data, offset, options) {
  assertEnoughData(data, offset, 1)
  const value = data[offset]
  if (options.strict === true && value < uintBoundaries[0]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  return value
}

/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {number}
 */
export function readUint16 (data, offset, options) {
  assertEnoughData(data, offset, 2)
  const value = (data[offset] << 8) | data[offset + 1]
  if (options.strict === true && value < uintBoundaries[1]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  return value
}

/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {number}
 */
export function readUint32 (data, offset, options) {
  assertEnoughData(data, offset, 4)
  const value = (data[offset] * 16777216 /* 2 ** 24 */) + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3]
  if (options.strict === true && value < uintBoundaries[2]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  return value
}

/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {number|bigint}
 */
export function readUint64 (data, offset, options) {
  // assume BigInt, convert back to Number if within safe range
  assertEnoughData(data, offset, 8)
  const hi = (data[offset] * 16777216 /* 2 ** 24 */) + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3]
  const lo = (data[offset + 4] * 16777216 /* 2 ** 24 */) + (data[offset + 5] << 16) + (data[offset + 6] << 8) + data[offset + 7]
  const value = (BigInt(hi) << BigInt(32)) + BigInt(lo)
  if (options.strict === true && value < uintBoundaries[3]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  if (value <= Number.MAX_SAFE_INTEGER) {
    return Number(value)
  }
  if (options.allowBigInt === true) {
    return value
  }
  throw new Error(`${decodeErrPrefix} integers outside of the safe integer range are not supported`)
}

/* not required thanks to quick[] list
const oneByteTokens = new Array(24).fill(0).map((v, i) => new Token(Type.uint, i, 1))
export function decodeUintCompact (data, pos, minor, options) {
  return oneByteTokens[minor]
}
*/

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeUint8 (data, pos, _minor, options) {
  return new Token(Type.uint, readUint8(data, pos + 1, options), 2)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeUint16 (data, pos, _minor, options) {
  return new Token(Type.uint, readUint16(data, pos + 1, options), 3)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeUint32 (data, pos, _minor, options) {
  return new Token(Type.uint, readUint32(data, pos + 1, options), 5)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeUint64 (data, pos, _minor, options) {
  return new Token(Type.uint, readUint64(data, pos + 1, options), 9)
}
