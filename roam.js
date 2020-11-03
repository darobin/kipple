
let puppeteer = require('puppeteer')
  , { dataDir, listSubdirNames } = require('./index')
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
  // XXX:
  // - for each account, login
  // - for each source, download and unzip
}

async function listSources (account) {
  return listSubdirNames(dataDir('roam', account));
}

async function listAccounts () {
  return listSubdirNames(dataDir('roam'));
}

module.exports = {
  pull,
};
