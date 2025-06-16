// Configuration des URLs d'API et services
const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  nextcloudUrl: import.meta.env.VITE_NEXTCLOUD_URL || "https://chardouin.fr/nextcloud",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "http://supabase"
};

export default config;
export const API_BASE_URL = "http://localhost:8000/api"; // à adapter selon ton backend