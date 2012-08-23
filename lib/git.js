var spawn = require('child_process').spawn;
var path = require('path');
var con = require('ctxobj').console;

var prog = 'git';

/**
 * Calls 'git' with the specified `args`.
 * `callback` is `function(err)`
 */
module.exports = function (args, options, callback) {
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
    logger = con(logger).pushctx(prog);

    var command = prog + ' ' + args.join(' ');
    logger.log('$ ' + command);

    var git = spawn(prog, args, { env: env });
    var timeout;
    var killed;

    if (options.timeout) {
        timeout = setTimeout(
            function() {
                logger.warn('Command did not return after ' + options.timeout + ' hence killing');
                killed = true;
                git.kill();
            },
            options.timeout
        );
    }

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
                logger.info(line);
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
        if (timeout) {
            clearTimeout(timeout);
        }
        var reason = killed ? 'killed' : code;
        var err = (tolerate || !reason) ? null : new Error('"' + command + '" exited with status ' + reason + ':\n' + errors.join(''));
        if (err) {
            logger.error(err);
            err.exitCode = code;
        }
        return callback(err);
    });

    return git;
};
