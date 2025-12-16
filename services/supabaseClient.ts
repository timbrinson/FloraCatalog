
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- SECURITY WARNING ---
// Do NOT commit real keys to GitHub. Use environment variables.
// If you are running this locally, create a .env file.
// If you are in a cloud editor, set the secrets in the environment settings.

const MANUAL_URL = 'https://uzzayfueabppzpwunvlf.supabase.co'; 
const MANUAL_KEY = ''; // Leave empty for GitHub commit

let supabaseInstance: SupabaseClient | null = null;
let isOfflineMode = true;

// Initialization Logic
const initClient = () => {
  // 1. Try Environment Variables (Vite/Node)
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process as any).env?.VITE_SUPABASE_ANON_KEY;

  // 2. Try Local Storage (For runtime configuration in browser)
  const storageUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const storageKey = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;

  // Logic: LocalStorage -> Environment -> Manual -> Placeholder
  // We trim to handle copy-paste errors with spaces
  const url = (storageUrl || envUrl || MANUAL_URL || 'https://placeholder.supabase.co').trim();
  const key = (storageKey || envKey || MANUAL_KEY || 'placeholder-key').trim();

  // Check if we are truly connected to a real backend
  const hasValidUrl = url.startsWith('http') && url !== 'https://placeholder.supabase.co';
  const hasValidKey = key.length > 20 && key !== 'placeholder-key'; // Basic length check for JWT

  isOfflineMode = !(hasValidUrl && hasValidKey);

  if (isOfflineMode) {
    if (typeof window !== 'undefined') {
       console.warn("Supabase credentials missing or invalid. App running in offline mode.");
    }
    // Create a dummy client so the app doesn't crash on property access, 
    // but dataService will check isOfflineMode before calling it.
    supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder-key');
  } else {
    try {
        supabaseInstance = createClient(url, key);
        console.log("Supabase Client Initialized");
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
        isOfflineMode = true;
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
  }
};

// Initialize on load
initClient();

// --- EXPORTS ---

export const getSupabase = (): SupabaseClient => {
    if (!supabaseInstance) initClient();
    return supabaseInstance!;
};

export const getIsOffline = (): boolean => {
    return isOfflineMode;
};

// Allow the App to force a reload of the client (e.g. after Settings save)
export const reloadClient = () => {
    console.log("Reloading Supabase Client configuration...");
    initClient();
};
