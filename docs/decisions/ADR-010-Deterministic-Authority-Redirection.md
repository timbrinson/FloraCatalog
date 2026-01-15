# ADR-010: Deterministic Authority Redirection (ID-based Dereferencing)

## Status
Decided (Implemented January 2026)

## Context
When integrating the **World Flora Online (WFO)** phylogenetic backbone with the **WCVP** nomenclature core, a critical conflict arose: **The Synonym Ambiguity Problem**.

Many families recognized by WCVP (e.g., *Thismiaceae*) are classified as Synonyms by WFO (which places them under *Burmanniaceae*). Traditionally, these records were linked using the `family` string literal. However, string literals are brittle; if a child record (Genus/Species) points to a synonym name, and that synonym name does not have a phylogenetic parent, the entire lineage becomes "orphaned" in the grid.

## Options
1.  **String-to-String Healing:** Perform massive SQL updates to replace synonym family names with accepted family names across 1.4 million rows.
    *   *Failure:* Destroys original WCVP metadata and fails to handle cases where multiple authorities disagree on the redirect target.
2.  **Parent-ID Crawling:** Dynamically resolve the accepted name in the UI on every render.
    *   *Failure:* $O(N)$ performance hit on grid scrolling, causing unacceptable UI latency.
3.  **Deterministic ID Metadata Tier (Selected):** Store absolute authority pointers (`wfo_id` and `wfo_accepted_id`) as physical columns in the `app_taxa` table.

## Decision
We utilize a **Deterministic ID-Sovereignty Tier** for all cross-authority bridging:

1.  **Metadata Capture:** During the WFO population phase, we capture the physical authority IDs (`taxonID` as `wfo_id` and `acceptedNameUsageID` as `wfo_accepted_id`).
2.  **Deterministic Dereferencing:** During the build process (**Step 12: Bridge: Synonyms**), the script identifies any child record that has been grafted to a Family record whose status is 'Synonym'. It then automatically reparents that child to the physical record whose `wfo_id` matches the synonym's `wfo_accepted_id`.
3.  **Literal Persistence:** Only after the ID-based redirection is successful do we update the `family` literal column to match the name of the new Accepted parent.

## Consequences
- **Absolute Precision:** Ambiguities like *Relictithismia* are resolved instantly and correctly, as the ID pointer is mathematically unique.
- **Lineage Integrity:** Entire subtrees (thousands of species) are moved to the correct phylogenetic bucket in a single $O(1)$ database update.
- **Traceability:** Original source attributes are preserved in the metadata columns, allowing researchers to see both the "Scientific Intent" (Synonym name) and the "Phylogenetic Truth" (Accepted parent).
- **Performance:** This logic is applied during the "Build Phase," ensuring the production Data Grid remains a high-performance, static-read environment.