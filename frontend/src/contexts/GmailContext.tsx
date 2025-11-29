/**
 * GmailContext - Provider for Gmail web extension integration
 * Uses Chrome Extension APIs and Gmail API to access email data
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface EmailData {
  subject: string;
  from: string;
  body: string;
  to?: string;
  cc?: string;
  date?: Date;
  conversationId?: string;
  threadId?: string;
  messageId?: string;
}

interface GmailContextType {
  isGmailReady: boolean;
  currentEmail: EmailData | null;
  isLoadingEmail: boolean;
  loadEmailContext: () => void;
  insertTemplate: (template: string, includeHistory?: boolean) => Promise<void>;
  setBodyContent: (content: string) => Promise<void>;
  error: string | null;
}

const GmailContext = createContext<GmailContextType | undefined>(undefined);

export const useGmail = () => {
  const context = useContext(GmailContext);
  if (context === undefined) {
    throw new Error('useGmail must be used within a GmailProvider');
  }
  return context;
};

interface GmailProviderProps {
  children: ReactNode;
}

export const GmailProvider: React.FC<GmailProviderProps> = ({ children }) => {
  const [isGmailReady, setIsGmailReady] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<EmailData | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if running in Chrome extension context
  useEffect(() => {
    const checkGmailContext = async () => {
      setIsLoadingEmail(true);
      
      try {
        // Check if chrome.runtime is available (extension context)
        if (typeof window !== 'undefined' && window.chrome?.runtime?.id) {
          console.log('Chrome extension context detected');
          setIsGmailReady(true);
          
          // Load current email context
          await loadEmailContext();
        } else {
          console.warn('Not running in Chrome extension context');
          setError('This feature requires Chrome extension');
          setIsGmailReady(false);
        }
      } catch (err: any) {
        console.error('Failed to initialize Gmail context:', err);
        setError(err.message || 'Failed to initialize');
      } finally {
        setIsLoadingEmail(false);
      }
    };

    checkGmailContext();
  }, []);

  /**
   * Load current email context from Gmail
   * Uses content script messages to get email data from the page
   */
  const loadEmailContext = async () => {
    setIsLoadingEmail(true);
    setError(null);

    try {
      // Send message to content script to extract email data
      const response = await sendMessageToContentScript({ action: 'GET_EMAIL_DATA' });
      
      if (response && response.success) {
        const emailData: EmailData = {
          subject: response.data.subject || '',
          from: response.data.from || '',
          body: response.data.body || '',
          to: response.data.to,
          cc: response.data.cc,
          date: response.data.date ? new Date(response.data.date) : undefined,
          conversationId: response.data.conversationId,
          threadId: response.data.threadId,
          messageId: response.data.messageId,
        };

        setCurrentEmail(emailData);
        console.log('Gmail email context loaded:', emailData);
      } else {
        throw new Error(response?.error || 'Failed to load email data');
      }
    } catch (err: any) {
      console.error('Error loading Gmail context:', err);
      setError(err.message || 'Failed to load email');
      
      // Fallback to mock data for development
      if (process.env.NODE_ENV === 'development') {
        setCurrentEmail({
          subject: 'Test Email Subject',
          from: 'sender@example.com',
          body: 'This is a test email body for development.',
          date: new Date(),
        });
      }
    } finally {
      setIsLoadingEmail(false);
    }
  };

  /**
   * Insert template into Gmail compose window
   * For read mode: Creates a reply with the template
   * @param template - The template text to insert
   * @param includeHistory - Whether to include email history (for replies)
   */
  const insertTemplate = async (template: string, includeHistory: boolean = false): Promise<void> => {
    try {
      // Send message to content script to insert reply
      const response = await sendMessageToContentScript({
        action: 'INSERT_REPLY',
        data: { template, includeHistory }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to insert reply');
      }

      console.log('Template inserted successfully');
    } catch (err: any) {
      console.error('Error inserting template:', err);
      throw new Error(`Failed to insert template: ${err.message}`);
    }
  };

  /**
   * Set body content in Gmail compose window
   * For compose mode: Replaces the current body
   * @param content - The content to set
   */
  const setBodyContent = async (content: string): Promise<void> => {
    try {
      // Send message to content script to set body content
      const response = await sendMessageToContentScript({
        action: 'SET_BODY_CONTENT',
        data: { content }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to set body content');
      }

      console.log('Body content set successfully');
    } catch (err: any) {
      console.error('Error setting body content:', err);
      throw new Error(`Failed to set body content: ${err.message}`);
    }
  };

  /**
   * Send message to content script running in Gmail page
   */
  const sendMessageToContentScript = async (message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      try {
        if (!window.chrome?.tabs) {
          reject(new Error('Chrome tabs API not available'));
          return;
        }
        
        // Get active Gmail tab
        window.chrome.tabs.query({ active: true, currentWindow: true, url: '*://mail.google.com/*' }, (tabs: any[]) => {
          if (tabs && tabs[0] && tabs[0].id) {
            // Send message to content script in that tab
            window.chrome.tabs.sendMessage(tabs[0].id, message, (response: any) => {
              if (window.chrome.runtime.lastError) {
                reject(new Error(window.chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          } else {
            reject(new Error('No active Gmail tab found'));
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  const contextValue: GmailContextType = {
    isGmailReady,
    currentEmail,
    isLoadingEmail,
    loadEmailContext,
    insertTemplate,
    setBodyContent,
    error,
  };

  return (
    <GmailContext.Provider value={contextValue}>
      {children}
    </GmailContext.Provider>
  );
};
