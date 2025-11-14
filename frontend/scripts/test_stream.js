#!/usr/bin/env node
/**
 * Stream test script that uses the same LLM client and MCP tools as the API.
 *
 * Usage:
 *   node scripts/test_stream.js \
 *     --prompt "Write a short paragraph about wind turbines" \
 *     --model gpt-4o-mini \
 *     --temperature 0.3 \
 *     --maxTokens 300
 */

// Enable importing TypeScript modules from the frontend API utilities
require('ts-node/register/transpile-only');

const path = require('path');
const { argv } = require('node:process');

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const val = argv[i + 1];
    if (!key) break;
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = val ?? true;
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const prompt = args.prompt || 'Say hello in one sentence.';
  const model = args.model || process.env.LLM_MODEL || 'gpt-4o-mini';
  const temperature = args.temperature ? Number(args.temperature) : 0.2;
  const maxTokens = args.maxTokens ? Number(args.maxTokens) : 256;

  // Import TS utilities dynamically
  const mcpPath = path.resolve(__dirname, '../api/utils/mcp.ts');
  const llmClientPath = path.resolve(__dirname, '../api/utils/llmClient.ts');
  const { getMcpTools } = await import(mcpPath);
  const llmModule = await import(llmClientPath);
  const llmClient = llmModule.default;

  // Build messages array similar to promptLLM
  const messages = [
    { role: 'user', content: prompt },
  ];

  // Fetch MCP tools once
  const tools = await getMcpTools();

  console.log('🌊 Starting local stream with MCP tools...');

  let fullText = '';
  let chunkNumber = 0;

  for await (const chunk of llmClient.generateStream({
    model,
    messages,
    temperature,
    maxTokens,
    tools,
  })) {
    chunkNumber++;
    if (chunk.delta) {
      fullText += chunk.delta;
      process.stdout.write(chunk.delta);
    }
    if (chunk.done) {
      console.log('\n\n✅ Stream complete');
      console.log('— Total length:', fullText.length);
    }
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
