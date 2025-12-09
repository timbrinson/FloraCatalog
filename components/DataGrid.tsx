
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Taxon, UserPreferences } from '../types';
import { ArrowUpDown, Settings, Check, ChevronDown, GripVertical, Maximize, Monitor, Pickaxe, Info, Wand2 } from 'lucide-react';
import { formatFullScientificName } from '../utils/formatters';

interface DataGridProps {
  taxa: Taxon[];
  onAction?: (action: 'mine' | 'enrich', taxon: Taxon) => void;
  preferences: UserPreferences;
}

// Rank Hierarchy for Sorting (Top Down)
const RANK_HIERARCHY: Record<string, number> = {
    'family': 1,
    'genus': 2,
    'species': 3,
    'subspecies': 4,
    'variety': 5,
    'form': 6,
    'hybrid': 7,
    'grex': 8,
    'cultivar': 9,
};

// Rainbow Gradient for Ranks (ROYGBIV-ish)
const RANK_COLORS: Record<string, string> = {
    'family': 'bg-rose-50 text-rose-700 border-rose-100', // Red/Pink
    'genus': 'bg-orange-50 text-orange-700 border-orange-100', // Orange
    'species': 'bg-amber-50 text-amber-700 border-amber-100', // Yellow/Amber
    'subspecies': 'bg-lime-50 text-lime-700 border-lime-100', // Yellow-Green
    'variety': 'bg-emerald-50 text-emerald-700 border-emerald-100', // Green
    'form': 'bg-teal-50 text-teal-700 border-teal-100', // Teal
    'hybrid': 'bg-cyan-50 text-cyan-700 border-cyan-100', // Cyan
    'grex': 'bg-sky-50 text-sky-700 border-sky-100', // Blue
    'cultivar': 'bg-violet-50 text-violet-700 border-violet-100', // Violet/Purple
};

// Helper for multi-select dropdown
const MultiSelectFilter = ({ 
    options, 
    selected, 
    onChange, 
    label 
}: { 
    options: string[], 
    selected: string[], 
    onChange: (val: string[]) => void,
    label: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div className="relative w-full" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-600 focus:border-leaf-300 focus:ring-1 focus:ring-leaf-200 flex justify-between items-center"
            >
                <span className="truncate">
                    {selected.length === 0 ? `All ${label}s` : `${selected.length} selected`}
                </span>
                <ChevronDown size={12} className="opacity-50"/>
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 max-h-48 overflow-y-auto min-w-[150px]">
                    <div 
                        className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                        onClick={() => { onChange([]); setIsOpen(false); }}
                    >
                        Clear Filter
                    </div>
                    {options.map(opt => (
                        <div 
                            key={opt}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-leaf-50 cursor-pointer"
                            onClick={() => toggleOption(opt)}
                        >
                            <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(opt) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300 bg-white'}`}>
                                {selected.includes(opt) && <Check size={10} className="text-white"/>}
                            </div>
                            <span className="text-xs text-slate-700 capitalize whitespace-normal">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const DataGrid: React.FC<DataGridProps> = ({ taxa, onAction, preferences }) => {
  // --- Column Definition ---
  type ColumnId = string; 
  
  interface ColumnConfig {
      id: ColumnId;
      label: string;
      defaultWidth: number;
      filterType?: 'text' | 'multi-select';
      filterOptions?: string[]; // for multi-select
  }

  // COMPLETE WCVP SCHEMA + APP FIELDS
  const allColumns: ColumnConfig[] = [
      { id: 'actions', label: 'Actions', defaultWidth: 70, filterType: undefined }, 
      { id: 'scientificName', label: 'Scientific Name', defaultWidth: 200, filterType: 'text' },
      { id: 'name', label: 'Specific Name', defaultWidth: 120, filterType: 'text' },
      { id: 'rank', label: 'Rank', defaultWidth: 110, filterType: 'multi-select', filterOptions: ['family', 'genus', 'species', 'subspecies', 'variety', 'form', 'hybrid', 'cultivar', 'grex'] },
      { id: 'taxonomicStatus', label: 'Status', defaultWidth: 110, filterType: 'multi-select', filterOptions: ['Accepted', 'Synonym', 'Unresolved', 'Artificial'] },
      
      // Hierarchy Debugging
      { id: 'id', label: 'Internal ID (UUID)', defaultWidth: 250, filterType: 'text' },
      { id: 'parentId', label: 'Parent ID', defaultWidth: 250, filterType: 'text' },
      
      { id: 'family', label: 'Family', defaultWidth: 120, filterType: 'text' },
      { id: 'commonName', label: 'Common Name', defaultWidth: 150, filterType: 'text' },
      
      // Authorship
      { id: 'authorship', label: 'Authorship', defaultWidth: 150, filterType: 'text' },
      { id: 'parentheticalAuthor', label: 'Parenthetical Author', defaultWidth: 140, filterType: 'text' },
      { id: 'publicationAuthor', label: 'Pub. Author', defaultWidth: 120, filterType: 'text' },
      
      // IDs
      { id: 'plantNameId', label: 'WCVP ID', defaultWidth: 100, filterType: 'text' }, 
      { id: 'ipniId', label: 'IPNI ID', defaultWidth: 100, filterType: 'text' },
      { id: 'powoId', label: 'POWO ID', defaultWidth: 100, filterType: 'text' },
      { id: 'acceptedNameId', label: 'Accepted ID', defaultWidth: 100, filterType: 'text' },
      
      // Publication
      { id: 'publication', label: 'Publication', defaultWidth: 200, filterType: 'text' },
      { id: 'volumeAndPage', label: 'Vol/Page', defaultWidth: 100, filterType: 'text' },
      { id: 'firstPublished', label: 'First Published', defaultWidth: 120, filterType: 'text' },
      { id: 'nomenclaturalRemarks', label: 'Nom. Remarks', defaultWidth: 150, filterType: 'text' },
      { id: 'reviewed', label: 'Reviewed', defaultWidth: 90, filterType: 'multi-select', filterOptions: ['Y', 'N'] },
      
      // Biology & Geography
      { id: 'geographicArea', label: 'Geography', defaultWidth: 180, filterType: 'text' },
      { id: 'lifeformDescription', label: 'Lifeform', defaultWidth: 120, filterType: 'text' },
      { id: 'climateDescription', label: 'Climate', defaultWidth: 120, filterType: 'text' },
      
      // Hybrid
      { id: 'genusHybrid', label: 'Genus Hyb.', defaultWidth: 80, filterType: 'text' },
      { id: 'speciesHybrid', label: 'Sp. Hyb.', defaultWidth: 80, filterType: 'text' },
      { id: 'hybridFormula', label: 'Hybrid Formula', defaultWidth: 150, filterType: 'text' },
      
      // Misc
      { id: 'description', label: 'Description', defaultWidth: 250, filterType: 'text' },
  ];

  // --- State ---
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set([
      'actions', 'scientificName', 'rank', 'taxonomicStatus', 'family', 'authorship', 'geographicArea', 'commonName'
  ]));
  
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(allColumns.map(c => c.id));
  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const [colWidths, setColWidths] = useState<Record<ColumnId, number>>(
      Object.fromEntries(allColumns.map(c => [c.id, c.defaultWidth]))
  );

  const [showColPicker, setShowColPicker] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const [textFilters, setTextFilters] = useState<Record<string, string>>({});
  const [multiFilters, setMultiFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<{ key: ColumnId; direction: 'asc' | 'desc' } | null>(null);
  const resizingRef = useRef<{ colId: ColumnId, startX: number, startWidth: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs for popup click-outside
  const legendRef = useRef<HTMLDivElement>(null);
  const colPickerRef = useRef<HTMLDivElement>(null);

  // Click Outside Handler for Popups
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as Node;
          if (showLegend && legendRef.current && !legendRef.current.contains(target)) {
              setShowLegend(false);
          }
          if (showColPicker && colPickerRef.current && !colPickerRef.current.contains(target)) {
              setShowColPicker(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLegend, showColPicker]);

  // --- Computed Active Columns ---
  const activeColumns = useMemo(() => {
      return columnOrder
        .filter(id => visibleColumns.has(id))
        .map(id => allColumns.find(c => c.id === id))
        .filter((c): c is ColumnConfig => !!c);
  }, [columnOrder, visibleColumns]);


  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return taxa.filter(item => {
        for (const [key, value] of Object.entries(textFilters)) {
            if (!value) continue;
            const rawVal = (item as any)[key];
            const itemVal = String(rawVal || '').toLowerCase();
            if (!itemVal.includes(value.toLowerCase())) return false;
        }
        for (const [key, values] of Object.entries(multiFilters)) {
            if (values.length === 0) continue;
            const rawVal = (item as any)[key];
            if (!values.includes(rawVal)) return false;
        }
        return true;
    });
  }, [taxa, textFilters, multiFilters]);

  // --- Sort Logic ---
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      if (sortConfig.key === 'rank') {
          const rankA = RANK_HIERARCHY[(a.rank || '').toLowerCase()] || 99;
          const rankB = RANK_HIERARCHY[(b.rank || '').toLowerCase()] || 99;
          return sortConfig.direction === 'asc' ? rankA - rankB : rankB - rankA;
      } else {
          const rawA = (a as any)[sortConfig.key];
          const rawB = (b as any)[sortConfig.key];
          const aValue = String(rawA || '').toLowerCase();
          const bValue = String(rawB || '').toLowerCase();
          
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      }
    });
  }, [filteredData, sortConfig]);

  // --- Resizing Handlers ---
  const handleResizeStart = (e: React.MouseEvent, colId: ColumnId) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = { colId, startX: e.clientX, startWidth: colWidths[colId] || 100 };
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { colId, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      setColWidths(prev => ({ ...prev, [colId]: Math.max(50, startWidth + diff) }));
  }, []);

  const handleResizeEnd = useCallback(() => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
  }, [handleResizeMove]);

  // --- Fit Algorithms ---
  const getIdealWidths = () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return {};
    context.font = '14px Inter, sans-serif';

    const idealWidths: Record<ColumnId, number> = {};
    const sampleSize = 100; 
    
    activeColumns.forEach(col => {
        let maxWidth = context.measureText(col.label).width + 24; 
        const rowsToCheck = taxa.slice(0, sampleSize);
        rowsToCheck.forEach(row => {
             const val = String((row as any)[col.id] || '');
             const width = context.measureText(val).width + 16; 
             maxWidth = Math.max(maxWidth, width);
        });
        maxWidth = Math.max(maxWidth, 50); 
        idealWidths[col.id] = Math.ceil(maxWidth);
    });
    return idealWidths;
  };

  const autoFitContent = () => {
      const ideals = getIdealWidths();
      const limit = preferences.autoFitMaxWidth || 400; 
      
      Object.keys(ideals).forEach(k => {
          if (k === 'scientificName') {
              ideals[k] = Math.max(ideals[k], 180);
          } else {
              ideals[k] = Math.min(ideals[k], limit); // Apply limit
          }
      });
      setColWidths(prev => ({...prev, ...ideals}));
  };

  const fitToScreen = () => {
      if (!containerRef.current) return;
      const ideals = getIdealWidths();
      const availableWidth = containerRef.current.clientWidth - 2; 
      
      // Calculate minimum viable widths
      let minIdeal = 9999;
      Object.values(ideals).forEach(w => { if(w < minIdeal) minIdeal = w; });
      
      // Enforce the "Max Ratio" constraint (Cap long columns)
      const ratio = preferences.fitScreenMaxRatio || 4.0;
      const maxAllowed = minIdeal * ratio;
      
      // Adjust ideal widths based on constraints before scaling
      const cappedIdeals: Record<ColumnId, number> = {};
      let totalCappedWidth = 0;
      
      activeColumns.forEach(col => {
          let w = ideals[col.id];
          
          if (['rank', 'taxonomicStatus', 'reviewed'].includes(col.id as string)) {
              w = Math.max(w, 110);
          }

          if (col.id === 'scientificName') {
              w = Math.max(w, 180);
          } else {
              w = Math.min(w, maxAllowed);
          }
          
          cappedIdeals[col.id] = w;
          totalCappedWidth += w;
      });

      const newWidths: Record<ColumnId, number> = {};
      
      if (totalCappedWidth < availableWidth) {
          // Extra Space -> Distribute proportionally
          const extraSpace = availableWidth - totalCappedWidth;
          activeColumns.forEach(col => {
              const share = cappedIdeals[col.id] / totalCappedWidth;
              newWidths[col.id] = Math.floor(cappedIdeals[col.id] + (extraSpace * share));
          });
      } else {
          // Compress -> Shrink proportionally
          const scale = availableWidth / totalCappedWidth;
          activeColumns.forEach(col => {
              let w = cappedIdeals[col.id] * scale;
              if (col.id === 'scientificName') w = Math.max(w, 150);
              // Protect UI columns from being crushed too small
              if (['rank', 'taxonomicStatus', 'reviewed'].includes(col.id as string)) w = Math.max(w, 80);
              
              newWidths[col.id] = Math.max(40, Math.floor(w));
          });
      }
      
      setColWidths(prev => ({...prev, ...newWidths}));
  };

  // Handlers
  const handleSort = (key: ColumnId) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  const handleTextFilterChange = (key: string, val: string) => setTextFilters(p => ({ ...p, [key]: val }));
  const handleMultiFilterChange = (key: string, vals: string[]) => setMultiFilters(p => ({ ...p, [key]: vals }));
  const toggleColumn = (id: ColumnId) => {
      const next = new Set(visibleColumns);
      if (next.has(id)) next.delete(id); else next.add(id);
      setVisibleColumns(next);
  };
  const handleDragStart = (e: React.DragEvent, id: ColumnId) => { setDraggedColumn(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, targetId: ColumnId) => {
      e.preventDefault();
      if (!draggedColumn || draggedColumn === targetId) return;
      const newOrder = [...columnOrder];
      const sIdx = newOrder.indexOf(draggedColumn);
      const tIdx = newOrder.indexOf(targetId);
      newOrder.splice(sIdx, 1);
      newOrder.splice(tIdx, 0, draggedColumn);
      setColumnOrder(newOrder);
      setDraggedColumn(null);
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center z-20 relative flex-shrink-0">
         <div className="text-xs text-slate-500 font-medium px-2 flex gap-4">
             <span>{sortedData.length} records found</span>
         </div>
         <div className="flex items-center gap-2">
             {/* Legend Button */}
             <div className="relative" ref={legendRef}>
                 <button 
                    onClick={() => setShowLegend(!showLegend)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm ${showLegend ? 'bg-slate-100 text-leaf-600' : 'bg-white text-slate-600'}`}
                 >
                     <Info size={14} /> Legend
                 </button>
                 {showLegend && (
                     <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Taxonomic Ranks</h4>
                         <div className="grid grid-cols-2 gap-2">
                             {Object.entries(RANK_COLORS).map(([rank, color]) => (
                                 <div key={rank} className="flex items-center gap-2">
                                     <span className={`w-3 h-3 rounded-full border ${color.split(' ')[0]} ${color.split(' ')[2]}`}></span>
                                     <span className="text-xs text-slate-600 capitalize">{rank}</span>
                                 </div>
                             ))}
                         </div>
                         <div className="mt-3 pt-3 border-t border-slate-100">
                             <p className="text-[10px] text-slate-400 leading-tight">
                                 <strong>Hybrids:</strong> Denoted by '×' (Intergeneric) or 'x' (Interspecific). Colors (Cyan) highlight hybrid ranks.
                             </p>
                         </div>
                     </div>
                 )}
             </div>

             <button 
                onClick={fitToScreen}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"
                title="Fit columns to current screen width"
             >
                 <Monitor size={14} /> Fit Screen
             </button>

             <button 
                onClick={autoFitContent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"
                title="Resize columns to fit content"
             >
                 <Maximize size={14} /> Auto Fit
             </button>

             <div className="relative" ref={colPickerRef}>
                 <button 
                    onClick={() => setShowColPicker(!showColPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 shadow-sm"
                 >
                     <Settings size={14} /> Columns
                 </button>
                 {showColPicker && (
                     <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 max-h-[60vh] overflow-y-auto">
                         <div className="flex justify-between items-center mb-2 px-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visible Columns</div>
                            <button onClick={() => setVisibleColumns(new Set(allColumns.map(c=>c.id)))} className="text-[10px] text-blue-600 hover:underline">Select All</button>
                         </div>
                         <div className="space-y-0.5">
                            {allColumns.map(col => (
                                <div 
                                    key={String(col.id)} 
                                    onClick={() => toggleColumn(col.id)}
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded"
                                >
                                    <div className={`w-3 h-3 rounded flex items-center justify-center border flex-shrink-0 ${visibleColumns.has(col.id) ? 'bg-leaf-500 border-leaf-500' : 'border-slate-300'}`}>
                                        {visibleColumns.has(col.id) && <Check size={10} className="text-white"/>}
                                    </div>
                                    <span className="text-xs text-slate-700 truncate">{col.label}</span>
                                </div>
                            ))}
                         </div>
                     </div>
                 )}
             </div>
         </div>
      </div>

      {/* --- THE GRID --- */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-0 table-fixed">
           <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wide shadow-sm">
              {/* Row 1: Headers */}
              <tr>
                  {activeColumns.map(col => (
                      <th 
                        key={String(col.id)} 
                        className={`border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50 select-none relative group
                           ${draggedColumn === col.id ? 'opacity-50 bg-slate-200' : ''}`}
                        style={{ width: colWidths[col.id], minWidth: 50 }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, col.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                      >
                         <div className="flex items-center justify-between gap-1 p-2 h-full w-full">
                             <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing overflow-hidden" onClick={() => handleSort(col.id)}>
                                {col.id !== 'actions' && <GripVertical size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-move flex-shrink-0" />}
                                <span className="truncate">{col.label}</span>
                             </div>
                             {col.id !== 'actions' && (
                                 <button onClick={() => handleSort(col.id)} className="flex-shrink-0">
                                    <ArrowUpDown size={12} className={sortConfig?.key === col.id ? 'text-leaf-600' : 'text-slate-300 hover:text-slate-500'}/>
                                 </button>
                             )}
                         </div>
                         {col.id !== 'actions' && (
                            <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-leaf-400 z-20"
                                onMouseDown={(e) => handleResizeStart(e, col.id)}
                            />
                         )}
                      </th>
                  ))}
              </tr>
              {/* Row 2: Filters */}
              <tr>
                  {activeColumns.map(col => (
                      <th key={`${String(col.id)}-filter`} className="p-1 border-b border-slate-200 border-r border-slate-100 bg-slate-50/80">
                          {col.id === 'actions' ? null : 
                           col.filterType === 'multi-select' ? (
                              <MultiSelectFilter 
                                  label={col.label}
                                  options={col.filterOptions || []}
                                  selected={multiFilters[col.id as string] || []}
                                  onChange={(vals) => handleMultiFilterChange(col.id as string, vals)}
                              />
                          ) : (
                              <input 
                                  className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded outline-none focus:border-leaf-300 focus:ring-1 focus:ring-leaf-200 placeholder:text-slate-300 font-normal"
                                  placeholder={`Filter...`}
                                  value={textFilters[col.id as string] || ''}
                                  onChange={e => handleTextFilterChange(col.id as string, e.target.value)}
                              />
                          )}
                      </th>
                  ))}
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {sortedData.map(row => (
                 <tr key={String(row.id)} className="hover:bg-blue-50/50 transition-colors">
                    {activeColumns.map(col => {
                        // @ts-ignore
                        const val = row[col.id];
                        let displayVal = val || '';
                        
                        if (col.id === 'rank') {
                            const rankStyle = RANK_COLORS[String(val).toLowerCase()] || 'bg-slate-100 text-slate-500';
                            displayVal = <span className={`px-2 py-0.5 text-[10px] rounded border uppercase font-bold ${rankStyle}`}>{val}</span>;
                        }
                        else if (col.id === 'scientificName') {
                            displayVal = formatFullScientificName(row, preferences);
                        }
                        else if (col.id === 'taxonomicStatus') {
                             displayVal = <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold ${val === 'Accepted' ? 'bg-green-50 text-green-600' : ''} ${val === 'Synonym' ? 'bg-slate-100 text-slate-500' : ''} ${val === 'Artificial' ? 'bg-yellow-50 text-yellow-600' : ''}`}>{val || '-'}</span>;
                        }
                        else if (col.id === 'actions') {
                            const isMineable = ['genus', 'species', 'subspecies', 'variety', 'form', 'hybrid', 'grex'].includes(String(row.rank).toLowerCase());
                            displayVal = (
                                <div className="flex items-center gap-1">
                                    {isMineable && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction && onAction('mine', row); }}
                                            className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer relative z-50 active:scale-95 shadow-sm"
                                            title={`Deep Mine Cultivars for ${row.scientificName || row.name}`}
                                        >
                                            <Pickaxe size={14} className="pointer-events-none" />
                                        </button>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction && onAction('enrich', row); }}
                                        className="p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer relative z-50 active:scale-95 shadow-sm"
                                        title={`Enrich details for ${row.scientificName || row.name}`}
                                    >
                                        <Wand2 size={14} className="pointer-events-none" />
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <td key={String(col.id)} className="p-2 border-r border-slate-50 last:border-r-0 text-slate-600 truncate overflow-hidden max-w-0" title={String(val || '')}>
                                {displayVal}
                            </td>
                        );
                    })}
                 </tr>
              ))}
              {sortedData.length === 0 && (
                 <tr>
                    <td colSpan={activeColumns.length} className="p-8 text-center text-slate-400 italic">No records found matching filters.</td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataGrid;
