// DO NOT add any new files, classes, or namespaces.
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Taxon, UserPreferences, ColorTheme } from '../types';
import { formatFullScientificName } from '../utils/formatters';
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
  AlertCircle
} from 'lucide-react';

interface DataGridProps {
  taxa: Taxon[];
  onAction?: (action: 'mine' | 'enrich', taxon: Taxon) => void;
  onUpdate?: (id: string, updates: Partial<Taxon>) => void;
  preferences: UserPreferences;
  onPreferenceChange?: (newPrefs: UserPreferences) => void;
  totalRecords: number;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSortChange: (key: string, direction: 'asc' | 'desc') => void;
  filters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  error?: string | null;
}

const RANK_HIERARCHY: Record<string, number> = {
    'family': 1, 'genus': 2, 'species': 3, 'subspecies': 4, 'variety': 5, 'form': 6, 'group': 7, 'grex': 8, 'cultivar': 9,
};

const COLUMN_RANK_MAP: Record<string, number> = {
    'family': 1,
    'genus': 2,
    'genus_hybrid': 2,
    'species': 3,
    'species_hybrid': 3,
    'infraspecific_rank': 5,
    'infraspecies': 5,
    'cultivar': 9
};

type ThemeMap = Record<string, string>;
const THEMES: Record<ColorTheme, ThemeMap> = {
    'option1a': { 'family': 'red', 'genus': 'orange', 'species': 'amber', 'subspecies': 'green', 'variety': 'green', 'form': 'green', 'cultivar': 'sky', 'grex': 'sky' },
    'option1b': { 'family': 'red', 'genus': 'sky', 'species': 'green', 'subspecies': 'amber', 'variety': 'amber', 'form': 'amber', 'cultivar': 'orange', 'grex': 'orange' },
    'option2a': { 'family': 'red', 'genus': 'green', 'species': 'amber', 'subspecies': 'orange', 'variety': 'orange', 'form': 'orange', 'cultivar': 'sky', 'grex': 'sky' },
    'option2b': { 'family': 'red', 'genus': 'sky', 'species': 'orange', 'subspecies': 'amber', 'variety': 'amber', 'form': 'amber', 'cultivar': 'green', 'grex': 'green' }
};

const getTextClass = (color: string) => color === 'slate' ? 'text-slate-600' : `text-${color}-700`;

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
            {isOpen && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 max-h-48 overflow-y-auto min-w-[150px]"><div className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-50 normal-case" onClick={() => { onChange([]); setIsOpen(false); }}>Clear Filter</div>{options.map(opt => (<div key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-leaf-50 cursor-pointer" onClick={() => toggleOption(opt)}><div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(opt) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300 bg-white'}`}>{selected.includes(opt) && <CheckIcon size={10} className="text-white"/>}</div><span className="text-xs text-slate-700 whitespace-normal normal-case">{opt === 'NULL' || opt === 'null' ? <span className="italic opacity-60">None / Empty</span> : opt}</span></div>))}</div>)}
        </div>
    );
};

type TreeRow = Taxon & {
    is_tree_header?: boolean;
    tree_expanded?: boolean;
    depth?: number;
    tree_path?: string;
    is_virtual?: boolean; 
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

const COLUMN_GROUPS: ColumnGroup[] = [
    {
        id: 'system',
        label: 'System',
        columns: [
            { id: 'id', label: 'Internal ID', tooltip: 'Internal UUID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'parent_id', label: 'Parent ID', tooltip: 'Parent UUID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'tree_control', label: 'Tree', tooltip: 'Tree Control', defaultWidth: 55, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center', defaultOn: true },
            { id: 'descendant_count', label: '#', tooltip: 'Child Count', defaultWidth: 50, filterType: 'text', hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { id: 'actions', label: 'Actions', tooltip: 'Actions', defaultWidth: 90, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center', defaultOn: true },
        ]
    },
    {
        id: 'taxonomy',
        label: 'Taxonomy',
        columns: [
            { id: 'taxon_name', label: 'Plant Name', tooltip: 'Scientific Name', defaultWidth: 220, filterType: 'text', defaultOn: true },
            { 
                id: 'taxon_rank', 
                label: 'Rank', 
                tooltip: 'Taxonomic Rank', 
                defaultWidth: 110, 
                filterType: 'multi-select', 
                filterOptions: ['Family', 'Genus', 'Species', 'Subspecies', 'Variety', 'Subvariety', 'Form', 'Subform', 'Cultivar', 'Unranked'], 
                lockWidth: true, 
                defaultOn: false 
            },
            { 
                id: 'taxon_status', 
                label: 'Status', 
                tooltip: 'Taxonomic Status', 
                defaultWidth: 110, 
                filterType: 'multi-select', 
                filterOptions: ['Accepted', 'Synonym', 'Unplaced', 'Registered', 'Provisional', 'Artificial Hybrid'], 
                defaultOn: false 
            },
            { id: 'family', label: 'Family', tooltip: 'Family', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'hybrid_formula', label: 'Hybrid Formula', tooltip: 'Hybrid Formula', defaultWidth: 180, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'nomenclature',
        label: 'Nomenclature',
        columns: [
            { id: 'genus', label: 'Genus', tooltip: 'Genus Designation', defaultWidth: 120, filterType: 'text', defaultOn: true },
            { id: 'genus_hybrid', label: 'GH', tooltip: 'Genus Hybrid Indicator', defaultWidth: 40, filterType: 'multi-select', filterOptions: ['+', '×', 'NULL'], disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { id: 'species', label: 'Species', tooltip: 'Species Designation', defaultWidth: 120, filterType: 'text', defaultOn: true },
            { id: 'species_hybrid', label: 'SH', tooltip: 'Species Hybrid Indicator', defaultWidth: 40, filterType: 'multi-select', filterOptions: ['+', '×', 'NULL'], disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { 
                id: 'infraspecific_rank', 
                label: 'I Rank', 
                tooltip: 'Infraspecific Rank', 
                defaultWidth: 80, 
                filterType: 'multi-select', 
                filterOptions: ['NULL', 'subsp.', 'var.', 'subvar.', 'f.', 'subf.'],
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
        id: 'descriptive',
        label: 'Descriptive',
        columns: [
            { id: 'common_name', label: 'Common Name', tooltip: 'Common Name', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'description_text', label: 'Description', tooltip: 'Description', defaultWidth: 250, filterType: 'text', defaultOn: false },
            { id: 'geographic_area', label: 'Geography', tooltip: 'Geographic Area', defaultWidth: 180, filterType: 'text', defaultOn: false },
            { id: 'lifeform_description', label: 'Lifeform', tooltip: 'Lifeform Description', defaultWidth: 150, filterType: 'text', defaultOn: false },
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
        id: 'identifiers',
        label: 'Standard Identifiers',
        columns: [
            { id: 'wcvp_id', label: 'WCVP ID', tooltip: 'WCVP Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'ipni_id', label: 'IPNI ID', tooltip: 'IPNI ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'powo_id', label: 'POWO ID', tooltip: 'POWO ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'publication',
        label: 'Publication',
        columns: [
            { id: 'taxon_authors', label: 'Authorship', tooltip: 'Taxon Authors', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'primary_author', label: 'Prim. Author', tooltip: 'Primary Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'publication_author', label: 'Pub. Author', tooltip: 'Publication Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'place_of_publication', label: 'Pub. Place', tooltip: 'Place Of Publication', defaultWidth: 200, filterType: 'text', defaultOn: false },
            { id: 'volume_and_page', label: 'Vol/Page', tooltip: 'Volume And Page', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'first_published', label: 'First Published', tooltip: 'First Published Date', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'nomenclatural_remarks', label: 'Nom. Remarks', tooltip: 'Nomenclatural Remarks', defaultWidth: 200, filterType: 'text', defaultOn: false },
            { id: 'reviewed', label: 'Reviewed', tooltip: 'Reviewed Status', defaultWidth: 80, headerAlign: 'center', filterType: 'multi-select', filterOptions: ['N', 'Y', 'NULL'], lockWidth: true, defaultOn: false },
        ]
    },
    {
        id: 'related',
        label: 'Related Plants',
        columns: [
            { id: 'homotypic_synonym', label: 'Homotypic Syn.', tooltip: 'Homotypic Synonym Flag', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'accepted_plant_name_id', label: 'Accepted ID', tooltip: 'Accepted Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'parenthetical_author', label: 'Paren. Author', tooltip: 'Parenthetical Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'replaced_synonym_author', label: 'Syn. Author', tooltip: 'Replaced Synonym Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'parent_plant_name_id', label: 'Parent Plant ID', tooltip: 'Parent Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'basionym_plant_name_id', label: 'Basionym ID', tooltip: 'Basionym Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
        ]
    }
];

const ALL_COLUMNS = COLUMN_GROUPS.flatMap(g => g.columns);

const isTechnicalColumn = (colId: string) => colId === 'id' || colId.endsWith('_id') || colId === 'first_published';

const DataGrid: React.FC<DataGridProps> = ({ 
    taxa, onAction, onUpdate, preferences, onPreferenceChange,
    totalRecords, isLoadingMore, onLoadMore, 
    sortConfig, onSortChange,
    filters, onFilterChange,
    error
}) => {
  const loadState = <T,>(key: string, def: T): T => {
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
  };

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
      const saved = loadState<string[]>('grid_visible_cols_rev12', []);
      if (saved.length > 0) return new Set(saved);
      return new Set(ALL_COLUMNS.filter(c => c.defaultOn).map(c => c.id));
  });
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
      const saved = loadState<string[]>('grid_col_order_rev12', []);
      if (saved.length > 0) return saved;
      return ALL_COLUMNS.map(c => c.id);
  });
  
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => loadState('grid_col_widths_rev12', Object.fromEntries(ALL_COLUMNS.map(c => [c.id, c.defaultWidth]))));
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
          if (visibleColumns.has('family')) levels.push('family');
          levels.push('genus', 'species', 'infraspecies');
          setGroupBy(levels);
      } else {
          setGroupBy([]);
      }
  }, [isHierarchyMode, visibleColumns]);

  useEffect(() => localStorage.setItem('grid_visible_cols_rev12', JSON.stringify(Array.from(visibleColumns))), [visibleColumns]);
  useEffect(() => localStorage.setItem('grid_col_order_rev12', JSON.stringify(columnOrder)), [columnOrder]);
  useEffect(() => localStorage.setItem('grid_col_widths_rev12', JSON.stringify(colWidths)), [colWidths]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as Node;
          if (showLegend && legendRef.current && !legendRef.current.contains(target)) setShowLegend(false);
          if (showColPicker && colPickerRef.current && !colPickerRef.current.contains(target)) setShowColPicker(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLegend, showColPicker]);

  const activeColumns = useMemo(() => columnOrder.filter(id => visibleColumns.has(id)).map(id => ALL_COLUMNS.find(c => c.id === id)).filter((c): c is ColumnConfig => !!c), [columnOrder, visibleColumns]);
  const totalTableWidth = useMemo(() => activeColumns.reduce((sum, col) => sum + (colWidths[col.id] || col.defaultWidth), 0), [activeColumns, colWidths]);
  const activeColorMap = useMemo(() => THEMES[preferences.color_theme] || THEMES['option1a'], [preferences.color_theme]);

  const getRowValue = (row: Taxon, colId: string) => {
       const tr = row as TreeRow;
       if (colId === 'descendant_count') { return tr.is_tree_header ? (tr as any).child_count : (tr.descendant_count || 0); }
       
       const rank = (row.taxon_rank || '').toLowerCase();
       if (rank === 'family' && colId === 'genus') return '';
       
       return row[colId as keyof Taxon];
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

  const gridRows = useMemo((): TreeRow[] => {
      if (!taxa || taxa.length === 0) return [];
      if (groupBy.length === 0) return taxa as TreeRow[];
      
      const outputRows: TreeRow[] = [];

      // HELPER: Consistent bucket key normalization
      const bucketKey = (row: Taxon, depth: number) => {
          const field = groupBy[depth];
          const rawVal = getRowValue(row, field);
          if (rawVal === undefined || rawVal === null || rawVal === '') return 'unspecified';
          
          if (field === 'infraspecies') {
              const rank = row.infraspecific_rank || '';
              const epithet = row.infraspecies || '';
              return `${rank} ${epithet}`.trim().toLowerCase();
          }
          
          return String(rawVal).replace(/^[×x]\s?/i, '').trim().toLowerCase();
      };
      
      // HELPER: Find if a record exists that should serve as the header for this group
      const findHeaderTaxon = (candidates: Taxon[], field: string, value: string): Taxon | undefined => {
          if (value === 'unspecified') return undefined;
          
          return candidates.find(t => {
             const rank = (t.taxon_rank as string || '').toLowerCase();
             const trName = String(getRowValue(t, field)).replace(/^[×x]\s?/i, '').trim().toLowerCase();
             
             if (field === 'infraspecies') {
                 const combined = `${t.infraspecific_rank || ''} ${t.infraspecies || ''}`.trim().toLowerCase();
                 return combined === value && ['variety', 'subspecies', 'form'].includes(rank);
             }
             
             if (field === 'family' && rank === 'family') return trName === value;
             if (field === 'genus' && rank === 'genus') return trName === value;
             if (field === 'species' && rank === 'species') return trName === value;
             
             return trName === value && rank === field;
          });
      };

      const processLevel = (subset: Taxon[], depth: number, parentPath: string) => {
          if (!subset) return;
          if (depth >= groupBy.length) {
              subset.forEach(t => outputRows.push({ ...t, depth, tree_path: `${parentPath}/${t.id}` }));
              return;
          }

          const field = groupBy[depth];
          const groups: Record<string, Taxon[]> = {};
          
          subset.forEach(row => { 
              const val = bucketKey(row, depth); 
              if (!groups[val]) groups[val] = []; 
              groups[val].push(row); 
          });

          Object.keys(groups).sort().forEach(key => {
              const groupItems = groups[key];
              const path = `${parentPath}/${key}`;
              
              if (key === 'unspecified') { 
                  processLevel(groupItems, depth + 1, parentPath); 
                  return; 
              }

              const headerTaxon = findHeaderTaxon(groupItems, field, key);
              const itemsWithoutHeader = headerTaxon ? groupItems.filter(i => i.id !== headerTaxon.id) : groupItems;
              const firstChild = groupItems[0];

              const headerRow: TreeRow = headerTaxon ? { ...headerTaxon } : {
                  id: `virtual-${path}`,
                  is_virtual: true,
                  taxon_rank: field === 'infraspecies' ? (firstChild?.taxon_rank || 'Infraspecies') : (field.charAt(0).toUpperCase() + field.slice(1)) as any, 
                  taxon_name: key.charAt(0).toUpperCase() + key.slice(1), 
                  taxon_status: 'Accepted',
                  family: firstChild?.family,
                  genus: firstChild?.genus,
                  genus_hybrid: firstChild?.genus_hybrid,
                  species: firstChild?.species,
                  species_hybrid: firstChild?.species_hybrid,
                  infraspecific_rank: firstChild?.infraspecific_rank,
                  infraspecies: firstChild?.infraspecies,
                  alternative_names: [], reference_links: [], created_at: 0
              } as any;

              headerRow.is_tree_header = true;
              headerRow.tree_expanded = !collapsedGroups.has(path);
              (headerRow as any).child_count = headerTaxon ? (headerTaxon.descendant_count || 0) : groupItems.length;
              headerRow.depth = depth;
              headerRow.tree_path = path;
              
              outputRows.push(headerRow);
              if (headerRow.tree_expanded) processLevel(itemsWithoutHeader, depth + 1, path);
          });
      };

      processLevel(taxa, 0, 'root');
      return outputRows;
  }, [taxa, groupBy, collapsedGroups]);

  const toggleGroup = (path: string) => {
      const next = new Set(collapsedGroups);
      if (next.has(path)) next.delete(path); else next.add(path);
      setCollapsedGroups(next);
  };
  
  const expandTreeLevel = (targetDepth: number) => {
      if (!taxa) return;
      const newCollapsed = new Set<string>();
      const allPathsWithDepths: {path: string, depth: number}[] = [];
      const walk = (subset: Taxon[], depth: number, parentPath: string) => {
          if (depth >= groupBy.length) return;
          const field = groupBy[depth];
          const groups: Record<string, Taxon[]> = {};
          subset.forEach(row => {
              const val = String(getRowValue(row, field) || '').replace(/^[×x]\s?/i, '').trim().toLowerCase();
              if (val === '' || val === 'undefined' || val === 'null') return;
              if (!groups[val]) groups[val] = [];
              groups[val].push(row);
          });
          Object.keys(groups).forEach(key => {
              const path = `${parentPath}/${key}`;
              allPathsWithDepths.push({ path, depth });
              if (depth < groupBy.length) walk(groups[key], depth + 1, path);
          });
      };
      walk(taxa, 0, 'root');
      allPathsWithDepths.forEach(item => { if (item.depth >= targetDepth) newCollapsed.add(item.path); });
      setCollapsedGroups(newCollapsed);
  };

  const handleResizeStart = (e: React.MouseEvent, colId: string) => { e.preventDefault(); e.stopPropagation(); resizingRef.current = { colId, startX: e.clientX, startWidth: colWidths[colId] || 100 }; document.addEventListener('mousemove', handleResizeMove); document.addEventListener('mouseup', handleResizeEnd); document.body.style.cursor = 'col-resize'; };
  const handleResizeMove = useCallback((e: MouseEvent) => { if (!resizingRef.current) return; const { colId, startWidth } = resizingRef.current; const diff = e.clientX - resizingRef.current.startX; setColWidths(prev => ({ ...prev, [colId]: Math.max(30, startWidth + diff) })); }, []);
  const handleResizeEnd = useCallback(() => { resizingRef.current = null; document.removeEventListener('mousemove', handleResizeMove); document.removeEventListener('mouseup', handleResizeEnd); document.body.style.cursor = ''; }, [handleResizeMove]);
  
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

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center z-20 relative flex-shrink-0">
         <div className="text-xs text-slate-500 font-medium px-2 flex items-center gap-4 flex-1">
             <span>{taxa?.length.toLocaleString() || '0'} of {totalRecords >= 0 ? totalRecords.toLocaleString() : 'many'} records loaded</span>
             {isLoadingMore && <span className="flex items-center gap-1 text-leaf-600"><Loader2Icon size={12} className="animate-spin"/> Loading...</span>}
             {error && (<div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 animate-in fade-in duration-300 max-w-[300px] truncate" title={error}><AlertCircle size={14} className="flex-shrink-0" /><span className="font-bold truncate">{error}</span></div>)}
             {isHierarchyMode && (
                 <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 ml-2 shadow-sm">
                     {groupBy.map((level, idx) => (<button key={level} onClick={() => expandTreeLevel(idx)} className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded" title={`Collapse all at Level ${idx + 1}`}>{idx + 1}</button>))}
                     <div className="w-px h-3 bg-slate-200 mx-1"></div>
                     <button onClick={toggleAllGroups} className="px-2 py-0.5 text-[10px] font-bold text-leaf-600 hover:bg-leaf-50 rounded">{isAnyGroupCollapsed ? 'Expand All' : 'Collapse All'}</button>
                 </div>
             )}
         </div>
         <div className="flex items-center gap-2">
             <button onClick={() => setShowLegend(!showLegend)} className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm ${showLegend ? 'bg-slate-100 text-leaf-600' : 'bg-white text-slate-600'}`}><InfoIcon size={14} /> Legend</button>
             <button onClick={fitToScreen} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><MonitorIcon size={14} /> Fit Screen</button>
             <button onClick={autoFitContent} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><MaximizeIcon size={14} /> Auto Fit</button>
             <div className="relative" ref={colPickerRef}>
                 <button onClick={() => setShowColPicker(!showColPicker)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><SettingsIcon size={14} /> Columns</button>
                 {showColPicker && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 p-3 max-h-[70vh] overflow-y-auto origin-top-right animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-4 px-1"><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configure Grid</div><div className="flex gap-2"><button onClick={() => setVisibleColumns(new Set())} className="text-[10px] text-blue-600 hover:underline">Hide All</button><button onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.map(c=>c.id)))} className="text-[10px] text-blue-600 hover:underline">Show All</button></div></div>
                        <div className="space-y-4">
                            {COLUMN_GROUPS.map(group => (
                                <div key={group.id} className="space-y-1">
                                    <div className="flex items-center justify-between group/grp px-1 mb-1">
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleColumnGroup(group.id)}>
                                            <div className={`text-leaf-600`}>{group.columns.every(c => visibleColumns.has(c.id)) ? <CheckSquareIcon size={14} /> : group.columns.some(c => visibleColumns.has(c.id)) ? <SquareIcon size={14} className="opacity-50" /> : <SquareIcon size={14} className="text-slate-300" />}</div>
                                            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide">{group.label}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-0.5 ml-5">
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
                      <th key={col.id} className="border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50 select-none relative group" style={{ width: colWidths[col.id], minWidth: 30 }} draggable={!col.disableDrag} onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} title={col.tooltip}>
                         <div className={`flex items-center gap-1 p-2 h-full w-full ${col.headerAlign === 'center' ? 'justify-center' : 'justify-between'}`}>
                             {col.id === 'tree_control' ? (
                                <button onClick={(e) => { e.stopPropagation(); setIsHierarchyMode(!isHierarchyMode); }} className={`p-1 rounded hover:bg-slate-200 transition-colors ${isHierarchyMode ? 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200 shadow-inner' : 'text-slate-400'}`} title={isHierarchyMode ? "Flat View" : "Tree View"}>{isHierarchyMode ? <NetworkIcon size={16} /> : <ListIcon size={16} />}</button>
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
                      <th key={`${col.id}-filter`} className="p-1 border-b border-slate-200 border-r border-slate-100 bg-slate-50/80">
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
           <tbody className="divide-y divide-slate-100">
              {gridRows.map(row => {
                  const tr = row as TreeRow; const isExpanded = expandedRows.has(tr.id); const rankKey = String(tr.taxon_rank).toLowerCase(); const baseColor = activeColorMap[rankKey] || 'slate'; const isHybrid = tr.genus_hybrid === '×' || tr.genus_hybrid === 'x' || tr.species_hybrid === '×' || tr.species_hybrid === 'x';
                  return (
                     <React.Fragment key={tr.id}>
                        <tr className={`hover:bg-blue-50/50 transition-colors ${isExpanded ? 'bg-blue-50/50' : (baseColor === 'slate' ? (isHybrid ? 'bg-slate-50 saturate-50' : '') : `bg-${baseColor}-50 ${isHybrid ? 'saturate-50' : ''}`)} ${tr.is_tree_header ? 'cursor-pointer group/header border-b-2 border-slate-200' : ''}`} onClick={tr.is_tree_header ? () => toggleGroup(tr.tree_path || '') : undefined}>
                           {activeColumns.map(col => {
                               if (col.id === 'tree_control') return <td key={col.id} className={`p-2 border-r border-slate-200 ${tr.is_tree_header ? '' : 'border-slate-50'}`} style={{ paddingLeft: `${(tr.depth || 0) * 20}px` }}>{tr.is_tree_header && <span className={`transform transition-transform inline-block ${tr.tree_expanded ? 'rotate-90' : ''}`}><ChevronRightIcon size={14} /></span>}</td>;
                               if (col.id === 'descendant_count') return <td key={col.id} className="p-2 border-r border-slate-200 text-xs text-center text-slate-400 font-mono">{tr.is_tree_header ? (tr as any).child_count : (tr.descendant_count || '')}</td>;
                               const val = getRowValue(tr, col.id); 
                               let displayVal: React.ReactNode = '';
                               if (typeof val === 'string' || typeof val === 'number') { displayVal = val; } else if (typeof val === 'boolean') { displayVal = val ? 'Yes' : 'No'; }
                               if ((col.id === 'genus_hybrid' || col.id === 'species_hybrid') && (val === 'x' || val === 'X' || val === '×')) displayVal = '×';
                               let isBold = false; const r = rankKey; const coreCols = ['genus', 'species', 'cultivar', 'infraspecies', 'infraspecific_rank', 'taxon_name', 'genus_hybrid', 'species_hybrid'];
                               if (coreCols.includes(col.id)) { if (r === col.id) isBold = true; if ((col.id === 'infraspecies' || col.id === 'infraspecific_rank') && ['variety','subspecies','form'].includes(r)) isBold = true; if (col.id === 'taxon_name') isBold = true; if (col.id === 'genus_hybrid' && r === 'genus') isBold = true; if (col.id === 'species_hybrid' && r === 'species') isBold = true; }
                               let isDimmed = false; let rowRankLevel = RANK_HIERARCHY[r] || 99; if (['subspecies', 'variety', 'form'].includes(r)) rowRankLevel = 5;
                               if (COLUMN_RANK_MAP[col.id] && COLUMN_RANK_MAP[col.id] < rowRankLevel) isDimmed = true;
                               if (col.id === 'taxon_rank') displayVal = <span className={`px-2 py-0.5 text-[10px] rounded border font-bold bg-${baseColor}-100 ${getTextClass(baseColor)} border-${baseColor}-200 normal-case`}>{displayVal}</span>;
                               else if (col.id === 'taxon_name') displayVal = formatFullScientificName(tr, preferences);
                               else if (col.id === 'taxon_status') { let b = 'bg-slate-100 text-slate-500'; if (val === 'Accepted' || val === 'Registered' || val === 'Artificial Hybrid') b = 'bg-green-50 text-green-700 border-green-200 border'; displayVal = <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${b} normal-case`}>{displayVal || '-'}</span>; }
                               else if (col.id === 'actions') displayVal = <div className="flex items-center justify-center gap-1"><button onClick={(e) => { e.stopPropagation(); setExpandedRows(prev => { const n = new Set(prev); n.has(tr.id) ? n.delete(tr.id) : n.add(tr.id); return n; }); }} className={`p-1.5 rounded shadow-sm ${isExpanded ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}`}>{isExpanded ? <ChevronUpIcon size={14}/> : <ChevronDownIcon size={14}/>}</button>{['genus', 'species', 'subspecies', 'variety', 'form'].includes(r) && <button onClick={(e) => { e.stopPropagation(); onAction?.('enrich', tr); }} title="Analyze & Find Details" className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100 shadow-sm"><PickaxeIcon size={14} /></button>}<button onClick={(e) => { e.stopPropagation(); onAction?.('enrich', tr); }} title="Enrich Data Layer" className="p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-600 hover:bg-amber-100 shadow-sm"><Wand2Icon size={14} /></button></div>;
                               return <td key={col.id} className={`p-2 border-r border-slate-50 truncate overflow-hidden max-w-0 ${col.headerAlign === 'center' ? 'text-center' : ''}`} title={String(val || '')}><span className={`${isBold ? "font-bold" : ""} ${isDimmed ? "font-normal" : ""} ${isBold ? (baseColor === 'slate' ? "text-slate-900" : `text-${baseColor}-900`) : (isDimmed ? "text-slate-400" : "")}`}>{displayVal}</span></td>;
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
      {showLegend && (
          <div ref={legendRef} className="absolute bottom-4 right-4 w-72 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex justify-between items-center mb-3"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rank Color Guide</div><button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button></div>
              <div className="space-y-2">
                  {Object.entries(activeColorMap).map(([rank, color]) => (
                      <div key={rank} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full bg-${color}-500 shadow-sm`}></div><span className="text-xs font-bold text-slate-600 capitalize">{rank}</span></div>
                  ))}
                  <div className="mt-4 pt-3 border-t border-slate-100"><div className="flex items-center gap-2 opacity-50"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-[10px] font-bold text-slate-500 italic">Serif font indicates Virtual/Aggregate Row</span></div></div>
              </div>
          </div>
      )}
    </div>
  );
};
export default DataGrid;
// Placeholder for missing icons
const X = ({ size, className }: { size: number, className?: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18M6 6l12 12"/></svg>;