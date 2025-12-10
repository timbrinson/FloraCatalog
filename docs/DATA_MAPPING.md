
# Data Mapping: WCVP Source vs FloraCatalog App

This document maps the columns from the World Checklist of Vascular Plants (WCVP) download to the internal data structures (`Taxon` interface) and UI components (`DataGridV2`) of the FloraCatalog application.

**Source:** `docs/README_WCVP.csv`

| WCVP Column | WCVP Value | WCVP Class | WCVP Description | WCVP Remark | App Interface (`Taxon`) | Grid Column (`DataGridV2`) | Grid Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SYSTEM / APP** | | | | | | | |
| — | — | — | — | — | `id` | `id` | Internal ID |
| — | — | — | — | — | `parentId` | `parentId` | Parent ID |
| — | — | — | — | — | — | `treeControl` | Tree |
| — | — | — | — | — | — | `childCount` | # |
| — | — | — | — | — | — | `actions` | Actions |
| **IDENTIFIERS** | | | | | | | |
| `plant_name_id` | | chr | World Checklist of Vascular Plants (WCVP) identifier | | `plantNameId` | `plantNameId` | WCVP ID |
| `ipni_id` | | chr | International Plant Name Index (IPNI) identifier | Missing values indicate... | `ipniId` | `ipniId` | IPNI ID |
| `powo_id` | | chr | identifier required to look up the name directly in POWO | | `powoId` | `powoId` | POWO ID |
| **TAXONOMY** | | | | | | | |
| `taxon_name` | | chr | Concatenation of genus with species... | | `scientificName` | `scientificName` | Scientific Name |
| `family` | | chr | The name of the family to which the taxon belongs | Highest rank... | `family` | `family` | Family |
| `genus` | | chr | The name of the genus to which the record refers | | `genus` | `genus` | Genus |
| `genus_hybrid` | +, × | chr | Indication of hybrid status at genus level | | `genusHybrid` | `genusHybrid` | GH |
| `species` | | chr | The species epithet... | Empty when genus | `species` | `species` | Species |
| `species_hybrid` | +, × | chr | Indication of hybrid status at species level | | `speciesHybrid` | `speciesHybrid` | SH |
| `infraspecific_rank` | agamosp., convar., ... | chr | The taxonomic rank of the infraspecific epithet | Empty where species... | `infraspecificRank` | `infraspecificRank` | Infra Rank |
| `infraspecies` | | chr | The infraspecific epithet... | Empty when species... | `infraspecies` | `infraspecies` | Infraspecies |
| — | — | — | — | — | `cultivar` | `cultivar` | Cultivar |
| `taxon_rank` | Genus, Species... | chr | The level in the taxonomic hierarchy | | `rank` | `rank` | Rank |
| `taxon_status` | Accepted, Synonym... | chr | Indication of nomenclatural status... | | `taxonomicStatus` | `taxonomicStatus` | Status |
| `hybrid_formula` | | chr | parents of hybrid | | `hybridFormula` | `hybridFormula` | Hybrid Formula |
| **AUTHORSHIP** | | | | | | | |
| `taxon_authors` | | chr | Concatenation of parenthetical and primary authors | | `authorship` | `authorship` | Authorship |
| `parenthetical_author` | | chr | The author of the basionym | Empty when no basionym | `parentheticalAuthor` | `parentheticalAuthor` | Parenthetical Author |
| `primary_author` | | chr | The author or authors who published the scientific name | | `primaryAuthor` | — | — |
| `publication_author` | | chr | The author or authors of the book... | | `publicationAuthor` | `publicationAuthor` | Pub. Author |
| `replaced_synonym_author`| | chr | The author or authors responsible for publication of the replaced synonym | | `replacedSynonymAuthor` | — | — |
| **PUBLICATION** | | | | | | | |
| `place_of_publication` | | chr | The journal, book or other publication... | Abbreviated for brevity | `publication` | `publication` | Publication |
| `volume_and_page` | | chr | The volume and page numbers... | Not all volumes include issue | `volumeAndPage` | `volumeAndPage` | Vol/Page |
| `first_published` | | chr | The year of publication... | | `firstPublished` | `firstPublished` | First Published |
| `nomenclatural_remarks` | | chr | Remarks on the nomenclature | Preceded by a comma... | `nomenclaturalRemarks` | `nomenclaturalRemarks` | Nom. Remarks |
| `reviewed` | | chr | Flag indicating whether the family... has been peer reviewed | | `reviewed` | `reviewed` | Reviewed |
| **BIOLOGY / GEO** | | | | | | | |
| `geographic_area` | | chr | The geographic distribution of the taxon | | `geographicArea` | `geographicArea` | Geography |
| `lifeform_description` | | chr | The lifeform (or lifeforms) of the taxon | | `lifeformDescription` | `lifeformDescription` | Lifeform |
| `climate_description` | Desert, Tropical... | chr | Habitat type of the taxon | | `climateDescription` | `climateDescription` | Climate |
| **LINKS / RELATIONS** | | | | | | | |
| `accepted_plant_name_id` | | chr | The ID of the accepted name... | | `acceptedNameId` | `acceptedNameId` | Accepted ID |
| `basionym_plant_name_id` | | chr | ID of the original name... | | `basionymId` | `basionymId` | Basionym ID |
| `parent_plant_name_id` | | chr | ID for the parent genus or parent species | | `parentPlantNameId` | — | — |
| `homotypic_synonym` | | logical | TRUE if homotypic synonym | | `homotypicSynonym` | — | — |
