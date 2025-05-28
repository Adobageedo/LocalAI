import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Remarque: L'AuthProvider est déjà inclus à l'intérieur de App.jsx
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
