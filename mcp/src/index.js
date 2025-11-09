#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import logger from './utils/logger.js';
import config, { validateConfig } from './utils/config.js';
import documentGeneratorService from './services/documentGeneratorService.js';
import ragService from './services/ragService.js';

/**
 * MCP Server for PDP Document Generation with RAG Integration
 */
class PDPMCPServer {
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
   * Setup MCP request handlers
   */
  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_pdp_document',
            description:
              'Generate a PDP document from a template with provided data. Supports data cleaning, placeholder filling, and structured file saving.',
            inputSchema: {
              type: 'object',
              properties: {
                pdpId: {
                  type: 'string',
                  description: 'Unique PDP identifier',
                },
                windfarmName: {
                  type: 'string',
                  description: 'Name of the windfarm',
                },
                data: {
                  type: 'object',
                  description:
                    'Template data with placeholders. Supports nested objects and arrays.',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    technicians: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string' },
                          role: { type: 'string' },
                          phone: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                templateName: {
                  type: 'string',
                  description: 'Optional template filename (default: pdp_template.docx)',
                },
                saveToFile: {
                  type: 'boolean',
                  description: 'Whether to save the document to file (default: true)',
                },
              },
              required: ['pdpId', 'windfarmName', 'data'],
            },
          },
          {
            name: 'fetch_rag_context',
            description:
              'Fetch contextual information from RAG API to enrich document generation. Supports custom queries, collections, and filtering.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for context retrieval',
                },
                collection: {
                  type: 'string',
                  description: `Collection name (default: ${config.rag.defaultCollection})`,
                },
                topK: {
                  type: 'number',
                  description: `Number of results to return (default: ${config.rag.defaultTopK})`,
                },
                splitPrompt: {
                  type: 'boolean',
                  description: 'Whether to split the prompt (default: true)',
                },
                rerank: {
                  type: 'boolean',
                  description: 'Whether to rerank results (default: false)',
                },
                useHyde: {
                  type: 'boolean',
                  description: 'Whether to use HyDE (default: false)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'generate_pdp_with_rag',
            description:
              'Generate a PDP document enriched with RAG context. Combines document generation with contextual information retrieval.',
            inputSchema: {
              type: 'object',
              properties: {
                pdpId: {
                  type: 'string',
                  description: 'Unique PDP identifier',
                },
                windfarmName: {
                  type: 'string',
                  description: 'Name of the windfarm',
                },
                data: {
                  type: 'object',
                  description: 'Template data with placeholders',
                },
                ragQuery: {
                  type: 'string',
                  description: 'Optional custom RAG query (auto-generated if not provided)',
                },
                templateName: {
                  type: 'string',
                  description: 'Optional template filename',
                },
                enhanceWithRAG: {
                  type: 'boolean',
                  description: 'Whether to enhance data with RAG context (default: true)',
                },
              },
              required: ['pdpId', 'windfarmName', 'data'],
            },
          },
          {
            name: 'list_templates',
            description: 'List all available document templates',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info('Tool called', { name, args });

      try {
        switch (name) {
          case 'generate_pdp_document':
            return await this.handleGeneratePDP(args);

          case 'fetch_rag_context':
            return await this.handleFetchRAG(args);

          case 'generate_pdp_with_rag':
            return await this.handleGeneratePDPWithRAG(args);

          case 'list_templates':
            return await this.handleListTemplates();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error('Tool execution error', {
          name,
          error: error.message,
          stack: error.stack,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message,
                tool: name,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'config://server',
            name: 'Server Configuration',
            description: 'Current server configuration',
            mimeType: 'application/json',
          },
          {
            uri: 'status://rag',
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
        case 'config://server':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(config, null, 2),
              },
            ],
          };

        case 'status://rag':
          const isHealthy = await ragService.healthCheck();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  {
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    apiUrl: config.rag.apiUrl,
                    timestamp: new Date().toISOString(),
                  },
                  null,
                  2
                ),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  /**
   * Handle generate_pdp_document tool
   */
  async handleGeneratePDP(args) {
    const { pdpId, windfarmName, data, templateName, saveToFile = true } = args;

    const result = await documentGeneratorService.generatePDP({
      pdpId,
      windfarmName,
      data,
      templateName,
      saveToFile,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle fetch_rag_context tool
   */
  async handleFetchRAG(args) {
    const result = await ragService.fetchContext(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle generate_pdp_with_rag tool
   */
  async handleGeneratePDPWithRAG(args) {
    const {
      pdpId,
      windfarmName,
      data,
      ragQuery,
      templateName,
      enhanceWithRAG = true,
    } = args;

    let enhancedData = { ...data };

    // Fetch RAG context if enabled
    if (enhanceWithRAG) {
      const query =
        ragQuery ||
        `PDP ${pdpId} for windfarm ${windfarmName}. ${data.title || ''} ${
          data.description || ''
        }`;

      logger.info('Fetching RAG context for PDP generation', { query });

      const ragResult = await ragService.fetchContext({ query });

      // Enhance data with RAG context
      enhancedData.ragContext = ragResult.context;
      enhancedData.ragDocuments = ragResult.documents?.map((doc) => ({
        content: doc.content?.substring(0, 500),
        metadata: doc.metadata,
      }));
    }

    // Generate document
    const result = await documentGeneratorService.generatePDP({
      pdpId,
      windfarmName,
      data: enhancedData,
      templateName,
      saveToFile: true,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...result,
              ragEnhanced: enhanceWithRAG,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle list_templates tool
   */
  async handleListTemplates() {
    const templates = await documentGeneratorService.listTemplates();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              templates,
              count: templates.length,
              templateFolder: config.documents.templateFolder,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Setup error handlers
   */
  setupErrorHandlers() {
    this.server.onerror = (error) => {
      logger.error('MCP Server error', {
        error: error.message,
        stack: error.stack,
      });
    };

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Start the MCP server
   */
  async start() {
    try {
      // Validate configuration
      validateConfig();

      // Check RAG API health
      const ragHealthy = await ragService.healthCheck();
      if (!ragHealthy) {
        logger.warn('RAG API health check failed, but continuing startup');
      }

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MCP Server started successfully', {
        name: config.server.name,
        version: config.server.version,
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
}

// Start the server
const server = new PDPMCPServer();
server.start().catch((error) => {
  logger.error('Unhandled server error', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
