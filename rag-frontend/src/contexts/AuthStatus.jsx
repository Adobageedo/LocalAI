import React from 'react';
import { useAuth } from './AuthContext';
import { Box, Typography, Button, CircularProgress, Chip, Stack, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import LogoutIcon from '@mui/icons-material/Logout';

/**
 * AuthStatus - Component to display authentication status and controls for providers
 * Shows connection status for all configured providers, with options to authenticate/revoke
 */
const AuthStatus = ({ showTitle = true, providersToShow = ['gmail', 'gdrive', 'outlook'] }) => {
  const { 
    authStatusByProvider, 
    isLoading, 
    isAuthenticated, 
    refreshAuthStatus,
    authenticateWithPopup, 
    revoke 
  } = useAuth();

  // Handle connect button click
  const handleConnect = async (provider) => {
    try {
      await authenticateWithPopup(provider);
    } catch (error) {
      console.error(`Failed to connect to ${provider}:`, error);
    }
  };

  // Handle disconnect button click
  const handleDisconnect = async (provider) => {
    try {
      await revoke(provider);
    } catch (error) {
      console.error(`Failed to disconnect from ${provider}:`, error);
    }
  };

  // Handle refresh status
  const handleRefreshStatus = async (provider) => {
    try {
      await refreshAuthStatus(provider);
    } catch (error) {
      console.error(`Failed to refresh status for ${provider}:`, error);
    }
  };

  // Helper function to get provider display name
  const getProviderDisplayName = (provider) => {
    const names = {
      'gmail': 'Gmail',
      'gdrive': 'Google Drive',
      'outlook': 'Microsoft Outlook',
      'onedrive': 'OneDrive'
    };
    return names[provider] || provider;
  };

  return (
    <Box sx={{ p: 2 }}>
      {showTitle && (
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SecurityIcon sx={{ mr: 1 }} />
          Provider Authentication Status
        </Typography>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Checking authentication status...
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {providersToShow.map((provider) => {
            const status = authStatusByProvider[provider];
            const isConnected = isAuthenticated(provider);

            return (
              <Box 
                key={provider} 
                sx={{ 
                  p: 2, 
                  border: 1, 
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: isConnected ? 'success.lighter' : 'background.paper' 
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1">
                    {getProviderDisplayName(provider)}
                  </Typography>
                  <Chip 
                    icon={isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
                    label={isConnected ? "Connected" : "Not Connected"}
                    color={isConnected ? "success" : "default"}
                    size="small"
                  />
                </Box>
                
                {status?.error && (
                  <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
                    {status.error}
                  </Alert>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {isConnected ? (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<LogoutIcon />}
                      onClick={() => handleDisconnect(provider)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleConnect(provider)}
                    >
                      Connect
                    </Button>
                  )}
                  
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SyncIcon />}
                    onClick={() => handleRefreshStatus(provider)}
                  >
                    Refresh Status
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default AuthStatus;
