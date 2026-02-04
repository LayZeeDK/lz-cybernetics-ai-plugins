#!/usr/bin/env node
/**
 * Disable debug logging for lz-cybernetics.governor hooks
 * Removes the flag file at os.tmpdir()/lz-cybernetics.governor/debug-enabled
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const debugFile = path.join(os.tmpdir(), 'lz-cybernetics.governor', 'debug-enabled');

try {
  fs.unlinkSync(debugFile);
  console.log('Debug flag removed');
  process.exit(0);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('Debug flag was not enabled');
    process.exit(0);
  }
  console.error('[ERROR] Failed to remove debug flag:', error.message);
  process.exit(1);
}
