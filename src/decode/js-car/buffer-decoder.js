// @ts-check

import { decode as decodeDagCbor } from '../js-dag-cbor/decode.js'
import { create as createCID } from '../js-multiformats/cid'
import * as Digest from '../js-multiformats/digest'
import { CIDV0_BYTES, decodeV2Header, decodeVarint, getMultihashLength, V2_HEADER_LENGTH } from './decoder-common.js'

/**
 * @typedef {{
 *  seek(length: number): void
 * }} Seekable
 *
 * @typedef {Seekable & {
 *  upTo(length: number): Uint8Array
 *  exactly(length: number, seek?: boolean): Uint8Array
 *  pos: number
 * }} BytesBufferReader
 */

/**
 * Reads header data from a `BytesReader`. The header may either be in the form
 * of a `CarHeader` or `CarV2Header` depending on the CAR being read.
 *
 * @name decoder.readHeader(reader)
 * @param {BytesBufferReader} reader
 * @param {number} [strictVersion]
 * @returns {import('./buffer-reader-browser').CarHeader | import('./buffer-reader-browser').CarV2Header}
 */
function readHeader (reader, strictVersion) {
  const length = decodeVarint(reader.upTo(8), reader)
  if (length === 0) {
    throw new Error('Invalid CAR header (zero length)')
  }
  const header = reader.exactly(length, true)
  const block = decodeDagCbor(header)
  // if (CarV1HeaderOrV2Pragma.toTyped(block) === undefined) {
  //   throw new Error('Invalid CAR header format')
  // }
  if ((block.version !== 1 && block.version !== 2) || (strictVersion !== undefined && block.version !== strictVersion)) {
    throw new Error(`Invalid CAR version: ${block.version}${strictVersion !== undefined ? ` (expected ${strictVersion})` : ''}`)
  }
  if (block.version === 1) {
    // CarV1HeaderOrV2Pragma makes roots optional, let's make it mandatory
    if (!Array.isArray(block.roots)) {
      throw new Error('Invalid CAR header format')
    }
    return block
  }
  // version 2
  if (block.roots !== undefined) {
    throw new Error('Invalid CAR header format')
  }
  const v2Header = decodeV2Header(reader.exactly(V2_HEADER_LENGTH, true))
  reader.seek(v2Header.dataOffset - reader.pos)
  const v1Header = readHeader(reader, 1)
  return Object.assign(v1Header, v2Header)
}

/**
 * Reads CID sync
 *
 * @param {BytesBufferReader} reader
 * @returns {string}
 */
function readCid (reader) {
  const first = reader.exactly(2, false)
  if (first[0] === CIDV0_BYTES.SHA2_256 && first[1] === CIDV0_BYTES.LENGTH) {
    // cidv0 32-byte sha2-256
    const bytes = reader.exactly(34, true)
    const multihash = Digest.decode(bytes)
    return createCID(0, CIDV0_BYTES.DAG_PB, multihash)
  }

  const version = decodeVarint(reader.upTo(8), reader)
  if (version !== 1) {
    throw new Error(`Unexpected CID version (${version})`)
  }
  const codec = decodeVarint(reader.upTo(8), reader)
  const bytes = reader.exactly(getMultihashLength(reader.upTo(8)), true)
  const multihash = Digest.decode(bytes)
  return createCID(version, codec, multihash)
}

/**
 * Reads the leading data of an individual block from CAR data from a
 * `BytesBufferReader`. Returns a `BlockHeader` object which contains
 * `{ cid, length, blockLength }` which can be used to either index the block
 * or read the block binary data.
 *
 * @name async decoder.readBlockHead(reader)
 * @param {BytesBufferReader} reader
 */
function readBlockHead (reader) {
  // length includes a CID + Binary, where CID has a variable length
  // we have to deal with
  const start = reader.pos
  let length = decodeVarint(reader.upTo(8), reader)
  if (length === 0) {
    throw new Error('Invalid CAR section (zero length)')
  }
  length += (reader.pos - start)
  const cid = readCid(reader)
  const blockLength = length - Number(reader.pos - start) // subtract CID length

  return { cid, length, blockLength }
}

/**
 * Returns Car header and blocks from a Uint8Array
 *
 * @param {Uint8Array} bytes
 * @returns {{ header : import('./buffer-reader-browser').CarHeader | import('./buffer-reader-browser').CarV2Header , blocks: import('./buffer-reader-browser').Block[]}}
 */
export function fromBytes (bytes) {
  let reader = bytesReader(bytes)
  const header = readHeader(reader)
  if (header.version === 2) {
    const v1length = reader.pos - header.dataOffset
    reader = limitReader(reader, header.dataSize - v1length)
  }

  const blocks = []
  while (reader.upTo(8).length > 0) {
    const { cid, blockLength } = readBlockHead(reader)

    blocks.push({ cid, bytes: reader.exactly(blockLength, true) })
  }

  return {
    header, blocks
  }
}

/**
 * Creates a `BytesBufferReader` from a `Uint8Array`.
 *
 * @name decoder.bytesReader(bytes)
 * @param {Uint8Array} bytes
 * @returns {BytesBufferReader}
 */
function bytesReader (bytes) {
  let pos = 0

  /** @type {BytesBufferReader} */
  return {
    upTo (length) {
      return bytes.subarray(pos, pos + Math.min(length, bytes.length - pos))
    },

    exactly (length, seek = false) {
      if (length > bytes.length - pos) {
        throw new Error('Unexpected end of data')
      }

      const out = bytes.subarray(pos, pos + length)
      if (seek) {
        pos += length
      }
      return out
    },

    seek (length) {
      pos += length
    },

    get pos () {
      return pos
    }
  }
}

/**
 * Wraps a `BytesBufferReader` in a limiting `BytesBufferReader` which limits maximum read
 * to `byteLimit` bytes. It _does not_ update `pos` of the original
 * `BytesBufferReader`.
 *
 * @name decoder.limitReader(reader, byteLimit)
 * @param {BytesBufferReader} reader
 * @param {number} byteLimit
 * @returns {BytesBufferReader}
 */
function limitReader (reader, byteLimit) {
  let bytesRead = 0

  /** @type {BytesBufferReader} */
  return {
    upTo (length) {
      let bytes = reader.upTo(length)
      if (bytes.length + bytesRead > byteLimit) {
        bytes = bytes.subarray(0, byteLimit - bytesRead)
      }
      return bytes
    },

    exactly (length, seek = false) {
      const bytes = reader.exactly(length, seek)
      if (bytes.length + bytesRead > byteLimit) {
        throw new Error('Unexpected end of data')
      }
      if (seek) {
        bytesRead += length
      }
      return bytes
    },

    seek (length) {
      bytesRead += length
      reader.seek(length)
    },

    get pos () {
      return reader.pos
    }
  }
}
