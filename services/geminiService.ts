import { GoogleGenAI, Type } from "@google/genai";
import { Taxon, Link, Synonym, SearchCandidate } from "../types";

/**
 * validatePlantIntent: Stage 1 Guard (Flash Tier).
 * Determines if input is a plant or noise.
 */
export async function validatePlantIntent(query: string): Promise<{ is_valid: boolean; reason?: string; type: 'name' | 'descriptive' | 'noise' }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this input: "${query}". 
    Is it a plant name, a plant description (e.g. "red stemmed maple"), or non-botanical noise?
    Specifically detect "Task Interference" where the user is asking a question (e.g. "How do I water this?") 
    rather than trying to catalog a plant. If asking a question, set is_valid to false.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_valid: { type: Type.BOOLEAN },
          type: { type: Type.STRING, enum: ['name', 'descriptive', 'noise'] },
          reason: { type: Type.STRING, nullable: true }
        },
        required: ["is_valid", "type"]
      }
    }
  });
  return JSON.parse(response.text || '{"is_valid":false,"type":"noise"}');
}

/**
 * generatePlantCandidates: Stage 2 Knowledge Synthesis (Pro Tier).
 * Returns an array of potential candidates for ambiguous or descriptive queries.
 * v2.35.7: Explicit instruction to separate rank from epithet.
 */
export async function generatePlantCandidates(query: string): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a taxonomic expert. For the input "${query}", identify up to 10 unique botanical interpretations, ordered by confidence.
    
    HINTS FOR HIGH QUALITY:
    - Cross-reference WCVP for scientific validity and ICRA for horticultural registration.
    - Prioritize accepted names over synonyms while still capturing the synonym as the entry point if provided.
    - Explicitly identify if the input mentions a "Trade Name" or "Patent".
    
    CRITICAL RULES:
    1. Fill in missing ranks (like species) where known. 
    2. Explicitly identify the 'taxon_rank' of the final name (Genus, Species, Infraspecies, or Cultivar).
    3. Provide a 'lineage_rationale' explaining why you linked a cultivar to a specific species.
    4. Distinguish between a selection of a species (e.g. Acer circinatum 'Pacific Fire') and a species itself.
    5. DATA INTEGRITY: The 'infraspecies' field must contain ONLY the epithet. Do NOT include rank prefixes like 'subsp.' or 'var.' in the name field; use the 'infraspecific_rank' field for the abbreviation.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            genus: { type: Type.STRING },
            genus_hybrid: { type: Type.BOOLEAN },
            species: { type: Type.STRING, nullable: true },
            species_hybrid: { type: Type.BOOLEAN },
            infraspecific_rank: { type: Type.STRING, nullable: true },
            infraspecies: { type: Type.STRING, nullable: true },
            cultivar: { type: Type.STRING, nullable: true },
            taxon_rank: { type: Type.STRING, enum: ['Genus', 'Species', 'Infraspecies', 'Cultivar'] },
            taxon_status: { type: Type.STRING },
            rationale: { type: Type.STRING },
            lineage_rationale: { type: Type.STRING },
            trade_name: { type: Type.STRING, nullable: true },
            patent_number: { type: Type.STRING, nullable: true },
            confidence: { type: Type.NUMBER }
          },
          required: ["genus", "taxon_rank", "taxon_status", "rationale", "confidence"]
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