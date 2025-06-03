import React, { useState, useEffect } from 'react';
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
  InputAdornment
} from '@mui/material';
import { Layout } from '../components/layout';
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
  Logout as LogoutIcon,
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
  Work as SharePointIcon
} from '@mui/icons-material';
import nextcloudService from '../lib/nextcloud';
import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

// Fonction utilitaire pour décoder les noms de fichiers URL-encodés
const decodeFileName = (fileName) => {
  try {
    return decodeURIComponent(fileName);
  } catch (e) {
    console.error('Erreur lors du décodage du nom de fichier', e);
    return fileName;
  }
};

// Fonction pour formater la taille des fichiers en unités lisibles (Ko, Mo, Go)
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Fonction pour obtenir l'icône appropriée pour un fichier
const getFileIcon = (fileName, isDirectory, size = 24) => {
  if (isDirectory) {
    return <FolderIcon sx={{ fontSize: size, color: '#FFC107' }} />;
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
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
    case 'conf':
      return <DataObjectIcon color="info" {...iconProps} />;
    case 'sql':
    case 'db':
    case 'sqlite':
      return <StorageIcon color="primary" {...iconProps} />;
    default:
      return <InsertDriveFileIcon color="action" {...iconProps} />;
  }
};

// Composant principal de l'explorateur de fichiers multi-sources
const NextcloudExplorer = () => {
  // État pour les providers de stockage
  const [activeProvider, setActiveProvider] = useState(0); // 0: MinIO, 1: Nextcloud, 2: Google Drive, 3: SharePoint
  
  // État de connexion pour chaque provider
  const [providerConnectionStatus, setProviderConnectionStatus] = useState({
    0: true, // MinIO toujours considéré comme connecté
    1: true, // Nextcloud toujours considéré comme connecté
    2: false, // Google Drive non connecté par défaut
    3: false  // SharePoint non connecté par défaut
  });
  
  // Tokens d'authentification pour les services externes
  const [authTokens, setAuthTokens] = useState({
    googleDrive: localStorage.getItem('googleDriveToken') || null,
    sharePoint: localStorage.getItem('sharePointToken') || null
  });
  
  // État local
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // État pour l'ingestion Qdrant
  const [ingestDialog, setIngestDialog] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const [ingestError, setIngestError] = useState(null);
  const [maxFiles, setMaxFiles] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Noms des providers pour affichage
  const providers = [
    { name: 'MinIO', icon: <MinioIcon />, color: '#FF6D00' },
    { name: 'Nextcloud', icon: <CloudIcon />, color: '#0082C9' },
    { name: 'Google Drive', icon: <GoogleDriveIcon />, color: '#4285F4' },
    { name: 'SharePoint', icon: <SharePointIcon />, color: '#0078D4' }
  ];
  
  // Changement de provider
  const handleProviderChange = (event, newValue) => {
    // Si le provider n'est pas connecté, ne pas charger le contenu
    if (!providerConnectionStatus[newValue]) {
      setActiveProvider(newValue);
      setCurrentPath('/');
      setItems([]);
      setError(`Veuillez vous connecter à ${providers[newValue].name} pour accéder à vos fichiers.`);
      return;
    }
    
    setActiveProvider(newValue);
    setCurrentPath('/');
    setItems([]);
    loadDirectoryContents();
  };
  
  // Statut de la dernière opération d'ingération
  const [lastSyncInfo, setLastSyncInfo] = useState({
    status: 'idle', // 'idle', 'syncing', 'success', 'error'
    message: '',
    timestamp: null,
    path: '/',
    fileCount: 0
  });
  
  // État pour les dialogues
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  
  // État pour les dialogues d'authentification
  const [googleAuthDialog, setGoogleAuthDialog] = useState(false);
  const [sharePointAuthDialog, setSharePointAuthDialog] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFolderDialog, setUploadFolderDialog] = useState(false);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [renameDialog, setRenameDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [shareDialog, setShareDialog] = useState(false);
  const [shareWith, setShareWith] = useState('');
  const [shareType, setShareType] = useState(0); // 0 = utilisateur, 1 = groupe, 3 = public

  // État pour le drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // État pour la sélection multiple
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [moveTargetDialog, setMoveTargetDialog] = useState(false);
  const [moveTargetPath, setMoveTargetPath] = useState('');

  // État pour le menu contextuel
  const [contextMenu, setContextMenu] = useState(null);
  
  // Charger le contenu du dossier actuel
  useEffect(() => {
    loadDirectoryContents();
  }, [currentPath]);
  
  // Référence pour compter les entrées/sorties drag
  const dragCounter = React.useRef(0);
  
  // Gestionnaires d'événements pour le drag and drop améliorés
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setIsDragging(true);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Réinitialiser le compteur et l'état
    dragCounter.current = 0;
    setIsDragging(false);
    
    // Vérifier si le provider actif est connecté
    if (!providerConnectionStatus[activeProvider]) {
      setError(`Veuillez vous connecter à ${providers[activeProvider].name} avant d'uploader des fichiers.`);
      return;
    }
    
    // Vérifier si des dossiers sont déposés
    const items = Array.from(e.dataTransfer.items || []);
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length === 0) return;
    
    // Afficher un message de préparation
    setSnackbarMessage(`Préparation de l'upload de ${droppedFiles.length} élément(s) vers ${providers[activeProvider].name}...`);
    setSnackbarOpen(true);
    
    // Initialiser la progression
    const progressObj = {};
    droppedFiles.forEach(file => {
      progressObj[file.name] = 0;
    });
    setUploadProgress(progressObj);
    
    // Compteurs pour le rapport final
    let successCount = 0;
    let errorCount = 0;
    
    try {
      // Vérifier si l'API webkitGetAsEntry est disponible (pour les dossiers)
      if (items.length > 0 && items[0].webkitGetAsEntry) {
        const entries = items.map(item => item.webkitGetAsEntry());
        
        // Traiter tous les items déposés
        for (const entry of entries) {
          if (entry.isDirectory) {
            try {
              // Créer d'abord le dossier
              const folderPath = `${currentPath}${entry.name}`;
              await createFolderIfNotExists(folderPath);
              
              // Traiter récursivement le contenu du dossier
              await processDirectoryEntry(entry, folderPath);
              successCount++;
            } catch (folderError) {
              console.error(`Erreur lors du traitement du dossier ${entry.name}:`, folderError);
              errorCount++;
            }
          } else if (entry.isFile) {
            // Traiter un fichier simple
            entry.file(async (file) => {
              try {
                await uploadFile(file);
                successCount++;
              } catch (fileError) {
                console.error(`Erreur lors de l'upload du fichier ${file.name}:`, fileError);
                errorCount++;
              }
            });
          }
        }
      } else {
        // Si l'API webkitGetAsEntry n'est pas disponible, uploader simplement les fichiers
        for (const file of droppedFiles) {
          try {
            await uploadFile(file);
            successCount++;
          } catch (fileError) {
            console.error(`Erreur lors de l'upload du fichier ${file.name}:`, fileError);
            errorCount++;
          }
        }
      }
      
      // Afficher un message récapitulatif
      if (successCount > 0 && errorCount === 0) {
        setSnackbarMessage(`${successCount} élément(s) uploadé(s) avec succès vers ${providers[activeProvider].name}.`);
      } else if (successCount > 0 && errorCount > 0) {
        setSnackbarMessage(`${successCount} élément(s) uploadé(s) avec succès, ${errorCount} échec(s).`);
      } else if (errorCount > 0) {
        setError(`Échec de l'upload de ${errorCount} élément(s).`);
      }
      setSnackbarOpen(true);
      
      // Recharger le contenu du répertoire après l'upload
      await loadDirectoryContents();
      
      // Synchroniser avec Qdrant après le téléversement de dossiers
      synchronizeWithQdrant();
    } catch (err) {
      console.error('Erreur lors du téléversement:', err);
      setError(`Erreur lors du téléversement: ${err.message || 'Erreur inconnue'}`);
    } finally {
      // Réinitialiser la progression
      setUploadProgress({});
    }
  };
  
  // Fonction récursive pour traiter un dossier et son contenu
  const processDirectoryEntry = async (directoryEntry, currentFolderPath) => {
    const reader = directoryEntry.createReader();
    
    // Fonction pour lire toutes les entrées d'un dossier
    const readEntries = () => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };
    
    let entries = [];
    let batch;
    
    // L'API readEntries peut ne pas retourner toutes les entrées en une seule fois
    do {
      batch = await readEntries();
      entries = [...entries, ...batch];
    } while (batch.length > 0);
    
    // Traiter chaque entrée du dossier
    for (const entry of entries) {
      if (entry.isDirectory) {
        // Créer le sous-dossier
        const subFolderPath = `${currentFolderPath}/${entry.name}`;
        await createFolderIfNotExists(subFolderPath);
        
        // Traiter récursivement le sous-dossier
        await processDirectoryEntry(entry, subFolderPath);
      } else if (entry.isFile) {
        // Uploader le fichier dans le dossier courant
        await new Promise((resolve, reject) => {
          entry.file(async (file) => {
            try {
              // Modifier le chemin pour inclure la structure du dossier
              const filePath = `${currentFolderPath}/${file.name}`;
              await nextcloudService.uploadFile(filePath, file);
              resolve();
            } catch (error) {
              reject(error);
            }
          }, reject);
        });
      }
    }
  };
  
  // Créer un dossier s'il n'existe pas déjà
  const createFolderIfNotExists = async (folderPath) => {
    try {
      await nextcloudService.createDirectory(folderPath);
      return true;
    } catch (error) {
      // Si le dossier existe déjà, ce n'est pas une erreur
      if (error.response && error.response.status === 405) {
        return true;
      }
      throw error;
    }
  };
  
  // Fonction pour téléverser un seul fichier avec progression
  const uploadFile = async (file) => {
    try {
      let success = false;
      
      switch (activeProvider) {
        case 0: // MinIO
          success = await uploadFileToMinio(file);
          break;
        case 1: // Nextcloud
          // Construire le chemin complet du fichier
          const filePath = `${currentPath}${file.name}`;
          
          // Téléverser le fichier directement avec le service Nextcloud
          await nextcloudService.uploadFile(filePath, file);
          success = true;
          break;
        case 2: // Google Drive
          // À implémenter
          break;
        case 3: // SharePoint
          // À implémenter
          break;
      }
      
      // Simuler la progression car nous n'avons pas encore implémenté le suivi réel
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 100
      }));
      
      return true;
    } catch (error) {
      console.error('Erreur lors du téléversement:', error);
      throw error;
    }
  };
  
  // Fonction pour charger le contenu du répertoire actuel selon le provider actif
  const loadDirectoryContents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Vérifier si le provider est connecté
      if (!providerConnectionStatus[activeProvider]) {
        setError(`Veuillez vous connecter à ${providers[activeProvider].name} pour accéder à vos fichiers.`);
        setItems([]);
        setLoading(false);
        return;
      }
      
      let contents = [];
      const providerName = providers[activeProvider].name;
      
      switch (activeProvider) {
        case 0: // MinIO
          contents = await loadMinioContents();
          break;
        case 1: // Nextcloud
          contents = await nextcloudService.getDirectoryContents(currentPath);
          break;
        case 2: // Google Drive
          contents = await loadGoogleDriveContents();
          break;
        case 3: // SharePoint
          contents = await loadSharePointContents();
          break;
        default:
          contents = [];
      }
      
      setItems(contents);
    } catch (err) {
      console.error(`Erreur lors du chargement du répertoire ${providers[activeProvider].name}:`, err);
      
      // Message d'erreur plus précis selon le type d'erreur
      if (err.response) {
        // Erreur de réponse du serveur
        if (err.response.status === 401) {
          setError(`Erreur d'authentification. Vérifiez vos identifiants ${providers[activeProvider].name}.`);
        } else if (err.response.status === 403) {
          setError('Accès refusé. Vous n\'avez pas les permissions nécessaires.');
        } else if (err.response.status === 404) {
          setError('Dossier introuvable. Le chemin demandé n\'existe pas.');
        } else {
          setError(`Erreur serveur: ${err.response.status}. Vérifiez la configuration de ${providers[activeProvider].name}.`);
        }
      } else if (err.message && err.message.includes('Network Error')) {
        // Erreur réseau (CORS, etc.)
        setError(`Erreur réseau. Vérifiez que le serveur ${providers[activeProvider].name} est accessible et que CORS est configuré.`);
      } else if (err.message && err.message.includes('timeout')) {
        setError(`Délai d'attente dépassé. Le serveur ${providers[activeProvider].name} met trop de temps à répondre.`);
      } else {
        setError(`Erreur lors du chargement du contenu: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour charger le contenu de MinIO
  const loadMinioContents = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/files?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();

      // Transformer les données pour correspondre au format utilisé dans l'interface
      return data.items.map(file => ({
        name: file.name,
        path: file.path,
        isDirectory: file.is_directory,
        contentType: file.content_type || '',
        size: file.size || 0,
        lastModified: file.last_modified ? new Date(file.last_modified) : null
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers MinIO:', error);
      throw error;
    }
  };
  
  // Fonction pour charger le contenu de Google Drive
  const loadGoogleDriveContents = async () => {
    if (!authTokens.googleDrive) {
      throw new Error('Non connecté à Google Drive');
    }
    
    try {
      // Appel à l'API Google Drive via notre backend
      const response = await authFetch(`${API_BASE_URL}/google-drive/list?path=${encodeURIComponent(currentPath)}`, {
        headers: {
          'Authorization': `Bearer ${authTokens.googleDrive}`
        }
      });
      
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers Google Drive:', error);
      throw error;
    }
  };
  
  // Fonction pour charger le contenu de SharePoint
  const loadSharePointContents = async () => {
    if (!authTokens.sharePoint) {
      throw new Error('Non connecté à SharePoint');
    }
    
    try {
      // Appel à l'API SharePoint via notre backend
      const response = await authFetch(`${API_BASE_URL}/sharepoint/list?path=${encodeURIComponent(currentPath)}`, {
        headers: {
          'Authorization': `Bearer ${authTokens.sharePoint}`
        }
      });
      
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers SharePoint:', error);
      throw error;
    }
  };
  
  // Gérer la navigation vers un dossier
  const navigateToFolder = (path) => {
    setCurrentPath(path);
  };
  
  // Remonter d'un niveau dans l'arborescence
  const navigateUp = () => {
    if (currentPath === '/') return;
    
    // Trouver le dernier séparateur pour remonter d'un niveau
    const lastSlashIndex = currentPath.lastIndexOf('/', currentPath.length - 2);
    if (lastSlashIndex === -1) {
      setCurrentPath('/');
    } else {
      setCurrentPath(currentPath.substring(0, lastSlashIndex + 1));
    }
  };
  
  // Retourner à la racine
  const navigateToRoot = () => {
    setCurrentPath('/');
  };
  
  // Créer un nouveau dossier
  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    
    try {
      setLoading(true);
      
      switch (activeProvider) {
        case 0: // MinIO
          await createMinioDirectory(`${currentPath}${folderName}`);
          break;
        case 1: // Nextcloud
          await nextcloudService.createDirectory(`${currentPath}${folderName}`);
          break;
        case 2: // Google Drive
          // À implémenter
          setError('Création de dossier dans Google Drive non implémentée');
          setLoading(false);
          return;
        case 3: // SharePoint
          // À implémenter
          setError('Création de dossier dans SharePoint non implémentée');
          setLoading(false);
          return;
        default:
          setError('Provider de stockage non reconnu');
          setLoading(false);
          return;
      }
      
      setCreateFolderDialog(false);
      setFolderName('');
      await loadDirectoryContents();
    } catch (err) {
      console.error(`Erreur lors de la création du dossier dans ${providers[activeProvider].name}:`, err);
      setError(`Erreur lors de la création du dossier: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Créer un dossier dans MinIO
  const createMinioDirectory = async (dirPath) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/directory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: dirPath }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la création du dossier MinIO:', error);
      throw error;
    }
  };
  
  // Téléverser des fichiers
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      
      if (files.length > 0) {
        setUploadingFiles(true);
        let allUploadsSuccessful = true;
        
        for (const file of files) {
          const success = await uploadFile(file);
          if (!success) allUploadsSuccessful = false;
        }
        
        setUploadingFiles(false);
        
        // Si tous les fichiers ont été téléversés avec succès, synchroniser avec Qdrant
        if (allUploadsSuccessful && files.length > 0) {
          setSnackbarMessage('Téléversement terminé. Synchronisation avec Qdrant en cours...');
          setSnackbarOpen(true);
          synchronizeWithQdrant();
        }
      }
    };
    
    input.click();
  };
  
  // Helper function for MinIO uploads, used by the main uploadFile function
  
  
  // Upload vers MinIO
  const uploadFileToMinio = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);
      
      const response = await authFetch(`${API_BASE_URL}/db/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur HTTP: ${response.status}`);
      }
      
      await loadDirectoryContents();
      return true;
    } catch (error) {
      console.error('Erreur lors du téléversement vers MinIO:', error);
      throw error;
    }
  };
  
  // Upload vers Nextcloud (utilise le service existant)
  const uploadFileToNextcloud = async (file) => {
    try {
      await nextcloudService.uploadFile(currentPath, file);
      await loadDirectoryContents();
      return true;
    } catch (error) {
      console.error('Erreur lors du téléversement vers Nextcloud:', error);
      throw error;
    }
  };
  
  // Téléverser des dossiers
  const handleFolderUpload = async () => {
    if (folders.length === 0) return;
    
    try {
      setLoading(true);
      
      for (const folder of folders) {
        // Récupération des fichiers du dossier avec la structure complète
        const items = Array.from(folder.webkitEntries || []);
        
        if (items.length > 0) {
          for (const entry of items) {
            if (entry.isDirectory) {
              // Créer le dossier principal
              const folderPath = `${currentPath}${entry.name}`;
              await createFolderIfNotExists(folderPath);
              
              // Traiter récursivement le contenu du dossier
              await processDirectoryEntry(entry, folderPath);
            } else if (entry.isFile) {
              // Uploader le fichier directement
              await new Promise((resolve, reject) => {
                entry.file(async (file) => {
                  try {
                    const filePath = `${currentPath}${file.name}`;
                    await nextcloudService.uploadFile(filePath, file);
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                }, reject);
              });
            }
          }
        } else {
          // Fallback pour les navigateurs qui ne supportent pas webkitEntries
          // Nous créons d'abord le dossier principal
          const folderName = folder.name || 'Nouveau_dossier';
          const folderPath = `${currentPath}${folderName}`;
          await createFolderIfNotExists(folderPath);
        }
      }
      
      setUploadFolderDialog(false);
      setFolders([]);
      await loadDirectoryContents();
      
      // Synchroniser avec Qdrant après le téléversement de dossiers
      synchronizeWithQdrant();
    } catch (err) {
      console.error('Erreur lors du téléversement des dossiers:', err);
      setError('Erreur lors du téléversement des dossiers.');
    } finally {
      setLoading(false);
    }
  };
  
  // Renommer un élément
  const handleRename = async () => {
    if (!newName.trim() || !selectedItem) return;
    
    try {
      setLoading(true);
      
      const oldPath = selectedItem.path;
      const newPath = `${currentPath}${newName}`;
      
      switch (activeProvider) {
        case 0: // MinIO
          await renameMinioItem(oldPath, newPath);
          break;
        case 1: // Nextcloud
          await nextcloudService.moveItem(oldPath, newPath);
          break;
        case 2: // Google Drive
          // À implémenter
          setError('Renommage dans Google Drive non implémenté');
          setLoading(false);
          return;
        case 3: // SharePoint
          // À implémenter
          setError('Renommage dans SharePoint non implémenté');
          setLoading(false);
          return;
        default:
          setError('Provider de stockage non reconnu');
          setLoading(false);
          return;
      }
      
      setRenameDialog(false);
      setNewName('');
      setSelectedItem(null);
      await loadDirectoryContents();
    } catch (err) {
      console.error(`Erreur lors du renommage dans ${providers[activeProvider].name}:`, err);
      setError(`Erreur lors du renommage: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Renommer un fichier ou dossier dans MinIO
  const renameMinioItem = async (oldPath, newPath) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/files/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          old_path: oldPath,
          new_path: newPath
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors du renommage MinIO:', error);
      throw error;
    }
  };
  
  // Gérer la sélection d'un élément
  const handleItemSelection = (item, event) => {
    // Si la touche Ctrl est enfoncée ou si nous sommes en mode sélection
    if (event.ctrlKey || isSelectionMode) {
      event.stopPropagation();
      event.preventDefault();
      
      setIsSelectionMode(true);
      
      // Vérifier si l'item est déjà sélectionné
      const isAlreadySelected = selectedItems.some(selectedItem => selectedItem.path === item.path);
      
      if (isAlreadySelected) {
        // Désélectionner l'item
        setSelectedItems(prev => prev.filter(selectedItem => selectedItem.path !== item.path));
      } else {
        // Ajouter l'item à la sélection
        setSelectedItems(prev => [...prev, item]);
      }
    } else {
      // Comportement normal (navigation ou téléchargement)
      if (item.isDirectory) {
        navigateToFolder(item.path);
      } else {
        handleDownload(item);
      }
    }
  };
  
  // Activer/désactiver le mode sélection
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Si on désactive le mode sélection, on efface la sélection
      setSelectedItems([]);
    }
  };
  
  // Sélectionner tous les éléments
  const handleSelectAll = () => {
    setIsSelectionMode(true);
    setSelectedItems(items.filter(item => 
      // Ne sélectionner que les éléments du provider actif
      // (Cette condition est toujours vraie actuellement puisque items ne contient
      // que les éléments du provider actif, mais c'est par sécurité pour les futures modifications)
      true
    ));
  };
  
  // Supprimer plusieurs éléments
  const handleDeleteMultiple = async () => {
    if (selectedItems.length === 0) return;
    
    // Confirmation de suppression
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItems.length} élément(s) ?`)) {
      try {
        setLoading(true);
        
        for (const item of selectedItems) {
          switch (activeProvider) {
            case 0: // MinIO
              await deleteMinioItem(item.path, item.isDirectory);
              break;
            case 1: // Nextcloud
              await nextcloudService.deleteItem(item.path);
              break;
            case 2: // Google Drive
              // À implémenter
              throw new Error('Suppression multiple dans Google Drive non implémentée');
            case 3: // SharePoint
              // À implémenter
              throw new Error('Suppression multiple dans SharePoint non implémentée');
            default:
              throw new Error('Provider de stockage non reconnu');
          }
        }
        
        // Recharger le contenu et réinitialiser la sélection
        loadDirectoryContents();
        setSelectedItems([]);
        setIsSelectionMode(false);
        
        // Synchroniser avec Qdrant après la suppression multiple
        synchronizeWithQdrant();
      } catch (err) {
        console.error(`Erreur lors de la suppression multiple dans ${providers[activeProvider].name}:`, err);
        setError(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Déplacer plusieurs éléments
  const handleMoveMultiple = () => {
    if (selectedItems.length === 0) return;
    setMoveTargetDialog(true);
  };
  
  // Exécuter le déplacement vers la destination choisie
  const executeMove = async () => {
    if (selectedItems.length === 0 || !moveTargetPath) return;
    
    try {
      for (const item of selectedItems) {
        // Construire le chemin de destination en conservant le nom du fichier/dossier
        const itemName = item.name;
        const targetPath = moveTargetPath.endsWith('/') 
          ? `${moveTargetPath}${itemName}` 
          : `${moveTargetPath}/${itemName}`;
        
        await nextcloudService.moveItem(item.path, targetPath);
      }
      
      // Fermer le dialogue, recharger le contenu et réinitialiser la sélection
      setMoveTargetDialog(false);
      setMoveTargetPath('');
      loadDirectoryContents();
      setSelectedItems([]);
      setIsSelectionMode(false);
      
      // Synchroniser avec Qdrant après le déplacement
      synchronizeWithQdrant();
    } catch (err) {
      console.error('Erreur lors du déplacement multiple:', err);
      setError(`Erreur lors du déplacement: ${err.message || 'Erreur inconnue'}`);
    }
  };
  
  // Gérer la suppression d'un seul élément (pour le menu contextuel)
  const handleDelete = () => {
    if (!selectedItem) return;
    
    // Confirmation de suppression
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItem.name} ?`)) {
      setLoading(true);
      
      const deleteItem = async () => {
        try {
          switch (activeProvider) {
            case 0: // MinIO
              await deleteMinioItem(selectedItem.path, selectedItem.isDirectory);
              break;
            case 1: // Nextcloud
              await nextcloudService.deleteItem(selectedItem.path);
              break;
            case 2: // Google Drive
              // À implémenter
              throw new Error('Suppression dans Google Drive non implémentée');
            case 3: // SharePoint
              // À implémenter
              throw new Error('Suppression dans SharePoint non implémentée');
            default:
              throw new Error('Provider de stockage non reconnu');
          }
          
          loadDirectoryContents();
          
          // Synchroniser avec Qdrant après la suppression
          synchronizeWithQdrant();
        } catch (err) {
          console.error(`Erreur lors de la suppression dans ${providers[activeProvider].name}:`, err);
          setError(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
        } finally {
          setLoading(false);
        }
      };
      
      deleteItem();
    }
  };
  
  // Supprimer un fichier ou dossier dans MinIO
  const deleteMinioItem = async (path, isDirectory) => {
    try {
      const recursive = isDirectory; // Si c'est un dossier, supprimer récursivement
      
      const response = await authFetch(`${API_BASE_URL}/db/files?path=${encodeURIComponent(path)}&recursive=${recursive}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la suppression MinIO:', error);
      throw error;
    }
  };
  
  // Partager un élément
  const handleShare = async () => {
    if (!selectedItem || (!shareWith && shareType !== 3)) return;
    
    try {
      setLoading(true);
      
      switch (activeProvider) {
        case 0: // MinIO
          if (shareType === 3) { // Lien public
            await createMinioShareLink(selectedItem.path);
          } else {
            // MinIO ne supporte pas le partage avec utilisateurs/groupes de la même manière que Nextcloud
            throw new Error('Le partage avec utilisateurs/groupes n\'est pas supporté par MinIO');
          }
          break;
        case 1: // Nextcloud
          // Définir les permissions en fonction du type de partage
          let permissions = 1; // Par défaut: lecture seule
          if (shareType === 3) {
            permissions = 1; // Lien public - lecture seule
          } else {
            permissions = 31; // Utilisateur/Groupe - toutes permissions
          }
          
          await nextcloudService.createShare(
            selectedItem.path,
            permissions,
            shareWith,
            shareType
          );
          break;
        case 2: // Google Drive
          // À implémenter
          throw new Error('Partage via Google Drive non implémenté');
        case 3: // SharePoint
          // À implémenter
          throw new Error('Partage via SharePoint non implémenté');
        default:
          throw new Error('Provider de stockage non reconnu');
      }
      
      setShareDialog(false);
      setShareWith('');
      setSelectedItem(null);
      setSuccess(`Partage réussi via ${providers[activeProvider].name}`);
    } catch (err) {
      console.error(`Erreur lors du partage via ${providers[activeProvider].name}:`, err);
      setError(`Erreur lors du partage: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Créer un lien de partage MinIO
  const createMinioShareLink = async (filePath) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/db/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Copier le lien dans le presse-papier si disponible
      if (data.share_url) {
        await navigator.clipboard.writeText(data.share_url);
        setSuccess('Lien de partage MinIO copié dans le presse-papier');
      }
      
      return data.share_url;
    } catch (error) {
      console.error('Erreur lors de la création du lien de partage MinIO:', error);
      throw error;
    }
  };
  
  // Télécharger un fichier
  const handleDownload = async (item) => {
    try {
      let downloadUrl;
      
      switch (activeProvider) {
        case 0: // MinIO
          downloadUrl = await getMinioDownloadUrl(item.path);
          break;
        case 1: // Nextcloud
          downloadUrl = await nextcloudService.getDownloadUrl(item.path);
          break;
        case 2: // Google Drive
          // À implémenter
          setError('Téléchargement depuis Google Drive non implémenté');
          return;
        case 3: // SharePoint
          // À implémenter
          setError('Téléchargement depuis SharePoint non implémenté');
          return;
        default:
          setError('Provider de stockage non reconnu');
          return;
      }
      
      // Créer un lien temporaire et cliquer dessus pour déclencher le téléchargement
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', item.name); // Suggérer un nom de fichier
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(`Erreur lors du téléchargement depuis ${providers[activeProvider].name}:`, err);
      setError(`Erreur lors du téléchargement du fichier: ${err.message || 'Erreur inconnue'}`);
    }
  };
  
  // Obtenir l'URL de téléchargement pour MinIO
  const getMinioDownloadUrl = async (filePath) => {
    try {
      // Utiliser l'endpoint de téléchargement de MinIO du backend
      return `${API_BASE_URL}/db/download?path=${encodeURIComponent(filePath)}`;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'URL de téléchargement MinIO:', error);
      throw error;
    }
  };
  
  // Ouvrir le menu contextuel
  const handleContextMenu = (event, item) => {
    event.preventDefault();
    setSelectedItem(item);
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
  };
  
  // Fermer le menu contextuel
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };
  
  // Ouvrir le dialogue d'ingestion
  const handleOpenIngestDialog = () => {
    setIngestDialog(true);
    setIngestError(null);
  };
  
  // Synchroniser avec Qdrant après un téléversement réussi
  const synchronizeWithQdrant = async () => {
    setIngestLoading(true);
    
    // Mise à jour du statut d'ingération
    setLastSyncInfo({
      status: 'syncing',
      message: `Synchronisation avec Qdrant démarrée: ${currentPath}`,
      timestamp: new Date(),
      path: currentPath,
      fileCount: 0
    });
    
    try {
      const requestBody = {
        path: currentPath,
        max_files: null // Ingérer tous les fichiers du répertoire courant
      };
      
      // Afficher un message discret
      setSnackbarMessage(`Synchronisation avec Qdrant démarrée pour ${providers[activeProvider].name}: ${currentPath}`);
      setSnackbarOpen(true);
      
      let endpoint;
      
      switch (activeProvider) {
        case 0: // MinIO
          endpoint = `${API_BASE_URL}/db/ingest-directory`;
          break;
        case 1: // Nextcloud
          endpoint = `${API_BASE_URL}/nextcloud/ingest-directory`;
          break;
        case 2: // Google Drive
          // À implémenter
          throw new Error('Synchronisation avec Google Drive non implémentée');
        case 3: // SharePoint
          // À implémenter
          throw new Error('Synchronisation avec SharePoint non implémentée');
        default:
          throw new Error('Provider de stockage non reconnu');
      }
      
      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erreur lors de la synchronisation avec Qdrant');
      const data = await res.json();
      // Mettre à jour le statut
      setIngestLoading(false);
      setSnackbarMessage('Documents synchronisés avec Qdrant avec succès');
      setSnackbarOpen(true);
      // Mise à jour du statut d'ingération avec succès
      setLastSyncInfo({
        status: 'success',
        message: `Synchronisation terminée avec succès`,
        timestamp: new Date(),
        path: data.path,
        fileCount: data.fileCount || '?'
      });
      
    } catch (err) {
      console.error('Erreur lors de la synchronisation avec Qdrant:', err);
      setSnackbarMessage('Erreur lors de la synchronisation avec Qdrant');
      setSnackbarOpen(true);
      setIngestLoading(false);
      // Mise à jour du statut d'ingération avec erreur
      setLastSyncInfo({
        status: 'error',
        message: `Erreur: ${err.message || 'Erreur inconnue'}`,
        timestamp: new Date(),
        path: currentPath,
        fileCount: 0
      });
    }
  };
  
  // Lancer l'ingestion des documents dans Qdrant
  const handleIngestToQdrant = async () => {
    setIngestLoading(true);
    setIngestError(null);
    
    // Mise à jour du statut d'ingération
    setLastSyncInfo({
      status: 'syncing',
      message: `Ingestion dans Qdrant démarrée: ${currentPath}`,
      timestamp: new Date(),
      path: currentPath,
      fileCount: 0
    });
    
    try {
      const requestBody = {
        path: currentPath,
        max_files: maxFiles ? parseInt(maxFiles) : null
      };
      
      const res = await authFetch(`${API_BASE_URL}/nextcloud/ingest-directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erreur lors de l\'ingestion');
      const data = await res.json();
      setIngestSuccess(true);
      setSnackbarMessage(`Ingestion démarrée: ${data.path} (${data.status})`);
      setSnackbarOpen(true);
      // Mise à jour du statut d'ingération avec succès
      setLastSyncInfo({
        status: 'success',
        message: `Ingestion démarrée avec succès: ${data.path}`,
        timestamp: new Date(),
        path: data.path,
        fileCount: data.fileCount || '?'
      });
      // Fermer le dialogue après un court délai
      setTimeout(() => {
        setIngestDialog(false);
        setIngestLoading(false);
      }, 1500);
      
    } catch (err) {
      console.error('Erreur lors de l\'ingestion:', err);
      setIngestError(err.message || 'Erreur lors de l\'ingestion');
      setIngestLoading(false);
      // Mise à jour du statut d'ingération avec erreur
      setLastSyncInfo({
        status: 'error',
        message: `Erreur: ${err.message || 'Erreur inconnue'}`,
        timestamp: new Date(),
        path: currentPath,
        fileCount: 0
      });
    }
  };

  // Fonctions d'authentification pour Google Drive et SharePoint
  const connectToGoogleDrive = async () => {
    try {
      setLoading(true);
      
      // Si nous avons un code d'autorisation, échangez-le contre un token
      if (authCode) {
        const response = await authFetch(`${API_BASE_URL}/google-drive/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code: authCode })
        });
        
        const data = await response.json();
        
        if (data.access_token) {
          // Sauvegarder le token dans localStorage et dans l'état
          localStorage.setItem('googleDriveToken', data.access_token);
          setAuthTokens(prev => ({ ...prev, googleDrive: data.access_token }));
          
          // Mettre à jour le statut de connexion
          setProviderConnectionStatus(prev => ({ ...prev, 2: true }));
          
          setGoogleAuthDialog(false);
          setAuthCode('');
          setError(null);
          
          // Charger le contenu après connexion réussie
          loadDirectoryContents();
        } else {
          setError('Erreur lors de l\'authentification Google Drive');
        }
      } else {
        // Obtenir l'URL d'autorisation
        const response = await authFetch(`${API_BASE_URL}/google-drive/auth-url`);
        const data = await response.json();
        
        // Ouvrir l'URL dans une nouvelle fenêtre
        if (data.auth_url) {
          window.open(data.auth_url, '_blank', 'width=600,height=700');
        } else {
          setError('Impossible d\'obtenir l\'URL d\'authentification Google Drive');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion à Google Drive:', error);
      setError(`Erreur lors de la connexion à Google Drive: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const connectToSharePoint = async () => {
    try {
      setLoading(true);
      
      // Si nous avons un code d'autorisation, échangez-le contre un token
      if (authCode) {
        const response = await authFetch(`${API_BASE_URL}/sharepoint/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code: authCode })
        });
        
        const data = await response.json();
        
        if (data.access_token) {
          // Sauvegarder le token dans localStorage et dans l'état
          localStorage.setItem('sharePointToken', data.access_token);
          setAuthTokens(prev => ({ ...prev, sharePoint: data.access_token }));
          
          // Mettre à jour le statut de connexion
          setProviderConnectionStatus(prev => ({ ...prev, 3: true }));
          
          setSharePointAuthDialog(false);
          setAuthCode('');
          setError(null);
          
          // Charger le contenu après connexion réussie
          loadDirectoryContents();
        } else {
          setError('Erreur lors de l\'authentification SharePoint');
        }
      } else {
        // Obtenir l'URL d'autorisation
        const response = await authFetch(`${API_BASE_URL}/sharepoint/auth-url`);
        const data = await response.json();
        
        // Ouvrir l'URL dans une nouvelle fenêtre
        if (data.auth_url) {
          window.open(data.auth_url, '_blank', 'width=600,height=700');
        } else {
          setError('Impossible d\'obtenir l\'URL d\'authentification SharePoint');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion à SharePoint:', error);
      setError(`Erreur lors de la connexion à SharePoint: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Déconnexion des services
  const disconnectService = (serviceId) => {
    if (serviceId === 2) { // Google Drive
      localStorage.removeItem('googleDriveToken');
      setAuthTokens(prev => ({ ...prev, googleDrive: null }));
      setProviderConnectionStatus(prev => ({ ...prev, 2: false }));
    } else if (serviceId === 3) { // SharePoint
      localStorage.removeItem('sharePointToken');
      setAuthTokens(prev => ({ ...prev, sharePoint: null }));
      setProviderConnectionStatus(prev => ({ ...prev, 3: false }));
    }
    
    // Réinitialiser l'état
    setItems([]);
    setCurrentPath('/');
  };
  
  // Vérifier les tokens au chargement
  useEffect(() => {
    // Vérifier si nous avons des tokens valides
    const checkTokens = async () => {
      // Google Drive
      if (authTokens.googleDrive) {
        try {
          // Tester le token en faisant une requête simple
          await authFetch(`${API_BASE_URL}/google-drive/validate-token`, {
            headers: {
              'Authorization': `Bearer ${authTokens.googleDrive}`
            }
          });
          setProviderConnectionStatus(prev => ({ ...prev, 2: true }));
        } catch (error) {
          console.error('Token Google Drive invalide:', error);
          localStorage.removeItem('googleDriveToken');
          setAuthTokens(prev => ({ ...prev, googleDrive: null }));
        }
      }
      
      // SharePoint
      if (authTokens.sharePoint) {
        try {
          // Tester le token en faisant une requête simple
          await authFetch(`${API_BASE_URL}/sharepoint/validate-token`, {
            headers: {
              'Authorization': `Bearer ${authTokens.sharePoint}`
            }
          });
          setProviderConnectionStatus(prev => ({ ...prev, 3: true }));
        } catch (error) {
          console.error('Token SharePoint invalide:', error);
          localStorage.removeItem('sharePointToken');
          setAuthTokens(prev => ({ ...prev, sharePoint: null }));
        }
      }
    };
    
    checkTokens();
    loadDirectoryContents();
  }, []);
  

  
  // Générer les breadcrumbs pour la navigation
  const generateBreadcrumbs = () => {
    const providerName = providers[activeProvider].name;
    
    if (currentPath === '/') {
      return (
        <Breadcrumbs aria-label="breadcrumb">
          <Box display="flex" alignItems="center">
            {providers[activeProvider].icon}
            <Typography color="text.primary" sx={{ ml: 1 }}>{providerName}</Typography>
          </Box>
        </Breadcrumbs>
      );
    }
    
    // Découper le chemin en segments
    const pathSegments = currentPath.split('/').filter(Boolean);
    let currentSegmentPath = '/';
    
    return (
      <Breadcrumbs aria-label="breadcrumb">
        <MuiLink 
          component="button" 
          variant="body1" 
          onClick={() => navigateToFolder('/')}
          underline="hover"
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          key="root-breadcrumb"
        >
          {providers[activeProvider].icon}
          <span style={{ marginLeft: '4px' }}>{providerName}</span>
        </MuiLink>
        
        {pathSegments.map((segment, index) => {
          currentSegmentPath += segment + '/';
          const path = currentSegmentPath;
          
          // Si c'est le dernier segment, c'est notre position actuelle
          if (index === pathSegments.length - 1) {
            return (
              <Typography key={`breadcrumb-${path}`} color="text.primary">
                {decodeFileName(segment)}
              </Typography>
            );
          }
          
          // Sinon, c'est un lien vers un parent
          return (
            <MuiLink
              key={`breadcrumb-${path}`}
              component="button"
              variant="body1"
              onClick={() => navigateToFolder(path)}
              underline="hover"
              sx={{ cursor: 'pointer' }}
            >
              {decodeFileName(segment)}
            </MuiLink>
          );
        })}
      </Breadcrumbs>
    );
  };
  
  return (
    <Layout>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Explorateur de Documents
        </Typography>
        
        {/* Tabs pour les différents providers */}
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={activeProvider}
            onChange={handleProviderChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            aria-label="storage providers tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: '72px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateY(-2px)'
                }
              },
              '& .Mui-selected': {
                fontWeight: 'bold',
                boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
              },
              mb: 2
            }}
          >
            {providers.map((provider, index) => (
              <Tab 
                key={index} 
                icon={
                  <Box sx={{ position: 'relative' }}>
                    {provider.icon}
                    {providerConnectionStatus[index] ? (
                      <Box 
                        sx={{ 
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: 'success.main',
                          border: '1px solid white',
                          boxShadow: '0 0 3px rgba(0,0,0,0.2)'
                        }}
                      />
                    ) : (
                      <Box 
                        sx={{ 
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: 'text.disabled',
                          border: '1px solid white',
                          boxShadow: '0 0 3px rgba(0,0,0,0.2)'
                        }}
                      />
                    )}
                  </Box>
                }
                label={provider.name} 
                id={`storage-tab-${index}`}
                aria-controls={`storage-tabpanel-${index}`}
                sx={{
                  opacity: providerConnectionStatus[index] ? 1 : 0.7,
                  '& .MuiSvgIcon-root': {
                    color: provider.color,
                    transition: 'all 0.3s ease',
                    fontSize: '1.5rem'
                  },
                  '&.Mui-selected': {
                    '& .MuiSvgIcon-root': {
                      transform: 'scale(1.2)'
                    }
                  }
                }}
              />
            ))}
          </Tabs>
        </Paper>
        
        {/* Afficher les boutons de connexion si le provider n'est pas connecté */}
        {(activeProvider === 2 && !providerConnectionStatus[2]) && (
          <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <GoogleDriveIcon sx={{ fontSize: 48, color: providers[2].color, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Connectez-vous à Google Drive</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pour accéder à vos fichiers Google Drive, vous devez autoriser l'application à y accéder.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<GoogleDriveIcon />} 
                onClick={() => setGoogleAuthDialog(true)}
                sx={{ 
                  backgroundColor: providers[2].color,
                  '&:hover': { backgroundColor: '#3367D6' }
                }}
              >
                Se connecter à Google Drive
              </Button>
            </Box>
          </Paper>
        )}
        
        {(activeProvider === 3 && !providerConnectionStatus[3]) && (
          <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <SharePointIcon sx={{ fontSize: 48, color: providers[3].color, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Connectez-vous à SharePoint</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pour accéder à vos fichiers SharePoint, vous devez autoriser l'application à y accéder.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<SharePointIcon />} 
                onClick={() => setSharePointAuthDialog(true)}
                sx={{ 
                  backgroundColor: providers[3].color,
                  '&:hover': { backgroundColor: '#106EBE' }
                }}
              >
                Se connecter à SharePoint
              </Button>
            </Box>
          </Paper>
        )}
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            my: 3, 
            position: 'relative',
            transition: 'all 0.3s ease',
            ...(isDragging ? {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderColor: 'primary.main',
              borderWidth: 2,
              borderStyle: 'dashed'
            } : {}),
            display: (!providerConnectionStatus[activeProvider]) ? 'none' : 'block'
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
            sx={{ mr: 1 }}
          >
            <HomeIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            {generateBreadcrumbs()}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Bouton de sélection multiple */}
            <Button
              color={isSelectionMode ? "secondary" : "primary"}
              variant={isSelectionMode ? "contained" : "outlined"}
              size="small"
              onClick={toggleSelectionMode}
              startIcon={isSelectionMode ? <CheckIcon /> : <SelectAllIcon />}
            >
              {isSelectionMode ? `${selectedItems.length} sélectionnés` : "Sélectionner"}
            </Button>
            
            {/* Boutons d'actions sur la sélection */}
            {isSelectionMode && (
              <>
                <Button
                  startIcon={<DeleteIcon />}
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={handleDeleteMultiple}
                  disabled={selectedItems.length === 0}
                >
                  Supprimer
                </Button>
                
                <Button
                  startIcon={<DriveFileMoveIcon />}
                  variant="outlined"
                  size="small"
                  onClick={handleMoveMultiple}
                  disabled={selectedItems.length === 0}
                >
                  Déplacer
                </Button>
              </>
            )}
            
            {/* Boutons standards quand pas en mode sélection */}
            {!isSelectionMode && (
              <>
                <Button
                  startIcon={<CreateFolderIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => setCreateFolderDialog(true)}
                >
                  Nouveau dossier
                </Button>
                
                <Button
                  startIcon={<UploadIcon />}
                  variant="contained"
                  size="small"
                  onClick={() => setUploadDialog(true)}
                >
                  Téléverser fichiers
                </Button>
                
                <Button
                  startIcon={<FolderIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => setUploadFolderDialog(true)}
                >
                  Téléverser dossier
                </Button>
              </>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Overlay pour le drag and drop */}
        {isDragging && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: providerConnectionStatus[activeProvider] ? 
                `rgba(${providers[activeProvider].color === 'primary.main' ? '25, 118, 210' : 
                  providers[activeProvider].color === '#4285F4' ? '66, 133, 244' : 
                  providers[activeProvider].color === '#0078D4' ? '0, 120, 212' : 
                  providers[activeProvider].color === '#FF9900' ? '255, 153, 0' : 
                  '25, 118, 210'}, 0.15)` : 
                'rgba(211, 47, 47, 0.1)',
              zIndex: 10,
              borderRadius: 1,
              border: '2px dashed',
              borderColor: providerConnectionStatus[activeProvider] ? 
                providers[activeProvider].color : 
                'error.main',
              backdropFilter: 'blur(2px)',
              transition: 'all 0.3s ease'
            }}
          >
            {providerConnectionStatus[activeProvider] ? (
              <>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 2,
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  p: 2,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}>
                  {activeProvider === 0 && <MinioIcon sx={{ fontSize: 48, color: providers[0].color }} />}
                  {activeProvider === 1 && <CloudIcon sx={{ fontSize: 48, color: providers[1].color }} />}
                  {activeProvider === 2 && <GoogleDriveIcon sx={{ fontSize: 48, color: providers[2].color }} />}
                  {activeProvider === 3 && <SharePointIcon sx={{ fontSize: 48, color: providers[3].color }} />}
                </Box>
                <Typography variant="h5" color={providers[activeProvider].color} sx={{ fontWeight: 'bold', mb: 1 }}>
                  Déposez vos fichiers ici
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Les fichiers seront uploadés vers {providers[activeProvider].name}
                </Typography>
              </>
            ) : (
              <>
                <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" color="error.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Connexion requise
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Veuillez vous connecter à {providers[activeProvider].name} avant d'uploader des fichiers
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={() => {
                    if (activeProvider === 2) setGoogleAuthDialog(true);
                    if (activeProvider === 3) setSharePointAuthDialog(true);
                  }}
                >
                  Se connecter
                </Button>
              </>
            )}
          </Box>
        )}
        
        {/* Affichage de la progression d'upload */}
        {Object.keys(uploadProgress).length > 0 && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Téléversement en cours...
            </Typography>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <Box key={fileName} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: '80%' }}>
                    {decodeFileName(fileName)}
                  </Typography>
                  <Typography variant="body2">{Math.round(progress)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            ))}
          </Box>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {items.length === 0 ? (
              <Paper elevation={0} sx={{ textAlign: 'center', py: 5, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {activeProvider === 0 && <MinioIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />}
                  {activeProvider === 1 && <CloudIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />}
                  {activeProvider === 2 && <GoogleDriveIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />}
                  {activeProvider === 3 && <SharePointIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />}
                  <Typography variant="body1" color="text.secondary">
                    Ce dossier est vide
                  </Typography>
                  {providerConnectionStatus[activeProvider] && (
                    <Button 
                      variant="contained" 
                      startIcon={<CloudUploadIcon />} 
                      sx={{ mt: 2 }}
                      onClick={() => setUploadDialog(true)}
                    >
                      Uploader des fichiers
                    </Button>
                  )}
                </Box>
              </Paper>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
                {items.map((item) => (
                  <Paper
                    key={`${item.path}-${item.name}`}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                      },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      // Appliquer un style spécial si l'élément est sélectionné
                      ...(selectedItems.some(selectedItem => selectedItem.path === item.path) ? {
                        backgroundColor: `rgba(${providers[activeProvider].color === 'primary.main' ? '25, 118, 210' : 
                          providers[activeProvider].color === '#4285F4' ? '66, 133, 244' : 
                          providers[activeProvider].color === '#0078D4' ? '0, 120, 212' : 
                          providers[activeProvider].color === '#FF9900' ? '255, 153, 0' : 
                          '25, 118, 210'}, 0.12)`,
                        borderColor: providers[activeProvider].color,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      } : {})
                    }}
                    draggable={!item.isDirectory}
                    onDragStart={(e) => {
                      if (!item.isDirectory) {
                        e.dataTransfer.setData('text/plain', item.path);
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          path: item.path,
                          name: item.name,
                          provider: activeProvider
                        }));
                      }
                    }}
                    elevation={1}
                    onClick={(e) => handleItemSelection(item, e)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, height: '100%' }}>
                      {/* Utilisation de la fonction getFileIcon pour déterminer l'icône appropriée */}
                      <Box sx={{ position: 'relative' }}>
                        {item.isDirectory ? 
                          <FolderIcon sx={{ fontSize: 40, color: providers[activeProvider].color }} /> : 
                          <Box sx={{ position: 'relative' }}>
                            {getFileIcon(decodeFileName(item.name), false, 40)}
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                bottom: -4, 
                                right: -4, 
                                width: 12, 
                                height: 12, 
                                borderRadius: '50%', 
                                backgroundColor: providers[activeProvider].color,
                                border: '1px solid white'
                              }} 
                            />
                          </Box>
                        }
                      </Box>
                      
                      {/* Affichage du nom décodé avec Tooltip pour voir le nom complet au survol */}
                      <Tooltip title={decodeFileName(item.name)} arrow placement="top">
                        <Typography 
                          variant="body2" 
                          noWrap 
                          sx={{ 
                            width: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {decodeFileName(item.name)}
                        </Typography>
                      </Tooltip>
                      
                      {/* Affichage de la taille du fichier pour les fichiers non-dossiers */}
                      {!item.isDirectory && item.size > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(item.size)}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Section d'information sur la synchronisation Qdrant */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 3, 
          border: '1px solid',
          borderColor: lastSyncInfo.status === 'success' ? 'success.light' : 
                       lastSyncInfo.status === 'error' ? 'error.light' : 
                       lastSyncInfo.status === 'syncing' ? 'info.light' : 'grey.300',
          borderRadius: 1,
          bgcolor: lastSyncInfo.status === 'success' ? 'success.50' : 
                   lastSyncInfo.status === 'error' ? 'error.50' : 
                   lastSyncInfo.status === 'syncing' ? 'info.50' : 'grey.50',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" gutterBottom>
            Statut de synchronisation avec Qdrant
          </Typography>
          
          {lastSyncInfo.status === 'syncing' && (
            <CircularProgress size={24} sx={{ ml: 2 }} />
          )}
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        {lastSyncInfo.status === 'idle' ? (
          <Typography variant="body2" color="text.secondary">
            Aucune synchronisation n'a encore été effectuée. Utilisez le bouton "Ingérer dans Qdrant" pour synchroniser vos documents.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>Statut:</strong> {lastSyncInfo.status === 'success' ? 'Terminé' : 
                                         lastSyncInfo.status === 'error' ? 'Erreur' : 
                                         lastSyncInfo.status === 'syncing' ? 'En cours' : 'Inconnu'}
              </Typography>
              
              <Typography variant="body2">
                <strong>Message:</strong> {lastSyncInfo.message}
              </Typography>
              
              <Typography variant="body2">
                <strong>Chemin:</strong> {lastSyncInfo.path}
              </Typography>
              
              {lastSyncInfo.fileCount > 0 && (
                <Typography variant="body2">
                  <strong>Fichiers traités:</strong> {lastSyncInfo.fileCount}
                </Typography>
              )}
              
              {lastSyncInfo.timestamp && (
                <Typography variant="body2">
                  <strong>Date:</strong> {new Date(lastSyncInfo.timestamp).toLocaleString()}
                </Typography>
              )}
            </Box>
            
            {lastSyncInfo.status === 'error' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {lastSyncInfo.message}
              </Alert>
            )}
          </>
        )}
      </Paper>
      
      {/* Menu contextuel */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            setNewName(selectedItem?.name || '');
            setRenameDialog(true);
            handleCloseContextMenu();
          }}
        >
          <RenameIcon fontSize="small" sx={{ mr: 1 }} />
          Renommer
        </MenuItem>
        <MenuItem
          onClick={() => {
            setShareDialog(true);
            handleCloseContextMenu();
          }}
        >
          <ShareIcon fontSize="small" sx={{ mr: 1 }} />
          Partager
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDelete();
            handleCloseContextMenu();
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Supprimer
        </MenuItem>
      </Menu>
      
      {/* Dialogue de création de dossier */}
      <Dialog open={createFolderDialog} onClose={() => setCreateFolderDialog(false)}>
        <DialogTitle>Créer un nouveau dossier</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du dossier"
            fullWidth
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderDialog(false)}>Annuler</Button>
          <Button onClick={handleCreateFolder} variant="contained">Créer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue de téléversement de fichiers */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)}>
        <DialogTitle>Téléverser des fichiers</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
            />
            {files.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Fichiers sélectionnés:</Typography>
                <ul>
                  {Array.from(files).map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Annuler</Button>
          <Button onClick={handleUpload} variant="contained" disabled={files.length === 0}>
            Téléverser
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue de téléversement de dossiers */}
      <Dialog open={uploadFolderDialog} onClose={() => setUploadFolderDialog(false)}>
        <DialogTitle>Téléverser des dossiers</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sélectionnez un ou plusieurs dossiers à téléverser dans le répertoire actuel.
            </Typography>
            <input
              type="file"
              multiple
              directory=""
              webkitdirectory=""
              onChange={(e) => {
                // Créer un objet par dossier principal
                const allFiles = Array.from(e.target.files);
                if (allFiles.length === 0) return;
                
                // Récupérer les dossiers principaux
                const rootFolders = new Set();
                allFiles.forEach(file => {
                  const path = file.webkitRelativePath;
                  const rootFolder = path.split('/')[0];
                  rootFolders.add(rootFolder);
                });
                
                // Créer un tableau d'objets dossier
                const folderObjects = Array.from(rootFolders).map(folderName => ({
                  name: folderName,
                  files: allFiles.filter(file => file.webkitRelativePath.startsWith(`${folderName}/`))
                }));
                
                setFolders(folderObjects);
              }}
            />
            {folders.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Dossiers sélectionnés:</Typography>
                <Box sx={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                  {folders.map((folder, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <FolderIcon sx={{ mr: 1, fontSize: 20, color: '#FFC107' }} />
                        {folder.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                        {folder.files.length} fichier(s)
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadFolderDialog(false)}>Annuler</Button>
          <Button onClick={handleFolderUpload} variant="contained" disabled={folders.length === 0}>
            Téléverser
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue de renommage */}
      <Dialog open={renameDialog} onClose={() => setRenameDialog(false)}>
        <DialogTitle>Renommer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nouveau nom"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(false)}>Annuler</Button>
          <Button onClick={handleRename} variant="contained">Renommer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue de partage */}
      <Dialog open={shareDialog} onClose={() => setShareDialog(false)}>
        <DialogTitle>Partager</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              select
              label="Type de partage"
              fullWidth
              value={shareType}
              onChange={(e) => setShareType(Number(e.target.value))}
              sx={{ mb: 2 }}
            >
              <MenuItem value={0}>Utilisateur</MenuItem>
              <MenuItem value={1}>Groupe</MenuItem>
              <MenuItem value={3}>Lien public</MenuItem>
            </TextField>
            
            {shareType !== 3 && (
              <TextField
                label={shareType === 0 ? "Partager avec (utilisateur)" : "Partager avec (groupe)"}
                fullWidth
                value={shareWith}
                onChange={(e) => setShareWith(e.target.value)}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog(false)}>Annuler</Button>
          <Button onClick={handleShare} variant="contained">Partager</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue de déplacement multiple */}
      <Dialog open={moveTargetDialog} onClose={() => setMoveTargetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Déplacer {selectedItems.length} élément(s)
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Sélectionnez le dossier de destination pour déplacer les éléments sélectionnés :
            </Typography>
            
            <TextField
              label="Chemin de destination"
              fullWidth
              value={moveTargetPath}
              onChange={(e) => setMoveTargetPath(e.target.value)}
              sx={{ mt: 2 }}
              placeholder="Exemple: /Documents/"
              helperText="Entrez le chemin complet du dossier de destination"
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Éléments à déplacer :
              </Typography>
              <Box sx={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                {selectedItems.map(item => (
                  <Box key={`${item.path}-${item.name}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    {getFileIcon(decodeFileName(item.name), item.isDirectory)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {decodeFileName(item.name)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveTargetDialog(false)}>Annuler</Button>
          <Button 
            onClick={executeMove} 
            variant="contained"
            disabled={!moveTargetPath}
          >
            Déplacer
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue d'ingestion dans Qdrant */}
      <Dialog 
        open={ingestDialog} 
        onClose={() => !ingestLoading && setIngestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ingérer les documents dans Qdrant</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {ingestSuccess ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Ingestion démarrée avec succès! Les documents seront traités en arrière-plan.
              </Alert>
            ) : (
              <Typography variant="body1" gutterBottom>
                Cette action va ingérer tous les documents du répertoire courant et ses sous-répertoires dans la base vectorielle Qdrant. 
                Les documents ingérés seront utilisables pour les requêtes RAG.
              </Typography>
            )}
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Répertoire à ingérer: <strong>{currentPath}</strong>
            </Typography>
            
            <TextField
              label="Nombre maximum de fichiers (optionnel)"
              fullWidth
              type="number"
              value={maxFiles}
              onChange={(e) => setMaxFiles(e.target.value)}
              sx={{ mt: 2 }}
              disabled={ingestLoading || ingestSuccess}
              helperText="Laissez vide pour ingérer tous les fichiers"
            />
            
            {ingestError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {ingestError}
              </Alert>
            )}
            
            {ingestLoading && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIngestDialog(false)} 
            disabled={ingestLoading}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleIngestToQdrant} 
            variant="contained"
            disabled={ingestLoading || ingestSuccess}
            startIcon={<CloudUploadIcon />}
          >
            Ingérer dans Qdrant
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue d'authentification Google Drive */}
      <Dialog 
        open={googleAuthDialog} 
        onClose={() => !loading && setGoogleAuthDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderTop: '4px solid',
            borderColor: providers[2].color,
            borderRadius: '8px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GoogleDriveIcon sx={{ color: providers[2].color, fontSize: 28 }} />
          Connexion à Google Drive
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(66, 133, 244, 0.05)', borderRadius: 2, mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Pour accéder à vos fichiers Google Drive, vous devez autoriser l'application via le processus OAuth de Google.
              </Typography>
            </Paper>
            
            <Stepper activeStep={authCode ? 1 : 0} orientation="vertical" sx={{ mb: 3 }}>
              <Step>
                <StepLabel StepIconProps={{ sx: { color: providers[2].color } }}>
                  <Typography variant="subtitle1">Obtenir un code d'autorisation</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cliquez sur le bouton ci-dessous pour ouvrir la page d'autorisation Google dans un nouvel onglet.
                    Suivez les instructions pour autoriser l'accès à vos fichiers Google Drive.
                  </Typography>
                  
                  <Button 
                    variant="contained" 
                    fullWidth
                    onClick={() => connectToGoogleDrive()}
                    disabled={loading}
                    startIcon={<GoogleDriveIcon />}
                    sx={{ 
                      mb: 2, 
                      backgroundColor: providers[2].color, 
                      '&:hover': { backgroundColor: '#3367D6' },
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                  >
                    Ouvrir la page d'autorisation Google
                  </Button>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel StepIconProps={{ sx: { color: providers[2].color } }}>
                  <Typography variant="subtitle1">Entrer le code d'autorisation</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Après avoir autorisé l'application, Google vous fournira un code. Copiez ce code et collez-le ci-dessous:
                  </Typography>
                  
                  <TextField
                    label="Code d'autorisation"
                    placeholder="Collez le code ici"
                    fullWidth
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    sx={{ mb: 2 }}
                    disabled={loading}
                    variant="outlined"
                    InputProps={{
                      endAdornment: authCode && (
                        <InputAdornment position="end">
                          <CheckCircleIcon color="success" />
                        </InputAdornment>
                      )
                    }}
                  />
                  
                  <Button 
                    onClick={() => connectToGoogleDrive()}
                    variant="contained"
                    disabled={!authCode || loading}
                    fullWidth
                    sx={{ 
                      backgroundColor: providers[2].color, 
                      '&:hover': { backgroundColor: '#3367D6' } 
                    }}
                  >
                    Valider et se connecter
                  </Button>
                </StepContent>
              </Step>
            </Stepper>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ mt: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => setError(null)}>
                    Réessayer
                  </Button>
                }
              >
                {error}
              </Alert>
            )}
            
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: 3, mb: 2 }}>
                <CircularProgress sx={{ color: providers[2].color }} />
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  Authentification en cours...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setGoogleAuthDialog(false)} 
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Annuler
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue d'authentification SharePoint */}
      <Dialog 
        open={sharePointAuthDialog} 
        onClose={() => !loading && setSharePointAuthDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderTop: '4px solid',
            borderColor: providers[3].color,
            borderRadius: '8px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SharePointIcon sx={{ color: providers[3].color, fontSize: 28 }} />
          Connexion à SharePoint
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(0, 120, 212, 0.05)', borderRadius: 2, mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Pour accéder à vos fichiers SharePoint, vous devez autoriser l'application via le processus OAuth de Microsoft.
              </Typography>
            </Paper>
            
            <Stepper activeStep={authCode ? 1 : 0} orientation="vertical" sx={{ mb: 3 }}>
              <Step>
                <StepLabel StepIconProps={{ sx: { color: providers[3].color } }}>
                  <Typography variant="subtitle1">Obtenir un code d'autorisation</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cliquez sur le bouton ci-dessous pour ouvrir la page d'autorisation Microsoft dans un nouvel onglet.
                    Suivez les instructions pour autoriser l'accès à vos fichiers SharePoint.
                  </Typography>
                  
                  <Button 
                    variant="contained" 
                    fullWidth
                    onClick={() => connectToSharePoint()}
                    disabled={loading}
                    startIcon={<SharePointIcon />}
                    sx={{ 
                      mb: 2, 
                      backgroundColor: providers[3].color, 
                      '&:hover': { backgroundColor: '#106EBE' },
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                  >
                    Ouvrir la page d'autorisation Microsoft
                  </Button>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel StepIconProps={{ sx: { color: providers[3].color } }}>
                  <Typography variant="subtitle1">Entrer le code d'autorisation</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Après avoir autorisé l'application, Microsoft vous fournira un code. Copiez ce code et collez-le ci-dessous:
                  </Typography>
                  
                  <TextField
                    label="Code d'autorisation"
                    placeholder="Collez le code ici"
                    fullWidth
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    sx={{ mb: 2 }}
                    disabled={loading}
                    variant="outlined"
                    InputProps={{
                      endAdornment: authCode && (
                        <InputAdornment position="end">
                          <CheckCircleIcon color="success" />
                        </InputAdornment>
                      )
                    }}
                  />
                  
                  <Button 
                    onClick={() => connectToSharePoint()}
                    variant="contained"
                    disabled={!authCode || loading}
                    fullWidth
                    sx={{ 
                      backgroundColor: providers[3].color, 
                      '&:hover': { backgroundColor: '#106EBE' } 
                    }}
                  >
                    Valider et se connecter
                  </Button>
                </StepContent>
              </Step>
            </Stepper>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ mt: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => setError(null)}>
                    Réessayer
                  </Button>
                }
              >
                {error}
              </Alert>
            )}
            
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: 3, mb: 2 }}>
                <CircularProgress sx={{ color: providers[3].color }} />
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  Authentification en cours...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSharePointAuthDialog(false)} 
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Annuler
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
      
      {/* Aucun Backdrop n'est utilisé pour la synchronisation - on utilise simplement les notifications */}
    </Container>
    </Layout>
  );
};

// Export du composant
export default NextcloudExplorer;
