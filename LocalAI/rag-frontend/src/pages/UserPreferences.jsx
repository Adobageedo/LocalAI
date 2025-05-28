import React, { useState } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, Switch, FormControlLabel, Divider, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

// Préférences simulées de l'utilisateur
const initialPreferences = {
  language: 'fr',
  darkMode: false,
  emailNotifications: true,
  // Paramètres du serveur de mail
  mailServer: 'mail.newsflix.fr',
  mailUsername: 'noreply@newsflix.fr',
  mailPassword: 'enzo789luigi',
  mailImapPort: '993',
  mailSmtpPort: '465',
  mailSecurity: 'ssl'
};

const UserPreferences = () => {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Gestion des modifications de formulaire
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };
  
  // Simuler la sauvegarde des préférences
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simulation de sauvegarde réussie
    setSuccessMessage('Préférences mises à jour avec succès');
    setErrorMessage('');
    
    // Réinitialiser les messages après 3 secondes
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };
  
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Préférences
        </Typography>
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          {/* Préférences d'interface */}
          <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
            Interface
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="language-label">Langue</InputLabel>
              <Select
                labelId="language-label"
                id="language"
                name="language"
                value={preferences.language}
                label="Langue"
                onChange={handleChange}
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
          
          <Divider sx={{ my: 3 }} />
          
          {/* Paramètres du serveur de mail */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Configuration du serveur de messagerie
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="Serveur de messagerie"
              name="mailServer"
              value={preferences.mailServer}
              onChange={handleChange}
            />
            
            <TextField
              fullWidth
              label="Nom d'utilisateur"
              name="mailUsername"
              value={preferences.mailUsername}
              onChange={handleChange}
            />
            
            <TextField
              fullWidth
              label="Mot de passe"
              name="mailPassword"
              value={preferences.mailPassword}
              onChange={handleChange}
              type="password"
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Port IMAP"
                name="mailImapPort"
                value={preferences.mailImapPort}
                onChange={handleChange}
              />
              
              <TextField
                fullWidth
                label="Port SMTP"
                name="mailSmtpPort"
                value={preferences.mailSmtpPort}
                onChange={handleChange}
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
                >
                  <MenuItem value="ssl">SSL</MenuItem>
                  <MenuItem value="tls">TLS</MenuItem>
                  <MenuItem value="none">Aucune</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ minWidth: 120 }}
            >
              Enregistrer
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserPreferences;
