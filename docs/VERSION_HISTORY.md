# Version History

## v2.18.0 - Protocol & Type Simplification
**Date:** June 5, 2025

### Improvements
- **AI Development Protocol:** Formalized the "Communication and Transparency" rules. I will now provide a plan before coding and justify changes per file.
- **Type Architecture:** Removed `TaxonRank` and `TaxonomicStatus` type aliases in favor of native `string` types. This reduces complexity while maintaining flexibility for various classification systems.
- **Botanical Literals:** Explicitly standardized on literal characters (e.g., `×`, `è`, `æ`) over Unicode escape sequences. This prioritizes human legibility and developer experience in modern UTF-8 environments.

### Bug Fixes
- **Grid Stability:** Fixed a `ReferenceError` in the Data Grid column ordering logic.
- **Icon Consistency:** Resolved an issue where `ChevronDown` was incorrectly referenced instead of the alias `ChevronDownIcon`.

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
