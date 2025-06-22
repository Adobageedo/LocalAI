// Configuration des URLs d'API et services
const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://chardouin.fr/api",
  nextcloudUrl: import.meta.env.VITE_NEXTCLOUD_URL || "https://chardouin.fr/nextcloud",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "http://supabase"
};

export default config;
export const API_BASE_URL = "https://chardouin.fr/api"; // à adapter selon ton backend