// @ts-check

// TODO: shift some of the bytes logic to bytes-utils so we can use Buffer
// where possible

import { Token, Type } from './token.js'
import { decodeErrPrefix } from './common.js'

const MINOR_FALSE = 20
const MINOR_TRUE = 21
const MINOR_NULL = 22
const MINOR_UNDEFINED = 23

/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeUndefined (_data, _pos, _minor, options) {
  if (options.allowUndefined === false) {
    throw new Error(`${decodeErrPrefix} undefined values are not supported`)
  } else if (options.coerceUndefinedToNull === true) {
    return new Token(Type.null, null, 1)
  }
  return new Token(Type.undefined, undefined, 1)
}

/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeBreak (_data, _pos, _minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`)
  }
  return new Token(Type.break, undefined, 1)
}

/**
 * @param {number} value
 * @param {number} bytes
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
function createToken (value, bytes, options) {
  if (options) {
    if (options.allowNaN === false && Number.isNaN(value)) {
      throw new Error(`${decodeErrPrefix} NaN values are not supported`)
    }
    if (options.allowInfinity === false && (value === Infinity || value === -Infinity)) {
      throw new Error(`${decodeErrPrefix} Infinity values are not supported`)
    }
  }
  return new Token(Type.float, value, bytes)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeFloat16 (data, pos, _minor, options) {
  return createToken(readFloat16(data, pos + 1), 3, options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeFloat32 (data, pos, _minor, options) {
  return createToken(readFloat32(data, pos + 1), 5, options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeFloat64 (data, pos, _minor, options) {
  return createToken(readFloat64(data, pos + 1), 9, options)
}

/**
 * @param {Uint8Array} ui8a
 * @param {number} pos
 * @returns {number}
 */
function readFloat16 (ui8a, pos) {
  if (ui8a.length - pos < 2) {
    throw new Error(`${decodeErrPrefix} not enough data for float16`)
  }

  const half = (ui8a[pos] << 8) + ui8a[pos + 1]
  if (half === 0x7c00) {
    return Infinity
  }
  if (half === 0xfc00) {
    return -Infinity
  }
  if (half === 0x7e00) {
    return NaN
  }
  const exp = (half >> 10) & 0x1f
  const mant = half & 0x3ff
  let val
  if (exp === 0) {
    val = mant * (2 ** -24)
  } else if (exp !== 31) {
    val = (mant + 1024) * (2 ** (exp - 25))
  /* c8 ignore next 4 */
  } else {
    // may not be possible to get here
    val = mant === 0 ? Infinity : NaN
  }
  return (half & 0x8000) ? -val : val
}

/**
 * @param {Uint8Array} ui8a
 * @param {number} pos
 * @returns {number}
 */
function readFloat32 (ui8a, pos) {
  if (ui8a.length - pos < 4) {
    throw new Error(`${decodeErrPrefix} not enough data for float32`)
  }
  const offset = (ui8a.byteOffset || 0) + pos
  return new DataView(ui8a.buffer, offset, 4).getFloat32(0, false)
}

/**
 * @param {Uint8Array} ui8a
 * @param {number} pos
 * @returns {number}
 */
function readFloat64 (ui8a, pos) {
  if (ui8a.length - pos < 8) {
    throw new Error(`${decodeErrPrefix} not enough data for float64`)
  }
  const offset = (ui8a.byteOffset || 0) + pos
  return new DataView(ui8a.buffer, offset, 8).getFloat64(0, false)
}
