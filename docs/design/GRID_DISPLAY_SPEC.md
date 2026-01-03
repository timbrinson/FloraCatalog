# Specification: Data Grid Display Engine

## 1. Visual Weight Matrix
To maintain high density and readability, the grid applies visual weights based on the **Row Rank**. Only the column matching the row's specific rank is **Bold**. All parent columns are **Dimmed**.

| Row Rank | Family Col | Genus Col | Species Col | Infraspecies Col | Cultivar Col |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Family** | **Bold** | (none) | (none) | (none) | (none) |
| **Genus** | Dimmed | **Bold** | (none) | (none) | (none) |
| **Species** | Dimmed | Dimmed | **Bold** | (none) | (none) |
| **Infraspecies** | Dimmed | Dimmed | Dimmed | **Bold** | (none) |
| **Cultivar** | Dimmed | Dimmed | Dimmed | Dimmed | **Bold** |

**Special Case: Holder Rows / Virtual Roots**
For "Holder Rows" (where a level is skipped, e.g., a Generic Cultivar), the identifying column for that rank displays the placeholder **(none)**.
- **Bold Placeholder:** If the row *represents* that rank (e.g., a Species Virtual Root row), the `(none)` is styled as `italic font-normal text-slate-400 opacity-60`.
- **Dimmed Placeholder:** If the row is a child of a holder (e.g., a Cultivar row showing its parentage), the `(none)` is styled as `font-normal text-slate-300 opacity-40`.

**Visual Constants:**
- **Bold:** `font-bold text-slate-900`
- **Dimmed:** `font-normal text-slate-400`
- **Virtual Row Background:** Uses the standard background color assigned to that Rank in the active theme.

---

## 2. Virtual Root Management
When filtering results in a child (e.g., Cultivar), the parent records might not be loaded or might not exist in the database as "standalone" records.

### Logic:
1. **The "Replace Virtuals" Rule:**
    - **Stage 1 (Local Pool):** If a virtual header is created, the engine first scans all loaded results. If a match is found, the virtual is replaced.
    - **Stage 2 (Remote Hydration):** If a parent is missing from the local pool, the application must identify the `parent_id` and perform a **Hydration Fetch**. Once the parent record is retrieved, it is added to the "Ancestor Cache" and promoted to the grid header.
2. **Gap-Filling Integrity:** For every branch that leads to a Cultivar, the engine ensures a row exists for every rank in the chain. 
    *   *Example:* Genus → `(none)` (Species Virtual Root) → `(none)` (Infraspecies Virtual Root) → 'Cultivar Name'.
3. **Deterministic IDs:** Virtual rows use a structured Internal ID: `virtual:none:[parent-uuid]:[field]`.

---

## 3. Sorting & Grouping Logic

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