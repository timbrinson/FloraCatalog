# Data Mapping: WCVP Source vs FloraCatalog App

This document provides the definitive mapping between the World Checklist of Vascular Plants (WCVP) data, the application's internal logic, and the UI configuration.

## Master Mapping Table

| Group | Grid Column(DataGridV2) | Grid Column Filter Type | Grid Column Default Setting | Grid Column Default Value | Grid Label | Grid Label Tooltip | App Attribute(Taxon) | Database Column(App_Taxa) | WCVP Column | WCVP Value | WCVP Class | WCVP Description | WCVP Remark (Notes) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | id | Text | unselected | (none) | Internal ID | Internal UUID | id | id | — | — | — | — | — |
| | parentId | Text | unselected | (none) | Parent ID | Parent UUID | parentId | parent_id | — | — | — | — | — |
| | treeControl | — | selected | tree | Tree | Tree Control | — | — | — | — | — | — | — |
| | childCount | Text | selected | (none) | # | Child Count | childCount | child_count | — | — | — | — | — |
| | actions | — | unselected | — | Actions | Actions | — | — | — | — | — | — | — |
| **Taxonomy** | taxonName | Text | selected | (none) | Plant Name | Scientific Name | taxonName | taxon_name | taxon_name | | chr | Concatenation of genus with species and, where applicable, infraspecific epithets to make a binomial or trinomial name. | |
| | taxonRank | Multi-select | unselected | (none) | Rank | Taxonomic Rank | taxonRank | taxon_rank | taxon_rank | Convariety, Form, Genus, proles, Species, Subform, Subspecies, Subvariety, Variety | chr | The level in the taxonomic hierarchy where the taxon name fits. | |
| | taxonStatus | Multi-select | unselected | Accepted | Status | Taxonomic Status | taxonStatus | taxon_status | taxon_status | Accepted, Artificial Hybrid, Illegitimate, Invalid, Local Biotype, Misapplied, Orthographic, Synonym, Unplaced, Provisionally Accepted | chr | Indication of nomenclatural status and taxonomic opinion re the name. | |
| | family | Text | unselected | (none) | Family | Family | family | family | family | | chr | The name of the family to which the taxon belongs. | |
| | hybridFormula | Text | unselected | (none) | Hybrid Formula | Hybrid Formula | hybridFormula | hybrid_formula | hybrid_formula | | chr | parents of hybrid | |
| **Nomenclature** | genus | Text | selected | (none) | Genus | Genus Designation | genus | genus | genus | 0 | chr | The name of the genus to which the record refers. | |
| | genusHybrid | Multi-select | selected | (none) | GH | Genus Hybrid Indicator | genusHybrid | genus_hybrid | genus_hybrid | +, × | chr | Indication of hybrid status at genus level. | |
| | species | Text | selected | (none) | Species | Species Designation | species | species | species | 0 | chr | The species epithet. | |
| | speciesHybrid | Multi-select | selected | (none) | SH | Species Hybrid Indicator | speciesHybrid | species_hybrid | species_hybrid | +, × | chr | Indication of hybrid status at species level. | |
| | infraspecificRank | Multi-select | selected | (none) | I Rank | Infraspecific Rank | infraspecificRank | infraspecific_rank | infraspecific_rank | agamosp., convar., ecas., f., grex, group, lusus, microf., microgene, micromorphe, modif., monstr., mut., nid, nothof., nothosubsp., nothovar., positio, proles, provar., psp., stirps, subf., sublusus, subproles, subsp., subspecioid, subvar., unterrasse, var. | chr | Taxonomic rank of the infraspecific epithet. | See Tech Notes |
| | infraspecies | Text | selected | (none) | Infraspecies | Infraspecific Designation | infraspecies | infraspecies | infraspecies | 0 | chr | The infraspecific epithet. | |
| | cultivar | Text | selected | (none) | Cultivar | Cultivar Name | cultivar | cultivar | — | — | — | — | — |
| **Descriptive** | commonName | Text | unselected | (none) | Common Name | Common Name | commonName | common_name | — | — | — | — | — |
| | description | Text | unselected | (none) | Description | Description | description | description | — | — | — | — | — |
| | — | | unselected | (none) | — | — | referenceLinks | reference_links | — | — | — | — | — |
| | — | | unselected | (none) | — | — | synonyms | synonyms | — | — | — | — | — |
| | geographicArea | Text | unselected | (none) | Geography | Geographic Area | geographicArea | geographic_area | geographic_area | 0 | chr | Geographic distribution of the taxon. | See Tech Notes |
| | lifeformDescription| Text | unselected | (none) | Lifeform | Lifeform Description | lifeformDescription | lifeform_description | lifeform_description| 0 | chr | Lifeform (or lifeforms) of the taxon. | Raunkiær system |
| | climateDescription | Multi-select | unselected | (none) | Climate | Climate Description | climateDescription | climate_description | climate_description | desert or dry shrubland, montane tropical, etc. | chr | Habitat type of the taxon. | |
| **Standard Identifiers**| wcvpId | Text | unselected | (none) | WCVP ID | WCVP Plant Name ID | wcvpId | wcvp_id | plant_name_id | | chr | World Checklist of Vascular Plants identifier | |
| | ipniId | Text | unselected | (none) | IPNI ID | IPNI ID | ipniId | ipni_id | ipni_id | | chr | International Plant Name Index identifier | |
| | powoId | Text | unselected | (none) | POWO ID | POWO ID | powoId | powo_id | powo_id | | chr | POWO lookup identifier | |
| **Publication** | taxonAuthors | Text | unselected | (none) | Authorship | Taxon Authors | taxonAuthors | taxon_authors | taxon_authors | | chr | Concatenation of authors. | |
| | primaryAuthor | Text | unselected | (none) | Prim. Author | Primary Author | primaryAuthor | primary_author | primary_author | | chr | Author who published the scientific name. | |
| | publicationAuthor | Text | unselected | (none) | Pub. Author | Publication Author | publicationAuthor | publication_author | publication_author | | chr | Book author if different. | |
| | placeOfPublication | Text | unselected | (none) | Pub. Place | Place Of Publication | placeOfPublication | place_of_publication| place_of_publication| | chr | Journal or book of publication. | |
| | volumeAndPage | Text | unselected | (none) | Vol/Page | Volume And Page | volumeAndPage | volume_and_page | volume_and_page | | chr | Volume and page numbers. | |
| | firstPublished | Text | unselected | (none) | First Published | First Published Date | firstPublished | first_published | first_published | | chr | Year of publication. | |
| | nomenclaturalRemarks| Text | unselected | (none) | Nom. Remarks | Nomenclatural Remarks | nomenclaturalRemarks| nomenclatural_remarks| nomenclatural_remarks| | chr | Remarks on nomenclature. | |
| | reviewed | Multi-select | unselected | (none) | Reviewed | Reviewed Status | reviewed | reviewed | reviewed | | chr | Peer review flag. | |
| **Related Plants** | homotypicSynonym | Text | unselected | (none) | Homotypic Syn. | Homotypic Synonym Flag | homotypicSynonym | homotypic_synonym | homotypic_synonym | 0 | logical | TRUE if homotypic synonym. | ICN Link |
| | acceptedPlantNameId | Text | unselected | (none) | Accepted ID | Accepted Plant Name ID | acceptedPlantNameId | accepted_plant_name_id| accepted_plant_name_id| | chr | ID of the accepted name. | |
| | parentheticalAuthor | Text | unselected | (none) | Paren. Author | Parenthetical Author | parentheticalAuthor | parenthetical_author | parenthetical_author | | chr | Author of the basionym. | |
| | replacedSynonymAuthor| Text | unselected | (none) | Syn. Author | Replaced Synonym Author| replacedSynonymAuthor| replaced_synonym_author| replaced_synonym_author| | chr | Author of replaced synonym. | |
| | parentPlantNameId | Text | unselected | (none) | Parent Plant ID | Parent Plant Name ID | parentPlantNameId | parent_plant_name_id| parent_plant_name_id| | chr | ID for the parent taxon. | |
| | basionymPlantNameId | Text | unselected | (none) | Basionym ID | Basionym Plant Name ID | basionymPlantNameId | basionym_plant_name_id| basionym_plant_name_id| | chr | ID of the original name. | |

## The Golden Record (Horticultural Details)
These fields are stored in the `app_taxon_details` table and are used to enrich standard scientific nomenclature.

| Group | App Attribute | Database Column | Data Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Traits** | description | description_text | text | Narrative description |
| | hardinessMin | hardiness_zone_min | integer | USDA Hardiness Zone |
| | hardinessMax | hardiness_zone_max | integer | USDA Hardiness Zone |
| | heightMin | height_min_cm | integer | Stored in Centimeters |
| | heightMax | height_max_cm | integer | Stored in Centimeters |
| | widthMin | width_min_cm | integer | Stored in Centimeters |
| | widthMax | width_max_cm | integer | Stored in Centimeters |
| | originYear | origin_year | integer | Year of discovery/introduction |
| **JSONB Layers** | morphology | morphology | jsonb | Leaf/Flower color, texture, shape |
| | ecology | ecology | jsonb | Soil type, light needs, watering |
| | history | history_metadata | jsonb | Background, Discovery story |
| | akaNames | alternative_names | jsonb | Trademarks, Patents, Patents, AKAs |
| | links | reference_links | jsonb | Reputable source URLs |

## Technical Notes

### Infraspecific Ranks
**Vocabulary:** `subsp., var., subvar., f., subf., agamosp., convar., ecas., grex, group, lusus, microf., microgène, micromorphe, modif., monstr., mut., nid, nothof., nothosubsp., nothovar., positio, proles, provar., psp., stirps, subap., sublusus, subproles, subspecioid, subsubsp., unterrasse.`

### Climate Literals
**Values:** `desert or dry shrubland, montane tropical, seasonally dry tropical, subalpine or subarctic, subtropical, subtropical or tropical, temperate, temperate, subtropical or tropical, wet tropical.`
*Note: These are strictly lowercase in the database.*