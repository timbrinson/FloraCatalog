# Specification: Unified Plant Ingestion Engine (v2.35.5)

## 1. Overview
The Ingestion Engine is a multi-stage validation pipeline designed to reconcile human input (natural language) with botanical standards and the local database state. It prioritizes **Deterministic Sovereignty** (algorithms over AI) to ensure character-perfect nomenclature and rich metadata capture (trade names, patents).

---

## 2. The 6-Stage Pipeline (High-Fidelity)

### Stage 0: Botanical Lexical Parser (The Lexer)
- **Method:** Algorithmic sequential token consumption (Lexing).
- **Goal:** Deconstruct the input string into a **Complete Token Set** for targeted interrogation. The set consists of: `genus_hybrid`, `genus`, `species_hybrid`, `species`, `infraspecific_rank`, `infraspecies`, `cultivar`, and `nomenclature_metadata`.

**Phase A: Normalization (Pre-pass)**
1. **Character Swap:** 
    - Underscores (`_`) $\rightarrow$ hyphens (`-`).
    - Stand-alone `x` or `X` $\rightarrow$ multiplication signs (`×`).
    - Double quotes (`"`) and back-ticks (`` ` ``) $\rightarrow$ single quotes (`'`).
2. **Diacritic Transcription:** Map all accented characters to ASCII equivalents (e.g., `ñ` $\rightarrow$ `n`, `é` $\rightarrow$ `e`, `ü` $\rightarrow$ `u`, `Munz1` $\rightarrow$ `Munzi`). Scientific names in the database use transcribed ASCII literals.
3. **Sanitization (Whitelist):** Preserve only: `A-Z`, `a-z`, `0-9`, spaces, `-`, `'`, `×`, `+`, `.`, `,`, `!`, `/`, `\`, `(`, `)`. Strip all other characters.
4. **Whitespace:** Collapse all multi-spaces into a single space.

**Phase B: Sequential Token Extraction (Consume-from-Left)**
1. **Genus Hybrid Marker:** If the first word is `+` or `×`, extract as `genus_hybrid` and strip.
2. **Genus:** Extract the first word as `genus` and strip.
3. **Species Hybrid Marker:** If the remaining string starts with `+` or `×`, extract as `species_hybrid` and strip.
4. **Infraspecific Marker & Epithet:** 
    - **Subspecies:** Look for `subspecies`, `subsp.`, `subsp`, `ssp.`, `ssp`. If found, set `infraspecific_rank` to `subsp.`.
    - **Variety:** Look for `varietas`, `variety`, `var.`, `var`, `v.`, `v`. If found, set `infraspecific_rank` to `var.`.
    - **Form:** Look for `forma`, `form`, `f.`, `f`, `fo.`, `fo`, `fa.`, `fa`. If found, set `infraspecific_rank` to `f.`.
    - **Action:** If a marker is found, extract the next word as `infraspecies` and strip both.
5. **Species Epithet:** If `infraspecies` was not found in step 4, treat the first word after the Genus (or hybrid marker) as `species` and strip.
6. **Cultivar (Quote-Delimited):**
    - Identify first `'`. Strip all text *before* it as "Pre-cultivar Noise."
    - Identify second `'`. Treat all text *between* the quotes as `cultivar`.
    - **Lenient Handling:** If only one `'` exists, treat everything after it as the `cultivar`.
7. **Nomenclature Metadata:** Treat all remaining text (e.g., author citations like `(L.) Pennell`) as `nomenclature_metadata`.

**Phase C: Casing Enforcement**
- `genus`: Title Case.
- `species` & `infraspecies`: Lowercase.
- `cultivar`: Title Case.

**Phase D: Targeted Interrogation (Atomic Token Query)**
Construct a single SQL query targeting physical database columns based on the *presence* of the extracted tokens.
- **Logic:** Generate a `WHERE` clause using the equality operator (`=`) for every non-null token found.
- **Outcome - Zero Hits:** Proceed to Stage 1.
- **Outcome - Single Hit:** Prompt the user: *"Match Found in Library. View Existing Record or Search Globally for variations?"*
- **Outcome - Multi-Hit:** List library matches for selection before proceeding.

### Stage 1: Intent & Task Interference Guard
- **Tool:** Gemini 3 Flash.
- **Goal:** Determine if the input is a plant name, a description, or noise. 
- **Task Interference Scenarios:** Specifically detect non-ingestion tasks (e.g., "How do I prune a rose?"). If the query is a botany question rather than a cataloging intent, halt the process and explain the refusal.

### Stage 2: Global Synthesis (The AI Map)
- **Tool:** Gemini 3 Pro.
- **Volume:** Return up to 10 unique botanical interpretations, ordered by confidence.
- **High-Quality Prompting Hints:** The AI must be directed to:
    - Cross-reference WCVP for scientific validity and ICRA for horticultural registration.
    - Prioritize accepted names over synonyms while still capturing the synonym as the entry point if provided.
    - Explicitly distinguish between a "Trade Name" (nursery designation) and a "Cultivar" (botanical designation).
    - Analyze narrative clues (e.g., "red stems", "discovered in Japan") to refine candidate selection.
- **Schema Requirements:** AI provides a structured "Parts List" including:
    - `genus`, `genus_hybrid`, `species`, `species_hybrid`, `infraspecific_rank`, `infraspecies`, `cultivar`, `taxon_rank`.
- **Enrichment Extraction:** AI must identify and extract:
    - `trade_name`: Recognizable nursery/commercial names (e.g., "Red Sister").
    - `patent_number`: Authoritative identifiers (e.g., "PP12345").
    - `rationale`: Why this plant was chosen.
    - `lineage_rationale`: Scientific justification for linking a cultivar to a specific species.

### Stage 3: Identity Guard (The Algorithmic Filter)
- **Normalization:** Apply the Stage 0 normalization and parsing logic to the assembled name of every AI candidate.
- **Verification:** Search the local DB for the **Atomic Token Set**.
- **Synonym Redirection:** If a candidate matches a local record marked `Synonym`, the engine MUST follow the `accepted_plant_name_id` and redirect the identity to the `Accepted` record.
- **Status Promotion:** If found (either as an original or a redirected synonym), the candidate is marked "In Library" to prevent duplication.

### Stage 4: Lineage Status Audit (Ancestry Map)
- **Method:** Recursive hierarchy check.
- **Goal:** For the suggested name, determine the existence of every parent level.
- **UI Behavior:** Render an "Ancestry Path" (Genus > Species > Cultivar) for all candidates, visually distinguishing segments already in the library from segments that the system will need to create.

### Stage 5: Transactional Commit (The Graft)
- **Method:** Sequenced Transaction.
- **Logic:** 
    1. **Parent-First Creation:** Commit missing parent records (Genus/Species) before the terminal record.
    2. **Linkage:** Set the `parent_id` of each record to its physical parent.
    3. **Phylogenetic Flow:** Inherit and update `kingdom`, `phylum`, `class`, `order`, and `family` literals from the parent record to ensure grid grouping integrity.
    4. **Hierarchy Path Construction:** Materialize the `hierarchy_path` (ltree) for each new record by appending its ID to the parent's path.
    5. **Navigational Sync:** Increment the `descendant_count` of the immediate parent record.
- **Metadata Ledger:** Every record (parent and child) receives:
    - `source_id`: 3 (Manual/AI).
    - `verification_level`: App Version + "AI Synthesis".
    - `alternative_names`: Extracted trade names and patent numbers saved to `app_taxon_details`.
    - `history_metadata`: AI's rationale and lineage rationale.

---

## 3. The 18 Logic Scenarios (Restored)
The engine must be tested against and handle the following scenarios:

1.  **Accepted Name Match:** Direct link to existing authority in local library.
2.  **Synonym Redirect:** AI suggests a synonym; system redirects to the local accepted ID.
3.  **Hybrid Symbol Ambiguity:** Stripping `x` vs `×` vs `+` during Stage 0 discovery.
4.  **Rank Alias Resolution:** AI's `subspecies` mapped to `subsp.` for database literal parity.
5.  **Rank Collision:** AI suggests a "Variety" but the DB has it as a "Subspecies"; DB rank wins.
6.  **Extracted Trade Names:** AI finds "Red Sister" in text; saves as trade name for *Cordyline fruticosa*.
7.  **Patent Capture:** AI identifies "PP#12345"; adds to reference metadata.
8.  **Autonym Logic:** Correctly identifying and handling *species var. species*.
9.  **Invalid Name Warning:** AI identifies a name as *nom. inval.* or *nom. nud.*
10. **Orthographic Variant:** Correcting minor spelling drifts (*jasminoides* vs *jasminoides*).
11. **Basionym Linking:** Preserving the original name reference in rationales.
12. **Grex Handling:** Distinguishing orchid grexes from standard cultivars.
13. **Task Interference:** Rejecting cultivation or pruning questions.
14. **Nursery Name Drift:** Mapping common nursery names like "Katsura Maple" to *Acer palmatum* 'Katsura'.
15. **Misapplied Name Detection:** AI flags that "Plant A" is often incorrectly sold as "Plant B."
16. **Intergeneric Hybrids:** Handling complex names like *× Amarine*.
17. **Parenthetical Author Shift:** AI updates the author string based on the global census.
18. **Multi-Parent Hybrids:** Handling complex hybrid formulas in rationales and lineage maps.