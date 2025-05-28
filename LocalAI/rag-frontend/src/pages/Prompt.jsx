import React from "react";
import { Layout } from "../components/layout";
import { PromptForm } from "../components/prompt";

export default function Prompt() {
  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-8 mt-4">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Assistant IA</h1>
        <p className="mb-6 text-gray-600">Posez une question, obtenez une réponse et voyez les sources utilisées.</p>
        <PromptForm />
      </div>
    </Layout>
  );
}
