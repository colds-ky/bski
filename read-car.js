// @ts-check

// import { decode as decodeCBOR } from './decode/cbor-x/decoder';
// import { decode as decodeCID } from './decode/js-multiformats/cid';
// import { CarBufferReader } from './decode/js-car/buffer-reader-browser';

import { readCar } from './src/decode/car/reader';
import { decode as decodeCBOR2 } from './src/decode/cbor/decode';
import { decode as decodeCID2 } from './src/decode/cbor/cid';
import { toBase32 } from './src/decode/multibase/base32';

const YIELD_AFTER_ITERATION = 300;

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 */
export function readCAR(messageBuf, did) {
  if (typeof messageBuf === 'string')
    [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

  /** @type {import('./firehose').FirehoseRepositoryRecord<keyof import('./firehose').RepositoryRecordTypes$>[] & { parseTime: number } | undefined} */
  let all;
  for (const _chunk of sequenceReadCARCore(messageBuf, did, Infinity)) {
    if (_chunk) all = _chunk;
  }
  return   /** @type {NonNullable<typeof all>} */(all);
}

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 */
export function sequenceReadCAR(messageBuf, did) {
  return sequenceReadCARCore(messageBuf, did, YIELD_AFTER_ITERATION);
}

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 * @param {number} yieldAfterIteration
 */
function* sequenceReadCARCore(messageBuf, did, yieldAfterIteration) {
  if (typeof messageBuf === 'string')
    [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

  const parseStart = Date.now();
  let pauseTime = 0;

  let batchParseStart = parseStart;

  const bytes = messageBuf instanceof ArrayBuffer ? new Uint8Array(messageBuf) : messageBuf;

  const car = readCar(bytes);

  const recordsByCID = new Map();
  const keyByCID = new Map();
  const errors = [];
  const decoder = new TextDecoder();

  let iteration = 0;
  for (const block of car.iterate()) {
    iteration++;
    if (iteration % yieldAfterIteration === yieldAfterIteration - 1) {
      // parsing, but not yielding any records yet
      const pauseStart = Date.now();
      const emptyBatch = /** @type {never[] & { parseTime: number }} */([]);
      emptyBatch.parseTime = pauseStart - batchParseStart;
      yield emptyBatch;
      batchParseStart = Date.now();
      pauseTime += batchParseStart - pauseStart;
    }

    const record = decodeCBOR2(block.bytes);
    if (record.$type) {
      const blockCID = 'b' + toBase32(block.cid.bytes);
      recordsByCID.set(blockCID, record);
    } else if (Array.isArray(record.e)) {
      let key = '';
      for (const sub of record.e) {
        iteration++;
        if (iteration % yieldAfterIteration === yieldAfterIteration - 1) {
          // parsing, but not yielding any records yet
          const pauseStart = Date.now();
          const emptyBatch = /** @type {never[] & { parseTime: number }} */([]);
          emptyBatch.parseTime = pauseStart - batchParseStart;
          yield emptyBatch;
          batchParseStart = Date.now();
          pauseTime += batchParseStart - pauseStart;
        }

        if (!sub.k || !sub.v) continue;
        try {
          const keySuffix = decoder.decode(sub.k.buf);
          key = key.slice(0, sub.p || 0) + keySuffix;

          let cid;
          if (typeof sub.v === 'string') {
            cid = sub.v;
          } else if (sub.v.value) {
            const expandWithoutZero =
              sub.v.value[0] ? sub.v.value :
            /** @type {Uint8Array} */(sub.v.value).subarray(1);
            cid = decodeCID2(expandWithoutZero);
          } else if (sub.v.$bytes) {
            cid = sub.v.$link;
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
  let batch = /** @type {*} */([]);

  /** @type {import('./firehose').FirehoseRecord[] & { parseTime: number }} */
  const all = /** @type {*} */([]);

  for (const entry of recordsByCID) {
    const cid = entry[0];
    /** @type {import('./firehose').FirehoseRecord} */
    const record = entry[1];
    record.repo = did;
    record.cid = cid;
    const key = keyByCID.get(cid);
    if (key) {
      record.path = key;
      record.uri = 'at://' + did + '/' + key;
    }

    // let's recreate the record, to pack the GC and avoid deoptimized objects
    batch.push(record);
    all.push(record);

    iteration++;
    if (iteration % yieldAfterIteration === yieldAfterIteration - 1) {
      const pauseStart = Date.now();
      batch.parseTime = pauseStart - batchParseStart;
      yield batch;
      batch = /** @type {*} */([]);
      batchParseStart = Date.now();
      pauseTime += batchParseStart - pauseStart;
    }
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

  const finish = Date.now();
  if (batch.length) {
    batch.parseTime = finish - batchParseStart;
    yield batch;
  }
  all.parseTime = finish - parseStart - pauseTime;
  return all;
}
