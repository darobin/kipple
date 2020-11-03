#!/usr/bin/env node

let { program } = require('commander')
  , { die, startKipple } = require('./index')
;

// version command
program.version(require('./package.json').version);

// try connecting to kipple server, start it if that fails
startKipple((err) => {
  if (err) die(err);

  // - just send commands to server
  // - prompt for password if the server responds with error
});
