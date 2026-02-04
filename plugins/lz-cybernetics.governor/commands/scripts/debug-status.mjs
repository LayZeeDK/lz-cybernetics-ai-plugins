#!/usr/bin/env node
/**
 * Check debug logging status for lz-cybernetics.governor hooks
 * Outputs 'enabled' or 'disabled' based on flag file existence
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const debugFile = path.join(os.tmpdir(), 'lz-cybernetics.governor', 'debug-enabled');

try {
  const exists = fs.existsSync(debugFile);
  console.log(exists ? 'enabled' : 'disabled');
  process.exit(0);
} catch (error) {
  console.error('[ERROR] Failed to check debug status:', error.message);
  process.exit(1);
}
