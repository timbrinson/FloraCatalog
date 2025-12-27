import { getSupabase, getIsOffline } from './supabaseClient';
import { Taxon, Synonym, Link } from '../types';

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
    hierarchyPath: row.hierarchy_path ? row.hierarchy_path.replace(/_/g, '-') : undefined,
    
    wcvpId: row.wcvp_id,
    ipniId: row.ipni_id,
    powoId: row.powo_id,
    acceptedPlantNameId: row.accepted_plant_name_id,
    parentPlantNameId: row.parent_plant_name_id,
    basionymPlantNameId: row.basionym_plant_name_id,
    homotypicSynonym: row.homotypic_synonym,

    taxonRank: row.taxon_rank as string,
    taxonName: row.taxon_name,
    taxonStatus: row.taxon_status as string,
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
    replacedSynonymAuthor: row.replaced_synonym_author,

    placeOfPublication: row.place_of_publication,
    volumeAndPage: row.volume_and_page,
    firstPublished: row.first_published,
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
    
    wcvp_id: taxon.wcvpId,
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
    common_name: taxon.commonName,

    genus: taxon.genus,
    // Fix: Using correct camelCase property from Taxon interface
    genus_hybrid: taxon.genusHybrid,
    species: taxon.species,
    // Fix: Using correct camelCase property from Taxon interface
    species_hybrid: taxon.speciesHybrid,
    infraspecies: taxon.infraspecies,
    // Fix: Using correct camelCase property from Taxon interface
    infraspecific_rank: taxon.infraspecificRank,
    cultivar: taxon.cultivar,
    
    hybrid_formula: taxon.hybridFormula,

    taxon_authors: taxon.taxonAuthors,
    primary_author: taxon.primaryAuthor,
    parenthetical_author: taxon.parentheticalAuthor,
    publication_author: taxon.publicationAuthor,
    replaced_synonym_author: taxon.replacedSynonymAuthor,

    place_of_publication: taxon.placeOfPublication,
    volume_and_page: taxon.volumeAndPage,
    first_published: taxon.firstPublished,
    nomenclatural_remarks: taxon.nomenclaturalRemarks,
    reviewed: taxon.reviewed,

    geographic_area: taxon.geographicArea,
    lifeform_description: taxon.lifeformDescription,
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
    shouldCount?: boolean;
    searchMode?: 'prefix' | 'fuzzy'; 
}

export const dataService = {
  
  async getTaxa(options: FetchOptions = {}): Promise<{ data: Taxon[], count: number }> {
    const { 
        offset = 0, 
        limit = 100,
        filters = {},
        sortBy = 'taxonName',
        sortDirection = 'asc',
        shouldCount = false,
        searchMode = 'prefix'
    } = options;

    if (getIsOffline()) return { data: [], count: 0 };

    let query = getSupabase()
      .from(DB_TABLE)
      .select('*', shouldCount ? { count: 'estimated' } : {});

    // --- Dynamic Filtering ---
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        
        let dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (key === 'wcvpId') dbKey = 'wcvp_id'; 
        if (key === 'ipniId') dbKey = 'ipni_id';
        if (key === 'powoId') dbKey = 'powo_id';
        
        if (typeof value === 'string') {
            const rawSearch = value.trim();
            if (!rawSearch) return;

            let cleanVal = rawSearch;
            if (searchMode === 'prefix') {
                if (key === 'family' || key === 'genus') {
                    cleanVal = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1).toLowerCase();
                } else if (key === 'species' || key === 'infraspecies') {
                    cleanVal = rawSearch.toLowerCase();
                } else if (key === 'taxonName' || key === 'cultivar') {
                    cleanVal = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1);
                }
            }

            // --- Filter Mode Dispatcher ---
            const isTechnicalId = key === 'id' || key.endsWith('Id');
            const isStrictMetadata = key === 'firstPublished';

            if (key === 'taxonName') {
                if (searchMode === 'fuzzy') {
                    query = query.ilike('taxon_name', `%${rawSearch}%`);
                } else {
                    query = query.like('taxon_name', `${cleanVal}%`);
                }
            } else if (isTechnicalId || isStrictMetadata) {
                // Technical Equality: Strict exact match (=)
                query = query.eq(dbKey, cleanVal);
            } else {
                // Standard Prefix Search: Starts with (LIKE 'Val%')
                query = query.like(dbKey, `${cleanVal}%`);
            }
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
        }
    });

    // --- Sorting & Pagination ---
    if (sortBy) {
        let dbSortKey = sortBy.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (sortBy === 'wcvpId') dbSortKey = 'wcvp_id';
        query = query.order(dbSortKey, { ascending: sortDirection === 'asc' });
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: (data || []).map(mapFromDB), count: count || -1 };
  },

  async getTaxonById(id: string): Promise<Taxon | null> {
    if (getIsOffline()) return null;
    const { data, error } = await getSupabase()
      .from(DB_TABLE)
      .select('*, details:app_taxon_details(*)')
      .eq('id', id)
      .single();

    if (error) return null;
    return mapFromDB(data);
  },

  async createTaxon(taxon: Taxon): Promise<Taxon> {
    if (getIsOffline()) throw new Error("Cannot create in offline mode");
    const dbRow = mapToDB(taxon);
    const { data, error } = await getSupabase()
      .from(DB_TABLE)
      .insert(dbRow)
      .select()
      .single();

    if (error) throw error;
    return mapFromDB(data);
  },

  async updateTaxon(id: string, updates: Partial<Taxon>): Promise<void> {
    if (getIsOffline()) throw new Error("Cannot update in offline mode");
    
    // We only update the core table fields here
    const dbUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      // Don't update complex UI-only fields or derived fields in this simplified method
      if (['description', 'synonyms', 'referenceLinks', 'isDetailsLoaded'].includes(key)) return;
      
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      dbUpdates[dbKey] = value;
    });

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await getSupabase()
      .from(DB_TABLE)
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteTaxon(id: string): Promise<void> {
    if (getIsOffline()) throw new Error("Cannot delete in offline mode");
    const { error } = await getSupabase()
      .from(DB_TABLE)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};