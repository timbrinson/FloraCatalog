
# FloraCatalog

**A Smart Botanical Database & Cataloging System**

FloraCatalog is a high-performance web application designed to manage complex botanical taxonomy. It combines the rigorous scientific standards of the World Checklist of Vascular Plants (WCVP) with the flexibility of AI-powered enrichment for cultivars and garden hybrids.

![Version](https://img.shields.io/badge/version-2.11.1-emerald)
![Tech](https://img.shields.io/badge/stack-React%20%7C%20Supabase%20%7C%20Gemini%20AI-blue)

## Key Features

*   **Advanced Data Grid:** A high-density "Tree Grid" that handles hierarchical data (Genus -> Species -> Cultivar) with infinite scrolling and virtual grouping.
*   **AI Integration (Gemini 2.5):** 
    *   Parses natural language plant names (e.g., "Agave parryi var. truncata") into structured taxonomic records.
    *   Standardizes hybrid markers (`×` vs `x`).
    *   Mines generic lists for registered cultivars.
*   **WCVP Schema Alignment:** Strictly adheres to the Kew Gardens WCVP data model for scientific accuracy.
*   **Data Lineage:** Tracks the source of every record (e.g., "WCVP v14" vs "Gemini AI") to maintain data integrity.
*   **Offline / Online Mode:** Dynamically connects to a Supabase backend or runs in a read-only offline mode if credentials are missing.

## Documentation

*   [**Setup Guide**](./docs/SETUP_GUIDE.md): How to configure Supabase and API keys.
*   [**Data Import Guide**](./docs/DATA_IMPORT_GUIDE.md): How to load the 1.4 million record WCVP dataset.
*   [**Design Specs**](./docs/DESIGN_SPECS.md): Detailed architectural decisions and prompt context.
*   [**Data Model**](./docs/DATA_MODEL.md): Database schema and lineage strategy.

## Quick Start

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run Locally:**
    ```bash
    npm run dev
    ```

3.  **Connect Database:**
    *   Click the **Settings (Gear Icon)** in the top right.
    *   Enter your Supabase URL and Anon Key.
    *   Click "Save & Connect".

## License

Private / Proprietary.
