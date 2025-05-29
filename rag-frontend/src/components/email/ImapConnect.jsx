import React, { useState } from "react";
import { authFetch } from '../../firebase/authFetch';
import { API_BASE_URL } from "../../config";
import ImapStatus from "./ImapStatus";

export default function ImapConnect() {
  const [form, setForm] = useState({
    host: "",
    port: 993,
    user: "",
    password: "",
    ssl: true,
    mailbox: "INBOX",
    limit: 50,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [polling, setPolling] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "user" ? { imap_user: type === "checkbox" ? checked : value } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setPolling(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/ingest/imap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: err.message });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded border">
      <div>
        <label className="block mb-1 font-medium">Provider</label>
        <select
          className="input input-bordered w-full mb-2"
          onChange={e => {
            const provider = e.target.value;
            let host = "", port = 993;
            if (provider === "gmail") { host = "imap.gmail.com"; port = 993; }
            else if (provider === "outlook") { host = "outlook.office365.com"; port = 993; }
            else if (provider === "yahoo") { host = "imap.mail.yahoo.com"; port = 993; }
            else if (provider === "icloud") { host = "imap.mail.me.com"; port = 993; }
            else if (provider === "gmx") { host = "imap.gmx.com"; port = 993; }
            else if (provider === "zoho") { host = "imap.zoho.com"; port = 993; }
            else if (provider === "aol") { host = "imap.aol.com"; port = 993; }
            else { host = ""; port = 993; }
            setForm(f => ({ ...f, host, port }));
          }}
          defaultValue=""
        >
          <option value="">Custom / Other</option>
          <option value="gmail">Gmail</option>
          <option value="outlook">Outlook / Office365</option>
          <option value="yahoo">Yahoo Mail</option>
          <option value="icloud">iCloud Mail</option>
          <option value="gmx">GMX</option>
          <option value="zoho">Zoho Mail</option>
          <option value="aol">AOL Mail</option>
        </select>
        <label className="block mb-1 font-medium">IMAP Host</label>
        <input name="host" value={form.host} onChange={handleChange} required className="input input-bordered w-full" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Port</label>
        <input name="port" type="number" value={form.port} onChange={handleChange} required className="input input-bordered w-full" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Email/User</label>
        <input name="user" value={form.user} onChange={handleChange} required className="input input-bordered w-full" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Password</label>
        <input name="password" type="password" value={form.password} onChange={handleChange} required className="input input-bordered w-full" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Mailbox</label>
        <input name="mailbox" value={form.mailbox} onChange={handleChange} className="input input-bordered w-full" />
      </div>
      <div>
        <label className="inline-flex items-center">
          <input name="ssl" type="checkbox" checked={form.ssl} onChange={handleChange} className="mr-2" />
          Use SSL
        </label>
      </div>
      <div>
        <label className="block mb-1 font-medium">Limit (emails)</label>
        <input name="limit" type="number" value={form.limit} onChange={handleChange} className="input input-bordered w-full" />
      </div>
      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow" disabled={loading}>
        {loading ? "Connecting..." : "Ingest Emails"}
      </button>
      <ImapStatus user={form.user} polling={polling} onComplete={() => setPolling(false)} />
      {result && (
        <div className={`mt-4 p-2 rounded ${result.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {result.success ? result.message : result.error}
        </div>
      )}
    </form>
  );
}
