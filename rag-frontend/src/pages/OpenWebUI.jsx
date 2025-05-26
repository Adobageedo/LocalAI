import React, { useState } from "react";
import { ImapConnect } from "../components/email";
import { Layout } from "../components/layout";

export default function MailImport() {
  const [mode, setMode] = useState("imap");

  return (
    <Layout>
    <div className="bg-white rounded-lg shadow p-8 mt-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">Mail Import</h1>
      <div className="mb-4">
        <label className="block mb-2 font-medium">Choose import mode:</label>
        <select
          value={mode}
          onChange={e => setMode(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="imap">IMAP</option>
          <option value="gmail">Gmail</option>
          <option value="outlook">Outlook</option>
        </select>
      </div>
      {mode === "imap" && <ImapConnect />}
      {mode === "gmail" && (
        <div className="p-4 bg-blue-50 rounded flex flex-col items-start gap-4">
          <p>Gmail import coming soon. (You can add a GmailConnect component here.)</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
            onClick={() => alert('Gmail import triggered (placeholder)')}
            type="button"
          >
            Import from Gmail
          </button>
        </div>
      )}
      {mode === "outlook" && (
        <div className="p-4 bg-blue-50 rounded flex flex-col items-start gap-4">
          <p>Outlook import coming soon. (You can add an OutlookConnect component here.)</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
            onClick={() => alert('Outlook import triggered (placeholder)')}
            type="button"
          >
            Import from Outlook
          </button>
        </div>
      )}
    </div>
    </Layout>
  );
}

