import React, { useState } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, Avatar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const UserProfilePage = () => {
  const navigate = useNavigate();
  
  // Utiliser des valeurs par défaut puisqu'il n'y a plus d'authentification
  const [user, setUser] = useState({
    email: 'utilisateur@exemple.com',
    firstName: 'Utilisateur',
    lastName: 'Démo',
    avatar: null,
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Gestion des modifications de formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
  };
  
  // Sauvegarder le profil
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation simple
    if (!user.firstName || !user.lastName) {
      setErrorMessage('Les champs prénom et nom sont obligatoires');
      setSuccessMessage('');
      return;
    }
    
    // Note: Pour vraiment mettre à jour le profil, il faudrait appeler l'API Keycloak
    // via une API backend. Pour l'instant, on simule juste une mise à jour réussie.
    setSuccessMessage('Profil mis à jour avec succès');
    setErrorMessage('');
    
    // Réinitialiser les messages après 3 secondes
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };
  
  // Rediriger vers la page d'accueil (plus de déconnexion car plus d'authentification)
  const handleLogout = () => {
    navigate('/');
  };
  
  // Générer les initiales pour l'avatar
  const getInitials = () => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };
  
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
            sx={{ 
              width: 100, 
              height: 100, 
              bgcolor: 'primary.main',
              fontSize: '2rem',
              mr: 3
            }}
          >
            {getInitials()}
          </Avatar>
          
          <Box>
            <Typography variant="h6" gutterBottom>
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
        
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="Prénom"
              name="firstName"
              value={user.firstName}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              label="Nom"
              name="lastName"
              value={user.lastName}
              onChange={handleChange}
              required
            />
          </Box>
          
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={user.email}
            onChange={handleChange}
            type="email"
            disabled
            sx={{ mb: 3 }}
            helperText="L'adresse email ne peut pas être modifiée"
          />
          
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Options de compte</Typography>
            <Typography variant="body2" color="text.secondary">
              Cette application fonctionne sans système d'authentification.
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
