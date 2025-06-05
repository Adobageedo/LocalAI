// /Users/edoardo/Documents/LocalAI/rag-frontend/src/components/chatbot/ConversationSidebar.jsx

import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  IconButton, 
  Box, 
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  styled
} from '@mui/material';
import { 
  Add as AddIcon, 
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  MoreVert as MoreVertIcon 
} from '@mui/icons-material';

const drawerWidth = 320;

const StyledDrawer = styled(Drawer)(({ theme, position = 'left' }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    borderRight: position === 'left' ? `1px solid ${theme.palette.divider}` : 'none',
    borderLeft: position === 'right' ? `1px solid ${theme.palette.divider}` : 'none',
    backgroundColor: 'rgba(250, 250, 250, 0.95)', // Light glass-like background (Apple style)
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  },
}));

export default function ConversationSidebar({
  open,
  conversations = [],
  currentConversation,
  onSelectConversation,
  onCreateConversation,
  onRenameConversation,
  onDeleteConversation,
  onToggleSidebar,
  position = 'left'
}) {
  // States for dialog controls
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const isMenuOpen = Boolean(menuAnchorEl);
  
  // Handle opening the menu
  const handleMenuOpen = (event, conversation) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedConversation(conversation);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Open rename dialog
  const handleOpenRenameDialog = () => {
    setNewTitle(selectedConversation?.title || '');
    setRenameDialogOpen(true);
    handleMenuClose();
  };
  
  // Handle rename submit
  const handleRenameSubmit = () => {
    if (selectedConversation && newTitle.trim()) {
      onRenameConversation(selectedConversation.id, newTitle);
      setRenameDialogOpen(false);
      setNewTitle('');
    }
  };
  
  // Open delete dialog
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  // Handle delete submit
  const handleDeleteSubmit = () => {
    if (selectedConversation) {
      onDeleteConversation(selectedConversation.id);
      setDeleteDialogOpen(false);
    }
  };
  
  // Format date to a readable format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    
    // Same day, show only time
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Within a week, show day name
    const daysDiff = Math.floor((today - date) / (24 * 60 * 60 * 1000));
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  return (
    <StyledDrawer
      variant="persistent"
      anchor={position}
      open={open}
      position={position}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Typography variant="h6">Conversations</Typography>
          <IconButton onClick={onToggleSidebar}>
            {position === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
        
        {/* New Chat Button - ChatGPT style with Apple aesthetics */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => onCreateConversation()}
            sx={{
              borderRadius: '12px',
              py: 1,
              justifyContent: 'flex-start',
              color: '#000',
              borderColor: 'rgba(0, 0, 0, 0.12)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
              '&:hover': {
                backgroundColor: 'rgba(0, 122, 255, 0.08)',
                borderColor: '#007AFF',
              },
              fontWeight: 500,
              textTransform: 'none'
            }}
          >
            New Chat
          </Button>
        </Box>
        <Divider />
      
        <List sx={{ overflow: 'auto', flexGrow: 1 }}>
        {conversations.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No conversations yet
            </Typography>
          </Box>
        )}
        
        {conversations.map((conversation) => (
          <ListItem 
            key={conversation.id} 
            selected={currentConversation?.id === conversation.id}
            onClick={() => onSelectConversation(conversation)}
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              borderRadius: 2,
              mb: 0.5,
              p: 1.5,
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                color: '#007AFF', // Apple blue
              }
            }}
          >
            <ListItemText 
              primary={
                <Typography noWrap>
                  {conversation.title || 'Untitled'}
                </Typography>
              } 
              secondary={
                <Typography variant="caption" color="text.secondary" noWrap>
                  {formatDate(conversation.created_at)}
                </Typography>
              }
            />
            <IconButton 
              edge="end" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMenuOpen(e, conversation);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListItem>
        ))}
      </List>
      
      {/* Conversation Options Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleOpenRenameDialog}>Rename</MenuItem>
        <MenuItem onClick={handleOpenDeleteDialog}>Delete</MenuItem>
      </Menu>
      
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            type="text"
            fullWidth
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameSubmit} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Conversation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSubmit} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </StyledDrawer>
  );
}
