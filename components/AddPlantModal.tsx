// DO NOT add any new files, classes, or namespaces.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    X, Sprout, Loader2, Sparkles, Database, PlusCircle, CheckCircle2, 
    AlertTriangle, ArrowRight, CornerDownRight, GripHorizontal, 
    Search, Library, Info, ChevronRight, Globe, Cpu, Check, Boxes,
    Eye, SearchCode, Tags, Award, ChevronDown, Layers
} from 'lucide-react';
import { validatePlantIntent, generatePlantCandidates } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { Taxon, ActivityItem, ActivityStatus, ActivityStep, SearchCandidate, Synonym } from '../types';
import { assembleScientificName, normalizeTaxonParts, getNakedName, parseBotanicalName } from '../utils/formatters';

const APP_VERSION = 'v2.35.5';

interface CandidateGroup {
    primary: SearchCandidate;
    variations: SearchCandidate[];
}

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAddActivity: (activity: ActivityItem) => void;
  initialQuery?: string;
}

const AddPlantModal: React.FC<AddPlantModalProps> = ({ 
    isOpen, onClose, onSuccess, onAddActivity, initialQuery = ''
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [localMatches, setLocalMatches] = useState<Taxon[]>([]);
  const [candidateGroups, setCandidateGroups] = useState<CandidateGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCommiting, setIsCommiting] = useState(false);
  const [showLocalPrompt, setShowLocalPrompt] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoSearched = useRef(false);

  // Drag State
  const [pos, setPos] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPos({ x: dragStartRef.current.startX + dx, y: dragStartRef.current.startY + dy });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Focus and Auto-Search logic
  useEffect(() => {
    if (isOpen) {
        // Reset state for new session
        if (!initialQuery) {
            setQuery('');
            setCandidateGroups([]);
            setLocalMatches([]);
            setShowLocalPrompt(false);
            setError(null);
        }
        
        // Focus the input
        setTimeout(() => inputRef.current?.focus(), 150);

        // Auto-search if query passed from header
        if (initialQuery && !hasAutoSearched.current) {
            setQuery(initialQuery);
            handleDiscovery(false, initialQuery);
            hasAutoSearched.current = true;
        }
    } else {
        hasAutoSearched.current = false;
    }
  }, [isOpen, initialQuery]);

  const onDragStart = (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, startX: pos.x, startY: pos.y };
  };

  const toggleGroup = (idx: number) => {
      const next = new Set(expandedGroups);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      setExpandedGroups(next);
  };

  const handleDiscovery = async (forceGlobal: boolean = false, overrideQuery?: string) => {
    const searchTarget = overrideQuery || query;
    if (!searchTarget.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setCandidateGroups([]);
    setLocalMatches([]);

    const activityId = crypto.randomUUID();
    const activity: ActivityItem = {
        id: activityId,
        name: `Discovery: ${searchTarget}`,
        type: 'search',
        status: 'running',
        message: 'Initializing discovery engine...',
        timestamp: Date.now(),
        inputs: { query: searchTarget },
        steps: []
    };
    onAddActivity(activity);

    try {
      // Stage 0: Botanical Lexer & Local Discovery
      if (!forceGlobal) {
          const step0: ActivityStep = { label: 'Stage 0: Deterministic Lexer (Local)', status: 'running', timestamp: Date.now() };
          activity.steps.push(step0);
          onAddActivity({ ...activity });

          const lexedParts = parseBotanicalName(searchTarget);
          const localHits = await dataService.findNakedMatch(searchTarget);
          
          step0.data = { 
              lexed_tokens: lexedParts,
              strategy: "Atomic Token Interrogation (Database Equality)",
              count: localHits.length, 
              results: localHits.map(h => h.taxon_name) 
          };
          step0.status = 'completed';
          
          if (localHits.length > 0) {
              setLocalMatches(localHits);
              setShowLocalPrompt(true);
              setIsSearching(false);
              activity.status = 'needs_input';
              activity.message = `${localHits.length} local matches found. Sovereignty prompt active.`;
              onAddActivity({ ...activity });
              return;
          }
      }

      setShowLocalPrompt(false);

      // Stage 1: Intent & Validation
      const step1: ActivityStep = { label: 'Stage 1: Intent Validation (Flash)', status: 'running', timestamp: Date.now() };
      activity.steps.push(step1);
      onAddActivity({ ...activity });

      const validation = await validatePlantIntent(searchTarget);
      step1.data = validation;
      if (!validation.is_valid) {
          throw new Error(validation.reason || "Query is not interpreted as a plant name or descriptive intent.");
      }
      step1.status = 'completed';
      onAddActivity({ ...activity });

      // Stage 2: Global Synthesis
      const step2: ActivityStep = { label: 'Stage 2: Global Synthesis (Pro)', status: 'running', timestamp: Date.now() };
      activity.steps.push(step2);
      onAddActivity({ ...activity });

      const aiCandidatesRaw = await generatePlantCandidates(searchTarget);
      step2.data = { raw_count: aiCandidatesRaw.length, ai_response: aiCandidatesRaw }; 
      
      // Stage 3: Identity Guard, Audit & Grouping
      const step3: ActivityStep = { label: 'Stage 3: Identity Guard & Lineage Audit', status: 'running', timestamp: Date.now() };
      activity.steps.push(step3);
      
      const processed: SearchCandidate[] = [];

      for (const c of aiCandidatesRaw) {
          const parts = normalizeTaxonParts({
              ...c,
              genus_hybrid: c.genus_hybrid ? '×' : undefined,
              species_hybrid: c.species_hybrid ? '×' : undefined
          });
          
          const fullName = assembleScientificName(parts);
          
          // Identity Check: Follow Synonym Chains
          const existingRecord = await dataService.findTaxonByName(fullName);
          const lineageMap = await dataService.findLineageAudit(parts);

          processed.push({
              taxon_name: fullName,
              confidence: c.confidence,
              rationale: c.rationale,
              lineage_rationale: c.lineage_rationale,
              source_type: existingRecord ? 'local' : 'ai',
              match_type: existingRecord ? 'Existing Library Record' : 'AI Discovery',
              parts: {
                  ...parts,
                  trade_name: c.trade_name,
                  patent_number: c.patent_number,
                  taxon_status: c.taxon_status 
              },
              lineage_map: lineageMap
          });
      }

      // Grouping Pass: Cluster synonymous name variations into Identities
      const groups: Map<string, CandidateGroup> = new Map();
      processed.forEach(c => {
          const p = c.parts!;
          const clusterKey = p.cultivar 
              ? `selection-${p.genus}-${p.cultivar}`.toLowerCase()
              : `natural-${p.genus}-${p.species || ''}-${p.infraspecies || ''}`.toLowerCase();
          
          if (!groups.has(clusterKey)) {
              groups.set(clusterKey, { primary: c, variations: [] });
          } else {
              const g = groups.get(clusterKey)!;
              if (c.source_type === 'local' && g.primary.source_type === 'ai') {
                  g.variations.push(g.primary);
                  g.primary = c;
              } else {
                  g.variations.push(c);
              }
          }
      });

      const finalGroups = Array.from(groups.values());
      setCandidateGroups(finalGroups);

      step3.status = 'completed';
      step3.data = finalGroups.map(g => ({
          identity: g.primary.taxon_name,
          variations: g.variations.map(v => v.taxon_name),
          lineage: g.primary.lineage_map?.map(l => `${l.rank}:${l.name}:${l.exists ? 'FOUND' : 'MISSING'}`)
      }));
      onAddActivity({ ...activity });

      step2.status = 'completed';
      
      activity.status = 'completed';
      activity.message = `Analysis complete. Found ${finalGroups.length} unique identities.`;
      activity.outcome = `Engine identified ${finalGroups.filter(g => g.primary.source_type === 'local').length} library records and ${finalGroups.filter(g => g.primary.source_type === 'ai').length} suggested additions across ${processed.length} variations.`;
      onAddActivity({ ...activity });

    } catch (e: any) {
      setError(e.message);
      activity.status = 'error';
      activity.message = e.message;
      onAddActivity({ ...activity });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCommit = async (group: CandidateGroup, selectionOverride?: SearchCandidate) => {
    const candidate = selectionOverride || group.primary;
    if (candidate.source_type === 'local') {
        onClose(); 
        return;
    }

    setIsCommiting(true);
    const activityId = crypto.randomUUID();
    const activity: ActivityItem = {
        id: activityId,
        name: `Catalog: ${candidate.taxon_name}`,
        type: 'import',
        status: 'running',
        message: 'Grafting to hierarchy...',
        timestamp: Date.now(),
        steps: []
    };
    onAddActivity(activity);

    try {
        const akas: Synonym[] = group.variations
            .filter(v => v.taxon_name !== candidate.taxon_name)
            .map(v => ({ 
                name: v.taxon_name, 
                type: (v.parts?.taxon_status?.toLowerCase() === 'misapplied') ? 'misapplied' : 'scientific'
            }));

        const historyAggregation = [
            `Primary Synthesis Rationale: ${candidate.rationale || 'N/A'}`,
            candidate.lineage_rationale ? `Lineage Logic: ${candidate.lineage_rationale}` : null,
            group.variations.length > 0 ? "\nAlternate interpretation rationales captured during discovery:" : null,
            ...group.variations.map(v => `- [${v.taxon_name}]: ${v.rationale || 'No rationale provided.'}`)
        ].filter(Boolean).join('\n');

        const { taxon, created } = await dataService.graftTaxonToHierarchy(candidate, (label, data) => {
            const step: ActivityStep = { label, status: 'completed', timestamp: Date.now(), data };
            activity.steps.push(step);
            onAddActivity({ ...activity });
        });

        const currentAlts = taxon.alternative_names || [];
        await dataService.updateTaxon(taxon.id, { 
            alternative_names: [...currentAlts, ...akas],
            history_metadata: {
                background: historyAggregation
            }
        });

        activity.status = 'completed';
        activity.message = 'Record active.';
        const createdSummary = created.length > 0 ? `Materialized new levels: ${created.join(' > ')}.` : 'Grafted to existing library lineage.';
        const akaSummary = akas.length > 0 ? ` Captured ${akas.length} synonymous interpretations as AKAs.` : '';
        activity.outcome = `Successfully committed ${taxon.taxon_name} to library. ${createdSummary}${akaSummary}`;
        onAddActivity({ ...activity });
        
        onSuccess();
        onClose();
    } catch (e: any) {
        setError(e.message);
        activity.status = 'error';
        activity.message = e.message;
        onAddActivity({ ...activity });
    } finally {
        setIsCommiting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        className="fixed z-40 w-full max-w-3xl pointer-events-none animate-in fade-in slide-in-from-left-2 duration-300"
    >
      <div className="bg-white rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.25)] border border-slate-200 pointer-events-auto flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
        {/* Header */}
        <div onMouseDown={onDragStart} className="p-4 bg-slate-50 border-b flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-leaf-600 text-white rounded-lg"><Boxes size={18} /></div>
                <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Plant Ingestion Engine</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{APP_VERSION} Identity Guard</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-all"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, description, or common alias..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 ring-leaf-200 outline-none text-sm font-medium transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
                    />
                </div>
                <button 
                    onClick={() => handleDiscovery()}
                    disabled={isSearching || !query.trim()}
                    className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 disabled:opacity-50 flex items-center gap-2 text-sm font-bold shadow-md transition-all"
                >
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Discovery
                </button>
            </div>

            {error && (<div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-center gap-2 font-bold"><AlertTriangle size={14} /> {error}</div>)}

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {showLocalPrompt ? (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
                            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><Library size={24}/></div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-amber-900 mb-1">Match Found in Library</h3>
                                <p className="text-xs text-amber-700 leading-relaxed mb-4">
                                    We found existing records in your catalog that match your query. 
                                    Would you like to use one of these or proceed to a <strong>Global Synthesis</strong> for newer or corrected variations?
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDiscovery(true)} className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-100 shadow-sm transition-all flex items-center gap-2"><Globe size={14}/> Search Globally</button>
                                    <button onClick={onClose} className="px-4 py-2 text-amber-600 text-xs font-bold hover:underline">Dismiss Discovery</button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {localMatches.map((m, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center group hover:border-leaf-300 transition-all">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Local Identity</span>
                                        <h4 className="text-lg font-serif italic text-slate-800">{m.taxon_name}</h4>
                                        <p className="text-xs text-slate-500">{m.family} &bull; {m.taxon_rank}</p>
                                    </div>
                                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-leaf-600 hover:bg-leaf-50 rounded-lg transition-all"><Eye size={20}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : candidateGroups.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {candidateGroups.map((g, idx) => {
                            const c = g.primary;
                            const isExpanded = expandedGroups.has(idx);
                            const hasVariations = g.variations.length > 0;
                            
                            return (
                                <div key={idx} className="group bg-white border border-slate-200 rounded-xl hover:border-leaf-300 hover:shadow-md transition-all flex flex-col overflow-hidden">
                                    <div className="p-4 flex justify-between items-start">
                                        <div className="space-y-1.5 flex-1 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${c.source_type === 'local' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                    {c.source_type === 'local' ? 'In Library' : 'Global Suggestion'}
                                                </span>
                                                {c.confidence > 0 && (
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{Math.round(c.confidence * 100)}% Certainty</span>
                                                )}
                                                {c.parts?.taxon_rank && (
                                                    <span className="text-[10px] font-bold text-leaf-600 bg-leaf-50 px-2 py-0.5 rounded border border-leaf-100">{c.parts.taxon_rank}</span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-serif italic text-slate-800 truncate">{c.taxon_name}</h3>
                                            
                                            {/* Lineage Map UI */}
                                            <div className="flex flex-wrap items-center gap-1.5 py-1">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mr-1">Lineage Audit:</span>
                                                {c.lineage_map?.map((segment, sIdx) => (
                                                    <React.Fragment key={sIdx}>
                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${segment.exists ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100 italic'}`}>
                                                            {segment.exists && <Check size={10} />}
                                                            {segment.name}
                                                        </div>
                                                        {sIdx < c.lineage_map!.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            {/* Enrichment Badges */}
                                            <div className="flex gap-2">
                                                {c.parts?.trade_name && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded shadow-sm">
                                                        <Tags size={10}/> Trade: {c.parts.trade_name}
                                                    </span>
                                                )}
                                                {c.parts?.patent_number && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded shadow-sm">
                                                        <Award size={10}/> {c.parts.patent_number}
                                                    </span>
                                                )}
                                            </div>

                                            {(c.rationale || c.lineage_rationale) && (
                                                <div className="flex flex-col gap-1 mt-2">
                                                    {c.rationale && (
                                                        <div className="flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg">
                                                            <Info size={12} className="text-slate-400 shrink-0 mt-0.5" />
                                                            <p className="text-[11px] text-slate-600 italic leading-relaxed">{c.rationale}</p>
                                                        </div>
                                                    )}
                                                    {c.lineage_rationale && (
                                                        <div className="flex items-start gap-1.5 bg-indigo-50 p-2 rounded-lg">
                                                            <Cpu size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                                                            <p className="text-[11px] text-indigo-600 italic leading-relaxed">Lineage Logic: {c.lineage_rationale}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {hasVariations && (
                                                <button 
                                                    onClick={() => toggleGroup(idx)}
                                                    className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-leaf-600 hover:text-leaf-700 uppercase tracking-widest"
                                                >
                                                    <Layers size={12} />
                                                    {g.variations.length} Synonymous Name Variations
                                                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                            <button 
                                                onClick={() => handleCommit(g)}
                                                disabled={isCommiting}
                                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${c.source_type === 'local' ? 'text-slate-400 bg-slate-50 cursor-default' : 'bg-leaf-600 text-white hover:bg-leaf-700 shadow-sm'}`}
                                            >
                                                {c.source_type === 'local' ? <Library size={14}/> : (isCommiting ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14}/>)}
                                                {c.source_type === 'local' ? 'In Library' : 'Catalog This'}
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && hasVariations && (
                                        <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50/30 space-y-3 pt-3 animate-in slide-in-from-top-1 duration-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Other Botanical Interpretations:</p>
                                            {g.variations.map((v, vIdx) => (
                                                <div key={vIdx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                    <div className="flex-1 overflow-hidden pr-4">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{v.parts?.taxon_rank}</span>
                                                            <span className="text-[9px] font-bold text-blue-600">AI Variation</span>
                                                            {v.parts?.taxon_status?.toLowerCase() === 'misapplied' && (
                                                                <span className="text-[9px] font-black text-red-600 uppercase">Misapplied</span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-sm font-serif italic text-slate-700 truncate">{v.taxon_name}</h4>
                                                        <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">{v.rationale}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCommit(g, v)}
                                                        disabled={isCommiting}
                                                        className="px-3 py-1.5 bg-white border border-leaf-200 text-leaf-600 rounded-lg text-[10px] font-bold hover:bg-leaf-50 transition-all flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <CornerDownRight size={12} />
                                                        Use This Name
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="p-2 bg-leaf-50 rounded-lg border border-leaf-100">
                                                <p className="text-[10px] text-leaf-700 leading-relaxed font-medium">
                                                    <strong>Pro Tip:</strong> Selecting the primary name will automatically capture these variations as "Scientific Synonyms" in the plant's history.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 text-center px-10">
                        <div className="p-6 bg-slate-50 rounded-full mb-4">
                            <SearchCode size={48} className="opacity-20" />
                        </div>
                        <h4 className="text-sm font-bold uppercase text-slate-500 mb-1">Enter a Plant Name Above</h4>
                        <p className="text-xs leading-relaxed max-w-sm">Stage 0 will verify your local catalog before consulting global experts via AI.</p>
                    </div>
                )}
            </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                <CheckCircle2 size={12} />
                Identity Guard Active &bull; Phylogenetic Bridge Ready
            </div>
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">Dismiss</button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantModal;