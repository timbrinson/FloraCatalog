export type ColorTheme = 'option1a' | 'option1b' | 'option2a' | 'option2b';

export interface UserPreferences {
  hybridSpacing: 'space' | 'nospace';
  autoEnrichment: boolean;
  autoFitMaxWidth?: number;
  fitScreenMaxRatio?: number;
  colorTheme: ColorTheme;
  searchMode: 'prefix' | 'fuzzy'; 
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type SynonymType = 
  | 'scientific' 
  | 'trade' 
  | 'trademark' 
  | 'registered_trademark' 
  | 'patent' 
  | 'common' 
  | 'misapplied' 
  | 'misrepresented' 
  | 'cultivar' 
  | 'unspecified';

export interface Synonym {
  name: string;
  type: SynonymType;
}

export interface Link {
  title: string;
  url: string;
}

export interface DataSource {
  id: number;
  name: string;
  version?: string;
  citationText?: string;
  url?: string;
  trustLevel?: number;
}

export interface Taxon {
  id: string;
  parentId?: string;
  hierarchyPath?: string;
  wcvpId?: string;
  ipniId?: string;
  powoId?: string;
  acceptedPlantNameId?: string;
  parentPlantNameId?: string;
  basionymPlantNameId?: string;
  homotypicSynonym?: string;
  taxonRank: string;
  taxonName: string;
  taxonStatus: string;
  family?: string;
  commonName?: string;
  genus?: string;
  genusHybrid?: string;
  species?: string;
  speciesHybrid?: string;
  infraspecies?: string;
  infraspecificRank?: string;
  cultivar?: string;
  hybridFormula?: string;
  taxonAuthors?: string;
  primaryAuthor?: string;
  parentheticalAuthor?: string;
  publicationAuthor?: string;
  replacedSynonymAuthor?: string;
  placeOfPublication?: string;
  volumeAndPage?: string;
  firstPublished?: string;
  nomenclaturalRemarks?: string;
  reviewed?: string;
  geographicArea?: string;
  lifeformDescription?: string;
  climateDescription?: string;
  name: string;
  
  // Lineage
  sourceId?: number;
  verificationLevel?: string;

  // Knowledge Layer Fields
  description?: string;
  hardinessMin?: number;
  hardinessMax?: number;
  heightMin?: number;
  heightMax?: number;
  widthMin?: number;
  widthMax?: number;
  originYear?: number;
  morphology?: {
    foliage?: string;
    flowers?: string;
    form?: string;
    texture?: string;
    seasonalVariation?: string;
  };
  ecology?: {
    soil?: string;
    light?: string;
    water?: string;
    growthRate?: string;
    floweringPeriod?: string;
  };
  history?: string;
  
  synonyms: Synonym[];
  referenceLinks: Link[];
  isDetailsLoaded?: boolean;
  createdAt: number;
  descendantCount?: number;
}

export interface SearchCandidate {
  taxonName: string;
  commonName?: string;
  acceptedName?: string;
  matchType: string;
  confidence: number;
  isHybrid?: boolean;
}

export type ActivityStatus = 'running' | 'completed' | 'error' | 'needs_input';

export interface ActivityItem {
  id: string;
  name: string;
  type: 'mining' | 'import' | 'enrichment' | 'search';
  status: ActivityStatus;
  message: string;
  timestamp: number;
  payload?: any;
  details?: any;
  canRetry?: boolean;
  resolution?: {
    type: 'duplicate' | 'synonym' | 'correction' | 'ambiguous';
    candidates: SearchCandidate[];
  };
}

export interface BackgroundProcess {
  id: string;
  name: string;
  type: string;
  status: string;
}