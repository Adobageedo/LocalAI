// /Users/edoardo/Documents/LocalAI/rag-frontend/src/components/chatbot/ChatInterface.jsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography, 
  CircularProgress,
  Divider,
  Tooltip,
  AppBar,
  Toolbar,
  useTheme
} from '@mui/material';
import { 
  Send as SendIcon, 
  Settings as SettingsIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import ChatMessage from './ChatMessage';
export default function ChatInterface({ 
  messages = [], 
  onSendMessage, 
  loading = false,
  conversation,
  settings,
  onToggleSidebar,
  onOpenSettings
}) {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (inputValue.trim() && !loading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };
  
  // Handle enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      backgroundColor: '#FBFBFD', // Apple-style light background
    }}>
      {/* Top toolbar */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Slightly translucent
        backdropFilter: 'blur(10px)', // Apple-style blur
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={onToggleSidebar}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
              ml: 1
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
        <Typography variant="h6" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {conversation ? (conversation.title || 'Untitled') : 'New Conversation'}
        </Typography>
        {/* Chat settings button */}
        <Tooltip title="Chat Settings">
          <IconButton color="inherit" onClick={onOpenSettings}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Message container */}
      <Box 
        ref={messageContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2, 
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: '#FBFBFD', // Apple-style light background
          backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(200, 200, 200, 0.15) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(200, 200, 200, 0.15) 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        {messages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              height: '100%',
              opacity: 0.7
            }}
          >
            <Typography variant="h5" gutterBottom>
              Welcome to LocalAI Chat
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '60%' }}>
              Ask questions, get intelligent responses with context from your documents.
            </Typography>
            
            {/* Model info */}
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Current model: {settings.model}
              </Typography>
              
              {settings.useRetrieval && (
                <Typography variant="caption" color="text.secondary">
                  Document retrieval enabled
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={msg.id || index}
              message={msg}
              isLatest={index === messages.length - 1}
            />
          ))
        )}
        
        {/* Loading indicator when waiting for a response */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={30} />
          </Box>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Input area */}
      <Box sx={{ 
        px: 2, 
        py: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
      }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          InputProps={{
            endAdornment: (
              <IconButton 
                onClick={handleSubmit}
                disabled={!inputValue.trim() || loading}
                sx={{
                  backgroundColor: !inputValue.trim() || loading ? '#E2E2E2' : '#007AFF',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  '&:hover': {
                    backgroundColor: !inputValue.trim() || loading ? '#E2E2E2' : '#0069D9',
                  },
                  transition: 'background-color 0.2s'
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            ),
            sx: { 
              pr: 1,
              borderRadius: '24px',
              backgroundColor: '#F5F5F7',
              '&:hover': {
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              },
              transition: 'all 0.2s ease'
            }
          }}
          sx={{ 
            mt: 1,
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: '24px',
              '& fieldset': {
                borderColor: 'rgba(0,0,0,0.1)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(0,0,0,0.2)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007AFF',
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}
