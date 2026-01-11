# ADR-002: Hierarchical Data Persistence (Ltree vs Adjacency)

## Status
Decided (Implemented in Core Schema)

## Context
Botanical taxonomy is inherently hierarchical (Family -> Genus -> Species -> Cultivar). The application requires the ability to instantly retrieve entire sub-trees (e.g., "Find all plants under Genus Agave") and calculate recursive descendant counts for the Data Grid.

## Options
1.  **Adjacency List (`parent_id`):** Simple to implement but requires slow recursive CTEs for every UI fetch.
2.  **Materialized Path (ltree):** A PostgreSQL extension that stores the full path as a specialized data type. Allows for extremely fast subtree queries using GIST indexes.
3.  **Nested Sets:** Very fast for reading, but extremely slow and complex to maintain during inserts/updates (common during botanical mining).

## Decision
We utilize a **Hybrid Approach**:
- **Adjacency List (`parent_id`)** is the primary source of truth for relationships.
- **Ltree (`hierarchy_path`)** is used as a materialized "Performance Layer" for the Tree Grid and filtering.

## Refinement (Jan 2026): The Direct Count Pivot
During massive data loads (1.4M rows), recursive subtree counts became a performance bottleneck.
1. **The Pivot:** The `descendant_count` column now strictly stores the count of **Direct (Immediate) Children**.
2. **Rationale:** 
    - **Speed:** Calculation drops from hours to seconds using simple `GROUP BY` aggregation.
    - **Clarity:** For a UI Tree Grid, knowing exactly how many rows will appear upon clicking "Expand" is more functionally useful than a total recursive sum.
3. **The Hybrid Compromise:** Deep recursive counts (e.g., "Total members in this Order") are relegated to on-demand fetches in the **Details Panel** rather than being recalculated for every row in the main grid.

## Current vs. Future Usage
- **Current Usage:** The `ltree` is primarily a data-layer asset. The build script uses it to calculate lineage, and it serves as a materialized breadcrumb for record location. The current UI performs "Virtual Grouping" in memory for the first page of results.
- **Future Usage:** `ltree` is the prerequisite for "Subtree Fetching" (loading children of a collapsed node on-demand). It will allow the UI to query the database for "All descendants of path X" without knowing their individual IDs.

## Consequences
- The database requires the `ltree` extension to be enabled.
- IDs in the path are stored as UUID strings with dashes replaced by underscores (due to ltree character limits).
- Any change in `parent_id` requires a background process to recalculate the `hierarchy_path` for the record and all its descendants.