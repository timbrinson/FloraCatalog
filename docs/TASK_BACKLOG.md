# Project Roadmap & Task Back backlog

This document tracks planned features and technical improvements to ensure continuity across development sessions.
## Work on Now
- [ ] **Index Cleanup and Refinement:** Update manual and automated DB installation scripts where needed Output any new scripts that need to be ran manually. Indicate any inndices that need to be removed manually.
  1. Need an index on infraspecies_rank. Filtering on this usually timesout.
  2. Need an index on infraspecies. 
  3. "idx_app_taxa_name_sort" and "idx_app_taxa_name_exact" are two identical indices on taxon_name. Which to keep?
  4. "idx_app_taxa_source" and "idx_app_taxa_source_id" are two identical indices on source_id. Which to keep?
  5. There are two other indices on source_id that are similar. Can we keep just one? These are:
    - CREATE INDEX idx_app_taxa_source_id_filter ON public.app_taxa USING btree (source_id) WHERE ((source_id IS NULL) OR (source_id <> 1))
    - CREATE INDEX idx_app_taxa_source_nulls ON public.app_taxa USING btree (source_id) WHERE (source_id IS NULL)

## High Priority
- [ ] **Implement Ingestion Engine:** Rewrite the Add Plant functionality by following the Ingestion Engine design to implement the 5-stage validation pipeline and continuing to adhere to other decisions.
- [ ] **Fix Finding Plant Details:** The Icon Button for searching for plant details doesn't function. Also the Icon is not obvious what it does. I'm not sure which of the two Icons to select but neither works. The Icon button needs a tool tip saying what it does.
    * **Human Note:** The Tooltips are working and do help. The icons are not obvious but maybe others would not either. Actions gets stuck with activity "Initializing AI curator..." and never finishes. The same wording is used in the Activity Panel for both so you can't tell them apart.
- [ ] **Fix Missing Controls for Adding Plants:**
    * **Human Note:** Bulk Upload was removed as the AI rewrote the Add Plant interface after the file was corrupted where it simplified things due to many issues found when adding plants. Needs implemented again after the Ingestion Engine is implemented and ading a single plant is working smoothly.
    > **AI Context:** Implemented AddPlantModal with AI-assisted taxonomic parsing via Gemini 3 Pro. Restored Bulk Upload capability with .txt/.csv file parsing. Integrated all "Add" operations with the Activity Panel for asynchronous tracking and background processing. Cleaned up legacy files: PlantCard.tsx, ProcessMonitor.tsx, and defaultData.ts.
- [ ] **Traceability & Lineage Framework:**
    * **Human Note:** Source Attribution was removed as the AI rewrote the Add Plant interface after the file was corrupted where it simplified things due to many issues found when adding plants. Needs implemented again after the Ingestion Engine is implemented.
    > **AI Context:** Implemented mandatory Source Attribution in AddPlantModal. Integrated app_data_sources registry to track "Who, What, When, and How." Manual additions now capture App Version (v2.18.0), process context, and timestamp. Locked down WCVP source from manual attribution selection. Added case-insensitive matching for lineage detection. Resolved statement timeouts in Purge utility by switching to ID-chained deletion.

## Medium Priority
- [ ] **Fix Expand/Collapse Levels:** This functionality was developed for the older string based hierarchy and does not work with Authority (IDs) for hierarchy, other than Family level.
- [ ] **Sorting on Family:** With the new grid tree using Authority (IDs) and Family colums/rows turned on, it is not sorting by genus and adding the family abve it. Can we make it sort on Family and group all the Genus under the one instance of a particular family?
- [ ] **Create Records for Family:** We have done a lot of work to accomodate Family level when it exists as an attribute and not a record or WCVP rank. Should we create records for all Family values used in WCVP? We would add teh Family Rank as an extension (like was done for Cultivar). We would need a special Status as well like 'Generated' or Extrapulated', that is an extension of teh WCVP vales (like was done for Registered and Provisional). 
- [ ] **Clean Up Zombie Scripts:** As we developed the manual and then automated installation scripts there were a lot of changes in order to get them to work. It is not clear which are still valid and which should be archoived or deleted. It would be good to maintain both path's for installation. The manual path is good for training someone to understand the steps. The automated one is best for productivity. We need to organize the long list of scripts by seting up functional and/or logical folders.
- [ ] **DataGrid & Model Consistency Audit:** Perform a line-by-line audit of DataGrid.tsx and the dataService.ts mappers to identify "Hidden Regressions." Specifically: (1) Ensure all cell renderers have type-safety checks to prevent rendering objects/arrays in spans, (2) Verify that every property used in the UI matches the Data Mapping document exactly (e.g., resolving the childCount vs descendantCount naming conflict), and (3) Ensure all ReactNode casting satisfies the compiler without using any.
- [ ] **Cache Limits:** If we keep scrolling in the grid it will continue to load more and more plants. We should have a caching scheme that can expire earlier loaded plants at some point. If the user scrolls back to to the top it would recache those that expired so that from the user's perspective it is continuous.
- [ ] **Fetch During Collapsed Tree View:** When the grid in tree view and it is collapsed to a partular level (1,2,3,etc.) where only a few plans are displayed then fetch more plants to ayt least fill the display and allow scrolling to fetch/load even more. 
- [ ] **Activity Panel Evolution:** Enhance the Task Orchestrator to support broader background operations. (1) Optimize the layout for monitoring multiple concurrent processes, (2) Implement "Task History" to allow users to review processing details and data outcomes after the fact for the duration of the current session, and (3) Implement interactive "Checkpoint" UI where the system pauses for user review before committing large-scale changes to the shared database.
- [ ] **Build Out Details Panel:** It would show all the data for the plant organized in sections. At least any sections with a lot of information is collapsable. Include origin, history, background. Include growing conditions. Include A.K.K section. Include Physical Description section. Give it an edit mode so data can be updated (for those with the correct role).
- [ ] **Inheriting from Parents:** Since lower level taxons are a specialization of the parent can they inherit certain attributes (inherited) if those attributes are not set an the child? This would not include things like status or authorship but would include climate, geography and lifeform. May want to make it clear to the user when a description is inherited (inherited) vs specific (specialized) to that taxon.
- [ ] **Redirecting to Accepted Taxon:** Need to figure out how to handle if someone searches/filters on a synonym, how to best direct them to the accepted taxa. Would be nice if it was done automatically. Would need to explain to the user since there would be a context shift. Might want to have synonyms (and other related taxa) show up as another level in the tree, below the accepted taxa. Or this could just be on the details panel.
- [ ] **A.K.A. in Details Panel:** Update the SynonymType under types.ts to be AKATypes with values to cover scientific (WCVP Accepted/Synonyms), trade names, trademarks, registered trademarks, patents, common names, Other Cultivars, misapplied, commonly misrepresented, unspecified, etc. Anchoring to scientific (WCVP) and horticultural (ICRA) standards is required. The Details Panel would have a collapsable section called "A.K.A". There would be a way to easily distinguish the AKATypes of the entries. If this taxon has an acceptedPlantNameId then the Taxon Name of it is shown with a link to that entry. If there are other plants with this acceptedPlantNameId for this plant then their Taxon Name of it is shown with a link to that entry. Include references to reputable websites. Include brief quotes about plants from reputable sources, with proper citing and references to the source. Follow guidance provided by Google AI - see document of session conversation.
- [ ] **Physical Description:**  Include as a section in the Details Panel. Include things like plant size-Height/width, growth rate, Plant shape, plant overall texture, floliage shape, foliage size, foliage texture, foliage color, variation throughout the year, Flowering period, flower color and description, description of base/rooting system- type (bulb, rhizonme, etc.), size, shape, etc. Also include special characteristics for the type of plant it is.

## Low Priority
- [ ] **Personalized Collection:** There is a need for a user to identify the subset of plants they care about (personalized collection of data) so they don't have to weed through the full set of plants every time. 
- [ ] **Garden Collection:** There is a need for a user to track their own collection of plants that tie back to recorded plant info. 
- [ ] **Index Expansion:** Add indexes to all filterable columns in `app_taxa` to prevent 57014 Database Timeouts during complex grid filtering.
- [ ] **3-Tier Architecture Transition:** Move database logic to a dedicated server/API layer to support scaling beyond free-tier and browser limitations.
- [ ] **Infrastructure Maintenance:** Address the need for a paid Supabase plan as the database exceeds logical storage limits (~1.9GB currently).
- [ ] **Lifeform Multiselect Filter:** Create a multiselect filter for the lifeform_description column (which uses the Raunkiær terminology). Previous exact-match implementation (v2.18.2) proved insufficient for complex Raunkiær strings. Future implementation requires case-insensitive substring search or GIN-index support. Nice to have would be an extension to allow logical AND. Another nice to have extension would handle filtering based on logical subtypes and descritptive terms.
- [ ] **User Authentication:** Use the Supabase Authentication for end users. Turn on RLS. Use correct API Key (not anon).
- [ ] **Create Role Based Access:** Start with at least a readonly and a read/write (or admin) role. In future expand role to allow adding Cultivars and editing those that you add. Possibly this would be a role tied to particular plant types (e.g. conifers or succulents) or specific taxon layers (Acer palmatum or Hosta). Possibly another future role to add Genus, Species and Infraspecies.
- [ ] **Architect as 3 Tier App:** Makre sure this can run as a 3 tier app, even though testing in AI Studio would be running both a server and client tiers. What are options for where to run the server tier for a web application? What is the path to production? Automate as much as possible.
- [ ] **Offline Storage:** Use PouchDB/IndexedDB to allow full cataloging without an internet connection, syncing when online.
- [ ] **Export/Import:** Implement CSV/Excel export for the current filtered view in the Data Grid.
- [ ] **Real-time Sync:** Implement Supabase `REALTIME` listeners to update the grid automatically when background mining processes finish.
- [ ] **Image Integration:** Add support for `imageConfig` in Gemini to generate or fetch botanical illustrations for the `app_taxon_details` view.
- [ ] **Hybrid Formula Builder:** A UI tool to help users select two existing taxa to create a new Hybrid record with a valid `hierarchy_path`.
- [ ] **Advanced Filtering:** Add "Range" filters for numerical columns like `firstPublished`.
- [ ] **Geographic Mapping:** Use Gemini Maps Grounding to convert the `geographicArea` text strings into interactive map markers.
- [ ] **Extending Genus, Species, Infraspecies:** There is a lot of work done outside of WCVP that identifies plants which may eventually be adopted in WCVP. At this time I have not concluded whether to allow adding these to the app. First question is if we allowed adding Genus, Species and Infraspscies that are not in WCVP does this design support that or if it doesn't would it be difficult to add later?

## Documentation Quality & Sovereignty (Recurring)
- [ ] **Documentation Audit:** Periodically review all `docs/` files to ensure they remain human-readable and haven't drifted into "AI-only" technical jargon. Verify that the "Why" is as well-documented as the "How."
- [ ] **Knowledge Sovereignity Sync:** Ensure every major decision made during chat is reflected in an ADR or functional spec to prevent contextual drift in future sessions.

## Technical Debt / Polish
- [ ] **Mobile Responsiveness:** The Data Grid is currently optimized for desktop; implement a "Card View" fallback for mobile screens.
- [ ] **Query Optimization:** Move the "Hierarchy Path" calculation to a Postgres Trigger to remove the need for Step 7 in the manual build process.
- [ ] **Error Handling:** Add a global Error Boundary and more granular toast notifications for AI service timeouts.
- [ ] **Batch Purging Logic:** Implement a chunked deletion strategy for the "Purge Cultivars" tool in dataService.ts to avoid Postgres statement timeouts on large datasets.


## Archive
- [x] **Stop Grid Flash** 
    > **AI Context:** Partially resolved in v2.29.0 via a "Render Blocking" lifecycle guard. The application now remains in a loading state until saved settings are retrieved or a timeout occurs. Minor frame flicker persists during data-stream ingestion, but the "System Default" transition is mitigated.
- [x] **Save Settings:** Implemented cloud persistence for grid layout, filters, and theme preferences. Users can manually Save and Reload configuration via the Persistence panel in Settings (v2.28.0).
- [x] **Fix Core Filter Dropdowns:** Standardized ranks, status and infraspecific ranks used in grid filter. Options and UI elements now match database capitalization exactly.
- [x] **Fix Climate Filter:** Restored specific small-case literals to match DB data.
- [x] **Lifeform Filter as Text:** Change the Lifeform filter back to just text instead of a multi-select.
- [x] **Unselect All Columns:** (Fixed - Pending User Verification) 
    > **AI Context:** Added "Hide All" button next to "Show All" in the Column Picker menu in DataGrid.tsx.
- [x] **Fix Genus Column for Family:** (Fixed - Pending User Verification) 
    > **AI Context:** Updated getRowValue in DataGrid.tsx to return an empty string for the 'genus' column when taxonRank is 'Family'.
- [x] **Optimize Filtering:** Review the rules used for dynamic filtering in dataService.ts. 
    > **AI Context:** Implemented Hybrid Search Engine toggle and Intelligent Auto-Casing.
- [x] **Fix 57014 Errors:** 
    > **AI Context:** Implemented UX mitigations to handle "Database timeout (57014)" errors via Commit-on-Enter logic.
- [x] **Files to Delete:** User manually verified and deleted legacy files: PlantCard.tsx, ProcessMonitor.tsx, and defaultData.ts.
- [x] **Intelligent Hierarchy Binding:** Added findTaxonByName to dataService.
- [x] **Traceability & Lineage Framework:** Implemented mandatory Source Attribution in AddPlantModal.
- [x] **How To Reset Cultivars:** (Fixed - Pending User Verification) 
    > **AI Context:** Implemented split maintenance utility in SettingsModal.
- [x] (To be replaced with new Ingestion Engine Design) **Redesigned "Add Plant" Process to Follow Hybrid Intelligence Framework.**
- [x] **Implement Grid Display Spec:** Fix the hierarchical display of plants in tree mode by following the Grid Display Spec design.
- [x] **Load "virtual-root" Parents (Hydration):** Trigger a fetch to replace the virtual-root with the real parent record.
- [x] **Fixed Fragmentation:** Resolved the "Double Family" bug where cultivars like 'Back in Black' would split.
- [x] **Virtual Row for Generic  Cultivars:** Add a virtual group under Genus to hold generic cultivars.
- [x] **Fix Order for GH and SH:** Move GH before Genus. Move SH before Species.
- [x] **Fix Legend:** It disappeared. (Restored in v2.28.1).
- [x] **Fix Bolding/Dimming:** Some conditions get double dimming.
- [x] **Fix leading X Rule:** treat genus starting X as a hybrid.
- [x] **Simplify Legend Colors:** Remove the specific infraspecies ranks (Subspecies, Variety, Form) and just have Infraspecies to represent any of them. Replace Subvariety and Subform with just 'Other'.
- [x] **Rethink Status Selector Colors:** The green for Accepted and Artificial Hybrid looks too much like the green for Genus. Everything else is currently just black (or dark gray) on light gray. We should stay away from using any colors related to the rank and grid background. Let's use black on white for Accepted, Articial Hybrid and Registered. Use dark gray on white for Provisional. Use dark gray on light gray for all others.
- [x] **UI to Save Config State:** Provide a UI for the user to explicitly save the config state as opposed to saving it automatically everytime something is changed. Also provide a way to refresh the state from the settings that have been saved.
- [x] **Remove Column Borders:** A couple columns have a border on the right side. Remove it fromm the tree column and the Count column.
- [x] **Pallet for Grid Colors:** Update the configurability of the grid colors. Replace the 4 options 1a, 1b, 2a, and 2b with ability to customize the colors. The customization has selections for each of the five grid levels (family, genus, species, infraspecies, cultivar) with the base Tailwind CSS v3 color, weight for cell wash/background, weight for text, weight for badge wash/background and weight for badge border. Place these toward the bottom of the Seetings panel, above Maintenance.
- [x] **Status Values as Text:** The status values in the grid are badges which draws too much attention to them. Change them to just text (regular font).
- [x] **Rank Values Not Bold:** The rank values in the grid are badges with bold text. Change them to regular font but keep them as badges.