# Version History

## v2.33.7 - Bridge Resumption & Literal Sovereignty
**Date:** January 12, 2026
**Status:** Current Release

### Data Integrity & Normalization
- **Bridge Refactor:** Divided Phase 10 into three granular steps (10: Grafting, 11: Synonym Redirects, 12: Literal Flow) to allow precise resumption after session timeouts.
- **Literal Normalization Rule:** Codified the rule in `docs/DATA_MODEL.md` that child records (Genera/Species) have their `family` literal updated to match the **Accepted** family name when the original source references a synonym family. This ensures grid grouping stability.
- **Redirect Hardening:** Improved Step 11 logic to use case-insensitive status matching and explicit Source ID protection to ensure high-fidelity phylogenetic grafting.

### Infrastructure
- **Build CLI UI:** Restored the interactive step menu in `automate_build.js` for better operator visibility.
- **Diagnostic Alignment:** Synchronized the Settings Dashboard health indicators with the new 15-step build process.

## v2.31.4 - Baseline Verification & Atomic Repair
**Date:** January 11, 2026
**Status:** (Historical)

### Data Integrity & Verification
- **Population Audit:** Verified that high-volume population counts (e.g., Asteraceae: 86k, Poaceae: 60k) are accurate representations of the WCVP dataset, confirming the system's ability to handle massive direct-child navigation nodes.
- **Atomic Segmented Repair:** Finalized the `repair_data.js` utility (v1.4.8) to use single-transaction atomic updates per segment. This ensures grid counts are character-perfect mirrors of the physical database state without requiring multi-pass resets.
- **Diagnostic Expansion:** Upgraded the diagnostic toolset with Query 18 to facilitate live mismatched count audits.

### Infrastructure
- **Version Sync:** Synchronized application version across manifest, components, and documentation.

## v2.31.3 - API Resilience & Dynamic UX
**Date:** July 09, 2025
**Status:** (Historical)

### Resilience & Optimization
- **500 Error Resolution:** Fixed a high-severity bug where multi-word status filters (e.g., 'Artificial Hybrid') caused 500 "No API key found" errors. Hardened `dataService.ts` to strictly quote PostgREST string literals in `or()` and `in()` request segments.
- **Baseline Load Optimization:** Replaced expensive record scans with a hardcoded estimation (1.44M rows) for the "No Filter" baseline state, significantly reducing hardware strain and preventing "Statement Timeout" errors on fresh app loads.
- **Filter Sanitization:** Removed the unsolicited 'Generated' status from all UI dropdowns and documentation to maintain a clean taxonomic extension layer.

### UX Improvements
- **Context-Aware Expansion:** Refactored Level buttons (1, 2, 3...) to calculate their range dynamically based on active grouping. The grid now correctly offers 4 levels when 'Family' is hidden and 5 levels when visible, resolving the "Empty Level" UI bug.
- **Hierarchy Integrity:** Refined virtual row identification to ensure logical consistency between UI buckets and the relational `parent_id` state.

## v2.31.2 - Logic Sequence Correction
**Date:** July 08, 2025
**Status:** (Historical)

### Build Pipeline Hardening
- **Sequence Refactor:** Re-ordered the `automate_build.js` pipeline to ensure specific scientific linking (Species → Genus) occurs **before** the generic Family grafting. This prevents a logic bug where species would incorrectly link directly to families, bypassing their genera.
- **Index Priority:** Moved "Build-Indexes" to Step 5 (immediately after Population). This ensures that the primary linking (Step 6) and fallthrough grafting (Step 7) have full index support, mitigating "Upstream Timeout" errors during massive table joins.

## v2.31.0 - Authority Standardization & Expansion Fix
**Date:** July 08, 2025
**Status:** (Historical)

### Architectural Consolidation
- **Legacy Mode Removal:** Permanently deleted the "Legacy (String)" data engine. The application now operates exclusively on the **Authority-Based (ID) Hierarchy (ADR-006)**, ensuring consistent bucketing even when metadata is missing in child records.
- **Settings UI Cleanup:** Removed the "Data Engine" toggle and strategy configuration from the Settings panel to simplify the user experience and reduce technical debt.
- **Authority-Aware Expansion:** Refactored the `expandTreeLevel` logic in `DataGrid.tsx` to utilize `getTargetIdForRank`. This ensures that the expansion "Path Keys" (using UUID segments) align character-for-character with the rendering engine's bucket IDs, restoring the functionality of the 1, 2, 3, and 4 level collapse buttons.

### Bug Fixes
- **Tree Key Alignment:** Resolved the "Key Mismatch" bug where Level buttons failed to collapse nodes because they were looking for string labels instead of Authority UUIDs.

## v2.30.5 - Baseline Stabilization & Cleanup
**Date:** July 07, 2025
**Status:** (Historical)

### Administrative & Cleanup
- **Zombie Script Hygiene:** Removed legacy performance scripts documented as obsolete in v2.30.2.
- **Backlog Management:** Archived the "Index Cleanup" task series following verified stability of the V8.1 Performance Baseline.
- **Documentation Alignment:** Verified data mapping and filter strategy documents remain consistent with current V8.1 logic.

## v2.30.3 - Storage Intelligence & Versioning
**Date:** July 07, 2025
**Status:** (Historical)

### Diagnostics & Maintenance
- **Database Storage Audit:** Created `scripts/database_audit.sql.txt` containing advanced queries for table and index size analysis. This allows administrators to monitor the 500MB Supabase free-tier limit with precision.
- **Backlog Grooming:** Moved Index Optimization tasks to the Archive following verified performance improvements.

## v2.30.2 - Filter Resilience & V8.1 Baseline
**Date:** July 06, 2025
**Status:** (Historical)

### Performance & Stability
- **PostgREST Injection Fix:** Hardened `dataService.ts` to strictly quote string literals in `or()` and `in()` filters. This resolves 500 "No apikey found" errors caused by multi-word values (e.g., 'Artificial Hybrid') mangling the request URL structure.
- **V8.1 Performance Overhaul:** Formally transitioned to sort-inclusive composite indexes. Reclaimed ~100MB of storage by removing redundant/shadowed indexes confirmed by size audit.
- **Sparse Rank Optimization:** Resolved 4s timeouts on sparse ranks (Form, f.) by providing pre-sorted data to the database planner, reducing latency to less than 1s.

## v2.30.0 - Grid Customization & UX Polish
**Date:** July 06, 2025
**Status:** (Historical)

### UX & Aesthetic Refinement
- **Granular Grid Pallet:** Replaced static color themes with a dynamic configuration engine in Settings. Users can now define Tailwind colors and specific weights (Cell BG, Text, Badge BG, and Badge Border) for all five taxonomic ranks.
- **Status Value De-emphasis:** Changed Status column rendering from badges to subtle, regular-weight text to reduce visual clutter.
- **Rank Badge Polish:** Switched Rank badges to use normal font weight while preserving the badge structure.
- **Compact Column Picker:** Redesigned the Column Selector UI using a gap-free CSS multi-column layout for higher information density.
- **Reordered Settings:** Relocated the Grid Customization section to be positioned logically right above the Maintenance area.

## v2.29.0 - Persistence & Performance
**Date:** July 05, 2025
**Status:** (Historical)

### Persistence & Performance
- **Evolution Cleanup:** Removed intrusive debug logs and consolidated initialization logic in `App.tsx`.
- **Architectural Baselining:** Added ADR-007 to document the startup synchronization guard. Updated design specs to reflect hybrid authority grouping.
- **Stable State:** Baselined the "Zero-Flicker" effort. While some frame latency remains, the component lifecycle is now robust enough to prevent "System Default" data fetches.