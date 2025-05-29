import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Grid, Card, CardContent, Avatar, Fade } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import FlashOnIcon from '@mui/icons-material/FlashOn';

export default function Home() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'linear-gradient(135deg, #f8fafc 0%, #e3eafc 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <Box sx={{ position: 'relative', width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pb: 8 }}>
        {/* Subtle animated background (CSS animation or SVG) */}
        <Box sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'radial-gradient(circle at 60% 40%, #a5d8ff33 0%, transparent 70%), radial-gradient(circle at 20% 80%, #bdb2ff22 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Box sx={{ zIndex: 1, textAlign: 'center', maxWidth: 700, px: 2 }}>
          <img src="/images/logo.png" alt="LocalAI Logo" width={120} height={120} style={{ margin: '0 auto 1.5rem auto', borderRadius: 24 }} />
          <Typography variant="h2" fontWeight={700} sx={{ mb: 2, fontSize: { xs: 32, md: 48 }, letterSpacing: -1 }}>
            AI-powered answers for your business knowledge.
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4, fontWeight: 400, fontSize: { xs: 18, md: 24 } }}>
            Instantly search, organize, and chat with your files, emails, and contracts. Secure, private, and beautifully simple.
          </Typography>
          <Button
            variant="contained"
            size="large"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            sx={{ px: 6, py: 1.5, fontSize: 20, borderRadius: 3, boxShadow: 2, textTransform: 'none', mb: 2, transition: 'all .2s', ':hover': { boxShadow: 4 } }}
            onClick={() => navigate('/register')}
          >
            Try Now
          </Button>
        </Box>
      </Box>

      {/* Benefits Section */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', mt: { xs: 4, md: 0 }, mb: 8, px: 2 }}>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', minHeight: 180, textAlign: 'center', transition: 'all .2s', ':hover': { boxShadow: 6, transform: 'translateY(-4px)' } }}>
              <SearchIcon color="primary" sx={{ fontSize: 44, mb: 1 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Instant AI Search</Typography>
              <Typography color="text.secondary">Find answers in emails, files, and contracts in seconds with advanced semantic search.</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', minHeight: 180, textAlign: 'center', transition: 'all .2s', ':hover': { boxShadow: 6, transform: 'translateY(-4px)' } }}>
              <LockOutlinedIcon color="primary" sx={{ fontSize: 44, mb: 1 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Private & Secure</Typography>
              <Typography color="text.secondary">Your data stays encrypted and never leaves your cloud — privacy by design.</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', minHeight: 180, textAlign: 'center', transition: 'all .2s', ':hover': { boxShadow: 6, transform: 'translateY(-4px)' } }}>
              <CloudQueueIcon color="primary" sx={{ fontSize: 44, mb: 1 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Seamless Integrations</Typography>
              <Typography color="text.secondary">Connect Outlook, Gmail, Nextcloud, and more — all your knowledge, one place.</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', minHeight: 180, textAlign: 'center', transition: 'all .2s', ':hover': { boxShadow: 6, transform: 'translateY(-4px)' } }}>
              <FlashOnIcon color="primary" sx={{ fontSize: 44, mb: 1 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Lightning Fast Setup</Typography>
              <Typography color="text.secondary">Get started in minutes — no code, no hassle, just results.</Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Visual Demo Section */}
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, mb: 10, width: '100%' }}>
        <Fade in timeout={1000}>
          <Box sx={{
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: 6,
            background: 'linear-gradient(120deg, #e3eafc 0%, #f8fafc 100%)',
            p: { xs: 2, md: 4 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: 180, md: 320 },
            mb: 2,
          }}>
            <img
              src="/images/demo-mockup.png"
              alt="Product Demo"
              style={{ width: '100%', maxWidth: 600, borderRadius: 24, boxShadow: '0 8px 40px #b6c6e6bb' }}
            />
          </Box>
        </Fade>
        <Typography align="center" color="text.secondary" sx={{ mt: 1, fontSize: 18 }}>
          See how LocalAI RAG Cloud brings all your documents and emails together for instant answers.
        </Typography>
      </Box>

      {/* Testimonials Section */}
      <Box sx={{ maxWidth: 900, mx: 'auto', mb: 8, px: 2 }}>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', minHeight: 160, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar src="/images/user1.jpg" alt="User 1" sx={{ width: 56, height: 56, mr: 2 }} />
              <Box>
                <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                  “LocalAI has transformed how we find information — it’s like having a personal assistant for our documents!”
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">Sarah L., Operations Manager</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', minHeight: 160, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar src="/images/user2.jpg" alt="User 2" sx={{ width: 56, height: 56, mr: 2 }} />
              <Box>
                <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                  “The AI search is so fast and accurate. We trust LocalAI with all our sensitive files.”
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">Julien M., IT Lead</Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Final CTA Section */}
      <Box sx={{ maxWidth: 700, mx: 'auto', mb: 10, px: 2, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
          Ready to get started?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Start for free — no credit card required.
        </Typography>
        <Button
          variant="contained"
          size="large"
          color="primary"
          endIcon={<ArrowForwardIcon />}
          sx={{ px: 6, py: 1.5, fontSize: 20, borderRadius: 3, boxShadow: 2, textTransform: 'none', mb: 2, transition: 'all .2s', ':hover': { boxShadow: 4 } }}
          onClick={() => navigate('/register')}
        >
          Create Your Account
        </Button>
      </Box>

      {/* Footer */}
      <Box sx={{ textAlign: 'center', color: 'text.disabled', fontSize: 16, py: 4 }}>
        © {new Date().getFullYear()} LocalAI. All rights reserved.
      </Box>
    </Box>
  );
}
