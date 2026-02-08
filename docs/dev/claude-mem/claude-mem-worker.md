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
bun ~/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js start

# Restart after a crash or config change
bun ~/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js restart

# Check if the worker is alive
bun ~/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js status

# Stop the worker
bun ~/.claude/plugins/cache/thedotmack/claude-mem/9.1.1/scripts/worker-cli.js stop
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

1. Check Task Manager for zombie `bun.exe` or `node.exe` processes
2. Verify the port is not in use: `netstat -ano | findstr 37777`
3. Check logs: `~/.claude-mem/logs/worker-YYYY-MM-DD.log`
4. Delete stale PID file: `~/.claude-mem/worker.pid`

### Orphan process cleanup

This repository includes a `SessionStart` hook (`.claude/hooks/cleanup-claude-mem-orphans.mjs`) that cleans up orphaned claude-mem processes on Windows. The hook works around a bug in claude-mem's built-in orphan reaper where `\\$_` produces invalid PowerShell syntax.

Orphaned processes older than 30 minutes matching `mcp-server.cjs`, `worker-service.cjs`, or `chroma-mcp` are terminated automatically at session start.

### Manual health check

```bash
curl -s http://127.0.0.1:37777/api/readiness
```

If this returns an error or times out, the worker needs to be restarted.
