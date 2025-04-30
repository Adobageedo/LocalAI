import React from "react";
import Layout from "../components/Layout";
import DocumentList from "../components/DocumentList";
import DocumentUpload from "../components/DocumentUpload";

export default function Documents() {
  const [refresh, setRefresh] = React.useState(0);
  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-8 mt-4">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Documents & Emails</h1>
        <DocumentUpload onUpload={() => setRefresh((r) => r + 1)} />
        <div className="mt-6">
          <DocumentList key={refresh} />
        </div>
      </div>
    </Layout>
  );
}
