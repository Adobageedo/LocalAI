import React, { useState } from "react";
import { Box, CssBaseline, useMediaQuery, Drawer, IconButton, useTheme, Container, Paper, Typography, Breadcrumbs, Link, Fade, Grow, AppBar, Toolbar } from "@mui/material";
import Sidebar from "./Sidebar";
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useLocation, Link as RouterLink } from 'react-router-dom';

export default function Layout({ children }) {
  // Authentication removed
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const DRAWER_WIDTH = 260;
  const location = useLocation();
  
  // Fonction pour générer des fils d'Ariane à partir du chemin actuel
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '');
    if (pathSegments.length === 0) return [{ name: 'Accueil', path: '/' }];
    
    let breadcrumbs = [{ name: 'Accueil', path: '/' }];
    let currentPath = '';
    
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const formattedSegment = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ name: formattedSegment, path: currentPath });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'light' ? '#f5f5f9' : '#121212' }}>
      <CssBaseline />
      
      {/* Afficher la barre latérale pour tous les utilisateurs */}
        <>  
          {/* Version mobile */}
          {isMobile && (
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better performance on mobile
              }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
              }}
            >
              <Sidebar width={DRAWER_WIDTH} onClose={handleDrawerToggle} />
            </Drawer>
          )}
          
          {/* Version desktop */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              width: DRAWER_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                borderRight: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === 'light' ? '0px 2px 10px rgba(0, 0, 0, 0.05)' : 'none'
              },
            }}
          >
            <Sidebar width={DRAWER_WIDTH} />
          </Drawer>
        </>
      
      <Box 
        component="div" 
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            backgroundColor: 'background.paper', 
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
            boxShadow: theme.palette.mode === 'light' ? '0px 2px 10px rgba(0, 0, 0, 0.05)' : 'none'
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isMobile && (
                <IconButton 
                  color="inherit" 
                  edge="start" 
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <img 
                  src="/images/logo.png" 
                  alt="LocalAI" 
                  style={{ 
                    height: '30px', 
                    maxWidth: '40px', 
                    objectFit: 'contain',
                    marginRight: '12px' 
                  }} 
                />
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  LocalAI RAG
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3, px: { xs: 2, sm: 3 } }}>
          {/* Fil d'Ariane */}
          <Breadcrumbs 
            aria-label="breadcrumb" 
            sx={{ 
              mb: 2, 
              '& .MuiBreadcrumbs-ol': { 
                flexWrap: 'nowrap', 
                overflow: 'auto',
                msOverflowStyle: 'none', /* for IE and Edge */
                scrollbarWidth: 'none', /* for Firefox */
                '&::-webkit-scrollbar': {
                  display: 'none' /* for Chrome, Safari, and Opera */
                },
              } 
            }}
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return isLast ? (
                <Typography key={crumb.path} color="text.primary" sx={{ fontWeight: 'bold' }}>
                  {crumb.name}
                </Typography>
              ) : (
                <Link 
                  key={crumb.path} 
                  component={RouterLink} 
                  to={crumb.path} 
                  color="inherit"
                  sx={{
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {crumb.name}
                </Link>
              );
            })}
          </Breadcrumbs>
          
          <Grow in={true} timeout={300}>
            <Box 
              component="main" 
              sx={{ 
                flexGrow: 1,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: theme.palette.mode === 'light' ? '0px 2px 10px rgba(0, 0, 0, 0.05)' : 'none',
                p: { xs: 2, sm: 3 }
              }}
            >
              {children}
            </Box>
          </Grow>
        </Container>
        
        <Fade in={true} timeout={500}>
          <Box 
            component="footer" 
            sx={{ 
              p: 2, 
              mt: 2,
              textAlign: 'center',
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              fontSize: '0.875rem',
              boxShadow: theme.palette.mode === 'light' ? '0px -2px 10px rgba(0, 0, 0, 0.03)' : 'none'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <img src="/logo-small.png" alt="NewsflIx" height="24" style={{ opacity: 0.8 }} />
              <span>&copy; {new Date().getFullYear()} NewsflIx RAG Platform</span>
            </Box>
            <Box sx={{ mt: 1, fontSize: '0.75rem', opacity: 0.7 }}>
              <span>Intégrations : Nextcloud | IMAP Email | RAG AI</span>
            </Box>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
