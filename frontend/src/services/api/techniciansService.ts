import { BaseApiService } from './baseService';

export interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  certifications: Array<{
    certification_type: string;
    certification_name: string;
    issue_date: string | null;
    expiry_date: string | null;
  }>;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface TechniciansListResponse {
  success: boolean;
  data: Technician[];
  total: number;
}

export interface TechnicianResponse {
  success: boolean;
  data?: Technician;
  error?: string;
  message?: string;
}

/**
 * Technicians API Service
 * Manages technician database operations
 */
export class TechniciansService extends BaseApiService {
  private readonly endpoint = '/api/technicians';

  /**
   * Get all technicians
   */
  async getAllTechnicians(): Promise<{ data?: Technician[]; success: boolean; error?: string }> {
    try {
      const response = await this.get<TechniciansListResponse>(this.endpoint);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to fetch technicians'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get single technician by ID
   */
  async getTechnician(id: string): Promise<{ data?: Technician; success: boolean; error?: string }> {
    try {
      const response = await this.get<TechnicianResponse>(`${this.endpoint}?id=${id}`);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Technician not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create new technician
   */
  async createTechnician(data: Omit<Technician, 'id' | 'created_at' | 'updated_at'>): Promise<{ data?: Technician; success: boolean; error?: string }> {
    try {
      const response = await this.post<TechnicianResponse>(this.endpoint, data);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to create technician'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update existing technician
   */
  async updateTechnician(id: string, data: Partial<Technician>): Promise<{ data?: Technician; success: boolean; error?: string }> {
    try {
      const response = await this.put<TechnicianResponse>(`${this.endpoint}?id=${id}`, data);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to update technician'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete technician
   */
  async deleteTechnician(id: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await this.delete<{ success: boolean; message: string }>(`${this.endpoint}?id=${id}`);
      
      if (response.success && response.data) {
        return {
          success: true,
          message: response.data.message
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to delete technician'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const techniciansService = new TechniciansService();
