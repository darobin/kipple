#!/usr/bin/env node

let { program } = require('commander')
  , { getPassword, setPassword, deletePassword } = require('keytar')
  , { ok, die, ensureDir, dataDir, rmDir } = require('./index')
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

// Manage sources
// Data in Kipple is structured in this way:
//  * system: the type of tool which the is the data's primary home (eg. roam)
//  * account: the user of the system in question, there can be several users per system (eg. robin)
//  * source: some systems have multiple sources, which may be separate databases or directories
//    (eg. my-notes)
// Adding a source adds the { system, account, source } tuple into the local store (with source
// being optional). What that does depends on the system, it could well be nothing other than
// creating an empty directory.
program
  .command('add-source <system> <account> [source]')
  .description('adds a source of data, which is system/account/source, with an optional source')
  .action(async (system, account, source) => {
    try {
      if (system === 'roam') {
        if (!source) die(`Adding a Roam source requires specifying the database as your source.`);
        let pwd = await getPassword(service, `${system}:${account}`);
        if (!pwd) die(`Unknown account "${account}" in "${system}". Maybe "kipple login ${system} ${account}" first?`);
        await ensureDir(dataDir(system, account, source));
      }
      else die(`Unknown system: ${system}`);
      ok();
    }
    catch (err) {
      die(`Failed to add source: ${err}`);
    }
  })
;

program
  .command('remove-source <system> <account> [source]')
  .description('removes a source of data, which is system/account/source, with an optional source')
  .action(async (system, account, source) => {
    try {
      if (system === 'roam') {
        if (!source) die(`Removing a Roam source requires specifying the database as your source.`);
        await rmDir(dataDir(system, account, source));
      }
      else die(`Unknown system: ${system}`);
      ok();
    }
    catch (err) {
      die(`Failed to add source: ${err}`);
    }
  })
;


// now do something
program.parseAsync(process.argv);
