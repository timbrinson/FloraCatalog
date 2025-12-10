
# Version History

## v2.3 - Cleanup & Docs
**Date:** May 30, 2025

### Changes
- **Cleanup:** Removed deprecated `components/DataGrid.tsx` logic from the main application. The app now exclusively uses the `DataGridV2` implementation (Tree Grid).
- **Documentation:** Moved `DESIGN_SPECS.md` and `VERSION_HISTORY.md` to the `docs/` folder to separate metadata from source code.
- **Maintenance:** Removed the deprecated `stable` and `stable2` snapshot folders.

## v2.2 - Cleanup of Legacy DataGrid
**Date:** May 30, 2025

### Changes
- **Cleanup:** Removed the deprecated `DataGrid` (V1) component and its associated selector logic from `App.tsx`.
- **Simplification:** The application now exclusively uses `DataGridV2` (the advanced Tree Grid).

## v2.1.2 - Codebase Cleanup
**Date:** May 30, 2025

### Changes
- **Cleanup:** Removed deprecated `stable` and `stable2` snapshot directories to reduce project noise.
- **Maintenance:** The project now relies on `DESIGN_SPECS.md` and Git history for version tracking instead of duplicated folders.

## v2.1.1 - Documentation & Specs
**Date:** May 30, 2025

### Changes
- **Documentation:** Added `DESIGN_SPECS.md` to the project root. This file contains the "Prompt Context" and technical specifications needed to replicate or understand the codebase. It serves as a "living document" for the AI assistant.

## v2.1 - Cost Optimization & UI Polish
**Date:** May 30, 2025

### Key Changes
- **Cost Reduction:**
  - **Removed Google Search Grounding:** Switched identifying and mining operations to rely solely on the model's internal knowledge base to eliminate high tool-use costs.
  - **Optimized Mining:** Disabled grounding explicitly during bulk scanning operations.
- **DataGridV2 Improvements:**
  - **Column Locking:** Added `lockWidth` support to prevent narrow utility columns (Tree, #, GH, SH) from expanding during auto-fit or window resizing.
  - **Tree Toggle:** Moved the Tree/Flat view switcher directly into the Tree column header and replaced it with a cleaner icon-only button.
  - **Visuals:** Center-aligned utility headers and hid unnecessary sort icons for cleaner density.
  - **Sizing Logic:** Updated `Fit to Screen` algorithm to respect locked columns and prioritize Scientific Name width.
- **Bug Fixes:**
  - **Scientific Name Reconstruction:** Fixed logic where the AI model returned partial names. The app now manually reconstructs the full `scientificName` (e.g., "Agave parryi var. truncata") using the hierarchy chain.
  - **Hybrid Markers:** Ensured `×` markers are correctly inserted for Genus and Species hybrids during name generation.
  - **Infraspecies Data:** Prevented rank prefixes (e.g., "var.") from being duplicated inside the `infraspecies` name field.

## v2.0 - Advanced Tree Grid & Search
**Date:** May 29, 2025

### Major Enhancements
- **Tree Grid (DataGridV2):**
  - **Recursive Multi-Level Grouping:** Group by Family -> Genus -> Species -> Infraspecies dynamically.
  - **Ragged Hierarchy Support:** Automatically collapses empty intermediate levels (e.g. Cultivar directly under Genus).
  - **Unified Rendering:** Group headers are now fully functional data rows with action buttons and correct styling.
  - **Visual Hierarchy:** Rank-based background colors, bolding of relevant rank columns, and dimming of ancestor columns.
- **Advanced Search & Mining:**
  - **Hybrid Handling:** Strict separation of Rank vs Hybrid Status. Logic to infer hidden hybrids (`Lycoris rosea` -> `Lycoris × rosea`).
  - **Hallucination Filters:** Client-side validation to ensure mining results match the parent genus.
  - **Search Resolution Flow:** UI to handle Duplicates, Ambiguities, and Name Corrections before adding.
- **Process Management:**
  - **Activity Panel:** Tracking multiple concurrent background tasks (Mining, Import, Enrichment).
  - **Cancellation:** Ability to stop long-running mining operations.
- **Data Integrity:**
  - **Infraspecies Propagation:** Correctly inherits variety/subspecies names down to cultivars during import.
  - **WCVP Schema:** Full support for WCVP columns including IDs, Authorship, and Geography.

### File Checkpoints (Deprecated)
- *Note: Snapshot folders `stable` and `stable2` were removed in v2.1.2.*

## v1.0 - Stable Prototype
**Date:** May 29, 2025

### Core Features
- **Hierarchical Data Structure:** Recursive `Taxon` model supporting Genus -> Species -> Subspecies -> Cultivar.
- **AI Integration:** 
  - `identifyTaxonomy`: Parses natural language into structured botanical data.
  - `enrichTaxon`: Fetches descriptions, synonyms, and reference links.
  - `deepScanTaxon`: Systematically mines cultivars by iterating through alphabet buckets (A-C, D-F, etc.).
- **Data Grid:** 
  - High-performance table view.
  - Multi-column filtering and sorting.
  - "Fit to Screen" and "Auto Fit" smart sizing logic.
  - Drag-and-drop column reordering.
- **Hybrid Logic:** 
  - Strict separation of `Rank` (Genus/Species) vs `HybridStatus` (x/×).
  - Normalization logic to strip prefixes and prevent duplicates.
  - Configurable spacing preference (e.g. `× Mangave` vs `×Mangave`).
- **Process Management:**
  - `ProcessMonitor` UI to track background jobs.
  - Cancellation support for long-running mining tasks.
  - Consolidated status for batch enrichment.

### Known Issues
- File system updates in the code assistant sometimes timeout on large files.
- Mining prompts occasionally hallucinate cross-genus results (Mitigated with client-side filtering).
