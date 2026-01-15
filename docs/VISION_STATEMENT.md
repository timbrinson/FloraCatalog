# Vision & Global Botanical Context

## The Problem: Data Fragmentation
In the world today, there is no single authoritative source for comprehensive plant information. Knowledge is siloed across thousands of institutions, websites, and registries. This presents several critical challenges:
- **Conflicting Data:** Significant discrepancies exist across different sites regarding plant hardiness, origins, and descriptions.
- **Fact vs. Opinion:** It is often difficult for researchers and gardeners to distinguish between verified botanical facts and horticultural opinions.
- **Name Collisions:** Different sites frequently use different names for the same plant, or the same name for different plants, with no universal catalog to resolve the ambiguity.
- **The Context Gap:** Information is currently fragmented across specialized plant communities, specialist nurseries, universities, scientific organizations, online catalogs, and commercial sales sites. Users lack a unified record that integrates nomenclature with the rich heritage, performance, and descriptive depth found across the horticultural spectrum.

### 1.1 Scientific Reality vs. Data Integrity
A core tenet of the FloraCatalog mission is **Nomenclature Sovereignty**. We do not "fix" authoritative data to fit technical templates. 

- **Handling Scientific Gaps:** Modern phylogenies (such as APG IV for Angiosperms) intentionally omit certain ranks that were common in historical Linnaean systems. For example, most flowering plants skip the rank of **Class**. 
- **Intentional Omissions:** When a database record shows a Phylum linking directly to an Order, this is considered a successful representation of scientific truth, not a missing data point. 
- **UI Logic:** Our interface is designed to gracefully handle these "jumped" levels without forcing artificial data into the database. This ensures the catalog remains a high-fidelity mirror of real-world botanical consensus.

## Three Levels of Botanical Reality
Plant information exists at three distinct layers, yet no universal system exists to tie them together holistically:
1.  **Higher Level Classification:** Categories above Genus (Families, Orders).
2.  **Natural Nomenclature:** Naturally occurring plants (Genus, Species, Infraspecies).
3.  **Cultivated Plants:** Human-selected variations (Cultivars, Grexes, Trade Names).

## The FloraCatalog Mission: Bridging the Gap
FloraCatalog is a botanical bridge that anchors diverse collections to authoritative scientific standards (WCVP) and horticultural registration standards (ICRA). We build a multi-layered, shared knowledge base upon the advanced work of existing authorities.

### The UI Philosophy: Findability & Density
We recognize that for a botanical catalog, the user interface is the primary value driver.
- **Multi-Dimensional Data Dashboard (90% Priority):** A flexible, high-density interface designed for instant findability. It allows users to slice and group millions of records—spanning the vast WCVP baseline and an ever-expanding library of garden cultivars and hybrids—transforming massive datasets into a shared, navigable collection.
- **Universal Plant Profile (Details Panel):** While the grid handles "Findability," the Details Panel provides "Depth." This panel is a high-fidelity repository for everything known about a plant, consolidated from scientific checklists and horticultural trade sources.
- **Background Task Orchestrator (Activity Panel):** A centralized hub for monitoring and auditing long-running operations. It allows users to track real-time progress, resolve nomenclature ambiguities, and review the processing details and outcomes after the fact during the current session.

### 1. The Natural Core (WCVP)
We use the **World Checklist of Vascular Plants (WCVP)** as our foundational scientific backbone. 
- **Role:** It provides the primary scientific standard for natural nomenclature (Genus, Species, Infraspecies).
- **Status:** WCVP is the most trusted resource in the botanical community, serving as the backbone for major efforts like *Plants of the World Online (POWO)* and the *World Flora Online (WFO)*.

#### Why WCVP? (Scientific Justification)
FloraCatalog selects WCVP due to its unique combination of rigor and dynamism:
- **Expert-Driven Curation:** Status of every name is determined by expert compilers based on peer-reviewed literature and global consensus.
- **Evidence-Based Transparency:** Each taxonomic decision is explicitly linked to supporting references.
- **Continuous Currency:** Incorporates user feedback and new publications weekly.
- **Community Trust:** Serves as the foundational "backbone" for the world's leading botanical gardens and research institutions.

### 2. The Phylogenetic Frame (WFO)
While higher-level taxonomy (especially at the Phylum/Class level) can still be a "moving target" in botany, FloraCatalog utilizes the **World Flora Online (WFO)** Taxonomic Backbone as its primary phylogenetic frame for levels at and above the Order level.

- **Succession:** WFO is the direct successor to *The Plant List* and acts as the official clearinghouse for the **Global Strategy for Plant Conservation**.
- **Strategic Alignment:** By using WFO for the backbone (Orders/Families) and WCVP for the nodes (Species/Genera), the system essentially uses the world's most detailed botanical "map" (WCVP) inside the world's most agreed-upon "frame" (WFO). 
- **Neutral Tracking:** This choice does not imply universal agreement with every taxonomic decision within the WFO dataset. Rather, it recognizes WFO as the most comprehensive source currently integrating international agreement at the Order level, making it the most reliable baseline for tracking phylogenetic data over time.

### 3. The Cultivated Layer (ICRAs & Community)
We leverage the registration standards of **International Cultivar Registration Authorities (ICRAs)** as the next foundational layer of the catalog.
- **Role:** These organizations manage cultivar names following the *International Code of Nomenclature for Cultivated Plants (ICNCP)*.
- **Connectivity:** We tie these registration lists directly to the accepted WCVP natural plant names.
- **Non-Authoritative Cultivars:** Since many popular, accessible, and relevant cultivated plants do not get registered with an ICRA, FloraCatalog allows for the inclusion of these records. However, since these are not from an authoritative registration source, we prioritize "Trusted Sources" while visually distinguishing these records from authoritative data to maintain scientific integrity.

### 4. The Knowledge Layer: Rich Horticultural Context
Recognizing that authoritative lists often lack descriptive depth, FloraCatalog enriches records with community-vetted and AI-curated data:
- **Physical Description:** Granular data on size (height/width), shape, color, and texture for all plant parts (foliage, flowers, stems, and underground growth).
- **Temporal Dynamics:** Documentation of growth rates, seasonal variation, and flowering periods.
- **Environmental Needs:** Reliable data on growing conditions, hardiness, and ecological requirements.
- **Origin & History:** The "story" of a plant—its discovery, historical background, and development context.

### 5. Universal Nomenclature (A.K.A.)
Beyond scientific synonyms, FloraCatalog serves as a cross-reference for all names a plant is "Also Known As." This includes:
- **Commercial Designations:** Trade names, trademarks, and registered trademarks.
- **Legal Markers:** Plant patents and intellectual property designations.
- **Community Names:** Common names across multiple languages and regions.
- **Usage History:** Identification of misapplied names and common misrepresentations to resolve confusion in the trade.

### 6. Visual Identification & Media
A primary long-term goal is the integration of imagery to aid in identification and appreciation.
- **Scope:** Images documenting various aspects of the plant at different ages, stages of growth, and seasonal conditions.
- **Challenges:** We acknowledge the significant technical challenges (storage/hosting) and legal hurdles (licensing and copyright) associated with high-quality botanical imagery. Our strategy prioritizes linking to trusted external image repositories while selectively hosting community-contributed media.

## Conclusion
By synthesizing scientific rigor (WCVP) with horticultural registration (ICRAs) and rich descriptive context, FloraCatalog provides a path toward a holistic, trusted, and shared source of botanical information.