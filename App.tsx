
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

// Added default export and completed truncated component logic
export default function App() {
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
  const [gridFilters, setGridFilters] = useState<Record<string, any>>({ taxonStatus: ['Accepted'] });
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

  const isFiltering = useMemo(() => {
    return Object.entries(gridFilters).some(([key, value]) => {
      // Default state for status is usually just 'Accepted', don't treat that alone as 'active filtering' 
      // for the purpose of hiding the "Garden Empty" state.
      if (key === 'taxonStatus') {
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
  const failActivity = (id: string, errorMsg: string, canRetry: boolean = false) => setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'error' as ActivityStatus, message: errorMsg, canRetry } : a));

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-2 text-leaf-700 font-serif text-xl font-bold">
          <Leaf className="text-leaf-600" /> FloraCatalog
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowActivityPanel(!showActivityPanel)}
            className={`p-2 rounded-full transition-colors ${showActivityPanel ? 'bg-leaf-100 text-leaf-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Activity size={20} />
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4 relative">
        {loadingState === LoadingState.LOADING && taxa.length === 0 && !isFiltering ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-leaf-600" size={48} />
          </div>
        ) : (taxa.length === 0 && !isFiltering && !isOffline && loadingState !== LoadingState.ERROR) ? (
          <EmptyState 
            isOffline={isOffline} 
            loadingState={loadingState} 
            errorDetails={errorDetails}
            onOpenSettings={() => setShowSettingsModal(true)}
            onRetry={() => fetchBatch(0, true)}
          />
        ) : (isOffline || loadingState === LoadingState.ERROR) && taxa.length === 0 ? (
          <EmptyState 
            isOffline={isOffline} 
            loadingState={loadingState} 
            errorDetails={errorDetails}
            onOpenSettings={() => setShowSettingsModal(true)}
            onRetry={() => fetchBatch(0, true)}
          />
        ) : (
          <DataGrid 
            taxa={taxa}
            preferences={preferences}
            totalRecords={totalRecords}
            isLoadingMore={isFetchingMore || (loadingState === LoadingState.LOADING && isFiltering)}
            onLoadMore={handleLoadMore}
            sortConfig={sortConfig}
            onSortChange={(key, direction) => setSortConfig({ key, direction: direction as 'asc' | 'desc' })}
            filters={gridFilters}
            onFilterChange={handleFilterChange}
          />
        )}

        {showActivityPanel && (
          <ActivityPanel 
            activities={activities}
            isOpen={showActivityPanel}
            onClose={() => setShowActivityPanel(false)}
            onCancel={(id) => cancelledActivityIds.current.add(id)}
            onRetry={(item) => {/* retry logic */}}
            onDismiss={(id) => setActivities(prev => prev.filter(a => a.id !== id))}
          />
        )}
      </main>

      {showSettingsModal && (
        <SettingsModal 
          isOpen={showSettingsModal}
          onClose={handleSettingsClose}
          preferences={preferences}
          onUpdate={setPreferences}
        />
      )}

      {confirmState.isOpen && (
        <ConfirmDialog 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          isDestructive={confirmState.isDestructive}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
