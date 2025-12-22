/**
 * DATA SOURCE CITATION:
 * Govaerts R (ed.). 2025. WCVP: World Checklist of Vascular Plants. 
 * Facilitated by the Royal Botanic Gardens, Kew. 
 * [WWW document] URL https://doi.org/10.34885/b8fr-km05 [accessed 28 May 2025].
 * Extracted: 28/05/2025
 */

export interface Link {
  title: string;
  url: string;
}

export type SynonymType = 'scientific' | 'trade' | 'misapplied' | 'common' | 'unspecified';

export interface Synonym {
  name: string;
  type: SynonymType;
}

export type TaxonRank = 
  // Standard Ranks (Usually Capitalized in DB)
  'Family' | 'Genus' | 'Species' | 'Subspecies' | 'Variety' | 'Form' | 'Hybrid' | 'Cultivar' | 'Grex' | 'Unranked' |
  // Legacy/Lowercase/Specific Ranks from WCVP
  'family' | 'genus' | 'species' | 'subspecies' | 'variety' | 'form' | 'hybrid' | 'cultivar' | 'grex' | 'unranked' |
  'agamosp.' | 'Convariety' | 'ecas.' | 'group' | 'lusus' | 'microf.' | 'microgène' | 'micromorphe' | 'modif.' | 'monstr.' | 'mut.' | 'nid' | 'nothof.' | 'nothosubsp.' | 'nothovar.' | 'positio' | 'proles' | 'provar.' | 'psp.' | 'stirps' | 'subap.' | 'Subform' | 'sublusus' | 'subproles' | 'subspecioid' | 'subsubsp.' | 'Subvariety';

export type TaxonomicStatus = 'Accepted' | 'Synonym' | 'Unresolved' | 'Artificial';

// --- DATA GOVERNANCE & ATTRIBUTES ---

/**
 * Defines a valid key for JSONB columns.
 * Mirrors 'app_attribute_definitions' table.
 */
export interface AttributeDefinition {
  key: string;            // e.g. "leaf_shape"
  category: 'morphology' | 'ecology' | 'history';
  label: string;          // e.g. "Leaf Shape"
  dataType: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
  unit?: string;
  options?: string[];     // For dropdowns
}

// Strict interfaces for the JSONB bags to prevent key drift in Code
export interface MorphologyAttributes {
  [key: string]: any; // Allow flexibility, but prefer specific keys below
  
  foliage_color?: string;
  flower_color?: string;
  leaf_shape?: string;
  root_type?: string;
  spine_color?: string;
}

export interface EcologyAttributes {
  [key: string]: any;
  
  sun_exposure?: string[]; // Multi-select
  water_needs?: 'Low' | 'Moderate' | 'High';
  soil_type?: string;
  pests_diseases?: string[];
}

// --- DATA LINEAGE TYPES ---

export type VerificationLevel = 'Verified' | 'Unverified' | 'Ambiguous' | 'AI_Generated';

export interface DataSource {
  id: string;
  name: string; // e.g. "WCVP", "Gemini AI"
  version?: string;
  url?: string;
  citation?: string;
  trustLevel: 1 | 2 | 3 | 4 | 5; // 5 is highest (WCVP)
}

export interface AuditRecord {
  timestamp: number;
  process: string; // The high-level action, e.g., "Bulk Import", "User Edit", "Mining"
  action: 'create' | 'update' | 'enrich';
  
  // Contextual Lineage
  appName: string;       // e.g. "FloraCatalog"
  appVersion: string;    // e.g. "v2.9.1"
  userId?: string;       // ID of user if triggered by command, null if system background task
  
  details?: string;
}

export interface TaxonMetadata {
  sourceId?: string; // ID of the primary DataSource
  verificationLevel: VerificationLevel;
  lastEnrichedAt?: number;
  editHistory: AuditRecord[];
  
  // Track specific attribute sources if different from main source
  // Fix: Removed duplicate descriptionSourceId property found on lines 99-100
  descriptionSourceId?: string;
  imagesSourceId?: string;
}

// --- CORE TAXON ---

export interface Taxon {
  /** Internal UUID for the App database */
  id: string; 
  
  // Hierarchy
  /** UUID of the parent Taxon in the App database */
  parentId?: string; 
  
  /** 
   * The ltree path for database hierarchy.
   * Format: root.{genus_id}.{species_id}...
   */
  hierarchyPath?: string;

  /** 
   * The taxonomic rank (mapped from 'taxon_rank').
   * e.g. "Genus", "Species", "Variety"
   */
  taxonRank: TaxonRank;
  
  // --- WCVP / POWO Specific Fields ---
  
  // IDs
  /** 
   * WCVP identifier (mapped from 'wcvp_id'). 
   * The primary key in the Kew database.
   */
  wcvpId?: string; 
  
  /** International Plant Names Index identifier (mapped from 'ipni_id') */
  ipniId?: string; 
  
  /** Plants of the World Online identifier (mapped from 'powo_id') */
  powoId?: string; 
  
  /** 
   * WCVP ID of the accepted name (mapped from 'accepted_plant_name_id').
   * Present if this record is a Synonym.
   */
  acceptedPlantNameId?: string; 
  
  /** WCVP ID of the basionym (original name) (mapped from 'basionym_plant_name_id') */
  basionymPlantNameId?: string; 

  /** 
   * WCVP ID for the parent genus or species (mapped from 'parent_plant_name_id').
   */
  parentPlantNameId?: string;

  /** 
   * ID linking homotypic synonyms (names based on the same type specimen) 
   * (mapped from 'homotypic_synonym').
   */
  homotypicSynonym?: string;

  // Names
  /** Full scientific name including authors (mapped from 'taxon_name') */
  taxonName: string; 
  
  /** Hybrid marker for Genus, e.g. '×' or '+' (mapped from 'genus_hybrid') */
  genusHybrid?: string; 
  
  /** Hybrid marker for Species, e.g. '×' (mapped from 'species_hybrid') */
  speciesHybrid?: string; 
  
  /** Formula for hybrids, e.g. "Parent A × Parent B" (mapped from 'hybrid_formula') */
  hybridFormula?: string; 
  
  // Status
  /** 'Accepted', 'Synonym', 'Unplaced', etc. (mapped from 'taxon_status') */
  taxonStatus: TaxonomicStatus; 
  
  /** Peer review status: 'Y' or 'N' (mapped from 'reviewed') */
  reviewed?: string; 

  // Authorship
  /** 
   * Full author string (mapped from 'taxon_authors'). 
   * e.g. "L." or "(Schott) Engelm."
   */
  taxonAuthors?: string; 
  
  /** The primary author of the current name combination (mapped from 'primary_author') */
  primaryAuthor?: string;

  /** The original author in parentheses (mapped from 'parenthetical_author') */
  parentheticalAuthor?: string; 
  
  /** The author who published this specific combination (mapped from 'publication_author') */
  publicationAuthor?: string; 
  
  /** The author of the synonym being replaced (mapped from 'replaced_synonym_author') */
  replacedSynonymAuthor?: string;

  // Publication
  /** Title of publication (mapped from 'place_of_publication') */
  placeOfPublication?: string; 
  
  /** Volume and page number (mapped from 'volume_and_page') */
  volumeAndPage?: string; 
  
  /** Year/Date of publication (mapped from 'first_published') */
  firstPublished?: string; 
  
  /** Notes on legitimacy, e.g. "nom. illeg." (mapped from 'nomenclatural_remarks') */
  nomenclaturalRemarks?: string;

  // Geography & Biology
  /** Native distribution range (mapped from 'geographic_area') */
  geographicArea?: string; 
  
  /** Growth form, e.g. "Succulent", "Tree" (mapped from 'lifeform_description') */
  lifeformDescription?: string; 
  
  /** Climate zone, e.g. "Wet Tropical" (mapped from 'climate_description') */
  climateDescription?: string; 
  
  // --- UI / App Helper Fields ---
  
  /** The specific epithet or cultivar name (e.g. "parryi" or "Bloodgood") */
  name: string; 
  
  commonName?: string;
  family?: string; 
  description?: string;
  synonyms: Synonym[];
  referenceLinks: Link[];
  
  // Extended JSONB Attributes (Loaded on demand or part of full object)
  morphology?: MorphologyAttributes;
  ecology?: EcologyAttributes;
  
  // Traceability & Metadata
  metadata?: TaxonMetadata;

  isDetailsLoaded?: boolean;
  createdAt: number;
  
  // Denormalized fields for Grid View
  genus?: string;
  species?: string;
  infraspecies?: string;
  infraspecificRank?: string;
  cultivar?: string;
  
  /** Pre-calculated count of all descendants (recursive) in the DB */
  descendantCount?: number;
}

export interface TaxonChain {
  ranks: Partial<Record<TaxonRank, Taxon>>;
  lowestRank: TaxonRank;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type ColorTheme = 'option1a' | 'option1b' | 'option2a' | 'option2b';

export interface UserPreferences {
  hybridSpacing: 'space' | 'nospace'; // '× Mangave' vs '×Mangave'
  autoEnrichment: boolean; // Auto-run enrichment after adding
  autoFitMaxWidth?: number; // default 400
  fitScreenMaxRatio?: number; // default 4.0
  colorTheme: ColorTheme;
}

export type ActivityStatus = 'running' | 'paused' | 'completed' | 'error' | 'needs_input';

// Search specific types
export interface SearchCandidate {
  taxonName: string; // Was scientificName
  commonName?: string;
  acceptedName?: string; // NEW: The correct botanical name if this is a synonym
  taxonRank?: string; 
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'common_name';
  confidence: number; // 0-1
  isHybrid?: boolean; 
}

export interface ResolutionData {
  type: 'duplicate' | 'ambiguous' | 'correction' | 'synonym';
  candidates: SearchCandidate[];
  originalQuery: string;
  existingId?: string; // If duplicate, ID of existing plant
}

export interface ActivityItem {
  id: string;
  name: string;
  type: 'mining' | 'import' | 'enrichment' | 'search';
  status: ActivityStatus;
  message: string;
  timestamp: number;
  canRetry?: boolean;
  errorDetails?: string;
  // Data needed to restart/retry or resolve the process
  payload?: any; 
  resolution?: ResolutionData;
  // NEW: Detailed debug info
  details?: any; 
}

export interface BackgroundProcess {
  id: string;
  name: string;
  type: 'mining' | 'import' | 'enrichment' | 'search';
  status: string;
  progress?: number;
}