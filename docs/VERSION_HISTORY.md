# Version History

## v2.22.0 - Add Plant Control Suite
**Date:** June 18, 2025
**Status:** (Ready for Verification)

### New Features
- **AI-Assisted Add Modal:** Introduced `AddPlantModal.tsx` which allows users to add new plants using natural language.
  - **Parsing Engine:** Utilizes Gemini 3 Pro to decompose complex botanical names into hierarchical records (Genus, Species, Cultivar).
  - **Lineage Preview:** Provides a visual "Dry Run" of the hierarchy before database commitment.
  - **Bulk Upload UI:** Added a foundation for bulk file/text list imports.
- **Header Actions:** Added a high-visibility "Add Plant" button to the main navigation header.

## v2.21.3 - Split Maintenance Control
**Date:** June 17, 2025
**Status:** (Verified)

### New Features
- **Granular Maintenance Utility:** In response to architectural needs for independent experimentation, the "Reset" tool in `SettingsModal.tsx` has been split into two distinct operations:
  - **Purge Cultivars:** Removes non-WCVP taxa (source_id != 1) while preserving the core dataset.
  - **Wipe Details:** Clears the AI-enriched horticultural Knowledge Layer (descriptions, traits, links) for ALL plants without affecting the nomenclature hierarchy.
- **Safety Dialogs:** Added dedicated confirmation states and descriptive warnings for each maintenance operation.

## v2.21.2 - Maintenance & Purge Utility
**Date:** June 16, 2025
**Status:** (Verified)

### New Features
- **Reset to Baseline Utility:** Added a high-severity maintenance tool in `SettingsModal.tsx` to purge non-WCVP plants and clear AI-mined horticultural details. This allows for clean-slate experimentation with cultivars without a full database rebuild.
- **Service Integration:** Implemented `resetToBaseline` in `dataService.ts` with cascading purge logic for `app_taxa` and `app_taxon_details`.

## v2.21.1 - UI Findability & Trait Registry Prototype
**Date:** June 15, 2025
**Status:** (Verified)

### New Features
- **Details Panel Restoration:** Fixed a state logic error in `App.tsx` and `DataGrid.tsx` that prevented row expansion and update handlers. The "Actions" column is now visible by default.
- **Specialized Trait Registry:** Introduced a dynamic trait section in `DetailsPanel.tsx` to handle taxon-specific attributes (e.g., Agave spine color) stored in JSONB blobs.

### Documentation Updates
- **Vision Realignment:** Updated `docs/VISION_STATEMENT.md` to reflect the 90% Grid / 5% Details Panel UI priority.
- **Backlog Recalibration:** Adjusted completion estimates for the Knowledge Layer (5%) and Cultivated Layer (0%) to match actual project state. Added High-Priority items for Index Expansion and 3-Tier scaling.

## v2.21.0 - Protocol Maturation & Briefing Strategy
**Date:** June 14, 2025
**Status:** (Ready for Push)

### Protocol Improvements
- **Literal Preservation Clause:** Codified Section 8 in `docs/AI_DEVELOPMENT_PROTOCOL.md`, making summarization of baseline documentation a high-severity regression.
- **Explicit Sign-Off Rule:** Added Guardrail F, prohibiting the AI from unilaterally marking tasks as "Done" or archiving items in the backlog without human verification.
- **Brevity Strategy:** Formalized Section 9 (Refactoring for Brevity) and the 3-Tiered Maintenance Strategy in `docs/DOCUMENTATION_STRATEGY.md` to balance detail fidelity with readability.

## v2.20.0 - Knowledge Layer & Roadmap Expansion
**Date:** June 13, 2025
**Status:** (Ready for Push)

### Documentation Updates
- **Vision Evolution:** Updated `docs/VISION_STATEMENT.md` to define the "Knowledge Layer," bridging the gap between scientific nomenclature (WCVP) and horticultural context (Physical Description, AKAs, History).
- **Roadmap Refinement:** Expanded `docs/TASK_BACKLOG.md` with granular requirements for the "A.K.A" section, including trademarks, patents, and reputable source quoting.
- **Data Mapping Extension:** Updated `docs/DATA_MAPPING.md` to include the schema for the "Golden Record" (`app_taxon_details`), documenting how traits like hardiness, size, and year of discovery are stored.

## v2.19.1 - Stability & Data Integrity Fixes
**Date:** June 12, 2025
**Status:** (Verified)

### Improvements
- **UX Resilience Overhaul:** Refined component mounting logic in `App.tsx` to ensure the `DataGrid` remains visible even during database errors (e.g., timeouts). This allows users to see the specific error message in the status bar while preserving their filter inputs and scroll position.
- **Error Transparency:** Removed internal error masking for PostgreSQL "57014" (Timeout) errors in `dataService.ts`, allowing the UI to accurately report backend pressure to the user.

### Bug Fixes
- **Data Mapping Correction:** Fixed a significant data integrity bug where several database columns (`common_name`, `geographic_area`, `genus_hybrid`, `species_hybrid`, and `infraspecific_rank`) were not correctly mapping to the `Taxon` interface's camelCase properties during database writes.
- **Component Crash Fix:** Resolved a critical syntax error in `App.tsx` (`size(20)` instead of `size={20}`) that caused the application to crash during state updates.
- **Icon Import Fix:** Restored the missing `Settings` icon import in the main header.

## v2.19.0 - Hybrid Search Engine & UX
**Date:** June 11, 2025
**Status:** (Verified)

### New Features
- **Search Engine Toggle:** Implemented an inline search mode switcher directly inside the "Plant Name" filter. Users can now toggle between "Prefix" (Fastest) and "Fuzzy" (Contains) search logic without opening settings.
- **Visual Engine Cues:** Added visual feedback to the search input, including icon changes (Arrow vs. AlignCenter) and color-coded focus states to indicate the active database engine.
- **Advanced Wildcard Support:** Verified and documented support for manual `%` wildcard usage in Fuzzy mode (e.g., `Ag%par` finds `Agave parryi`).

### Documentation
- **Filtering Deep Dive:** Extensively updated `docs/FILTER_STRATEGIES.md` with technical details on auto-capitalization logic, wildcard wrapping, and PostgreSQL Query Planner interactions.

## v2.18.5 - Grid Logic & Column Management
**Date:** June 10, 2025
**Status:** (Verified)

### New Features
- **Unselect All Columns:** Added a "Hide All" button to the Column Picker dropdown, allowing users to clear the grid for a fresh configuration with one click.

### Bug Fixes
- **Family Rank Consistency:** Fixed a logic error where the Genus column would incorrectly display for rows with the taxonomic rank of "Family". The Genus column is now explicitly blank for these records.
- **Virtual Rank Casing:** Standardized the casing for virtual group headers (e.g., "Family", "Genus"). These now use Title Case to match the formatting of real database records, ensuring a unified look in the "Rank" column.

## v2.18.4 - UX Stability Fix (Grid Flash)
**Date:** June 9, 2025
**Status:** (Verified)

### Improvements
- **Grid Persistence Overhaul:** Resolved the "Stop Grid Flash" issue by introducing an `isInitialized` state in `App.tsx`. The `DataGrid` now remains mounted during transitions between result states (including zero-result filtered states), ensuring focus is maintained and UI state (like scroll position and open filter dropdowns) is preserved.
- **Header Loading Indicator:** Integrated the background fetch state into the grid status bar so that refreshes provide visual feedback without unmounting the table.