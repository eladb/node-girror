var fs = require('fs');
var path = require('path');

/**
 * Looks for `.girror.json` up the filesystem starting from `dir` and returns
 * it's contents (or `null` if it could not be found)
 * `dir` - The directory where to start (use `null` to start from `process.cwd()`)
 * `options` is optional.
 * `options.girrorfile` - The name of the girror metadata file to look for (default is `.girror.json`)
 * `callback` is `function(err, meta)` where `meta` contains the contents of the girror file.
 */
module.exports = function find(dir, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  var girrorfile = 'girrorfile' in options ? options.girrorfile : '.girror.json';
  dir = dir || process.cwd();
  callback = callback || function() {};

  //--

  function _parseFile(f, cb) {
    return fs.readFile(f, function(err, data) {
      if (err) return cb(err);
      var meta;
      try {
        meta = JSON.parse(data);
      }
      catch(e) {
        return cb(e);
      }
      return cb(null, meta);
    })
  }

  dir = path.resolve(dir);
  var f = path.join(dir, girrorfile);
  return path.exists(f, function(exists) {
    if (exists) {
      return _parseFile(f, function(err, meta) {
        if (err) return callback(err);
        meta.worktree = dir;
        return callback(null, meta);
      });
    }
    else {
      // if we have reached the root and still didn't find a file, return with `null`.
      var parent = path.join(dir, '..');
      if (parent === dir) {
        return callback(null, null);
      }
      else {
        // call recursively with parent
        return find(parent, options, callback);
      }
    }
  });
};