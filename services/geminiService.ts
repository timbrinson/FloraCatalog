
import { GoogleGenAI, Type } from "@google/genai";
import { Taxon, Link, Synonym, SearchCandidate } from "../types";

/**
 * identifyTaxonomy: Parses natural language input into a comprehensive lineage object.
 * ADR-005: AI is restricted to "Extraction". Standards enforcement is handled by the app.
 * Performance: Switched to Flash for faster structured extraction (2-4s avg).
 */
export async function identifyTaxonomy(query: string): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract the taxonomic lineage for the plant name: "${query}".
    
    Rules for Extraction:
    1. Align with scientific standards (WCVP / ICN / ICNCP).
    2. Provide the raw literals for EVERY rank in the hierarchy.
    3. MISSING RANKS: If a rank (like species or infraspecies) is not present in the input, return NULL for that field.
    4. STATUS: Identify the most likely WCVP status (Accepted, Synonym, Unresolved).
    5. CULTIVAR: Extract as raw text (e.g. 'Bloodgood', not "'Bloodgood'").
    6. TARGET RANK: Identify the most specific rank provided in the string.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            target_rank: { type: Type.STRING, description: "Genus, Species, Variety, Subspecies, Cultivar" },
            family: { type: Type.STRING, nullable: true },
            genus: { type: Type.STRING },
            genus_hybrid: { type: Type.BOOLEAN },
            species: { type: Type.STRING, nullable: true },
            species_hybrid: { type: Type.BOOLEAN },
            infraspecific_rank: { type: Type.STRING, description: "Abbreviation like 'var.' or 'subsp.'", nullable: true },
            infraspecies: { type: Type.STRING, nullable: true },
            cultivar: { type: Type.STRING, nullable: true },
            taxon_status: { type: Type.STRING }
        },
        required: ["target_rank", "genus", "taxon_status"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse identity JSON", e);
    return null;
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