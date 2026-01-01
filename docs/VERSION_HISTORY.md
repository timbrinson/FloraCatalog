# Version History

## v2.24.0 - Stability Baseline & Refactor Preparation
**Date:** June 20, 2025
**Status:** (Current Release - Stability Checkpoint)

### Improvements & Preparation
- **Project Checkpoint:** Verified "Known Good State" after a series of UX and data integrity fixes.
- **Refactor Preparation:** Documentation audited for ADR-004 (Naming Sovereignty).
- **Environment Sync:** Confirmed version strings across `package.json`, `AddPlantModal.tsx`, and documentation.
- **GitHub Checkpoint:** This version serves as the mandatory restore point prior to the removal of the camelCase translation layer.

## v2.23.0 - Mission & Vision Realignment
**Date:** June 19, 2025
**Status:** (Verified Baseline)

### Philosophy & Documentation
- **Botanical Bridge Branding:** Re-aligned the project's identity from a "standardization tool" to a **Botanical Bridge**. The focus is on anchoring garden collections to scientific standards (WCVP) and horticultural registries (ICRA).
- **Inclusive Data Perspective:** Updated documentation to reflect the multi-source nature of botanical data (Nurseries, Communities, Universities) rather than a strictly academic "checklist" mindset.
- **Shared Collection Model:** Transitioned core UI terminology from "Personal" to **"Shared"** to reflect the application's intent as a collaborative knowledge repository. Added future "Personal" and "Garden" collection needs to the backlog.
- **Terminology Overhaul:** 
  - Renamed "Smart Spreadsheet" to **Multi-Dimensional Data Dashboard**.
  - Renamed "Activity Panel" to **Background Task Orchestrator**.
  - Renamed "Details Panel" to **Universal Plant Profile**.
  - Renamed "Split-Control Utility" to **Development Sandbox Controls (The Reset Loop)**.

### Bug Fixes & Refinements
- **Version Synchronization:** Aligned `package.json`, `AddPlantModal.tsx`, and documentation to a unified version string (v2.23.0).
- **Task Audit:** Refined the "Activity Panel Evolution" task to include post-task auditing and session-based review logic.

## v2.22.0 - Add Plant Control Suite
**Date:** June 18, 2025
**Status:** (Verified)

### New Features
- **AI-Assisted Add Modal:** Introduced `AddPlantModal.tsx` which allows users to add new plants using natural language.
  - **Parsing Engine:** Utilizes Gemini 3 Pro to decompose complex botanical names into hierarchical records (Genus, Species, Cultivar).
  - **Lineage Preview:** Provides a visual "Dry Run" of the hierarchy before database commitment.
  - **Bulk Upload UI:** Added a foundation for bulk file/text list imports.
- **Header Actions:** Added a high-visibility "Add Plant" button to the main navigation header.

[... Rest of file preserved exactly as provided ...]
