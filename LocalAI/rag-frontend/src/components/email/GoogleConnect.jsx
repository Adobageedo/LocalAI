import React, { useEffect } from "react";

// IMPORTANT: Replace this with your own Google OAuth Client ID from Google Cloud Console
const CLIENT_ID = "506230950080-6relmmvf1q0netq0s7uf1edri25bdp42.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

export default function GoogleConnect({ onAuthSuccess }) {
  useEffect(() => {
    // Load the Google API script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleAuthClick = () => {
    /* global google */
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            if (onAuthSuccess) onAuthSuccess(tokenResponse.access_token);
          } else {
            alert("Authorization failed.");
          }
        },
      }).requestAccessToken();
    } else {
      alert("Google API not loaded. Please try again.");
    }
  };

  return (
    <button
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
      onClick={handleAuthClick}
      type="button"
    >
      Connect to Google Drive
    </button>
  );
}
