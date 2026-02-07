/**
 * Workaround for claude-mem orphan reaper bug on Windows.
 *
 * claude-mem's ProcessManager.ts uses `\\$_` in PowerShell commands,
 * which produces `\$_` - invalid PowerShell syntax (PS uses backtick
 * for escaping, not backslash). This causes the orphan reaper to fail
 * every 5 minutes with "You must provide a value expression following
 * the '-and' operator."
 *
 * This SessionStart hook runs the correct PowerShell command to clean
 * up orphaned claude-mem processes before the buggy reaper fires.
 *
 * @see https://github.com/thedotmack/claude-mem ProcessManager.ts:229
 */
import { execSync } from 'node:child_process';
import process from 'node:process';

// Match claude-mem's constants exactly
const ORPHAN_PROCESS_PATTERNS = [
  'mcp-server.cjs',
  'worker-service.cjs',
  'chroma-mcp',
];
const ORPHAN_MAX_AGE_MINUTES = 30;

function cleanup() {
  if (process.platform !== 'win32') {
    return;
  }

  const currentPid = process.pid;

  // Build the Where-Object filter with correct PowerShell $_ syntax
  // (claude-mem's bug: uses \\$_ which becomes \$_ - invalid in PS)
  const patternConditions = ORPHAN_PROCESS_PATTERNS
    .map(p => `$_.CommandLine -like '*${p}*'`)
    .join(' -or ');

  const psCommand = [
    'Get-CimInstance Win32_Process',
    `| Where-Object { (${patternConditions}) -and $_.ProcessId -ne ${currentPid} }`,
    '| Select-Object ProcessId, CreationDate',
    '| ConvertTo-Json',
  ].join(' ');

  let stdout;

  try {
    stdout = execSync(
      `powershell -NoProfile -NonInteractive -Command "${psCommand}"`,
      { timeout: 10_000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch {
    // PowerShell command failed - nothing to clean up or PS unavailable
    return;
  }

  if (!stdout || !stdout.trim() || stdout.trim() === 'null') {
    return;
  }

  let processes;

  try {
    processes = JSON.parse(stdout);
  } catch {
    return;
  }

  const processList = Array.isArray(processes) ? processes : [processes];
  const now = Date.now();
  const pidsToKill = [];

  for (const proc of processList) {
    const pid = proc.ProcessId;

    if (!Number.isInteger(pid) || pid <= 0 || pid === currentPid) {
      continue;
    }

    // Parse Windows CIM date format: /Date(1234567890123)/
    const creationMatch = proc.CreationDate?.match(/\/Date\((\d+)\)\//);

    if (creationMatch) {
      const creationTime = parseInt(creationMatch[1], 10);
      const ageMinutes = (now - creationTime) / (1000 * 60);

      if (ageMinutes >= ORPHAN_MAX_AGE_MINUTES) {
        pidsToKill.push(pid);
      }
    }
  }

  for (const pid of pidsToKill) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, {
        timeout: 5_000,
        stdio: 'ignore',
      });
    } catch {
      // Process may have already exited
    }
  }
}

cleanup();
