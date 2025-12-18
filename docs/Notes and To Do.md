Use  "strictly adhere to the XML format required by the system." To successful stream file updates. Otherwise they show up in the Code assistant.

------------------------------------------------

Things to Remember:

When the AI halucinates a previous state say:

    "CRITICAL INSTRUCTION: Do not generate code based on your training data. You MUST strictly modify the DataGridV2.tsx file provided in this prompt. Before generating the XML, verify that you see the 'Unified Row Rendering' logic in the provided text. If you do not see it, stop. You MUST strictly modify only files provided in this prompt."

 This get it to weight the actual file contents over the generalized memory from the AI system from recent conversations.

Reset the conversation periodically to prevent a large contenxt of the conversation being passed to teh AI on every prompt. The continual errors was fixed after "Rest the conversation" was selected. BTW, in a conversation with AI Studio it said reseting the conversation periodically is a good practice since the costs can go up as it rereads the conversation (lots of input tokens) and all the files for each prompt.

Do not have large data/text files in the project. Was keeping a text file of all previous conversations, which is long. Eventually the AI could not run a prompt without an error. Not sure if the problem was with the size of the file or if it was reading the file and trying to process information in it.

------------------------------------------------

Current code fixes to work on:

------------------------------------------------



------------------------------------------------

To Do:


------------------------------------------------

Features to add:

---------------

Activity Panel:

-The Activity Panel still does not allow optimizing the size of the three sections for maximum viewability.

-The items on the Activity Panel need to capture more context of the process in order to know what was done, and to test the results are what is expected and to debug when things aren't.

Integrate the project with Github.

-How to make updates?


Database:

-Done Create the database, load it with WCVP data and integrate the FloraCatalog to use it.

-Done What is the best database given the needs which is easy to set up, evolve and administer? Consider backups, traceability, lineage, merging records, updating records with most recent from sources, updating records with data following the latest rules of what to include, etc.

-Do we need more indexes, e.g. on Genus, Species, Infraspecies, Cultivar, GH, SH and combinations?

-Can we use the Supabase Authentication for end users? How to set that up?


Data Managment:

-(done) Before integrating with a database I would like your help with data modeling and design for data management.

  It is important to maintain lineage of the data and have traceability of changes. It needs to be clear the source of information and how it got from the source to the database. It needs proper citation for the source of the information, a timestamp when the information came from the source and a timestamp when the data was added and updated in the database. Also capture what was the process that made the updates.

  The plant information will be coming from multiple sources. The primary source for Genus, Species and Infraspecies levels will be WCVP. WCVP is the source for some Cultivar level plants but most of the Cultivars will be added from other sources. We may allow adding Genus, species and Infraspecies levels from other sources as well but will need to be clear where they came from vs. WCVP.

- I see WCVP has its own table, separate from the application. I reallize that simplifies updating with a new version of the WCVP. 

  My intention is that from the user's perspective it looks like one set of data, whether it comes from WCVP or other areas. It looks like the app_taxa pulls that together. Does the app_taxa need initialized from the WCVP when it is loaded so that it has records for all of rhe WCVP? When the WCVP is updated with a new version, how does it handle app_taxa being updated with information that changed in WCVP?

  I was not familiar with ltree. Seems powerful and very useful for this use case. I know it is better for read heavy use case like this but not for write heavy that modifies the tree other than adding to it. I expect there will be updates from WCVP at times which will modify the tree. Is it safe to assume we can run those updates as a batch process to update the ltree as well? 
  
  There will be write operations to add Cultivars but they should not be modifying the tree. 
  
  We might want an admin mode to be a able to correct data, which could modify the tree.

  There is a lot of work done outside of WCVP that identifies plants which may eventually be adopted in WCVP. At this time I have not concluded whether to allow adding these to the app. First question is if we allowed adding Genus, Species and Infraspscies that are not in WCVP does this design support that or if it doesn't would it be difficult to add later?

-(done) There are a lot of additional plant details we will need to support which we have not discussed yet. Some of these are things like the various physical characteristics of a plant (overall, leaves, flowers, underground growth, etc.) and growing details (seasonal, nutrients, sun. water, longevity, etc), historical notes, etc. For example, would support querying/filtering for things like plants from a climate that is Temperate, Height is 5', zone is 8a and water needs are low. Expect many fo these would be sparsely populated. Expect the need to add more attributes over time unless we identify a complete model to use up front.

  Help me consider different options for how to store data about a taxon that don't have any special purpose other than displaying and querying. This would include many of the wcvp columns and many extended details. Here are some initial thoughts from my limited knowledge.

  1) Purely relational: 
  This is similar to the current method being used for the wcvp columns and could be extended for other attributes that we need to capture.
  Pros: works well for core columns. Fast retrieval.
  Cons: Excessive number of columns are needed which would be sparsely populated. Doesn't handle multiple sources for the same data very well.

  2) Relational core extended with name/value pairs as flexible and dynamic data:
  This is similar to the current method used for extended details but each detail would have it's own entry in the app_taxon_details table. 
  Pros: No sparsely populated details because only those that have values are included.
  Cons: Complex joins to query multiple attributes.

  3) Relational core extended with JSON/BSJON for flexible and dynamic data:
  You brought this to my attension when you proposed Postgres/Supabase. From my limited learning about it, it seems promising as away to get the benefits of relational db and that of document db.
  Pros: Handles set structures of the core columns relationally while providing ability to add many optional attributes that could be sparsly populated. Allows queryig on the details.
  Cons: Specialized skills to handle and debug. Not a traditional db mechanism (but expect it may be getting more popular).

  4) No SQL: Graph DB: might have advantages for the tree structure but don't see advantages for the plant details. Document DB: could be used for the details which provides flexibility on data present. Could be used for the core columns too. Long Column: Don't have as much background on this.

-How to handle updates from WCVP while maintaining other data connected to it (cultivars, descriptions, etc.)?

-Done Dynamically loading and cacheing content from database since can't load everything into memory.

-Hide/show synonyms (or other not accepted) from WCVP.

-Handle adding Genus, Species, Infraspecies that are not in WCVP.

-Since lower level taxons are a specialization of the parent can they inherit certain attributes (descriptive) if those attributes are not set an the child? This would not include things like status or authorship but would include climtae, geography and lifeform. May want to make it clear to the user when a description is inherited (generalized) vs specific (specialized) to that taxon.

-Need to figure out how to handle if someone searches/filters on a synonym, how to best direct them to the accepted taxa. Would be nice if it was done automatically. Would need to explain to the user since there would be a context shift. Might want to have synonyms (and other related taxa) show up as another level in the tree, below the accepted taxa. Or this could just be on the details panel.

-Need to work through what should be expected in the tree view based on limitations of the server side filter or if there needs to be more client work to make it meet the user's expectations.


Plant info:

-Include references to reputable websites. 

-Include brief quotes about plants from reputable sources, with proper citing and references to the source. Follow guidance provided by Google AI - see document of session conversation.

-Include 'a.k.a.' section. WCVP synonyms, trade names, pattents, trademarks/registered, common names, Other Cultivars, misapplied, commonly misrepresented. Combine synonym information from WCVP with other plant anmes from the Gemini LLM together, indicating the source and also what kind of a name it is (scientific synonym, duplicate name, trade name, pattent, trademark, registered trademark, common name, missaplied, etc.).

-Include origin, history, background, 

-Include physical description of plant. plant size-Height/width, growth rate, Plant shape, plant overall texture, floliage shape, foliage size, foliage texture, foliage color, variation throughout the year, Flowering period, flower color and description, description of base/rooting system- type (bulb, rhizonme, etc.), size, shape, etc.

-Include growing conditions.


General:

How to train the system to return high quality information by iterating over it. Ask the questions about the answer like: Are you sure? Is there possibly another answer? Is this the only answer? Explain why. Justify your answer. 



-Test and optimize searching. Make sure it can handle input in various forms and types of names (synonyms, trademarks, common names, etc.) to identify the correct plant name. 

  -How to make sure it is not hallucinating (random, off topic), is precise (finds the lowest level taxon), consistent (the same answer every time), accurate (with respect to the WCVP accepted name), etc.

  -If the exact plant searched for is found and validated as the correct name and it is not already in the database then add it. 

  -If the plant searched for is found (exact match or with high likelihood) and is already in the database then notify user in the user input to confirm or modify search and retry. 

  -If a single plant is found with high likelihood but the name is different (misspellings or not preferred name) then present for user input to validate before entering into database.

  -If multiple potential matches are found then present to the user input for them to resolve by selecting the correct ones to add or to modify the search.


Create details panel that shows all data for a plant. Make this a panel that can be popped up or opened up under the plant row in the grid. Give it an edit mode so data can be updated.

Add a fake group under Genus to hold generic cultivars. Use something like "---" or "(none)", etc. in the Species column. Not sure if they should sort before or after the other Species. Maybe do a similar thing for the Cultivars of Species, adding a fake group named "---" or "(none)" in the Infraspecies column?

Rename DataGridV2 to DataGrid.

Update the grid column labels. Keep similar to WCVP where we can. Shorten so the label doesn't extend the column width.

Create groups for the columns in the Column selector and make the group selectable, which selects/deselects all columns in the group. 
Use the following to set the groups and column order and their default selection state:
  Control (not selected)
    Tree (selected)
    Actions (not selected)
    # (selected)
  Taxon Breakdown (not selected)
    GH (not selected)
    Genus (not selected)
    SH (not selected)
    Species (not selected)
    I Rank (not selected)
    Infraspecies (not selected)
    Cultivar (not selected)
  Basic Info (selected)
    Scientific Name (selected) 
    Common Name (selected)
    Description (selected)
    Geography (selected)
    Climate (selected)
  Aditional Info (not selected)
    Lifeform (not selected)
    Rank (not selected)
    Family (not selected)
    Hybrid Formula (not selected)
  Name Origin (not selected)
    Authorship (not selected)
    Pub. Author (not selected)
    Paren. Author (not selected)
    Publication (not selected)
    Vol/Page (not selected)
    First Published (not selected)
  Review (not selected)
    Status, (not selected),
    Reviewed (not selected),
    Nom. Remarks (not selected),
  Identifiers (not selected)
    Internal ID (not selected)
    Parent ID (not selected)
    WCVP ID (not selected)
    IPNI ID (not selected)
    POWO ID (not selected)
    Accepted ID (not selected)
    Basionym ID (not selected)


Productionizing:

How to run FloraCatalog as a web application outside of AI Studio deeloper environment?

  Would this be a 3-tier app?

  Create architecture documentation for it.

  What are options for where to run the web application?

  What is the path to production? Automate as much as possible.

