# Specification: Unified Plant Ingestion Engine

## 1. Overview
The Ingestion Engine is a 5-stage pipeline designed to reconcile human input (natural language) with rigid botanical standards (WCVP/ICN) and the local database state. It prioritizes **Deterministic Sovereignty** (algorithms over AI).

## 2. The 5-Stage Pipeline

### Stage 1: Intent Extraction (AI Bridge)
- **Tool:** Gemini 3 Flash.
- **Output:** JSON object containing parsed tokens (`genus`, `species`, `infraspecific_rank`, `infraspecies`, `cultivar`) and boolean flags for hybrids.
- **AI Suggested Name:** The AI provides its "best guess" full string for comparison.

### Stage 2: Deterministic Assembly (The Sovereignty Step)
- **Logic:** Local JavaScript `assembleScientificName()` function.
- **Normalization:** 
    - Strip illustrative quotes (`' "`), symbols (`× + * _`), and leading/trailing whitespace, etc.
    - **Casing:** Genus (Title Case), Species/Infraspecies (Lowercase), Cultivar (Title Case).
- **Loose Marker Detection:** Treat a leading "x " or "X " (followed by whitespace) as a genus hybrid indicator. Treat an internal " x " or " X " as a species hybrid indicator.
- **Rule:** If `Algorithm(Tokens) != AI_Suggested_Name`, trigger **S18 (Heuristic Conflict)**.

### Stage 3: Hierarchical Discovery (Recursive DB Walk)
- **Scope:** Search for existing UUIDs from Genus down to specific Rank.
- **Match Strategy:** 
    1. Strict literal match.
    2. Symbol-agnostic match (ignore `×`).
    3. Alias match (check `subsp.` vs `var.` for the same infraspecies).
- **Synonym Detection:** If a match is a synonym, fetch the `accepted_plant_name_id` and restart the discovery walk for the Accepted name.

### Stage 4: Pipeline Visualization & Conflict Resolution (UI)
- Present a linear map to the user showing "Cataloged" vs "New" levels.
- Trigger Conflict UI for Level-Shifts or Ambiguities.

### Stage 5: Transactional Commit
- Create missing records in order, binding each to the parent UUID discovered in Stage 3.

---

## 3. Logical Scenarios (Test Suite)

| ID | Scenario | Logic Requirement |
| :--- | :--- | :--- |
| **S1** | Perfect Match | Link to existing "Accepted" record. |
| **S2** | Known Synonym | Redirect to the "Accepted" name in the DB. |
| **S3** | Missing Species | Create Species bridge, then the target record. |
| **S4** | Missing Genus | Create Genus, then Species, then target. |
| **S5** | Hybrid Continuity | Persist `×` marker and inherit status to children. |
| **S6** | Infraspecific Gap | Create Subspecies/Variety bridge for a cultivar. |
| **S7** | Ambiguous Hybrid | AI determines if "Generic Cultivar" or "Hybrid Species". |
| **S8** | Common Name | AI maps name to Scientific string before starting Stage 2. |
| **S9** | Hybrid-Agnostic | Search DB without symbols; adopt DB hybrid status if found. |
| **S10** | Literal Cleanup | Strip quotes/symbols from all ranks; enforce Title/Lower case (e.g. `' " × + * _` etc.). |
| **S11** | Rank Aliases | Map common aliases (e.g. `forma`, `form`, `subspecies`) to standard abbreviations (e.g. `f.`, `subsp.`, `var.`). See `FILTER_STRATEGIES.md` for full vocabulary. |
| **S12** | Rank Collision | If rank variants conflict (e.g. *var.* vs *subsp.*), prefer the "Accepted" rank found in DB. |
| **S13** | Phonetic Correction | AI maps misspellings to nearest scientific match. |
| **S14** | Level-Shift Dupe | Detect *Agapanthus* 'Storm Cloud' vs *Agapanthus africanus* 'Storm Cloud'. |
| **S15** | Species-to-Infra | If a "Species" is actually an "Infraspecies" in the DB, redirect. |
| **S16** | Infra-to-Species | If an "Infraspecies" is actually its own "Species" in the DB, redirect. |
| **S17** | Cross-Species Search | Look for an infraspecies name under all species in the Genus. |
| **S18** | Heuristic Conflict | If Algorithmic Name != AI suggested Name, user must verify. |

---

## 4. The Trust Model
1. **TRUST:** AI Tokens (Parts) -> These are treated as the raw "facts" of the string.
2. **VERIFY:** Local Algorithm -> Assembles the parts into a valid botanical string.
3. **CONFLICT:** If the AI's full string and our Algorithmic string differ, the user is presented with both. **Botanical precision wins over AI fluency.**