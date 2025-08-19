import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface EmailData {
  subject: string;
  from: string;
  body: string;
  conversationId?: string;
  fullConversation?: string;
  internetMessageId?: string;
}

interface OfficeContextType {
  isOfficeReady: boolean;
  currentEmail: EmailData | null;
  loadEmailContext: () => void;
  insertTemplate: (template: string) => Promise<void>;
  error: string | null;
}

const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

export const useOffice = () => {
  const context = useContext(OfficeContext);
  if (context === undefined) {
    throw new Error('useOffice must be used within an OfficeProvider');
  }
  return context;
};

interface OfficeProviderProps {
  children: ReactNode;
}

export const OfficeProvider: React.FC<OfficeProviderProps> = ({ children }) => {
  const [isOfficeReady, setIsOfficeReady] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<EmailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Office !== 'undefined') {
      Office.onReady((info) => {
        if (info.host === Office.HostType.Outlook) {
          console.log('Office.js initialized successfully');
          setIsOfficeReady(true);
          loadEmailContext();
        }
      });
    } else {
      // Development mode without Office.js
      console.log('Office.js not available - running in development mode');
      setIsOfficeReady(true);
      // Mock email data for development
      setCurrentEmail({
        subject: 'Sample Email Subject',
        from: 'sender@example.com',
        body: 'This is a sample email body for development purposes.'
      });
    }
  }, []);

  const loadEmailContext = () => {
    if (typeof Office === 'undefined') {
      return;
    }

    // Use the same approach as the working taskpane.js
    Office.context.mailbox.getCallbackTokenAsync(function(result) {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const mailboxItem = Office.context.mailbox.item;
        
        if (mailboxItem) {
          let emailSubject = '';
          let emailFrom = '';
          
          // Handle both read and compose modes for subject
          if (typeof mailboxItem.subject === 'string') {
            // Read mode - subject is directly available as a string property
            emailSubject = mailboxItem.subject || '(No subject)';
          } else if (typeof mailboxItem.subject === 'object' && (mailboxItem.subject as any)?.getAsync) {
            // Compose mode - need to call getAsync()
            (mailboxItem.subject as any).getAsync(function(asyncResult: any) {
              if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
                emailSubject = asyncResult.value || '(No subject)';
                updateEmailData(emailSubject, emailFrom, '');
              }
            });
            return; // Exit early, will update via callback
          } else {
            emailSubject = '(No subject data)';
          }
          
          // Get sender info (only available in read mode)
          if (mailboxItem.from) {
            emailFrom = mailboxItem.from.emailAddress || mailboxItem.from.displayName || 'Unknown';
          } else {
            emailFrom = 'N/A';
          }
          
          // Get additional email properties
          const conversationId = mailboxItem.conversationId || '';
          const internetMessageId = mailboxItem.internetMessageId || '';
          
          // Get body if available
          if (mailboxItem.body && typeof (mailboxItem.body as any).getAsync === 'function') {
            (mailboxItem.body as any).getAsync('text', function(bodyResult: any) {
              const emailBody = bodyResult.status === Office.AsyncResultStatus.Succeeded ? bodyResult.value : '';
              
              // Try to get full conversation using REST API
              getFullConversation(conversationId, internetMessageId, function(fullConversation: string) {
                updateEmailData(emailSubject, emailFrom, emailBody, conversationId, fullConversation, internetMessageId);
              });
            });
          } else {
            // Try to get full conversation even without body
            getFullConversation(conversationId, internetMessageId, function(fullConversation: string) {
              updateEmailData(emailSubject, emailFrom, '', conversationId, fullConversation, internetMessageId);
            });
          }
        } else {
          console.log('No email item available');
        }
      } else {
        console.error('Error getting callback token:', result.error);
      }
    });
  };

  const updateEmailData = (subject: string, from: string, body: string, conversationId?: string, fullConversation?: string, internetMessageId?: string) => {
    setCurrentEmail({ 
      subject, 
      from, 
      body, 
      conversationId, 
      fullConversation, 
      internetMessageId 
    });
    console.log('Email context loaded:', { 
      subject, 
      from, 
      bodyLength: body.length, 
      conversationId, 
      fullConversationLength: fullConversation?.length || 0,
      internetMessageId 
    });
  };

  const getFullConversation = (conversationId: string, internetMessageId: string, callback: (conversation: string) => void) => {
    if (typeof Office === 'undefined' || !conversationId) {
      callback('');
      return;
    }

    try {
      // Try to get the full conversation using Office.js REST API
      Office.context.mailbox.getCallbackTokenAsync({ isRest: true }, function(result) {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          const accessToken = result.value;
          const mailboxUrl = Office.context.mailbox.restUrl;
          
          // Get conversation messages
          const conversationUrl = `${mailboxUrl}/v2.0/me/messages?$filter=conversationId eq '${conversationId}'&$select=subject,from,body,receivedDateTime,sender&$orderby=receivedDateTime asc`;
          
          fetch(conversationUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          })
          .then(response => response.json())
          .then(data => {
            if (data.value && Array.isArray(data.value)) {
              const conversationText = data.value.map((msg: any, index: number) => {
                const sender = msg.from?.emailAddress?.address || msg.sender?.emailAddress?.address || 'Unknown';
                const subject = msg.subject || '(No subject)';
                const body = msg.body?.content || '';
                const date = msg.receivedDateTime || '';
                
                return `--- Message ${index + 1} ---\nFrom: ${sender}\nSubject: ${subject}\nDate: ${date}\n\n${body}\n\n`;
              }).join('');
              
              console.log('Full conversation retrieved:', conversationText.length, 'characters');
              callback(conversationText);
            } else {
              console.log('No conversation messages found');
              callback('');
            }
          })
          .catch(error => {
            console.error('Error fetching conversation:', error);
            callback('');
          });
        } else {
          console.error('Error getting REST token:', result.error);
          callback('');
        }
      });
    } catch (error) {
      console.error('Error in getFullConversation:', error);
      callback('');
    }
  };

  const insertTemplate = async (template: string) => {
    if (typeof Office === 'undefined') {
      console.log('Would insert template:', template);
      return;
    }

    try {
      const item = Office.context.mailbox.item;
      if (item) {
        // Try to create a reply draft
        if (typeof item.displayReplyForm === 'function') {
          // Use displayReplyForm for creating a reply draft
          item.displayReplyForm({
            htmlBody: `<p>${template.replace(/\n/g, '</p><p>')}</p>`
          });
        } else {
          // Fallback: create new message with reply context
          const replySubject = currentEmail?.subject?.startsWith('Re:') 
            ? currentEmail.subject 
            : `Re: ${currentEmail?.subject || 'AI Generated Reply'}`;
          
          Office.context.mailbox.displayNewMessageForm({
            toRecipients: currentEmail?.from ? [{ displayName: currentEmail.from, emailAddress: currentEmail.from }] : [],
            subject: replySubject,
            htmlBody: `<p>${template.replace(/\n/g, '</p><p>')}</p>`
          });
        }
      } else {
        console.error('No email item available for reply');
        throw new Error('No email item available');
      }
    } catch (error) {
      console.error('Error inserting template:', error);
      throw error;
    }
  };

  const value = {
    isOfficeReady,
    currentEmail,
    loadEmailContext,
    insertTemplate,
    error
  };

  // Show loading state while Office is initializing
  if (!isOfficeReady) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '16px', fontSize: '16px' }}>
          Initializing Office Add-in...
        </div>
        {error && (
          <div style={{ 
            color: '#d13438', 
            fontSize: '14px',
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fdf2f2',
            border: '1px solid #f5c6cb',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <OfficeContext.Provider value={value}>
      {children}
    </OfficeContext.Provider>
  );
};
