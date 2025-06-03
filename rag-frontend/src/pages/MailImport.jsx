import React, { useState } from "react";
import { ImapConnect, GmailConnect, OutlookConnect } from "../components/email";
import { Layout } from "../components/layout";

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
  useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EmailIcon from '@mui/icons-material/Email';
import SettingsIcon from '@mui/icons-material/Settings';

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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  const providers = [
    { id: "gmail", name: "Gmail" },
    { id: "outlook", name: "Outlook" }
  ];

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
              backgroundColor: '#f8f9fa'
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
                color: '#1d1d1f',
                letterSpacing: '-0.5px'
              }}
            >
              Connect Your Email
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
              <Tab label="Popular Services" />
              <Tab label="Advanced Settings" />
            </Tabs>
          </Box>
          
          {/* Popular Services Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#1d1d1f', fontWeight: 500 }}>
                Select an Email Provider
              </Typography>
              <Typography variant="body2" sx={{ color: '#6e6e73', mb: 3 }}>
                Choose your email provider to import messages into your knowledge base
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
                {mode === "gmail" && <GmailConnect />}
                {mode === "outlook" && <OutlookConnect />}
              </Box>
            </Fade>
          </TabPanel>
          
          {/* Advanced Settings Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#1d1d1f', fontWeight: 500 }}>
                IMAP Configuration
              </Typography>
              <Typography variant="body2" sx={{ color: '#6e6e73', mb: 3 }}>
                Connect to any email service using IMAP protocol
              </Typography>
              
              <ImapConnect />
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Layout>
  );
}
