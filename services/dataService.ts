import { getSupabase, getIsOffline } from './supabaseClient';
import { Taxon, Synonym, Link, DataSource, BuildDashboardData } from '../types';

/**
 * Service to handle interaction with the Supabase PostgreSQL Database.
 * ADR-004: Universal snake_case standardization.
 */

const DB_TABLE = 'app_taxa';
const DETAILS_TABLE = 'app_taxon_details';
const SOURCES_TABLE = 'app_data_sources';
const SETTINGS_TABLE = 'app_settings_global';

// --- MAPPERS ---

const mapSourceFromDB = (row: any): DataSource => ({
    ...row // ADR-004: DB columns match TS interface exactly
});

const mapFromDB = (row: any): Taxon => {
  const details = row.details || {};
  const rank_lower = (row.taxon_rank || '').toLowerCase();
  
  return {
    ...row,
    // Fix ltree underscore/dash representation for UI logic if needed
    hierarchy_path: row.hierarchy_path ? row.hierarchy_path.replace(/_/g, '-') : undefined,
    
    // Virtual name field logic
    name: rank_lower === 'cultivar' && row.taxon_name.includes("'") 
          ? row.taxon_name.match(/'([^']+)'/)?.[1] || row.taxon_name 
          : (row.infraspecies || row.species || row.genus || row.taxon_name),

    // Details mapping (Golden Record Table)
    description_text: details.description_text, 
    hardiness_zone_min: details.hardiness_zone_min,
    hardiness_zone_max: details.hardiness_zone_max,
    height_min_cm: details.height_min_cm,
    height_max_cm: details.height_max_cm,
    width_min_cm: details.width_min_cm,
    width_max_cm: details.width_max_cm,
    origin_year: details.origin_year,
    morphology: details.morphology,
    ecology: details.ecology,
    history_metadata: details.history_metadata,
    alternative_names: details.alternative_names || [], 
    reference_links: details.reference_links || [], 
    
    is_details_loaded: !!row.details,
    created_at: new Date(row.created_at).getTime(),
    descendant_count: row.descendant_count || 0
  };
};

const mapToDB = (taxon: Taxon) => {
  const clean = (val: any) => (val === 'null' || val === null || val === undefined) ? null : val;

  // We only care about core app_taxa columns for the core table map
  return {
    id: taxon.id,
    parent_id: taxon.parent_id,
    hierarchy_path: taxon.hierarchy_path ? taxon.hierarchy_path.replace(/-/g, '_') : undefined,
    wcvp_id: clean(taxon.wcvp_id),
    ipni_id: clean(taxon.ipni_id),
    powo_id: clean(taxon.powo_id),
    accepted_plant_name_id: clean(taxon.accepted_plant_name_id),
    parent_plant_name_id: clean(taxon.parent_plant_name_id),
    basionym_plant_name_id: clean(taxon.basionym_plant_name_id),
    homotypic_synonym: clean(taxon.homotypic_synonym),
    taxon_rank: taxon.taxon_rank,
    taxon_name: taxon.taxon_name,
    taxon_status: taxon.taxon_status,
    family: clean(taxon.family),
    common_name: clean(taxon.common_name),
    genus: clean(taxon.genus),
    genus_hybrid: clean(taxon.genus_hybrid),
    species: clean(taxon.species),
    species_hybrid: clean(taxon.species_hybrid),
    infraspecies: clean(taxon.infraspecies),
    infraspecific_rank: clean(taxon.infraspecific_rank),
    cultivar: clean(taxon.cultivar),
    hybrid_formula: clean(taxon.hybrid_formula),
    taxon_authors: clean(taxon.taxon_authors),
    primary_author: clean(taxon.primary_author),
    publication_author: clean(taxon.publication_author),
    replaced_synonym_author: clean(taxon.replaced_synonym_author),
    place_of_publication: clean(taxon.place_of_publication),
    volume_and_page: clean(taxon.volume_and_page),
    first_published: clean(taxon.first_published),
    nomenclatural_remarks: clean(taxon.nomenclatural_remarks),
    reviewed: clean(taxon.reviewed),
    geographic_area: clean(taxon.geographic_area),
    lifeform_description: clean(taxon.lifeform_description),
    climate_description: clean(taxon.climate_description),
    source_id: taxon.source_id,
    verification_level: taxon.verification_level,
    updated_at: new Date().toISOString()
  };
};

export interface FetchOptions {
    offset?: number;
    limit?: number;
    filters?: Record<string, any>; 
    sort_by?: string;
    sort_direction?: 'asc' | 'desc';
    should_count?: boolean;
    search_mode?: 'prefix' | 'fuzzy'; 
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
              citation_text: source.citation_text,
              url: source.url,
              trust_level: source.trust_level || 1
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
        sort_by = 'taxon_name',
        sort_direction = 'asc',
        should_count = false,
        search_mode = 'prefix'
    } = options;

    if (getIsOffline()) return { data: [], count: 0 };

    // Baseline Optimization: If no active user-filters, use a safer counting approach
    const isBaseline = Object.entries(filters).every(([k, v]) => {
      if (k === 'taxon_status') return Array.isArray(v) && v.length === 1 && v[0] === 'Accepted';
      return !v || (Array.isArray(v) && v.length === 0);
    });

    let query = getSupabase()
      .from(DB_TABLE)
      .select('*, details:app_taxon_details(*)', (should_count && !isBaseline) ? { count: 'estimated' } : {});

    // --- Dynamic Filtering ---
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        
        const dbKey = key;
        
        if (typeof value === 'string') {
            const rawSearch = value.trim();
            if (!rawSearch) return;

            let cleanVal = rawSearch;
            if (search_mode === 'prefix') {
                if (key === 'family' || key === 'genus') {
                    cleanVal = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1).toLowerCase();
                } else if (key === 'species' || key === 'infraspecies') {
                    cleanVal = rawSearch.toLowerCase();
                } else if (key === 'taxon_name' || key === 'cultivar') {
                    cleanVal = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1);
                }
            }

            // --- Filter Mode Dispatcher ---
            const isTechnicalId = key === 'id' || key.endsWith('_id');
            const isStrictMetadata = key === 'first_published';

            if (key === 'taxon_name') {
                if (search_mode === 'fuzzy') {
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
                 
                 // Quoting values for PostgREST 'or' logic to handle spaces (e.g. "Artificial Hybrid")
                 // This fixes 500 "No apikey found" errors caused by malformed request URLs.
                 if (realValues.length > 0) {
                    const quotedValues = realValues.map(v => `"${v}"`).join(',');
                    if (hasNull) {
                        query = query.or(`${dbKey}.in.(${quotedValues}),${dbKey}.is.null`);
                    } else {
                        query = query.or(`${dbKey}.in.(${quotedValues})`);
                    }
                 } else if (hasNull) {
                    query = query.is(dbKey, null);
                 }
            }
        }
    });

    // --- Sorting & Pagination ---
    if (sort_by) {
        query = query.order(sort_by, { ascending: sort_direction === 'asc' });
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.message?.includes('timeout') || error.code === '57014') {
          throw new Error("The database timed out processing this large request. Try adding more specific filters.");
      }
      throw error;
    }

    // Baseline fallback count to avoid scanning 1.4M rows on every page load
    const finalCount = isBaseline ? 1440000 : (count || -1);
    
    return { data: (data || []).map(mapFromDB), count: finalCount };
  },

  async getBuildDashboard(): Promise<BuildDashboardData | null> {
    if (getIsOffline()) return null;
    
    try {
        const supabase = getSupabase();
        
        // Use parallel queries for dashboard performance
        const [totalRes, builtRes, ordersRes, orphansRes] = await Promise.all([
            supabase.from(DB_TABLE).select('*', { count: 'estimated', head: true }),
            supabase.from(DB_TABLE).select('id', { count: 'exact', head: true }).not('hierarchy_path', 'is', null),
            supabase.from(DB_TABLE).select('id', { count: 'exact', head: true }).eq('taxon_rank', 'Order').is('parent_id', null).not('hierarchy_path', 'is', null),
            supabase.from(DB_TABLE).select('id', { count: 'exact', head: true }).neq('taxon_rank', 'Order').is('parent_id', null).not('hierarchy_path', 'is', null)
        ]);

        const total = totalRes.count || 1441043; // Fallback to your reported total
        const built = builtRes.count || 0;
        const cleaned = total - (total - built); // Logic: How many are NOT NULL?

        // This matches your Query 9 and 10 logic
        return {
            total_records: total,
            dirty_paths: total - built, 
            cleaned_rows: built,
            paths_built: built,
            wfo_order_roots: ordersRes.count || 0,
            orphaned_roots: orphansRes.count || 0,
            reset_completion: built > 0 ? 100 : 0, // In Query 9 context, reset completion means hierarchy_path IS NULL
            build_completion: Math.round((built * 100.0) / total)
        };
    } catch (e) {
        return null;
    }
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
   * findTaxonByName: Matches names against DB, handling synonym redirection metadata.
   */
  async findTaxonByName(name: string): Promise<(Taxon & { accepted_name_found?: string }) | null> {
      if (getIsOffline()) return null;
      const cleanName = name.trim();
      
      const { data, error } = await getSupabase()
          .from(DB_TABLE)
          .select('*, details:app_taxon_details(*)')
          .ilike('taxon_name', cleanName)
          .limit(5);

      if (error || !data || data.length === 0) return null;
      
      const bestMatch = data.find(t => t.taxon_status === 'Accepted' || t.taxon_status === 'Artificial Hybrid') || data[0];
      const mapped = mapFromDB(bestMatch);

      // Synonym Redirection Logic
      if (bestMatch.taxon_status === 'Synonym' && bestMatch.accepted_plant_name_id) {
          const { data: accepted } = await getSupabase()
              .from(DB_TABLE)
              .select('taxon_name')
              .eq('wcvp_id', bestMatch.accepted_plant_name_id)
              .maybeSingle();
          
          if (accepted) {
              return { ...mapped, accepted_name_found: accepted.taxon_name };
          }
      }

      return mapped;
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
    const detailKeys = ['description_text', 'hardiness_zone_min', 'hardiness_zone_max', 'height_min_cm', 'height_max_cm', 'width_min_cm', 'width_max_cm', 'origin_year', 'morphology', 'ecology', 'history_metadata', 'alternative_names', 'reference_links'];

    Object.entries(updates).forEach(([key, value]) => {
      if (detailKeys.includes(key)) {
         detailUpdates[key] = value;
      } else {
         dbUpdates[key] = value;
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

  async purgeNonWCVPTaxa(): Promise<void> {
      if (getIsOffline()) throw new Error("Cannot reset in offline mode");
      // Refined Purge Strategy (ADR-003): 
      // Protect official WCVP (1) and System Derived (2) records. 
      // Purge only manual user additions or unknown entries (3+).
      const { error } = await getSupabase()
          .from(DB_TABLE)
          .delete()
          .not('source_id', 'in', '(1,2)');
      if (error) {
          if (error.message.includes('timeout')) {
              throw new Error("Statement timeout. Please use the SQL editor.");
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
  },

  // --- SETTINGS PERSISTENCE ---

  async getGlobalSettings(): Promise<any> {
      if (getIsOffline()) return null;
      const { data, error } = await getSupabase()
          .from(SETTINGS_TABLE)
          .select('settings')
          .eq('id', 'default_config')
          .maybeSingle();
      
      if (error) return null;
      return data?.settings;
  },

  async saveGlobalSettings(settings: any): Promise<void> {
      if (getIsOffline()) return;
      const { error } = await getSupabase()
          .from(SETTINGS_TABLE)
          .upsert({ id: 'default_config', settings, updated_at: new Date().toISOString() });
      
      if (error) console.error("Failed to save global settings:", error);
  }
};