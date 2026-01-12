# Database Automation & Build Plan

## 1. Overview
This document defines the standard operating procedure (SOP) for rebuilding the FloraCatalog database from scratch. This process transforms the raw data from Kew Gardens (WCVP) and World Flora Online (WFO) into the optimized hierarchical structure used by the application.

## 2. Folder Structure
The project is organized to separate application code from raw data and build tools.

```text
/FloraCatalog
  ├── .env                  # Secrets (git-ignored)
  ├── package.json          # Dependency manifest
  ├── App.tsx               # Main application logic
  ├── ...react components
  ├── docs/                 # Documentation
  │   ├── AUTOMATION_PLAN.md
  │   ├── DATA_MODEL.md
  │   └── ...guides
  ├── scripts/              # Build & Database Scripts
  │   ├── automate_build.js # The Master Controller (v2.31.8)
  │   ├── convert_wcvp.py   # Data cleaner
  │   ├── distill_wfo.py    # WFO filtered exporter
  │   ├── wcvp_schema.sql.txt     # Core table definitions
  │   ├── optimize_indexes.sql.txt # V8.1 Performance tuning
  │   └── ...segmented build scripts
  └── data/                 # Data storage (git-ignored)
      ├── input/            # Place downloaded zips here
      ├── temp/             # Extracted & Converted files
      └── logs/             # Build logs
```

## 3. Supabase Network Configuration (Important!)

Supabase recently moved to **IPv6 by default** for direct database connections. Many home and office networks do not yet support IPv6, resulting in the error: `connect EHOSTUNREACH [IPv6 Address]`.

### How to Fix in Supabase:
1.  Log in to your **Supabase Dashboard**.
2.  Go to **Settings (Cog Icon)** -> **Database**.
3.  Scroll down to the **Connection string** section.
4.  Switch the tab to **"Transaction"** (this uses the connection pooler).
5.  Ensure **"Use IPv4"** is checked (it will change the host from `db.xxx...` to `aws-0-xxx.pooler.supabase.com`).
6.  Copy the **URI** string.
7.  Update your local `.env` file's `DATABASE_URL` with this new string.

---

## 4. Bootstrapping (Prerequisites)

If running this on a fresh computer (e.g., an Admin's laptop), follow these steps to set up the environment.

### A. Get the Code
1.  **Choose a location:** Open your terminal. Use `cd` navigate to the folder where you want the project to live. 
2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/timbrinson/FloraCatalog.git
    cd FloraCatalog
    ```

### B. Install Runtimes
The automation relies on **Node.js** (for database orchestration) and **Python** (for CSV processing).

### C. Install Project Dependencies
```bash
npm install
```

---

## 5. Security & Authentication

The script needs to know where your database is and how to log in.

1.  Create a file named `.env` in the root `FloraCatalog` folder.
2.  **Recommended:** Use the full Connection Pooler URI (see Section 3):
    ```env
    DATABASE_URL="postgresql://postgres.[PROJ-ID]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
    ```
3.  If you only provide the URL without the password, the script will interactively prompt you for the password.

### Authentication Issues?
If the script fails to connect with "Authentication failed," or `password authentication failed` error:
- Your database password does not contain special characters that require URL encoding (like `@` or `:`).
- If it does, you must URL-encode them (e.g., `@` becomes `%40`).
-   **The Database Password** is NOT your Supabase login password. It is the one you set when you first created the project.
-   If you forgot it, go to **Settings -> Database -> Reset Database Password** in the Supabase Dashboard.
   Wait 60 seconds after resetting for the pooler to sync.

---

## 6. The Build Workflow (v2.32.0)

The `scripts/automate_build.js` is an interactive CLI with two execution modes:

### Mode 1: Sequential (Full Rebuild)
Select a single number. The script runs that step and every step following it. 
*   **Use Case:** Initial setup or major schema updates.
*   **Warning:** Destructive. Wipes all data.

### Mode 2: Granular (Enrichment/Recovery)
Enter a comma-separated list (e.g. `2, 5, 9, 10, 11, 13`). This executes **ONLY** the specified steps. 
*   **Use Case:** Adding Phylogenetic and Higher Rank (WFO) data to an existing WCVP baseline.
*   **Use Case:** Resuming a failed build without re-streaming 1.4 million records.

### Step-by-Step Flow

| # | Action | Automated? | Method | Description |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Prepare WCVP** | Auto | Python | Runs `convert_wcvp.py.txt` to clean pipe-delimited data. |
| **2** | **Prepare WFO** | Auto | Python | Runs `distill_wfo.py.txt` to export backbone ranks (Kingdom down to Family). |
| **3** | **Reset Database** | Auto | SQL | Wipes schema and recreates empty tables (`wcvp_schema.sql.txt`). |
| **4** | **Import WCVP** | Auto | `COPY` | Streams cleaned WCVP CSV into the `wcvp_import` staging table. |
| **5** | **Import WFO** | Auto | `COPY` | Streams the filtered WFO Darwin Core into the `wfo_import` table. |
| **6** | **Populate App** | Auto | SQL | Moves data from `wcvp_import` to the core `app_taxa` table in segments. |
| **7** | **Build Indexes** | Auto | SQL | Creates structural indexes required for high-speed linking. |
| **8** | **Link Parents** | Auto | SQL | Updates `parent_id` UUIDs based on scientific lineage in segments. |
| **9** | **WFO Higher Ranks** | Auto | SQL | Creates Kingdom, Phylum, Class, and Order records and links the backbone hierarchy. |
| **10** | **Derived Backbone**| Auto | SQL | Links unlinked WCVP Families to their WFO parents and propagates literal strings. |
| **11** | **Hierarchy** | Auto | SQL | Recursively calculates Ltree paths (`root.kingdom.phylum.class.order.family...`) in segments. |
| **12** | **Counts** | Auto | SQL | Calculates descendant counts for the UI Grid # column in segments. |
| **13** | **Optimize** | Auto | SQL | Runs `optimize_indexes.sql.txt` for V8.1 production performance. |

---

## 7. Segmented Recovery & Gap Closure

### Alphabetical Recovery
Because the 1.4 million record table is massive, the build process is "Segmented" alphabetically.
1.  **Iterative Linking:** Step 8 (Link Parents) runs in segments (A, B, C...).
2.  **Recovery:** If the script crashes during Segment 'M', you can restart at Step 8 (Link Parents) and select 'M' as your starting range to finish the job.
3.  **Ltree Hierarchy (Step 11):** This is the most computationally expensive part. It walks the tree level-by-level to build the `hierarchy_path`.

### Protocol for Gap Closure
If you populated records in chunks (e.g., A-S first, then T-Z), you must run a **Gap Closure** pass:
1.  **Why:** Children in the A-S range couldn't find parents in the T-Z range during the first pass.
2.  **Protocol:** 
    *   Run **Step 8 (Link Parents)** for **'All'** ranges.
    *   Run **Step 11 (Hierarchy)** for **'All'** ranges.
3.  **False Root Recovery:** Step 11 now automatically identifies and resets "False Roots"—records that were temporarily marked as roots because their parents were missing. This ensures they are correctly grafted into the tree once the parent is present.

---

## 8. Execution

1.  **Open your terminal** and ensure you are in the `FloraCatalog` root directory.
2.  **Start the Process:**
    ```bash
    # Option 1: Using the direct node command
    node scripts/automate_build.js

    # Option 2: Using the NPM shortcut
    npm run db:build
    ```
3.  **Granular Resume Menu:**
    The script offers granular control. If a step fails, fix the issue and choose the specific step number from the menu to resume.

---

## 🚀 WFO Enrichment (Backbone Only)

If your WCVP data is already loaded and you only want to add the Phylogenetic and Higher Rank (Kingdom, Phylum, Class, Order) layer:
1.  **Download WFO Backbone** (`_DwC_backbone_R.zip`) to `data/input/`.
2.  Run `npm run db:build`.
3.  Enter: `2, 5, 9, 10, 11, 12, 13`.
    *   **2:** Distills the 950MB WFO zip locally into a filtered `wfo_import.csv` file.
    *   **5:** Streams the filtered table into the `wfo_import` staging table.
    *   **9:** Creates physical Kingdom, Phylum, Class, and Order records (Source 3) and links the hierarchy using SQL set logic.
    *   **10:** Links WCVP Families to their WFO parents and propagates rank literals down the hierarchy.
    *   **11:** Recalculates Hierarchy Paths (Select 'All' segments to shift the entire tree down).
    *   **12:** Recalculates Counts (Updates Grid # for the new higher rank records).
    *   **13:** Re-optimizes indexes for high-speed filtering.

---

## 9. Troubleshooting Common Errors

### A. Error: `connect EHOSTUNREACH [IPv6 Address]`
*   **Fix:** Ensure your `.env` uses the IPv4 pooler host (`...pooler.supabase.com`) on port **6543**.

### B. Error: `Terminated due to timeout` (57014)
*   **Fix:** Use the **"Transaction"** mode pooler. The script sets `statement_timeout = 0`.
*   **Fix:** Run Step 13 (Optimize) to build composite indexes that handle sorting.

### C. Python Error
*   **Fix:** Ensure `python` or `python3` is in your system PATH. The script tries both.
*   **macOS Fix:** If you get "Operation not permitted," grant your Terminal "Full Disk Access" in System Settings.
