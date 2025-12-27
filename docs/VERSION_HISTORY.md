# Version History

## v2.18.4 - UX Stability Fix (Grid Flash)
**Date:** June 9, 2025
**Status:** (Awaiting User Verification)

### Improvements
- **Grid Persistence Overhaul:** Resolved the "Stop Grid Flash" issue by introducing an `isInitialized` state in `App.tsx`. The `DataGrid` now remains mounted during transitions between result states (including zero-result filtered states), ensuring focus is maintained and UI state (like scroll position and open filter dropdowns) is preserved.
- **Header Loading Indicator:** Integrated the background fetch state into the grid status bar so that refreshes provide visual feedback without unmounting the table.

## v2.18.3 - Lifeform Filter Correction
**Date:** June 8, 2025

### Bug Fixes
- **Lifeform Filter Reversion:** Corrected the `lifeformDescription` filter in the Data Grid, reverting it from a multi-select back to text search. This restores visibility for records with complex, multi-term Raunkiær descriptions which were previously hidden by exact-match logic.
- **Documentation Sync:** Updated `DATA_MAPPING.md` and `FILTER_STRATEGIES.md` to reflect the text-search strategy for lifeforms.

## v2.18.2 - Data Mapping Sync & Filter Restoration
**Date:** June 7, 2025

### Improvements
- **Data Mapping Synchronization:** Updated `docs/DATA_MAPPING.md` to strictly match the latest WCVP CSV configuration, including updated labels and tooltips for Nomenclature and Publication groups.
- **Lifeform Filter Restoration:** Re-enabled `lifeformDescription` as a `Multi-select` filter in the Data Grid.
- **Filter Strategies Update:** Added comprehensive documentation for Lifeform Description values in `docs/FILTER_STRATEGIES.md`.
- **UI Label Alignment:** Updated grid header labels to "Plant Name" and tooltips to "Scientific Name" per the updated mapping.

## v2.18.1 - Filter Standardization & UI Alignment
**Date:** June 6, 2025

### Improvements
- **Filter Value Standardization:** Updated all multi-select filters (`taxonRank`, `taxonStatus`, `infraspecificRank`, `climateDescription`) to strictly match database literals defined in `docs/FILTER_STRATEGIES.md`.
- **UI Casing Alignment:** Removed global uppercase transformations from the Data Grid. Ranks and Statuses now render with their natural database capitalization (e.g., "Genus", "Accepted").
- **CSS Inheritance Fix:** Applied `normal-case` to filter components to prevent them from inheriting `thead` uppercase styles, ensuring database literals are displayed accurately.
- **Descriptive Filter Reversion:** Reverted `lifeformDescription` from a multi-select to a standard text filter to better handle complex Raunkiær strings until a more robust 'LIKE' based multi-select index is implemented.

### Documentation
- **Filter Strategies:** Comprehensive update to `docs/FILTER_STRATEGIES.md` documenting every valid value for core filters and technical rules for casing.

## v2.18.0 - Protocol & Type Simplification
**Date:** June 5, 2025

### Improvements
- **AI Development Protocol:** Formalized the "Communication and Transparency" rules. I will now provide a plan before coding and justify changes per file.
- **Type Architecture:** Removed `TaxonRank` and `TaxonomicStatus` type aliases in favor of native `string` types. This reduces complexity while maintaining flexibility for various classification systems.
- **Botanical Literals:** Explicitly standardized on literal characters (e.g., `×`, `è`, `æ`) over Unicode escape sequences. This prioritizes human legibility and developer experience in modern UTF-8 environments.

### Documentation
- **Filter Strategies:** Comprehensive update to `docs/FILTER_STRATEGIES.md` documenting every valid value for core filters and technical rules for casing.

## v2.17.0 - UI Visibility & Data Normalization
**Date:** June 4, 2025

### New Features
- **Enhanced Record Visibility:** The record count in the Data Grid now explicitly shows the number of records loaded in the browser versus the total matching the filter (e.g., "100 of 1,440,076 records loaded"). 
- **Lifeform Vocabulary Standard:** Updated the `Lifeform Description` filter with a comprehensive, official botanical terminology list derived from WCVP/Raunkiær modified system.

### Bug Fixes
- **Filter Cleanup:** Removed the erroneous 'privacy' tag from the lifeform selection list.

## v2.16.0 - UX Stability & Tree Logic Overhaul
**Date:** June 3, 2025

### Improvements
- **Grid Persistence:** Fixed a bug where the DataGrid would unmount and lose filter input focus when a search returned no results.
- **Holistic Tree Walk:** Re-engineered the `expandTreeLevel` logic in `DataGrid.tsx`. It now performs a virtual walk of the entire loaded dataset to identify hidden taxonomic paths.
- **Dynamic Level Buttons:** Numeric expansion buttons now automatically adjust based on whether the "Family" column is visible.