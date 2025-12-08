
import { GoogleGenAI } from "@google/genai";
import { Taxon, TaxonRank, Link, Synonym, TaxonomicStatus, SearchCandidate } from "../types";

// Helper to safely extract JSON using bracket counting
const extractJSON = (text: string): string => {
  if (!text) return "";
  
  // 1. Try Markdown Code Block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // 2. Scan for outer-most brackets/braces
  const firstBracket = text.indexOf('[');
  const firstBrace = text.indexOf('{');
  
  if (firstBracket === -1 && firstBrace === -1) return "";

  // Determine start based on what comes first
  let start = -1;
  let openChar = '';
  let closeChar = '';
  
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      start = firstBracket;
      openChar = '[';
      closeChar = ']';
  } else {
      start = firstBrace;
      openChar = '{';
      closeChar = '}';
  }

  // 3. Find balanced closing bracket
  let open = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
      const char = text[i];
      
      if (escape) {
          escape = false;
          continue;
      }
      
      if (char === '\\') {
          escape = true;
          continue;
      }
      
      if (char === '"') {
          inString = !inString;
          continue;
      }

      if (!inString) {
          if (char === openChar) open++;
          else if (char === closeChar) open--;
          
          if (open === 0) {
              end = i;
              break;
          }
      }
  }

  let jsonString = "";
  if (end !== -1) {
      jsonString = text.substring(start, end + 1);
  } else {
      jsonString = text.substring(start);
  }

  return jsonString
    .replace(/\\'/g, "'")
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/[\u0000-\u001F]+/g, (match) => { 
        return match.replace(/[^\n\t\r]/g, '');
    });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getResponseText = (response: any): string => {
    try { if (response.text) return response.text; } catch (e) {}
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
            return candidate.content.parts.map((p: any) => p.text || '').join('');
        }
    }
    return '';
};

// ---------------------------------------------------------
//  SEARCH & MATCHING
// ---------------------------------------------------------

export const searchTaxonCandidates = async (query: string): Promise<SearchCandidate[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    User Search: "${query}"
    
    Task: Identify the botanical plant name(s) this refers to.
    
    Handle:
    - Synonyms (e.g. "Dicentra spectabilis" -> "Lamprocapnos spectabilis")
    - Common Names (e.g. "Bleeding Heart")
    - Typos (e.g. "Agave paryi")
    - Trademarks (e.g. "Encore Azalea")
    
    Return a JSON Array of up to 3 candidates, sorted by likelihood.
    
    Format:
    [
      { 
        "scientificName": "Full botanical name with authors omitted", 
        "commonName": "Common Name", 
        "rank": "species|cultivar|etc",
        "matchType": "exact|synonym|fuzzy|common_name",
        "confidence": 0.95 
      }
    ]
    
    Strictly JSON. No Markdown.
  `;

  try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const text = getResponseText(response);
      const json = extractJSON(text);
      if (!json) return [];
      return JSON.parse(json);
  } catch (e) {
      console.error("Search failed", e);
      return [];
  }
};

// ---------------------------------------------------------
//  Identify Hierarchy Chain
// ---------------------------------------------------------

interface RawTaxonNode {
  rank: string; 
  name: string; 
  fullName: string;
  family?: string;
  commonName?: string;
  genusHybrid?: string;
  speciesHybrid?: string;
}

export const identifyTaxonomy = async (query: string): Promise<RawTaxonNode[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const maxRetries = 2;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const prompt = `
        You are a botanical taxonomist. Analyze the plant input: "${query}".
        
        Task: Break it down into a taxonomic hierarchy chain (Genus -> Species -> Subspecies -> Cultivar).
        
        CRITICAL RULES FOR HYBRIDS:
        1. SEPARATE CONCEPTS: Do NOT use "Hybrid Genus" or "Nothogenus" as the Rank. 
           - Rank MUST be: "genus", "species", "subspecies", "variety", "form", "cultivar", "grex".
           - If it is a hybrid genus (e.g. Hippeastrelia), set 'rank': 'genus' and 'genusHybrid': '×'.
           - If it is a hybrid species (e.g. Salvia x jamensis), set 'rank': 'species' and 'speciesHybrid': '×'.
        2. INFER HIDDEN HYBRIDS: If the input is botanically a hybrid but the user omitted the 'x', you MUST detect it.
           - Input: "Lycoris rosea" -> Output: { rank: "species", name: "rosea", speciesHybrid: "×", fullName: "Lycoris × rosea" } (Because it is Lycoris × rosea).
           - Input: "Agave ocahuata" -> Output: { rank: "species", name: "ocahuata", speciesHybrid: "×", fullName: "Agave × ocahuata" }.
        3. CLEAN NAMES: The 'name' field should NOT contain the '×' or 'x'. 
           - Bad: { name: "× Hippeastrelia" }
           - Good: { name: "Hippeastrelia", genusHybrid: "×" }

        OUTPUT FORMAT:
        - Return ONLY a valid JSON array.
        - Do NOT include markdown formatting (no \`\`\`).
        - Do NOT include comments.
        - Ensure all strings are properly double-quoted.
        - NO trailing commas.

        Example Input: "× Hippeastrelia 'Durga Pradhan'"
        Example Output: 
        [
          { "rank": "genus", "name": "Hippeastrelia", "genusHybrid": "×", "fullName": "× Hippeastrelia", "family": "Amaryllidaceae" },
          { "rank": "cultivar", "name": "Durga Pradhan", "fullName": "× Hippeastrelia 'Durga Pradhan'" }
        ]

        Input: "Acer palmatum Bloodgood"
        Output: 
        [
           { "rank": "genus", "name": "Acer", "fullName": "Acer", "family": "Sapindaceae" },
           { "rank": "species", "name": "palmatum", "fullName": "Acer palmatum" },
           { "rank": "cultivar", "name": "Bloodgood", "fullName": "Acer palmatum 'Bloodgood'" }
        ]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = getResponseText(response);
      const jsonString = extractJSON(text);
      if (!jsonString) throw new Error("Empty response or invalid JSON extraction");
      
      return JSON.parse(jsonString) as RawTaxonNode[];
    } catch (error: any) {
      console.error(`Taxonomy ID Error (Attempt ${attempt + 1}):`, error);
      if (attempt < maxRetries - 1) await wait(1000);
      else throw error;
    }
  }
  throw new Error("Failed to identify taxonomy");
};

export const enrichTaxon = async (taxon: Taxon): Promise<Partial<Taxon>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const prompt = `
        Botanical API. Target: "${taxon.scientificName}" (${taxon.rank}).
        
        Task: Find description, synonyms, links, and WCVP/POWO specific details.
        
        TRUST HIERARCHY:
        1. POWO / WFO (Taxonomy)
        2. ICRAs / Societies (Cultivars)
        3. Originating Nursery

        JSON Output (Strict JSON, No Trailing Commas):
        {
          "description": "string",
          "commonName": "string",
          "authorship": "string",
          "geographicArea": "string",
          "synonyms": [ { "name": "string", "type": "scientific" } ],
          "referenceLinks": [{"title": "string", "url": "string"}]
        }
        
        If info missing, return null fields.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });

      const text = getResponseText(response);
      const jsonString = extractJSON(text);
      let details: any = {};
      
      if (jsonString) {
         try { details = JSON.parse(jsonString); } catch(e) { console.warn("Enrichment JSON parse failed", e); }
      }

      const foundLinks: Link[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
           if (chunk.web?.uri) {
               foundLinks.push({ title: chunk.web.title || "Reference", url: chunk.web.uri });
           }
        });
      }

      const finalLinks = [...(details.referenceLinks || []), ...foundLinks]
         .filter((v,i,a) => a.findIndex(t => t.url === v.url) === i);

      return {
          description: details.description || taxon.description,
          commonName: details.commonName || taxon.commonName,
          authorship: details.authorship || taxon.authorship,
          geographicArea: details.geographicArea || taxon.geographicArea,
          synonyms: details.synonyms || taxon.synonyms,
          referenceLinks: finalLinks
      };

    } catch (error) {
       if (attempt === maxRetries - 1) return {}; 
       await wait(2000);
    }
  }
  return {};
};

export const getBotanicalSuggestions = async (
    parentName: string, 
    parentRank: TaxonRank, 
    targetRank: 'species' | 'cultivar' | 'infraspecific'
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
     List valid children for: ${parentName} (${parentRank}).
     Target Rank Group: ${targetRank === 'infraspecific' ? 'Subspecies, Varieties, or Formas' : targetRank}.
     Rules: Check POWO/WFO/ICRA. Return only accepted names. If Cultivars: include single quotes. Up to 100 items. Sort Alphabetical.
     JSON Array of strings ONLY. No Markdown.
  `;
  try {
      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
      const text = getResponseText(response);
      const json = extractJSON(text);
      return json ? JSON.parse(json) : [];
  } catch (e) { console.error(e); return []; }
};

export const findAdditionalLinks = async (name: string, existing: Link[]): Promise<Link[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const prompt = `Find 5 distinct reference links for "${name}". Exclude: ${existing.map(l=>l.url).join(', ')}. Return JSON array of {title, url}.`;
        const res = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
        const text = getResponseText(res);
        const json = extractJSON(text);
        let links = json ? JSON.parse(json) : [];
        const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((c:any) => { if(c.web?.uri) links.push({title: c.web.title||'Ref', url: c.web.uri}); });
        }
        return links;
    } catch(e) { return []; }
};

export const deepScanTaxon = async (
    taxonFullName: string,
    rank: string,
    onBatch: (names: string[], status: string) => Promise<boolean> 
) => {
    console.log("deepScanTaxon invoked for:", taxonFullName);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const ranges = ['A-C', 'D-F', 'G-I', 'J-L', 'M-O', 'P-R', 'S-U', 'V-Z'];

    const rankLabel = rank.charAt(0).toUpperCase() + rank.slice(1);
    
    // Extract key parts for validation: remove hybrid x, remove quotes
    const validationName = taxonFullName.replace(/[×x]\s?/g, '').replace(/['"]/g, '').split(' ')[0];

    for (const range of ranges) {
        const shouldContinue = await onBatch([], `Scanning ${taxonFullName} (${range})...`);
        if (!shouldContinue) {
            console.log("Mining cancelled by user.");
            break;
        }

        try {
             const prompt = `
                List ALL registered cultivars for ${rankLabel} "${taxonFullName}" starting with letters ${range}.
                
                STRICT CONSTRAINTS:
                1. Results MUST strictly belong to the ${rank} "${taxonFullName}". 
                2. Do NOT include plants from other Genera or Species with similar names.
                   - Example: If mining "Lycoris rosea", do NOT return "Catharanthus roseus" or "Rosa".
                3. Sources: RHS, Societies, Patent records, Major Nurseries.
                
                Format: JSON array of full scientific strings (e.g. "Acer palmatum 'Bloodgood'").
                Include species epithet if known, otherwise use Genus + Cultivar.
                Exclude duplicates. No Markdown.
             `;
             
             const res = await ai.models.generateContent({
                 model: "gemini-2.5-flash",
                 contents: prompt,
                 config: { tools: [{ googleSearch: {} }] }
             });
             const text = getResponseText(res);
             const json = extractJSON(text);
             if (json) {
                 const names = JSON.parse(json);
                 if (Array.isArray(names) && names.length > 0) {
                     // CLIENT-SIDE FILTERING: Check if result contains the main identifier
                     const validNames = names.filter((n: string) => 
                        n.toLowerCase().includes(validationName.toLowerCase())
                     );
                     
                     if (validNames.length > 0) {
                        await onBatch(validNames, `Found ${validNames.length} in ${range}...`);
                     }
                 }
             }
             await wait(1000); 
        } catch(e) {
            console.warn(`Mining failed for range ${range}`, e);
        }
    }
};

export const parseBulkText = async (rawText: string): Promise<RawTaxonNode[][]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const prompt = `
            You are a data parser. Convert raw text to structured botanical data.
            Raw Input: """${rawText.substring(0, 10000)}"""
            Task: Identify every distinct plant. Return array of Taxonomic Chains.
            Output JSON Format: [[ { "rank": "genus", "name": "...", "genusHybrid": "×" }, { "rank": "species", ... } ]]
        `;
        const res = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        const text = getResponseText(res);
        const json = extractJSON(text);
        return json ? JSON.parse(json) : [];
    } catch(e) { return []; }
}
