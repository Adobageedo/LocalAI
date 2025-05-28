import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { Layout } from "../components/layout";

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/documents/count-by-type`)
      .then((res) => res.json())
      .then((data) => {
        setCounts(data.counts || {});
        setLoading(false);
      })
      .catch((err) => {
        setError("Erreur lors du chargement des statistiques.");
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-8 mt-4">
        <h1 className="text-2xl font-bold text-blue-700 mb-2">Dashboard</h1>
        <p className="mb-6 text-gray-600">Vue d'ensemble de vos documents, emails et requêtes IA.</p>
        <h2 className="text-lg font-semibold mb-4">Documents par type</h2>
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <table className="w-full mt-2 border border-gray-200 rounded overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left">Type</th>
                <th className="py-2 px-4 text-left">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts).map(([type, count]) => (
                <tr key={type} className="border-t border-gray-100 hover:bg-blue-50">
                  <td className="py-2 px-4 capitalize">{type}</td>
                  <td className="py-2 px-4">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
