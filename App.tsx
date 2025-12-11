

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Plus, RotateCcw, Table, Network, Upload, X, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { Taxon, LoadingState, TaxonomicStatus, UserPreferences, BackgroundProcess, ActivityItem, SearchCandidate } from './types';
import { identifyTaxonomy, enrichTaxon, deepScanTaxon, parseBulkText, searchTaxonCandidates } from './services/geminiService';
import TaxonRow from './components/PlantCard';
import EmptyState from './components/EmptyState';
import DataGridV2 from './components/DataGridV2';
import ConfirmDialog from './components/ConfirmDialog';
import SettingsModal from './components/SettingsModal';
import ActivityPanel from './components/ActivityPanel';
import { formatScientificName } from './utils/formatters';
import { DEFAULT_TAXA } from './defaultData';

function App() {
  const [query, setQuery] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  
  // DEFAULT: Grid View (Tree Grid V2)
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('grid');
  
  // UI States
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Refs
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  
  // Data State
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [enrichmentQueue, setEnrichmentQueue] = useState<Taxon[]>([]);
  const activeEnrichmentCount = useRef(0); 
  
  // Preferences
  const [preferences, setPreferences] = useState<UserPreferences>({ 
      hybridSpacing: 'space',
      autoEnrichment: false,
      autoFitMaxWidth: 400,
      fitScreenMaxRatio: 4.0,
      colorTheme: 'option2a'
  });
  
  // ACTIVITY MANAGEMENT
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const cancelledActivityIds = useRef<Set<string>>(new Set());

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel?: string; isDestructive?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // ------------------------------------------------------------------
  // INIT & STORAGE
  // ------------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem('flora_db');
    if (saved) { try { setTaxa(JSON.parse(saved)); } catch (e) { console.error(e); } } else { setTaxa(DEFAULT_TAXA); }
    const savedPrefs = localStorage.getItem('flora_prefs');
    if (savedPrefs) { try { setPreferences(JSON.parse(savedPrefs)); } catch(e) {} }
  }, []);

  useEffect(() => { if (taxa.length > 0) localStorage.setItem('flora_db', JSON.stringify(taxa)); }, [taxa]);
  useEffect(() => { localStorage.setItem('flora_prefs', JSON.stringify(preferences)); }, [preferences]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) { setShowToolsMenu(false); }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToolsMenu]);

  // ------------------------------------------------------------------
  // CORE LOGIC: Taxon Manipulation
  // ------------------------------------------------------------------
  const normalizeNode = (node: any) => {
      let cleanName = (node.name || '').trim();
      let genusHybrid = node.genusHybrid;
      let speciesHybrid = node.speciesHybrid;
      let rank = (node.rank || '').toLowerCase(); // Reads raw 'rank' from AI

      if (rank === 'hybrid genus' || rank === 'nothogenus') { rank = 'genus'; genusHybrid = '×'; }
      if (rank === 'hybrid species' || rank === 'nothospecies') { rank = 'species'; speciesHybrid = '×'; }

      const hybridStartRegex = /^(?:×|[xX]\s)/;
      
      if (hybridStartRegex.test(cleanName)) {
          cleanName = cleanName.replace(hybridStartRegex, '');
          if (rank === 'genus' && !genusHybrid) genusHybrid = '×';
          if (rank === 'species' && !speciesHybrid) speciesHybrid = '×';
      }
      return { ...node, name: cleanName, rank: rank, genusHybrid, speciesHybrid };
  };

  const mergeChainIntoTaxa = (chain: any[]) => {
      let newTaxaToAdd: Taxon[] = [];
      
      // Track accumulating hierarchy for denormalization
      let currentGenus: string | undefined;
      let currentGenusHybrid: string | undefined;
      let currentSpecies: string | undefined;
      let currentSpeciesHybrid: string | undefined;
      let currentFamily: string | undefined;
      
      let currentInfraspeciesName: string | undefined;
      let currentInfraspecificRank: string | undefined; 

      setTaxa(prev => {
          const next = [...prev];
          let parentId: string | undefined = undefined;

          chain.forEach(rawNode => {
              const node = normalizeNode(rawNode);
              
              if (node.rank === 'genus') {
                  currentGenus = node.name;
                  currentGenusHybrid = node.genusHybrid;
                  currentFamily = node.family || currentFamily;
                  currentSpecies = undefined;
                  currentSpeciesHybrid = undefined;
                  currentInfraspeciesName = undefined;
                  currentInfraspecificRank = undefined;
              }
              if (node.rank === 'species') {
                  currentSpecies = node.name;
                  currentSpeciesHybrid = node.speciesHybrid;
                  currentInfraspeciesName = undefined;
                  currentInfraspecificRank = undefined;
              }
              if (['subspecies', 'variety', 'form'].includes(node.rank)) {
                  currentInfraspeciesName = node.name;
                  if (node.rank === 'subspecies') currentInfraspecificRank = 'subsp.';
                  if (node.rank === 'variety') currentInfraspecificRank = 'var.';
                  if (node.rank === 'form') currentInfraspecificRank = 'f.';
              }

              // Check existing using taxonRank field
              let existing = next.find(t => t.taxonRank === node.rank && t.name.toLowerCase() === node.name.toLowerCase() && t.parentId === parentId);
              
              if (existing) { 
                  parentId = existing.id; 
              } else {
                  const newId = crypto.randomUUID();
                  
                  let infraspeciesField = undefined;
                  let cultivarField = undefined;
                  
                  if (['subspecies', 'variety', 'form'].includes(node.rank)) {
                      infraspeciesField = `${node.name}`.trim();
                  }
                  if (node.rank === 'cultivar') {
                      cultivarField = node.name;
                      if (currentInfraspeciesName) {
                          infraspeciesField = `${currentInfraspeciesName}`.trim();
                      }
                  }

                  // CONSTRUCT FULL NAME if missing or just simple name
                  let finalTaxonName = node.fullName || node.scientificName;
                  if (!finalTaxonName || finalTaxonName === node.name) {
                      const parts = [];
                      if (currentGenus) parts.push(currentGenusHybrid ? `× ${currentGenus}` : currentGenus);
                      if (currentSpecies) parts.push(currentSpeciesHybrid ? `× ${currentSpecies}` : currentSpecies);
                      
                      // For infraspecies, we need the rank prefix for the Full Name
                      if (infraspeciesField) {
                         const rankPrefix = currentInfraspecificRank ? `${currentInfraspecificRank} ` : '';
                         parts.push(`${rankPrefix}${infraspeciesField}`);
                      }
                      
                      if (node.rank === 'cultivar') {
                          parts.push(`'${node.name}'`);
                      } else if (node.rank !== 'genus' && node.rank !== 'species' && node.rank !== 'variety' && node.rank !== 'subspecies') {
                          parts.push(node.name);
                      }
                      
                      if (parts.length === 0) finalTaxonName = node.name;
                      else finalTaxonName = parts.join(' ');
                  }

                  const newTaxon: Taxon = {
                      id: newId, 
                      parentId: parentId, 
                      taxonRank: node.rank, // Mapping here!
                      name: node.name, 
                      taxonName: finalTaxonName, // Renamed from scientificName
                      genus: currentGenus,
                      genusHybrid: currentGenusHybrid,
                      species: currentSpecies,
                      speciesHybrid: currentSpeciesHybrid,
                      infraspecies: infraspeciesField,
                      infraspecificRank: currentInfraspecificRank,
                      cultivar: cultivarField,
                      taxonStatus: 'Accepted', 
                      commonName: node.commonName, 
                      family: node.family || currentFamily, 
                      synonyms: [], 
                      referenceLinks: [], 
                      createdAt: Date.now(), 
                      isDetailsLoaded: false
                  };
                  next.push(newTaxon);
                  newTaxaToAdd.push(newTaxon);
                  parentId = newId;
              }
          });
          return next;
      });
      if (preferences.autoEnrichment && newTaxaToAdd.length > 0) { setEnrichmentQueue(q => [...q, ...newTaxaToAdd]); }
  };
  
  // ------------------------------------------------------------------
  // ACTIVITY & PROCESS MANAGER
  // ------------------------------------------------------------------
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
              mergeChainIntoTaxa(chain);
              completeActivity(id, `Added ${candidate.taxonName}`);
          } catch(e) {
              failActivity(id, "Failed to add plant", true);
          }
      }
  };

  // ------------------------------------------------------------------
  // EXECUTORS
  // ------------------------------------------------------------------

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
                      const chain = await identifyTaxonomy(name);
                      mergeChainIntoTaxa(chain);
                  } catch(e) {}
              }
              return true;
          });
          if (cancelledActivityIds.current.has(actId)) {
              failActivity(actId, "Cancelled by user");
          } else {
              completeActivity(actId, "Mining complete");
          }
      } catch (err: any) {
          console.error("Mining failed:", err);
          failActivity(actId, "Failed: " + err.message, true);
      }
  };

  const executeSearch = async (queryTerm: string, existingId?: string) => {
      const actId = addActivity(`Searching: "${queryTerm}"`, 'search', queryTerm, existingId);
      
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
          const existing = taxa.find(t => 
              t.taxonName.toLowerCase() === topMatch.taxonName.toLowerCase()
          );

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
          const chain = await identifyTaxonomy(topMatch.taxonName);
          mergeChainIntoTaxa(chain);
          completeActivity(actId, `Added ${topMatch.taxonName}`);

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

      if (mode === 'missing') {
          targetTaxa = taxa.filter(t => !t.isDetailsLoaded);
      } else {
          targetTaxa = [...taxa];
      }

      if (targetTaxa.length === 0) {
          alert("No matching plants found to enrich.");
          return;
      }

      if (confirm(`Start enrichment for ${targetTaxa.length} plants?`)) {
          if (mode === 'all_replace') {
              setTaxa(prev => prev.map(t => ({ ...t, isDetailsLoaded: false })));
          }
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
              mergeChainIntoTaxa(chain); 
              count++; 
              updateActivity(actId, `Importing ${count}/${chains.length}...`, { details: { parsedCount: chains.length, current: count, lastChain: chain }}); 
          }
          if (cancelledActivityIds.current.has(actId)) failActivity(actId, "Cancelled");
          else completeActivity(actId, `Imported ${count} plants`);
          setImportText(''); 
      } catch(e) { failActivity(actId, "Import failed", true); } 
  };

  const handleReset = () => {
      setConfirmState({
          isOpen: true, title: "Reset Database?", message: "Delete all plants?", confirmLabel: "Reset", isDestructive: true,
          onConfirm: () => { localStorage.removeItem('flora_db'); window.location.reload(); }
      });
  };

  const handleDelete = (id: string) => {
      const idsToDelete = new Set<string>();
      const collectIds = (targetId: string) => {
          idsToDelete.add(targetId);
          taxa.filter(t => t.parentId === targetId).forEach(child => collectIds(child.id));
      };
      collectIds(id);
      setTaxa(prev => prev.filter(t => !idsToDelete.has(t.id)));
  };

  const handleUpdate = (id: string, updates: Partial<Taxon>) => {
      setTaxa(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  
  const handleGridAction = (action: 'mine' | 'enrich', taxon: Taxon) => {
      if (action === 'mine') handleMineTaxon(taxon);
      if (action === 'enrich') handleEnrichSingleTaxon(taxon);
  };

  // Background Enrichment Effect (Consolidated)
  useEffect(() => {
      if (enrichmentQueue.length === 0) return;

      const processQueue = async () => {
          const items = [...enrichmentQueue];
          setEnrichmentQueue([]); // Clear immediately
          
          activeEnrichmentCount.current += items.length;
          
          const actId = 'enrichment-global';
          addActivity(`Enriching details...`, 'enrichment', items, actId);
          updateActivity(actId, `Processing ${activeEnrichmentCount.current} plants...`, { status: 'running' });

          // Process Loop
          for (const item of items) {
              if (cancelledActivityIds.current.has(actId)) {
                  // If cancelled, clear the rest of the queue logic
                  activeEnrichmentCount.current = 0;
                  failActivity(actId, "Cancelled by user");
                  return;
              }

              try {
                  const details = await enrichTaxon(item);
                  handleUpdate(item.id, { ...details, isDetailsLoaded: true });
              } catch(e) {
                  // Ignore
              } finally {
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


  // -------------------------------------------------------
  // Renderers
  // -------------------------------------------------------
  const renderTree = (parentId?: string, depth = 0) => {
      const children = taxa.filter(t => t.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
      if (children.length === 0) return null;

      return children.map(node => (
          <React.Fragment key={node.id}>
              <TaxonRow 
                  taxon={node} 
                  depth={depth} 
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  preferences={preferences}
              />
              {renderTree(node.id, depth + 1)}
          </React.Fragment>
      ));
  };

  return (
    <div className="min-h-screen font-sans text-slate-600 bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm flex-shrink-0">
        <div className={`mx-auto px-4 py-4 flex justify-between items-center transition-all duration-300 ${viewMode === 'grid' ? 'max-w-[98vw]' : 'max-w-6xl'}`}>
            <div className="flex items-center gap-2">
                <Leaf className="text-leaf-600" size={24} />
                <h1 className="text-xl font-serif font-bold text-slate-800">FloraCatalog <span className="text-xs font-sans font-normal text-slate-400 ml-2">Database</span></h1>
            </div>
            
            <form onSubmit={handleAddPlant} className="flex gap-2 w-full max-w-md mx-4">
                <input 
                    className="flex-1 bg-slate-100 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-leaf-200 text-sm"
                    placeholder="Add Taxon (e.g. Lycoris rosea)..."
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

            <div className="flex items-center gap-2">
                 <div className="bg-slate-100 p-1 rounded-lg flex">
                    <button 
                        onClick={() => setViewMode('tree')}
                        className={`p-1.5 rounded ${viewMode === 'tree' ? 'bg-white shadow text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Tree View"
                    >
                        <Network size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-leaf-600' : 'text-slate-400 hover:text-slate-600'}`}
                         title="Spreadsheet View"
                    >
                        <Table size={18} />
                    </button>
                 </div>
                 
                 <button 
                    onClick={() => setShowImportModal(true)}
                    className="text-slate-400 hover:text-leaf-600 p-2" 
                    title="Smart Import (Text/CSV)"
                 >
                     <Upload size={20}/>
                 </button>

                 <div className="relative" ref={toolsMenuRef}>
                     <button 
                        onClick={() => setShowToolsMenu(!showToolsMenu)}
                        className="text-slate-400 hover:text-slate-600 p-2" 
                        title="Tools / Enrichment"
                     >
                         <Wrench size={20}/>
                     </button>
                     {showToolsMenu && (
                         <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1">
                             <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Enrichment Tools</div>
                             <button onClick={() => handleEnrichmentTools('missing')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded">Enrich Missing Details</button>
                             <button onClick={() => handleEnrichmentTools('all_add')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded">Enrich All (Additive)</button>
                             <button onClick={() => handleEnrichmentTools('all_replace')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 rounded">Enrich All (Replace)</button>
                         </div>
                     )}
                 </div>
                 
                 <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="text-slate-400 hover:text-slate-600 p-2" 
                    title="Settings"
                 >
                     <SettingsIcon size={20}/>
                 </button>
                 
                 <button type="button" onClick={handleReset} className="text-slate-300 hover:text-red-400 p-2" title="Reset Database"><RotateCcw size={20}/></button>
            </div>
        </div>
      </header>
      
      {/* MODALS */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
                <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Smart Text Import</h3>
                <textarea 
                    className="w-full h-64 border border-slate-200 rounded-lg p-4 text-sm font-mono focus:ring-2 ring-leaf-200 outline-none mb-4"
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                />
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

      <SettingsModal 
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          preferences={preferences}
          onUpdate={setPreferences}
      />

      <ConfirmDialog 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          isDestructive={confirmState.isDestructive}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({...prev, isOpen: false}))}
      />
      
      <ActivityPanel 
          activities={activities} 
          onCancel={cancelActivity}
          onDismiss={dismissActivity}
          onRetry={handleRetryActivity}
          onResolve={handleResolveActivity}
      />

      <main className={`mx-auto px-4 py-8 flex-1 w-full transition-all duration-300 ${viewMode === 'grid' ? 'max-w-[98vw]' : 'max-w-6xl'}`}>
         {taxa.length === 0 ? <EmptyState /> : (
             <>
                {/* PERSISTENT VIEWS: Use CSS hiding instead of conditional rendering */}
                <div className="hidden">
                     <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                         <table className="w-full text-left">
                             <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                 <tr>
                                     <th className="p-3 pl-8 w-1/2">Taxon Name</th>
                                     <th className="p-3 w-1/4">Common Name</th>
                                     <th className="p-3">Family / Notes</th>
                                     <th className="p-3 text-right">Actions</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {renderTree(undefined, 0)}
                             </tbody>
                         </table>
                     </div>
                </div>
                
                <div className={viewMode === 'grid' ? 'block' : 'hidden'}>
                    <div className="h-[calc(100vh-140px)]">
                        <DataGridV2 
                            taxa={taxa} 
                            preferences={preferences} 
                            onAction={handleGridAction} 
                        />
                    </div>
                </div>
                 {/* Tree View temporarily hidden but logic maintained */}
                 <div className={viewMode === 'tree' ? 'block' : 'hidden'}>
                     <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                         <table className="w-full text-left">
                             <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                 <tr>
                                     <th className="p-3 pl-8 w-1/2">Taxon Name</th>
                                     <th className="p-3 w-1/4">Common Name</th>
                                     <th className="p-3">Family / Notes</th>
                                     <th className="p-3 text-right">Actions</th>
                                 </tr>
                             </thead>
                             <tbody>
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