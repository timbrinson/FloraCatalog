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

export interface MorphologyAttributes {
  [key: string]: any;
  foliage_color?: string;
  flower_color?: string;
  leaf_shape?: string;
  root_type?: string;
  spine_color?: string;
}

export interface EcologyAttributes {
  [key: string]: any;
  sun_exposure?: string[];
  water_needs?: 'Low' | 'Moderate' | 'High';
  soil_type?: string;
  pests_diseases?: string[];
}

// --- DATA LINEAGE TYPES ---

export type VerificationLevel = 'Verified' | 'Unverified' | 'Ambiguous' | 'AI_Generated';

export interface DataSource {
  id: string;
  name: string; 
  version?: string;
  url?: string;
  citation?: string;
  trustLevel: 1 | 2 | 3 | 4 | 5;
}

export interface AuditRecord {
  timestamp: number;
  process: string;
  action: 'create' | 'update' | 'enrich';
  appName: string;
  appVersion: string;
  userId?: string;
  details?: string;
}

export interface TaxonMetadata {
  sourceId?: string;
  verificationLevel: VerificationLevel;
  lastEnrichedAt?: number;
  editHistory: AuditRecord[];
  descriptionSourceId?: string;
  imagesSourceId?: string;
}

// --- CORE TAXON ---

export interface Taxon {
  /** Internal UUID for the App database */
  id: string; 
  
  // Hierarchy
  parentId?: string; 
  hierarchyPath?: string;

  /** 
   * The taxonomic rank (e.g. "Genus", "Species", "Variety")
   * Treated as a generic string to allow for flexible classification.
   */
  taxonRank: string; 
  
  // IDs
  wcvpId?: string; 
  ipniId?: string; 
  powoId?: string; 
  acceptedPlantNameId?: string; 
  basionymPlantNameId?: string; 
  parentPlantNameId?: string;
  homotypicSynonym?: string;

  // Names
  taxonName: string; 
  genusHybrid?: string; 
  speciesHybrid?: string; 
  hybridFormula?: string; 
  
  /** 
   * Taxonomic status (e.g. "Accepted", "Synonym")
   * Treated as a generic string.
   */
  taxonStatus: string; 
  reviewed?: string; 

  // Authorship
  taxonAuthors?: string; 
  primaryAuthor?: string;
  parentheticalAuthor?: string; 
  publicationAuthor?: string; 
  replacedSynonymAuthor?: string;

  // Publication
  placeOfPublication?: string; 
  volumeAndPage?: string; 
  firstPublished?: string; 
  nomenclaturalRemarks?: string;

  // Geography & Biology
  geographicArea?: string; 
  lifeformDescription?: string; 
  climateDescription?: string; 
  
  /** The specific epithet or cultivar name (e.g. "parryi" or "Bloodgood") */
  name: string; 
  
  commonName?: string;
  family?: string; 
  description?: string;
  synonyms: Synonym[];
  referenceLinks: Link[];
  
  morphology?: MorphologyAttributes;
  ecology?: EcologyAttributes;
  metadata?: TaxonMetadata;

  isDetailsLoaded?: boolean;
  createdAt: number;
  
  // Denormalized fields for Grid View
  genus?: string;
  species?: string;
  infraspecies?: string;
  infraspecificRank?: string;
  cultivar?: string;
  
  descendantCount?: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type ColorTheme = 'option1a' | 'option1b' | 'option2a' | 'option2b';

export interface UserPreferences {
  hybridSpacing: 'space' | 'nospace';
  autoEnrichment: boolean;
  autoFitMaxWidth?: number;
  fitScreenMaxRatio?: number;
  colorTheme: ColorTheme;
}

export type ActivityStatus = 'running' | 'paused' | 'completed' | 'error' | 'needs_input';

export interface SearchCandidate {
  taxonName: string;
  commonName?: string;
  acceptedName?: string;
  taxonRank?: string; 
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'common_name';
  confidence: number;
  isHybrid?: boolean; 
}

export interface ResolutionData {
  type: 'duplicate' | 'ambiguous' | 'correction' | 'synonym';
  candidates: SearchCandidate[];
  originalQuery: string;
  existingId?: string;
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
  payload?: any; 
  resolution?: ResolutionData;
  details?: any; 
}

export interface BackgroundProcess {
  id: string;
  name: string;
  type: 'mining' | 'import' | 'enrichment' | 'search';
  status: string;
  progress?: number;
}
