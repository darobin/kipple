
# Kipple

This is a management system for all the tools out there that support a healthy intellectual life.
Unlike most knowledge management tools, Kipple doesn't assume that you want to be some kind of
transhumanist of the mind. It just wants to help you think, remember, iterate, and move data
around between systems.

## Installation

The usual way:

```
npm install -g kipple
```

Note that on some platforms, since Kipple relies on your local keychain to store passwords, you may
need to install `libsecret`. See [keytar](https://github.com/atom/node-keytar) for details.

## Support

Currently, the systems that Kipple can interact with are:

- [x] Roam Research
- [ ] Evernote
- [x] LibraryThing
- [x] Remarkable
  - [ ] In there, I would like to use the lines data
        to detect which rectangles of which pages
        have notes and highlights. Rasterise onto
        a PNG of the PDF and crop. 
- [ ] Zotero
- [ ] Google Drive

The operations that Kipple can carry out are:

- [x] Logging in
- [x] Pulling notes
- [ ] Pushing new notes
- [ ] Updating notes
- [ ] Converting between systems
- [ ] Linking between systems
- [ ] Running cron or event-driven tasks
- [ ] Supporting local scripts that can perform specific tasks
- [ ] Manipulating through a local server

## Managing accounts

Kipple needs various credentials for each system that it integrates with. Those credentials will get
stored in your local keychain for safekeeping.

There are variables that Kipple uses:
* `system`: the system being interacted with. Values include: `roam`.
* `account`: the account being used with that given system. Eg. `robin@berjon.com`, `robinberjon`.
* `password`: the password for that account. You know what a password looks like.
* `source`: some systems will have multiple different sources, which may be different databases,
  notebooks, paths… This allows picking one.

### `kipple login <system> <account> <password>`

This will add a login that Kipple memorises for future use. It will update your password if the
account already exists.

* For `roam`, this is your account name and password.
* For `library-thing`, this is your `userid` and the
  [JSON API key](http://www.librarything.com/api/json.php) (the value given as `key=` in the
  examples on that page).
* For `remarkable`, the account is your login (or any string you would identify the account with,
  it isn't actually used), and the password is the code you get from
  [https://my.remarkable.com/connect/desktop](https://my.remarkable.com/connect/desktop).

### `kipple remove-login <system> <account>`

Removes a login from Kipple. Note that this does not delete the data you may have locally.

## Managing content

### `kipple add-source <system> <account> [source]`

This simply includes a source in the list of sources that Kipple knows about. If the system does not
have multiple sources per account, then the `source` argument is optional as there is only one for
that account. Note that this only adds it to the system, it does not download anything.

### `kipple remove-source <system> <account> [source]`

Will remove a source, with the same parameters as `add-source`. Note that this **does** delete
content.

### `kipple pull <system> [account] [source]`

Pulls data from that source, overwriting the local content. If no `source` is specified and there
are several known locally for that `account`, it will do all sources in turn. If no `account` is
specified, it will do all locally-known accounts in turn, and all locally-known sources in each of
them.

### `kipple list-items <system> <account> [source] [--sort alpha|edit|create]`

Lists the items in the system, and can sort them.
