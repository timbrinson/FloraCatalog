# ADR-001: Hybrid Search Strategy (B-Tree & Trigram GIN)

## Status
Decided (Implemented in v2.19.0)

## Context
The FloraCatalog must provide high-performance filtering for a dataset of 1.4 million plant names. Standard `ILIKE '%term%'` queries are notoriously slow in PostgreSQL on large tables because they cannot utilize standard B-Tree indexes, often leading to full table scans and "Database Timeout (57014)" errors in the browser.

## Options
1.  **Standard B-Tree Index:** Extremely fast for prefix matching (`LIKE 'Term%'`) but fails for any search not starting at the beginning of the string.
2.  **Trigram GIN Index (pg_trgm):** Supports fast "Contains" logic and case-insensitive searching, but has higher CPU/Memory overhead and slower write speeds.
3.  **Full-Text Search (TSVector):** Powerful for natural language but poorly suited for technical scientific names (e.g., *Agave parryi var. truncata*).

## Decision
We implemented a **Hybrid Search Engine** with a UI-level toggle **specifically for the `taxon_name` (Plant Name) column.**
- **Prefix Mode:** Uses standard B-Tree indexes with intelligent auto-casing in the service layer to ensure index hits. This is the default for massive browsing.
- **Fuzzy Mode:** Uses Trigram GIN indexes to allow mid-string matches and manual `%` wildcard usage.

## Consequences
- The UI must provide a visual cue (icon switch) to inform the user which database engine is active.
- Users gain the flexibility of "contains" logic without sacrificing the "instant-scroll" performance of the 1.4M record baseline.
- **Note:** Other text-based columns (e.g., `family`, `genus`, `geographic_area`) utilize standard B-Tree prefix matching but do not currently support the "Fuzzy" toggle.