import express from 'express';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import config from './utils/config.js';
import documentGeneratorService from './services/documentGeneratorService.js';
import ragService from './services/ragService.js';

// Load env
dotenv.config();

const app = express();
const PORT = process.env.HTTP_PORT || 8787;

app.use(express.json({ limit: '10mb' }));

// Simple request logger
app.use((req, _res, next) => {
  logger.info('HTTP request', { method: req.method, url: req.url });
  next();
});

app.get('/health', async (_req, res) => {
  try {
    const ragHealthy = await ragService.healthCheck();
    res.json({
      status: 'ok',
      ragHealthy,
      ragApiUrl: config.rag.apiUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/templates', async (_req, res) => {
  try {
    const templates = await documentGeneratorService.listTemplates();
    res.json({ templates, count: templates.length, folder: config.documents.templateFolder });
  } catch (e) {
    logger.error('List templates error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

app.post('/tools/generate_pdp_document', async (req, res) => {
  const { pdpId, windfarmName, data, templateName, surname, mergeWithPDP = false, saveToFile = true } = req.body || {};

  if (!pdpId || !windfarmName || !data) {
    return res.status(400).json({ error: 'Missing required fields: pdpId, windfarmName, data' });
  }

  try {
    // Transformation is now handled by documentGeneratorService
    const result = await documentGeneratorService.generatePDP({
      pdpId,
      windfarmName,
      data,
      surname,
      mergeWithPDP,
      templateName,
      saveToFile,
    });

    res.json(result);
  } catch (e) {
    logger.error('generate_pdp_document error', { error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message });
  }
});

app.post('/tools/fetch_rag_context', async (req, res) => {
  try {
    const result = await ragService.fetchContext(req.body || {});
    res.json(result);
  } catch (e) {
    logger.error('fetch_rag_context error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

app.post('/tools/generate_pdp_with_rag', async (req, res) => {
  const { pdpId, windfarmName, data, ragQuery, templateName, surname, mergeWithPDP = false, enhanceWithRAG = true } = req.body || {};

  if (!pdpId || !windfarmName || !data) {
    return res.status(400).json({ error: 'Missing required fields: pdpId, windfarmName, data' });
  }

  try {
    let enhancedData = { ...data };

    if (enhanceWithRAG) {
      // Build query from company name if available, or title
      const companyName = data.company?.name || data.company_name || '';
      const title = data.title || '';
      const query = ragQuery || `PDP ${pdpId} for windfarm ${windfarmName}. ${companyName} ${title}`;
      
      const ragResult = await ragService.fetchContext({ query });
      enhancedData.ragContext = ragResult.context;
      enhancedData.ragDocuments = (ragResult.documents || []).map((doc) => ({
        content: doc.content?.slice(0, 500),
        metadata: doc.metadata,
      }));
    }

    // documentGeneratorService handles transformation
    const result = await documentGeneratorService.generatePDP({
      pdpId,
      windfarmName,
      data: enhancedData,
      surname,
      mergeWithPDP,
      templateName,
      saveToFile: true,
    });

    res.json({ ...result, ragEnhanced: !!enhanceWithRAG });
  } catch (e) {
    logger.error('generate_pdp_with_rag error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

app.use((err, _req, res, _next) => {
  logger.error('Unhandled HTTP error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`HTTP adapter listening on http://localhost:${PORT}`);
});
