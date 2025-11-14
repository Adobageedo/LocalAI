import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from "path";

// Configure your MCP server executable & env
// Use the exact Node binary running this process to avoid ENOENT in vercel dev
const mcpServerCommand = process.execPath || "node";
// Path to the MCP server - adjust relative to your project structure
const mcpServerArgs = [path.resolve(__dirname, "../../../mcp/src/index.js")];

const mcpEnv = {
  RAG_API_URL: "http://localhost:8000",
  RAG_API_KEY: "your-api-key-here",
  PDP_BASE_FOLDER: path.resolve(__dirname, "../../../mcp/data/PDP"),
  TEMPLATE_FOLDER: path.resolve(__dirname, "../../../mcp/templates"),
  LOG_LEVEL: "info",
  LOG_FILE: path.resolve(__dirname, "../../../mcp/data/logs/mcp-server.log"),
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
 */
export async function getMcpTools() {
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
 * Optional: call this to gracefully shutdown the MCP process
 */
export async function shutdownMcp() {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    console.log("✅ MCP Client shutdown complete");
  }
}
