# girror - Efficient mirrorring of git remotes #

_girror_ maintains mirrors of git repositories on the local system using a bare repository cache.
This makes it especially useful to handle post-commit triggers and automatically pull changes from a remote.

```bash
$ sudo npm install -g girror
$ girror --remote git@github.com/eladb/node-girror --worktree /tmp/node-girror-master
$ girror --remote git@github.com/eladb/node-girror --worktree /tmp/node-girror-branch1 --branch branch1
```

Now, every time the remote changes, calling _girror_ again will update the worktree.

_girror_ uses a bare repository with a `--mirror=fetch` origin to maintain a cached mirror of the remote.

It essentially performs the following steps:

 1. Initializes a bare repo under `/tmp/girror-cache` (or `$TEMP/girror-cache` in Windows) based on the origin URL.
 2. Sets up a remote with `--mirror=fetch`.
 3. `git fetch origin`
 4. `export GIT_WORK_TREE=<worktree> && git checkout -f <branch>`

_girror_ can be used as a command line tool or as a node.js in-process module.

## Command line ##

```bash
$ girror --help

  Usage: girror [options]

  Options:

    -h, --help             output usage information
    -r, --remote <url>     git remote url (required)
    -w, --worktree <path>  path to worktree (required)
    -b, --branch <branch>  branch to mirror (default: master)
    -v, --verbose          verbose output

```

## API ##

### girror(remote, worktree, options, callback) ###

 * `remote` - the URL of the git remote
 * `worktree` - path to local working directory (where you want files to be checked out into)
 * `options.branch` - branch to checkout (default is `master`)
 * `options.cachedir` - where to store the bare repo cache that makes girror so awesome (default is $GIRROR_CACHE || ($TMP || $TEMP || /tmp)/girror-cache)
 * `options.logger` - optional alternative to `console`.

## Using girror for continuous deployment ##

girror was built to enable automatic deployment from source control:

 1. Set up a post-commit HTTP trigger on your favorite source control that will POST into some endpoint on your servers.
 2. Invoke _girror_ to sync from the remote repository into the local filesystem. _girror_ will do it as efficiently and painlessly as possible (no merges, no cleanups, only clean diffs).
 3. You can also use it to sync multiple branches into your production servers and use them as staging environments (yeah!).

I will create a "girror-middleware" for express so you can just plug it in and have all this automated.

## Credits ##

 * (@mojodna)[https://github.com/mojodna]

## License ##

MIT
