

<!--
HOW TO UPDATE THIS DOCUMENT:
To regenerate this file based on the latest codebase changes, simply ask the AI:
"Please update the design specs file to match our latest changes."
-->

# FloraCatalog - Design Specifications & Prompt Context

**Role:** Senior Frontend Engineer & UI/UX Designer.
**Goal:** Build a complex, single-page React application for cataloging botanical taxonomy.
**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, `@google/genai` (Gemini SDK).
**Persistence:** `localStorage`.

---

## 1. Core Concept
The app is a "Smart Spreadsheet" for plants. It allows users to input natural language plant names (e.g., "Agave parryi var. truncata"). The app uses Gemini 2.5 Flash to parse this into a strict taxonomic hierarchy (Family -> Genus -> Species -> Infraspecies -> Cultivar), auto-populates botanical details, and displays them in a high-density, customizable Data Grid.

## 2. Data Model (Crucial)
The central data unit is a `Taxon`. It is recursive (has a `parentId`).
*   **Rank Hierarchy:** Family, Genus, Species, Subspecies, Variety, Form, Cultivar, Hybrid, Grex.
*   **WCVP Alignment:** The schema is strictly aligned with the *World Checklist of Vascular Plants*. 
    *   **IDs:** `plantNameId` (WCVP ID), `ipniId`, `powoId`, `acceptedPlantNameId`, `basionymPlantNameId`, `parentPlantNameId`, `homotypicSynonym`.
    *   **Authorship:** `taxonAuthors` (Full), `primaryAuthor`, `parentheticalAuthor`, `publicationAuthor`, `replacedSynonymAuthor`.
    *   **Publication:** `placeOfPublication` (Title), `volumeAndPage`, `firstPublished`, `nomenclaturalRemarks`.
    *   **Geography/Bio:** `geographicArea`, `lifeformDescription`, `climateDescription`.
*   **Hybrid Handling:**
    *   Store "Hybrid Status" separately from "Rank".
    *   Fields: `genusHybrid` (stores '×'), `speciesHybrid` (stores '×'), `hybridFormula`.
    *   **Rule:** A plant can be Rank: 'Genus' and GenusHybrid: '×' (e.g., × Mangave).
    *   **Normalization:** Input containing 'x' or 'X' in hybrid fields must be converted to '×' before storage.

## 3. AI Service Layer (`geminiService.ts`)
Use `gemini-2.5-flash`.
*   **Cost Optimization:** Do **NOT** use the `googleSearch` tool for standard identification or mining to keep runtime costs near zero. Rely on the model's internal knowledge base.
*   **`identifyTaxonomy(query)`:**
    *   Prompt: Act as a botanical taxonomist. Parse input into a hierarchy chain.
    *   Input: "Lycoris rosea" -> Output JSON Array: `[{ rank: "genus", name: "Lycoris"... }, { rank: "species", name: "rosea", speciesHybrid: "×" }]`.
    *   *Hybrid Logic:* Infer hidden hybrids. If input is "Lycoris rosea" (which is botanically Lycoris × rosea), the JSON must return `speciesHybrid: "×"`.
*   **`deepScanTaxon(name, rank)`:**
    *   Iterate through alphabet ranges (A-C, D-F...) to find all registered cultivars for a specific genus/species.
    *   Must allow user cancellation mid-process.

## 4. UI: The Advanced Data Grid (`DataGridV2.tsx`)
This is the most complex component. It is a "Tree Grid" that renders a flat list but groups visually.
*   **Columns:** Tree Control, # (Count), Actions, Family, Genus, GH (Genus Hybrid), Species, SH (Species Hybrid), Infraspecific Rank, Infraspecies, Cultivar, Scientific Name, Common Name, + all WCVP fields.
*   **Visual Logic:**
    *   **Dimming:** If the row is a "Genus", dim columns to the right (Species, Cultivar).
        *   *Special Logic:* Ranks `subspecies`, `variety`, and `form` are all treated as Visual Level 5. This prevents the Infraspecies column (Level 5) from being incorrectly dimmed for a 'form' rank row.
    *   **Bolding:** 
        *   Bold the column text that matches the row's rank (e.g., Species term is bold on a Species row).
        *   **Scientific Name:** Always Bold.
        *   **Hybrid Markers (GH/SH):** Bold when the row matches their level (e.g., GH is bold on a Genus row).
        *   **Infraspecific Rank (I-Rank):** Bold on Infraspecific rows (matches the Name column).
    *   **Text Color:** 
        *   Active/Bold cells inherit the row's base color (e.g., `text-green-900` on a green row).
        *   Dimmed cells use `text-slate-400`.
    *   **Color Coding (Option 2a Default - Sky Variant):**
        *   **Genus:** Orange (Warm start).
        *   **Species:** Sky (Blue anchor).
        *   **Infraspecies:** Cyan (Cool refinement).
        *   **Cultivar:** Violet (End of spectrum).
        *   **Hybrids:** Use CSS filter `saturate-50` to make the row "grayer"/muted while keeping the same lightness (`-50` bg).
*   **Advanced Features:**
    *   **Locked Columns:** The Utility columns (Tree, Actions, #, GH, SH, I-Rank) must have `lockWidth: true`. They must **NOT** resize when using "Auto Fit" or "Fit to Screen".
    *   **Header Icons:** Hide sort/drag icons for narrow utility columns to save space. Center-align their headers.
    *   **Fit Algorithms:**
        *   *Auto Fit:* Measure content width.
        *   *Fit to Screen:* Distribute available screen width among flexible columns. Give priority (more width) to `scientificName`. Respect "Locked" columns (do not stretch them).
*   **Tree/Flat Toggle:**
    *   In the "Tree" column header, include a button (Icon Only) to toggle between Flat View (normal table) and Tree View (groups rows by Genus -> Species -> Infraspecies).
    *   Tree View uses "Virtual" header rows for the groups.
*   **Legend:**
    *   Displays a 2-column comparison: Standard colors vs. Hybrid (Saturated/Grayer) colors.

## 5. UI: Activity & Process Panel
*   A fixed bottom-right panel to track background tasks (Mining, Imports, Enrichment).
*   **Resolution UI:** If a search finds duplicates or ambiguous results (e.g., "Did you mean...?"), the panel must show a UI to Accept/Reject/Select the correct plant without blocking the main screen.

## 6. Logic & Formatters
*   **Scientific Name Reconstruction:**
    *   Do not trust the AI's `fullName` output blindy.
    *   Reconstruct the name client-side: `Genus` + `genusHybrid` + `Species` + `speciesHybrid` + `InfraspecificRank` + `Infraspecies` + `'Cultivar'`.
    *   *Example:* "Agave" + "parryi" + "var." + "truncata" -> "Agave parryi var. truncata".
*   **Settings:**
    *   Allow user to toggle hybrid spacing: `× Mangave` (Space) vs `×Mangave` (No Space).

## 7. Visual Style
*   **Font:** Serif (`Playfair Display`) for botanical headers/names. Sans (`Inter`) for UI.
*   **Theme:** "Leaf" theme. Use `slate-50` backgrounds with `leaf-600` (emerald/green) primary actions.

---

# Technical Specifications & Implementation Details

## 1. Visual Design System (Tailwind Config)
The "Leaf" color palette is specific. Do not use generic greens.
```javascript
colors: {
  leaf: {
    50: '#f2fcf5', 100: '#e1f8e8', 200: '#c3efd2', 300: '#94e0b3',
    400: '#5cc791', 500: '#36ab76', 600: '#268a5e', 700: '#216e4e',
    800: '#1d5740', 900: '#194836',
  }
}
```
*   **Fonts:** Use `Inter` for UI text and `Playfair Display` for Headers and Scientific Names.
*   **Scrollbars:** Custom CSS to make scrollbars thin (`width: 8px`) and slate-colored (`#cbd5e1`).

## 2. Robust Gemini JSON Parsing
LLMs often output Markdown blocks (` ```json `) or trailing commas. You **MUST** implement a robust `extractJSON` helper function:
1.  Strip markdown code blocks.
2.  Use a "Bracket Counting" algorithm to find the first `{` or `[` and the matching closing `}` or `]`.
3.  Do not blindly trust `JSON.parse` on raw text.

## 3. DataGrid V2: "Virtual" Tree Logic
The Tree View in the grid is **not** just a nested list. It must be a flat table that *simulates* a tree.
*   **Grouping Algorithm:** The grid must sort data, then iterate through it to inject **Virtual Header Rows** on the fly.
*   **Virtual Row Structure:** A Virtual Row is a `Taxon` object created in memory (not saved to DB). It has a unique ID (e.g., `virtual-root/Agave`) and holds the summary data for the group (e.g., the Genus name).
*   **Recursive Counts:** The `#` (Child Count) column for a Header Row must calculate the *total recursive descendants*, not just direct children.

## 4. Name Normalization Regex
When parsing names, you must aggressively strip hybrid markers before storage to prevent `× Agave` vs `Agave` duplicates.
*   **Regex:** `/^[×x]\s?/i` (Matches "x ", "× ", "x", "×" at start of string).
*   **Logic:**
    1.  Detect the marker.
    2.  Set `genusHybrid` or `speciesHybrid` to `'×'`.
    3.  **Remove** the marker from the `name` field.
    4.  Store clean name: `Agave`.

## 5. Background Process Management
The `ActivityPanel` requires a specific state structure to handle cancellations:
*   Use a `useRef<Set<string>>` to track `cancelledActivityIds`.
*   In long-running loops (like Mining), check `cancelledActivityIds.has(currentId)` at every iteration. If true, break the loop and clean up.