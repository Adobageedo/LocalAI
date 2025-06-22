import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Container, 
  Avatar, 
  Fade,
  Paper,
  IconButton,
  Link,
  Stack,
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DescriptionIcon from '@mui/icons-material/Description';
import ForumIcon from '@mui/icons-material/Forum';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import DataObjectIcon from '@mui/icons-material/DataObject';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import GitHubIcon from '@mui/icons-material/GitHub';

export default function Home() {
  const navigate = useNavigate();

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e3eafc 100%)', 
        display: 'flex', 
        flexDirection: 'column',
        color: '#0A2540', // Base text color for the whole page
        fontFamily: '"Inter", "Sora", "Poppins", sans-serif',
      }}
    >
      {/* Background gradient overlay */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: 'radial-gradient(circle at 60% 40%, rgba(165, 216, 255, 0.15) 0%, transparent 70%), radial-gradient(circle at 20% 80%, rgba(189, 178, 255, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      
      {/* Navigation/Header */}
      <Box sx={{ 
        py: 2, 
        px: 2, 
        width: '100%', 
        position: 'relative',
        zIndex: 2,
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                component="img"
                src="/logo.svg"
                alt="LocalAI Logo"
                sx={{ height: 32, mr: 1 }}
              />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  display: { xs: 'none', sm: 'block' } 
                }}
              >
                LocalAI Cloud
              </Typography>
            </Box>
            
            {/* Auth Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                color="primary"
                size="medium"
                onClick={() => navigate('/login')}
                sx={{ 
                  borderRadius: 2,
                  py: 0.5,
                  borderWidth: 1.5,
                  '&:hover': { borderWidth: 1.5 },
                  display: { xs: 'none', sm: 'inline-flex' },
                }}
              >
                Se connecter
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                size="medium"
                onClick={() => navigate('/register')}
                sx={{ 
                  borderRadius: 2,
                  py: 0.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                S'inscrire
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
      
      {/* 1. Hero Section */}
      <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: 8, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography 
              variant="h1" 
              component="h1" 
              sx={{ 
                fontSize: { xs: '2.5rem', md: '3.5rem' }, 
                fontWeight: 800, 
                mb: 2,
                background: 'linear-gradient(90deg, #0A2540 30%, #7B61FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2
              }}
            >
              Vos documents. Vos mails. Une IA pour tout gérer.
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              sx={{ 
                mb: 4, 
                fontWeight: 400,
                lineHeight: 1.5,
                fontSize: { xs: '1.1rem', md: '1.25rem' } 
              }}
            >
              Connectez vos comptes Google, Microsoft ou Nextcloud et accédez à des agents IA intelligents pour rechercher, générer, organiser ou surveiller vos données.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={() => navigate('/register')}
                sx={{ 
                  py: 1.5, 
                  px: 4, 
                  borderRadius: 2, 
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)'
                }}
              >
                Commencer gratuitement
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PlayArrowIcon />}
                sx={{ 
                  py: 1.5, 
                  px: 3, 
                  borderRadius: 2, 
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
                onClick={() => navigate('/demo')}
              >
                Voir une démo
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', sm: 'block' }}}>
            <Box 
              component="img"
              src="/images/hero-mockup.png" 
              alt="LocalAI Interface"
              sx={{
                width: '100%',
                maxWidth: 560,
                height: 'auto',
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'perspective(1000px) rotateY(-2deg) rotateX(2deg) translateY(-5px)',
                  boxShadow: '0 30px 50px rgba(0,0,0,0.18)',
                }
              }}
            />
          </Grid>
        </Grid>
      </Container>

      {/* 2. Key Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography 
          variant="h2" 
          component="h2" 
          align="center" 
          sx={{ 
            fontWeight: 700, 
            mb: 1,
            fontSize: { xs: '2rem', md: '2.5rem' } 
          }}
        >
          Fonctionnalités principales
        </Typography>
        <Typography 
          variant="h6" 
          component="p" 
          align="center" 
          color="text.secondary" 
          sx={{ mb: 6, maxWidth: 700, mx: 'auto' }}
        >
          Accédez à vos données grâce à l'intelligence artificielle
        </Typography>
        
        <Grid container spacing={4}>
          {/* Feature 1: Recherche intelligente */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={1} 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 3, 
                transition: 'all 0.3s ease', 
                ':hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 4 
                } 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <SearchIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={600}>
                  Recherche intelligente
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Recherchez instantanément un contrat, un fichier ou un e-mail dans vos sources connectées.
              </Typography>
            </Card>
          </Grid>
          
          {/* Feature 2: Génération de documents */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={1} 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 3, 
                transition: 'all 0.3s ease', 
                ':hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 4 
                } 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <DescriptionIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={600}>
                  Génération de documents
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Générez des brouillons, contrats ou rapports à partir de modèles ou d'exemples précédents.
              </Typography>
            </Card>
          </Grid>
          
          {/* Feature 3: Agents IA personnalisables */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={1} 
              sx={{ 
                p: 3,
                height: '100%',
                borderRadius: 3, 
                transition: 'all 0.3s ease', 
                ':hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 4 
                } 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <AutoAwesomeIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={600}>
                  Agents IA personnalisables
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                RH, juridique, commercial, finance... créez des assistants autonomes adaptés à votre métier.
              </Typography>
            </Card>
          </Grid>
          
          {/* Feature 4: Veille automatique */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={1} 
              sx={{ 
                p: 3,
                height: '100%',
                borderRadius: 3, 
                transition: 'all 0.3s ease', 
                ':hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 4 
                } 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <RssFeedIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={600}>
                  Veille & alerte automatique
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Détection de mots sensibles, surveillance réglementaire, suivi des mails critiques.
              </Typography>
            </Card>
          </Grid>
          
          {/* Feature 5: Indexation automatique */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={1} 
              sx={{ 
                p: 3,
                height: '100%', 
                borderRadius: 3, 
                transition: 'all 0.3s ease', 
                ':hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 4 
                } 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <DataObjectIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={600}>
                  Indexation automatique
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                PDF, DOCX, mails... transformés en vecteurs pour une recherche sémantique avancée.
              </Typography>
            </Card>
          </Grid>
          
          {/* Feature 6: Sécurité */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={1} 
              sx={{ 
                p: 3,
                height: '100%',
                borderRadius: 3, 
                transition: 'all 0.3s ease', 
                ':hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 4 
                } 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <LockOutlinedIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={600}>
                  Sécurité et confidentialité
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Vos données restent privées. Rien n'est stocké sans votre accord.
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* 3. Exemples d'agents IA */}
      <Box sx={{ bgcolor: 'rgba(230, 235, 248, 0.4)', py: 10 }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h2" 
            component="h2" 
            align="center" 
            sx={{ 
              fontWeight: 700, 
              mb: 1,
              fontSize: { xs: '2rem', md: '2.5rem' } 
            }}
          >
            Exemples d'agents IA
          </Typography>
          <Typography 
            variant="h6" 
            component="p" 
            align="center" 
            color="text.secondary" 
            sx={{ mb: 6, maxWidth: 700, mx: 'auto' }}
          >
            Découvrez ce que vous pouvez construire
          </Typography>
          
          {/* Agent cards */}
          <Grid container spacing={3}>
            {/* Agent RH */}
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={2} 
                sx={{ 
                  borderRadius: 3,
                  height: '100%',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 3, 
                    pb: 2,
                    borderBottom: '1px solid rgba(0,0,0,0.08)'
                  }}>
                    <Avatar sx={{ bgcolor: '#614EE9', width: 56, height: 56 }}>
                      <AutoAwesomeIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6" fontWeight={600}>Agent RH</Typography>
                      <Typography variant="body2" color="text.secondary">Ressources humaines</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" paragraph>
                    Répond aux questions internes, extrait des infos RH, lit les docs du personnel.
                  </Typography>
                  <Box 
                    component="img" 
                    src="/images/agent-hr-demo.png"
                    alt="Démonstration Agent RH" 
                    sx={{ 
                      width: '100%',
                      borderRadius: 2,
                      mt: 2,
                      border: '1px solid rgba(0,0,0,0.1)'
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
            
            {/* Agent de tri mail */}
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={2} 
                sx={{ 
                  borderRadius: 3,
                  height: '100%',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 3, 
                    pb: 2,
                    borderBottom: '1px solid rgba(0,0,0,0.08)'
                  }}>
                    <Avatar sx={{ bgcolor: '#3DA5E9', width: 56, height: 56 }}>
                      <ForumIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6" fontWeight={600}>Agent de tri mail</Typography>
                      <Typography variant="body2" color="text.secondary">Organisation emails</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" paragraph>
                    Organise et classe les mails entrants, génère des réponses.
                  </Typography>
                  <Box 
                    component="img" 
                    src="/images/agent-mail-demo.png"
                    alt="Démonstration Agent Mail" 
                    sx={{ 
                      width: '100%',
                      borderRadius: 2,
                      mt: 2,
                      border: '1px solid rgba(0,0,0,0.1)'
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
            
            {/* Agent d'urgence */}
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={2} 
                sx={{ 
                  borderRadius: 3,
                  height: '100%',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 3, 
                    pb: 2,
                    borderBottom: '1px solid rgba(0,0,0,0.08)'
                  }}>
                    <Avatar sx={{ bgcolor: '#E94E3D', width: 56, height: 56 }}>
                      <RssFeedIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6" fontWeight={600}>Agent urgence</Typography>
                      <Typography variant="body2" color="text.secondary">Alerte et surveillance</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" paragraph>
                    Alerte automatiquement en cas de mails critiques ou litiges détectés.
                  </Typography>
                  <Box 
                    component="img" 
                    src="/images/agent-alert-demo.png"
                    alt="Démonstration Agent Alerte" 
                    sx={{ 
                      width: '100%',
                      borderRadius: 2,
                      mt: 2,
                      border: '1px solid rgba(0,0,0,0.1)'
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 4. How it works */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography 
          variant="h2" 
          component="h2" 
          align="center" 
          sx={{ 
            fontWeight: 700, 
            mb: 1,
            fontSize: { xs: '2rem', md: '2.5rem' } 
          }}
        >
          Comment ça fonctionne
        </Typography>
        <Typography 
          variant="h6" 
          component="p" 
          align="center" 
          color="text.secondary" 
          sx={{ mb: 8, maxWidth: 700, mx: 'auto' }}
        >
          Une mise en place simple en trois étapes
        </Typography>

        <Grid container spacing={4} alignItems="center">
          {/* Step 1 */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={2}
              sx={{
                p: 4,
                borderRadius: 3,
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.03)'
                }
              }}
            >
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 80,
                  height: 80,
                  mb: 3,
                  boxShadow: 2
                }}
              >
                <Typography variant="h4" color="white">1</Typography>
              </Avatar>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 3
                }}
              >
                <Avatar sx={{ bgcolor: '#4285F4' }}>
                  <GoogleIcon />
                </Avatar>
                <Avatar sx={{ bgcolor: '#0078D4' }}>
                  <MicrosoftIcon />
                </Avatar>
                <Avatar sx={{ bgcolor: '#0082C9' }}>
                  <CloudQueueIcon />
                </Avatar>
              </Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Connectez vos comptes
              </Typography>
              <Typography color="text.secondary">
                Sélectionnez vos sources de données (Google, Microsoft, Nextcloud) et autorisez l'accès sécurisé.
              </Typography>
            </Paper>
          </Grid>

          {/* Step 2 */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={2}
              sx={{
                p: 4,
                borderRadius: 3,
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.03)'
                }
              }}
            >
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 80,
                  height: 80,
                  mb: 3,
                  boxShadow: 2
                }}
              >
                <Typography variant="h4" color="white">2</Typography>
              </Avatar>
              <Box
                sx={{
                  height: 80,
                  width: 80,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 3
                }}
              >
                <AutoAwesomeIcon color="primary" sx={{ fontSize: 50 }} />
              </Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Choisissez vos agents IA
              </Typography>
              <Typography color="text.secondary">
                Sélectionnez parmi nos agents prédéfinis ou créez un agent personnalisé pour vos besoins spécifiques.
              </Typography>
            </Paper>
          </Grid>

          {/* Step 3 */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={2}
              sx={{
                p: 4,
                borderRadius: 3,
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.03)'
                }
              }}
            >
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 80,
                  height: 80,
                  mb: 3,
                  boxShadow: 2
                }}
              >
                <Typography variant="h4" color="white">3</Typography>
              </Avatar>
              <Box
                sx={{
                  height: 80,
                  width: 80,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 3
                }}
              >
                <ForumIcon color="primary" sx={{ fontSize: 50 }} />
              </Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Discutez et travaillez
              </Typography>
              <Typography color="text.secondary">
                Commencez à discuter avec vos agents, rechercher des informations, organiser vos données et générer du contenu.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* 6. Enterprise Section with Testimonials */}
      <Box sx={{ bgcolor: 'rgba(230, 235, 248, 0.4)', py: 10 }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h2" 
            component="h2" 
            align="center"
            sx={{ 
              fontWeight: 700, 
              mb: 1,
              fontSize: { xs: '2rem', md: '2.5rem' } 
            }}
          >
            Solutions pour entreprises
          </Typography>
          <Typography 
            variant="h6" 
            component="p" 
            align="center" 
            color="text.secondary" 
            sx={{ mb: 6, maxWidth: 700, mx: 'auto' }}
          >
            Des solutions adaptées aux équipes RH, juridiques et IT
          </Typography>
          
          {/* Enterprise use cases */}
          <Grid container spacing={4} sx={{ mb: 8 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    width: 64, 
                    height: 64,
                    mx: 'auto',
                    mb: 2 
                  }}
                >
                  <AccountTreeIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Automatisation onboarding
                </Typography>
                <Typography color="text.secondary">
                  Automatisez l'accueil des nouveaux employés avec des documents personnalisés et une FAQ intelligente.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    width: 64, 
                    height: 64,
                    mx: 'auto',
                    mb: 2 
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Rédaction de contrats
                </Typography>
                <Typography color="text.secondary">
                  Générez des brouillons de contrats basés sur votre historique juridique et vos modèles existants.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    width: 64, 
                    height: 64, 
                    mx: 'auto',
                    mb: 2 
                  }}
                >
                  <RssFeedIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Veille juridique
                </Typography>
                <Typography color="text.secondary">
                  Surveillez automatiquement les mises à jour règlementaires qui concernent votre secteur d'activité.
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Testimonials */}
          <Typography variant="h4" align="center" fontWeight={600} sx={{ mb: 4 }}>
            Témoignages clients
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} md={6}>
              <Card 
                elevation={2} 
                sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  minHeight: 180,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 4
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar 
                    src="/images/testimonial1.jpg" 
                    alt="Directrice RH" 
                    sx={{ width: 64, height: 64, mr: 2 }} 
                  />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Sophie Martin
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Directrice RH, Groupe Finance+
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body1" sx={{ fontStyle: 'italic', mb: 1 }}>
                  "LocalAI nous a permis de réduire de 70% le temps consacré à la recherche d'informations RH et à la rédaction de documents standards pour nos collaborateurs."
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card 
                elevation={2} 
                sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  minHeight: 180,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 4
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar 
                    src="/images/testimonial2.jpg" 
                    alt="Responsable juridique" 
                    sx={{ width: 64, height: 64, mr: 2 }} 
                  />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Thomas Durand
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Responsable juridique, TechCorp
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body1" sx={{ fontStyle: 'italic', mb: 1 }}>
                  "L'agent de veille juridique nous alerte dès qu'un changement règlementaire concerne notre activité. Un gain de temps précieux et une sécurité accrue."
                </Typography>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              variant="contained"
              size="large"
              sx={{ 
                py: 1.5, 
                px: 4, 
                borderRadius: 2, 
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none'
              }}
              onClick={() => navigate('/contact')}
            >
              Parler à un expert
            </Button>
          </Box>
        </Container>
      </Box>

      {/* 7. Final CTA Section */}
      <Container maxWidth="md" sx={{ textAlign: 'center', py: 10, px: 2 }}>
        <Typography 
          variant="h2" 
          component="h2" 
          sx={{ 
            fontWeight: 700, 
            mb: 3,
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
            background: 'linear-gradient(90deg, #1565C0 0%, #6A1B9A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textFillColor: 'transparent',
          }}
        >
          Prêt à améliorer votre productivité documentaire?
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ mb: 5, maxWidth: '800px', mx: 'auto', px: 2 }}
        >
          Commencez gratuitement avec notre version d'essai de 14 jours.
          Aucune carte de crédit n'est requise.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            color="primary"
            sx={{ 
              borderRadius: 2, 
              py: 1.5, 
              px: 4, 
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            }}
            onClick={() => navigate('/signup')}
          >
            Commencer gratuitement
          </Button>
          <Button
            variant="outlined"
            size="large"
            sx={{ 
              borderRadius: 2, 
              py: 1.5, 
              px: 4, 
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2
              }
            }}
            onClick={() => navigate('/contact')}
          >
            Nous contacter
          </Button>
        </Box>
      </Container>

      {/* 8. Footer */}
      <Box 
        sx={{ 
          bgcolor: '#f8fafd', 
          borderTop: '1px solid', 
          borderColor: 'divider', 
          pt: 8, 
          pb: 4 
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            {/* Company info */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box 
                  component="img"
                  src="/logo.svg"
                  alt="LocalAI Logo"
                  sx={{ height: 36, mr: 1 }}
                />
                <Typography variant="h6" fontWeight="bold">
                  LocalAI Cloud
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph sx={{ maxWidth: 300 }}>
                Solution d'intelligence artificielle qui connecte tous vos documents et emails pour des réponses instantanées grâce à la technologie RAG.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <IconButton size="small" sx={{ color: 'text.secondary' }} aria-label="LinkedIn">
                  <LinkedInIcon />
                </IconButton>
                <IconButton size="small" sx={{ color: 'text.secondary' }} aria-label="Twitter">
                  <TwitterIcon />
                </IconButton>
                <IconButton size="small" sx={{ color: 'text.secondary' }} aria-label="GitHub">
                  <GitHubIcon />
                </IconButton>
              </Box>
            </Grid>
            
            {/* Links */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Produit
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Link component={RouterLink} to="/features" color="text.secondary" underline="none">
                      Fonctionnalités
                    </Link>
                    <Link component={RouterLink} to="/pricing" color="text.secondary" underline="none">
                      Tarifs
                    </Link>
                    <Link component={RouterLink} to="/case-studies" color="text.secondary" underline="none">
                      Cas d'usage
                    </Link>
                    <Link component={RouterLink} to="/releases" color="text.secondary" underline="none">
                      Mises à jour
                    </Link>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Ressources
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Link component={RouterLink} to="/blog" color="text.secondary" underline="none">
                      Blog
                    </Link>
                    <Link component={RouterLink} to="/documentation" color="text.secondary" underline="none">
                      Documentation
                    </Link>
                    <Link component={RouterLink} to="/api" color="text.secondary" underline="none">
                      API
                    </Link>
                    <Link component={RouterLink} to="/faq" color="text.secondary" underline="none">
                      FAQ
                    </Link>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Entreprise
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Link component={RouterLink} to="/about" color="text.secondary" underline="none">
                      À propos
                    </Link>
                    <Link component={RouterLink} to="/contact" color="text.secondary" underline="none">
                      Contact
                    </Link>
                    <Link component={RouterLink} to="/careers" color="text.secondary" underline="none">
                      Carrières
                    </Link>
                    <Link component={RouterLink} to="/legal" color="text.secondary" underline="none">
                      Mentions légales
                    </Link>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Copyright */}
          <Box 
            sx={{ 
              borderTop: '1px solid', 
              borderColor: 'divider', 
              mt: 6, 
              pt: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'center', sm: 'flex-start' },
              gap: 2
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {new Date().getFullYear()} LocalAI RAG Cloud. Tous droits réservés.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Link component={RouterLink} to="/privacy" color="text.secondary" underline="none" variant="body2">
                Confidentialité
              </Link>
              <Link component={RouterLink} to="/terms" color="text.secondary" underline="none" variant="body2">
                Conditions
              </Link>
              <Link component={RouterLink} to="/security" color="text.secondary" underline="none" variant="body2">
                Sécurité
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
