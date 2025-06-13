// /Users/edoardo/Documents/LocalAI/rag-frontend/src/components/chatbot/ChatInterface.jsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';
import { 
  Send as SendIcon, 
  Menu as MenuIcon
} from '@mui/icons-material';
import ChatMessage from './ChatMessage';
export default function ChatInterface({ 
  messages = [], 
  onSendMessage, 
  loading = false,
  conversation,
  settings,
  onToggleSidebar
}) {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  
  // Scroll to bottom when messages change - no smooth animation
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
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
      {/* Simplified App Bar */}
      <Box 
        component="header" 
        sx={{ 
          p: 1,
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: 'white', 
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <IconButton 
          onClick={onToggleSidebar}
          sx={{ ml: 1 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', ml: 1 }}>
          {conversation ? (conversation.name || conversation.title || 'Untitled') : 'New Conversation'}
        </Typography>
      </Box>
      
      {/* Message container - simplified */}
      <Box 
        ref={messageContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2, 
          backgroundColor: '#f5f5f7'
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
              height: '100%'
            }}
          >
            <Typography variant="h5" gutterBottom>
              LocalAI Chat
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '60%' }}>
              Ask questions about your documents.
            </Typography>
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
        
        {/* Enhanced fun loading animation */}
        {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2,
            ml: 3,
            mt: 1,
            mb: 2,
            borderRadius: '10px',
            backgroundColor: '#f0f0f0',
            maxWidth: '85%'
          }}>
            <CircularProgress size={20} sx={{ mr: 2, color: '#007AFF' }} />
            <Typography variant="body2">
              {[
                "Looking for answers in the digital haystack...",
                "Converting coffee into responses...",
                "Teaching AI to think like humans (but faster)...",
                "Consulting the digital oracle...",
                "Searching through the knowledge matrix..."
              ][Math.floor(Math.random() * 5)]}
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Input container */}
      <Box sx={{ p: 1.5, backgroundColor: 'white', borderTop: `1px solid ${theme.palette.divider}` }}>
        <Paper
          component="form"
          elevation={0}
          onSubmit={(e) => handleSubmit(e)}
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: 2
          }}
        >
          <TextField
            fullWidth
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            multiline
            maxRows={4}
            onKeyDown={handleKeyDown}
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                border: 'none',
                '& fieldset': { border: 'none' },
              }
            }}
          />
          <IconButton 
            color="primary" 
            type="submit"
            disabled={inputValue.trim() === ''}
          >
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
    </Box>
  );
}
