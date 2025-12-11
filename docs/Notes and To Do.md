Use  "strictly adhere to the XML format required by the system." To successful stream file updates. Otherwise they show up in the Code assistant.

When the AI halucinates a previous state say "If I hallucinate, simply saying "Look at the file content provided". This get it to weight the actual file contents over the generalized memory from the AI system from recent conversations.

Current code fixes:

In the data mapping I wanted to clearly separate WCVP metadata from additional metadata we (you and/or I) include. This is so we are clear the linage of information and don't muddle sources or be clear if that is something we do. I had intended the Notes column to include your additional notes and to be separate from the WCVP Remarks column.

----------------

The next baby step is add the new fields to DataGridV2 which were added to the Taxon interface.

------------

You told me to remind you to "Look at the file content provided".
The previous task had an error and your fixes reverted the code again. I restored back to the earlier checkpoint.
This same error has been occurring over and over the last few days. For some reason the import for Network and AlignJustify gets missed when generating the new DataGridV2.tsx. Earlier you had mentioned something like that the line is getting truncated somewhere. I do see it is a little longer than most other imports but it doesn't seem excessively long. The import line includes a lot of types from lucide-react. Can that line be broken into multiple imports or is there another way to prevent this going forward?

-------

needing to restore to older versions then reapply.

I want to work toward the database integration and have a number of things to work on to get there. That is why I wanted to see the data mapping. Here are some enhancements based on reviewing the data mapping.

In the data mapping you shortened some of the information in the columns of metadata from WCVP. Regenerate with all the information so I can see if it is too much.

Make sure the Taxon interface incudes attributes for all columns from WCVP. Also the attribute name in the Taxon interface must match that from the WCVP column name. Here are some I see that are missing or don't match:
taxon_name->scientificName;
taxon_rank->rank;
taxon_authors->authorship;
primary_author->(missing);
replaced_synonym_author->(missing);
place_of_publication->publication;
accepted_plant_name_id-> acceptedNameId;
basionym_plant_name_id-> basionymId;
parent_plant_name_id->(missing);
homotypic_synonym->(missing);

Continue to make sure grid columns exist for all attributes in the Taxon interface and that the names match exactly. I realize there are extra grid columns as well for things like the tree, count and actions.

When you first generated the data mapping to the console you added additional columns than what I explicitly asked for (Grid Label and Notes). I liked those and se you did include the Grid Label in the DATA_MAPPING.md. Please include the Notes in the DATA_MAPPING.md file as well.

Issue 2025--12-07
-----------------

Tried reporting the error but that would not even send. This is what I tried to send:

Google AI studio prompt is not working. It continually gets an internal error so I can't use it to continue building my app. Retrying does work. Logged out and upgraded the latest Chrome browser but that didn't help. cleared all cache but that didn't help either. My other app is getting prompt responses but they are slow. https://aistudio.google.com/status indicates there is no issue but there is at least with getting you system to even communicate with me on the app. 

The continual errors was fixed after "Rest the conversation" was selected. BTW, in a conversation with AI Studio it said reseting the conversation periodically is a good practice since the costs can go up as it rereads the conversation (lots of input tokens) and all the files for each prompt.


Features to add:
---------------

Activity Panel:

-The Activity Panel still does not allow optimizing the size of the three sections for maximum viewability.

-The items on the Activity Panel need to capture more context of the process in order to know what was done, and to test the results are what is expected and to debug when things aren't.

Integrate the project with Github.

-How to make updates?


Database:

-Create the database, load it with WCVP data and integrate the FloraCatalog to use it.

-What is the best database given the needs which is easy to set up, evolve and administer? Consider backups, traceability, lineage, merging records, updating records with most recent from sources, updating records with data following the latest rules of what to include, etc.

Data Managment:

-How to handle updates from WCVP while maintaining other data connected to it (cultivars, descriptions, etc.)?

-Dynamically loading and cacheing content from database since can't load everything into memory.

-Keeping lineage and traceability. Where did the data come from. When was it added and/or updated.

-Hide/show synonyms (or other not accepted) from WCVP.

-Handle adding Genus, Species, Infraspecies that are not in WCVP.


Can AI Studio output the full description that could be used to recreate the application?

Can AI Studio output the design decisions that went into this. Describe what was needed, design decisions on how it was accomplished and explaining why that design decision was made and possibly justifications. Not looking for a deep understanding of the pros and cons of alternative but alternatives may be mentioned if needed to explain other justify the decision.

Plant info:

-Include references to reputable websites. 

-Include brief quotes about plants from reputable sources, with proper citing and references to the source. Follow guidance provided by Google AI - see document of session conversation.

-Include 'a.k.a.' section (or 'Other Names' or 'Known As'). WCVP synonyms, common names, Other Cultivars, commonly misrepresented.

-Include origin, history, background, 

-Include physical description of plant.

-Include growing conditions.


How to train the system to return high quality information by iterating over it. Ask the questions about the answer like: Are you sure? Is there possibly another answer? Justify your answer. 


Have the Code Assistant console conversation streamed to a file alongside the source code. This will get backed up and versions with Github. When the conversation gets reset start a new file.


Test and optimize searching. Make sure it can handle input in various forms and types of names (synonyms, trademarks, common names, etc.) to identify the correct plant name. 

-How to make sure it is not hallucinating (random, off topic), is precise (finds the lowest level taxon), consistent (the same answer every time), accurate (with respect to the WCVP accepted name), etc.

-If the exact plant searched for is found and validated as the correct name and it is not already in the database then add it. 

-If the plant searched for is found (exact match or with high likelihood) and is already in the database then notify user in the user input to confirm or modify search and retry. 

-If a single plant is found with high likelihood but the name is different (misspellings or not preferred name) then present for user input to validate before entering into database.

-If multiple potential matches are found then present to the user input for them to resolve by selecting the correct ones to add or to modify the search.

Update algorithm to populate the Infraspecies Rank column instead of prepending he Infraspecies with the term.

Update the SQL in "wcvp_schema.txt":

-More comments for each column that reflect the information for that column from the "README_WCVP" file. Include information about the Value, Class, Description and Remarks. This will carry that information forward as easy access during development.

-Includes other columns of data needed by the app which did not come from WCVP.

Create details panel that shows all data for a plant. Make this a panel that can be popped up or opened up under the plant row in the grid. Give it an edit mode so data can be updated.

Can the tree column header use the tree icon instead of the text "Tree"? 

I like that the Tree column can be moved but doesn't require the little grab icon to the left of the label in the header. It takes up horizontal space, affecting visibility of the column label when the column is shrunk. I presume that means we can remove the sort icon to the right of the label but sorting still works. Assuming those are correct remove the grab icon and sorting icon from the header for all columns except Genus, Species, Infraspecies, Cultivar and Scientific Name? That way these icons are shown for the main taxonomic columns but the other columns can have these functions and shrink smaller when needed without affecting visibility of the label?

Also change GH, SH and Actions back to being able to be moved. Change the label for Infra Rank to "I Rank" to make the label smaller.

Update colors for Genus, Species, Infraspecies and Cultivar to be separated visually.

Add a fake group under Genus to hold generic cultivars. Use something like "---" or "(none)", etc. in the Species column. Not sure if they should sort before or after the other Species. Maybe do a similar thing for the Cultivars of Species, adding a fake group named "---" or "(none)" in the Infraspecies column?



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




