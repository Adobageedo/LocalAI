import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Typography, TextField, InputAdornment, IconButton, Checkbox, FormControlLabel,
  Card, Fade, CircularProgress, Tabs, Tab, Container, Grid, Paper, Link, Snackbar, Alert, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function Login() {
  const { login, error: authError, user } = useAuth();
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  useEffect(() => {
      if (user) {
        navigate('/chatbot');
      }
    }, [user, navigate]);
  
  // Simple CSRF token demo
  const csrfToken = 'secure-demo-csrf-token';

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const phoneValid = /^\d{6,15}$/.test(phone);
  const passwordValid = password.length > 0;
  const canSubmit =
    tab === 'email' ? emailValid && passwordValid : phoneValid && passwordValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    setError(null);
    setLoading(true);
    
    try {
      const identity = tab === 'email' ? email : phone;
      const success = await login(identity, password, { remember, csrfToken });
      
      if (success) {
        // Show success message briefly before navigating
        setSnackbarOpen(true);
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        // If login returns false but no error thrown
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.message || authError || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Reuse auto-focus effect from Register page for better UX
  useEffect(() => {
    const emailInput = document.getElementById('email-field');
    if (emailInput) {
      emailInput.focus();
    }
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafd' }}>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 2, sm: 4 } }}>
        <Grid container spacing={4} alignItems="center" justifyContent="center" sx={{ minHeight: '90vh' }}>
          {!isMobile && (
            <Grid item md={5} lg={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>Welcome Back</Typography>
                <Typography variant="h6" color="text.secondary" paragraph>
                  Log in to access your folders, preferences, and connected tools — effortlessly.
                </Typography>
                <Box 
                  component="img" 
                  src="/images/login-illustration.svg" 
                  alt="Login" 
                  sx={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    mt: 4,
                    display: { xs: 'none', md: 'block' }
                  }} 
                />
              </Box>
            </Grid>
          )}
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
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Sign In to Your Account
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Welcome back! Please enter your credentials to continue.
                  </Typography>
                </Box>
                
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 2,
                      borderRadius: 1,
                    }}
                  >
                    {error}
                  </Alert>
                )}
                
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  centered
                  sx={{ 
                    mb: 3, 
                    minHeight: 42, 
                    '& .MuiTabs-indicator': { 
                      height: 3,
                      borderRadius: 1.5,
                      background: theme.palette.primary.main 
                    } 
                  }}
                >
                  <Tab 
                    label="Email" 
                    value="email" 
                    sx={{ 
                      fontWeight: 600, 
                      fontSize: 15, 
                      textTransform: 'none',
                      minHeight: 42 
                    }} 
                  />
                  <Tab 
                    label="Phone" 
                    value="phone" 
                    sx={{ 
                      fontWeight: 600, 
                      fontSize: 15, 
                      textTransform: 'none',
                      minHeight: 42 
                    }} 
                  />
                </Tabs>
                
                <form autoComplete="off" onSubmit={handleSubmit}>
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  {tab === 'email' ? (
                    <TextField
                      id="email-field"
                      label="Email Address"
                      type="email"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))}
                      error={touched.email && !emailValid}
                      helperText={touched.email && !emailValid ? 'Please enter a valid email.' : ' '}
                      InputProps={{
                        sx: { borderRadius: 2 }
                      }}
                      sx={{ mb: 2 }}
                    />
                  ) : (
                    <TextField
                      label="Phone Number"
                      type="tel"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                      error={touched.phone && !phoneValid}
                      helperText={touched.phone && !phoneValid ? 'Enter a valid phone number.' : ' '}
                      InputProps={{
                        sx: { borderRadius: 2 }
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}
                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    error={touched.password && !passwordValid}
                    helperText={touched.password && !passwordValid ? 'Please enter your password.' : ' '}
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 2 }}>
                    <FormControlLabel
                      control={<Checkbox checked={remember} onChange={e => setRemember(e.target.checked)} color="primary" />}
                      label={<Typography variant="body2">Remember me</Typography>}
                      sx={{ ml: -1 }}
                    />
                    <Button
                      variant="text"
                      size="small"
                      sx={{ 
                        textTransform: 'none', 
                        fontWeight: 500, 
                        ':hover': { bgcolor: 'transparent' },
                        fontSize: '0.875rem'
                      }}
                      onClick={() => navigate('/reset-password')}
                    >
                      Forgot Password?
                    </Button>
                  </Box>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={!canSubmit || loading}
                    sx={{
                      mt: 2,
                      py: 1.5, 
                      borderRadius: 2, 
                      textTransform: 'none', 
                      fontWeight: 'bold',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {loading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                        Signing In...
                      </Box>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
                
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Don't have an account?{' '}
                    <Link 
                      component={RouterLink} 
                      to="/register" 
                      fontWeight="medium"
                      underline="hover"
                    >
                      Create one now
                    </Link>
                  </Typography>
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
      
      {/* Success snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%', borderRadius: 2 }}>
          Login successful! Redirecting...
        </Alert>
      </Snackbar>
    </Box>
  );
}