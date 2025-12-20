
import { getSupabase, getIsOffline } from './supabaseClient';
import { Taxon, TaxonRank, TaxonomicStatus, Synonym, Link } from '../types';

/**
 * Service to handle interaction with the Supabase PostgreSQL Database.
 */

const DB_TABLE = 'app_taxa';
const DETAILS_TABLE = 'app_taxon_details';

// --- MAPPERS ---

const mapFromDB = (row: any): Taxon => {
  return {
    id: row.id,
    parentId: row.parent_id,
    // Fix: Changed 'hierarchy_path' to 'hierarchyPath' to match Taxon interface
    hierarchyPath: row.hierarchy_path ? row.hierarchy_path.replace(/_/g, '-') : undefined,
    
    plantNameId: row.wcvp_id,
    ipniId: row.ipni_id,
    powoId: row.powo_id,
    accepted_plant_name_id: row.accepted_plant_name_id,
    parentPlantNameId: row.parent_plant_name_id,
    // Fix: Corrected typo 'basionymPlantName_id' to 'basionymPlantNameId'
    basionymPlantNameId: row.basionym_plant_name_id,
    homotypicSynonym: row.homotypic_synonym,

    taxonRank: row.taxon_rank as TaxonRank,
    taxonName: row.taxon_name,
    taxonStatus: row.taxon_status as TaxonomicStatus,
    family: row.family,
    commonName: row.common_name,
    
    genus: row.genus,
    genusHybrid: row.genus_hybrid,
    species: row.species,
    speciesHybrid: row.species_hybrid,
    infraspecies: row.infraspecies,
    infraspecificRank: row.infraspecific_rank,
    cultivar: row.cultivar || (row.taxon_rank === 'cultivar' && row.taxon_name.includes("'") ? row.taxon_name.split("'")[1] : undefined), 
    
    hybridFormula: row.hybrid_formula,

    taxonAuthors: row.taxon_authors,
    primaryAuthor: row.primary_author,
    parentheticalAuthor: row.parenthetical_author,
    publicationAuthor: row.publication_author,
    // Fix: Corrected typo 'replaced_synonym_author' to 'replacedSynonymAuthor'
    replacedSynonymAuthor: row.replaced_synonym_author,

    placeOfPublication: row.place_of_publication,
    volumeAndPage: row.volume_and_page,
    firstPublished: row.first_published,
    // Fix: Corrected typo 'nomenclatural_remarks' to 'nomenclaturalRemarks'
    nomenclaturalRemarks: row.nomenclatural_remarks,
    reviewed: row.reviewed,

    geographicArea: row.geographic_area,
    lifeformDescription: row.lifeform_description,
    climateDescription: row.climate_description,

    name: row.taxon_rank === 'cultivar' && row.taxon_name.includes("'") 
          ? row.taxon_name.match(/'([^']+)'/)?.[1] || row.taxon_name 
          : (row.infraspecies || row.species || row.genus || row.taxon_name),

    description: row.details?.description_text, 
    synonyms: [], 
    referenceLinks: [], 
    
    isDetailsLoaded: !!row.details,
    createdAt: new Date(row.created_at).getTime(),
    descendantCount: row.descendant_count || 0
  };
};

const mapToDB = (taxon: Taxon) => {
  return {
    id: taxon.id,
    parent_id: taxon.parentId,
    hierarchy_path: taxon.hierarchyPath ? taxon.hierarchyPath.replace(/-/g, '_') : undefined,
    
    wcvp_id: taxon.plantNameId,
    ipni_id: taxon.ipniId,
    powo_id: taxon.powoId,
    accepted_plant_name_id: taxon.acceptedPlantNameId,
    parent_plant_name_id: taxon.parentPlantNameId,
    basionym_plant_name_id: taxon.basionymPlantNameId,
    homotypic_synonym: taxon.homotypicSynonym,

    taxon_rank: taxon.taxonRank,
    taxon_name: taxon.taxonName,
    taxon_status: taxon.taxonStatus,
    family: taxon.family,
    // Fix: Corrected common_name typo to commonName
    common_name: taxon.commonName,

    genus: taxon.genus,
    genus_hybrid: taxon.genusHybrid,
    species: taxon.species,
    // Fix: Corrected species_hybrid typo to speciesHybrid
    species_hybrid: taxon.speciesHybrid,
    infraspecies: taxon.infraspecies,
    // Fix: Changed 'infraspecific_rank' to 'infraspecificRank' to match Taxon interface
    infraspecific_rank: taxon.infraspecificRank,
    cultivar: taxon.cultivar,
    
    hybrid_formula: taxon.hybridFormula,

    taxon_authors: taxon.taxonAuthors,
    primary_author: taxon.primaryAuthor,
    parenthetical_author: taxon.parentheticalAuthor,
    publication_author: taxon.publicationAuthor,
    replaced_synonym_author: taxon.replacedSynonymAuthor,

    placeOfPublication: taxon.placeOfPublication,
    volumeAndPage: taxon.volumeAndPage,
    firstPublished: taxon.firstPublished,
    nomenclatural_remarks: taxon.nomenclaturalRemarks,
    reviewed: taxon.reviewed,

    geographic_area: taxon.geographicArea,
    // Fix: Changed 'lifeform_description' to 'lifeformDescription' to match Taxon interface
    lifeform_description: taxon.lifeformDescription,
    // Fix: Changed 'climate_description' to 'climateDescription' to match Taxon interface
    climate_description: taxon.climateDescription,

    updated_at: new Date().toISOString()
  };
};

// --- CRUD OPERATIONS ---

export interface FetchOptions {
    offset?: number;
    limit?: number;
    filters?: Record<string, any>; 
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    shouldCount?: boolean; // NEW: Prevent redundant expensive counts
}

export const dataService = {
  
  async getTaxa(options: FetchOptions = {}): Promise<{ data: Taxon[], count: number }> {
    const { 
        offset = 0, 
        limit = 100,
        filters = {},
        sortBy = 'taxonName',
        sortDirection = 'asc',
        shouldCount = false
    } = options;

    if (getIsOffline()) return { data: [], count: 0 };

    let query = getSupabase()
      .from(DB_TABLE)
      .select('*', shouldCount ? { count: 'estimated' } : {});

    // --- Dynamic Filtering ---
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        
        let dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (key === 'plantNameId') dbKey = 'wcvp_id'; 
        
        if (key === 'taxonName') {
            // OPTIMIZATION: Use LIKE (Case Sensitive) for prefix matching.
            const rawSearch = (value as string).trim();
            if (!rawSearch) return; // SAFETY: Ignore empty strings after trim
            
            // Ensure first letter is capitalized for the index
            const cleanSearch = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1);
            query = query.like('taxon_name', `${cleanSearch}%`);
        } else if (Array.isArray(value)) {
            if (value.length > 0) {
                 const hasNull = value.includes('NULL');
                 const realValues = value.filter(v => v !== 'NULL');
                 if (hasNull && realValues.length > 0) {
                     query = query.or(`${dbKey}.in.(${realValues.join(',')}),${dbKey}.is.null`);
                 } else if (hasNull) {
                     query = query.is(dbKey, null);
                 } else {
                     query = query.in(dbKey, value);
                 }
            }
        } else {
            const strVal = String(value).trim();
            if(strVal) {
                 if (key.endsWith('Id') || key === 'firstPublished') {
                     query = query.eq(dbKey, strVal);
                 } else {
                     query = query.like(dbKey, `${strVal}%`);
                 }
            }
        }
    });

    // Sort Mapping
    const dbSortKey = sortBy === 'taxonName' ? 'taxon_name' 
                    : sortBy === 'taxonRank' ? 'taxon_rank'
                    : sortBy === 'family' ? 'family'
                    : sortBy === 'genus' ? 'genus'
                    : sortBy === 'genusHybrid' ? 'genus_hybrid'
                    : sortBy === 'species' ? 'species'
                    : sortBy === 'speciesHybrid' ? 'species_hybrid'
                    : sortBy === 'cultivar' ? 'cultivar'
                    : sortBy === 'taxonStatus' ? 'taxon_status'
                    : sortBy.replace(/([A-Z])/g, "_$1").toLowerCase(); 

    query = query.order(dbSortKey, { ascending: sortDirection === 'asc' });

    const to = offset + limit - 1;
    const { data, error, count } = await query.range(offset, to);

    if (error) {
      if (error.code === '57014') {
          console.warn("Database timeout (57014) - Row count/fetch taking too long.");
          return { data: [], count: -1 }; // -1 indicates "Unknown"
      }
      throw error;
    }

    return { 
        data: (data || []).map(mapFromDB), 
        count: count ?? -1
    };
  },

  async upsertTaxon(taxon: Taxon) {
    if (getIsOffline()) return;
    const dbPayload = mapToDB(taxon);
    const { error } = await getSupabase().from(DB_TABLE).upsert(dbPayload);
    if (error) throw error;
  },

  async deleteTaxon(id: string) {
    if (getIsOffline()) return;
    const { error } = await getSupabase().from(DB_TABLE).delete().eq('id', id);
    if (error) throw error;
  },
  
  async batchInsert(taxa: Taxon[]) {
      if (getIsOffline() || taxa.length === 0) return;
      const payloads = taxa.map(mapToDB);
      const { error } = await getSupabase().from(DB_TABLE).insert(payloads);
      if (error) throw error;
  }
};
