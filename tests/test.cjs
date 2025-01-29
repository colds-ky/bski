const assert = require('assert');
const fs = require('fs');
const path = require('path');

const bskyAppDID = 'did:plc:z72i7hdynmk6r22z27h6tvur';


const indexScript = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf-8');
eval(indexScript);
const readCAR = bski.readCAR;
const sequenceReadCAR2 = bski.sequenceReadCAR2;

console.log('@bsky.app..');
const bskyAppRepo = fs.readFileSync(__dirname + '/bsky-app.car');
const bskyAppObj = readCAR(bskyAppRepo, bskyAppDID);
console.log('  ' + bskyAppObj.parseTime.toLocaleString() + 'ms ' + bskyAppObj.length + 'rec');

const bskyAppObj2 = [];
let parseTime2 = 0
for (const chunk of sequenceReadCAR2(bskyAppRepo, bskyAppDID)) {
  if (chunk) {
    parseTime2 += chunk.parseTime;
    for (const rec of chunk) {
      bskyAppObj2.push(rec);
    }
  } 
}
console.log('  ' + parseTime2.toLocaleString() + 'ms ' + bskyAppObj2.length + 'rec');

fs.writeFileSync(__dirname + '/bsky-app.json', JSON.stringify(bskyAppObj, null, 2));

const bskyAppJSON = JSON.parse(fs.readFileSync(__dirname + '/bsky-app.json', 'utf-8'));

for (let i = 0; i < bskyAppObj.length; i++) {
  process.stdout.write('\r [' + i + '] ' + bskyAppObj[i].$type + '     ');
  assert.deepEqual(bskyAppObj[i], bskyAppJSON[i]);
  assert.deepEqual(bskyAppObj2[i], bskyAppJSON[i]);
}

console.log();
