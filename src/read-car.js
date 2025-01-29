// @ts-check

// import { decode as decodeCBOR } from './decode/cbor-x/decoder';
// import { decode as decodeCID } from './decode/js-multiformats/cid';
// import { CarBufferReader } from './decode/js-car/buffer-reader-browser';

import { readCar } from './decode/car/reader';
import { decode as decodeCBOR2 } from './decode/cbor/decode';
import { decode as decodeCID2 } from './decode/cbor/cid';
import { toBase32 } from './decode/multibase/base32';

const YIELD_AFTER_ITERATION = 300;

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 */
export function readCAR(messageBuf, did) {
  if (typeof messageBuf === 'string')
    [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

  /** @type {import('./firehose').FirehoseRecord[] & { parseTime: number } | undefined} */
  let last;
  for (const _chunk of sequenceReadCAR(messageBuf, did)) {
    if (_chunk) last = _chunk;
  }
  return   /** @type {NonNullable<typeof last>} */(last);
}

// /**
//  * @param {ArrayBuffer | Uint8Array} messageBuf
//  * @param {string} did
//  * @returns {Generator<import('./firehose').FirehoseRecord[] & { parseTime: number } | undefined>}
//  */
// export function* sequenceReadCAR(messageBuf, did) {
//   if (typeof messageBuf === 'string')
//     [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

//   const parseStart = Date.now();
//   let pauseTime = 0;

//   const bytes = messageBuf instanceof ArrayBuffer ? new Uint8Array(messageBuf) : messageBuf;

//   const car = CarBufferReader.fromBytes(bytes);

//   const recordsByCID = new Map();
//   const keyByCID = new Map();
//   const errors = [];
//   const blocks = typeof car._blocks === 'object' && car._blocks && Array.isArray(car._blocks) ? car._blocks : car.blocks();
//   const decoder = new TextDecoder();

//   let iteration = 0;
//   for (const block of blocks) {
//     iteration++;
//     if (iteration % YIELD_AFTER_ITERATION === YIELD_AFTER_ITERATION - 1) {
//       const pauseStart = Date.now();
//       yield;
//       pauseTime += Date.now() - pauseStart;
//     }

//     const record = decodeCBOR(block.bytes);
//     if (record.$type) recordsByCID.set(block.cid, record);
//     else if (Array.isArray(record.e)) {
//       let key = '';
//       for (const sub of record.e) {
//         iteration++;
//         if (iteration % YIELD_AFTER_ITERATION === YIELD_AFTER_ITERATION - 1) {
//           const pauseStart = Date.now();
//           yield;
//           pauseTime += Date.now() - pauseStart;
//         }

//         if (!sub.k || !sub.v) continue;
//         try {
//           const keySuffix = decoder.decode(sub.k);
//           key = key.slice(0, sub.p || 0) + keySuffix;

//           let cid;
//           if (typeof sub.v === 'string') {
//             cid = sub.v;
//           } else if (sub.v.value) {
//             const expandWithoutZero =
//               sub.v.value[0] ? sub.v.value :
//             /** @type {Uint8Array} */(sub.v.value).subarray(1);
//             cid = decodeCID(expandWithoutZero);
//           }

//           if (!cid) continue;

//           keyByCID.set(cid, key);
//         } catch (error) {
//           if (!errors.length) console.error(error);
//           errors.push(error);
//         }
//       }
//     }
//   }

//   /** @type {import('./firehose').FirehoseRecord[] & { parseTime: number }} */
//   const records = /** @type {*} */([]);
//   for (const entry of recordsByCID) {
//     iteration++;
//     if (iteration % YIELD_AFTER_ITERATION === YIELD_AFTER_ITERATION - 1) {
//       const pauseStart = Date.now();
//       records.parseTime = pauseStart - parseStart - pauseTime;
//       yield;
//       pauseTime += Date.now() - pauseStart;
//     }

//     const cid = entry[0];
//     /** @type {import('./firehose').FirehoseRecord} */
//     const record = entry[1];
//     record.repo = did;
//     const key = keyByCID.get(cid);
//     if (key) {
//       record.path = key;
//       record.uri = 'at://' + did + '/' + key;
//     }

//     // let's recreate the record, to pack the GC and avoid deoptimized objects
//     records.push(record);
//   }

//   // record.seq = commit.seq; 471603945
//   // record.since = /** @type {string} */(commit.since); 3ksfhcmgghv2g
//   // record.action = op.action;
//   // record.cid = cid;
//   // record.path = op.path;
//   // record.timestamp = commit.time ? Date.parse(commit.time) : Date.now(); 2024-05-13T19:59:10.457Z

//   // record.repo = fullDID;
//   // record.uri = fullDID + '/' + 'op.path';
//   // record.action = 'create';

//   records.parseTime = Date.now() - parseStart - pauseTime;
//   yield records;

//   return records;
// }

/**
 * @param {ArrayBuffer | Uint8Array} messageBuf
 * @param {string} did
 * @returns {Generator<import('./firehose').FirehoseRecord[] & { parseTime: number } | undefined>}
 */
export function* sequenceReadCAR(messageBuf, did) {
  if (typeof messageBuf === 'string')
    [messageBuf, did] = /** @type {[any, any]} */([did, messageBuf]);

  const parseStart = Date.now();
  let pauseTime = 0;

  const bytes = messageBuf instanceof ArrayBuffer ? new Uint8Array(messageBuf) : messageBuf;

  const car = readCar(bytes);

  const recordsByCID = new Map();
  const keyByCID = new Map();
  const errors = [];
  const decoder = new TextDecoder();

  let iteration = 0;
  for (const block of car.iterate()) {
    iteration++;
    if (iteration % YIELD_AFTER_ITERATION === YIELD_AFTER_ITERATION - 1) {
      const pauseStart = Date.now();
      yield;
      pauseTime += Date.now() - pauseStart;
    }

    const record = decodeCBOR2(block.bytes);
    if (record.$type) {
      const blockCID = 'b' + toBase32(block.cid.bytes);
      recordsByCID.set(blockCID, record);
    } else if (Array.isArray(record.e)) {
      let key = '';
      for (const sub of record.e) {
        iteration++;
        if (iteration % YIELD_AFTER_ITERATION === YIELD_AFTER_ITERATION - 1) {
          const pauseStart = Date.now();
          yield;
          pauseTime += Date.now() - pauseStart;
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
  const records = /** @type {*} */([]);
  for (const entry of recordsByCID) {
    iteration++;
    if (iteration % YIELD_AFTER_ITERATION === YIELD_AFTER_ITERATION - 1) {
      const pauseStart = Date.now();
      records.parseTime = pauseStart - parseStart - pauseTime;
      yield;
      pauseTime += Date.now() - pauseStart;
    }

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
