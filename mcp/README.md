# MCP PDP Document Generator

A Model Context Protocol (MCP) server for generating PDP (Plan de Prévention) documents from Word templates with RAG (Retrieval-Augmented Generation) integration.

## Features

- 🔧 **Document Generation**: Generate Word documents from `.docx` templates with placeholder replacement
- 🧹 **Data Cleaning**: Automatic cleaning of empty rows and invalid data
- 📁 **Structured Storage**: Save documents in organized folders with timestamps
- 🤖 **RAG Integration**: Fetch contextual information from RAG API to enrich documents
- 🛠️ **MCP Protocol**: Standard Model Context Protocol for tool integration
- 📊 **Comprehensive Logging**: Winston-based logging with file and console output

## Architecture

```
mcp/
├── src/
│   ├── index.js                        # MCP server entry point
│   ├── services/
│   │   ├── documentGeneratorService.js # Document generation logic
│   │   └── ragService.js               # RAG API integration
│   └── utils/
│       ├── logger.js                   # Winston logger configuration
│       └── config.js                   # Application configuration
├── templates/                          # Word document templates
├── data/                               # Generated documents (created at runtime)
├── logs/                               # Server logs (created at runtime)
├── package.json
├── .env.example
└── README.md
```

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

1. **Clone or navigate to the directory**:
   ```bash
   cd /Users/edoardo/Documents/LocalAI/mcp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create required directories**:
   ```bash
   mkdir -p templates data logs
   ```

5. **Add your Word template**:
   - Place your `.docx` template file in the `templates/` folder
   - Default template name: `pdp_template.docx`

## Configuration

Edit `.env` file:

```bash
# RAG API Configuration
RAG_API_URL=http://localhost:8000
RAG_API_KEY=your-api-key-here

# Document Storage Configuration
PDP_BASE_FOLDER=./data/pdp
TEMPLATE_FOLDER=./templates

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/mcp-server.log

# MCP Server Configuration
MCP_SERVER_NAME=pdp-document-generator
MCP_SERVER_VERSION=1.0.0
```

## Usage

### Starting the Server

```bash
npm start
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

## Available Tools

The MCP server exposes the following tools:

### 1. generate_pdp_document

Generate a PDP document from a template with provided data.

**Parameters**:
- `pdpId` (string, required): Unique PDP identifier
- `windfarmName` (string, required): Name of the windfarm
- `data` (object, required): Template data with placeholders
- `templateName` (string, optional): Template filename (default: `pdp_template.docx`)
- `saveToFile` (boolean, optional): Whether to save to file (default: `true`)

**Example**:
```json
{
  "pdpId": "PDP-2024-001",
  "windfarmName": "WindFarm Alpha",
  "data": {
    "title": "Maintenance Operation",
    "description": "Annual turbine inspection",
    "technicians": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "role": "Lead Technician",
        "phone": "+1234567890"
      }
    ],
    "date": "2024-01-15",
    "location": "Site A"
  }
}
```

**Response**:
```json
{
  "success": true,
  "pdpId": "PDP-2024-001",
  "windfarmName": "WindFarm Alpha",
  "filePath": "/path/to/saved/document.docx",
  "size": 45678,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. fetch_rag_context

Fetch contextual information from RAG API.

**Parameters**:
- `query` (string, required): Search query
- `collection` (string, optional): Collection name (default: `edoardo`)
- `topK` (number, optional): Number of results (default: `5`)
- `splitPrompt` (boolean, optional): Split prompt (default: `true`)
- `rerank` (boolean, optional): Rerank results (default: `false`)
- `useHyde` (boolean, optional): Use HyDE (default: `false`)

**Example**:
```json
{
  "query": "PDP procedures for turbine maintenance",
  "collection": "edoardo",
  "topK": 5
}
```

**Response**:
```json
{
  "success": true,
  "context": "Relevant context from RAG API...",
  "documents": [
    {
      "content": "Document content...",
      "metadata": { "source": "manual.pdf" }
    }
  ],
  "metadata": {
    "query": "PDP procedures for turbine maintenance",
    "collection": "edoardo",
    "topK": 5,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. generate_pdp_with_rag

Generate a PDP document enriched with RAG context.

**Parameters**:
- `pdpId` (string, required): Unique PDP identifier
- `windfarmName` (string, required): Name of the windfarm
- `data` (object, required): Template data
- `ragQuery` (string, optional): Custom RAG query (auto-generated if not provided)
- `templateName` (string, optional): Template filename
- `enhanceWithRAG` (boolean, optional): Enhance with RAG (default: `true`)

**Example**:
```json
{
  "pdpId": "PDP-2024-001",
  "windfarmName": "WindFarm Alpha",
  "data": {
    "title": "Maintenance Operation",
    "description": "Annual turbine inspection"
  },
  "enhanceWithRAG": true
}
```

**Response**: Same as `generate_pdp_document` with `ragEnhanced: true`

### 4. list_templates

List all available document templates.

**Example Response**:
```json
{
  "templates": [
    "pdp_template.docx",
    "maintenance_report.docx"
  ],
  "count": 2,
  "templateFolder": "./templates"
}
```

## Available Resources

### 1. config://server

Get current server configuration.

### 2. status://rag

Check RAG API connection status.

## Template Placeholders

Your Word template should use `{placeholder}` syntax for variable substitution:

### Simple Variables
```
Title: {title}
Description: {description}
Date: {date}
```

### Arrays (for loops in template)
```
{#technicians}
Name: {name}
Email: {email}
Role: {role}
{/technicians}
```

### Nested Objects
```
Contact: {contact.name}
Phone: {contact.phone}
```

## Data Cleaning

The service automatically:
- Removes empty technician rows
- Filters out empty array entries
- Converts null/undefined to empty strings
- Preserves meaningful data based on content

## Error Handling

- **Template Loading Errors**: Logged with file path details
- **Document Generation Errors**: Detailed error properties logged
- **RAG API Errors**: Graceful fallback with error logging
- **File System Errors**: Comprehensive error messages

## Logging

Logs are written to:
- **Console**: Development mode (colorized)
- **File**: `logs/mcp-server.log` (5MB max, 5 files rotation)
- **Error File**: `logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`

## Integration Examples

### Using with MCP Client

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'pdp-generator-client',
  version: '1.0.0',
});

// Connect to server
await client.connect(transport);

// Generate PDP document
const result = await client.callTool('generate_pdp_document', {
  pdpId: 'PDP-2024-001',
  windfarmName: 'WindFarm Alpha',
  data: { /* template data */ },
});
```

### Using with LLM Integration

The MCP server can be integrated with LLMs to:
1. Extract structured data from conversations
2. Fetch relevant context from RAG
3. Generate documents automatically
4. Enrich documents with retrieved information

## Development

### Project Structure

- **Services**: Modular services for specific functionality
- **Utils**: Shared utilities (logging, configuration)
- **Error Handling**: Comprehensive error catching and logging
- **Type Safety**: JSDoc comments for better IDE support

### Adding New Document Types

1. Add new template to `templates/` folder
2. Create service method if custom logic needed
3. Add new tool definition in `src/index.js`
4. Update documentation

### Testing

```bash
npm test
```

## Troubleshooting

### "Template not found" error
- Ensure template file exists in `templates/` folder
- Check `TEMPLATE_FOLDER` in `.env`

### "RAG API connection failed"
- Verify `RAG_API_URL` in `.env`
- Check if RAG API is running
- Verify API key if required

### "Permission denied" errors
- Ensure directories are writable
- Check file permissions on `data/` and `logs/`

### Template rendering errors
- Validate placeholder syntax in template
- Check data structure matches template
- Review logs for detailed error messages

## License

MIT

## Support

For issues and questions, please check the logs in `logs/mcp-server.log` for detailed error information.
