import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Prompt from "./pages/Prompt";
import Settings from "./pages/Settings";
import OpenWebUI from "./pages/OpenWebUI";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/prompt" element={<Prompt />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/open-webui" element={<OpenWebUI />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
