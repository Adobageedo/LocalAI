import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Box, TextField, Button, Switch,
  FormControlLabel, Divider, Alert, Select, MenuItem, FormControl,
  InputLabel, Card, CardContent, Backdrop, CircularProgress, IconButton, alpha
} from '@mui/material';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import { API_BASE_URL } from '../config';
import { authFetch } from '../firebase/authFetch';

// Préférences par défaut
const defaultPreferences = {
  language: 'fr',
  darkMode: false,
  emailNotifications: false,
  // Paramètres du serveur de mail
  mailServer: '',
  mailUsername: '',
  mailPassword: '',
  mailImapPort: '993',
  mailSmtpPort: '465',
  mailSecurity: 'ssl'
};

const UserPreferences = () => {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate ? useNavigate() : () => {};
  
  // Load user preferences from backend on component mount
  useEffect(() => {
    if (user?.uid) {
      loadUserPreferences();
    }
  }, [user]);
  
  // Load preferences from the backend
  const loadUserPreferences = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/users/${user.uid}/preferences`);
      if (response.ok) {
        const data = await response.json();
        // Merge with default preferences to ensure all fields exist
        setPreferences(prev => ({
          ...defaultPreferences,
          ...data
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Silently fail - just use defaults
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };
  
  // Save preferences to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Save to backend
      const response = await authFetch(`${API_BASE_URL}/users/${user.uid}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        setSuccessMessage('Préférences mises à jour avec succès');
        setErrorMessage('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la mise à jour des préférences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setErrorMessage(error.message || 'Erreur lors de la mise à jour des préférences');
      setSuccessMessage('');
    } finally {
      setLoading(false);
      
      // Clear success message after 3 seconds
      if (successMessage) {
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      setErrorMessage('Échec de la déconnexion');
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <Typography variant="h5">Vous devez être connecté pour accéder à vos préférences.</Typography>
          <Button variant="contained" color="primary" sx={{ mt: 3 }} onClick={() => navigate('/login')}>
            Se connecter
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Layout>
      <Backdrop 
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} 
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      
      <Container maxWidth="md" sx={{ my: 4 }}>
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              '& .MuiAlert-message': { fontWeight: 500 }
            }}
          >
            {successMessage}
          </Alert>
        )}
        
        {errorMessage && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              '& .MuiAlert-message': { fontWeight: 500 }
            }}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Header Card */}
        <Card 
          sx={{ 
            borderRadius: 3, 
            mb: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            overflow: 'visible'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SettingsIcon color="primary" fontSize="large" />
                <Typography variant="h4" component="h1" sx={{ fontWeight: 500 }}>
                  Préférences
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate('/profile')}
              >
                Retour au profil
              </Button>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {user?.email}
            </Typography>
          </CardContent>
        </Card>
        
        <Box component="form" onSubmit={handleSubmit}>
          {/* Interface Preferences Card */}
          <Card sx={{ borderRadius: 3, mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon fontSize="small" />
                Interface
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pl: 1 }}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                  <InputLabel id="language-label">Langue</InputLabel>
                  <Select
                    labelId="language-label"
                    id="language"
                    name="language"
                    value={preferences.language}
                    label="Langue"
                    onChange={handleChange}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={preferences.darkMode} 
                      onChange={handleChange}
                      name="darkMode"
                      color="primary"
                    />
                  }
                  label="Mode sombre"
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={preferences.emailNotifications} 
                      onChange={handleChange}
                      name="emailNotifications"
                      color="primary"
                    />
                  }
                  label="Notifications par email"
                />
              </Box>
            </CardContent>
          </Card>
          
          {/* Email Configuration Card */}
          <Card 
            sx={{ 
              borderRadius: 3, 
              mb: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              bgcolor: theme => preferences.emailNotifications ? '#ffffff' : alpha(theme.palette.background.paper, 0.5)
            }}
          >
            <CardContent>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 500, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: preferences.emailNotifications ? 'text.primary' : 'text.disabled'
                }}
              >
                Configuration du serveur de messagerie
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 3, 
                  pl: 1, 
                  opacity: preferences.emailNotifications ? 1 : 0.5
                }}
              >
                <TextField
                  fullWidth
                  label="Serveur de messagerie"
                  name="mailServer"
                  value={preferences.mailServer}
                  onChange={handleChange}
                  disabled={!preferences.emailNotifications}
                  placeholder="mail.example.com"
                  sx={{ borderRadius: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Nom d'utilisateur"
                  name="mailUsername"
                  value={preferences.mailUsername}
                  onChange={handleChange}
                  disabled={!preferences.emailNotifications}
                  placeholder="utilisateur@example.com"
                />
                
                <TextField
                  fullWidth
                  label="Mot de passe"
                  name="mailPassword"
                  value={preferences.mailPassword}
                  onChange={handleChange}
                  type="password"
                  disabled={!preferences.emailNotifications}
                  placeholder="••••••••"
                />
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Port IMAP"
                    name="mailImapPort"
                    value={preferences.mailImapPort}
                    onChange={handleChange}
                    disabled={!preferences.emailNotifications}
                  />
                  
                  <TextField
                    fullWidth
                    label="Port SMTP"
                    name="mailSmtpPort"
                    value={preferences.mailSmtpPort}
                    onChange={handleChange}
                    disabled={!preferences.emailNotifications}
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel id="security-label">Sécurité</InputLabel>
                    <Select
                      labelId="security-label"
                      id="mailSecurity"
                      name="mailSecurity"
                      value={preferences.mailSecurity}
                      label="Sécurité"
                      onChange={handleChange}
                      disabled={!preferences.emailNotifications}
                    >
                      <MenuItem value="ssl">SSL</MenuItem>
                      <MenuItem value="tls">TLS</MenuItem>
                      <MenuItem value="none">Aucune</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                {preferences.emailNotifications && preferences.mailServer && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    Note: Les informations de connexion IMAP sont utilisées pour la récupération automatique des emails.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              sx={{ px: 4, py: 1, borderRadius: 28, textTransform: 'none' }}
            >
              Enregistrer les préférences
            </Button>
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default UserPreferences;
