# ADR-011: Atomic Token Sovereignty (Hierarchy of Identity)

## Status
Decided (January 2026)

## Context
The Ingestion Engine must verify the existence of taxa at various stages (Discovery, Identity Guard, Lineage Audit). Using only the `taxon_name` string is fragile due to author citations and formatting variations. Conversely, using only atomic tokens (genus, species, etc.) fails if the database records were imported with incomplete metadata (e.g., only a name string).

## Decision
We implement **Atomic Token Sovereignty** as the primary standard for all database interrogation, supported by a secondary **Literal Fallback**.

### The Hierarchy of Identity:
1.  **Standard A (Atomic Token Query):** The engine first attempts to find a record using strict **Equality** column matching (e.g., `WHERE genus = 'Abies' AND species = 'spectabilis'`). 
    - **Rationale:** Strict equality utilizes standard B-Tree indices on "C" collated columns. Since the engine normalizes tokens to specific casing (Title Case for Genus, lowercase for Species), `eq()` provides character-perfect binary verification.
2.  **Standard B (Literal Fallback):** If Standard A returns zero hits, the engine performs a search using the `taxon_name` column against the original search string or synthesized name via `ilike`. This serves as the "Safety Net" for records with incomplete column data or messy user input.

### Implementation Rules:
- **Consistency:** Stage 0 (Discovery), Stage 3 (Identity Guard), and Stage 4 (Lineage Audit) must all adhere to this dual-standard logic.
- **Auditability:** Every interrogation must report which standard was used to find a match, surfaced via the **Process Ledger** in the Operations Hub.
- **Step-wise Sovereignty:** In Stage 4 (Lineage Audit), this logic is applied independently to every rank (Genus, Species, etc.).

## Consequences
- **High Fidelity:** Character-perfect identification ensures records found during typing are correctly identified as "In Library" during verification.
- **Index Performance:** Switching to `.eq()` allows Postgres to perform "Index Seeks" rather than "Index Scans," mitigating potential timeouts on the 1.4M record baseline.
- **Data Resilience:** The system gracefully handles both high-quality structured data and legacy name-only records.
- **Debugging Transparency:** Process Ledger visibility allows users to see exactly why a record was or wasn't found, including database-level errors.