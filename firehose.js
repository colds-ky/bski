// @ts-check
/// <reference types='./records' />

import { readCar } from '@atcute/car';
import { decode, decodeFirst, fromBytes, toCidLink } from '@atcute/cbor';

import { version } from './package.json';
export { version };

const emptyUint8Array = new Uint8Array();

/**
 * @typedef {{
 *  'app.bsky.feed.like': AppBskyFeedLike,
 *  'app.bsky.feed.post': AppBskyFeedPost,
 *  'app.bsky.feed.repost': AppBskyFeedRepost,
 *  'app.bsky.feed.threadgate': AppBskyFeedThreadgate,
 *  'app.bsky.graph.follow': AppBskyGraphFollow,
 *  'app.bsky.graph.block': AppBskyGraphBlock,
 *  'app.bsky.graph.list': AppBskyGraphList,
 *  'app.bsky.graph.listitem': AppBskyGraphListitem,
 *  'app.bsky.graph.listblock': AppBskyGraphListblock,
 *  'app.bsky.actor.profile': AppBskyActorProfile
 *  'app.bsky.feed.generator': AppBskyFeedGenerator
 *  'app.bsky.feed.postgate': AppBskyFeedPostgate
 *  'chat.bsky.actor.declaration': ChatBskyActorDeclaration,
 *  'app.bsky.graph.starterpack': AppBskyGraphStarterpack
 * }} RepositoryRecordTypes$
 */

/**
 * @template {keyof RepositoryRecordTypes$} $Type
 * @typedef {RepositoryRecordTypes$[$Type] & {
 *  repo: string,
 *  uri: string,
 *  cid: string,
 *  action: 'create' | 'update',
 *  path: string,
 *  $type: $Type,
 *  since: string,
 *  time: string,
 *  receiveTimestamp: number,
 *  parseTime: number
 * }} FirehoseRepositoryRecord
 */

/**
 * @typedef {{
 *  repo: string,
 *  uri: string,
 *  action: 'delete',
 *  path: string,
 *  $type: keyof RepositoryRecordTypes$,
 *  since: string,
 *  time: string,
 *  receiveTimestamp: number,
 *  parseTime: number
 * }} FirehoseDeleteRecord
 */


/**
 * @typedef {{
 *  $type: '#identity',
 *  repo: string,
 *  action?: never,
 *  handle: string,
 *  time: string,
 *  receiveTimestamp: number,
 *  parseTime: number
 * }} FirehoseIdentityRecord
 */

/**
 * @typedef {{
 *  $type: '#identity',
 *  repo: string,
 *  action?: never,
 *  active: boolean,
 *  time: string,
 *  receiveTimestamp: number,
 *  parseTime: number
 * }} FirehoseAccountRecord
 */

/**
 * @typedef {{
 *  $type: 'error',
 *  action?: never,
 *  message: string,
 *  receiveTimestamp: number,
 *  parseTime: number
 * } & Record<string, unknown>} FirehoseErrorRecord
 */

/**
 * @typedef {FirehoseRepositoryRecord<'app.bsky.feed.like'> |
 * FirehoseRepositoryRecord<'app.bsky.feed.post'> |
 * FirehoseRepositoryRecord<'app.bsky.feed.repost'> |
 * FirehoseRepositoryRecord<'app.bsky.feed.threadgate'> |
 * FirehoseRepositoryRecord<'app.bsky.graph.follow'> |
 * FirehoseRepositoryRecord<'app.bsky.graph.block'> |
 * FirehoseRepositoryRecord<'app.bsky.graph.list'> |
 * FirehoseRepositoryRecord<'app.bsky.graph.listitem'> |
 * FirehoseRepositoryRecord<'app.bsky.graph.listblock'> |
 * FirehoseRepositoryRecord<'app.bsky.actor.profile'> |
 * FirehoseRepositoryRecord<'app.bsky.feed.generator'> |
 * FirehoseRepositoryRecord<'app.bsky.feed.postgate'> |
 * FirehoseRepositoryRecord<'chat.bsky.actor.declaration'> |
 * FirehoseRepositoryRecord<'app.bsky.graph.starterpack'> |
 * FirehoseDeleteRecord |
 * FirehoseIdentityRecord |
 * FirehoseAccountRecord |
 * FirehoseErrorRecord
 * } FirehoseRecord
 */

export const known$Types = /** @type {const} */([
  'app.bsky.feed.like', 'app.bsky.feed.post', 'app.bsky.feed.repost', 'app.bsky.feed.threadgate',
  'app.bsky.graph.follow', 'app.bsky.graph.block', 'app.bsky.graph.list', 'app.bsky.graph.listitem', 'app.bsky.graph.listblock',
  'app.bsky.actor.profile',
  'app.bsky.feed.generator',
  'app.bsky.feed.postgate',
  'chat.bsky.actor.declaration',
  'app.bsky.graph.starterpack'
]);

firehose.knownTypes = known$Types;

function requireWebsocket() {
  const requireFn = typeof require === 'function' ? require : undefined;
  if (typeof requireFn === 'function') return /** @type {typeof WebSocket} */(requireFn('ws'));
  throw new Error('WebSocket not available');
}

firehose.each = each;
firehose.version = version;

/**
 * @param {string} [address]
 * @returns {AsyncGenerator<FirehoseRecord[], void, void>}
 */
export async function* firehose(address) {
  const WebSocketImpl = typeof WebSocket === 'function' ? WebSocket :
    requireWebsocket();

  const wsAddress = address || 'wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos';

  const ws = new WebSocketImpl(wsAddress);
  ws.binaryType = 'arraybuffer';
  ws.addEventListener('message', handleMessage);
  ws.addEventListener('error', handleError);
  ws.addEventListener('close', handleClose)

  let buf = createAwaitPromise();
  let closed = false;

  try {

    while (true) {
      await buf.promise;
      if (buf.block?.length) {
        const block = buf.block;
        buf = createAwaitPromise();
        if (closed) {
          block['messages'] = block; // backwards compatibility trick
          if (block.length) yield block;
          break;
        }
        yield block;
      } else {
        buf = createAwaitPromise();
      }
    }
  } finally {
    if (!closed) {
      try { ws.close(); }
      catch (error) { }
    }
  }

  function handleClose() {
    closed = true;
    buf.resolve();
  }

  function handleMessage(event) {
    const receiveTimestamp = Date.now();

    if (typeof event.data?.byteLength === 'number') {
      parseMessageBufAndResolve(receiveTimestamp, event.data);
    } else if (typeof event.data?.arrayBuffer === 'function') {
      event.data.arrayBuffer().then(arrayBuffer => parseMessageBufAndResolve(receiveTimestamp, arrayBuffer))
    } else {
      buf.block.push({
        $type: 'error',
        message: 'WebSocket message type not supported.',
        data: event.data,
        receiveTimestamp,
        parseTime: 0
      });
      buf.resolve();
    }
  }

  /**
   * @param {number} receiveTimestamp
   * @param {ArrayBuffer} arrayBuf
   */
  function parseMessageBufAndResolve(receiveTimestamp, arrayBuf) {
    parseMessageBuf(receiveTimestamp, new Uint8Array(arrayBuf));
    buf.resolve();
  }

  /**
   * @param {number} receiveTimestamp
   * @param {Uint8Array} messageBuf
   */
  function parseMessageBuf(receiveTimestamp, messageBuf) {
    const parseStart = performance.now();
    try {
      parseMessageBufWorker(receiveTimestamp, parseStart, messageBuf);
      buf.resolve();
    } catch (parseError) {
      buf.block.push({
        $type: 'error',
        message: parseError.message,
        receiveTimestamp,
        parseTime: performance.now() - parseStart
      });
    }

    buf.resolve();
  }

  /**
 * @param {number} receiveTimestamp
 * @param {number} parseStart
 * @param {Uint8Array} messageBuf
 */
  function parseMessageBufWorker(receiveTimestamp, parseStart, messageBuf) {
    const [header, remainder] = decodeFirst(messageBuf);
    const [body, remainder2] = decodeFirst(remainder);
    if (remainder2.length > 0) {
      return buf.block.push({
        $type: 'error',
        message: 'Excess bytes in message.',
        receiveTimestamp,
        parseTime: performance.now() - parseStart
      });
    }

    const { t, op } = header;

    if (op === -1) {
      return buf.block.push({
        $type: 'error',
        message: 'Error header#' + body.error + ': ' + body.message,
        receiveTimestamp,
        parseTime: performance.now() - parseStart
      });
    }

    if (t === '#commit') {
      const commit = body;

      // A commit can contain no changes
      if (!('blocks' in commit) || !(commit.blocks.$bytes.length)) {
        return buf.block.push({
          $type: 'com.atproto.sync.subscribeRepos#commit',
          ...commit,
          blocks: emptyUint8Array,
          ops: [],
          receiveTimestamp,
          parseTime: performance.now() - parseStart
        });
      }

      const blocks = fromBytes(commit.blocks);
      const car = readCarToMap(blocks);
      for (let opIndex = 0; opIndex < commit.ops.length; opIndex++) {
        const op = commit.ops[opIndex];
        const action = op.action;
        const cid = op.cid?.$link;

        const now = performance.now();
        const record = cid ? car.get(cid) : undefined;

        if (action === 'create' || action === 'update') {
          if (!cid) {
            buf.block.push({
              $type: 'error',
              message: 'Missing commit.ops[' + (opIndex - 1) + '].cid.',
              receiveTimestamp,
              parseTime: now - parseStart,
              commit
            });
            parseStart = now;
            continue;
          }

          if (!record) {
            buf.block.push({
              $type: 'error',
              message: 'Unresolved commit.ops[' + (opIndex - 1) + '].cid ' + cid,
              receiveTimestamp,
              parseTime: now - parseStart,
              commit
            });
            parseStart = now;
            continue;
          }

          record.repo = commit.repo;
          record.action = action;
          record.uri = 'at://' + commit.repo + '/' + op.path;
          record.path = op.path;
          record.cid = cid;
          record.receiveTimestamp = receiveTimestamp;
          record.parseTime = now - parseStart;

          buf.block.push(record);
          continue;
        } else if (action === 'delete') {
          buf.block.push(/** @type {FirehoseDeleteRecord} */({
            action,
            path: op.path,
            receiveTimestamp,
            parseTime: now - parseStart
          }));
          parseStart = now;
        } else {
          buf.block.push({
            $type: 'error',
            message: 'Unknown action ' + op.action,
            ...record,
            receiveTimestamp,
            parseTime: now - parseStart
          });
          parseStart = now;
          continue;
        }
      }
      return;
    }

    return buf.block.push({
      $type: t,
      ...body,
      receiveTimestamp,
      parseTime: performance.now() - parseStart
    });
  }

  function handleError(error) {
    console.error(error);
    const errorText =
      error.message || 'WebSocket error ' + error;
    buf.reject(new Error(errorText));
  }

}

/**
 * @param {string} [address]
 * @returns {AsyncGenerator<FirehoseRecord, void, void>}
 */
async function* each(address) {
  for await (const block of firehose(address)) {
    yield* block;
  }
}

/**
 * @returns {{
 *  block: FirehoseRecord[],
 *  resolve: () => void,
 *  reject: (reason?: any) => void,
 *  promise: Promise<void>
 * }} */
function createAwaitPromise() {
  const result = {
    /** @type {FirehoseRecord[]} */
    block: []
  };
  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return /** @type {*} */(result);
}

/** @param {Uint8Array} buffer */
function readCarToMap(buffer) {
  const records = new Map();
  for (const { cid, bytes } of readCar(buffer).iterate()) {
    records.set(toCidLink(cid).$link, decode(bytes));
  }
  return records;
}
