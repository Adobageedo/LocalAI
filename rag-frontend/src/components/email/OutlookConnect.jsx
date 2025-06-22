import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";
import { authFetch } from '../../firebase/authFetch';
import authProviders from "../../lib/authProviders";
import { 
  Box, Typography, Button, Alert, CircularProgress, TextField, Chip,
  Checkbox, FormControlLabel, Grid, Paper, Stack
} from '@mui/material';

// Provider logos
const PROVIDER_IMAGES = {
  outlook: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/826px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png"
};

export function OutlookConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [status, setStatus] = useState(null);
  const [folders, setFolders] = useState(["inbox", "sentitems"]);
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState("");
  const [forceReingest, setForceReingest] = useState(false);
  const [noAttachments, setNoAttachments] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Gérer le callback OAuth et le code d'autorisation
  useEffect(() => {
    // Vérifier si nous sommes sur la page de callback avec un code d'autorisation
    const currentUrl = window.location.href;
    const urlObj = new URL(currentUrl);
    const urlParams = new URLSearchParams(urlObj.search);
    
    // Si nous sommes sur la page de callback
    if (urlObj.pathname.includes('/api/sources/outlook/callback') && urlParams.get('code')) {
      setAuthLoading(true);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      // Appeler l'API backend pour échanger le code contre des tokens
      fetch(`${API_BASE_URL}/sources/outlook/callback?code=${code}&state=${state}`)
        .then(response => response.json())
        .then(data => {
          if (data.redirect_url) {
            // Rediriger vers l'URL fournie par le backend
            window.location.href = data.redirect_url;
          } else {
            // Rediriger vers la page d'importation en cas de succès sans URL explicite
            window.location.href = '/mail-import?auth=success&provider=outlook';
          }
        })
        .catch(error => {
          console.error('Erreur lors du traitement du code d\'autorisation:', error);
          setAuthStatus({
            type: 'error',
            message: 'Erreur lors de l\'authentification. Veuillez réessayer.'
          });
          window.location.href = '/mail-import?auth=error&provider=outlook';
        });
    }
    
    // Vérifier le statut d'authentification au chargement
    checkAuthStatus();
    
    // Vérifier si nous revenons d'une authentification réussie
    if (urlParams.get("auth") === "success" && urlParams.get("provider") === "outlook") {
      setAuthStatus({
        type: "success",
        message: "Authentification Outlook réussie ! Vous pouvez maintenant importer vos emails."
      });
      
      // Vérifier si l'auto-ingestion est demandée
      const shouldAutoIngest = urlParams.get("auto_ingest") === "true";
      
      // Nettoyer l'URL pour éviter des rechargements d'état non désirés
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Rafraîchir le statut d'authentification
      checkAuthStatus().then(() => {
        // Après vérification du statut d'authentification, lancer l'ingestion si demandée
        if (shouldAutoIngest) {
          setTimeout(() => {
            handleImport();
          }, 1000); // Attendre 1 seconde pour laisser le temps aux états de se mettre à jour
        }
      });
    }
  }, []);
  
  // Vérifier le statut d'authentification Outlook
  const checkAuthStatus = async () => {
    try {
      setAuthLoading(true);
      const data = await authProviders.checkAuthStatus('microsoft');
      
      setIsAuthenticated(data.authenticated || false);
      
      if (data.authenticated) {
        setAuthStatus({
          type: "success",
          message: "Connecté à Microsoft Outlook"
        });
      }
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut d\'authentification:', error);
      setIsAuthenticated(false);
      setAuthStatus({
        type: "error",
        message: "Erreur lors de la vérification du statut d'authentification"
      });
    } finally {
      setAuthLoading(false);
    }
  };
  
  // Démarrer le processus d'authentification Outlook
  const startOutlookAuth = async () => {
    try {
      setAuthLoading(true);
      setAuthStatus(null);
      
      // Utiliser la bibliothèque authProviders pour l'authentification
      await authProviders.authenticateWithPopup('microsoft');
      
      // Vérifier le statut d'authentification après la tentative
      await checkAuthStatus();
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'authentification:', error);
      setAuthStatus({
        type: "error",
        message: error.message || "Erreur lors du démarrage de l'authentification"
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      
      const importOptions = {
        folders,
        limit,
        query: query || undefined,
        no_attachments: noAttachments
      };
      
      // Utiliser la bibliothèque authProviders pour l'ingestion
      await authProviders.startIngestion('outlook', {
        forceReingest: forceReingest,
        options: importOptions
      });
      
      setStatus({
        type: "success",
        message: "Importation Outlook démarrée en arrière-plan"
      });
    } catch (error) {
      console.error('Erreur lors de l\'importation Outlook:', error);
      setStatus({
        type: "error",
        message: error.message || "Erreur lors de l'importation Outlook"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addFolder = () => {
    if (newFolder && !folders.includes(newFolder)) {
      setFolders([...folders, newFolder]);
      setNewFolder("");
    }
  };

  const removeFolder = (folder) => {
    setFolders(folders.filter(f => f !== folder));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      addFolder();
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 500 }}>
        Importer depuis Outlook avec OAuth2
      </Typography>
      
      {authStatus && (
        <Alert 
          severity={authStatus.type} 
          sx={{ mb: 3 }}
          onClose={() => setAuthStatus(null)}
        >
          {authStatus.message}
        </Alert>
      )}
      
      {!isAuthenticated ? (
        // Afficher le bouton d'authentification si non authentifié
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Pour importer vos emails Outlook, vous devez d'abord vous connecter à votre compte Microsoft.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={startOutlookAuth}
            disabled={authLoading}
            startIcon={authLoading ? <CircularProgress size={20} /> : <img src={PROVIDER_IMAGES.outlook} height="20" alt="Outlook" style={{ filter: 'brightness(0) invert(1)' }} />}
            sx={{ py: 1.2, px: 3 }}
          >
            {authLoading ? 'Connexion en cours...' : 'Se connecter à Outlook'}
          </Button>
        </Box>
      ) : (
        // Afficher le formulaire d'importation si authentifié
        <Box>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Ce processus va importer vos emails Outlook dans la base de données Qdrant pour la recherche RAG.
          </Typography>
        
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="body2" fontWeight="medium">Dossiers Outlook :</Typography>
              {folders.map(folder => (
                <Chip 
                  key={folder}
                  label={folder}
                  onDelete={() => removeFolder(folder)}
                  color="primary"
                  size="small"
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex' }}>
              <TextField
                size="small"
                label="Ajouter un dossier"
                variant="outlined"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{ mr: 2 }}
                fullWidth
                helperText="Ex: inbox, sentitems, drafts, deleteditems, archive"
              />
              <Button
                onClick={addFolder}
                variant="contained"
                color="primary"
                disabled={!newFolder}
                sx={{ minWidth: '100px' }}
              >
                Ajouter
              </Button>
            </Box>
          </Box>
        
          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              type="number"
              label="Limite d'emails"
              variant="outlined"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
              fullWidth
              size="small"
            />
            
            <TextField
              label="Requête de recherche (syntaxe OData)"
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: receivedDateTime ge 2023-01-01 and hasAttachments eq true"
              fullWidth
              size="small"
            />
            
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={forceReingest}
                    onChange={(e) => setForceReingest(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label="Forcer la réingestion des emails déjà présents"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={noAttachments}
                    onChange={(e) => setNoAttachments(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label="Ne pas importer les pièces jointes"
              />
            </Box>
          </Stack>
        
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              onClick={handleImport}
              disabled={isLoading || folders.length === 0}
              variant="contained"
              color="primary"
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Importation en cours...' : "Lancer l'importation Outlook"}
            </Button>
            
            {status && (
              <Typography 
                variant="body2" 
                sx={{ 
                  ml: 2, 
                  color: status.type === "success" ? 'success.main' : 'error.main' 
                }}
              >
                {status.message}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
