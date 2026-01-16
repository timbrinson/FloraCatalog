// DO NOT add any new files, classes, or namespaces.
import React, { useState, useRef, useEffect } from 'react';
import { X, Sprout, Loader2, Sparkles, Database, PlusCircle, CheckCircle2, AlertTriangle, ArrowRight, CornerDownRight, GripHorizontal } from 'lucide-react';
import { identifyTaxonomy } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { Taxon, ActivityItem, ActivityStatus, ActivityStep } from '../types';
import { assembleScientificName } from '../utils/formatters';

const APP_VERSION = 'v2.34.3';

interface PipelineItem {
    taxon_rank: string;
    taxon_name: string;
    taxon_status: string;
    match_id?: string;
    parent_match_id?: string;
    is_new: boolean;
    accepted_redirect?: string;
    // Raw components for saving
    raw: Partial<Taxon>;
}

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAddActivity: (activity: ActivityItem) => void;
}

/**
 * AddPlantModal: Implements Hybrid Intelligence Validation (ADR-005).
 * v2.34.2: Draggable non-blocking window.
 */
const AddPlantModal: React.FC<AddPlantModalProps> = ({ 
    isOpen, onClose, onSuccess, onAddActivity 
}) => {
  const [query, setQuery] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onDragStart = (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, startX: pos.x, startY: pos.y };
  };

  if (!isOpen) return null;

  const handleIdentify = async () => {
    if (!query.trim()) return;
    setIsIdentifying(true);
    setError(null);
    setPipeline([]);

    const activityId = crypto.randomUUID();
    const startTime = Date.now();
    
    const activity: ActivityItem = {
        id: activityId,
        name: `Analyze: ${query}`,
        type: 'search',
        status: 'running',
        message: 'Parsing botanical intent...',
        timestamp: startTime,
        inputs: { raw_query: query },
        steps: [{ label: 'Intent capture', status: 'completed', timestamp: startTime }]
    };
    onAddActivity(activity);
    
    try {
      const stepAi: ActivityStep = { label: 'Gemini extraction', status: 'running', timestamp: Date.now() };
      activity.steps.push(stepAi);
      onAddActivity({ ...activity });

      const lineage = await identifyTaxonomy(query);
      
      if (!lineage || !lineage.genus) {
          throw new Error("Could not parse plant name.");
      }

      stepAi.status = 'completed';
      stepAi.data = lineage;
      onAddActivity({ ...activity });

      const stepNorm: ActivityStep = { label: 'Algorithmic alignment', status: 'running', timestamp: Date.now() };
      activity.steps.push(stepNorm);
      onAddActivity({ ...activity });

      const newPipeline: PipelineItem[] = [];
      let currentParentId: string | undefined = undefined;
      const ranksToCheck = ['Genus', 'Species', 'Infraspecies', 'Cultivar'];
      
      for (const rank of ranksToCheck) {
          let rawPart: Partial<Taxon> | null = null;
          const hybridMeta = {
              genus_hybrid: lineage.genus_hybrid ? '×' : undefined,
              species_hybrid: lineage.species_hybrid ? '×' : undefined
          };

          if (rank === 'Genus' && lineage.genus) {
              rawPart = { ...hybridMeta, genus: lineage.genus, taxon_rank: 'Genus' };
          } else if (rank === 'Species' && lineage.species) {
              rawPart = { ...hybridMeta, genus: lineage.genus, species: lineage.species, taxon_rank: 'Species' };
          } else if (rank === 'Infraspecies' && (lineage.infraspecies || lineage.infraspecific_rank)) {
              rawPart = { ...hybridMeta, genus: lineage.genus, species: lineage.species, infraspecific_rank: lineage.infraspecific_rank, infraspecies: lineage.infraspecies, taxon_rank: lineage.target_rank };
          } else if (rank === 'Cultivar' && lineage.cultivar) {
              rawPart = { ...hybridMeta, genus: lineage.genus, species: lineage.species, infraspecific_rank: lineage.infraspecific_rank, infraspecies: lineage.infraspecies, cultivar: lineage.cultivar, taxon_rank: 'Cultivar' };
          }

          if (!rawPart) continue;

          const assembledName = assembleScientificName(rawPart);
          const dbMatch = await dataService.findTaxonByName(assembledName);
          
          newPipeline.push({
              taxon_rank: rank,
              taxon_name: assembledName,
              taxon_status: lineage.taxon_status || 'Unresolved',
              match_id: dbMatch?.id,
              is_new: !dbMatch,
              parent_match_id: currentParentId,
              accepted_redirect: (dbMatch as any)?.accepted_name_found,
              raw: rawPart
          });

          if (dbMatch) currentParentId = dbMatch.id;
      }

      stepNorm.status = 'completed';
      stepNorm.data = { levels_mapped: newPipeline.length, new_records_found: newPipeline.filter(p => p.is_new).length };
      activity.status = 'completed';
      activity.message = 'Lineage mapped.';
      activity.outcome = `Successfully identified lineage across ${newPipeline.length} ranks. Found ${newPipeline.filter(p => !p.is_new).length} existing database matches.`;
      onAddActivity({ ...activity });

      setPipeline(newPipeline);
    } catch (e: any) {
      setError(e.message || "Failed to identify plant.");
      activity.status = 'error';
      activity.message = e.message;
      activity.outcome = `Search failed: ${e.message}`;
      onAddActivity({ ...activity });
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSave = async (item: PipelineItem) => {
    if (!item.is_new) return;

    setIsSaving(true);
    setError(null);
    const saveActivityId = crypto.randomUUID();
    const startTime = Date.now();

    const activity: ActivityItem = {
        id: saveActivityId,
        name: `Catalog: ${item.taxon_name}`,
        type: 'import',
        status: 'running',
        message: 'Writing to database...',
        timestamp: startTime,
        inputs: { taxon: item.taxon_name, rank: item.taxon_rank },
        steps: [{ label: 'Core creation', status: 'running', timestamp: startTime }]
    };
    onAddActivity(activity);

    try {
      const id = crypto.randomUUID();
      const newTaxon: Taxon = {
        id,
        parent_id: item.parent_match_id, 
        name: item.raw.cultivar || item.raw.infraspecies || item.raw.species || item.raw.genus || '',
        taxon_name: item.taxon_name,
        taxon_rank: item.taxon_rank,
        taxon_status: 'Provisional', 
        genus: item.raw.genus,
        species: item.raw.species,
        infraspecies: item.raw.infraspecies,
        infraspecific_rank: item.raw.infraspecific_rank,
        cultivar: item.raw.cultivar,
        genus_hybrid: item.raw.genus_hybrid,
        species_hybrid: item.raw.species_hybrid,
        alternative_names: [],
        reference_links: [],
        created_at: Date.now(),
        source_id: 3, 
        descendant_count: 0,
        verification_level: `FloraCatalog ${APP_VERSION}`
      };

      const saved = await dataService.createTaxon(newTaxon);
      setPipeline(prev => prev.map(p => p.taxon_name === item.taxon_name ? { ...p, is_new: false, match_id: saved.id } : p));
      
      activity.status = 'completed';
      activity.message = 'Record active.';
      activity.outcome = `Successfully cataloged scientific record for '${item.taxon_name}' at rank [${item.taxon_rank}]. Assigned primary key: ${saved.id}.`;
      activity.steps[0].status = 'completed';
      activity.steps[0].data = { id: saved.id };
      onAddActivity({ ...activity });

      onSuccess();
    } catch (e: any) {
      setError(e.message || "Failed to save taxon.");
      activity.status = 'error';
      activity.message = e.message;
      activity.outcome = `Database commit failed: ${e.message}`;
      activity.steps[0].status = 'error';
      activity.steps[0].error = e.message;
      onAddActivity({ ...activity });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        className="fixed z-40 w-full max-w-2xl pointer-events-none animate-in fade-in slide-in-from-left-2 duration-300"
    >
      <div className="bg-white rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.25)] border border-slate-200 pointer-events-auto flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
        {/* Drag Header */}
        <div 
            onMouseDown={onDragStart}
            className="p-4 bg-slate-50 border-b flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-leaf-100 text-leaf-600 rounded-lg"><Sprout size={18} /></div>
                <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Add New Plant</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">v2.34.3 Pipeline Controller</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <GripHorizontal size={20} className="text-slate-300" />
                <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-all"><X size={20} /></button>
            </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Acer palmatum 'Bloodgood'"
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 ring-leaf-200 outline-none text-sm font-medium"
                  onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
                />
                <button 
                  onClick={handleIdentify}
                  disabled={isIdentifying || !query.trim()}
                  className="px-6 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50 flex items-center gap-2 text-sm font-bold transition-colors shadow-sm"
                >
                  {isIdentifying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Analyze Intent
                </button>
              </div>
              {error && (<div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-center gap-2 font-bold"><Database size={14} /> {error}</div>)}
            </div>

            <div className="overflow-y-auto min-h-[300px] max-h-[450px] border border-slate-100 rounded-lg bg-slate-50/50 p-4 custom-scrollbar">
              {pipeline.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                     <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hierarchy Discovery Pipeline</h3>
                     <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600"><CheckCircle2 size={12}/> Cataloged</div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-leaf-600"><PlusCircle size={12}/> New Record</div>
                     </div>
                  </div>

                  {pipeline.map((item, idx) => (
                    <div key={idx} className={`bg-white p-4 rounded-xl border transition-all flex items-center justify-between group ${item.is_new ? 'border-dashed border-leaf-300 shadow-sm' : 'border-slate-200 opacity-80'}`}>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-1 min-w-[70px]">
                            <div className={`px-2 py-1 text-[10px] font-extrabold rounded border uppercase text-center w-full ${item.is_new ? 'bg-leaf-50 text-leaf-700 border-leaf-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {item.taxon_rank}
                            </div>
                            {idx < pipeline.length - 1 && <ArrowRight size={14} className="text-slate-300 rotate-90" />}
                        </div>
                        
                        <div>
                          <div className="text-sm font-bold text-slate-800 font-serif mb-0.5">{item.taxon_name}</div>
                          <div className="flex flex-col gap-1">
                             <span className={`text-[10px] font-bold uppercase ${item.is_new ? 'text-leaf-600' : 'text-slate-400'}`}>
                               {item.is_new ? 'Pending Catalog' : `Verified in DB (${item.match_id?.split('-')[0]}...)`}
                             </span>
                             {item.accepted_redirect && (
                                <div className="flex items-center gap-1 text-blue-600 font-bold text-[9px] uppercase tracking-tighter">
                                    <CornerDownRight size={10} /> Synonym for: {item.accepted_redirect}
                                </div>
                             )}
                             {item.parent_match_id && item.is_new && (
                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded w-fit flex items-center gap-1">
                                    <Database size={10}/> Parent Identified
                                </span>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.is_new ? (
                          <button 
                            onClick={() => handleSave(item)} 
                            disabled={isSaving} 
                            className="flex items-center gap-2 px-4 py-2 bg-leaf-600 text-white text-[11px] font-bold uppercase rounded-lg hover:bg-leaf-700 transition-all shadow-md active:scale-95"
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />} 
                            Catalog Record
                          </button>
                        ) : (
                          <div className="px-3 py-2 bg-slate-50 text-slate-400 text-[10px] font-bold uppercase rounded-lg border border-slate-200 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-500" /> Cataloged
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <div className="p-4 bg-white rounded-full shadow-inner mb-4">
                    <Database size={48} className="text-slate-200" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Stage 1: Input Natural Name</p>
                  <p className="text-xs text-slate-400 mt-1">AI Flash will parse lineage, then app will discovery matches</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between items-center border-t pt-4 border-slate-100">
              <div className="flex items-center gap-2 text-slate-400">
                <AlertTriangle size={14}/>
                <span className="text-[10px] font-medium italic">Standardized using Hybrid Intelligence Pipeline</span>
              </div>
              <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Close Panel</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AddPlantModal;