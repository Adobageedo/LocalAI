import React, { useState, useEffect } from 'react';
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
  Stack,
  CircularProgress
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../auth/AuthProvider';
import { getConversations, deleteConversation } from '../../services/chatService';
import gdriveService from '../../lib/gdrive';

// Icons
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import FolderIcon from '@mui/icons-material/Folder';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import DeleteIcon from '@mui/icons-material/Delete';

const Sidebar = ({ width = 240, open = true, onClose, collapsed = false, onToggleCollapse }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // État pour les statuts d'authentification
  const [googleConnected, setGoogleConnected] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(true);
  
  // État pour stocker les conversations récupérées
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  
  // Effet pour récupérer les conversations et vérifier les statuts d'authentification
  useEffect(() => {
    // Récupérer les conversations
    const fetchConversations = async () => {
      setLoadingConversations(true);
      try {
        const data = await getConversations();
        if (Array.isArray(data)) {
          // Transformer les données pour inclure le chemin de navigation
          const formattedConversations = data.map(conv => ({
            ...conv,
            path: `/chatbot/${conv.id}`,
            date: new Date(conv.created_at || conv.updated_at || Date.now())
          }));
          setConversations(formattedConversations);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des conversations:', error);
      } finally {
        setLoadingConversations(false);
      }
    };

    // Fonction pour vérifier les statuts d'authentification
    const checkAuthStatus = async () => {
      try {
        // Vérifier le statut d'authentification Google
        const googleStatus = await gdriveService.checkAuthStatus();
        const isConnected = googleStatus.authenticated || false;
        setGoogleConnected(isConnected);
        // Vérifier le statut d'authentification Microsoft (à implémenter)
        // Pour l'instant, on laisse à false par défaut
        // Exemple de code à décommenter une fois le service Microsoft implémenté :
        // const msStatus = await microsoftService.checkAuthStatus();
        // setMicrosoftConnected(msStatus.isAuthenticated || false);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut d\'authentification', error);
      }
    };

    // Exécuter les deux fonctions
    fetchConversations();
    checkAuthStatus();
    
  }, []);

  // Format display name
  const formatDisplayName = () => {
    if (user?.name) {
      return user.name;
    }
    return 'Utilisateur';
  };

  // Generate user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      const nameParts = user.name.split(' ');
      if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[1][0]}`;
      }
      return user.name[0];
    }
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
  
  // Check if the current item is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname.startsWith(path) && path !== '/';
  };
  
  // Formatage de la date pour les conversations
  const formatDate = (date) => {
    if (!date) return '';
    const conversationDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Si c'est aujourd'hui
    if (conversationDate.toDateString() === today.toDateString()) {
      return conversationDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    // Si c'est hier
    else if (conversationDate.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    // Autrement, afficher la date au format court
    else {
      return conversationDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };
  
  // Grouper les conversations par période
  const groupConversationsByDate = (conversations) => {
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    
    // Initialiser les groupes
    const groups = {
      today: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };
    
    // Trier les conversations par date (plus récentes d'abord)
    const sortedConversations = [...conversations].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Grouper les conversations
    sortedConversations.forEach(conv => {
      const convDate = new Date(conv.date);
      const diffTime = today.getTime() - convDate.getTime();
      
      if (convDate.toDateString() === today.toDateString()) {
        groups.today.push(conv);
      } else if (diffTime < oneWeek) {
        groups.thisWeek.push(conv);
      } else if (diffTime < oneMonth) {
        groups.thisMonth.push(conv);
      } else {
        groups.older.push(conv);
      }
    });
    
    return groups;
  };
  
  // Supprimer une conversation
  const handleDeleteConversation = async (event, conversationId) => {
    event.stopPropagation(); // Empêcher la navigation vers la conversation
    event.preventDefault();
    
    if (window.confirm('Voulez-vous vraiment supprimer cette conversation?')) {
      try {
        const success = await deleteConversation(conversationId);
        if (success) {
          // Rafraîchir la liste des conversations
          const data = await getConversations();
          if (Array.isArray(data)) {
            const formattedConversations = data.map(conv => ({
              ...conv,
              path: `/chatbot/${conv.id}`,
              date: new Date(conv.created_at || conv.updated_at || Date.now())
            }));
            setConversations(formattedConversations);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de la conversation:', error);
      }
    }
  };
  
  // Authentification Google
  const connectGoogle = async () => {
    try {
      // Utiliser le service Google Drive pour obtenir l'URL d'authentification
      const callbackUrl = window.location.origin + '/auth/google/callback';
      const result = await gdriveService.getAuthUrl(callbackUrl);
      
      // Ouvrir l'URL d'authentification dans une nouvelle fenêtre/onglet
      if (result.auth_url) {
        window.open(result.auth_url, '_blank');
      } else {
        console.error('URL d\'authentification Google non disponible');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'URL d\'authentification Google:', error);
    }
  };
  
  // Authentification Microsoft
  const connectMicrosoft = async () => {
    try {
      // Placeholder en attendant l'implémentation du service Microsoft
      console.log('Tentative de connexion à Microsoft...');
      alert('Fonctionnalité de connexion Microsoft à venir!');
    } catch (error) {
      console.error('Erreur lors de la connexion à Microsoft:', error);
    }
  };
  
  // Gestion des documents
  const manageDocuments = () => {
    navigateTo('/document-explorer');
  };
  
  // Paramètres
  const openSettings = () => {
    navigateTo('/preferences');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {/* En-tête du Sidebar avec bouton de collapse et fermeture pour mobile */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!collapsed && <Typography variant="subtitle1" fontWeight="bold">RAG Assistant</Typography>}
        </Box>
        {onToggleCollapse && (
          <IconButton 
            size="small" 
            onClick={onToggleCollapse} 
            sx={{ color: 'text.secondary' }}
            title={collapsed ? 'Étendre' : 'Réduire'}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
        {!collapsed && onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      
      {/* User profile section */}
      <Box 
        sx={{ 
          p: collapsed ? 1 : 2, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: theme.palette.mode === 'light' ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
          borderRadius: 1,
          mb: 2,
          mx: 1,
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: collapsed ? 40 : 56,
            height: collapsed ? 40 : 56,
            fontSize: collapsed ? '1rem' : '1.25rem',
            fontWeight: 'bold',
            mb: collapsed ? 0 : 1
          }}
        >
          {getUserInitials()}
        </Avatar>
        
        {!collapsed && (
          <Typography variant="subtitle1" sx={{ textAlign: 'center', fontWeight: 500 }}>
            {formatDisplayName()}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mx: 1, my: 1 }} />

      {/* Bouton de création de nouvelle conversation */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={!collapsed ? <AddIcon /> : null}
          onClick={() => navigateTo('/chatbot')}
          fullWidth
          sx={{
            borderRadius: collapsed ? '50%' : 1,
            minWidth: collapsed ? 40 : 'auto',
            width: collapsed ? 40 : '100%',
            height: collapsed ? 40 : 'auto',
            p: collapsed ? 1 : 'inherit',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {!collapsed && 'Nouvelle conversation'}
          {collapsed && <AddIcon />}
        </Button>
      </Box>

      {/* Liste des conversations */}
      <List
        sx={{ 
          px: 1,
          flex: 1,
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '10px',
          },
        }}
      >
        {loadingConversations ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Aucune conversation
            </Typography>
          </Box>
        ) : (
          Object.entries(groupConversationsByDate(conversations)).map(([group, groupConversations]) => {
            if (groupConversations.length === 0) return null;
            
            // Déterminer le titre du groupe
            let groupTitle = '';
            switch (group) {
              case 'today': groupTitle = 'Aujourd\'hui'; break;
              case 'thisWeek': groupTitle = 'Cette semaine'; break;
              case 'thisMonth': groupTitle = 'Ce mois-ci'; break;
              case 'older': groupTitle = 'Plus ancien'; break;
              default: groupTitle = '';
            }
            
            return (
              <React.Fragment key={group}>
                {/* Afficher le titre du groupe si on est en mode étendu */}
                {!collapsed && groupConversations.length > 0 && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      px: 2, 
                      py: 0.5, 
                      display: 'block', 
                      color: 'text.secondary',
                      fontWeight: 500
                    }}
                  >
                    {groupTitle}
                  </Typography>
                )}
                
                {/* Conversations du groupe */}
                {groupConversations.map((conversation, index) => (
                  <ListItemButton
                    key={conversation.id || `${group}-${index}`}
                    selected={isActive(conversation.path)}
                    onClick={() => navigateTo(conversation.path)}
                    sx={{
                      borderRadius: '8px',
                      my: 0.5,
                      px: 2,
                      py: 1,
                      minHeight: '44px',
                      position: 'relative',
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        '& .delete-icon': {
                          display: 'flex',
                        },
                      },
                    }}
                    data-testid={`conversation-${group}-${index}`}
                  >
                    <ListItemIcon sx={{ minWidth: !collapsed ? 36 : 0, color: 'inherit' }}>
                      <ChatIcon fontSize="small" />
                    </ListItemIcon>
                    
                    {!collapsed && (
                      <>
                        <ListItemText 
                          primary={conversation.title || conversation.name || 'New Conversation'} 
                          secondary={formatDate(conversation.date)}
                          primaryTypographyProps={{ 
                            noWrap: true,
                            sx: { maxWidth: '160px' }
                          }}
                        />
                        
                        {/* Bouton de suppression qui apparaît au survol */}
                        <IconButton 
                          className="delete-icon"
                          size="small" 
                          onClick={(e) => handleDeleteConversation(e, conversation.id)}
                          sx={{ 
                            display: 'none',
                            position: 'absolute',
                            right: 8,
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'error.light',
                              color: 'error.dark',
                            },
                          }}
                          aria-label="Supprimer la conversation"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    
                    {/* Version compacte : icône de suppression au survol */}
                    {collapsed && (
                      <IconButton 
                        className="delete-icon"
                        size="small" 
                        onClick={(e) => handleDeleteConversation(e, conversation.id)}
                        sx={{ 
                          display: 'none',
                          position: 'absolute',
                          right: 4,
                          color: 'error.main',
                          p: 0.5,
                          '&:hover': {
                            backgroundColor: 'error.light',
                            color: 'error.dark',
                          },
                        }}
                        aria-label="Supprimer la conversation"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ListItemButton>
                ))}
              </React.Fragment>
            );
          })
        )}
      </List>

      {/* Boutons en bas de sidebar */}
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Divider sx={{ mx: 1, mb: 1 }} />
        
        <Stack spacing={1} sx={{ px: 2, pb: 2 }}>
          {/* Bouton Google (conditionnel s'il n'est pas connecté) */}
          {!googleConnected && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={!collapsed ? <GoogleIcon /> : null}
              onClick={connectGoogle}
              fullWidth
              sx={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 1,
                py: 0.75,
                ...(collapsed && {
                  minWidth: 0,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  p: 1,
                })
              }}
            >
              {!collapsed && 'Connecter Google'}
              {collapsed && <GoogleIcon />}
            </Button>
          )}
          
          {/* Bouton Microsoft (conditionnel s'il n'est pas connecté) */}
          {!microsoftConnected && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={!collapsed ? <MicrosoftIcon /> : null}
              onClick={connectMicrosoft}
              fullWidth
              sx={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 1,
                py: 0.75,
                ...(collapsed && {
                  minWidth: 0,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  p: 1,
                })
              }}
            >
              {!collapsed && 'Connecter Microsoft'}
              {collapsed && <MicrosoftIcon />}
            </Button>
          )}
          
          {/* Bouton Documents */}
          <Button
            variant="text"
            color="inherit"
            size="small"
            startIcon={!collapsed ? <FolderIcon /> : null}
            onClick={manageDocuments}
            fullWidth
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 1,
              py: 0.75,
              ...(collapsed && {
                minWidth: 0,
                width: 40,
                height: 40,
                p: 1,
              })
            }}
          >
            {!collapsed && 'Documents'}
            {collapsed && <FolderIcon />}
          </Button>
          
          {/* Bouton d'importation d'emails */}
          <Button
            variant="text"
            color="inherit"
            size="small"
            startIcon={!collapsed ? <EmailIcon /> : null}
            onClick={() => navigateTo('/mail-import')}
            fullWidth
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 1,
              py: 0.75,
              ...(collapsed && {
                minWidth: 0,
                width: 40,
                height: 40,
                p: 1,
              })
            }}
          >
            {!collapsed && 'Import Email'}
            {collapsed && <EmailIcon />}
          </Button>
          
          {/* Bouton Paramètres */}
          <Button
            variant="text"
            color="inherit"
            size="small"
            startIcon={!collapsed ? <SettingsIcon /> : null}
            onClick={openSettings}
            fullWidth
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 1,
              py: 0.75,
              ...(collapsed && {
                minWidth: 0,
                width: 40,
                height: 40,
                p: 1,
              })
            }}
          >
            {!collapsed && 'Paramètres'}
            {collapsed && <SettingsIcon />}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default Sidebar;