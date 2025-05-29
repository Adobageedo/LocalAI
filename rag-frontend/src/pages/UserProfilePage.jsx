import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, Avatar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Only allow editing display name (not email)
  const handleChange = (e) => {
    setDisplayName(e.target.value);
  };

  // Simulate saving display name (real update would use Firebase updateProfile)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!displayName) {
      setErrorMessage('Le nom affiché est obligatoire');
      setSuccessMessage('');
      return;
    }
    setSuccessMessage('Nom affiché mis à jour localement (non persistant)');
    setErrorMessage('');
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <Typography variant="h5">Vous devez être connecté pour accéder à votre profil.</Typography>
          <Button variant="contained" color="primary" sx={{ mt: 3 }} onClick={() => navigate('/login')}>
            Se connecter
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Mon Profil
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
          >
            Déconnexion
          </Button>
        </Box>
        
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
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            src={user?.photoURL || undefined}
            sx={{ 
              width: 100, 
              height: 100, 
              bgcolor: 'primary.main',
              fontSize: '2rem',
              mr: 3
            }}
          >
            {user?.displayName ? user.displayName[0] : (user?.email ? user.email[0] : '?')}
          </Avatar>
          <Box>
            <Typography variant="h6" gutterBottom>
              {user?.displayName || '(Nom affiché non défini)'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user?.email || '(Email inconnu)'}
            </Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Nom affiché"
            name="displayName"
            value={displayName}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={user?.email || ''}
            disabled
            sx={{ mb: 3 }}
            helperText="L'adresse email ne peut pas être modifiée"
          />
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Options de compte</Typography>
            <Typography variant="body2" color="text.secondary">
              Pour changer votre mot de passe ou d'autres informations, utilisez les options de votre compte Google/Firebase.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
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

export default UserProfilePage;
