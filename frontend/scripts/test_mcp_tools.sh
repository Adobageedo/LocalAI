#!/bin/bash

# Test MCP tools integration with streaming API

API_URL="http://localhost:3000/api/promptLLM"
TEST_PAYLOAD="/Users/edoardo/Documents/LocalAI/mcp/examples/test-company-workers.json"

echo "=========================================="
echo "🧪 Testing MCP Tools Integration"
echo "=========================================="
echo ""

# Test 1: WITH MCP Tools (default)
echo "📋 Test 1: Request with MCP tools (useMcpTools: true)"
echo "Expected: LLM should call generate_pdp_document tool and return result"
echo ""
jq -n --argjson payload "$(cat $TEST_PAYLOAD)" '{
  model: "gpt-4o-mini",
  temperature: 0.2,
  maxTokens: 800,
  useMcpTools: true,
  messages: [
    {
      role: "system",
      content: "You are an assistant with MCP tools. When asked to generate a PDP, use the generate_pdp_document tool."
    },
    {
      role: "user",
      content: "Generate a PDP document for this payload. Call the appropriate tool."
    }
  ]
}' | curl -N -X POST $API_URL \
  -H "Content-Type: application/json" \
  --data-binary @-

echo ""
echo ""

# Test 2: WITHOUT MCP Tools
echo "📋 Test 2: Request without MCP tools (useMcpTools: false)"
echo "Expected: LLM should respond directly without calling any tools"
echo ""
jq -n '{
  model: "gpt-4o-mini",
  temperature: 0.2,
  maxTokens: 400,
  useMcpTools: false,
  messages: [
    {
      role: "user",
      content: "When was Italy unified?"
    }
  ]
}' | curl -N -X POST $API_URL \
  -H "Content-Type: application/json" \
  --data-binary @-

echo ""
echo ""

# Test 3: General question (with tools available but not needed)
echo "📋 Test 3: General question with tools available"
echo "Expected: LLM should respond directly since no tool is needed"
echo ""
jq -n '{
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 400,
  useMcpTools: true,
  messages: [
    {
      role: "user",
      content: "What is the capital of France?"
    }
  ]
}' | curl -N -X POST $API_URL \
  -H "Content-Type: application/json" \
  --data-binary @-

echo ""
echo ""
echo "=========================================="
echo "✅ Tests complete!"
echo "=========================================="
