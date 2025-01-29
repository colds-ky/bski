// @ts-check

import { encode as CID_encode } from '../../cbor/cid';
import { decode as varint_decode } from '../../cbor/varint';
import { decode as CBOR_decode } from '../../cbor/decode';

/**
 * @typedef {{
 *  version: 1;
 *  roots: string[];
 * }} CarV1Header
 */

/** @returns {value is CarV1Header} */
const isCarV1Header = (value) => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const { version, roots } = value;
  return version === 1 && Array.isArray(roots) && roots.every((root) => typeof root === 'string');
};

/**
 * @param {import('./byte-reader').SyncByteReader} reader
 * @param {number} size
 */
const readVarint = (reader, size) => {
  const buf = reader.upto(size);
  if (buf.length === 0) {
    throw new RangeError(`unexpected end of data`);
  }

  const [int, read] = varint_decode(buf);
  reader.seek(read);

  return int;
};

/**
 * @param {import('./byte-reader').SyncByteReader} reader
 */
const readHeader = (reader) => {
  const length = readVarint(reader, 8);
  if (length === 0) {
    throw new RangeError(`invalid car header; length=0`);
  }

  const rawHeader = reader.exactly(length, true);
  const header = CBOR_decode(rawHeader);
  if (!isCarV1Header(header)) {
    throw new TypeError(`expected a car v1 archive`);
  }

  return header;
};

/**
 * @param {import('./byte-reader').SyncByteReader} reader
 */
const readMultihashDigest = (reader) => {
  const first = reader.upto(8);

  const [code, codeOffset] = varint_decode(first);
  const [size, sizeOffset] = varint_decode(first.subarray(codeOffset));

  const offset = codeOffset + sizeOffset;

  const bytes = reader.exactly(offset + size, true);
  const digest = bytes.subarray(offset);

  return {
    code: code,
    size: size,
    digest: digest,
    bytes: bytes,
  };
};

/**
 * @param {import('./byte-reader').SyncByteReader} reader
 */
const readCid = (reader) => {
  const version = readVarint(reader, 8);
  if (version !== 1) {
    throw new Error(`expected a cidv1`);
  }

  const codec = readVarint(reader, 8);
  const digest = readMultihashDigest(reader);

  const cid = {
    version: version,
    code: codec,
    digest: digest,
    bytes: CID_encode(version, codec, digest.bytes),
  };

  return cid;
};

/**
 * @param {import('./byte-reader').SyncByteReader} reader
 */
const readBlockHeader = (reader) => {
  const start = reader.pos;

  let size = readVarint(reader, 8);
  if (size === 0) {
    throw new Error(`invalid car section; length=0`);
  }

  size += reader.pos - start;

  const cid = readCid(reader);
  const blockSize = size - Number(reader.pos - start);

  return { cid, blockSize };
};

/**
 * @param {import('./byte-reader').SyncByteReader} reader
 */
export const createCarReader = (reader) => {
  const { roots } = readHeader(reader);

  return {
    roots,
    /** @returns {Generator<{ cid: import('../../cbor/cid').CID; bytes: Uint8Array }>} */
    *iterate() {
      while (reader.upto(8).length > 0) {
        const { cid, blockSize } = readBlockHeader(reader);
        const bytes = reader.exactly(blockSize, true);

        yield { cid, bytes };
      }
    },
  };
};
