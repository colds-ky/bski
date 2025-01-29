const assert = require('assert');
const fs = require('fs');
const path = require('path');

const bskyAppDID = 'did:plc:z72i7hdynmk6r22z27h6tvur';


const indexScript = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf-8');
eval(indexScript);
const readCAR = bski.readCAR;

console.log('@bsky.app..');
const bskyAppRepo = fs.readFileSync(__dirname + '/bsky-app.car');
const bskyAppObj = readCAR(bskyAppDID, bskyAppRepo);
console.log('  ' + bskyAppObj.parseTime);

fs.writeFileSync(__dirname + '/bsky-app.json', JSON.stringify(bskyAppObj, null, 2));

const bskyAppJSON = JSON.parse(fs.readFileSync(__dirname + '/bsky-app.json', 'utf-8'));

for (let i = 0; i < bskyAppObj.length; i++) {
  console.log(' [' + i + '] ' + bskyAppObj[i].$type);
  assert.deepEqual(bskyAppObj[i], bskyAppJSON[i]);
}
