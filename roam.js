/* eslint no-await-in-loop: 0 */

let puppeteer = require('puppeteer')
  , { readdir } = require('fs')
  , { join } = require('path')
  , extract = require('extract-zip')
  , { dataDir, listSubdirNames, getPassword, tmpDir, loadJSON } = require('./index')
;

async function pull (account, source) {
  let allSources = [];
  if (account && source) allSources = [{ account, source }];
  else if (account) {
    let sources = await listSources(account);
    allSources = sources.map(s => [{ account, source: s }]);
  }
  else {
    let accounts = await listAccounts()
      ,  sources = await Promise.all(accounts.map(listSources))
    ;
    accounts.forEach((acc, idx) => {
      sources[idx].forEach(s => allSources.push({ account: acc, source: s }));
    });
  }
  let pullFrom = {};
  allSources.forEach(({ account: acc, source: src }) => {
    if (!pullFrom[acc]) pullFrom[acc] = [];
    pullFrom[acc].push(src);
  });
  for (let acc of Object.keys(pullFrom)) {
    console.warn(`Pulling roam for ${acc}`);
    let ctx = await getLoggedInContext(acc);
    for (let src of pullFrom[acc]) {
      console.warn(`Downloading zip of ${acc}/${src}`);
      let zipFile = await downloadJSONZipFile(ctx, src);
      console.warn(`Extracing ${zipFile} to ${dataDir('roam', account, source)}`);
      await extract(zipFile, { dir: dataDir('roam', account, source) });
    }
    await ctx.browser().close();
  }
}

async function getLoggedInContext (account) {
  let browser = await puppeteer.launch()
    , context = await browser.createIncognitoBrowserContext()
    , page = await context.newPage()
  ;
  console.warn(`• Loading login`);
  await page.goto('https://roamresearch.com/#/signin');
  // await page.waitForNavigation();
  await page.waitForSelector('input[name=email]');
  let pwd = await getPassword('roam', account);
  await page.type('input[name=email]', account);
  await page.type('input[name=password]', pwd);
  await page.click('.bp3-button');
  console.warn(`• Submitted login`);
  await page.waitForSelector('.your-hosted-dbs-grid');
  console.warn(`• Logged in ${account}`);
  return context;
}

async function downloadJSONZipFile (ctx, source) {
  let page = await ctx.newPage()
    , tmp = await tmpDir()
  ;
  // load DB page and prep for download
  console.warn(`• Loading source page`);
  await page.goto(`https://roamresearch.com/#/app/${source}`, { timeout: 60000 });
  await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: tmp });
  await page.waitForSelector('.bp3-icon-more');
  // click menu, then 'Export All' item
  await page.click('.bp3-icon-more');
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    [...document.querySelectorAll('.bp3-menu li a')].forEach((entry) => {
      if (entry.innerText === 'Export All') entry.click();
    });
  });
  await page.waitForTimeout(2000);
  // change the export option: click menu, click JSON item, click download button
  await page.click('.bp3-dialog-container .bp3-popover-wrapper button');
  await page.waitForTimeout(1000);
  await page.click('.bp3-dialog-container .bp3-popover-wrapper .bp3-popover-dismiss');
  await page.waitForTimeout(1000);
  await page.click('.bp3-dialog-container .bp3-intent-primary');
  console.warn(`• Clicked download`);
  let timerID = setTimeout(() => { throw new Error(`Download for ${source} never started.`); }, 20000);
  await new Promise((resolve, reject) => {
    page._client.on('Page.downloadProgress', ({ receivedBytes, totalBytes, state }) => {
      clearTimeout(timerID);
      console.warn(`• Download for ${source}: ${receivedBytes}/${totalBytes} (${((receivedBytes / totalBytes) * 100).toFixed(2)})`);
      if (state === 'completed') return resolve();
      if (state === 'canceled') return reject();
      timerID = setTimeout(() => { reject(new Error(`Download for ${source} stalled.`)); }, 20000);
    });
  });
  let zipFile = await new Promise((resolve, reject) => {
    readdir(tmp, (err, files) => {
      if (err) return reject(err);
      let file = files.find(f => /\.zip/.test(f));
      if (!file) return reject(new Error(`No .zip file in ${tmp}: ${files.join(', ')}`));
      resolve(join(tmp, file));
    });
  });
  console.warn(`• Downloaded ${zipFile}`);
  return zipFile;
}

async function listItems (account, source, { sort = 'alpha' } = {}) {
  let data = await loadDB(account, source)
    , cmpFunc = (a, b) => ((a || {}).title || '').localeCompare(((b || {}).title || ''))
  ;
  if (sort === 'edit') {
    cmpFunc = (a, b) => {
      let aTime = (a || {})['edit-time'] || (a || {})['create-time'] || 0
        , bTime = (b || {})['edit-time'] || (b || {})['create-time'] || 0
      ;
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return 0;
    };
  }
  else if (sort === 'create') {
    cmpFunc = (a, b) => {
      let aTime = (a || {})['create-time'] || (a || {})['edit-time'] || 0
        , bTime = (b || {})['create-time'] || (b || {})['edit-time'] || 0
      ;
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return 0;
    };
  }
  return data.sort(cmpFunc).map(it => (it || {}).title);
}

async function loadDB (account, source) {
  return loadJSON(join(dataDir('roam', account, source), `${source}.json`));
}

async function listSources (account) {
  return listSubdirNames(dataDir('roam', account));
}

async function listAccounts () {
  return listSubdirNames(dataDir('roam'));
}

module.exports = {
  pull,
  listItems,
};
