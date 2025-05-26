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
  Fab
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
  Home as HomeIcon,
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
  DataObject as QdrantIcon
} from '@mui/icons-material';
import nextcloudService from '../lib/nextcloud';
import axios from 'axios';
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

// Fonction pour déterminer l'icône en fonction de l'extension du fichier
const getFileIcon = (fileName, isDirectory) => {
  if (isDirectory) return <FolderIcon sx={{ fontSize: 48, color: '#FFC107' }} />;
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return <PdfIcon sx={{ fontSize: 48, color: '#F44336' }} />;
    case 'doc':
    case 'docx':
    case 'odt':
      return <DocumentIcon sx={{ fontSize: 48, color: '#2196F3' }} />;
    case 'xls':
    case 'xlsx':
    case 'ods':
      return <SpreadsheetIcon sx={{ fontSize: 48, color: '#4CAF50' }} />;
    case 'ppt':
    case 'pptx':
    case 'odp':
      return <PresentationIcon sx={{ fontSize: 48, color: '#FF9800' }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return <ImageIcon sx={{ fontSize: 48, color: '#9C27B0' }} />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
    case 'webm':
      return <VideoIcon sx={{ fontSize: 48, color: '#E91E63' }} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return <AudioIcon sx={{ fontSize: 48, color: '#009688' }} />;
    case 'js':
    case 'py':
    case 'java':
    case 'html':
    case 'css':
    case 'php':
    case 'c':
    case 'cpp':
    case 'go':
      return <CodeIcon sx={{ fontSize: 48, color: '#607D8B' }} />;
    case 'txt':
      return <TextIcon sx={{ fontSize: 48, color: '#795548' }} />;
    case 'md':
    case 'markdown':
      return <MarkdownIcon sx={{ fontSize: 48, color: '#673AB7' }} />;
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z':
      return <ArchiveIcon sx={{ fontSize: 48, color: '#795548' }} />;
    default:
      return <FileIcon sx={{ fontSize: 48, color: '#607D8B' }} />;
  }
};

// Composant principal de l'explorateur de fichiers Nextcloud
const NextcloudExplorer = () => {
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
    
    // Vérifier si des dossiers sont déposés
    const items = Array.from(e.dataTransfer.items || []);
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length === 0) return;
    
    // Initialiser la progression
    const progressObj = {};
    droppedFiles.forEach(file => {
      progressObj[file.name] = 0;
    });
    setUploadProgress(progressObj);
    
    try {
      // Vérifier si l'API webkitGetAsEntry est disponible (pour les dossiers)
      if (items.length > 0 && items[0].webkitGetAsEntry) {
        const entries = items.map(item => item.webkitGetAsEntry());
        
        // Traiter tous les items déposés
        for (const entry of entries) {
          if (entry.isDirectory) {
            // Créer d'abord le dossier
            const folderPath = `${currentPath}${entry.name}`;
            await createFolderIfNotExists(folderPath);
            
            // Traiter récursivement le contenu du dossier
            await processDirectoryEntry(entry, folderPath);
          } else if (entry.isFile) {
            // Traiter un fichier simple
            entry.file(async (file) => {
              await uploadFile(file);
            });
          }
        }
      } else {
        // Si l'API webkitGetAsEntry n'est pas disponible, uploader simplement les fichiers
        for (const file of droppedFiles) {
          await uploadFile(file);
        }
      }
      
      // Recharger le contenu du répertoire après l'upload
      loadDirectoryContents();
    } catch (err) {
      console.error('Erreur lors du téléversement des fichiers:', err);
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
      // Construire le chemin complet du fichier
      const filePath = `${currentPath}${file.name}`;
      
      // Téléverser le fichier directement avec le service Nextcloud
      // en lui passant le chemin et le fichier (pas le FormData)
      await nextcloudService.uploadFile(filePath, file);
      
      // Simuler la progression car nous n'avons pas encore implémenté le suivi réel
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 100
      }));
      
      // Synchroniser avec Qdrant après le téléversement
      synchronizeWithQdrant();
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'upload de ${file.name}:`, error);
      throw error;
    }
  };
  
  // Fonction pour charger le contenu du répertoire actuel
  const loadDirectoryContents = async () => {
    try {
      setLoading(true);
      setError(null);
      const contents = await nextcloudService.getDirectoryContents(currentPath);
      setItems(contents);
    } catch (err) {
      console.error('Erreur lors du chargement du répertoire:', err);
      
      // Message d'erreur plus précis selon le type d'erreur
      if (err.response) {
        // Erreur de réponse du serveur
        if (err.response.status === 401) {
          setError('Erreur d\'authentification. Vérifiez vos identifiants Nextcloud.');
        } else if (err.response.status === 403) {
          setError('Accès refusé. Vous n\'avez pas les permissions nécessaires.');
        } else if (err.response.status === 404) {
          setError('Dossier introuvable. Le chemin demandé n\'existe pas.');
        } else {
          setError(`Erreur serveur: ${err.response.status}. Vérifiez la configuration de Nextcloud.`);
        }
      } else if (err.message && err.message.includes('Network Error')) {
        // Erreur réseau (CORS, etc.)
        setError('Erreur réseau. Vérifiez que le serveur Nextcloud est accessible et que CORS est configuré.');
      } else if (err.message && err.message.includes('timeout')) {
        setError('Délai d\'attente dépassé. Le serveur Nextcloud met trop de temps à répondre.');
      } else {
        setError(`Erreur lors du chargement du contenu: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setLoading(false);
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
      await nextcloudService.createDirectory(`${currentPath}${folderName}`);
      setCreateFolderDialog(false);
      setFolderName('');
      await loadDirectoryContents();
    } catch (err) {
      console.error('Erreur lors de la création du dossier:', err);
      setError('Erreur lors de la création du dossier.');
    } finally {
      setLoading(false);
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
      
      await nextcloudService.moveItem(oldPath, newPath);
      
      setRenameDialog(false);
      setNewName('');
      setSelectedItem(null);
      await loadDirectoryContents();
    } catch (err) {
      console.error('Erreur lors du renommage:', err);
      setError('Erreur lors du renommage de l\'élément.');
    } finally {
      setLoading(false);
    }
  };
  
  // Supprimer un élément
  const handleItemSelection = (item, event) => {
    // Si la touche Ctrl est enfoncée ou si nous sommes en mode sélection
    if (event.ctrlKey || isSelectionMode) {
      event.stopPropagation();
      event.preventDefault();
      
      setIsSelectionMode(true);
      
      // Vérifier si l'item est déjà sélectionné
      const isAlreadySelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
      
      if (isAlreadySelected) {
        // Désélectionner l'item
        setSelectedItems(prev => prev.filter(selectedItem => selectedItem.id !== item.id));
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
  
  // Supprimer plusieurs éléments
  const handleDeleteMultiple = async () => {
    if (selectedItems.length === 0) return;
    
    // Confirmation de suppression
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItems.length} élément(s) ?`)) {
      try {
        for (const item of selectedItems) {
          await nextcloudService.deleteItem(item.path);
        }
        
        // Recharger le contenu et réinitialiser la sélection
        loadDirectoryContents();
        setSelectedItems([]);
        setIsSelectionMode(false);
      } catch (err) {
        console.error('Erreur lors de la suppression multiple:', err);
        setError(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
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
      nextcloudService.deleteItem(selectedItem.path)
        .then(() => {
          loadDirectoryContents();
        })
        .catch(err => {
          console.error('Erreur lors de la suppression:', err);
          setError(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
        });
    }
  };
  
  // Partager un élément
  const handleShare = async () => {
    if (!selectedItem || (!shareWith && shareType !== 3)) return;
    
    try {
      setLoading(true);
      
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
      
      setShareDialog(false);
      setShareWith('');
      setSelectedItem(null);
    } catch (err) {
      console.error('Erreur lors du partage:', err);
      setError('Erreur lors du partage de l\'élément.');
    } finally {
      setLoading(false);
    }
  };
  
  // Télécharger un fichier
  const handleDownload = async (item) => {
    try {
      const fileContent = await nextcloudService.getFileContents(item.path);
      
      // Créer un blob à partir du contenu
      const blob = new Blob([fileContent], { type: 'application/octet-stream' });
      
      // Créer une URL pour le téléchargement
      const url = window.URL.createObjectURL(blob);
      
      // Créer un lien et déclencher le téléchargement
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.click();
      
      // Libérer l'URL
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      setError('Erreur lors du téléchargement du fichier.');
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
      setSnackbarMessage(`Synchronisation avec Qdrant démarrée pour: ${currentPath}`);
      setSnackbarOpen(true);
      
      const response = await axios.post(`${API_BASE_URL}/api/nextcloud/ingest-directory`, requestBody);
      
      // Mettre à jour le statut
      setIngestLoading(false);
      setSnackbarMessage('Documents synchronisés avec Qdrant avec succès');
      setSnackbarOpen(true);
      
      // Mise à jour du statut d'ingération avec succès
      setLastSyncInfo({
        status: 'success',
        message: `Synchronisation terminée avec succès`,
        timestamp: new Date(),
        path: response.data.path,
        fileCount: response.data.fileCount || '?'
      });
      
    } catch (err) {
      console.error('Erreur lors de la synchronisation avec Qdrant:', err);
      setSnackbarMessage('Erreur lors de la synchronisation avec Qdrant');
      setSnackbarOpen(true);
      setIngestLoading(false);
      
      // Mise à jour du statut d'ingération avec erreur
      setLastSyncInfo({
        status: 'error',
        message: `Erreur: ${err.response?.data?.detail || err.message || 'Erreur inconnue'}`,
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
      
      const response = await axios.post(`${API_BASE_URL}/api/nextcloud/ingest-directory`, requestBody);
      
      setIngestSuccess(true);
      setSnackbarMessage(`Ingestion démarrée: ${response.data.path} (${response.data.status})`);
      setSnackbarOpen(true);
      
      // Mise à jour du statut d'ingération avec succès
      setLastSyncInfo({
        status: 'success',
        message: `Ingestion démarrée avec succès: ${response.data.path}`,
        timestamp: new Date(),
        path: response.data.path,
        fileCount: response.data.fileCount || '?'
      });
      
      // Fermer le dialogue après un court délai
      setTimeout(() => {
        setIngestDialog(false);
        setIngestLoading(false);
      }, 1500);
      
    } catch (err) {
      console.error('Erreur lors de l\'ingestion:', err);
      setIngestError(err.response?.data?.detail || err.message || 'Erreur lors de l\'ingestion');
      setIngestLoading(false);
      
      // Mise à jour du statut d'ingération avec erreur
      setLastSyncInfo({
        status: 'error',
        message: `Erreur: ${err.response?.data?.detail || err.message || 'Erreur inconnue'}`,
        timestamp: new Date(),
        path: currentPath,
        fileCount: 0
      });
    }
  };
  
  // Générer les éléments du fil d'Ariane
  const generateBreadcrumbs = () => {
    if (currentPath === '/') {
      return (
        <Breadcrumbs aria-label="breadcrumb">
          <Typography color="text.primary">Accueil</Typography>
        </Breadcrumbs>
      );
    }
    
    const parts = currentPath.split('/').filter(part => part);
    const breadcrumbs = [];
    
    breadcrumbs.push(
      <MuiLink
        key="home"
        underline="hover"
        color="inherit"
        onClick={navigateToRoot}
        sx={{ cursor: 'pointer' }}
      >
        Accueil
      </MuiLink>
    );
    
    let currentPathBuilder = '/';
    
    parts.forEach((part, index) => {
      currentPathBuilder += `${part}/`;
      
      if (index === parts.length - 1) {
        breadcrumbs.push(
          <Typography key={part} color="text.primary">
            {part}
          </Typography>
        );
      } else {
        breadcrumbs.push(
          <MuiLink
            key={part}
            underline="hover"
            color="inherit"
            onClick={() => navigateToFolder(currentPathBuilder)}
            sx={{ cursor: 'pointer' }}
          >
            {part}
          </MuiLink>
        );
      }
    });
    
    return (
      <Breadcrumbs aria-label="breadcrumb">
        {breadcrumbs}
      </Breadcrumbs>
    );
  };
  
  return (
    <Layout>
      <Container maxWidth="lg">
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
          } : {})
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Typography variant="h4" gutterBottom>
          Explorateur Nextcloud
        </Typography>
        
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
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              zIndex: 10,
              borderRadius: 1
            }}
          >
            <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" color="primary.main">
              Déposez vos fichiers ici
            </Typography>
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
              <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>
                Ce dossier est vide
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
                {items.map((item) => (
                  <Paper
                    key={item.id}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      // Appliquer un style spécial si l'élément est sélectionné
                      ...(selectedItems.some(selectedItem => selectedItem.id === item.id) ? {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                        borderColor: 'primary.main',
                        borderWidth: 1,
                        borderStyle: 'solid'
                      } : {})
                    }}
                    elevation={1}
                    onClick={(e) => handleItemSelection(item, e)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, height: '100%' }}>
                      {/* Utilisation de la fonction getFileIcon pour déterminer l'icône appropriée */}
                      {getFileIcon(decodeFileName(item.name), item.isDirectory)}
                      
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
                  <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
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
