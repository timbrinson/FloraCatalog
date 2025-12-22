# Version History

## v2.17.0 - UI Visibility & Data Normalization
**Date:** June 4, 2025

### New Features
- **Enhanced Record Visibility:** The record count in the Data Grid now explicitly shows the number of records loaded in the browser versus the total matching the filter (e.g., "100 of 1,440,076 records loaded"). This clarifies why the scrollbar might shift during infinite loading.
- **Lifeform Vocabulary Standard:** Updated the `Lifeform Description` filter with a comprehensive, official botanical terminology list derived from WCVPRaunkiær modified system.

### Bug Fixes
- **Unicode Safety:** Replaced literal special botanical characters (×, è, etc.) in the codebase with Unicode escape sequences (`\u00D7`, `\u00E8`). This prevents "Invalid or unexpected token" errors in environments with strict or non-UTF-8 character handling.
- **Filter Cleanup:** Removed the erroneous 'privacy' tag from the lifeform selection list.

## v2.16.0 - UX Stability & Tree Logic Overhaul
**Date:** June 3, 2025

### Improvements
- **Grid Persistence:** Fixed a bug where the DataGrid would unmount and lose filter input focus when a search returned no results.
- **Holistic Tree Walk:** Re-engineered the `expandTreeLevel` logic in `DataGrid.tsx`. It now performs a virtual walk of the entire loaded dataset to identify hidden taxonomic paths.
- **Dynamic Level Buttons:** Numeric expansion buttons now automatically adjust based on whether the "Family" column is visible.

## v2.15.0 - UI Filter Enhancements & Data Integrity
**Date:** June 1, 2025

### New Features
- **Smart Filtering:** Upgraded the Data Grid filters for `Infraspecific Rank`, `Climate Description`, `Lifeform`, and `Reviewed` status to multi-select dropdowns.
- **High-Cardinality Search:** Optimized geographic filtering using text-based prefix matching.

### Bug Fixes & Refinements
- **Data Mapping:** Fixed critical property mapping bugs in `dataService.ts` where database snake_case names were not correctly mapped to CamelCase interface properties.
