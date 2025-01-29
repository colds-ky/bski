import { encode as varint_encode, decode as varint_decode, encodingLength as varint_encodingLength } from './vendor-varint/varint'

/**
 * @param {Uint8Array} data
 * @param {number} [offset]
 * @returns {[number, number]}
 */
export function decode (data, offset = 0) {
  const code = varint_decode(data, offset)
  return [code, varint_decode.bytes]
}

/**
 * @param {number} int
 * @param {Uint8Array} target
 * @param {number} [offset]
 * @returns {Uint8Array}
 */
export function encodeTo (int, target, offset = 0) {
  varint_encode(int, target, offset)
  return target
}

/** @param {number} int */
export function encodingLength (int) {
  return varint_encodingLength(int)
}
