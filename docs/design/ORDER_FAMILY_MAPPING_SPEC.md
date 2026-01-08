# Specification: Order-to-Family Mapping Strategy

## 1. Overview
To extend the FloraCatalog hierarchy above the Family level, the system requires a reliable mapping of Families to their respective Orders. This mapping must adhere to the three globally accepted phylogenetic standards for vascular plants:
- **Angiosperms (Flowering Plants):** APG IV (Angiosperm Phylogeny Group IV).
- **Gymnosperms (Conifers, etc.):** Christenhusz et al. (2011).
- **Pteridophytes (Ferns/Lycophytes):** PPG I (Pteridophyte Phylogeny Group I).

## 2. Implementation Paths

### Path A: The WFO Backbone (Bulk Integration)
**Method:** Download the World Flora Online (WFO) Taxonomic Backbone Darwin Core Archive.
- **Source:** [World Flora Online Data Portal](https://www.worldfloraonline.org/downloadData).
- **Strategy:** Extract the `family` and `order` columns from the primary taxon table.
- **Pros:** Covers all three phylogenetic systems in a single, pre-consolidated CSV/TSV. It is the most efficient method for 1.4 million records.
- **Cons:** Requires a manual download and SQL join pass outside of the standard WCVP build process.

### Path B: Direct Authority Verification (Scientific Fidelity)
**Method:** Cross-reference mappings against the "Gold Standard" digital herbaria.
- **Angiosperms:** [APWeb (Missouri Botanical Garden)](http://www.mobot.org/MOBOT/research/APweb/).
- **Gymnosperms:** [POWO Browser (Kew)](https://powo.science.kew.org/). Kew aligns its browser hierarchy for gymnosperms with Christenhusz.
- **Pteridophytes:** [World Ferns (Michael Hassler)](https://www.worldplants.de/world-ferns/ferns-and-lycophytes-list).
- **Pros:** 100% fidelity to the original authors.
- **Cons:** Extremely high manual effort; difficult to automate for a database of this scale.

### Path C: API Enrichment (Dynamic Discovery)
**Method:** Programmatic enrichment via the Kew/IPNI REST API.
- **Endpoint:** `https://powo.science.kew.org/api/2/taxon/urn:lsid:ipni.org:names:[FAMILY_ID]`
- **Strategy:** Query the API for each distinct Family string. The JSON response contains a `higherClassification` array with the designated Order.
- **Pros:** Uses the same authority as our natural core data (WCVP).
- **Cons:** Subject to API rate limits and requires a script to loop through thousands of unique family names.

## 3. Recommended Workflow for FloraCatalog
1. **Bootstrap Families:** Create the "Derived" Family records based on existing WCVP attributes.
2. **Bulk Enrich:** Use the **WFO Backbone (Path A)** to populate a staging table mapping `family_name` -> `order_name`.
3. **Execute SQL Join:** Perform a one-time update to assign the `parent_id` of Family records to newly created Order records.
4. **Iterative Build:** Re-run the iterative `hierarchy_path` logic (Step 7 of the build process) to incorporate the new "Order" level (Level 0) into the Ltree paths.
