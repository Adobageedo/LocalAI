import React, { useState } from "react";
import { Box, CssBaseline, useMediaQuery, Drawer, IconButton, useTheme, Container, Paper, Typography, Breadcrumbs, Link, Fade, Grow, AppBar, Toolbar } from "@mui/material";
import Sidebar from "./Sidebar";
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import SyncStatusBar from "./SyncStatusBar";

export default function Layout({ children, sidebarOpen = true }) {
  // Track collapsed state for the sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Authentication removed
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const DRAWER_WIDTH = 260;
  const COLLAPSED_DRAWER_WIDTH = 70; // Width when showing only icons
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
          {sidebarOpen && (
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', md: 'block' },
                width: sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
                  boxSizing: 'border-box',
                  borderRight: `1px solid ${theme.palette.divider}`,
                  boxShadow: theme.palette.mode === 'light' ? '0px 2px 10px rgba(0, 0, 0, 0.05)' : 'none',
                  transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
                },
              }}
            >
              <Sidebar 
                width={sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH} 
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </Drawer>
          )}
        </>
      
      <Box 
        component="div" 
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { 
            xs: '100%', 
            md: sidebarOpen 
              ? sidebarCollapsed 
                ? `calc(100% - ${COLLAPSED_DRAWER_WIDTH}px)` 
                : `calc(100% - ${DRAWER_WIDTH}px)` 
              : '100%' 
          },
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
                  LocalAI
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
        
        {/* Sync Status Bar - will only display when there are active synchronizations */}
        <SyncStatusBar />
        
        <Box sx={{ flexGrow: 1 }}>
          
          <Grow in={true} timeout={300}>
            <Box 
              component="main" 
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: theme.palette.mode === 'light' ? '0px 2px 10px rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              {children}
            </Box>
          </Grow>
        </Box>
        
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
              <img src="/logo-small.png" alt="LocalAI" height="24" style={{ opacity: 0.8 }} />
              <span>&copy; {new Date().getFullYear()} LocalAI</span>
            </Box>
            <Box sx={{ mt: 1, fontSize: '0.75rem', opacity: 0.7 }}>
              <span>Intégrations : Google Drive | Gmail | Microsoft Outlook</span>
            </Box>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
