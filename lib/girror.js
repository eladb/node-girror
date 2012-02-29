var path = require('path');
var util = require('util');
var async = require('async');
var mkdirp = require('mkdirp');
var con = require('ctxobj').console;
var git = require('gits').git;

/**
 * Incrementally mirror the git repo from `remote` into `worktree`.
 *
 * `callback` is called when done.
 * `options.cachedir`: where to keep bare repositores of `remote`. Defaults to `$GIRROR_CACHE || ($TMP || $TEMP || /tmp)/girror-cache`
 * `options.branch`: which branch to sync. Default is 'master'.
 * `options.logger`: alternative to `console`.
 *
 */
function girror(remote, worktree, options, callback) {
  options      = options          || { };
  var cachedir = options.cachedir || process.env.GIRROR_CACHE || path.join(tmp(), 'girror-cache');
  var logger   = options.logger   || console;
  var branch   = options.branch   || 'master';

  if (!remote) throw new Error('`remote` url is required');
  if (!worktree) throw new Error('`worktree` path is required');

  // wrap using ctxobj to allow contextual logging
  logger = con(logger);

  // allow passing worktree to git
  var _git = git;
  git = function(dir, worktree, args, callback) { 
    var opts = { logger: logger };

    if (worktree) {
      opts.env = { GIT_WORK_TREE: worktree };
    }

    return _git(dir, args, callback, opts); 
  }

  // calc baredir name by replacing any non-fs chars in remote url. 
  var dirname = remote.replace(/[\\\/\:@\.]/g, '_');
  var dirpath = path.join(cachedir, dirname);
  logger.log('baredir name for repo %s is: %s', remote, dirpath);

  return async.series([

    log('accessing bare repository under %s', dirpath),

    // make sure we have a bare repo to work with
    // git init --bare (will not harm an existing repo)
    function(cb) { return mkdirp(dirpath, cb); },
    function(cb) { return git(dirpath, null, ['init', '--bare'], cb); },

    // git remote rm/add origin
    function(cb) { return git(dirpath, null, ['remote', 'rm', 'origin'], ignoreErrors(cb)); },
    function(cb) { return git(dirpath, null, ['remote', 'add', 'origin', '--mirror=fetch', remote], cb); },

    // git fetch origin
    log('fetching updates from %s', remote),
    function(cb) { return git(dirpath, null, [ 'fetch', 'origin' ], cb); },

    // make sure worktree exists
    // git checkout -f <branch>
    log('checking out branch %s into %s', branch, worktree),
    function(cb) { return mkdirp(worktree, cb); },
    function(cb) { return git(dirpath, worktree, [ 'checkout', '-f', branch ], cb); }

  ]);

  // -- private

  function log() {
    var args = arguments;
    return function(cb) {
      logger.info(util.format.apply(util, args));
      return cb();
    }
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

module.exports = girror;