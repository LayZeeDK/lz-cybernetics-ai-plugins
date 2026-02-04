/**
 * Tool Schema Definitions
 *
 * Defines required fields, type constraints, defaults, and forbidden fields
 * for each tool that Claude Code can invoke.
 */

/**
 * Schema for built-in Claude Code tools
 * Each tool defines:
 * - required: fields that must be present
 * - types: expected types for fields
 * - defaults: default values for optional fields
 * - forbidden: fields that should never be present
 */
export const toolSchemas = {
  Read: {
    required: ['file_path'],
    types: {
      file_path: 'string',
      offset: 'number',
      limit: 'number',
    },
    defaults: {},
    forbidden: [],
  },

  Write: {
    required: ['file_path', 'content'],
    types: {
      file_path: 'string',
      content: 'string',
    },
    defaults: {},
    forbidden: [],
  },

  Edit: {
    required: ['file_path', 'old_string', 'new_string'],
    types: {
      file_path: 'string',
      old_string: 'string',
      new_string: 'string',
      replace_all: 'boolean',
    },
    defaults: {
      replace_all: false,
    },
    forbidden: [],
  },

  Bash: {
    required: ['command'],
    types: {
      command: 'string',
      timeout: 'number',
      run_in_background: 'boolean',
    },
    defaults: {},
    forbidden: [],
  },

  Glob: {
    required: ['pattern'],
    types: {
      pattern: 'string',
      path: 'string',
    },
    defaults: {},
    forbidden: [],
  },

  Grep: {
    required: ['pattern'],
    types: {
      pattern: 'string',
      path: 'string',
      glob: 'string',
      type: 'string',
      output_mode: 'string',
    },
    defaults: {},
    forbidden: [],
  },

  Task: {
    required: ['description', 'prompt', 'subagent_type'],
    types: {
      description: 'string',
      prompt: 'string',
      subagent_type: 'string',
      model: 'string',
      run_in_background: 'boolean',
    },
    defaults: {},
    forbidden: [],
  },

  WebFetch: {
    required: ['url', 'prompt'],
    types: {
      url: 'string',
      prompt: 'string',
    },
    defaults: {},
    forbidden: [],
  },

  WebSearch: {
    required: ['query'],
    types: {
      query: 'string',
      allowed_domains: 'array',
      blocked_domains: 'array',
    },
    defaults: {},
    forbidden: [],
  },

  AskUserQuestion: {
    required: ['questions'],
    types: {
      questions: 'array',
    },
    defaults: {},
    forbidden: [],
  },

  LSP: {
    required: ['operation', 'filePath', 'line', 'character'],
    types: {
      operation: 'string',
      filePath: 'string',
      line: 'number',
      character: 'number',
    },
    defaults: {},
    forbidden: [],
  },
};

/**
 * Get schema for a tool, with fallback for unknown tools
 * @param {string} toolName - Name of the tool
 * @returns {object} Schema object
 */
export function getSchema(toolName) {
  // Handle MCP tools (mcp__server__tool format)
  if (toolName.startsWith('mcp__')) {
    return {
      required: [],
      types: {},
      defaults: {},
      forbidden: [],
    };
  }

  return toolSchemas[toolName] || {
    required: [],
    types: {},
    defaults: {},
    forbidden: [],
  };
}

/**
 * Validate tool input against schema
 * @param {string} toolName - Name of the tool
 * @param {object} toolInput - Input parameters for the tool
 * @returns {object} Validation result with missing_fields and invalid_values
 */
export function validateSchema(toolName, toolInput) {
  const schema = getSchema(toolName);
  const result = {
    missing_fields: [],
    invalid_values: [],
  };

  // Check required fields
  for (const field of schema.required) {
    if (!(field in toolInput) || toolInput[field] === undefined || toolInput[field] === null) {
      result.missing_fields.push(field);
    }
  }

  // Check types
  for (const [field, expectedType] of Object.entries(schema.types)) {
    if (field in toolInput && toolInput[field] !== undefined && toolInput[field] !== null) {
      const actualType = Array.isArray(toolInput[field]) ? 'array' : typeof toolInput[field];
      if (actualType !== expectedType) {
        result.invalid_values.push({
          field,
          expected: expectedType,
          got: actualType,
        });
      }
    }
  }

  // Check forbidden fields
  for (const field of schema.forbidden) {
    if (field in toolInput) {
      result.invalid_values.push({
        field,
        reason: 'forbidden',
      });
    }
  }

  return result;
}
