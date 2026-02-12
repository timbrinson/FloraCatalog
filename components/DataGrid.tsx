// DO NOT add any new files, classes, or namespaces.
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Taxon, UserPreferences, RankPallet, PalletLevel } from '../types';
import { formatFullScientificName } from '../utils/formatters';
import { dataService } from '../services/dataService';
import { getIsOffline } from '../services/supabaseClient';
import DetailsPanel from './DetailsPanel';
import { 
  ArrowUpDown as ArrowUpDownIcon, Settings as SettingsIcon, Check as CheckIcon, 
  ChevronDown as ChevronDownIcon, GripVertical as GripVerticalIcon, 
  Maximize as MaximizeIcon, Monitor as MonitorIcon, 
  Pickaxe as PickaxeIcon, Info as InfoIcon, Wand2 as Wand2Icon, 
  Network as NetworkIcon, ChevronRight as ChevronRightIcon,
  ChevronUp as ChevronUpIcon, Loader2 as Loader2Icon, 
  Search as SearchIcon, List as ListIcon, Square as SquareIcon, 
  CheckSquare as CheckSquareIcon, ArrowRightToLine, AlignCenter,
  AlertCircle, Bug as BugIcon, X
} from 'lucide-react';


// Implementation of Grid Display Spec v2.33.0 (Higher Rank Extension)
// Comprehensive rank mapping including Kingdom, Phylum, Class.
const RANK_LEVELS: Record<string, number> = {
    'kingdom': 1,
    'phylum': 2,
    'class': 3,
    'order': 4,
    'family': 5,
    'genus': 6,
    'species': 7,
    // Infraspecific Cluster (Level 8)
    'subspecies': 8, 'subsp.': 8,
    'variety': 8, 'var.': 8,
    'subvariety': 8, 'subvar.': 8,
    'form': 8, 'f.': 8,
    'subform': 8, 'subf.': 8,
    'infraspecies': 8,
    'unranked': 8,
    'agamosp.': 8, 'convariety': 8, 'convar.': 8, 'ecas.': 8, 'grex': 8, 
    'lusus': 8, 'microf.': 8, 'microgène': 8, 'micromorphe': 8, 
    'modif.': 8, 'monstr.': 8, 'mut.': 8, 'nid': 8, 'nothof.': 8, 
    'nothosubsp.': 8, 'nothovar.': 8, 'positio': 8, 'proles': 8, 
    'provar.': 8, 'psp.': 8, 'stirps': 8, 'subap.': 8, 'sublusus': 8, 
    'subproles': 8, 'subspecioid': 8, 'subsubsp.': 8, 'unterrasse': 8,
    'cultivar': 9
};

const COL_RANK_LEVELS: Record<string, number> = {
    'kingdom': 1,
    'phylum': 2,
    'class': 3,
    'order': 4,
    'family': 5,
    'genus': 6, 'genus_hybrid': 6,
    'species': 7, 'species_hybrid': 7,
    'infraspecific_rank': 8, 'infraspecies': 8,
    'cultivar': 9
};

const DEFAULT_PALLET: RankPallet = {
  kingdom: { base_color: 'slate', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  phylum: { base_color: 'gray', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  class: { base_color: 'zinc', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  order: { base_color: 'purple', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  family: { base_color: 'rose', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  genus: { base_color: 'emerald', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  species: { base_color: 'amber', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  infraspecies: { base_color: 'orange', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 },
  cultivar: { base_color: 'sky', cell_bg_weight: 50, text_weight: 600, badge_bg_weight: 100, badge_border_weight: 200 }
};

// Simplified Legend Configuration per Backlog (v2.32.0)
const LEGEND_GROUPS: { label: string; key: keyof RankPallet }[] = [
    { label: 'Kingdom', key: 'kingdom' },
    { label: 'Phylum', key: 'phylum' },
    { label: 'Class', key: 'class' },
    { label: 'Order', key: 'order' },
    { label: 'Family', key: 'family' },
    { label: 'Genus', key: 'genus' },
    { label: 'Species', key: 'species' },
    { label: 'Infraspecies', key: 'infraspecies' },
    { label: 'Cultivar', key: 'cultivar' }
];

const MultiSelectFilter = ({ options, selected, onChange, label }: { options: string[], selected: string[], onChange: (val: string[]) => void, label: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const toggleOption = (opt: string) => {
        if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
        else onChange([...selected, opt]);
    };
    return (
        <div className="relative w-full" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-600 focus:border-leaf-300 focus:ring-1 focus:ring-leaf-200 flex justify-between items-center normal-case">
                <span className="truncate">{selected.length === 0 ? `All ${label}s` : `${selected.length} selected`}</span>
                <ChevronDownIcon size={12} className="opacity-50"/>
            </button>
            {isOpen && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 max-h-48 overflow-y-auto min-w-[150px]"><div className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-50 normal-case" onClick={() => { onChange([]); setIsOpen(false); }}>Clear Filter</div>{options.map(opt => (<div key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-leaf-50 cursor-pointer" onClick={() => toggleOption(opt)}><div className={`w-3 h-3 rounded border items-center justify-center flex-shrink-0 flex ${selected.includes(opt) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300 bg-white'}`}>{selected.includes(opt) && <CheckIcon size={10} className="text-white"/>}</div><span className="text-xs text-slate-700 whitespace-normal normal-case">{opt === 'NULL' || opt === 'null' ? <span className="italic opacity-60">None / Empty</span> : opt}</span></div>))}</div>)}
        </div>
    );
};

// v2.36.0 Strictly typed TreeRow for hierarchy management
type TreeRow = Taxon & {
    is_tree_header?: boolean;
    tree_expanded?: boolean;
    depth?: number;
    tree_path?: string;
    is_virtual?: boolean; 
    is_holder?: boolean;
    origin_type?: 'result' | 'ancestor' | 'virtual';
};

interface ColumnConfig { 
    id: string; 
    label: string; 
    tooltip: string;
    defaultWidth: number; 
    filterType?: 'text' | 'multi-select'; 
    filterOptions?: string[]; 
    disableSorting?: boolean; 
    disableDrag?: boolean;
    hideHeaderIcons?: boolean; 
    headerAlign?: 'left' | 'center' | 'right';
    lockWidth?: boolean;
    defaultOn?: boolean;
}

interface ColumnGroup {
    id: string;
    label: string;
    columns: ColumnConfig[];
}

// v2.36.0 Alignment with Sovereign DATA_MAPPING.md
const COLUMN_GROUPS: ColumnGroup[] = [
    {
        id: 'system',
        label: 'System',
        columns: [
            { id: 'id', label: 'Internal ID', tooltip: 'Internal UUID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'parent_id', label: 'Parent ID', tooltip: 'Parent UUID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'actions', label: 'Actions', tooltip: 'Actions', defaultWidth: 90, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center', defaultOn: false },
            { id: 'descendant_count', label: '#', tooltip: 'Child Count', defaultWidth: 50, filterType: 'text', hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { id: 'tree_control', label: 'Tree', tooltip: 'Tree Control', defaultWidth: 55, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center', defaultOn: true },
        ]
    },
    {
        id: 'taxon_status',
        label: 'Taxon Status',
        columns: [
            { id: 'taxon_name', label: 'Plant Name', tooltip: 'Scientific Name', defaultWidth: 220, filterType: 'text', defaultOn: true },
            { 
                id: 'taxon_rank', 
                label: 'Rank', 
                tooltip: 'Taxonomic Rank', 
                defaultWidth: 110, 
                filterType: 'multi-select', 
                filterOptions: ['Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species', 'Subspecies', 'Variety', 'Subvariety', 'Form', 'Subform', 'Cultivar', 'Unranked', 'agamosp.', 'Convariety', 'ecas.', 'grex', 'lusus', 'microf.', 'microgène', 'micromorphe', 'modif.', 'monstr.', 'mut.', 'nid', 'nothof.', 'nothosubsp.', 'nothovar.', 'positio', 'proles', 'provar.', 'psp.', 'stirps', 'subap.', 'sublusus', 'subproles', 'subspecioid', 'subsubsp.'], 
                lockWidth: true, 
                defaultOn: true 
            },
            { 
                id: 'taxon_status', 
                label: 'Status', 
                tooltip: 'Taxonomic Status', 
                defaultWidth: 110, 
                filterType: 'multi-select', 
                filterOptions: ['Accepted', 'Synonym', 'Unplaced', 'Unchecked', 'Registered', 'Provisional', 'Artificial Hybrid', 'Illegitimate', 'Invalid', 'Local Biotype', 'Misapplied', 'Orthographic', 'Provisionally Accepted'], 
                defaultOn: true 
            },
            { id: 'homotypic_synonym', label: 'Homotypic Syn.', tooltip: 'Homotypic Synonym Flag', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'hybrid_formula', label: 'Hybrid Formula', tooltip: 'Hybrid Formula', defaultWidth: 180, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'taxonomy',
        label: 'Taxonomy',
        columns: [
            { id: 'kingdom', label: 'Kingdom', tooltip: 'Taxonomic Kingdom', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'phylum', label: 'Phylum', tooltip: 'Taxonomic Phylum', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'class', label: 'Class', tooltip: 'Taxonomic Class', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'order', label: 'Order', tooltip: 'Phylogenetic Order', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'family', label: 'Family', tooltip: 'Family Name', defaultWidth: 120, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'nomenclature',
        label: 'Nomenclature',
        columns: [
            { id: 'genus_hybrid', label: 'GH', tooltip: 'Genus Hybrid Indicator', defaultWidth: 40, filterType: 'multi-select', filterOptions: ['+', '×', 'NULL'], disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { id: 'genus', label: 'Genus', tooltip: 'Genus Designation', defaultWidth: 120, filterType: 'text', defaultOn: true },
            { id: 'species_hybrid', label: 'SH', tooltip: 'Species Hybrid Indicator', defaultWidth: 40, filterType: 'multi-select', filterOptions: ['+', '×', 'NULL'], disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { id: 'species', label: 'Species', tooltip: 'Species Designation', defaultWidth: 120, filterType: 'text', defaultOn: true },
            { 
                id: 'infraspecific_rank', 
                label: 'I Rank', 
                tooltip: 'Infraspecific Rank', 
                defaultWidth: 80, 
                filterType: 'multi-select', 
                filterOptions: ['NULL', 'subsp.', 'var.', 'subvar.', 'f.', 'subf.', 'agamosp.', 'convar.', 'ecas.', 'grex', 'lusus', 'microf.', 'microgène', 'micromorphe', 'modif.', 'monstr.', 'mut.', 'nid', 'nothof.', 'nothosubsp.', 'nothovar.', 'positio', 'proles', 'provar.', 'psp.', 'stirps', 'subap.', 'sublusus', 'subproles', 'subspecioid', 'subsubsp.', 'group', 'unterrasse'],
                hideHeaderIcons: true, 
                headerAlign: 'center', 
                lockWidth: true, 
                defaultOn: true 
            },
            { id: 'infraspecies', label: 'Infraspecies', tooltip: 'Infraspecific Designation', defaultWidth: 120, filterType: 'text', defaultOn: true },
            { id: 'cultivar', label: 'Cultivar', tooltip: 'Cultivar Name', defaultWidth: 150, filterType: 'text', defaultOn: true },
        ]
    },
    {
        id: 'standard_identifiers',
        label: 'Standard Identifiers',
        columns: [
            { id: 'wcvp_id', label: 'WCVP ID', tooltip: 'WCVP Plant Name ID', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'accepted_plant_name_id', label: 'Accepted ID', tooltip: 'Accepted Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'parent_plant_name_id', label: 'Parent Plant ID', tooltip: 'Parent Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'basionym_plant_name_id', label: 'Basionym ID', tooltip: 'Basionym Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'ipni_id', label: 'IPNI ID', tooltip: 'IPNI ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'powo_id', label: 'POWO ID', tooltip: 'POWO ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'wfo_identifiers',
        label: 'WFO Identifiers',
        columns: [
            { id: 'wfo_id', label: 'WFO ID', tooltip: 'World Flora Online ID', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'wfo_accepted_id', label: 'WFO Acc. ID', tooltip: 'WFO Accepted Name ID', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'wfo_parent_id', label: 'WFO Parent ID', tooltip: 'WFO Parent ID', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'wfo_original_id', label: 'WFO Orig. ID', tooltip: 'WFO Original ID', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'wfo_scientific_name_id', label: 'WFO Sci. ID', tooltip: 'WFO Scientific ID', defaultWidth: 120, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'descriptive',
        label: 'Descriptive',
        columns: [
            { id: 'lifeform_description', label: 'Lifeform', tooltip: 'Lifeform Description', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'geographic_area', label: 'Geography', tooltip: 'Geographic Area', defaultWidth: 180, filterType: 'text', defaultOn: false },
            { 
                id: 'climate_description', 
                label: 'Climate', 
                tooltip: 'Climate Description', 
                defaultWidth: 180, 
                filterType: 'multi-select', 
                filterOptions: ['NULL', 'desert or dry shrubland', 'montane tropical', 'seasonally dry tropical', 'subalpine or subarctic', 'subtropical', 'subtropical or tropical', 'temperate', 'temperate, subtropical or tropical', 'wet tropical'], 
                defaultOn: false 
            },
        ]
    },
    {
        id: 'publication',
        label: 'Publication',
        columns: [
            { id: 'taxon_authors', label: 'Authorship', tooltip: 'Taxon Authors', defaultWidth: 180, filterType: 'text', defaultOn: false },
            { id: 'primary_author', label: 'Prim. Author', tooltip: 'Primary Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'parenthetical_author', label: 'Paren. Author', tooltip: 'Parenthetical Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'publication_author', label: 'Pub. Author', tooltip: 'Publication Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'replaced_synonym_author', label: 'Syn. Author', tooltip: 'Replaced Synonym Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'place_of_publication', label: 'Pub. Place', tooltip: 'Place Of Publication', defaultWidth: 200, filterType: 'text', defaultOn: false },
            { id: 'volume_and_page', label: 'Vol/Page', tooltip: 'Volume And Page', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'first_published', label: 'First Published', tooltip: 'First Published Date', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'nomenclatural_remarks', label: 'Nom. Remarks', tooltip: 'Nomenclatural Remarks', defaultWidth: 200, filterType: 'text', defaultOn: false },
            { id: 'reviewed', label: 'Reviewed', tooltip: 'Reviewed Status', defaultWidth: 100, filterType: 'multi-select', filterOptions: ['TRUE', 'FALSE', 'NULL'], defaultOn: false },
        ]
    }
];

const ALL_COLUMNS = COLUMN_GROUPS.flatMap(g => g.columns);

const isTechnicalColumn = (colId: string) => colId === 'id' || colId.endsWith('_id') || colId === 'first_published';

interface DataGridProps {
    taxa: Taxon[];
    ancestors?: Taxon[]; 
    onAction?: (action: 'mine' | 'enrich', taxon: Taxon) => void;
    onUpdate?: (id: string, updates: Partial<Taxon>) => void;
    preferences: UserPreferences;
    onPreferenceChange?: (prefs: UserPreferences) => void;
    totalRecords: number;
    isLoadingMore: boolean;
    onLoadMore: () => void;
    sortConfig: { key: string, direction: 'asc' | 'desc' };
    onSortChange: (key: string, direction: string) => void;
    filters: Record<string, any>;
    onFilterChange: (key: string, value: any) => void;
    error?: string | null;
    visibleColumns?: Set<string>;
    columnOrder?: string[];
    colWidths?: Record<string, number>;
    onLayoutUpdate?: (layout: { visibleColumns: string[], columnOrder: string[], colWidths: Record<string, number> }) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({ 
    taxa, ancestors = [], onAction, onUpdate, preferences, onPreferenceChange,
    totalRecords, isLoadingMore, onLoadMore, 
    sortConfig, onSortChange,
    filters, onFilterChange,
    error,
    visibleColumns: propVisibleColumns,
    columnOrder: propColumnOrder,
    colWidths: propColWidths,
    onLayoutUpdate
}) => {
  
  /**
   * Layout Healers: Ensure new standard features are injected into session state.
   */
  const healVisibleColumns = useCallback((incoming: Set<string>) => {
      const healed = new Set(incoming);
      // Ensure Rank and Status are on if we are healing a legacy config
      const required = ['taxon_rank', 'taxon_status', 'descendant_count', 'tree_control'];
      required.forEach(id => {
          if (!healed.has(id)) healed.add(id);
      });
      return healed;
  }, []);

  const healColumnOrder = useCallback((incoming: string[]) => {
      let baseOrder = [...incoming];
      const allIds = ALL_COLUMNS.map(c => c.id);
      const missing = allIds.filter(id => !baseOrder.includes(id));
      return [...baseOrder, ...missing];
  }, []);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
      if (propVisibleColumns !== undefined) {
          return healVisibleColumns(propVisibleColumns);
      }
      return new Set(ALL_COLUMNS.filter(c => c.defaultOn).map(c => c.id));
  });
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
      if (propColumnOrder !== undefined) {
          return healColumnOrder(propColumnOrder);
      }
      return ALL_COLUMNS.map(c => c.id);
  });
  
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
      if (propColWidths !== undefined) return propColWidths;
      return Object.fromEntries(ALL_COLUMNS.map(c => [c.id, c.defaultWidth]));
  });

  useEffect(() => {
      onLayoutUpdate?.({
          visibleColumns: Array.from(visibleColumns),
          columnOrder,
          colWidths
      });
  }, [visibleColumns, columnOrder, colWidths, onLayoutUpdate]);

  const [isHierarchyMode, setIsHierarchyMode] = useState<boolean>(true);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [localTextFilters, setLocalTextFilters] = useState<Record<string, string>>({});
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [showColPicker, setShowColPicker] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  
  const resizingRef = useRef<{ colId: string, startX: number, startWidth: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const colPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const newLocalFilters: Record<string, string> = {};
      Object.keys(filters).forEach(key => {
          if (typeof filters[key] === 'string') {
              newLocalFilters[key] = filters[key];
          }
      });
      setLocalTextFilters(newLocalFilters);
  }, [filters]);

  useEffect(() => { 
      if (isHierarchyMode) {
          const levels = [];
          if (visibleColumns.has('kingdom')) levels.push('kingdom');
          if (visibleColumns.has('phylum')) levels.push('phylum');
          if (visibleColumns.has('class')) levels.push('class');
          if (visibleColumns.has('order')) levels.push('order');
          if (visibleColumns.has('family')) levels.push('family');
          levels.push('genus', 'species', 'infraspecies');
          setGroupBy(levels);
      } else {
          setGroupBy([]);
      }
  }, [isHierarchyMode, visibleColumns]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as Node;
          if (showLegend && legendRef.current && !legendRef.current.contains(target)) setShowLegend(false);
          if (showColPicker && colPickerRef.current && !colPickerRef.current.contains(target)) setShowColPicker(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLegend, showColPicker]);

  const activeColumns = useMemo(() => {
      return columnOrder
        .filter(id => visibleColumns.has(id))
        .map(id => ALL_COLUMNS.find(c => c.id === id))
        .filter((c): c is ColumnConfig => !!c);
  }, [columnOrder, visibleColumns]);

  const totalTableWidth = useMemo(() => activeColumns.reduce((sum, col) => sum + (colWidths[col.id] || col.defaultWidth), 0), [activeColumns, colWidths]);
  
  const activePallet = useMemo(() => {
    return {
      ...DEFAULT_PALLET,
      ...(preferences.grid_pallet || {})
    };
  }, [preferences.grid_pallet]);

  const { allTaxaPool, authorityRegistry } = useMemo(() => {
    const registry = new Map<string, TreeRow>();
    ancestors.forEach(t => registry.set(t.id, { ...t, origin_type: 'ancestor' } as TreeRow));
    taxa.forEach(t => registry.set(t.id, { ...t, origin_type: 'result' } as TreeRow));
    const pool = Array.from(registry.values());
    return { allTaxaPool: pool, authorityRegistry: registry };
  }, [taxa, ancestors]);

  const getRowValue = (row: Taxon, colId: string) => {
       const tr = row as TreeRow;
       if (colId === 'descendant_count') { 
         if (tr.is_virtual) return '';
         return tr.descendant_count ?? 0;
       }
       const isIndicator = ['genus_hybrid', 'species_hybrid', 'infraspecific_rank'].includes(colId);
       const rawVal = row[colId as keyof Taxon];
       if (isIndicator) return rawVal || '';
       const rank = (row.taxon_rank || '').toLowerCase();
       
       if (colId === 'kingdom' && rank === 'kingdom') return row.taxon_name;
       if (colId === 'phylum' && rank === 'phylum') return row.taxon_name;
       if (colId === 'class' && rank === 'class') return row.taxon_name;
       if (colId === 'order' && rank === 'order') return row.taxon_name;
       if (colId === 'family' && rank === 'family') return row.taxon_name;

       // Higher rank empty logic
       if (rank === 'kingdom' && (colId === 'phylum' || colId === 'class' || colId === 'order' || colId === 'family' || colId === 'genus')) return '';
       if (rank === 'phylum' && (colId === 'class' || colId === 'order' || colId === 'family' || colId === 'genus')) return '';
       if (rank === 'class' && (colId === 'order' || colId === 'family' || colId === 'genus')) return '';
       if (rank === 'order' && (colId === 'family' || colId === 'genus')) return '';
       if (rank === 'family' && colId === 'genus') return '';
       
       if (tr.is_holder && COL_RANK_LEVELS[colId] === RANK_LEVELS[rank]) return '(none)';
       return rawVal;
  };

  const handleTextFilterChange = (key: string, val: string, forceCommit: boolean = false) => {
      setLocalTextFilters(prev => ({ ...prev, [key]: val }));
      if (isTechnicalColumn(key) && !forceCommit) return;
      if ((window as any).filterTimeout) clearTimeout((window as any).filterTimeout);
      if (forceCommit) {
          onFilterChange(key, val);
      } else {
          (window as any).filterTimeout = setTimeout(() => onFilterChange(key, val), 600);
      }
  };

  const isRankMatch = (rank: string, target: string) => {
      const r = rank.toLowerCase();
      const t = target.toLowerCase();
      if (t === 'infraspecies') return (RANK_LEVELS[r] === 8);
      return r === t;
  };

  const getTargetIdForRank = (row: Taxon, targetRank: string): string => {
      const r_target = targetRank.toLowerCase();
      const isHigherRank = ['kingdom', 'phylum', 'class', 'order', 'family'].includes(r_target);
      
      if (isHigherRank) {
          const storedVal = row[r_target as keyof Taxon];
          if (storedVal) return storedVal as string;
          if (isRankMatch(row.taxon_rank || '', r_target)) return row.taxon_name;
          
          if (row.hierarchy_path) {
              const segments = row.hierarchy_path.split('.');
              for (let i = 1; i < segments.length; i++) {
                  const id = segments[i].replace(/_/g, '-');
                  const auth = authorityRegistry.get(id) || allTaxaPool.find(t => t.id === id);
                  if (auth && isRankMatch(auth.taxon_rank || '', r_target)) return auth.taxon_name;
              }
          }
          
          let curr: Taxon | undefined = row;
          while (curr && curr.parent_id) {
              const auth = authorityRegistry.get(curr.parent_id) || allTaxaPool.find(t => t.id === curr!.parent_id);
              const authVal = auth?.[r_target as keyof Taxon];
              if (authVal) return authVal as string;
              curr = auth;
          }
          return '(none)';
      }
      
      if (row.hierarchy_path) {
          const segments = row.hierarchy_path.split('.');
          for (let i = 1; i < segments.length; i++) {
              const id = segments[i].replace(/_/g, '-');
                  const auth = authorityRegistry.get(id) || allTaxaPool.find(t => t.id === id);
              if (auth && isRankMatch(auth.taxon_rank || '', r_target)) return id;
          }
      }
      if (isRankMatch(row.taxon_rank || '', r_target)) return row.id;
      let curr: Taxon | undefined = row;
      while (curr && curr.parent_id) {
          const parent: Taxon | undefined = authorityRegistry.get(curr.parent_id) || allTaxaPool.find(t => t.id === curr!.parent_id);
          if (parent) {
              if (isRankMatch(parent.taxon_rank || '', r_target)) return parent.id;
              curr = parent;
          } else { break; }
      }
      return '(none)';
  };

  const walkLineage = (subset: Taxon[], depth: number, parentPath: string, parentRecord?: Taxon): TreeRow[] => {
      const outputRows: TreeRow[] = [];
      const field = groupBy[depth];
      if (!field || depth >= groupBy.length) {
          subset.forEach(t => {
              const tr = t as TreeRow;
              outputRows.push({ ...tr, depth, tree_path: `${parentPath}/${t.id}`, origin_type: tr.origin_type || 'result' });
          });
          return outputRows;
      }
      
      const groupMap = new Map<string, Taxon[]>();
      const groupOrder: string[] = [];
      subset.forEach(row => {
          const segmentId = getTargetIdForRank(row, field);
          if (!groupMap.has(segmentId)) {
              groupMap.set(segmentId, []);
              groupOrder.push(segmentId);
          }
          groupMap.get(segmentId)!.push(row);
      });
      const sortedKeys = groupOrder.sort((a, b) => {
          if (a === '(none)') return -1;
          if (b === '(none)') return 1;
          return a.localeCompare(b);
      });
      sortedKeys.forEach(segmentId => {
          const groupItems = groupMap.get(segmentId)!;
          const path = `${parentPath}/${segmentId}`;
          const isHolder = segmentId === '(none)';
          const isStringRank = ['kingdom', 'phylum', 'class', 'order', 'family'].includes(field);

          let headerTaxon: TreeRow | undefined = authorityRegistry.get(segmentId);
          if (!headerTaxon || isHolder) {
              headerTaxon = allTaxaPool.find(t => 
                isRankMatch(t.taxon_rank || '', field) && 
                (isStringRank ? (t.taxon_name === segmentId) : (t.id === segmentId))
              ) as TreeRow | undefined;
          }

          const itemsToRecurse = headerTaxon ? groupItems.filter(i => i.id !== headerTaxon!.id) : groupItems;
          const currentRankLevel = RANK_LEVELS[field] || 0;
          const filteredRecurseItems = itemsToRecurse.filter(t => {
              const r = (t.taxon_rank || '').toLowerCase();
              return (RANK_LEVELS[r] || 99) > currentRankLevel;
          });
          const firstChild = groupItems[0];
          const headerRow: TreeRow = headerTaxon ? { ...headerTaxon, origin_type: headerTaxon.origin_type || 'ancestor' } : {
              id: `virtual:${segmentId}:${parentRecord?.id || 'root'}`,
              is_virtual: true, is_holder: isHolder, origin_type: 'virtual',
              taxon_rank: (field === 'infraspecies' ? 'Infraspecies' : field.charAt(0).toUpperCase() + field.slice(1)) as any,
              name: isHolder ? '(none)' : segmentId,
              taxon_name: isHolder ? '(none)' : segmentId,
              taxon_status: '', 
              kingdom: field === 'kingdom' ? segmentId : (parentRecord?.kingdom || firstChild?.kingdom),
              phylum: field === 'phylum' ? segmentId : (parentRecord?.phylum || firstChild?.phylum),
              class: field === 'class' ? segmentId : (parentRecord?.class || firstChild?.class),
              order: field === 'order' ? segmentId : (parentRecord?.order || firstChild?.order),
              family: field === 'family' ? segmentId : (parentRecord?.family || firstChild?.family),
              genus: field === 'genus' ? segmentId : (depth >= (groupBy.indexOf('genus')) ? (parentRecord?.genus || firstChild?.genus) : undefined),
              species: field === 'species' ? segmentId : (depth >= (groupBy.indexOf('species')) ? (parentRecord?.species || firstChild?.species) : undefined),
              alternative_names: [], reference_links: [], created_at: 0
          } as any;
          headerRow.is_tree_header = true;
          headerRow.tree_expanded = !collapsedGroups.has(path);
          headerRow.depth = depth; headerRow.tree_path = path;
          outputRows.push(headerRow);
          if (headerRow.tree_expanded && (filteredRecurseItems.length > 0 || isHolder)) {
              outputRows.push(...walkLineage(filteredRecurseItems, depth + 1, path, headerRow));
          }
      });
      return outputRows;
  };

  const gridRows = useMemo((): TreeRow[] => {
      if (!taxa || taxa.length === 0) return [];
      if (groupBy.length === 0) return taxa.map(t => ({ ...t, origin_type: 'result' } as TreeRow));
      return walkLineage(taxa, 0, 'root');
  }, [taxa, allTaxaPool, authorityRegistry, groupBy, collapsedGroups, visibleColumns]);

  const toggleGroup = (path: string) => { const next = new Set(collapsedGroups); if (next.has(path)) next.delete(path); else next.add(path); setCollapsedGroups(next); };
  
  const expandTreeLevel = (targetDepth: number) => {
      if (!taxa) return;
      const newCollapsed = new Set<string>();
      const allPathsWithDepths: {path: string, depth: number}[] = [];
      const walk = (subset: Taxon[], depth: number, parentPath: string) => {
          if (depth >= groupBy.length) return;
          const field = groupBy[depth];
          const groups: Record<string, Taxon[]> = {};
          subset.forEach(row => {
              const segmentId = getTargetIdForRank(row, field);
              if (!groups[segmentId]) groups[segmentId] = [];
              groups[segmentId].push(row);
          });
          Object.keys(groups).forEach(segmentId => {
              const path = `${parentPath}/${segmentId}`;
              allPathsWithDepths.push({ path, depth });
              walk(groups[segmentId], depth + 1, path);
          });
      };
      walk(taxa, 0, 'root');
      allPathsWithDepths.forEach(item => { if (item.depth >= targetDepth) newCollapsed.add(item.path); });
      setCollapsedGroups(newCollapsed);
  };

  const handleResizeMove = useCallback((e: MouseEvent) => { 
    if (!resizingRef.current) return; 
    const { colId, startWidth } = resizingRef.current; 
    const diff = e.clientX - resizingRef.current.startX; 
    setColWidths(prev => ({ ...prev, [colId]: Math.max(30, startWidth + diff) })); 
  }, []);

  const handleResizeEnd = useCallback(() => { resizingRef.current = null; document.removeEventListener('mousemove', handleResizeMove); document.removeEventListener('mouseup', handleResizeEnd); document.body.style.cursor = ''; }, [handleResizeMove]);
  const handleResizeStart = (e: React.MouseEvent, colId: string) => { e.preventDefault(); e.stopPropagation(); resizingRef.current = { colId, startX: e.clientX, startWidth: colWidths[colId] || 100 }; document.addEventListener('mousemove', handleResizeMove); document.addEventListener('mouseup', handleResizeEnd); document.body.style.cursor = 'col-resize'; };
  
  const autoFitContent = () => {
      const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (!context) return; context.font = '14px Inter, sans-serif';
      const updates: Record<string, number> = {};
      const limit = preferences.auto_fit_max_width || 400;
      activeColumns.forEach(col => {
          if (col.lockWidth) return;
          let maxWidth = context.measureText(col.label).width + 32;
          taxa.slice(0, 50).forEach(row => { const val = String(getRowValue(row, col.id) || ''); maxWidth = Math.max(maxWidth, context.measureText(val).width + 20); });
          updates[col.id] = col.id === 'taxon_name' ? Math.max(Math.ceil(maxWidth), 180) : Math.min(Math.ceil(maxWidth), limit);
      });
      setColWidths(prev => ({...prev, ...updates}));
  };

  const fitToScreen = () => {
      if (!containerRef.current) return;
      const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (!context) return; context.font = '14px Inter, sans-serif';
      const availableWidth = containerRef.current.clientWidth - 2;
      const flexCols = activeColumns.filter(c => !c.lockWidth);
      let lockedWidth = 0; activeColumns.filter(c => c.lockWidth).forEach(col => lockedWidth += (colWidths[col.id] || col.defaultWidth));
      const flexAvailable = Math.max(0, availableWidth - lockedWidth);
      if (flexCols.length === 0) return;
      let totalCappedWidth = 0; const cappedIdeals: Record<string, number> = {};
      flexCols.forEach(col => { let w = context.measureText(col.label).width + 32; if (col.id === 'taxon_name') w = Math.max(w, 200); cappedIdeals[col.id] = w; totalCappedWidth += w; });
      const scale = flexAvailable / totalCappedWidth;
      const newWidths: Record<string, number> = {};
      flexCols.forEach(col => newWidths[col.id] = Math.floor(cappedIdeals[col.id] * scale));
      setColWidths(prev => ({...prev, ...newWidths}));
  };

  const handleSort = (key: string) => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'; onSortChange(key, direction); };
  const toggleColumn = (id: string) => { const next = new Set(visibleColumns); if (next.has(id)) next.delete(id); else next.add(id); setVisibleColumns(next); };
  const toggleColumnGroup = (groupId: string) => { const group = COLUMN_GROUPS.find(g => g.id === groupId); if (!group) return; const groupColIds = group.columns.map(c => c.id); const isCurrentlySelected = groupColIds.every(id => visibleColumns.has(id)); const next = new Set(visibleColumns); if (isCurrentlySelected) groupColIds.forEach(id => next.delete(id)); else groupColIds.forEach(id => next.add(id)); setVisibleColumns(next); };
  const handleDragStart = (e: React.DragEvent, id: string) => { if (ALL_COLUMNS.find(c=>c.id===id)?.disableDrag) return; setDraggedColumn(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  
  const handleDrop = (e: React.DragEvent, targetId: string) => { e.preventDefault(); if (!draggedColumn || draggedColumn === targetId) return; const newOrder = [...columnOrder]; const sIdx = newOrder.indexOf(draggedColumn); const tIdx = newOrder.indexOf(targetId); newOrder.splice(sIdx, 1); newOrder.splice(tIdx, 0, draggedColumn); setColumnOrder(newOrder); setDraggedColumn(null); };

  const isAnyGroupCollapsed = collapsedGroups.size > 0;
  const toggleAllGroups = () => { if (isAnyGroupCollapsed) setCollapsedGroups(new Set()); else expandTreeLevel(0); };
  const toggleSearchMode = () => onPreferenceChange?.({ ...preferences, search_mode: preferences.search_mode === 'prefix' ? 'fuzzy' : 'prefix' });
  const toggleDebugMode = () => onPreferenceChange?.({ ...preferences, debug_mode: !preferences.debug_mode });

  const tableVersionKey = useMemo(() => {
    return `${groupBy.join('-')}-${JSON.stringify(filters)}-${taxa.length}-${sortConfig.key}-${sortConfig.direction}-${preferences.debug_mode}`;
  }, [groupBy, filters, taxa.length, sortConfig, preferences.debug_mode]);

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center z-20 relative flex-shrink-0">
         <div className="text-xs text-slate-500 font-medium px-2 flex items-center gap-4 flex-1">
             <div className="flex items-center gap-2">
                <button onClick={() => setIsHierarchyMode(!isHierarchyMode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isHierarchyMode ? 'bg-leaf-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {isHierarchyMode ? <NetworkIcon size={14}/> : <ListIcon size={14}/>}
                  {isHierarchyMode ? 'Hierarchy Mode' : 'Flat List'}
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {taxa?.length.toLocaleString() || '0'} of {totalRecords >= 0 ? totalRecords.toLocaleString() : 'many'} records
                </div>
             </div>
             {isLoadingMore && <span className="flex items-center gap-1 text-leaf-600"><Loader2Icon size={12} className="animate-spin"/> Loading...</span>}
             {error && (<div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 animate-in fade-in duration-300 max-w-[300px] truncate" title={error}><AlertCircle size={14} className="flex-shrink-0" /><span className="font-bold truncate">{error}</span></div>)}
             {isHierarchyMode && (
                 <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 ml-2 shadow-sm">
                     {Array.from({ length: groupBy.length + 1 }, (_, i) => i + 1).map((idx) => (
                         <button key={idx} onClick={() => expandTreeLevel(idx-1)} className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded" title={`Collapse all at Level ${idx}`}>{idx}</button>
                     ))}
                     <div className="w-px h-3 bg-slate-200 mx-1"></div>
                     <button onClick={toggleAllGroups} className="px-2 py-0.5 text-[10px] font-bold text-leaf-600 hover:bg-leaf-50 rounded">{isAnyGroupCollapsed ? 'Expand All' : 'Collapse All'}</button>
                 </div>
             )}
         </div>
         <div className="flex items-center gap-2">
             <button onClick={toggleDebugMode} className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm transition-colors ${preferences.debug_mode ? 'bg-amber-100 text-amber-800 border-amber-400' : 'bg-white text-slate-600'}`} title="Diagnostic Mode (See IDs & Paths)"><BugIcon size={14} /></button>
             <div className="relative" ref={legendRef}>
                <button onClick={() => setShowLegend(!showLegend)} className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm ${showLegend ? 'bg-slate-100 text-leaf-600' : 'bg-white text-slate-600'}`}><InfoIcon size={14} /> Legend</button>
                {showLegend && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 p-4 origin-top-right animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taxonomic Colors</span>
                            <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {LEGEND_GROUPS.map((group) => {
                                const p = activePallet[group.key];
                                const color = p?.base_color || 'slate';
                                const badgeWeight = p?.badge_bg_weight || 100;
                                const textWeight = p?.text_weight || 600;
                                return (
                                    <div key={group.label} className="flex flex-col gap-1 border-b border-slate-50 pb-2 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-sm bg-${color}-${textWeight} shadow-sm`}></div>
                                            <span className="text-xs font-bold text-slate-700 capitalize">{group.label}</span>
                                        </div>
                                        <div className="flex gap-2 ml-5">
                                            <div className={`flex-1 px-1.5 py-0.5 rounded text-[10px] bg-${color}-${badgeWeight} border border-${color}-${p?.badge_border_weight || 200} text-${color}-${textWeight} font-medium`}>Standard</div>
                                            <div className={`flex-1 px-1.5 py-0.5 rounded text-[10px] bg-${color}-${badgeWeight} border border-${color}-${p?.badge_border_weight || 200} text-${color}-${textWeight} font-medium saturate-50 opacity-80`}>Hybrid</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
             </div>
             <button onClick={fitToScreen} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><MonitorIcon size={14} /> Fit Screen</button>
             <button onClick={autoFitContent} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><MaximizeIcon size={14} /> Auto Fit</button>
             <div className="relative" ref={colPickerRef}>
                 <button onClick={() => setShowColPicker(!showColPicker)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><SettingsIcon size={14} /> Columns</button>
                 {showColPicker && (
                    <div className="absolute right-0 top-full mt-2 w-[520px] bg-white border border-slate-200 rounded-lg shadow-2xl z-50 p-4 max-h-[85vh] overflow-y-auto origin-top-right animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-4 px-1"><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configure Grid</div><div className="flex gap-2"><button onClick={() => setVisibleColumns(new Set())} className="text-[10px] text-blue-600 hover:underline">Hide All</button><button onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.map(c=>c.id)))} className="text-[10px] text-blue-600 hover:underline">Show All</button></div></div>
                        <div className="columns-2 gap-x-8 gap-y-0">
                            {COLUMN_GROUPS.map(group => (
                                <div key={group.id} className="mb-6 break-inside-avoid">
                                    <div className="flex items-center justify-between group/grp px-1 mb-1.5">
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleColumnGroup(group.id)}>
                                            <div className={`text-leaf-600`}>{group.columns.every(c => visibleColumns.has(c.id)) ? <CheckSquareIcon size={14} /> : group.columns.some(c => visibleColumns.has(c.id)) ? <SquareIcon size={14} className="opacity-50" /> : <SquareIcon size={14} className="text-slate-300" />}</div>
                                            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide">{group.label}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 ml-5">
                                        {group.columns.map(col => (
                                            <div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 cursor-pointer rounded transition-colors group/col" title={col.tooltip}><div className={`w-3 h-3 rounded flex items-center justify-center border flex-shrink-0 ${visibleColumns.has(col.id) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300'}`}>{visibleColumns.has(col.id) && <CheckIcon size={10} className="text-white"/>}</div><span className="text-xs text-slate-600 group-hover/col:text-slate-900 truncate">{col.label}</span></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
             </div>
         </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar" ref={containerRef} onScroll={(e) => { if (!isLoadingMore && e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 300) onLoadMore(); }}>
        <table className="text-left text-sm whitespace-nowrap border-separate border-spacing-0 table-fixed" style={{ width: totalTableWidth }}>
           <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wide shadow-sm">
              <tr>
                  {activeColumns.map(col => (
                      <th key={col.id} className={`border-b border-slate-200 bg-slate-50 select-none relative group ${['tree_control', 'descendant_count'].includes(col.id) ? '' : 'border-r border-slate-100'}`} style={{ width: colWidths[col.id], minWidth: 30 }} draggable={!col.disableDrag} onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} title={col.tooltip}>
                         <div className={`flex items-center gap-1 p-2 h-full w-full ${col.headerAlign === 'center' ? 'justify-center' : 'justify-between'}`}>
                             {col.id === 'tree_control' ? (
                                <div className="flex justify-center w-full">
                                    <button onClick={(e) => { e.stopPropagation(); setIsHierarchyMode(!isHierarchyMode); }} className={`p-1 rounded hover:bg-slate-200 transition-colors ${isHierarchyMode ? 'text-leaf-600' : 'text-slate-400'}`} title={isHierarchyMode ? "Flat View" : "Tree View"}>{isHierarchyMode ? <NetworkIcon size={16} /> : <ListIcon size={16} />}</button>
                                </div>
                             ) : (
                                 <>
                                     <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing overflow-hidden" onClick={() => !col.disableSorting && handleSort(col.id)}>
                                        {col.id !== 'actions' && !col.disableDrag && !col.hideHeaderIcons && <GripVerticalIcon size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-move flex-shrink-0" />}
                                        <span className="truncate">{col.label}</span>
                                     </div>
                                     {col.id !== 'actions' && !col.disableSorting && !col.hideHeaderIcons && (<button onClick={() => handleSort(col.id)} className="flex-shrink-0"><ArrowUpDownIcon size={12} className={sortConfig?.key === col.id ? 'text-leaf-600' : 'text-slate-300 hover:text-slate-50'}/></button>)}
                                 </>
                             )}
                         </div>
                         {col.id !== 'actions' && (<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-leaf-400 z-20" onMouseDown={(e) => handleResizeStart(e, col.id)}/>)}
                      </th>
                  ))}
              </tr>
              <tr>
                  {activeColumns.map(col => (
                      <th key={`${col.id}-filter`} className={`p-1 border-b border-slate-200 bg-slate-50/80 ${['tree_control', 'descendant_count'].includes(col.id) ? '' : 'border-r border-slate-100'}`}>
                          {col.id === 'actions' || col.id === 'tree_control' ? null 
                           : col.filterType === 'multi-select' 
                             ? (<MultiSelectFilter label={col.label} options={col.filterOptions || []} selected={filters[col.id] || []} onChange={(vals) => onFilterChange(col.id, vals)}/>) 
                             : (
                                <div className="relative group/filter">
                                    <input 
                                        className={`w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded outline-none transition-all focus:ring-1 font-normal ${col.id === 'taxon_name' ? 'pl-7 pr-8 border-leaf-300 ring-leaf-100 focus:border-leaf-500' : 'focus:border-leaf-300 focus:ring-leaf-200'} ${isTechnicalColumn(col.id) ? 'border-amber-200 focus:border-amber-400 focus:ring-amber-100' : ''}`} 
                                        placeholder={col.id === 'taxon_name' ? (preferences.search_mode === 'prefix' ? 'Starts with...' : 'Contains...') : (isTechnicalColumn(col.id) ? 'Exact (Enter)...' : 'Filter...')} 
                                        value={localTextFilters[col.id] || ''} 
                                        onChange={e => handleTextFilterChange(col.id, e.target.value)}
                                        onBlur={e => isTechnicalColumn(col.id) && handleTextFilterChange(col.id, e.target.value, true)}
                                        onKeyDown={e => e.key === 'Enter' && handleTextFilterChange(col.id, (e.target as HTMLInputElement).value, true)}
                                        title={isTechnicalColumn(col.id) ? "Technical equality column. Type full value and press Enter to search." : undefined}
                                    />
                                    {col.id === 'taxon_name' && (<SearchIcon size={12} className={`absolute left-2 top-2 ${preferences.search_mode === 'fuzzy' ? 'text-indigo-500' : 'text-leaf-500'}`} />)}
                                    {col.id === 'taxon_name' && (
                                        <button 
                                            onClick={toggleSearchMode}
                                            className={`absolute right-1 top-1 p-1 rounded transition-colors ${preferences.search_mode === 'fuzzy' ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 ring-1 ring-indigo-200' : 'text-slate-300 text-slate-500 hover:bg-slate-100'}`}
                                            title={preferences.search_mode === 'prefix' ? "Prefix Search (Starts with) - Click to switch to Fuzzy" : "Fuzzy Search (Contains) - Click to switch to Prefix"}
                                        >
                                            {preferences.search_mode === 'prefix' ? <ArrowRightToLine size={12} /> : <AlignCenter size={12} />}
                                        </button>
                                    )}
                                </div>
                             )
                          }
                      </th>
                  ))}
              </tr>
           </thead>
           <tbody key={tableVersionKey} className="divide-y divide-slate-100">
              {gridRows.map((row, idx) => {
                  const tr = row as TreeRow; const isExpanded = expandedRows.has(tr.id); 
                  let rankKey = String(tr.taxon_rank).toLowerCase() as keyof RankPallet;
                  const rankWeight = RANK_LEVELS[rankKey] || 99;
                  if (rankWeight === 8) rankKey = 'infraspecies';
                  else if (!['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'cultivar'].includes(rankKey)) { rankKey = 'species'; }
                  const p = activePallet[rankKey];
                  const color = p?.base_color || 'slate'; 
                  const isHybrid = tr.genus_hybrid === '×' || tr.genus_hybrid === 'x' || tr.species_hybrid === '×' || tr.species_hybrid === 'x';
                  const rowLevel = RANK_LEVELS[rankKey] || 99;
                  let debugClass = "";
                  if (preferences.debug_mode) {
                      if (tr.origin_type === 'ancestor') debugClass = "bg-blue-50/50 ring-1 ring-inset ring-blue-200";
                      else if (tr.origin_type === 'virtual') debugClass = "bg-amber-50/50 ring-1 ring-inset ring-amber-200";
                      else if (tr.origin_type === 'result') debugClass = "bg-green-50/50 ring-1 ring-inset ring-green-200";
                  }
                  const rowKey = `${tr.origin_type || 'row'}-${tr.tree_path || tr.id}-${idx}`;
                  const rowBg = isExpanded ? 'bg-blue-50/50' : `bg-${color}-${p?.cell_bg_weight || 50} ${isHybrid ? 'saturate-50' : ''}`;
                  return (
                     <React.Fragment key={rowKey}>
                        <tr className={`hover:bg-blue-50/50 transition-colors ${rowBg} ${tr.is_tree_header ? 'cursor-pointer group/header border-b-2 border-slate-200 font-medium' : ''} ${debugClass}`} onClick={tr.is_tree_header ? () => toggleGroup(tr.tree_path || '') : undefined}>
                           {activeColumns.map(col => {
                               const colLevel = COL_RANK_LEVELS[col.id];
                               const val = getRowValue(tr, col.id);
                               const depthIndent = (tr.depth || 0) * 20;
                               if (col.id === 'tree_control') return <td key={col.id} className={`p-2 relative ${tr.is_tree_header ? '' : 'border-slate-50'}`} style={{ paddingLeft: `${depthIndent}px` }}>
                                   <div className="flex justify-center w-full h-full min-h-[1.5rem]">
                                        {tr.is_tree_header && <span className={`transform transition-transform inline-block ${tr.tree_expanded ? 'rotate-90' : ''}`}><ChevronRightIcon size={14} /></span>}
                                   </div>
                               </td>;
                               if (col.id === 'descendant_count') return <td key={col.id} className="p-2 text-xs text-center text-slate-400 font-mono">{String(val ?? '')}</td>;
                               if (col.id === 'actions') return (
                                 <td key={col.id} className="p-2 border-r border-slate-200 text-center">
                                   <div className="flex items-center justify-center gap-1">
                                     <button onClick={(e) => { e.stopPropagation(); setExpandedRows(prev => { const n = new Set(prev); n.has(tr.id) ? n.delete(tr.id) : n.add(tr.id); return n; }); }} className={`p-1.5 rounded shadow-sm ${isExpanded ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}`}>
                                       {isExpanded ? <ChevronUpIcon size={14}/> : <ChevronDownIcon size={14}/>}
                                     </button>
                                     {(RANK_LEVELS[rankKey] >= 6 && RANK_LEVELS[rankKey] <= 8) && (
                                       <button onClick={(e) => { e.stopPropagation(); onAction?.('mine', tr); }} title="Analyze & Find References" className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100 shadow-sm">
                                         <PickaxeIcon size={14} />
                                       </button>
                                     )}
                                     <button onClick={(e) => { e.stopPropagation(); onAction?.('enrich', tr); }} title="Enrich Data Layer" className="p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-600 hover:bg-amber-100 shadow-sm">
                                       <Wand2Icon size={14} />
                                     </button>
                                   </div>
                                 </td>
                               );

                               let displayVal: React.ReactNode = '';
                               if (typeof val === 'string') { 
                                   displayVal = val; 
                                   if ((col.id === 'genus_hybrid' || col.id === 'species_hybrid') && (val === 'x' || val === 'X' || val === '×')) {
                                       displayVal = '×';
                                   }
                               } else if (typeof val === 'number') { 
                                   displayVal = val; 
                               } else if (typeof val === 'boolean') { 
                                   displayVal = val ? 'Yes' : 'No'; 
                               } else if (val && typeof val === 'object') {
                                   displayVal = JSON.stringify(val);
                               }

                               let isBold = false;
                               let placeholderStyle = "";
                               const isIndicatorCol = ['genus_hybrid', 'species_hybrid', 'infraspecific_rank'].includes(col.id);
                               if (colLevel && !isIndicatorCol) {
                                  if (colLevel === rowLevel) {
                                     isBold = true;
                                     if (val === '(none)') { placeholderStyle = `italic font-bold text-${color}-${p?.text_weight || 600}`; }
                                  } else if (colLevel < rowLevel) {
                                     if (val === '(none)' || !val) {
                                        displayVal = '(none)';
                                        placeholderStyle = "font-normal text-slate-400 opacity-80 italic";
                                     }
                                  }
                               }
                               if (col.id === 'taxon_rank') displayVal = <span className={`px-2 py-0.5 text-[10px] rounded border font-normal bg-${color}-${p?.badge_bg_weight || 100} text-${color}-${p?.text_weight || 600} border-${color}-${p?.badge_border_weight || 200} normal-case`}>{displayVal}</span>;
                               else if (col.id === 'taxon_name') {
                                 const content = tr.is_holder ? <span className="italic opacity-80 text-slate-400">(none)</span> : formatFullScientificName(tr, preferences);
                                 displayVal = (
                                    <div style={{ paddingLeft: `${depthIndent}px` }} className="flex items-center">
                                        {content}
                                    </div>
                                 );
                               }
                               else if (col.id === 'taxon_status') { 
                                 displayVal = <span className="text-[11px] text-slate-500 font-normal normal-case">{tr.is_virtual ? '' : (String(displayVal) || '-')}</span>; 
                               }
                               const baseTextClass = isBold ? `font-bold text-${color}-${p?.text_weight || 900}` : "font-normal text-slate-600";
                               const isSystemCol = ['tree_control', 'descendant_count'].includes(col.id);
                               return (
                                 <td key={col.id} className={`p-2 truncate overflow-hidden max-w-0 ${col.headerAlign === 'center' ? 'text-center' : ''} ${isSystemCol ? '' : 'border-r border-slate-50'}`} title={String(val || '')}>
                                   <span className={`${placeholderStyle || baseTextClass}`}>
                                     {displayVal}
                                   </span>
                                 </td>
                               );
                           })}
                        </tr>
                        {isExpanded && !tr.is_virtual && (<tr><td colSpan={activeColumns.length} className="bg-slate-50/50 p-0 border-b border-slate-200 shadow-inner"><div className="p-4 border-l-4 border-slate-500 bg-white m-2 rounded-r-lg shadow-sm"><DetailsPanel taxon={tr} onUpdate={(updates) => onUpdate?.(tr.id, updates)} /></div></td></tr>)}
                     </React.Fragment>
                  );
              })}
              {(!gridRows || gridRows.length === 0) && !isLoadingMore && (<tr><td colSpan={activeColumns.length} className="p-8 text-center text-slate-400 italic">No matching records.</td></tr>)}
           </tbody>
        </table>
      </div>
    </div>
  );
}