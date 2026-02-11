# Data Mapping: Universal Field Registry (The Dictionary of Record)

## Purpose & Governance
Per **ADR-004 (Universal Naming Standardization)**, this document serves as the sovereign registry for all data properties in the system. 

1.  **The Identity Rule:** The internal code attribute and the database column are now identical. The application uses `snake_case` literals across all tiers (TypeScript, API, Database, UI).
2.  **The Registry Function:** This document is no longer a "Rosetta Stone" for translation; it is a "Registry" that defines the authoritative name for every data point.
3.  **The Presentation Authority:** It is the master source for human-facing metadata (UI Labels and Tooltips).
4.  **The Provenance Link:** It maintains the critical link between unified internal literals and the raw WCVP source columns.
5.  **Auditability:** The columns for "System Literal" and "DB Column" in the table below are identical by design, serving as a visual parity check for AI-driven development.

## Master Mapping Table

| Group | Grid Column | Filter Type | Default Setting | Default Value | Grid Label | Grid Label Tooltip | System Literal (snake_case) | DB Column (Identity Check) | WCVP Column | WCVP Value | WCVP Class | WCVP Description | WCVP Remark (Notes) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | id | Text | unselected | (none) | Internal ID | Internal UUID | id | id | — | — | — | — | — |
| | parent_id | Text | unselected | (none) | Parent ID | Parent UUID | parent_id | parent_id | — | — | — | — | — |
| | tree_control | — | selected | tree | Tree | Tree Control | — | — | — | — | — | — | — | — |
| | descendant_count | Text | selected | (none) | # | Child Count | descendant_count | descendant_count | — | — | — | — | — |
| | actions | — | unselected | — | Actions | Actions | — | — | — | — | — | — | — | — |
| **Taxonomy** | taxon_name | Text | selected | (none) | Plant Name | Scientific Name | taxon_name | taxon_name | taxon_name | | chr | Full name string | |
| | taxon_rank | Multi-select | unselected | (none) | Rank | Taxonomic Rank | taxon_rank | taxon_rank | taxon_rank | Kingdom, Phylum... | chr | Hierarchical level | |
| | taxon_status | Multi-select | unselected | Accepted | Status | Taxonomic Status | taxon_status | taxon_status | taxon_status | Accepted, Synonym... | chr | Nomenclatural status | |
| | homotypic_synonym | Text | unselected | (none) | Homotypic Syn. | Homotypic Synonym Flag | homotypic_synonym | homotypic_synonym | homotypic_synonym | 0 | logical | TRUE if homotypic synonym. | ICN Link |
| | kingdom | Text | unselected | (none) | Kingdom | Taxonomic Kingdom | kingdom | kingdom | — | — | — | — | — |
| | phylum | Text | unselected | (none) | Phylum | Taxonomic Phylum | phylum | phylum | — | — | — | — | — |
| | class | Text | unselected | (none) | Class | Taxonomic Class | class | class | — | — | — | — | — |
| | order | Text | selected | (none) | Order | Phylogenetic Order | order | order | — | — | — | — | — |
| | family | Text | unselected | (none) | Family | Family Name | family | family | family | | chr | Botanical Family | |
| | hybrid_formula | Text | unselected | (none) | Hybrid Formula | Hybrid Formula | hybrid_formula | hybrid_formula | hybrid_formula | | chr | Hybrid parentage | |
| **Nomenclature** | genus_hybrid | Multi-select | selected | (none) | GH | Genus Hybrid Indicator | genus_hybrid | genus_hybrid | genus_hybrid | +, × | chr | Hybrid marker | |
| | genus | Text | selected | (none) | Genus | Genus Designation | genus | genus | genus | | chr | Botanical Genus | |
| | species_hybrid | Multi-select | selected | (none) | SH | Species Hybrid Indicator | species_hybrid | species_hybrid | species_hybrid | +, × | chr | Hybrid marker | |
| | species | Text | selected | (none) | Species | Species Designation | species | species | species | | chr | Specific epithet | |
| | infraspecific_rank | Multi-select | selected | (none) | I Rank | Infraspecific Rank | infraspecific_rank | infraspecific_rank | infraspecific_rank | subsp., var... | chr | Rank of infraspecies | |
| | infraspecies | Text | selected | (none) | Infraspecies | Infraspecific Designation | infraspecies | infraspecies | infraspecies | | chr | Infraspecific epithet | |
| | cultivar | Text | selected | (none) | Cultivar | Cultivar Name | cultivar | cultivar | (ICNCP) | | chr | Cultivated variety | |
| **Standard Identifiers**| wcvp_id | Text | unselected | (none) | WCVP ID | WCVP Plant Name ID | wcvp_id | wcvp_id | plant_name_id | | chr | WCVP identifier | |
| | accepted_plant_name_id | Text | unselected | (none) | Accepted ID | Accepted Plant Name ID | accepted_plant_name_id | accepted_plant_name_id | accepted_plant_name_id | | chr | ID of the accepted name | |
| | parent_plant_name_id | Text | unselected | (none) | Parent Plant ID | Parent Plant Name ID | parent_plant_name_id | parent_plant_name_id | parent_plant_name_id | | chr | ID for the parent taxon | |
| | basionym_plant_name_id | Text | unselected | (none) | Basionym ID | Basionym Plant Name ID | basionym_plant_name_id | basionym_plant_name_id | basionym_plant_name_id | | chr | ID of the original name | |
| | ipni_id | Text | unselected | (none) | IPNI ID | IPNI ID | ipni_id | ipni_id | ipni_id | | chr | IPNI identifier | |
| | powo_id | Text | unselected | (none) | POWO ID | POWO ID | powo_id | powo_id | powo_id | | chr | POWO identifier | |
| **WFO Identifiers**| wfo_id | Text | unselected | (none) | WFO ID | World Flora Online ID | wfo_id | wfo_id | — | — | — | — | — |
| | wfo_accepted_id | Text | unselected | (none) | WFO Acc. ID | WFO Accepted Name ID | wfo_accepted_id | wfo_accepted_id | — | — | — | — | — |
| | wfo_parent_id | Text | unselected | (none) | WFO Parent ID | WFO Parent ID | wfo_parent_id | wfo_parent_id | — | — | — | — | — |
| | wfo_original_id | Text | unselected | (none) | WFO Orig. ID | WFO Original ID | wfo_original_id | wfo_original_id | — | — | — | — | — |
| | wfo_scientific_name_id | Text | unselected | (none) | WFO Sci. ID | WFO Scientific ID | wfo_scientific_name_id | wfo_scientific_name_id | — | — | — | — | — |
| **Publication** | taxon_authors | Text | unselected | (none) | Authorship | Taxon Authors | taxon_authors | taxon_authors | taxon_authors | | chr | Concatenation of authors. | |
| | parenthetical_author | Text | unselected | (none) | Paren. Author | Parenthetical Author | parenthetical_author | parenthetical_author | parenthetical_author | | chr | Author of the basionym. | |
| | primary_author | Text | unselected | (none) | Prim. Author | Primary Author | primary_author | primary_author | primary_author | | chr | Author who published the scientific name. | |
| | publication_author | Text | unselected | (none) | Pub. Author | Publication Author | publication_author | publication_author | publication_author | | chr | Book author if different. | |
| | replaced_synonym_author| Text | unselected | (none) | Syn. Author | Replaced Synonym Author| replaced_synonym_author | replaced_synonym_author | replaced_synonym_author | | chr | Author of replaced synonym. | |
| | place_of_publication | Text | unselected | (none) | Pub. Place | Place Of Publication | place_of_publication | place_of_publication | place_of_publication | | chr | Journal or book of publication. | |
| | volume_and_page | Text | unselected | (none) | Vol/Page | Volume And Page | volume_and_page | volume_and_page | volume_and_page | | chr | Volume and page numbers. | |
| | first_published | Text | unselected | (none) | First Published | First Published Date | first_published | first_published | first_published | | chr | Year of publication. | |
| | nomenclatural_remarks| Text | unselected | (none) | Nom. Remarks | Nomenclatural Remarks | nomenclatural_remarks | nomenclatural_remarks | nomenclatural_remarks | | chr | Remarks on nomenclature. | |
| | reviewed | Multi-select | unselected | (none) | Reviewed | Reviewed Status | reviewed | reviewed | reviewed | | chr | Peer review flag. | |

## The Golden Record (Horticultural Details)
These fields are stored in the `app_taxon_details` table and are used to enrich standard scientific nomenclature. Per ADR-004, the System Literal and Database Column are identical.

| Group | System Literal (snake_case) | DB Column (Identity Check) | Data Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Traits** | description_text | description_text | text | Narrative description |
| | hardiness_zone_min | hardiness_zone_min | integer | USDA Hardiness Zone |
| | hardiness_zone_max | hardiness_zone_max | integer | USDA Hardiness Zone |
| | height_min_cm | height_min_cm | integer | Stored in Centimeters |
| | height_max_cm | height_max_cm | integer | Stored in Centimeters |
| | width_min_cm | width_min_cm | integer | Stored in Centimeters |
| | width_max_cm | width_max_cm | integer | Stored in Centimeters |
| | origin_year | origin_year | integer | Year of discovery/introduction |
| **JSONB Layers** | morphology | morphology | jsonb | Leaf/Flower color, texture, shape |
| | ecology | ecology | jsonb | Soil type, light needs, watering |
| | history_metadata | history_metadata | jsonb | Background, Discovery story |
| | alternative_names | alternative_names | jsonb | Trademarks, Patents, Patents, AKAs |
| | reference_links | reference_links | jsonb | Reputable source URLs |

## Technical Notes

### Infraspecific Ranks
**Vocabulary:** `subsp., var., subvar., f., subf., agamosp., convar., ecas., grex, group, lusus, microf., microgène, micromorphe, modif., monstr., mut., nid, nothof., nothosubsp., nothovar., positio, proles, provar., psp., stirps, subap., sublusus, subproles, subspecioid, subsubsp., unterrasse.`

### Climate Literals
**Values:** `desert or dry shrubland, montane tropical, seasonally dry tropical, subalpine or subarctic, subtropical, subtropical or tropical, temperate, temperate, subtropical or tropical, wet tropical.`
*Note: These are strictly lowercase in the database. Individual terms within the CSV are also preserved character-for-character to maintain baseline integrity.`