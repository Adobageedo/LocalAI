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
  Tabs,
  Tab,
  Badge,
  Grid,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { Layout } from '../components/layout';
import PersonalDrive from '../components/PersonalDrive';
import GoogleDrive from '../components/GoogleDrive';
import { decodeFileName } from '../utils/fileUtils';

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
  Google as GoogleDriveIcon,
  Work as SharePointIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Services
import minioService from '../lib/minioService';
import gdriveService from '../lib/gdrive';
import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

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

// DocumentExplorer main component 
const DocumentExplorer = () => {
  // State management for providers
  const [activeProvider, setActiveProvider] = useState(0);
  const [providers, setProviders] = useState([
    { id: 'minio', name: 'Personal Drive', icon: <MinioIcon />, color: '#1E88E5', connected: true },
    { id: 'gdrive', name: 'Google Drive', icon: <GoogleDriveIcon />, color: '#4CAF50', connected: false }
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
  
  // Refs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  
  // États spécifiques à Google Drive
  const [gdriveAuth, setGdriveAuth] = useState({ 
    isAuthenticated: false, 
    checking: true, 
    user: null,
    error: null
  });
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  
  // Display notification
  const showNotification = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // Basic event handlers
  const handleProviderChange = (event, newValue) => {
    setActiveProvider(newValue);
    setCurrentPath('/');
    setBreadcrumbs([{ name: 'Root', path: '/' }]);
    setSelectedItems([]);
    
    // Vérifier l'authentification si Google Drive est sélectionné
    if (providers[newValue]?.id === 'gdrive') {
      checkGoogleDriveAuthStatus();
    }
    
    loadDirectoryContents();
  };
  
  // Main function to load directory contents based on active provider
  const loadDirectoryContents = () => {
    setLoading(true);
    setSelectedItems([]);
    setError(null);
    
    // Call appropriate loader based on active provider
    const currentProvider = providers[activeProvider]?.id;
    switch (currentProvider) {
      case 'minio':
        loadMinioContents();
        break;
      case 'gdrive':
        loadGoogleDriveContents();
        break;
      default:
        setLoading(false);
        setError('Unknown provider');
        break;
    }
  };

  // Initialize the component and check Google Drive auth status
  useEffect(() => {
    // Vérifier l'état d'authentification Google Drive au chargement
    if (providers.find(p => p.id === 'gdrive')) {
      checkGoogleDriveAuthStatus();
    }
    loadDirectoryContents();
  }, [activeProvider, currentPath]);
  
  // Vérifier le statut d'authentification Google Drive
  const checkGoogleDriveAuthStatus = async () => {
    try {
      setGdriveAuth(prev => ({ ...prev, checking: true, error: null }));
      const authStatus = await gdriveService.checkAuthStatus();
      console.log('Google Drive auth status:', authStatus);
      
      // Mettre à jour l'état des providers
      setProviders(prevProviders => {
        return prevProviders.map(provider => {
          if (provider.id === 'gdrive') {
            return {
              ...provider,
              connected: authStatus.authenticated,
              error: authStatus.error || null
            };
          }
          return provider;
        });
      });
      
      // Mettre à jour l'état d'authentification
      setGdriveAuth({
        isAuthenticated: authStatus.isAuthenticated,
        checking: false,
        user: authStatus.user || null,
        error: authStatus.error || null
      });
      
      return authStatus.isAuthenticated;
    } catch (error) {
      console.error('Error checking Google Drive auth status:', error);
      setGdriveAuth({
        isAuthenticated: false,
        checking: false,
        user: null,
        error: error.message
      });
      return false;
    }
  };

  // Google Drive content loader
  const loadGoogleDriveContents = async (pathOverride = null) => {
    try {
      setError(null);
      
      // Vérifier l'authentification
      if (!providers.find(p => p.id === 'gdrive')?.connected) {
        const isAuthenticated = await checkGoogleDriveAuthStatus();
        
        if (!isAuthenticated) {
          setAuthDialogOpen(true);
          setItems([]);
          setLoading(false);
          return;
        }
      }
      
      const pathToUse = pathOverride !== null ? pathOverride : currentPath;
      console.log('Loading Google Drive contents for path:', pathToUse);
      const items = await gdriveService.listFiles(pathToUse);
      
      // Sort items: directories first, then files alphabetically
      const sortedItems = [...items].sort((a, b) => {
        if (a.is_directory && !b.is_directory) return -1;
        if (!a.is_directory && b.is_directory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setItems(sortedItems);
      
      // Update breadcrumbs
      updateBreadcrumbs(pathToUse);
      
    } catch (error) {
      console.error('Error loading Google Drive contents:', error);
      setError(`Failed to load files: ${error.message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Authenticate with Google Drive
  const authenticateGoogleDrive = async () => {
    try {
      // Set documents as callback route after authentication
      const callbackUrl = window.location.origin + '/documents';
      console.log('Using callback URL:', callbackUrl);
      
      const result = await gdriveService.getAuthUrl(callbackUrl);
      if (result.auth_url) {
        window.location.href = result.auth_url;
      } else {
        showNotification('Failed to get authentication URL');
      }
    } catch (error) {
      console.error('Error getting Google Drive auth URL:', error);
      showNotification(`Authentication error: ${error.message}`);
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
      console.log('Loading MinIO contents for path:', pathToUse);
      const response = await minioService.listFiles(pathToUse);
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
    
    console.log('Navigating to folder, constructed path:', fullPath);
    setCurrentPath(fullPath);
    
    // Pass the path directly to avoid async state issues
    const currentProvider = providers[activeProvider]?.id;
    switch (currentProvider) {
      case 'minio':
        loadMinioContents(fullPath);
        break;
      case 'gdrive':
        loadGoogleDriveContents(fullPath);
        break;
      default:
        loadDirectoryContents();
        break;
    }
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
    
    // Déterminer si shift est pressé pour la sélection étendue
    const shiftKey = event.shiftKey;
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    
    // Pour les répertoires sans touche de modification, naviguer dans le répertoire
    if (item.is_directory && !ctrlOrMeta && !shiftKey) {
      console.log('Navigating to directory:', item.name);
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
        console.log('Double-click on directory, navigating:', item.name);
        navigateToFolder(item);
      } 
      // Si c'est un fichier et double-clic, télécharger
      else if (!item.is_directory && event.detail === 2) {
        const fullPath = buildFullPath(item);
        console.log('Double-click on file, downloading with full path:', fullPath);
        minioService.downloadFile(fullPath);
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
          await minioService.copyItem(sourceFullPath, targetPath);
        } else if (clipboardOperation === 'move') {
          await minioService.moveItem(sourceFullPath, targetPath);
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
          minioService.downloadFile(fullPath);
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={navigateToRoot} color="primary">
                <HomeIcon />
              </IconButton>
              <Breadcrumbs aria-label="breadcrumb" separator="/" sx={{ ml: 1 }}>
                {currentPath.split('/').filter(Boolean).length === 0 ? (
                    <Typography color="text.primary">Home</Typography>
                  ) : (
                    <MuiLink
                      component="button"
                      variant="body1"
                      onClick={() => navigateToRoot()}
                      sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                    >
                      Home
                    </MuiLink>
                  )}
                  
                  {currentPath.split('/').filter(Boolean).map((part, i, arr) => {
                    const path = '/' + arr.slice(0, i + 1).join('/');
                    return i === arr.length - 1 ? (
                      <Typography key={path} color="text.primary">
                        {decodeFileName(part)}
                      </Typography>
                    ) : (
                      <MuiLink
                        key={path}
                        component="button"
                        variant="body1"
                        onClick={() => navigateToFolder(path)}
                        sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {decodeFileName(part)}
                      </MuiLink>
                    );
                  })}
                </Breadcrumbs>
            </Box>
          
            <Box sx={{ display: 'flex' }}>
              {/* Display action buttons only for MinIO (connected provider) */}
              {providers[activeProvider].connected && (
                <>
                  <Tooltip title="Refresh">
                    <IconButton color="primary" onClick={loadMinioContents} size="small" sx={{ mr: 1 }}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Create Folder">
                    <IconButton color="primary" onClick={() => setDialogType('createFolder') || setDialogOpen(true)} size="small" sx={{ mr: 1 }}>
                      <CreateFolderIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Upload File">
                    <IconButton color="primary" onClick={() => fileInputRef.current.click()} size="small" sx={{ mr: 1 }}>
                      <UploadIcon />
                    </IconButton>
                  </Tooltip>
                  {showPasteButton && (
                    <Tooltip title={`Paste ${clipboardItems.length} item(s) (${clipboardOperation === 'copy' ? 'Copy' : 'Move'})`}>
                      <IconButton 
                        color="primary" 
                        onClick={handlePaste}
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
            
            {/* Empty state for MinIO is now handled in the PersonalDrive component */}
            
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
            
            {/* Google Drive Component */}
            {providers[activeProvider].id === 'gdrive' && (
              <GoogleDrive
                items={items}
                selectedItems={selectedItems}
                loading={loading}
                error={error}
                currentPath={currentPath}
                isConnected={providers[activeProvider].connected}
                onNavigateToFolder={navigateToFolder}
                onRefresh={loadGoogleDriveContents}
                onItemSelection={handleItemSelection}
                onContextMenu={handleContextMenu}
                onAuthenticate={authenticateGoogleDrive}
              />
            )}
            
            {/* Personal Drive Component (replacing MinIO section) */}
            {providers[activeProvider].id === 'minio' && (
              <PersonalDrive
                items={items}
                selectedItems={selectedItems}
                loading={loading}
                error={error}
                currentPath={currentPath}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                showPasteButton={showPasteButton}
                clipboardItems={clipboardItems}
                clipboardOperation={clipboardOperation}
                isDragging={isDragging}
                onNavigateToFolder={navigateToFolder}
                onRefresh={loadMinioContents}
                onCreateFolder={handleCreateFolder}
                onUploadFile={(files) => {
                  Array.from(files).forEach(file => uploadFileToMinio(file));
                }}
                onUploadFolder={(files) => {
                  const basePath = currentPath === '/' ? '' : currentPath;
                  Array.from(files).forEach(file => {
                    const relativePath = file.webkitRelativePath;
                    const filePath = basePath + '/' + relativePath;
                    uploadFileToMinio(file, filePath);
                  });
                }}
                onPaste={handlePaste}
                onItemSelection={handleItemSelection}
                onContextMenu={handleContextMenu}
              />
            )}
            
            {/* Drag overlay is now handled in the PersonalDrive component */}
          </Box>
        </MacOSPaper>
        
        {/* Hidden file inputs for uploads are now handled in the PersonalDrive component */}
        
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
        
        {/* Dialogue d'authentification Google Drive */}
        <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)}>
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <GoogleDriveIcon sx={{ mr: 1, color: '#4CAF50' }} />
              Google Drive Authentication
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              You need to authenticate with Google Drive to access your files.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This will open a new window where you can log in to your Google account and authorize this application.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAuthDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={authenticateGoogleDrive} 
              variant="contained" 
              startIcon={<GoogleDriveIcon />}
              sx={{ backgroundColor: '#4CAF50' }}
            >
              Connect to Google Drive
            </Button>
          </DialogActions>
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
