# Version History

## v2.30.0 - Grid Customization & UX Polish
**Date:** July 06, 2025
**Status:** Current Release

### UX & Aesthetic Refinement
- **Granular Grid Pallet:** Replaced static color themes with a dynamic configuration engine in Settings. Users can now define Tailwind colors and specific weights (Cell BG, Text, Badge, Border) for all five taxonomic ranks.
- **Status Value De-emphasis:** Changed Status column rendering from badges to subtle, regular-weight text to reduce visual clutter.
- **Rank Badge Polish:** Switched Rank badges to use normal font weight while preserving the badge structure.
- **Compact Column Picker:** Redesigned the Column Selector UI using a gap-free CSS multi-column layout for higher information density.
- **Reordered Settings:** Relocated the Grid Customization section to be positioned logically right above the Maintenance area.

## v2.29.0 - Stability Baseline & Evolution Cleanup
**Date:** July 05, 2025
**Status:** (Historical)

### Persistence & Performance
- **Evolution Cleanup:** Removed intrusive debug logs and consolidated initialization logic in `App.tsx`.
- **Architectural Baselining:** Added ADR-007 to document the startup synchronization guard. Updated design specs to reflect hybrid authority grouping.
- **Stable State:** Baselined the "Zero-Flicker" effort. While some frame latency remains, the component lifecycle is now robust enough to prevent "System Default" data fetches.

## v2.28.3 - Absolute Zero-Flicker Mounting
**Date:** July 05, 2025
**Status:** (Historical)

### Persistence & Performance
- **Zero-Flicker Grid Mount:** Redesigned the mounting lifecycle to ensure `DataGrid` remains unmounted until saved settings are definitively retrieved from the database. 
- **Boot Sequence Hardened:** `App.init` now explicitly creates a "Ready" configuration object before signaling the UI to render.

## v2.28.2 - Startup Synchronization Finalized
**Date:** July 05, 2025
**Status:** (Historical)