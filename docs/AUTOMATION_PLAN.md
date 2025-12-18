# Database Automation & Build Plan

## 1. Overview
This document defines the standard operating procedure (SOP) for rebuilding the FloraCatalog database from scratch. This process transforms the raw data from Kew Gardens (WCVP) into the optimized hierarchical structure used by the application.

## 2. Folder Structure
The project is organized to separate application code from raw data and build tools.

```text
/flora-catalog
  ├── .env                  # Secrets (git-ignored)
  ├── package.json          # Dependency manifest
  ├── App.tsx               # Main application logic
  ├── ...react components
  ├── docs/                 # Documentation
  │   ├── AUTOMATION_PLAN.md
  │   ├── DATA_MODEL.md
  │   └── ...guides
  ├── scripts/              # Build & Database Scripts
  │   ├── automate_build.js # The Master Controller (v2)
  │   ├── convert_wcvp.py   # Data cleaner
  │   ├── split_csv.py      # CSV splitter for browser uploads
  │   ├── wcvp_schema.sql.txt     # Core table definitions
  │   ├── wcvp_populate.sql.txt   # Data transformation logic
  │   ├── optimize_indexes.sql.txt # Performance tuning
  │   └── ...segmented build scripts
  └── data/                 # Data storage (git-ignored)
      ├── input/            # Place downloaded zip here
      ├── temp/             # Extracted & Converted files
      └── logs/             # Build logs
```

## 3. Bootstrapping (Prerequisites)

If running this on a fresh computer (e.g., an Admin's laptop), follow these steps to set up the environment.

### A. Get the Code
1.  **Choose a location:** Open your terminal (Terminal on Mac/Linux, PowerShell on Windows). Use `cd` to navigate to the folder where you want the project to live. 
    *Example:* `cd ~/Documents/Projects` or `cd C:\Users\Admin\Source`
2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/timbrinson/flora-catalog.git
    cd flora-catalog
    ```
    *This creates the `flora-catalog` folder and downloads the complete source structure from the timbrinson repository.*

### B. Install Runtimes
The automation relies on **Node.js** (for database orchestration) and **Python** (for CSV processing).

**Mac (OSX)**
1.  **Install Homebrew** (if missing): `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
2.  **Install Node & Python:** `brew install node python`
    *   *Note: This usually installs Python as `python3`. The automation script automatically detects this.*

**Windows**
1.  Download **Node.js (LTS)**: https://nodejs.org/
2.  Download **Python 3**: https://www.python.org/ (Check "Add Python to PATH" during install).

**Linux (Ubuntu/Debian)**
1.  `sudo apt update`
2.  `sudo apt install nodejs npm python3`

### C. Install Project Dependencies
Open your terminal inside the `flora-catalog` folder.
```bash
npm install
# This installs 'pg', 'pg-copy-streams' and other build tools defined in package.json.
```

## 4. Security (Handling the Database Password)

**Best Practice:** Do not commit passwords to version control. The script supports two methods for authentication.

### Method A: Password Prompt (Recommended for Shared Computers)
1.  Create a file named `.env` in the root folder.
2.  Add the URL *without* the password:
    ```env
    DATABASE_URL="postgresql://postgres@db.[PROJECT-ID].supabase.co:5432/postgres"
    ```
3.  Run the script. It will detect the missing password and prompt you to type it securely in the terminal.

### Method B: Environment Variable (Convenience for Personal Machines)
1.  Add the password to `.env` using a separate variable:
    ```env
    DATABASE_URL="postgresql://postgres@db.[PROJECT-ID].supabase.co:5432/postgres"
    DATABASE_PASSWORD="your-secret-password"
    ```
    *The script will automatically use this password without prompting.*

## 5. The Build Workflow

The `scripts/automate_build.js` is an interactive CLI that guides the Admin through the process.

### Step-by-Step Flow

| # | Action | Automated? | Method | Description |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **Download Data** | **Manual** | Web | Download WCVP Zip from [Kew Gardens](https://powo.science.kew.org/about-wcvp). Place in `data/input/`. |
| **1** | **Prepare Data** | Auto | Python | Unzips and converts pipes (`|`) to commas (`,`). |
| **2** | **Build Schema** | Auto | SQL | Runs `scripts/wcvp_schema.sql.txt`. Drops existing tables and recreates the empty schema. |
| **3** | **Stream Import** | Auto | `COPY` | Streams `wcvp_names_clean.csv` to `wcvp_import` via TCP. |
| **4** | **Populate** | Auto | SQL | Inserts data from staging to `app_taxa` (UUID generation). |
| **5** | **Indexes** | Auto | SQL | Creates basic structural indexes for linking. |
| **6** | **Link Parents** | Auto | SQL | Updates `parent_id` based on WCVP IDs (Adjacency List). |
| **7** | **Hierarchy** | Auto | SQL | Calculates Ltree paths. Includes `SET statement_timeout = 0` for 1.4M row processing. |
| **8** | **Counts** | Auto | SQL | Calculates descendant counts for the UI grid. |
| **9** | **Performance** | Auto | SQL | Runs `scripts/optimize_indexes.sql.txt`. Fast search/sort. |

## 6. Execution

1.  **Start the Process:**
    ```bash
    node scripts/automate_build.js
    ```
    *The script will create the `data/input` and `data/temp` folders if they don't exist.*

2.  **Granular Resume Menu:**
    The script offers granular control. If Step 3 (Import) fails due to internet issues, fix the connection and choose "Resume from Step 3". If Step 6 (Link) fails, choose "Resume from Step 6". Previous successful steps do not need to be re-run.

## 7. Technical Notes & Safety

*   **Idempotency:** Every SQL statement in the pipeline uses `IF NOT EXISTS` or `DROP ... IF EXISTS`. You can safely stop and restart the script at any step.
*   **Timeout Protection:** Step 7 (Ltree calculation) and Step 9 (Indexing) are heavy operations. The builder explicitly disables session timeouts to prevent Supabase from killing the connection during these long-running tasks.
*   **Import Fails (Streaming Error):**
    *   Ensure your internet connection is stable.
    *   Ensure `wcvp_names_clean.csv` was generated correctly in Step 1.
    *   You can retry Step 3 from the menu.
*   **Python Error:**
    *   If the script fails to find python, ensure `python` or `python3` is in your system PATH.
