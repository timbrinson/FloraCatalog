import { GoogleGenAI, Type } from "@google/genai";
import { Taxon, Link, Synonym, SearchCandidate } from "../types";

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
 * enrichTaxon: Fetches comprehensive botanical and horticultural details.
 */
export async function enrichTaxon(taxon: Taxon): Promise<Partial<Taxon>> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide deep horticultural and botanical data for "${taxon.taxonName}".
    
    Include:
    1. A detailed narrative description.
    2. Origin discovery year and historical background.
    3. Physical traits: size (min/max), foliage/flower colors, texture.
    4. Growing conditions: USDA zones, light, water, soil, growth rate.
    5. Expansive Synonyms (A.K.A.s): 
       - trade names, trademarks (TM), registered trademarks (R), 
       - plant patents (PP), common names, and cultivar misapplications.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          commonName: { type: Type.STRING },
          hardinessMin: { type: Type.INTEGER },
          hardinessMax: { type: Type.INTEGER },
          heightMin: { type: Type.INTEGER },
          heightMax: { type: Type.INTEGER },
          widthMin: { type: Type.INTEGER },
          widthMax: { type: Type.INTEGER },
          originYear: { type: Type.INTEGER },
          history: { type: Type.STRING },
          morphology: {
            type: Type.OBJECT,
            properties: {
              foliage: { type: Type.STRING },
              flowers: { type: Type.STRING },
              form: { type: Type.STRING },
              texture: { type: Type.STRING },
              seasonalVariation: { type: Type.STRING }
            }
          },
          ecology: {
            type: Type.OBJECT,
            properties: {
              soil: { type: Type.STRING },
              light: { type: Type.STRING },
              water: { type: Type.STRING },
              growthRate: { type: Type.STRING },
              floweringPeriod: { type: Type.STRING }
            }
          },
          synonyms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['scientific', 'trade', 'trademark', 'registered_trademark', 'patent', 'common', 'misapplied', 'misrepresented', 'cultivar', 'unspecified'] }
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
 * findAdditionalLinks: Web search for specific plant documentation.
 */
export async function findAdditionalLinks(taxonName: string, existing: Link[]): Promise<Link[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find authoritative reference links (RHS, Missouri Botanical Garden, POWO, etc.) for "${taxonName}". 
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
