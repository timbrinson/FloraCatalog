# Version History

## v2.1 - Cost Optimization & UI Polish (Current)
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

### File Checkpoints (in `/stable2`)
- `App.tsx`: Main logic with view persistence and search integration.
- `components/DataGridV2.tsx`: The new tree-grid component.
- `components/ActivityPanel.tsx`: The process monitor and resolution UI.
- `services/geminiService.ts`: AI logic with robust JSON parsing.
- `types.ts`: Extended Taxon interface.
- `utils/formatters.ts`: Scientific name formatting rules.

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

### File Checkpoints (in `/stable`)
- `App.tsx`: Main logic, state management, view routing.
- `types.ts`: TypeScript interfaces for Taxon, UserPreferences.
- `services/geminiService.ts`: AI prompt engineering and JSON extraction.
- `components/DataGrid.tsx`: Complex spreadsheet component.
- `utils/formatters.ts`: Scientific name formatting logic.

### Known Issues
- File system updates in the code assistant sometimes timeout on large files.
- Mining prompts occasionally hallucinate cross-genus results (Mitigated with client-side filtering).
