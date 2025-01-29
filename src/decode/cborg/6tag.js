// @ts-check

import { Token, Type } from './token.js'
import * as uint from './0uint.js'

/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} minor
 * @param {import('./decode.js').DecodeOptions} _options
 * @returns {Token}
 */
export function decodeTagCompact (_data, _pos, minor, _options) {
  return new Token(Type.tag, minor, 1)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeTag8 (data, pos, _minor, options) {
  return new Token(Type.tag, uint.readUint8(data, pos + 1, options), 2)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeTag16 (data, pos, _minor, options) {
  return new Token(Type.tag, uint.readUint16(data, pos + 1, options), 3)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeTag32 (data, pos, _minor, options) {
  return new Token(Type.tag, uint.readUint32(data, pos + 1, options), 5)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {import('./decode.js').DecodeOptions} options
 * @returns {Token}
 */
export function decodeTag64 (data, pos, _minor, options) {
  return new Token(Type.tag, uint.readUint64(data, pos + 1, options), 9)
}
