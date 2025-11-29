/**
 * Unified Email Context
 * Automatically detects environment (Outlook vs Gmail) and uses appropriate provider
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
  internetMessageId?: string;
  fullConversation?: string;
}

type EmailPlatform = 'outlook' | 'gmail' | 'unknown';

interface EmailContextType {
  platform: EmailPlatform;
  isReady: boolean;
  currentEmail: EmailData | null;
  isLoadingEmail: boolean;
  loadEmailContext: () => void;
  insertTemplate: (template: string, includeHistory?: boolean) => Promise<void>;
  setBodyContent: (content: string) => Promise<void>;
  error: string | null;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const useEmail = () => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};

interface EmailProviderProps {
  children: ReactNode;
  forcePlatform?: EmailPlatform; // For testing
}

export const EmailProvider: React.FC<EmailProviderProps> = ({ children, forcePlatform }) => {
  const [platform, setPlatform] = useState<EmailPlatform>('unknown');
  const [isReady, setIsReady] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<EmailData | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect platform on mount
  useEffect(() => {
    const detectPlatform = async () => {
      if (forcePlatform) {
        setPlatform(forcePlatform);
        return;
      }

      // Check for Outlook (Office.js)
      if (typeof Office !== 'undefined' && Office.context?.mailbox) {
        console.log('Detected Outlook platform');
        setPlatform('outlook');
        return;
      }

      // Check for Chrome Extension (Gmail)
      if (typeof window !== 'undefined' && window.chrome?.runtime?.id) {
        console.log('Detected Gmail platform (Chrome extension)');
        setPlatform('gmail');
        return;
      }

      console.warn('Could not detect email platform');
      setPlatform('unknown');
    };

    detectPlatform();
  }, [forcePlatform]);

  // Initialize platform-specific context
  useEffect(() => {
    if (platform === 'unknown') return;

    const initPlatform = async () => {
      setIsLoadingEmail(true);
      
      try {
        if (platform === 'outlook') {
          await initOutlook();
        } else if (platform === 'gmail') {
          await initGmail();
        }
      } catch (err: any) {
        console.error('Failed to initialize platform:', err);
        setError(err.message);
      } finally {
        setIsLoadingEmail(false);
      }
    };

    initPlatform();
  }, [platform]);

  /**
   * Initialize Outlook integration
   */
  const initOutlook = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof Office === 'undefined') {
        reject(new Error('Office.js not available'));
        return;
      }

      Office.onReady((info) => {
        if (info.host === Office.HostType.Outlook) {
          console.log('Outlook initialized');
          setIsReady(true);
          loadEmailContext(); // Load initial email
          resolve();
        } else {
          reject(new Error('Not running in Outlook'));
        }
      });
    });
  };

  /**
   * Initialize Gmail integration
   */
  const initGmail = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.chrome?.runtime?.id) {
      throw new Error('Chrome extension APIs not available');
    }

    console.log('Gmail initialized');
    setIsReady(true);
    await loadEmailContext(); // Load initial email
  };

  /**
   * Load email context (platform-agnostic)
   */
  const loadEmailContext = async (): Promise<void> => {
    setIsLoadingEmail(true);
    setError(null);

    try {
      if (platform === 'outlook') {
        await loadOutlookEmail();
      } else if (platform === 'gmail') {
        await loadGmailEmail();
      } else {
        throw new Error('Unknown platform');
      }
    } catch (err: any) {
      console.error('Failed to load email:', err);
      setError(err.message);
      
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        setCurrentEmail({
          subject: 'Test Email',
          from: 'test@example.com',
          body: 'Test email body',
          date: new Date(),
        });
      }
    } finally {
      setIsLoadingEmail(false);
    }
  };

  /**
   * Load email from Outlook
   */
  const loadOutlookEmail = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const item: any = Office.context.mailbox.item;
      if (!item) {
        reject(new Error('No email item available'));
        return;
      }

      const emailData: Partial<EmailData> = {};

      // Get subject
      if (typeof item.subject === 'string') {
        emailData.subject = item.subject;
      } else if (item.subject?.getAsync) {
        item.subject.getAsync((result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            emailData.subject = result.value;
          }
        });
      }

      // Get from
      if (item.from) {
        emailData.from = item.from.emailAddress;
      }

      // Get body
      if (item.body?.getAsync) {
        item.body.getAsync('text', (result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            emailData.body = result.value;
            
            setCurrentEmail(emailData as EmailData);
            resolve();
          } else {
            reject(new Error('Failed to get email body'));
          }
        });
      } else {
        reject(new Error('Email body API not available'));
      }
    });
  };

  /**
   * Load email from Gmail
   */
  const loadGmailEmail = async (): Promise<void> => {
    const response = await sendGmailMessage({ action: 'GET_EMAIL_DATA' });
    
    if (response?.success) {
      setCurrentEmail(response.data);
    } else {
      throw new Error(response?.error || 'Failed to load Gmail email');
    }
  };

  /**
   * Insert template (platform-agnostic)
   */
  const insertTemplate = async (template: string, includeHistory: boolean = false): Promise<void> => {
    if (platform === 'outlook') {
      await insertOutlookTemplate(template, includeHistory);
    } else if (platform === 'gmail') {
      await insertGmailTemplate(template, includeHistory);
    } else {
      throw new Error('Unknown platform');
    }
  };

  /**
   * Set body content (platform-agnostic)
   */
  const setBodyContent = async (content: string): Promise<void> => {
    if (platform === 'outlook') {
      await setOutlookBody(content);
    } else if (platform === 'gmail') {
      await setGmailBody(content);
    } else {
      throw new Error('Unknown platform');
    }
  };

  // Outlook implementations
  const insertOutlookTemplate = async (template: string, includeHistory: boolean): Promise<void> => {
    return new Promise((resolve, reject) => {
      const item: any = Office.context.mailbox.item;
      Office.context.mailbox.displayNewMessageForm({
        toRecipients: item?.from ? [item.from.emailAddress] : [],
        subject: 'RE: ' + (item?.subject || ''),
        htmlBody: template.replace(/\n/g, '<br>')
      });
      resolve();
    });
  };

  const setOutlookBody = async (content: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const item: any = Office.context.mailbox.item;
      if (!item?.body) {
        reject(new Error('Email body API not available'));
        return;
      }
      
      item.body.setAsync(
        content,
        { coercionType: Office.CoercionType.Text },
        (result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve();
          } else {
            reject(new Error('Failed to set body'));
          }
        }
      );
    });
  };

  // Gmail implementations
  const insertGmailTemplate = async (template: string, includeHistory: boolean): Promise<void> => {
    const response = await sendGmailMessage({
      action: 'INSERT_REPLY',
      data: { template, includeHistory }
    });
    
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to insert template');
    }
  };

  const setGmailBody = async (content: string): Promise<void> => {
    const response = await sendGmailMessage({
      action: 'SET_BODY_CONTENT',
      data: { content }
    });
    
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to set body');
    }
  };

  /**
   * Send message to Gmail content script
   */
  const sendGmailMessage = async (message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!window.chrome?.tabs) {
        reject(new Error('Chrome tabs API not available'));
        return;
      }
      
      window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        if (tabs[0]?.id) {
          window.chrome.tabs.sendMessage(tabs[0].id, message, (response: any) => {
            if (window.chrome.runtime.lastError) {
              reject(new Error(window.chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        } else {
          reject(new Error('No active tab'));
        }
      });
    });
  };

  const contextValue: EmailContextType = {
    platform,
    isReady,
    currentEmail,
    isLoadingEmail,
    loadEmailContext,
    insertTemplate,
    setBodyContent,
    error,
  };

  return (
    <EmailContext.Provider value={contextValue}>
      {children}
    </EmailContext.Provider>
  );
};
