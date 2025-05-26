import React, { useEffect, useState } from "react";
import { Layout } from "../components/layout";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Button, CircularProgress, TextField } from "@mui/material";
// import { FolderTreeView } from "../components/folders";

export default function Folders() {
  const [docs, setDocs] = useState([]);
  const [folders, setFolders] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [q, setQ] = useState("");

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadMsg("");
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      await axios.post(`${API_BASE_URL}/documents`, formData);
      setUploadMsg(`Successfully uploaded ${files.length} file${files.length > 1 ? "s" : ""}.`);
      // Refresh docs list
      setTimeout(() => setUploadMsg(""), 4000);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setUploadMsg("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/documents`, { params: { q } })
      .then((res) => {
        const docs = res.data.documents || [];
        setDocs(docs);
        // Group by folder (using source_path up to last slash)
        const folderMap = {};
        docs.forEach(doc => {
          let folder = "Root";
          if (doc.source_path && doc.source_path.includes("/")) {
            folder = doc.source_path.substring(0, doc.source_path.lastIndexOf("/"));
          }
          if (!folderMap[folder]) folderMap[folder] = [];
          folderMap[folder].push(doc);
        });
        setFolders(folderMap);
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [q]);

  const handleDelete = async (doc_id) => {
    console.log(doc_id);
    // if (!window.confirm("Delete this document?")) return;
    const response = await axios.delete(`${API_BASE_URL}/documents/${doc_id}`);
    console.log("API response:", response.data); // Log the API response here
    setFolders((prev) => {
      const newFolders = { ...prev };
      Object.keys(newFolders).forEach((folder) => {
        newFolders[folder] = newFolders[folder].filter((doc) => doc.doc_id !== doc_id);
        if (newFolders[folder].length === 0) delete newFolders[folder];
      });
      return newFolders;
    });
    setDocs((prevDocs) => prevDocs.filter((doc) => doc.doc_id !== doc_id));
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
              onChange={handleFileUpload}
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
        {uploading && <div style={{ color: '#1976d2', marginBottom: 10 }}>Uploading...</div>}
        {uploadMsg && <div style={{ color: uploadMsg.startsWith('Successfully') ? '#388e3c' : '#d32f2f', marginBottom: 10 }}>{uploadMsg}</div>}
        {loading ? (
          <CircularProgress />
        ) : (
          Object.keys(folders).length === 0 ? (
            <div>No documents found.</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              {Object.entries(folders).map(([folder, files]) => (
                <div key={folder} style={{ marginBottom: 24, border: '1px solid #e0e0e0', borderRadius: 6 }}>
                  <div
                    style={{ cursor: 'pointer', background: '#f5f5f5', padding: 8, fontWeight: 500, borderRadius: '6px 6px 0 0' }}
                    onClick={() => setExpandedFolders(f => ({ ...f, [folder]: !f[folder] }))}
                  >
                    <span style={{ marginRight: 8 }}>{expandedFolders[folder] ? '📂' : '📁'}</span>
                    {folder} <span style={{ color: '#888', fontWeight: 400 }}>({files.length} file{files.length > 1 ? 's' : ''})</span>
                  </div>
                  {expandedFolders[folder] && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
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
                        {files.map((doc) => (
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
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
