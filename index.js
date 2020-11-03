
let { platform, homedir } = require('os')
  , { join } = require('path')
  , { mkdir, readFile } = require('fs')
  , { post } = require('axios')
  , { spawn } = require('child_process')
  , kipDirName = `${platform() === 'win32' ? '' : '.'}kipple`
  , kipDir = join(homedir(), kipDirName)
  , configFile = join(kipDir, 'config.json')
  , portFile = join(kipDir, 'port.json')
  , serverFile = join(__dirname, 'server.js')
;

function die (err) {
  console.error(`[Error]`, err);
  process.exit(42);
}

// look for configuration dir, create if it doesn't exist, load configuration and port
function loadConfiguration (cb) {
  mkdir(kipDir, { recursive: true }, (err) => {
    if (err) return cb(err);
    loadJSON(configFile, (err, conf) => {
      if (err) return cb(err);
      loadJSON(portFile, (err, { port }) => {
        if (err) return cb(err);
        cb(null, conf, port);
      });
    });
  });
}

function startKipple (cb) {
  loadConfiguration((err, conf, port) => {
    if (err) return cb(err);
    if (port) {
      runCommand(port, 'heartbeat', { timeout: 100 }, (err) => {
        if (err) return runServer(cb);
        cb();
      });
    }
    else runServer(cb);
  });
}

function runServer (cb) {
  let subp = spawn(
    'node', [serverFile],
    {
      stdio: 'ignore',
      detached: true,
    }
  );
  subp.unref();
  process.nextTick(cb);
}

function runCommand (port, command, params, cb) {
  let { timeout = 0, ...data } = params;
  runRequest(`http://127.0.0.1:${port}`, timeout, command, data, (err, status, json) => {
    if (err) return cb(err);
    // XXX: here I need to intercept failures to login, and know how to rerun
    if (status === 401) {
      // XXX: ask for password, rerun
      return;
    }
    cb(null, json);
  });
}

function runRequest (url, timeout, command, data, cb) {
  post({
      url,
      timeout,
      data: {
        command,
        data,
      },
    })
    .then(res => cb(null, res.status, res.data))
    .catch(cb)
  ;
}

function parseJSON (data, def) {
  try {
    return JSON.parse(data);
  }
  catch (err) {
    return def;
  }
}

function loadJSON (path, def, cb) {
  readFile(path, (err, data) => {
    let res;
    if (err) res = {};
    else res = parseJSON(data, def);
    cb(null, res);
  });
}

module.exports = {
  die,
  loadConfiguration,
  startKipple,
  runCommand,
};
