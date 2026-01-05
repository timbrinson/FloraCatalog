# Version History

## v2.28.0 - Configuration Persistence & Visual Refinement
**Date:** July 05, 2025
**Status:** Current Release

### Persistence & Performance
- **Manual Configuration Sync:** Integrated a cloud-save UI in the Settings panel, allowing users to persist their custom grid layouts (ordering, widths, visibility) and filters to the database.
- **Improved Settings Watcher:** Refined the background synchronization logic to better handle initial connection lag with Supabase.
- **Reload Audit Trail:** Added explicit console logging for the "Reload Settings" action to improve diagnostic visibility during manual state resets.

### UX & Visual Design
- **Status Badge Re-Design:** Standardized status badges to be rank-agnostic. 
    - `Accepted`, `Registered`, `Hybrid`: High-contrast Black on White.
    - `Provisional`: Dark Gray on White.
    - Others: Subtle Gray on Gray.
- **System Column Cleanup:** Removed right-hand borders from the `Tree` and `#` (Count) columns to create a more unified "System" grouping.
- **Simplified Legend:** Grouped all infraspecific ranks into a single category for better UI balance.

## v2.27.4 - UI Consistency Refinement
**Date:** July 04, 2025
**Status:** (Historical)

### UX & Visual Design
- **Rank Color Consistency:** Standardized Rank-based highlight colors across data rows and virtual rows using 500-weight theme colors. This lightens the Genus and Cultivar ranks to reduce visual harshness.
- **Placeholder Legibility:** Significantly improved visibility of `(none)` placeholders in parent columns by matching the `text-slate-400` and `80% opacity` style of the virtual Plant Name column.
- **Badge Styling:** Updated Rank badge text to 500 weight to improve readability and visual hierarchy balance.

## v2.27.3 - UI State Persistence
**Date:** July 04, 2025
**Status:** (Historical)

### Features & Persistence
- **Global Settings Persistence:** Implemented the `app_settings_global` table to store column visibility, ordering, widths, and user preferences across sessions.
- **Column Reordering:** Optimized nomenclature grouping by placing Hybrid indicators (GH/SH) before Genus and Species designations.
- **Legend Restoration:** Restored and enhanced the taxonomic rank color legend.
