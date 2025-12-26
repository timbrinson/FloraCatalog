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
  CheckSquare as CheckSquareIcon 
} from 'lucide-react';

interface DataGridProps {
  taxa: Taxon[];
  onAction?: (action: 'mine' | 'enrich', taxon: Taxon) => void;
  onUpdate?: (id: string, updates: Partial<Taxon>) => void;
  preferences: UserPreferences;
  totalRecords: number;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSortChange: (key: string, direction: 'asc' | 'desc') => void;
  filters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
}

const RANK_HIERARCHY: Record<string, number> = {
    'family': 1, 'genus': 2, 'species': 3, 'subspecies': 4, 'variety': 5, 'form': 6, 'grex': 8, 'cultivar': 9,
};

const COLUMN_RANK_MAP: Record<string, number> = {
    'family': 1,
    'genus': 2,
    'genusHybrid': 2,
    'species': 3,
    'speciesHybrid': 3,
    'infraspecificRank': 5,
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
    isTreeHeader?: boolean;
    treeExpanded?: boolean;
    childCount?: number;
    depth?: number;
    treePath?: string;
    isVirtual?: boolean; 
};

const getDescendantCount = (taxon: Taxon): number => taxon.descendantCount || 0;

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
            { id: 'parentId', label: 'Parent ID', tooltip: 'Parent UUID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'treeControl', label: 'Tree', tooltip: 'Tree Control', defaultWidth: 55, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center', defaultOn: true },
            { id: 'childCount', label: '#', tooltip: 'Child Count', defaultWidth: 50, filterType: 'text', hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { id: 'actions', label: 'Actions', tooltip: 'Actions', defaultWidth: 90, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center', defaultOn: false },
        ]
    },
    {
        id: 'taxonomy',
        label: 'Taxonomy',
        columns: [
            { id: 'taxonName', label: 'Plant Name', tooltip: 'Scientific Name', defaultWidth: 220, filterType: 'text', defaultOn: true },
            { 
                id: 'taxonRank', 
                label: 'Rank', 
                tooltip: 'Taxonomic Rank', 
                defaultWidth: 110, 
                filterType: 'multi-select', 
                filterOptions: ['Family', 'Genus', 'Species', 'Subspecies', 'Variety', 'Subvariety', 'Form', 'Subform', 'Cultivar', 'Unranked', 'agamosp.', 'Convariety', 'ecas.', 'grex', 'lusus', 'microf.', 'microgène', 'micromorphe', 'modif.', 'monstr.', 'mut.', 'nid', 'nothof.', 'nothosubsp.', 'nothovar.', 'positio', 'proles', 'provar.', 'psp.', 'stirps', 'subap.', 'sublusus', 'subproles', 'subspecioid', 'subsubsp.'], 
                lockWidth: true, 
                defaultOn: false 
            },
            { 
                id: 'taxonStatus', 
                label: 'Status', 
                tooltip: 'Taxonomic Status', 
                defaultWidth: 110, 
                filterType: 'multi-select', 
                filterOptions: ['Accepted', 'Synonym', 'Unplaced', 'Artificial Hybrid', 'Illegitimate', 'Invalid', 'Local Biotype', 'Misapplied', 'Orthographic', 'Provisionally Accepted', 'External to WCVP'], 
                defaultOn: false 
            },
            { id: 'family', label: 'Family', tooltip: 'Family Name', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'hybridFormula', label: 'Hybrid Formula', tooltip: 'Parents of hybrid', defaultWidth: 180, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'nomenclature',
        label: 'Nomenclature',
        columns: [
            { id: 'genus', label: 'Genus', tooltip: 'Genus Designation', defaultWidth: 120, filterType: 'text', defaultOn: true },
            { id: 'genusHybrid', label: 'GH', tooltip: 'Genus Hybrid Indicator (+, ×)', defaultWidth: 40, filterType: 'multi-select', filterOptions: ['+', '×', 'NULL'], disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { id: 'species', label: 'Species', tooltip: 'Species Designation', defaultWidth: 120, filterType: 'text', defaultOn: true },
            { id: 'speciesHybrid', label: 'SH', tooltip: 'Species Hybrid Indicator (+, ×)', defaultWidth: 40, filterType: 'multi-select', filterOptions: ['+', '×', 'NULL'], disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true, defaultOn: true },
            { 
                id: 'infraspecificRank', 
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
        id: 'descriptive',
        label: 'Descriptive',
        columns: [
            { id: 'commonName', label: 'Common Name', tooltip: 'Common Name', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'description', label: 'Description', tooltip: 'Description', defaultWidth: 250, filterType: 'text', defaultOn: false },
            { id: 'geographicArea', label: 'Geography', tooltip: 'Geographic Area', defaultWidth: 180, filterType: 'text', defaultOn: false },
            { 
                id: 'lifeformDescription', 
                label: 'Lifeform', 
                tooltip: 'Raunkiær Lifeform Description', 
                defaultWidth: 150, 
                filterType: 'text', 
                defaultOn: false 
            },
            { 
                id: 'climateDescription', 
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
            { id: 'wcvpId', label: 'WCVP ID', tooltip: 'WCVP Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'ipniId', label: 'IPNI ID', tooltip: 'IPNI ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'powoId', label: 'POWO ID', tooltip: 'POWO ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
        ]
    },
    {
        id: 'publication',
        label: 'Publication',
        columns: [
            { id: 'taxonAuthors', label: 'Authorship', tooltip: 'Taxon Authors', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'primaryAuthor', label: 'Prim. Author', tooltip: 'Primary Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'publicationAuthor', label: 'Pub. Author', tooltip: 'Publication Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'placeOfPublication', label: 'Pub. Place', tooltip: 'Place Of Publication', defaultWidth: 200, filterType: 'text', defaultOn: false },
            { id: 'volumeAndPage', label: 'Vol/Page', tooltip: 'Volume And Page', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'firstPublished', label: 'First Published', tooltip: 'First Published Date', defaultWidth: 120, filterType: 'text', defaultOn: false },
            { id: 'nomenclaturalRemarks', label: 'Nom. Remarks', tooltip: 'Nomenclatural Remarks', defaultWidth: 200, filterType: 'text', defaultOn: false },
            { id: 'reviewed', label: 'Reviewed', tooltip: 'Reviewed Status', defaultWidth: 80, filterType: 'multi-select', filterOptions: ['N', 'Y', 'NULL'], lockWidth: true, headerAlign: 'center', defaultOn: false },
        ]
    },
    {
        id: 'related',
        label: 'Related Plants',
        columns: [
            { id: 'homotypicSynonym', label: 'Homotypic Syn.', tooltip: 'Homotypic Synonym Flag', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'acceptedPlantNameId', label: 'Accepted ID', tooltip: 'Accepted Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'parentheticalAuthor', label: 'Paren. Author', tooltip: 'Parenthetical Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'replacedSynonymAuthor', label: 'Syn. Author', tooltip: 'Replaced Synonym Author', defaultWidth: 150, filterType: 'text', defaultOn: false },
            { id: 'parentPlantNameId', label: 'Parent Plant ID', tooltip: 'Parent Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
            { id: 'basionymPlantNameId', label: 'Basionym ID', tooltip: 'Basionym Plant Name ID', defaultWidth: 100, filterType: 'text', defaultOn: false },
        ]
    }
];

const ALL_COLUMNS = COLUMN_GROUPS.flatMap(g => g.columns);

const DataGrid: React.FC<DataGridProps> = ({ 
    taxa, onAction, onUpdate, preferences, 
    totalRecords, isLoadingMore, onLoadMore, 
    sortConfig, onSortChange,
    filters, onFilterChange
}) => {
  const loadState = <T,>(key: string, def: T): T => {
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
  };

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
      const saved = loadState<string[]>('grid_visible_cols_rev11', []);
      if (saved.length > 0) return new Set(saved);
      return new Set(ALL_COLUMNS.filter(c => c.defaultOn).map(c => c.id));
  });
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => loadState('grid_col_order_rev11', ALL_COLUMNS.map(c => c.id)));
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => loadState('grid_col_widths_rev11', Object.fromEntries(ALL_COLUMNS.map(c => [c.id, c.defaultWidth]))));
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

  useEffect(() => localStorage.setItem('grid_visible_cols_rev11', JSON.stringify(Array.from(visibleColumns))), [visibleColumns]);
  useEffect(() => localStorage.setItem('grid_col_order_rev11', JSON.stringify(columnOrder)), [columnOrder]);
  useEffect(() => localStorage.setItem('grid_col_widths_rev11', JSON.stringify(colWidths)), [colWidths]);

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
  const activeColorMap = useMemo(() => THEMES[preferences.colorTheme] || THEMES['option1a'], [preferences.colorTheme]);

  const getRowValue = (row: Taxon, colId: string) => {
       if (colId === 'childCount') { const tr = row as TreeRow; return tr.isTreeHeader ? tr.childCount : getDescendantCount(tr); }
       if (colId === 'cultivar' && row.taxonRank === 'Cultivar') return row.name;
       // @ts-ignore
       return row[colId];
  };

  const handleTextFilterChange = (key: string, val: string) => {
      setLocalTextFilters(prev => ({ ...prev, [key]: val }));
      if ((window as any).filterTimeout) clearTimeout((window as any).filterTimeout);
      (window as any).filterTimeout = setTimeout(() => onFilterChange(key, val), 600);
  };

  const gridRows = useMemo((): TreeRow[] => {
      if (groupBy.length === 0) return taxa as TreeRow[];
      const outputRows: TreeRow[] = [];
      const bucketKey = (row: Taxon, depth: number) => String(getRowValue(row, groupBy[depth]) || '');
      const findHeaderTaxon = (candidates: Taxon[], field: string, value: string): Taxon | undefined => {
          return candidates.find(t => {
             const valMatches = String(getRowValue(t, field)) === value;
             if (!valMatches) return false;
             const rank = (t.taxonRank as string || '').toLowerCase();
             if (field === 'family') return rank === 'family';
             if (field === 'genus') return rank === 'genus';
             if (field === 'species') return rank === 'species';
             if (field === 'infraspecies') return ['variety', 'subspecies', 'form'].includes(rank);
             return rank === field.toLowerCase();
          });
      };
      const processLevel = (subset: Taxon[], depth: number, parentPath: string) => {
          if (depth >= groupBy.length) {
              subset.forEach(t => outputRows.push({ ...t, depth, treePath: `${parentPath}/${t.id}` }));
              return;
          }
          const field = groupBy[depth];
          const groups: Record<string, Taxon[]> = {};
          subset.forEach(row => { const val = bucketKey(row, depth); if (!groups[val]) groups[val] = []; groups[val].push(row); });
          Object.keys(groups).sort().forEach(key => {
              const groupItems = groups[key];
              const path = `${parentPath}/${key}`;
              if (key === '' || key === 'undefined' || key === 'null') { processLevel(groupItems, depth + 1, parentPath); return; }
              const headerTaxon = findHeaderTaxon(groupItems, field, key);
              const itemsWithoutHeader = headerTaxon ? groupItems.filter(i => i.id !== headerTaxon.id) : groupItems;
              const firstChild = groupItems[0];
              const headerRow: TreeRow = headerTaxon ? { ...headerTaxon } : {
                  id: `virtual-${path}`,
                  isVirtual: true,
                  taxonRank: field as any, 
                  name: key,
                  taxonName: key, 
                  taxonStatus: 'Accepted',
                  family: firstChild?.family,
                  genus: firstChild?.genus,
                  genusHybrid: firstChild?.genusHybrid,
                  species: firstChild?.species,
                  speciesHybrid: firstChild?.speciesHybrid,
                  synonyms: [], referenceLinks: [], createdAt: 0
              } as any;
              headerRow.isTreeHeader = true;
              headerRow.treeExpanded = !collapsedGroups.has(path);
              headerRow.childCount = headerTaxon ? headerTaxon.descendantCount : groupItems.length;
              headerRow.depth = depth;
              headerRow.treePath = path;
              outputRows.push(headerRow);
              if (headerRow.treeExpanded) processLevel(itemsWithoutHeader, depth + 1, path);
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
      const newCollapsed = new Set<string>();
      const allPathsWithDepths: {path: string, depth: number}[] = [];
      const walk = (subset: Taxon[], depth: number, parentPath: string) => {
          if (depth >= groupBy.length) return;
          const field = groupBy[depth];
          const groups: Record<string, Taxon[]> = {};
          subset.forEach(row => {
              const val = String(getRowValue(row, field) || '');
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

  const toggleColumnGroup = (groupId: string) => {
      const group = COLUMN_GROUPS.find(g => g.id === groupId);
      if (!group) return;
      const groupColIds = group.columns.map(c => c.id);
      const isCurrentlySelected = groupColIds.every(id => visibleColumns.has(id));
      const next = new Set(visibleColumns);
      if (isCurrentlySelected) groupColIds.forEach(id => next.delete(id));
      else groupColIds.forEach(id => next.add(id));
      setVisibleColumns(next);
  };

  const handleResizeStart = (e: React.MouseEvent, colId: string) => { e.preventDefault(); e.stopPropagation(); resizingRef.current = { colId, startX: e.clientX, startWidth: colWidths[colId] || 100 }; document.addEventListener('mousemove', handleResizeMove); document.addEventListener('mouseup', handleResizeEnd); document.body.style.cursor = 'col-resize'; };
  const handleResizeMove = useCallback((e: MouseEvent) => { if (!resizingRef.current) return; const { colId, startX, startWidth } = resizingRef.current; const diff = e.clientX - startX; setColWidths(prev => ({ ...prev, [colId]: Math.max(30, startWidth + diff) })); }, []);
  const handleResizeEnd = useCallback(() => { resizingRef.current = null; document.removeEventListener('mousemove', handleResizeMove); document.removeEventListener('mouseup', handleResizeEnd); document.body.style.cursor = ''; }, [handleResizeMove]);
  
  const getIdealWidths = () => {
      const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (!context) return {}; context.font = '14px Inter, sans-serif';
      const idealWidths: Record<string, number> = {};
      activeColumns.forEach(col => {
          let maxWidth = context.measureText(col.label).width + 32;
          taxa.slice(0, 50).forEach(row => { const val = String(getRowValue(row, col.id) || ''); maxWidth = Math.max(maxWidth, context.measureText(val).width + 20); });
          idealWidths[col.id] = Math.ceil(maxWidth);
      });
      return idealWidths;
  };

  const autoFitContent = () => {
      const ideals = getIdealWidths();
      const limit = preferences.autoFitMaxWidth || 400;
      const updates: Record<string, number> = {};
      Object.keys(ideals).forEach(k => {
          const colDef = ALL_COLUMNS.find(c => c.id === k);
          if (colDef?.lockWidth) return;
          updates[k] = k === 'taxonName' ? Math.max(ideals[k], 180) : Math.min(ideals[k], limit);
      });
      setColWidths(prev => ({...prev, ...updates}));
  };

  const fitToScreen = () => {
      if (!containerRef.current) return;
      const ideals = getIdealWidths();
      const availableWidth = containerRef.current.clientWidth - 2;
      const lockedCols = activeColumns.filter(c => c.lockWidth);
      const flexCols = activeColumns.filter(c => !c.lockWidth);
      let lockedWidth = 0; lockedCols.forEach(col => lockedWidth += (colWidths[col.id] || col.defaultWidth));
      const flexAvailable = Math.max(0, availableWidth - lockedWidth);
      if (flexCols.length === 0) return;
      let totalCappedWidth = 0; const cappedIdeals: Record<string, number> = {};
      flexCols.forEach(col => { let w = ideals[col.id]; if (col.id === 'taxonName') w = Math.max(w, 200); cappedIdeals[col.id] = w; totalCappedWidth += w; });
      const scale = flexAvailable / totalCappedWidth;
      const newWidths: Record<string, number> = {};
      flexCols.forEach(col => newWidths[col.id] = Math.floor(cappedIdeals[col.id] * scale));
      setColWidths(prev => ({...prev, ...newWidths}));
  };

  const handleSort = (key: string) => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'; onSortChange(key, direction); };
  const toggleColumn = (id: string) => { const next = new Set(visibleColumns); if (next.has(id)) next.delete(id); else next.add(id); setVisibleColumns(next); };
  const handleDragStart = (e: React.DragEvent, id: string) => { if (ALL_COLUMNS.find(c=>c.id===id)?.disableDrag) return; setDraggedColumn(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, targetId: string) => { e.preventDefault(); if (!draggedColumn || draggedColumn === targetId) return; const newOrder = [...columnOrder]; const sIdx = newOrder.indexOf(draggedColumn); const tIdx = newOrder.indexOf(targetId); newOrder.splice(sIdx, 1); newOrder.splice(tIdx, 0, draggedColumn); setColumnOrder(newOrder); setDraggedColumn(null); };

  const isAnyGroupCollapsed = collapsedGroups.size > 0;
  const toggleAllGroups = () => { if (isAnyGroupCollapsed) setCollapsedGroups(new Set()); else expandTreeLevel(0); };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center z-20 relative flex-shrink-0">
         <div className="text-xs text-slate-500 font-medium px-2 flex items-center gap-4">
             <span>{taxa.length.toLocaleString()} of {totalRecords >= 0 ? totalRecords.toLocaleString() : 'many'} records loaded</span>
             {isLoadingMore && <span className="flex items-center gap-1 text-leaf-600"><Loader2Icon size={12} className="animate-spin"/> Loading...</span>}
             {isHierarchyMode && (
                 <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 ml-2 shadow-sm">
                     {groupBy.map((level, idx) => (
                        <button key={level} onClick={() => expandTreeLevel(idx)} className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded" title={`Collapse all at Level ${idx + 1}: ${level.charAt(0).toUpperCase() + level.slice(1)}`}>{idx + 1}</button>
                     ))}
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
                        <div className="flex justify-between items-center mb-4 px-1"><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configure Grid</div><button onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.map(c=>c.id)))} className="text-[10px] text-blue-600 hover:underline">Show All</button></div>
                        <div className="space-y-4">
                            {COLUMN_GROUPS.map(group => {
                                const allInGroupVisible = group.columns.every(c => visibleColumns.has(c.id));
                                const someInGroupVisible = group.columns.some(c => visibleColumns.has(c.id)) && !allInGroupVisible;
                                return (
                                    <div key={group.id} className="space-y-1">
                                        <div className="flex items-center justify-between group/grp px-1 mb-1">
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleColumnGroup(group.id)}>
                                                <div className={`text-leaf-600`}>{allInGroupVisible ? <CheckSquareIcon size={14} /> : someInGroupVisible ? <SquareIcon size={14} className="opacity-50" /> : <SquareIcon size={14} className="text-slate-300" />}</div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide">{group.label}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-0.5 ml-5">
                                            {group.columns.map(col => (
                                                <div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 cursor-pointer rounded transition-colors group/col" title={col.tooltip}>
                                                    <div className={`w-3 h-3 rounded flex items-center justify-center border flex-shrink-0 ${visibleColumns.has(col.id) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300'}`}>{visibleColumns.has(col.id) && <CheckIcon size={10} className="text-white"/>}</div>
                                                    <span className="text-xs text-slate-600 group-hover/col:text-slate-900 truncate">{col.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
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
                             {col.id === 'treeControl' ? (
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
                          {col.id === 'actions' || col.id === 'treeControl' ? null 
                           : col.filterType === 'multi-select' 
                             ? (<MultiSelectFilter label={col.label} options={col.filterOptions || []} selected={filters[col.id] || []} onChange={(vals) => onFilterChange(col.id, vals)}/>) 
                             : (
                                <div className="relative">
                                    <input className={`w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded outline-none focus:border-leaf-300 focus:ring-1 focus:ring-leaf-200 font-normal ${col.id === 'taxonName' ? 'pl-7 border-leaf-300 ring-1 ring-leaf-100' : ''}`} placeholder={col.id === 'taxonName' ? 'Search DB...' : 'Filter...'} value={localTextFilters[col.id] || ''} onChange={e => handleTextFilterChange(col.id, e.target.value)}/>
                                    {col.id === 'taxonName' && (<SearchIcon size={12} className="absolute left-2 top-2 text-leaf-500" />)}
                                </div>
                             )
                          }
                      </th>
                  ))}
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {gridRows.map(row => {
                  const tr = row as TreeRow; const isExpanded = expandedRows.has(tr.id); const rankKey = String(tr.taxonRank).toLowerCase(); const baseColor = activeColorMap[rankKey] || 'slate'; const isHybrid = tr.genusHybrid === '×' || tr.genusHybrid === 'x' || tr.speciesHybrid === '×' || tr.speciesHybrid === 'x';
                  return (
                     <React.Fragment key={tr.id}>
                        <tr className={`hover:bg-blue-50/50 transition-colors ${isExpanded ? 'bg-blue-50/50' : (baseColor === 'slate' ? (isHybrid ? 'bg-slate-50 saturate-50' : '') : `bg-${baseColor}-50 ${isHybrid ? 'saturate-50' : ''}`)} ${tr.isTreeHeader ? 'cursor-pointer group/header border-b-2 border-slate-200' : ''}`} onClick={tr.isTreeHeader ? () => toggleGroup(tr.treePath || '') : undefined}>
                           {activeColumns.map(col => {
                               if (col.id === 'treeControl') return <td key={col.id} className={`p-2 border-r border-slate-200 ${tr.isTreeHeader ? '' : 'border-slate-50'}`} style={{ paddingLeft: `${(tr.depth || 0) * 20}px` }}>{tr.isTreeHeader && <span className={`transform transition-transform inline-block ${tr.treeExpanded ? 'rotate-90' : ''}`}><ChevronRightIcon size={14} /></span>}</td>;
                               if (col.id === 'childCount') return <td key={col.id} className="p-2 border-r border-slate-200 text-xs text-center text-slate-400 font-mono">{tr.isTreeHeader ? tr.childCount : getDescendantCount(tr) || ''}</td>;
                               const val = getRowValue(tr, col.id); let displayVal: React.ReactNode = val || '';
                               if ((col.id === 'genusHybrid' || col.id === 'speciesHybrid') && (val === 'x' || val === 'X' || val === '×')) displayVal = '×';
                               let isBold = false; const r = rankKey; const coreCols = ['genus', 'species', 'cultivar', 'infraspecies', 'infraspecificRank', 'taxonName', 'genusHybrid', 'speciesHybrid'];
                               if (coreCols.includes(col.id)) { if (r === col.id) isBold = true; if ((col.id === 'infraspecies' || col.id === 'infraspecificRank') && ['variety','subspecies','form'].includes(r)) isBold = true; if (col.id === 'taxonName') isBold = true; if (col.id === 'genusHybrid' && r === 'genus') isBold = true; if (col.id === 'speciesHybrid' && r === 'species') isBold = true; }
                               let isDimmed = false; let rowRankLevel = RANK_HIERARCHY[r] || 99; if (['subspecies', 'variety', 'form'].includes(r)) rowRankLevel = 5;
                               if (COLUMN_RANK_MAP[col.id] && COLUMN_RANK_MAP[col.id] < rowRankLevel) isDimmed = true;
                               if (col.id === 'taxonRank') displayVal = <span className={`px-2 py-0.5 text-[10px] rounded border font-bold bg-${baseColor}-100 ${getTextClass(baseColor)} border-${baseColor}-200 normal-case`}>{val as string}</span>;
                               else if (col.id === 'taxonName') displayVal = formatFullScientificName(tr, preferences);
                               else if (col.id === 'taxonStatus') { let b = 'bg-slate-100 text-slate-500'; if (val === 'Accepted') b = 'bg-green-50 text-green-700 border-green-200 border'; displayVal = <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${b} normal-case`}>{val || '-'}</span>; }
                               else if (col.id === 'actions') displayVal = <div className="flex items-center justify-center gap-1"><button onClick={(e) => { e.stopPropagation(); setExpandedRows(prev => { const n = new Set(prev); n.has(tr.id) ? n.delete(tr.id) : n.add(tr.id); return n; }); }} className={`p-1.5 rounded shadow-sm ${isExpanded ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}`}>{isExpanded ? <ChevronUpIcon size={14}/> : <ChevronDownIcon size={14}/>}</button>{['genus', 'species', 'subspecies', 'variety', 'form'].includes(r) && <button onClick={(e) => { e.stopPropagation(); onAction?.('mine', tr); }} className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100 shadow-sm"><PickaxeIcon size={14} /></button>}<button onClick={(e) => { e.stopPropagation(); onAction?.('enrich', tr); }} className="p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-600 hover:bg-amber-100 shadow-sm"><Wand2Icon size={14} /></button></div>;
                               return <td key={col.id} className={`p-2 border-r border-slate-50 truncate overflow-hidden max-w-0 ${col.headerAlign === 'center' ? 'text-center' : ''}`} title={String(val || '')}><span className={`${isBold ? "font-bold" : ""} ${isDimmed ? "font-normal" : ""} ${isBold ? (baseColor === 'slate' ? "text-slate-900" : `text-${baseColor}-900`) : (isDimmed ? "text-slate-400" : "")}`}>{displayVal}</span></td>;
                           })}
                        </tr>
                        {isExpanded && !tr.isTreeHeader && (<tr><td colSpan={activeColumns.length} className="bg-slate-50/50 p-0 border-b border-slate-200 shadow-inner"><div className="p-4 border-l-4 border-slate-500 bg-white m-2 rounded-r-lg shadow-sm"><DetailsPanel title={tr.taxonName} description={tr.description} synonyms={tr.synonyms} referenceLinks={tr.referenceLinks} onUpdate={(updates) => onUpdate(tr.id, updates)} /></div></td></tr>)}
                     </React.Fragment>
                  );
              })}
              {gridRows.length === 0 && !isLoadingMore && (<tr><td colSpan={activeColumns.length} className="p-8 text-center text-slate-400 italic">No matching records.</td></tr>)}
           </tbody>
        </table>
      </div>
    </div>
  );
};
export default DataGrid;