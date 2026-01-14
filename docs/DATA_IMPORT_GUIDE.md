# WCVP Data Import Guide

> **NEW:** A fully automated CLI tool is now available to handle these steps. See [**Automation Plan**](./AUTOMATION_PLAN.md) or run `npm run db:build` (`node scripts/automate_build.js`).

This guide explains how to populate your FloraCatalog database with the 1.4 million plant records from the World Checklist of Vascular Plants (WCVP).

## Phase 1: Download the Data

1.  Go to the **Kew Gardens WCVP** download page: [https://powo.science.kew.org/about-wcvp](https://powo.science.kew.org/about-wcvp).
2.  Download the latest "WCVP Format" zip file.
3.  Unzip the folder. You are looking for a file named `wcvp_names.csv` (or `checklist_names.txt`).

## Phase 2: Convert to Standard CSV

The raw data from Kew is **Pipe Delimited** (`|`) and contains commas inside the text columns. To import this safely into Supabase, we must convert it to a standard CSV where text containing commas is wrapped in quotes.

1.  **Prepare the Script:**
    *   Download/Copy the `scripts/convert_wcvp.py.txt` file from this project to your computer.
    *   Place the unzipped WCVP file in the same folder as the script.
    *   Rename the WCVP file to `wcvp_names.txt` (or edit the script to match your filename).

2.  **Run the Script:**
    *   You need Python installed. Open your terminal/command prompt.
    *   Run: `python convert_wcvp.py.txt`
    *   Wait for it to process (approx 10-30 seconds for 1.4M rows).
    *   It will create a new file: `wcvp_names_clean.csv`.

## Phase 3: Split for Upload (Large File Handling)

The generated `wcvp_names_clean.csv` is likely ~300MB+, which is too large for the Supabase browser interface (100MB limit).

1.  **Run the Splitter:**
    *   Run: `python split_csv.py.txt`
    *   This will read `wcvp_names_clean.csv` and generate several smaller files: `wcvp_part_01.csv`, `wcvp_part_02.csv`, etc.
    *   Each file retains the headers and contains 100,000 rows.

## Phase 4: Import into Supabase (Staging)

We will load the data parts into the `wcvp_import` table.

1.  Log in to your **Supabase Dashboard**.
2.  Go to the **Table Editor** (icon on the left).
3.  Select the `wcvp_import` table.
4.  **For the first file (`wcvp_part_01.csv`):**
    *   Click **"Insert"** -> **"Import Data from CSV"**.
    *   Select `wcvp_part_01.csv`.
    *   **Delimiter:** Comma (`,`).
    *   **Map Columns:** Ensure headers match.
    *   Click Import.
5.  **For the remaining files (`wcvp_part_02.csv`, etc.):**
    *   Repeat the process. Supabase will append the new rows to the existing table.

### 🛑 Troubleshooting: Duplicate Key Error / Partial Load
If a file (e.g., `wcvp_part_05.csv`) fails halfway through, you cannot just upload it again because Supabase will reject the rows that *did* succeed (Duplicate Key Error).

**The Fix:**
1.  Open the **Supabase SQL Editor**.
2.  Open/Copy the script `scripts/recover_import.sql.txt`.
3.  Run the **STEP 1** block to create a `wcvp_error_recovery` table.
4.  Upload your failed file to `wcvp_error_recovery` using the Table Editor (like normal).
5.  Run the **STEP 3** block in SQL Editor to merge the data safely.
6.  Delete the recovery table and continue with the next file.

## Phase 5: Populate the App (Segmented Steps)

Due to browser timeouts with massive datasets, the population process is split into parts. Run these sequentially in the **Supabase SQL Editor**.

**Pre-Requisite:**
Run `scripts/wcvp_fix_schema.sql.txt` to handle NULL ranks and Citation info.

### Step 1: Insert Raw Data (Batched)
Run these one by one. The first one will clear any existing data in `app_taxa` to ensure a clean start.

1.  **Run `scripts/wcvp_step1_part1.sql.txt`** (Names A-C)
2.  **Run `scripts/wcvp_step1_part2.sql.txt`** (Names D-G)
3.  **Run `scripts/wcvp_step1_part3.sql.txt`** (Names H-L)
4.  **Run `scripts/wcvp_step1_part4.sql.txt`** (Names M-P)
5.  **Run `scripts/wcvp_step1_part5.sql.txt`** (Names Q-S)
6.  **Run `scripts/wcvp_step1_part6.sql.txt`** (Names T-Z)

### Step 2: Link Parents (Batched)
**Update:** Batch 1 (A-C) is split to handle Asteraceae.
**Note:** For Asteraceae (Batch 1a), only ~40% of records may link. This is normal (many are unlinked synonyms).

1.  **Run `scripts/wcvp_step2_indexes.sql.txt`** (Creates lookup indexes - Required)
2.  **Run `scripts/wcvp_step2_batch1a_asteraceae.sql.txt`** (Asteraceae - 4 blocks)
3.  **Run `scripts/wcvp_step2_batch1b_a_rest.sql.txt`** (Rest of A)
4.  **Run `scripts/wcvp_step2_batch1c_b.sql.txt`** (Families B)
5.  **Run `scripts/wcvp_step2_batch1d_c.sql.txt`** (Families C)
6.  **Run `scripts/wcvp_step2_batch2.sql.txt`** (Links D-G)
7.  **Run `scripts/wcvp_step2_batch3.sql.txt`** (Links H-L)
8.  **Run `scripts/wcvp_step2_batch4.sql.txt`** (Links M-P)
9.  **Run `scripts/wcvp_step2_batch5.sql.txt`** (Links Q-S)
10. **Run `scripts/wcvp_step2_batch6.sql.txt`** (Links T-Z)
11. **Run `scripts/wcvp_step2_cleanup.sql.txt`** (Restores performance indexes)

### Step 3: Hierarchy / Ltree (Batched)
Calculates full paths (e.g. `root.family_id.genus_id.species_id`).

1.  **Run `scripts/wcvp_step3_batch1a_asteraceae.sql.txt`** (Asteraceae - Run the 4 internal blocks sequentially!)
2.  **Run `scripts/wcvp_step3_batch1b_a_rest.sql.txt`** (Roots A - An)
3.  **Run `scripts/wcvp_step3_batch1e_ao_aq.sql.txt`** (Roots Ao - Aq)
4.  **Run `scripts/wcvp_step3_batch1f_ar_az.sql.txt`** (Roots Ar - Az)
5.  **Run `scripts/wcvp_step3_batch1c_b.sql.txt`** (Families B)
6.  **Run `scripts/wcvp_step3_batch1d_c.sql.txt`** (Families C)
7.  **Run `scripts/wcvp_step3_batch2.sql.txt`** (Families D-G)
8.  **Run `scripts/wcvp_step3_batch3.sql.txt`** (Families H-L)
9.  **Run `scripts/wcvp_step3_batch4.sql.txt`** (Families M-P)
10. **Run `scripts/wcvp_step3_batch5.sql.txt`** (Families Q-S)
11. **Run `scripts/wcvp_step3_batch6.sql.txt`** (Families T-Z)

### Step 4: Final Counts
1.  **Run `scripts/wcvp_step4_counts.sql.txt`**

## Phase 6: WFO Backbone Integration & Infrastructure

The World Flora Online (WFO) backbone contains phylogenetic data (Kingdom through Family) that enriches the WCVP nomenclature.

### 🛑 Mandatory Infrastructure: Supabase Pro Plan
This application requires the **Supabase Pro Plan** ($25/mo) at a minimum. The combined footprint of the WCVP and WFO staging tables (1.4M+ records each) and the physical application tables far exceeds the 500MB free-tier logical storage limit. Using the free tier will result in database locks and write failures during Phase 4 and 5.

### Storage Efficiency & Distillation
The raw WFO `classification.csv` contains millions of records. Most of these are Genus or Species records already covered by WCVP.

1.  **The Filter Rule:** The `scripts/distill_wfo.py.txt` script is configured to only extract rows where the **genus** column is empty. 
2.  **Effect:** This captures all authoritative records at the Family rank and above—including Orders, Phyla, and phylogenetic bridge nodes like **Superorders** or **Clades**—while discarding the heavy, redundant lower-level records.
3.  **Phylogenetic Gap (Class):** Note that for many groups (e.g., Angiosperms), the "Class" level is not formally defined in standard phylogenies like APG IV. In these scientific cases, the "Class" metadata will be empty in the database, and the grid handles the gap using virtual rows.

## Phase 7: Verify

1.  Go back to your FloraCatalog App.
2.  The Data Grid should now be populated with real data!