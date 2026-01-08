# ADR-003: Maintenance Strategy (Split-Control Purge)

## Status
Decided (Implemented in v2.21.3)

## Context
When experimenting with non-authoritative data (Cultivars) and AI-mined enrichments (Horticultural Details), users need a "Safety Valve" to return to the clean 1.4M record scientific baseline. However, deleting hundreds of thousands of records via a browser-based HTTP request risks 504 Gateway Timeouts or Postgres `statement_timeout`.

## Options
1.  **Single "Nuke" Button:** Simple UI, but highest risk of partial deletion states if the connection drops during the multi-minute process.
2.  **CLI-Only Maintenance:** Safest and most powerful (can use `TRUNCATE`), but creates high friction for non-technical users or those in cloud-only environments.
3.  **Split-Control UI Utility:** Breaking the maintenance into "Taxa Purge" and "Details Wipe" as separate operations.

## Decision: Source-Aware Purging (Update v2.31.1)
We utilize a **Source ID Registry** to distinguish between official data, system-generated hierarchy records, and manual user additions:
- **Source 1 (WCVP):** Official baseline data. (PROTECTED)
- **Source 2 (Derived):** System-generated backbone records like 'Family' or 'Order' generated from attributes. (PROTECTED)
- **Source 3+ (Manual):** User manual entries, test cultivars, or experimental data. (PURGE TARGET)

We implemented the **Split-Control UI Utility** in the `SettingsModal`.
- **Operation A (Purge Taxa):** Deletes manual entries (`source_id NOT IN (1, 2)`). This ensures the generated taxonomic backbone remains intact.
- **Operation B (Wipe Details):** Clears the `app_taxon_details` table. 

## Consequences
- Users can experiment with Cultivars without losing AI descriptions, or vice versa.
- The "Purge" tool is now safe to use after building the Family/Order backbone.
- High-severity "Danger Zone" styling and `ConfirmDialog` components are mandatory to prevent accidental data loss.