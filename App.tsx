
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Plus, RotateCcw, Table, Network, Upload, X, Settings as SettingsIcon, Wrench, Activity, AlertCircle } from 'lucide-react';
import { Taxon, LoadingState, TaxonomicStatus, UserPreferences, BackgroundProcess, ActivityItem, SearchCandidate, ActivityStatus } from './types';
import { identifyTaxonomy, enrichTaxon, deepScanTaxon, parseBulkText, searchTaxonCandidates } from './services/geminiService';
import { dataService } from './services/dataService';
import { getIsOffline } from './services/supabaseClient';
import TaxonRow from './components/PlantCard';
import EmptyState from './components/EmptyState';
import DataGrid from './components/DataGrid';
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
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'taxonName', direction: 'asc' });
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
      if (currentOfflineStatus) { setLoadingState(LoadingState.IDLE); return; }
      if (isFetchingRef.current) return;
      
      try {
          isFetchingRef.current = true;
          setErrorDetails(null);
          if (isNewSearch) setLoadingState(LoadingState.LOADING);
          else setIsFetchingMore(true);
          
          const limit = 100;
          // OPTIMIZATION: Only count on the first page or search
          const shouldCount = isNewSearch;
          
          const { data, count } = await dataService.getTaxa({ 
            offset: currentOffset, 
            limit, 
            filters: gridFilters, 
            sortBy: sortConfig.key, 
            sortDirection: sortConfig.direction,
            shouldCount
          });
          
          if (isNewSearch) { 
              setTaxa(data); 
              if (count !== -1) setTotalRecords(count);
              else if (data.length === 0) setTotalRecords(0); // Explicitly zero if no data
          } else {
              setTaxa(prev => [...prev, ...data]);
          }
          
          setHasMore(data.length === limit);
          setLoadingState(LoadingState.SUCCESS);
          setIsFetchingMore(false);
      } catch (e: any) {
          setErrorDetails(e.message || "Database error.");
          setLoadingState(LoadingState.ERROR);
          setIsFetchingMore(false);
      } finally { isFetchingRef.current = false; }
  };

  useEffect(() => { 
    setOffset(0); 
    fetchBatch(0, true); 
  }, [gridFilters, sortConfig]);

  const handleFilterChange = (key: string, value: any) => setGridFilters(prev => ({ ...prev, [key]: value }));
  const handleSettingsClose = () => { setShowSettingsModal(false); const n = getIsOffline(); setIsOffline(n); if (!n) fetchBatch(0, true); };
  const handleLoadMore = () => { if (!hasMore || isFetchingRef.current || loadingState === LoadingState.LOADING) return; const n = offset + 100; setOffset(n); fetchBatch(n, false); };
  useEffect(() => { const s = localStorage.getItem('flora_prefs'); if (s) try { setPreferences(JSON.parse(s)); } catch(e) {} }, []); 
  useEffect(() => localStorage.setItem('flora_prefs', JSON.stringify(preferences)), [preferences]);
  useEffect(() => { const h = (e: MouseEvent) => { if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) setShowToolsMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [showToolsMenu]);

  const addActivity = (name: string, type: 'mining' | 'import' | 'enrichment' | 'search', payload?: any, existingId?: string) => {
      const id = existingId || crypto.randomUUID();
      cancelledActivityIds.current.delete(id);
      setActivities(prev => {
          if (prev.some(a => a.id === id)) return prev.map(a => a.id === id ? { ...a, status: 'running' as ActivityStatus, message: 'Starting...', timestamp: Date.now() } : a);
          const newItem: ActivityItem = { id, name, type, status: 'running' as ActivityStatus, message: 'Starting...', timestamp: Date.now(), payload, details: payload };
          return [newItem, ...prev].slice(0, 50); 
      });
      return id;
  };

  const updateActivity = (id: string, message: string, updates?: Partial<ActivityItem>) => setActivities(prev => prev.map(a => a.id === id ? { ...a, message, ...updates } : a));
  const completeActivity = (id: string, message: string = "Completed") => { setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' as ActivityStatus, message, timestamp: Date.now() } : a)); cancelledActivityIds.current.delete(id); };
  const failActivity = (id: string, errorMsg: string, canRetry: boolean = false) => setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'error' as ActivityStatus, message: errorMsg, canRetry, timestamp: Date.now() } : a));
  const requireInputActivity = (id: string, message: string, resolution: any) => { setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'needs_input' as ActivityStatus, message, resolution, timestamp: Date.now() } : a)); setShowActivityPanel(true); };
  const cancelActivity = (id: string) => { cancelledActivityIds.current.add(id); updateActivity(id, "Cancelling..."); };
  const dismissActivity = (id: string) => setActivities(prev => prev.filter(a => a.id !== id));
  
  const handleRetryActivity = (a: ActivityItem) => { 
    if (a.type === 'mining' && a.payload) executeMining(a.payload, a.id); 
    else if (a.type === 'search' && a.payload) executeSearch(a.payload, a.id); 
  };

  const handleResolveActivity = async (id: string, choice: 'accept' | 'reject' | 'select', payload?: any) => {
      if (choice === 'reject') { dismissActivity(id); return; }
      const activity = activities.find(a => a.id === id); if (!activity) return;
      if (payload && (choice === 'accept' || choice === 'select')) {
          const candidate = payload as SearchCandidate;
          updateActivity(id, `Standardizing ${candidate.taxonName}...`, { status: 'running' as ActivityStatus, resolution: undefined });
          try { 
              const chain = await identifyTaxonomy(candidate.taxonName); 
              await dataService.batchInsert(chain);
              completeActivity(id, `Added ${candidate.taxonName}`); 
              fetchBatch(0, true); 
          } 
          catch(e) { failActivity(id, "Failed to add plant", true); }
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
                if (cancelledActivityIds.current.has(actId)) break; 
                try { 
                  const chain = await identifyTaxonomy(name); 
                  await dataService.batchInsert(chain);
                } catch(e) {} 
              }
              return true;
          });
          if (cancelledActivityIds.current.has(actId)) failActivity(actId, "Cancelled by user");
          else { completeActivity(actId, "Mining complete"); fetchBatch(0, true); }
      } catch (err: any) { failActivity(actId, "Failed: " + err.message, true); }
  };

  const executeSearch = async (queryTerm: string, existingId?: string) => {
      const actId = addActivity(`AI Search: "${queryTerm}"`, 'search', queryTerm, existingId);
      try {
          const candidates = await searchTaxonCandidates(queryTerm);
          if (candidates.length === 0) { failActivity(actId, "No matches found.", true); return; }
          const firstCandidate = candidates[0];
          
          if (firstCandidate.matchType === 'synonym' && firstCandidate.acceptedName) { 
            requireInputActivity(actId, "Name Resolution required", { type: 'synonym', candidates: candidates, originalQuery: queryTerm }); 
            return; 
          }
          
          if (candidates.length > 1 && candidates[0].confidence < 0.95) { 
            requireInputActivity(actId, "Multiple matches found.", { type: 'ambiguous', candidates: candidates, originalQuery: queryTerm }); 
            return; 
          }
          
          const topMatch = candidates[0];
          const existing = taxa.find(t => t.taxonName.toLowerCase() === topMatch.taxonName.toLowerCase());
          if (existing) { 
            requireInputActivity(actId, "Plant already exists.", { type: 'duplicate', candidates: [topMatch], originalQuery: queryTerm, existingId: existing.id }); 
            return; 
          }
          
          if (topMatch.matchType !== 'exact' || topMatch.taxonName.toLowerCase() !== queryTerm.toLowerCase()) { 
            requireInputActivity(actId, `Verification required`, { type: 'correction', candidates: [topMatch], originalQuery: queryTerm }); 
            return; 
          }
          
          updateActivity(actId, `Found ${topMatch.taxonName}. Standardizing...`);
          const chain = await identifyTaxonomy(topMatch.taxonName);
          await dataService.batchInsert(chain);
          completeActivity(actId, `Added ${topMatch.taxonName}`);
          fetchBatch(0, true);
      } catch (err: any) { failActivity(actId, "Search failed: " + err.message, true); }
  };

  const handleAddPlant = (e: React.FormEvent) => { e.preventDefault(); if (!query || !query.trim()) return; executeSearch(query); setQuery(''); };
  const handleMineTaxon = (t: Taxon) => setConfirmState({ isOpen: true, title: `Deep Mine ${t.taxonName}?`, message: `This will search authoritative sources for all registered varieties and cultivars of this ${t.taxonRank}.`, confirmLabel: "Start Mining", onConfirm: () => executeMining(t) });
  const handleEnrichSingleTaxon = (t: Taxon) => setConfirmState({ isOpen: true, title: `Enrich Details?`, message: `Fetch descriptions, synonyms, and reference links for ${t.taxonName}?`, confirmLabel: "Enrich", onConfirm: () => { setConfirmState(prev => ({ ...prev, isOpen: false })); setEnrichmentQueue([t]); } });
  
  const handleEnrichmentTools = (mode: 'missing' | 'all_add' | 'all_replace') => {
      setShowToolsMenu(false); 
      let target: Taxon[] = mode === 'missing' ? taxa.filter(t => !t.isDetailsLoaded) : [...taxa];
      if (target.length === 0) return alert("No plants found to enrich.");
      if (confirm(`Start enrichment for ${target.length} plants?`)) { 
        if (mode === 'all_replace') setTaxa(prev => prev.map(t => ({ ...t, isDetailsLoaded: false }))); 
        setEnrichmentQueue(target); 
      }
  };

  const handleBulkImport = async () => {
      if(!importText || !importText.trim()) return;
      const actId = addActivity("Bulk Import", 'import', { rawLength: importText.length }); 
      setShowImportModal(false);
      try { 
          const names = await parseBulkText(importText); 
          let count = 0; 
          for (const name of names) { 
              if (cancelledActivityIds.current.has(actId)) break; 
              count++; 
              updateActivity(actId, `Processing ${count}/${names.length}: ${name}`);
              const chain = await identifyTaxonomy(name);
              await dataService.batchInsert(chain);
          }
          if (cancelledActivityIds.current.has(actId)) failActivity(actId, "Cancelled"); 
          else completeActivity(actId, `Imported ${count} plants successfully`);
          setImportText(''); 
          fetchBatch(0, true);
      } catch(e) { failActivity(actId, "Import failed", true); } 
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this plant?')) return;
      try { 
        setTaxa(prev => prev.filter(t => t.id !== id)); 
        await dataService.deleteTaxon(id); 
        fetchBatch(0, true); 
      } 
      catch (e) { alert("Failed to delete."); }
  };

  const handleUpdate = async (id: string, updates: Partial<Taxon>) => {
      setTaxa(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      const target = taxa.find(t => t.id === id); 
      if (target) try { await dataService.upsertTaxon({ ...target, ...updates }); } catch(e) {}
  };

  useEffect(() => {
      if (enrichmentQueue.length === 0) return;
      const processQueue = async () => {
          const items = [...enrichmentQueue]; setEnrichmentQueue([]); activeEnrichmentCount.current += items.length;
          const actId = 'enrichment-global'; 
          addActivity(`Enriching details...`, 'enrichment', items, actId);
          for (const item of items) {
              if (cancelledActivityIds.current.has(actId)) { 
                activeEnrichmentCount.current = 0; 
                failActivity(actId, "Cancelled"); 
                return; 
              }
              try { 
                const d = await enrichTaxon(item); 
                await handleUpdate(item.id, { ...d, isDetailsLoaded: true }); 
              } 
              catch(e) {} 
              finally { 
                activeEnrichmentCount.current -= 1; 
                if (activeEnrichmentCount.current <= 0) { 
                  completeActivity(actId, "All details fetched"); 
                  activeEnrichmentCount.current = 0; 
                } else {
                  updateActivity(actId, `Processing: ${item.taxonName} (${activeEnrichmentCount.current} left)`); 
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

  // Helper to determine if we should show the empty garden state
  const isSearching = useMemo(() => {
      return Object.values(gridFilters).some(v => 
          v !== undefined && v !== null && v !== '' && 
          (Array.isArray(v) ? v.length > 0 : true)
      );
  }, [gridFilters]);

  // Only show empty state if truly no data AND no active search/filters
  const showEmptyState = taxa.length === 0 && !isSearching && loadingState !== LoadingState.LOADING && !errorDetails;

  return (
    <div className="min-h-screen font-sans text-slate-600 bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm flex-shrink-0">
        <div className={`mx-auto px-4 py-4 flex justify-between items-center transition-all duration-300 ${viewMode === 'grid' ? 'max-w-[98vw]' : 'max-w-6xl'}`}>
            <div className="flex items-center gap-2">
                <Leaf className="text-leaf-600" size={24} />
                <h1 className="text-xl font-serif font-bold text-slate-800">FloraCatalog</h1>
                {isOffline && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight">Offline Mode</span>}
            </div>
            <div className="flex gap-4 w-full max-w-2xl mx-4">
                <form onSubmit={handleAddPlant} className="flex gap-2 flex-1">
                    <input 
                      className="flex-1 bg-slate-100 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-leaf-200 text-sm border border-transparent focus:bg-white transition-all" 
                      placeholder="Add plant (e.g. Agave parryi var. truncata)..." 
                      value={query} 
                      onChange={e => setQuery(e.target.value)} 
                      disabled={loadingState === LoadingState.LOADING} 
                    />
                    <button 
                      disabled={loadingState === LoadingState.LOADING} 
                      className="bg-leaf-600 text-white px-3 py-2 rounded-lg hover:bg-leaf-700 disabled:opacity-50 shadow-sm active:scale-95 transition-all"
                    >
                      {loadingState === LoadingState.LOADING ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18}/>}
                    </button>
                </form>
            </div>
            <div className="flex items-center gap-2">
                 <div className="bg-slate-100 p-1 rounded-lg flex">
                    <button onClick={() => setViewMode('tree')} className={`p-1.5 rounded transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`} title="Hierarchy Tree"><Network size={18} /></button>
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`} title="Data Grid"><Table size={18} /></button>
                 </div>
                 <button onClick={() => setShowImportModal(true)} className="text-slate-400 hover:text-leaf-600 p-2 transition-colors" title="Bulk Import"><Upload size={20}/></button>
                 <div className="relative" ref={toolsMenuRef}>
                     <button onClick={() => setShowToolsMenu(!showToolsMenu)} className={`text-slate-400 hover:text-slate-600 p-2 transition-colors ${showToolsMenu ? 'text-leaf-600 bg-slate-50 rounded-lg' : ''}`} title="Tools"><Wrench size={20}/></button>
                     {showToolsMenu && (
                         <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
                             <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Batch Actions</div>
                             <button onClick={() => handleEnrichmentTools('missing')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded-lg">Enrich Missing Details</button>
                             <button onClick={() => handleEnrichmentTools('all_add')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded-lg">Enrich All (Safe Add)</button>
                             <button onClick={() => handleEnrichmentTools('all_replace')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-red-600 rounded-lg">Enrich All (Force Overwrite)</button>
                         </div>
                     )}
                 </div>
                 <div className="relative" ref={activityButtonRef}>
                     <button onClick={() => setShowActivityPanel(!showActivityPanel)} className={`p-2 rounded transition-all ${showActivityPanel ? 'bg-slate-100 text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`} title="Activity Monitor">
                         <div className="relative">
                            <Activity size={20}/>
                            {activities.some(a => a.status === 'running' || a.status === 'needs_input') && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-leaf-500 rounded-full border-2 border-white animate-pulse"></span>
                            )}
                         </div>
                     </button>
                     <ActivityPanel isOpen={showActivityPanel} onClose={() => setShowActivityPanel(false)} activities={activities} onCancel={cancelActivity} onDismiss={dismissActivity} onRetry={handleRetryActivity} onResolve={handleResolveActivity} />
                 </div>
                 <button onClick={() => setShowSettingsModal(true)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors" title="Settings"><SettingsIcon size={20}/></button>
            </div>
        </div>
      </header>

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
              <h3 className="text-xl font-serif font-bold text-slate-800 mb-2">Bulk Import</h3>
              <p className="text-sm text-slate-500 mb-4">Paste a list of plant names, or text containing botanical names. AI will extract and standardize them.</p>
              <textarea 
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-leaf-200 text-sm font-mono" 
                placeholder="Agave parryi, Lycoris rosea, Echeveria 'Perle von Nurnberg'..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-3">
                 <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button 
                  onClick={handleBulkImport} 
                  disabled={!importText.trim()}
                  className="px-6 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50 font-bold shadow-md shadow-leaf-100"
                 >
                    Import via AI
                 </button>
              </div>
           </div>
        </div>
      )}

      <SettingsModal isOpen={showSettingsModal} onClose={handleSettingsClose} preferences={preferences} onUpdate={setPreferences} />
      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmLabel={confirmState.confirmLabel} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({...prev, isOpen: false}))} />
      
      <main className={`mx-auto px-4 py-8 flex-1 w-full ${viewMode === 'grid' ? 'max-w-[98vw]' : 'max-w-6xl'}`}>
         {showEmptyState || errorDetails ? (
             <EmptyState isOffline={isOffline} loadingState={loadingState} errorDetails={errorDetails} onOpenSettings={() => setShowSettingsModal(true)} onRetry={() => fetchBatch(0, true)} />
         ) : (
             <>
                <div className={viewMode === 'grid' ? 'block h-full' : 'hidden'}>
                    <div className="h-[calc(100vh-160px)]">
                        <DataGrid 
                          taxa={taxa} 
                          preferences={preferences} 
                          onAction={(a, t) => a === 'mine' ? handleMineTaxon(t) : handleEnrichSingleTaxon(t)} 
                          onUpdate={handleUpdate} 
                          totalRecords={totalRecords} 
                          isLoadingMore={isFetchingMore} 
                          onLoadMore={handleLoadMore} 
                          sortConfig={sortConfig} 
                          onSortChange={(k, d) => setSortConfig({ key: k, direction: d })} 
                          filters={gridFilters} 
                          onFilterChange={handleFilterChange} 
                        />
                    </div>
                </div>
                 <div className={viewMode === 'tree' ? 'block' : 'hidden'}>
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                            <tr>
                              <th className="p-4 pl-8 w-1/2">Taxon Hierarchy</th>
                              <th className="p-4 w-1/4">Common Name</th>
                              <th className="p-4">Authority / Notes</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {renderTree(undefined, 0)}
                          </tbody>
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
