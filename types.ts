export type ColorTheme = 'option1a' | 'option1b' | 'option2a' | 'option2b';

export interface PalletLevel {
  base_color: string;
  cell_bg_weight: number;
  text_weight: number;
  badge_bg_weight: number;
  badge_border_weight: number;
}

export type RankPallet = Record<'family' | 'genus' | 'species' | 'infraspecies' | 'cultivar', PalletLevel>;

export interface UserPreferences {
  hybrid_spacing: 'space' | 'nospace';
  auto_enrichment: boolean;
  auto_fit_max_width?: number;
  fit_screen_max_ratio?: number;
  color_theme: ColorTheme;
  grid_pallet?: RankPallet;
  search_mode: 'prefix' | 'fuzzy'; 
  debug_mode?: boolean;
  grouping_strategy: 'attribute' | 'path';
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
  citation_text?: string;
  url?: string;
  trust_level?: number;
}

export interface Taxon {
  id: string;
  parent_id?: string;
  hierarchy_path?: string;
  wcvp_id?: string;
  ipni_id?: string;
  powo_id?: string;
  accepted_plant_name_id?: string;
  parent_plant_name_id?: string;
  basionym_plant_name_id?: string;
  homotypic_synonym?: string;
  taxon_rank: string;
  taxon_name: string;
  taxon_status: string;
  family?: string;
  common_name?: string;
  genus?: string;
  genus_hybrid?: string;
  species?: string;
  species_hybrid?: string;
  infraspecies?: string;
  infraspecific_rank?: string;
  cultivar?: string;
  hybrid_formula?: string;
  taxon_authors?: string;
  primary_author?: string;
  parenthetical_author?: string;
  publication_author?: string;
  replaced_synonym_author?: string;
  place_of_publication?: string;
  volume_and_page?: string;
  first_published?: string;
  nomenclatural_remarks?: string;
  reviewed?: string;
  geographic_area?: string;
  lifeform_description?: string;
  climate_description?: string;
  name: string;
  
  // Lineage
  source_id?: number;
  verification_level?: string;

  // Knowledge Layer Fields
  description_text?: string;
  hardiness_zone_min?: number;
  hardiness_zone_max?: number;
  height_min_cm?: number;
  height_max_cm?: number;
  width_min_cm?: number;
  width_max_cm?: number;
  origin_year?: number;
  morphology?: {
    foliage?: string;
    flowers?: string;
    form?: string;
    texture?: string;
    seasonal_variation?: string;
  };
  ecology?: {
    soil?: string;
    light?: string;
    water?: string;
    growth_rate?: string;
    flowering_period?: string;
  };
  history_metadata?: {
    background?: string;
  };
  
  alternative_names: Synonym[];
  reference_links: Link[];
  is_details_loaded?: boolean;
  created_at: number;
  descendant_count?: number;
}

export interface SearchCandidate {
  taxon_name: string;
  common_name?: string;
  accepted_name?: string;
  match_type: string;
  confidence: number;
  is_hybrid?: boolean;
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
  can_retry?: boolean;
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