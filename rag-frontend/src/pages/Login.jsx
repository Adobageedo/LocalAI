import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, TextField, InputAdornment, IconButton, Checkbox, FormControlLabel, Card, Fade, CircularProgress, Tabs, Tab
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function Login() {
  const { login, error } = useAuth();
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  // Simple CSRF token demo
  const csrfToken = 'secure-demo-csrf-token';

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const phoneValid = /^\d{6,15}$/.test(phone);
  const passwordValid = password.length > 0;
  const canSubmit =
    tab === 'email' ? emailValid && passwordValid : phoneValid && passwordValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const identity = tab === 'email' ? email : phone;
    const success = await login(identity, password, { remember, csrfToken });
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };

  return (
    <Fade in timeout={600}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'linear-gradient(135deg, #f6f7fa 0%, #e3eafc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'SF Pro, Inter, Helvetica Neue, Arial, sans-serif' }}>
        <Card elevation={3} sx={{ p: { xs: 3, md: 6 }, borderRadius: 5, maxWidth: 410, width: '100%', boxShadow: 6 }}>
          <Typography variant="h4" fontWeight={700} align="center" sx={{ mb: 1, letterSpacing: -1 }}>
            Welcome Back.
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3, fontWeight: 400 }}>
            Your smart workspace is just one step away.<br/>
            Log in to access your folders, preferences, and connected tools — effortlessly.
          </Typography>
          {error && <Box sx={{ mb: 2, p: 1.5, bgcolor: '#ffeaea', color: '#d32f2f', borderRadius: 2, fontSize: 15 }}>{error}</Box>}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            centered
            sx={{ mb: 2, minHeight: 36, '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)' } }}
          >
            <Tab label="Email" value="email" sx={{ fontWeight: 600, fontSize: 16, minHeight: 36 }} />
            <Tab label="Phone" value="phone" sx={{ fontWeight: 600, fontSize: 16, minHeight: 36 }} />
          </Tabs>
          <form autoComplete="off" onSubmit={handleSubmit}>
            <input type="hidden" name="csrf_token" value={csrfToken} />
            {tab === 'email' ? (
              <TextField
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
                InputProps={{ style: { fontSize: 17 } }}
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
                InputProps={{ style: { fontSize: 17 } }}
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
                    <IconButton onClick={() => setShowPassword(s => !s)} edge="end" aria-label="toggle password visibility">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                style: { fontSize: 17 }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
              <FormControlLabel
                control={<Checkbox checked={remember} onChange={e => setRemember(e.target.checked)} color="primary" />}
                label={<span style={{ fontSize: 15 }}>Remember me</span>}
                sx={{ ml: -1 }}
              />
              <Button
                variant="text"
                size="small"
                sx={{ textTransform: 'none', fontSize: 15, color: '#1976d2', fontWeight: 500, ':hover': { color: '#0d47a1', bgcolor: 'transparent' } }}
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
                mt: 3, py: 1.5, fontSize: 18, borderRadius: 999, textTransform: 'none', boxShadow: 2,
                background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
                ':hover': { background: 'linear-gradient(90deg, #1565c0 0%, #1976d2 100%)', boxShadow: 4 }
              }}
              endIcon={loading ? <CircularProgress size={22} color="inherit" /> : null}
            >
              {loading ? 'Signing in…' : 'Sign In and Continue Where You Left Off'}
            </Button>
          </form>
          <Box sx={{ mt: 4, textAlign: 'center', fontSize: 15, color: '#666' }}>
            Don’t have an account?{' '}
            <Button variant="text" sx={{ color: '#1976d2', fontWeight: 600, textTransform: 'none', fontSize: 15, p: 0, minWidth: 0 }} onClick={() => navigate('/register')}>
              Create one now
            </Button>
            <br />
            Forgot your password?{' '}
            <Button variant="text" sx={{ color: '#1976d2', fontWeight: 600, textTransform: 'none', fontSize: 15, p: 0, minWidth: 0 }} onClick={() => navigate('/reset-password')}>
              Reset it
            </Button>
          </Box>
        </Card>
      </Box>
    </Fade>
  );
}