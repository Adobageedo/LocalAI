/**
 * MCP response formatters and helpers
 */

/**
 * Create a successful tool response
 * @param {*} data - Response data (will be JSON stringified)
 * @returns {Object} MCP tool response
 */
export function createSuccessResponse(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Create an error tool response
 * @param {string} toolName - Name of the tool that failed
 * @param {Error} error - Error object
 * @returns {Object} MCP tool error response
 */
export function createErrorResponse(toolName, error) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          tool: toolName,
          code: error.code || 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
        }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Create a resource response
 * @param {string} uri - Resource URI
 * @param {string} mimeType - MIME type
 * @param {*} data - Resource data
 * @returns {Object} MCP resource response
 */
export function createResourceResponse(uri, mimeType, data) {
  return {
    contents: [
      {
        uri,
        mimeType,
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Wrap a tool handler with error handling
 * @param {string} toolName - Name of the tool
 * @param {Function} handler - Tool handler function
 * @param {Object} logger - Logger instance
 * @returns {Function} Wrapped handler
 */
export function wrapToolHandler(toolName, handler, logger) {
  return async (args) => {
    try {
      logger.info(`Tool called: ${toolName}`, { args });
      const result = await handler(args);
      return createSuccessResponse(result);
    } catch (error) {
      logger.error(`Tool execution error: ${toolName}`, {
        error: error.message,
        stack: error.stack,
        code: error.code,
      });
      return createErrorResponse(toolName, error);
    }
  };
}

/**
 * Create a tool definition object
 * @param {string} name - Tool name
 * @param {string} description - Tool description
 * @param {Object} inputSchema - JSON schema for inputs
 * @returns {Object} Tool definition
 */
export function createToolDefinition(name, description, inputSchema) {
  return {
    name,
    description,
    inputSchema,
  };
}

export default {
  createSuccessResponse,
  createErrorResponse,
  createResourceResponse,
  wrapToolHandler,
  createToolDefinition,
};
