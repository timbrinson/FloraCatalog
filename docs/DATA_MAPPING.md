
# Data Mapping: WCVP Source vs FloraCatalog App

This document maps the columns from the World Checklist of Vascular Plants (WCVP) download to the internal data structures (`Taxon` interface) and UI components (`DataGridV2`) of the FloraCatalog application.

**Source:** `docs/README_WCVP.csv`

| WCVP Column | WCVP Value | WCVP Class | WCVP Description | WCVP Remark | App Attribute (`Taxon`) | Grid Column (`DataGridV2`) | Grid Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SYSTEM / APP** | | | | | | | |
| — | — | — | — | — | `id` | `id` | Internal ID |
| — | — | — | — | — | `parentId` | `parentId` | Parent ID |
| — | — | — | — | — | — | `treeControl` | Tree |
| — | — | — | — | — | — | `childCount` | # |
| — | — | — | — | — | — | `actions` | Actions |
| **IDENTIFIERS** | | | | | | | |
| `plant_name_id` | | chr | World Checklist of Vascular Plants (WCVP) identifier | | `plantNameId` | `plantNameId` | WCVP ID |
| `ipni_id` | | chr | International Plant Name Index (IPNI) identifier. | Missing values indicate that the name has not been matched with a name in IPNI or is missing from IPNI. | `ipniId` | `ipniId` | IPNI ID |
| `powo_id` | | chr | identifier required to look up the name directly in Plants of the World Online (Powo) | | `powoId` | `powoId` | POWO ID |
| **TAXONOMY** | | | | | | | |
| `taxon_name` | | chr | Concatenation of genus with species and, where applicable, infraspecific epithets to make a binomial or trinomial name. | | `scientificName` | `scientificName` | Scientific Name |
| `family` | | chr | The name of the family to which the taxon belongs. | (The highest rank at which names are presented in WCVP). | `family` | `family` | Family |
| `genus` | | chr | The name of the genus to which the record refers. | | `genus` | `genus` | Genus |
| `genus_hybrid` | +, × | chr | Indication of hybrid status at genus level: + indicates a graft-chimaera and × indicates a hybrid. | | `genusHybrid` | `genusHybrid` | GH |
| `species` | | chr | The species epithet which is combined with the genus name to make a binomial name for a species. | Empty when the taxon name is at the rank of genus. | `species` | `species` | Species |
| `species_hybrid` | +, × | chr | Indication of hybrid status at species level: + indicates a graft-chimaera and × indicates a hybrid. | | `speciesHybrid` | `speciesHybrid` | SH |
| `infraspecific_rank` | agamosp., convar., ecas., f., grex, group, lusus, microf., microgene, micromorphe, modif., monstr., mut., nid, nothof., nothosubsp., nothovar., positio, proles, provar., psp., stirps, subf., sublusus, subproles, subsp., subspecioid, subvar., unterrasse, var. | chr | The taxonomic rank of the infraspecific epithet. | Empty where the taxon name is species rank or higher. For more information, see the International Code of Nomenclature for algae, fungi and plants: https://www.iapt-taxon.org/nomen/main.php | `infraspecificRank` | `infraspecificRank` | I Rank |
| `infraspecies` | | chr | The infraspecific epithet which is combined with a binomial to make a trinomial name at infraspecific rank. | Empty when taxon name is at species rank or higher. | `infraspecies` | `infraspecies` | Infraspecies |
| — | — | — | — | — | `cultivar` | `cultivar` | Cultivar |
| `taxon_rank` | Convariety, Form, Genus, proles, Species, Subform, Subspecies, Subvariety, Variety | chr | The level in the taxonomic hierarchy where the taxon name fits. Some infraspecific names are unranked and will have no value in this column. | | `rank` | `rank` | Rank |
| `taxon_status` | Accepted, Artificial Hybrid, Illegitimate, Invalid, Local Biotype, Misapplied, Orthographic, Synonym, Unplaced, Provisionally Accepted | chr | Indication of nomenclatural status and taxonomic opinion re the name: see details in main text. | Names with status ‘Provisionally Accepted’ are unplaced names that have synonyms, following the GBIF classification and only used within the Darwin Core Archive downlaod. | `taxonomicStatus` | `taxonomicStatus` | Status |
| `hybrid_formula` | | chr | parents of hybrid | | `hybridFormula` | `hybridFormula` | Hybrid Formula |
| **AUTHORSHIP** | | | | | | | |
| `taxon_authors` | | chr | Concatenation of parenthetical and primary authors. | Missing values indicate instances where authorship is unknown or non-applicable (e.g. autonyms). | `authorship` | `authorship` | Authorship |
| `parenthetical_author` | | chr | The author of the basionym. | Empty when there is no basionym. | `parentheticalAuthor` | `parentheticalAuthor` | Parenthetical Author |
| `primary_author` | | chr | The author or authors who published the scientific name. | Missing values indicate instances where authorship is non-applicable (i.e. autonyms) or unknown. | `primaryAuthor` | `primaryAuthor` | Pub. Author |
| `publication_author` | | chr | The author or authors of the book where the scientific name is first published when different from the primary author. | Missing values indicate instances where the primary author is also the author of the book or non-applicable (i.e. autonyms). | `publicationAuthor` | `publicationAuthor` | Pub. Author |
| `replaced_synonym_author`| | chr | The author or authors responsible for publication of the replaced synonym. | Empty when the name is not a replacement name based on another name. | `replacedSynonymAuthor` | `replacedSynonymAuthor` | Authorship |
| **PUBLICATION** | | | | | | | |
| `place_of_publication` | | chr | The journal, book or other publication in which the taxon name was effectively published. Missing values indicate instances where publication details are unknown or non-applicable (i.e. autonyms). | Abbreviated for brevity | `publication` | `publication` | Publication |
| `volume_and_page` | | chr | The volume and page numbers of the original publication of the taxon name, where "5(6): 36" is volume 5, issue 6, page 36. Missing values indicate instances where publication details are unknown or non-applicable (i.e. autonyms). | Not all volumes include issue number | `volumeAndPage` | `volumeAndPage` | Vol/Page |
| `first_published` | | chr | The year of publication of the name, enclosed in parentheses. Missing values indicate instances where publication details are unknown or non-applicable (i.e. autonyms). | | `firstPublished` | `firstPublished` | First Published |
| `nomenclatural_remarks` | | chr | Remarks on the nomenclature. | Preceded by a comma and space (", ") for easy concatenation. | `nomenclaturalRemarks` | `nomenclaturalRemarks` | Nom. Remarks |
| `reviewed` | | chr | Flag indicating whether the family to which the taxon belongs has been peer reviewed. | | `reviewed` | `reviewed` | Reviewed |
| **BIOLOGY / GEO** | | | | | | | |
| `geographic_area` | | chr | The geographic distribution of the taxon (for names of species rank or below): a generalised statement in narrative form. | See https://wcsp.science.kew.org/about.do#geography for details | `geographicArea` | `geographicArea` | Geography |
| `lifeform_description` | | chr | The lifeform (or lifeforms) of the taxon. Terms refer to a modified verison of the Raunkiær system. Missing values if unknown. | See https://wcsp.science.kew.org/about.do#lifeforms for a glossary of terms used | `lifeformDescription` | `lifeformDescription` | Lifeform |
| `climate_description` | Desert and Dry Shrubland, Desert or Dry Shrubland, Montane Tropical, Seasonally Dry Tropical, Subalpine or Subarctic, Subtropical, Subtropical and Tropical, Temperate, Temperate and Tropical, Wet Tropical | chr | Habitat type of the taxon, derived from published habitat information. | | `climateDescription` | `climateDescription` | Climate |
| **LINKS / RELATIONS** | | | | | | | |
| `accepted_plant_name_id` | | chr | The ID of the accepted name of this taxon. Where the taxon_status is "Accepted", this will be identical to the plant_name_id value. May be empty if taxon status is unplaced, ilegitimate, or in some cases where the accepted name is not a vascular plant (e.g. a moss, alga or animal). | | `acceptedNameId` | `acceptedNameId` | Accepted ID |
| `basionym_plant_name_id` | | chr | ID of the original name that taxon_name was derived from. If there is a parenthetical author it is a basionym. If there is a replaced synonym author it is a replaced synonym. If empty there have been no name changes. | | `basionymId` | `basionymId` | Basionym ID |
| `parent_plant_name_id` | | chr | ID for the parent genus or parent species of an accepted species or infraspecific name. Empty for non accepted names or where the parent has not yet been calculated. | | `parentPlantNameId` | `parentPlantNameId` | Parent ID |
| `homotypic_synonym` | | logical | The synonym type - TRUE if homotypic synonym, otherwise NA. | For more information, see the International Code of Nomenclature for algae, fungi and plants: https://www.iapt-taxon.org/nomen/main.php | `homotypicSynonym` | `homotypicSynonym` | Internal ID |
| — | — | — | — | — | `commonName` | `commonName` | Common Name |
| — | — | — | — | — | `description` | `description` | Description |
| — | — | — | — | — | `referenceLinks` | — | — |
| — | — | — | — | — | `synonyms` | — | — |
