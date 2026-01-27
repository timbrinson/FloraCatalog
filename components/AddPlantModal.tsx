// DO NOT add any new files, classes, or namespaces.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    X, Sprout, Loader2, Sparkles, Database, PlusCircle, CheckCircle2, 
    AlertTriangle, ArrowRight, CornerDownRight, GripHorizontal, 
    Search, Library, Info, ChevronRight, Globe, Cpu, Check, Boxes,
    Eye, SearchCode, Tags, Award, ChevronDown, Layers, RotateCcw
} from 'lucide-react';
import { validatePlantIntent, generatePlantCandidates } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { Taxon, ActivityItem, ActivityStatus, ActivityStep, SearchCandidate, Synonym } from '../types';
import { assembleScientificName, normalizeTaxonParts, getNakedName, parseBotanicalName } from '../utils/formatters';

const APP_VERSION = 'v2.35.9';

interface CandidateGroup {
    primary: SearchCandidate;
    variations: SearchCandidate[];
}

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAddActivity: (activity: Partial<ActivityItem>) => void;
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
  
  // Track active activity ID
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);

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

  useEffect(() => {
    if (isOpen) {
        if (!initialQuery) {
            setQuery('');
            setCandidateGroups([]);
            setLocalMatches([]);
            setShowLocalPrompt(false);
            setError(null);
            setActiveActivityId(null);
        }
        setTimeout(() => inputRef.current?.focus(), 150);
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

  const handleInternalClose = (reason: string = 'Discovery Session Dismissed.') => {
      if (activeActivityId) {
          onAddActivity({ 
              id: activeActivityId, 
              status: 'completed', 
              message: 'Session closed.', 
              outcome: reason,
              timestamp: Date.now()
          });
      }
      onClose();
  };

  const handleDiscovery = async (forceGlobal: boolean = false, overrideQuery?: string) => {
    const searchTarget = overrideQuery || query;
    if (!searchTarget.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setCandidateGroups([]);
    setLocalMatches([]);

    if (forceGlobal && activeActivityId) {
        onAddActivity({
            id: activeActivityId,
            status: 'completed',
            message: 'Bypassing local matches for global synthesis.',
            outcome: 'User resolved local sovereignty prompt by choosing Global Search.',
            timestamp: Date.now()
        });
    }

    const activityId = crypto.randomUUID();
    setActiveActivityId(activityId);

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
      if (!forceGlobal) {
          const step0: ActivityStep = { label: 'Stage 0: Deterministic Lexer (Local)', status: 'running', timestamp: Date.now() };
          activity.steps.push(step0);
          onAddActivity({ ...activity });

          const localResult = await dataService.findNakedMatch(searchTarget);
          step0.data = { lexed_tokens: localResult.tokens, strategy: localResult.strategy, count: localResult.data.length };
          step0.status = 'completed';
          
          if (localResult.data.length > 0) {
              setLocalMatches(localResult.data);
              setShowLocalPrompt(true);
              setIsSearching(false);
              activity.status = 'needs_input';
              activity.message = `${localResult.data.length} local matches found. Sovereignty prompt active.`;
              onAddActivity({ ...activity });
              return;
          }
      }

      setShowLocalPrompt(false);

      const step1: ActivityStep = { label: 'Stage 1: Intent Validation (Flash)', status: 'running', timestamp: Date.now() };
      activity.steps.push(step1);
      onAddActivity({ ...activity });

      const validation = await validatePlantIntent(searchTarget);
      step1.data = validation;
      if (!validation.is_valid) throw new Error(validation.reason || "Invalid intent.");
      step1.status = 'completed';

      const step2: ActivityStep = { label: 'Stage 2: Global Synthesis (Pro)', status: 'running', timestamp: Date.now() };
      activity.steps.push(step2);
      const aiCandidatesRaw = await generatePlantCandidates(searchTarget);
      step2.data = { ai_response: aiCandidatesRaw };
      step2.status = 'completed';
      
      const step3: ActivityStep = { label: 'Stage 3: Identity Guard (Atomic)', status: 'running', timestamp: Date.now() };
      const step4: ActivityStep = { label: 'Stage 4: Lineage Audit (Incremental)', status: 'running', timestamp: Date.now() };
      activity.steps.push(step3, step4);
      
      const processed: SearchCandidate[] = [];
      const step3AuditLog: any[] = [];
      const step4AuditLog: any[] = [];

      for (const c of aiCandidatesRaw) {
          // Unified Normalization Pass
          let parts = normalizeTaxonParts(c);
          
          const identityResult = await dataService.findAtomicMatch(parts);
          let redirectedFrom: string | undefined = undefined;
          const originalSearchName = assembleScientificName(parts);
          let localStatus: string | undefined = undefined;

          if (identityResult.taxon) {
              const matchedTaxon = identityResult.taxon;
              localStatus = matchedTaxon.taxon_status;
              if (matchedTaxon.taxon_name.toLowerCase() !== originalSearchName.toLowerCase()) {
                  redirectedFrom = originalSearchName;
                  parts = { ...normalizeTaxonParts(matchedTaxon), taxon_status: matchedTaxon.taxon_status };
              }
          }

          step3AuditLog.push({
              identity: assembleScientificName(parts),
              strategy: identityResult.strategy,
              interrogated_tokens: identityResult.interrogated_tokens,
              found: !!identityResult.taxon,
              redirected_from: redirectedFrom
          });

          const lineageResult = await dataService.findLineageAudit(parts);
          if (lineageResult.pivoted_parts) parts = { ...parts, ...lineageResult.pivoted_parts };

          step4AuditLog.push({
              target: assembleScientificName(parts),
              steps: lineageResult.interrogated_tokens
          });

          processed.push({
              taxon_name: assembleScientificName(parts),
              confidence: c.confidence,
              rationale: c.rationale,
              lineage_rationale: c.lineage_rationale,
              source_type: identityResult.taxon ? 'local' : 'ai',
              match_type: identityResult.taxon ? 'Existing Library Record' : 'AI Discovery',
              redirected_from: redirectedFrom,
              taxon_status: localStatus,
              parts: { ...parts, trade_name: c.trade_name, patent_number: c.patent_number, taxon_status: c.taxon_status },
              lineage_map: lineageResult.entries
          });
      }

      const groups: Map<string, CandidateGroup> = new Map();
      processed.forEach(c => {
          const p = c.parts!;
          const clusterKey = p.cultivar ? `sel-${p.genus}-${p.cultivar}` : `nat-${p.genus}-${p.species || ''}-${p.infraspecies || ''}`.toLowerCase();
          if (!groups.has(clusterKey)) groups.set(clusterKey, { primary: c, variations: [] });
          else {
              const g = groups.get(clusterKey)!;
              if (c.source_type === 'local' && g.primary.source_type === 'ai') { g.variations.push(g.primary); g.primary = c; }
              else g.variations.push(c);
          }
      });

      setCandidateGroups(Array.from(groups.values()));
      
      // Update step data before completing
      step3.data = step3AuditLog;
      step4.data = step4AuditLog;
      step3.status = 'completed'; 
      step4.status = 'completed';
      
      activity.status = 'completed';
      activity.message = `Found ${groups.size} unique identities.`;
      onAddActivity({ ...activity });

    } catch (e: any) {
      setError(e.message); activity.status = 'error'; activity.message = e.message;
      onAddActivity({ ...activity });
    } finally { setIsSearching(false); }
  };

  const handleCommit = async (group: CandidateGroup, selectionOverride?: SearchCandidate) => {
    const candidate = selectionOverride || group.primary;
    if (candidate.source_type === 'local') { handleInternalClose(`Selected existing: ${candidate.taxon_name}`); return; }

    setIsCommiting(true);
    const activityId = crypto.randomUUID();
    const activity: ActivityItem = {
        id: activityId, name: `Catalog: ${candidate.taxon_name}`, type: 'import', status: 'running',
        message: 'Grafting...', timestamp: Date.now(), steps: []
    };
    onAddActivity(activity);

    try {
        const akas: Synonym[] = group.variations
            .filter(v => v.taxon_name !== candidate.taxon_name)
            .map(v => ({ name: v.taxon_name, type: (v.parts?.taxon_status?.toLowerCase() === 'misapplied') ? 'misapplied' : 'scientific' }));

        const { taxon, created } = await dataService.graftTaxonToHierarchy(candidate, (label, data) => {
            activity.steps.push({ label, status: 'completed', timestamp: Date.now(), data });
            onAddActivity({ ...activity });
        });

        await dataService.updateTaxon(taxon.id, { alternative_names: [...(taxon.alternative_names || []), ...akas] });
        activity.status = 'completed'; activity.message = 'Record active.';
        onAddActivity({ ...activity });
        onSuccess(); onClose();
    } catch (e: any) {
        setError(e.message); activity.status = 'error'; activity.message = e.message;
        onAddActivity({ ...activity });
    } finally { setIsCommiting(false); }
  };

  if (!isOpen) return null;

  return (
    <div style={{ left: `${pos.x}px`, top: `${pos.y}px` }} className="fixed z-40 w-full max-w-3xl pointer-events-none animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="bg-white rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.25)] border border-slate-200 pointer-events-auto flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
        <div onMouseDown={onDragStart} className="p-4 bg-slate-50 border-b flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-leaf-600 text-white rounded-lg"><Boxes size={18} /></div>
                <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Plant Ingestion Engine</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{APP_VERSION} Resilience Pass</p>
                </div>
            </div>
            <button onClick={() => handleInternalClose()} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-all"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, description, or common alias..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 ring-leaf-200 outline-none text-sm font-medium transition-all" onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()} />
                </div>
                <button onClick={() => handleDiscovery()} disabled={isSearching || !query.trim()} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 disabled:opacity-50 flex items-center gap-2 text-sm font-bold shadow-md transition-all">
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
                                <p className="text-xs text-amber-700 leading-relaxed mb-4">Existing records match your query. Search globally for variations?</p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDiscovery(true)} className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-100 shadow-sm transition-all flex items-center gap-2"><Globe size={14}/> Search Globally</button>
                                    <button onClick={() => handleInternalClose('Declined local match.')} className="px-4 py-2 text-amber-600 text-xs font-bold hover:underline">Dismiss</button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {localMatches.map((m, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center group hover:border-leaf-300 transition-all">
                                    <div className="flex-1 overflow-hidden pr-4">
                                        <div className="flex items-center gap-2 mb-1.5"><span className="text-[10px] font-black uppercase text-slate-400 block">Local Identity</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${m.taxon_status === 'Accepted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{m.taxon_status}</span></div>
                                        <h4 className="text-lg font-serif italic text-slate-800 truncate">{m.taxon_name}</h4>
                                        <p className="text-xs text-slate-500">{m.family} &bull; {m.taxon_rank}</p>
                                    </div>
                                    <button onClick={() => handleInternalClose(`Using library: ${m.taxon_name}`)} className="p-2 text-slate-400 hover:text-leaf-600 hover:bg-leaf-50 rounded-lg transition-all"><Eye size={20}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : candidateGroups.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {candidateGroups.map((g, idx) => {
                            const c = g.primary; const isExpanded = expandedGroups.has(idx); const hasVariations = g.variations.length > 0;
                            return (
                                <div key={idx} className="group bg-white border border-slate-200 rounded-xl hover:border-leaf-300 hover:shadow-md transition-all flex flex-col overflow-hidden">
                                    <div className="p-4 flex justify-between items-start">
                                        <div className="space-y-1.5 flex-1 overflow-hidden">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${c.source_type === 'local' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{c.source_type === 'local' ? 'In Library' : 'Global Suggestion'}</span>
                                                {c.redirected_from && (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 max-w-[250px] truncate">
                                                        <RotateCcw size={10} className="shrink-0" /> <span className="truncate">Redirected from {c.redirected_from}</span>
                                                    </span>
                                                )}
                                                {c.confidence > 0 && (<span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{Math.round(c.confidence * 100)}% Certainty</span>)}
                                            </div>
                                            <h3 className="text-xl font-serif italic text-slate-800 truncate">{c.taxon_name}</h3>
                                            
                                            <div className="flex flex-wrap items-center gap-1.5 py-1">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mr-1">Lineage Audit:</span>
                                                {c.lineage_map?.map((segment, sIdx) => (
                                                    <React.Fragment key={sIdx}>
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${segment.exists ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100 italic'}`}>
                                                                {segment.exists && <Check size={10} />} {segment.name}
                                                            </div>
                                                            {segment.redirected_from && (<span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter pl-1">Redir: {segment.redirected_from.name}</span>)}
                                                        </div>
                                                        {sIdx < c.lineage_map!.length - 1 && <ChevronRight size={10} className="text-slate-300 mt-1" />}
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            {(c.rationale || c.lineage_rationale) && (
                                                <div className="flex flex-col gap-1 mt-2">
                                                    {c.rationale && (<div className="flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg"><Info size={12} className="text-slate-400 shrink-0 mt-0.5" /><p className="text-[11px] text-slate-600 italic leading-relaxed">{c.rationale}</p></div>)}
                                                    {c.lineage_rationale && (<div className="flex items-start gap-1.5 bg-indigo-50 p-2 rounded-lg"><Cpu size={12} className="text-indigo-400 shrink-0 mt-0.5" /><p className="text-[11px] text-indigo-600 italic leading-relaxed">Lineage Logic: {c.lineage_rationale}</p></div>)}
                                                </div>
                                            )}

                                            {hasVariations && (<button onClick={() => toggleGroup(idx)} className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-leaf-600 hover:text-leaf-700 uppercase tracking-widest"><Layers size={12} /> {g.variations.length} Synonymous Variations <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>)}
                                        </div>
                                        <button onClick={() => handleCommit(g)} disabled={isCommiting} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ml-4 ${c.source_type === 'local' ? 'text-slate-400 bg-slate-50 cursor-default' : 'bg-leaf-600 text-white hover:bg-leaf-700 shadow-sm'}`}>
                                            {c.source_type === 'local' ? <Library size={14}/> : (isCommiting ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14}/>)}
                                            {c.source_type === 'local' ? 'In Library' : 'Catalog This'}
                                        </button>
                                    </div>

                                    {isExpanded && hasVariations && (
                                        <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50/30 space-y-3 pt-3 animate-in slide-in-from-top-1 duration-200">
                                            {g.variations.map((v, vIdx) => (
                                                <div key={vIdx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                    <div className="flex-1 overflow-hidden pr-4">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[9px] font-bold text-blue-600">AI Variation</span>
                                                            {v.taxon_status === 'Synonym' && (<span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-1 rounded border border-amber-200 flex items-center gap-0.5"><RotateCcw size={8}/> Synonym (Local)</span>)}
                                                        </div>
                                                        <h4 className="text-sm font-serif italic text-slate-700 truncate">{v.taxon_name}</h4>
                                                    </div>
                                                    <button onClick={() => handleCommit(g, v)} disabled={isCommiting} className="px-3 py-1.5 bg-white border border-leaf-200 text-leaf-600 rounded-lg text-[10px] font-bold hover:bg-leaf-50 transition-all flex items-center gap-1.5 shadow-sm"><CornerDownRight size={12} /> Use This Name</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 text-center px-10">
                        <div className="p-6 bg-slate-50 rounded-full mb-4"><SearchCode size={48} className="opacity-20" /></div>
                        <h4 className="text-sm font-bold uppercase text-slate-500 mb-1">Enter a Plant Name Above</h4>
                    </div>
                )}
            </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase"><CheckCircle2 size={12} /> Identity Guard Active</div>
            <button onClick={() => handleInternalClose()} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">Dismiss</button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantModal;