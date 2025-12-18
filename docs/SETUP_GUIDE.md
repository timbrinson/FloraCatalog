
# FloraCatalog - Setup Guide

## 1. Cloud Infrastructure (Supabase)

This application uses Supabase for its PostgreSQL database and real-time capabilities.

### Step 1: Create a Project
1.  Log in to [Supabase](https://supabase.com/).
2.  Click **"New Project"**.
3.  Choose your organization, give it a name (e.g., "FloraCatalog"), and set a database password.
4.  Wait for the database to provision.

### Step 2: Initialize Database Schema
The application requires specific tables (`app_taxa`, `app_taxon_details`, etc.) to function.

> **Automated Option:** You can skip the manual steps below by using the build script: `node scripts/automate_build.js` and selecting Option 2.

**Manual Steps:**
1.  In your Supabase Dashboard, go to the **SQL Editor** (icon on the left sidebar).
2.  Click **"New Query"**.
3.  Open the file `scripts/wcvp_schema.sql.txt` from the `scripts` folder.
4.  Copy the entire content of the file.
5.  Paste it into the Supabase SQL Editor.
6.  Click **"Run"** (bottom right).
7.  Verify that tables (`app_taxa`, etc.) have been created by looking at the **Table Editor**.

### Step 3: Get API Credentials
1.  Go to **Project Settings** (cog icon) -> **API**.
2.  Under **Project URL**, copy the URL.
3.  Under **Project API keys**, find the `anon` / `public` key and copy it.

---

## 2. Application Configuration

### Option A: Local Development (Vite/Node)
If running locally on your machine, using `.env` is the secure standard.
1.  Create a file named `.env` in the project root.
2.  Add your keys:
    ```env
    VITE_SUPABASE_URL=https://your-project-id.supabase.co
    VITE_SUPABASE_ANON_KEY=your-long-anon-key
    ```
3.  The app will automatically load these via `import.meta.env`.

### Option B: Cloud/Browser Editors (StackBlitz, AI Studio)
If `.env` files are hidden or difficult to configure in your browser environment:
1.  Open `services/supabaseClient.ts`.
2.  Paste your credentials directly into the manual fallback constants:
    ```typescript
    const MANUAL_URL = 'https://your-project-id.supabase.co';
    const MANUAL_KEY = 'your-long-anon-key';
    ```

---

## 3. Google Gemini API

This app uses Google Gemini 2.5 Flash for parsing botanical names and enrichment.
1.  Get an API Key from [Google AI Studio](https://aistudio.google.com/).
2.  **Browser Environment:** In this specific environment (AI Studio/StackBlitz), the key is usually handled by the platform automatically (injected as `process.env.API_KEY`).
3.  **Local Development:** Add `API_KEY` to your `.env` or check `services/geminiService.ts` to ensure it looks for the correct variable name for your bundler (e.g. `import.meta.env.VITE_GOOGLE_API_KEY`).
