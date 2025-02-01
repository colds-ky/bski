const assert = require('assert');
const fs = require('fs');
const path = require('path');

const bskyAppDID = 'did:plc:z72i7hdynmk6r22z27h6tvur';
const retr0idDID = 'did:plc:vwzwgnygau7ed7b7wt5ux7y2';

const indexScript = fs.readFileSync(path.resolve(__dirname, '../index.cjs'), 'utf-8');
debugger;
eval(indexScript);

while (true) {

  console.log('\nBSKI EMBEDDED');
  withReadCAR(bski);

}

function withReadCAR({ readCAR, sequenceReadCAR }) {

  const carFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.car'));
  for (let carFileName of carFiles) {
    carFileName = path.resolve(__dirname, carFileName);
    process.stdout.write('@' + path.basename(carFileName));
    const jsonFilename = carFileName.replace('.car', '.json');
    const carJSON = fs.existsSync(jsonFilename) ? JSON.parse(fs.readFileSync(jsonFilename, 'utf-8')) : undefined;
    const carRepo = fs.readFileSync(carFileName);

    const did = carJSON?.[0]?.repo || bskyAppDID;

    process.stdout.write('..');
    let carAll = readCAR(carRepo, did);
    console.log(' warmed up ' + carAll.length.toLocaleString() + ' records');
  
    process.stdout.write('  whole: ');
    // read again, warmed up
    carAll = readCAR(carRepo, did);
    console.log(carAll.parseTime.toLocaleString() + 'ms');

    process.stdout.write('   iter: ');
    const carIter = [];
    let parseTime2 = 0
    for (const chunk of sequenceReadCAR(carRepo, did)) {
      parseTime2 += chunk.parseTime;
      for (const rec of chunk) {
        carIter.push(rec);
      }
    }
    console.log(parseTime2.toLocaleString() + ' ms');

    fs.writeFileSync(jsonFilename, JSON.stringify(carAll, null, 2));
    fs.writeFileSync(jsonFilename.replace(/\.json$/, '-iter.json'), JSON.stringify(carIter, null, 2));

    assert.equal(carAll.length, carJSON.length, 'readCAR whole length');
    assert.equal(carIter.length, carJSON.length, 'readCAR iter length');

    let lastLine = '';
    for (let i = 0; i < carAll.length; i++) {
      let line = '  [' + i.toLocaleString() + '] ' + carAll[i].$type + '..';
      process.stdout.write(
        '\r' + [...lastLine].map(ch => ' ').join('') +
        '\r' + line);
      assert.deepEqual(JSON.parse(JSON.stringify(carAll[i])), carJSON[i], 'readCAR whole');

      line += '.';
      process.stdout.write('.');
      assert.deepEqual(JSON.parse(JSON.stringify(carIter[i])), carJSON[i], 'readCAR iter');

      lastLine = line;
    }

    console.log(' OK.');
  }

  console.log('All finished.');
}
