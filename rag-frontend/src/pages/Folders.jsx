import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Button, CircularProgress, TextField } from "@mui/material";
// import FolderTreeView from "../components/FolderTreeView";

export default function Folders() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/documents`, { params: { q } })
      .then((res) => {
        const docs = res.data.documents || [];
        console.log('Fetched docs:', docs);
        setDocs(docs);
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [q]);

  const handleDelete = async (doc_id) => {
    if (!window.confirm("Delete this document?")) return;
    await axios.delete(`${API_BASE_URL}/documents/${doc_id}`);
    // Refresh after delete
    setFolders((prev) => {
      const newFolders = { ...prev };
      Object.keys(newFolders).forEach((folder) => {
        newFolders[folder] = newFolders[folder].filter((doc) => doc.doc_id !== doc_id);
      });
      return newFolders;
    });
  };

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-8 mt-4">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Folders in Qdrant</h1>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Button variant="contained" color="primary" component="label">
            Import Folder/Files
            <input
              type="file"
              multiple
              webkitdirectory="true"
              directory="true"
              hidden
              onChange={(e) => alert('Import not implemented yet')} // TODO: hook to backend
            />
          </Button>
          <Button variant="outlined" color="primary" onClick={() => alert('Google Drive import not implemented yet')}>Import from Drive</Button>
          <Button variant="outlined" color="primary" onClick={() => alert('OneDrive import not implemented yet')}>Import from OneDrive</Button>
        </div>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {loading ? (
          <CircularProgress />
        ) : (
          docs.length === 0 ? (
            <div>No documents found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Filename</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.doc_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td>{doc.display_name || doc.attachment_name || doc.source_path || doc.doc_id}</td>
                    <td>{doc.document_type}</td>
                    <td>{doc.user}</td>
                    <td>{doc.date || '-'}</td>
                    <td>
                      <Button variant="outlined" color="error" size="small" onClick={() => handleDelete(doc.doc_id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </Layout>
  );
}
