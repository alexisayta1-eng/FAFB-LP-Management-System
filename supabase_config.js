// supabase_config.js - Supabase Credentials and Client Configuration
// Replace the placeholder URL and ANON_KEY with your actual Supabase project keys.

const SUPABASE_CONFIG = {
  // 1. Your Supabase Project URL
  url: "https://jejfdahvvepbaiudrgon.supabase.co",

  // 2. Supabase Anon / Public Key
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplamZkYWh2dmVwYmFpdWRyZ29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwOTg3MjMsImV4cCI6MjEwNDY3NDcyM30.Mv4pjenJSVv75NOQxNAmI6usJZ9J5JP6Y_E1nfoM5ZM"
};

// Global variables for accessibility
window.SUPABASE_URL = SUPABASE_CONFIG.url;
window.SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

// Initialize Supabase Client
function getSupabaseClient() {
  if (window._supabaseInstance) return window._supabaseInstance;

  // Check if credentials have been replaced with real project keys
  const isConfigured = window.SUPABASE_URL && 
                       !window.SUPABASE_URL.includes("your-project-id") &&
                       window.SUPABASE_ANON_KEY && 
                       !window.SUPABASE_ANON_KEY.includes("your-anon-public-key");

  if (!isConfigured) {
    console.info("ℹ️ Supabase credentials not set yet in supabase_config.js. Running in local fallback mode.");
    return null;
  }

  if (typeof supabase !== 'undefined' && supabase.createClient) {
    window._supabaseInstance = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return window._supabaseInstance;
  } else {
    console.warn("⚠️ Supabase JS SDK not loaded yet.");
    return null;
  }
}

window.getSupabaseClient = getSupabaseClient;
