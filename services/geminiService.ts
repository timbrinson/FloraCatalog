
import { GoogleGenAI, Type } from "@google/genai";
import { Taxon, TaxonRank, Link, Synonym, TaxonomicStatus, SearchCandidate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * identifyTaxonomy: Parses natural language input into a structured taxonomic hierarchy.
 */
export async function identifyTaxonomy(query: string): Promise<any[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Act as a world-class botanical taxonomist. Parse the following plant name into a strict hierarchy starting from the highest identifiable rank down to the most specific.
    Input: "${query}"
    
    Rules:
    1. Align with the World Checklist of Vascular Plants (WCVP).
    2. Correct misspellings and identify the "Accepted" name if the input is a synonym.
    3. Identify hybrid status. Use '×' (not 'x') for genusHybrid or speciesHybrid if applicable.
    4. For cultivars, wrap the name in single quotes in the taxonName.
    5. Infer hidden hybrids (e.g., "Lycoris rosea" is actually "Lycoris × rosea").`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            taxonRank: { type: Type.STRING, description: "e.g. Genus, Species, Variety, Subspecies, Cultivar" },
            name: { type: Type.STRING, description: "The specific epithet or cultivar name alone" },
            taxonName: { type: Type.STRING, description: "The full scientific name including parents" },
            family: { type: Type.STRING },
            genus: { type: Type.STRING },
            species: { type: Type.STRING },
            infraspecies: { type: Type.STRING },
            infraspecificRank: { type: Type.STRING, description: "e.g. var., subsp., f." },
            genusHybrid: { type: Type.STRING, description: "'×' or null" },
            speciesHybrid: { type: Type.STRING, description: "'×' or null" },
            taxonStatus: { type: Type.STRING, description: "Accepted, Synonym, or Unresolved" }
          },
          required: ["taxonRank", "name", "taxonName", "taxonStatus"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse identity JSON", e);
    return [];
  }
}

/**
 * searchTaxonCandidates: Performs a fuzzy search for plant names to resolve ambiguities.
 */
export async function searchTaxonCandidates(query: string): Promise<SearchCandidate[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find the most likely botanical matches for the query: "${query}".
    Include synonyms, common names, and trade names.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            taxonName: { type: Type.STRING },
            commonName: { type: Type.STRING },
            acceptedName: { type: Type.STRING, description: "The correct botanical name if input is a synonym" },
            matchType: { type: Type.STRING, description: "exact, synonym, fuzzy, common_name" },
            confidence: { type: Type.NUMBER },
            isHybrid: { type: Type.BOOLEAN }
          },
          required: ["taxonName", "matchType", "confidence"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}

/**
 * enrichTaxon: Fetches additional botanical details, synonyms, and reference links.
 */
export async function enrichTaxon(taxon: Taxon): Promise<Partial<Taxon>> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide detailed botanical info for "${taxon.taxonName}".
    Categorize synonyms carefully: scientific, trade, misapplied, common.
    Provide reputable reference URLs.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          commonName: { type: Type.STRING },
          family: { type: Type.STRING },
          synonyms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, description: "scientific, trade, misapplied, common" }
              }
            }
          },
          referenceLinks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {};
  }
}

/**
 * deepScanTaxon: Systematic cultivar mining with progress feedback.
 */
export async function deepScanTaxon(
  name: string, 
  rank: string, 
  onProgress: (names: string[], status: string) => Promise<boolean>
) {
  const ranges = ["A-C", "D-F", "G-I", "J-L", "M-O", "P-R", "S-U", "V-Z"];
  
  for (const range of ranges) {
    const status = `Scanning registered cultivars in range ${range}...`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `List all registered cultivars and varieties for the ${rank} "${name}" that start with letters in the range ${range}.
      Respond with a simple JSON list of names.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      const foundNames: string[] = JSON.parse(response.text || "[]");
      const shouldContinue = await onProgress(foundNames, status);
      if (!shouldContinue) break;
    } catch (e) {
      console.error(`Range ${range} failed`, e);
    }
  }
}

/**
 * findAdditionalLinks: Web search for specific plant documentation.
 */
export async function findAdditionalLinks(taxonName: string, existing: Link[]): Promise<Link[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find additional authoritative reference links for "${taxonName}". 
    Avoid these existing links: ${existing.map(l => l.url).join(', ')}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING }
          },
          required: ["title", "url"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}

/**
 * parseBulkText: Natural language list processing.
 */
export async function parseBulkText(text: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract a clean list of botanical names from this text. Ignore numbers, dates, or non-plant words:
    "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}