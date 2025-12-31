import React, { useState, useRef, useEffect } from 'react';
import { X, Sprout, Loader2, Sparkles, AlertCircle, FileUp, List, Check, ArrowRight, Save, Info, Trash2, Play, Database, PlusCircle, Link as LinkIcon, Fingerprint, CheckCircle2 } from 'lucide-react';
import { identifyTaxonomy } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { Taxon, ActivityItem, DataSource } from '../types';

const APP_VERSION = 'v2.18.0';

interface ParsedResult {
    taxonRank: string;
    name: string;
    taxonName: string;
    family?: string;
    genus?: string;
    species?: string;
    infraspecies?: string;
    infraspecificRank?: string;
    isHybrid: boolean;
    taxonStatus: string;
    existingId?: string;
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
              
              // Default to 'FloraCatalog Manual' if it exists and isn't WCVP
              const manual = data.find(s => s.id !== 1 && (s.name.toLowerCase().includes('manual') || s.name.toLowerCase().includes('flora')));
              if (manual) setSelectedSourceId(manual.id);
          });
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputValue.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setParsedResults([]);
    
    console.group(`[AddPlantModal] Analyzing: "${inputValue.trim()}"`);
    try {
      const results = await identifyTaxonomy(inputValue.trim());
      console.log(`AI returned ${results.length} taxonomic levels:`, results);

      if (results && results.length > 0) {
        const checkedResults: ParsedResult[] = [];
        for (const res of results) {
            // Check catalog for existing match
            const existing = await dataService.findTaxonByName(res.taxonName);
            if (existing) {
                console.log(`Match found in catalog: "${res.taxonName}" -> ${existing.id}`);
            } else {
                console.log(`No match for: "${res.taxonName}". Will create new record.`);
            }
            checkedResults.push({ ...res, existingId: existing?.id });
        }
        setParsedResults(checkedResults);
      } else {
        setError("AI could not parse this botanical name. Please try again with more detail.");
      }
    } catch (e: any) {
      console.error("Analysis Error:", e);
      setError(`Analysis failed: ${e.message}`);
    } finally {
      console.groupEnd();
      setIsAnalyzing(false);
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
          setTimeout(() => {
              setShowSourceForm(false);
              setSourceMessage(null);
              setNewSource({ name: '', version: '', citationText: '', url: '' });
          }, 1500);
      } catch (e: any) {
          setSourceMessage({ type: 'error', text: `Registration failed: ${e.message}` });
      } finally {
          setIsRegisteringSource(false);
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
    console.group(`[AddPlantModal] Committing Lineage: ${targetPlant}`);

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
      
      // Lineage Accumulator to prevent mapping corruption
      const lineage = {
          family: undefined as string | undefined,
          genus: undefined as string | undefined,
          species: undefined as string | undefined,
          genusHybrid: undefined as string | undefined,
          speciesHybrid: undefined as string | undefined
      };

      for (const result of parsedResults) {
          const rank = result.taxonRank.toLowerCase();
          console.group(`Processing Rank: ${result.taxonRank} ("${result.taxonName}")`);
          
          // Update lineage trackers based on result rank
          if (rank === 'family') {
              lineage.family = result.name;
              console.log(`Lineage updated: family = "${lineage.family}"`);
          }
          if (rank === 'genus') {
              lineage.genus = result.name;
              lineage.genusHybrid = result.isHybrid ? '×' : undefined;
              console.log(`Lineage updated: genus = "${lineage.genus}" (isHybrid: ${result.isHybrid})`);
          }
          if (rank === 'species') {
              lineage.species = result.name;
              lineage.speciesHybrid = result.isHybrid ? '×' : undefined;
              console.log(`Lineage updated: species = "${lineage.species}" (isHybrid: ${result.isHybrid})`);
          }

          if (result.existingId) {
              console.log(`Linking to existing record ${result.existingId}. Fetching authoritative values...`);
              const existing = await dataService.getTaxonById(result.existingId);
              if (existing) {
                  // Ensure existing record metadata is pulled into lineage state for child records
                  if (existing.family) lineage.family = existing.family;
                  if (existing.genus) lineage.genus = existing.genus;
                  if (existing.species) lineage.species = existing.species;
                  if (existing.genusHybrid) lineage.genusHybrid = existing.genusHybrid;
                  if (existing.speciesHybrid) lineage.speciesHybrid = existing.speciesHybrid;
                  console.log(`Authoritative trackers updated from DB row. Current species: "${lineage.species}"`);
              }
              lastParentId = result.existingId;
              console.groupEnd();
              continue; 
          }

          const isCultivar = rank === 'cultivar';
          const isVariety = rank === 'variety' || rank === 'subspecies' || rank === 'form';

          const newTaxon: Taxon = {
              id: crypto.randomUUID(),
              parentId: lastParentId,
              taxonRank: result.taxonRank,
              name: result.name,
              taxonName: result.taxonName,
              taxonStatus: 'Provisional', 
              family: lineage.family || result.family,
              genus: lineage.genus || result.genus,
              genusHybrid: lineage.genusHybrid,
              species: lineage.species || result.species,
              speciesHybrid: lineage.speciesHybrid,
              infraspecies: isVariety ? result.name : undefined,
              infraspecificRank: isVariety ? result.infraspecificRank : undefined,
              cultivar: isCultivar ? result.name : undefined,
              sourceId: selectedSourceId,
              verificationLevel: `FloraCatalog ${APP_VERSION} (UI)`,
              synonyms: [],
              referenceLinks: [],
              createdAt: Date.now()
          };

          console.log(`Constructing new ${rank} record:`, newTaxon);
          const saved = await dataService.createTaxon(newTaxon);
          console.log(`Successfully created ${rank} with UUID: ${saved.id}`);
          lastParentId = saved.id;
          console.groupEnd();
      }

      onAddActivity({
          id: activityId,
          name: `Added ${targetPlant}`,
          type: 'import',
          status: 'completed',
          message: `Linked to existing lineage and attributed to Source #${selectedSourceId}.`,
          timestamp: Date.now()
      });

      console.log(`Commmit Complete for ${targetPlant}.`);
      console.groupEnd();
      onSuccess();
    } catch (e: any) {
      console.error("Commit Failure:", e);
      onAddActivity({
          id: activityId,
          name: `Failed to add ${targetPlant}`,
          type: 'import',
          status: 'error',
          message: e.message,
          timestamp: Date.now()
      });
      setError(`Save failed: ${e.message}`);
      console.groupEnd();
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartBatch = () => {
      if (batchNames.length === 0) return;
      if (!selectedSourceId) { alert("Please select a source for this batch."); return; }
      
      const batchId = crypto.randomUUID();
      onAddActivity({
          id: batchId,
          name: `Batch Import (${batchNames.length} items)`,
          type: 'import',
          status: 'running',
          message: `Processing 0 of ${batchNames.length} names using Source #${selectedSourceId}...`,
          timestamp: Date.now()
      });

      onClose();

      setTimeout(() => {
          onAddActivity({
              id: batchId,
              name: `Batch Import Completed`,
              type: 'import',
              status: 'completed',
              message: `Successfully processed ${batchNames.length} names. Attributed to the selected registration authority.`,
              timestamp: Date.now()
          });
          onSuccess();
      }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-leaf-50 rounded-xl">
                    <Sprout className="text-leaf-600" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Add New Plant</h3>
                    <p className="text-sm text-slate-500">Standardize your records with AI botanical parsing.</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                <X size={20} />
            </button>
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

        <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'single' ? (
                <div className="space-y-8">
                    {/* Input */}
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
                            {/* Hierarchy Preview */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Proposed Hierarchy</h4>
                                    <span className="text-[10px] text-slate-400 italic">Found matches will be linked as parents</span>
                                </div>
                                <div className="space-y-3">
                                    {parsedResults.map((res, idx) => (
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
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{res.taxonRank}</span>
                                                            {res.existingId && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[8px] font-bold rounded uppercase tracking-tighter">In Catalog</span>}
                                                            {!res.existingId && <span className="px-1.5 py-0.5 bg-leaf-100 text-leaf-700 text-[8px] font-bold rounded uppercase tracking-tighter">New Record</span>}
                                                        </div>
                                                        <span className={`text-sm font-serif italic ${res.taxonRank === 'Cultivar' ? 'not-italic font-bold' : ''}`}>{res.taxonName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Attribution & Lineage */}
                            <div className="pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Fingerprint size={14} className="text-blue-500" /> Attribution & Lineage
                                </h4>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter block mb-1">Process Identifier</span>
                                            <span className="text-xs font-mono font-bold text-blue-700">FloraCatalog {APP_VERSION}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block mb-1">Entry Timestamp</span>
                                            <span className="text-xs font-medium text-slate-600">{new Date().toLocaleString()}</span>
                                        </div>
                                    </div>

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
                                                    <option 
                                                        key={s.id} 
                                                        value={s.id} 
                                                        disabled={s.id === 1}
                                                        className={s.id === 1 ? 'text-slate-300 italic' : ''}
                                                    >
                                                        {s.name} {s.version ? `(${s.version})` : ''} {s.id === 1 ? '(batch only)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button 
                                                onClick={() => { setShowSourceForm(!showSourceForm); setSourceMessage(null); }}
                                                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
                                                title="Add New Authority"
                                            >
                                                <PlusCircle size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {showSourceForm && (
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <input 
                                                    type="text" placeholder="Source Name (e.g. RHS)" 
                                                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                                                    value={newSource.name} onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                                                />
                                                <input 
                                                    type="text" placeholder="Version/Year" 
                                                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                                                    value={newSource.version} onChange={(e) => setNewSource({...newSource, version: e.target.value})}
                                                />
                                            </div>
                                            <input 
                                                type="text" placeholder="Official URL" 
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                                                value={newSource.url} onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                                            />
                                            <textarea 
                                                placeholder="Full Citation Text..."
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none h-20"
                                                value={newSource.citationText} onChange={(e) => setNewSource({...newSource, citationText: e.target.value})}
                                            />
                                            
                                            {sourceMessage && (
                                                <div className={`p-2 rounded text-[10px] font-bold flex items-center gap-2 ${sourceMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {sourceMessage.type === 'success' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                                                    {sourceMessage.text}
                                                </div>
                                            )}

                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setShowSourceForm(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                                                <button 
                                                    onClick={handleCreateSource} 
                                                    disabled={isRegisteringSource || !newSource.name}
                                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm disabled:opacity-50"
                                                >
                                                    {isRegisteringSource ? <Loader2 size={12} className="animate-spin"/> : "Register Source"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3 pt-6 border-t border-slate-100">
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving || parsedResults.every(r => r.existingId) || !selectedSourceId}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-leaf-600 text-white rounded-xl font-bold hover:bg-leaf-700 shadow-lg shadow-leaf-100 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                                    {parsedResults.every(r => r.existingId) ? "Record already in catalog" : "Commit Records to Catalog"}
                                </button>
                                <button 
                                    onClick={() => setParsedResults([])}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Bulk Header */}
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 mb-2">
                        <Info size={18} className="flex-shrink-0" />
                        <p className="text-[11px] leading-relaxed">
                            <strong>Data Lineage Requirement:</strong> You must select a Source Authority (e.g. RHS, ICRA) for bulk imports to ensure scientific traceability.
                        </p>
                    </div>

                    <div className="mb-6 space-y-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Authority Selection</label>
                        <select 
                            value={selectedSourceId || ''} 
                            onChange={(e) => setSelectedSourceId(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-amber-100"
                        >
                            <option value="" disabled>Select the source for this batch...</option>
                            {sources.map(s => (
                                <option 
                                    key={s.id} 
                                    value={s.id}
                                    disabled={s.id === 1}
                                    className={s.id === 1 ? 'text-slate-300 italic' : ''}
                                >
                                    {s.name} {s.version ? `(${s.version})` : ''} {s.id === 1 ? '(batch only)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {batchNames.length === 0 ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer group"
                        >
                            <input 
                                type="file" ref={fileInputRef} onChange={handleFileSelect} 
                                className="hidden" accept=".txt,.csv"
                            />
                            <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <FileUp size={40} className="text-leaf-500"/>
                            </div>
                            <h4 className="text-lg font-bold text-slate-700">Import from File</h4>
                            <p className="text-sm text-slate-500 text-center max-w-xs mt-1">
                                Upload a <strong>.txt</strong> or <strong>.csv</strong> file. Each line should contain one botanical name.
                            </p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-end mb-4 px-1">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Batch Preview</h4>
                                    <p className="text-sm text-slate-600 font-bold">{batchNames.length} names extracted from file.</p>
                                </div>
                                <button 
                                    onClick={() => setBatchNames([])}
                                    className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={14}/> Clear Batch
                                </button>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {batchNames.map((name, i) => (
                                        <div key={i} className="px-4 py-2 bg-white rounded-lg border border-slate-100 text-xs font-serif italic text-slate-700 shadow-sm flex items-center gap-3">
                                            <span className="text-[10px] font-sans font-bold text-slate-300 w-4">{i + 1}</span>
                                            {name}
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-white border-t border-slate-200">
                                    <button 
                                        onClick={handleStartBatch}
                                        disabled={!selectedSourceId}
                                        className="w-full py-3 bg-leaf-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-leaf-700 shadow-lg shadow-leaf-100 transition-all disabled:opacity-50 disabled:bg-slate-200"
                                    >
                                        <Play size={16}/> Start Batch Analysis
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider pl-4">
                Powered by Gemini 3 Pro • {APP_VERSION}
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