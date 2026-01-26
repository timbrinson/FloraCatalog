import { getSupabase, getIsOffline } from './supabaseClient';
import { Taxon, Synonym, Link, DataSource, BuildDashboardData, SearchCandidate, LineageMapEntry } from '../types';
import { getNakedName, parseBotanicalName, assembleScientificName } from '../utils/formatters';

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
    kingdom: clean(taxon.kingdom),
    phylum: clean(taxon.phylum),
    class: clean(taxon.class),
    "order": clean(taxon.order),
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
    parenthetical_author: clean(taxon.parenthetical_author),
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

    const isBaseline = Object.entries(filters).every(([k, v]) => {
      if (k === 'taxon_status') return Array.isArray(v) && v.length === 1 && v[0] === 'Accepted';
      return !v || (Array.isArray(v) && v.length === 0);
    });

    let query = getSupabase()
      .from(DB_TABLE)
      .select('*, details:app_taxon_details(*)', (should_count && !isBaseline) ? { count: 'estimated' } : {});

    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        const dbKey = key;
        if (typeof value === 'string') {
            const rawSearch = value.trim();
            if (!rawSearch) return;
            let cleanVal = rawSearch;
            if (search_mode === 'prefix') {
                if (key === 'kingdom' || key === 'phylum' || key === 'class' || key === 'order' || key === 'family' || key === 'genus') {
                    cleanVal = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1).toLowerCase();
                } else if (key === 'species' || key === 'infraspecies') {
                    cleanVal = rawSearch.toLowerCase();
                } else if (key === 'taxon_name' || key === 'cultivar') {
                    cleanVal = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1);
                }
            }
            const isTechnicalId = key === 'id' || key.endsWith('_id');
            const isStrictMetadata = key === 'first_published';
            if (key === 'taxon_name') {
                if (search_mode === 'fuzzy') query = query.ilike('taxon_name', `%${rawSearch}%`);
                else query = query.like('taxon_name', `${cleanVal}%`);
            } else if (isTechnicalId || isStrictMetadata) {
                query = query.eq(dbKey, cleanVal);
            } else {
                query = query.like(dbKey, `${cleanVal}%`);
            }
        } else if (Array.isArray(value)) {
            if (value.length > 0) {
                 const hasNull = value.includes('NULL');
                 const realValues = value.filter(v => v !== 'NULL');
                 if (realValues.length > 0) {
                    const quotedValues = realValues.map(v => `"${v}"`).join(',');
                    if (hasNull) query = query.or(`${dbKey}.in.(${quotedValues}),${dbKey}.is.null`);
                    else query = query.or(`${dbKey}.in.(${quotedValues})`);
                 } else if (hasNull) {
                    query = query.is(dbKey, null);
                 }
            }
        }
    });

    if (sort_by) query = query.order(sort_by, { ascending: sort_direction === 'asc' });

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    const finalCount = isBaseline ? 1440000 : (count || -1);
    return { data: (data || []).map(mapFromDB), count: finalCount };
  },

  async getTaxonById(id: string): Promise<Taxon | null> {
    if (getIsOffline()) return null;
    const { data, error } = await getSupabase()
      .from(DB_TABLE)
      .select('*, details:app_taxon_details(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    return data ? mapFromDB(data) : null;
  },

  /**
   * findNakedMatch: Stage 0 Botanical Discovery (Deterministic).
   * v2.35.5: Switch to Equality (.eq) for Atomic standard to leverage "C" collated indices.
   */
  async findNakedMatch(query: string): Promise<{ data: Taxon[], strategy: string, tokens?: any, error?: string }> {
      if (getIsOffline()) return { data: [], strategy: 'Offline' };
      
      const parts = parseBotanicalName(query);
      const supabase = getSupabase();

      // Standard A: Atomic Token Query
      // v2.35.5: Corrected query chaining to ensure filters are applied.
      let atomicQuery = supabase.from(DB_TABLE).select('*, details:app_taxon_details(*)');
      let hasAtomicTokens = false;

      if (parts.genus) { atomicQuery = atomicQuery.eq('genus', parts.genus); hasAtomicTokens = true; }
      if (parts.species) { atomicQuery = atomicQuery.eq('species', parts.species); hasAtomicTokens = true; }
      if (parts.infraspecies) { atomicQuery = atomicQuery.eq('infraspecies', parts.infraspecies); hasAtomicTokens = true; }
      if (parts.infraspecific_rank) { atomicQuery = atomicQuery.eq('infraspecific_rank', parts.infraspecific_rank); hasAtomicTokens = true; }
      if (parts.cultivar) { atomicQuery = atomicQuery.eq('cultivar', parts.cultivar); hasAtomicTokens = true; }

      if (hasAtomicTokens) {
          const { data: atomicHits, error: atomicErr } = await atomicQuery.limit(10);
          if (atomicErr) return { data: [], strategy: 'Atomic Error', error: atomicErr.message, tokens: parts };
          if (atomicHits && atomicHits.length > 0) {
              return { data: atomicHits.map(mapFromDB), strategy: 'Atomic Token Set (Standard A)', tokens: parts };
          }
      }

      // Standard B: Literal Fallback
      const naked = getNakedName(query);
      const assembled = assembleScientificName(parts);
      
      if (!assembled && !naked) return { data: [], strategy: 'No valid tokens' };

      const { data: literalHits, error: literalErr } = await supabase
          .from(DB_TABLE)
          .select('*, details:app_taxon_details(*)')
          .or(`taxon_name.ilike."${assembled}",taxon_name.ilike."${naked}"`)
          .limit(10);
      
      if (literalErr) return { data: [], strategy: 'Literal Fallback Error', error: literalErr.message, tokens: parts };
      return { data: (literalHits || []).map(mapFromDB), strategy: 'Literal Name Search (Standard B)', tokens: parts };
  },

  /**
   * findAtomicMatch: Stage 3 Identity Guard.
   * Uses the same Atomic -> Literal logic as Stage 0 but consumes structured AI parts.
   * v2.35.5: Switch to Equality (.eq) for absolute binary precision on collated columns.
   */
  async findAtomicMatch(parts: Partial<Taxon>): Promise<{ taxon: Taxon | null, strategy: string, interrogated_tokens: any, error?: string }> {
    if (getIsOffline()) return { taxon: null, strategy: 'Offline', interrogated_tokens: parts };
    const supabase = getSupabase();

    // Standard A: Atomic Token Equality
    let query = supabase.from(DB_TABLE).select('*, details:app_taxon_details(*)');
    if (parts.genus) query = query.eq('genus', parts.genus);
    if (parts.species) query = query.eq('species', parts.species);
    if (parts.infraspecies) query = query.eq('infraspecies', parts.infraspecies);
    if (parts.infraspecific_rank) query = query.eq('infraspecific_rank', parts.infraspecific_rank);
    if (parts.cultivar) query = query.eq('cultivar', parts.cultivar);
    
    // Multi-match robustness: Prefer Accepted status if multiple exist
    query = query.order('taxon_status', { ascending: true }); // 'Accepted' sorts before 'Synonym'
    
    const { data: atomicData, error: atomicErr } = await query.limit(1);
    
    if (atomicErr) return { taxon: null, strategy: 'Atomic Token Set', interrogated_tokens: parts, error: atomicErr.message };

    if (atomicData && atomicData.length > 0) {
        let finalTaxon = mapFromDB(atomicData[0]);
        // Follow Synonym Chain
        if (finalTaxon.taxon_status === 'Synonym' && finalTaxon.accepted_plant_name_id) {
            const { data: accepted } = await supabase
                .from(DB_TABLE)
                .select('*, details:app_taxon_details(*)')
                .eq('wcvp_id', finalTaxon.accepted_plant_name_id)
                .limit(1);
            if (accepted && accepted.length > 0) finalTaxon = mapFromDB(accepted[0]);
        }
        return { taxon: finalTaxon, strategy: 'Atomic Token Set', interrogated_tokens: parts };
    }

    // Standard B: Literal Fallback
    const fullName = assembleScientificName(parts);
    const { data: literalData, error: literalErr } = await supabase
        .from(DB_TABLE)
        .select('*, details:app_taxon_details(*)')
        .ilike('taxon_name', fullName)
        .order('taxon_status', { ascending: true })
        .limit(1);

    if (literalErr) return { taxon: null, strategy: 'Literal Fallback', interrogated_tokens: parts, error: literalErr.message };

    if (literalData && literalData.length > 0) {
        let finalTaxon = mapFromDB(literalData[0]);
        if (finalTaxon.taxon_status === 'Synonym' && finalTaxon.accepted_plant_name_id) {
            const { data: accepted } = await supabase
                .from(DB_TABLE)
                .select('*, details:app_taxon_details(*)')
                .eq('wcvp_id', finalTaxon.accepted_plant_name_id)
                .limit(1);
            if (accepted && accepted.length > 0) finalTaxon = mapFromDB(accepted[0]);
        }
        return { taxon: finalTaxon, strategy: 'Literal Fallback', interrogated_tokens: parts };
    }

    return { taxon: null, strategy: 'Zero Hits', interrogated_tokens: parts };
  },

  /**
   * findTaxonByName: Identity lookup with synonym redirection.
   * v2.35.5: Switched to .limit(1) for multi-record robustness.
   */
  async findTaxonByName(name: string): Promise<Taxon | null> {
    if (getIsOffline()) return null;
    const supabase = getSupabase();
    
    // Case-insensitive lookup
    const { data, error } = await supabase
        .from(DB_TABLE)
        .select('*, details:app_taxon_details(*)')
        .ilike('taxon_name', name.trim())
        .order('taxon_status', { ascending: true })
        .limit(1);
        
    if (error || !data || data.length === 0) return null;

    const record = data[0];

    // Follow Synonym Chain
    if (record.taxon_status === 'Synonym' && record.accepted_plant_name_id) {
        const { data: accepted } = await supabase
            .from(DB_TABLE)
            .select('*, details:app_taxon_details(*)')
            .eq('wcvp_id', record.accepted_plant_name_id)
            .limit(1);
        if (accepted && accepted.length > 0) return mapFromDB(accepted[0]);
    }

    return mapFromDB(record);
  },

  /**
   * findLineageAudit: Performs a background check on the parentage of a suggested name.
   * v2.35.5: Incremental Atomic Audit with Equality (.eq) standard.
   */
  async findLineageAudit(parts: Partial<Taxon>): Promise<{ entries: LineageMapEntry[], interrogated_tokens: Record<string, any>[] }> {
    if (getIsOffline()) return { entries: [], interrogated_tokens: [] };
    const entries: LineageMapEntry[] = [];
    const auditLedger: Record<string, any>[] = [];
    const supabase = getSupabase();
    
    const tryFind = async (rank: string, queryTokens: Record<string, any>, literalName?: string) => {
        let strategy = 'Atomic';
        let found = false;
        let lastError: string | undefined;

        // Try Standard A: Atomic Equality (Normalized tokens match exactly in "C" collated indices)
        let q = supabase.from(DB_TABLE).select('id');
        Object.entries(queryTokens).forEach(([k, v]) => { if (v) q = q.eq(k, v); });
        q = q.eq('taxon_rank', rank);
        
        const { data: atomicData, error: atomicErr } = await q.limit(1);
        if (atomicErr) lastError = atomicErr.message;

        if (atomicData && atomicData.length > 0) {
            found = true;
        } else if (literalName) {
            // Try Standard B: Literal Fallback
            strategy = 'Literal Fallback';
            const { data: literalData, error: literalErr } = await supabase
                .from(DB_TABLE)
                .select('id')
                .ilike('taxon_name', literalName)
                .eq('taxon_rank', rank)
                .limit(1);
            if (literalErr) lastError = literalErr.message;
            if (literalData && literalData.length > 0) found = true;
        }

        return { found, strategy, error: lastError, tokens: { ...queryTokens, taxon_rank: rank } };
    };

    // 1. Genus Audit
    if (parts.genus) {
        const { found, strategy, tokens, error } = await tryFind('Genus', { genus: parts.genus }, parts.genus);
        const displayName = parts.genus_hybrid === '×' ? `× ${parts.genus}` : parts.genus;
        entries.push({ rank: 'Genus', name: displayName!, exists: found });
        auditLedger.push({ step: 'Genus Audit', strategy, tokens, found, error });
    }
    
    // 2. Species Audit
    if (parts.genus && parts.species) {
        const speciesName = `${parts.genus} ${parts.species}`;
        const { found, strategy, tokens, error } = await tryFind('Species', { genus: parts.genus, species: parts.species }, speciesName);
        const displayName = parts.species_hybrid === '×' ? `× ${parts.species}` : parts.species;
        entries.push({ rank: 'Species', name: displayName!, exists: found });
        auditLedger.push({ step: 'Species Audit', strategy, tokens, found, error });
    }

    // 3. Infraspecies Audit
    if (parts.genus && parts.species && parts.infraspecies && parts.infraspecific_rank) {
        const infraName = `${parts.genus} ${parts.species} ${parts.infraspecific_rank} ${parts.infraspecies}`;
        const { found, strategy, tokens, error } = await tryFind('Infraspecies', { 
            genus: parts.genus, species: parts.species, 
            infraspecies: parts.infraspecies, infraspecific_rank: parts.infraspecific_rank 
        }, infraName);
        entries.push({ rank: 'Infraspecies', name: `${parts.infraspecific_rank} ${parts.infraspecies}`, exists: found });
        auditLedger.push({ step: 'Infraspecies Audit', strategy, tokens, found, error });
    }

    // 4. Cultivar Audit (Terminal)
    if (parts.cultivar && parts.genus) {
        const fullName = assembleScientificName(parts);
        const { found, strategy, tokens, error } = await tryFind('Cultivar', { 
            genus: parts.genus, cultivar: parts.cultivar,
            species: parts.species || null,
            infraspecies: parts.infraspecies || null
        }, fullName);
        entries.push({ rank: 'Cultivar', name: `'${parts.cultivar}'`, exists: found });
        auditLedger.push({ step: 'Cultivar Audit', strategy, tokens, found, error });
    }
    
    return { entries, interrogated_tokens: auditLedger };
  },

  /**
   * graftTaxonToHierarchy: Stage 5 Commit.
   * Handles parent-first creation, phylogenetic flow, path materialization, and count sync.
   */
  async graftTaxonToHierarchy(candidate: SearchCandidate, onStep: (label: string, data?: any) => void): Promise<{ taxon: Taxon, created: string[] }> {
    if (getIsOffline()) throw new Error("Offline");
    const supabase = getSupabase();
    const createdRanks: string[] = [];
    const parts = candidate.parts!;
    
    // Step 1: Ensure Genus
    const genusName = parts.genus_hybrid === '×' ? `× ${parts.genus}` : parts.genus;
    onStep(`Verifying Genus: ${genusName}`);
    let genusRecord = await this.findTaxonByName(genusName!);
    
    if (!genusRecord) {
        onStep(`Creating new Genus: ${genusName}`);
        const { data, error } = await supabase.from(DB_TABLE).insert({
            taxon_name: genusName,
            taxon_rank: 'Genus',
            taxon_status: 'Accepted',
            genus: parts.genus,
            genus_hybrid: parts.genus_hybrid || null,
            source_id: 3,
            verification_level: `Ingestion Engine v2.35.5`
        }).select().single();
        if (error) throw error;
        genusRecord = mapFromDB(data);
        createdRanks.push('Genus');
    }

    let parentId = genusRecord.id;
    let parentPath = genusRecord.hierarchy_path || `root.${genusRecord.id.replace(/-/g, '_')}`;

    // Step 2: Ensure Species
    if (parts.species) {
        const speciesFullName = `${genusRecord.taxon_name} ${parts.species_hybrid === '×' ? '× ' : ''}${parts.species}`;
        onStep(`Verifying Species: ${speciesFullName}`);
        let speciesRecord = await this.findTaxonByName(speciesFullName);
        
        if (!speciesRecord) {
            onStep(`Creating new Species: ${speciesFullName}`);
            // Inherit Phylogeny from Genus
            const { data, error } = await supabase.from(DB_TABLE).insert({
                parent_id: genusRecord.id,
                hierarchy_path: `${parentPath.replace(/-/g, '_')}`, // Temporary placeholder, fixed below
                taxon_name: speciesFullName,
                taxon_rank: 'Species',
                taxon_status: 'Accepted',
                genus: parts.genus,
                species: parts.species,
                species_hybrid: parts.species_hybrid || null,
                kingdom: genusRecord.kingdom,
                phylum: genusRecord.phylum,
                class: genusRecord.class,
                "order": genusRecord.order,
                family: genusRecord.family,
                source_id: 3,
                verification_level: `Ingestion Engine v2.35.5`
            }).select().single();
            if (error) throw error;
            speciesRecord = mapFromDB(data);
            
            // Fix Hierarchy Path for new Species
            const newSpeciesPath = `${parentPath}.${speciesRecord.id.replace(/-/g, '_')}`;
            await supabase.from(DB_TABLE).update({ hierarchy_path: newSpeciesPath }).eq('id', speciesRecord.id);
            speciesRecord.hierarchy_path = newSpeciesPath;
            
            createdRanks.push('Species');
        }
        parentId = speciesRecord.id;
        parentPath = speciesRecord.hierarchy_path!;
    }

    // Step 3: Terminal Record
    onStep(`Committing terminal record: ${candidate.taxon_name}`);
    
    // Alternative Names Capture (Trade Names & Patents)
    const alts: Synonym[] = [];
    if (candidate.parts?.trade_name) alts.push({ name: candidate.parts.trade_name, type: 'trade' });
    if (candidate.parts?.patent_number) alts.push({ name: candidate.parts.patent_number, type: 'patent' });

    const terminalPayload: any = {
        parent_id: parentId,
        taxon_name: candidate.taxon_name,
        taxon_rank: candidate.parts?.taxon_rank || 'Cultivar',
        taxon_status: 'Accepted',
        genus: parts.genus,
        species: parts.species,
        cultivar: parts.cultivar || null,
        infraspecies: parts.infraspecies || null,
        infraspecific_rank: parts.infraspecific_rank || null,
        kingdom: genusRecord.kingdom,
        phylum: genusRecord.phylum,
        class: genusRecord.class,
        "order": genusRecord.order,
        family: genusRecord.family,
        source_id: 3,
        verification_level: `Ingestion Engine v2.35.5`
    };

    const { data: terminalRow, error: terminalError } = await supabase.from(DB_TABLE).insert(terminalPayload).select().single();
    if (terminalError) throw terminalError;
    
    const terminalRecord = mapFromDB(terminalRow);
    const terminalPath = `${parentPath}.${terminalRecord.id.replace(/-/g, '_')}`;
    
    // Update path and metadata
    await supabase.from(DB_TABLE).update({ hierarchy_path: terminalPath }).eq('id', terminalRecord.id);
    
    // Sync Metadata (Rationales) to Details
    if (candidate.rationale || candidate.lineage_rationale || alts.length > 0) {
        await supabase.from(DETAILS_TABLE).upsert({
            taxon_id: terminalRecord.id,
            history_metadata: { 
                background: candidate.rationale,
                lineage_logic: candidate.lineage_rationale
            },
            alternative_names: alts
        });
    }

    // Direct SQL Count Update for immediate parent
    await supabase.rpc('increment_descendant_count', { row_id: parentId });
    
    return { taxon: terminalRecord, created: createdRanks };
  },

  async updateTaxon(id: string, updates: Partial<Taxon>): Promise<void> {
    if (getIsOffline()) throw new Error("Offline");
    const supabase = getSupabase();
    
    const detailKeys = [
        'description_text', 'hardiness_zone_min', 'hardiness_zone_max', 
        'height_min_cm', 'height_max_cm', 'width_min_cm', 'width_max_cm',
        'origin_year', 'morphology', 'ecology', 'history_metadata',
        'alternative_names', 'reference_links'
    ];

    const coreUpdates: any = {};
    const detailUpdates: any = {};

    Object.entries(updates).forEach(([key, val]) => {
        if (detailKeys.includes(key)) {
            detailUpdates[key] = val;
        } else if (!['id', 'details', 'is_details_loaded', 'created_at', 'name', 'hierarchy_path'].includes(key)) {
            coreUpdates[key] = val;
        }
    });

    if (Object.keys(coreUpdates).length > 0) {
        const { error: coreError } = await supabase
            .from(DB_TABLE)
            .update(coreUpdates)
            .eq('id', id);
        if (coreError) throw coreError;
    }

    if (Object.keys(detailUpdates).length > 0) {
        const { error: detailError } = await supabase
            .from(DETAILS_TABLE)
            .upsert({ taxon_id: id, ...detailUpdates }, { onConflict: 'taxon_id' });
        if (detailError) throw detailError;
    }
  },

  async getGlobalSettings(): Promise<any> {
    if (getIsOffline()) return {};
    const { data, error } = await getSupabase()
        .from(SETTINGS_TABLE)
        .select('settings')
        .eq('id', 'default_config')
        .maybeSingle();
    if (error) return {};
    return data?.settings || {};
  },

  async saveGlobalSettings(settings: any): Promise<void> {
    if (getIsOffline()) throw new Error("Offline");
    const { error } = await getSupabase()
        .from(SETTINGS_TABLE)
        .upsert({ id: 'default_config', settings, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  async getBuildDashboard(): Promise<BuildDashboardData | null> {
    if (getIsOffline()) return null;
    const supabase = getSupabase();
    
    const { count: total } = await supabase.from(DB_TABLE).select('*', { count: 'exact', head: true });
    const { count: dirty } = await supabase.from(DB_TABLE).select('*', { count: 'exact', head: true }).is('hierarchy_path', null);
    const { count: wfoRoots } = await supabase.from(DB_TABLE).select('*', { count: 'exact', head: true }).eq('taxon_rank', 'Order').eq('source_id', 2);
    
    const totalCount = total || 0;
    const dirtyCount = dirty || 0;
    const completion = totalCount > 0 ? Math.round(((totalCount - dirtyCount) / totalCount) * 100) : 100;

    return {
        total_records: totalCount,
        dirty_paths: dirtyCount,
        cleaned_rows: totalCount - dirtyCount,
        paths_built: totalCount - dirtyCount,
        wfo_order_roots: wfoRoots || 0,
        orphaned_roots: 0,
        reset_completion: completion,
        build_completion: completion
    };
  },

  async purgeNonWCVPTaxa(): Promise<void> {
    if (getIsOffline()) throw new Error("Offline");
    const { error } = await getSupabase()
        .from(DB_TABLE)
        .delete()
        .neq('source_id', 1);
    if (error) throw error;
  },

  async wipeAllDetails(): Promise<void> {
    if (getIsOffline()) throw new Error("Offline");
    const { error } = await getSupabase().from(DETAILS_TABLE).delete().neq('taxon_id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }
};