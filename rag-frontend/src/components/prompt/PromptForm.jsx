import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { Button, TextField, CircularProgress, Card, CardContent } from "@mui/material";

export default function PromptForm() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/prompt`, { question });
      setResponse(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Une erreur est survenue lors de la connexion au backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      if (!loading) handleAsk();
    }
  };

  const handleClear = () => {
    setQuestion("");
    setResponse(null);
    setError(null);
  };

  return (
    <div>
      <TextField
        label="Votre question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        fullWidth
        multiline
        minRows={2}
        style={{ marginBottom: 16 }}
        disabled={loading}
        autoFocus
      />
      <Button variant="contained" onClick={handleAsk} disabled={loading || !question.trim()}>
        Envoyer
      </Button>
      <Button onClick={handleClear} disabled={loading && !response && !error} style={{ marginLeft: 8 }}>
        Effacer
      </Button>
      {loading && <CircularProgress style={{ marginLeft: 16 }} />}
      {error && (
        <div style={{ color: 'red', marginTop: 16 }}>{error}</div>
      )}
      {response && (
        <Card style={{ marginTop: 24 }}>
          <CardContent>
            <strong>Réponse :</strong>
            <div style={{ whiteSpace: "pre-line", margin: "12px 0" }}>{response.answer}</div>
            <strong>Sources utilisées :</strong>
            {response.sources && response.sources.length > 0 ? (
              <ul>
                {response.sources.map((source, i) => {
                  // Extraire le nom du fichier à partir du chemin complet
                  const filename = source.split('/').pop();
                  // Créer l'URL de téléchargement en utilisant le router nextcloud
                  // Note: le routeur Nextcloud a un préfixe /api/ 
                  const downloadUrl = `${API_BASE_URL}/api/nextcloud/download-source?path=${encodeURIComponent(source)}`;
                  
                  return (
                    <li key={i} style={{ marginBottom: 12 }}>
                      <a href={downloadUrl} download={filename}>
                        <em>{filename}</em>
                      </a>
                      <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>
                        {source}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div>Aucune source réellement utilisée.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}