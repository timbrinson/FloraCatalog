# Data Mapping: WCVP Source vs FloraCatalog App

This document provides the definitive mapping between the World Checklist of Vascular Plants (WCVP) data, the application's internal logic, and the UI configuration.

## Master Mapping Table

| Group | Grid Column(DataGridV2) | Grid Column Filter Type | Grid Column Default Setting | Grid Column Default Value | Grid Label | Grid Label Tooltip | App Attribute(Taxon) | Database Column(App_Taxa) | WCVP Column | WCVP Value | WCVP Class | WCVP Description | WCVP Remark (Notes) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | id | Text | unselected | (none) | Internal ID | Internal ID | id | id | — | — | — | — | — |
| | parentId | Text | unselected | (none) | Parent ID | Parent ID | parentId | parent_id | — | — | — | — | — |
| | treeControl | — | selected | tree | Tree | Tree Control | — | — | — | — | — | — | — |
| | childCount | Text | selected | (none) | # | Child Count | childCount | child_count | — | — | — | — | — |
| | actions | — | unselected | — | Actions | Actions | — | — | — | — | — | — | — |
| **Taxonomy** | taxonName | Text | selected | (none) | Taxon Name | Taxon Name | taxonName | taxon_name | taxon_name | | | | |
| | taxonRank | Multi-select | unselected | (none) | Rank | Taxon Rank | taxonRank | taxon_rank | taxon_rank | | | | |
| | taxonStatus | Multi-select | unselected | Accepted | Status | Taxonomic Status | taxonStatus | taxon_status | taxon_status | | | | |
| | family | Text | unselected | (none) | Family | Family | family | family | family | | | | |
| | hybridFormula | Text | unselected | (none) | Hybrid Formula | Hybrid Formula | hybridFormula | hybrid_formula | hybrid_formula | | | | |
| **Nomenclature** | genus | Text | selected | (none) | Genus | Genus | genus | genus | genus | 0 | chr | The name of the genus to which the record refers. | 0 |
| | genusHybrid | Multi-select | selected | (none) | GH | Genus Hybrid | genusHybrid | genus_hybrid | genus_hybrid | +, × | chr | Indication of hybrid status at genus level. | 0 |
| | species | Text | selected | (none) | Species | Species | species | species | species | 0 | chr | The species epithet. | 0 |
| | speciesHybrid | Multi-select | selected | (none) | SH | Species Hybrid | speciesHybrid | species_hybrid | species_hybrid | +, × | chr | Indication of hybrid status at species level. | 0 |
| | infraspecificRank | Multi-select | selected | (none) | I Rank | Infraspecific Rank | infraspecificRank | infraspecific_rank | infraspecific_rank | *See Tech Notes* | chr | Taxonomic rank of the infraspecific epithet. | *See Tech Notes* |
| | infraspecies | Text | selected | (none) | Infraspecies | Infraspecies | infraspecies | infraspecies | infraspecies | 0 | chr | The infraspecific epithet. | 0 |
| | cultivar | Text | selected | (none) | Cultivar | Cultivar | cultivar | cultivar | — | — | — | — | — |
| **Descriptive** | commonName | Text | unselected | (none) | Common Name | Common Name | commonName | common_name | — | — | — | — | — |
| | description | Text | unselected | (none) | Description | Description | description | description | — | — | — | — | — |
| | — | | unselected | (none) | — | — | referenceLinks | reference_links | — | — | — | — | — |
| | — | | unselected | (none) | — | — | synonyms | synonyms | — | — | — | — | — |
| | geographicArea | Text | unselected | (none) | Geography | Geographic Area | geographicArea | geographic_area | geographic_area | 0 | chr | Geographic distribution of the taxon. | *See Tech Notes* |
| | lifeformDescription| Multi-select | unselected | (none) | Lifeform | Lifeform Description | lifeformDescription | lifeform_description | lifeform_description| 0 | chr | Lifeform (or lifeforms) of the taxon. | *Raunkiær system* |
| | climateDescription | Multi-select | unselected | (none) | Climate | Climate Description | climateDescription | climate_description | climate_description | *See Tech Notes* | chr | Habitat type of the taxon. | 0 |
| **Standard Identifiers**| wcvpId | Text | unselected | (none) | WCVP ID | WCVP Plant Name ID | wcvpId | wcvp_id | plant_name_id | | | | |
| | ipniId | Text | unselected | (none) | IPNI ID | IPNI ID | ipniId | ipni_id | ipni_id | | | | |
| | powoId | Text | unselected | (none) | POWO ID | POWO ID | powoId | powo_id | powo_id | | | | |
| **Publication** | taxonAuthors | Text | unselected | (none) | Authorship | Taxon Authors | taxonAuthors | taxon_authors | taxon_authors | | | | |
| | primaryAuthor | Text | unselected | (none) | Prim. Author | Primary Author | primaryAuthor | primary_author | primary_author | | | | |
| | publicationAuthor | Text | unselected | (none) | Pub. Author | Publication Author | publicationAuthor | publication_author | publication_author | | | | |
| | placeOfPublication | Text | unselected | (none) | Pub. Place | Place Of Publication | placeOfPublication | place_of_publication| place_of_publication| | | | |
| | volumeAndPage | Text | unselected | (none) | Vol/Page | Volume And Page | volumeAndPage | volume_and_page | volume_and_page | | | | |
| | firstPublished | Text | unselected | (none) | First Published | First Published Date | firstPublished | first_published | first_published | | | | |
| | nomenclaturalRemarks| Text | unselected | (none) | Nom. Remarks | Nomenclatural Remarks | nomenclaturalRemarks| nomenclatural_remarks| nomenclatural_remarks| | | | |
| | reviewed | Multi-select | unselected | (none) | Reviewed | Reviewed | reviewed | reviewed | reviewed | | | | |
| **Related Plants** | homotypicSynonym | Text | unselected | (none) | Homotypic Syn. | Homotypic Synonym | homotypicSynonym | homotypic_synonym | homotypic_synonym | 0 | logical | TRUE if homotypic synonym. | *ICN Link* |
| | acceptedPlantNameId | Text | unselected | (none) | Accepted ID | Accepted Plant Name ID | acceptedPlantNameId | accepted_plant_name_id| accepted_plant_name_id| | | | |
| | parentheticalAuthor | Text | unselected | (none) | Paren. Author | Parenthetical Author | parentheticalAuthor | parenthetical_author | parenthetical_author | | | | |
| | replacedSynonymAuthor| Text | unselected | (none) | Syn. Author | Replaced Synonym Author| replacedSynonymAuthor| replaced_synonym_author| replaced_synonym_author| | | | |
| | parentPlantNameId | Text | unselected | (none) | Parent Plant ID | Parent Plant Name ID | parentPlantNameId | parent_plant_name_id| parent_plant_name_id| | | | |
| | basionymPlantNameId | Text | unselected | (none) | Basionym ID | Basionym Plant Name ID | basionymPlantNameId | basionym_plant_name_id| basionym_plant_name_id| | | | |

## Technical Notes

### Infraspecific Ranks (WCVP Value / Remark)
**Vocabulary:** `agamosp., convar., ecas., f., grex, group, lusus, microf., microgene, micromorphe, modif., monstr., mut., nid, nothof., nothosubsp., nothovar., positio, proles, provar., psp., stirps, subf., sublusus, subproles, subsp., subspecioid, subvar., unterrasse, var.`
**Note:** For more information, see the International Code of Nomenclature for algae, fungi and plants: https://www.iapt-taxon.org/nomen/main.php

### Geography (Remark)
See https://wcsp.science.kew.org/about.do#geography for details on narrative distribution forms.

### Lifeform (Remark)
Terms refer to a modified version of the Raunkiær system. See https://wcsp.science.kew.org/about.do#lifeforms for a glossary of terms used.

### Climate (Value)
**Categories:** `Desert and Dry Shrubland, Desert or Dry Shrubland, Montane Tropical, Seasonally Dry Tropical, Subalpine or Subarctic, Subtropical, Subtropical and Tropical, Temperate, Temperate and Tropical, Wet Tropical`

### Homotypic Synonym (Remark)
The synonym type - TRUE if homotypic synonym, otherwise NA. See ICN for algae, fungi and plants: https://www.iapt-taxon.org/nomen/main.php
