import axios from 'axios';
import { getIdToken } from './firebase';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getIdToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API endpoints
export const ApiService = {
  // Document endpoints
  documents: {
    list: (params?: any) => api.get('/api/documents', { params }),
    countByType: () => api.get('/api/documents/count-by-type'),
    delete: (docId: string) => api.delete(`/api/documents/${docId}`),
    stats: () => api.get('/api/documents/stats'),
  },

  // LLM Chat endpoints
  chat: {
    send: (message: string, agentId: string) => api.post('/api/chat', { message, agent_id: agentId }),
    getAgents: () => api.get('/api/agents'),
  },

  // Data sources
  sources: {
    // Gmail integration
    gmail: {
      connect: () => api.get('/api/sources/gmail/auth'),
      getEmails: () => api.get('/api/sources/gmail/recent_emails'),
      sync: () => api.post('/api/sources/gmail/sync'),
    },
    // Outlook integration
    outlook: {
      connect: () => api.get('/api/sources/outlook/auth'),
      getEmails: () => api.get('/api/sources/outlook/recent_emails'),
      sync: () => api.post('/api/sources/outlook/sync'),
    },
    // Nextcloud integration
    nextcloud: {
      connect: (serverUrl: string, username: string, password: string) => 
        api.post('/api/nextcloud/connect', { server_url: serverUrl, username, password }),
      getFiles: (path: string = '/') => 
        api.get('/api/nextcloud/list_files', { params: { path } }),
      sync: () => api.post('/api/nextcloud/sync'),
    }
  },

  // File uploads
  files: {
    upload: (formData: FormData) => 
      api.post('/api/db/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    getUploadUrl: (fileName: string, contentType: string) => 
      api.get('/api/db/get-upload-url', { params: { fileName, contentType } }),
  },
};

export default ApiService;
