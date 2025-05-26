import React, { useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Button, LinearProgress } from "@mui/material";

export default function DocumentUpload({ onUpload }) {
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [folderMode, setFolderMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleImportClick = () => {
    
    setShowPicker(true);
  };

  const handleModeSelect = (mode) => {
    
    setFolderMode(mode === "folder");
    setShowPicker(false);
    setTimeout(() => {
      if (fileRef.current) {
        
        fileRef.current.click();
      }
    }, 0);
  };

  const handleFileChange = () => {
    const files = fileRef.current.files;
    
    setSelectedFiles(files ? Array.from(files) : []);
    setSuccessMsg("");
    setErrorMsg("");
    if (files) {
      Array.from(files).forEach(file => {
        
      });
    }
  };


  const handleUpload = async (e) => {
    const files = fileRef.current.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/documents`, formData);
      
      setSuccessMsg(`Successfully uploaded ${files.length} file${files.length > 1 ? "s" : ""}.`);
      setSelectedFiles([]);
      fileRef.current.value = "";
      if (onUpload) onUpload();
    } catch (err) {
      
      setErrorMsg("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };




  return (
    <div style={{ marginBottom: 24, maxWidth: 420 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleImportClick}
        disabled={loading}
        style={{ minWidth: 180, marginBottom: 16 }}
      >
        Import Documents
      </Button>
      {showPicker && (
        <div style={{ marginBottom: 16 }}>
          <Button
            onClick={() => handleModeSelect("file")}
            variant="outlined"
            style={{ marginRight: 12 }}
            size="small"
          >
            Import File(s)
          </Button>
          <Button
            onClick={() => handleModeSelect("folder")}
            variant="outlined"
            size="small"
          >
            Import Folder
          </Button>
        </div>
      )}
      <input
        type="file"
        ref={fileRef}
        multiple
        onChange={handleFileChange}
        
        {...(folderMode ? { webkitdirectory: "" } : {})}
        style={{ display: "none" }}
        aria-label={folderMode ? "Select folder" : "Select files"}
      />
      {selectedFiles.length > 0 && (
        <div style={{ marginBottom: 10, fontSize: 14 }}>
          <b>Selected {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}:</b>
          <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 120, overflowY: "auto" }}>
            {selectedFiles.slice(0, 10).map((f, i) => (
              <li key={i}>{f.webkitRelativePath || f.name}</li>
            ))}
            {selectedFiles.length > 10 && <li>...and {selectedFiles.length - 10} more</li>}
          </ul>
        </div>
      )}
      <Button
        onClick={handleUpload}
        variant="contained"
        disabled={loading || selectedFiles.length === 0}
        style={{ minWidth: 120 }}
      >
        {loading ? "Uploading..." : "Upload"}
      </Button>
      {loading && <LinearProgress style={{ marginTop: 8 }} />}
      {successMsg && (
        <div style={{ color: "#388e3c", marginTop: 12, fontWeight: 500 }} role="status">{successMsg}</div>
      )}
      {errorMsg && (
        <div style={{ color: "#d32f2f", marginTop: 12, fontWeight: 500 }} role="alert">{errorMsg}</div>
      )}
    </div>
  );
}
