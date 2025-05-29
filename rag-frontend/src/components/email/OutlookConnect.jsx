import React, { useState } from "react";
import { authFetch } from '../../firebase/authFetch';
import { API_BASE_URL } from "../../config";
import { CircularProgress, Chip, TextField, Checkbox, FormControlLabel } from "@mui/material";

export function OutlookConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [folders, setFolders] = useState(["inbox", "sentitems"]);
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState("");
  const [forceReingest, setForceReingest] = useState(false);
  const [noAttachments, setNoAttachments] = useState(false);
  const [newFolder, setNewFolder] = useState("");

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      
      const response = await authFetch(`${API_BASE_URL}/sources/ingest/outlook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders, limit, query: query || undefined, force_reingest: forceReingest, no_attachments: noAttachments }),
      });
      
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      
      setStatus({
        type: "success",
        message: "Importation Outlook démarrée en arrière-plan"
      });
    } catch (error) {
      console.error("Erreur lors de l'importation Outlook:", error);
      setStatus({
        type: "error",
        message: error.response?.data?.detail || "Erreur lors de l'importation Outlook"
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
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Importer depuis Outlook avec OAuth2</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-4">
          Ce processus va importer vos emails Outlook dans la base de données Qdrant pour la recherche RAG.
          Lors de la première utilisation, vous serez redirigé vers une page d'authentification Microsoft.
        </p>
        
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-medium">Dossiers Outlook :</span>
            {folders.map(folder => (
              <Chip 
                key={folder}
                label={folder}
                onDelete={() => removeFolder(folder)}
                color="primary"
                size="small"
                className="m-1"
              />
            ))}
          </div>
          <div className="flex">
            <TextField
              size="small"
              label="Ajouter un dossier"
              variant="outlined"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyPress={handleKeyPress}
              className="mr-2"
              fullWidth
              helperText="Ex: inbox, sentitems, drafts, deleteditems, archive"
            />
            <button
              onClick={addFolder}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
              disabled={!newFolder}
            >
              Ajouter
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <TextField
            type="number"
            label="Limite d'emails"
            variant="outlined"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
            fullWidth
            size="small"
            className="mb-2"
          />
          
          <TextField
            label="Requête de recherche (syntaxe OData)"
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: receivedDateTime ge 2023-01-01 and hasAttachments eq true"
            fullWidth
            size="small"
            className="mb-2"
          />
          
          <div className="flex flex-col mt-2">
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
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <button
          onClick={handleImport}
          disabled={isLoading || folders.length === 0}
          className={`flex items-center justify-center px-4 py-2 rounded font-medium ${
            isLoading || folders.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} color="inherit" className="mr-2" />
              Importation en cours...
            </>
          ) : (
            "Lancer l'importation Outlook"
          )}
        </button>
        
        {status && (
          <div
            className={`ml-4 text-sm ${
              status.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
