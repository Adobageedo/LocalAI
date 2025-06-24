import { create } from 'zustand';
import { User } from 'firebase/auth';

// Message types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

// Agent types
interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
}

// Connected accounts interface
interface ConnectedAccount {
  id: string;
  type: 'gmail' | 'outlook' | 'nextcloud' | 'onedrive' | 'sharepoint';
  email?: string;
  username?: string;
  lastSync?: Date;
  status: 'connected' | 'disconnected' | 'syncing';
}

// Document/File interface
interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  source: string;
  status: 'processing' | 'ready' | 'error';
}

// Interface for the store state
interface StoreState {
  // Auth state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Chat state
  messages: Record<string, Message[]>; // Keyed by conversation ID
  currentConversationId: string | null;
  agents: Agent[];
  currentAgent: Agent | null;
  addMessage: (conversationId: string, message: Message) => void;
  setCurrentConversationId: (id: string | null) => void;
  setAgents: (agents: Agent[]) => void;
  setCurrentAgent: (agent: Agent | null) => void;
  
  // Connected accounts
  connectedAccounts: ConnectedAccount[];
  addConnectedAccount: (account: ConnectedAccount) => void;
  updateConnectedAccount: (id: string, updates: Partial<ConnectedAccount>) => void;
  removeConnectedAccount: (id: string) => void;
  
  // Documents
  documents: Document[];
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  
  // UI state
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

// Create store
const useStore = create<StoreState>((set) => ({
  // Auth state
  user: null,
  setUser: (user) => set({ user }),
  
  // Chat state
  messages: {},
  currentConversationId: null,
  agents: [],
  currentAgent: null,
  addMessage: (conversationId, message) => 
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setAgents: (agents) => set({ agents }),
  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  
  // Connected accounts
  connectedAccounts: [],
  addConnectedAccount: (account) =>
    set((state) => ({
      connectedAccounts: [...state.connectedAccounts, account],
    })),
  updateConnectedAccount: (id, updates) =>
    set((state) => ({
      connectedAccounts: state.connectedAccounts.map((account) =>
        account.id === id ? { ...account, ...updates } : account
      ),
    })),
  removeConnectedAccount: (id) =>
    set((state) => ({
      connectedAccounts: state.connectedAccounts.filter((account) => account.id !== id),
    })),
  
  // Documents
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (document) =>
    set((state) => ({
      documents: [...state.documents, document],
    })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates } : doc
      ),
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
    })),
  
  // UI state
  theme: 'light',
  sidebarOpen: true,
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

export default useStore;
