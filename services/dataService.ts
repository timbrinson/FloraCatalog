import { getSupabase, getIsOffline } from './supabaseClient';
import { Taxon, Synonym, Link, DataSource } from '../types';

/**
 * Service to handle interaction with the Supabase PostgreSQL Database.
 */

const DB_TABLE = 'app_taxa';
const DETAILS_TABLE = 'app_taxon_details';
const SOURCES_TABLE = 'app_data_sources';

// --- MAPPERS ---

// Fix: Correct property names from snake_case to camelCase to match DataSource interface
const mapSourceFromDB = (row: any): DataSource => ({
    id: row.id,
    name: row.name,
    version: row.version,
    // Fix: changed citation_text to citationText
    citationText: row.citation_text,
    url: row.url,
    trustLevel: row.trust_level
});

const mapFromDB = (row: any): Taxon => {
  const details = row.details || {};
  return {
    id: row.id,
    parentId: row.parent_id,
    // Fix: changed hierarchy_path to hierarchyPath
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
    infraspecificRank: row.infraspecificRank,
    cultivar: row.cultivar || (row.taxon_rank === 'cultivar' && row.taxon_name.includes("'") ? row.taxon_name.split("'")[1] : undefined), 
    
    hybridFormula: row.hybrid_formula,

    taxonAuthors: row.taxon_authors,
    primaryAuthor: row.primary_author,
    parentheticalAuthor: row.parenthetical_author,
    publicationAuthor: row.publication_author,
    replacedSynonymAuthor: row.replaced_synonym_author,

    placeOfPublication: row.place_of_publication,
    volumeAndPage: row.volumeAndPage,
    firstPublished: row.first_published,
    nomenclaturalRemarks: row.nomenclatural_remarks,
    reviewed: row.reviewed,

    geographicArea: row.geographic_area,
    // Fix: changed lifeform_description to lifeformDescription
    lifeformDescription: row.lifeform_description,
    climateDescription: row.climate_description,

    sourceId: row.source_id,
    verificationLevel: row.verification_level,

    name: row.taxon_rank === 'cultivar' && row.taxon_name.includes("'") 
          ? row.taxon_name.match(/'([^']+)'/)?.[1] || row.taxon_name 
          : (row.infraspecies || row.species || row.genus || row.taxon_name),

    // Knowledge Layer Mapping
    description: details.description_text, 
    hardinessMin: details.hardiness_zone_min,
    hardinessMax: details.hardiness_zone_max,
    heightMin: details.height_min_cm,
    heightMax: details.height_max_cm,
    widthMin: details.width_min_cm,
    widthMax: details.width_max_cm,
    originYear: details.origin_year,
    morphology: details.morphology,
    ecology: details.ecology,
    history: details.history_metadata?.background, 
    synonyms: details.alternative_names || [], 
    referenceLinks: details.reference_links || [], 
    
    isDetailsLoaded: !!row.details,
    createdAt: new Date(row.created_at).getTime(),
    // Fix: changed descendant_count to descendantCount
    descendantCount: row.descendant_count || 0
  };
};

const mapToDB = (taxon: Taxon) => {
  // Safeguard: Ensure no literal "null" strings are saved
  const clean = (val: any) => (val === 'null' || val === null || val === undefined) ? null : val;

  return {
    id: taxon.id,
    parent_id: taxon.parentId,
    hierarchy_path: taxon.hierarchyPath ? taxon.hierarchyPath.replace(/-/g, '_') : undefined,
    
    wcvp_id: clean(taxon.wcvpId),
    ipni_id: clean(taxon.ipniId),
    powo_id: clean(taxon.powoId),
    accepted_plant_name_id: clean(taxon.acceptedPlantNameId),
    parent_plant_name_id: clean(taxon.parentPlantNameId),
    basionym_plant_name_id: clean(taxon.basionymPlantNameId),
    homotypic_synonym: clean(taxon.homotypicSynonym),

    taxon_rank: taxon.taxonRank,
    taxon_name: taxon.taxonName,
    taxon_status: taxon.taxonStatus,
    family: clean(taxon.family),
    common_name: clean(taxon.commonName),

    genus: clean(taxon.genus),
    genus_hybrid: clean(taxon.genusHybrid),
    species: clean(taxon.species),
    species_hybrid: clean(taxon.speciesHybrid),
    infraspecies: clean(taxon.infraspecies),
    infraspecific_rank: clean(taxon.infraspecificRank),
    cultivar: clean(taxon.cultivar),
    
    hybrid_formula: clean(taxon.hybridFormula),

    taxon_authors: clean(taxon.taxonAuthors),
    primary_author: clean(taxon.primaryAuthor),
    parenthetical_author: clean(taxon.parentheticalAuthor),
    publication_author: clean(taxon.publicationAuthor),
    replaced_synonym_author: clean(taxon.replacedSynonymAuthor),

    place_of_publication: clean(taxon.placeOfPublication),
    volume_and_page: clean(taxon.volumeAndPage),
    first_published: clean(taxon.firstPublished),
    nomenclatural_remarks: clean(taxon.nomenclaturalRemarks),
    reviewed: clean(taxon.reviewed),

    geographic_area: clean(taxon.geographicArea),
    // Fix: changed lifeform_description to lifeformDescription
    lifeform_description: clean(taxon.lifeformDescription),
    climate_description: clean(taxon.climateDescription),

    source_id: taxon.sourceId,
    verification_level: taxon.verificationLevel,

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

  // --- SOURCE MANAGEMENT ---
  
  async getDataSources(): Promise<DataSource[]> {
      if (getIsOffline()) return [];
      const { data, error } = await getSupabase()
          .from(SOURCES_TABLE)
          .select('*')
          .order('trust_level', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(mapSourceFromDB);
  },

  async ensureDataSource(source: Partial<DataSource>): Promise<DataSource> {
      if (getIsOffline()) throw new Error("Offline");
      const { data, error } = await getSupabase()
          .from(SOURCES_TABLE)
          .upsert({
              name: source.name,
              version: source.version,
              citation_text: source.citationText,
              url: source.url,
              trust_level: source.trustLevel || 1
          }, { onConflict: 'name, version' })
          .select()
          .single();
      
      if (error) throw error;
      return mapSourceFromDB(data);
  },

  // --- TAXA CRUD ---
  
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
      .select('*, details:app_taxon_details(*)', shouldCount ? { count: 'estimated' } : {});

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
                query = query.eq(dbKey, cleanVal);
            } else {
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

  /**
   * findTaxonByName: Robust botanical lookup.
   * Uses case-sensitive equality match first to hit COLLATE "C" indexes.
   * Falls back to Title-Cased equality for common nomenclature.
   */
  async findTaxonByName(name: string): Promise<Taxon | null> {
      if (getIsOffline()) return null;
      
      const cleanName = name.trim();
      const titleCased = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      
      console.log(`[dataService] findTaxonByName: Looking up "${cleanName}"...`);

      // Step 1: Try exact match (Fastest, Hits Index)
      const { data: exact, error: exactError } = await getSupabase()
          .from(DB_TABLE)
          .select('*, details:app_taxon_details(*)')
          .eq('taxon_name', cleanName)
          .maybeSingle();
      
      if (!exactError && exact) {
          console.log(`[dataService] Success: Exact match found for "${cleanName}".`);
          return mapFromDB(exact);
      }

      // Step 2: Try Title Case match (Common for botanical names)
      if (titleCased !== cleanName) {
          console.log(`[dataService] Fallback: Trying title case "${titleCased}"...`);
          const { data: titled, error: titleError } = await getSupabase()
              .from(DB_TABLE)
              .select('*, details:app_taxon_details(*)')
              .eq('taxon_name', titleCased)
              .maybeSingle();
          
          if (!titleError && titled) {
              console.log(`[dataService] Success: Title case match found.`);
              return mapFromDB(titled);
          }
      }

      // Step 3: Hybrid symbol normalization fallback
      const normalized = cleanName.replace(/\sx\s/gi, ' × ').replace(/\sX\s/g, ' × ');
      if (normalized !== cleanName && normalized !== titleCased) {
          console.log(`[dataService] Fallback: Trying symbol normalization "${normalized}"...`);
          const { data: norm, error: normError } = await getSupabase()
              .from(DB_TABLE)
              .select('*, details:app_taxon_details(*)')
              .eq('taxon_name', normalized)
              .maybeSingle();
          
          if (!normError && norm) {
              console.log(`[dataService] Success: Normalized symbol match found.`);
              return mapFromDB(norm);
          }
      }
      
      console.log(`[dataService] No match found for "${cleanName}" in catalog.`);
      return null;
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
    
    const dbUpdates: any = {};
    const detailUpdates: any = {};
    const detailKeys = ['description', 'hardinessMin', 'hardinessMax', 'heightMin', 'heightMax', 'widthMin', 'widthMax', 'originYear', 'morphology', 'ecology', 'history', 'synonyms', 'referenceLinks'];

    Object.entries(updates).forEach(([key, value]) => {
      if (detailKeys.includes(key)) {
         if (key === 'description') detailUpdates.description_text = value;
         else if (key === 'hardinessMin') detailUpdates.hardiness_zone_min = value;
         else if (key === 'hardinessMax') detailUpdates.hardiness_zone_max = value;
         else if (key === 'heightMin') detailUpdates.height_min_cm = value;
         else if (key === 'heightMax') detailUpdates.height_max_cm = value;
         else if (key === 'widthMin') detailUpdates.width_min_cm = value;
         else if (key === 'widthMax') detailUpdates.width_max_cm = value;
         else if (key === 'originYear') detailUpdates.origin_year = value;
         else if (key === 'history') detailUpdates.history_metadata = { ...detailUpdates.history_metadata, background: value };
         else if (key === 'synonyms') detailUpdates.alternative_names = value;
         else if (key === 'referenceLinks') detailUpdates.reference_links = value;
         else detailUpdates[key] = value;
      } else {
         const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
         dbUpdates[dbKey] = value;
      }
    });

    if (Object.keys(dbUpdates).length > 0) {
      const { error: coreError } = await getSupabase().from(DB_TABLE).update(dbUpdates).eq('id', id);
      if (coreError) throw coreError;
    }

    if (Object.keys(detailUpdates).length > 0) {
      const { error: detailError } = await getSupabase().from(DETAILS_TABLE).upsert({ taxon_id: id, ...detailUpdates });
      if (detailError) throw detailError;
    }
  },

  async deleteTaxon(id: string): Promise<void> {
    if (getIsOffline()) throw new Error("Cannot delete in offline mode");
    const { error } = await getSupabase()
      .from(DB_TABLE)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * purgeNonWCVPTaxa: Highly resilient direct deletion.
   */
  async purgeNonWCVPTaxa(): Promise<void> {
      if (getIsOffline()) throw new Error("Cannot reset in offline mode");
      
      const { error } = await getSupabase()
          .from(DB_TABLE)
          .delete()
          .or('source_id.neq.1,source_id.is.null');

      if (error) {
          if (error.message.includes('timeout')) {
              throw new Error("Statement timeout: The table is too large for a direct browser-based purge. Please use the SQL editor.");
          }
          throw error;
      }
  },

  async wipeAllDetails(): Promise<void> {
      if (getIsOffline()) throw new Error("Cannot reset in offline mode");
      const { error } = await getSupabase()
          .from(DETAILS_TABLE)
          .delete()
          .neq('taxon_id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
  }
};