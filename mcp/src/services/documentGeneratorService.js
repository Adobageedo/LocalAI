import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import dataTransformerService from './dataTransformerService.js';
import { PDFDocument } from 'pdf-lib';
import { execa } from 'execa';
import JsonDatabase from './dbService.js';
import technicianDbService from './technicianDbService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service for generating Word documents from templates
 */
class DocumentGeneratorService {
  constructor() {
    this.baseFolder = config.documents.baseFolder;
    this.templateFolder = config.documents.templateFolder;
    this.annualBaseFolder = config.documents.annualBaseFolder;
    this.defaultTemplate = config.documents.defaultTemplate;
  }

  /**
   * Generate a Word document from template and data
   * @param {Buffer} templateBuffer - Template document buffer
   * @param {Object} data - Data to fill template placeholders
   * @returns {Promise<Buffer>} Generated document buffer
   */
  async generateDocument(templateBuffer, data) {
    logger.debug('Generating document from template', {
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

      logger.debug('Document generated successfully', {
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
   * Convert a DOCX file to PDF using LibreOffice/soffice in headless mode
   * @param {string} docxPath
   * @returns {Promise<string>} path to generated PDF
   */
  async convertDocxToPdf(docxPath) {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdp-pdf-'));
    const sofficeCmd = await this._detectSoffice();

    logger.info('Converting DOCX to PDF', { docxPath, outDir, sofficeCmd });

    try {
      await execa(sofficeCmd, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, docxPath], {
        stdio: 'ignore',
      });
      const base = path.basename(docxPath, path.extname(docxPath));
      const pdfPath = path.join(outDir, `${base}.pdf`);
      // Ensure file exists
      await fs.access(pdfPath);
      logger.debug('DOCX converted to PDF', { pdfPath });
      return pdfPath;
    } catch (error) {
      throw new Error(`DOCX->PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Merge generated PDF at the end of the annual PDF file for the given surname.
   * If annual doesn't exist, create it.
   * @param {string} generatedPdfPath
   * @param {string} surname
   * @returns {Promise<string>} path to annual PDF
   */
  async mergeIntoAnnualPdf(generatedPdfPath, surname) {
    const safeSurname = this._sanitizeFilename(surname);
    const annualDir = path.resolve(this.annualBaseFolder);
    await fs.mkdir(annualDir, { recursive: true });
    const annualPdfPath = path.join(annualDir, `${safeSurname}.pdf`);

    logger.info('Merging into annual PDF', { annualPdfPath, generatedPdfPath });

    // If annual file doesn't exist, copy generated
    try {
      await fs.access(annualPdfPath);
    } catch {
      const bytes = await fs.readFile(generatedPdfPath);
      await fs.writeFile(annualPdfPath, bytes);
      return annualPdfPath;
    }

    // Load existing annual and new pdf, append pages
    const annualBytes = await fs.readFile(annualPdfPath);
    const newBytes = await fs.readFile(generatedPdfPath);

    const annualDoc = await PDFDocument.load(annualBytes);
    const newDoc = await PDFDocument.load(newBytes);

    const pages = await annualDoc.copyPages(newDoc, newDoc.getPageIndices());
    pages.forEach((p) => annualDoc.addPage(p));

    const mergedBytes = await annualDoc.save();
    await fs.writeFile(annualPdfPath, mergedBytes);
    logger.info('Annual PDF updated', { annualPdfPath, addedPages: pages.length });
    return annualPdfPath;
  }

  /**
   * Save technician to the technician database
   * Uses the new dedicated technician database service
   * @param {Object} technicianData - Technician data with certifications
   * @returns {Promise<Object>} Result with action and technician
   */
  async saveTechnicianToDatabase(technicianData) {
    try {
      const result = await technicianDbService.upsertTechnician(technicianData);
      
      logger.info('Technician saved to database', {
        action: result.action,
        name: `${result.technician.first_name} ${result.technician.last_name}`,
        certificationsCount: result.technician.certifications.length
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to save technician to database', {
        error: error.message,
        technician: {
          first_name: technicianData?.first_name,
          last_name: technicianData?.last_name
        }
      });
      throw error;
    }
  }

  /**
   * Detect soffice binary
   * @returns {Promise<string>}
   */
  async _detectSoffice() {
    const candidates = [
      'soffice',
      'libreoffice',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    ];
    for (const cmd of candidates) {
      try {
        await execa(cmd, ['--version'], { stdio: 'ignore' });
        return cmd;
      } catch (_) {
        // try next
      }
    }
    throw new Error('LibreOffice (soffice) not found. Please install LibreOffice to enable DOCX->PDF conversion.');
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

    logger.debug('Saving generated document', {
      pdpId,
      windfarmName,
      folderPath,
      filename,
    });

    try {
      await fs.writeFile(filePath, documentBuffer);

      logger.debug('Document saved successfully', {
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
  async loadTemplate(templateName = this.defaultTemplate) {
    const primaryTemplatePath = path.resolve(this.templateFolder, templateName);
    const fallbackTemplatePath = path.resolve(this.templateFolder, this.defaultTemplate);

    logger.debug('Loading template', {
      requestedTemplate: templateName,
      primaryTemplatePath,
    });

    try {
      // Try to read the requested template file
      const buffer = await fs.readFile(primaryTemplatePath);

      logger.info('Template loaded successfully', {
        usedTemplate: templateName,
        size: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.warn('Requested template not found, falling back to template.docx', {
        requestedTemplate: templateName,
        error: error.message,
        fallbackTemplatePath,
      });
    }

    // Try loading the fallback template
    try {
      const fallbackBuffer = await fs.readFile(fallbackTemplatePath);

      logger.info('Fallback template loaded successfully', {
        usedTemplate: this.defaultTemplate,
        size: fallbackBuffer.length,
      });

      return fallbackBuffer;
    } catch (fallbackError) {
      logger.error('Fallback template also missing!', {
        error: fallbackError.message,
        attemptedPaths: [primaryTemplatePath, fallbackTemplatePath],
      });

      throw new Error(
        `No template could be loaded. Missing: ${templateName} and ${this.defaultTemplate} in ${this.templateFolder} and full path ${fallbackTemplatePath}`
      );
    }
  }

  /**
   * Generate PDP document from template and data
   * @param {Object} params - Generation parameters
   * @param {string} params.pdpId - PDP identifier
   * @param {string} params.windfarmName - Windfarm name
   * @param {Object} params.data - Template data (supports both flat and company/workers structure)
   * @param {string} [params.templateName] - Optional template name
   * @param {boolean} [params.saveToFile] - Whether to save to file
   * @returns {Promise<Object>} Generation result
   */
  async generatePDP(params) {
    const {
      pdpId,
      windfarmName,
      data,
      surname,
      mergeWithPDP = false,
      templateName,
      saveToFile = true,
    } = params;

    logger.info('Generating PDP document', {
      pdpId,
      windfarmName,
      templateName,
      saveToFile,
      hasCompanyStructure: !!(data.company || data.workers),
    });

    try {
      // Transform data if it has company/workers structure
      let processedData = data;
      if (data.company || data.workers) {
        logger.info('Detected company/workers structure, transforming data surname: ' + surname);
        
        const validation = dataTransformerService.validateInputData(data);
        if (!validation.valid) {
          throw new Error(`Invalid data structure: ${validation.errors.join(', ')}`);
        }
        
        processedData = dataTransformerService.transformToTemplateFormat(data);
        processedData = dataTransformerService.cleanEmptyTechnicians(processedData);
        
        logger.debug('Data transformation completed', {
          originalKeys: Object.keys(data).length,
          transformedKeys: Object.keys(processedData).length,
        });
      }

      // Resolve template by surname if provided, otherwise fallback
      const resolvedTemplateName = templateName || (surname ? `${this._sanitizeFilename(surname)}.docx` : config.documents.defaultTemplate);
      // Load template
      const templateBuffer = await this.loadTemplate(resolvedTemplateName);

      // Generate document
      const documentBuffer = await this.generateDocument(templateBuffer, processedData);

      let filePath = null;
      let annualPdfPath = null;
      if (saveToFile) {
        // Save document
        filePath = await this.saveGeneratedDocument(
          documentBuffer,
          pdpId,
          windfarmName
        );

        // If requested, convert to PDF and merge into annual PDF
        if (mergeWithPDP && surname) {
          try {
            logger.info('Converting to PDF and merging into annual document', { filePath, surname });
            const generatedPdfPath = await this.convertDocxToPdf(filePath);
            annualPdfPath = await this.mergeIntoAnnualPdf(generatedPdfPath, surname);
          } catch (mergeErr) {
            logger.error('PDF merge failed', { error: mergeErr.message });
            // Do not fail the whole operation; include error info
          }
        }
      }
      logger.info('Document generation completed');
      
      // Persist technicians to dedicated technician database if present in data
      if (data && Array.isArray(data.workers) && data.workers.length > 0) {
        logger.info('Persisting technicians to dedicated database', { count: data.workers.length });
        let added = 0;
        let updated = 0;
        let failed = 0;
        
        // Extract company name from data if available
        const companyName = data.company?.name || null;
        
        for (const technician of data.workers) {
          try {
            // Add company to technician data
            const technicianWithCompany = {
              ...technician,
              company: technician.company || companyName
            };
            
            const result = await this.saveTechnicianToDatabase(technicianWithCompany);
            if (result.action === 'added') {
              added += 1;
            } else if (result.action === 'updated') {
              updated += 1;
            }
          } catch (dbErr) {
            failed += 1;
            logger.warn('Failed to save technician to database', {
              error: dbErr?.message || String(dbErr),
              technician: {
                first_name: technician?.first_name,
                last_name: technician?.last_name
              }
            });
          }
        }
        
        logger.info('Technician database update complete', {
          total: data.workers.length,
          added,
          updated,
          failed
        });
      }else   {
        logger.info('No technicians to persist to database',data);
      }

      return {
        success: true,
        pdpId,
        windfarmName,
        filePath,
        documentBuffer: saveToFile ? null : documentBuffer,
        size: documentBuffer.length,
        timestamp: new Date().toISOString(),
        dataTransformed: !!(data.company || data.workers),
        templateUsed: resolvedTemplateName,
        mergedIntoAnnual: !!annualPdfPath,
        annualPdfPath: annualPdfPath || null,
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
