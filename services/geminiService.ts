import { GoogleGenAI, Type } from "@google/genai";
import { Taxon, Link, Synonym, SearchCandidate } from "../types";

/**
 * identifyTaxonomy: Parses natural language input into a structured taxonomic hierarchy.
 */
export async function identifyTaxonomy(query: string): Promise<any[]> {
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a world-class botanical taxonomist. Parse the following plant name into a strict hierarchy.
    Input: "${query}"
    
    Rules:
    1. Align with the World Checklist of Vascular Plants (WCVP).
    2. Correct misspellings and identify the "Accepted" name if the input is a synonym.
    3. CULTIVAR RULE: If a cultivar is detected (e.g. 'Bloodgood'), the 'name' property for that specific array item MUST be the cultivar name WITHOUT single quotes (e.g. "Bloodgood"), and 'taxonRank' MUST be "Cultivar".
    4. SPECIES RULE: The species item in the array MUST NOT contain the cultivar name in its 'name' property.
    5. For the 'taxonName' of a cultivar, wrap the name in single quotes (e.g. "Acer palmatum 'Bloodgood'").
    6. HYBRID RULE: Set isHybrid=true if the taxon is a known hybrid (using × or x in the input).
    7. FIELD CONTENT: For the 'genus', 'species', 'infraspecies', and 'cultivar' properties, provide ONLY the specific name or epithet for that rank level (e.g. 'palmatum', NOT 'Acer palmatum').`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            taxonRank: { type: Type.STRING, description: "e.g. Genus, Species, Variety, Subspecies, Cultivar" },
            name: { type: Type.STRING, description: "The specific epithet OR cultivar name alone" },
            taxonName: { type: Type.STRING, description: "The full scientific name including parents" },
            family: { type: Type.STRING },
            genus: { type: Type.STRING },
            species: { type: Type.STRING },
            infraspecies: { type: Type.STRING },
            infraspecificRank: { type: Type.STRING, description: "e.g. var., subsp., f." },
            cultivar: { type: Type.STRING, description: "The cultivar name alone if rank is Cultivar" },
            isHybrid: { type: Type.BOOLEAN, description: "True if this rank level is a hybrid" },
            taxonStatus: { type: Type.STRING, description: "Accepted, Synonym, or Unresolved" }
          },
          required: ["taxonRank", "name", "taxonName", "taxonStatus", "isHybrid"]
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
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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