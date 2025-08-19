import React, { useState, useEffect } from 'react';
import { 
  PrimaryButton, 
  DefaultButton, 
  Spinner, 
  SpinnerSize, 
  MessageBar, 
  MessageBarType,
  Stack,
  Text
} from '@fluentui/react';
import { useTranslations } from '../utils/i18n';

interface EmailSyncProps {
  userEmail: string;
}

interface SyncStatus {
  isConnected: boolean;
  isChecking: boolean;
  lastSync?: Date;
  error?: string;
}

const EmailSync: React.FC<EmailSyncProps> = ({ userEmail }) => {
  const t = useTranslations();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isChecking: true
  });

  // Check MSAL token validity on component mount
  useEffect(() => {
    checkMSALToken();
  }, [userEmail]);

  const checkMSALToken = async () => {
    setSyncStatus(prev => ({ ...prev, isChecking: true, error: undefined }));
    
    try {
      // Call backend to validate MSAL token
      const response = await fetch('https://chardouin.fr/api/msal/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus({
          isConnected: data.isValid || false,
          isChecking: false,
          lastSync: data.lastSync ? new Date(data.lastSync) : undefined
        });
      } else {
        setSyncStatus({
          isConnected: false,
          isChecking: false,
          error: 'Failed to check token status'
        });
      }
    } catch (error) {
      console.error('Error checking MSAL token:', error);
      setSyncStatus({
        isConnected: false,
        isChecking: false,
        error: 'Network error while checking connection'
      });
    }
  };

  const connectOutlook = async () => {
    setSyncStatus(prev => ({ ...prev, isChecking: true, error: undefined }));
    
    try {
      // Call backend to initiate MSAL authentication
      const response = await fetch('https://chardouin.fr/api/msal/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.authUrl) {
          // Open authentication URL in new window
          const authWindow = window.open(
            data.authUrl,
            'outlook-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          );

          // Poll for authentication completion
          const pollForAuth = setInterval(() => {
            try {
              if (authWindow?.closed) {
                clearInterval(pollForAuth);
                // Recheck token status after auth window closes
                setTimeout(checkMSALToken, 1000);
              }
            } catch (error) {
              // Cross-origin error when trying to access closed window
              clearInterval(pollForAuth);
              setTimeout(checkMSALToken, 1000);
            }
          }, 1000);
        } else {
          setSyncStatus(prev => ({
            ...prev,
            isChecking: false,
            error: 'Failed to get authentication URL'
          }));
        }
      } else {
        setSyncStatus(prev => ({
          ...prev,
          isChecking: false,
          error: 'Failed to initiate Outlook connection'
        }));
      }
    } catch (error) {
      console.error('Error connecting to Outlook:', error);
      setSyncStatus(prev => ({
        ...prev,
        isChecking: false,
        error: 'Network error while connecting to Outlook'
      }));
    }
  };

  const syncEmails = async () => {
    setSyncStatus(prev => ({ ...prev, isChecking: true, error: undefined }));
    
    try {
      const response = await fetch('https://chardouin.fr/api/msal/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus({
          isConnected: true,
          isChecking: false,
          lastSync: new Date()
        });
      } else {
        setSyncStatus(prev => ({
          ...prev,
          isChecking: false,
          error: 'Failed to sync emails'
        }));
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      setSyncStatus(prev => ({
        ...prev,
        isChecking: false,
        error: 'Network error while syncing emails'
      }));
    }
  };

  return (
    <div style={{ 
      padding: '16px', 
      borderBottom: '1px solid #edebe9',
      backgroundColor: '#faf9f8'
    }}>
      <Stack tokens={{ childrenGap: 12 }}>
        <Text variant="mediumPlus" style={{ fontWeight: 600 }}>
          {t.syncEmail}
        </Text>

        {syncStatus.isChecking && (
          <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
            <Spinner size={SpinnerSize.small} />
            <Text variant="small">{t.checkingConnection}</Text>
          </Stack>
        )}

        {!syncStatus.isChecking && (
          <>
            {syncStatus.isConnected ? (
              <Stack tokens={{ childrenGap: 8 }}>
                <MessageBar messageBarType={MessageBarType.success}>
                  {t.outlookConnected}
                  {syncStatus.lastSync && (
                    <Text variant="small" style={{ marginLeft: 8 }}>
                      (Last sync: {syncStatus.lastSync.toLocaleTimeString()})
                    </Text>
                  )}
                </MessageBar>
                
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <PrimaryButton 
                    text={t.syncEmail}
                    onClick={syncEmails}
                    disabled={syncStatus.isChecking}
                  />
                  <DefaultButton 
                    text={t.retry}
                    onClick={checkMSALToken}
                  />
                </Stack>
              </Stack>
            ) : (
              <Stack tokens={{ childrenGap: 8 }}>
                <MessageBar messageBarType={MessageBarType.warning}>
                  {t.outlookNotConnected}
                </MessageBar>
                
                <PrimaryButton 
                  text={t.connectOutlook}
                  onClick={connectOutlook}
                  disabled={syncStatus.isChecking}
                />
              </Stack>
            )}
          </>
        )}

        {syncStatus.error && (
          <MessageBar messageBarType={MessageBarType.error}>
            {syncStatus.error}
          </MessageBar>
        )}
      </Stack>
    </div>
  );
};

export default EmailSync;
