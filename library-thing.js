/* eslint no-await-in-loop: 0 */

let { get } = require('axios')
  , { join } = require('path')
  , { dataDir, listSubdirNames, getPassword, saveJSON } = require('./index')
;

async function pull (account) {
  let allAccounts = account ? [account] : await listAccounts();
  await Promise.all(
    allAccounts.map(async (acc) => {
      let pwd = await getPassword('library-thing', acc)
        , { status, statusText, data } = await get(`https://www.librarything.com/api_getdata.php?userid=${acc}&key=${pwd}&resultsets=books&coverheight=250&max=5000&responseType=json`)
      ;
      if (status !== 200) throw new Error(`Error loading: [${status}] ${statusText}`);
      if (data.error) throw new Error(`Error loading: [${data.error}] ${data.error_msg || 'Unspecified error'}`);
      let books = Object.values(data.books);
      await saveJSON(join(dataDir('library-thing', acc), `${acc}.json`), books);
    })
  );
}

async function listAccounts () {
  return listSubdirNames(dataDir('library-thing'));
}

module.exports = {
  pull,
};
