# girror - Efficient mirroring of git remotes #

[![Build Status](https://secure.travis-ci.org/eladb/node-girror.png?branch=master)](http://travis-ci.org/eladb/node-girror)

_girror_ maintains mirrors of git repositories on the local system using a bare repository cache.
This makes it especially useful to handle post-commit triggers and automatically pull changes from a remote.

```bash
$ sudo npm install -g girror
$ girror git@github.com/eladb/node-girror /tmp/node-girror-master
$ girror git@github.com/eladb/node-girror#branch1 /tmp/node-girror-branch1
```

Now, every time the remote changes, calling _girror_ again will update the worktree.

_girror_ uses a bare repository with a `--mirror=fetch` origin to maintain a cached mirror of the remote.

It essentially performs the following steps:

 1. Initializes a bare repo under `/tmp/girror-cache` (or `$TEMP/girror-cache` in Windows) based on the origin URL.
 2. `git remote add --mirror=fetch <remote>` (tolerate failures)
 3. `git fetch origin`
 4. `git --work-tree <worktree> checkout -f <branch>`

_girror_ can be used as a command line tool or as a node.js in-process module.

Since git supports concurrency both for `fetch` and `checkout`, girror is also safe. Multiple girror operations may run in parallel.
However, this might not be very efficient since the initial fetch operation may take a long time and running multiple fetch operations against the same repository
will be wasty. If you have multiple girror operations that you wish to run against the same repository (e.g. checkout different branches/tags to various working
trees), you might want to do a single girror operation first that will perform the initial fetch and then run all the rest concurrently.

## Command line ##

```bash
$ girror --help

  Usage: girror                             - resync current directory (read <remote-url> and <branch> from .girror.json)
         girror work-tree                   - resync <worktree> (read <remote-url> and <branch> from .girror.json)
         girror remote-url worktree         - sync/resync <remote-url> into <worktree> and checkout "master"
         girror remote-url#branch worktree  - sync/resync <remote-url> into <worktree> and checkout <branch>

  Options:

    -h, --help             output usage information
    -v, --verbose          verbose output
    --shallow              create a shallow clone (--depth=1)
    --no-girror-file       do not create .girror.json file in worktree
    --find-remote          output the remote URL of the specified <worktree>, if a girror file can be found

```

## API ##

### girror(remote, worktree, options, callback) ###

 * `remote` - the URL of the git remote (postfix with '#branch' to checkout a specific branch). 
    If `remote` is `null`, `girror` will look for a `.girror.json` file up the file system and will induce remote#branch from there.
 * `worktree` - path to local working directory (where you want files to be checked out into)
 * `options.cachedir` - where to store the bare repo cache that makes girror so awesome (default is $GIRROR_CACHE || ($TMP || $TEMP || /tmp)/girror-cache)
 * `options.logger` - optional alternative to `console`.
 * `options.remote_type` - A mapper for the remote URL (`function(remote_url) => remote_url`).
   You can either provide your own function, or use one of the built in ones:
   * `girror.remote_types.no_auth()` - passthru (the default)
   * `girror.remote_types.auth(user, password)` - add `user:password@` to URL.
   * `girror.remote_types.github_ssh()` - convert a github (e.g. https://github.com/account/repo) URL to an 
     SSH URL (e.g. `git@github.com/account/repo.git`)
 * `options.girrorfile` - The name of the girror file to create under the worktree (contains some metadata on the last girror operation). Set to `false` to disable. Default is `.girror.json`.
 * `options.depth`: defines the clone depth (-1 indicates infinite). Default is -1.

### girror.git(args, options, callback) ###

Invokes `git`. Returns a `ChildProcess` object that can be used to grab stdio or whatever.

 * `args` array of arguments to pass to `git`.
 * `options.env` environment hash (default is `process.env`)
 * `options.logger` optional logger (default is `console`)
 * `options.tolerate` never fail (default `false`)
 * `options.verbose` verbose output (default `true`)
 * `callback` is `function(err)`

### girror.find_meta(dir, options, callback) ###

This function will look for a girror file under `dir` and any of it's parents. It will parse the first one it finds and return it via the callback function (`function(err, meta)`). If the girror file could not be found, `meta` will be `null`.
`options.girrorfile` may contain a different name for the girror file and `options` is optional.

## Using girror for continuous deployment ##

girror was built to enable automatic deployment from source control:

 1. Set up a post-commit HTTP trigger on your favorite source control that will POST into some endpoint on your servers.
 2. Invoke _girror_ to sync from the remote repository into the local filesystem. _girror_ will do it as efficiently and painlessly as possible (no merges, no cleanups, only clean diffs).
 3. You can also use it to sync multiple branches into your production servers and use them as staging environments (yeah!).

I will create a "girror-middleware" for express so you can just plug it in and have all this automated.

## Credits ##

 * [@mojodna](https://github.com/mojodna)

## License ##

MIT
