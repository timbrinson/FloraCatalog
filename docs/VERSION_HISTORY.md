# Version History

## v2.27.2 - Governance & Protocol Cleanup
**Date:** July 03, 2025
**Status:** Current Release

### Project Governance
- **Evolution Cleanup Rule:** Codified Section 13 in `AI_DEVELOPMENT_PROTOCOL.md`. The system now proactively reminds the human architect to clean up extraneous code and sync documentation after complex evolution cycles.
- **Maintenance Baseline:** Established a "Clean Slate" standard for moving between major feature tasks.

## v2.27.1 - Family Hierarchy Fix
**Date:** July 02, 2025
**Status:** (Historical)

### Hierarchical Integrity (ADR-006 Extension)
- **Literal-ID Hybrid Grouping:** Implemented a specialized resolver for the Family rank. While Genus and below use UUID-based bucketing, Families now use string-literal bucketing (e.g., "Amaryllidaceae") to account for the lack of physical Family records in WCVP.
- **Ancestral Family Recovery:** Implemented a recursive "climb" for records missing family metadata. If a record has a null family, the engine traverses its `parent_id` chain to the parent Genus and inherits the family name from the authority record.
- **Virtual Header Resolution:** Fixed label resolution for Family-level virtual headers, ensuring they display the literal family name instead of non-existent UUIDs.
- **Fixed Fragmentation:** Resolved the "Double Family" bug where cultivars like 'Back in Black' would split into a separate `(none)` tree. They are now correctly consolidated under their physical lineage.

## v2.27.0 - Authority-Based Grouping
**Date:** July 01, 2025
**Status:** (Historical Milestone)

### Hierarchical Sovereignty (ADR-006)
- **ID-Based Bucketing:** Abandoned string-based grouping (e.g. `row.family`) in favor of `hierarchy_path` ID segments. This resolves the "Double Family" bug where records with null metadata split from their lineage.
- **Authority Registry:** Implemented a resolution layer that finds the "Best Metadata Record" for every ID in the pool to ensure consistent labeling of ID-based buckets.
- **Lineage Anchoring:** Child records now strictly follow the bucketing established by their parent IDs, ensuring data errors in result sets (like missing names) do not break hierarchical findability.

## v2.26.2 - Lineage Hydration & Grouping Fix
**Date:** June 25, 2025
**Status:** (Historical)

### Hierarchical Integrity
- **Recursive Ancestor Hydration:** Implemented Stage 2 of the "Replace Virtuals" rule. When filtering for children, the system now identifies missing parent IDs and recursively fetches the real records from the database, preventing ghost virtual rows.
- **Tree Bucketing Fix:** Resolved a grouping bug where the "Rank Guard" logic prematurely forced parents into the (none) bucket. Real ancestors are now correctly promoted to group headers.
- **Hierarchy Awareness:** Enhanced the promotion engine to scan the global hydrated pool instead of just the immediate filtered result set.

## v2.26.1 - Stability Restoration
**Date:** June 24, 2025
**Status:** (Historical)

### Stability & UX
- **Stability Restoration:** Reverted DataGrid grouping logic to a known stable state following internal errors and UI regressions. 
- **Version Synchronization:** Aligned version strings across `package.json`, `AddPlantModal.tsx`, `automate_build.js`, and documentation for GitHub deployment.
- **GitHub Baseline:** Established a verified stable state for repository checkpointing.

## v2.26.0 - Hybrid Intelligence Integration
**Date:** June 23, 2025
**Status:** (Historical)

### Nomenclature & Hybrid Intelligence
- **Hybrid Validation Pipeline:** Implemented Phase 1 of ADR-005 in `AddPlantModal`. System now handles AI taxonomic parsing, algorithmic assembly, automatic parent-UUID binding, and synonym redirection logic.
- **Nomenclature Discovery:** Added automated parent-binding and synonym redirection metadata during plant entry.
- **Performance:** Optimized taxonomic parsing using Gemini 3 Flash.

## v2.25.1 - Gap Recovery Logic
**Date:** June 22, 2025
**Status:** (Historical)

### Tooling Improvements
- **Segmented Automation:** Enhanced `automate_build.js` with target range filtering. This allows developers to recover specific missing alphabetical batches without re-running the entire 1.4M row pipeline.
- **Iterative Ltree Refinement:** Optimized Step 7 of the build process to run iterative updates per segment, reducing Postgres memory pressure during large hierarchical builds.

### Nomenclature & Hybrid Intelligence
- **Hybrid Symbol Persistence:** Fixed a bug where cultivars of hybrids would lose their botanical markers (`×`) during the validation pipeline.
- **Synonym Redirect UI:** Implemented high-visibility warnings in `AddPlantModal` when matched names are synonyms, displaying the preferred Accepted name for user redirection.

## v2.25.0 - Hybrid Intelligence Framework
**Date:** June 21, 2025
**Status:** (Baseline)

### Architectural Shift (ADR-005)
- **Deterministic Sovereignty:** Codified the principle that botanical standards (ICN/ICNCP) must be implemented via algorithms, not AI.
- **AI as Ambiguity Bridge:** Officially restricted AI usage to natural language translation and messy data extraction at the system boundaries.
- **Scalability Optimization:** Prioritized client-side browser logic over server-side API calls to reduce latency and eliminate "LLM Tax."

### Documentation & Alignment
- **Governance Audit:** Synchronized `README.md` and `DOCUMENTATION_STRATEGY.md` with the new computational principles.
- **Version Alignment:** Synchronized version strings across `package.json`, `AddPlantModal.tsx`, and all documentation files.