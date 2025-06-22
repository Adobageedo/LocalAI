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
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Person as PersonIcon,
  SmartToy as AssistantIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  FilePresent as FileIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

// Simple message bubbles without animations
const UserMessageBubble = styled(Box)(({ theme }) => ({
  backgroundColor: '#007AFF',
  color: '#FFFFFF',
  borderRadius: '10px',
  padding: '10px 14px',
  maxWidth: '85%'
}));

const AssistantMessageBubble = styled(Box)(({ theme }) => ({
  backgroundColor: '#f0f0f0',
  color: '#000000',
  borderRadius: '10px',
  padding: '10px 14px',
  maxWidth: '85%'
}));

// Message component with support for markdown and source display
export default function ChatMessage({ message, isLatest }) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const hasSources = message.sources && message.sources.length > 0;
  
  // Determine message style based on role
  const isUser = message.role === 'user';
  
  // Select the appropriate message bubble based on role
  const MessageBubble = isUser ? UserMessageBubble : AssistantMessageBubble;
  
  // Handle source click for download
  const handleSourceClick = (source) => {
    try {
      // Get the file path from the source (handle both string and object formats)
      const filePath = getSourcePath(source);
      if (!filePath) {
        setNotification({
          open: true,
          message: 'No valid file path found for this source',
          severity: 'error'
        });
        return;
      }
      
      // Download the file
      downloadSource(filePath);
      
      // Show success notification
      setNotification({
        open: true,
        message: `Downloading ${getFileName(filePath)}...`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading source:', error);
      setNotification({
        open: true,
        message: `Error downloading file: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle notification close
  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Format the timestamp - simplified
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  
  // Get file name from path
  const getFileName = (path) => {
    if (!path) return 'Unknown Document';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  // Get source path from source (could be string or object)
  const getSourcePath = (source) => {
    if (!source) return null;
    if (typeof source === 'string') return source;
    return source.source || source.path || null;
  };

  // Download a source document
  const downloadSource = (path) => {
    if (!path) return;
    
    // Clean the path - remove any leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Create the download URL using the file_management_router endpoint
    const downloadUrl = `${API_BASE_URL}/download?path=${encodeURIComponent(cleanPath)}`;
    
    // Open in a new window/tab or use a hidden iframe technique
    // This triggers the browser's download functionality
    window.open(downloadUrl, '_blank');
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

  const messageContent = (
    <Box sx={{
      display: 'flex', 
      flexDirection: isUser ? 'row-reverse' : 'row',
      mb: 2,
      px: 1
    }}
    data-tour={isUser ? 'user-message' : 'ai-response'}>
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
                cursor: 'pointer'
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
                      backgroundColor: '#f5f5f7',
                      borderRadius: 1,
                      mb: 0.5,
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSourceClick(source)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {(() => {
                        const path = getSourcePath(source);
                        return path && path.toLowerCase().endsWith('.pdf') ?
                          <DocumentIcon fontSize="small" color="error" /> : 
                          <FileIcon fontSize="small" color="primary" />;
                      })()}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Tooltip title={getSourcePath(source) || 'Unknown Source'}>
                          <Typography variant="body2" noWrap sx={{ color: '#007AFF' }}>
                            {getFileName(getSourcePath(source))}
                          </Typography>
                        </Tooltip>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {source.page && (
                            <Typography variant="caption" sx={{ mr: 1 }}>
                              Page {source.page}
                            </Typography>
                          )}
                          <DownloadIcon fontSize="inherit" sx={{ fontSize: '0.875rem', opacity: 0.6 }} />
                        </Box>
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

  return (
    <>
      {/* Main message component */}
      {messageContent}
      
      {/* Notification snackbar for download status */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={5000} 
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleNotificationClose} 
          severity={notification.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
}
