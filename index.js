
let { platform, homedir } = require('os')
  , { join } = require('path')
  , { mkdir, readFile, rm } = require('fs')
  // , { post } = require('axios')
  , kipDirName = `${platform() === 'win32' ? '' : '.'}kipple`
  , kipDir = join(homedir(), kipDirName)
;

function die (err) {
  console.error(`[Error]`, err);
  process.exit(42);
}

function ok () {
  console.warn(`ok!`);
}

function parseJSON (data, def) {
  try {
    return JSON.parse(data);
  }
  catch (err) {
    return def;
  }
}

async function loadJSON (path, def) {
  return new Promise((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) {
        if (typeof def !== 'undefined') return resolve(def);
        return reject(err);
      }
      resolve(parseJSON(data, def));
    });
  });
}

async function ensureDir (dir) {
  return new Promise((resolve, reject) => {
    mkdir(dir, { recursive: true }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function rmDir (dir) {
  return new Promise((resolve, reject) => {
    rm(dir, { recursive: true }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function dataDir (system, account, source) {
  return join(kipDir, 'data', system, account, source || '');
}

module.exports = {
  die,
  ok,
  loadJSON,
  ensureDir,
  dataDir,
  rmDir,
};
