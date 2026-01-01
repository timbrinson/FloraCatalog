
// DO NOT add any new files, classes, or namespaces.
import React, { useState } from 'react';
import { X, Sprout, Loader2, Sparkles, Database, PlusCircle } from 'lucide-react';
import { identifyTaxonomy } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { Taxon, ActivityItem } from '../types';

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAddActivity: (activity: ActivityItem) => void;
}

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
}

/**
 * AddPlantModal: Handles natural language entry and AI-assisted taxonomic identification.
 */
const AddPlantModal: React.FC<AddPlantModalProps> = ({ 
    isOpen, onClose, onSuccess, onAddActivity 
}) => {
  const [query, setQuery] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleIdentify = async () => {
    if (!query.trim()) return;
    setIsIdentifying(true);
    setError(null);
    try {
      // Call Gemini API to parse the natural language query
      const parsed = await identifyTaxonomy(query);
      setResults(parsed);
    } catch (e: any) {
      setError(e.message || "Failed to identify plant.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSave = async (result: ParsedResult) => {
    setIsSaving(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const newTaxon: Taxon = {
        id,
        name: result.name,
        taxonName: result.taxonName,
        taxonRank: result.taxonRank,
        taxonStatus: result.taxonStatus,
        family: result.family,
        genus: result.genus,
        species: result.species,
        infraspecies: result.infraspecies,
        infraspecificRank: result.infraspecificRank,
        cultivar: result.cultivar,
        // Basic mapping for hybrids from the identification result
        genusHybrid: result.isHybrid && result.taxonRank.toLowerCase() === 'genus' ? '×' : undefined,
        speciesHybrid: result.isHybrid && result.taxonRank.toLowerCase() === 'species' ? '×' : undefined,
        synonyms: [],
        referenceLinks: [],
        createdAt: Date.now(),
        sourceId: 2, // Manual/AI Import source
        descendantCount: 0
      };

      await dataService.createTaxon(newTaxon);
      
      // Track this success in the activity panel
      onAddActivity({
        id: crypto.randomUUID(),
        name: `Added ${result.taxonName}`,
        type: 'import',
        status: 'completed',
        message: 'Successfully added to collection',
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
          <div className="p-2 bg-leaf-100 text-leaf-600 rounded-lg">
            <Sprout size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add New Plant</h2>
            <p className="text-xs text-slate-500">Search or enter a scientific name to catalog</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Acer palmatum 'Bloodgood'"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 ring-leaf-200 outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
            />
            <button 
              onClick={handleIdentify}
              disabled={isIdentifying || !query.trim()}
              className="px-6 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50 flex items-center gap-2 text-sm font-bold transition-colors"
            >
              {isIdentifying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Identify
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-center gap-2">
              <Database size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] border border-slate-100 rounded-lg bg-slate-50/50 p-4">
          {results.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detected Taxonomic Parts</h3>
              {results.map((res, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group hover:border-leaf-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 rounded border uppercase min-w-[70px] text-center">
                      {res.taxonRank}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{res.taxonName}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Status: {res.taxonStatus}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSave(res)}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-leaf-50 text-leaf-600 text-[10px] font-bold uppercase rounded border border-leaf-200 hover:bg-leaf-600 hover:text-white transition-all shadow-sm"
                    title="Add this record to database"
                  >
                    <PlusCircle size={14} /> Add to Garden
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <Database size={40} className="mb-2" />
              <p className="text-sm">Enter a name above to begin AI identification</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantModal;
