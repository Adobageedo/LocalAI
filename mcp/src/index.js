#!/usr/bin/env node

/**
 * MCP Server Entry Point
 * 
 * This file is ONLY responsible for:
 * - Initializing the MCP server
 * - Registering tools
 * - Setting up request handlers
 * - Managing server lifecycle
 * 
 * NO business logic should be in this file.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration & Utilities
import logger from './utils/logger.js';
import config, { validateConfig } from './config/index.js';
import { RESOURCE_URIS } from './config/constants.js';
import { createResourceResponse, wrapToolHandler } from './lib/mcpHelpers.js';

// Services
import ragService from './services/ragService.js';

// Tool Definitions & Handlers
import generatePdpDocument from './tools/generatePdpDocument.js';
import fetchRagContext from './tools/fetchRagContext.js';
import generatePdpWithRag from './tools/generatePdpWithRag.js';
import listTemplates from './tools/listTemplates.js';
import saveNote from './tools/saveNote.js';

// ==================== TOOL REGISTRY ====================

/**
 * Registry of all available tools
 * Add new tools here to register them
 */
const TOOL_REGISTRY = [
  generatePdpDocument,
  fetchRagContext,
  generatePdpWithRag,
  listTemplates,
  saveNote,
];

// ==================== MCP SERVER CLASS ====================

/**
 * MCP Server for PDP Document Generation with RAG Integration
 */
class MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandlers();
  }

  /**
   * Setup all MCP request handlers
   */
  setupHandlers() {
    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  /**
   * Setup tool-related handlers
   */
  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = TOOL_REGISTRY.map((tool) => tool.toolDefinition);
      
      logger.debug('Listing tools', { count: tools.length });
      
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Find the tool in registry
      const tool = TOOL_REGISTRY.find((t) => t.toolDefinition.name === name);

      if (!tool) {
        logger.error('Unknown tool requested', { name });
        throw new Error(`Unknown tool: ${name}`);
      }

      // Execute tool with wrapped error handling
      const wrappedHandler = wrapToolHandler(name, tool.handler, logger);
      return await wrappedHandler(args);
    });
  }

  /**
   * Setup resource-related handlers
   */
  setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: RESOURCE_URIS.SERVER_CONFIG,
            name: 'Server Configuration',
            description: 'Current server configuration',
            mimeType: 'application/json',
          },
          {
            uri: RESOURCE_URIS.RAG_STATUS,
            name: 'RAG API Status',
            description: 'Current status of RAG API connection',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      logger.info('Resource read', { uri });

      switch (uri) {
        case RESOURCE_URIS.SERVER_CONFIG:
          return createResourceResponse(uri, 'application/json', config);

        case RESOURCE_URIS.RAG_STATUS:
          const isHealthy = await ragService.healthCheck();
          return createResourceResponse(uri, 'application/json', {
            status: isHealthy ? 'healthy' : 'unhealthy',
            apiUrl: config.rag.apiUrl,
            timestamp: new Date().toISOString(),
          });

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  /**
   * Setup error handlers and signal handlers
   */
  setupErrorHandlers() {
    // Server error handler
    this.server.onerror = (error) => {
      logger.error('MCP Server error', {
        error: error.message,
        stack: error.stack,
      });
    };

    // Graceful shutdown on SIGINT
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await this.shutdown();
      process.exit(0);
    });

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await this.shutdown();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        reason,
        promise,
      });
      process.exit(1);
    });
  }

  /**
   * Start the MCP server
   */
  async start() {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated');

      // Check RAG API health
      const ragHealthy = await ragService.healthCheck();
      if (!ragHealthy) {
        logger.warn('RAG API health check failed, but continuing startup');
      } else {
        logger.info('RAG API health check passed');
      }

      // Connect server with stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MCP Server started successfully', {
        name: config.server.name,
        version: config.server.version,
        toolCount: TOOL_REGISTRY.length,
        ragApiUrl: config.rag.apiUrl,
        ragHealthy,
      });
    } catch (error) {
      logger.error('Failed to start MCP server', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown() {
    try {
      await this.server.close();
      logger.info('Server closed successfully');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error.message,
      });
    }
  }
}

// ==================== START SERVER ====================

const server = new MCPServer();
server.start().catch((error) => {
  logger.error('Unhandled server startup error', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
