// Serveur proxy complet pour contourner les problèmes CORS avec Nextcloud
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Configuration
const PORT = process.env.PROXY_PORT || 3001;
const NEXTCLOUD_URL = process.env.VITE_NEXTCLOUD_URL || 'http://localhost:8080';
const NEXTCLOUD_USERNAME = process.env.VITE_NEXTCLOUD_USERNAME || 'admin';
const NEXTCLOUD_PASSWORD = process.env.VITE_NEXTCLOUD_PASSWORD || 'admin_password';

// Dossier temporaire pour les uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Configurer multer pour les uploads
const upload = multer({ dest: UPLOAD_DIR });

// Middleware pour parser le JSON
app.use(express.json());

// Activer CORS pour toutes les requêtes
app.use(cors());

// Créer l'en-tête d'authentification Basic
const auth = Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString('base64');

// Middleware pour le routage général Nextcloud
app.use('/nextcloud', createProxyMiddleware({
  target: NEXTCLOUD_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/nextcloud': '',
  },
  onProxyReq: (proxyReq) => {
    // Ajouter l'authentification Basic
    proxyReq.setHeader('Authorization', `Basic ${auth}`);
    console.log(`Proxying to: ${proxyReq.path}`);
  },
}));

// Route pour lister les fichiers et dossiers
app.get('/api/nextcloud/list', async (req, res) => {
  try {
    const path = req.query.path || '/remote.php/dav/files/' + NEXTCLOUD_USERNAME + '/';
    console.log(`Listing directory: ${path}`);
    
    // Envoyer une requête PROPFIND via axios
    const response = await axios({
      method: 'PROPFIND',
      url: `${NEXTCLOUD_URL}${path}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/xml',
        'Depth': '1',
      },
    });
    
    // Parser la réponse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    
    // Extraire les informations des fichiers et dossiers
    const responses = xmlDoc.getElementsByTagNameNS('DAV:', 'response');
    const items = [];
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      
      // Récupérer l'URL
      const href = response.getElementsByTagNameNS('DAV:', 'href')[0].textContent;
      
      // Ignorer le répertoire lui-même si son URL se termine par /
      if (path.endsWith('/') && href === path) continue;
      
      // Récupérer les propriétés
      const propstat = response.getElementsByTagNameNS('DAV:', 'propstat')[0];
      const prop = propstat.getElementsByTagNameNS('DAV:', 'prop')[0];
      
      // Déterminer si c'est un dossier
      const resourceType = prop.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
      const isDirectory = resourceType.getElementsByTagNameNS('DAV:', 'collection').length > 0;
      
      // Récupérer la taille
      let size = 0;
      const contentLength = prop.getElementsByTagNameNS('DAV:', 'getcontentlength');
      if (contentLength.length > 0) {
        size = parseInt(contentLength[0].textContent, 10);
      }
      
      // Récupérer la date de modification
      let lastModified = new Date().toISOString();
      const lastModifiedElements = prop.getElementsByTagNameNS('DAV:', 'getlastmodified');
      if (lastModifiedElements.length > 0) {
        lastModified = new Date(lastModifiedElements[0].textContent).toISOString();
      }
      
      // Extraire le nom du fichier de l'URL
      const name = decodeURIComponent(href.split('/').filter(Boolean).pop() || '');
      
      items.push({
        id: name,
        name: name,
        path: href,
        type: isDirectory ? 'directory' : 'file',
        size: size,
        lastModified: lastModified,
        isDirectory: isDirectory,
      });
    }
    
    res.json(items);
  } catch (error) {
    console.error('Error listing directory:', error);
    res.status(500).json({ 
      error: 'Failed to list directory', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route pour télécharger un fichier
app.get('/api/nextcloud/download', async (req, res) => {
  try {
    const path = req.query.path;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    console.log(`Downloading file: ${path}`);
    
    // Télécharger le fichier via axios
    const response = await axios({
      method: 'GET',
      url: `${NEXTCLOUD_URL}${path}`,
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      responseType: 'arraybuffer',
    });
    
    // Déterminer le type de contenu
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Envoyer le contenu du fichier
    res.send(response.data);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ 
      error: 'Failed to download file', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route pour créer un répertoire
app.post('/api/nextcloud/create-directory', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    console.log(`Creating directory: ${path}`);
    
    // Créer le répertoire via axios
    await axios({
      method: 'MKCOL',
      url: `${NEXTCLOUD_URL}${path}`,
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });
    
    res.json({ success: true, message: 'Directory created successfully' });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ 
      error: 'Failed to create directory', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route pour uploader un fichier
app.post('/api/nextcloud/upload', upload.single('file'), async (req, res) => {
  try {
    const { path } = req.body;
    const file = req.file;
    
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`Uploading file to: ${path}`);
    
    // Lire le fichier uploadé
    const fileContent = fs.readFileSync(file.path);
    
    // Uploader le fichier via axios
    await axios({
      method: 'PUT',
      url: `${NEXTCLOUD_URL}${path}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/octet-stream',
      },
      data: fileContent,
    });
    
    // Supprimer le fichier temporaire
    fs.unlinkSync(file.path);
    
    res.json({ success: true, message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Nettoyer le fichier temporaire en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to upload file', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route pour supprimer un fichier ou dossier
app.post('/api/nextcloud/delete', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    console.log(`Deleting: ${path}`);
    
    // Supprimer via axios
    await axios({
      method: 'DELETE',
      url: `${NEXTCLOUD_URL}${path}`,
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });
    
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ 
      error: 'Failed to delete item', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route pour déplacer/renommer un fichier ou dossier
app.post('/api/nextcloud/move', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Both oldPath and newPath parameters are required' });
    }
    
    console.log(`Moving from ${oldPath} to ${newPath}`);
    
    // Déplacer/renommer via axios
    await axios({
      method: 'MOVE',
      url: `${NEXTCLOUD_URL}${oldPath}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Destination': `${NEXTCLOUD_URL}${newPath}`,
        'Overwrite': 'F',
      },
    });
    
    res.json({ success: true, message: 'Item moved successfully' });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ 
      error: 'Failed to move item', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route pour vérifier si un fichier ou dossier existe
app.post('/api/nextcloud/exists', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    console.log(`Checking existence of: ${path}`);
    
    try {
      // Vérifier l'existence via axios
      await axios({
        method: 'HEAD',
        url: `${NEXTCLOUD_URL}${path}`,
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      
      // Si aucune exception n'est levée, le fichier existe
      res.json({ exists: true });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Le fichier n'existe pas
        res.json({ exists: false });
      } else {
        // Autre erreur
        throw error;
      }
    }
  } catch (error) {
    console.error('Error checking existence:', error);
    res.status(500).json({ 
      error: 'Failed to check existence', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route pour créer un partage
app.post('/api/nextcloud/share', async (req, res) => {
  try {
    const { path, permissions = 1, shareWith = null, shareType = 0 } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    console.log(`Creating share for: ${path}`);
    
    // Préparer les données pour le partage
    const formData = new URLSearchParams();
    formData.append('path', path);
    formData.append('shareType', shareType);
    
    if (shareWith && shareType !== 3) {
      formData.append('shareWith', shareWith);
    }
    
    formData.append('permissions', permissions);
    
    // Créer le partage via axios
    const response = await axios({
      method: 'POST',
      url: `${NEXTCLOUD_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: formData,
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({ 
      error: 'Failed to create share', 
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Route de test pour vérifier que le serveur est en cours d'exécution
app.get('/test', (req, res) => {
  res.json({ message: 'Proxy server is running!' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Proxying Nextcloud requests to ${NEXTCLOUD_URL}`);
});
