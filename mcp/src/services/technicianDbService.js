import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Technician Database Service
 * Manages technicians as if they were rows in a database table
 * Each technician has: first_name, last_name, phone, email, certifications[]
 */
class TechnicianDatabaseService {
  constructor(dbPath = null) {
    const projectRoot = path.resolve(__dirname, '../..');
    this.dbPath = dbPath || path.join(projectRoot, 'technicians_database.json');
    this.data = null;
  }

  /**
   * Load database from file
   * Initializes with empty structure if file doesn't exist
   */
  async load() {
    try {
      const raw = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(raw);
      
      // Ensure structure
      if (!this.data.technicians || !Array.isArray(this.data.technicians)) {
        this.data = { technicians: [] };
      }
      
      logger.debug('Technician database loaded', {
        path: this.dbPath,
        count: this.data.technicians.length
      });
    } catch (error) {
      // Initialize with empty structure if file doesn't exist
      this.data = {
        technicians: [],
        metadata: {
          created: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      logger.info('Initialized new technician database', { path: this.dbPath });
    }
    return this.data;
  }

  /**
   * Save database to file
   */
  async save() {
    try {
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      
      // Update metadata
      if (this.data.metadata) {
        this.data.metadata.last_updated = new Date().toISOString();
      }
      
      await fs.writeFile(
        this.dbPath,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
      
      logger.debug('Technician database saved', {
        path: this.dbPath,
        count: this.data.technicians.length
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to save technician database', {
        error: error.message,
        path: this.dbPath
      });
      throw error;
    }
  }

  /**
   * Normalize technician data structure
   * Ensures all required fields and proper formatting
   */
  _normalizeTechnician(techData) {
    return {
      id: techData.id || this._generateId(techData),
      first_name: (techData.first_name || '').trim(),
      last_name: (techData.last_name || '').trim(),
      phone: techData.phone || null,
      email: (techData.email || '').toLowerCase().trim() || null,
      company: techData.company || null,
      certifications: Array.isArray(techData.certifications) 
        ? techData.certifications.map(cert => ({
            certification_type: cert.certification_type || 'Other',
            certification_name: cert.certification_name || '',
            issue_date: cert.issue_date || null,
            expiry_date: cert.expiry_date || null
          }))
        : [],
      created_at: techData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: techData.metadata || {}
    };
  }

  /**
   * Generate unique ID for technician based on name
   */
  _generateId(techData) {
    const firstName = (techData.first_name || '').toLowerCase().replace(/\s+/g, '_');
    const lastName = (techData.last_name || '').toLowerCase().replace(/\s+/g, '_');
    return `${firstName}_${lastName}`;
  }

  /**
   * Find technician index by first and last name
   */
  _findTechnicianIndex(firstName, lastName) {
    if (!this.data || !Array.isArray(this.data.technicians)) {
      return -1;
    }

    const normalizedFirst = (firstName || '').toLowerCase().trim();
    const normalizedLast = (lastName || '').toLowerCase().trim();

    return this.data.technicians.findIndex(tech => 
      tech.first_name.toLowerCase().trim() === normalizedFirst &&
      tech.last_name.toLowerCase().trim() === normalizedLast
    );
  }

  /**
   * Upsert technician (insert or update)
   * Uses first_name + last_name as unique key
   * @param {Object} techData - Technician data
   * @returns {Promise<Object>} Result with action and technician
   */
  async upsertTechnician(techData) {
    if (!this.data) {
      await this.load();
    }

    // Validate required fields
    if (!techData.first_name || !techData.last_name) {
      throw new Error('Technician must have first_name and last_name');
    }

    const normalized = this._normalizeTechnician(techData);
    const existingIndex = this._findTechnicianIndex(
      normalized.first_name,
      normalized.last_name
    );

    if (existingIndex >= 0) {
      // Update existing technician
      const oldData = this.data.technicians[existingIndex];
      
      // Preserve creation date
      normalized.created_at = oldData.created_at;
      
      // Merge certifications (avoid duplicates)
      const mergedCerts = this._mergeCertifications(
        oldData.certifications,
        normalized.certifications
      );
      normalized.certifications = mergedCerts;
      
      this.data.technicians[existingIndex] = normalized;
      
      await this.save();
      
      logger.info('Technician updated', {
        id: normalized.id,
        name: `${normalized.first_name} ${normalized.last_name}`,
        certificationsCount: normalized.certifications.length
      });
      
      return {
        action: 'updated',
        index: existingIndex,
        technician: normalized
      };
    } else {
      // Insert new technician
      this.data.technicians.push(normalized);
      
      await this.save();
      
      logger.info('Technician added', {
        id: normalized.id,
        name: `${normalized.first_name} ${normalized.last_name}`,
        certificationsCount: normalized.certifications.length
      });
      
      return {
        action: 'added',
        index: this.data.technicians.length - 1,
        technician: normalized
      };
    }
  }

  /**
   * Merge certification lists, avoiding duplicates
   */
  _mergeCertifications(existing, newCerts) {
    const merged = [...existing];
    
    for (const newCert of newCerts) {
      const isDuplicate = existing.some(existingCert => 
        existingCert.certification_type === newCert.certification_type &&
        existingCert.certification_name === newCert.certification_name
      );
      
      if (!isDuplicate) {
        merged.push(newCert);
      }
    }
    
    return merged;
  }

  /**
   * Get all technicians
   * @returns {Promise<Array>} List of all technicians
   */
  async getAllTechnicians() {
    if (!this.data) {
      await this.load();
    }
    return this.data.technicians || [];
  }

  /**
   * Find technician by name
   * @param {string} firstName
   * @param {string} lastName
   * @returns {Promise<Object|null>} Technician or null
   */
  async findTechnician(firstName, lastName) {
    if (!this.data) {
      await this.load();
    }
    
    const index = this._findTechnicianIndex(firstName, lastName);
    return index >= 0 ? this.data.technicians[index] : null;
  }

  /**
   * Find technicians by email
   * @param {string} email
   * @returns {Promise<Array>} Matching technicians
   */
  async findByEmail(email) {
    if (!this.data) {
      await this.load();
    }
    
    const normalizedEmail = (email || '').toLowerCase().trim();
    return this.data.technicians.filter(tech => 
      tech.email && tech.email.toLowerCase() === normalizedEmail
    );
  }

  /**
   * Find technicians with expiring certifications
   * @param {number} daysThreshold - Days until expiry
   * @returns {Promise<Array>} Technicians with expiring certs
   */
  async findExpiringCertifications(daysThreshold = 30) {
    if (!this.data) {
      await this.load();
    }
    
    const now = new Date();
    const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
    
    const results = [];
    
    for (const tech of this.data.technicians) {
      const expiringCerts = tech.certifications.filter(cert => {
        if (!cert.expiry_date) return false;
        const expiryDate = new Date(cert.expiry_date);
        return expiryDate <= threshold && expiryDate >= now;
      });
      
      if (expiringCerts.length > 0) {
        results.push({
          ...tech,
          expiring_certifications: expiringCerts
        });
      }
    }
    
    return results;
  }

  /**
   * Get statistics about the database
   */
  async getStats() {
    if (!this.data) {
      await this.load();
    }
    
    const totalTechs = this.data.technicians.length;
    const totalCerts = this.data.technicians.reduce(
      (sum, tech) => sum + tech.certifications.length,
      0
    );
    
    const certTypes = {};
    for (const tech of this.data.technicians) {
      for (const cert of tech.certifications) {
        certTypes[cert.certification_type] = (certTypes[cert.certification_type] || 0) + 1;
      }
    }
    
    return {
      total_technicians: totalTechs,
      total_certifications: totalCerts,
      avg_certifications_per_technician: totalTechs > 0 ? (totalCerts / totalTechs).toFixed(2) : 0,
      certification_types: certTypes,
      database_path: this.dbPath,
      last_updated: this.data.metadata?.last_updated || null
    };
  }

  /**
   * Delete technician by name
   * @param {string} firstName
   * @param {string} lastName
   * @returns {Promise<boolean>} Success status
   */
  async deleteTechnician(firstName, lastName) {
    if (!this.data) {
      await this.load();
    }
    
    const index = this._findTechnicianIndex(firstName, lastName);
    
    if (index >= 0) {
      const removed = this.data.technicians.splice(index, 1)[0];
      await this.save();
      
      logger.info('Technician deleted', {
        id: removed.id,
        name: `${removed.first_name} ${removed.last_name}`
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Export technicians to CSV format
   * @returns {Promise<string>} CSV content
   */
  async exportToCSV() {
    if (!this.data) {
      await this.load();
    }
    
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Phone',
      'Email',
      'Certifications Count',
      'Created At',
      'Updated At'
    ];
    
    const rows = this.data.technicians.map(tech => [
      tech.id,
      tech.first_name,
      tech.last_name,
      tech.phone || '',
      tech.email || '',
      tech.certifications.length,
      tech.created_at,
      tech.updated_at
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
}

// Export singleton instance
export default new TechnicianDatabaseService();
