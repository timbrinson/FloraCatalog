# Version History

## v2.15.0 - UI Filter Enhancements & Data Integrity
**Date:** June 1, 2025

### New Features
- **Smart Filtering:** Upgraded the Data Grid filters for `Infraspecific Rank`, `Climate Description`, `Lifeform`, and `Reviewed` status from simple text inputs to comprehensive multi-select dropdowns.
- **High-Cardinality Search:** Reverted the `Geographic Area` filter to a text search to maintain performance and usability given the high number of unique location strings in the WCVP dataset.

### Bug Fixes & Refinements
- **Data Mapping:** Fixed critical property mapping bugs in `dataService.ts` where database snake_case names were not correctly mapped to CamelCase interface properties (e.g., `acceptedPlantNameId`, `hierarchyPath`).
- **Type Cleanup:** Removed duplicate property definitions in `types.ts` that were causing linter warnings.
- **Filter UX:** Updated `MultiSelectFilter` to handle `NULL` values gracefully, providing a clear "None / Empty" label for records missing metadata.

## v2.13.0 - Timeout & Performance Fix
**Date:** May 30, 2025

### Critical Fixes
- **Error 57014 Resolution:** Fixed `statement timeout` errors during database search. 
  - **Change:** Switched from `Contains` (`%term%`) to **Prefix Match** (`term%`) for the search filter. 
  - **Reason:** Leading wildcards prevented the database from using the B-Tree index on `taxon_name`, forcing a full table scan on 1.4 million rows.
  - **Impact:** Search is now near-instantaneous and stable. Note: Search now matches the *beginning* of the name (e.g. "Agave") rather than the middle.

## v2.12.0 - Database Automation CLI
**Date:** May 30, 2025

### New Features
- **Automated Build Script:** Added `scripts/automate_build.js`, an interactive CLI tool that orchestrates the entire database setup process.
- **Workflow Automation:** The script handles Python data conversion, schema creation, high-speed TCP streaming import, and complex SQL batch execution (linking parents, calculating hierarchy) in a single flow.
- **Resume Capability:** The builder includes a granular resume menu, allowing administrators to retry specific steps (like imports or hierarchy calculations) without restarting the entire process.
- **Documentation:** Added `docs/AUTOMATION_PLAN.md` detailing the build architecture and `scripts/` directory structure.

## v2.11.1 - Script Completeness
**Date:** May 30, 2025

### Maintenance
- **Script Restoration:** Restored Batches 2, 3, and 5 in `scripts/wcvp_step4_counts.sql.txt`. The script now represents a complete A-Z execution flow for calculating descendant counts, ensuring reproducibility if the database needs to be rebuilt from scratch.

## v2.11 - Performance & Stability
**Date:** May 30, 2025

### Critical Fixes
- **Database Optimization:** Reduced Data Grid fetch batch size from 1,000 to **100 records**. This eliminates the `57014` "statement timeout" errors caused by large datasets on the Supabase free tier.
- **Query Performance:** Modified the main `getTaxa` service to stop joining the heavy `app_taxon_details` table by default. The grid now loads lightweight rows, and full details (descriptions, links) are fetched lazily only when a user expands a row.
- **Dynamic Connectivity:** Refactored `supabaseClient` to allow runtime credential updates. Users can now switch from Offline Mode to Connected Mode via Settings without a full page reload.

## v2.10 - Strict Audit Context
**Date:** May 30, 2025

### Changes
- **Data Governance:** Updated `DATA_MODEL.md` to strictly require `appName`, `appVersion`, and `userId` in lineage tracking.
- **Schema:** Updated `wcvp_schema.txt` `app_audit_log` table to include columns for Application Context and User Identity.
- **Types:** Updated `AuditRecord` interface in `types.ts` to include `appName`, `appVersion`, and `userId` fields.

## v2.9 - Data Governance & Lineage Architecture
**Date:** May 30, 2025

### Changes
- **Data Modeling:** Created `DATA_MODEL.md` defining the strategy for Lineage (Source -> Process -> Timestamp) and Source of Truth hierarchy (WCVP > Societies > AI).
- **Schema Design:** Updated `wcvp_schema.txt` to include Application Layer tables (`app_data_sources`, `app_audit_log`, `app_taxon_details`) alongside the raw WCVP staging table.
- **Type Definitions:** Updated `types.ts` with `DataSource`, `AuditRecord`, and `TaxonMetadata` interfaces to support future lineage UI features.
- **Infrastructure:** Added `.gitignore` for repository health.
