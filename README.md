# Bski raw CAR/CBOR format parsing

Parsing raw binary content of the realtime **firehose** from WebSocket, and **CAR** account repository snapshot data.

Self-contained, zero dependencies.

## Installation

```
npm install bski
```

## Reading firehose

```JavaScript
import { firehose } from 'bski'; // import from npm

const chunk = [];
for await(const msg of firehose.each()) {
  chunk.push(msg);
  if(chunk.length === 1000) break;
}
```

[ ![Example using bski to fetch 1000 messages from the firehose](example-firehose.png) ](https://tty.wtf/%23+BSki+firehose//%60%60%60JavaScript/import+%7B+firehose+%7D+from+'bski';//const+chunk+=+%5B%5D;/for+await(const+msg+of+firehose.each())+%7B/++chunk.push(msg);/++if(chunk.length+===+1000)+break;/%7D//chunk/%60%60%60//)

## Reading CAR

```JavaScript
import { readCAR } from 'bski'; // import from npm

const did = 'did:plc:z72i7hdynmk6r22z27h6tvur';
const car = await fetch('https://puffball.us-east.host.bsky.network/xrpc/com.atproto.sync.getRepo?did=' + did)
  .then(x => x.arrayBuffer());

const records = readCAR(did, car);
```

[ ![Example using bski to fetch CAR snapshot file and parse it](example-car.png) ](https://tty.wtf/%23+BSki+reading+CAR+snapshot//See+@bsky.app+likes,+tweets,+follows+etc.//%60%60%60JavaScript/import+%7B+readCAR+%7D+from+'bski';//const+did+=+'did:plc:z72i7hdynmk6r22z27h6tvur';/const+car+=+await+fetch('https:%2F%2Fpuffball.us-east.host.bsky.network%2Fxrpc%2Fcom.atproto.sync.getRepo%3Fdid='+%2B+did)/++.then(x+=%3E+x.arrayBuffer());//const+records+=+readCAR(did,+car);//%60%60%60//)

## API details

### firehose

```TypeScript
firehose(address = 'wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos'):
  AsyncIterable<FirehoseRecord[]>
```

Connects to a firehose via WebSocket (defaults to the central server https://bsky.network/
or potentially a local server i.e. PDS if the address parameter is provided).

Yields records in batches `FirehoseRecord[]`.

Batching lets you consume records at your own speed. If you're iterating
and immediatelly processing &mdash; they will come in batches of one.
If your code stalls in process, they will queue up and next iteration will come
with whole pile at once.

Exiting the iterator loop disconnects from the WebSockets and discards any unprocessed records.

```TypeScript
firehose.each(address?): AsyncIterable<FirehoseRecord>
```

Same as the firehose() above, but always reporting records one by one.

The queueing still happens behind the scene, but if your code stalls it will still
receive each record separately. That comes with a small performance penalty.

### readCAR

```TypeScript
readCAR(messageBuf: ArrayBuffer | Uint8Array, did: string): FirehoseRepositoryRecord[]
```

Parses binary CAR/DAG/CBOR format that is the archive/database format for BlueSky account history.

The parser is pretty fast: 50Mb repository takes 1-2 seconds. However, for a web app that delay could be jarring. Enter sequenceReadCAR:

```TypeScript
sequenceReadCAR(messageBuf: ArrayBuffer | Uint8Array, did: string):
  Iterable<FirehoseRepositoryRecord | undefined>
```

Parsing that binary, yielding the parsed records in implementation-defined batches.

This lets your code parse CAR even on the main
thread incrementally, without freezing the app.

## Additional metadata on the records

Apart from capturing the built-in BlueSky fields,
both **firehose** and **readCAR** collect a couple extras:

* **repo** the DID of the account making the record (post/like etc.)
* **uri** standard `at://<did>/<type>/<hash>` way of referring to events in ATProto
* **cid** another standard identifier, a bit longer and less useful
* **action** mostly just `create` but can also be `delete` or `update` (think updating user profile)
* **time** BlueSky-observed time (different from self-reported time that can be spoofed by a poster)
* **receiveTimestamp** Unix-style time the message is received from WebSocket
* **parseTime** useful for tracking performance, averages to 0.3 millisecond

## History and references

The firehose functionality existed in
[colds.ky](https://colds.ky) codebase for a while,
using some of the packages referenced by the official
[@atproto/api](https://www.npmjs.com/package/@atproto/api):

* [@ipld/car](https://github.com/ipld/js-car) - Apache 2.0 and MIT
* [cbor-x](https://github.dev/kriszyp/cbor-x) - MIT
* [multiformats](https://github.com/multiformats/js-multiformats) - Apache 2.0 and MIT
* [cborg](github.com/rvagg/cborg) - Apache 2.0
* [@ipld/dag-cbor](https://github.com/ipld/js-dag-cbor) - Apache 2.0 and MIT
* [varint](https://github.com/chrisdickinson/varint) - MIT

But those are complex and broader-purpose libraries.
Later [@mary.my.id](https://bsky.app/profile/mary.my.id) created leaner,
more focused set of libraries to transcode some of the same formats, [@atcute/*](https://github.com/mary-ext/atcute) - MIT license.

And now this library here is taking in only few necessary bits,
focusing on singular use case: parsing realtime firehose,
and account repository CAR.

# License and links

[MIT](LICENSE) Oleg Mihailik

* [GitHub](https://github.com/colds-ky/bski)
* [npm](https://www.npmjs.com/package/bski)
* [@oyin.bo](https://bsky.app/profile/oyin.bo)