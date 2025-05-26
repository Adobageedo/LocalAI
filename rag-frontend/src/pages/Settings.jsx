import React, { useState } from "react";
import Layout from "../components/layout";
import GoogleConnect from "../components/GoogleConnect";
import ImapConnect from "../components/ImapConnect";

import DocumentUpload from "../components/DocumentUpload";

export default function Settings() {
  const [googleToken, setGoogleToken] = useState(null);

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-8 mt-4 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Settings</h1>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Import Documents</h2>
          <p className="mb-2 text-gray-600">
            Import a file or an entire folder to index documents into your Qdrant database.
          </p>
          <DocumentUpload />
        </div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Connect to Google</h2>
          <GoogleConnect onAuthSuccess={setGoogleToken} />
          {googleToken && (
            <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              Connected! Access token: <span className="break-all">{googleToken}</span>
            </div>
          )}
        </div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Connect to IMAP Email</h2>
          <ImapConnect />
        </div>
      </div>
    </Layout>
  );
}
