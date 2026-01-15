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
  │   ├── automate_build.js # The Master Controller (v2.33.16)
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

---

## 6. The Build Workflow (v2.33.16)

The `scripts/automate_build.js` is an interactive CLI with two execution modes:

### Mode 1: Sequential (Full Rebuild)
Select a single number. The script runs that step and every step following it. 
*   **Use Case:** Initial setup or major schema updates.
*   **Warning:** Destructive. Wipes all data.

### Mode 2: Granular (Enrichment/Recovery)
Enter a comma-separated list (e.g. `12, 13`). This executes **ONLY** the specified steps. 
*   **Use Case:** Adding Phylogenetic data to an existing WCVP baseline.

### Step-by-Step Flow

| # | Action | Automated? | Method | Description |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Prepare WCVP** | Auto | Python | Runs `convert_wcvp.py.txt` to clean data. |
| **2** | **Prepare WFO** | Auto | Python | Runs `distill_wfo.py.txt` for backbone. |
| **3** | **Reset DB** | Auto | SQL | Wipes schema and recreates tables. |
| **4** | **Import WCVP** | Auto | `COPY` | Streams WCVP staging table. |
| **5** | **Import WFO** | Auto | `COPY` | Streams WFO staging table (29 cols). |
| **6** | **Populate WCVP** | Auto | SQL | Moves WCVP staging to core table (Source 1). |
| **7** | **Populate WFO** | Auto | SQL | Moves Distilled WFO to core table (Source 2). |
| **8** | **Build Indexes** | Auto | SQL | Structural indexes for linking. |
| **9** | **Link Parents** | Auto | SQL | WCVP internal Adjacency List. |
| **10**| **Resolve WFO** | Auto | SQL | WFO internal Adjacency List (Backbone). |
| **11**| **Bridge: Graft** | Auto | SQL | Joins Genus roots to Families via literal join. |
| **12**| **Bridge: Synonyms**| Auto | SQL | **Deterministic** synonym dereference via WFO IDs. |
| **13**| **Bridge: Flow** | Auto | SQL | Propagates K/P/C/O literals via family literal. |
| **14**| **Hierarchy** | Auto | SQL | Calculates Ltree paths. |
| **15**| **Counts** | Auto | SQL | Recalculates direct child counts. |
| **16**| **Optimize** | Auto | SQL | Final production indexing. |

---

## 11. The Build Integrity & Evolution Principle
To ensure long-term project viability, the build process adheres to the following sovereign rule:

1. **"Ground Zero" Requirement:** The build script (`scripts/automate_build.js`) and core schema (`scripts/wcvp_schema.sql.txt`) must always remain in a state where a complete database can be constructed from raw source files without manual SQL intervention.
2. **Idempotency:** Every step in the build process should be safe to run multiple times. Use `ON CONFLICT DO NOTHING` or explicit existence checks.
3. **One-Time Repair vs. Core Evolution:**
    - **One-Time Fixes:** If a schema change is needed for an active database, a separate repair process (e.g., `repair_data.js`) should be used to upgrade the existing structure.
    - **Script Alignment:** Simultaneously, the change **must** be integrated into the relevant step of the master build script to ensure future fresh builds inherit the new design automatically.
4. **Separation of Concerns:** Populate steps for different authorities (WCVP vs WFO) must remain distinct to allow granular troubleshooting and re-runs of specific authority layers.