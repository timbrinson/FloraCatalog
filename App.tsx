import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Activity, Settings, Plus } from 'lucide-react';
import { Taxon, LoadingState, UserPreferences, ActivityItem, ActivityStatus, RankPallet } from './types';
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

const DEFAULT_PALLET: RankPallet = {
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
  const [showAddModal, setShowAddModal] = useState(false);
  
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
      auto_fit_max_width: 400,
      fit_screen_max_ratio: 4.0,
      grid_pallet: DEFAULT_PALLET,
      search_mode: 'prefix',
      debug_mode: false
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const cancelledActivityIds = useRef<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel?: string; isDestructive?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  /**
   * initialLayout: Starts as NULL. 
   * CRITICAL: DataGrid is NOT rendered while this is NULL to prevent flickering.
   */
  const [initialLayout, setInitialLayout] = useState<AppLayoutConfig | null>(null);
  
  const latestLayoutRef = useRef<{
      visibleColumns: string[];
      columnOrder: string[];
      colWidths: Record<string, number>;
  } | null>(null);

  const [gridKey, setGridKey] = useState(0);

  /**
   * loadGlobalSettings: Fetch configuration from database.
   */
  const loadGlobalSettings = async (): Promise<AppLayoutConfig> => {
    try {
        const saved = await dataService.getGlobalSettings();
        settingsLoadedRef.current = true; 

        if (saved && Object.keys(saved).length > 0) {
            if (saved.preferences) {
                setPreferences(prev => {
                    const mergedPrefs = { ...prev, ...saved.preferences };
                    // HEALING LOGIC: Ensure all pallet levels exist even if user has a legacy save
                    if (saved.preferences.grid_pallet) {
                        mergedPrefs.grid_pallet = {
                            ...DEFAULT_PALLET,
                            ...saved.preferences.grid_pallet
                        };
                    } else {
                        mergedPrefs.grid_pallet = DEFAULT_PALLET;
                    }
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

  /**
   * INITIAL STARTUP: Orchestrates the first settings load.
   */
  useEffect(() => {
    const init = async () => {
      const hasCreds = !!(localStorage.getItem('supabase_url') && localStorage.getItem('supabase_anon_key'));
      
      if (hasCreds) {
          for (let i = 0; i < 5; i++) {
              if (!getIsOffline()) break;
              await new Promise(r => setTimeout(r, 200));
          }
      }

      const currentOffline = getIsOffline();
      setIsOffline(currentOffline);

      if (!currentOffline) {
          const fallback = setTimeout(() => {
              if (initialLayout === null) {
                  setInitialLayout({});
                  setIsInitialized(true);
              }
          }, 3000);

          try {
              const config = await loadGlobalSettings();
              clearTimeout(fallback);
              setInitialLayout(config);
              setIsInitialized(true);
          } catch (e) {
              setInitialLayout({});
              setIsInitialized(true);
          }
      } else {
          setInitialLayout({});
          setIsInitialized(true);
      }
    };
    init();
  }, []);

  /**
   * CONNECTION WATCHER: Late-synchronization for online transitions
   */
  useEffect(() => {
    const interval = setInterval(() => {
        const currentOffline = getIsOffline();
        
        if (!currentOffline && !settingsLoadedRef.current && isInitialized) {
            loadGlobalSettings().then(config => {
                if (config && Object.keys(config).length > 0) {
                    setInitialLayout(config);
                    setGridKey(prev => prev + 1); 
                }
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
      if (key === 'taxon_status') {
        return !Array.isArray(value) || value.length !== 1 || value[0] !== 'Accepted';
      }
      return value && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '');
    });
  }, [gridFilters]);

  const handleSaveLayout = async () => {
    if (getIsOffline() || !latestLayoutRef.current) return;
    try {
        await dataService.saveGlobalSettings({
            preferences,
            filters: gridFilters,
            visibleColumns: latestLayoutRef.current.visibleColumns,
            columnOrder: latestLayoutRef.current.columnOrder,
            colWidths: latestLayoutRef.current.colWidths
        });
        alert("Layout saved.");
    } catch (e: any) {
        alert(`Failed: ${e.message}`);
    }
  };

  const handleReloadLayout = async () => {
    if (getIsOffline()) return;
    const config = await loadGlobalSettings();
    if (settingsLoadedRef.current) {
        setInitialLayout(config);
        setGridKey(prev => prev + 1);
        alert("Settings reloaded.");
    }
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
          setIsSearching(true);
          setOffset(0);
          setTotalRecords(0);
          setErrorDetails(null);
      } else {
          setIsFetchingMore(true);
      }

      const thisQueryId = activeQueryIdRef.current;
      
      try {
          const limit = 100;
          const { data, count } = await dataService.getTaxa({ 
            offset: currentOffset, 
            limit, 
            filters: gridFilters, 
            sort_by: sortConfig.key, 
            sort_direction: sortConfig.direction,
            should_count: isNewSearch,
            search_mode: preferences.search_mode 
          });
          
          if (thisQueryId !== activeQueryIdRef.current) return;

          if (isNewSearch) { 
              setTaxa(data); 
              setAncestors([]); 
              if (count !== -1) setTotalRecords(count);
              setLoadingState(LoadingState.SUCCESS);
          } else {
              setTaxa(prev => {
                  const ids = new Set(prev.map(t => t.id));
                  return [...prev, ...data.filter(t => !ids.has(t.id))];
              });
          }
          
          setHasMore(data.length === limit);
      } catch (e: any) {
          if (e.name === 'AbortError') return;
          if (thisQueryId !== activeQueryIdRef.current) return;
          setErrorDetails(e.message || "Database error.");
          setLoadingState(LoadingState.ERROR);
      } finally {
          if (thisQueryId === activeQueryIdRef.current) {
              setIsFetchingMore(false);
              setIsSearching(false);
          }
      }
  };

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
                      const uniqueNew = newAncestors.filter(a => !ids.has(a.id));
                      return [...prev, ...uniqueNew];
                  });
              }
              isHydratingRef.current = false;
          };
          hydrate();
      }
  }, [taxa, ancestors]);

  useEffect(() => {
    if (taxa.length === 0) {
      if (ancestors.length > 0) setAncestors([]);
      return;
    }
    setAncestors(prev => {
      const filtered = prev.filter(a => {
        const isDirectParent = taxa.some(t => t.parent_id === a.id);
        const isIndirectParent = prev.some(other => other.parent_id === a.id && taxa.some(t => t.parent_id === other.id));
        return isDirectParent || isIndirectParent;
      });
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [taxa]);

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
      } catch (e: any) {
          alert(`Failed: ${e.message}`);
      }
  };

  /**
   * handleAction: Orchestrates AI Curator Tasks (Mining/Enrichment).
   */
  const handleAction = async (action: 'mine' | 'enrich', taxon: Taxon) => {
      const id = crypto.randomUUID();
      const actionName = action === 'mine' ? 'Mining' : 'Enriching';
      
      const newActivity: ActivityItem = {
          id,
          name: `${actionName} ${taxon.taxon_name}`,
          type: action === 'mine' ? 'mining' : 'enrichment',
          status: 'running',
          message: 'Connecting to botanical AI...',
          timestamp: Date.now()
      };
      
      setActivities(prev => [newActivity, ...prev]);
      setShowActivityPanel(true);

      try {
          if (action === 'enrich') {
              setActivities(prev => prev.map(a => a.id === id ? { ...a, message: 'Consulting primary authorities...' } : a));
              const findings = await enrichTaxon(taxon);
              
              if (cancelledActivityIds.current.has(id)) return;

              await handleTaxonUpdate(taxon.id, findings);
              
              setActivities(prev => prev.map(a => a.id === id ? { 
                  ...a, 
                  status: 'completed', 
                  message: 'Horticultural record enriched.',
                  details: findings
              } : a));
          } else {
              setActivities(prev => prev.map(a => a.id === id ? { ...a, message: 'Searching herbaria and web records...' } : a));
              const currentLinks = taxon.reference_links || [];
              const findings = await findAdditionalLinks(taxon.taxon_name, currentLinks);
              
              if (cancelledActivityIds.current.has(id)) return;

              if (findings.length > 0) {
                  await handleTaxonUpdate(taxon.id, { reference_links: [...currentLinks, ...findings] });
                  setActivities(prev => prev.map(a => a.id === id ? { 
                      ...a, 
                      status: 'completed', 
                      message: `Found ${findings.length} authoritative links.`,
                      details: findings
                  } : a));
              } else {
                  setActivities(prev => prev.map(a => a.id === id ? { 
                      ...a, 
                      status: 'completed', 
                      message: 'No new unique references discovered.' 
                  } : a));
              }
          }
      } catch (e: any) {
          if (cancelledActivityIds.current.has(id)) return;
          setActivities(prev => prev.map(a => a.id === id ? { 
              ...a, 
              status: 'error', 
              message: e.message || 'AI service unavailable.' 
          } : a));
      }
  };

  const handleAddActivity = (activity: ActivityItem) => {
      setActivities(prev => {
          const exists = prev.find(a => a.id === activity.id);
          if (exists) return prev.map(a => a.id === activity.id ? activity : a);
          return [activity, ...prev];
      });
  };

  const handleAddSuccess = () => { setShowAddModal(false); fetchBatch(0, true); };
  const handleMaintenanceComplete = () => { setTaxa([]); setOffset(0); fetchBatch(0, true); };

  const isHardError = (isOffline || (loadingState === LoadingState.ERROR && !isInitialized));
  const isActuallyEmpty = taxa.length === 0 && !isFiltering && loadingState === LoadingState.SUCCESS && totalRecords === 0 && isInitialized;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-2 text-leaf-700 font-serif text-xl font-bold"><Leaf className="text-leaf-600" /> FloraCatalog</div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-1.5 bg-leaf-600 text-white text-xs font-bold rounded-full hover:bg-leaf-700 transition-colors shadow-sm"><Plus size={16} /> Add Plant</button>
          <div className="relative">
            <button onClick={() => setShowActivityPanel(!showActivityPanel)} className={`p-2 rounded-full transition-colors ${showActivityPanel ? 'bg-leaf-100 text-leaf-700' : 'text-slate-500 hover:bg-slate-100'}`}>
              <Activity size={20} />
              {activities.filter(a => a.status === 'running' || a.status === 'needs_input').length > 0 && (<span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>)}
            </button>
            {showActivityPanel && (<ActivityPanel activities={activities} isOpen={showActivityPanel} onClose={() => setShowActivityPanel(false)} onCancel={(id) => { cancelledActivityIds.current.add(id); setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'error', message: 'Cancelled.' } : a)); }} onRetry={(item) => {}} onDismiss={(id) => setActivities(prev => prev.filter(a => a.id !== id))} />)}
          </div>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><Settings size={20} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4 relative">
        {(!isInitialized || initialLayout === null) ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-leaf-600" size={48} /></div>
        ) : isHardError || isActuallyEmpty ? (
          <EmptyState isOffline={isOffline} loadingState={loadingState} errorDetails={errorDetails} onOpenSettings={() => setShowSettingsModal(true)} onRetry={() => fetchBatch(0, true)} />
        ) : (
          <DataGrid 
            key={gridKey}
            taxa={taxa} 
            ancestors={ancestors} 
            preferences={preferences} 
            onPreferenceChange={setPreferences} 
            onUpdate={handleTaxonUpdate} 
            onAction={handleAction} 
            totalRecords={totalRecords} 
            isLoadingMore={isFetchingMore || isSearching} 
            onLoadMore={handleLoadMore} 
            sortConfig={sortConfig} 
            onSortChange={(key, direction) => setSortConfig({ key, direction: direction as 'asc' | 'desc' })} 
            filters={gridFilters} 
            onFilterChange={handleFilterChange} 
            error={loadingState === LoadingState.ERROR ? errorDetails : null}
            visibleColumns={initialLayout.visibleColumns}
            columnOrder={initialLayout.columnOrder}
            colWidths={initialLayout.colWidths}
            onLayoutUpdate={(layout) => { latestLayoutRef.current = layout; }}
          />
        )}
      </main>

      {showSettingsModal && (
        <SettingsModal 
            isOpen={showSettingsModal} 
            onClose={handleSettingsClose} 
            preferences={preferences} 
            onUpdate={setPreferences} 
            onMaintenanceComplete={handleMaintenanceComplete} 
            onSaveLayout={handleSaveLayout}
            onReloadLayout={handleReloadLayout}
        />
      )}
      {showAddModal && (<AddPlantModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} onAddActivity={handleAddActivity} />)}
      {confirmState.isOpen && (<ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmLabel={confirmState.confirmLabel} isDestructive={confirmState.isDestructive} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />)}
    </div>
  );
}