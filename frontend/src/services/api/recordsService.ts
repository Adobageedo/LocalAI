import { BaseApiService } from './baseService';

export interface Record {
  id: string;
  date: string;
  windfarm: string;
  topic: string;
  comment: string;
  type: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordsListResponse {
  success: boolean;
  data: Record[];
  total: number;
}

export interface RecordResponse {
  success: boolean;
  data?: Record;
  error?: string;
  message?: string;
}

/**
 * Records API Service
 * Manages records/notes database operations
 */
export class RecordsService extends BaseApiService {
  private readonly endpoint = '/api/records';

  /**
   * Get all records
   */
  async getAllRecords(): Promise<{ data?: Record[]; success: boolean; error?: string }> {
    try {
      const response = await this.get<RecordsListResponse>(this.endpoint);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to fetch records'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get single record by ID
   */
  async getRecord(id: string): Promise<{ data?: Record; success: boolean; error?: string }> {
    try {
      const response = await this.get<RecordResponse>(`${this.endpoint}?id=${id}`);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Record not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create new record
   */
  async createRecord(data: Omit<Record, 'id' | 'created_at' | 'updated_at'>): Promise<{ data?: Record; success: boolean; error?: string }> {
    try {
      const response = await this.post<RecordResponse>(this.endpoint, data);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to create record'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update existing record
   */
  async updateRecord(id: string, data: Partial<Record>): Promise<{ data?: Record; success: boolean; error?: string }> {
    try {
      const response = await this.put<RecordResponse>(`${this.endpoint}?id=${id}`, data);
      
      if (response.success && response.data) {
        return {
          data: response.data.data,
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to update record'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete record
   */
  async deleteRecord(id: string): Promise<{ success: boolean; error?: string; message?: string }> {
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
        error: response.error || 'Failed to delete record'
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
export const recordsService = new RecordsService();
