// /Users/edoardo/Documents/LocalAI/rag-frontend/src/components/chatbot/ChatMessage.jsx

import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Paper, 
  Typography, 
  Box,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Person as PersonIcon,
  SmartToy as AssistantIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

// Styled components for message bubbles
const UserMessageBubble = styled(Box)(({ theme }) => ({
  backgroundColor: '#007AFF', // Apple blue
  color: '#FFFFFF',
  borderRadius: '18px 18px 4px 18px',
  padding: '12px 16px',
  maxWidth: '85%',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    right: '-8px',
    width: '15px',
    height: '15px',
    borderRadius: '0 0 0 15px',
    backgroundColor: '#007AFF',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    display: 'none' // Hide the tail by default
  }
}));

const AssistantMessageBubble = styled(Box)(({ theme }) => ({
  backgroundColor: '#F0F0F0', // Light gray bubble
  color: '#000000',
  borderRadius: '18px 18px 18px 4px',
  padding: '12px 16px',
  maxWidth: '85%',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: '-8px',
    width: '15px',
    height: '15px',
    borderRadius: '0 0 15px 0',
    backgroundColor: '#F0F0F0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    display: 'none' // Hide the tail by default
  }
}));

// Message component with support for markdown and source display
export default function ChatMessage({ message, isLatest }) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const hasSources = message.sources && message.sources.length > 0;
  
  // Determine message style based on role
  const isUser = message.role === 'user';
  
  // Select the appropriate message bubble based on role
  const MessageBubble = isUser ? UserMessageBubble : AssistantMessageBubble;

  // Format the timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get file name from path
  const getFileName = (path) => {
    if (!path) return 'Unknown Document';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };
  
  // Component for rendering code blocks in markdown
  const CodeBlock = ({node, inline, className, children, ...props}) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={materialLight}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        mb: 2,
        width: '100%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, opacity: 0.8 }}>
        {isUser ? (
          <>
            <Typography variant="body2" sx={{ 
              mt: 1, 
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isUser ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)' 
            }}>
              You
            </Typography>
            <PersonIcon fontSize="small" color="primary" />
          </>
        ) : (
          <>
            <AssistantIcon fontSize="small" color="secondary" sx={{ mr: 1 }} />
            <Typography variant="body2" sx={{ 
              mt: 1, 
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isUser ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)' 
            }}>
              Assistant
            </Typography>
          </>
        )}
        <Typography variant="body2" sx={{ 
          mt: 1, 
          fontSize: '0.85rem',
          fontWeight: 500,
          color: isUser ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)' 
        }}>
          {formatTime(message.timestamp)}
        </Typography>
      </Box>

      <MessageBubble sx={{
        wordBreak: 'break-word'
      }}>
        <Box sx={{ 
          overflow: 'auto', 
          '& pre': { 
            borderRadius: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto'
          }
        }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,
            }}
          >
            {message.content || message.message || ''}
          </ReactMarkdown>
        </Box>

        {/* Sources section */}
        {hasSources && (
          <Box sx={{ mt: 2 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 }
              }}
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
            >
              <Chip 
                size="small" 
                label={`${message.sources.length} source${message.sources.length > 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <IconButton size="small">
                {sourcesExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
            
            <Collapse in={sourcesExpanded}>
              <List dense sx={{ mt: 1 }}>
                {message.sources.map((source, index) => (
                  <ListItem 
                    key={index} 
                    sx={{ 
                      py: 0.5, 
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      borderRadius: 1,
                      mb: 0.5
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <DocumentIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Tooltip title={source.source || source.path || 'Unknown Source'}>
                          <Typography variant="body2" noWrap>
                            {getFileName(source.source || source.path)}
                          </Typography>
                        </Tooltip>
                      }
                      secondary={
                        source.page && (
                          <Typography variant="caption">
                            Page {source.page}
                          </Typography>
                        )
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        )}
      </MessageBubble>
    </Box>
  );
}
