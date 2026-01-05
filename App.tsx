import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Activity, Settings, Plus } from 'lucide-react';
import { Taxon, LoadingState, UserPreferences, ActivityItem, ActivityStatus } from './types';
import { dataService } from './services/dataService';
import { getIsOffline, reloadClient } from './services/supabaseClient';
import EmptyState from './components/EmptyState';
import DataGrid from './components/DataGrid';
import ConfirmDialog from './components/ConfirmDialog';
import SettingsModal from './components/SettingsModal';
import ActivityPanel from './components/ActivityPanel';
import AddPlantModal from './components/AddPlantModal';

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
      color_theme: 'option2a',
      search_mode: 'prefix',
      debug_mode: false,
      grouping_strategy: 'path'
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const cancelledActivityIds = useRef<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel?: string; isDestructive?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [initialLayout, setInitialLayout] = useState<{
      visibleColumns?: Set<string>;
      columnOrder?: string[];
      colWidths?: Record<string, number>;
  }>({});
  
  const latestLayoutRef = useRef<{
      visibleColumns: string[];
      columnOrder: string[];
      colWidths: Record<string, number>;
  } | null>(null);

  const [gridKey, setGridKey] = useState(0);

  /**
   * loadGlobalSettings: Fetch configuration from database
   */
  const loadGlobalSettings = async () => {
    console.log("🔍 [App.LoadSettings] Querying Database for global settings...");
    try {
        const saved = await dataService.getGlobalSettings();
        if (saved && Object.keys(saved).length > 0) {
            console.log("🔍 [App.LoadSettings] Database settings FOUND:", saved);
            if (saved.preferences) setPreferences(saved.preferences);
            if (saved.filters) setGridFilters(saved.filters);
            
            const layoutUpdate = {
                visibleColumns: Array.isArray(saved.visibleColumns) ? new Set<string>(saved.visibleColumns) : undefined,
                columnOrder: Array.isArray(saved.columnOrder) ? saved.columnOrder : undefined,
                colWidths: (saved.colWidths && typeof saved.colWidths === 'object') ? saved.colWidths : undefined
            };
            setInitialLayout(layoutUpdate);
            settingsLoadedRef.current = true;
            return true;
        } else {
            console.log("🔍 [App.LoadSettings] Database settings EMPTY or UNAVAILABLE.");
            return false;
        }
    } catch (e) {
        console.error("❌ [App.LoadSettings] Error during fetch:", e);
        return false;
    }
  };

  /**
   * INITIAL STARTUP: Orchestrates the first settings load but avoids hanging
   */
  useEffect(() => {
    const init = async () => {
      console.log("🔍 [App.init] Starting startup sequence...");
      
      // Attempt 1: Immediate
      const success = await loadGlobalSettings();
      
      // If failed, the interval watcher below will keep trying once online.
      // But we set initialized to TRUE here to let the app mount and show settings/empty states.
      if (!success) {
          console.warn("🔍 [App.init] Initial settings fetch yielded no results. Connection might be pending.");
      }
      
      setIsInitialized(true);
    };
    init();
  }, []);

  /**
   * CONNECTION WATCHER: Automatically retries settings load when coming online
   */
  useEffect(() => {
    const interval = setInterval(() => {
        const currentOffline = getIsOffline();
        
        // If we were offline and now we're online, or if settings haven't loaded yet...
        if ((isOffline && !currentOffline) || (!settingsLoadedRef.current && !currentOffline)) {
            console.log(`🌐 [App.Watcher] Client ready (Offline: ${currentOffline}). Attempting settings sync...`);
            setIsOffline(currentOffline);
            if (!currentOffline) {
                loadGlobalSettings();
            }
        } else if (isOffline !== currentOffline) {
            setIsOffline(currentOffline);
        }
    }, 1500);
    return () => clearInterval(interval);
  }, [isOffline]);

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
        alert("Layout and settings saved to database.");
    } catch (e: any) {
        alert(`Failed to save: ${e.message}`);
    }
  };

  const handleReloadLayout = async () => {
    console.log("🔄 [App.Reload] User selected Reload Settings action.");
    if (getIsOffline()) {
        alert("App is offline. Cannot reload from database.");
        return;
    }
    const success = await loadGlobalSettings();
    if (success) {
        setGridKey(prev => prev + 1);
        alert("Settings reloaded from database.");
    } else {
        alert("No saved settings found in database.");
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
    if (isInitialized) fetchBatch(0, true); 
  }, [gridFilters, sortConfig, preferences.search_mode, isInitialized]);

  const handleFilterChange = (key: string, value: any) => setGridFilters(prev => ({ ...prev, [key]: value }));
  const handleSettingsClose = () => { setShowSettingsModal(false); if (!getIsOffline()) fetchBatch(0, true); };
  const handleLoadMore = () => { if (!hasMore || isSearching || isFetchingMore) return; const n = offset + 100; setOffset(n); fetchBatch(n, false); };
  
  const handleTaxonUpdate = async (id: string, updates: Partial<Taxon>) => {
      try {
          await dataService.updateTaxon(id, updates);
          setTaxa(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
          setAncestors(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      } catch (e: any) {
          alert(`Failed to update: ${e.message}`);
      }
  };

  const handleAction = (action: 'mine' | 'enrich', taxon: Taxon) => {
      const id = crypto.randomUUID();
      const newActivity: ActivityItem = {
          id,
          name: `${action === 'mine' ? 'Mining' : 'Enriching'} ${taxon.taxon_name}`,
          type: action === 'mine' ? 'mining' : 'enrichment',
          status: 'running',
          message: 'Initializing AI curator...',
          timestamp: Date.now()
      };
      setActivities(prev => [newActivity, ...prev]);
      setShowActivityPanel(true);
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
        {(!isInitialized) ? (
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