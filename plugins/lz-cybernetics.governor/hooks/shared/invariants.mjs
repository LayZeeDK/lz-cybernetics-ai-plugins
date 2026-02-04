/**
 * Global Invariants and Safety Rules
 *
 * Defines allowed tools, safety constraints, retry limits,
 * and no-oscillation rules for the cybernetic verifier.
 */

/**
 * List of all allowed built-in tools
 * MCP tools (mcp__*) are allowed by default
 */
export const allowedTools = new Set([
  // File operations
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',

  // Execution
  'Bash',
  'Task',
  'TaskOutput',
  'TaskStop',

  // Web
  'WebFetch',
  'WebSearch',

  // Interaction
  'AskUserQuestion',
  'Skill',

  // Code intelligence
  'LSP',

  // Notebooks
  'NotebookEdit',

  // MCP
  'ToolSearch',
  'ListMcpResourcesTool',
  'ReadMcpResourceTool',

  // Planning
  'EnterPlanMode',
  'ExitPlanMode',

  // Tasks
  'TaskCreate',
  'TaskGet',
  'TaskUpdate',
  'TaskList',
]);

/**
 * Safety constraints for specific tools
 */
export const safetyConstraints = {
  Write: {
    // Patterns for sensitive files that should be flagged
    sensitivePatterns: [
      /\.env$/i,
      /\.env\./i,
      /credentials/i,
      /secrets?\./i,
      /\.pem$/i,
      /\.key$/i,
      /password/i,
    ],
  },

  Bash: {
    // Dangerous command patterns (Unix and PowerShell)
    dangerousPatterns: [
      // Unix dangerous commands
      /rm\s+-rf\s+[\/~]/i,           // rm -rf with root or home
      />\s*\/dev\/sd/i,               // writing to block devices
      /mkfs\./i,                      // filesystem formatting
      /dd\s+if=/i,                    // raw disk operations
      /:(){/,                         // fork bomb
      // PowerShell dangerous commands
      /Remove-Item\s+.*-Recurse.*[A-Z]:\\/i,  // Remove-Item -Recurse on drive root
      /Remove-Item\s+.*[A-Z]:\\.*-Recurse/i,  // Same with different flag order
      /rd\s+\/s\s+[A-Z]:\\/i,                 // rd /s (rmdir) on drive root
      /rmdir\s+\/s\s+[A-Z]:\\/i,              // rmdir /s on drive root
      /Format-Volume/i,                       // disk formatting
      /Clear-Disk/i,                          // disk wiping
      /Initialize-Disk/i,                     // disk initialization
    ],
  },

  Edit: {
    // Maximum size of old_string to prevent accidental large replacements
    maxOldStringLength: 10000,
  },
};

/**
 * Retry and oscillation limits
 */
export const limits = {
  // Maximum consecutive failures for the same tool
  maxConsecutiveFailures: 3,

  // Maximum retries for the same operation (same tool + similar input)
  maxRetries: 5,

  // Time window for detecting oscillation (ms)
  oscillationWindowMs: 30000,

  // Minimum distinct operations before allowing retry of failed pattern
  minDistinctOperations: 2,

  // Maximum history entries to keep
  maxHistorySize: 100,
};

/**
 * Check if a tool is allowed
 * @param {string} toolName - Name of the tool
 * @returns {boolean} Whether the tool is allowed
 */
export function isToolAllowed(toolName) {
  // MCP tools are allowed by default
  if (toolName.startsWith('mcp__')) {
    return true;
  }

  return allowedTools.has(toolName);
}

/**
 * Check safety constraints for a specific tool
 * @param {string} toolName - Name of the tool
 * @param {object} toolInput - Input parameters
 * @returns {string[]} List of safety violations
 */
export function checkSafetyConstraints(toolName, toolInput) {
  const violations = [];
  const constraints = safetyConstraints[toolName];

  if (!constraints) {
    return violations;
  }

  // Check Write constraints
  if (toolName === 'Write' && toolInput.file_path) {
    for (const pattern of constraints.sensitivePatterns) {
      if (pattern.test(toolInput.file_path)) {
        violations.push(`Sensitive file pattern detected: ${toolInput.file_path}`);
        break;
      }
    }
  }

  // Check Bash constraints
  if (toolName === 'Bash' && toolInput.command) {
    for (const pattern of constraints.dangerousPatterns) {
      if (pattern.test(toolInput.command)) {
        violations.push(`Dangerous command pattern detected`);
        break;
      }
    }
  }

  // Check Edit constraints
  if (toolName === 'Edit' && toolInput.old_string) {
    if (toolInput.old_string.length > constraints.maxOldStringLength) {
      violations.push(`old_string exceeds maximum length (${constraints.maxOldStringLength})`);
    }
  }

  return violations;
}
