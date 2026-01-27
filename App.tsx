import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Activity, Settings, Plus, Search } from 'lucide-react';
import { Taxon, LoadingState, UserPreferences, ActivityItem, ActivityStatus, RankPallet, SearchCandidate } from './types';
import { dataService } from './services/dataService';
import { getIsOffline, reloadClient } from './services/supabaseClient';
import { enrichTaxon, findAdditionalLinks } from './services/geminiService';
import EmptyState from './components/EmptyState';
// Fix: DataGrid is a named export in components/DataGrid.tsx
import { DataGrid } from './components/DataGrid';
import ConfirmDialog from './components/ConfirmDialog';
import SettingsModal from './components/SettingsModal';
import ActivityPanel from './components/ActivityPanel';
import AddPlantModal from './components/AddPlantModal';

interface AppLayoutConfig {
    visibleColumns?: Set<string>;
    columnOrder?: string[];
    colWidths?: Record<string, number>;
}

// Fix: DEFAULT_PALLET was missing kingdom, phylum, and class keys required by RankPallet
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

export default function App() {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [activityPanelMode, setActivityPanelMode] = useState<'side' | 'floating' | 'full'>('side');
  const [showAddModal, setShowAddModal] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  
  // Data State
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [ancestors, setAncestors] = useState<Taxon[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Refs for non-reactive tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeQueryIdRef = useRef<string | null>(null);
  const isHydratingRef = useRef(false);
  const settingsLoadedRef = useRef(false);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'taxon_name', direction: 'asc' });
  const [gridFilters, setGridFilters] = useState<Record<string, any>>({ taxon_status: ['Accepted'] });
  const [isOffline, setIsOffline] = useState(getIsOffline());
  const [preferences, setPreferences] = useState<UserPreferences>({ 
      hybrid_spacing: 'space',
      auto_enrichment: false,
      auto_open_activity_on_task: false,
      auto_fit_max_width: 400,
      fit_screen_max_ratio: 4.0,
      grid_pallet: DEFAULT_PALLET,
      search_mode: 'prefix',
      debug_mode: false
  });

  // Activity Persistence Layer
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
      try {
          const saved = localStorage.getItem('flora_activity_history');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  useEffect(() => {
      localStorage.setItem('flora_activity_history', JSON.stringify(activities));
  }, [activities]);

  const cancelledActivityIds = useRef<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [initialLayout, setInitialLayout] = useState<AppLayoutConfig | null>(null);
  
  const latestLayoutRef = useRef<{
      visibleColumns: string[];
      columnOrder: string[];
      colWidths: Record<string, number>;
  } | null>(null);

  const [gridKey, setGridKey] = useState(0);

  const loadGlobalSettings = async (): Promise<AppLayoutConfig> => {
    try {
        const saved = await dataService.getGlobalSettings();
        settingsLoadedRef.current = true; 

        if (saved && Object.keys(saved).length > 0) {
            if (saved.preferences) {
                setPreferences(prev => {
                    const mergedPrefs = { ...prev, ...saved.preferences };
                    mergedPrefs.grid_pallet = { ...DEFAULT_PALLET, ...(saved.preferences.grid_pallet || {}) };
                    return mergedPrefs;
                });
            }
            if (saved.filters) setGridFilters(saved.filters);
            
            return {
                visibleColumns: Array.isArray(saved.visibleColumns) ? new Set<string>(saved.visibleColumns) : undefined,
                columnOrder: Array.isArray(saved.columnOrder) ? saved.columnOrder : undefined,
                colWidths: (saved.colWidths && typeof saved.colWidths === 'object') ? saved.colWidths : undefined
            };
        }
        return {}; 
    } catch (e) {
        return {};
    }
  };

  useEffect(() => {
    const init = async () => {
      const hasCreds = !!(localStorage.getItem('supabase_url') && localStorage.getItem('supabase_anon_key'));
      if (hasCreds) { for (let i = 0; i < 5; i++) { if (!getIsOffline()) break; await new Promise(r => setTimeout(r, 200)); } }
      const currentOffline = getIsOffline();
      setIsOffline(currentOffline);
      if (!currentOffline) {
          try {
              const config = await loadGlobalSettings();
              setInitialLayout(config);
              setIsInitialized(true);
          } catch (e) { setInitialLayout({}); setIsInitialized(true); }
      } else { setInitialLayout({}); setIsInitialized(true); }
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        const currentOffline = getIsOffline();
        if (!currentOffline && !settingsLoadedRef.current && isInitialized) {
            loadGlobalSettings().then(config => {
                if (config && Object.keys(config).length > 0) { setInitialLayout(config); setGridKey(prev => prev + 1); }
            });
        } 
        if (isOffline !== currentOffline) {
            setIsOffline(currentOffline);
            if (currentOffline && !isInitialized) setIsInitialized(true);
        }
    }, 1500);
    return () => clearInterval(interval);
  }, [isOffline, isInitialized]);

  const isFiltering = useMemo(() => {
    return Object.entries(gridFilters).some(([key, value]) => {
      if (key === 'taxon_status') return !Array.isArray(value) || value.length !== 1 || value[0] === 'Accepted';
      return value && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '');
    });
  }, [gridFilters]);

  const handleSaveLayout = async () => {
    if (getIsOffline() || !latestLayoutRef.current) return;
    try {
        await dataService.saveGlobalSettings({
            preferences, filters: gridFilters,
            visibleColumns: latestLayoutRef.current.visibleColumns,
            columnOrder: latestLayoutRef.current.columnOrder,
            colWidths: latestLayoutRef.current.colWidths
        });
        alert("Layout saved.");
    } catch (e: any) { alert(`Failed: ${e.message}`); }
  };

  const handleReloadLayout = async () => {
    if (getIsOffline()) return;
    const config = await loadGlobalSettings();
    if (settingsLoadedRef.current) { setInitialLayout(config); setGridKey(prev => prev + 1); alert("Settings reloaded."); }
  };

  const fetchBatch = async (currentOffset: number, isNewSearch: boolean) => {
      const currentOfflineStatus = getIsOffline();
      setIsOffline(currentOfflineStatus);
      if (currentOfflineStatus) { setLoadingState(LoadingState.IDLE); return; }
      
      const queryId = crypto.randomUUID();
      if (isNewSearch) {
          if (abortControllerRef.current) abortControllerRef.current.abort();
          activeQueryIdRef.current = queryId;
          abortControllerRef.current = new AbortController();
          setIsSearching(true); setOffset(0); setTotalRecords(0); setErrorDetails(null);
      } else { setIsFetchingMore(true); }

      const thisQueryId = activeQueryIdRef.current;
      
      try {
          const { data, count } = await dataService.getTaxa({ 
            offset: currentOffset, limit: 100, filters: gridFilters, sort_by: sortConfig.key, 
            sort_direction: sortConfig.direction, should_count: isNewSearch, search_mode: preferences.search_mode 
          });
          
          if (thisQueryId !== activeQueryIdRef.current) return;

          if (isNewSearch) { 
              setTaxa(data); setAncestors([]); if (count !== -1) setTotalRecords(count);
              setLoadingState(LoadingState.SUCCESS);
          } else {
              setTaxa(prev => {
                  const ids = new Set(prev.map(t => t.id));
                  return [...prev, ...data.filter(t => !ids.has(t.id))];
              });
          }
          setHasMore(data.length === 100);
      } catch (e: any) {
          if (e.name === 'AbortError') return;
          if (thisQueryId !== activeQueryIdRef.current) return;
          setErrorDetails(e.message || "Database error.");
          setLoadingState(LoadingState.ERROR);
      } finally {
          if (thisQueryId === activeQueryIdRef.current) { setIsFetchingMore(false); setIsSearching(false); }
      }
  };

  // v2.35.9 Simplified Hydration Loop (ID-Based only)
  useEffect(() => {
      if (getIsOffline() || taxa.length === 0 || isHydratingRef.current) return;
      const currentQueryId = activeQueryIdRef.current;
      const existingIds = new Set([...taxa.map(t => t.id), ...ancestors.map(t => t.id)]);
      const missingParentIds = new Set<string>();
      taxa.forEach(t => { if (t.parent_id && !existingIds.has(t.parent_id)) missingParentIds.add(t.parent_id); });
      ancestors.forEach(t => { if (t.parent_id && !existingIds.has(t.parent_id)) missingParentIds.add(t.parent_id); });

      if (missingParentIds.size > 0) {
          const hydrate = async () => {
              isHydratingRef.current = true;
              const newAncestors: Taxon[] = [];
              for (const id of Array.from(missingParentIds)) {
                  try {
                      if (currentQueryId !== activeQueryIdRef.current) break;
                      const parent = await dataService.getTaxonById(id);
                      if (parent) newAncestors.push(parent);
                  } catch (e) { /* ignore */ }
              }
              if (currentQueryId === activeQueryIdRef.current && newAncestors.length > 0) {
                  setAncestors(prev => {
                      const ids = new Set(prev.map(p => p.id));
                      return [...prev, ...newAncestors.filter(a => !ids.has(a.id))];
                  });
              }
              isHydratingRef.current = false;
          };
          hydrate();
      }
  }, [taxa, ancestors]);

  useEffect(() => { 
    if (isInitialized && initialLayout !== null) fetchBatch(0, true); 
  }, [gridFilters, sortConfig, preferences.search_mode, isInitialized, initialLayout]);

  const handleFilterChange = (key: string, value: any) => setGridFilters(prev => ({ ...prev, [key]: value }));
  const handleSettingsClose = () => { setShowSettingsModal(false); if (!getIsOffline()) fetchBatch(0, true); };
  const handleLoadMore = () => { if (!hasMore || isSearching || isFetchingMore) return; const n = offset + 100; setOffset(n); fetchBatch(n, false); };
  
  const handleTaxonUpdate = async (id: string, updates: Partial<Taxon>) => {
      try {
          await dataService.updateTaxon(id, updates);
          setTaxa(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
          setAncestors(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      } catch (e: any) { alert(`Failed: ${e.message}`); }
  };

  const handleAddActivity = (activityUpdate: Partial<ActivityItem>) => {
      setActivities(prev => {
          const index = prev.findIndex(a => a.id === activityUpdate.id);
          if (index !== -1) {
              const updated = [...prev];
              const existing = updated[index];
              updated[index] = {
                  ...existing,
                  ...Object.fromEntries(Object.entries(activityUpdate).filter(([_, v]) => v !== undefined)),
                  steps: activityUpdate.steps || existing.steps,
                  inputs: activityUpdate.inputs || existing.inputs,
                  timestamp: existing.timestamp || activityUpdate.timestamp || Date.now()
              };
              return updated;
          }
          const newTask: ActivityItem = {
              id: activityUpdate.id!, name: activityUpdate.name || 'Unknown Task',
              type: activityUpdate.type || 'search', status: activityUpdate.status || 'running',
              message: activityUpdate.message || '', timestamp: activityUpdate.timestamp || Date.now(),
              steps: activityUpdate.steps || [], ...activityUpdate
          };
          return [newTask, ...prev];
      });
      if (preferences.auto_open_activity_on_task) setShowActivityPanel(true);
  };

  const handleAction = async (action: 'mine' | 'enrich', taxon: Taxon) => {
      const id = crypto.randomUUID();
      const actionName = action === 'mine' ? 'Mining' : 'Enriching';
      handleAddActivity({ id, name: `${actionName} ${taxon.taxon_name}`, type: action === 'mine' ? 'mining' : 'enrichment', status: 'running', message: 'Connecting...', timestamp: Date.now(), inputs: { taxon_id: taxon.id, taxon_name: taxon.taxon_name }, steps: [{ label: 'Initialize AI curator', status: 'running', timestamp: Date.now() }] });

      try {
          if (action === 'enrich') {
              const findings = await enrichTaxon(taxon);
              if (cancelledActivityIds.current.has(id)) return;
              await handleTaxonUpdate(taxon.id, findings);
              handleAddActivity({ id, status: 'completed', message: 'Horticultural record enriched.', outcome: `Enriched with ${Object.keys(findings).length} points.`, steps: (activities.find(a => a.id === id)?.steps || []).map(s => ({...s, status: 'completed' as ActivityStatus})) });
          } else {
              const findings = await findAdditionalLinks(taxon.taxon_name, taxon.reference_links || []);
              if (cancelledActivityIds.current.has(id)) return;
              if (findings.length > 0) {
                  await handleTaxonUpdate(taxon.id, { reference_links: [...(taxon.reference_links || []), ...findings] });
                  handleAddActivity({ id, status: 'completed', message: `Found ${findings.length} links.`, outcome: `Mapped ${findings.length} new authorities.`, steps: (activities.find(a => a.id === id)?.steps || []).map(s => ({...s, status: 'completed' as ActivityStatus})) });
              } else { handleAddActivity({ id, status: 'completed', message: 'No new links.', outcome: 'No new links discovered.', steps: (activities.find(a => a.id === id)?.steps || []).map(s => ({...s, status: 'completed' as ActivityStatus})) }); }
          }
      } catch (e: any) {
          if (cancelledActivityIds.current.has(id)) return;
          handleAddActivity({ id, status: 'error', message: e.message, outcome: `Failed: ${e.message}` });
      }
  };

  const handleActivityResolve = async (id: string, choice: 'accept' | 'reject' | 'select', payload?: any) => {
      const activity = activities.find(a => a.id === id);
      if (!activity) return;
      if (choice === 'reject' || (activity.resolution?.type === 'duplicate' && choice === 'accept')) {
          handleAddActivity({ id, status: 'completed', message: 'Dismissed.', outcome: 'User acknowledged.', timestamp: Date.now() });
          return;
      }
      if ((choice === 'accept' || choice === 'select') && payload) {
          const candidate = payload as SearchCandidate;
          handleAddActivity({ id, status: 'running', message: `Cataloging: ${candidate.taxon_name}...`, steps: [...activity.steps, { label: `Selection: ${candidate.taxon_name}`, status: 'completed', timestamp: Date.now() }] });
          try {
              const { taxon, created } = await dataService.graftTaxonToHierarchy(candidate, (label, data) => {
                  const currentSteps = activities.find(a => a.id === id)?.steps || [];
                  handleAddActivity({ id, steps: [...currentSteps, { label, status: 'completed', timestamp: Date.now(), data }] });
              });
              handleAddActivity({ id, status: 'completed', message: 'Record active.', outcome: `Successfully committed ${taxon.taxon_name}.`, timestamp: Date.now() });
              fetchBatch(0, true);
          } catch (e: any) { handleAddActivity({ id, status: 'error', message: e.message, outcome: `Commit failed: ${e.message}`, timestamp: Date.now() }); }
      }
  };

  const handleAddSuccess = () => fetchBatch(0, true);
  const handleMaintenanceComplete = () => { setTaxa([]); setOffset(0); fetchBatch(0, true); };
  const isHardError = (isOffline || (loadingState === LoadingState.ERROR && !isInitialized));
  const isActuallyEmpty = taxa.length === 0 && !isFiltering && loadingState === LoadingState.SUCCESS && totalRecords === 0 && isInitialized;

  return (
    <div className="h-screen bg-slate-50 flex flex-row overflow-hidden relative">
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${showActivityPanel && activityPanelMode === 'side' ? 'mr-[450px]' : ''}`}>
          <header className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-30">
            <div className="flex items-center gap-2 text-leaf-700 font-serif text-xl font-bold"><Leaf className="text-leaf-600" /> FloraCatalog</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200 focus-within:ring-2 focus-within:ring-leaf-200 transition-all">
                <Search size={14} className="text-slate-400" />
                <input type="text" value={headerSearchQuery} onChange={(e) => setHeaderSearchQuery(e.target.value)} placeholder="Enter plant name..." className="bg-transparent border-none outline-none text-xs px-3 w-40 font-medium text-slate-700 placeholder:text-slate-400" onKeyDown={(e) => e.key === 'Enter' && setShowAddModal(true)} />
              </div>
              <button onClick={() => setShowAddModal(!showAddModal)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all shadow-sm text-xs font-bold ${showAddModal ? 'bg-slate-800 text-white' : 'bg-leaf-600 text-white hover:bg-leaf-700'}`}><Plus size={16} /> {showAddModal ? 'Hide Window' : 'Find Plant'}</button>
              <div className="relative">
                <button onClick={() => setShowActivityPanel(!showActivityPanel)} className={`p-2 rounded-full transition-colors ${showActivityPanel ? 'bg-leaf-100 text-leaf-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                  <Activity size={20} />
                  {activities.filter(a => a.status === 'running' || a.status === 'needs_input').length > 0 && (<span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>)}
                </button>
              </div>
              <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><Settings size={20} /></button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden p-4 relative z-10">
            {(!isInitialized || initialLayout === null) ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-leaf-600" size={48} /></div>
            ) : isHardError || isActuallyEmpty ? (
              <EmptyState isOffline={isOffline} loadingState={loadingState} errorDetails={errorDetails} onOpenSettings={() => setShowSettingsModal(true)} onRetry={() => fetchBatch(0, true)} />
            ) : (
              <DataGrid key={gridKey} taxa={taxa} ancestors={ancestors} preferences={preferences} onPreferenceChange={setPreferences} onUpdate={handleTaxonUpdate} onAction={handleAction} totalRecords={totalRecords} isLoadingMore={isFetchingMore || isSearching} onLoadMore={handleLoadMore} sortConfig={sortConfig} onSortChange={(key, direction) => setSortConfig({ key, direction: direction as 'asc' | 'desc' })} filters={gridFilters} onFilterChange={handleFilterChange} error={loadingState === LoadingState.ERROR ? errorDetails : null} visibleColumns={initialLayout.visibleColumns} columnOrder={initialLayout.columnOrder} colWidths={initialLayout.colWidths} onLayoutUpdate={(layout) => { latestLayoutRef.current = layout; }} />
            )}
          </main>
      </div>

      <ActivityPanel activities={activities} isOpen={showActivityPanel} mode={activityPanelMode} onModeChange={setActivityPanelMode} onClose={() => setShowActivityPanel(false)} onCancel={(id) => { cancelledActivityIds.current.add(id); handleAddActivity({ id, status: 'error', message: 'Cancelled.' }); }} onRetry={(item) => {}} onDismiss={(id) => setActivities(prev => prev.filter(a => a.id !== id))} onClearAll={() => setActivities([])} onResolve={handleActivityResolve} />
      {showSettingsModal && (<SettingsModal isOpen={showSettingsModal} onClose={handleSettingsClose} preferences={preferences} onUpdate={setPreferences} onMaintenanceComplete={handleMaintenanceComplete} onSaveLayout={handleSaveLayout} onReloadLayout={handleReloadLayout} />)}
      {showAddModal && (<AddPlantModal isOpen={showAddModal} initialQuery={headerSearchQuery} onClose={() => { setShowAddModal(false); setHeaderSearchQuery(''); }} onSuccess={handleAddSuccess} onAddActivity={handleAddActivity} />)}
      {confirmState.isOpen && (<ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />)}
    </div>
  );
}