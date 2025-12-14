
# WCVP Data Import Guide

This guide explains how to populate your FloraCatalog database with the 1.4 million plant records from the World Checklist of Vascular Plants (WCVP).

## Phase 1: Download the Data

1.  Go to the **Kew Gardens WCVP** download page: [https://powo.science.kew.org/about-wcvp](https://powo.science.kew.org/about-wcvp).
2.  Download the latest "WCVP Format" zip file.
3.  Unzip the folder. You are looking for a file named `wcvp_names.csv` (or `checklist_names.txt`).

## Phase 2: Convert to Standard CSV

The raw data from Kew is **Pipe Delimited** (`|`) and contains commas inside the text columns. To import this safely into Supabase, we must convert it to a standard CSV where text containing commas is wrapped in quotes.

1.  **Prepare the Script:**
    *   Download/Copy the `scripts/convert_wcvp.py` file from this project to your computer.
    *   Place the unzipped WCVP file in the same folder as the script.
    *   Rename the WCVP file to `wcvp_names.txt` (or edit the script to match your filename).

2.  **Run the Script:**
    *   You need Python installed. Open your terminal/command prompt.
    *   Run: `python convert_wcvp.py`
    *   Wait for it to process (approx 10-30 seconds for 1.4M rows).
    *   It will create a new file: `wcvp_names_clean.csv`.

## Phase 3: Import into Supabase (Staging)

We will load the clean data into the `wcvp_import` table.

1.  Log in to your **Supabase Dashboard**.
2.  Go to the **Table Editor** (icon on the left).
3.  Select the `wcvp_import` table.
4.  Click **"Insert"** -> **"Import Data from CSV"**.
5.  **Settings:**
    *   Select your **`wcvp_names_clean.csv`** file (the one created by the script).
    *   **Delimiter:** Comma (`,`).
    *   **Map Columns:** Ensure the CSV headers match the database columns (`plant_name_id`, `taxon_name`, etc.).

    *Tip:* If the file is too large (>100MB) for the browser uploader, you can split the file or use a database client like DBeaver or TablePlus to import it.

## Phase 4: Populate the App (The Magic Step)

Once the data is sitting in `wcvp_import`, we need to move it to `app_taxa` and build the hierarchy tree.

1.  Open the **Supabase SQL Editor**.
2.  Open the file `wcvp_populate.txt` from your FloraCatalog project.
3.  Copy the SQL code.
4.  Paste it into Supabase and click **Run**.

**What this script does:**
*   Transfers 1.4M records to `app_taxa`.
*   Generates a new UUID for every plant.
*   Maps the old WCVP IDs to the new system.
*   **Calculates the Tree:** It runs a complex "Recursive" operation to figure out that "Agave parryi" belongs to "Agave", which belongs to "Asparagaceae", and builds the efficient `ltree` path for fast querying.

## Phase 5: Verify

1.  Go back to your FloraCatalog App.
2.  The Data Grid should now be populated with real data!
