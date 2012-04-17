var urlparser = require('url').parse;
var urlformat = require('url').format;

/**
 * Use the remote URL as-is without any modification
 */
exports.no_auth = function() {
  return function(url) {
    return url;
  };
};

/**
 * Adds authorization prefix ('user:password@') to the URL
 */
exports.auth = function(user, password) {
  return function(url) {
    var purl = urlparser(url);
    purl.auth = user + ':' + password;
    return urlformat(purl);
  };
};

/**
 * Convert GitHub https URLs to SSH remotes
 */
exports.github_ssh = function() {
  return function(url) {
    var purl = urlparser(url);
    if (purl.hostname !== 'github.com') return url; // ignore if non-github
    return 'git@' + purl.hostname + ':' + purl.pathname.substring(1) + '.git';
  };
};