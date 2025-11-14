import logger from '../utils/logger.js';

/**
 * Service to transform input JSON to template-compatible format
 */
class DataTransformerService {
  /**
   * Transform company/workers JSON to flat template format
   * @param {Object} inputData - Input JSON with company and workers
   * @returns {Object} Flat template data
   */
  transformToTemplateFormat(inputData) {
    logger.info('Transforming data to template format', {
      hasCompany: !!inputData.company,
      workersCount: inputData.workers?.length || 0,
    });

    const templateData = {};

    // Transform company data
    if (inputData.company) {
      templateData.company_name = inputData.company.name || '';
      templateData.company_adress = inputData.company.address || '';
      templateData.company_phone = inputData.company.phone || '';
      templateData.company_email = inputData.company.email || '';
      templateData.company_legal_representant_name = inputData.company.legal_representative || '';
      templateData.company_hse_responsible = inputData.company.hse_responsible || '';
      
      // Also include phone and email for legal representative fields in template
      templateData.company_legal_representant_phone = inputData.company.phone || '';
      templateData.company_legal_representant_email = inputData.company.email || '';
    }

    // Transform workers to flat technician fields (technician1, technician2, etc.)
    if (inputData.workers && Array.isArray(inputData.workers)) {
      inputData.workers.forEach((worker, index) => {
        const num = index + 1;
        templateData[`technician${num}_name`] = worker.last_name || '';
        templateData[`technician${num}_surname`] = worker.first_name || '';
        templateData[`technician${num}_phone`] = worker.phone || '';
        templateData[`technician${num}_email`] = worker.email || '';
        
        // Store certifications as formatted string
        if (worker.certifications && worker.certifications.length > 0) {
          const certList = worker.certifications
            .map(cert => `${cert.certification_name || cert.certification_type} (${cert.issue_date} - ${cert.expiry_date})`)
            .join(', ');
          templateData[`technician${num}_certifications`] = certList;
        } else {
          templateData[`technician${num}_certifications`] = '';
        }
      });

      // Fill remaining technician slots (up to 10) with empty strings
      for (let i = inputData.workers.length + 1; i <= 10; i++) {
        templateData[`technician${i}_name`] = '';
        templateData[`technician${i}_surname`] = '';
        templateData[`technician${i}_phone`] = '';
        templateData[`technician${i}_email`] = '';
        templateData[`technician${i}_certifications`] = '';
      }
    }

    // Include boolean flags
    templateData.risk_analysis = inputData.risk_analysis || false;
    templateData.operational_mode = inputData.operational_mode || false;

    // Format as Yes/No for template display
    templateData.risk_analysis_text = inputData.risk_analysis ? 'Oui' : 'Non';
    templateData.operational_mode_text = inputData.operational_mode ? 'Oui' : 'Non';

    logger.debug('Data transformation completed', {
      outputKeys: Object.keys(templateData).length,
    });

    return templateData;
  }

  /**
   * Clean empty technician rows from template data
   * @param {Object} templateData - Template data with technician fields
   * @returns {Object} Cleaned template data
   */
  cleanEmptyTechnicians(templateData) {
    const cleaned = { ...templateData };
    
    // Remove technician entries that are completely empty
    for (let i = 1; i <= 10; i++) {
      const hasName = cleaned[`technician${i}_name`];
      const hasSurname = cleaned[`technician${i}_surname`];
      
      if (!hasName && !hasSurname) {
        // Remove all fields for this technician
        delete cleaned[`technician${i}_name`];
        delete cleaned[`technician${i}_surname`];
        delete cleaned[`technician${i}_phone`];
        delete cleaned[`technician${i}_email`];
        delete cleaned[`technician${i}_certifications`];
      }
    }

    return cleaned;
  }

  /**
   * Validate input data structure
   * @param {Object} inputData - Input JSON
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateInputData(inputData) {
    const errors = [];

    if (!inputData) {
      return { valid: false, errors: ['Input data is required'] };
    }

    // Validate company
    if (!inputData.company) {
      errors.push('company field is required');
    } else {
      if (!inputData.company.name) {
        errors.push('company.name is required');
      }
      if (!inputData.company.legal_representative) {
        errors.push('company.legal_representative is required');
      }
    }

    // Validate workers
    if (!inputData.workers || !Array.isArray(inputData.workers)) {
      errors.push('workers must be an array');
    } else if (inputData.workers.length === 0) {
      errors.push('At least one worker is required');
    } else {
      inputData.workers.forEach((worker, index) => {
        if (!worker.first_name && !worker.last_name) {
          errors.push(`Worker ${index + 1}: first_name or last_name is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new DataTransformerService();
