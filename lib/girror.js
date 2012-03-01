var path = require('path');
var util = require('util');
var async = require('async');
var mkdirp = require('mkdirp');
var con = require('ctxobj').console;
var git = require('./git');

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

  // always pass logger in options.
  /*
  git = function(dir, worktree, args, callback) { 
    var opts = { logger: logger };
    opts.worktree = worktree;
    return _git(dir, args, opts, callback); 
  };
  */

  // calc baredir name by replacing any non-fs chars in remote url. 
  var dirname = remote.replace(/[\\\/\:@\.]/g, '_');
  var dirpath = path.join(cachedir, dirname);

  function _girror(callback) {
    return async.series([

      // make sure we have a bare repo to work with
      $log('bare repository under: ' + dirpath),
      $mkdirp(dirpath),
      $git(['init', '--bare']), // will not harm an existing repo

      // git remote rm/add origin
      $log('setting up remote origin to ' + remote),
      $git(['remote', 'rm', 'origin'], null, true), // ignore errors (in case doesn't exist)
      $git(['remote', 'add', 'origin', '--mirror=fetch', remote]),

      // git fetch origin
      $log('fetching updates from ' + remote),
      $git([ 'fetch', 'origin' ]),

      // make sure worktree exists
      $log('checking out branch ' + branch + ' into ' + worktree),
      $mkdirp(worktree),
      $git([ 'checkout', '-f', branch ], worktree),

    ], callback);
  }

  // -- private

  /**
   * Promise for `log`
   */
  function $log() {
    var args = arguments;
    return function(cb) {
      logger.info(util.format.apply(util, args));
      return cb();
    }
  }

  /**
   * Promise (and wrapper) for `git`
   */
  function $git(args, worktree, ignoreErrors) {
    return function(cb) {
      var opts = { logger: logger, worktree: worktree, tolerate: ignoreErrors };
      return git(dirpath, args, opts, cb);
    }
  }

  /**
   * Promise for `mkdirp`
   */
  function $mkdirp(dir) {
    return function(cb) {
      return mkdirp(dir, cb);
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

  return _girror(callback);
}

module.exports = girror;