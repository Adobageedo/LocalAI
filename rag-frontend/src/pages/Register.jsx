import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Typography, TextField, InputAdornment, IconButton, Checkbox, 
  FormControlLabel, Card, Fade, Tooltip, MenuItem, Select, InputLabel, FormControl, 
  CircularProgress, Container, Grid, Paper, Link, Snackbar, Alert, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Visibility, VisibilityOff, InfoOutlined, Error as ErrorIcon, ArrowBack } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PasswordStrengthBar from 'react-password-strength-bar';
import { API_BASE_URL } from "../config";
import { authFetch } from '../firebase/authFetch';
import { auth } from "../firebase/firebase";
import { getAuth } from "firebase/auth";
import { motion } from 'framer-motion';

const countryCodes = [
  { code: '+1', label: '🇺🇸 US' },
  { code: '+33', label: '🇫🇷 FR' },
  { code: '+44', label: '🇬🇧 UK' },
  { code: '+49', label: '🇩🇪 DE' },
  { code: '+39', label: '🇮🇹 IT' },
  { code: '+34', label: '🇪🇸 ES' },
  { code: '+81', label: '🇯🇵 JP' },
  { code: '+91', label: '🇮🇳 IN' },
  // ...add more as needed
];

function validatePassword(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[!@#$%^&*]/.test(pw)
  };
}

export default function Register() {
  const { register, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+33');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  useEffect(() => {
    if (user) {
      navigate('/chatbot');
    }
  }, [user, navigate]);

  // Auto-focus on first field when component mounts
  useEffect(() => {
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
      fullNameInput.focus();
    }
  }, []);

  const pwValid = validatePassword(password);
  const allPwValid = Object.values(pwValid).every(Boolean);
  
  // Validate fields according to database schema requirements
  const nameValid = fullName.trim().length > 0 && fullName.trim().length <= 255;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
  const phoneValid = phone.match(/^\d{6,15}$/);
  const passwordsMatch = password === confirmPassword;
  
  const canSubmit =
    nameValid &&
    emailValid &&
    phoneValid &&
    allPwValid &&
    passwordsMatch &&
    agreed &&
    !loading;
    
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First register with Firebase auth
      const registerResult = await register(email, password, { fullName, phone: countryCode + phone });
      
      if (!registerResult) {
        throw new Error('Firebase registration failed. Please try again.');
      }
      
      // We need to wait for the auth state to update
      // This is a common issue with Firebase auth where the user object isn't immediately available
      let tries = 0;
      let currentUser = null;
      
      while (!currentUser && tries < 10) {
        currentUser = auth.currentUser;
        if (!currentUser) {
          await new Promise(resolve => setTimeout(resolve, 500));
          tries++;
        }
      }
      
      if (!currentUser) {
        throw new Error('Could not get user information after registration. Please try logging in.');
      }
      
      // Get the Firebase user ID
      const uid = currentUser.uid;
      
      console.log('Firebase user created with ID:', uid);
        
      // Create a user object matching your database schema
      const userData = {
        id: uid,
        email: email,
        name: fullName,
        phone: countryCode + phone,
      };
      console.log('Creating user in database:', userData);

      // Now send the user data to your backend
      const response = await authFetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend registration failed with status: ${response.status}`);
      }
      
      const createdUser = await response.json();
      console.log('User created in backend:', createdUser);
      
      setSuccess(true);
      setSnackbarOpen(true);
      // Redirect users after signup with small delay to show success message
      setTimeout(() => {
        navigate('/chatbot');
      }, 1500);

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      // Clean up Firebase user if there's an error with database
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.delete();
        }
      } catch (cleanupError) {
        console.error('Error cleaning up Firebase user:', cleanupError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#f8fafd'
    }}>
      {/* Removed duplicate snackbars from here, now using the bottom ones */}

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 2, sm: 4 } }}>
        {/* Back button */}
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ textTransform: 'none' }}
          >
            Retour à l'accueil
          </Button>
        </Box>

        {/* Main content */}
        <Grid container spacing={4}>
          {/* Left side - Illustration or welcome message (Hidden on mobile) */}
          {!isMobile && (
            <Grid item md={5} lg={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box 
                sx={{ 
                  height: '100%', 
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  p: 4
                }}
              >
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Rejoignez LocalAI
                </Typography>
                <Typography variant="h6" color="text.secondary" paragraph>
                  Créez votre compte et commencez à exploiter la puissance de l'IA sur vos documents et emails.
                </Typography>
                <Box 
                  component="img"
                  src="/images/register-illustration.svg" 
                  alt="Registration"
                  sx={{ 
                    maxWidth: '100%',
                    height: 'auto', 
                    mt: 4
                  }}
                />
              </Box>
            </Grid>
          )}
          
          {/* Right side - Registration form */}
          <Grid item xs={12} md={7} lg={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Paper 
                elevation={3} 
                sx={{ 
                  borderRadius: 2,
                  overflow: 'hidden',
                  p: { xs: 3, sm: 4 },
                  mx: 'auto',
                  maxWidth: 500,
                  position: 'relative'
                }}
              >
              {/* Form title */}
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Créer un compte
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Remplissez le formulaire ci-dessous pour commencer
              </Typography>
              
              {/* Registration form */}
              <form autoComplete="off" onSubmit={handleSubmit}>
                <TextField
                  id="fullName"
                  label="Nom complet"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  autoFocus
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, fullName: true }))}
                  error={touched.fullName && !nameValid}
                  helperText={touched.fullName && !nameValid ? 'Veuillez entrer votre nom complet.' : ' '}
                  InputProps={{
                    sx: { borderRadius: 2 }
                  }}
                />
                
                <TextField
                  label="Adresse email"
                  type="email"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  error={touched.email && !emailValid}
                  helperText={touched.email && !emailValid ? 'Veuillez entrer un email valide.' : ' '}
                  InputProps={{
                    sx: { borderRadius: 2 }
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mt: 1, mb: 2 }}>
                  <FormControl sx={{ minWidth: 90 }}>
                    <InputLabel id="country-code-label">Code</InputLabel>
                    <Select
                      labelId="country-code-label"
                      value={countryCode}
                      label="Code"
                      onChange={e => setCountryCode(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      {countryCodes.map(c => (
                        <MenuItem key={c.code} value={c.code}>{c.label} {c.code}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Numéro de téléphone"
                    type="tel"
                    variant="outlined"
                    fullWidth
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                    error={touched.phone && !phoneValid}
                    helperText={touched.phone && !phoneValid ? 'Numéro de téléphone invalide.' : ' '}
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Box>
                
                {/* Password field */}
                <TextField
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  error={touched.password && !allPwValid}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(s => !s)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={{ mb: 1 }}
                />
                
                {/* Password strength bar */}
                {password.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <PasswordStrengthBar password={password} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {Object.entries(pwValid).map(([key, valid]) => (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: valid ? 'success.main' : 'text.secondary' }}>
                          {valid ? <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 0.5 }} /> : <InfoOutlined fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />}
                          {{
                            length: '8+ caractères',
                            upper: 'Majuscule',
                            lower: 'Minuscule',
                            number: 'Chiffre',
                            special: 'Caractère spécial'
                          }[key]}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                
                {/* Confirm password field */}
                <TextField
                  label="Confirmer le mot de passe"
                  type={showConfirmPassword ? 'text' : 'password'}
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
                  error={touched.confirmPassword && !passwordsMatch}
                  helperText={touched.confirmPassword && !passwordsMatch ? 'Les mots de passe ne correspondent pas.' : ' '}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(s => !s)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={{ mb: 2 }}
                />
                
                {/* Terms agreement */}
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={agreed} 
                        onChange={e => setAgreed(e.target.checked)} 
                        color="primary" 
                      />
                    }
                    label={
                      <Typography variant="body2">
                        J'accepte les{' '}
                        <Link href="#" underline="hover">termes et conditions</Link>{' '}
                        et la{' '}
                        <Link href="#" underline="hover">politique de confidentialité</Link>
                      </Typography>
                    }
                  />
                  {touched.agreed && !agreed && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 2 }}>
                      Vous devez accepter les conditions pour continuer
                    </Typography>
                  )}
                </Box>
                
                {/* Submit button */}
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={!canSubmit}
                  sx={{
                    py: 1.5,
                    mt: 1,
                    mb: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                      Création du compte...
                    </Box>
                  ) : (
                    'Créer mon compte'
                  )}
                </Button>
                
                {/* Login link */}
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Déjà un compte?{' '}
                    <Link 
                      component={RouterLink} 
                      to="/login" 
                      underline="hover"
                      fontWeight="medium"
                    >
                      Se connecter
                    </Link>
                  </Typography>
                </Box>
              </form>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
      
      {/* Success snackbar notification - Enhanced version */}
      <Snackbar 
        open={snackbarOpen && success} 
        autoHideDuration={5000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          onClose={handleCloseSnackbar}
          sx={{ borderRadius: 2, width: '100%' }}
        >
          Inscription réussie! Redirection en cours...
        </Alert>
      </Snackbar>

      {/* Error snackbar notification - Enhanced version */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ borderRadius: 2, width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};
          
