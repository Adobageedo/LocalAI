import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Folders from "./pages/Folders";
import Prompt from "./pages/Prompt";
import Settings from "./pages/Settings";
import MailImport from "./pages/OpenWebUI";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
<Route path="/folders" element={<Folders />} />
        <Route path="/prompt" element={<Prompt />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/mail-import" element={<MailImport />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
