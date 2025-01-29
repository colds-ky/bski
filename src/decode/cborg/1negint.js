// @ts-check

/* eslint-env es2020 */

import { Token, Type } from './token.js'
import { readUint8, readUint16, readUint32, readUint64 } from './0uint.js'
import { decodeErrPrefix } from './common.js'

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint8 (data, pos, _minor, options) {
  return new Token(Type.negint, -1 - readUint8(data, pos + 1, options), 2)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint16 (data, pos, _minor, options) {
  return new Token(Type.negint, -1 - readUint16(data, pos + 1, options), 3)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint32 (data, pos, _minor, options) {
  return new Token(Type.negint, -1 - readUint32(data, pos + 1, options), 5)
}

const neg1b = BigInt(-1)
const pos1b = BigInt(1)

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint64 (data, pos, _minor, options) {
  const int = readUint64(data, pos + 1, options)
  if (typeof int !== 'bigint') {
    const value = -1 - int
    if (value >= Number.MIN_SAFE_INTEGER) {
      return new Token(Type.negint, value, 9)
    }
  }
  if (options.allowBigInt !== true) {
    throw new Error(`${decodeErrPrefix} integers outside of the safe integer range are not supported`)
  }
  return new Token(Type.negint, neg1b - BigInt(int), 9)
}
