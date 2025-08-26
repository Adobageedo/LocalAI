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
import { useTranslations } from '../../utils/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/authFetch';
import { API_ENDPOINTS } from '../../config/api';


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
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isChecking: true
  });

  // Check Outlook auth status on component mount
  useEffect(() => {
    if (user) {
      checkOutlookAuthStatus();
    }
  }, [user]);

  const checkOutlookAuthStatus = async () => {
    setSyncStatus(prev => ({ ...prev, isChecking: true, error: undefined }));
    
    try {
      if (!user) {
        setSyncStatus({
          isConnected: false,
          isChecking: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Get Firebase token for backend authentication
      const token = await user.getIdToken();
      
      // Call backend to check Outlook auth status
      const response = await authFetch(API_ENDPOINTS.OUTLOOK_STATUS, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus({
          isConnected: data.authenticated && data.valid,
          isChecking: false,
          lastSync: data.lastSync ? new Date(data.lastSync) : undefined
        });
      } else {
        setSyncStatus({
          isConnected: false,
          isChecking: false,
          error: 'Failed to check Outlook auth status'
        });
      }
    } catch (error) {
      console.error('Error checking Outlook auth status:', error);
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
      if (!user) {
        setSyncStatus(prev => ({
          ...prev,
          isChecking: false,
          error: 'User not authenticated'
        }));
        return;
      }

      // Get Firebase token for backend authentication
      const token = await user.getIdToken();
      
      // Call backend to get Microsoft auth URL
      const response = await authFetch(API_ENDPOINTS.OUTLOOK_AUTH, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.auth_url) {
          // Open authentication URL in new window
          const authWindow = window.open(
            data.auth_url,
            'outlook-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          );

          // Poll for authentication completion
          const pollForAuth = setInterval(() => {
            try {
              if (authWindow?.closed) {
                clearInterval(pollForAuth);
                // Recheck auth status after auth window closes
                setTimeout(checkOutlookAuthStatus, 1000);
              }
            } catch (error) {
              // Cross-origin error when trying to access closed window
              clearInterval(pollForAuth);
              setTimeout(checkOutlookAuthStatus, 1000);
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
      if (!user) {
        setSyncStatus(prev => ({
          ...prev,
          isChecking: false,
          error: 'User not authenticated'
        }));
        return;
      }

      // Get Firebase token for backend authentication
      const token = await user.getIdToken();
      
      // For now, just refresh the auth status as sync functionality
      // In the future, this could call a dedicated sync endpoint
      await checkOutlookAuthStatus();
      
      // If still connected after check, update last sync time
      setSyncStatus(prev => {
        if (prev.isConnected) {
          return {
            ...prev,
            isChecking: false,
            lastSync: new Date()
          };
        }
        return {
          ...prev,
          isChecking: false,
          error: 'Outlook not connected. Please reconnect.'
        };
      });
      
    } catch (error) {
      console.error('Error syncing emails:', error);
      setSyncStatus(prev => ({
        ...prev,
        isChecking: false,
        error: 'Network error while syncing emails'
      }));
    }
  };

  const disconnectOutlook = async () => {
    setSyncStatus(prev => ({ ...prev, isChecking: true, error: undefined }));
    
    try {
      if (!user) {
        setSyncStatus(prev => ({
          ...prev,
          isChecking: false,
          error: 'User not authenticated'
        }));
        return;
      }

      // Get Firebase token for backend authentication
      const token = await user.getIdToken();
      
      // Call backend to revoke Microsoft access
      const response = await authFetch(API_ENDPOINTS.OUTLOOK_REVOKE_ACCESS, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSyncStatus({
            isConnected: false,
            isChecking: false,
            lastSync: undefined
          });
        } else {
          setSyncStatus(prev => ({
            ...prev,
            isChecking: false,
            error: data.message || 'Failed to disconnect Outlook'
          }));
        }
      } else {
        setSyncStatus(prev => ({
          ...prev,
          isChecking: false,
          error: 'Failed to disconnect Outlook'
        }));
      }
    } catch (error) {
      console.error('Error disconnecting Outlook:', error);
      setSyncStatus(prev => ({
        ...prev,
        isChecking: false,
        error: 'Network error while disconnecting Outlook'
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
                
                <Stack horizontal tokens={{ childrenGap: 8 }} wrap>
                  <PrimaryButton 
                    text={t.syncEmail}
                    onClick={syncEmails}
                    disabled={syncStatus.isChecking}
                  />
                  <DefaultButton 
                    text={t.retry}
                    onClick={checkOutlookAuthStatus}
                    disabled={syncStatus.isChecking}
                  />
                  <DefaultButton 
                    text="Disconnect"
                    onClick={disconnectOutlook}
                    disabled={syncStatus.isChecking}
                    styles={{ root: { color: '#d13438' } }}
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
