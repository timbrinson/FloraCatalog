# FloraCatalog Data Model & Management Design

## Core Philosophy: Lineage & Traceability
To maintain scientific accuracy while allowing community/AI enrichment, the data model distinguishes between **Nomenclature** (Scientific Names) and **Attributes** (Descriptions, Cultivars).

### 1. The "Source of Truth" Hierarchy
1.  **Primary Authority (WCVP):** Immutable nomenclature data for Genus, Species, and accepted Infraspecies.
2.  **Secondary Authority (Societies/ICRAs):** Registered Cultivars.
3.  **Enrichment (AI/User):** Descriptive text, common names, tags.

## Data Lineage Strategy
Every record must answer:
1.  **Source:** Where did this exist originally? (e.g., "WCVP 2025 Download", "Gemini AI v2.5", "User Manual Entry")
2.  **Process:** How was it put here? (e.g., "Bulk Import Script", "Deep Mine Process", "Manual Correction")
3.  **Timestamp:** When was the *source* published vs. when was it *captured* in our DB?

---

## Entity-Relationship Diagram (Conceptual)

### 1. Staging Layer (`wcvp_import`)
*   **Purpose:** Raw, unaltered dump of the WCVP CSV.
*   **Update Strategy:** Truncate and Reload annually.
*   **Columns:** Matches CSV headers exactly.

### 2. Application Core (`app_taxa`)
*   **Purpose:** The active catalog used by the application.
*   **Relation:** Can link to `wcvp_import` via `wcvp_id`, but exists independently to allow non-WCVP plants (Cultivars).
*   **Lineage Columns:**
    *   `created_by_process`: (e.g., 'WCVP_SYNC', 'USER_ADD')
    *   `source_id`: FK to `app_data_sources`.

### 3. Extended Details (`app_taxon_details`)
*   **Purpose:** Holds rich data not in WCVP (Descriptions, Physical Traits, Cultivar details).
*   **Pattern:** One-to-One or One-to-Many with `app_taxa`.
*   **Columns:** `description`, `growth_habit`, `foliage_color`, etc.
*   **Traceability:** Each column group can have a specific citation.

### 4. Sources Registry (`app_data_sources`)
*   **Purpose:** Central lookup for citations.
*   **Example Rows:**
    *   ID: 1, Name: "WCVP", Version: "14 (2025)", URL: "kew.org..."
    *   ID: 2, Name: "Gemini AI", Version: "2.5 Flash", Context: "Enrichment"

### 5. Audit Log (`app_audit_log`)
*   **Purpose:** Immutable history of changes.
*   **Trigger:** On Insert/Update/Delete in `app_taxa`.
*   **Structure:** JSONB payload storing `{ old_val, new_val }`.

---

## Traceability Workflow

### Scenario A: Importing WCVP
1.  **Process:** `Batch Import`
2.  **Action:** Insert into `app_taxa`.
3.  **Metadata:** `source_id` = WCVP, `verification_level` = 'Verified'.

### Scenario B: AI Mining "Agave 'Blue Glow'"
1.  **Process:** `Deep Mine`
2.  **Action:** Insert into `app_taxa`.
3.  **Metadata:**
    *   `source_id` = Gemini AI.
    *   `verification_level` = 'Unverified' (until human review).
    *   `notes` = "Extracted from patent records via LLM".

### Scenario C: User Edits Description
1.  **Process:** `Manual Edit`
2.  **Action:** Update `app_taxon_details`.
3.  **Audit:** Log entry created: "User X changed Description from [Old] to [New]".
4.  **Metadata:** `description_source_id` updates to 'Manual User'.

---

## Caching Strategy
To ensure performance with hierarchical data (Tree View):
1.  **Materialized Path:** Store a path string (e.g., `/1/55/203`) to allow fast subtree queries.
2.  **Cached Counts:** A background worker updates `descendant_count` on parent records so the UI doesn't calculate recursion on read.
