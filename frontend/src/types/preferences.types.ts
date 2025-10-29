export interface SyncStatusResponse {
  isValid: boolean;
  lastSync?: string;
  error?: string;
}

export interface ConnectResponse {
  authUrl: string;
  message?: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  emailsSynced?: number;
}
