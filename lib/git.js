var spawn = require('child_process').spawn;
var path = require('path');
var con = require('ctxobj').console;

var prog = 'git';

/**
 * Calls 'git' with the specified `args` in `cwd` directory.
 * `callback` is `function(err)`
 */
module.exports = function (cwd, args, options, callback) {
    if (!cwd)  throw new Error('`cwd` is required');
    if (!args) throw new Error('`args` is required');
    if (typeof args === "string") args = [ args ];
    if (typeof options === 'function') callback = options;
    if (!callback) callback = function() { };

    options      = options          || {};
    var env      = options.env      || process.env;
    var logger   = options.logger   || console;
    var tolerate = 'tolerate' in options ? options.tolerate : false;
    var verbose  = 'verbose' in options ? options.verbose : true;

    // push context to logger.
    logger = con(logger).pushctx(prog + ' ' + args[0]);


    if (verbose) logger.log('$ CWD=' + cwd);

    var command = prog + ' ' + args.join(' ');
    logger.log('$ ' + command);

    var git = spawn(prog, args, { cwd: cwd, env: env });

    if (verbose) {
        git.stdout.on('data', function (data) { 
            data.toString().split('\n').forEach(function(line) {
                if (!line || line.trim().length === 0) return;
                logger.log(line);
            });
        });

        git.stderr.on('data', function (data) { 
            data.toString().split('\n').forEach(function(line) {
                if (!line || line.trim().length === 0) return;
                logger.log(line);
            });
        });
    }

    // keep a buffer of 100 last stderr events in case we will have an error
    var errors = [];
    git.stderr.on('data', function(data) {
        if (errors.length < 100) errors.push(data.toString());
    });

    git.on('error', function(err) {
        var err = new Error('unable to spawn git: ' + err.toString());
        logger.error(err);
        return callback(err);
    })

    git.on('exit', function (code) {
        var err = (tolerate || code === 0) ? null : new Error('"' + command + '" exited with status ' + code + ':\n' + errors.join(''));
        if (err) logger.error(err);
        return callback(err);
    });
};
