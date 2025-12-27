# Version History

## v2.19.1 - Stability & Data Integrity Fixes
**Date:** June 12, 2025
**Status:** (Ready for Push)

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
