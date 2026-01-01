
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Activity, Settings, Plus } from 'lucide-react';
import { Taxon, LoadingState, UserPreferences, ActivityItem, ActivityStatus } from './types';
import { dataService } from './services/dataService';
import { getIsOffline } from './services/supabaseClient';
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
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingRef = useRef(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'taxon_name', direction: 'asc' });
  const [gridFilters, setGridFilters] = useState<Record<string, any>>({ taxon_status: ['Accepted'] });
  const [isOffline, setIsOffline] = useState(getIsOffline());
  const [preferences, setPreferences] = useState<UserPreferences>({ 
      hybrid_spacing: 'space',
      auto_enrichment: false,
      auto_fit_max_width: 400,
      fit_screen_max_ratio: 4.0,
      color_theme: 'option2a',
      search_mode: 'prefix'
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const cancelledActivityIds = useRef<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel?: string; isDestructive?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const isFiltering = useMemo(() => {
    return Object.entries(gridFilters).some(([key, value]) => {
      if (key === 'taxon_status') {
        return !Array.isArray(value) || value.length !== 1 || value[0] !== 'Accepted';
      }
      return value && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '');
    });
  }, [gridFilters]);

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
          const { data, count } = await dataService.getTaxa({ 
            offset: currentOffset, 
            limit, 
            filters: gridFilters, 
            sort_by: sortConfig.key, 
            sort_direction: sortConfig.direction,
            should_count: isNewSearch,
            search_mode: preferences.search_mode 
          });
          
          if (isNewSearch) { 
              setTaxa(data); 
              if (count !== -1) setTotalRecords(count);
              else if (data.length === 0) setTotalRecords(0);
          } else {
              setTaxa(prev => [...prev, ...data]);
          }
          
          setHasMore(data.length === limit);
          setLoadingState(LoadingState.SUCCESS);
          setIsInitialized(true);
          setIsFetchingMore(false);
      } catch (e: any) {
          setErrorDetails(e.message || "Database error.");
          setLoadingState(LoadingState.ERROR);
          setIsFetchingMore(false);
          if (!isInitialized && taxa.length > 0) setIsInitialized(true);
      } finally { isFetchingRef.current = false; }
  };

  useEffect(() => { 
    setOffset(0); 
    fetchBatch(0, true); 
  }, [gridFilters, sortConfig, preferences.search_mode]);

  const handleFilterChange = (key: string, value: any) => setGridFilters(prev => ({ ...prev, [key]: value }));
  const handleSettingsClose = () => { setShowSettingsModal(false); if (!getIsOffline()) fetchBatch(0, true); };
  const handleLoadMore = () => { if (!hasMore || isFetchingRef.current || loadingState === LoadingState.LOADING) return; const n = offset + 100; setOffset(n); fetchBatch(n, false); };
  
  const handleTaxonUpdate = async (id: string, updates: Partial<Taxon>) => {
      try {
          await dataService.updateTaxon(id, updates);
          setTaxa(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
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

  useEffect(() => { const s = localStorage.getItem('flora_prefs_rev2'); if (s) try { setPreferences(JSON.parse(s)); } catch(e) {} }, []); 
  useEffect(() => localStorage.setItem('flora_prefs_rev2', JSON.stringify(preferences)), [preferences]);

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
        {(!isInitialized && loadingState === LoadingState.LOADING) ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-leaf-600" size={48} /></div>
        ) : isHardError || isActuallyEmpty ? (
          <EmptyState isOffline={isOffline} loadingState={loadingState} errorDetails={errorDetails} onOpenSettings={() => setShowSettingsModal(true)} onRetry={() => fetchBatch(0, true)} />
        ) : (
          <DataGrid taxa={taxa} preferences={preferences} onPreferenceChange={setPreferences} onUpdate={handleTaxonUpdate} onAction={handleAction} totalRecords={totalRecords} isLoadingMore={isFetchingMore || loadingState === LoadingState.LOADING} onLoadMore={handleLoadMore} sortConfig={sortConfig} onSortChange={(key, direction) => setSortConfig({ key, direction: direction as 'asc' | 'desc' })} filters={gridFilters} onFilterChange={handleFilterChange} error={loadingState === LoadingState.ERROR ? errorDetails : null} />
        )}
      </main>

      {showSettingsModal && (<SettingsModal isOpen={showSettingsModal} onClose={handleSettingsClose} preferences={preferences} onUpdate={setPreferences} onMaintenanceComplete={handleMaintenanceComplete} />)}
      {showAddModal && (<AddPlantModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} onAddActivity={handleAddActivity} />)}
      {confirmState.isOpen && (<ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmLabel={confirmState.confirmLabel} isDestructive={confirmState.isDestructive} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />)}
    </div>
  );
}
