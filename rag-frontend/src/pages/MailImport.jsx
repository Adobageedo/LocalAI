import React, { useState, useEffect } from "react";
import { ImapConnect, GmailConnect, OutlookConnect } from "../components/email";
import { Layout } from "../components/layout";
import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from "../config";

// Material UI imports
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  Divider,
  IconButton,
  Collapse,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Fade,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  AlertTitle,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EmailIcon from '@mui/icons-material/Email';
import SettingsIcon from '@mui/icons-material/Settings';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import GmailIcon from '@mui/icons-material/MarkEmailRead';
import OutlookIcon from '@mui/icons-material/MarkEmailUnread';
import AttachmentIcon from '@mui/icons-material/Attachment';

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
            {providerType === 'gmail' ? (
              <GmailIcon color="error" sx={{ mr: 1.5 }} />
            ) : providerType === 'outlook' ? (
              <OutlookIcon color="primary" sx={{ mr: 1.5 }} />
            ) : (
              <AlternateEmailIcon color="action" sx={{ mr: 1.5 }} />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
              {email.sender || 'Sans adresse'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {new Date(email.date).toLocaleString()}
          </Typography>
        </Box>
        
        <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem' }}>
          {email.subject || '(Sans objet)'}
        </Typography>
        
        <Collapse in={expanded} collapsedSize={80}>
          <Typography variant="body2" color="text.secondary" sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            mb: 1,
            whiteSpace: expanded ? 'normal' : 'nowrap'
          }}>
            {email.content || '(Pas de contenu)'}
          </Typography>
        </Collapse>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, alignItems: 'center' }}>
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
function ProviderCard({ name, image, selected, onClick }) {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
        boxShadow: selected ? '0 8px 16px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.05)',
        border: selected ? `2px solid ${theme.palette.primary.main}` : 'none',
        borderRadius: '12px',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
          transform: 'translateY(-4px)'
        }
      }}
      onClick={onClick}
    >
      <CardMedia
        component="img"
        height="72"
        image={image}
        alt={`${name} logo`}
        sx={{ 
          objectFit: 'contain',
          p: 1.5,
          backgroundColor: '#f8f9fa',
          maxWidth: 80,
          mx: 'auto',
        }}
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div" align="center">
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function MailImport() {
  const [mode, setMode] = useState("gmail");
  const [tabValue, setTabValue] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
  
  // Recent emails data
  const [recentEmails, setRecentEmails] = useState({
    gmail: [],
    outlook: [],
    loading: false,
    error: null
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  const providers = [
    { id: "gmail", name: "Gmail", status: gmailStatus },
    { id: "outlook", name: "Outlook", status: outlookStatus }
  ];

  // Check Gmail authentication status
  useEffect(() => {
    const checkGmailAuth = async () => {
      try {
        setGmailStatus(prev => ({ ...prev, loading: true }));
        const response = await authFetch(`${API_BASE_URL}/sources/gmail/auth_status`);
        const data = await response.json();
        setGmailStatus({
          loading: false,
          authenticated: data.authenticated || false,
          error: null
        });
        
        // If authenticated, fetch recent emails
        if (data.authenticated) {
          fetchRecentEmails('gmail');
        }
      } catch (error) {
        console.error('Error checking Gmail auth:', error);
        setGmailStatus({
          loading: false,
          authenticated: false,
          error: 'Failed to check Gmail authentication status'
        });
      }
    };
    
    checkGmailAuth();
  }, []);
  
  // Check Outlook authentication status
  useEffect(() => {
    const checkOutlookAuth = async () => {
      try {
        setOutlookStatus(prev => ({ ...prev, loading: true }));
        const response = await authFetch(`${API_BASE_URL}/sources/outlook/auth_status`);
        const data = await response.json();
        setOutlookStatus({
          loading: false,
          authenticated: data.authenticated || false,
          error: null
        });
        
        // If authenticated, fetch recent emails
        if (data.authenticated) {
          fetchRecentEmails('outlook');
        }
      } catch (error) {
        console.error('Error checking Outlook auth:', error);
        setOutlookStatus({
          loading: false,
          authenticated: false,
          error: 'Failed to check Outlook authentication status'
        });
      }
    };
    
    checkOutlookAuth();
  }, []);
  
  // Fetch recent emails from Qdrant
  const fetchRecentEmails = async (provider) => {
    try {
      setRecentEmails(prev => ({ ...prev, loading: true }));
      const response = await authFetch(`${API_BASE_URL}/sources/${provider}/recent_emails?limit=10`);
      const data = await response.json();
      
      setRecentEmails(prev => ({
        ...prev,
        [provider]: data.emails || [],
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error(`Error fetching recent ${provider} emails:`, error);
      setRecentEmails(prev => ({
        ...prev,
        loading: false,
        error: `Failed to fetch recent ${provider} emails`
      }));
    }
  };
  
  // Trigger a new email ingestion
  const handleEmailSync = async (provider, options = {}) => {
    const defaultOptions = {
      limit: 50,
      ...options
    };
    
    try {
      const response = await authFetch(`${API_BASE_URL}/sources/ingest/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultOptions),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to trigger ${provider} sync`);
      }
      
      // Refetch emails after a short delay to allow for processing
      setTimeout(() => fetchRecentEmails(provider), 3000);
      
      return { success: true };
    } catch (error) {
      console.error(`Error syncing ${provider} emails:`, error);
      return { success: false, error: error.message };
    }
  };
  
  // Render connection status for a provider
  const renderProviderStatus = (provider) => {
    const status = provider === 'gmail' ? gmailStatus : outlookStatus;
    
    if (status.loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
          <CircularProgress size={20} thickness={4} sx={{ mr: 2 }} />
          <Typography>Vérification de la connexion...</Typography>
        </Box>
      );
    }
    
    if (status.authenticated) {
      return (
        <Alert severity="success" sx={{ mt: 2 }}>
          <AlertTitle>Connecté à {provider === 'gmail' ? 'Gmail' : 'Outlook'}</AlertTitle>
          Vous pouvez synchroniser vos emails ou consulter les emails déjà synchronisés.
        </Alert>
      );
    }
    
    return null;
  };

  // Render the recent emails section
  const renderRecentEmails = (provider) => {
    const providerEmails = recentEmails[provider] || [];
    
    if (recentEmails.loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (recentEmails.error) {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          Erreur lors de la récupération des emails: {recentEmails.error}
        </Alert>
      );
    }
    
    if (providerEmails.length === 0) {
      return (
        <Alert severity="info" sx={{ my: 2 }}>
          Aucun email n'a encore été synchronisé avec {provider === 'gmail' ? 'Gmail' : 'Outlook'}.
        </Alert>
      );
    }
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Derniers emails synchronisés</Typography>
        <List sx={{ p: 0 }}>
          {providerEmails.map((email, index) => (
            <EmailCard key={index} email={email} providerType={provider} />
          ))}
        </List>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => handleEmailSync(provider)}
            startIcon={<EmailIcon />}
          >
            Synchroniser plus d'emails
          </Button>
        </Box>
      </Box>
    );
  };
  
  // Determine if we should show connection form or recent emails
  const renderProviderContent = (provider) => {
    const status = provider === 'gmail' ? gmailStatus : outlookStatus;
    
    if (status.loading) {
      return renderProviderStatus(provider);
    }
    
    if (status.authenticated) {
      return (
        <>
          {renderProviderStatus(provider)}
          {renderRecentEmails(provider)}
        </>
      );
    }
    
    // Show connection form if not authenticated
    return (
      <Box sx={{ mt: 3 }}>
        {provider === 'gmail' && <GmailConnect />}
        {provider === 'outlook' && <OutlookConnect />}
      </Box>
    );
  };

  return (
    <Layout>
      <Box 
        sx={{ 
          maxWidth: 900, 
          mx: 'auto', 
          mt: 4, 
          px: 2,
        }}
      >
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
              p: 4, 
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: theme.palette.mode === 'light' ? '#f8f9fa' : theme.palette.background.default
            }}
          >
            <EmailIcon 
              fontSize="large" 
              color="primary" 
              sx={{ mr: 2 }}
            />
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 500, 
                color: theme.palette.mode === 'light' ? '#1d1d1f' : theme.palette.text.primary,
                letterSpacing: '-0.5px'
              }}
            >
              Importation d'Emails
            </Typography>
          </Box>
          
          <Divider />
          
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
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
              <Tab label="Services Populaires" />
              <Tab label="Configuration Avancée" />
            </Tabs>
          </Box>
          
          {/* Popular Services Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1, color: theme.palette.mode === 'light' ? '#1d1d1f' : theme.palette.text.primary, fontWeight: 500 }}>
                Sélectionnez un service d'email
              </Typography>
              <Typography variant="body2" sx={{ color: '#6e6e73', mb: 3 }}>
                Choisissez votre fournisseur d'email pour importer les messages dans votre base de connaissances
              </Typography>
              
              <Grid container spacing={3}>
                {providers.map((provider) => (
                  <Grid item xs={12} sm={6} key={provider.id}>
                    <ProviderCard
                      name={provider.name}
                      image={PROVIDER_IMAGES[provider.id]}
                      selected={mode === provider.id}
                      onClick={() => setMode(provider.id)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            <Fade in={Boolean(mode)} timeout={500}>
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 4 }} />
                {renderProviderContent(mode)}
              </Box>
            </Fade>
          </TabPanel>
          
          {/* Advanced Settings Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1, color: theme.palette.mode === 'light' ? '#1d1d1f' : theme.palette.text.primary, fontWeight: 500 }}>
                Configuration IMAP
              </Typography>
              <Typography variant="body2" sx={{ color: '#6e6e73', mb: 3 }}>
                Connectez-vous à n'importe quel service d'email via le protocole IMAP
              </Typography>
              
              <ImapConnect />
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Layout>
  );
}
