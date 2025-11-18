import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Configure your MCP server executable & env
const mcpServerCommand = process.execPath || "node";
// Use absolute path from environment variable or fallback
const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH || "/Users/edoardo/Documents/LocalAI/mcp/src/index.js";
const mcpServerArgs = [MCP_SERVER_PATH];

const mcpEnv = {
  RAG_API_URL: "http://localhost:8000",
  RAG_API_KEY: "your-api-key-here",
  PDP_BASE_FOLDER: "/Users/edoardo/Documents/LocalAI/mcp/data/PDP",
  TEMPLATE_FOLDER: "/Users/edoardo/Documents/LocalAI/mcp/data/templates",
  LOG_LEVEL: "info",
  LOG_FILE: "/Users/edoardo/Documents/LocalAI/mcp/data/logs/mcp-server.log",
  MCP_SERVER_NAME: "pdp-document-generator",
  MCP_SERVER_VERSION: "1.0.0",
};

let mcpClient: Client | null = null;

/**
 * Convert MCP tool format to OpenAI tool format
 */
function convertMcpToolsToOpenAI(mcpTools: any[]): any[] {
  return mcpTools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.inputSchema || { type: "object", properties: {} }
    }
  }));
}

/**
 * Initialize MCP client and return tools in OpenAI format
 * Returns empty array in production (MCP not available in serverless)
 */
export async function getMcpTools() {
  // MCP not available in production/Vercel
  if (mcpClient) {
    const toolList = await mcpClient.listTools();
    const openAITools = convertMcpToolsToOpenAI(toolList.tools);
    return openAITools;
  }

  const transport = new StdioClientTransport({
    command: mcpServerCommand,
    args: mcpServerArgs,
    env: mcpEnv,
  });

  mcpClient = new Client(
    {
      name: "pdp-document-generator",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await mcpClient.connect(transport);

  console.log("✅ MCP Client initialized");
  const toolList = await mcpClient.listTools();
  console.log("Available tools:", toolList.tools.map((t: any) => t.name));

  // Convert MCP tools to OpenAI format
  const openAITools = convertMcpToolsToOpenAI(toolList.tools);
  return openAITools;
}

/**
 * Execute an MCP tool with given arguments
 */
export async function executeMcpTool(toolName: string, args: any): Promise<any> {
  if (!mcpClient) {
    throw new Error("MCP client not initialized. Call getMcpTools() first.");
  }

  try {
    console.log(`🔧 Executing MCP tool: ${toolName}`);
    console.log(`📥 Tool arguments:`, JSON.stringify(args, null, 2));

    const result = await mcpClient.callTool({
      name: toolName,
      arguments: args
    });

    console.log(`✅ Tool ${toolName} executed successfully`);
    console.log(`📤 Tool result:`, JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error(`❌ Error executing tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Optional: call this to gracefully shutdown the MCP process
 */
export async function shutdownMcp() {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    console.log("✅ MCP Client shutdown complete");
  }
}
