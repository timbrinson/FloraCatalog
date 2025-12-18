
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Plus, RotateCcw, Table, Network, Upload, X, Settings as SettingsIcon, Wrench, Activity, AlertCircle } from 'lucide-react';
import { Taxon, LoadingState, TaxonomicStatus, UserPreferences, BackgroundProcess, ActivityItem, SearchCandidate } from './types';
import { identifyTaxonomy, enrichTaxon, deepScanTaxon, parseBulkText, searchTaxonCandidates } from './services/geminiService';
import { dataService } from './services/dataService';
import { getIsOffline } from './services/supabaseClient';
import TaxonRow from './components/PlantCard';
import EmptyState from './components/EmptyState';
import DataGridV2 from './components/DataGridV2';
import ConfirmDialog from './components/ConfirmDialog';
import SettingsModal from './components/SettingsModal';
import ActivityPanel from './components/ActivityPanel';
import { formatScientificName } from './utils/formatters';

function App() {
  const [query, setQuery] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('grid');
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [importText, setImportText] = useState('');
  
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const activityButtonRef = useRef<HTMLDivElement>(null);
  
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingRef = useRef(false);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'taxon_name', direction: 'asc' });
  const [gridFilters, setGridFilters] = useState<Record<string, any>>({});

  const [isOffline, setIsOffline] = useState(getIsOffline());
  const [enrichmentQueue, setEnrichmentQueue] = useState<Taxon[]>([]);
  const activeEnrichmentCount = useRef(0); 
  
  const [preferences, setPreferences] = useState<UserPreferences>({ 
      hybridSpacing: 'space',
      autoEnrichment: false,
      autoFitMaxWidth: 400,
      fitScreenMaxRatio: 4.0,
      colorTheme: 'option2a'
  });
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const cancelledActivityIds = useRef<Set<string>>(new Set());

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel?: string; isDestructive?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchBatch = async (currentOffset: number, isNewSearch: boolean) => {
      const currentOfflineStatus = getIsOffline();
      setIsOffline(currentOfflineStatus);

      if (currentOfflineStatus) {
          setLoadingState(LoadingState.IDLE);
          return;
      }

      if (isFetchingRef.current) return;

      try {
          isFetchingRef.current = true;
          setErrorDetails(null);

          if (isNewSearch) {
              setLoadingState(LoadingState.LOADING);
          } else {
              setIsFetchingMore(true);
          }

          const limit = 100;
          const { data, count } = await dataService.getTaxa({ 
              offset: currentOffset, 
              limit, 
              filters: gridFilters,
              sortBy: sortConfig.key,
              sortDirection: sortConfig.direction
          });

          if (isNewSearch) {
              setTaxa(data);
              setTotalRecords(count);
          } else {
              setTaxa(prev => [...prev, ...data]);
          }

          setHasMore(data.length === limit);
          setLoadingState(LoadingState.SUCCESS);
          setIsFetchingMore(false);

      } catch (e: any) {
          console.error("Failed to load data", e);
          setErrorDetails(e.message || "Unknown database error. Check your table schema.");
          setLoadingState(LoadingState.ERROR);
          setIsFetchingMore(false);
      } finally {
          isFetchingRef.current = false;
      }
  };

  useEffect(() => {
      setOffset(0);
      fetchBatch(0, true);
  }, [gridFilters, sortConfig]);

  const handleFilterChange = (key: string, value: any) => {
      setGridFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSettingsClose = () => {
      setShowSettingsModal(false);
      const newStatus = getIsOffline();
      setIsOffline(newStatus);
      if (!newStatus) {
          fetchBatch(0, true);
      }
  };

  const handleLoadMore = () => {
      if (!hasMore || isFetchingRef.current || loadingState === LoadingState.LOADING) return;
      const nextOffset = offset + 100;
      setOffset(nextOffset);
      fetchBatch(nextOffset, false);
  };

  useEffect(() => {
    const savedPrefs = localStorage.getItem('flora_prefs');
    if (savedPrefs) { try { setPreferences(JSON.parse(savedPrefs)); } catch(e) {} }
  }, []); 

  useEffect(() => { localStorage.setItem('flora_prefs', JSON.stringify(preferences)); }, [preferences]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) { setShowToolsMenu(false); }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToolsMenu]);

  const addActivity = (name: string, type: 'mining' | 'import' | 'enrichment' | 'search', payload?: any, existingId?: string) => {
      const id = existingId || crypto.randomUUID();
      cancelledActivityIds.current.delete(id);
      setActivities(prev => {
          if (prev.some(a => a.id === id)) {
              return prev.map(a => a.id === id ? { ...a, status: 'running', message: 'Starting...', timestamp: Date.now() } : a);
          }
          const newItem: ActivityItem = {
              id, name, type, status: 'running', message: 'Starting...', timestamp: Date.now(), payload, details: payload
          };
          return [newItem, ...prev].slice(0, 50); 
      });
      return id;
  };

  const updateActivity = (id: string, message: string, updates?: Partial<ActivityItem>) => {
      setActivities(prev => prev.map(a => a.id === id ? { ...a, message, ...updates } : a));
  };

  const completeActivity = (id: string, message: string = "Completed") => {
      setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', message, timestamp: Date.now() } : a));
      cancelledActivityIds.current.delete(id);
  };

  const failActivity = (id: string, errorMsg: string, canRetry: boolean = false) => {
      setActivities(prev => prev.map(a => a.id === id ? { 
          ...a, status: 'error', message: errorMsg, canRetry, timestamp: Date.now()
      } : a));
  };
  
  const requireInputActivity = (id: string, message: string, resolution: any) => {
      setActivities(prev => prev.map(a => a.id === id ? { 
          ...a, status: 'needs_input', message, resolution, timestamp: Date.now()
      } : a));
      setShowActivityPanel(true);
  };

  const cancelActivity = (id: string) => {
      cancelledActivityIds.current.add(id);
      updateActivity(id, "Cancelling...");
  };

  const dismissActivity = (id: string) => {
      setActivities(prev => prev.filter(a => a.id !== id));
  };

  const handleRetryActivity = (activity: ActivityItem) => {
      if (activity.type === 'mining' && activity.payload) {
          executeMining(activity.payload, activity.id); 
      } else if (activity.type === 'search' && activity.payload) {
          executeSearch(activity.payload, activity.id);
      }
  };
  
  const handleResolveActivity = async (id: string, choice: 'accept' | 'reject' | 'select', payload?: any) => {
      if (choice === 'reject') {
          dismissActivity(id);
          return;
      }
      
      const activity = activities.find(a => a.id === id);
      if (!activity) return;

      if (payload && (choice === 'accept' || choice === 'select')) {
          const candidate = payload as SearchCandidate;
          updateActivity(id, `Adding ${candidate.taxonName}...`, { status: 'running', resolution: undefined });
          try {
              const chain = await identifyTaxonomy(candidate.taxonName);
              completeActivity(id, `Added ${candidate.taxonName}`);
              fetchBatch(0, true);
          } catch(e) {
              failActivity(id, "Failed to add plant", true);
          }
      }
  };

  const executeMining = async (taxon: Taxon, existingId?: string) => {
      setConfirmState(prev => ({ ...prev, isOpen: false }));
      const displayName = taxon.taxonName || taxon.name;
      const actId = addActivity(`Mining ${displayName}`, 'mining', taxon, existingId);
      
      try {
          await deepScanTaxon(displayName, taxon.taxonRank, async (names, status) => { 
              if (cancelledActivityIds.current.has(actId)) return false;
              updateActivity(actId, status);
              for (const name of names) {
                  try {
                      if (cancelledActivityIds.current.has(actId)) break;
                      await identifyTaxonomy(name);
                  } catch(e) {}
              }
              return true;
          });
          if (cancelledActivityIds.current.has(actId)) {
              failActivity(actId, "Cancelled by user");
          } else {
              completeActivity(actId, "Mining complete");
              fetchBatch(0, true);
          }
      } catch (err: any) {
          console.error("Mining failed:", err);
          failActivity(actId, "Failed: " + err.message, true);
      }
  };

  const executeSearch = async (queryTerm: string, existingId?: string) => {
      const actId = addActivity(`AI Search: "${queryTerm}"`, 'search', queryTerm, existingId);
      
      try {
          const candidates = await searchTaxonCandidates(queryTerm);
          if (candidates.length === 0) {
              failActivity(actId, "No matches found.", true);
              return;
          }

          if (candidates.length > 1 && candidates[0].confidence < 0.95) {
              requireInputActivity(actId, "Multiple matches found.", {
                  type: 'ambiguous',
                  candidates: candidates,
                  originalQuery: queryTerm
              });
              return;
          }

          const topMatch = candidates[0];
          const existing = taxa.find(t => t.taxonName.toLowerCase() === topMatch.taxonName.toLowerCase());

          if (existing) {
              requireInputActivity(actId, "Plant already exists.", {
                  type: 'duplicate',
                  candidates: [topMatch],
                  originalQuery: queryTerm,
                  existingId: existing.id
              });
              return;
          }

          if (topMatch.matchType !== 'exact' || topMatch.taxonName.toLowerCase() !== queryTerm.toLowerCase()) {
               requireInputActivity(actId, `Verify Name: ${topMatch.taxonName}`, {
                  type: 'correction',
                  candidates: [topMatch],
                  originalQuery: queryTerm
              });
              return;
          }

          updateActivity(actId, `Found ${topMatch.taxonName}. Adding...`);
          await identifyTaxonomy(topMatch.taxonName);
          completeActivity(actId, `Added ${topMatch.taxonName}`);
          fetchBatch(0, true);

      } catch (err: any) {
          failActivity(actId, "Search failed: " + err.message, true);
      }
  };

  const handleAddPlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !query.trim()) return;
    executeSearch(query);
    setQuery('');
  };

  const handleMineTaxon = (taxon: Taxon) => {
      setConfirmState({
          isOpen: true,
          title: `Start deep scan for ${taxon.taxonName}?`,
          message: `This will search for all registered cultivars associated with the ${taxon.taxonRank} "${taxon.taxonName}".`,
          confirmLabel: "Start Mining",
          onConfirm: () => executeMining(taxon)
      });
  };
  
  const handleEnrichSingleTaxon = (taxon: Taxon) => {
      setConfirmState({
          isOpen: true,
          title: `Enrich Details?`,
          message: `Fetch additional details (description, links, etc.) for ${taxon.taxonName}?`,
          confirmLabel: "Enrich",
          onConfirm: () => {
              setConfirmState(prev => ({ ...prev, isOpen: false }));
              setEnrichmentQueue([taxon]);
          }
      });
  };

  const handleEnrichmentTools = (mode: 'missing' | 'all_add' | 'all_replace') => {
      setShowToolsMenu(false);
      let targetTaxa: Taxon[] = [];
      if (mode === 'missing') targetTaxa = taxa.filter(t => !t.isDetailsLoaded);
      else targetTaxa = [...taxa];

      if (targetTaxa.length === 0) {
          alert("No matching plants found on current page to enrich.");
          return;
      }

      if (confirm(`Start enrichment for ${targetTaxa.length} plants?`)) {
          if (mode === 'all_replace') setTaxa(prev => prev.map(t => ({ ...t, isDetailsLoaded: false })));
          setEnrichmentQueue(targetTaxa);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) setImportText(text);
      };
      reader.readAsText(file);
  };

  const handleBulkImport = async () => {
      if(!importText || !importText.trim()) return;
      const actId = addActivity("Bulk Import", 'import', { rawLength: importText.length }); 
      setShowImportModal(false);
      try {
          const chains = await parseBulkText(importText);
          let count = 0;
          for (const chain of chains) { 
              if (cancelledActivityIds.current.has(actId)) break;
              count++; 
              updateActivity(actId, `Importing ${count}/${chains.length}...`); 
          }
          if (cancelledActivityIds.current.has(actId)) failActivity(actId, "Cancelled");
          else completeActivity(actId, `Imported ${count} plants`);
          setImportText(''); 
          fetchBatch(0, true);
      } catch(e) { failActivity(actId, "Import failed", true); } 
  };

  const handleReset = () => {
      setConfirmState({
          isOpen: true, title: "Reset Database?", message: "This will attempt to clear the table.", confirmLabel: "Reset", isDestructive: true,
          onConfirm: async () => { 
             setTaxa([]);
             window.location.reload(); 
          }
      });
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure? This will delete the plant and its descendants from the database.')) return;
      try {
          const idsToDelete = new Set<string>();
          const collectIds = (targetId: string) => {
              idsToDelete.add(targetId);
              taxa.filter(t => t.parentId === targetId).forEach(child => collectIds(child.id));
          };
          collectIds(id);
          setTaxa(prev => prev.filter(t => !idsToDelete.has(t.id)));
          await dataService.deleteTaxon(id);
          fetchBatch(0, true);
      } catch (e) {
          console.error("Delete failed", e);
          alert("Failed to delete from database");
      }
  };

  const handleUpdate = async (id: string, updates: Partial<Taxon>) => {
      setTaxa(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      const target = taxa.find(t => t.id === id);
      if (target) {
          try {
             await dataService.upsertTaxon({ ...target, ...updates });
          } catch(e) {
             console.error("Update failed", e);
          }
      }
  };
  
  const handleGridAction = (action: 'mine' | 'enrich', taxon: Taxon) => {
      if (action === 'mine') handleMineTaxon(taxon);
      if (action === 'enrich') handleEnrichSingleTaxon(taxon);
  };

  useEffect(() => {
      if (enrichmentQueue.length === 0) return;
      const processQueue = async () => {
          const items = [...enrichmentQueue];
          setEnrichmentQueue([]);
          activeEnrichmentCount.current += items.length;
          const actId = 'enrichment-global';
          addActivity(`Enriching details...`, 'enrichment', items, actId);
          for (const item of items) {
              if (cancelledActivityIds.current.has(actId)) {
                  activeEnrichmentCount.current = 0;
                  failActivity(actId, "Cancelled by user");
                  return;
              }
              try {
                  const details = await enrichTaxon(item);
                  await handleUpdate(item.id, { ...details, isDetailsLoaded: true });
              } catch(e) {} finally {
                  activeEnrichmentCount.current -= 1;
                  if (activeEnrichmentCount.current <= 0) {
                      completeActivity(actId, "All details fetched");
                      activeEnrichmentCount.current = 0;
                  } else {
                      updateActivity(actId, `Processing ${activeEnrichmentCount.current} remaining...`);
                  }
              }
          }
      };
      processQueue();
  }, [enrichmentQueue]);

  const renderTree = (parentId?: string, depth = 0) => {
      const children = taxa.filter(t => t.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
      if (children.length === 0) return null;
      return children.map(node => (
          <React.Fragment key={node.id}>
              <TaxonRow taxon={node} depth={depth} onDelete={handleDelete} onUpdate={handleUpdate} preferences={preferences} />
              {renderTree(node.id, depth + 1)}
          </React.Fragment>
      ));
  };

  const showEmpty = (taxa.length === 0 && loadingState !== LoadingState.LOADING && Object.keys(gridFilters).length === 0) || loadingState === LoadingState.ERROR;

  return (
    <div className="min-h-screen font-sans text-slate-600 bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm flex-shrink-0">
        <div className={`mx-auto px-4 py-4 flex justify-between items-center transition-all duration-300 ${viewMode === 'grid' ? 'max-w-[98vw]' : 'max-w-6xl'}`}>
            <div className="flex items-center gap-2">
                <Leaf className="text-leaf-600" size={24} />
                <h1 className="text-xl font-serif font-bold text-slate-800">FloraCatalog <span className="text-xs font-sans font-normal text-slate-400 ml-2">Database</span></h1>
                {isOffline && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Offline</span>}
            </div>
            
            <div className="flex gap-4 w-full max-w-2xl mx-4">
                <form onSubmit={handleAddPlant} className="flex gap-2 flex-1">
                    <input 
                        className="flex-1 bg-slate-100 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-leaf-200 text-sm"
                        placeholder="Add via AI (e.g. Lycoris rosea)..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        disabled={loadingState === LoadingState.LOADING}
                    />
                    <button 
                        disabled={loadingState === LoadingState.LOADING}
                        className="bg-leaf-600 text-white px-3 py-2 rounded-lg hover:bg-leaf-700 disabled:opacity-50"
                    >
                        {loadingState === LoadingState.LOADING ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18}/>}
                    </button>
                </form>
            </div>

            <div className="flex items-center gap-2">
                 <div className="bg-slate-100 p-1 rounded-lg flex">
                    <button onClick={() => setViewMode('tree')} className={`p-1.5 rounded ${viewMode === 'tree' ? 'bg-white shadow text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`} title="Tree View"><Network size={18} /></button>
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`} title="Spreadsheet View"><Table size={18} /></button>
                 </div>
                 <button onClick={() => setShowImportModal(true)} className="text-slate-400 hover:text-leaf-600 p-2" title="Smart Import (Text/CSV)"><Upload size={20}/></button>
                 <div className="relative" ref={toolsMenuRef}>
                     <button onClick={() => setShowToolsMenu(!showToolsMenu)} className="text-slate-400 hover:text-slate-600 p-2" title="Tools / Enrichment"><Wrench size={20}/></button>
                     {showToolsMenu && (
                         <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1">
                             <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Enrichment Tools</div>
                             <button onClick={() => handleEnrichmentTools('missing')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded">Enrich Missing Details</button>
                             <button onClick={() => handleEnrichmentTools('all_add')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded">Enrich All (Additive)</button>
                             <button onClick={() => handleEnrichmentTools('all_replace')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded">Enrich All (Replace)</button>
                         </div>
                     )}
                 </div>
                 <div className="relative" ref={activityButtonRef}>
                     <button onClick={() => setShowActivityPanel(!showActivityPanel)} className={`p-2 rounded transition-colors ${showActivityPanel ? 'bg-slate-100 text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`} title="Activity Monitor">
                         <div className="relative">
                             <Activity size={20}/>
                             {activities.some(a => a.status === 'running') && (<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-leaf-500 rounded-full border-2 border-white animate-pulse"></span>)}
                             {activities.some(a => a.status === 'needs_input') && (<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-bounce"></span>)}
                         </div>
                     </button>
                     <ActivityPanel isOpen={showActivityPanel} onClose={() => setShowActivityPanel(false)} activities={activities} onCancel={cancelActivity} onDismiss={dismissActivity} onRetry={handleRetryActivity} onResolve={handleResolveActivity} />
                 </div>
                 <button onClick={() => setShowSettingsModal(true)} className="text-slate-400 hover:text-slate-600 p-2" title="Settings"><SettingsIcon size={20}/></button>
                 <button type="button" onClick={handleReset} className="text-slate-300 hover:text-red-400 p-2" title="Reset Database"><RotateCcw size={20}/></button>
            </div>
        </div>
      </header>
      
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
                <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Smart Text Import</h3>
                <textarea className="w-full h-64 border border-slate-200 rounded-lg p-4 text-sm font-mono focus:ring-2 ring-leaf-200 outline-none mb-4" value={importText} onChange={e => setImportText(e.target.value)} />
                <div className="flex justify-between items-center">
                    <input type="file" onChange={handleFileUpload} className="text-xs text-slate-500" />
                    <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                        <button onClick={handleBulkImport} className="px-4 py-2 bg-leaf-600 text-white rounded-lg">Import</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <SettingsModal isOpen={showSettingsModal} onClose={handleSettingsClose} preferences={preferences} onUpdate={setPreferences} />
      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmLabel={confirmState.confirmLabel} isDestructive={confirmState.isDestructive} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({...prev, isOpen: false}))} />
      
      <main className={`mx-auto px-4 py-8 flex-1 w-full transition-all duration-300 ${viewMode === 'grid' ? 'max-w-[98vw]' : 'max-w-6xl'}`}>
         {showEmpty ? (
             <EmptyState 
                isOffline={isOffline} 
                loadingState={loadingState}
                errorDetails={errorDetails}
                onOpenSettings={() => setShowSettingsModal(true)} 
                onRetry={() => fetchBatch(0, true)}
             />
         ) : (
             <>
                <div className={viewMode === 'grid' ? 'block' : 'hidden'}>
                    <div className="h-[calc(100vh-140px)]">
                        <DataGridV2 
                            taxa={taxa} 
                            preferences={preferences} 
                            onAction={handleGridAction}
                            onUpdate={handleUpdate} 
                            totalRecords={totalRecords}
                            isLoadingMore={isFetchingMore}
                            onLoadMore={handleLoadMore}
                            sortConfig={sortConfig}
                            onSortChange={(key, direction) => setSortConfig({ key, direction })}
                            filters={gridFilters}
                            onFilterChange={handleFilterChange}
                        />
                    </div>
                </div>
                 <div className={viewMode === 'tree' ? 'block' : 'hidden'}>
                     <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                         <div className="p-4 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                             Note: Tree view only shows relationships for records loaded on the current page.
                         </div>
                         <table className="w-full text-left">
                             <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                 <tr><th className="p-3 pl-8 w-1/2">Taxon Name</th><th className="p-3 w-1/4">Common Name</th><th className="p-3">Family / Notes</th><th className="p-3 text-right">Actions</th></tr>
                             </thead>
                             <tbody>{renderTree(undefined, 0)}</tbody>
                         </table>
                     </div>
                 </div>
             </>
         )}
      </main>
    </div>
  );
}

export default App;
