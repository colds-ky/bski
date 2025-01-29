// @ts-check

/**
 * Raw digest information
 * @typedef {{
 *  code: number;
 *  size: number;
 *  digest: Uint8Array;
 *  bytes: Uint8Array;
 * }} Digest
 */

/**
 * CID information
 * @typedef {{
 *  version: number;
 *  code: number;
 *  digest: Digest;
 *  bytes: Uint8Array;
 * }} CID
 */


/**
 * @module
 * Bare minimum implementation for creating, parsing, and formatting
 * AT Protocol-blessed CIDv1 format.
 *
 * As specified by AT Protocol, the blessed format is:
 * - Multibase: `base32` (b)
 * - Multicodec: `dag-cbor` (0x71) for record, `raw` (0x55) for blobs
 * - Multihash: `sha-256` (0x12)
 */
import { fromBase32, toBase32 } from '../multibase/base32';

import { decode as varint_decode, encode as varint_encode, encodingLength as varint_encodingLength } from './varint';

/**
 * Parse a CID string
 */
export const parse = (cid) => {
  if (cid[0] !== 'b') {
    throw new Error(`only base32 cidv1 is supported`);
  }
  const bytes = fromBase32(cid.slice(1));
  return decode(bytes);
};
/**
 * Provides information regarding the CID buffer
 */
export const inspect = (initialBytes) => {
  let offset = 0;
  const next = () => {
    const [i, length] = varint_decode(initialBytes.subarray(offset));
    offset += length;
    return i;
  };
  let version = next();
  let codec = 0x70; // dag-pb
  if (version === 18) {
    // CIDv0
    version = 0;
    offset = 0;
  }
  else {
    codec = next();
  }
  if (version !== 1) {
    throw new RangeError(`only cidv1 is supported`);
  }
  const prefixSize = offset;
  const multihashCode = next();
  const digestSize = next();
  const size = offset + digestSize;
  const multihashSize = size - prefixSize;
  return { version, codec, multihashCode, digestSize, multihashSize, size };
};
/**
 * Decode the first CID contained, and return the remainder.
 * @param bytes Buffer to decode
 * @returns A tuple containing the first CID in the buffer, and the remainder
 */
export const decodeFirst = (bytes) => {
  const specs = inspect(bytes);
  const prefixSize = specs.size - specs.multihashSize;
  const multihashBytes = bytes.subarray(prefixSize, prefixSize + specs.multihashSize);
  if (multihashBytes.byteLength !== specs.multihashSize) {
    throw new RangeError('incorrect cid length');
  }
  const digestBytes = multihashBytes.subarray(specs.multihashSize - specs.digestSize);
  const digest = {
    code: specs.multihashCode,
    size: specs.multihashSize,
    digest: digestBytes,
    bytes: multihashBytes,
  };
  const cid = {
    version: 1,
    code: specs.codec,
    digest: digest,
    bytes: bytes.subarray(0, specs.size),
  };
  return [cid, bytes.subarray(specs.size)];
};
/**
 * Decodes a CID buffer
 */
export const decode = (bytes) => {
  const [cid, remainder] = decodeFirst(bytes);
  if (remainder.length !== 0) {
    throw new Error(`incorrect cid length`);
  }
  return cid;
};
/**
 * Creates a CID
 */
export const create = async (code, input) => {
  const digest = createDigest(0x12, new Uint8Array(await crypto.subtle.digest('sha-256', input)));
  const bytes = encode(1, code, digest.bytes);
  return {
    version: 1,
    code: code,
    digest: digest,
    bytes: bytes,
  };
};
/**
 * Serialize CID into a string
 */
export const format = (cid) => {
  return 'b' + toBase32(cid.bytes);
};
export const createDigest = (code, digest) => {
  const size = digest.byteLength;
  const sizeOffset = varint_encodingLength(code);
  const digestOffset = sizeOffset + varint_encodingLength(size);
  const bytes = new Uint8Array(digestOffset + size);
  varint_encode(code, bytes, 0);
  varint_encode(size, bytes, sizeOffset);
  bytes.set(digest, digestOffset);
  return {
    code: code,
    size: size,
    digest: digest,
    bytes: bytes,
  };
};
export const encode = (version, code, multihash) => {
  const codeOffset = varint_encodingLength(version);
  const hashOffset = codeOffset + varint_encodingLength(code);
  const bytes = new Uint8Array(hashOffset + multihash.byteLength);
  varint_encode(version, bytes, 0);
  varint_encode(code, bytes, codeOffset);
  bytes.set(multihash, hashOffset);
  return bytes;
};
