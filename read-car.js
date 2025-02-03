// @ts-check

import { readCar, iterateAtpRepo } from '@atcute/car';
import { decode } from '@atcute/cbor';
import { toString as CID_toString } from '@atcute/cid';

const YIELD_AFTER_ITERATION = 300;

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 */
export function readCAR(messageBuf, did) {
  if (typeof messageBuf === 'string')
    [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

  // for (const x of iterateAtpRepo(messageBuf)) {
  //   console.log(x);
  // }

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

  const recordsByCid = new Map();
  const keyByCid = new Map();
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

    const record = decode(block.bytes);
    if (record.$type) {
      const blockCid = CID_toString(block.cid);
      recordsByCid.set(blockCid, record);
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
          } else if (sub.v.$link) {
            cid = String(sub.v.$link);
          }

          if (!cid) continue;

          keyByCid.set(cid, key);
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

  for (const entry of recordsByCid) {
    const cid = entry[0].$link ? String(entry[0].$link) : String(entry[0]);
    /** @type {import('./firehose').FirehoseRecord} */
    const record = entry[1];
    record.repo = did;
    record.cid = cid;
    const key = keyByCid.get(cid);
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

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 */
export function readCARATC(messageBuf, did) {
  if (typeof messageBuf === 'string')
    [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

  // for (const x of iterateAtpRepo(messageBuf)) {
  //   console.log(x);
  // }

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
export function sequenceReadCARATC(messageBuf, did) {
  return sequenceReadCARCoreATC(messageBuf, did, YIELD_AFTER_ITERATION);
}

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 * @param {number} yieldAfterIteration
 */
function* sequenceReadCARCoreATC(messageBuf, did, yieldAfterIteration) {
  if (typeof messageBuf === 'string')
    [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

  const parseStart = Date.now();
  let pauseTime = 0;

  let batchParseStart = parseStart;

  const bytes = messageBuf instanceof ArrayBuffer ? new Uint8Array(messageBuf) : messageBuf;

  /** @type {import('./firehose').FirehoseRecord[] & { parseTime: number }} */
  let batch = /** @type {*} */([]);

  /** @type {import('./firehose').FirehoseRecord[] & { parseTime: number }} */
  const all = /** @type {*} */([]);

  let iteration = 0;
  for (const entry of iterateAtpRepo(bytes)) {
    const { cid: { $link: cid }, collection, rkey, record } = entry;

    record.repo = did;
    record.cid = cid;
    record.path = collection + '/' + rkey;
    record.uri = 'at://' + did + '/' + collection + '/' + rkey;

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


  const finish = Date.now();
  if (batch.length) {
    batch.parseTime = finish - batchParseStart;
    yield batch;
  }
  all.parseTime = finish - parseStart - pauseTime;
  return all;
}