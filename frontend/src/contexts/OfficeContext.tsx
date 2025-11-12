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
  isLoadingEmail: boolean;
  loadEmailContext: () => void;
  insertTemplate: (template: string, includeHistory?: boolean) => Promise<void>;
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
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState(false);

  useEffect(() => {
    // Set loading state immediately
    setIsLoadingEmail(true);
    
    if (typeof Office !== 'undefined') {
      try {
        Office.onReady((info) => {
          if (info.host === Office.HostType.Outlook) {
            console.log('Office.js initialized successfully');
            setIsOfficeReady(true);
            // We'll load email context in a separate effect
          } else {
            console.warn('Not running in Outlook');
            setError('This add-in is designed for Outlook');
            setIsLoadingEmail(false);
          }
        });
      } catch (err) {
        console.error('Office initialization failed:', err);
        setError('Failed to initialize Office.js');
        setIsLoadingEmail(false);
      }
    } else {
      // Development mode without Office.js
      console.log('Office.js not available - running in development mode');
      setIsOfficeReady(true);
      setIsLoadingEmail(false);
      // Mock email data for development
      setCurrentEmail({
        subject: 'Sample Email Subject',
        from: 'sender@example.com',
        body: 'This is a sample email body for development purposes.'
      });
    }
  }, []);
  
  // Separate effect for loading email context after Office is ready
  useEffect(() => {
    if (isOfficeReady && typeof Office !== 'undefined') {
      loadEmailContext();
    }
  }, [isOfficeReady]);
  interface EmailParts {
    mainBody: string;
    conversationHistory: string;
  }

  function extractLatestReply(body: string): EmailParts {
    const patterns = [
      /^From:/mi,
      /^De\s?:/mi,
      /^-----Original Message-----/mi,
      /^Sent:/mi,
      /^Envoyé\s?:/mi,
    ];
  
    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match && match.index !== undefined) {
        const mainBody = body.substring(0, match.index).trim();
        const conversationHistory = body.substring(match.index).trim();
        
        return {
          mainBody,
          conversationHistory
        };
      }
    }
    
    // If no pattern is found, return the entire body as mainBody
    return {
      mainBody: body.trim(),
      conversationHistory: ''
    };
  }
  
  // Create a class to manage loading state with proper scope handling
  class LoadingManager {
    private timeoutId: NodeJS.Timeout;
    
    constructor(private timeoutMs: number = 15000) {
      // Clear any previous errors and set loading state
      setError(null);
      setIsLoadingEmail(true);
      
      // Set a timeout to prevent infinite loading
      this.timeoutId = setTimeout(() => {
        if (isLoadingEmail) {
          console.warn('Email loading timed out');
          setIsLoadingEmail(false);
          setError('Loading email timed out. Please try again.');
        }
      }, this.timeoutMs);
    }
    
    // Method to complete loading and clear timeout
    complete() {
      clearTimeout(this.timeoutId);
      setIsLoadingEmail(false);
    }
  }
  
  const loadEmailContext = () => {
    if (typeof Office === 'undefined') {
      return;
    }
    
    // Create loading manager to handle timeout and loading state
    activeLoadingManager = new LoadingManager();
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
              // Get raw email body and apply extractLatestReply to clean it
              const rawEmailBody = bodyResult.status === Office.AsyncResultStatus.Succeeded ? bodyResult.value : '';
              const emailParts = extractLatestReply(rawEmailBody);
              
              // Try to get full conversation using REST API
              getFullConversation(conversationId, internetMessageId, function(fullConversation: string) {
                // Include both main body and conversation history from the email
                updateEmailData(
                  emailSubject, 
                  emailFrom, 
                  emailParts.mainBody, 
                  conversationId, 
                  emailParts.conversationHistory || fullConversation, 
                  internetMessageId
                );
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
          // Even without email item, try to load basic context
          loadBasicEmailContext();
        }
      } else {
        console.error('Error getting callback token:', result.error);
        
        // Handle specific error codes
        if (result.error && result.error.code === 9018) {
          console.warn('GenericTokenError detected - likely corporate security policy. Attempting fallback...');
          setError('Corporate security policy detected. Some features may be limited.');
          
          // Try fallback approach without token
          loadBasicEmailContext();
        } else {
          setError(`Authentication error: ${result.error?.message || 'Unknown error'}`);
          activeLoadingManager?.complete();
        }
      }
    });
  };

  // Fallback function for corporate environments where getCallbackTokenAsync fails
  const loadBasicEmailContext = () => {
    if (typeof Office === 'undefined') {
      return;
    }

    try {
      const mailboxItem = Office.context.mailbox.item;
      
      if (mailboxItem) {
        let emailSubject = '';
        let emailFrom = '';
        
        // Handle both read and compose modes for subject
        if (typeof mailboxItem.subject === 'string') {
          // Read mode - subject is directly available as a string property
          emailSubject = mailboxItem.subject;
        } else if (mailboxItem.subject && typeof (mailboxItem.subject as any).getAsync === 'function') {
          // Compose mode - subject is an object with getAsync method
          (mailboxItem.subject as any).getAsync(function(result: any) {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              emailSubject = result.value || '';
            }
          });
        }

        // Handle sender information
        if (mailboxItem.from) {
          emailFrom = mailboxItem.from.displayName || mailboxItem.from.emailAddress || '';
        } else if (mailboxItem.organizer) {
          emailFrom = mailboxItem.organizer.displayName || mailboxItem.organizer.emailAddress || '';
        }

        // Try to get basic body without token (limited functionality)
        if (mailboxItem.body && typeof (mailboxItem.body as any).getAsync === 'function') {
          (mailboxItem.body as any).getAsync('text', function(result: any) {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              const rawEmailBody = result.value || '';
              // Apply extractLatestReply to clean the email body
              const emailParts = extractLatestReply(rawEmailBody);
              updateEmailData(emailSubject, emailFrom, emailParts.mainBody, undefined, emailParts.conversationHistory);
            } else {
              // If body fails, still update with available data
              updateEmailData(emailSubject, emailFrom, 'Email body unavailable in corporate environment');
            }
          });
        } else {
          // Update with available data even without body
          updateEmailData(emailSubject, emailFrom, 'Email body unavailable in corporate environment');
        }
      } else {
        console.log('No email item available in basic context');
        setError('No email selected or email context unavailable');
        activeLoadingManager?.complete();
      }
    } catch (error) {
      console.error('Error in loadBasicEmailContext:', error);
      setError('Unable to load email context in corporate environment');
      activeLoadingManager?.complete();
    }
  };

  // Create a shared loading manager that can be accessed outside of loadEmailContext
  let activeLoadingManager: LoadingManager | null = null;
  
  const updateEmailData = (subject: string, from: string, body: string, conversationId?: string, fullConversation?: string, internetMessageId?: string) => {
    console.log('Body:', body);
    console.log('Full Conversation:', fullConversation);

    setCurrentEmail({ 
      subject, 
      from, 
      body,
      conversationId,
      fullConversation,
      internetMessageId
    });
    
    // Complete loading if we have an active loading manager
    if (activeLoadingManager) {
      activeLoadingManager.complete();
      activeLoadingManager = null;
    } else {
      setIsLoadingEmail(false);
    }
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
          
          // Handle specific error codes for conversation retrieval
          if (result.error && result.error.code === 9018) {
            console.warn('GenericTokenError in conversation retrieval - corporate policy restriction');
            callback('Full conversation unavailable due to corporate security policy');
          } else {
            callback('');
          }
        }
      });
    } catch (error) {
      console.error('Error in getFullConversation:', error);
      callback('');
    }
  };

  const insertTemplate = async (template: string, includeHistory: boolean = true) => {
    if (typeof Office === 'undefined') {
      console.log('Would insert template:', template);
      return;
    }

    try {
      const item = Office.context.mailbox.item;
      if (item) {
        // Format the template with proper HTML
        const formattedTemplate = `<p>${template.replace(/\n/g, '</p><p>')}</p>`;
        
        // Prepare email content with optional conversation history
        let emailContent = formattedTemplate;
        
        // Add conversation history if requested and available
        if (includeHistory && currentEmail?.fullConversation) {
          // Add a separator between the new content and conversation history
          emailContent += `
          <div style="color: #5A5A5A; border-left: 1px solid #CCCCCC; padding-left: 10px; margin-left: 5px;">
            <p>${currentEmail.fullConversation.replace(/\n/g, '</p><p>')}</p>
          </div>
          `;
        }
        
        // Try to create a reply-all draft (preferred method)
        if (typeof item.displayReplyAllForm === 'function') {
          console.log('Using displayReplyAllForm to reply to all recipients');
          item.displayReplyAllForm({
            htmlBody: emailContent
          });
        } 
        // Fallback to regular reply if reply-all is not available
        else if (typeof item.displayReplyForm === 'function') {
          console.log('Falling back to displayReplyForm (reply to sender only)');
          item.displayReplyForm({
            htmlBody: emailContent
          });
        } 
        // Last resort fallback: create new message with reply context
        else {
          console.log('Falling back to displayNewMessageForm');
          const replySubject = currentEmail?.subject?.startsWith('Re:') 
            ? currentEmail.subject 
            : `Re: ${currentEmail?.subject || 'AI Generated Reply'}`;
          
          Office.context.mailbox.displayNewMessageForm({
            toRecipients: currentEmail?.from ? [{ displayName: currentEmail.from, emailAddress: currentEmail.from }] : [],
            subject: replySubject,
            htmlBody: emailContent
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
    isLoadingEmail,
    loadEmailContext,
    insertTemplate,
    error
  };

  // // Show loading state while Office is initializing
  // if (!isOfficeReady) {
  //   return (
  //     <div style={{ 
  //       display: 'flex', 
  //       flexDirection: 'column',
  //       alignItems: 'center', 
  //       justifyContent: 'center', 
  //       height: '100vh',
  //       padding: '20px',
  //       textAlign: 'center'
  //     }}>
  //       <div style={{ marginBottom: '16px', fontSize: '16px' }}>
  //         Initializing Office Add-in...
  //       </div>
  //       {error && (
  //         <div style={{ 
  //           color: '#d13438', 
  //           fontSize: '14px',
  //           marginTop: '8px',
  //           padding: '8px',
  //           backgroundColor: '#fdf2f2',
  //           border: '1px solid #f5c6cb',
  //           borderRadius: '4px'
  //         }}>
  //           {error}
  //         </div>
  //       )}
  //     </div>
  //   );
  // }

  return (
    <OfficeContext.Provider value={value}>
      {children}
    </OfficeContext.Provider>
  );
};
