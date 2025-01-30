const assert = require('assert');
const fs = require('fs');
const path = require('path');

const bskyAppDID = 'did:plc:z72i7hdynmk6r22z27h6tvur';


const indexScript = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf-8');
eval(indexScript);
const readCAR = bski.readCAR;
const sequenceReadCAR = bski.sequenceReadCAR;

console.log('@bsky.app..');
const bskyAppRepo = fs.readFileSync(__dirname + '/bsky-app.car');
let bskyAppAll = readCAR(bskyAppRepo, bskyAppDID);
// read again, warmed up
bskyAppAll = readCAR(bskyAppRepo, bskyAppDID);
console.log('  whole: ' + bskyAppAll.parseTime.toLocaleString() + 'ms ' + bskyAppAll.length + 'rec');

const bskyAppIter = [];
let parseTime2 = 0
for (const chunk of sequenceReadCAR(bskyAppRepo, bskyAppDID)) {
  parseTime2 += chunk.parseTime;
  for (const rec of chunk) {
    bskyAppIter.push(rec);
  }
}
console.log('   iter: ' + parseTime2.toLocaleString() + 'ms ' + bskyAppIter.length + 'rec');

const bskyAppJSON = JSON.parse(fs.readFileSync(__dirname + '/bsky-app.json', 'utf-8'));

fs.writeFileSync(__dirname + '/bsky-app.json', JSON.stringify(bskyAppAll, null, 2));
fs.writeFileSync(__dirname + '/bsky-app-iter.json', JSON.stringify(bskyAppIter, null, 2));

assert.equal(bskyAppAll.length, bskyAppJSON.length, 'readCAR whole length');
assert.equal(bskyAppIter.length, bskyAppJSON.length, 'readCAR iter length');

let lastLine = '';
for (let i = 0; i < bskyAppAll.length; i++) {
  let line = ' [' + i + '] ' + bskyAppAll[i].$type + ' obj...';
  process.stdout.write(
    '\r' + [...lastLine].map(ch => ' ').join('') +
    '\r' + line);
  assert.deepEqual(bskyAppAll[i], bskyAppJSON[i], 'readCAR whole');

  line += ' iter...';
  process.stdout.write(' iter...');
  assert.deepEqual(bskyAppIter[i], bskyAppJSON[i], 'readCAR iter');

  lastLine = line;
}

console.log(' OK.');
