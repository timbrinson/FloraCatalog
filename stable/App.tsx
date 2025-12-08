
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Leaf, Plus, RotateCcw, Table, Network, Upload, X, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { Taxon, LoadingState, TaxonomicStatus, UserPreferences, BackgroundProcess } from '../types';
import { identifyTaxonomy, enrichTaxon, deepScanTaxon, parseBulkText } from '../services/geminiService';
import TaxonRow from '../components/PlantCard';
import EmptyState from '../components/EmptyState';
import DataGrid from '../components/DataGrid';
import ConfirmDialog from '../components/ConfirmDialog';
import SettingsModal from '../components/SettingsModal';
import ProcessMonitor from '../components/ProcessMonitor';
import { formatScientificName } from '../utils/formatters';

// ------------------------------------------------------------------
// DEFAULT DATA (Refactored to Hierarchy + WCVP fields)
// ------------------------------------------------------------------
const DEFAULT_TAXA: Taxon[] = [
    // 1. Agave ovatifolia 'Frosty Blue'
    { 
        id: '1', rank: 'genus', name: 'Agave', scientificName: 'Agave', taxonomicStatus: 'Accepted', family: 'Asparagaceae', commonName: 'Century Plant', synonyms: [], referenceLinks: [], createdAt: 1,
        authorship: 'L.', plantNameId: 'urn:lsid:ipni.org:names:320035-2',
        geographicArea: 'Americas', firstPublished: 'Sp. Pl.: 323 (1753)',
        reviewed: 'Y', lifeformDescription: 'Succulent subshrub', climateDescription: 'Subtropical'
    },
    { 
        id: '2', parentId: '1', rank: 'species', name: 'ovatifolia', scientificName: 'Agave ovatifolia', taxonomicStatus: 'Accepted', commonName: "Whale's Tongue Agave", synonyms: [], referenceLinks: [], createdAt: 2,
        authorship: 'G.D.Starr & Villarreal', geographicArea: 'Mexico Northeast', plantNameId: 'urn:lsid:ipni.org:names:60435868-2',
        firstPublished: 'Sida 20: 395 (2002)', publication: 'Sida 20: 395', volumeAndPage: '20: 395',
        reviewed: 'Y', lifeformDescription: 'Succulent', climateDescription: 'Subtropical'
    },
    { id: '3', parentId: '2', rank: 'cultivar', name: 'Frosty Blue', scientificName: "Agave ovatifolia 'Frosty Blue'", taxonomicStatus: 'Accepted', commonName: "Frosty Blue Agave", synonyms: [], referenceLinks: [], createdAt: 3, description: "Intense powder-blue foliage selection." },

    // 2. Agave parryi var. truncata 'Huntington'
    { 
        id: '4', parentId: '1', rank: 'species', name: 'parryi', scientificName: 'Agave parryi', taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 4,
        authorship: 'Engelm.', geographicArea: 'Arizona to Mexico', plantNameId: 'urn:lsid:ipni.org:names:6193-2',
        firstPublished: 'Trans. Acad. Sci. St. Louis 3: 311 (1875)',
        reviewed: 'Y'
    },
    { 
        id: '5', parentId: '4', rank: 'variety', name: 'truncata', scientificName: 'Agave parryi var. truncata', taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 5,
        authorship: 'Gentry', geographicArea: 'Mexico (Durango, Zacatecas)', plantNameId: 'urn:lsid:ipni.org:names:22502-2',
        firstPublished: 'Publ. Carnegie Inst. Wash. 527: 523 (1940)',
        nomenclaturalRemarks: 'nom. illeg. if treated as sp.', reviewed: 'Y'
    },
    { 
        id: '13', parentId: '4', rank: 'subspecies', name: 'truncata', scientificName: 'Agave parryi subsp. truncata', taxonomicStatus: 'Synonym', synonyms: [], referenceLinks: [], createdAt: 5,
        authorship: 'Gentry', geographicArea: 'Mexico (Durango, Zacatecas)', plantNameId: 'urn:lsid:ipni.org:names:99999-1',
        acceptedNameId: 'urn:lsid:ipni.org:names:22502-2',
        firstPublished: 'Agaves Cont. N. Amer.: 523 (1982)'
    },
    { id: '6', parentId: '5', rank: 'cultivar', name: 'Huntington', scientificName: "Agave parryi var. truncata 'Huntington'", taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 6, description: "A clone distributed by the Huntington Botanical Gardens." },
    
    // 3. Colocasia 'Mojito'
    { 
        id: '10', rank: 'genus', name: 'Colocasia', scientificName: 'Colocasia', taxonomicStatus: 'Accepted', family: 'Araceae', commonName: 'Elephant Ear', synonyms: [], referenceLinks: [], createdAt: 10,
        authorship: 'Schott', plantNameId: 'urn:lsid:ipni.org:names:2745-1', firstPublished: 'Melet. Bot.: 18 (1832)',
        geographicArea: 'Trop. & Subtrop. Asia'
    },
    { 
        id: '11', parentId: '10', rank: 'species', name: 'esculenta', scientificName: 'Colocasia esculenta', taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 11,
        authorship: '(L.) Schott', geographicArea: 'Trop. & Subtrop. Asia to N. Australia', plantNameId: 'urn:lsid:ipni.org:names:86629-1',
        firstPublished: 'Melet. Bot.: 18 (1832)', parentheticalAuthor: 'L.', publicationAuthor: 'Schott',
        reviewed: 'Y'
    },
    { id: '12', parentId: '11', rank: 'cultivar', name: 'Mojito', scientificName: "Colocasia esculenta 'Mojito'", taxonomicStatus: 'Accepted', description: "Speckled with midnight purple.", synonyms: [], referenceLinks: [], createdAt: 12 },

    // 4. Hybrid Example: x Mangave
    {
        id: '20', rank: 'genus', name: 'Mangave', scientificName: '× Mangave', taxonomicStatus: 'Accepted', family: 'Asparagaceae', synonyms: [], referenceLinks: [], createdAt: 20,
        authorship: 'J.M.Webber', genusHybrid: '×', hybridFormula: 'Agave × Manfreda',
        firstPublished: 'Madroño 12: 120 (1953)', plantNameId: 'urn:lsid:ipni.org:names:295627-2',
        reviewed: 'Y'
    }
];

function App() {
  const [query, setQuery] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  
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
  const activeEnrichmentCount = useRef(0); // Track concurrent enrichment count
  
  // Preferences
  const [preferences, setPreferences] = useState<UserPreferences>({ 
      hybridSpacing: 'space',
      autoEnrichment: false, // Default to OFF as requested
      autoFitMaxWidth: 400,
      fitScreenMaxRatio: 4.0
  });
  
  // Processes (Tracking background jobs)
  const [processes, setProcesses] = useState<BackgroundProcess[]>([]);
  // Store cancelled Process IDs
  const cancelledProcessIds = useRef<Set<string>>(new Set());

  // Confirmation State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Load from Storage
  useEffect(() => {
    const saved = localStorage.getItem('flora_db');
    if (saved) {
      try { setTaxa(JSON.parse(saved)); } catch (e) { console.error(e); }
    } else {
      setTaxa(DEFAULT_TAXA);
    }
    
    const savedPrefs = localStorage.getItem('flora_prefs');
    if (savedPrefs) {
        try { setPreferences(JSON.parse(savedPrefs)); } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (taxa.length > 0) localStorage.setItem('flora_db', JSON.stringify(taxa));
  }, [taxa]);
  
  useEffect(() => {
      localStorage.setItem('flora_prefs', JSON.stringify(preferences));
  }, [preferences]);

  // Click Outside for Tools Menu
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
              setShowToolsMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToolsMenu]);

  // Helper: Hybrid Normalization
  const normalizeNode = (node: any) => {
      let cleanName = node.name.trim();
      let genusHybrid = node.genusHybrid;
      let speciesHybrid = node.speciesHybrid;
      let rank = (node.rank || '').toLowerCase();

      // 1. Sanitize Ranks
      if (rank === 'hybrid genus' || rank === 'nothogenus') {
          rank = 'genus';
          genusHybrid = '×';
      }
      if (rank === 'hybrid species' || rank === 'nothospecies') {
          rank = 'species';
          speciesHybrid = '×';
      }

      // 2. Strip x/× from the NAME field. 
      if (/^[×x]\s?/i.test(cleanName)) {
          cleanName = cleanName.replace(/^[×x]\s?/i, '');
          // Auto-detect hybrid status if not already set by AI
          if (rank === 'genus' && !genusHybrid) genusHybrid = '×';
          if (rank === 'species' && !speciesHybrid) speciesHybrid = '×';
      }

      return {
          ...node,
          name: cleanName,
          rank: rank, 
          genusHybrid,
          speciesHybrid,
      };
  };

  // Logic: Hierarchical Tree Builder
  const mergeChainIntoTaxa = (chain: any[]) => {
      let newTaxaToAdd: Taxon[] = [];

      setTaxa(prev => {
          const next = [...prev];
          let parentId: string | undefined = undefined;

          chain.forEach(rawNode => {
              const node = normalizeNode(rawNode);
              let existing = next.find(t => 
                  t.rank === node.rank && 
                  t.name.toLowerCase() === node.name.toLowerCase() &&
                  t.parentId === parentId
              );

              if (existing) {
                  parentId = existing.id; 
              } else {
                  const newId = crypto.randomUUID();
                  const newTaxon: Taxon = {
                      id: newId,
                      parentId: parentId,
                      rank: node.rank,
                      name: node.name,
                      scientificName: node.fullName, 
                      genusHybrid: node.genusHybrid,
                      speciesHybrid: node.speciesHybrid,
                      taxonomicStatus: 'Accepted', 
                      commonName: node.commonName,
                      family: node.family, 
                      synonyms: [],
                      referenceLinks: [],
                      createdAt: Date.now(),
                      isDetailsLoaded: false
                  };
                  next.push(newTaxon);
                  newTaxaToAdd.push(newTaxon); // Capture for queue
                  parentId = newId;
              }
          });
          return next;
      });
      
      // Auto-Enrichment Trigger
      if (preferences.autoEnrichment && newTaxaToAdd.length > 0) {
          setEnrichmentQueue(q => [...q, ...newTaxaToAdd]);
      }
  };

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoadingState(LoadingState.LOADING);
    
    try {
        const chain = await identifyTaxonomy(query);
        mergeChainIntoTaxa(chain);
        setQuery('');
        setLoadingState(LoadingState.SUCCESS);
    } catch (e) {
        console.error(e);
        setLoadingState(LoadingState.ERROR);
    }
  };

  const handleReset = () => {
      setConfirmState({
          isOpen: true,
          title: "Reset Database?",
          message: "This will delete all your plants and restore the default dataset. This action cannot be undone.",
          confirmLabel: "Reset",
          isDestructive: true,
          onConfirm: () => {
              localStorage.removeItem('flora_db');
              window.location.reload();
          }
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
  
  // -------------------------------------------------------
  // Process Management
  // -------------------------------------------------------
  const addProcess = (name: string, type: 'mining' | 'import' | 'enrichment', existingId?: string) => {
      const id = existingId || crypto.randomUUID();
      // Ensure it's not cancelled from a previous run
      cancelledProcessIds.current.delete(id);
      setProcesses(p => {
          if (p.find(x => x.id === id)) return p; 
          return [...p, { id, name, type, status: 'Starting...' }];
      });
      return id;
  };
  
  const updateProcess = (id: string, status: string, name?: string) => {
      setProcesses(p => p.map(proc => proc.id === id ? { ...proc, status, name: name || proc.name } : proc));
  };
  
  const removeProcess = (id: string) => {
      setProcesses(p => p.filter(proc => proc.id !== id));
      cancelledProcessIds.current.delete(id);
  };

  const cancelProcess = (id: string) => {
      cancelledProcessIds.current.add(id);
      // Optimistic update status
      updateProcess(id, "Cancelling...");
  };

  const cancelAllProcesses = () => {
      processes.forEach(p => cancelledProcessIds.current.add(p.id));
      setProcesses(p => p.map(proc => ({ ...proc, status: "Cancelling..." })));
  };

  const executeMining = async (taxon: Taxon) => {
      setConfirmState(prev => ({ ...prev, isOpen: false }));
      
      // Use scientificName for accurate mining context
      const displayName = taxon.scientificName || taxon.name;
      
      const procId = addProcess(`Mining ${displayName}`, 'mining');
      
      try {
          // deepScanTaxon now accepts an async callback that returns boolean (shouldContinue)
          await deepScanTaxon(displayName, taxon.rank, async (names, status) => {
              // Check Cancellation
              if (cancelledProcessIds.current.has(procId)) {
                  return false; // Stop Signal
              }

              updateProcess(procId, status);
              for (const name of names) {
                  try {
                      // Check cancellation mid-batch
                      if (cancelledProcessIds.current.has(procId)) break;
                      
                      const chain = await identifyTaxonomy(name);
                      mergeChainIntoTaxa(chain);
                  } catch(e) {}
              }
              return true; // Continue
          });
      } catch (err) {
          console.error("Mining failed:", err);
      } finally {
          removeProcess(procId);
      }
  };

  const handleMineTaxon = (taxon: Taxon) => {
      setConfirmState({
          isOpen: true,
          title: `Start deep scan for ${taxon.scientificName}?`,
          message: `This will search for all registered cultivars associated with the ${taxon.rank} "${taxon.scientificName}".`,
          confirmLabel: "Start Mining",
          onConfirm: () => executeMining(taxon)
      });
  };
  
  // -------------------------------------------------------
  // Enrichment Tools
  // -------------------------------------------------------
  const handleEnrichSingleTaxon = (taxon: Taxon) => {
      setConfirmState({
          isOpen: true,
          title: `Enrich Details?`,
          message: `Fetch additional details (description, links, etc.) for ${taxon.scientificName}?`,
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
          // If 'all_replace', we signal the enrichment to overwrite fields even if non-empty
          // For now, standard enrichment just fills.
          // Reset 'isDetailsLoaded' if we want to force re-fetch
          if (mode === 'all_replace') {
              setTaxa(prev => prev.map(t => ({ ...t, isDetailsLoaded: false })));
              // Re-filter after state update? No, just queue them all
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
      if(!importText.trim()) return;
      const procId = addProcess("Bulk Import", 'import');
      setShowImportModal(false);
      
      try {
          const chains = await parseBulkText(importText);
          let count = 0;
          for (const chain of chains) {
              mergeChainIntoTaxa(chain);
              count++;
              updateProcess(procId, `Importing ${count}/${chains.length}...`);
          }
          setImportText('');
          removeProcess(procId);
      } catch(e) {
          updateProcess(procId, "Failed.");
          setTimeout(() => removeProcess(procId), 3000);
          alert("Import failed. Try smaller chunks.");
      } 
  };

  // Background Enrichment Effect (Consolidated)
  useEffect(() => {
      if (enrichmentQueue.length === 0) return;

      const processQueue = async () => {
          const items = [...enrichmentQueue];
          setEnrichmentQueue([]); // Clear immediately
          
          activeEnrichmentCount.current += items.length;
          
          const procId = 'enrichment-global';
          addProcess(`Enriching details...`, 'enrichment', procId);
          updateProcess(procId, `Processing ${activeEnrichmentCount.current} plants...`);

          // Process Loop
          // Not parallelizing ALL at once to respect rate limits more gently,
          // but we do small batches or individual to check cancellation
          for (const item of items) {
              if (cancelledProcessIds.current.has(procId)) {
                  // If cancelled, clear the rest of the queue logic
                  activeEnrichmentCount.current = 0;
                  removeProcess(procId);
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
                      removeProcess(procId);
                      activeEnrichmentCount.current = 0;
                  } else {
                      updateProcess(procId, `Processing ${activeEnrichmentCount.current} plants...`);
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
      
      <ProcessMonitor 
          processes={processes} 
          onCancel={cancelProcess}
          onCancelAll={cancelAllProcesses}
      />

      <main className={`mx-auto px-4 py-8 flex-1 w-full transition-all duration-300 ${viewMode === 'grid' ? 'max-w-[98vw]' : 'max-w-6xl'}`}>
         {taxa.length === 0 ? <EmptyState /> : (
             <>
                {/* PERSISTENT VIEWS: Use CSS hiding instead of conditional rendering */}
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
                
                <div className={viewMode === 'grid' ? 'block' : 'hidden'}>
                    <div className="h-[calc(100vh-140px)]">
                        <DataGrid 
                            taxa={taxa} 
                            preferences={preferences}
                            onAction={(action, taxon) => {
                                if (action === 'mine') handleMineTaxon(taxon);
                                if (action === 'enrich') handleEnrichSingleTaxon(taxon);
                            }}
                        />
                    </div>
                </div>
             </>
         )}
      </main>
    </div>
  );
}

export default App;
