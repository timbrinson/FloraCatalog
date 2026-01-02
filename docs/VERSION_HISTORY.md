# Version History

## v2.26.1 - Stability Restoration
**Date:** June 24, 2025
**Status:** (Current Release)

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
- **Segmented Automation:** Enhanced `automate_build.js` with target range filtering. This allows developers to recover specific missing alphabetical batches (like T-Z) without re-running the entire 1.4M row pipeline.
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

[... Rest of file preserved exactly as provided ...]