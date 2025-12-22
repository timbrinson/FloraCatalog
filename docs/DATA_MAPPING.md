# Data Mapping: WCVP Source vs FloraCatalog App

This document maps the columns from the World Checklist of Vascular Plants (WCVP) download to the internal data structures (`Taxon` interface), database schema, and UI components of the FloraCatalog application.

**Source:** `text/csv` specification provided 2025-06-04.

| Group | Grid Column | Grid Label | Label Tooltip | App Attribute (`Taxon`) | DB Column | Filter Type | Default | WCVP Column |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | `id` | Internal ID | Internal ID | `id` | `id` | Text | Unselected | — |
| | `parentId` | Parent ID | Parent ID | `parentId` | `parent_id` | Text | Unselected | — |
| | `treeControl` | Tree | Tree Control | — | — | — | Selected | — |
| | `childCount` | # | Child Count | `childCount` | `child_count` | Text | Selected | — |
| | `actions` | Actions | Actions | — | — | — | Unselected | — |
| **Taxonomy** | `taxonName` | Taxon Name | Taxon Name | `taxonName` | `taxon_name` | Text | Selected | `taxon_name` |
| | `taxonRank` | Rank | Taxon Rank | `taxonRank` | `taxon_rank` | Multi-select | Unselected | `taxon_rank` |
| | `taxonStatus` | Status | Taxonomic Status | `taxonStatus` | `taxon_status` | Multi-select | Unselected | `taxon_status` |
| | `family` | Family | Family | `family` | `family` | Text | Unselected | `family` |
| | `hybridFormula` | Hybrid Formula | Hybrid Formula | `hybridFormula` | `hybrid_formula` | Text | Unselected | `hybrid_formula` |
| **Nomenclature** | `genus` | Genus | Genus | `genus` | `genus` | Text | Selected | `genus` |
| | `genusHybrid` | GH | Genus Hybrid | `genusHybrid` | `genus_hybrid` | Multi-select | Selected | `genus_hybrid` |
| | `species` | Species | Species | `species` | `species` | Text | Selected | `species` |
| | `speciesHybrid` | SH | Species Hybrid | `speciesHybrid` | `species_hybrid` | Multi-select | Selected | `species_hybrid` |
| | `infraspecificRank`| I Rank | Infraspecific Rank | `infraspecificRank` | `infraspecific_rank`| Multi-select | Selected | `infraspecific_rank` |
| | `infraspecies` | Infraspecies | Infraspecies | `infraspecies` | `infraspecies` | Text | Selected | `infraspecies` |
| | `cultivar` | Cultivar | Cultivar | `cultivar` | `cultivar` | Text | Selected | — |
| **Descriptive** | `commonName` | Common Name | Common Name | `commonName` | `common_name` | Text | Unselected | — |
| | `description` | Description | Description | `description` | `description` | Text | Unselected | — |
| | — | — | — | `referenceLinks` | `reference_links` | — | Unselected | — |
| | — | — | — | `synonyms` | `synonyms` | — | Unselected | — |
| | `geographicArea` | Geography | Geographic Area | `geographicArea` | `geographic_area` | Text | Unselected | `geographic_area` |
| | `lifeformDescription`| Lifeform | Lifeform Description| `lifeformDescription`| `lifeform_description`| Multi-select | Unselected | `lifeform_description` |
| | `climateDescription` | Climate | Climate Description | `climateDescription` | `climate_description` | Multi-select | Unselected | `climate_description` |
| **Standard Identifiers**| `wcvpId` | WCVP ID | WCVP Plant Name ID | `wcvpId` | `wcvp_id` | Text | Unselected | `plant_name_id` |
| | `ipniId` | IPNI ID | IPNI ID | `ipniId` | `ipni_id` | Text | Unselected | `ipni_id` |
| | `powoId` | POWO ID | POWO ID | `powoId` | `powo_id` | Text | Unselected | `powo_id` |
| **Publication** | `taxonAuthors` | Authorship | Taxon Authors | `taxonAuthors` | `taxon_authors` | Text | Unselected | `taxon_authors` |
| | `primaryAuthor` | Prim. Author | Primary Author | `primaryAuthor` | `primary_author` | Text | Unselected | `primary_author` |
| | `publicationAuthor`| Pub. Author | Publication Author| `publicationAuthor`| `publication_author`| Text | Unselected | `publication_author` |
| | `placeOfPublication`| Pub. Place | Place Of Publication| `placeOfPublication`| `place_of_publication`| Text | Unselected | `place_of_publication`|
| | `volumeAndPage` | Vol/Page | Volume And Page | `volumeAndPage` | `volume_and_page` | Text | Unselected | `volume_and_page` |
| | `firstPublished` | First Published | First Published Date | `firstPublished` | `first_published` | Text | Unselected | `first_published` |
| | `nomenclaturalRemarks`| Nom. Remarks| Nomenclatural Remarks| `nomenclaturalRemarks`| `nomenclatural_remarks`| Text | Unselected | `nomenclatural_remarks`|
| | `reviewed` | Reviewed | Reviewed | `reviewed` | `reviewed` | Multi-select | Unselected | `reviewed` |
| **Related Plants** | `homotypicSynonym` | Homotypic Syn.| Homotypic Synonym | `homotypicSynonym` | `homotypic_synonym` | Text | Unselected | `homotypic_synonym` |
| | `acceptedPlantNameId`| Accepted ID | Accepted Plant Name ID| `acceptedPlantNameId`| `accepted_plant_name_id`| Text | Unselected | `accepted_plant_name_id`|
| | `parentheticalAuthor`| Paren. Author| Parenthetical Author| `parentheticalAuthor`| `parenthetical_author`| Text | Unselected | `parenthetical_author`|
| | `replacedSynonymAuthor`| Syn. Author | Replaced Synonym Author| `replacedSynonymAuthor`| `replaced_synonym_author`| Text | Unselected | `replaced_synonym_author`|
| | `parentPlantNameId` | Parent Plant ID| Parent Plant Name ID | `parentPlantNameId` | `parent_plant_name_id`| Text | Unselected | `parent_plant_name_id`|
| | `basionymPlantNameId`| Basionym ID | Basionym Plant Name ID| `basionymPlantNameId`| `basionym_plant_name_id`| Text | Unselected | `basionym_plant_name_id`|

## Technical Notes

### Infraspecific Ranks
The `infraspecificRank` column supports the following vocabulary (from WCVP):
`agamosp., convar., ecas., f., grex, group, lusus, microf., microgene, micromorphe, modif., monstr., mut., nid, nothof., nothosubsp., nothovar., positio, proles, provar., psp., stirps, subf., sublusus, subproles, subsp., subspecioid, subvar., unterrasse, var.`

### Taxonomic Status
Supported statuses include: 
`Accepted, Artificial Hybrid, Illegitimate, Invalid, Local Biotype, Misapplied, Orthographic, Synonym, Unplaced, Provisionally Accepted`.

### Habitat / Climate
Climate categories derived from WCVP:
`Desert and Dry Shrubland, Desert or Dry Shrubland, Montane Tropical, Seasonally Dry Tropical, Subalpine or Subarctic, Subtropical, Subtropical and Tropical, Temperate, Temperate and Tropical, Wet Tropical`.
