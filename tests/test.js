const fs = require('fs');
const path = require('path');

const bskyAppDID = 'did:plc:z72i7hdynmk6r22z27h6tvur';
const retr0idDID = 'did:plc:vwzwgnygau7ed7b7wt5ux7y2';


const indexScript = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf-8');
eval(indexScript);
const readCAR = bski.readCAR;

console.log('@bsky.app..');
const bskyAppRepo = fs.readFileSync(__dirname + '/bsky-app.car');
const bskyAppObj = readCAR(bskyAppDID, bskyAppRepo);
console.log('  ' + bskyAppObj.parseTime);

fs.writeFileSync(__dirname + '/bsky-app.json', JSON.stringify(bskyAppObj, null, 2));

console.log('@retr0.id..');
const retr0IdRepo = fs.readFileSync(__dirname + '/retr0-id.car');
const retr0IdObj = readCAR(retr0idDID, retr0IdRepo);
console.log('  ' + retr0IdObj.parseTime);

fs.writeFileSync(__dirname + '/retr0-id.json', JSON.stringify(retr0IdObj, null, 2));
