import { supabase, isOffline } from './supabaseClient';
import { Taxon, TaxonRank, TaxonomicStatus, Synonym, Link } from '../types';

/**
 * Service to handle interaction with the Supabase PostgreSQL Database.
 * Handles the mapping between the DB schema (snake_case, WCVP columns) 
 * and the Application Domain Model (camelCase, Taxon interface).
 */

const DB_TABLE = 'app_taxa';
const DETAILS_TABLE = 'app_taxon_details';

// --- MAPPERS ---

const mapFromDB = (row: any): Taxon => {
  return {
    id: row.id,
    parentId: row.parent_id,
    hierarchyPath: row.hierarchy_path ? row.hierarchy_path.replace(/_/g, '-') : undefined, // Convert ltree format if needed
    
    // Identifiers
    plantNameId: row.wcvp_id, // Mapping wcvp_id -> plantNameId
    ipniId: row.ipni_id,
    powoId: row.powo_id,
    acceptedPlantNameId: row.accepted_plant_name_id,
    parentPlantNameId: row.parent_plant_name_id,
    basionymPlantNameId: row.basionym_plant_name_id,
    homotypicSynonym: row.homotypic_synonym,

    // Taxonomy
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
    cultivar: row.cultivar || (row.taxon_rank === 'cultivar' ? row.taxon_name.split("'")[1] : undefined), // Fallback extraction
    
    hybridFormula: row.hybrid_formula,

    // Authorship
    taxonAuthors: row.taxon_authors,
    primaryAuthor: row.primary_author,
    parentheticalAuthor: row.parenthetical_author,
    publicationAuthor: row.publication_author,
    replacedSynonymAuthor: row.replaced_synonym_author,

    // Publication
    placeOfPublication: row.place_of_publication,
    volumeAndPage: row.volume_and_page,
    firstPublished: row.first_published,
    nomenclaturalRemarks: row.nomenclatural_remarks,
    reviewed: row.reviewed,

    // Geography
    geographicArea: row.geographic_area,
    lifeformDescription: row.lifeform_description,
    climateDescription: row.climate_description,

    // App Specific
    name: row.taxon_rank === 'cultivar' && row.taxon_name.includes("'") 
          ? row.taxon_name.match(/'([^']+)'/)?.[1] || row.taxon_name 
          : (row.infraspecies || row.species || row.genus || row.taxon_name),

    description: row.details?.description_text, // Joined from details
    synonyms: [], // TODO: Load from details if stored there
    referenceLinks: [], // TODO: Load from details
    
    isDetailsLoaded: !!row.details,
    createdAt: new Date(row.created_at).getTime(),
  };
};

const mapToDB = (taxon: Taxon) => {
  return {
    id: taxon.id,
    parent_id: taxon.parentId,
    hierarchy_path: taxon.hierarchyPath ? taxon.hierarchyPath.replace(/-/g, '_') : undefined, // ltree accepts A-Z0-9_ only
    
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
    common_name: taxon.commonName,

    genus: taxon.genus,
    genus_hybrid: taxon.genusHybrid,
    species: taxon.species,
    species_hybrid: taxon.speciesHybrid,
    infraspecies: taxon.infraspecies,
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

export const dataService = {
  
  async getTaxa(): Promise<Taxon[]> {
    if (isOffline) {
        console.warn("App is in offline mode. Returning empty list.");
        return [];
    }

    const { data, error } = await supabase
      .from(DB_TABLE)
      .select(`
        *,
        details:app_taxon_details(*)
      `)
      .order('taxon_name', { ascending: true });

    if (error) {
      console.error("Error fetching taxa:", JSON.stringify(error, null, 2));
      throw error;
    }

    return (data || []).map(mapFromDB);
  },

  async upsertTaxon(taxon: Taxon) {
    if (isOffline) return;

    // 1. Upsert Core Taxon
    const dbPayload = mapToDB(taxon);
    const { error: taxonError } = await supabase
      .from(DB_TABLE)
      .upsert(dbPayload);

    if (taxonError) {
      console.error("Error saving taxon:", JSON.stringify(taxonError, null, 2));
      throw taxonError;
    }

    // 2. Upsert Details (if loaded)
    if (taxon.isDetailsLoaded) {
      const detailsPayload = {
        taxon_id: taxon.id,
        description_text: taxon.description,
        // Map other details like hardiness, morphology jsonb etc here
      };
      
      const { error: detailsError } = await supabase
        .from(DETAILS_TABLE)
        .upsert(detailsPayload);
        
      if (detailsError) console.error("Error saving details:", JSON.stringify(detailsError, null, 2));
    }
  },

  async deleteTaxon(id: string) {
    if (isOffline) return;

    const { error } = await supabase
      .from(DB_TABLE)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  
  async batchInsert(taxa: Taxon[]) {
      if (isOffline || taxa.length === 0) return;
      const payloads = taxa.map(mapToDB);
      const { error } = await supabase.from(DB_TABLE).insert(payloads);
      
      if (error) {
          console.error("Batch Insert Failed. Error:", JSON.stringify(error, null, 2));
          console.error("Failed Payload Sample:", JSON.stringify(payloads[0], null, 2));
          throw new Error(error.message || "Unknown Supabase Error");
      }
  }
};
