// DO NOT add any new files, classes, or namespaces.
import React, { useState } from 'react';
import { X, Sprout, Loader2, Sparkles, Database, PlusCircle, CheckCircle2, AlertTriangle, ArrowRight, CornerDownRight } from 'lucide-react';
import { identifyTaxonomy } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { Taxon, ActivityItem } from '../types';
import { assembleScientificName } from '../utils/formatters';

const APP_VERSION = 'v2.30.11';

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
 */
const AddPlantModal: React.FC<AddPlantModalProps> = ({ 
    isOpen, onClose, onSuccess, onAddActivity 
}) => {
  const [query, setQuery] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  /**
   * handleIdentify: The Hybrid Validation Pipeline
   */
  const handleIdentify = async () => {
    if (!query.trim()) return;
    setIsIdentifying(true);
    setError(null);
    setPipeline([]);
    
    try {
      const lineage = await identifyTaxonomy(query);
      
      console.group(`🌿 Hybrid Intelligence Pipeline: "${query}"`);
      console.log("Stage 1 (AI Bridge) Result:", lineage);
      
      if (!lineage || !lineage.genus) {
          throw new Error("Could not parse plant name.");
      }

      const newPipeline: PipelineItem[] = [];
      let currentParentId: string | undefined = undefined;

      // Stage 2 & 3: Algorithmic Hierarchy Reconstruction & Discovery
      const ranksToCheck = ['Genus', 'Species', 'Infraspecies', 'Cultivar'];
      
      for (const rank of ranksToCheck) {
          let rawPart: Partial<Taxon> | null = null;
          
          // CRITICAL: Inherit hybrid flags from AI lineage across all ranks to preserve markers like ×
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

          // Standard-compliant assembly (Algorithm)
          const assembledName = assembleScientificName(rawPart);
          
          // Match checking logic (Algorithm) - Including accepted redirect check
          const dbMatch = await dataService.findTaxonByName(assembledName);
          
          const pipelineItem: PipelineItem = {
              taxon_rank: rank,
              taxon_name: assembledName,
              taxon_status: lineage.taxon_status || 'Unresolved',
              match_id: dbMatch?.id,
              is_new: !dbMatch,
              parent_match_id: currentParentId,
              accepted_redirect: (dbMatch as any)?.accepted_name_found,
              raw: rawPart
          };

          newPipeline.push(pipelineItem);
          if (dbMatch) currentParentId = dbMatch.id;
      }

      console.log("Stage 2/3 (Algorithmic Discovery) Result:", newPipeline);
      console.groupEnd();
      setPipeline(newPipeline);
    } catch (e: any) {
      setError(e.message || "Failed to identify plant.");
      console.groupEnd();
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSave = async (item: PipelineItem) => {
    if (!item.is_new) return;

    setIsSaving(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const newTaxon: Taxon = {
        id,
        parent_id: item.parent_match_id, 
        name: item.raw.cultivar || item.raw.infraspecies || item.raw.species || item.raw.genus || '',
        taxon_name: item.taxon_name,
        taxon_rank: item.taxon_rank,
        // ADR-005: Standards Governance - Manual additions default to Provisional
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
        source_id: 2, 
        descendant_count: 0,
        verification_level: `FloraCatalog ${APP_VERSION}`
      };

      const saved = await dataService.createTaxon(newTaxon);
      setPipeline(prev => prev.map(p => p.taxon_name === item.taxon_name ? { ...p, is_new: false, match_id: saved.id } : p));
      
      onAddActivity({
        id: crypto.randomUUID(),
        name: `Added ${item.taxon_name}`,
        type: 'import',
        status: 'completed',
        message: 'Successfully added to garden',
        timestamp: Date.now()
      });

      onSuccess();
    } catch (e: any) {
      setError(e.message || "Failed to save taxon.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-leaf-100 text-leaf-600 rounded-lg"><Sprout size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add New Plant</h2>
            <p className="text-xs text-slate-500 font-medium">Input natural language to identify scientific lineage</p>
          </div>
        </div>

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

        <div className="flex-1 overflow-y-auto min-h-[300px] border border-slate-100 rounded-lg bg-slate-50/50 p-4">
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
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
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
          <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantModal;