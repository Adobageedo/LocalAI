import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, TextField, InputAdornment, IconButton, Checkbox, FormControlLabel, Card, Fade, Tooltip, MenuItem, Select, InputLabel, FormControl, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, InfoOutlined } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PasswordStrengthBar from 'react-password-strength-bar';

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
  const { register, error } = useAuth();
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
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  const pwValid = validatePassword(password);
  const allPwValid = Object.values(pwValid).every(Boolean);
  const canSubmit =
    fullName.trim().length > 1 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    phone.match(/^\d{6,15}$/) &&
    allPwValid &&
    password === confirmPassword &&
    agreed &&
    !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const ok = await register(email, password, { fullName, phone: countryCode + phone });
    setLoading(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <Fade in timeout={700}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'linear-gradient(135deg, #f8fafc 0%, #e3eafc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'SF Pro, Helvetica Neue, Arial, sans-serif' }}>
        <Card elevation={3} sx={{ p: { xs: 3, md: 6 }, borderRadius: 5, maxWidth: 420, width: '100%', boxShadow: 6 }}>
          <Typography variant="h4" fontWeight={700} align="center" sx={{ mb: 1, letterSpacing: -1 }}>
            Create Your Account. Unlock the Experience.
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3, fontWeight: 400 }}>
            Seamless access, personalized content, and smarter interactions — all tailored for you.
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography align="center" color="text.secondary" fontSize={15}>
              Join a community that values clarity and performance.<br/>
              Save your preferences, sync across devices, and access premium features.<br/>
              It’s quick, secure, and always private.
            </Typography>
          </Box>
          {error && <Box sx={{ mb: 2, p: 1.5, bgcolor: '#ffeaea', color: '#d32f2f', borderRadius: 2, fontSize: 15 }}>{error}</Box>}
          {success && <Box sx={{ mb: 2, p: 1.5, bgcolor: '#eaffea', color: '#388e3c', borderRadius: 2, fontSize: 15 }}>Registration successful! Redirecting...</Box>}
          <form autoComplete="off" onSubmit={handleSubmit}>
            <TextField
              label="Full Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, fullName: true }))}
              error={touched.fullName && fullName.trim().length < 2}
              helperText={touched.fullName && fullName.trim().length < 2 ? 'Please enter your full name.' : ' '}
              InputProps={{ style: { fontSize: 17 } }}
            />
            <TextField
              label="Email Address"
              type="email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              error={touched.email && !/^\S+@\S+\.\S+$/.test(email)}
              helperText={touched.email && !/^\S+@\S+\.\S+$/.test(email) ? 'Please enter a valid email.' : ' '}
              InputProps={{ style: { fontSize: 17 } }}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mt: 1 }}>
              <FormControl sx={{ minWidth: 90 }}>
                <InputLabel id="country-code-label">Code</InputLabel>
                <Select
                  labelId="country-code-label"
                  value={countryCode}
                  label="Code"
                  onChange={e => setCountryCode(e.target.value)}
                >
                  {countryCodes.map(c => (
                    <MenuItem key={c.code} value={c.code}>{c.label} {c.code}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Phone Number"
                type="tel"
                variant="outlined"
                fullWidth
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                error={touched.phone && !phone.match(/^\d{6,15}$/)}
                helperText={touched.phone && !phone.match(/^\d{6,15}$/) ? 'Enter a valid phone number.' : ' '}
                InputProps={{ style: { fontSize: 17 } }}
              />
            </Box>
            <Box sx={{ position: 'relative', mt: 2 }}>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                error={touched.password && !allPwValid}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Show/Hide Password"><IconButton onClick={() => setShowPassword(s => !s)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></Tooltip>
                      <Tooltip title={<>
                        <Typography fontWeight={600}>Password must contain:</Typography>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                          <li>8+ characters</li>
                          <li>Uppercase & lowercase</li>
                          <li>Number</li>
                          <li>Special character (!@#$%^&*)</li>
                        </ul>
                      </>} placement="top" arrow>
                        <InfoOutlined color="action" sx={{ ml: 1, cursor: 'pointer' }} />
                      </Tooltip>
                    </InputAdornment>
                  ),
                  style: { fontSize: 17 }
                }}
              />
              <Box sx={{ mt: 1, mb: 0.5 }}>
                <PasswordStrengthBar password={password} minLength={8} shortScoreWord="Too short" style={{ fontFamily: 'inherit', height: 8 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', fontSize: 13, color: '#888', mt: 0.5 }}>
                <Box color={pwValid.length ? 'success.main' : 'text.disabled'}><CheckCircleIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />8+ chars</Box>
                <Box color={pwValid.upper ? 'success.main' : 'text.disabled'}><CheckCircleIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />Uppercase</Box>
                <Box color={pwValid.lower ? 'success.main' : 'text.disabled'}><CheckCircleIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />Lowercase</Box>
                <Box color={pwValid.number ? 'success.main' : 'text.disabled'}><CheckCircleIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />Number</Box>
                <Box color={pwValid.special ? 'success.main' : 'text.disabled'}><CheckCircleIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />Special</Box>
              </Box>
            </Box>
            <TextField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
              error={touched.confirmPassword && confirmPassword !== password}
              helperText={touched.confirmPassword && confirmPassword !== password ? 'Passwords do not match.' : ' '}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Show/Hide Password"><IconButton onClick={() => setShowConfirmPassword(s => !s)} edge="end">{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></Tooltip>
                  </InputAdornment>
                ),
                style: { fontSize: 17 }
              }}
              sx={{ mt: 2 }}
            />
            <FormControlLabel
              control={<Checkbox checked={agreed} onChange={e => setAgreed(e.target.checked)} color="primary" />}
              label={<span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></span>}
              sx={{ mt: 2, mb: 1, alignItems: 'flex-start' }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={!canSubmit}
              sx={{
                mt: 2, py: 1.5, fontSize: 18, borderRadius: 3, textTransform: 'none', boxShadow: 2,
                background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
                ':hover': { background: 'linear-gradient(90deg, #1565c0 0%, #1976d2 100%)', boxShadow: 4 }
              }}
              endIcon={loading ? <CircularProgress size={22} color="inherit" /> : null}
            >
              {loading ? 'Registering...' : 'Register Now — It Only Takes a Minute'}
            </Button>
          </form>
          <Typography align="center" sx={{ mt: 3, fontSize: 15 }}>
            Already have an account? <a href="/login" style={{ color: '#1976d2', textDecoration: 'underline' }}>Login</a>
          </Typography>
        </Card>
      </Box>
    </Fade>
  );
}
