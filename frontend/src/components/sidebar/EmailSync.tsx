import React, { useState, useEffect } from 'react';
import { 
  PrimaryButton, 
  DefaultButton, 
  Spinner, 
  SpinnerSize, 
  MessageBar, 
  MessageBarType,
  Stack,
  Text,
  FontWeights,
  useTheme,
  mergeStyleSets
} from '@fluentui/react';
import { 
  CloudSync24Regular,
  CheckmarkCircle24Regular,
  Warning24Regular,
  PlugConnected24Regular,
  PlugDisconnected24Regular
} from '@fluentui/react-icons';
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
  const theme = useTheme();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isChecking: true
  });

  const styles = mergeStyleSets({
    container: {
      padding: '24px',
      backgroundColor: theme.palette.white,
      borderRadius: '16px',
      border: `1px solid ${theme.palette.neutralLight}`,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        transform: 'translateY(-1px)'
      }
    },
    header: {
      fontSize: '18px',
      fontWeight: FontWeights.semibold,
      color: theme.palette.themePrimary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    loadingContainer: {
      padding: '16px 20px',
      backgroundColor: theme.palette.themeLighterAlt,
      borderRadius: '12px',
      border: `1px solid ${theme.palette.themeLight}`
    },
    loadingText: {
      fontSize: '14px',
      fontWeight: FontWeights.regular,
      color: theme.palette.themePrimary
    },
    buttonPrimary: {
      borderRadius: '12px',
      height: '40px',
      fontSize: '14px',
      fontWeight: FontWeights.semibold,
      minWidth: '120px',
      transition: 'all 0.2s ease-in-out'
    },
    buttonSecondary: {
      borderRadius: '12px',
      height: '40px',
      fontSize: '14px',
      fontWeight: FontWeights.regular,
      minWidth: '100px',
      border: `2px solid ${theme.palette.neutralLight}`,
      transition: 'all 0.2s ease-in-out'
    },
    buttonDisconnect: {
      borderRadius: '12px',
      height: '40px',
      fontSize: '14px',
      fontWeight: FontWeights.regular,
      minWidth: '100px',
      backgroundColor: '#fef2f2',
      border: '2px solid #fecaca',
      color: '#dc2626',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        backgroundColor: '#fee2e2',
        border: '2px solid #f87171'
      }
    },
    messageBar: {
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: FontWeights.regular
    },
    syncInfo: {
      fontSize: '12px',
      color: theme.palette.neutralSecondary,
      fontStyle: 'italic'
    }
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
    <div className={styles.container}>
      <Stack tokens={{ childrenGap: 20 }}>
        <Text className={styles.header}>
          <CloudSync24Regular /> Synchronisation Outlook
        </Text>

        {syncStatus.isChecking && (
          <Stack 
            horizontal 
            tokens={{ childrenGap: 12 }} 
            verticalAlign="center"
            className={styles.loadingContainer}
          >
            <Spinner 
              size={SpinnerSize.medium} 
              styles={{ circle: { borderTopColor: theme.palette.themePrimary } }}
            />
            <Text className={styles.loadingText}>
              Vérification de la connexion...
            </Text>
          </Stack>
        )}

        {!syncStatus.isChecking && (
          <>
            {syncStatus.isConnected ? (
              <Stack tokens={{ childrenGap: 16 }}>
                <MessageBar 
                  messageBarType={MessageBarType.success}
                  styles={{ root: styles.messageBar }}
                >
                  <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                    <CheckmarkCircle24Regular style={{ color: '#107c10' }} />
                    <div>
                      <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>
                        Outlook connecté avec succès
                      </Text>
                      {syncStatus.lastSync && (
                        <Text className={styles.syncInfo}>
                          Dernière synchronisation: {syncStatus.lastSync.toLocaleString('fr-FR')}
                        </Text>
                      )}
                    </div>
                  </Stack>
                </MessageBar>
                
                <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
                  <PrimaryButton 
                    text="Synchroniser"
                    onClick={syncEmails}
                    disabled={syncStatus.isChecking}
                    styles={{ root: styles.buttonPrimary }}
                    iconProps={{ iconName: 'Sync' }}
                  />
                  <DefaultButton 
                    text="Actualiser"
                    onClick={checkOutlookAuthStatus}
                    disabled={syncStatus.isChecking}
                    styles={{ root: styles.buttonSecondary }}
                    iconProps={{ iconName: 'Refresh' }}
                  />
                  <DefaultButton 
                    text="Déconnecter"
                    onClick={disconnectOutlook}
                    disabled={syncStatus.isChecking}
                    styles={{ root: styles.buttonDisconnect }}
                    iconProps={{ iconName: 'PlugDisconnected' }}
                  />
                </Stack>
              </Stack>
            ) : (
              <Stack tokens={{ childrenGap: 16 }}>
                <MessageBar 
                  messageBarType={MessageBarType.warning}
                  styles={{ root: styles.messageBar }}
                >
                  <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                    <Warning24Regular style={{ color: '#ff8c00' }} />
                    <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>
                      Outlook n'est pas connecté
                    </Text>
                  </Stack>
                  <Text styles={{ root: { fontSize: '13px', marginTop: '4px' } }}>
                    Connectez votre compte Outlook pour synchroniser vos emails.
                  </Text>
                </MessageBar>
                
                <PrimaryButton 
                  text="Connecter Outlook"
                  onClick={connectOutlook}
                  disabled={syncStatus.isChecking}
                  styles={{ root: styles.buttonPrimary }}
                  iconProps={{ iconName: 'PlugConnected' }}
                />
              </Stack>
            )}
          </>
        )}

        {syncStatus.error && (
          <MessageBar 
            messageBarType={MessageBarType.error}
            styles={{ root: styles.messageBar }}
          >
            <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
              <Warning24Regular style={{ color: '#d13438' }} />
              <div>
                <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>
                  Erreur de connexion
                </Text>
                <Text styles={{ root: { fontSize: '13px', marginTop: '2px' } }}>
                  {syncStatus.error}
                </Text>
              </div>
            </Stack>
          </MessageBar>
        )}
      </Stack>
    </div>
  );
};

export default EmailSync;
