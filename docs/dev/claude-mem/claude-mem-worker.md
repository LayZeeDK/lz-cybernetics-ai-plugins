# claude-mem Worker

The claude-mem plugin runs a background HTTP worker process that handles semantic memory operations (observations, search, context injection). The MCP server and hooks depend on this worker -- if it is not running, all memory tools will fail with:

```
[ERROR] [SYSTEM] Worker not available {"workerUrl":"http://127.0.0.1:37777"}
[ERROR] [SYSTEM] Tools will fail until Worker is started
```

## Prerequisites

- [Bun](https://bun.sh) runtime (the worker CLI requires it)
- claude-mem plugin installed via `/plugin install thedotmack`

## Running the Worker

There are three ways to manage the worker, depending on context. All require [Bun](https://bun.sh).

### Option 1: npm scripts (recommended)

Run from the marketplace plugin directory:

```bash
cd ~/.claude/plugins/marketplaces/thedotmack
npm run worker:restart
```

Available npm scripts:

| Script              | Description                                           |
|---------------------|-------------------------------------------------------|
| `worker:start`      | Start the worker if not already running               |
| `worker:stop`       | Gracefully stop the worker (HTTP shutdown, then kill) |
| `worker:restart`    | Stop then start the worker                            |
| `worker:status`     | Show whether the worker is running, PID, port, uptime |
| `worker:logs`       | Show last 50 lines of today's worker log              |
| `worker:tail`       | Tail today's worker log                               |

### Option 2: Worker CLI directly

The `worker-cli.js` script in the plugin cache accepts the same commands:

```bash
bun ~/.claude/plugins/cache/thedotmack/claude-mem/<version>/scripts/worker-cli.js <command>
```

For version 9.1.1:

```bash
# Start the worker
bun $HOME/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js start

# Restart after a crash or config change
bun $HOME/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js restart

# Check if the worker is alive
bun $HOME/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js status

# Stop the worker
bun $HOME/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js stop
```

### Option 3: HTTP admin endpoints

If the worker is running but needs to be restarted, you can hit the admin API:

```bash
# Graceful shutdown
curl -X POST http://127.0.0.1:37777/api/admin/shutdown

# Restart via wrapper IPC
curl -X POST http://127.0.0.1:37777/api/admin/restart
```

### CLI Commands

| Command   | Description                                           |
|-----------|-------------------------------------------------------|
| `start`   | Start the worker if not already running               |
| `stop`    | Gracefully stop the worker (HTTP shutdown, then kill) |
| `restart` | Stop then start the worker                            |
| `status`  | Show whether the worker is running, PID, port, uptime |

## Architecture

```
Claude Code session
    |
    +-- MCP server (mcp-server.cjs)
    |       |
    |       +-- HTTP --> Worker (worker-wrapper.cjs)
    |                        |
    |                        +-- worker-service.cjs (Express HTTP server)
    |                                |
    |                                +-- SQLite / vector DB (~/.claude-mem/)
    |
    +-- Hooks (PostToolUse, SessionStart, etc.)
            |
            +-- HTTP --> Worker
```

On Windows, the CLI spawns `worker-wrapper.cjs` instead of `worker-service.cjs` directly. The wrapper manages the inner process lifecycle and handles graceful restart/shutdown via IPC messages.

## Configuration

Settings are stored in `~/.claude-mem/settings.json`. Key worker-related settings:

| Setting                    | Default       | Description                       |
|----------------------------|---------------|-----------------------------------|
| `CLAUDE_MEM_WORKER_PORT`   | `37777`       | Port the worker listens on        |
| `CLAUDE_MEM_WORKER_HOST`   | `127.0.0.1`   | Host the worker binds to          |
| `CLAUDE_MEM_DATA_DIR`      | `~/.claude-mem`| Data directory for DB, logs, PIDs |
| `CLAUDE_MEM_LOG_LEVEL`     | `INFO`        | Log verbosity (DEBUG, INFO, WARN, ERROR, SILENT) |

## Files and Directories

| Path                              | Purpose                          |
|-----------------------------------|----------------------------------|
| `~/.claude-mem/worker.pid`        | PID file (JSON with pid, port, startedAt) |
| `~/.claude-mem/logs/worker-YYYY-MM-DD.log` | Daily worker log file   |
| `~/.claude-mem/claude-mem.db`     | SQLite database                  |
| `~/.claude-mem/settings.json`     | Configuration overrides          |

## Health Checks

The worker exposes health and readiness endpoints:

```bash
# Quick health check
curl http://127.0.0.1:37777/health

# Readiness check (used by the CLI during startup)
curl http://127.0.0.1:37777/api/readiness

# Version info
curl http://127.0.0.1:37777/api/version
```

## API Endpoints

The worker serves an Express HTTP API. Below is the full endpoint catalog.

### System

| Method | Endpoint                | Description                     |
|--------|-------------------------|---------------------------------|
| GET    | `/health`               | Health check                    |
| GET    | `/api/readiness`        | Readiness probe (startup gate)  |
| GET    | `/api/version`          | Worker version                  |
| GET    | `/api/health`           | API-level health check          |
| POST   | `/api/admin/shutdown`   | Graceful shutdown               |
| POST   | `/api/admin/restart`    | Trigger restart via wrapper IPC |

### Sessions

| Method | Endpoint                             | Description                    |
|--------|--------------------------------------|--------------------------------|
| POST   | `/api/sessions/init`                 | Initialize a new session       |
| POST   | `/api/sessions/complete`             | Mark session complete          |
| POST   | `/api/sessions/observations`         | Add observations to a session  |
| POST   | `/api/sessions/summarize`            | Generate session summary       |
| GET    | `/api/session/:id`                   | Get session by ID              |
| POST   | `/api/sdk-sessions/batch`            | Batch session operations       |

### Observations and Memory

| Method | Endpoint                      | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/observations`           | List observations                   |
| GET    | `/api/observation/:id`        | Get observation by ID               |
| POST   | `/api/observations/batch`     | Batch create observations           |
| POST   | `/api/memory/save`            | Save a memory entry                 |
| GET    | `/api/decisions`              | List decisions                      |
| GET    | `/api/how-it-works`           | Get how-it-works entries            |

### Search

| Method | Endpoint                      | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/search`                 | General search                      |
| GET    | `/api/search/observations`    | Search observations                 |
| GET    | `/api/search/sessions`        | Search sessions                     |
| GET    | `/api/search/prompts`         | Search prompts                      |
| GET    | `/api/search/by-concept`      | Search by concept                   |
| GET    | `/api/search/by-file`         | Search by file path                 |
| GET    | `/api/search/by-type`         | Search by observation type          |
| GET    | `/api/search/help`            | Search help/usage info              |

### Context

| Method | Endpoint                      | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/context/inject`         | Get context for injection           |
| GET    | `/api/context/preview`        | Preview context output              |
| GET    | `/api/context/recent`         | Get recent context entries          |
| GET    | `/api/context/timeline`       | Context timeline view               |

### Timeline and Stats

| Method | Endpoint                      | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/timeline`               | Full timeline                       |
| GET    | `/api/timeline/by-query`      | Filtered timeline                   |
| GET    | `/api/changes`                | Recent changes                      |
| GET    | `/api/stats`                  | Statistics and metrics              |
| GET    | `/api/summaries`              | Session summaries                   |

### Processing Queue

| Method | Endpoint                        | Description                       |
|--------|---------------------------------|-----------------------------------|
| GET    | `/api/pending-queue`            | View pending queue                |
| POST   | `/api/pending-queue/process`    | Process pending items             |
| DELETE | `/api/pending-queue/all`        | Clear entire queue                |
| DELETE | `/api/pending-queue/failed`     | Clear failed items only           |
| GET    | `/api/processing-status`        | Current processing status         |
| POST   | `/api/processing`               | Trigger processing                |

### Configuration

| Method | Endpoint                      | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/settings`               | Get current settings                |
| POST   | `/api/settings`               | Update settings                     |
| GET    | `/api/projects`               | List projects                       |
| GET    | `/api/prompts`                | List prompts                        |
| GET    | `/api/prompt/:id`             | Get prompt by ID                    |
| GET    | `/api/instructions`           | Get instructions                    |
| POST   | `/api/import`                 | Import data                         |

### Branch Management

| Method | Endpoint                      | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/branch/status`          | Current branch status               |
| POST   | `/api/branch/switch`          | Switch active branch                |
| POST   | `/api/branch/update`          | Update branch info                  |

### MCP and Logs

| Method | Endpoint                      | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/mcp/status`             | MCP server status                   |
| POST   | `/api/mcp/toggle`             | Enable/disable MCP                  |
| GET    | `/api/logs`                   | Retrieve logs                       |
| POST   | `/api/logs/clear`             | Clear logs                          |

### Streaming

| Method | Endpoint   | Description                              |
|--------|------------|------------------------------------------|
| GET    | `/stream`  | Server-Sent Events stream                |

## Troubleshooting

### Worker not starting on Windows

When `worker:restart` or `worker:start` fails with "Process died during startup", follow this diagnostic path:

**Step 1: Check if the port is in use**

```bash
netstat -ano | findstr 37777
```

If nothing is returned, the port is free -- check logs instead (Step 5). If a `LISTENING` entry appears, note the PID and continue.

**Step 2: Identify the process holding the port**

```powershell
Get-Process -Id <PID> -ErrorAction SilentlyContinue
```

If the process exists, kill it (or stop the old worker first with `npm run worker:stop`). If the process does **not** exist, you have a zombie socket -- continue to Step 3.

**Step 3: Kill child processes that inherited the socket handle**

On Windows, child processes inherit socket handles by default. The dead worker's children keep the port occupied even after the worker exits. Find and kill them:

```powershell
# Find direct children of the dead worker PID
Get-CimInstance Win32_Process |
  Where-Object { $_.ParentProcessId -eq <DEAD_PID> } |
  Select-Object ProcessId, Name, CommandLine

# Common culprits: conhost.exe, chroma-mcp.exe, python.exe, uv.exe
# Kill each child:
Stop-Process -Id <CHILD_PID> -Force
```

After killing children, wait a few seconds and re-check `netstat -ano | findstr 37777`.

**Step 4: Clean up half-closed connections with SetTcpEntry**

If `CLOSE_WAIT` or `FIN_WAIT_2` connections remain (but no `LISTENING`), they can be cleared with the Windows IP Helper API. Run this from PowerShell (does not require admin for half-closed connections):

```powershell
Add-Type -TypeDefinition @"
using System;
using System.Net;
using System.Runtime.InteropServices;
public class TcpKiller {
    [StructLayout(LayoutKind.Sequential)]
    struct R { public int s, la, lp, ra, rp; }
    [DllImport("iphlpapi.dll")] static extern int SetTcpEntry(ref R r);
    public static int Close(string la, int lp, string ra, int rp) {
        R r = new R();
        r.s = 12; // MIB_TCP_STATE_DELETE_TCB
        r.la = BitConverter.ToInt32(IPAddress.Parse(la).GetAddressBytes(), 0);
        r.ra = BitConverter.ToInt32(IPAddress.Parse(ra).GetAddressBytes(), 0);
        r.lp = IPAddress.HostToNetworkOrder((short)lp) & 0xFFFF;
        r.rp = IPAddress.HostToNetworkOrder((short)rp) & 0xFFFF;
        return SetTcpEntry(ref r);
    }
}
"@

Get-NetTCPConnection -LocalPort 37777 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -ne "Listen" } |
  ForEach-Object {
    $r = [TcpKiller]::Close($_.LocalAddress, $_.LocalPort, $_.RemoteAddress, $_.RemotePort)
    Write-Host "$($_.State): $($_.LocalAddress):$($_.LocalPort) -> $($_.RemoteAddress):$($_.RemotePort) = $r"
  }
```

A return value of `0` means success.

**Step 5: Check worker logs**

```bash
# Today's log
cat ~/.claude-mem/logs/worker-$(date +%Y-%m-%d).log

# Error log (Windows only, created by Start-Process redirection)
cat ~/.claude-mem/logs/worker-$(date +%Y-%m-%d).log.err
```

The wrapper log shows startup/shutdown events. Look for "Inner exited unexpectedly" which indicates the worker-service crashed during startup.

**Step 6: Delete stale PID file**

If the worker died without cleaning up:

```bash
rm ~/.claude-mem/worker.pid
```

**Step 7: Reboot (last resort)**

If the `LISTENING` socket persists after killing all child processes and no live process holds the handle, this is a **Windows kernel TCP table leak**. The socket entry exists in the kernel with no backing process or handle. No userspace tool can reclaim it.

Verify with [Sysinternals Handle](https://learn.microsoft.com/en-us/sysinternals/downloads/handle):

```bash
# Download and extract (ARM64 native build included)
curl -sL -o Handle.zip https://download.sysinternals.com/files/Handle.zip
unzip Handle.zip -d handle_tool

# Check if any process holds a socket handle for the dead PID
handle_tool/handle64a.exe -a -accepteula -p <DEAD_PID>
# "No matching handles found" confirms a kernel leak
```

**Why `SetTcpEntry` cannot fix LISTEN sockets:** `SetTcpEntry` with `MIB_TCP_STATE_DELETE_TCB` works for established and half-closed connections (CLOSE_WAIT, FIN_WAIT_2) but returns error 317 for LISTEN sockets, even with full Administrator privileges and SeDebugPrivilege. `SO_REUSEADDR` is also blocked because the worker socket uses `SO_EXCLUSIVEADDRUSE`. A reboot is the only resolution.

### Orphan process cleanup

This repository includes a `SessionStart` hook (`.claude/hooks/cleanup-claude-mem-orphans.mjs`) that cleans up orphaned claude-mem processes on Windows. The hook works around a bug in claude-mem's built-in orphan reaper where `\\$_` produces invalid PowerShell syntax.

Orphaned processes older than 30 minutes matching `mcp-server.cjs`, `worker-service.cjs`, or `chroma-mcp` are terminated automatically at session start.

**Limitation:** The hook kills orphaned *processes* via `taskkill`. It cannot reclaim zombie TCP sockets where the process has died but the kernel socket table entry persists (see Step 7 above).

### Manual health check

```bash
curl -s http://127.0.0.1:37777/api/readiness
```

If this hangs or returns an error, the worker needs to be restarted. If it times out and `netstat` shows the port in use by a dead PID, follow the diagnostic steps above.
