import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Box, TextField, Button, Avatar,
  Alert, Divider, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, IconButton, Card, CardContent, Switch, FormControlLabel, alpha,
  Chip, Backdrop, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import Layout from '../components/layout/Layout';
import { API_BASE_URL } from '../config';
import { authFetch } from '../firebase/authFetch';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import WarningIcon from '@mui/icons-material/Warning';
import gdriveService from '../lib/gdrive';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Check connection status on component load
  useEffect(() => {
    const checkConnections = async () => {
      // Check Google connection
      try {
        const googleStatus = await gdriveService.checkAuthStatus();
        setGoogleConnected(googleStatus.authenticated);
      } catch (error) {
        console.error('Error checking Google connection:', error);
      }
      
      // Check Microsoft connection (to be implemented with actual service)
      // For now just using a placeholder
      setMicrosoftConnected(false);
    };
    
    checkConnections();
  }, []);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') setName(value);
    if (name === 'phone') setPhone(value);
  };

  // Save user profile changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Le nom est obligatoire');
      return;
    }
    
    setLoading(true);
    try {
      // Update user in database
      const response = await authFetch(`${API_BASE_URL}/users/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone })
      });
      
      setSuccessMessage('Profil mis à jour avec succès');
      setErrorMessage('');
      setEditMode(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  // Connect to Google Drive
  const handleConnectGoogle = async () => {
    try {
      await gdriveService.authenticate();
      setGoogleConnected(true);
      setSuccessMessage('Connexion à Google établie avec succès');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Google connection error:', error);
      setErrorMessage('Échec de la connexion à Google');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };
  
  // Disconnect from Google Drive
  const handleDisconnectGoogle = async () => {
    try {
      await gdriveService.signOut();
      setGoogleConnected(false);
      setSuccessMessage('Déconnexion de Google réussie');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Google disconnection error:', error);
      setErrorMessage('Échec de la déconnexion de Google');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };
  
  // Connect to Microsoft (placeholder)
  const handleConnectMicrosoft = () => {
    // To be implemented with actual Microsoft service
    setErrorMessage('La connexion Microsoft n\'est pas encore implémentée');
    setTimeout(() => setErrorMessage(''), 3000);
  };
  
  // Disconnect from Microsoft (placeholder)
  const handleDisconnectMicrosoft = () => {
    // To be implemented with actual Microsoft service
    setMicrosoftConnected(false);
    setSuccessMessage('Déconnexion de Microsoft réussie');
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  
  // Delete user data but keep account
  const handleDeleteData = async () => {
    setLoading(true);
    try {
      // Call API to delete user data
      await authFetch(`${API_BASE_URL}/users/${user.uid}/data`, {
        method: 'DELETE'
      });
      
      setSuccessMessage('Toutes les données utilisateur ont été supprimées');
      setDeleteDataOpen(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting user data:', error);
      setErrorMessage('Échec de la suppression des données');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };
  
  // Delete entire user account
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Call API to delete user account
      await authFetch(`${API_BASE_URL}/users/${user.uid}`, {
        method: 'DELETE'
      });
      
      // Logout and redirect to home page
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setErrorMessage('Échec de la suppression du compte');
      setDeleteAccountOpen(false);
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
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
          <Typography variant="h5">Vous devez être connecté pour accéder à votre profil.</Typography>
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
      
      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 500 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            Supprimer votre compte
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Toutes vos données seront supprimées définitivement et votre compte sera fermé.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteAccountOpen(false)} 
            variant="outlined"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteAccount} 
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Data Confirmation Dialog */}
      <Dialog
        open={deleteDataOpen}
        onClose={() => setDeleteDataOpen(false)}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 500 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Supprimer vos données
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action supprimera toutes vos données (conversations, documents importés, etc.) mais conservera votre compte. Voulez-vous continuer?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteDataOpen(false)} 
            variant="outlined"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteData} 
            variant="contained" 
            color="warning"
            startIcon={<DeleteIcon />}
          >
            Supprimer toutes mes données
          </Button>
        </DialogActions>
      </Dialog>
      
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
        
        {/* Profile Header Card */}
        <Card 
          sx={{ 
            borderRadius: 3, 
            mb: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            overflow: 'visible'
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {/* Cover Image */}
            <Box 
              sx={{ 
                height: 120, 
                bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                position: 'relative'
              }}
            />
            
            {/* Profile Info */}
            <Box sx={{ p: 3, pt: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: -5, mb: 2 }}>
                <Avatar
                  src={user?.photoURL}
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    border: '4px solid #fff',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  {user?.name ? user.name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : '?')}
                </Avatar>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? 'Annuler' : 'Modifier'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                  >
                    Déconnexion
                  </Button>
                </Box>
              </Box>
              
              <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 500 }}>
                {user?.name || 'Utilisateur'}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {user?.email || ''}
              </Typography>
              
              {user?.phone && (
                <Typography variant="body2" color="text.secondary">
                  {user.phone}
                </Typography>
              )}
              
              <Chip 
                label="Compte personnel" 
                size="small" 
                color="primary" 
                variant="outlined" 
                sx={{ mt: 1 }} 
              />
            </Box>
          </CardContent>
        </Card>
        
        {/* Edit Profile Form */}
        {editMode && (
          <Card sx={{ borderRadius: 3, mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
                Modifier votre profil
              </Typography>
              
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Nom"
                  name="name"
                  value={name}
                  onChange={handleChange}
                  required
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  fullWidth
                  label="Téléphone"
                  name="phone"
                  value={phone}
                  onChange={handleChange}
                  sx={{ mb: 3 }}
                  helperText="Optionnel"
                />
                
                <TextField
                  fullWidth
                  label="Email"
                  value={user?.email || ''}
                  disabled
                  sx={{ mb: 3 }}
                  helperText="L'adresse email ne peut pas être modifiée"
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    sx={{ px: 4, borderRadius: 28 }}
                  >
                    Enregistrer
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
        
        {/* Connected Services */}
        <Card sx={{ borderRadius: 3, mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
              Services connectés
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Google */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#f1f3f4' }}>
                    <GoogleIcon sx={{ color: '#4285F4' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">Google Drive</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {googleConnected ? 'Connecté' : 'Non connecté'}
                    </Typography>
                  </Box>
                </Box>
                
                {googleConnected ? (
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={handleDisconnectGoogle}
                  >
                    Déconnecter
                  </Button>
                ) : (
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={handleConnectGoogle}
                  >
                    Connecter
                  </Button>
                )}
              </Box>
              
              <Divider />
              
              {/* Microsoft */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#f1f3f4' }}>
                    <MicrosoftIcon sx={{ color: '#00a4ef' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">Microsoft OneDrive</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {microsoftConnected ? 'Connecté' : 'Non connecté'}
                    </Typography>
                  </Box>
                </Box>
                
                {microsoftConnected ? (
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={handleDisconnectMicrosoft}
                  >
                    Déconnecter
                  </Button>
                ) : (
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={handleConnectMicrosoft}
                  >
                    Connecter
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        {/* Account Danger Zone */}
        <Card sx={{ 
          borderRadius: 3, 
          mb: 3, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
          borderColor: '#ffebe6',
          borderWidth: 1,
          borderStyle: 'solid'
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 500, color: 'error.main' }}>
              Zone de danger
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                <Box>
                  <Typography variant="subtitle1">Supprimer mes données</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Efface toutes vos conversations et documents, mais conserve votre compte
                  </Typography>
                </Box>
                
                <Button 
                  variant="outlined" 
                  color="warning" 
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDataOpen(true)}
                >
                  Supprimer mes données
                </Button>
              </Box>
              
              <Divider />
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                <Box>
                  <Typography variant="subtitle1">Supprimer mon compte</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supprime définitivement votre compte et toutes vos données
                  </Typography>
                </Box>
                
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  Supprimer mon compte
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default UserProfilePage;
