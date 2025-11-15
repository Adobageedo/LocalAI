/**
 * JSON schemas for PDP document generation
 */

export const generatePdpDocumentSchema = {
  type: 'object',
  properties: {
    pdpId: {
      type: 'string',
      description: 'Unique PDP identifier',
    },
    windfarmName: {
      type: 'string',
      description: 'Name of the windfarm',
    },
    surname: {
      type: 'string',
      description: 'Power plant surname used to select template <surname>.docx and annual PDF <surname>.pdf',
    },
    data: {
      type: 'object',
      description:
        'Template data. Supports two formats: 1) Flat format with direct placeholders (company_name, technician1_name, etc.), or 2) Structured format with company object and workers array (automatically transformed).',
      properties: {
        company: {
          type: 'object',
          description: 'Company information (structured format)',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            legal_representative: { type: 'string' },
            hse_responsible: { type: 'string' },
          },
        },
        workers: {
          type: 'array',
          description: 'List of workers (structured format, max 10)',
          items: {
            type: 'object',
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              phone: { type: 'string' },
              email: { type: 'string' },
              certifications: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    certification_type: { type: 'string' },
                    certification_name: { type: 'string' },
                    issue_date: { type: 'string' },
                    expiry_date: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        risk_analysis: {
          type: 'boolean',
          description: 'Risk analysis performed',
        },
        operational_mode: {
          type: 'boolean',
          description: 'Operational mode active',
        },
      },
    },
    templateName: {
      type: 'string',
      description: 'Optional template filename (default: pdp_template.docx)',
    },
    mergeWithPDP: {
      type: 'boolean',
      description: 'If true, convert generated DOCX to PDF and append to annual PDF named by surname in PDP_ANNUAL_BASE_FOLDER',
    },
    saveToFile: {
      type: 'boolean',
      description: 'Whether to save the document to file (default: true)',
    },
  },
  required: ['pdpId', 'windfarmName', 'data'],
};

export const generatePdpWithRagSchema = {
  type: 'object',
  properties: {
    pdpId: {
      type: 'string',
      description: 'Unique PDP identifier',
    },
    windfarmName: {
      type: 'string',
      description: 'Name of the windfarm',
    },
    surname: {
      type: 'string',
      description: 'Power plant surname used to select template <surname>.docx and annual PDF <surname>.pdf',
    },
    data: {
      type: 'object',
      description: 'Template data with placeholders',
    },
    ragQuery: {
      type: 'string',
      description: 'Optional custom RAG query (auto-generated if not provided)',
    },
    templateName: {
      type: 'string',
      description: 'Optional template filename',
    },
    mergeWithPDP: {
      type: 'boolean',
      description: 'If true, convert generated DOCX to PDF and append to annual PDF named by surname in PDP_ANNUAL_BASE_FOLDER',
    },
    enhanceWithRAG: {
      type: 'boolean',
      description: 'Whether to enhance data with RAG context (default: true)',
    },
  },
  required: ['pdpId', 'windfarmName', 'data'],
};

export const listTemplatesSchema = {
  type: 'object',
  properties: {},
};

export default {
  generatePdpDocumentSchema,
  generatePdpWithRagSchema,
  listTemplatesSchema,
};
