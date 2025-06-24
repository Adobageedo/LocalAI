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
  Grid,
  ListItemIcon,
  ListItemText,
  Badge
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { Layout } from '../components/layout';
import { decodeFileName, formatFileSize, getFileIcon } from '../utils/fileUtils';

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
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  CloudDownload as CloudDownloadIcon,
  CloudSync as CloudSyncIcon,
  Description as DocumentIcon,
  Refresh as RefreshIcon,
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
  TableChart as TableChartIcon,
  VideoFile as VideoFileIcon,
  AudioFile as AudioFileIcon,
  Add as AddIcon,
  InsertDriveFile as InsertDriveFileIcon
} from '@mui/icons-material';

// Services
import minioService from '../lib/minioService';
import { authFetch } from '../firebase/authFetch';
import personal_storage_service from '../lib/personal_storage';
import { API_BASE_URL } from '../config';
import authProviders from '../lib/authProviders';

// Utility functions have been moved to fileUtils.js

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

// Helper function to render file icons from the config returned by getFileIcon
const renderFileIcon = (iconConfig) => {
  const { icon, props } = iconConfig;
  
  switch (icon) {
    case 'FolderIcon': return <FolderIcon {...props} />;
    case 'FileIcon': return <FileIcon {...props} />;
    case 'PdfIcon': return <PdfIcon {...props} />;
    case 'DocumentIcon': return <DocumentIcon {...props} />;
    case 'SpreadsheetIcon': return <TableChartIcon {...props} />;
    case 'PresentationIcon': return <PresentationIcon {...props} />;
    case 'ImageIcon': return <ImageIcon {...props} />;
    case 'VideoIcon': return <VideoFileIcon {...props} />;
    case 'AudioIcon': return <AudioFileIcon {...props} />;
    case 'CodeIcon': return <CodeIcon {...props} />;
    case 'TextIcon': return <TextIcon {...props} />;
    case 'MarkdownIcon': return <MarkdownIcon {...props} />;
    case 'ArchiveIcon': return <ArchiveIcon {...props} />;
    default: return <InsertDriveFileIcon {...props} />;
  }
};

// DocumentExplorer main component 
const DocumentExplorer = () => {
  // State management for personal storage
  const [providers, setProviders] = useState([
    { id: 'minio', name: 'Personal Drive', icon: <MinioIcon />, color: '#1E88E5', connected: true }
  ]);

  // Common state variables
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
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
  const [contextMenu, setContextMenu] = useState(null);
  const [contextItem, setContextItem] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [operationType, setOperationType] = useState(null); // 'copy' ou 'move'
  const [operationItems, setOperationItems] = useState([]);
  const [targetSelection, setTargetSelection] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Root', path: '/' }]);
  
  // Cloud provider authentication states
  const [googleDriveAuth, setGoogleDriveAuth] = useState({
    authenticated: false,
    loading: false
  });
  const [oneDriveAuth, setOneDriveAuth] = useState({
    authenticated: false,
    loading: false
  });

  // File upload references
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Refs
  

  
  // Display notification
  const showNotification = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };



  // Main function to load directory contents
  const loadDirectoryContents = () => {
    
    setLoading(true);
    setError(null);
    setItems([]);
    
    loadMinioContents();
  };

  // Effect hook to load directory contents on mount
  useEffect(() => {
    loadDirectoryContents();
    checkAuthStatuses();
  }, []);
  
  // Check authentication status for Google Drive and OneDrive
  const checkAuthStatuses = async () => {
    try {
      // Check Google Drive auth status
      setGoogleDriveAuth(prev => ({ ...prev, loading: true }));
      const gdriveStatus = await authProviders.checkAuthStatus('gdrive');
      setGoogleDriveAuth({
        authenticated: gdriveStatus.authenticated,
        loading: false
      });
      
      // Check OneDrive auth status
      setOneDriveAuth(prev => ({ ...prev, loading: true }));
      const onedriveStatus = await authProviders.checkAuthStatus('outlook');
      setOneDriveAuth({
        authenticated: onedriveStatus.authenticated,
        loading: false
      });
    } catch (error) {
      console.error('Error checking auth statuses:', error);
      setGoogleDriveAuth(prev => ({ ...prev, loading: false }));
      setOneDriveAuth(prev => ({ ...prev, loading: false }));
    }
  };
  
  // Handle Google Drive authentication
  const handleGoogleDriveAuth = async () => {
    try {
      setGoogleDriveAuth(prev => ({ ...prev, loading: true }));
      await authProviders.authenticateWithPopup('gdrive');
      await checkAuthStatuses();
      showNotification('Google Drive connected successfully');
    } catch (error) {
      console.error('Google Drive authentication error:', error);
      showNotification('Failed to connect Google Drive: ' + error.message);
      setGoogleDriveAuth(prev => ({ ...prev, loading: false }));
    }
  };
  
  // Handle OneDrive authentication
  const handleOneDriveAuth = async () => {
    try {
      setOneDriveAuth(prev => ({ ...prev, loading: true }));
      await authProviders.authenticateWithPopup('outlook');
      await checkAuthStatuses();
      showNotification('OneDrive connected successfully');
    } catch (error) {
      console.error('OneDrive authentication error:', error);
      showNotification('Failed to connect OneDrive: ' + error.message);
      setOneDriveAuth(prev => ({ ...prev, loading: false }));
    }
  };
  
  // Handle Google Drive sync
  const handleGoogleDriveSync = async () => {
    try {
      showNotification('Starting Google Drive synchronization...');
      await authProviders.startIngestion('gdrive');
      showNotification('Google Drive synchronization started');
    } catch (error) {
      console.error('Google Drive sync error:', error);
      showNotification('Failed to sync Google Drive: ' + error.message);
    }
  };

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

  // Update breadcrumbs based on current path
  const updateBreadcrumbs = (path) => {
    const parts = path.split('/').filter(Boolean);
    let currentPath = '/';
    const crumbs = [{ name: 'Root', path: '/' }];
    
    for (const part of parts) {
      currentPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;
      crumbs.push({ name: part, path: currentPath });
    }
    
    setBreadcrumbs(crumbs);
  };

  // MinIO content loader
  const loadMinioContents = async (pathOverride = null) => {
    try {
      setError(null);
      const pathToUse = pathOverride !== null ? pathOverride : currentPath;
      const response = await personal_storage_service.listFiles(pathToUse);
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
  const navigateToFolder = (item) => {
    // Build the full path based on current path and item name
    let fullPath;
    if (typeof item === 'string') {
      // If a string was directly passed (for backwards compatibility)
      fullPath = item;
    } else {
      // If an item object was passed
      const itemName = item.name;
      // If currentPath is root or ends with slash, don't add extra slash
      if (currentPath === '/' || currentPath.endsWith('/')) {
        fullPath = `${currentPath}${itemName}`;
      } else {
        fullPath = `${currentPath}/${itemName}`;
      }
      // Add trailing slash for directories if not present
      if (item.is_directory && !fullPath.endsWith('/')) {
        fullPath += '/';
      }
    }
    
    setCurrentPath(fullPath);
    
    // Load personal storage contents directly
    loadMinioContents(fullPath);
  };

  // Navigate up one level
  const navigateUp = () => {
    // Only navigate up if we're not already at root
    if (currentPath === '/') return;
    
    // Get the parent path
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop(); // Remove last part
    const parentPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`;
    // For parent path, we still pass a string since we don't have an item object
    navigateToFolder(parentPath);
  };

  // Navigate to root directory
  const navigateToRoot = () => {
    // For root path, we still pass a string since we don't have an item object
    navigateToFolder('/');
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
      
      // Call the service method
      await personal_storage_service.uploadFile(file, uploadPath);
      
      setUploadProgress(100);
      showNotification(`${file.name} uploaded successfully`);
      
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      showNotification(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Drag-and-drop file handling is already implemented in handleDrop

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
      
      await personal_storage_service.createFolder(dirPath);
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
        // Use buildFullPath to get the correct path including the filename
        const fullPath = buildFullPath(item);
        console.log(`Deleting item: ${fullPath}, is_directory: ${item.is_directory}`);
        await personal_storage_service.deleteItem(fullPath, item.is_directory);
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
      
      await personal_storage_service.moveItem(oldPath, newPath);
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
    
    // Déterminer si shift est pressé pour la sélection étendue
    const shiftKey = event.shiftKey;
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    
    // Pour les répertoires sans touche de modification, naviguer dans le répertoire
    if (item.is_directory && !ctrlOrMeta && !shiftKey) {
      navigateToFolder(item);
      return;
    }
    
    // Pour les fichiers et les répertoires avec Ctrl/Command, sélectionner l'élément
    if (ctrlOrMeta) {
      // Toggle selection with Ctrl/Command
      setSelectedItems(prev => {
        // Comparaison basée sur le chemin ET le nom pour une identification unique
        const isSelected = prev.some(selected => selected.path === item.path && selected.name === item.name);
        if (isSelected) {
          return prev.filter(selected => !(selected.path === item.path && selected.name === item.name));
        } else {
          return [...prev, item];
        }
      });
    } else if (shiftKey && selectedItems.length > 0) {
      // Sélection étendue avec Shift - sélectionner tous les éléments entre la dernière sélection et cet élément
      const lastSelected = selectedItems[selectedItems.length - 1];
      const lastSelectedIndex = items.findIndex(i => i.path === lastSelected.path && i.name === lastSelected.name);
      const currentIndex = items.findIndex(i => i.path === item.path && i.name === item.name);
      
      if (lastSelectedIndex !== -1 && currentIndex !== -1) {
        const startIdx = Math.min(lastSelectedIndex, currentIndex);
        const endIdx = Math.max(lastSelectedIndex, currentIndex);
        const itemsToSelect = items.slice(startIdx, endIdx + 1);
        
        // Ajouter les éléments à la sélection existante, en évitant les doublons
        setSelectedItems(prev => {
          // Créer un Set d'identifiants uniques basés sur chemin+nom
          const existingItems = new Set(prev.map(i => `${i.path}_${i.name}`));
          const newItems = itemsToSelect.filter(i => !existingItems.has(`${i.path}_${i.name}`));
          return [...prev, ...newItems];
        });
      }
    } else {
      // Clic normal sans modificateurs - sélectionner uniquement cet élément
      setSelectedItems([item]);
      
      // Si c'est un dossier et double-clic, naviguer dedans
      if (item.is_directory && event.detail === 2) {
        navigateToFolder(item);
      } 
      // Si c'est un fichier et double-clic, télécharger
      else if (!item.is_directory && event.detail === 2) {
        const fullPath = buildFullPath(item);
        personal_storage_service.downloadFile(fullPath);
      }
    }
  };

  // Show context menu
  const handleContextMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Si l'élément cliqué n'est pas déjà dans la sélection, le sélectionner uniquement
    if (!selectedItems.some(selected => selected.path === item.path && selected.name === item.name)) {
      setSelectedItems([item]);
    }
    
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, item });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Fonction utilitaire pour construire le chemin complet d'un élément
  const buildFullPath = (item) => {
    if (currentPath === '/' || currentPath.endsWith('/')) {
      return `${currentPath}${item.name}`;
    } else {
      return `${currentPath}/${item.name}`;
    }
  };
  
  // Handle context menu actions
  // Variables d'état pour l'opération de copier/déplacer
  const [clipboardItems, setClipboardItems] = useState([]);
  const [clipboardOperation, setClipboardOperation] = useState(null); // 'copy' ou 'move'
  const [showPasteButton, setShowPasteButton] = useState(false);
  
  // Gérer l'opération de copier
  const handleCopy = () => {
    if (selectedItems.length > 0) {
      // Préparer les items avec leurs chemins complets
      const itemsWithFullPath = selectedItems.map(item => ({
        ...item,
        fullPath: buildFullPath(item)
      }));
      setClipboardItems(itemsWithFullPath);
      setClipboardOperation('copy');
      setShowPasteButton(true);
      showNotification(`${selectedItems.length} item(s) prêt(s) à être copié(s)`);
    }
  };
  
  // Gérer l'opération de déplacer
  const handleMove = () => {
    if (selectedItems.length > 0) {
      // Préparer les items avec leurs chemins complets
      const itemsWithFullPath = selectedItems.map(item => ({
        ...item,
        fullPath: buildFullPath(item)
      }));
      setClipboardItems(itemsWithFullPath);
      setClipboardOperation('move');
      setShowPasteButton(true);
      showNotification(`${selectedItems.length} item(s) prêt(s) à être déplacé(s)`);
    }
  };
  
  // Coller les éléments dans le répertoire actuel
  const handlePaste = async () => {
    if (clipboardItems.length === 0 || !clipboardOperation) return;
    
    setLoading(true);
    const operations = [];
    
    for (const item of clipboardItems) {
      const sourceFullPath = item.fullPath;
      let targetPath;
      
      // Construire le chemin de destination
      if (currentPath === '/' || currentPath.endsWith('/')) {
        targetPath = `${currentPath}${item.name}`;
      } else {
        targetPath = `${currentPath}/${item.name}`;
      }
      
      // Vérifier si le fichier existe déjà à la destination
      const exists = items.some(existingItem => existingItem.name === item.name);
      if (exists) {
        // Ajouter un suffixe pour éviter l'écrasement
        const nameParts = item.name.split('.');
        let newName;
        if (nameParts.length > 1) {
          const extension = nameParts.pop();
          newName = `${nameParts.join('.')}_copy.${extension}`;
        } else {
          newName = `${item.name}_copy`;
        }
        
        if (currentPath === '/' || currentPath.endsWith('/')) {
          targetPath = `${currentPath}${newName}`;
        } else {
          targetPath = `${currentPath}/${newName}`;
        }
      }
      
      // Effectuer l'opération de copie ou de déplacement
      try {
        if (clipboardOperation === 'copy') {
          await personal_storage_service.copyItem(sourceFullPath, targetPath);
        } else if (clipboardOperation === 'move') {
          await personal_storage_service.moveItem(sourceFullPath, targetPath);
        }
        operations.push(true);
      } catch (error) {
        console.error(`Erreur lors de l'opération ${clipboardOperation}:`, error);
        showNotification(`Échec de l'opération pour ${item.name}: ${error.message}`);
        operations.push(false);
      }
    }
    
    // Réinitialiser après l'opération
    if (operations.every(success => success)) {
      showNotification(
        `${clipboardOperation === 'copy' ? 'Copie' : 'Déplacement'} terminé avec succès`
      );
      // Vider le presse-papier uniquement si tout s'est bien passé ou si c'était un déplacement
      if (clipboardOperation === 'move') {
        setClipboardItems([]);
        setClipboardOperation(null);
        setShowPasteButton(false);
      }
    }
    
    // Rafraîchir l'affichage
    loadMinioContents();
    setLoading(false);
  };

  const handleContextMenuAction = (action) => {
    handleCloseContextMenu();
    
    switch (action) {
      case 'download':
        if (selectedItems.length === 1 && !selectedItems[0].is_directory) {
          const fullPath = buildFullPath(selectedItems[0]);
          console.log('Downloading from context menu with full path:', fullPath);
          personal_storage_service.downloadFile(fullPath);
        }
        break;
      case 'rename':
        handleRename();
        break;
      case 'delete':
        handleDelete();
        break;
      case 'copy':
        handleCopy();
        break;
      case 'move':
        handleMove();
        break;
      default:
        break;
    }
  };

  // Use counter to track drag enter/leave for nested elements
  const dragCounter = React.useRef(0);
  
  // Handle drag enter event
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Increment counter when entering an element
    dragCounter.current += 1;
    
    // Only show dragging UI on the first enter
    if (dragCounter.current === 1) {
      setIsDragging(true);
    }
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
    
    // Decrement counter when leaving an element
    dragCounter.current -= 1;
    
    // Only hide dragging UI when completely left the drop zone
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  // Handle drop event
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Clear any debounce to ensure drag state is reset
    if (window.dragLeaveDebounce) {
      clearTimeout(window.dragLeaveDebounce);
    }
    
    // Detect if we're dropping a folder (using webkitGetAsEntry API)
    if (e.dataTransfer.items && e.dataTransfer.items[0].webkitGetAsEntry) {
      const entries = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const entry = e.dataTransfer.items[i].webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
        }
      }
      
      // Process entries (files and directories)
      for (const entry of entries) {
        if (entry.isDirectory) {
          // Handle directory
          await processDirectoryEntry(entry, currentPath);
        } else {
          // Handle file upload
          entry.file(file => {
            uploadFileToMinio(file);
          });
        }
      }
    } else {
      // Fallback for browsers that don't support webkitGetAsEntry
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        uploadFileToMinio(file);
      }
    }
  };
  
  // Process directory entry recursively
  const processDirectoryEntry = async (directoryEntry, currentPath) => {
    // Create directory in MinIO
    const dirPath = currentPath === '/' 
      ? directoryEntry.name 
      : `${currentPath}/${directoryEntry.name}`;
    
    try {
      await personal_storage_service.createFolder(dirPath);
      
      // Read directory contents
      const reader = directoryEntry.createReader();
      
      // Function to read all entries
      const readEntries = () => {
        return new Promise((resolve, reject) => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve();
            } else {
              // Process all entries
              for (const entry of entries) {
                if (entry.isDirectory) {
                  await processDirectoryEntry(entry, dirPath);
                } else {
                  entry.file(file => {
                    // Get full path for the file
                    const filePath = `${dirPath}/${file.name}`;
                    uploadFileToMinio(file, filePath);
                  });
                }
              }
              
              // Continue reading (directories might return entries in batches)
              await readEntries().then(resolve).catch(reject);
            }
          }, reject);
        });
      };
      
      await readEntries();
      loadDirectoryContents(); // Refresh the current directory after processing
    } catch (error) {
      console.error('Error processing directory:', error);
      showNotification(`Error processing directory ${directoryEntry.name}: ${error.message}`);
    }
  };



  // Handle sync for documents
  const handleSync = async () => {
    try {
      setLoading(true);
      showNotification('Starting document synchronization...');

      // Call the sync endpoint
      await authFetch(`${API_BASE_URL}/sync/minio`, {
        method: 'POST'
      });
      
      showNotification('Documents synchronized successfully');
      loadDirectoryContents();
    } catch (error) {
      console.error('Error syncing documents:', error);
      showNotification(`Error during synchronization: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  

  // Buttons to render in the toolbar area
  const renderActionButtons = () => {
    // Show file/folder management buttons
    if (!selectedItems.length) {
      return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
            disabled={loading}
            size="small"
          >
            Upload Files
          </Button>
          
          <Button
            variant="contained"
            startIcon={<CreateFolderIcon />}
            onClick={handleCreateFolder}
            disabled={loading}
            size="small"
          >
            New Folder
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadDirectoryContents()}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
          

        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleUpload}
          disabled={loading}
          size="small"
        >
          Upload Files
        </Button>
        
        <Button
          variant="contained"
          startIcon={<CreateFolderIcon />}
          onClick={handleCreateFolder}
          disabled={loading}
          size="small"
        >
          New Folder
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => loadDirectoryContents()}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<CloudSyncIcon />}
          onClick={handleSync}
          disabled={loading}
          size="small"
        >
          Sync Now
        </Button>
      </Box>
    );
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Document Explorer
        </Typography>
        

        
        {/* Main content with Apple-inspired design */}
        <MacOSPaper 
          elevation={1}
          sx={{
            p: 0,
            minHeight: '70vh',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              {/* Left navigation and cloud provider section */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {/* Navigation buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  <IconButton
                    onClick={navigateUp}
                    disabled={currentPath === '/'}
                    aria-label="Go to parent folder"
                    size="small"
                  >
                    <BackIcon />
                  </IconButton>
                  
                  <IconButton
                    onClick={() => navigateToFolder({ name: 'Root', path: '/' })} 
                    aria-label="Go to root"
                    size="small"
                    sx={{ mx: 0.5 }}
                  >
                    <HomeIcon />
                  </IconButton>
                </Box>
                
                {/* Google Drive connection section */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    p: 0.5,
                    mr: 2,
                    bgcolor: googleDriveAuth.authenticated ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                  }}
                >
                  <img 
                    src="/google-drive-icon.png" 
                    alt="Google Drive" 
                    style={{ width: 24, height: 24, marginRight: 8 }} 
                    onError={(e) => {
                      e.target.src = 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png';
                      e.target.style.width = '24px';
                      e.target.style.height = '24px';
                    }}
                  />
                  
                  {googleDriveAuth.loading ? (
                    <CircularProgress size={20} />
                  ) : googleDriveAuth.authenticated ? (
                    <>
                      <Typography variant="body2" sx={{ mr: 1, color: 'success.main' }}>
                        Connected
                      </Typography>
                      <Tooltip title="Sync Google Drive" arrow>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={handleGoogleDriveSync}
                        >
                          <CloudSyncIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={handleGoogleDriveAuth}
                      startIcon={<CloudIcon />}
                    >
                      Connect
                    </Button>
                  )}
                </Box>
                
                {/* OneDrive connection section */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    p: 0.5,
                    mr: 2,
                    bgcolor: oneDriveAuth.authenticated ? 'rgba(0, 120, 212, 0.1)' : 'transparent'
                  }}
                >
                  <img 
                    src="/onedrive-icon.png" 
                    alt="OneDrive" 
                    style={{ width: 24, height: 24, marginRight: 8 }} 
                    onError={(e) => {
                      e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg';
                      e.target.style.width = '24px';
                      e.target.style.height = '24px';
                    }}
                  />
                  
                  {oneDriveAuth.loading ? (
                    <CircularProgress size={20} />
                  ) : oneDriveAuth.authenticated ? (
                    <>
                      <Typography variant="body2" sx={{ mr: 1, color: 'info.main' }}>
                        Connected
                      </Typography>
                      <Tooltip title="Sync not implemented" arrow>
                        <span>
                          <IconButton 
                            size="small" 
                            color="primary"
                            disabled={true}
                          >
                            <CloudSyncIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  ) : (
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={handleOneDriveAuth}
                      startIcon={<CloudIcon />}
                    >
                      Connect
                    </Button>
                  )}
                </Box>
                
                {/* Right actions section */}
                <Box>
                  {renderActionButtons()}
                </Box>
              </Box>
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
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Uploading... {uploadProgress}%
                </Typography>
              </Box>
            )}
            
            {/* Clipboard operations notice */}
            {showPasteButton && clipboardItems.length > 0 && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  mb: 2, 
                  p: 1.5, 
                  bgcolor: 'info.light', 
                  color: 'info.contrastText',
                  borderRadius: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Badge badgeContent={clipboardItems.length} color="primary" sx={{ mr: 2 }}>
                    {clipboardOperation === 'copy' ? <ContentCopyIcon /> : <DriveFileMoveIcon />}
                  </Badge>
                  <Typography variant="body2">
                    {clipboardOperation === 'copy' ? 'Items ready to copy' : 'Items ready to move'}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handlePaste}
                  startIcon={<CheckedIcon />}
                >
                  Paste Here
                </Button>
              </Box>
            )}
            
            {/* Empty state - no files or folders */}
            {!loading && !error && items.length === 0 && (
              <Box 
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '70vh',
                  p: 3,
                  textAlign: 'center'
                }}
              >
                <MinioIcon sx={{ fontSize: 64, color: '#1E88E5', mb: 2, opacity: 0.7 }} />
                <Typography variant="h6" gutterBottom>
                  No files or folders yet
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
                        onClick={(e) => handleItemSelection(item, e)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
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
                  Array.from(e.target.files).forEach(file => uploadFileToMinio(file));
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
                  const basePath = currentPath === '/' ? '' : currentPath;
                  Array.from(e.target.files).forEach(file => {
                    const relativePath = file.webkitRelativePath;
                    const filePath = basePath + '/' + relativePath;
                    uploadFileToMinio(file, filePath);
                  });
                  e.target.value = null;
                }
              }}
              style={{ display: 'none' }}
              directory=""
              webkitdirectory=""
            />
          </Box>
        </MacOSPaper>        
        {/* Context menu */}
        <Menu
          open={Boolean(contextMenu)}
          onClose={handleCloseContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
          }
        >
          {/* Options pour les fichiers uniquement */}
          {contextMenu && selectedItems.length === 1 && !selectedItems[0].is_directory && (
            <MenuItem onClick={() => handleContextMenuAction('download')}>
              <ListItemIcon>
                <CloudDownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>
          )}
          
          {/* Option Renommer - uniquement pour une sélection simple */}
          {selectedItems.length === 1 && (
            <MenuItem onClick={() => handleContextMenuAction('rename')}>
              <ListItemIcon>
                <RenameIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Rename</ListItemText>
            </MenuItem>
          )}
          
          {/* Option Copier */}
          <MenuItem onClick={() => handleContextMenuAction('copy')}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copy</ListItemText>
          </MenuItem>
          
          {/* Option Déplacer */}
          <MenuItem onClick={() => handleContextMenuAction('move')}>
            <ListItemIcon>
              <DriveFileMoveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Move</ListItemText>
          </MenuItem>
          
          {/* Option Supprimer - disponible pour toute sélection */}
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
