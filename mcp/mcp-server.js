const http = require('http');
const DocumentGeneratorService = require('./DocumentGeneratorService');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

/**
 * Model-Context-Protocol (MCP) Server
 * - Model: DocumentGeneratorService
 * - Context: PDP metadata, template, user data
 * - Protocol: JSON-RPC over HTTP
 */
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Collect incoming request data
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const message = JSON.parse(body);
      const { protocol, context, modelData } = message;

      if (protocol !== 'generatePDP') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unsupported protocol: ${protocol}` }));
        return;
      }

      // Extract context and data
      const { pdpId, windfarmName, dataFolder, templatePath } = context;
      const data = modelData;

      if (!pdpId || !windfarmName || !dataFolder || !templatePath || !data) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required context or modelData fields' }));
        return;
      }

      // Load template file as buffer
      const templateBuffer = fs.readFileSync(path.resolve(templatePath));

      // Clean template data
      const cleanedData = DocumentGeneratorService.cleanTemplateData(data);

      // Generate document
      const documentBuffer = await DocumentGeneratorService.generateDocument(templateBuffer, cleanedData);

      // Save document
      const savedFilePath = await DocumentGeneratorService.saveGeneratedDocument(
        documentBuffer,
        pdpId,
        windfarmName,
        dataFolder
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        filePath: savedFilePath,
      }));
    } catch (err) {
      console.error('MCP server error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ MCP Server running on http://localhost:${PORT}`);
});
