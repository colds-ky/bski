// @ts-check

import { decode as cborg_decode } from '../cborg/decode'
import { decode as decodeCID } from '../js-multiformats/cid'

// https://github.com/ipfs/go-ipfs/issues/3570#issuecomment-273931692
const CID_CBOR_TAG = 42

/**
 * @param {ArrayBuffer | Uint8Array} buf
 */
export function toByteView(buf) {
  if (buf instanceof ArrayBuffer) {
    return new Uint8Array(buf, 0, buf.byteLength)
  }

  return buf
}

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * Intercept all `undefined` values from an object walk and reject the entire
 * object if we find one.
 *
 * @returns {null}
 */
function undefinedEncoder() {
  throw new Error('`undefined` is not supported by the IPLD Data Model and cannot be encoded')
}

/**
 * Intercept all `number` values from an object walk and reject the entire
 * object if we find something that doesn't fit the IPLD data model (NaN &
 * Infinity).
 *
 * @param {number} num
 * @returns {null}
 */
function numberEncoder(num) {
  if (Number.isNaN(num)) {
    throw new Error('`NaN` is not supported by the IPLD Data Model and cannot be encoded')
  }
  if (num === Infinity || num === -Infinity) {
    throw new Error('`Infinity` and `-Infinity` is not supported by the IPLD Data Model and cannot be encoded')
  }
  return null
}

const _encodeOptions = {
  float64: true,
  typeEncoders: {
    undefined: undefinedEncoder,
    number: numberEncoder
  }
}

const encodeOptions = {
  ..._encodeOptions,
  typeEncoders: {
    ..._encodeOptions.typeEncoders
  }
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function cidDecoder(bytes) {
  if (bytes[0] !== 0) {
    throw new Error('Invalid CID for CBOR tag 42; expected leading 0x00')
  }
  return decodeCID(bytes.subarray(1)) // ignore leading 0x00
}

const _decodeOptions = {
  allowIndefinite: false,
  coerceUndefinedToNull: true,
  allowNaN: false,
  allowInfinity: false,
  allowBigInt: true, // this will lead to BigInt for ints outside of
  // safe-integer range, which may surprise users
  strict: true,
  useMaps: false,
  rejectDuplicateMapKeys: true,
  /** @type {NonNullable<import('../cborg/decode').DecodeOptions['tags']>} */
  tags: []
}
_decodeOptions.tags[CID_CBOR_TAG] = cidDecoder

/**
 * @param {ArrayBuffer | Uint8Array} data
 */
export const decode = (data) => cborg_decode(toByteView(data), _decodeOptions)
