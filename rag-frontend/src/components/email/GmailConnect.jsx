import React, { useState } from "react";
import { authFetch } from '../../firebase/authFetch';
import { API_BASE_URL } from "../../config";
import { CircularProgress, Chip, TextField, Checkbox, FormControlLabel } from "@mui/material";

export function GmailConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [labels, setLabels] = useState(["INBOX", "SENT"]);
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState("");
  const [forceReingest, setForceReingest] = useState(false);
  const [noAttachments, setNoAttachments] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [currentSubject, setCurrentSubject] = useState(null);

  // Poll for ingest status while loading
  React.useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(async () => {
        try {
          const res = await authFetch(`${API_BASE_URL}/sources/gmail/ingest_status`);
          const data = await res.json();
          if (data && data.subject) {
            setCurrentSubject(data.subject);
          } else {
            setCurrentSubject(null);
          }
        } catch {
          setCurrentSubject(null);
        }
      }, 2000);
    } else {
      setCurrentSubject(null);
    }
    return () => interval && clearInterval(interval);
  }, [isLoading]);

  const handleImport = async () => {
    // Step 1: Immediately open a popup (blank) — this avoids Safari blocking
    const popup = window.open("", "GmailAuth", "width=500,height=650");

    if (!popup) {
      alert("Popup blocked! Please allow popups to continue Gmail authentication.");
      return;
    }
    try {
      setIsLoading(true);
      setStatus(null);
      // Step 1: Check if authentication is needed
      const authCheckRes = await authFetch(`${API_BASE_URL}/sources/gmail/auth_url`);
      const authCheck = await authCheckRes.json();
      if (authCheck.authenticated) {
        // Already authenticated, start ingestion
        popup.close();
        await startIngestion();
      } else if (authCheck.auth_url) {
        // Not authenticated, open popup
        popup.location.href = authCheck.auth_url;
        // Listen for message from popup
        const onMessage = async (event) => {
          if (event.data === "gmail_auth_success") {
            popup.close();
            window.removeEventListener("message", onMessage);
            await startIngestion();
          }
        };
        window.addEventListener("message", onMessage);
      } else {
        setStatus("Erreur: Impossible de vérifier l'authentification Gmail.");
        setIsLoading(false);
      }
    } catch (err) {
      setStatus("Erreur lors de la vérification ou de l'import Gmail.");
      setIsLoading(false);
    }
  };

  const startIngestion = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/sources/ingest/gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels, limit, query: query || undefined, force_reingest: forceReingest, no_attachments: noAttachments }),
      });
      
      setStatus({
        type: "success",
        message: "Importation Gmail démarrée en arrière-plan"
      });
    } catch (error) {
      console.error("Erreur lors de l'importation Gmail:", error);
      setStatus({
        type: "error",
        message: error.response?.data?.detail || "Erreur lors de l'importation Gmail"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addLabel = () => {
    if (newLabel && !labels.includes(newLabel)) {
      setLabels([...labels, newLabel]);
      setNewLabel("");
    }
  };

  const removeLabel = (label) => {
    setLabels(labels.filter(l => l !== label));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      addLabel();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Importer depuis Gmail avec OAuth2</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-4">
          Ce processus va importer vos emails Gmail dans la base de données Qdrant pour la recherche RAG.
          Lors de la première utilisation, vous serez redirigé vers une page d'authentification Google.
        </p>
        
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-medium">Labels Gmail :</span>
            {labels.map(label => (
              <Chip 
                key={label}
                label={label}
                onDelete={() => removeLabel(label)}
                color="primary"
                size="small"
                className="m-1"
              />
            ))}
          </div>
          <div className="flex">
            <TextField
              size="small"
              label="Ajouter un label"
              variant="outlined"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyPress={handleKeyPress}
              className="mr-2"
              fullWidth
            />
            <button
              onClick={addLabel}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
              disabled={!newLabel}
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
            label="Requête de recherche (syntaxe Gmail)"
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: after:2023/01/01 has:attachment"
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
      
      <div className="flex items-center mb-4">
        <button
          onClick={handleImport}
          disabled={isLoading || labels.length === 0}
          className={`flex items-center justify-center px-4 py-2 rounded font-medium ${
            isLoading || labels.length === 0
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
            "Lancer l'importation Gmail"
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

      {/* Status box between import and import mode */}
      {isLoading && (
        <div className="mb-4 p-3 rounded border border-blue-300 bg-blue-50 flex items-center min-h-[44px]">
          {currentSubject ? (
            <span className="text-blue-800 font-semibold">
              Ingestion de l'email : "{currentSubject}"
            </span>
          ) : (
            <span className="flex items-center text-blue-600">
              <CircularProgress size={18} color="inherit" className="mr-2" />
              En attente de statut...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
