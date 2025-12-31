# Grid Filter Strategies & Standardized Values

This document defines the logic and valid values for multi-select filters in the FloraCatalog Data Grid.

## 1. Taxonomic Rank (`taxonRank`)
**Strategy:**  WCVP Primary and Secondary ranks are listed along with application extensions, in hierarchy-first ordering at the top. Followed by obsolete WCVP ranks.

**Values:**

|	Filter Value	|	Type	|	WCVP Docs	|	WCVP Data	|	App Extension	|	Notes	|
|	:---	|	:---	|	:---	|	:---	|	:---	|	:---	|
|	Family	|	App Extension - Virtual	|		|		|	Family	|	Virtual Root in grid tree mode to organize Genus’s together under the Family.	|
|	Genus	|	WCVP - Primary	|	Genus	|	Genus	|		|	Core for App	|
|	Species	|	WCVP - Primary	|	Species	|	Species	|		|	Core for App	|
|	Subspecies	|	WCVP - Primary	|	Subspecies	|	Subspecies	|		|	Core for App under Infraspecies	|
|	Variety	|	WCVP - Primary	|	Variety	|	Variety	|		|	Core for App under Infraspecies	|
|	Subvariety	|	WCVP - Secondary	|	Subvariety	|	Subvariety	|		|	Logical layer in WCVP but not used by app	|
|	Form	|	WCVP - Primary	|	Form	|	Form	|		|	Core for App under Infraspecies	|
|	Subform	|	WCVP - Secondary	|	Subform	|	Subform	|		|	Core for App under Infraspecies	|
|	Cultivar	|	App Extension - ICNCP 	|		|		|	Cultivar	|	Cultivated Varieties as defined by International Code of Nomenclature for Cultivated Plants (ICNCP) 	|
|	Unranked	|	WCVP - Secondary	|		|	Unranked	|		|	Plant names that have not been assigned a specific taxonomic status	|
|	agamosp.	|	WCVP - Obsolete	|		|	agamosp.	|		|	In WCVP data but not in WCVP docs	|
|	Convariety	|	WCVP - Obsolete	|	Convariety	|	Convariety	|		|	Listed in WCVP docs but not used by app	|
|	ecas.	|	WCVP - Obsolete	|		|	ecas.	|		|	In WCVP data but not in WCVP docs	|
|	grex	|	WCVP - Obsolete	|		|	grex	|		|	In WCVP data but not in WCVP docs	|
|	lusus	|	WCVP - Obsolete	|		|	lusus	|		|	In WCVP data but not in WCVP docs	|
|	microf.	|	WCVP - Obsolete	|		|	microf.	|		|	In WCVP data but not in WCVP docs	|
|	microgène	|	WCVP - Obsolete	|		|	microgène	|		|	In WCVP data but not in WCVP docs	|
|	micromorphe	|	WCVP - Obsolete	|		|	micromorphe	|		|	In WCVP data but not in WCVP docs	|
|	modif.	|	WCVP - Obsolete	|		|	modif.	|		|	In WCVP data but not in WCVP docs	|
|	monstr.	|	WCVP - Obsolete	|		|	monstr.	|		|	In WCVP data but not in WCVP docs	|
|	mut.	|	WCVP - Obsolete	|		|	mut.	|		|	In WCVP data but not in WCVP docs	|
|	nid	|	WCVP - Obsolete	|		|	nid	|		|	In WCVP data but not in WCVP docs	|
|	nothof.	|	WCVP - Obsolete	|		|	nothof.	|		|	In WCVP data but not in WCVP docs	|
|	nothosubsp.	|	WCVP - Obsolete	|		|	nothosubsp.	|		|	In WCVP data but not in WCVP docs	|
|	nothovar.	|	WCVP - Obsolete	|		|	nothovar.	|		|	In WCVP data but not in WCVP docs	|
|	positio	|	WCVP - Obsolete	|		|	positio	|		|	In WCVP data but not in WCVP docs	|
|	proles	|	WCVP - Obsolete	|	proles	|	proles	|		|	Listed in WCVP docs but not used by app	|
|	provar.	|	WCVP - Obsolete	|		|	provar.	|		|	In WCVP data but not in WCVP docs	|
|	psp.	|	WCVP - Obsolete	|	psp.	|	psp.	|		|		|
|	stirps	|	WCVP - Obsolete	|	stirps	|	stirps	|		|		|
|	subap.	|	WCVP - Obsolete	|		|	subap.	|		|	In WCVP data but not in WCVP docs	|
|	sublusus	|	WCVP - Obsolete	|	sublusus	|	sublusus	|		|		|
|	subproles	|	WCVP - Obsolete	|	subproles	|	subproles	|		|		|
|	subspecioid	|	WCVP - Obsolete	|	subspecioid	|	subspecioid	|		|		|
|	subsubsp.	|	WCVP - Obsolete	|		|	subsubsp.	|		|	In WCVP data but not in WCVP docs	|


## 2. Taxonomic Status (`taxonStatus`)
**Strategy:** Opinion-based classification. List the three primary statuses first in logical orsder with 'Accepted' first as it is the most important and is the default view. The list the secondary statuses that are subtypes of Synonym. At the end include the app extension.
**Values:**

|	Filter Value	|	Type	|	WCVP Docs	|	WCVP Data	|	App Extension	|	Notes	|
|	:---	|	:---	|	:---	|	:---	|	:---	|	:---	|
|	Accepted	|	WCVP - Primary	|	Accepted	|	Accepted	|		|	Placed first as this is the most important status from WCVP	|
|	Synonym	|	WCVP - Primary	|	Synonym	|	Synonym	|		|		|
|	Unplaced	|	WCVP - Primary	|	Unplaced	|	Unplaced	|		|		|
|	Registered	|	App Extension	|		|		|	Registered	|	Used for Cultivars registered with an International Cultivar Registration Authority (ICRA).	|
|	Provisional	|	App Extension	|		|		|	Provisional	|	Used for manually added plants or trade names awaiting registration.	|
|	Artificial Hybrid	|	WCVP - Secondary	|	Artificial Hybrid	|	Artificial Hybrid	|		|	Subtype of Synonym	|
|	Illegitimate	|	WCVP - Secondary	|	Illegitimate	|	Illegitimate	|		|	Subtype of Synonym	|
|	Invalid	|	WCVP - Secondary	|	Invalid	|	Invalid	|		|	Subtype of Synonym	|
|	Local Biotype	|	WCVP - Secondary	|	Local Biotype	|	Local Biotype	|		|	Subtype of Synonym	|
|	Misapplied	|	WCVP - Secondary	|	Misapplied	|	Misapplied	|		|	Subtype of Synonym	|
|	Orthographic	|	WCVP - Secondary	|	Orthographic	|	Orthographic	|		|	Subtype of Synonym	|
|	Provisionally Accepted	|	WCVP - Obsolete	|	Provisionally Accepted	|		|		|	Mentioned in the docs but not found in WCVP data	|
|	External to WCVP	|	App Extension	|		|		|	External to WCVP	|	For all plants added, that are not from WCVP and therefore do not have a WCVP status.	|

## 3. Infraspecific Rank (`infraspecificRank`)
**Strategy:** List null first as many/most plant names are not at the infraspecies level. The WCVP Primary and Secondary infraspecific ranks are listed next in hierarchy-first ordering. Followed by obsolete WCVP infraspecific ranks.
**Values:**

|	Filter Value	|	Type	|	WCVP Docs	|	WCVP Data	|	App Extension	|	Notes	|
|	:---	|	:---	|	:---	|	:---	|	:---	|	:---	|
|	null	|		|		|	null	|		|	Null/blank/not set for all plants that are not an infraspecies	|
|	subsp.	|	WCVP - Primary	|	subsp.	|	subsp.	|		|	Core for App	|
|	var.	|	WCVP - Primary	|	var.	|	var.	|		|	Core for App	|
|	subvar.	|	WCVP - Secondary	|	subvar.	|	subvar.	|		|	Logical layer in WCVP but not used by app	|
|	f.	|	WCVP - Primary	|	f.	|	f.	|		|	Core for App	|
|	subf.	|	WCVP - Secondary	|	subf.	|	subf.	|		|	Logical layer in WCVP but not used by app	|
|	agamosp.	|	WCVP - Obsolete	|	agamosp.	|	agamosp.	|		|		|
|	convar.	|	WCVP - Obsolete	|	convar.	|	convar.	|		|		|
|	ecas.	|	WCVP - Obsolete	|	ecas.	|	ecas.	|		|		|
|	grex	|	WCVP - Obsolete	|	grex	|	grex	|		|		|
|	lusus	|	WCVP - Obsolete	|	lusus	|	lusus	|		|		|
|	microf.	|	WCVP - Obsolete	|	microf.	|	microf.	|		|		|
|	microgène	|	WCVP - Obsolete	|	microgène	|	microgène	|		|		|
|	micromorphe	|	WCVP - Obsolete	|	micromorphe	|	micromorphe	|		|		|
|	modif.	|	WCVP - Obsolete	|	modif.	|	modif.	|		|		|
|	monstr.	|	WCVP - Obsolete	|	monstr.	|	monstr.	|		|		|
|	mut.	|	WCVP - Obsolete	|	mut.	|	mut.	|		|		|
|	nid	|	WCVP - Obsolete	|	nid	|	nid	|		|		|
|	nothof.	|	WCVP - Obsolete	|	nothof.	|	nothof.	|		|		|
|	nothosubsp.	|	WCVP - Obsolete	|	nothosubsp.	|	nothosubsp.	|		|		|
|	nothovar.	|	WCVP - Obsolete	|	nothovar.	|	nothovar.	|		|		|
|	positio	|	WCVP - Obsolete	|	positio	|	positio	|		|		|
|	proles	|	WCVP - Obsolete	|	proles	|	proles	|		|		|
|	provar.	|	WCVP - Obsolete	|		|	provar.	|		|	In WCVP data but not in WCVP docs	|
|	psp.	|	WCVP - Obsolete	|	psp.	|	psp.	|		|		|
|	stirps	|	WCVP - Obsolete	|	stirps	|	stirps	|		|		|
|	subap.	|	WCVP - Obsolete	|		|	subap.	|		|	In WCVP data but not in WCVP docs	|
|	sublusus	|	WCVP - Obsolete	|	sublusus	|	sublusus	|		|		|
|	subproles	|	WCVP - Obsolete	|	subproles	|	subproles	|		|		|
|	subspecioid	|	WCVP - Obsolete	|	subspecioid	|	subspecioid	|		|		|
|	subsubsp.	|	WCVP - Obsolete	|		|	subsubsp.	|		|	In WCVP data but not in WCVP docs	|
|	group	|	WCVP - Obsolete	|	group	|		|		|	In WCVP docs but not in WCVP data	|
|	unterrasse	|	WCVP - Obsolete	|	unterrasse	|		|		|	In WCVP docs but not in WCVP data	|

## 4. Climate Description (`climateDescription`)
**Strategy:** List null first for those plans that do not have a climate description. Next, order alphbetacally based on presence in WCVP data. Do not list values in the WCVP documentation that does not show up in the data. Use small case matching WCVP database literals.
**Values:**

|	Filter Value	|	Type	|	WCVP Docs	|	WCVP Data	|	App Extension	|	Notes	|
|	:---	|	:---	|	:---	|	:---	|	:---	|	:---	|
|	null	|		|		|	null	|		|	Null/blank/not set for all WCVP plants that have not had their climate determined and for all non-WCVP plants.	|
|	desert or dry shrubland	|	WCVP - Primary	|	Desert or Dry Shrubland	|	desert or dry shrubland	|		|		|
|	montane tropical	|	WCVP - Primary	|	Montane Tropical	|	montane tropical	|		|		|
|	seasonally dry tropical	|	WCVP - Primary	|	Seasonally Dry Tropical	|	seasonally dry tropical	|		|		|
|	subalpine or subarctic	|	WCVP - Primary	|	Subalpine or Subarctic	|	subalpine or subarctic	|		|		|
|	subtropical	|	WCVP - Primary	|	Subtropical	|	subtropical	|		|		|
|	subtropical or tropical	|	WCVP - Primary	|	Subtropical and Tropical	|	subtropical or tropical	|		|		|
|	temperate	|	WCVP - Primary	|	Temperate	|	temperate	|		|		|
|	temperate, subtropical or tropical	|	WCVP - Primary	|	Temperate and Tropical	|	temperate, subtropical or tropical	|		|		|
|	wet tropical	|	WCVP - Primary	|	Wet Tropical	|	wet tropical	|		|		|
|		|	WCVP - Obsolete	|	Desert and Dry Shrubland	|		|		|	Mentioned in the docs but not found in WCVP data	|

## 5. Lifeform Description (`lifeformDescription`)
**Strategy:** Text Search Strategy. Because the WCVP dataset frequently uses concatenated Raunkiær descriptors (e.g., "bulb geophyte", "climbing phanerophyte"), a free-text prefix search is used to ensure maximum record visibility.

**Usage Notes:**
- Terms refer to a modified version of the Raunkiær system.
- Common terms include: phanerophyte, geophyte, therophyte, chamaephyte, hemicryptophyte.
- Use prefix matching (e.g., typing "phanerophyte" will find "climbing phanerophyte").

## 6. Search Engines & Performance (**Scope: `taxonName` column only**)
**Strategy:** The application provides two distinct ways to query plant names via the `taxonName` column. Users can toggle between these modes using the icon inside the search input.

| Mode | Icon | SQL Logic | Index Used | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Prefix (Standard)** | `|A...` | `LIKE 'Term%'` | **B-Tree** | Fastest possible search. Best for large-scale browsing. Matches only the start of the plant name. |
| **Fuzzy (Flexible)** | `...A...` | `ILIKE '%term%'`| **Trigram GIN** | Most flexible. Matches text anywhere in the name. Supports `%` wildcards for complex filtering. |

**Note:** Other text-based columns (e.g., `family`, `genus`, `geographic_area`) utilize standard B-Tree prefix matching but do not currently support the "Fuzzy" toggle.

## 7. Intelligent Auto-Casing (Prefix Mode)
**Strategy:** In **Prefix Mode**, the application applies specific casing rules to text filters before sending the query to the database. This allowed the use of optimized, case-sensitive **B-Tree indexes** while remaining user-friendly.

*   **Family & Genus**: Title Case (e.g., "amaryllidaceae" → "Amaryllidaceae"). Matches the standard botanical capitalization for higher taxonomic ranks.
*   **Species & Infraspecies**: Lowercase (e.g., "PARRYI" → "parryi"). Matches the botanical convention where specific epithets are never capitalized.
*   **Taxon Name & Cultivar**: Capitalized first letter (e.g., "agave parryi" → "Agave parryi"). Ensures the string matches the combined format stored in the database.

## 8. Database Implementation Details

### Implicit Wildcard Wrapping (Fuzzy Mode)
In **Fuzzy Mode**, the application automatically wraps the user's input in wildcards (`%`) before sending it to the database.
*   **Logic:** Input `Ag%par` is transformed into the query `%Ag%par%`.
*   **Effect:** This ensures the search behaves as a "Contains" logic, finding the string fragments anywhere in the plant name, even if they are not at the start.

### Index Selection & Query Optimization
It is important to note that the application does not "choose" the index; it provides the query structure, and the **PostgreSQL Query Planner** determines the most efficient path:
1.  **Prefix Queries (`LIKE 'Term%'`)**: The planner will prioritize the **B-Tree index**. This is an "Index Seek"—the fastest possible lookup method (less than 10ms).
2.  **Middle-String Queries (`ILIKE '%term%'`)**: The planner will prioritize the **GIN Trigram index**. This is an "Index Scan"—it evaluates 3-character segments (trigrams) to find matches anywhere in the string.
3.  **Fallback**: If the search term is too short (1-2 characters), the planner may determine that an index scan is more expensive than reading the table directly and opt for a **Sequential Table Scan**.

### Advanced Wildcard Usage (Fuzzy Mode Only)
In Fuzzy mode, users can manually insert the `%` symbol to find non-contiguous fragments. 
- *Example:* Typing `Ag%par%` will find all *Agave parryi* records.
- *Example:* Typing `%var. truncata` will find all varieties named *truncata* regardless of Genus or Species.

## 9. Technical Note: Case Sensitivity & Capitalization
Database filters in `dataService.ts` are strictly case-sensitive for these specific columns.
- **Filter Values**: All options in multi-select dropdowns MUST match the database strings exactly (including small case for climate and lifeform literals).
- **Grid Display**: The UI components must NOT transform values to ALL CAPS (e.g., using `.toUpperCase()` or the `uppercase` CSS class). Rank and Status should be rendered using the natural capitalization stored in the database (e.g., "Genus", "Species", "Accepted") to maintain consistency for data validation and debugging.
- **CSS Inheritance**: Since filters are often located within `thead` (which typically has `uppercase`), UI components must use `normal-case` classes to ensure database literals are displayed with their original capitalization and are not distorted visually.

## 10. Technical Equality (Exact Match) & Commit UX
**Strategy:** Certain columns contain rigid, machine-readable data where partial matching or prefix logic is undesirable. For these, the application uses the strict SQL Equality operator (`=`) and an explicit commit-on-enter UX.

**Target Columns:**
*   **Internal IDs**: `id` (Primary Key UUID).
*   **External Identifiers**: `wcvpId`, `ipniId`, `powoId`.
*   **Relational Links**: `acceptedPlantNameId`, `parentPlantNameId`, `basionymPlantNameId`.
*   **Publication Metadata**: `firstPublished`.

**Commit Behavior:**
*   **Keystroke Logic**: Unlike standard text filters, technical columns **do not** trigger a search on every keystroke. 
*   **Commit Trigger**: Searches are only triggered when the user presses **Enter** or focus is moved away from the input field (**Blur**). 
*   **Rationale**: This prevents "Database timeout (57014)" errors caused by expensive exact-match operations on incomplete fragments (e.g., a partial year or truncated UUID) while typing.

**Matching Rules:**
*   **Exact Byte Match**: Designed for pasting specific strings. Pasting `271046-1` into the IPNI ID filter will return only that specific record.
*   **No Wildcards**: These filters never apply wildcards (`%`) or use `LIKE` logic. Matching is byte-for-byte.
*   **firstPublished Note**: In the WCVP dataset, years are often stored with parentheses, e.g., `(1753)`. The equality search requires the input to match exactly including these characters.