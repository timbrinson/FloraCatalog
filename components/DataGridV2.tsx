
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Taxon, UserPreferences } from '../types';
import { ArrowUpDown, Settings, Check, ChevronDown, GripVertical, Maximize, Monitor, Pickaxe, Info, Wand2, LayoutList, ChevronRight, Network, AlignJustify } from 'lucide-react';
import { formatFullScientificName } from '../utils/formatters';

interface DataGridProps {
  taxa: Taxon[];
  onAction?: (action: 'mine' | 'enrich', taxon: Taxon) => void;
  preferences: UserPreferences;
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

const RANK_BASE_COLORS: Record<string, string> = {
    'family': 'rose', 
    'genus': 'orange', 
    'species': 'amber', 
    'subspecies': 'lime', 
    'variety': 'emerald', 
    'form': 'teal', 
    'hybrid': 'cyan', 
    'grex': 'sky', 
    'cultivar': 'violet', 
};

const RANK_COLORS: Record<string, string> = Object.fromEntries(
    Object.entries(RANK_BASE_COLORS).map(([k, c]) => [k, `bg-${c}-50 text-${c}-700 border-${c}-100`])
);

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

const getDescendantCount = (taxonId: string, allTaxa: Taxon[]): number => {
    let count = 0;
    const directChildren = allTaxa.filter(t => t.parentId === taxonId);
    count += directChildren.length;
    directChildren.forEach(child => {
        count += getDescendantCount(child.id, allTaxa);
    });
    return count;
};

const DataGridV2: React.FC<DataGridProps> = ({ taxa, onAction, preferences }) => {
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
      { id: 'actions', label: 'Actions', defaultWidth: 70, filterType: undefined, disableSorting: true, lockWidth: true, hideHeaderIcons: true, headerAlign: 'center' }, 
      { id: 'childCount', label: '#', defaultWidth: 50, filterType: 'text', hideHeaderIcons: true, headerAlign: 'center', lockWidth: true }, 
      
      { id: 'family', label: 'Family', defaultWidth: 120, filterType: 'text' },
      { id: 'genus', label: 'Genus', defaultWidth: 120, filterType: 'text' }, 
      { id: 'genusHybrid', label: 'GH', defaultWidth: 40, filterType: 'text', disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true }, 
      { id: 'species', label: 'Species', defaultWidth: 120, filterType: 'text' }, 
      { id: 'speciesHybrid', label: 'SH', defaultWidth: 40, filterType: 'text', disableSorting: true, hideHeaderIcons: true, headerAlign: 'center', lockWidth: true }, 
      { id: 'infraspecificRank', label: 'I Rank', defaultWidth: 60, filterType: 'text', hideHeaderIcons: true, headerAlign: 'center', lockWidth: true },
      { id: 'infraspecies', label: 'Infraspecies', defaultWidth: 120, filterType: 'text' }, 
      { id: 'cultivar', label: 'Cultivar', defaultWidth: 150, filterType: 'text' }, 
      
      { id: 'scientificName', label: 'Scientific Name', defaultWidth: 220, filterType: 'text' },
      
      { id: 'rank', label: 'Rank', defaultWidth: 110, filterType: 'multi-select', filterOptions: ['family', 'genus', 'species', 'subspecies', 'variety', 'form', 'hybrid', 'cultivar', 'grex'], lockWidth: true },
      { id: 'taxonomicStatus', label: 'Status', defaultWidth: 110, filterType: 'multi-select', filterOptions: ['Accepted', 'Synonym', 'Unresolved', 'Artificial'] },
      { id: 'commonName', label: 'Common Name', defaultWidth: 150, filterType: 'text' },
      
      { id: 'plantNameId', label: 'WCVP ID', defaultWidth: 100, filterType: 'text' }, 
      { id: 'ipniId', label: 'IPNI ID', defaultWidth: 100, filterType: 'text' },
      { id: 'powoId', label: 'POWO ID', defaultWidth: 100, filterType: 'text' },
      { id: 'acceptedNameId', label: 'Accepted ID', defaultWidth: 100, filterType: 'text' },
      { id: 'parentId', label: 'Parent ID', defaultWidth: 100, filterType: 'text' },
      { id: 'basionymId', label: 'Basionym ID', defaultWidth: 100, filterType: 'text' },
      { id: 'id', label: 'Internal ID', defaultWidth: 100, filterType: 'text' },

      { id: 'authorship', label: 'Authorship', defaultWidth: 150, filterType: 'text' },
      { id: 'parentheticalAuthor', label: 'Parenthetical Author', defaultWidth: 140, filterType: 'text' },
      { id: 'publicationAuthor', label: 'Pub. Author', defaultWidth: 120, filterType: 'text' },
      
      { id: 'publication', label: 'Publication', defaultWidth: 200, filterType: 'text' },
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
          'treeControl', 'childCount', 'genus', 'genusHybrid', 'species', 'speciesHybrid', 'infraspecificRank', 'infraspecies', 'cultivar', 'scientificName'
      ]);
  });
  
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => loadState('grid_v2_col_order', allColumns.map(c => c.id)));
  const [colWidths, setColWidths] = useState<Record<ColumnId, number>>(() => loadState('grid_v2_col_widths', Object.fromEntries(allColumns.map(c => [c.id, c.defaultWidth]))));
  const [sortConfig, setSortConfig] = useState<{ key: ColumnId; direction: 'asc' | 'desc' } | null>(() => loadState('grid_v2_sort', { key: 'scientificName', direction: 'asc' }));
  const [textFilters, setTextFilters] = useState<Record<string, string>>(() => loadState('grid_v2_text_filters', {}));
  const [multiFilters, setMultiFilters] = useState<Record<string, string[]>>(() => loadState('grid_v2_multi_filters', {}));

  const [isHierarchyMode, setIsHierarchyMode] = useState<boolean>(() => loadState('grid_v2_hierarchy_mode', false));
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
      if (isHierarchyMode) setGroupBy(['genus', 'species', 'infraspecies']);
      else setGroupBy([]);
  }, [isHierarchyMode]);

  useEffect(() => localStorage.setItem('grid_v2_visible_cols', JSON.stringify(Array.from(visibleColumns))), [visibleColumns]);
  useEffect(() => localStorage.setItem('grid_v2_col_order', JSON.stringify(columnOrder)), [columnOrder]);
  useEffect(() => localStorage.setItem('grid_v2_col_widths', JSON.stringify(colWidths)), [colWidths]);
  useEffect(() => localStorage.setItem('grid_v2_sort', JSON.stringify(sortConfig)), [sortConfig]);
  useEffect(() => localStorage.setItem('grid_v2_text_filters', JSON.stringify(textFilters)), [textFilters]);
  useEffect(() => localStorage.setItem('grid_v2_multi_filters', JSON.stringify(multiFilters)), [multiFilters]);
  useEffect(() => localStorage.setItem('grid_v2_hierarchy_mode', JSON.stringify(isHierarchyMode)), [isHierarchyMode]);

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

  const getRowValue = (row: Taxon, colId: string) => {
       if (colId === 'childCount') {
           const tr = row as TreeRow;
           return tr.isTreeHeader ? tr.childCount : getDescendantCount(tr.id, taxa);
       }
       if (colId === 'cultivar' && row.rank === 'cultivar') return row.name;
       // @ts-ignore
       return row[colId];
  };

  const filteredData = useMemo(() => {
    return taxa.filter(item => {
        for (const [key, value] of Object.entries(textFilters)) {
            if (!value) continue;
            const itemVal = String(getRowValue(item, key) || '').toLowerCase();
            if (!itemVal.includes(value.toLowerCase())) return false;
        }
        for (const [key, values] of Object.entries(multiFilters)) {
            if (values.length === 0) continue;
            // @ts-ignore
            if (!values.includes(item[key])) return false;
        }
        return true;
    });
  }, [taxa, textFilters, multiFilters]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      if (sortConfig.key === 'rank') {
          // @ts-ignore
          const rankA = RANK_HIERARCHY[(a.rank || '').toLowerCase()] || 99;
          // @ts-ignore
          const rankB = RANK_HIERARCHY[(b.rank || '').toLowerCase()] || 99;
          return sortConfig.direction === 'asc' ? rankA - rankB : rankB - rankA;
      } else {
          // Sort by numeric value if sorting by count
          if (sortConfig.key === 'childCount') {
             const countA = getRowValue(a, 'childCount') as number;
             const countB = getRowValue(b, 'childCount') as number;
             return sortConfig.direction === 'asc' ? countA - countB : countB - countA;
          }
          const aValue = String(getRowValue(a, String(sortConfig.key)) || '').toLowerCase();
          const bValue = String(getRowValue(b, String(sortConfig.key)) || '').toLowerCase();
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      }
    });
  }, [filteredData, sortConfig, taxa]); 

  // --- TREE GRID LOGIC ---
  const gridRows = useMemo(() => {
      if (groupBy.length === 0) return sortedData;

      const outputRows: TreeRow[] = [];
      const bucketKey = (row: Taxon, depth: number) => {
          const field = groupBy[depth];
          return String(getRowValue(row, field) || ''); 
      };

      const findHeaderTaxon = (candidates: Taxon[], field: string, value: string): Taxon | undefined => {
          return candidates.find(t => {
             const valMatches = String(getRowValue(t, field)) === value;
             if (!valMatches) return false;
             
             // Smart mapping for group headers
             if (field === 'genus') return t.rank === 'genus';
             if (field === 'species') return t.rank === 'species';
             if (field === 'infraspecies') return ['variety', 'subspecies', 'form'].includes(t.rank);
             
             return t.rank.toLowerCase() === field.toLowerCase();
          });
      };

      const processLevel = (subset: Taxon[], depth: number, parentPath: string) => {
          if (depth >= groupBy.length) {
              const sorted = subset.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
              sorted.forEach(t => outputRows.push({ ...t, depth, treePath: `${parentPath}/${t.id}` }));
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
                  rank: field as any, 
                  name: key,
                  scientificName: key,
                  taxonomicStatus: 'Accepted',
                  family: firstChild?.family,
                  genus: firstChild?.genus,
                  genusHybrid: firstChild?.genusHybrid,
                  species: firstChild?.species,
                  speciesHybrid: firstChild?.speciesHybrid,
                  synonyms: [], referenceLinks: [], createdAt: 0
              } as any;

              const childCount = getDescendantCount(headerRow.id, taxa);
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

      processLevel(sortedData, 0, 'root');
      return outputRows;
  }, [sortedData, groupBy, collapsedGroups, taxa]);

  const toggleGroup = (path: string) => {
      const next = new Set(collapsedGroups);
      if (next.has(path)) next.delete(path); else next.add(path);
      setCollapsedGroups(next);
  };
  
  const expandToLevel = (targetDepth: number) => {
      const groupsToCollapse = new Set<string>();
      const simulateLevel = (subset: Taxon[], depth: number, parentPath: string) => {
          if (depth >= groupBy.length) return;
          const field = groupBy[depth];
          const groups: Record<string, Taxon[]> = {};
          subset.forEach(row => {
              const val = String(getRowValue(row, field) || '');
              if (!groups[val]) groups[val] = [];
              groups[val].push(row);
          });
          Object.keys(groups).forEach(key => {
              const path = `${parentPath}/${key}`;
              if (key === '' || key === 'undefined' || key === 'null') {
                  simulateLevel(groups[key], depth + 1, parentPath);
                  return;
              }
              if (depth >= targetDepth - 1) groupsToCollapse.add(path);
              simulateLevel(groups[key], depth + 1, path);
          });
      };
      if (targetDepth === 4) { setCollapsedGroups(new Set()); } 
      else { if(groupBy.length > 0) simulateLevel(sortedData, 0, 'root'); setCollapsedGroups(groupsToCollapse); }
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
          if (colDef?.lockWidth) return; // Skip locked columns

          if (k === 'scientificName') updates[k] = Math.max(ideals[k], 180); 
          else updates[k] = Math.min(ideals[k], limit); 
      }); 
      setColWidths(prev => ({...prev, ...updates})); 
  };
  
  const fitToScreen = () => { 
      if (!containerRef.current) return; 
      const ideals = getIdealWidths(); 
      const availableWidth = containerRef.current.clientWidth - 2; 

      // Separation of columns
      const lockedCols = activeColumns.filter(c => c.lockWidth);
      const flexCols = activeColumns.filter(c => !c.lockWidth);

      // 1. Calculate Fixed Space (using CURRENT widths for locked columns)
      let lockedWidth = 0;
      lockedCols.forEach(col => {
          lockedWidth += (colWidths[col.id] || col.defaultWidth);
      });

      const flexAvailable = Math.max(0, availableWidth - lockedWidth);

      if (flexCols.length === 0) return;

      // 2. Distribute remaining space among flex columns
      let minIdeal = 9999; 
      flexCols.forEach(col => { 
          const w = ideals[col.id] || 50;
          if(w < minIdeal) minIdeal = w; 
      }); 
      
      const ratio = preferences.fitScreenMaxRatio || 4.0; 
      const maxAllowed = minIdeal * ratio; 
      const cappedIdeals: Record<ColumnId, number> = {}; 
      let totalCappedWidth = 0; 
      
      flexCols.forEach(col => { 
          let w = ideals[col.id]; 
          if (['rank', 'taxonomicStatus', 'reviewed'].includes(String(col.id))) w = Math.max(w, 110); 
          if (col.id === 'scientificName') w = Math.max(w, 180); 
          else w = Math.min(w, maxAllowed); 
          cappedIdeals[col.id] = w; 
          totalCappedWidth += w; 
      }); 
      
      const newWidths: Record<ColumnId, number> = {}; 
      if (totalCappedWidth < flexAvailable) { 
          const extraSpace = flexAvailable - totalCappedWidth; 
          flexCols.forEach(col => { 
              const share = cappedIdeals[col.id] / totalCappedWidth; 
              newWidths[col.id] = Math.floor(cappedIdeals[col.id] + (extraSpace * share)); 
          }); 
      } else { 
          const scale = flexAvailable / totalCappedWidth; 
          flexCols.forEach(col => { 
              let w = cappedIdeals[col.id] * scale; 
              if (col.id === 'scientificName') w = Math.max(w, 150); 
              if (['rank', 'taxonomicStatus', 'reviewed'].includes(String(col.id))) w = Math.max(w, 80); 
              newWidths[col.id] = Math.max(40, Math.floor(w)); 
          }); 
      } 
      setColWidths(prev => ({...prev, ...newWidths})); 
  };
  
  const handleSort = (key: ColumnId) => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'; setSortConfig({ key, direction }); };
  const handleTextFilterChange = (key: string, val: string) => setTextFilters(p => ({ ...p, [key]: val }));
  const handleMultiFilterChange = (key: string, vals: string[]) => setMultiFilters(p => ({ ...p, [key]: vals }));
  const toggleColumn = (id: ColumnId) => { const next = new Set(visibleColumns); if (next.has(id)) next.delete(id); else next.add(id); setVisibleColumns(next); };
  const handleDragStart = (e: React.DragEvent, id: ColumnId) => { if (allColumns.find(c=>c.id===id)?.disableDrag) return; setDraggedColumn(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, targetId: ColumnId) => { e.preventDefault(); if (!draggedColumn || draggedColumn === targetId) return; const newOrder = [...columnOrder]; const sIdx = newOrder.indexOf(draggedColumn); const tIdx = newOrder.indexOf(targetId); newOrder.splice(sIdx, 1); newOrder.splice(tIdx, 0, draggedColumn); setColumnOrder(newOrder); setDraggedColumn(null); };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center z-20 relative flex-shrink-0">
         <div className="text-xs text-slate-500 font-medium px-2 flex gap-4"><span>{sortedData.length} records found</span></div>
         <div className="flex items-center gap-2">
             
             {isHierarchyMode && (
                 <div className="flex bg-white border border-slate-300 rounded shadow-sm overflow-hidden mr-2">
                     <button onClick={() => expandToLevel(1)} className="px-2 py-1.5 hover:bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-600" title="Collapse All (Show Genus)">1</button>
                     <button onClick={() => expandToLevel(2)} className="px-2 py-1.5 hover:bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-600" title="Show Species">2</button>
                     <button onClick={() => expandToLevel(3)} className="px-2 py-1.5 hover:bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-600" title="Show Infraspecies">3</button>
                     <button onClick={() => expandToLevel(4)} className="px-2 py-1.5 hover:bg-slate-50 text-xs font-bold text-slate-600" title="Expand All">4</button>
                 </div>
             )}

             <div className="relative" ref={legendRef}>
                 <button onClick={() => setShowLegend(!showLegend)} className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm ${showLegend ? 'bg-slate-100 text-leaf-600' : 'bg-white text-slate-600'}`}><Info size={14} /> Legend</button>
                 {showLegend && (<div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Taxonomic Ranks</h4><div className="grid grid-cols-2 gap-2">{Object.entries(RANK_COLORS).map(([rank, color]) => (<div key={rank} className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full border ${color.split(' ')[0]} ${color.split(' ')[2]}`}></span><span className="text-xs text-slate-600 capitalize">{rank}</span></div>))}</div></div>)}
             </div>
             <button onClick={fitToScreen} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm" title="Fit columns to current screen width"><Monitor size={14} /> Fit Screen</button>
             <button onClick={autoFitContent} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm" title="Resize columns to fit content"><Maximize size={14} /> Auto Fit</button>
             <div className="relative" ref={colPickerRef}>
                 <button onClick={() => setShowColPicker(!showColPicker)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"><Settings size={14} /> Columns</button>
                 {showColPicker && (<div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 max-h-[60vh] overflow-y-auto"><div className="flex justify-between items-center mb-2 px-1"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visible Columns</div><button onClick={() => setVisibleColumns(new Set(allColumns.map(c=>c.id)))} className="text-[10px] text-blue-600 hover:underline">Select All</button></div><div className="space-y-0.5">{allColumns.map(col => (<div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded"><div className={`w-3 h-3 rounded flex items-center justify-center border flex-shrink-0 ${visibleColumns.has(col.id) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300'}`}>{visibleColumns.has(col.id) && <Check size={10} className="text-white"/>}</div><span className="text-xs text-slate-700 truncate">{col.label}</span></div>))}</div></div>)}
             </div>
         </div>
      </div>
      <div className="flex-1 overflow-auto" ref={containerRef}>
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
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevent sort/drag if any
                                        setIsHierarchyMode(!isHierarchyMode);
                                    }}
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
                  
                  // Compute background for all rows
                  const rankBaseColor = RANK_BASE_COLORS[String(tr.rank).toLowerCase()];
                  const rowBgClass = rankBaseColor ? `bg-${rankBaseColor}-50` : ''; 

                  const renderCells = () => activeColumns.map((col, idx) => {
                      // Tree Control Column
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

                      // Child Count - Using recursive helper on FULL dataset
                      if (col.id === 'childCount') {
                          // For header, show count of group. For row, show recursive descendants.
                          const count = tr.isTreeHeader ? tr.childCount : getDescendantCount(tr.id, taxa);
                          return <td key={String(col.id)} className="p-2 border-r border-slate-200 text-xs text-center text-slate-400 font-mono">{count || ''}</td>;
                      }

                      const val = getRowValue(tr, String(col.id));
                      let displayVal: React.ReactNode = val || '';
                      
                      // Bold Logic: Applies to both Header and Data Rows
                      let isBold = false;
                      const r = String(tr.rank).toLowerCase();
                      const coreCols = ['genus', 'species', 'cultivar', 'infraspecies', 'infraspecificRank', 'scientificName'];
                      
                      // CORE LOGIC: Bold the column that matches the rank
                      if (coreCols.includes(String(col.id))) {
                           // If rank matches column name directly
                           if (r === String(col.id)) isBold = true;
                           // Special mapping for infraspecies
                           if (String(col.id) === 'infraspecies' && ['variety','subspecies','form'].includes(r)) isBold = true;
                      }

                      // Dim Logic: Applies to both
                      let isDimmed = false;
                      const rowRankLevel = RANK_HIERARCHY[r] || 99;
                      const colRankLevel = COLUMN_RANK_MAP[String(col.id)];
                      if (colRankLevel && colRankLevel < rowRankLevel) {
                          isDimmed = true;
                      }
                      
                      // Formatting
                      if (col.id === 'rank') {
                          const rankStyle = RANK_COLORS[r] || 'bg-slate-100 text-slate-500';
                          displayVal = <span className={`px-2 py-0.5 text-[10px] rounded border uppercase font-bold ${rankStyle}`}>{val as string}</span>;
                      } else if (col.id === 'scientificName') {
                          displayVal = formatFullScientificName(tr, preferences);
                      } else if (col.id === 'taxonomicStatus') {
                           displayVal = <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold ${val === 'Accepted' ? 'bg-green-50 text-green-600' : ''} ${val === 'Synonym' ? 'bg-slate-100 text-slate-500' : ''} ${val === 'Artificial' ? 'bg-yellow-50 text-yellow-600' : ''}`}>{val as string || '-'}</span>;
                      } else if (col.id === 'actions') {
                          const isMineable = ['genus', 'species', 'subspecies', 'variety', 'form', 'hybrid', 'grex'].includes(r);
                          displayVal = (
                              <div className="flex items-center justify-center gap-1">
                                  {isMineable ? (
                                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction && onAction('mine', tr); }} className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer relative z-50 active:scale-95 shadow-sm" title={`Deep Mine Cultivars`}><Pickaxe size={14} className="pointer-events-none" /></button>
                                  ) : (
                                      <div className="p-1.5 bg-slate-50 border border-slate-100 rounded text-slate-300 cursor-not-allowed"><Pickaxe size={14} /></div>
                                  )}
                                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction && onAction('enrich', tr); }} className="p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer relative z-50 active:scale-95 shadow-sm" title={`Enrich details`}><Wand2 size={14} className="pointer-events-none" /></button>
                              </div>
                          );
                      }
                      
                      const content = (
                          <span className={`${isBold ? "font-bold text-slate-900" : ""} ${isDimmed ? "text-slate-400 font-normal" : ""}`}>
                              {displayVal}
                          </span>
                      );

                      // Center text for narrow columns if requested
                      const textAlignClass = col.headerAlign === 'center' ? 'text-center' : '';

                      return <td key={String(col.id)} className={`p-2 border-r border-slate-50 truncate overflow-hidden max-w-0 ${textAlignClass}`} title={String(val || '')}>{content}</td>;
                  });

                  // Render Row (Unified)
                  return (
                     <tr key={String(tr.id)} className={`hover:bg-blue-50/50 transition-colors ${rowBgClass} ${tr.isTreeHeader ? 'cursor-pointer group/header border-b-2 border-slate-200' : ''}`} onClick={tr.isTreeHeader ? () => toggleGroup(tr.treePath || '') : undefined}>
                        {renderCells()}
                     </tr>
                  );
              })}
              {gridRows.length === 0 && (<tr><td colSpan={activeColumns.length} className="p-8 text-center text-slate-400 italic">No records found matching filters.</td></tr>)}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataGridV2;
