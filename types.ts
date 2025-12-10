
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

export type TaxonRank = 'family' | 'genus' | 'species' | 'subspecies' | 'variety' | 'form' | 'hybrid' | 'cultivar' | 'grex';

export type TaxonomicStatus = 'Accepted' | 'Synonym' | 'Unresolved' | 'Artificial';

export interface Taxon {
  /** Internal UUID for the App database */
  id: string; 
  
  // Hierarchy
  /** UUID of the parent Taxon in the App database */
  parentId?: string; 
  rank: TaxonRank;
  
  // --- WCVP / POWO Specific Fields ---
  
  // IDs
  /** 
   * WCVP identifier (mapped from 'plant_name_id'). 
   * The primary key in the Kew database.
   */
  plantNameId?: string; 
  
  /** International Plant Names Index identifier (mapped from 'ipni_id') */
  ipniId?: string; 
  
  /** Plants of the World Online identifier (mapped from 'powo_id') */
  powoId?: string; 
  
  /** 
   * WCVP ID of the accepted name (mapped from 'accepted_plant_name_id').
   * Present if this record is a Synonym.
   */
  acceptedNameId?: string; 
  
  /** WCVP ID of the basionym (original name) (mapped from 'basionym_plant_name_id') */
  basionymId?: string; 
  
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
  scientificName: string; 
  
  /** Hybrid marker for Genus, e.g. '×' or '+' (mapped from 'genus_hybrid') */
  genusHybrid?: string; 
  
  /** Hybrid marker for Species, e.g. '×' (mapped from 'species_hybrid') */
  speciesHybrid?: string; 
  
  /** Formula for hybrids, e.g. "Parent A × Parent B" (mapped from 'hybrid_formula') */
  hybridFormula?: string; 
  
  // Status
  /** 'Accepted', 'Synonym', 'Unplaced', etc. (mapped from 'taxon_status') */
  taxonomicStatus: TaxonomicStatus; 
  
  /** Peer review status: 'Y' or 'N' (mapped from 'reviewed') */
  reviewed?: string; 

  // Authorship
  /** 
   * Full author string (mapped from 'taxon_authors'). 
   * e.g. "L." or "(Schott) Engelm."
   */
  authorship?: string; 
  
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
  publication?: string; 
  
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
  
  isDetailsLoaded?: boolean;
  createdAt: number;
  
  // Denormalized fields for Grid View
  genus?: string;
  species?: string;
  infraspecies?: string;
  infraspecificRank?: string;
  cultivar?: string;
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
  scientificName: string;
  commonName?: string;
  rank?: string;
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'common_name';
  confidence: number; // 0-1
  isHybrid?: boolean; // New flag
}

export interface ResolutionData {
  type: 'duplicate' | 'ambiguous' | 'correction';
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
