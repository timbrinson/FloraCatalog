# Version History

## v2.26.2 - Family Persistence Fix
**Date:** June 23, 2025
**Status:** (Current Release)

### Core Logic Fixes
- **Data Integrity:** Resolved a critical bug where the `family` field was not being saved for new manual plant additions. This caused tree grouping fragmentation in the UI.
- **Stable Grouping:** Refined `DataGrid.tsx` to handle `null` or missing family fields gracefully, grouping them under "Unspecified" rather than creating orphaned virtual roots.

## v2.26.1 - Tree Hierarchy Refinement
**Date:** June 22, 2025
**Status:** (Baseline)

### Nomenclature & Hybrid Intelligence
- **Hybrid Symbol Persistence:** Fixed a bug where cultivars of hybrids would lose their botanical markers (`×`) during the validation pipeline.
- **Synonym Redirect UI:** Implemented high-visibility warnings in `AddPlantModal` when matched names are synonyms, displaying the preferred Accepted name for user redirection.

## v2.26.0 - Global Gap Closure
**Date:** June 22, 2025

### Tooling Improvements
- **Segmented Automation:** Enhanced `automate_build.js` with "False Root Recovery" logic. This allows developers to recover specific missing alphabetical batches (like T-Z) and re-integrate them into the global tree.

[... Rest of file preserved exactly as provided ...]