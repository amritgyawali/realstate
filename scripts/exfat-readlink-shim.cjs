'use strict';

/**
 * exFAT `readlink` shim.
 *
 * POSIX and NTFS return EINVAL when you call readlink() on something that is not
 * a symbolic link. exFAT volumes on Windows return EISDIR instead, because the
 * filesystem has no symlink concept at all. Next.js and enhanced-resolve both
 * probe entry points with readlink and treat anything other than EINVAL/ENOENT
 * as fatal, so a build from an exFAT drive dies with:
 *
 *   EISDIR: illegal operation on a directory, readlink '<file>'
 *
 * This normalises that one error code back to EINVAL. Nothing else changes: a
 * real symlink still resolves, and every other error still propagates.
 *
 * Loaded by scripts/next.cjs, which also republishes itself through NODE_OPTIONS
 * so Next's build workers inherit the fix.
 */

const fs = require('fs');

function normalise(error) {
  if (error && error.code === 'EISDIR' && /readlink/.test(error.syscall || '')) {
    error.code = 'EINVAL';
    error.errno = -4071; // UV_EINVAL on Windows
    error.message = error.message.replace('EISDIR:', 'EINVAL:');
  }
  return error;
}

const readlinkSync = fs.readlinkSync;
fs.readlinkSync = function patchedReadlinkSync(...args) {
  try {
    return readlinkSync.apply(fs, args);
  } catch (error) {
    throw normalise(error);
  }
};

const readlink = fs.readlink;
fs.readlink = function patchedReadlink(...args) {
  const callback = args[args.length - 1];
  if (typeof callback !== 'function') return readlink.apply(fs, args);
  args[args.length - 1] = (error, result) => callback(normalise(error), result);
  return readlink.apply(fs, args);
};

if (fs.promises && fs.promises.readlink) {
  const readlinkPromise = fs.promises.readlink;
  fs.promises.readlink = function patchedReadlinkPromise(...args) {
    return readlinkPromise.apply(fs.promises, args).catch((error) => {
      throw normalise(error);
    });
  };
}
