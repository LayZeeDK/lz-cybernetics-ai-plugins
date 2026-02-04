#!/usr/bin/env node
/**
 * Enable debug logging for lz-cybernetics.governor hooks
 * Creates a flag file at os.tmpdir()/lz-cybernetics.governor/debug-enabled
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const debugDir = path.join(os.tmpdir(), 'lz-cybernetics.governor');
const debugFile = path.join(debugDir, 'debug-enabled');

try {
  fs.mkdirSync(debugDir, { recursive: true });
  fs.writeFileSync(debugFile, '');
  console.log('Debug flag created at:', debugFile);
  process.exit(0);
} catch (error) {
  console.error('[ERROR] Failed to create debug flag:', error.message);
  process.exit(1);
}
