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
  FilePresent as FileIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Email as EmailIcon,
  InsertDriveFile as DriveFileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoIcon,
  Article as WordIcon,
  TableChart as ExcelIcon,
  Slideshow as PowerPointIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { openSource, getFileName, getSourceIcon, getSourceDisplayName } from '../../utils/sourceHandler';

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
  //const safeMarkdown = `\`\`\`jsx
//${message.content || message.message || ''}
//\`\`\``;


  const wrapIfCode = (text) => {
    // More comprehensive detection of code patterns
    if (!text) return '';
    
    const codePatterns = [
      // HTML/JSX tags
      /<[a-zA-Z][a-zA-Z0-9]*[\s\/]+|<\/[a-zA-Z][a-zA-Z0-9]*>/,
      // JavaScript keywords and patterns
      /\b(function|const|let|var|return|import|export|class|extends|=>|async|await)\b/,
      // Object/array syntax
      /\{\s*['"\w]+\s*:/,
      /\[[\s\S]*?\]\s*[,;]?\s*$/,
      // Common programming patterns
      /\([^)]*\)\s*=>\s*\{/,
      // Function calls with parameters
      /\w+\([^)]*\);?$/m
    ];
    
    // Check if any pattern matches but avoid matching plain English text
    // that might contain a keyword but isn't actual code
    const isLikelyCode = codePatterns.some(pattern => pattern.test(text)) &&
      // Avoid false positives by checking line count or special characters
      (text.split('\n').length > 2 || /[{}\[\];]/.test(text));
      
    // Try to detect the language
    let language = 'jsx';
    if (isLikelyCode) {
      if (text.includes('import React') || text.includes('<') && text.includes('/>')) {
        language = 'jsx';
      } else if (text.includes('def ') && text.includes(':') && !text.includes(';')) {
        language = 'python';
      } else if (text.includes('func ') && text.includes('{')) {
        language = 'go';
      } else if (text.includes('#include') || text.includes('int main')) {
        language = 'cpp';
      }
    }
    
    return isLikelyCode ? `\`\`\`${language}\n${text}\n\`\`\`` : text;
  };
  
  // Apply code wrapping if needed
  const messageText = message.content || message.message || '';
  const safeMarkdown = wrapIfCode(messageText);
  // Select the appropriate message bubble based on role
  const MessageBubble = isUser ? UserMessageBubble : AssistantMessageBubble;
  
  // Handle source click based on source type
  const handleSourceClick = (source) => {
    try {
      // Use the sourceHandler utility to handle different source types
      const result = openSource(source);
      
      // Show notification based on result
      setNotification({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error'
      });
    } catch (error) {
      console.error('Error handling source:', error);
      setNotification({
        open: true,
        message: `Error opening source: ${error.message}`,
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
  
  // Get source path from source (could be string or object)
  const getSourcePath = (source) => {
    if (!source) return null;
    if (typeof source === 'string') return source;
    return source.source || source.path || null;
  };
  
  // Get source type from source object or path
  const getSourceType = (source) => {
    if (!source) return 'personal_storage';
    
    // If source has explicit type, use it
    if (source.type) return source.type;
    
    // Otherwise infer from path
    const path = getSourcePath(source);
    if (!path) return 'personal_storage';
    
    if (path.startsWith('/google_email/')) {
      return 'google_email';
    } else if (path.startsWith('/microsoft_email/')) {
      return 'microsoft_email';
    } else if (path.startsWith('/google_drive/')) {
      return 'google_storage';
    } else {
      return 'personal_storage';
    }
  };
  
  // Get appropriate icon component based on source type and file extension
  const getSourceIconComponent = (source) => {
    const sourceType = getSourceType(source);
    const path = getSourcePath(source);
    const iconType = getSourceIcon({ type: sourceType, path });
    
    switch (iconType) {
      case 'email':
        return <EmailIcon fontSize="small" color="primary" />;
      case 'pdf':
        return <PdfIcon fontSize="small" color="error" />;
      case 'word':
        return <WordIcon fontSize="small" color="primary" />;
      case 'excel':
        return <ExcelIcon fontSize="small" color="success" />;
      case 'powerpoint':
        return <PowerPointIcon fontSize="small" color="warning" />;
      case 'image':
        return <ImageIcon fontSize="small" color="secondary" />;
      case 'video':
        return <VideoIcon fontSize="small" color="secondary" />;
      case 'file':
      default:
        return sourceType === 'google_storage' ? 
          <DriveFileIcon fontSize="small" color="primary" /> : 
          <FileIcon fontSize="small" color="primary" />;
    }
  };

  // Component for rendering code blocks in markdown with enhanced UI
  const CodeBlock = ({node, inline, className, children, ...props}) => {
    const match = /language-(\w+)/.exec(className || '');
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
      const code = String(children).replace(/\n$/, '');
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    if (inline) {
      return <code className={className} {...props}>{children}</code>;
    }
    
    if (match) {
      const language = match[1];
      const displayLanguage = {
        'jsx': 'React JSX',
        'js': 'JavaScript',
        'ts': 'TypeScript',
        'tsx': 'TypeScript JSX',
        'py': 'Python',
        'python': 'Python',
        'go': 'Go',
        'cpp': 'C++',
        'java': 'Java',
        'json': 'JSON',
        'html': 'HTML',
        'css': 'CSS'
      }[language] || language.toUpperCase();
      
      return (
        <Box sx={{
          position: 'relative',
          my: 2,
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
        }}>
          {/* Code header with language display and copy button */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: 0.7,
            backgroundColor: '#f6f8fa',
            borderBottom: '1px solid #e1e4e8',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            color: '#57606a'
          }}>
            <Box>{displayLanguage}</Box>
            <IconButton 
              size="small" 
              onClick={handleCopy}
              sx={{ 
                fontSize: '0.85rem',
                p: 0.5,
                color: copied ? '#22863a' : '#57606a'
              }}
            >
              {copied ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <span>Copied!</span>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ContentCopyIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <span>Copy</span>
                </Box>
              )}
            </IconButton>
          </Box>
          
          {/* Syntax highlighted code */}
          <SyntaxHighlighter
            style={materialLight}
            language={language}
            showLineNumbers={language !== 'text'}
            wrapLines={true}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: 0,
              fontSize: '0.9rem'
            }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </Box>
      );
    }
    
    return <code className={className} {...props}>{children}</code>;
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
            {safeMarkdown}
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
                      {getSourceIconComponent(source)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Tooltip title={getSourcePath(source) || 'Unknown Source'}>
                          <Typography variant="body2" noWrap sx={{ color: '#007AFF' }}>
                            {getSourceDisplayName(source)}
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
                          {getSourceType(source) === 'personal_storage' ? (
                            <DownloadIcon fontSize="inherit" sx={{ fontSize: '0.875rem', opacity: 0.6, mr: 0.5 }} />
                          ) : (
                            <LaunchIcon fontSize="inherit" sx={{ fontSize: '0.875rem', opacity: 0.6, mr: 0.5 }} />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {getSourceType(source) === 'google_email' ? 'Open in Gmail' : 
                             getSourceType(source) === 'outlook_email' ? 'Open in Outlook' : 
                             getSourceType(source) === 'google_storage' ? 'Open in Drive' : 
                             'Download'}
                          </Typography>
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
