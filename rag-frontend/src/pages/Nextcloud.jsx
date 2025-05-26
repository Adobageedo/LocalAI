import React, { useState, useEffect } from "react";
import { Layout } from "../components/layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import config from "../config";

const Nextcloud = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFolder, setCurrentFolder] = useState("/");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  
  const navigate = useNavigate();
  
  // Vérifier l'authentification au chargement
  useEffect(() => {
    const token = localStorage.getItem("nextcloudToken");
    if (token) {
      setIsAuthenticated(true);
      fetchFiles(currentFolder);
    }
  }, []);
  
  // Fonction pour se connecter à Nextcloud
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Appel à l'API pour l'authentification Nextcloud
      const response = await axios.post(`${config.apiUrl}/api/nextcloud/login`, {
        username,
        password
      });
      
      if (response.data && response.data.token) {
        localStorage.setItem("nextcloudToken", response.data.token);
        setIsAuthenticated(true);
        fetchFiles(currentFolder);
      }
    } catch (err) {
      setError("Échec de l'authentification. Veuillez vérifier vos identifiants.");
      console.error("Erreur d'authentification:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour récupérer les fichiers du dossier actuel
  const fetchFiles = async (folder) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("nextcloudToken");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      
      const response = await axios.get(`${config.apiUrl}/api/nextcloud/files`, {
        params: { path: folder },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFiles(response.data.files || []);
      setCurrentFolder(folder);
    } catch (err) {
      setError("Impossible de récupérer les fichiers. Veuillez réessayer.");
      console.error("Erreur lors de la récupération des fichiers:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour naviguer dans les dossiers
  const navigateToFolder = (folder) => {
    fetchFiles(folder);
  };
  
  // Fonction pour remonter d'un niveau
  const navigateUp = () => {
    if (currentFolder === "/") return;
    
    const parts = currentFolder.split("/").filter(Boolean);
    parts.pop();
    const newPath = parts.length ? `/${parts.join("/")}` : "/";
    fetchFiles(newPath);
  };
  
  // Fonction pour télécharger un fichier
  const downloadFile = async (file) => {
    try {
      const token = localStorage.getItem("nextcloudToken");
      if (!token) return;
      
      const response = await axios.get(`${config.apiUrl}/api/nextcloud/download`, {
        params: { path: `${currentFolder === "/" ? "" : currentFolder}/${file.name}` },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Échec du téléchargement du fichier.");
      console.error("Erreur de téléchargement:", err);
    }
  };
  
  // Fonction pour uploader un fichier
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("nextcloudToken");
      if (!token) return;
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('path', currentFolder);
      
      await axios.post(`${config.apiUrl}/api/nextcloud/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Rafraîchir la liste des fichiers
      fetchFiles(currentFolder);
      setUploadFile(null);
      
      // Réinitialiser l'input file
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError("Échec de l'upload du fichier.");
      console.error("Erreur d'upload:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour importer un fichier dans la base RAG
  const importToRAG = async (file) => {
    try {
      const token = localStorage.getItem("nextcloudToken");
      if (!token) return;
      
      setIsLoading(true);
      
      const response = await axios.post(`${config.apiUrl}/api/nextcloud/import-to-rag`, {
        path: `${currentFolder === "/" ? "" : currentFolder}/${file.name}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Fichier ${file.name} importé avec succès dans la base RAG!`);
    } catch (err) {
      setError("Échec de l'import dans la base RAG.");
      console.error("Erreur d'import:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour se déconnecter
  const handleLogout = () => {
    localStorage.removeItem("nextcloudToken");
    setIsAuthenticated(false);
    setFiles([]);
  };
  
  return (
    <Layout>
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Nextcloud Integration</h1>
        
        {!isAuthenticated ? (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Connexion à Nextcloud</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLoading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={navigateUp}
                  disabled={currentFolder === "/"}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  ⬆️ Dossier parent
                </button>
                <span className="text-gray-600">
                  Dossier actuel: <strong>{currentFolder}</strong>
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Se déconnecter
              </button>
            </div>
            
            <div className="mb-6">
              <form onSubmit={handleFileUpload} className="flex items-center space-x-2">
                <input
                  id="file-upload"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  required
                />
                <button
                  type="submit"
                  disabled={!uploadFile || isLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? "Upload en cours..." : "Upload"}
                </button>
              </form>
            </div>
            
            {isLoading && <p className="text-center py-4">Chargement en cours...</p>}
            
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taille
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        Aucun fichier trouvé dans ce dossier
                      </td>
                    </tr>
                  ) : (
                    files.map((file, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {file.type === 'directory' ? (
                            <button
                              onClick={() => navigateToFolder(`${currentFolder === "/" ? "" : currentFolder}/${file.name}`)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              📁 {file.name}
                            </button>
                          ) : (
                            <span>📄 {file.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.type === 'directory' ? 'Dossier' : 'Fichier'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.type === 'directory' ? '-' : `${Math.round(file.size / 1024)} KB`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.type !== 'directory' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => downloadFile(file)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Télécharger
                              </button>
                              <button
                                onClick={() => importToRAG(file)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Importer dans RAG
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Nextcloud;
