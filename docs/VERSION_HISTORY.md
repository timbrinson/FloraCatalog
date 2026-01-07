# Version History

## v2.30.3 - Storage Intelligence & Versioning
**Date:** July 07, 2025
**Status:** Current Release

### Diagnostics & Maintenance
- **Database Storage Audit:** Created `scripts/database_audit.sql.txt` containing advanced queries for table and index size analysis. This allows administrators to monitor the 500MB Supabase free-tier limit with precision.
- **Backlog Grooming:** Moved Index Optimization tasks to the Archive following verified performance improvements.

## v2.30.2 - Filter Resilience & V8.1 Baseline
**Date:** July 06, 2025
**Status:** (Historical)

### Performance & Stability
- **PostgREST Injection Fix:** Hardened `dataService.ts` to strictly quote string literals in `or()` and `in()` filters. This resolves 500 "No apikey found" errors caused by multi-word values (e.g., 'Artificial Hybrid') mangling the request URL structure.
- **V8.1 Performance Overhaul:** Formally transitioned to sort-inclusive composite indexes. Reclaimed ~100MB of storage by removing redundant/shadowed indexes confirmed by size audit.
- **Sparse Rank Optimization:** Resolved 4s timeouts on sparse ranks (Form, f.) by providing pre-sorted data to the database planner, reducing latency to <1s.

## v2.30.0 - Grid Customization & UX Polish
**Date:** July 06, 2025
**Status:** (Historical)

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