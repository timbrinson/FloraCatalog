# Database Automation & Build Plan

## 1. Overview
This document defines the standard operating procedure (SOP) for rebuilding the FloraCatalog database from scratch. This process transforms the raw data from Kew Gardens (WCVP) into the optimized hierarchical structure used by the application.

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
  │   ├── automate_build.js # The Master Controller (v2.3)
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

**Automation Script Default:** As of v2.3, the automation script defaults to using the **Transaction Pooler (Port 6543)** and explicitly forces the connection over **IPv4** to bypass broken network configurations.

---

## 4. Bootstrapping (Prerequisites)

If running this on a fresh computer (e.g., an Admin's laptop), follow these steps to set up the environment.

### A. Get the Code
1.  **Choose a location:** Open your terminal (Terminal on Mac/Linux, PowerShell on Windows). Use `cd` to navigate to the folder where you want the project to live. 
2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/timbrinson/FloraCatalog.git
    cd FloraCatalog
    ```

### B. Install Runtimes
The automation relies on **Node.js** (for database orchestration) and **Python** (for CSV processing).

**Mac (OSX)**
1.  `brew install node python`

**Windows**
1.  Download **Node.js (LTS)**: https://nodejs.org/
2.  Download **Python 3**: https://www.python.org/ (Check "Add Python to PATH").

### C. Install Project Dependencies
Open your terminal inside the `FloraCatalog` folder.
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
3.  If you only provide the URL without the password, the script will interactively prompt you for the password and attempt to connect via the pooler automatically using the IPv4 protocol.

---

## 6. The Build Workflow

The `scripts/automate_build.js` is an interactive CLI that guides the Admin through the process.

> **CRITICAL EXECUTION PATH:** Always run the build commands from the **Project Root** (the `FloraCatalog/` folder). Do NOT `cd` into the `scripts/` directory. The automation logic expects to find `.env`, `data/`, and other script files relative to the current working directory of the root project.

### Step-by-Step Flow

| # | Action | Automated? | Method | Description |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **Download Data** | **Manual** | Web | Download WCVP Zip from [Kew Gardens](https://powo.science.kew.org/about-wcvp). Place in `data/input/`. |
| **1** | **Prepare Data** | Auto | Python | Unzips and converts pipes (`|`) to commas (`,`). |
| **2** | **Build Schema** | Auto | SQL | Runs `scripts/wcvp_schema.sql.txt`. Drops existing tables and recreates the empty schema. |
| **3** | **Stream Import** | Auto | `COPY` | Streams `wcvp_names_clean.csv` to `wcvp_import` via TCP. |
| **4** | **Populate** | Auto | SQL | Inserts data from staging to `app_taxa`. |
| **5** | **Indexes** | Auto | SQL | Creates basic structural indexes for linking. |
| **6** | **Link Parents** | Auto | SQL | Updates `parent_id` based on WCVP IDs (Adjacency List). |
| **7** | **Hierarchy** | Auto | SQL | Calculates Ltree paths. |
| **8** | **Counts** | Auto | SQL | Calculates descendant counts for the UI grid. |
| **9** | **Performance** | Auto | SQL | Runs `scripts/optimize_indexes.sql.txt`. |

---

## 7. Execution

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

## 8. Troubleshooting Common Errors

### A. Error: `connect EHOSTUNREACH [IPv6 Address]`
*   **Cause:** Local network or computer doesn't support IPv6.
*   **Fix:** The script v2.3+ explicitly forces the connection to use the **IPv4** protocol. Ensure your `.env` uses the IPv4 pooler host (`...pooler.supabase.com`) on port **6543**.

### B. Error: `Terminated due to timeout`
*   **Fix:** Ensure you are using the **"Transaction"** mode pooler on port **6543**. The script sets `statement_timeout = 0`, but the pooler is much more stable for multi-minute operations like hierarchy calculation.

### C. Python Error
*   **Fix:** Ensure `python` or `python3` is in your system PATH. The script tries both.