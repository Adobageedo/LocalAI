import React from 'react';
import { 
  Typography, 
  Box, 
  Button,
  Alert,
  Grid,
  Paper
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// Icons
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Google as GoogleIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoFile as VideoFileIcon,
  AudioFile as AudioFileIcon,
  Code as CodeIcon,
  TableChart as TableChartIcon,
  Slideshow as SlideshowIcon,
  TextSnippet as TextSnippetIcon,
  Archive as ArchiveIcon,
  Language as LanguageIcon,
  InsertDriveFile as InsertDriveFileIcon
} from '@mui/icons-material';

// Google Drive Icon
import GoogleDriveIcon from '@mui/icons-material/Storage'; // Using Storage as placeholder for Google Drive

// Utils
import { formatFileSize, decodeFileName, getFileIcon } from '../utils/fileUtils';

// Helper function to render file icons from the config returned by getFileIcon
const renderFileIcon = (iconConfig) => {
  const { icon, props } = iconConfig;
  
  switch (icon) {
    case 'FolderIcon': return <FolderIcon {...props} />;
    case 'FileIcon': return <FileIcon {...props} />;
    case 'PdfIcon': return <PdfIcon {...props} />;
    case 'DocumentIcon': return <DocumentIcon {...props} />;
    case 'SpreadsheetIcon': return <TableChartIcon {...props} />;
    case 'PresentationIcon': return <SlideshowIcon {...props} />;
    case 'ImageIcon': return <ImageIcon {...props} />;
    case 'VideoIcon': return <VideoFileIcon {...props} />;
    case 'AudioIcon': return <AudioFileIcon {...props} />;
    case 'CodeIcon': return <CodeIcon {...props} />;
    case 'TextIcon': return <TextSnippetIcon {...props} />;
    case 'MarkdownIcon': return <LanguageIcon {...props} />;
    case 'ArchiveIcon': return <ArchiveIcon {...props} />;
    default: return <InsertDriveFileIcon {...props} />;
  }
};

// Styled components for file items - matching the styling from PersonalDrive
const FileItemContainer = styled(Paper)(({ theme, selected }) => ({
  padding: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  borderRadius: 8,
  cursor: 'pointer',
  background: selected ? alpha(theme.palette.primary.main, 0.1) : 'white',
  border: selected ? `1px solid ${theme.palette.primary.main}` : '1px solid rgba(0, 0, 0, 0.08)',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: selected ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.05),
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
  }
}));

/**
 * GoogleDrive component that handles displaying files from Google Drive
 * and the authentication interface when not connected.
 */
const GoogleDrive = ({
  // Props
  items,
  selectedItems,
  loading,
  error,
  currentPath,
  isConnected,

  // Actions/callbacks
  onNavigateToFolder,
  onRefresh,
  onItemSelection,
  onContextMenu,
  onAuthenticate
}) => {

  // If not connected, show authentication UI
  if (!isConnected) {
    return (
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80%',
          p: 3,
          textAlign: 'center'
        }}
      >
        <GoogleDriveIcon sx={{ fontSize: 64, color: '#4CAF50', mb: 2, opacity: 0.8 }} />
        <Typography variant="h6" gutterBottom>
          Connect your Google Drive account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Access your Google Drive documents from anywhere
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<GoogleDriveIcon />}
          onClick={onAuthenticate}
          sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
        >
          Connect Google Drive
        </Button>
      </Box>
    );
  }

  // Display loading state
  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading files...</Typography>
      </Box>
    );
  }
  
  // Display error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Display empty folder state
  if (items.length === 0) {
    return (
      <Box 
        sx={{ 
          p: 3, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '70vh'
        }}
      >
        <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          This folder is empty
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add files or folders to see them here
        </Typography>
      </Box>
    );
  }

  // Display files and folders
  return (
    <Grid container spacing={2}>
      {items.map((item) => {
        const isSelected = selectedItems.some(
          selected => selected.name === item.name && selected.path === item.path
        );
        const itemKey = `${item.path}_${item.name}`;
        
        return (
          <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={itemKey}>
            <FileItemContainer 
              selected={isSelected}
              onClick={(e) => onItemSelection(item, e)}
              onContextMenu={(e) => onContextMenu(e, item)}
            >
              <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {renderFileIcon(getFileIcon(item, 48))}
                
                <Typography 
                  variant="body2" 
                  align="center" 
                  sx={{ 
                    mt: 1, 
                    width: '100%', 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: item.is_directory ? 500 : 400
                  }}
                >
                  {decodeFileName(item.name)}
                </Typography>
                
                {!item.is_directory && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ mt: 0.5 }}
                  >
                    {formatFileSize(item.size)}
                  </Typography>
                )}
              </Box>
            </FileItemContainer>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default GoogleDrive;
