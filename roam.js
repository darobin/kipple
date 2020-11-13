/* eslint no-await-in-loop: 0 */

let puppeteer = require('puppeteer')
  , { readdir } = require('fs')
  , { join } = require('path')
  , extract = require('extract-zip')
  , striptags = require('striptags')
  , { html, renderToString, nothing } = require('@popeindustries/lit-html-server')
  , { unsafeHTML } = require('@popeindustries/lit-html-server/directives/unsafe-html')
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

function indexNodes (data) {
  let rootNodesByName = {}
    , nodesByUID = {}
    , uid2root = {}
    , rootMetadata = {}
  ;
  data.forEach(node => {
    rootNodesByName[node.title] = node;
    allChildren(node).forEach(kid => {
      if (kid.uid) {
        nodesByUID[kid.uid] = kid;
        uid2root[kid.uid] = node.title;
      }
    });
    let meta = {};
    if (node['create-time']) meta.created = new Date(node['create-time']);
    if (node['edit-time']) meta.lastModified = new Date(node['edit-time']);
    if (node.children) {
      try {
        node.children.forEach(kid => {
          let match = kid.string && kid.string.match(/^\s*\*\*\s*(author|by|date|lang|publisher|retrieved|url|type)\s*\*\*\s*:\s*(.*)/i);
          if (match) {
            let [, key, value] = match;
            key = key.toLowerCase();
            if (key === 'by') key = 'author';
            meta[key] = value;
          }
          else throw new Error('Hammer Time!');
        });
      }
      catch (e) {}
    }
    rootMetadata[node.title] = meta;
  });
  return {
    rootNodesByName,
    nodesByUID,
    uid2root,
    rootMetadata,
  };
}

function allChildren (node) {
  let kids = [];
  if (node.children) {
    Array.prototype.push.apply(kids, node.children);
    node.children.forEach(kid => Array.prototype.push.apply(kids, allChildren(kid)));
  }
  return kids;
}

async function toHTML (account, source, item) {
  let data = await loadDB(account, source)
    , doc = data.find(it => it.title === item)
  ;
  if (!doc) throw new Error(`Could not find item "${item}" in ${account}/${source}`);
  let { rootNodesByName, rootMetadata } = indexNodes(data)
    , node = rootNodesByName[item]
    , meta = rootMetadata[item]
  ;
  // console.log(JSON.stringify(Object.keys(rootNodesByName), null, 2));
  // console.log(JSON.stringify(rootMetadata, null, 2));
  if (!node) throw new Error(`Cannot find item "${item}" in roam ${account}/${source}`);
  // XXX:
  //  - produce a real section outline that's correct using headings
  //  - parse the Markdown, enriched
  //  - grab the images (or just link)
  //  - Try to process references when there are embeds, eg. if it's an embed from a book or article
  //    then that has to become a bibref which will get included at the end (and will get a
  //    footnote).
  //  - include CSS, make sure it's printable

  return renderToString(html`<!DOCTYPE html>
    <html lang=${meta.lang || 'en'} dir="ltr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width">
        <title>${striptags(node.title)}</title>
        <style>
          /* fill from CSS file later */
        </style>
      </head>
      <body>
        <article>
          <h1>${node.title}</h1>
          ${renderChildren(node)}
        </article>
      </body>
    </html>
  `);
}

function renderChildren (node, mode) {
  if (!node.children) return nothing;
  return node.children.map(n => {
    if (n.heading) {
      return html`<section>
        ${unsafeHTML(`<h${n.heading + 1}>`)}${n.string}${unsafeHTML(`</h${n.heading + 1}>`)}
        ${renderChildren(n)}
      </section>`;
    }
    // return nothing;
    if (mode === 'ul') {
      return html`<li>
        ${n.string}
        ${n.children ? html`<ul>${renderChildren(n, 'ul')}</ul>` : nothing}
      </li>`;
    }
    return html`<p>
      ${n.string}
    </p>
    ${n.children ? html`<ul>${renderChildren(n, 'ul')}</ul>` : nothing}`;
  });
}

module.exports = {
  pull,
  listItems,
  toHTML,
};
