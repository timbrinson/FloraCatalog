# Version History

## v2.25.1 - Gap Recovery Logic
**Date:** June 22, 2025
**Status:** (Current Release)

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