import { createClient } from '@supabase/supabase-js';

// --- SECURITY WARNING ---
// Do NOT commit real keys to GitHub. Use environment variables.
// If you are running this locally, create a .env file.
// If you are in a cloud editor, set the secrets in the environment settings.

const MANUAL_URL = ''; // Leave empty for GitHub commit
const MANUAL_KEY = ''; // Leave empty for GitHub commit

// ------------------------------------------------------------------

// Try to get keys from environment (Vite/Node) first, then fall back to manual
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process as any).env?.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process as any).env?.VITE_SUPABASE_ANON_KEY;

// Logic: Use Environment -> Manual -> Placeholder (to prevent crash)
const supabaseUrl = envUrl || MANUAL_URL || 'https://placeholder.supabase.co';
const supabaseKey = envKey || MANUAL_KEY || 'placeholder-key';

// Check if we are truly connected
const isConfigured = (envUrl || MANUAL_URL) && (envKey || MANUAL_KEY);

if (!isConfigured) {
  console.warn("Supabase credentials missing. App will run in offline mode (UI only).");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isOffline = !isConfigured;