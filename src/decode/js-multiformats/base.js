// @ts-check

import { basex } from './vendor-varint/base-x'

/** @typedef {(bytes: Uint8Array) => string} EncodeFn */

/**
 * Class represents both BaseEncoder and MultibaseEncoder meaning it
 * can be used to encode to multibase or base encode without multibase
 * prefix.
 */
class Encoder {

  /**
   * @param {string} name
   * @param {string} prefix
   * @param {EncodeFn} baseEncode
   */
  constructor(name, prefix, baseEncode) {
    this.name = name
    this.prefix = prefix
    this.baseEncode = baseEncode
  }

  encode(bytes) {
    if (bytes instanceof Uint8Array) {
      return `${this.prefix}${this.baseEncode(bytes)}`
    } else {
      throw Error('Unknown type, must be binary type')
    }
  }
}

export class Codec {
  /**
   * @param {string} name
   * @param {string} prefix
   * @param {EncodeFn} baseEncode
   */
  constructor(name, prefix, baseEncode) {
    this.name = name
    this.prefix = prefix
    this.baseEncode = baseEncode
    this.encoder = new Encoder(name, prefix, baseEncode)
  }

  /**
   * @param {Uint8Array} input
   */
  encode(input) {
    return this.encoder.encode(input)
  }
}

/**
 * @param {{
 *  name: string,
 *  prefix: string,
 *  encode: EncodeFn
 * }} _
 */
export function from({ name, prefix, encode }) {
  return new Codec(name, prefix, encode)
}

/**
 * @param {{
 *  name: string,
 *  prefix: string,
 *  alphabet: string
 * }} _
 */
export function baseX({ name, prefix, alphabet }) {
  const { encode } = basex(alphabet, name)
  return from({
    prefix,
    name,
    encode,
  })
}

/**
 * 
 * @param {Uint8Array} data
 * @param {string} alphabet
 * @param {number} bitsPerChar
 */
function encode(data, alphabet, bitsPerChar) {
  const pad = alphabet[alphabet.length - 1] === '='
  const mask = (1 << bitsPerChar) - 1
  let out = ''

  let bits = 0 // Number of bits currently in the buffer
  let buffer = 0 // Bits waiting to be written out, MSB first
  for (let i = 0; i < data.length; ++i) {
    // Slurp data into the buffer:
    buffer = (buffer << 8) | data[i]
    bits += 8

    // Write out as much as we can:
    while (bits > bitsPerChar) {
      bits -= bitsPerChar
      out += alphabet[mask & (buffer >> bits)]
    }
  }

  // Partial character:
  if (bits !== 0) {
    out += alphabet[mask & (buffer << (bitsPerChar - bits))]
  }

  // Add padding characters until we hit a byte boundary:
  if (pad) {
    while (((out.length * bitsPerChar) & 7) !== 0) {
      out += '='
    }
  }

  return out
}

/**
 * RFC4648 Factory
 * @param { { name: string, prefix: string, bitsPerChar: number, alphabet: string }} _
 */
export function rfc4648({ name, prefix, bitsPerChar, alphabet }) {
  return from({
    prefix,
    name,
    encode(input) {
      return encode(input, alphabet, bitsPerChar)
    },
  })
}
