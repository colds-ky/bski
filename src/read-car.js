// @ts-check

import { decode as decodeCBOR } from './decode/cbor-x/decoder';
import { decode as decodeCID } from './decode/js-multiformats/cid';
import { CarBufferReader } from './decode/js-car/buffer-reader-browser';

import { _ensureCborXExtended } from './firehose';

const YIELD_AFTER_ITERATION = 300;

/**
 * @param {string} did
 * @param {ArrayBuffer | Uint8Array} messageBuf
 */
export function readCAR(did, messageBuf) {
  /** @type {import('./firehose').FirehoseRecord[] & { parseTime: number } | undefined} */
  let last;
  for (const _chunk of sequenceReadCAR(did, messageBuf)) {
    if (_chunk) last = _chunk;
  }
  return   /** @type {NonNullable<typeof last>} */(last);
}

/**
 * @param {string} did
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @returns {Generator<import('./firehose').FirehoseRecord[] & { parseTime: number } | undefined>}
 */
export function* sequenceReadCAR(did, messageBuf) {
  const parseStart = Date.now();
  let pauseTime = 0;

  const bytes = messageBuf instanceof ArrayBuffer ? new Uint8Array(messageBuf) : messageBuf;

  _ensureCborXExtended();
  const car = CarBufferReader.fromBytes(bytes);

  const recordsByCID = new Map();
  const keyByCID = new Map();
  const errors = [];
  const blocks = typeof car._blocks === 'object' && car._blocks && Array.isArray(car._blocks) ? car._blocks : car.blocks();
  const decoder = new TextDecoder();

  let iteration = 0;
  for (const block of blocks) {
    iteration++;
    if (iteration % YIELD_AFTER_ITERATION) {
      const pauseStart = Date.now();
      yield;
      pauseTime += Date.now() - pauseStart;
    }

    const record = decodeCBOR(block.bytes);
    if (record.$type) recordsByCID.set(block.cid, record);
    else if (Array.isArray(record.e)) {
      let key = '';
      for (const sub of record.e) {
        iteration++;
        if (iteration % YIELD_AFTER_ITERATION) {
          const pauseStart = Date.now();
          yield;
          pauseTime += Date.now() - pauseStart;
        }

        if (!sub.k || !sub.v) continue;
        try {
          const keySuffix = decoder.decode(sub.k);
          key = key.slice(0, sub.p || 0) + keySuffix;

          let cid;
          if (typeof sub.v === 'string') {
            cid = sub.v;
          } else if (sub.v.value) {
            const expandWithoutZero =
              sub.v.value[0] ? sub.v.value :
            /** @type {Uint8Array} */(sub.v.value).subarray(1);
            cid = decodeCID(expandWithoutZero);
          }

          if (!cid) continue;

          keyByCID.set(cid, key);
        } catch (error) {
          if (!errors.length) console.error(error);
          errors.push(error);
        }
      }
    }
  }

  /** @type {import('./firehose').FirehoseRecord[] & { parseTime: number }} */
  const records = /** @type {*} */([]);
  for (const entry of recordsByCID) {
    iteration++;
    if (iteration % YIELD_AFTER_ITERATION) {
      const pauseStart = Date.now();
      records.parseTime = pauseStart - parseStart - pauseTime;
      yield;
      pauseTime += Date.now() - pauseStart;
    }

    const cid = entry[0];
    /** @type {import('./firehose').FirehoseRecord} */
    const record = entry[1];
    record.repo = did;
    const key = keyByCID.get(cid);
    if (key) {
      record.path = key;
      record.uri = 'at://' + did + '/' + key;
    }

    // let's recreate the record, to pack the GC and avoid deoptimized objects
    records.push(record);
  }

  // record.seq = commit.seq; 471603945
  // record.since = /** @type {string} */(commit.since); 3ksfhcmgghv2g
  // record.action = op.action;
  // record.cid = cid;
  // record.path = op.path;
  // record.timestamp = commit.time ? Date.parse(commit.time) : Date.now(); 2024-05-13T19:59:10.457Z

  // record.repo = fullDID;
  // record.uri = fullDID + '/' + 'op.path';
  // record.action = 'create';

  records.parseTime = Date.now() - parseStart - pauseTime;
  yield records;

  return records;
}
