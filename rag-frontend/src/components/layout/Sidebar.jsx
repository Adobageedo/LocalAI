import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Box,
  Avatar,
  Typography,
  Button,
  ListItemButton,
  Tooltip,
  useTheme,
  IconButton,
  Chip,
  Badge,
  ListSubheader
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../auth/AuthProvider';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import ChatIcon from '@mui/icons-material/Chat';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudIcon from '@mui/icons-material/Cloud';
import EmailIcon from '@mui/icons-material/Email';

const Sidebar = ({ width = 240, open = true, onClose, collapsed = false, onToggleCollapse }) => {
  const theme = useTheme();
  // Authentication removed
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items avec descriptions et badges
  const mainNavItems = [
    { name: 'Dashboard', icon: <DashboardIcon />, path: '/', description: 'Vue d\'ensemble', badge: null },
    { name: 'Dossiers', icon: <FolderIcon />, path: '/folders', description: 'Gestion des documents', badge: null },
    { name: 'Chatbot', icon: <ChatIcon />, path: '/chatbot', description: 'Interface de chat IA', badge: { text: 'AI', color: 'success' } },
  ];
  
  const userNavItems = [
    { name: 'Mon Profil', icon: <AccountCircleIcon />, path: '/profile', description: 'Informations personnelles' },
    { name: 'Préférences', icon: <SettingsIcon />, path: '/preferences', description: 'Personnalisation' },
  ];
  
  const integrationNavItems = [
    { name: 'Documents', icon: <CloudIcon />, path: '/document-explorer', description: 'Explorateur multi-stockage', badge: { text: 'New', color: 'success' } },
    { name: 'Import Email', icon: <EmailIcon />, path: '/mail-import', description: 'Gestion des emails', badge: { text: 'Email', color: 'warning' } },
  ];

  // Format display name (désactivé - mode sans authentification)
  const formatDisplayName = () => {
    return 'Utilisateur';
  };

  // Generate user initials for avatar (désactivé - mode sans authentification)
  const getUserInitials = () => {
    return 'U';
  };

  // Navigate to a path
  const navigateTo = (path) => {
    navigate(path);
    // Si la fonction onClose existe, l'appeler pour fermer le drawer sur mobile
    if (onClose) {
      onClose();
    }
  };

  // Logout handler (désactivé - mode sans authentification)
  const handleLogout = () => {
    // Fonction désactivée
    if (onClose) {
      onClose();
    }
  };

  // Check if the current item is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname.startsWith(path) && path !== '/';
  };

  const { isAuthenticated, logout } = useAuth();

  const handleSidebarLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {/* En-tête du Sidebar avec bouton de collapse et fermeture pour mobile */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
        {onToggleCollapse && (
          <IconButton 
            size="small" 
            onClick={onToggleCollapse} 
            sx={{ color: 'text.secondary' }}
            title={collapsed ? 'Étendre' : 'Réduire'}
          >
            {collapsed ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )}
          </IconButton>
        )}
        {!collapsed && onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      
      {/* User profile section - simplified for no-auth mode */}
      <Box 
        sx={{ 
          p: collapsed ? 1 : 2, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: theme.palette.mode === 'light' ? 'primary.lighter' : 'background.paper',
          borderRadius: 2,
          mb: 2,
          mx: 1,
        }}
      >
        <>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: collapsed ? 40 : 60,
              height: collapsed ? 40 : 60,
              fontSize: collapsed ? '1rem' : '1.5rem',
              fontWeight: 'bold',
              mb: collapsed ? 0 : 1
            }}
          >
            {getUserInitials()}
          </Avatar>
          
          {!collapsed && (
            <Typography variant="subtitle1" fontWeight="bold" sx={{ textAlign: 'center' }}>
              {formatDisplayName()}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 1 }}>
            Mode sans authentification
          </Typography>
        </>
      </Box>

      <Divider sx={{ mx: 1, my: 1 }} />

      {/* Main navigation items */}
      <List 
        sx={{ px: collapsed ? 0.5 : 1 }}
        subheader={
          <ListSubheader component="div" sx={{ bgcolor: 'transparent', color: 'text.secondary', fontWeight: 'bold', lineHeight: '2rem' }}>
            Navigation principale
          </ListSubheader>
        }
      >
        {mainNavItems.map((item) => (
          <ListItem 
            key={item.name}
            disablePadding
            sx={{ mb: 0.5 }}
          >
            {collapsed ? (
              <Tooltip title={item.name} placement="right">
                <ListItemButton
                  onClick={() => navigateTo(item.path)}
                  selected={isActive(item.path)}
                  sx={{
                    borderRadius: 2,
                    justifyContent: 'center',
                    py: 1.5,
                    '&.Mui-selected': {
                      bgcolor: theme.palette.mode === 'light' ? 'primary.lighter' : 'primary.dark',
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                      },
                    },
                  }}
                >
                  {item.icon}
                  {item.badge && (
                    <Badge
                      color={item.badge.color}
                      variant="dot"
                      sx={{ position: 'absolute', top: 6, right: 6 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                onClick={() => navigateTo(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: theme.palette.mode === 'light' ? 'primary.lighter' : 'primary.dark',
                    color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.name} 
                  secondary={item.description}
                  primaryTypographyProps={{ fontWeight: isActive(item.path) ? 'bold' : 'normal' }}
                />
                {item.badge && (
                  <Chip 
                    label={item.badge.text} 
                    color={item.badge.color} 
                    size="small" 
                    sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} 
                  />)}
              </ListItemButton>
            )}
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mx: 1, my: 1 }} />

      {/* Integrations section - visible for all users */}
      <List
        subheader={
          collapsed ? null : (
            <ListSubheader component="div" sx={{ bgcolor: 'transparent', color: 'text.secondary', fontWeight: 'bold', lineHeight: '2rem' }}>
              Intégrations
            </ListSubheader>
          )
        }
      >
        {integrationNavItems.map((item) => (
          <ListItem 
            key={item.name}
            disablePadding
            sx={{ mb: 0.5 }}
          >
            {collapsed ? (
              <Tooltip title={item.name} placement="right">
                <ListItemButton
                  onClick={() => navigateTo(item.path)}
                  selected={isActive(item.path)}
                  sx={{
                    borderRadius: 2,
                    justifyContent: 'center',
                    py: 1.5,
                    '&.Mui-selected': {
                      bgcolor: theme.palette.mode === 'light' ? 'primary.lighter' : 'primary.dark',
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                      },
                    },
                  }}
                >
                  {item.icon}
                  {item.badge && (
                    <Badge
                      color={item.badge.color}
                      variant="dot"
                      sx={{ position: 'absolute', top: 6, right: 6 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                onClick={() => navigateTo(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: theme.palette.mode === 'light' ? 'primary.lighter' : 'primary.dark',
                    color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.name} 
                  secondary={item.description}
                  primaryTypographyProps={{ fontWeight: isActive(item.path) ? 'bold' : 'normal' }}
                />
                {item.badge && (
                  <Chip 
                    label={item.badge.text} 
                    color={item.badge.color} 
                    size="small" 
                    sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} 
                  />)}
              </ListItemButton>
            )}
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mx: 1, my: 1 }} />

      {/* User section - always visible in no-auth mode */}
      <>
        <List
          subheader={
            collapsed ? null : (
              <ListSubheader component="div" sx={{ bgcolor: 'transparent', color: 'text.secondary', fontWeight: 'bold', lineHeight: '2rem' }}>
                Paramètres utilisateur
              </ListSubheader>
            )
          }
        >
          {userNavItems.map((item) => (
            <ListItem 
              key={item.name}
              disablePadding
              sx={{ mb: 0.5 }}
            >
              {collapsed ? (
                <Tooltip title={item.name} placement="right">
                  <ListItemButton
                    onClick={() => navigateTo(item.path)}
                    selected={isActive(item.path)}
                    sx={{
                      borderRadius: 2,
                      justifyContent: 'center',
                      py: 1.5,
                      '&.Mui-selected': {
                        bgcolor: theme.palette.mode === 'light' ? 'primary.lighter' : 'primary.dark',
                        '& .MuiListItemIcon-root': {
                          color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                        },
                      },
                    }}
                  >
                    {item.icon}
                    {item.badge && (
                      <Badge
                        color={item.badge.color}
                        variant="dot"
                        sx={{ position: 'absolute', top: 6, right: 6 }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              ) : (
                <ListItemButton
                  onClick={() => navigateTo(item.path)}
                  selected={isActive(item.path)}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: theme.palette.mode === 'light' ? 'primary.lighter' : 'primary.dark',
                      color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.name} />
                </ListItemButton>
              )}
            </ListItem>
          ))}
        </List>
      </>
      {isAuthenticated && (
        <Box sx={{ p: 2, mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={handleSidebarLogout}
          >
            Déconnexion
          </Button>
        </Box>
      )}
    </>
  );
};

export default Sidebar;
