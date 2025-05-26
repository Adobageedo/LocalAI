import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

export default function ImapStatus({ user, polling, onComplete }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!polling || !user) return;
    let interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/ingest/imap/status?user=${encodeURIComponent(user)}`);
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "completed" || data.status.startsWith("error")) {
          clearInterval(interval);
          if (onComplete) onComplete(data.status);
        }
      } catch {
        setStatus("error: could not fetch status");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, user, onComplete]);

  if (!polling) return null;
  return (
    <div className="mt-4 p-2 rounded bg-blue-50 text-blue-800 border border-blue-200">
      <b>IMAP Ingestion Status:</b> {status || "..."}
    </div>
  );
}
