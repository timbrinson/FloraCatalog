import React, { useState, useRef, useEffect } from 'react';
import { X, Sprout, Loader2, Sparkles, AlertCircle, FileUp, List, Check, ArrowRight, Save, Info, Trash2, Play, Database, PlusCircle, Link as LinkIcon, Fingerprint, CheckCircle2, ChevronRight, Terminal } from 'lucide-react';
import { identifyTaxonomy } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { Taxon, ActivityItem, DataSource } from '../types';

const APP_VERSION = 'v2.23.0';

interface ParsedResult {
    taxonRank: string;
    name: string;
    taxonName: string;
    family?: string;
    genus?: string;
    species?: string;
    infraspecies?: string;
    infraspecificRank?: string;
    cultivar?: string;
    isHybrid: boolean;
    taxonStatus: string;
    existingId?: string;
    isAcceptedMatch?: boolean; // True if DB match name != result name (synonym correction)
}

interface TraceLog {
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    data?: any;
}

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAddActivity: (activity: ActivityItem) => void;
}

const AddPlantModal: React.FC<AddPlantModalProps> = ({ isOpen, onClose, onSuccess, onAddActivity }) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedResults, setParsedResults] = useState<ParsedResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Tracing
  const [showTrace, setShowTrace] = useState(false);
  const [traceLogs, setTraceLogs] = useState<TraceLog[]>([]);

  // Lineage & Sources
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [newSource, setNewSource] = useState<Partial<DataSource>>({ name: '', version: '', citationText: '', url: '' });
  const [isRegisteringSource, setIsRegisteringSource] = useState(false);
  const [sourceMessage, setSourceMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Bulk States
  const [batchNames, setBatchNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isOpen) {
          dataService.getDataSources().then(data => {
              setSources(data);
              const manual = data.find(s => s.id !== 1 && (s.name.toLowerCase().includes('manual') || s.name.toLowerCase().includes('flora')));
              if (manual) setSelectedSourceId(manual.id);
          });
      }
  }, [isOpen]);

  const addTrace = (message: string, level: TraceLog['level'] = 'info', data?: any) => {
      setTraceLogs(prev => [...prev, { timestamp: Date.now(), level, message, data }]);
      console.log(`[Trace] ${message}`, data || '');
  };

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputValue.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setParsedResults([]);
    setTraceLogs([]);
    
    addTrace(`Starting analysis for: "${inputValue.trim()}"`, 'info');
    
    try {
      const results = await identifyTaxonomy(inputValue.trim());
      addTrace(`AI returned ${results.length} taxonomic levels.`, 'success', results);

      if (results && results.length > 0) {
        const checkedResults: ParsedResult[] = [];
        let runningCorrectedParentName = "";

        for (const res of results) {
            addTrace(`Checking catalog for: "${res.taxonName}"`, 'info');
            
            // Check catalog for existing match
            const existing = await dataService.findTaxonByName(res.taxonName);
            let isAcceptedMatch = false;
            let finalTaxonNameForThisLevel = res.taxonName;

            if (existing) {
                if (existing.taxonName.toLowerCase() !== res.taxonName.toLowerCase()) {
                    isAcceptedMatch = true;
                    finalTaxonNameForThisLevel = existing.taxonName;
                    addTrace(`Match found in DB: Synonym "${res.taxonName}" dereferenced to Accepted "${existing.taxonName}" (ID: ${existing.id})`, 'success', { id: existing.id });
                } else {
                    addTrace(`Match found in DB: "${existing.taxonName}" (Status: ${existing.taxonStatus})`, 'success', { id: existing.id });
                }
                runningCorrectedParentName = existing.taxonName;
            } else {
                addTrace(`No existing record for "${res.taxonName}". Will be treated as NEW.`, 'warn');
                
                // If we have a corrected parent from previous steps, rewrite this level's name for preview
                if (runningCorrectedParentName) {
                    const rank = res.taxonRank.toLowerCase();
                    if (rank === 'cultivar') {
                        finalTaxonNameForThisLevel = `${runningCorrectedParentName} '${res.name}'`;
                    } else if (['variety', 'subspecies', 'form'].includes(rank)) {
                        finalTaxonNameForThisLevel = `${runningCorrectedParentName} ${res.infraspecificRank || 'var.'} ${res.name}`;
                    } else if (rank === 'species') {
                        finalTaxonNameForThisLevel = `${runningCorrectedParentName} ${res.name}`;
                    }
                    addTrace(`Rewriting proposed name to canonical: "${finalTaxonNameForThisLevel}"`, 'info');
                }
                runningCorrectedParentName = finalTaxonNameForThisLevel;
            }

            // DEDUPLICATION: Avoid adding the same box twice (e.g. if AI returns synonym and we've already added the dereferenced accepted version)
            const isDuplicate = checkedResults.some(cr => cr.taxonName === finalTaxonNameForThisLevel || (existing && cr.existingId === existing.id));
            if (!isDuplicate) {
                checkedResults.push({ ...res, taxonName: finalTaxonNameForThisLevel, existingId: existing?.id, isAcceptedMatch });
            } else {
                addTrace(`Deduplication: Level "${finalTaxonNameForThisLevel}" already in hierarchy. Skipping redundant entry.`, 'info');
            }
        }
        setParsedResults(checkedResults);
      } else {
        setError("AI could not parse this botanical name.");
        addTrace("AI parsing returned empty array.", 'error');
      }
    } catch (e: any) {
      addTrace(`Analysis failed: ${e.message}`, 'error', e);
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (parsedResults.length === 0) return;
    if (!selectedSourceId) {
        setError("Please select a data source for attribution.");
        return;
    }

    setIsSaving(true);
    setError(null);

    const targetPlant = parsedResults[parsedResults.length - 1].taxonName;
    addTrace(`Beginning Commit for Lineage: ${targetPlant}`, 'info');

    const activityId = crypto.randomUUID();
    onAddActivity({
        id: activityId,
        name: `Adding ${targetPlant}`,
        type: 'import',
        status: 'running',
        message: 'Establishing taxonomic lineage...',
        timestamp: Date.now()
    });

    try {
      let lastParentId: string | undefined = undefined;
      let lastParentName: string | undefined = undefined;
      
      const lineage = {
          family: undefined as string | undefined,
          genus: undefined as string | undefined,
          species: undefined as string | undefined,
          genusHybrid: undefined as string | undefined,
          speciesHybrid: undefined as string | undefined,
          infraspecies: undefined as string | undefined,
          infraspecificRank: undefined as string | undefined
      };

      for (const result of parsedResults) {
          const rank = result.taxonRank.toLowerCase();
          addTrace(`Processing Level: ${result.taxonRank}`, 'info', { lineageBefore: { ...lineage } });
          
          if (rank === 'family') lineage.family = result.name;
          if (rank === 'genus') { lineage.genus = result.name; lineage.genusHybrid = result.isHybrid ? '×' : undefined; }
          if (rank === 'species') { lineage.species = result.name; lineage.speciesHybrid = result.isHybrid ? '×' : undefined; }
          if (['variety', 'subspecies', 'form'].includes(rank)) { 
              lineage.infraspecies = result.name; 
              lineage.infraspecificRank = result.infraspecificRank; 
          }

          if (result.existingId) {
              addTrace(`Linking to Existing ID: ${result.existingId}`, 'success');
              const existing = await dataService.getTaxonById(result.existingId);
              if (existing) {
                  if (existing.family) lineage.family = existing.family;
                  if (existing.genus) lineage.genus = existing.genus;
                  if (existing.species) lineage.species = existing.species;
                  if (existing.infraspecies) lineage.infraspecies = existing.infraspecies;
                  if (existing.infraspecificRank) lineage.infraspecificRank = existing.infraspecificRank;
                  lastParentName = existing.taxonName;
              }
              lastParentId = result.existingId;
              continue; 
          }

          // ROBUST PARSING & NAME RECONSTRUCTION
          let correctedName = result.name;
          if (rank === 'cultivar') {
             const match = result.taxonName.match(/'([^']+)'/);
             if (match) correctedName = match[1];
          }

          const isVariety = ['variety', 'subspecies', 'form'].includes(rank);
          
          // CONSTRUCT CANONICAL NAME BASED ON PARENT
          let canonicalTaxonName = result.taxonName;
          if (lastParentName) {
              if (rank === 'cultivar') {
                  canonicalTaxonName = `${lastParentName} '${correctedName}'`;
              } else if (isVariety) {
                  canonicalTaxonName = `${lastParentName} ${result.infraspecificRank || 'var.'} ${correctedName}`;
              } else if (rank === 'species') {
                  canonicalTaxonName = `${lastParentName} ${correctedName}`;
              }
              addTrace(`Lineage reconstruction used for ${rank}: "${canonicalTaxonName}"`, 'success');
          }

          const newTaxon: Taxon = {
              id: crypto.randomUUID(),
              parentId: lastParentId,
              taxonRank: result.taxonRank,
              name: correctedName,
              taxonName: canonicalTaxonName,
              taxonStatus: 'Provisional', 
              family: lineage.family || result.family,
              genus: lineage.genus || result.genus,
              genusHybrid: lineage.genusHybrid,
              species: lineage.species || result.species,
              speciesHybrid: lineage.speciesHybrid,
              infraspecies: isVariety ? correctedName : (lineage.infraspecies || undefined),
              infraspecificRank: isVariety ? (result.infraspecificRank || 'var.') : (lineage.infraspecificRank || undefined),
              cultivar: rank === 'cultivar' ? correctedName : undefined,
              sourceId: selectedSourceId,
              verificationLevel: `FloraCatalog ${APP_VERSION} (UI)`,
              synonyms: [],
              referenceLinks: [],
              createdAt: Date.now()
          };

          addTrace(`Creating DB Record for ${rank}: ${newTaxon.taxonName}`, 'info', newTaxon);
          const saved = await dataService.createTaxon(newTaxon);
          addTrace(`Created Record ID: ${saved.id}`, 'success');
          
          // Update tracking for next iteration
          lastParentId = saved.id;
          lastParentName = saved.taxonName;
          if (isVariety) {
              lineage.infraspecies = correctedName;
              lineage.infraspecificRank = result.infraspecificRank || 'var.';
          }
      }

      onAddActivity({
          id: activityId,
          name: `Added ${targetPlant}`,
          type: 'import',
          status: 'completed',
          message: `Successfully mapped lineage to ${selectedSourceId}.`,
          timestamp: Date.now()
      });

      addTrace(`Commit Complete for ${targetPlant}.`, 'success');
      onSuccess();
    } catch (e: any) {
      addTrace(`Commit Failure: ${e.message}`, 'error', e);
      onAddActivity({
          id: activityId,
          name: `Failed to add ${targetPlant}`,
          type: 'import',
          status: 'error',
          message: e.message,
          timestamp: Date.now()
      });
      setError(`Save failed: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const names = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        setBatchNames(names);
    };
    reader.readAsText(file);
  };

  const handleCreateSource = async () => {
      if (!newSource.name) return;
      setIsRegisteringSource(true);
      setSourceMessage(null);
      try {
          const saved = await dataService.ensureDataSource(newSource);
          setSources(prev => [saved, ...prev]);
          setSelectedSourceId(saved.id);
          setSourceMessage({ type: 'success', text: `Source "${saved.name}" registered.` });
          setTimeout(() => { setShowSourceForm(false); setSourceMessage(null); setNewSource({ name: '', version: '', citationText: '', url: '' }); }, 1500);
      } catch (e: any) { setSourceMessage({ type: 'error', text: `Registration failed: ${e.message}` }); }
      finally { setIsRegisteringSource(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-leaf-50 rounded-xl">
                    <Sprout className="text-leaf-600" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Add New Plant</h3>
                    <p className="text-sm text-slate-500">Standardize nomenclature via AI & Traceability Logic.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowTrace(!showTrace)}
                    className={`p-2 rounded-full transition-all ${showTrace ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}
                    title="Toggle Technical Execution Trace"
                >
                    <Terminal size={20} />
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button 
                onClick={() => setActiveTab('single')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'single' ? 'text-leaf-700 bg-white border-b-2 border-leaf-500' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Sparkles size={14}/> Single Entry
            </button>
            <button 
                onClick={() => setActiveTab('bulk')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'bulk' ? 'text-leaf-700 bg-white border-b-2 border-leaf-500' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <List size={14}/> Bulk Upload
            </button>
        </div>

        <div className="flex-1 overflow-y-auto flex">
            {/* Main Content */}
            <div className={`flex-1 p-8 overflow-y-auto custom-scrollbar ${showTrace ? 'border-r border-slate-100' : ''}`}>
                {activeTab === 'single' ? (
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Botanical Name / Search Query</label>
                            <div className="relative group">
                                <input 
                                    type="text"
                                    className="w-full pl-4 pr-32 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ring-leaf-200 focus:border-leaf-500 outline-none transition-all font-serif text-lg"
                                    placeholder="e.g. Acer palmatum 'Katsura'"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                    disabled={isAnalyzing || isSaving}
                                />
                                <button 
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !inputValue.trim() || isSaving}
                                    className={`absolute right-2 top-2 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${isAnalyzing ? 'bg-slate-200 text-slate-400' : 'bg-leaf-600 text-white hover:bg-leaf-700 shadow-sm'}`}
                                >
                                    {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                                    Analyze
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-700">
                                <AlertCircle size={20} className="flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {parsedResults.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Proposed Hierarchy</h4>
                                        <span className="text-[10px] text-slate-400 italic">Found matches will be linked as parents</span>
                                    </div>
                                    <div className="space-y-3">
                                        {parsedResults.map((res, idx) => {
                                            const rankLower = res.taxonRank.toLowerCase();
                                            const isInfra = ['variety', 'subspecies', 'form'].includes(rankLower);
                                            return (
                                                <div key={idx} className="flex items-center gap-4 group">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${res.existingId ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-leaf-50 border-leaf-100 text-leaf-600'}`}>
                                                            {res.existingId ? <Database size={12}/> : <PlusCircle size={12}/>}
                                                        </div>
                                                        {idx < parsedResults.length - 1 && <div className="w-0.5 h-4 bg-slate-100"></div>}
                                                    </div>
                                                    <div className={`flex-1 p-3 rounded-xl border transition-all ${res.existingId ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-leaf-200 shadow-sm'}`}>
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1 leading-none">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                                        {isInfra ? 'Infraspecies' : res.taxonRank}
                                                                    </span>
                                                                    {res.existingId && (
                                                                        <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-tighter ${res.isAcceptedMatch ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                                                            {res.isAcceptedMatch ? "Linked to Accepted Parent Name" : "Linked to Existing Record"}
                                                                        </span>
                                                                    )}
                                                                    {!res.existingId && <span className="px-1.5 py-0.5 bg-leaf-100 text-leaf-700 text-[8px] font-bold rounded uppercase tracking-tighter">Will create NEW record</span>}
                                                                </div>
                                                                <span className={`text-sm font-serif italic ${res.taxonRank === 'Cultivar' ? 'not-italic font-bold' : ''}`}>{res.taxonName}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Fingerprint size={14} className="text-blue-500" /> Attribution & Lineage
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Primary Data Authority</label>
                                            <div className="flex gap-2">
                                                <select 
                                                    value={selectedSourceId || ''} 
                                                    onChange={(e) => setSelectedSourceId(Number(e.target.value))}
                                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 ring-blue-100"
                                                >
                                                    <option value="" disabled>Select Source...</option>
                                                    {sources.map(s => (
                                                        <option key={s.id} value={s.id} disabled={s.id === 1}>{s.name} {s.version ? `(${s.version})` : ''}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    onClick={() => { setShowSourceForm(!showSourceForm); setSourceMessage(null); }}
                                                    className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
                                                >
                                                    <PlusCircle size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {showSourceForm && (
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" placeholder="Source Name" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" value={newSource.name} onChange={(e) => setNewSource({...newSource, name: e.target.value})}/>
                                                    <input type="text" placeholder="Version" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" value={newSource.version} onChange={(e) => setNewSource({...newSource, version: e.target.value})}/>
                                                </div>
                                                <button onClick={handleCreateSource} disabled={isRegisteringSource || !newSource.name} className="w-full px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">Register Source</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3 pt-6 border-t border-slate-100">
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving || parsedResults.every(r => r.existingId) || !selectedSourceId}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-leaf-600 text-white rounded-xl font-bold hover:bg-leaf-700 shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                                        {parsedResults.every(r => r.existingId) ? "Records already match catalog" : "Commit Records to Catalog"}
                                    </button>
                                    <button onClick={() => setParsedResults([])} disabled={isSaving} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Reset</button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                            <FileUp size={40} className="text-slate-400 mb-4"/>
                            <p className="text-sm text-slate-500">Bulk upload functionality coming soon.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Execution Trace Sidebar */}
            {showTrace && (
                <div className="w-[350px] bg-slate-900 text-indigo-300 font-mono text-[10px] flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                        <span className="flex items-center gap-2 uppercase tracking-tighter font-bold"><Terminal size={12}/> Process Trace</span>
                        <button onClick={() => setTraceLogs([])} className="text-slate-500 hover:text-white uppercase font-bold text-[9px]">Clear</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {traceLogs.length === 0 ? (
                            <div className="text-slate-600 italic">Awaiting analysis process...</div>
                        ) : (
                            traceLogs.map((log, i) => (
                                <div key={i} className="border-l border-slate-800 pl-3 relative">
                                    {/* Fix unintentional comparison by providing a fallback string color */}
                                    <div className={`absolute -left-[4.5px] top-0.5 w-2 h-2 rounded-full ${
                                        log.level === 'success' ? 'bg-green-500' : 
                                        log.level === 'warn' ? 'bg-amber-500' : 
                                        log.level === 'error' ? 'bg-red-500' : 
                                        'bg-indigo-500'
                                    }`}></div>
                                    <div className="text-slate-500 text-[8px] mb-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                    <div className={`leading-relaxed ${log.level === 'success' ? 'text-green-300' : log.level === 'warn' ? 'text-amber-200' : log.level === 'error' ? 'text-red-300' : 'text-indigo-200'}`}>
                                        {log.message}
                                    </div>
                                    {log.data && (
                                        <div className="mt-2 p-2 bg-black/40 rounded border border-white/5 overflow-x-auto text-[9px] text-indigo-400/80">
                                            <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider pl-4">
                FloraCatalog v2.23.0 • Intelligent Hierarchy Builder
            </span>
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantModal;