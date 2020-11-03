#!/usr/bin/env node

let { program } = require('commander')
  , { getPassword, setPassword, deletePassword, findCredentials } = require('keytar')
  , { ok, die, ensureSetup } = require('./index')
  , service = 'com.berjon.kipple'
;

// --version
program.version(require('./package.json').version);

// Manage credentials
// The service is always com.berjon.kipple. The account for any system we add is always
// `system:account`. This allows us to store any number of credentials for a given system, while
// keeping it all in a single service.
program
  .command('login <system> <account> <password>')
  .description('add a new login to the system, but note that this will not test it to see if it is correct')
  .action(async (system, account, password) => {
    try {
      let hadPwd = await deletePassword(service, `${system}:${account}`);
      if (hadPwd) console.warn(`Updating password for ${system}:${account}…`);
      await setPassword(service, `${system}:${account}`, password);
      ok();
    }
    catch (err) {
      die(`Failed to login: ${err}`);
    }
  })
;

program
  .command('remove-login <system> <account>')
  .description('removes a login from the system')
  .action(async (system, account) => {
    try {
      await deletePassword(service, `${system}:${account}`);
      ok();
    }
    catch (err) {
      die(`Failed to remove login: ${err}`);
    }
  })
;

// XXX:
// - try to load the conf
// - login command
// - remove-login command


// now do something
program.parseAsync(process.argv);
