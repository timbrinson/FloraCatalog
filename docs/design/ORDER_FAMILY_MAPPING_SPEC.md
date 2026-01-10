# Specification: Order-to-Family Mapping Strategy

## 1. Overview
To extend the FloraCatalog hierarchy above the Family level, the system requires a reliable mapping of Families to their respective Orders. This mapping adheres to the globally accepted phylogenetic standards (APG IV, Christenhusz, PPG I).

## 2. Implementation Paths

### Path A: The WFO Backbone (Recursive Integration)
**Method:** Use the World Flora Online (WFO) Taxonomic Backbone Darwin Core Archive (`_DwC_backbone_R.zip`).
- **Source ID:** 3 (World Flora Online).
- **Citation:** "WFO (2025): World Flora Online. Version 2025.12. Published on the Internet; http://www.worldfloraonline.org. Accessed on: 2026-01-09".
- **Technical Reality:** WFO uses a normalized hierarchy. The `order` is NOT a flat column. 
- **Strategy:** 
    1. DISTILL data locally (See Section 4) to create a `wfo_family_order_map.csv`.
    2. Import the distilled map into the `wfo_family_order_map` staging table (Source 3).
    3. Create physical 'Order' records (taxonRank = 'Order') where Source = 3.
    4. Perform a SQL update to link existing 'Family' records (Source 2) to their new 'Order' parents (Source 3).
- **Pros:** 100% phylogenetic coverage in a single authority file.
- **Cons:** Raw file is 1GB; requires local Python processing to stay within Supabase Free Tier storage.

## 3. Recommended Workflow for FloraCatalog
1. **Bootstrap Families:** Create the "Derived" Family records based on existing WCVP attributes (Source 2).
2. **Local Distill:** Run `scripts/distill_wfo.py.txt` to extract `family -> order` pairs.
3. **Import Map:** Upload the tiny map file to Supabase staging.
4. **Link Backbone:** Create the Order records (Source 3) and perform the parent update.
5. **Iterative Build:** Re-run Step 11 of the build process to include the "Order" level (Level 0) in the Ltree paths.

## 4. Mandatory Pre-Filtering (Storage Protection)
The raw WFO `classification.csv` is ~950MB. **Loading this directly into Supabase Free Tier will crash the database storage limit.**

**Distillation Protocol:**
The script `scripts/distill_wfo.py.txt` must be used locally:
1. Load `classification.csv`.
2. Map every record where `taxonRank == 'family'` to its `parentNameUsageID`.
3. Resolve that ID to the `scientificName` of the ancestor (the Order).
4. Output a tiny `wfo_family_order_map.csv` (~700 rows, <50KB).
5. Only upload this distilled file to Supabase.