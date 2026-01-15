# FloraCatalog Data Model & Management Design

## Core Philosophy: Lineage & Traceability
To maintain scientific accuracy while allowing community/AI enrichment, the data model distinguishes between **Nomenclature** (Scientific Names) and **Attributes** (Descriptions, Cultivars).

### 1. The "Source of Truth" Hierarchy
1.  **Primary Authority (WCVP):** Immutable nomenclature for Genus, Species, and accepted Infraspecies.
2.  **Secondary Authority (WFO):** Phylogenetic Backbone (Kingdom through Family).
3.  **Manual / Community (ICRAs/Users):** Registered Cultivars and non-authoritative additions.

## Data Lineage Strategy
Every record and modification must capture a strict "Who, What, When, and How" context. 

### Source ID Registry
The `source_id` column maps to the following authoritative tiers:
- **ID 1: WCVP Baseline.** The natural nomenclature core (1.4M records).
- **ID 2: World Flora Online (WFO).** The phylogenetic backbone (Kingdom, Phylum, Class, Order, Family).
- **ID 3: User Manual Entry / ICRA.** Records added via the UI or registered cultivars not yet in WCVP.

**Transition Notes (Jan 2026):**
- **Legacy Cleanup:** Legacy "Derived" family records (previously Source 2) and previous experimental WFO attempts (previously Source 3) are being purged. 
- **Backbone Shift:** Higher ranks (Order, Family, etc.) are now physical records sourced from WFO (ID 2), rather than attributes derived from WCVP.
- **Manual Alignment:** Manual entries are preserved and standardizing on ID 3 going forward.

**Context Requirements:**
1.  **Source:** Where did this exist originally? (e.g., "WCVP 2025 Download", "WFO 2025.12 DwC", "Gemini AI v2.5")
2.  **Process:** How was it put here? (e.g., "Bulk Import Script", "FloraCatalog UI v2.18.0", "Manual Correction")
3.  **Application Context:**
    *   **Application Name:** (e.g., "FloraCatalog")
    *   **Application Version:** (e.g., "v2.18.0")
4.  **User Identity:**
    *   If triggered by a User Command: Capture the User ID (currently placeholders as 'UI_USER').
    *   If System Background Task: Leave User ID null or mark as 'SYSTEM'.
5.  **Timestamp:** When was it captured in our DB?

---

## 4. Data Post-Processing & Normalization
While nomenclature from WCVP is generally treated as immutable, the application performs specific normalization during the "Bridge" phase to ensure hierarchy integrity.

### 4.1 Family Synonym Dereferencing
To prevent a fragmented hierarchy, the application aligns all child records (Genera, Species) with the **Accepted** family name recognized by World Flora Online (Source 2).

- **The Rule:** If a WCVP record references a family that WFO classifies as a `SYNONYM`, the build process grafts that record to the **Accepted** Family parent.
- **Literal Modification:** In these specific cases, the `family` literal column in the `app_taxa` record is updated to match the name of the Accepted parent.
- **Rationale:** This ensures that all members of a lineage (e.g., *Relictithismia*) appear under the correct phylogenetic group in the UI (e.g., *Burmanniaceae*), even if the source WCVP data uses a synonym name (e.g., *Thismiaceae*).

### 4.2 Handling Phylogenetic Gaps (The Angiosperm Case)
In accordance with global botanical standards (APG IV, PPG I), certain taxonomic groups do not utilize every rank in the Kingdom-to-Species chain.

- **The Standard:** For major groups like **Angiosperms** (Flowering Plants), the rank of "Class" is scientifically omitted in modern phylogenies. Instead, "Order" links directly to the "Phylum" (or unranked Clades not represented as physical records).
- **The Protocol:** These gaps are **intentional** and scientifically accurate. The application database stores these ranks as NULL. 
- **UI Handling:** The Data Grid engine identifies these gaps and either displays a `(none)` placeholder or allows the tree to skip the rank entirely. Developers must not attempt to "fix" these gaps by creating artificial or obsolete class names (e.g., "Magnoliopsida") when the authoritative source (WFO/Source 2) leaves them blank.

### 4.3 Literal Consistency Rule (Literal-to-Literal Joins)
To ensure the integrity of the data build process and prevent regressions caused by display-centric updates, internal database operations must adhere to the **Literal Consistency Rule**.

- **The Protocol:** All internal relational joins (e.g., grafting a Species to a Family) and data propagation tasks (e.g., flowing Kingdom names to children) must be performed using literal data columns (e.g., `family`, `genus`, `order`) rather than the `taxon_name` column.
- **Rationale:** The `taxon_name` column is designated as a **display field**. It is subject to algorithmic formatting rules (e.g., italics, hybrid symbol placement, or user preferences) which may change over time. Using display-centric fields for relational logic creates high risk for "broken links" in the hierarchy.
- **Implementation:** The build script must join `child.family = parent.family` and `child.parent_id = parent.id` to ensure character-perfect matches against authoritative literal baselines.

---

## Entity-Relationship Diagram (Conceptual)

### 1. Staging Layer (`wcvp_import` / `wfo_import`)
*   **Purpose:** Raw, unaltered dump of source CSVs.
*   **Update Strategy:** Truncate and Reload during build phases.

### 2. Application Core (`app_taxa`)
*   **Purpose:** The active catalog used by the application.
*   **Relation:** Links to WCVP or WFO staging via external IDs during build.
*   **Lineage Columns:**
    *   `verification_level`: Stores process info (e.g., 'FloraCatalog v2.18.0 (UI)')
    *   `source_id`: FK to `app_data_sources`. Mandatory for all records.

### 3. The "Golden Record" (`app_taxon_details`)
*   **Cardinality:** 1:1 (One row per Taxon).
*   **Purpose:** Stores the **active, consolidated** data used for searching and filtering in the UI.
*   **Strategy:** Hybrid Relational + JSONB.
*   **Core Columns (Indexed):** Attributes frequently used for range filtering (Hardiness Zone, Height/Width, Year).
*   **Flexible Columns (JSONB):** `morphology`, `ecology`.
*   **Provenance:** A `field_sources` JSONB column maps individual attributes to their origin (e.g., `{"height_min_cm": 12, "morphology.flower_color": 5}`).

### 4. The Source Archive (`app_taxon_source_records`)
*   **Cardinality:** 1:Many (Multiple rows per Taxon).
*   **Purpose:** Stores the raw, conflicting data from every source ever imported (AI, Books, Users).

### 5. Sources Registry (`app_data_sources`)
*   **Purpose:** Central lookup for citations.
*   **Example Rows:**
    *   ID: 1, Name: "WCVP", Version: "14 (2025)", URL: "kew.org..."
    *   ID: 2, Name: "World Flora Online", Version: "2025.12", URL: "worldfloraonline.org..."
    *   ID: 3, Name: "Manual Entry", Context: "User-added horticultural records"

### 6. Audit Log (`app_audit_log`)
*   **Purpose:** Immutable history of changes to the Core or Golden Record.
*   **Trigger:** On Insert/Update/Delete in `app_taxa`.

---

## Attribute Governance (Registry)

To prevent schema drift in the JSONB columns (e.g., using "leaf_color" in one place and "foliage_color" in another), the application uses a **Data Dictionary** pattern.

### The Mechanism
1.  **Registry Table:** `app_attribute_definitions` stores the definitive list of allowed keys, their data types, and UI labels.
2.  **UI Generation:** The application queries this table to generate "Edit Detail" forms dynamically.
3.  **Strict Typing:** The `MorphologyAttributes` and `EcologyAttributes` interfaces in code mirror this registry.

---

## Synchronization Strategy (WCVP -> App)

Since WCVP releases annual updates, we need a robust sync process to update `app_taxa` without destroying user data.

### 1. The Initial Load
*   **Action:** Bulk Insert from `wcvp_import` into `app_taxa`.
*   **Keying:** `app_taxa.id` (UUID) is generated. `app_taxa.wcvp_id` stores the external key.
*   **Tree Generation:** The `hierarchy_path` (ltree) is calculated based on the WCVP parent/child relationships during the insert.

### 2. The Update Process (e.g., v14 -> v15)
1.  **Load Staging:** Truncate `wcvp_import` and load new CSV.
2.  **Match & Update:**
    *   Join `app_taxa` and `wcvp_import` on `wcvp_id`.
    *   Update nomenclature fields (spelling corrections, author updates).
    *   **Detect Moves:** If `wcvp_import.parent_id` differs from `app_taxa`'s current parent logic, update `app_taxa.parent_id` and regenerate the `ltree` path.
3.  **Insert New:** Identify IDs in `wcvp_import` not in `app_taxa` and insert them.
4.  **Handle Deletions (Crucial):**
    *   Identify IDs in `app_taxa` (where source=WCVP) that are missing in `wcvp_import`.
    *   **Check Dependencies:** Does this record have child nodes (Cultivars)?
    *   *If No Children:* Safe to soft-delete or mark "Deprecated".
    *   *If Children Exist:* Do **not** delete. Change `taxon_status` to 'Unplaced' or 'Legacy' and keep the record to preserve the tree structure for the user's cultivars.

---

## Handling Non-WCVP Data

The system allows adding Genera, Species, or Infraspecies that are not recognized by WCVP (e.g., new discoveries, provisional names, or garden hybrids).

*   **Structure:**
    *   `wcvp_id` is NULL.
    *   `source_id` points to "Manual Entry", "AI", or a specific paper.
*   **Validation:** The UI should visually distinguish these (e.g., different icon or status badge) so users know this data is not from the primary authority.
*   **Conflict Resolution:** If WCVP eventually adopts this plant in a future update:
    *   The "Update Process" won't automatically match it (no ID match).
    *   We run a "Fuzzy Match" report for Admins: "You have a manual record 'Agave x mystery' that matches a new WCVP record. Merge?"

---

## Ltree Management (Hierarchy)

We use the Postgres `ltree` extension. It works like a filesystem path to allow instant retrieval of entire subtrees.

### Path Structure: UUIDs (Recommended) vs Names
We strictly use **UUIDs** in the path, not human-readable names.

*   **Format:** `root.{uuid_genus}.{uuid_species}.{uuid_cultivar}` (e.g., `root.a1b2.c3d4.e5f6`)
*   **Why UUIDs?**
    1.  **Renaming Resilience:** If *Acer palmatum* is renamed to *Acer palmata* in WCVP, we only update the `taxon_name` text field in one row. The `ltree` path (based on IDs) remains valid. Using names would require rewriting the paths of all 5,000 descendants.
    2.  **Special Characters:** `ltree` labels only support `A-Z, 0-9, _`. Botanical names contain spaces, apostrophes ('Katsura'), and symbols (×), which break `ltree` syntax.
*   **Reading Data:** To display the hierarchy (e.g., "Family > Genus > Species"), the application performs a `JOIN` on the IDs in the path to retrieve the current `taxon_name` for each level.

### Performance
*   **Read:** `WHERE path <@ 'root.a1b2'` finds all descendants of that UUID instantly.
*   **Write (Moves):** Moving a species to a new genus requires updating the path of the species row *and* all its descendants. Postgres handles this efficiently in a single transaction.

---

## Design Decision: Relational vs. JSONB

We evaluated using JSONB for Authorship, Publication, and Geography fields but decided to keep them as **Relational Columns** in `app_taxa`.

### Rationale
1.  **Data Grid Performance:** The application is fundamentally a "Smart Spreadsheet". Users frequently sort and filter by `Authorship`, `Year`, and `Geography`. Postgres performs significantly faster when filtering on native columns compared to extracting values from JSONB at query time.
2.  **Storage Efficiency:** Postgres uses a bitmap for NULL values. A row with 20 NULL columns takes up effectively the same space as a row without those columns. There is no storage penalty for "sparse" columns in this context.
3.  **Import Speed:** The WCVP source data is a flat CSV. Mapping columns 1:1 allows for high-speed bulk imports (`COPY` command). Transforming data into JSONB during import would add significant processing overhead for 1.4 million records.

**Verdict:**
*   **Standard Taxonomy (WCVP):** Use **Relational Columns** (e.g., `taxon_authors`, `geographic_area`).
*   **Extended Attributes (Biology/Traits):** Use **JSONB** in `app_taxon_details` (e.g., `flower_color`, `soil_type`) as these are highly variable and truly sparse.