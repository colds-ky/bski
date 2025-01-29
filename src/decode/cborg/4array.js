// @ts-check

import { Token, Type } from './token'
import { readUint8, readUint16, readUint32, readUint64 } from './0uint'
import { decodeErrPrefix } from './common'

/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} prefix
 * @param {number} length
 * @returns {Token}
 */
function toToken (_data, _pos, prefix, length) {
  return new Token(Type.array, length, prefix)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} minor
 * @param {import('./decode.js').DecodeOptions} _options
 * @returns {Token}
 */
export function decodeArrayCompact (data, pos, minor, _options) {
  return toToken(data, pos, 1, minor)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeArray8 (data, pos, _minor, options) {
  return toToken(data, pos, 2, readUint8(data, pos + 1, options))
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeArray16 (data, pos, _minor, options) {
  return toToken(data, pos, 3, readUint16(data, pos + 1, options))
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeArray32 (data, pos, _minor, options) {
  return toToken(data, pos, 5, readUint32(data, pos + 1, options))
}

// TODO: maybe we shouldn't support this ..
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeArray64 (data, pos, _minor, options) {
  const l = readUint64(data, pos + 1, options)
  if (typeof l === 'bigint') {
    throw new Error(`${decodeErrPrefix} 64-bit integer array lengths not supported`)
  }
  return toToken(data, pos, 9, l)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeArrayIndefinite (data, pos, _minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`)
  }
  return toToken(data, pos, 1, Infinity)
}
