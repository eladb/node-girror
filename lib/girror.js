var fs = require('fs');
var path = require('path');
var util = require('util');
var async = require('async');
var mkdirp = require('mkdirp');
var con = require('ctxobj').console;
var git = require('./git');
var remote_types = require('./remote_types');
var find_meta = require('./find_meta');

/**
 * Incrementally mirror the git repo from `remote` into `worktree`.
 *
 * If `remote` contains a URL hash (e.g. 'https://bla.bla#foo'), the hash will be treated as a branch/tag to checkout
 * instead of `options.branch`.
 *
 * `callback` is called when done.
 * `options` is optional.
 * `options.cachedir`: where to keep bare repositores of `remote`. Defaults to `$GIRROR_CACHE || ($TMP || $TEMP || /tmp)/girror-cache`
 * `options.branch`: which branch to sync. Default is 'master'.
 * `options.logger`: alternative to `console`.
 * `options.remote_type`: a `function(url) -> url` that maps the input remote url into the remote url for git-fetch.
 *    `girror.remote_types.no_auth()`: returns a passthrough remote type function.
 *    `girror.remote_types.auth(u, p)`: add auth prefix to remote URL.
 *    `girror.remote_types.github_ssh()`: convert github https URLs to github ssh remotes.
 *    Pass any custom function to implement your own remote fetch mapper.
 * `options.girrorfile`: if `true` a '.girror.json' file will be created at the root of the worktree with metadata on the girror operation.
 */
function girror(remote, worktree, options, callback) {

  function _girror(callback) {
    if (typeof options === 'function') {
      callback = options;
      options = { };
    }

    options          = options              || { };
    var remote_type  = options.remote_type  || remote_types.no_auth();
    var cachedir     = options.cachedir     || process.env.GIRROR_CACHE || path.join(tmp(), 'girror-cache');
    var logger       = options.logger       || console;
    var branch       = options.branch       || null;
    var girrorfile   = 'girrorfile' in options ? options.girrorfile : '.girror.json';

    if (!remote) throw new Error('`remote` url is required');
    if (!worktree) throw new Error('`worktree` path is required');

    // wrap using ctxobj to allow contextual logging
    logger = con(logger);

    // if remote contains a '#' treat the hash as a branch
    if (remote.indexOf('#') !== -1) {
      if (branch) throw new Error('cannot define branch both as a remote url hash and in options');
      
      var _ = remote.split('#');
      remote = _[0];
      branch = _[1];
    }

    // parse remote using the remote parser
    remote = remote_type(remote);

    if (!branch) branch = 'master'; // default branch in case it was not defined anywhere

    // calc baredir name by replacing any non-fs chars in remote url. 
    var dirname = remote.replace(/[\\\/\:@\.]/g, '_');
    var dirpath = path.join(cachedir, dirname);

    return async.series([

      // make sure we have a bare repo to work with
      $log('bare repository under: ' + dirpath),
      $mkdirp(dirpath),
      $git(['init', '--bare']), // will not harm an existing repo

      // git remote rm/add origin
      $log('setting up remote origin to ' + remote),
      $git(['remote', 'rm', 'origin'], true), // ignore errors (in case doesn't exist)
      $git(['remote', 'add', 'origin', '--mirror=fetch', remote]),

      // git fetch origin
      $log('fetching updates from ' + remote),
      $git([ 'fetch', 'origin' ]),

      // make sure worktree exists
      $log('checking out branch ' + branch + ' into ' + worktree),
      $mkdirp(worktree),
      $git([ '--work-tree', worktree, 'checkout', '-f', branch ]),

      // create girrorfile
      $girrorfile(worktree, girrorfile),

    ], callback);

    // -- private

    /**
     * Promise for `log`
     */
    function $log() {
      var args = arguments;
      return function(cb) {
        logger.info(util.format.apply(util, args));
        return cb();
      };
    }

    /**
     * Promise (and wrapper) for `git`
     */
    function $git(args, ignoreErrors) {
      return function(cb) {
        var opts = { logger: logger, tolerate: ignoreErrors };

        // always prefix with --git-dir <dirpath>
        args.unshift(dirpath);
        args.unshift('--git-dir');

        return git(args, opts, cb);
      };
    }

    /**
     * Promise for `mkdirp`
     */
    function $mkdirp(dir) {
      return function(cb) {
        return mkdirp(dir, cb);
      };
    }

    /**
     * Promise to create a girror file in `file`
     */
    function $girrorfile(worktree, file) {

      return function(cb) {
        if (!file) return cb(); // no girror file

        logger.info('creating: ' + path.join(worktree, file));

        var contents = {
          remote: remote,
          branch: branch,
          updated: new Date(),
        };

        return fs.writeFile(path.join(worktree, file), JSON.stringify(contents, true, 2), cb);
      };
    }

    /**
     * Returns the system's temp directory
     */
    function tmp() {
      return process.env.TMP || process.env.TEMP || '/tmp';
    }

    /**
     * Returns a function that always calls `callback`.
     */
    function ignoreErrors(callback) {
      return function() { return callback(); }
    }
  }

  return _girror(callback);
}

module.exports = girror;
module.exports.git = git; // export the git utility as well
module.exports.remote_types = remote_types;
module.exports.find_meta = find_meta;