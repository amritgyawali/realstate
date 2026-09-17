'use strict';

/**
 * Next.js launcher that installs the exFAT readlink shim first.
 *
 * Next forks build and render workers, so the shim is also pushed into
 * NODE_OPTIONS before the CLI starts — that way every child process inherits it.
 * On NTFS, APFS or ext4 the shim is inert, so this is safe to use everywhere.
 *
 * Usage: node scripts/next.cjs <dev|build|start|lint> [...args]
 */

const path = require('path');

const shim = path.join(__dirname, 'exfat-readlink-shim.cjs');
require(shim);

// NODE_OPTIONS is parsed with shell-style escaping, so a Windows path would lose
// its backslashes. Node accepts forward slashes on every platform.
const portable = shim.split(path.sep).join('/');
const existing = process.env.NODE_OPTIONS ?? '';
if (!existing.includes('exfat-readlink-shim')) {
  process.env.NODE_OPTIONS = `${existing} --require "${portable}"`.trim();
}

require('next/dist/bin/next');
