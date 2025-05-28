import React from "react";
import DocumentUpload from "./DocumentUpload";

export default function Settings() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Settings</h2>
      <div style={{ marginBottom: 32 }}>
        <h3>Import Documents</h3>
        <p>
          Import a file or an entire folder to index documents into your Qdrant database.
        </p>
        <DocumentUpload />
      </div>
      {/* Add more settings sections here as needed */}
    </div>
  );
}
