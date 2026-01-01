
import { GoogleGenAI, Type } from "@google/genai";
import { Taxon, Link, Synonym, SearchCandidate } from "../types";

/**
 * identifyTaxonomy: Parses natural language input into a structured taxonomic hierarchy.
 */
export async function identifyTaxonomy(query: string): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a world-class botanical taxonomist. Parse the following plant name into a strict hierarchy using snake_case properties.
    Input: "${query}"
    
    Rules:
    1. Align with the World Checklist of Vascular Plants (WCVP).
    2. Correct misspellings and identify the "Accepted" name if the input is a synonym.
    3. CULTIVAR RULE: If a cultivar is detected (e.g. 'Bloodgood'), the 'name' property for that specific array item MUST be the cultivar name WITHOUT single quotes (e.g. "Bloodgood"), and 'taxon_rank' MUST be "Cultivar".
    4. SPECIES RULE: The species item in the array MUST NOT contain the cultivar name in its 'name' property.
    5. For the 'taxon_name' of a cultivar, wrap the name in single quotes (e.g. "Acer palmatum 'Bloodgood'").
    6. HYBRID RULE: Set is_hybrid=true if the taxon is a known hybrid (using × or x in the input).
    7. FIELD CONTENT: For the 'genus', 'species', 'infraspecies', and 'cultivar' properties, provide ONLY the specific name or epithet for that rank level (e.g. 'palmatum', NOT 'Acer palmatum').`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            taxon_rank: { type: Type.STRING, description: "e.g. Genus, Species, Variety, Subspecies, Cultivar" },
            name: { type: Type.STRING, description: "The specific epithet OR cultivar name alone" },
            taxon_name: { type: Type.STRING, description: "The full scientific name including parents" },
            family: { type: Type.STRING },
            genus: { type: Type.STRING },
            species: { type: Type.STRING },
            infraspecies: { type: Type.STRING },
            infraspecific_rank: { type: Type.STRING, description: "e.g. var., subsp., f." },
            cultivar: { type: Type.STRING, description: "The cultivar name alone if rank is Cultivar" },
            is_hybrid: { type: Type.BOOLEAN, description: "True if this rank level is a hybrid" },
            taxon_status: { type: Type.STRING, description: "Accepted, Synonym, or Unresolved" }
          },
          required: ["taxon_rank", "name", "taxon_name", "taxon_status", "is_hybrid"]
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
 * enrichTaxon: Fetches comprehensive botanical and horticultural details using snake_case properties.
 */
export async function enrichTaxon(taxon: Taxon): Promise<Partial<Taxon>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Provide deep horticultural and botanical data for "${taxon.taxon_name}" using snake_case properties.
    
    Include:
    1. A detailed narrative description text.
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
          description_text: { type: Type.STRING },
          common_name: { type: Type.STRING },
          hardiness_zone_min: { type: Type.INTEGER },
          hardiness_zone_max: { type: Type.INTEGER },
          height_min_cm: { type: Type.INTEGER },
          height_max_cm: { type: Type.INTEGER },
          width_min_cm: { type: Type.INTEGER },
          width_max_cm: { type: Type.INTEGER },
          origin_year: { type: Type.INTEGER },
          history_metadata: {
            type: Type.OBJECT,
            properties: {
              background: { type: Type.STRING }
            }
          },
          morphology: {
            type: Type.OBJECT,
            properties: {
              foliage: { type: Type.STRING },
              flowers: { type: Type.STRING },
              form: { type: Type.STRING },
              texture: { type: Type.STRING },
              seasonal_variation: { type: Type.STRING }
            }
          },
          ecology: {
            type: Type.OBJECT,
            properties: {
              soil: { type: Type.STRING },
              light: { type: Type.STRING },
              water: { type: Type.STRING },
              growth_rate: { type: Type.STRING },
              flowering_period: { type: Type.STRING }
            }
          },
          alternative_names: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['scientific', 'trade', 'trademark', 'registered_trademark', 'patent', 'common', 'misapplied', 'misrepresented', 'cultivar', 'unspecified'] }
              }
            }
          },
          reference_links: {
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
export async function findAdditionalLinks(taxon_name: string, existing: Link[]): Promise<Link[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find authoritative reference links (RHS, Missouri Botanical Garden, POWO, etc.) for "${taxon_name}". 
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
