# Data Mapping: WCVP Source vs FloraCatalog App

This document maps the columns from the World Checklist of Vascular Plants (WCVP) download to the internal data structures (`Taxon` interface) and UI components (`DataGrid`) of the FloraCatalog application.

**Source:** `docs/README_WCVP.csv`

| WCVP Column | WCVP Value | WCVP Class | WCVP Description | App Attribute (`Taxon`) | Grid Label | UI Filter Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SYSTEM** | | | | | | |
| — | — | — | — | `id` | Internal ID | Text |
| — | — | — | — | `parentId` | Parent ID | Text |
| — | — | — | — | — | Tree | — |
| **TAXONOMY** | | | | | | |
| `taxon_name` | | chr | Full scientific name | `taxonName` | Taxon Name | Text (Prefix) |
| `family` | | chr | Plant Family | `family` | Family | Text |
| `genus` | | chr | Genus name | `genus` | Genus | Text |
| `genus_hybrid` | +, × | chr | Hybrid marker | `genusHybrid` | GH | Multi-select |
| `species` | | chr | Species epithet | `species` | Species | Text |
| `species_hybrid` | +, × | chr | Hybrid marker | `speciesHybrid` | SH | Multi-select |
| `infraspecific_rank` | subsp, var, f, etc | chr | Rank of epithet | `infraspecificRank` | I Rank | Multi-select |
| `infraspecies` | | chr | Infraspecific epithet | `infraspecies` | Infraspecies | Text |
| `taxon_rank` | Genus, Species, etc | chr | Hierarchical Level | `taxonRank` | Rank | Multi-select |
| `taxon_status` | Accepted, Synonym, etc | chr | Taxonomic Opinion | `taxonStatus` | Status | Multi-select |
| **PUBLICATION** | | | | | | |
| `taxon_authors` | | chr | Full author string | `taxonAuthors` | Authorship | Text |
| `first_published` | | chr | Year of publication | `firstPublished` | First Published | Text |
| `reviewed` | Y / N | chr | Peer reviewed flag | `reviewed` | Reviewed | Multi-select |
| **BIOLOGY / GEO** | | | | | | |
| `geographic_area` | | chr | Native distribution | `geographicArea` | Geography | Text |
| `lifeform_description`| annual, tree, etc | chr | Growth form | `lifeformDescription`| Lifeform | Multi-select |
| `climate_description` | Tropical, etc | chr | Habitat type | `climateDescription` | Climate | Multi-select |
| **IDENTIFIERS** | | | | | | |
| `plant_name_id` | | chr | WCVP primary key | `plantNameId` | WCVP ID | Text |
| `ipni_id` | | chr | IPNI Identifier | `ipniId` | IPNI ID | Text |
| `powo_id` | | chr | POWO Identifier | `powoId` | POWO ID | Text |
