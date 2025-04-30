import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Button, TextField, CircularProgress, Card, CardContent } from "@mui/material";

export default function PromptForm() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = async () => {
    if (!question) return;
    setLoading(true);
    setResponse(null);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/prompt`, { question });
      setResponse(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
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
      />
      <Button variant="contained" onClick={handleAsk} disabled={loading || !question.trim()}>
        Envoyer
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
                {response.sources.map((src, i) => {
                  const url = src.metadata.source_path || src.metadata.url;
                  const isDownloadable = url && !/^https?:\/\//.test(url); // Not a web URL, treat as file path
                  return (
                    <li key={i} style={{ marginBottom: 12 }}>
                      {url ? (
                        <>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <em>{url}</em>
                          </a>
                          {isDownloadable && (
                            <a
                              href={`${API_BASE_URL}/download?path=${encodeURIComponent(url)}`}
                              style={{ marginLeft: 12 }}
                              download
                              className="text-blue-600 hover:underline"
                            >
                              Télécharger
                            </a>
                          )}
                        </>
                      ) : (
                        <em>{src.metadata.subject || "Source inconnue"}</em>
                      )}
                      <br />
                      <span style={{ fontSize: 13, color: "#666" }}>{src.content.slice(0, 200)}...</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div>Aucune source réellement utilisée.</div>
            )}
            {response.filter_fallback && (
              <div style={{ color: "#b77c00", marginTop: 8 }}>
                [Aucun résultat filtré, recherche relancée sans filtre]
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
