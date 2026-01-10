# Specification: Order-to-Family Mapping Strategy

## 1. Overview
To extend the FloraCatalog hierarchy above the Family level, the system requires a reliable mapping of Families to their respective Orders. This mapping adheres to the globally accepted phylogenetic standards (APG IV, Christenhusz, PPG I).

### 1.1 Phylogenetic Rationale
While higher-level taxonomy remains a dynamic and sometimes contested field in botany, FloraCatalog adopts the **World Flora Online (WFO)** Taxonomic Backbone as its primary phylogenetic frame.

- **The Strategy:** By utilizing WFO for the backbone (Orders/Families) and WCVP for the nodes (Species/Genera), FloraCatalog places the world's most detailed botanical "map" (WCVP) inside the world's most agreed-upon "frame" (WFO). 
- **Neutral Observation:** This choice recognizes WFO as the primary international clearinghouse for the Global Strategy for Plant Conservation. We use it not as an endorsement of a specific taxonomic opinion, but as a robust source for tracking and aligning high-level taxonomic agreement over time.

## 2. Implementation Paths

### Path A: The WFO Backbone (Recursive Integration)
**Method:** Use the World Flora Online (WFO) Taxonomic Backbone Darwin Core Archive (`_DwC_backbone_R.zip`).
- **Source ID:** 3 (World Flora Online).
- **Citation:** "WFO (2025): World Flora Online. Version 2025.12. Published on the Internet; http://www.worldfloraonline.org. Accessed on: 2026-01-09".
- **Technical Reality:** WFO uses a normalized hierarchy. The `order` is NOT a flat column. 
- **Strategy:** 
    1. DISTILL data locally (See Section 4) to create a filtered `wfo_import.csv` containing ranks Family and higher.
    2. Import the filtered data into the `wfo_import` staging table.
    3. Create physical 'Order' records (taxonRank = 'Order') where Source = 3.
    4. Perform a SQL update to link existing 'Family' records (Source 2) to their new 'Order' parents (Source 3) using a self-join on `wfo_import` pointers.
- **Pros:** 100% phylogenetic coverage in a single authority file; standardizes import process.
- **Cons:** Raw file is 1GB; requires local Python processing to stay within Supabase Free Tier storage.

## 3. Recommended Workflow for FloraCatalog
1. **Bootstrap Families:** Create the "Derived" Family records based on existing WCVP attributes (Source 2).
2. **Local Distill:** Run `scripts/distill_wfo.py.txt` to extract `wfo_import.csv`.
3. **Import Staging:** Upload the filtered table to Supabase.
4. **Link Backbone:** Create the Order records (Source 3) and perform the parent update via SQL.
5. **Iterative Build:** Re-run Step 11 of the build process to include the "Order" level (Level 0) in the Ltree paths.

## 4. Mandatory Pre-Filtering (Storage Protection)
The raw WFO `classification.csv` is ~950MB. **Loading this directly into Supabase Free Tier will crash the database storage limit.**

**Distillation Protocol:**
The script `scripts/distill_wfo.py.txt` must be used locally:
1. Load `classification.csv`.
2. Filter for all rows where `taxonRank` is one of: Kingdom, Subkingdom, Phylum, Class, Order, Suborder, Family, Tribe, etc.
3. Output a filtered `wfo_import.csv`.
4. Only upload this filtered staging file to Supabase.