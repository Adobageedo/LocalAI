import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Breadcrumbs, 
  Link as MuiLink, 
  IconButton, 
  Button, 
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Menu,
  MenuItem,
  Tooltip,
  LinearProgress,
  Snackbar,
  Fab,
  Tabs,
  Tab,
  Badge,
  Grid,
  Card,
  CardContent,
  CardActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Checkbox,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { Layout } from '../components/layout';

// Icons
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ArrowUpward as UploadIcon,
  CreateNewFolder as CreateFolderIcon,
  ArrowBack as BackIcon,
  MoreVert as MoreIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Edit as RenameIcon,
  FileCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  CloudDownload as CloudDownloadIcon,
  CloudSync as CloudSyncIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  TableChart as SpreadsheetIcon,
  Slideshow as PresentationIcon,
  TextSnippet as TextIcon,
  Archive as ArchiveIcon,
  Language as MarkdownIcon,
  CheckBox as CheckIcon,
  SelectAll as SelectAllIcon,
  DriveFileMove as DriveFileMoveIcon,
  Check as CheckedIcon,
  CloudUpload as CloudUploadIcon,
  DataObject as QdrantIcon,
  Cloud as CloudIcon,
  Storage as MinioIcon,
  Google as GoogleDriveIcon,
  Work as SharePointIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Services
import minioService from '../lib/minioService';
import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

// Utility functions
// Decode file names
const decodeFileName = (fileName) => {
  try {
    return decodeURIComponent(fileName);
  } catch (e) {
    console.error('Error decoding filename', e);
    return fileName;
  }
};

// Format file size with appropriate units
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get appropriate icon for file type
const getFileIcon = (fileName, isDirectory, size = 24) => {
  if (isDirectory) {
    return <FolderIcon sx={{ fontSize: size, color: '#1E88E5' }} />;
  }
  
  const extension = fileName.split('.').pop().toLowerCase();
  const iconProps = { sx: { fontSize: size } };
  
  switch (extension) {
    case 'pdf':
      return <PdfIcon color="error" {...iconProps} />;
    case 'doc':
    case 'docx':
      return <DocumentIcon color="primary" {...iconProps} />;
    case 'xls':
    case 'xlsx':
      return <SpreadsheetIcon color="success" {...iconProps} />;
    case 'ppt':
    case 'pptx':
      return <PresentationIcon color="warning" {...iconProps} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
      return <ImageIcon color="secondary" {...iconProps} />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'mkv':
    case 'webm':
      return <VideoIcon color="error" {...iconProps} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'm4a':
      return <AudioIcon color="secondary" {...iconProps} />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
      return <ArchiveIcon color="warning" {...iconProps} />;
    case 'txt':
    case 'md':
    case 'rtf':
      return <TextIcon color="info" {...iconProps} />;
    case 'html':
    case 'css':
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'php':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'cs':
    case 'go':
    case 'rb':
    case 'swift':
    case 'kt':
    case 'rs':
      return <CodeIcon color="info" {...iconProps} />;
    default:
      return <FileIcon color="action" {...iconProps} />;
  }
};

// Apple-inspired styled components
const MacOSPaper = styled(Paper)(({ theme }) => ({
  borderRadius: 10,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  background: '#fff',
  overflow: 'hidden',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.1)',
  }
}));

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

// DocumentExplorer main component 
const DocumentExplorer = () => {
  // State management for providers
  const [activeProvider, setActiveProvider] = useState(0);
  const providers = [
    { id: 'minio', name: 'Personal Drive', icon: <MinioIcon />, color: '#1E88E5', connected: true },
    { id: 'sharepoint', name: 'SharePoint', icon: <SharePointIcon />, color: '#0078D4', connected: false },
    { id: 'gdrive', name: 'Google Drive', icon: <GoogleDriveIcon />, color: '#4CAF50', connected: false }
  ];

  // Common state variables
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newName, setNewName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const renameItemRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Basic event handlers 
  const handleProviderChange = (event, newValue) => {
    setActiveProvider(newValue);
    setCurrentPath('/');
    setItems([]);
    setSelectedItems([]);
    loadDirectoryContents();
  };

  // Display notification
  const showNotification = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // Initialize the component
  useEffect(() => {
    loadDirectoryContents();
  }, [activeProvider, currentPath]);

  // Main function to load directory contents based on active provider
  const loadDirectoryContents = () => {
    setLoading(true);
    setSelectedItems([]);
    
    // Call appropriate loader based on active provider
    switch (providers[activeProvider].id) {
      case 'minio':
        loadMinioContents();
        break;
      case 'sharepoint':
        loadSharePointContents();
        break;
      case 'gdrive':
        loadGoogleDriveContents();
        break;
      default:
        setLoading(false);
        setError('Unknown provider');
    }
  };

  // MinIO content loader
  const loadMinioContents = async () => {
    try {
      setError(null);
      console.log('Loading MinIO contents for path:', currentPath);
      const response = await minioService.listFiles(currentPath);
      console.log('MinIO response:', response);
      if (response && response.items) {
        // Sort items: directories first, then files alphabetically
        const sortedItems = [...response.items].sort((a, b) => {
          if (a.is_directory && !b.is_directory) return -1;
          if (!a.is_directory && b.is_directory) return 1;
          return a.name.localeCompare(b.name);
        });
        setItems(sortedItems);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading MinIO contents:', error);
      setError(`Failed to load files: ${error.message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to a specific folder
  const navigateToFolder = (path) => {
    console.log('Navigating to folder:', path);
    setCurrentPath(path);
    // Wait for state update to complete before loading contents
    setTimeout(() => {
      loadMinioContents();
    }, 0);
  };

  // Navigate up one level
  const navigateUp = () => {
    if (currentPath === '/') return;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = pathParts.length === 0 ? '/' : '/' + pathParts.join('/') + '/';
    setCurrentPath(newPath);
    loadMinioContents();
  };

  // Navigate to root directory
  const navigateToRoot = () => {
    setCurrentPath('/');
    loadMinioContents();
  };

  // Upload a file to MinIO
  const uploadFileToMinio = async (file, customPath = null) => {
    // Use customPath if provided, otherwise construct path from currentPath and file.name
    let uploadPath;
    if (customPath) {
      uploadPath = customPath;
    } else {
      // Make sure we don't double-slash when constructing the path
      uploadPath = currentPath === '/' ? file.name : `${currentPath}${file.name}`;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Log the upload path to help with debugging
      console.log('Uploading file to path:', uploadPath);
      
      // Call the service method
      await minioService.uploadFile(file, uploadPath);
      
      setUploadProgress(100);
      showNotification(`${file.name} uploaded successfully`);
      
      // Reload the directory contents
      loadDirectoryContents();
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      showNotification(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file upload
  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process selected files for upload
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      uploadFileToMinio(file);
    });
    
    // Reset the file input
    e.target.value = null;
  };

  // Handle folder upload
  const handleFolderUpload = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // Process selected folder for upload
  const handleFolderInputChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Group files by directory structure
    const filesByDirectory = {};
    const basePath = currentPath === '/' ? '' : currentPath;
    
    Array.from(files).forEach(file => {
      // Get the relative path from webkitRelativePath
      const relativePath = file.webkitRelativePath;
      const pathParts = relativePath.split('/');
      
      // Create directories if needed
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirPath = basePath + '/' + pathParts.slice(0, i + 1).join('/');
        filesByDirectory[dirPath] = filesByDirectory[dirPath] || [];
      }
      
      // Add file to its directory
      const filePath = basePath + '/' + relativePath;
      uploadFileToMinio(file, filePath);
    });
    
    // Reset the folder input
    e.target.value = null;
  };

  // Create a new folder
  const handleCreateFolder = () => {
    setDialogType('createFolder');
    setNewFolderName('');
    setDialogOpen(true);
  };

  // Create folder in MinIO
  const createMinioDirectory = async (dirName) => {
    if (!dirName.trim()) {
      showNotification('Folder name cannot be empty');
      return;
    }
    
    try {
      const dirPath = currentPath === '/' 
        ? dirName 
        : `${currentPath}${dirName}`;
      
      await minioService.createFolder(dirPath);
      showNotification(`Folder ${dirName} created successfully`);
      loadDirectoryContents();
    } catch (error) {
      console.error('Error creating directory in MinIO:', error);
      showNotification(`Failed to create folder: ${error.message}`);
    }
  };

  // Confirm folder creation
  const confirmCreateFolder = () => {
    createMinioDirectory(newFolderName);
    setDialogOpen(false);
  };

  // Delete selected items
  const handleDelete = () => {
    if (selectedItems.length === 0) {
      showNotification('No items selected for deletion');
      return;
    }
    
    setDialogType('delete');
    setDialogOpen(true);
  };

  // Confirm deletion
  const confirmDelete = async () => {
    try {
      for (const item of selectedItems) {
        await minioService.deleteItem(item.path, item.is_directory);
      }
      showNotification(`${selectedItems.length} item(s) deleted successfully`);
      setSelectedItems([]);
      loadDirectoryContents();
    } catch (error) {
      console.error('Error deleting items:', error);
      showNotification(`Failed to delete items: ${error.message}`);
    } finally {
      setDialogOpen(false);
    }
  };

  // Rename selected item
  const handleRename = () => {
    if (selectedItems.length !== 1) {
      showNotification('Please select exactly one item to rename');
      return;
    }
    
    setDialogType('rename');
    setNewName(selectedItems[0].name);
    renameItemRef.current = selectedItems[0];
    setDialogOpen(true);
  };

  // Confirm rename
  const confirmRename = async () => {
    if (!newName.trim()) {
      showNotification('New name cannot be empty');
      return;
    }
    
    const item = renameItemRef.current;
    if (!item) return;
    
    try {
      const pathParts = item.path.split('/').filter(Boolean);
      pathParts.pop(); // Remove the old filename
      
      const oldPath = item.path;
      const newPath = pathParts.length === 0 
        ? `/${newName}${item.is_directory ? '/' : ''}`
        : `/${pathParts.join('/')}/${newName}${item.is_directory ? '/' : ''}`;
      
      await minioService.moveItem(oldPath, newPath);
      showNotification(`Renamed to ${newName} successfully`);
      setSelectedItems([]);
      loadDirectoryContents();
    } catch (error) {
      console.error('Error renaming item:', error);
      showNotification(`Failed to rename: ${error.message}`);
    } finally {
      setDialogOpen(false);
    }
  };

  // Handle selection of an item
  const handleItemSelection = (item, event) => {
    console.log('Item clicked:', item);
    
    // For directories, navigate into the directory on click
    if (item.is_directory && !event.ctrlKey && !event.metaKey) {
      console.log('Navigating to directory:', item.path);
      navigateToFolder(item.path);
      return;
    }
    
    // For files or when using Ctrl/Command, select the item
    if (event.ctrlKey || event.metaKey) {
      // Toggle selection with Ctrl/Command
      setSelectedItems(prev => {
        const isSelected = prev.some(selected => selected.path === item.path);
        if (isSelected) {
          return prev.filter(selected => selected.path !== item.path);
        } else {
          return [...prev, item];
        }
      });
    } else {
      // Regular click - handle file or set selection
      if (item.is_directory) {
        console.log('Navigating to directory (fallback handler):', item.path);
        navigateToFolder(item.path);
      } else {
        // For files, download or open
        console.log('Downloading file:', item.path);
        minioService.downloadFile(item.path);
      }
    }
  };

  // Show context menu
  const handleContextMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    
    // If item is not already selected, clear selection and select this item
    if (!selectedItems.some(selected => selected.path === item.path)) {
      setSelectedItems([item]);
    }
    
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, item });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Handle context menu actions
  const handleContextMenuAction = (action) => {
    handleCloseContextMenu();
    
    switch (action) {
      case 'download':
        if (selectedItems.length === 1 && !selectedItems[0].is_directory) {
          minioService.downloadFile(selectedItems[0].path);
        }
        break;
      case 'rename':
        handleRename();
        break;
      case 'delete':
        handleDelete();
        break;
      default:
        break;
    }
  };

  // Handle drag enter event
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // Handle drag over event
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drag leave event
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.items) {
      // Use DataTransferItemList interface to access files
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            uploadFileToMinio(file);
          }
        }
      }
    } else {
      // Use DataTransfer interface to access files
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        uploadFileToMinio(e.dataTransfer.files[i]);
      }
    }
  };

  // SharePoint placeholder loader
  const loadSharePointContents = async () => {
    setItems([]);
    setError(null);
    setLoading(false);
  };

  // Google Drive placeholder loader
  const loadGoogleDriveContents = async () => {
    setItems([]);
    setError(null);
    setLoading(false);
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 300 }}>
          Document Explorer
        </Typography>
        
        {/* Provider tabs */}
        <Tabs 
          value={activeProvider}
          onChange={handleProviderChange}
          aria-label="storage-provider-tabs"
          sx={{ mb: 3 }}
          TabIndicatorProps={{ sx: { backgroundColor: providers[activeProvider].color } }}
        >
          {providers.map((provider, index) => (
            <Tab 
              key={provider.id}
              label={provider.name} 
              icon={provider.icon} 
              iconPosition="start"
              sx={{ 
                minHeight: 48,
                color: activeProvider === index ? provider.color : 'inherit',
                '&.Mui-selected': {
                  color: provider.color,
                },
              }}
            />
          ))}
        </Tabs>
        
        {/* Main content with Apple-inspired design */}
        <MacOSPaper 
          elevation={0} 
          sx={{ 
            p: 0, 
            overflow: 'hidden', 
            height: 'calc(100vh - 200px)', 
            display: 'flex', 
            flexDirection: 'column'
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Toolbar with navigation and actions */}
          <Box sx={{ 
            p: 1, 
            bgcolor: '#F5F5F7', 
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton 
                onClick={navigateUp}
                disabled={currentPath === '/'}
                size="small"
                sx={{ mr: 1 }}
              >
                <BackIcon />
              </IconButton>
              
              <IconButton 
                onClick={navigateToRoot}
                disabled={currentPath === '/'}
                size="small"
                sx={{ mr: 2 }}
              >
                <HomeIcon />
              </IconButton>
              
              <Breadcrumbs aria-label="breadcrumb" separator="/" sx={{ flexGrow: 1 }}>
                {currentPath === '/' ? (
                  <Typography color="text.primary">Root</Typography>
                ) : (
                  <>
                    <MuiLink 
                      component="button" 
                      variant="body2" 
                      onClick={navigateToRoot}
                      underline="hover"
                      sx={{ cursor: 'pointer' }}
                    >
                      Root
                    </MuiLink>
                    
                    {currentPath.split('/').filter(Boolean).map((part, index, array) => {
                      const path = '/' + array.slice(0, index + 1).join('/') + '/';
                      const isLast = index === array.length - 1;
                      
                      return isLast ? (
                        <Typography key={part} color="text.primary">
                          {decodeFileName(part)}
                        </Typography>
                      ) : (
                        <MuiLink
                          key={part}
                          component="button"
                          variant="body2"
                          onClick={() => navigateToFolder(path)}
                          underline="hover"
                          sx={{ cursor: 'pointer' }}
                        >
                          {decodeFileName(part)}
                        </MuiLink>
                      );
                    })}
                  </>
                )}
              </Breadcrumbs>
            </Box>
            
            <Box sx={{ display: 'flex' }}>
              {/* Display action buttons only for MinIO (connected provider) */}
              {providers[activeProvider].connected && (
                <>
                  <Tooltip title="Upload File">
                    <IconButton color="primary" onClick={handleUpload} size="small" sx={{ mr: 1 }}>
                      <UploadIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Upload Folder">
                    <IconButton color="primary" onClick={handleFolderUpload} size="small" sx={{ mr: 1 }}>
                      <CloudUploadIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Create Folder">
                    <IconButton color="primary" onClick={handleCreateFolder} size="small" sx={{ mr: 1 }}>
                      <CreateFolderIcon />
                    </IconButton>
                  </Tooltip>
                  
                  {selectedItems.length > 0 && (
                    <>
                      <Tooltip title="Delete Selected">
                        <IconButton color="error" onClick={handleDelete} size="small" sx={{ mr: 1 }}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {selectedItems.length === 1 && (
                        <Tooltip title="Rename">
                          <IconButton color="primary" onClick={handleRename} size="small" sx={{ mr: 1 }}>
                            <RenameIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                </>
              )}
            </Box>
          </Box>
          
          {/* Main content area */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              p: 2, 
              bgcolor: 'white',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
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
            
            {/* Empty state for MinIO */}
            {providers[activeProvider].id === 'minio' && items.length === 0 && !loading && !error && (
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
                    onClick={handleCreateFolder}
                  >
                    Create Folder
                  </Button>
                </Box>
              </Box>
            )}
            
            {/* Placeholder for SharePoint (not connected) */}
            {providers[activeProvider].id === 'sharepoint' && !providers[activeProvider].connected && (
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
                <SharePointIcon sx={{ fontSize: 64, color: '#0078D4', mb: 2, opacity: 0.8 }} />
                <Typography variant="h6" gutterBottom>
                  Connect your SharePoint account
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Access your SharePoint documents and collaborate with your team
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<SharePointIcon />}
                  sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#106EBE' } }}
                >
                  Connect SharePoint
                </Button>
              </Box>
            )}
            
            {/* Placeholder for Google Drive (not connected) */}
            {providers[activeProvider].id === 'gdrive' && !providers[activeProvider].connected && (
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
                  sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
                >
                  Connect Google Drive
                </Button>
              </Box>
            )}
            
            {/* File/Folder grid for MinIO */}
            {providers[activeProvider].id === 'minio' && items.length > 0 && (
              <Grid container spacing={2}>
                {items.map((item) => {
                  const isSelected = selectedItems.some(selected => selected.path === item.path);
                  // Create a more unique key by combining path and name
                  const itemKey = `${item.path}_${item.name}`;
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={itemKey}>
                      <FileItemContainer 
                        selected={isSelected}
                        onClick={(e) => handleItemSelection(item, e)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                      >
                        <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                          {getFileIcon(item.name, item.is_directory, 40)}
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
          </Box>
        </MacOSPaper>
        
        {/* Hidden file input for uploads */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          multiple
        />
        
        {/* Hidden folder input for folder uploads */}
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderInputChange}
          style={{ display: 'none' }}
          directory=""
          webkitdirectory=""
        />
        
        {/* Context menu */}
        <Menu
          open={Boolean(contextMenu)}
          onClose={handleCloseContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
          }
        >
          {contextMenu && contextMenu.item && !contextMenu.item.is_directory && (
            <MenuItem onClick={() => handleContextMenuAction('download')}>
              <ListItemIcon>
                <CloudDownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>
          )}
          
          <MenuItem onClick={() => handleContextMenuAction('rename')}>
            <ListItemIcon>
              <RenameIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleContextMenuAction('delete')}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
        
        {/* Dialog for folder creation, renaming, etc. */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          {dialogType === 'createFolder' && (
            <>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Folder Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={confirmCreateFolder} color="primary">Create</Button>
              </DialogActions>
            </>
          )}
          
          {dialogType === 'rename' && (
            <>
              <DialogTitle>Rename Item</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="New Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={confirmRename} color="primary">Rename</Button>
              </DialogActions>
            </>
          )}
          
          {dialogType === 'delete' && (
            <>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to delete {selectedItems.length} item(s)?
                </Typography>
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  This action cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={confirmDelete} color="error">Delete</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
        />
      </Container>
    </Layout>
  );
};

export default DocumentExplorer;
