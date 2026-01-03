# Specification: Data Grid Display Engine

## 1. Visual Weight Matrix
To maintain high density and readability, the grid applies visual weights based on the **Row Rank**.

| Row Rank | Genus Col | Species Col | Infraspecies Col | Cultivar Col |
| :--- | :--- | :--- | :--- | :--- |
| **Genus** | **Bold** | (none) | (none) | (none) |
| **Species** | Dimmed | **Bold** | (none) | (none) |
| **Infraspecies** | Dimmed | Dimmed | **Bold** | (none) |
| **Cultivar (Generic)** | Dimmed | *italic "(none)"* | *italic "(none)"* | **Bold** |
| **Cultivar (Species)** | Dimmed | Dimmed | *italic "(none)"* | **Bold** |
| **Cultivar (Infra)** | Dimmed | Dimmed | Dimmed | **Bold** |

**Visual Constants:**
- **Bold:** `font-bold text-slate-900`
- **Dimmed:** `font-normal text-slate-400`
- **Virtual Header:** Border-bottom 2px, distinct background.

---

## 2. Virtual Root Management
When filtering results in a child (e.g., Cultivar), the parent records might not be loaded or might not exist in the database as "standalone" records.

### Logic:
1. **The "Replace Virtuals" Rule:** If a virtual header is created for a Genus or Species, and a real record for that Genus/Species exists in the current `taxa` array, the Virtual row is replaced by the Real row.
2. **The "None" Placeholder:** For cultivars without a species, a virtual "Holder Row" is inserted into the Species column with the value `(none)` to keep hierarchical alignment.

---

## 3. Sorting & Grouping Logic

### The "Generic First" Rule:
Within a Genus group, rows should sort in the following order:
1. **Generic Cultivars** (e.g. *Agave* 'Blue Glow')
2. **Species** (alphabetical)
3. **Infraspecies** (alphabetical)

### Tree Mode Hierarchy:
- **Level 1:** Family (Virtual or Real)
- **Level 2:** Genus
- **Level 3:** Species (or "Generic" virtual root)
- **Level 4:** Infraspecies (or "Species-level" virtual root)
- **Level 5:** Cultivars

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