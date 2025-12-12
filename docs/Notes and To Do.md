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

Feedback on AI Studio to the developers

2025-12-11

The application state keeps being reset to older point in time. what was just updated was based on at least some files from 2 days ago. The functionality provided n DataGridV2.tsx has been reverted to old functionality. I spent all day yesterday tryig to fix this and the AI even admitted what it is doing wrong.

There is a serious bug/issue/problem in the Gemini model used in AI Studio which causes repeated errors when attempting to make changes to an application. After long conversations with AI Studio it has explained where this problem is coming from. This is serious and took a day to figure out what is happening. However the fix proposed by the AI is not working and I can not get it to work correctly. I am stuck and can not go forward.

The problem is that AI Studio can get in a state where uses it's memory of what a file's state is (from the past) which is outweighing using the actual file of the application which gets passed to the AI. Because of this it keeps reverting to an old state of the application and loosing many improvements that had been made.

This reverting to use old file state is usually associated with errors during the generation of the new files. I am not sure which is the cause and which is the affect or if both are at play. At least sometimes the errors are the affect since the old file being used is referencing things that are no longer valid in some other files. The opposite may also be at play where an error is causing the AI to use an older file in it analysis of the error, instead of the file provided to the prompt that came from the current applications files.

The AI said the fix is to tell it to look at the files provided in the prompt but I have found that once it gets into the state of using the wrong file it always fails when it needs to update a the file. If it is only doing a read operation (no updates) have been ale to get it to see the current files at times, when emphasizing it has bad behaviour and needs to figure out why. However with updates it is not clear if is looking at the correct files initially and later switch to the older files at some point like generation or if it is using the older files from it's memory from the beginning of the task on.

Please fix this.


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

-Create the database, load it with WCVP data and integrate the FloraCatalog to use it.

-What is the best database given the needs which is easy to set up, evolve and administer? Consider backups, traceability, lineage, merging records, updating records with most recent from sources, updating records with data following the latest rules of what to include, etc.

Data Managment:

- Before integrating with a database I would like your help with data modeling and design for data management.

  It is important to maintain lineage of the data and have traceability of changes. It needs to be clear the source of information and how it got from the source to the database. It needs proper citation for the source of the information, a timestamp when the information came from the source and a timestamp when the data was added and updated in the database. Also capture what was the process that made the updates.

  The plant information will be coming from multiple sources. The primary source for Genus, Species and Infraspecies levels will be WCVP. WCVP is the source for some Cultivar level plants but most of the Cultivars will be added from other sources. We may allow adding Genus, species and Infraspecies levels from other sources as well but will need to be clear where they came from vs. WCVP.

-How to handle updates from WCVP while maintaining other data connected to it (cultivars, descriptions, etc.)?

-Dynamically loading and cacheing content from database since can't load everything into memory.

-Keeping lineage and traceability. Where did the data come from. When was it added and/or updated. What was the process for adding or updating?

-Hide/show synonyms (or other not accepted) from WCVP.

-Handle adding Genus, Species, Infraspecies that are not in WCVP.


Plant info:

-Include references to reputable websites. 

-Include brief quotes about plants from reputable sources, with proper citing and references to the source. Follow guidance provided by Google AI - see document of session conversation.

-Include 'a.k.a.' section. WCVP synonyms, trade names, pattents, trademarks/registered, common names, Other Cultivars, misapplied, commonly misrepresented. Combine synonym information from WCVP with other plant anmes from the Gemini LLM together, indicating the source and also what kind of a name it is (scientific synonym, duplicate name, trade name, pattent, trademark, registered trademark, common name, missaplied, etc.).

-Include origin, history, background, 

-Include physical description of plant. plant size-Height/width, growth rate, Plant shape, plant overall texture, floliage shape, foliage size, foliage texture, foliage color, variation throughout the year, Flowering period, flower color and description, description of base/rooting system- type (bulb, rhizonme, etc.), size, shape, etc.

-Include growing conditions.


How to train the system to return high quality information by iterating over it. Ask the questions about the answer like: Are you sure? Is there possibly another answer? Is this the only answer? Explain why. Justify your answer. 



Test and optimize searching. Make sure it can handle input in various forms and types of names (synonyms, trademarks, common names, etc.) to identify the correct plant name. 

-How to make sure it is not hallucinating (random, off topic), is precise (finds the lowest level taxon), consistent (the same answer every time), accurate (with respect to the WCVP accepted name), etc.

-If the exact plant searched for is found and validated as the correct name and it is not already in the database then add it. 

-If the plant searched for is found (exact match or with high likelihood) and is already in the database then notify user in the user input to confirm or modify search and retry. 

-If a single plant is found with high likelihood but the name is different (misspellings or not preferred name) then present for user input to validate before entering into database.

-If multiple potential matches are found then present to the user input for them to resolve by selecting the correct ones to add or to modify the search.

Update the SQL in "wcvp_schema.txt". Include other attributes/columns and other tables needed.

-Includes other columns of data needed by the app which did not come from WCVP. Include childCount.

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




