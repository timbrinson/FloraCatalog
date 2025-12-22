# Version History

## v2.17.0 - UI Visibility & Data Normalization
**Date:** June 4, 2025

### New Features
- **Enhanced Record Visibility:** The record count in the Data Grid now supports a "Loaded vs. Total" display format (e.g., "100 of 1,440,076 records loaded"). This improves UX by explaining scrollbar jumps during infinite loading.
- **Lifeform Vocabulary Standard:** Updated the application's reference terminology for plant lifeforms to align with the Kew Gardens / Raunkiær modified system.

### Bug Fixes
- **Unicode Resilience:** Transitioned special botanical characters (×, è, etc.) to Unicode escape sequences to ensure cross-environment compatibility.
- **Filter Hygiene:** Removed non-botanical metadata tags from the taxonomic filter dropdowns.

## v2.16.0 - UX Stability & Tree Logic Overhaul
**Date:** June 3, 2025

### Improvements
- **Grid Persistence:** Fixed a bug where the DataGrid would unmount and lose filter input focus when a search returned no results.
- **Holistic Tree Walk:** Re-engineered the `expandTreeLevel` logic to perform a virtual walk of the dataset, ensuring level buttons work reliably regardless of previous collapse states.
- **Dynamic Level Buttons:** Numeric expansion buttons now automatically adjust based on "Family" column visibility.

## v2.15.0 - UI Filter Enhancements & Data Integrity
**Date:** June 1, 2025

### New Features
- **Smart Filtering:** Upgraded grid filters for `Rank`, `Status`, `Climate`, and `Lifeform` to multi-select dropdowns.
- **High-Cardinality Search:** Optimized geographic filtering using text-based prefix matching.

### Bug Fixes
- **Data Mapping:** Fixed critical property mapping bugs in the data service where snake_case database fields were not correctly hydrating camelCase interface properties.
