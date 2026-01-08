# ADR-006: Authority-Based Path Grouping (Lineage over Metadata)

## Status
Decided (Codified July 2025)

## Context
The Data Grid organizes plants into a hierarchy (Family -> Genus -> Species). Traditionally, this grouping was performed by looking at the **String Attributes** of each record (e.g., `row.family`). 

**The Problem:** Inconsistent or missing data in the database (Scenario B: a cultivar missing a family name while its parent genus has it) causes the grid to split the hierarchy. One Genus appears under the correct "Family Name" bucket, and another set of children appears under a "(none)" family bucket, even though they share the same physical parent. 

**The WCVP Constraint:** Families in the WCVP dataset are attributes, not distinct entities with their own UUIDs. Therefore, a pure ID-Based bucketing fails at Level 1 because there is no Level 1 UUID in the `hierarchy_path`.

## Options
1.  **Attribute Healing:** Attempt to "patch" the missing strings in the child records during the data load.
    *   *Failure:* Proved fragile; out-of-order loading or complex lineage allows records to "drift" into the wrong buckets.
2.  **Authority-Based Path Grouping (Selected):** Group rows by the **UUID segments** of their `hierarchy_path` (ltree).
3.  **Literal-ID Hybrid (Refined):**
    *   **Family Rank:** Use the **Family String Literal** as the bucket identity. If missing, recursively climb the `parent_id` chain to find an ancestor (Authority) that possesses the family string.
    *   **Genus & Below:** Use the **UUID segments** from the `hierarchy_path` for bucketing.

## Decision
We utilize the **ID-Sovereignty Principle** for all tree-walk operations, with a specialized literal-climb for the Family rank:
- The **Authority Registry** is built during the data-pool memo. It maps every unique ID found in the pool to its most complete record.
- **Literal Bucketing for Families:** The engine uses the family name string to group records. If a record lacks this string, it inherits the string from its physical parent record found in the Authority Registry.
- **ID Bucketing for Genus/Below:** Buckets are derived from ID matches found in the materialized `hierarchy_path`.
- Labels are resolved by looking up the bucket's ID (or string) in the Authority Registry.

## Consequences
- **Metadata Resilience:** Inconsistent fields in result sets no longer break the tree structure.
- **Single Source of Truth:** A Genus will only ever appear once in the grid, regardless of metadata errors in its descendants.
- **Literal Family Support:** Successfully handles the "Attribute-only" nature of Families in the WCVP dataset without requiring the creation of millions of ghost Family records.
- **Authority-Aware Expansion Fix (v2.31.0):** The UI expansion logic (`expandTreeLevel`) has been refactored to align with the ID-based bucketing. By using `getTargetIdForRank` to generate expansion paths, the "1, 2, 3, 4" Level buttons now correctly identify the hierarchy depth using UUID segments rather than string labels, preventing key mismatches during recursive tree walks.