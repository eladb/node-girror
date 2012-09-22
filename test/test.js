var fs = require('fs');
var assert = require('assert');
var path = require('path');
var async = require('async');

var girror = require('..');

var remote = 'file://localhost/' + path.join(__dirname, 'bare').replace(/\\/g, '/')

var workdir = path.join('/tmp', Math.round(Math.random() * 100000).toString());
var workdir2 = path.join('/tmp', Math.round(Math.random() * 100000).toString());

var tests = {
 
  // verify that if we run `find_meta` from the workdir root, we find the metadata.
  find_meta_from_root: function(cb) {
    return girror(remote, workdir, function(err) {
      assert(!err);
      return girror.find_meta(workdir, function(err, meta) {
        assert(!err);
        assert(meta);
        assert.equal(meta.remote, remote);
        assert.equal(meta.branch, 'master');
        return cb();
      });
    });
  },

  // verify that if we run `find_meta` from outside the workdir, we can't find metadata
  test_find_meta_from_outside: function(cb) {
    return girror(remote, workdir, function(err) {
      return girror.find_meta(path.join(workdir, '..'), function(err, meta) {
        assert(!err);
        assert(!meta);
        return cb();
      });
    });
  },

  // verify that if we run `find_meta` from a subdirectory, we still find the metadata.
  test_find_meta_from_subdir: function(cb) {
    return girror(remote, workdir, function(err) {
      var subdir = path.join(workdir, 'subdir');
      fs.mkdir(subdir, function(err) {
        assert(!err);
        girror.find_meta(subdir, function(err, meta) {
          assert(!err);
          assert(meta);
          assert.equal(meta.remote, remote);
          assert.equal(meta.branch, 'master');
          return cb();
        });
      });
    });
  },

  // run without `remote` and expect that girror will induce it from the .girror file.
  test_no_remote: function(cb) {
    return girror(remote, workdir2, function(err) {
      assert(!err);
      return girror(null, workdir2, function(err) {
        assert(!err, err);
        return cb();
      });
    });
  },

  // run without `remote`, but from outside the repo. this should fail
  test_no_remote_outside: function(cb) {
    return girror(remote, workdir2, function(err) {
      assert(!err);
      return girror(null, path.join(workdir2, '..'), function(err) {
        assert(err);
        return cb();
      });
    });
  },

  test_timeout: function(cb) {
    return girror(remote, workdir, {timeout: 10}, function(err) {
      assert(err);
      assert(err.exitCode);
      assert.equal(err.exitCode, 'killed');
      return cb();
    });
  },

  test_skip_checkout: function(cb) {
    return girror(remote, workdir, {skipExistingWorkTrees: true}, function(err) {
      // At least not crashes while using this code path
      assert(!err);
      return cb();
    });
  }
}

return async.forEachSeries(
  Object.keys(tests), 
  function(name, cb) { console.log('\ntest:', name); return tests[name](cb); }, 
  function(err) { console.log('done'); }
);