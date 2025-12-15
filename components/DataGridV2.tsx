
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Taxon, UserPreferences, ColorTheme } from '../types';
import { 
  ArrowUpDown, Settings, Check, ChevronDown, GripVertical, Maximize, Monitor, 
  Pickaxe, Info, Wand2, LayoutList, ChevronRight, Network, AlignJustify,
  ChevronsDown, ChevronsUp, ChevronUp, Loader2
} from 'lucide-react';
import { formatFullScientificName } from '../utils/formatters';
import DetailsPanel from './DetailsPanel';

interface DataGridProps {
  taxa: Taxon[];
  onAction?: (action: 'mine' | 'enrich', taxon: Taxon) => void;
  onUpdate?: (id: string, updates: Partial<Taxon>) => void;
  preferences: UserPreferences;
  
  // Infinite Scroll & Server Sort Props
  totalRecords: number;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSortChange: (key: string, direction: 'asc' | 'desc') => void;
}

const RANK_HIERARCHY: Record<string, number> = {
    'family': 1, 'genus': 2, 'species': 3, 'subspecies': 4, 'variety': 5, 'form': 6, 'hybrid': 7, 'grex': 8, 'cultivar': 9,
};

// Map column IDs to Rank Levels for dimming logic
const COLUMN_RANK_MAP: Record<string, number> = {
    'family': 1,
    'genus': 2, 'genusHybrid': 2,
    'species': 3, 'speciesHybrid': 3,
    'infraspecificRank': 5, 'infraspecies': 5,
    'cultivar': 9
};

// THEME DEFINITIONS
type ThemeMap = Record<string, string>;

const THEMES: Record<ColorTheme, ThemeMap> = {
    'option1a': { // Orange -> Amber -> Green -> Sky
        'family': 'red', 'genus': 'orange', 'species': 'amber', 
        'subspecies': 'green', 'variety': 'green', 'form': 'green', 'hybrid': 'amber',
        'cultivar': 'sky', 'grex': 'sky'
    },
    'option1b': { // Sky -> Green -> Amber -> Orange
        'family': 'red', 'genus': 'sky', 'species': 'green', 
        'subspecies': 'amber', 'variety': 'amber', 'form': 'amber', 'hybrid': 'green',
        'cultivar': 'orange', 'grex': 'orange'
    },
    'option2a': { // Green -> Amber -> Orange -> Sky
        'family': 'red', 'genus': 'green', 'species': 'amber', 
        'subspecies': 'orange', 'variety': 'orange', 'form': 'orange', 'hybrid': 'amber',
        'cultivar': 'sky', 'grex': 'sky'
    },
    'option2b': { // Sky -> Orange -> Amber -> Green
        'family': 'red', 'genus': 'sky', 'species': 'orange', 
        'subspecies': 'amber', 'variety': 'amber', 'form': 'amber', 'hybrid': 'orange',
        'cultivar': 'green', 'grex': 'green'
    }
};

// Helper to get text color class based on base color
const getTextClass = (color: string) => {
    if (color === 'slate') return 'text-slate-600';
    return `text-${color}-700`;
};

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
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-600 focus:border-leaf-300 focus:ring-1 focus:ring-leaf-200 flex justify-between items-center">
                <span className="truncate">{selected.length === 0 ? `All ${label}s` : `${selected.length} selected`}</span>
                <ChevronDown size={12} className="opacity-50"/>
            </button>
            {isOpen && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 max-h-48 overflow-y-auto min-w-[150px]"><div className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-50" onClick={() => { onChange([]); setIsOpen(false); }}>Clear Filter</div>{options.map(opt => (<div key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-leaf-50 cursor-pointer" onClick={() => toggleOption(opt)}><div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(opt) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300 bg-white'}`}>{selected.includes(opt) && <Check size={10} className="text-white"/>}</div><span className="text-xs text-slate-700 capitalize whitespace-normal">{opt}</span></div>))}</div>)}
        </div>
    );
};

// Changed from interface extends to type intersection to ensure properties are picked up correctly
type TreeRow = Taxon & {
    isTreeHeader?: boolean;
    treeExpanded?: boolean;
    childCount?: number;
    depth?: number;
    treePath?: string;
    isVirtual?: boolean; 
};

// OPTIMIZED: Use DB field instead of recursive calculation
const getDescendantCount = (taxon: Taxon): number => {
    return taxon.descendantCount || 0;
};

const DataGridV2: React.FC<DataGridProps> = ({ 
    taxa, onAction, onUpdate, preferences, 
    totalRecords, isLoadingMore, onLoadMore, 
    sortConfig, onSortChange 
}) => {
  type ColumnId = string; 
  interface ColumnConfig { 
      id: ColumnId; 
      label: string; 
      defaultWidth: number; 
      filterType?: 'text' | 'multi-select'; 
      filterOptions?: string[]; 
      disableSorting?: boolean; 
      disableDrag?: boolean;
      hideHeaderIcons?: boolean; 
      headerAlign?: 'left' | 'center' | 'right';
      lockWidth?: boolean; // If true, auto-fit and fit-to-screen won't resize this column
  }

  const allColumns: ColumnConfig[] = [
      { id: 'treeControl', label: 'Tree', defaultWidth: 55, filterType: undefined, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center' }, 
      { id: 'actions', label: 'Actions', defaultWidth: 90, filterType: undefined, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center' }, 
      { id: 'childCount', label: '#', defaultWidth: 50, filterType: 'text', hideHeaderIcons: true, headerAlign: 'center', lockWidth: true }, 
      
      { id: 'family', label: 'Family', defaultWidth: 120, filterType: 'text' },
      { id: 'genusHybrid', label: 'GH', defaultWidth: 40, filterType: 'text', disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true }, 
      { id: 'genus', label: 'Genus', defaultWidth: 120, filterType: 'text' }, 
      { id: 'speciesHybrid', label: 'SH', defaultWidth: 40, filterType: 'text', disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true }, 
      { id: 'species', label: 'Species', defaultWidth: 120, filterType: 'text' }, 
      
      { id: 'infraspecificRank', label: 'I Rank', defaultWidth: 60, filterType: 'text', hideHeaderIcons: true, headerAlign: 'center', lockWidth: true },
      { id: 'infraspecies', label: 'Infraspecies', defaultWidth: 120, filterType: 'text' }, 
      { id: 'cultivar', label: 'Cultivar', defaultWidth: 150, filterType: 'text' }, 
      
      { id: 'taxonName', label: 'Taxon Name', defaultWidth: 220, filterType: 'text' }, 
      
      { id: 'taxonRank', label: 'Rank', defaultWidth: 110, filterType: 'multi-select', filterOptions: ['family', 'genus', 'species', 'subspecies', 'variety', 'form', 'hybrid', 'cultivar', 'grex', 'Unranked'], lockWidth: true }, 
      { id: 'taxonStatus', label: 'Status', defaultWidth: 110, filterType: 'multi-select', filterOptions: ['Accepted', 'Synonym', 'Unresolved', 'Artificial'] },
      { id: 'commonName', label: 'Common Name', defaultWidth: 150, filterType: 'text' },
      
      { id: 'plantNameId', label: 'WCVP ID', defaultWidth: 100, filterType: 'text' }, 
      { id: 'ipniId', label: 'IPNI ID', defaultWidth: 100, filterType: 'text' },
      { id: 'powoId', label: 'POWO ID', defaultWidth: 100, filterType: 'text' },
      { id: 'acceptedPlantNameId', label: 'Accepted ID', defaultWidth: 100, filterType: 'text' }, 
      { id: 'parentId', label: 'Parent ID', defaultWidth: 100, filterType: 'text' },
      { id: 'parentPlantNameId', label: 'Parent Plant ID', defaultWidth: 100, filterType: 'text' }, 
      { id: 'basionymPlantNameId', label: 'Basionym ID', defaultWidth: 100, filterType: 'text' }, 
      { id: 'homotypicSynonym', label: 'Homotypic Syn.', defaultWidth: 100, filterType: 'text' }, 
      { id: 'id', label: 'Internal ID', defaultWidth: 100, filterType: 'text' },

      { id: 'taxonAuthors', label: 'Authorship', defaultWidth: 150, filterType: 'text' }, 
      { id: 'primaryAuthor', label: 'Primary Author', defaultWidth: 150, filterType: 'text' }, 
      { id: 'parentheticalAuthor', label: 'Parenthetical Author', defaultWidth: 140, filterType: 'text' },
      { id: 'publicationAuthor', label: 'Pub. Author', defaultWidth: 120, filterType: 'text' },
      { id: 'replacedSynonymAuthor', label: 'Replaced Syn. Author', defaultWidth: 150, filterType: 'text' }, 
      
      { id: 'placeOfPublication', label: 'Publication', defaultWidth: 200, filterType: 'text' },
      { id: 'volumeAndPage', label: 'Vol/Page', defaultWidth: 100, filterType: 'text' },
      { id: 'firstPublished', label: 'First Published', defaultWidth: 120, filterType: 'text' },
      { id: 'nomenclaturalRemarks', label: 'Nom. Remarks', defaultWidth: 150, filterType: 'text' },
      { id: 'reviewed', label: 'Reviewed', defaultWidth: 90, filterType: 'multi-select', filterOptions: ['Y', 'N'] },
      
      { id: 'hybridFormula', label: 'Hybrid Formula', defaultWidth: 150, filterType: 'text' },
      { id: 'geographicArea', label: 'Geography', defaultWidth: 180, filterType: 'text' },
      { id: 'lifeformDescription', label: 'Lifeform', defaultWidth: 120, filterType: 'text' },
      { id: 'climateDescription', label: 'Climate', defaultWidth: 120, filterType: 'text' },
      { id: 'description', label: 'Description', defaultWidth: 250, filterType: 'text' },
  ];

  const loadState = <T,>(key: string, def: T): T => {
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
  };

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => {
      const saved = loadState<string[]>('grid_v2_visible_cols', []);
      return saved.length > 0 ? new Set(saved) : new Set([
          'treeControl', 'actions', 'childCount', 'genusHybrid', 'genus', 'speciesHybrid', 'species', 'infraspecificRank', 'infraspecies', 'cultivar', 'taxonName'
      ]);
  });
  
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => loadState('grid_v2_col_order_rev7', allColumns.map(c => c.id)));
  const [colWidths, setColWidths] = useState<Record<ColumnId, number>>(() => loadState('grid_v2_col_widths', Object.fromEntries(allColumns.map(c => [c.id, c.defaultWidth]))));
  
  // Note: sortConfig is now passed as prop
  
  const [textFilters, setTextFilters] = useState<Record<string, string>>(() => loadState('grid_v2_text_filters', {}));
  const [multiFilters, setMultiFilters] = useState<Record<string, string[]>>(() => loadState('grid_v2_multi_filters', {}));

  const [isHierarchyMode, setIsHierarchyMode] = useState<boolean>(false);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Disable Hierarchy Mode persistence for now as it conflicts with pagination
  useEffect(() => {
      if (isHierarchyMode) setGroupBy(['genus', 'species', 'infraspecies']);
      else setGroupBy([]);
  }, [isHierarchyMode]);

  useEffect(() => localStorage.setItem('grid_v2_visible_cols', JSON.stringify(Array.from(visibleColumns))), [visibleColumns]);
  useEffect(() => localStorage.setItem('grid_v2_col_order_rev7', JSON.stringify(columnOrder)), [columnOrder]);
  useEffect(() => localStorage.setItem('grid_v2_col_widths', JSON.stringify(colWidths)), [colWidths]);
  useEffect(() => localStorage.setItem('grid_v2_text_filters', JSON.stringify(textFilters)), [textFilters]);
  useEffect(() => localStorage.setItem('grid_v2_multi_filters', JSON.stringify(multiFilters)), [multiFilters]);

  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const [showColPicker, setShowColPicker] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const resizingRef = useRef<{ colId: ColumnId, startX: number, startWidth: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const colPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as Node;
          if (showLegend && legendRef.current && !legendRef.current.contains(target)) setShowLegend(false);
          if (showColPicker && colPickerRef.current && !colPickerRef.current.contains(target)) setShowColPicker(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLegend, showColPicker]);

  const activeColumns = useMemo(() => columnOrder.filter(id => visibleColumns.has(id)).map(id => allColumns.find(c => c.id === id)).filter((c): c is ColumnConfig => !!c), [columnOrder, visibleColumns]);

  const totalTableWidth = useMemo(() => {
      return activeColumns.reduce((sum, col) => sum + (colWidths[col.id] || col.defaultWidth), 0);
  }, [activeColumns, colWidths]);

  // Determine current color map
  const activeColorMap = useMemo(() => THEMES[preferences.colorTheme] || THEMES['option1a'], [preferences.colorTheme]);

  const getRowValue = (row: Taxon, colId: string) => {
       if (colId === 'childCount') {
           const tr = row as TreeRow;
           return tr.isTreeHeader ? tr.childCount : getDescendantCount(tr);
       }
       if (colId === 'cultivar' && row.taxonRank === 'cultivar') return row.name;
       // @ts-ignore
       return row[colId];
  };

  // CLIENT-SIDE Filtering logic - kept for filtering within the LOADED batch
  // Note: For global filtering, use the Search Bar in App.tsx
  const filteredData = useMemo(() => {
    return taxa.filter(item => {
        for (const [key, value] of Object.entries(textFilters)) {
            if (!value) continue;
            const strValue = value as string;
            const itemVal = String(getRowValue(item, key) || '').toLowerCase();
            if (!itemVal.includes(strValue.toLowerCase())) return false;
        }
        for (const [key, values] of Object.entries(multiFilters)) {
            const arrValues = values as string[];
            if (arrValues.length === 0) continue;
            // @ts-ignore
            if (!arrValues.includes(item[key])) return false;
        }
        return true;
    });
  }, [taxa, textFilters, multiFilters]);

  // Infinite Scroll Handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
      // Look Ahead: Reduced buffer to 300px (since batch is 100 rows, approx 4000px height)
      if (!isLoadingMore && scrollHeight - scrollTop - clientHeight < 300) {
          onLoadMore();
      }
  };

  // --- TREE GRID LOGIC ---
  const gridRows = useMemo(() => {
      if (groupBy.length === 0) return filteredData;

      // Grouping logic builds on current loaded data.
      const outputRows: TreeRow[] = [];
      const bucketKey = (row: Taxon, depth: number) => {
          const field = groupBy[depth];
          return String(getRowValue(row, field) || ''); 
      };

      const findHeaderTaxon = (candidates: Taxon[], field: string, value: string): Taxon | undefined => {
          return candidates.find(t => {
             const valMatches = String(getRowValue(t, field)) === value;
             if (!valMatches) return false;
             
             if (field === 'genus') return t.taxonRank === 'genus';
             if (field === 'species') return t.taxonRank === 'species';
             if (field === 'infraspecies') return ['variety', 'subspecies', 'form'].includes(t.taxonRank);
             
             return t.taxonRank.toLowerCase() === field.toLowerCase();
          });
      };

      const processLevel = (subset: Taxon[], depth: number, parentPath: string) => {
          if (depth >= groupBy.length) {
              // Usually sorts locally, but here data is presumed pre-sorted by server
              subset.forEach(t => outputRows.push({ ...t, depth, treePath: `${parentPath}/${t.id}` }));
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

              if (key === '' || key === 'undefined' || key === 'null') {
                  processLevel(groupItems, depth + 1, parentPath); 
                  return;
              }

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

              const childCount = headerTaxon ? headerTaxon.descendantCount : groupItems.length;
              
              headerRow.isTreeHeader = true;
              headerRow.treeExpanded = !collapsedGroups.has(path);
              headerRow.childCount = childCount; 
              headerRow.depth = depth;
              headerRow.treePath = path;

              outputRows.push(headerRow);

              if (headerRow.treeExpanded) {
                  processLevel(itemsWithoutHeader, depth + 1, path);
              }
          });
      };

      processLevel(filteredData, 0, 'root');
      return outputRows;
  }, [filteredData, groupBy, collapsedGroups]);

  const toggleGroup = (path: string) => {
      const next = new Set(collapsedGroups);
      if (next.has(path)) next.delete(path); else next.add(path);
      setCollapsedGroups(next);
  };
  
  const toggleRowExpanded = (id: string) => {
      const next = new Set(expandedRows);
      if (next.has(id)) next.delete(id); else next.add(id);
      setExpandedRows(next);
  };

  const handleResizeStart = (e: React.MouseEvent, colId: ColumnId) => { e.preventDefault(); e.stopPropagation(); resizingRef.current = { colId, startX: e.clientX, startWidth: colWidths[colId] || 100 }; document.addEventListener('mousemove', handleResizeMove); document.addEventListener('mouseup', handleResizeEnd); document.body.style.cursor = 'col-resize'; };
  const handleResizeMove = useCallback((e: MouseEvent) => { if (!resizingRef.current) return; const { colId, startX, startWidth } = resizingRef.current; const diff = e.clientX - startX; setColWidths(prev => ({ ...prev, [colId]: Math.max(30, startWidth + diff) })); }, []);
  const handleResizeEnd = useCallback(() => { resizingRef.current = null; document.removeEventListener('mousemove', handleResizeMove); document.removeEventListener('mouseup', handleResizeEnd); document.body.style.cursor = ''; }, [handleResizeMove]);
  
  const getIdealWidths = () => { const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (!context) return {}; context.font = '14px Inter, sans-serif'; const idealWidths: Record<ColumnId, number> = {}; const sampleSize = 100; activeColumns.forEach(col => { let maxWidth = context.measureText(col.label).width + 24; const rowsToCheck = taxa.slice(0, sampleSize); rowsToCheck.forEach(row => { const val = String(getRowValue(row, String(col.id)) || ''); const width = context.measureText(val).width + 16; maxWidth = Math.max(maxWidth, width); }); maxWidth = Math.max(maxWidth, 50); idealWidths[col.id] = Math.ceil(maxWidth); }); return idealWidths; };
  
  const autoFitContent = () => { 
      const ideals = getIdealWidths(); 
      const limit = preferences.autoFitMaxWidth || 400; 
      const updates: Record<ColumnId, number> = {};
      Object.keys(ideals).forEach(k => { 
          const colDef = allColumns.find(c => c.id === k);
          if (colDef?.lockWidth) return; 
          if (k === 'taxonName') updates[k] = Math.max(ideals[k], 180); 
          else updates[k] = Math.min(ideals[k], limit); 
      }); 
      setColWidths(prev => ({...prev, ...updates})); 
  };
  
  const fitToScreen = () => { 
      if (!containerRef.current) return; 
      const ideals = getIdealWidths(); 
      const availableWidth = containerRef.current.clientWidth - 2; 

      const lockedCols = activeColumns.filter(c => c.lockWidth);
      const flexCols = activeColumns.filter(c => !c.lockWidth);

      let lockedWidth = 0;
      lockedCols.forEach(col => { lockedWidth += (colWidths[col.id] || col.defaultWidth); });

      const flexAvailable = Math.max(0, availableWidth - lockedWidth);

      if (flexCols.length === 0) return;

      let minIdeal = 9999; 
      flexCols.forEach(col => { const w = ideals[col.id] || 50; if(w < minIdeal) minIdeal = w; }); 
      
      const ratio = preferences.fitScreenMaxRatio || 4.0; 
      const maxAllowed = minIdeal * ratio; 
      const cappedIdeals: Record<ColumnId, number> = {}; 
      let totalCappedWidth = 0; 
      
      flexCols.forEach(col => { 
          let w = ideals[col.id]; 
          if (['taxonRank', 'taxonStatus', 'reviewed'].includes(String(col.id))) w = Math.max(w, 110); 
          if (col.id === 'taxonName') w = Math.max(w, 180); 
          else w = Math.min(w, maxAllowed); 
          cappedIdeals[col.id] = w; 
          totalCappedWidth += w; 
      }); 
      
      const newWidths: Record<ColumnId, number> = {}; 
      if (totalCappedWidth < flexAvailable) { 
          const extraSpace = flexAvailable - totalCappedWidth; 
          flexCols.forEach(col => { const share = cappedIdeals[col.id] / totalCappedWidth; newWidths[col.id] = Math.floor(cappedIdeals[col.id] + (extraSpace * share)); }); 
      } else { 
          const scale = flexAvailable / totalCappedWidth; 
          flexCols.forEach(col => { let w = cappedIdeals[col.id] * scale; if (col.id === 'taxonName') w = Math.max(w, 150); if (['taxonRank', 'taxonStatus', 'reviewed'].includes(String(col.id))) w = Math.max(w, 80); newWidths[col.id] = Math.max(40, Math.floor(w)); }); 
      } 
      setColWidths(prev => ({...prev, ...newWidths})); 
  };
  
  // Delegated Sort Handler
  const handleSort = (key: ColumnId) => { 
      let direction: 'asc' | 'desc' = 'asc'; 
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'; 
      onSortChange(key, direction);
  };

  const handleTextFilterChange = (key: string, val: string) => setTextFilters(p => ({ ...p, [key]: val }));
  const handleMultiFilterChange = (key: string, vals: string[]) => setMultiFilters(p => ({ ...p, [key]: vals }));
  const toggleColumn = (id: ColumnId) => { const next = new Set(visibleColumns); if (next.has(id)) next.delete(id); else next.add(id); setVisibleColumns(next); };
  const handleDragStart = (e: React.DragEvent, id: ColumnId) => { if (allColumns.find(c=>c.id===id)?.disableDrag) return; setDraggedColumn(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, targetId: ColumnId) => { e.preventDefault(); if (!draggedColumn || draggedColumn === targetId) return; const newOrder = [...columnOrder]; const sIdx = newOrder.indexOf(draggedColumn); const tIdx = newOrder.indexOf(targetId); newOrder.splice(sIdx, 1); newOrder.splice(tIdx, 0, draggedColumn); setColumnOrder(newOrder); setDraggedColumn(null); };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center z-20 relative flex-shrink-0">
         <div className="text-xs text-slate-500 font-medium px-2 flex gap-4">
             <span>{totalRecords.toLocaleString()} records</span>
             {isLoadingMore && <span className="flex items-center gap-1 text-leaf-600"><Loader2 size={12} className="animate-spin"/> Loading more...</span>}
         </div>
         <div className="flex items-center gap-2">
             <div className="relative" ref={legendRef}>
                 <button onClick={() => setShowLegend(!showLegend)} className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm ${showLegend ? 'bg-slate-100 text-leaf-600' : 'bg-white text-slate-600'}`}><Info size={14} /> Legend</button>
                 {showLegend && (
                    <div className="absolute right-0 top-full mt-2 w-[400px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">Standard</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['genus']}-50 border-${activeColorMap['genus']}-200`}></span><span className="text-xs text-slate-600">Genus</span></div>
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['species']}-50 border-${activeColorMap['species']}-200`}></span><span className="text-xs text-slate-600">Species</span></div>
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['variety']}-50 border-${activeColorMap['variety']}-200`}></span><span className="text-xs text-slate-600">Infraspecies</span></div>
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['cultivar']}-50 border-${activeColorMap['cultivar']}-200`}></span><span className="text-xs text-slate-600">Cultivar</span></div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">Hybrid (Grayer)</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['genus']}-50 border-${activeColorMap['genus']}-200 saturate-50`}></span><span className="text-xs text-slate-600">Hybrid Genus</span></div>
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['species']}-50 border-${activeColorMap['species']}-200 saturate-50`}></span><span className="text-xs text-slate-600">Hybrid Species</span></div>
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['variety']}-50 border-${activeColorMap['variety']}-200 saturate-50`}></span><span className="text-xs text-slate-600">Hybrid Infraspecies</span></div>
                                    <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border bg-${activeColorMap['cultivar']}-50 border-${activeColorMap['cultivar']}-200 saturate-50`}></span><span className="text-xs text-slate-600">Hybrid Cultivar</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                 )}
             </div>
             <button onClick={fitToScreen} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm" title="Fit columns to current screen width"><Monitor size={14} /> Fit Screen</button>
             <button onClick={autoFitContent} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm" title="Resize columns to fit content"><Maximize size={14} /> Auto Fit</button>
             <div className="relative" ref={colPickerRef}>
                 <button onClick={() => setShowColPicker(!showColPicker)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><Settings size={14} /> Columns</button>
                 {showColPicker && (<div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 max-h-[60vh] overflow-y-auto"><div className="flex justify-between items-center mb-2 px-1"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visible Columns</div><button onClick={() => setVisibleColumns(new Set(allColumns.map(c=>c.id)))} className="text-[10px] text-blue-600 hover:underline">Select All</button></div><div className="space-y-0.5">{allColumns.map(col => (<div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded"><div className={`w-3 h-3 rounded flex items-center justify-center border flex-shrink-0 ${visibleColumns.has(col.id) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300'}`}>{visibleColumns.has(col.id) && <Check size={10} className="text-white"/>}</div><span className="text-xs text-slate-700 truncate">{col.label}</span></div>))}</div></div>)}
             </div>
         </div>
      </div>
      
      {/* Table Area with Infinite Scroll */}
      <div 
        className="flex-1 overflow-auto custom-scrollbar" 
        ref={containerRef}
        onScroll={handleScroll}
      >
        <table 
            className="text-left text-sm whitespace-nowrap border-separate border-spacing-0 table-fixed"
            style={{ width: totalTableWidth }}
        >
           <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wide shadow-sm">
              <tr>
                  {activeColumns.map(col => (
                      <th 
                          key={String(col.id)} 
                          className={`border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50 select-none relative group ${draggedColumn === col.id ? 'opacity-50 bg-slate-200' : ''}`} 
                          style={{ width: colWidths[col.id], minWidth: 30 }} 
                          draggable={!col.disableDrag}
                          onDragStart={(e) => handleDragStart(e, col.id)} 
                          onDragOver={handleDragOver} 
                          onDrop={(e) => handleDrop(e, col.id)}
                      >
                         <div className={`flex items-center gap-1 p-2 h-full w-full ${col.headerAlign === 'center' ? 'justify-center' : 'justify-between'}`}>
                             {col.id === 'treeControl' ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsHierarchyMode(!isHierarchyMode); }}
                                    className={`p-1 rounded hover:bg-slate-200 transition-colors ${isHierarchyMode ? 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200 shadow-inner' : 'text-slate-400'}`}
                                    title={isHierarchyMode ? "Switch to Flat View" : "Switch to Tree View"}
                                >
                                    <Network size={16} />
                                </button>
                             ) : (
                                 <>
                                     <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing overflow-hidden" onClick={() => !col.disableSorting && handleSort(col.id)}>
                                        {col.id !== 'actions' && !col.disableDrag && !col.hideHeaderIcons && <GripVertical size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-move flex-shrink-0" />}
                                        <span className="truncate">{col.label}</span>
                                     </div>
                                     {col.id !== 'actions' && !col.disableSorting && !col.hideHeaderIcons && (<button onClick={() => handleSort(col.id)} className="flex-shrink-0"><ArrowUpDown size={12} className={sortConfig?.key === col.id ? 'text-leaf-600' : 'text-slate-300 hover:text-slate-500'}/></button>)}
                                 </>
                             )}
                         </div>
                         {col.id !== 'actions' && (<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-leaf-400 z-20" onMouseDown={(e) => handleResizeStart(e, col.id)}/>)}
                      </th>
                  ))}
              </tr>
              <tr>
                  {activeColumns.map(col => (
                      <th key={`${String(col.id)}-filter`} className="p-1 border-b border-slate-200 border-r border-slate-100 bg-slate-50/80">
                          {col.id === 'actions' || col.id === 'treeControl' ? null : col.filterType === 'multi-select' ? (<MultiSelectFilter label={col.label} options={col.filterOptions || []} selected={multiFilters[String(col.id)] || []} onChange={(vals) => handleMultiFilterChange(String(col.id), vals)}/>) : (<input className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded outline-none focus:border-leaf-300 focus:ring-1 focus:ring-leaf-200 placeholder:text-slate-300 font-normal" placeholder={`Filter...`} value={textFilters[String(col.id)] || ''} onChange={e => handleTextFilterChange(String(col.id), e.target.value)}/>)}
                      </th>
                  ))}
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {gridRows.map(row => {
                  const tr = row as TreeRow;
                  const isExpanded = expandedRows.has(tr.id);
                  const rankKey = String(tr.taxonRank).toLowerCase(); 
                  const baseColor = activeColorMap[rankKey] || 'slate';
                  const isHybrid = tr.genusHybrid === '×' || tr.genusHybrid === 'x' || tr.speciesHybrid === '×' || tr.speciesHybrid === 'x' || rankKey === 'hybrid';
                  const rowBgClass = baseColor === 'slate' ? (isHybrid ? 'bg-slate-50 saturate-50' : '') : `bg-${baseColor}-50 ${isHybrid ? 'saturate-50' : ''}`;
                  const finalRowBg = isExpanded ? 'bg-blue-50/50' : rowBgClass;

                  return (
                     <React.Fragment key={String(tr.id)}>
                        <tr className={`hover:bg-blue-50/50 transition-colors ${finalRowBg} ${tr.isTreeHeader ? 'cursor-pointer group/header border-b-2 border-slate-200' : ''}`} onClick={tr.isTreeHeader ? () => toggleGroup(tr.treePath || '') : undefined}>
                           {activeColumns.map((col, idx) => {
                               if (col.id === 'treeControl') {
                                   if (tr.isTreeHeader) {
                                       const isCollapsed = !tr.treeExpanded;
                                       return (
                                          <td key={String(col.id)} className="p-2 border-r border-slate-200" style={{ paddingLeft: `${(tr.depth || 0) * 20}px` }}>
                                              <div className="flex items-center gap-1 font-bold text-slate-600">
                                                  <span className={`transform transition-transform ${!isCollapsed ? 'rotate-90' : ''}`}><ChevronRight size={14} /></span>
                                              </div>
                                          </td>
                                       );
                                   }
                                   return <td key={String(col.id)} className="p-2 border-r border-slate-50"></td>;
                               }
                               if (col.id === 'childCount') {
                                   const count = tr.isTreeHeader ? tr.childCount : getDescendantCount(tr);
                                   return <td key={String(col.id)} className="p-2 border-r border-slate-200 text-xs text-center text-slate-400 font-mono">{count || ''}</td>;
                               }

                               const val = getRowValue(tr, String(col.id));
                               let displayVal: React.ReactNode = val || '';
                               if ((col.id === 'genusHybrid' || col.id === 'speciesHybrid') && (val === 'x' || val === 'X')) displayVal = '×';
                               
                               let isBold = false;
                               const r = String(tr.taxonRank).toLowerCase(); 
                               const coreCols = ['genus', 'species', 'cultivar', 'infraspecies', 'infraspecificRank', 'taxonName', 'genusHybrid', 'speciesHybrid'];
                               if (coreCols.includes(String(col.id))) {
                                    if (r === String(col.id)) isBold = true;
                                    if ((String(col.id) === 'infraspecies' || String(col.id) === 'infraspecificRank') && ['variety','subspecies','form'].includes(r)) isBold = true;
                                    if (String(col.id) === 'taxonName') isBold = true;
                                    if (String(col.id) === 'genusHybrid' && r === 'genus') isBold = true;
                                    if (String(col.id) === 'speciesHybrid' && r === 'species') isBold = true;
                               }

                               let isDimmed = false;
                               let rowRankLevel = RANK_HIERARCHY[r] || 99;
                               if (['subspecies', 'variety', 'form'].includes(r)) rowRankLevel = 5;
                               const colRankLevel = COLUMN_RANK_MAP[String(col.id)];
                               if (colRankLevel && colRankLevel < rowRankLevel) isDimmed = true;
                               
                               if (col.id === 'taxonRank') { 
                                   const rankStyle = `bg-${baseColor}-100 ${getTextClass(baseColor)} border-${baseColor}-200`;
                                   displayVal = <span className={`px-2 py-0.5 text-[10px] rounded border uppercase font-bold ${rankStyle}`}>{val as string}</span>;
                               } else if (col.id === 'taxonName') {
                                   displayVal = formatFullScientificName(tr, preferences);
                               } else if (col.id === 'taxonStatus') {
                                    displayVal = <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold ${val === 'Accepted' ? 'bg-green-50 text-green-600' : ''} ${val === 'Synonym' ? 'bg-slate-100 text-slate-500' : ''} ${val === 'Artificial' ? 'bg-yellow-50 text-yellow-600' : ''}`}>{val as string || '-'}</span>;
                               } else if (col.id === 'actions') {
                                   const isMineable = ['genus', 'species', 'subspecies', 'variety', 'form', 'hybrid', 'grex'].includes(r);
                                   displayVal = (
                                       <div className="flex items-center justify-center gap-1">
                                           <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRowExpanded(tr.id); }} className={`p-1.5 rounded transition-colors cursor-pointer relative z-50 shadow-sm ${isExpanded ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`} title={isExpanded ? "Collapse Details" : "Show Details"}>{isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
                                           {isMineable ? (
                                               <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction && onAction('mine', tr); }} className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer relative z-50 active:scale-95 shadow-sm" title={`Deep Mine Cultivars`}><Pickaxe size={14} className="pointer-events-none" /></button>
                                           ) : (<div className="p-1.5 bg-slate-50 border border-slate-100 rounded text-slate-300 cursor-not-allowed"><Pickaxe size={14} /></div>)}
                                           <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction && onAction('enrich', tr); }} className="p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer relative z-50 active:scale-95 shadow-sm" title={`Enrich details`}><Wand2 size={14} className="pointer-events-none" /></button>
                                       </div>
                                   );
                               }
                               
                               let textColorClass = "";
                               if (isBold) textColorClass = baseColor === 'slate' ? "text-slate-900" : `text-${baseColor}-900`;
                               if (isDimmed) textColorClass = "text-slate-400";
                               const textAlignClass = col.headerAlign === 'center' ? 'text-center' : '';

                               return <td key={String(col.id)} className={`p-2 border-r border-slate-50 truncate overflow-hidden max-w-0 ${textAlignClass}`} title={String(val || '')}><span className={`${isBold ? "font-bold" : ""} ${isDimmed ? "font-normal" : ""} ${textColorClass}`}>{displayVal}</span></td>;
                           })}
                        </tr>
                        {isExpanded && !tr.isTreeHeader && (
                             <tr>
                                 <td colSpan={activeColumns.length} className="bg-slate-50/50 p-0 border-b border-slate-200 shadow-inner">
                                     <div className="p-4 border-l-4 border-slate-500 bg-white m-2 rounded-r-lg shadow-sm">
                                         <DetailsPanel 
                                             title={tr.taxonName}
                                             description={tr.description}
                                             synonyms={tr.synonyms}
                                             referenceLinks={tr.referenceLinks}
                                             onUpdate={(updates) => onUpdate && onUpdate(tr.id, updates)}
                                         />
                                     </div>
                                 </td>
                             </tr>
                        )}
                     </React.Fragment>
                  );
              })}
              {isLoadingMore && (
                  <tr>
                      <td colSpan={activeColumns.length} className="p-4 text-center">
                          <div className="flex justify-center items-center gap-2 text-slate-400 text-xs">
                              <Loader2 size={16} className="animate-spin" />
                              Loading more records...
                          </div>
                      </td>
                  </tr>
              )}
              {gridRows.length === 0 && !isLoadingMore && (<tr><td colSpan={activeColumns.length} className="p-8 text-center text-slate-400 italic">No records found matching filters.</td></tr>)}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataGridV2;
