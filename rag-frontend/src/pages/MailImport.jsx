import React, { useState } from "react";
import { ImapConnect, GmailConnect, OutlookConnect } from "../components/email";
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
          <option value="gmail">Gmail</option>
          <option value="outlook">Outlook</option>
          <option value="imap">IMAP</option>
        </select>
      </div>
      {mode === "imap" && <ImapConnect />}
      {mode === "gmail" && <GmailConnect />}
      {mode === "outlook" && <OutlookConnect />}
    </div>
    </Layout>
  );
}

