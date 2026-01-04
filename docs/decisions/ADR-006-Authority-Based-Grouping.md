# ADR-006: Authority-Based Path Grouping (Lineage over Metadata)

## Status
Decided (Codified July 2025)

## Context
The Data Grid organizes plants into a hierarchy (Family -> Genus -> Species). Currently, this grouping is performed by looking at the **String Attributes** of each record (e.g., `row.family`). 

**The Problem:** Inconsistent or missing data in the database (Scenario B: a cultivar missing a family name while its parent genus has it) causes the grid to split the hierarchy. One Genus appears under the correct "Family Name" bucket, and another set of children appears under a "(none)" family bucket, even though they share the same physical parent. 

## Options
1.  **Attribute Healing (Current):** Attempt to "patch" the missing strings in the child records during the data load.
    *   *Failure:* Proved fragile; out-of-order loading or complex lineage still allows records to "drift" into the wrong buckets before healing is complete.
2.  **Authority-Based Path Grouping (Selected):** Group rows by the **UUID segments** of their `hierarchy_path` (ltree).
    *   *Logic:* Instead of asking "What is your family string?", the grid asks "What is the ID of your Level 1 ancestor?".
    *   *Resolution:* All rows sharing Ancestor ID `X` are forced into Bucket `X`. The grid then looks up the "Best Label" for ID `X` from a central Authority Registry.

## Decision
We utilize the **ID-Sovereignty Principle** for all tree-walk operations:
- The `hierarchy_path` (materialized IDs) is the primary engine for bucketing.
- An **Authority Registry** is built during the data-pool memo. It maps every unique ID found in the pool to its most complete record (Metadata Authority).
- Virtual Headers and Groupings are derived from ID matches, not string matches.

## Consequences
- **Metadata Resilience:** Inconsistent or null fields in result sets no longer break the tree structure.
- **Single Source of Truth:** A Genus will only ever appear once in the grid, regardless of metadata errors in its descendants.
- **Automatic Healing:** Child rows that are missing metadata (like Family) effectively "inherit" the label of their parent bucket visually, even if their underlying DB record remains unpatched.
- **Performance:** Relies on the `ltree` logic which is indexed and predictive.