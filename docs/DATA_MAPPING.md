# Data Mapping: WCVP Source vs FloraCatalog App

This document maps the columns from the World Checklist of Vascular Plants (WCVP) download to the internal data structures (`Taxon` interface) and UI components (`DataGrid`) of the FloraCatalog application.

**Source:** `docs/README_WCVP.csv`

| WCVP Column | WCVP Value | WCVP Class | WCVP Description | App Attribute (`Taxon`) | Grid Label | UI Filter Type | Database Column |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SYSTEM** | | | | | | | |
| — | — | — | — | `id` | Internal ID | Text | `id` |
| — | — | — | — | `parentId` | Parent ID | Text | `parent_id` |
| — | — | — | — | — | Tree | — | — |
| **TAXONOMY** | | | | | | | |
| `taxon_name` | | chr | Full scientific name | `taxonName` | Taxon Name | Text (Prefix) | `taxon_name` |
| `family` | | chr | Plant Family | `family` | Family | Text | `family` |
| `genus` | | chr | Genus name | `genus` | Genus | Text | `genus` |
| `genus_hybrid` | +, × | chr | Hybrid marker | `genusHybrid` | GH | Multi-select | `genus_hybrid` |
| `species` | | chr | Species epithet | `species` | Species | Text | `species` |
| `species_hybrid` | +, × | chr | Hybrid marker | `speciesHybrid` | SH | Multi-select | `species_hybrid` |
| `infraspecific_rank`| subsp, var, etc| chr | Rank of epithet | `infraspecificRank` | I Rank | Multi-select | `infraspecific_rank` |
| `infraspecies` | | chr | Infraspecific epithet| `infraspecies` | Infraspecies | Text | `infraspecies` |
| `taxon_rank` | Genus, Species, etc| chr | Hierarchical Level | `taxonRank` | Rank | Multi-select | `taxon_rank` |
| `taxon_status` | Accepted, Synonym| chr | Taxonomic Opinion | `taxonStatus` | Status | Multi-select | `taxon_status` |
| **PUBLICATION** | | | | | | | |
| `taxon_authors` | | chr | Full author string | `taxonAuthors` | Authorship | Text | `taxon_authors` |
| `first_published` | | chr | Year of publication | `firstPublished` | First Published | Text | `first_published` |
| `reviewed` | Y / N | chr | Peer reviewed flag | `reviewed` | Reviewed | Multi-select | `reviewed` |
| **BIOLOGY / GEO** | | | | | | | |
| `geographic_area` | | chr | Native distribution | `geographicArea` | Geography | Text | `geographic_area` |
| `lifeform_description`| annual, tree, etc| chr | Growth form | `lifeformDescription`| Lifeform | Multi-select | `lifeform_description` |
| `climate_description` | Tropical, etc | chr | Habitat type | `climateDescription` | Climate | Multi-select | `climate_description` |
| **IDENTIFIERS** | | | | | | | |
| `plant_name_id` | | chr | WCVP primary key | `wcvpId` | WCVP ID | Text | `wcvp_id` |
| `ipni_id` | | chr | IPNI Identifier | `ipniId` | IPNI ID | Text | `ipni_id` |
| `powo_id` | | chr | POWO Identifier | `powoId` | POWO ID | Text | `powo_id` |
| **RELATED** | | | | | | | |
| `homotypic_synonym` | | logical | Linked synonyms | `homotypicSynonym` | Homotypic Syn. | Text | `homotypic_synonym` |
| `accepted_plant_name_id`| | chr | Accepted name ID | `acceptedPlantNameId`| Accepted ID | Text | `accepted_plant_name_id`|
| `parent_plant_name_id` | | chr | Parent node ID | `parentPlantNameId` | Parent Plant ID | Text | `parent_plant_name_id` |
