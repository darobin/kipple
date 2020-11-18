
let { Remarkable } = require('remarkable-node')
  , { join } = require('path')
  , { stat, createWriteStream, utimes } = require('fs')
  , pAll = require('p-all')
  , axios = require('axios')
  , extract = require('extract-zip')
  , { dataDir, listSubdirNames, getPassword, ensureDir } = require('./index')
;

async function pull (account) {
  let allAccounts = account ? [account] : await listAccounts();
  await Promise.all(
    allAccounts.map(async (acc) => {
      let token = await getPassword('remarkable', acc)
        , client = new Remarkable({ token })
      ;
      await refreshToken(client);
      let items = await client.listItems()
        , collections = {}
        , collectionsPaths = {}
      ;
      items
        .filter(it => it.Type === 'CollectionType')
        .forEach(it => collections[it.ID] = it)
      ;
      await Promise.all(
        Object.keys(collections)
          .map(k => {
            let cur = collections[k]
              , dirs = [cur.VissibleName]
            ;
            while (cur.Parent) {
              cur = collections[cur.Parent];
              dirs.unshift(cur.VissibleName);
            }
            dirs.unshift(dataDir('remarkable', acc));
            collectionsPaths[k] = join.apply(null, dirs);
            return ensureDir(join.apply(null, dirs));
          })
      );
      await pAll(
        items
          .filter(it => it.Type === 'DocumentType')
          .map(it => async () => {
            let dir = it.Parent ? collectionsPaths[it.Parent] : dataDir('remarkable', acc)
              , pth = join(dir, `${it.VissibleName}.zip`)
              , skip = await new Promise((resolve) => {
                  stat(pth, (err, info) => {
                    if (err) return resolve(false);
                    let remoteModified = (it.ModifiedClient || new Date().toISOString()).replace(/\.\d+Z/, 'Z')
                      , localModified = (info.mtime.toISOString() || '0').replace(/\.\d+Z/, 'Z')
                    ;
                    resolve(remoteModified >= localModified);
                  });
                })
            ;
            console.warn(`${skip ? 'Skipping' : 'Downloading'} ${pth}`);
            if (skip) return Promise.resolve();
            let res = await axios({
              method: 'GET',
              url: it.BlobURLGet,
              responseType: 'stream'
            });
            let stream = res.data.pipe(createWriteStream(pth));
            await new Promise((resolve, reject) => {
              stream.on('close', resolve);
              stream.on('error', reject);
            });
            await new Promise((resolve) => {
              let tm = new Date((it.ModifiedClient || new Date().toISOString()).replace(/\.\d+Z/, '.000Z'));
              utimes(pth, tm, tm, resolve);
            });
            let outputDir = join(dir, `${it.VissibleName}.remarkable`);
            await ensureDir(outputDir);
            await extract(pth, { dir: outputDir });
            console.warn(`Ok ${pth}!`);
          }),
        { concurrency: 5 }
      );
    })
  );
}

async function listAccounts () {
  return listSubdirNames(dataDir('remarkable'));
}

// CAUTION!
// In order for the token to work, it needs to be refreshed. But the _refreshToken() call in the lib
// is buggy. This does the correct version (which should have been automatic), but does so by
// reaching into the internals.
async function refreshToken (client) {
  if (!client._token) throw new Error('Client must already have a token registered');
  let { body } = await client._client.post('https://my.remarkable.com/token/json/2/user/new', { responseType: 'text' });
  return client._setToken(body);
}

module.exports = {
  pull,
};
