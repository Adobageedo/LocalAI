import React, { useState, useEffect } from "react";
import { Layout } from "../components/layout";
import authProviders from "../lib/authProviders";

// Material UI imports

// Material UI imports
import { 
  Box, 
  Typography, 
  Paper, 
  Divider,
  Button,
  Card,
  CardContent,
  Grid,
  useTheme,
  CircularProgress,
  Alert,
  AlertTitle,
  Chip,
  Tab,
  Tabs
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmailIcon from '@mui/icons-material/Email';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AttachmentIcon from '@mui/icons-material/Attachment';
import GmailIcon from '@mui/icons-material/MarkEmailRead';
import MicrosoftIcon from '@mui/icons-material/Microsoft';

// Provider logos
const PROVIDER_IMAGES = {
  gmail: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png",
  outlook: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/826px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png"
};

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mail-tabpanel-${index}`}
      aria-labelledby={`mail-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Email card component to display recent emails
function EmailCard({ email, providerType }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  // Map classification action to a color and icon
  const getClassificationChip = () => {
    const action = email.is_classified || 'not classified';
    
    // Define color and label based on action
    let chipProps = {
      label: 'Non classifié',
      color: 'default',
    };
    
    switch(action) {
      case 'reply':
        chipProps = { label: 'Répondre', color: 'primary' };
        break;
      case 'forward':
        chipProps = { label: 'Transférer', color: 'secondary' };
        break;
      case 'new_email':
        chipProps = { label: 'Nouvel email', color: 'info' };
        break;
      case 'no_action':
        chipProps = { label: 'Aucune action', color: 'success' };
        break;
      case 'flag_important':
        chipProps = { label: 'Important', color: 'warning' };
        break;
      case 'archive':
        chipProps = { label: 'Archiver', color: 'default' };
        break;
      case 'delete':
        chipProps = { label: 'Supprimer', color: 'error' };
        break;
      default:
        // Keep default values for 'not classified'
        break;
    }
    
    return (
      <Chip 
        size="small"
        variant="outlined"
        {...chipProps}
        sx={{ ml: 1 }}
      />
    );
  };
  
  return (
    <Card sx={{ 
      mb: 2, 
      borderRadius: 2, 
      boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      border: `1px solid ${theme.palette.divider}`,
      overflow: 'hidden'
    }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {providerType === 'google' ? (
              <GmailIcon color="error" sx={{ mr: 1.5 }} />
            ) : providerType === 'microsoft' ? (
              <MicrosoftIcon color="primary" sx={{ mr: 1.5 }} />
            ) : (
              <EmailIcon color="action" sx={{ mr: 1.5 }} />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
              {email.sender || 'Sans adresse'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {new Date(email.date).toLocaleString()}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
            {email.subject || '(Sans objet)'}
          </Typography>
          {getClassificationChip()}
        </Box>
        
        <Box sx={{ maxHeight: expanded ? 'none' : '80px', overflow: 'hidden', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {email.content || '(Pas de contenu)'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            size="small" 
            variant="text" 
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            {expanded ? 'Montrer moins' : 'Montrer plus'}
          </Button>
          
          {email.has_attachments && (
            <Chip 
              icon={<AttachmentIcon fontSize="small" />}
              label="Pièces jointes"
              size="small"
              color="default"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Provider card component
function ProviderCard({ provider, isConnected, onConnect, onRefresh }) {
  const theme = useTheme();
  const isGoogle = provider === 'google';
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        height: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {isGoogle ? (
          <GmailIcon fontSize="large" color="error" sx={{ mr: 2 }} />
        ) : (
          <MicrosoftIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
        )}
        <Typography variant="h6">
          {isGoogle ? 'Gmail' : 'Outlook'}
        </Typography>
      </Box>
      
      {isConnected ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          fullWidth
        >
          Actualiser l'ingestion
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={onConnect}
          fullWidth
        >
          Connecter
        </Button>
      )}
    </Paper>
  );
}

export default function MailImport() {
  const theme = useTheme();
  
  // Authentication status for email providers
  const [gmailStatus, setGmailStatus] = useState({
    loading: true,
    authenticated: false,
    error: null
  });
  
  const [outlookStatus, setOutlookStatus] = useState({
    loading: true,
    authenticated: false,
    error: null
  });
  
  // State for loading and error handling
  const [loading, setLoading] = useState({
    google: false,
    microsoft: false,
    googleEmails: false,
    microsoftEmails: false
  });
  
  // Error state for both providers
  const [error, setError] = useState({
    google: null,
    microsoft: null
  });
  
  // Authentication states for both providers
  const [authStatus, setAuthStatus] = useState({
    google: false,
    microsoft: false
  });
  
  // Recent emails for both providers
  const [recentEmails, setRecentEmails] = useState({
    google: [],
    microsoft: []
  });
  
  // Selected tab state (0 = Gmail, 1 = Outlook)
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Ingestion status
  const [ingestionStatus, setIngestionStatus] = useState({
    google: false,
    microsoft: false
  });

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
  
  // Check authentication status for both providers
  const checkAuthStatus = async () => {
    // Check Google authentication
    try {
      setLoading(prev => ({ ...prev, google: true }));
      const googleStatus = await authProviders.checkAuthStatus('google');
      setAuthStatus(prev => ({ ...prev, google: googleStatus.authenticated }));
      setError(prev => ({ ...prev, google: null }));
    } catch (err) {
      console.error('Error checking Google auth status:', err);
      setError(prev => ({ ...prev, google: 'Erreur de vérification du statut d\'authentification Google' }));
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
    
    // Check Microsoft authentication
    try {
      setLoading(prev => ({ ...prev, microsoft: true }));
      const microsoftStatus = await authProviders.checkAuthStatus('microsoft');
      setAuthStatus(prev => ({ ...prev, microsoft: microsoftStatus.authenticated }));
      setError(prev => ({ ...prev, microsoft: null }));
    } catch (err) {
      console.error('Error checking Microsoft auth status:', err);
      setError(prev => ({ ...prev, microsoft: 'Erreur de vérification du statut d\'authentification Microsoft' }));
    } finally {
      setLoading(prev => ({ ...prev, microsoft: false }));
    }
  };
  
  // Handle provider authentication
  const handleConnect = async (provider) => {
    try {
      setLoading(prev => ({ ...prev, [provider]: true }));
      await authProviders.authenticateWithPopup(provider);
      // After successful authentication, check status again
      await checkAuthStatus();
      // Also fetch recent emails if authentication was successful
      if (authStatus[provider]) {
        fetchRecentEmails(provider);
      }
    } catch (err) {
      console.error(`Error connecting to ${provider}:`, err);
      setError(prev => ({ ...prev, [provider]: `Erreur de connexion à ${provider === 'google' ? 'Gmail' : 'Outlook'}` }));
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  };
  
  // Fetch recent emails from authenticated provider
  const fetchRecentEmails = async (provider) => {
    try {
      setLoading(prev => ({ ...prev, [`${provider}Emails`]: true }));
      const response = await authProviders.getRecentEmails(provider);
      
      // Handle different response structures
      let emailArray = [];
      
      if (response) {
        // If response is an array, use it directly
        if (Array.isArray(response)) {
          emailArray = response;
        }
        // If response has an 'emails' or 'items' property that's an array
        else if (Array.isArray(response.emails)) {
          emailArray = response.emails;
        }
        else if (Array.isArray(response.items)) {
          emailArray = response.items;
        }
        // If response is an object with data
        else if (typeof response === 'object') {
          console.log('Email response structure:', response);
          // Try to find array data in response
          const possibleArrays = Object.values(response).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            emailArray = possibleArrays[0];
          }
        }
      }
      
      setRecentEmails(prev => ({ ...prev, [provider]: emailArray }));
    } catch (err) {
      console.error(`Error fetching recent ${provider} emails:`, err);
      setRecentEmails(prev => ({ ...prev, [provider]: [] })); // Ensure empty array on error
    } finally {
      setLoading(prev => ({ ...prev, [`${provider}Emails`]: false }));
    }
  };
  
  // Trigger ingestion for a provider
  const handleIngestion = async (provider) => {
    try {
      setIngestionStatus(prev => ({ ...prev, [provider]: true }));
      await authProviders.startIngestion(provider);
      // After ingestion, refresh the email list
      await fetchRecentEmails(provider);
    } catch (err) {
      console.error(`Error starting ${provider} ingestion:`, err);
    } finally {
      setIngestionStatus(prev => ({ ...prev, [provider]: false }));
    }
  };

  const providers = [
    { id: "gmail", name: "Gmail", status: gmailStatus },
    { id: "outlook", name: "Outlook", status: outlookStatus }
  ];

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  // Keep gmailStatus and outlookStatus in sync with unified authStatus
  useEffect(() => {
    setGmailStatus(prev => ({
      ...prev,
      loading: loading.google,
      authenticated: authStatus.google,
      error: error.google
    }));
    
    setOutlookStatus(prev => ({
      ...prev,
      loading: loading.microsoft,
      authenticated: authStatus.microsoft,
      error: error.microsoft
    }));
  }, [loading, authStatus, error]);
  
  // Fetch emails when authentication status changes
  useEffect(() => {
    if (authStatus.google || gmailStatus.authenticated) {
      fetchRecentEmails('google');
    }
    
    if (authStatus.microsoft || outlookStatus.authenticated) {
      fetchRecentEmails('microsoft');
    }
  }, [authStatus.google, authStatus.microsoft, gmailStatus.authenticated, outlookStatus.authenticated]);
  
  // Watch for tab changes to load emails for the selected provider
  useEffect(() => {
    const currentProvider = selectedTab === 0 ? 'google' : 'microsoft';
    if (authStatus[currentProvider]) {
      fetchRecentEmails(currentProvider);
    }
  }, [selectedTab, authStatus]);

  // Trigger a new email ingestion
  // const handleEmailSync = async (provider, options = {}) => {
  //   const defaultOptions = {
  //     limit: 50,
  //     ...options
  //   };
    
  //   try {
  //     const response = await authFetch(`${API_BASE_URL}/sources/ingest/${provider}`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(defaultOptions),
  //     });
      
  //     if (!response.ok) {
  //       throw new Error(`Failed to trigger ${provider} sync`);
  //     }
      
  //     // Refetch emails after a short delay to allow for processing
  
  // Get the current provider based on selected tab
  const getCurrentProvider = () => {
    return selectedTab === 0 ? 'google' : 'microsoft';
  };
  
  // Render connection status for a provider
  const renderProviderStatus = (provider) => {
    // Get status based on provider name
    const status = provider === 'google' ? gmailStatus : outlookStatus;
    const isLoading = status.loading || loading[provider];
    const hasError = status.error || error[provider];
    const errorMessage = status.error || error[provider];
    
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
          <CircularProgress size={20} sx={{ mr: 2 }} /> 
          <Typography>Vérification du statut de connexion...</Typography>
        </Box>
      );
    }
    
    if (hasError) {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          <AlertTitle>Erreur de connexion</AlertTitle>
          {errorMessage}
        </Alert>
      );
    }
    
    if (status.authenticated) {
      return (
        <Alert severity="success" sx={{ my: 2 }}>
          <AlertTitle>Connecté à {provider === 'google' ? 'Gmail' : 'Outlook'}</AlertTitle>
          Vous pouvez synchroniser vos emails ou consulter les emails déjà synchronisés.
        </Alert>
      );
    }
    
    return null;
  };

  // Render the recent emails section
  const renderRecentEmails = (provider) => {
    if (loading[`${provider}Emails`]) {
      return (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      );
    }
    
    // Ensure emails is always an array
    const emails = Array.isArray(recentEmails[provider]) ? recentEmails[provider] : [];
    
    if (emails.length === 0) {
      return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#6e6e73' }}>
            Aucun email n'a encore été importé.
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => handleIngestion(provider)}
            disabled={ingestionStatus[provider]}
            sx={{ mt: 2 }}
          >
            {ingestionStatus[provider] ? 'Ingestion en cours...' : 'Importer mes emails'}
          </Button>
        </Box>
      );
    }
    
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Emails récemment importés
          </Typography>
          
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => handleIngestion(provider)}
            disabled={ingestionStatus[provider]}
            size="small"
          >
            {ingestionStatus[provider] ? 'Ingestion en cours...' : 'Actualiser'}
          </Button>
        </Box>
          
        {emails.map((email, index) => (
          <EmailCard key={index} email={email} providerType={provider} />
        ))}
      </>
    );
  };

  // Determine if we should show connection form or recent emails
  const renderProviderContent = (provider) => {
    // Always show status indicators (loading, error)
    const statusIndicator = renderProviderStatus(provider);
    
    // Check authentication using both old and new state management approaches
    const oldStatus = provider === 'google' ? gmailStatus : outlookStatus;
    const isAuthenticated = oldStatus.authenticated || authStatus[provider];
    
    // If authenticated, show recent emails section
    if (isAuthenticated) {
      return (
        <Box>
          {statusIndicator}
          {renderRecentEmails(provider)}
        </Box>
      );
    }
    
    // Otherwise show connection button
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        {statusIndicator}
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          Connectez votre compte {provider === 'google' ? 'Gmail' : 'Outlook'} pour importer vos emails
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          disabled={loading[provider] || oldStatus.loading}
          onClick={() => handleConnect(provider)}
          sx={{ px: 4, py: 1 }}
        >
          {loading[provider] || oldStatus.loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
              Connexion...
            </>
          ) : (
            `Connecter à ${provider === 'google' ? 'Gmail' : 'Outlook'}`
          )}
        </Button>
      </Box>
    );
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, px: 2 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: '16px', 
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}
        >
          {/* Header */}
          <Box 
            sx={{ 
              p: 3, 
              display: 'flex',
              alignItems: 'center',
              backgroundColor: theme.palette.mode === 'light' ? '#f8f9fa' : theme.palette.background.default
            }}
          >
            <EmailIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 500, 
                letterSpacing: '-0.5px'
              }}
            >
              Importation d'Emails
            </Typography>
          </Box>
          
          <Divider />
          
          {/* Email Provider Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={selectedTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  py: 2,
                  fontSize: '1rem',
                  textTransform: 'none',
                  fontWeight: 500
                }
              }}
            >
              <Tab icon={<GmailIcon sx={{ mr: 1 }} />} iconPosition="start" label="Gmail" />
              <Tab icon={<MicrosoftIcon sx={{ mr: 1 }} />} iconPosition="start" label="Outlook" />
            </Tabs>
          </Box>
          
          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {/* Gmail Tab */}
            <TabPanel value={selectedTab} index={0}>
              {renderProviderContent('google')}
            </TabPanel>
            
            {/* Outlook Tab */}
            <TabPanel value={selectedTab} index={1}>
              {renderProviderContent('microsoft')}
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}
