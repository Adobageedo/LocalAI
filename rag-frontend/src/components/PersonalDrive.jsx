import React, { useRef } from 'react';
import { 
  Typography, 
  Box, 
  IconButton, 
  Button, 
  Alert,
  Tooltip,
  LinearProgress,
  Badge,
  Grid,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// Icons
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ArrowUpward as UploadIcon,
  CreateNewFolder as CreateFolderIcon,
  ContentCopy as ContentCopyIcon,
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  Storage as MinioIcon,
  DeleteOutline as DeleteIcon,
  DriveFileMove as DriveFileMoveIcon,
  Edit as RenameIcon,
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
  InsertDriveFile as InsertDriveFileIcon,
} from '@mui/icons-material';

// Utilities imported from parent component
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

// Apple-inspired styled components for file items
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

const PersonalDrive = ({
  // Props
  items,
  selectedItems,
  loading,
  error,
  currentPath,
  isUploading,
  uploadProgress,
  showPasteButton,
  clipboardItems,
  clipboardOperation,
  isDragging,
  
  // Actions/callbacks
  onNavigateToFolder,
  onRefresh,
  onCreateFolder,
  onUploadFile,
  onUploadFolder,
  onPaste,
  onItemSelection,
  onContextMenu
}) => {
  // Refs for file and folder inputs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  
  // Handle file upload button click
  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle folder upload button click
  const handleFolderUpload = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };
  
  return (
    <>
      {/* Loading indicator */}
      {loading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      )}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Upload progress */}
      {isUploading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Uploading...
          </Typography>
          <LinearProgress 
            variant={uploadProgress > 0 ? "determinate" : "indeterminate"}
            value={uploadProgress}
          />
        </Box>
      )}
      
      {/* Main toolbar */}
      <Box sx={{ display: 'flex' }}>
        <Tooltip title="Refresh">
          <IconButton color="primary" onClick={onRefresh} size="small" sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Create Folder">
          <IconButton color="primary" onClick={onCreateFolder} size="small" sx={{ mr: 1 }}>
            <CreateFolderIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Upload File">
          <IconButton color="primary" onClick={handleUpload} size="small" sx={{ mr: 1 }}>
            <UploadIcon />
          </IconButton>
        </Tooltip>
        {showPasteButton && (
          <Tooltip title={`Paste ${clipboardItems.length} item(s) (${clipboardOperation === 'copy' ? 'Copy' : 'Move'})`}>
            <IconButton 
              color="primary" 
              onClick={onPaste}
              sx={{ bgcolor: 'rgba(25, 118, 210, 0.08)' }}
            >
              <ContentCopyIcon />
              <Badge
                badgeContent={clipboardItems.length}
                color="primary"
                sx={{ position: 'absolute', top: -5, right: -5 }}
              />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Upload Folder">
          <IconButton color="primary" onClick={handleFolderUpload} size="small" sx={{ mr: 1 }}>
            <CloudUploadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Empty state for Personal Drive */}
      {items.length === 0 && !loading && !error && (
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
          <MinioIcon sx={{ fontSize: 64, color: '#1E88E5', mb: 2, opacity: 0.8 }} />
          <Typography variant="h6" gutterBottom>
            Upload your first document
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Drag and drop files here or use the upload buttons above
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleUpload}
            >
              Upload Files
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CreateFolderIcon />}
              onClick={onCreateFolder}
            >
              Create Folder
            </Button>
          </Box>
        </Box>
      )}
      
      {/* File/Folder grid */}
      {items.length > 0 && (
        <Grid container spacing={2}>
          {items.map((item) => {
            const isSelected = selectedItems.some(selected => selected.path === item.path && selected.name === item.name);
            // Create a more unique key by combining path and name
            const itemKey = `${item.path}_${item.name}`;
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={itemKey}>
                <FileItemContainer 
                  selected={isSelected}
                  onClick={(e) => onItemSelection(item, e)}
                  onContextMenu={(e) => onContextMenu(e, item)}
                >
                  <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {renderFileIcon(getFileIcon(item, 40))}
                    <Typography 
                      variant="body2" 
                      align="center" 
                      sx={{ 
                        mt: 1, 
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: isSelected ? 500 : 400
                      }}
                    >
                      {decodeFileName(item.name)}
                    </Typography>
                    
                    {!item.is_directory && item.size !== undefined && (
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(item.size)}
                      </Typography>
                    )}
                  </Box>
                </FileItemContainer>
              </Grid>
            );
          })}
        </Grid>
      )}
      
      {/* Drag overlay */}
      {isDragging && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(25, 118, 210, 0.1)',
            border: '2px dashed #1976d2',
            borderRadius: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
          <Typography variant="h6" color="primary">
            Drop files here to upload
          </Typography>
        </Box>
      )}
      
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFile(e.target.files);
            e.target.value = null;
          }
        }}
        style={{ display: 'none' }}
        multiple
      />
      
      {/* Hidden folder input for folder uploads */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFolder(e.target.files);
            e.target.value = null;
          }
        }}
        style={{ display: 'none' }}
        directory=""
        webkitdirectory=""
      />
    </>
  );
};

export default PersonalDrive;
