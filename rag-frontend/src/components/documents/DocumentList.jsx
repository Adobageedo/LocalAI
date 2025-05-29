import React, { useEffect, useState } from "react";
import { authFetch } from '../../firebase/authFetch';
import { API_BASE_URL } from "../../config";
import { Button, TextField, IconButton, CircularProgress } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function DocumentList() {
  const [error, setError] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    authFetch(`${API_BASE_URL}/documents?q=${encodeURIComponent(q)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 404 && data && data.message) {
            setDocs([]);
            setError(data.message);
          } else {
            setError("Erreur lors du chargement des documents.");
          }
          return;
        }
        const data = await res.json();
        setDocs(data.documents || []);
        setError(null);
      })
      .catch(() => setError("Erreur lors du chargement des documents."))
      .finally(() => setLoading(false));
  }, [q, refresh]);

  const handleDelete = async (doc_id) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    await authFetch(`${API_BASE_URL}/documents/${doc_id}`, { method: 'DELETE' });
    setRefresh((r) => r + 1);
  };

  return (
    <div>
      <TextField
        label="Recherche"
        variant="outlined"
        size="small"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <div style={{ color: "#d32f2f", marginTop: 24, fontWeight: 500 }} role="alert">
          {error}
          <br />
          <span>Importez votre premier document ou email via l'onglet <b>Settings</b> ou <b>Mail Import</b>.</span>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Nom/source</th>
              <th>User</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* Group by unique_id (or doc_id as fallback) */}
            {Object.values(docs.reduce((acc, doc) => {
              const key = doc.unique_id || doc.doc_id;
              if (!acc[key]) acc[key] = doc;
              return acc;
            }, {})).map((doc) => (
              <tr key={doc.unique_id || doc.doc_id}>
                <td>{doc.document_type}</td>
                <td>{doc.display_name
                  || (doc.document_type === 'email'
                    ? (doc.subject || '[Sans objet]')
                    : (doc.attachment_name
                        || (doc.source_path ? doc.source_path.split(/[\\/]/).pop() : null)
                        || '[Document sans nom]'))
                }</td>
                <td>{doc.user}</td>
                <td>{doc.date}</td>
                <td>
                  <IconButton onClick={() => handleDelete(doc.doc_id)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
