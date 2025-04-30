import React from "react";

export default function OpenWebUI() {
  return (
    <div className="bg-white rounded-lg shadow p-8 mt-4" style={{height: '80vh'}}>
      <h1 className="text-2xl font-bold text-blue-700 mb-4">Open Web UI</h1>
      <iframe
        src="http://localhost:8080" // Change this to your deployed Open WebUI URL
        title="Open Web UI"
        style={{width: '100%', height: '70vh', border: 'none', borderRadius: 8}}
        allow="clipboard-write; clipboard-read"
      />
    </div>
  );
}
