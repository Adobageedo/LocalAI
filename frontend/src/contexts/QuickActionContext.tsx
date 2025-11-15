import React, { createContext, useContext, useState, ReactNode } from 'react';

export type QuickActionStatus = 
  | 'idle'
  | 'extracting'
  | 'using_mcp'
  | 'streaming'
  | 'complete'
  | 'error';

export interface QuickActionState {
  isActive: boolean;
  actionKey: string | null;
  status: QuickActionStatus;
  statusMessage: string;
  streamedContent: string;
  usesLLM: boolean;
  usesMCP: boolean;
  error?: string;
}

interface QuickActionContextValue {
  state: QuickActionState;
  startAction: (actionKey: string, usesLLM: boolean, usesMCP: boolean) => void;
  updateStatus: (status: QuickActionStatus, message: string) => void;
  updateStreamedContent: (content: string) => void;
  setError: (error: string) => void;
  completeAction: () => void;
  resetAction: () => void;
}

const QuickActionContext = createContext<QuickActionContextValue | undefined>(undefined);

const initialState: QuickActionState = {
  isActive: false,
  actionKey: null,
  status: 'idle',
  statusMessage: '',
  streamedContent: '',
  usesLLM: false,
  usesMCP: false,
};

export const QuickActionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<QuickActionState>(initialState);

  const startAction = (actionKey: string, usesLLM: boolean, usesMCP: boolean) => {
    setState({
      ...initialState,
      isActive: true,
      actionKey,
      usesLLM,
      usesMCP,
      status: 'extracting',
      statusMessage: 'Extraction des données...',
    });
  };

  const updateStatus = (status: QuickActionStatus, message: string) => {
    setState(prev => ({
      ...prev,
      status,
      statusMessage: message,
    }));
  };

  const updateStreamedContent = (content: string) => {
    setState(prev => ({
      ...prev,
      streamedContent: content,
    }));
  };

  const setError = (error: string) => {
    setState(prev => ({
      ...prev,
      status: 'error',
      error,
      statusMessage: `Erreur: ${error}`,
    }));
  };

  const completeAction = () => {
    setState(prev => ({
      ...prev,
      status: 'complete',
      statusMessage: 'Terminé',
    }));
  };

  const resetAction = () => {
    setState(initialState);
  };

  return (
    <QuickActionContext.Provider
      value={{
        state,
        startAction,
        updateStatus,
        updateStreamedContent,
        setError,
        completeAction,
        resetAction,
      }}
    >
      {children}
    </QuickActionContext.Provider>
  );
};

export const useQuickAction = () => {
  const context = useContext(QuickActionContext);
  if (!context) {
    throw new Error('useQuickAction must be used within QuickActionProvider');
  }
  return context;
};
