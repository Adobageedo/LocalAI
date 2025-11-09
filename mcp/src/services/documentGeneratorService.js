import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service for generating Word documents from templates
 */
class DocumentGeneratorService {
  constructor() {
    this.baseFolder = config.documents.baseFolder;
    this.templateFolder = config.documents.templateFolder;
  }

  /**
   * Generate a Word document from template and data
   * @param {Buffer} templateBuffer - Template document buffer
   * @param {Object} data - Data to fill template placeholders
   * @returns {Promise<Buffer>} Generated document buffer
   */
  async generateDocument(templateBuffer, data) {
    logger.info('Generating document from template', {
      dataKeys: Object.keys(data),
      templateSize: templateBuffer.length,
    });

    try {
      // Clean template data
      const cleanedData = this.cleanTemplateData(data);

      // Load template
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '', // Handle missing values gracefully
      });

      // Render document with data
      doc.render(cleanedData);

      // Generate buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      logger.info('Document generated successfully', {
        outputSize: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.error('Error generating document', {
        error: error.message,
        stack: error.stack,
        properties: error.properties,
      });

      if (error.properties && error.properties.errors) {
        const detailedErrors = error.properties.errors.map((e) => ({
          message: e.message,
          offset: e.offset,
          part: e.part,
        }));
        throw new Error(
          `Document generation failed: ${JSON.stringify(detailedErrors)}`
        );
      }

      throw new Error(`Document generation failed: ${error.message}`);
    }
  }

  /**
   * Clean template data by removing empty or invalid entries
   * @param {Object} data - Raw template data
   * @returns {Object} Cleaned data
   */
  cleanTemplateData(data) {
    logger.debug('Cleaning template data', {
      originalKeys: Object.keys(data),
    });

    const cleaned = { ...data };

    // Remove empty technician rows if present
    if (cleaned.technicians && Array.isArray(cleaned.technicians)) {
      cleaned.technicians = cleaned.technicians.filter((tech) => {
        // Keep technician if they have a name or any meaningful data
        return (
          tech.name ||
          tech.email ||
          tech.role ||
          tech.phone ||
          (tech.tasks && tech.tasks.length > 0)
        );
      });

      logger.debug('Filtered technicians', {
        original: data.technicians?.length || 0,
        cleaned: cleaned.technicians.length,
      });
    }

    // Remove empty array entries
    Object.keys(cleaned).forEach((key) => {
      if (Array.isArray(cleaned[key])) {
        cleaned[key] = cleaned[key].filter((item) => {
          // For objects, keep if they have at least one non-empty value
          if (typeof item === 'object' && item !== null) {
            return Object.values(item).some(
              (val) => val !== null && val !== undefined && val !== ''
            );
          }
          // For primitives, keep if not empty
          return item !== null && item !== undefined && item !== '';
        });
      }
    });

    // Convert null/undefined values to empty strings for template safety
    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === null || cleaned[key] === undefined) {
        cleaned[key] = '';
      }
    });

    logger.debug('Template data cleaned', {
      cleanedKeys: Object.keys(cleaned),
    });

    return cleaned;
  }

  /**
   * Save generated document to structured folder
   * @param {Buffer} documentBuffer - Generated document buffer
   * @param {string} pdpId - PDP identifier
   * @param {string} windfarmName - Windfarm name
   * @param {string} [dataFolder] - Optional data folder path
   * @returns {Promise<string>} Path to saved document
   */
  async saveGeneratedDocument(
    documentBuffer,
    pdpId,
    windfarmName,
    dataFolder = null
  ) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedWindfarm = this._sanitizeFilename(windfarmName);
    const sanitizedPdpId = this._sanitizeFilename(pdpId);

    // Build folder path
    const folderPath = dataFolder
      ? path.resolve(dataFolder)
      : path.resolve(this.baseFolder, sanitizedWindfarm);

    // Ensure directory exists
    await fs.mkdir(folderPath, { recursive: true });

    // Build filename
    const filename = `PDP_${sanitizedPdpId}_${sanitizedWindfarm}_${timestamp}.docx`;
    const filePath = path.join(folderPath, filename);

    logger.info('Saving generated document', {
      pdpId,
      windfarmName,
      folderPath,
      filename,
    });

    try {
      await fs.writeFile(filePath, documentBuffer);

      logger.info('Document saved successfully', {
        path: filePath,
        size: documentBuffer.length,
      });

      return filePath;
    } catch (error) {
      logger.error('Error saving document', {
        error: error.message,
        path: filePath,
      });

      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  /**
   * Load template from file
   * @param {string} templateName - Template filename
   * @returns {Promise<Buffer>} Template buffer
   */
  async loadTemplate(templateName = config.documents.defaultTemplate) {
    const templatePath = path.resolve(this.templateFolder, templateName);

    logger.info('Loading template', {
      templateName,
      templatePath,
    });

    try {
      const buffer = await fs.readFile(templatePath);

      logger.info('Template loaded successfully', {
        size: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.error('Error loading template', {
        error: error.message,
        templatePath,
      });

      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * Generate PDP document from template and data
   * @param {Object} params - Generation parameters
   * @param {string} params.pdpId - PDP identifier
   * @param {string} params.windfarmName - Windfarm name
   * @param {Object} params.data - Template data
   * @param {string} [params.templateName] - Optional template name
   * @param {boolean} [params.saveToFile] - Whether to save to file
   * @returns {Promise<Object>} Generation result
   */
  async generatePDP(params) {
    const {
      pdpId,
      windfarmName,
      data,
      templateName = config.documents.defaultTemplate,
      saveToFile = true,
    } = params;

    logger.info('Generating PDP document', {
      pdpId,
      windfarmName,
      templateName,
      saveToFile,
    });

    try {
      // Load template
      const templateBuffer = await this.loadTemplate(templateName);

      // Generate document
      const documentBuffer = await this.generateDocument(templateBuffer, data);

      let filePath = null;
      if (saveToFile) {
        // Save document
        filePath = await this.saveGeneratedDocument(
          documentBuffer,
          pdpId,
          windfarmName
        );
      }

      return {
        success: true,
        pdpId,
        windfarmName,
        filePath,
        documentBuffer: saveToFile ? null : documentBuffer,
        size: documentBuffer.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error in PDP generation', {
        error: error.message,
        stack: error.stack,
        pdpId,
        windfarmName,
      });

      throw error;
    }
  }

  /**
   * Sanitize filename to remove invalid characters
   * @private
   */
  _sanitizeFilename(name) {
    return name.replace(/[^a-z0-9_-]/gi, '_').replace(/_+/g, '_');
  }

  /**
   * List available templates
   * @returns {Promise<Array<string>>} List of template filenames
   */
  async listTemplates() {
    try {
      const templatePath = path.resolve(this.templateFolder);
      const files = await fs.readdir(templatePath);
      const templates = files.filter((file) => file.endsWith('.docx'));

      logger.info('Listed available templates', {
        count: templates.length,
        templates,
      });

      return templates;
    } catch (error) {
      logger.error('Error listing templates', {
        error: error.message,
      });

      return [];
    }
  }
}

export default new DocumentGeneratorService();
