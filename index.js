
let { platform, homedir, tmpdir } = require('os')
  , { join } = require('path')
  , { mkdir, readFile, rm, readdir, mkdtemp } = require('fs')
  , keytar = require('keytar')
  // , { post } = require('axios')
  , kipDirName = `${platform() === 'win32' ? '' : '.'}kipple`
  , kipDir = join(homedir(), kipDirName)
  , service = 'com.berjon.kipple'
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

async function listSubdirNames (dir) {
  return new Promise((resolve, reject) => {
    readdir(dir, { withFileTypes: true }, (err, files) => {
      if (err) return reject(err);
      resolve(files.filter(f => f.isDirectory()).map(f => f.name));
    });
  });
}

function dataDir (system, account, source) {
  return join(kipDir, 'data', system, account, source || '');
}

async function tmpDir () {
  return new Promise((resolve, reject) => {
    mkdtemp(join(tmpdir(), 'kipple-'), (err, dir) => {
      if (err) return reject(err);
      resolve(dir);
    });
  });
}

function getPassword (system, account) {
  return keytar.getPassword(service, `${system}:${account}`);
}

function setPassword (system, account, password) {
  return keytar.setPassword(service, `${system}:${account}`, password);
}

function deletePassword (system, account) {
  return keytar.deletePassword(service, `${system}:${account}`);
}

module.exports = {
  die,
  ok,
  loadJSON,
  ensureDir,
  dataDir,
  rmDir,
  listSubdirNames,
  tmpDir,
  getPassword,
  setPassword,
  deletePassword,
};
