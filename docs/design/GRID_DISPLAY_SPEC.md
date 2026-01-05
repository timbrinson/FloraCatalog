# Specification: Data Grid Display Engine

## 1. Visual Weight Matrix
To maintain high density and readability, the grid applies visual weights based on the **Row Rank**.

### Data Columns (Family, Genus, Species, etc.)
- **Matching Rank**: The column matching the row's specific rank is **Bold**. 
- **Virtual Rows**: If the row is a virtual "Holder" row (e.g., a Species Virtual Root), the `(none)` placeholder in that rank's column is **Bold** and uses the **Rank's Theme Color** (e.g., Orange for Genus, Amber for Species).
- **Parent/Other Ranks**: These are displayed with standard text color (`text-slate-600`). Dimming (opacity/graying) is no longer applied to data columns to prevent "double dimming" and preserve readability.

### Plant Name Column
- **Active Row**: The name of the active taxon is rendered with full visual weight.
- **Lineage**: Parent segments of the name are **Dimmed** (opacity 40-60%) to emphasize the specific designation of the current row.

| Row Rank | Data Col (Matching) | Data Col (Parent) | Plant Name Col |
| :--- | :--- | :--- | :--- |
| **Active Rank** | **Bold + Rank Color (Virtual)** | Standard | Full Weight |
| **Parent Rank** | Standard | Standard | **Dimmed** |

**Visual Constants:**
- **Bold (Real Record):** `font-bold text-slate-900`
- **Bold (Virtual Placeholder):** `font-bold text-[RankColor]-700`
- **Standard:** `font-normal text-slate-600`
- **Dimmed (Plant Name):** `text-slate-400`

---

## 2. Virtual Root Management
When filtering results in a child (e.g., Cultivar), the parent records might not be loaded or might not exist in the database as "standalone" records.

### Logic:
1. **The "Replace Virtuals" Rule:**
    - **Stage 1 (Local Pool):** If a virtual header is created, the engine first scans all loaded results. If a match is found, the virtual is replaced.
    - **Stage 2 (Remote Hydration):** If a parent is missing from the local pool, the application must identify the `parent_id` and perform a **Hydration Fetch**. Once the parent record is retrieved, it is added to the "Ancestor Cache" and promoted to the grid header.
2. **Gap-Filling Integrity:** For every branch that leads to a Cultivar, the engine ensures a row exists for every rank in the chain. 
    *   *Example:* Genus → `(none)` (Species Virtual Root) → `(none)` (Infraspecies Virtual Root) → 'Cultivar Name'.
3. **Deterministic IDs:** Virtual rows use a structured Internal ID: `virtual:[bucketId]:[parentId]`.

---

## 3. Sorting & Grouping Logic (ADR-006 Update)

### Authority-Based Bucketing:
To prevent duplicate hierarchy headers caused by inconsistent metadata, the grid groups rows based on **Literal-ID Hybrid** bucketing:

1. **The Authority Registry:** During the tree-walk, the engine builds a map of every unique ID in the pool to its most complete metadata record.
2. **Family Bucketing (Literal):** Rows are grouped by their `family` string literal. If a record has a null family, it recursively climbs its `parent_id` chain to inherit the family name from its physical ancestor in the registry.
3. **Genus & Below Bucketing (ID):** Rows are grouped by the UUID segments in their `hierarchy_path`. All rows sharing Ancestor ID `X` at a specific level are forced into Bucket `X`.
4. **Label Resolution:** When rendering a bucket header, the name is resolved by looking up the bucket's identity (string or UUID) in the Authority Registry.

### The "Generic First" Rule:
Sorting within any group prioritizes the Virtual Root (the "Generic" entries) before alphabetical listings.
- **At Genus Level:** 
    1. The `(none)` Species Virtual Root (if it exists) always sorts to position #1.
    2. All real Species follow in alphabetical order.
- **At Species Level:**
    1. The `(none)` Infraspecies Virtual Root (if it exists) always sorts to position #1.
    2. All real Infraspecies follow in alphabetical order.

### Tree Mode Hierarchy:
The depth of the tree is dynamic based on column visibility.
- **Level 1:** Family. **Rule:** This level is only shown if the "Family" column is in `visibleColumns`. If hidden, the tree root begins at Genus.
- **Level 2:** Genus.
- **Level 3:** Species (or "Species Virtual Root" holder for Generic Cultivars).
- **Level 4:** Infraspecies (or "Infraspecies Virtual Root" holder for Species-level Cultivars).
- **Level 5:** Cultivars.

---

## 4. UI Stability Rules
1. **Filter Persistence:** Text inputs must be debounced and maintain focus during infinite scroll updates.
2. **Scroll Anchoring:** Adding new rows at the bottom of the list must not "jump" the user's current scroll position.
3. **Casing Sovereignty:** Values from the DB (`Accepted`, `subsp.`, `temperate`) must be displayed with `normal-case` to preserve scientific literal accuracy.

---

## 5. Hierarchy Integrity Rule
To ensure visual stability and correct debugging, the grid algorithm must adhere to the **Parent-ID Integrity Rule**:

1. **Direct Match:** The `parent_id` of a lower-level record MUST match the `id` of its direct parent in the hierarchy.
2. **Indirect (Virtual) Match:** If a record is grouped under a Virtual Root (because the real parent is not loaded), the Virtual Root's "effective ID" must be derivable such that the relationship is logically consistent with the relational database state.
3. **Correctness Check:** Any row rendered under a parent that does not share a logical `parent_id` link (either directly or via the materialzed `hierarchy_path`) is considered a display regression.