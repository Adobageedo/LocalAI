/**
 * Custom error classes for better error handling
 */

/**
 * Base error class for MCP server
 */
export class MCPError extends Error {
  constructor(message, code = 'MCP_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends MCPError {
  constructor(message) {
    super(message, 'CONFIG_ERROR');
  }
}

/**
 * Validation error
 */
export class ValidationError extends MCPError {
  constructor(message, errors = []) {
    super(message, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends MCPError {
  constructor(toolName, message, originalError = null) {
    super(`Tool '${toolName}' failed: ${message}`, 'TOOL_ERROR');
    this.toolName = toolName;
    this.originalError = originalError;
  }
}

/**
 * Service error
 */
export class ServiceError extends MCPError {
  constructor(serviceName, message, originalError = null) {
    super(`Service '${serviceName}' error: ${message}`, 'SERVICE_ERROR');
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends MCPError {
  constructor(resourceType, resourceId) {
    super(`${resourceType} not found: ${resourceId}`, 'NOT_FOUND');
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * External API error
 */
export class ExternalAPIError extends MCPError {
  constructor(apiName, message, statusCode = null) {
    super(`External API '${apiName}' error: ${message}`, 'EXTERNAL_API_ERROR');
    this.apiName = apiName;
    this.statusCode = statusCode;
  }
}

export default {
  MCPError,
  ConfigurationError,
  ValidationError,
  ToolExecutionError,
  ServiceError,
  ResourceNotFoundError,
  ExternalAPIError,
};
