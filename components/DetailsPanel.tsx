import React, { useState } from 'react';
import { 
  ExternalLink, Globe, Plus, Loader2, CheckSquare, 
  Square, X, Info, Thermometer, Ruler, History as HistoryIcon, 
  Leaf, Flower2, Layers, Sun, Droplets, Mountain,
  Tags, Sparkles
} from 'lucide-react';
import { Link, Synonym, SynonymType, Taxon } from '../types';
import { findAdditionalLinks } from '../services/geminiService';

interface DetailsPanelProps {
  description?: string;
  synonyms?: Synonym[];
  referenceLinks?: Link[];
  title: string;
  onUpdate: (updates: Partial<Taxon>) => void;
  hardinessMin?: number;
  hardinessMax?: number;
  heightMin?: number;
  heightMax?: number;
  widthMin?: number;
  widthMax?: number;
  originYear?: number;
  morphology?: Taxon['morphology'];
  ecology?: Taxon['ecology'];
  history?: string;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ 
  description, 
  synonyms = [], 
  referenceLinks = [], 
  title, 
  onUpdate,
  hardinessMin,
  hardinessMax,
  heightMin,
  heightMax,
  widthMin,
  widthMax,
  originYear,
  morphology,
  ecology,
  history
}) => {
  const [isAddingSynonym, setIsAddingSynonym] = useState(false);
  const [newSynonymName, setNewSynonymName] = useState('');
  const [newSynonymType, setNewSynonymType] = useState<SynonymType>('unspecified');
  const [showLegend, setShowLegend] = useState(false);

  const [searchingLinks, setSearchingLinks] = useState(false);
  const [suggestedLinks, setSuggestedLinks] = useState<Link[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set());

  const handleAddSynonym = () => {
    if (newSynonymName.trim()) {
      const updatedSynonyms = [...synonyms, { name: newSynonymName.trim(), type: newSynonymType }];
      onUpdate({ synonyms: updatedSynonyms });
      setNewSynonymName('');
      setNewSynonymType('unspecified');
    }
    setIsAddingSynonym(false);
  };

  const handleDeleteSynonym = (synToDelete: string) => {
    const updatedSynonyms = synonyms.filter(s => s.name !== synToDelete);
    onUpdate({ synonyms: updatedSynonyms });
  };

  const handleFindLinks = async () => {
    setSearchingLinks(true);
    setSuggestedLinks([]);
    try {
      const links = await findAdditionalLinks(title, referenceLinks);
      setSuggestedLinks(links);
      setSelectedLinks(new Set(links.map((_, i) => i)));
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingLinks(false);
    }
  };

  const toggleLinkSelection = (index: number) => {
    const newSet = new Set(selectedLinks);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedLinks(newSet);
  };

  const saveSelectedLinks = () => {
    const linksToAdd = suggestedLinks.filter((_, i) => selectedLinks.has(i));
    onUpdate({
      referenceLinks: [...referenceLinks, ...linksToAdd]
    });
    setSuggestedLinks([]);
    setSelectedLinks(new Set());
  };

  const getBadgeColor = (type: SynonymType) => {
    switch (type) {
      case 'scientific': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'trade': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'trademark': 
      case 'registered_trademark': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'patent': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'misapplied': 
      case 'misrepresented': return 'bg-red-50 text-red-700 border-red-200 line-through decoration-red-400';
      case 'common': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-white text-slate-600 border-slate-200';
    }
  };

  // Trait Registry Logic (Prototype)
  const specializedTraits = Object.entries(morphology || {}).filter(([k]) => !['foliage', 'flowers', 'form', 'texture'].includes(k));

  return (
    <div className="flex flex-col gap-8">
      {/* Top Section: Description and Basic AKAs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Info size={14} /> Description
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              {description || <span className="italic text-slate-400">No narrative description available. Enrich with AI to populate.</span>}
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AKAs & Synonyms</h4>
              <button 
                onClick={() => setShowLegend(!showLegend)} 
                className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider transition-colors ${showLegend ? 'text-leaf-600' : 'text-slate-300 hover:text-slate-500'}`}
              >
                 <Info size={12} /> {showLegend ? 'Hide' : 'Legend'}
              </button>
            </div>

            {showLegend && (
              <div className="flex flex-wrap gap-4 mb-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Scientific
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Trade Name
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Trademark
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Patent
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Misapplied
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              {synonyms.map((syn, idx) => (
                <span 
                  key={idx} 
                  className={`inline-flex items-center px-2 py-1 text-[11px] rounded border group/syn font-medium ${getBadgeColor(syn.type)}`}
                  title={`Type: ${syn.type}`}
                >
                  {syn.name}
                  <button onClick={() => handleDeleteSynonym(syn.name)} className="ml-1.5 opacity-0 group-hover/syn:opacity-100 transition-opacity hover:bg-black/10 rounded-full p-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}

              {isAddingSynonym ? (
                <div className="flex items-center gap-1 animate-in fade-in duration-200 bg-white p-1 rounded border border-leaf-200 shadow-sm">
                  <input
                    type="text" value={newSynonymName} onChange={(e) => setNewSynonymName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSynonym(); if (e.key === 'Escape') setIsAddingSynonym(false); }}
                    autoFocus className="w-32 px-1 py-1 text-xs outline-none bg-transparent" placeholder="Name..."
                  />
                  <select 
                     value={newSynonymType} onChange={(e) => setNewSynonymType(e.target.value as SynonymType)}
                     className="text-[10px] border-l border-slate-200 pl-1 outline-none text-slate-500 bg-transparent uppercase font-bold"
                  >
                      <option value="unspecified">TYPE</option>
                      <option value="common">Common</option>
                      <option value="scientific">Scientific</option>
                      <option value="trade">Trade</option>
                      <option value="trademark">TM</option>
                      <option value="registered_trademark">Registered</option>
                      <option value="patent">Patent</option>
                      <option value="misapplied">Misapplied</option>
                  </select>
                  <button onClick={handleAddSynonym} className="text-leaf-600 hover:bg-leaf-50 p-1 rounded"><CheckSquare size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingSynonym(true)} className="inline-flex items-center px-2 py-1 text-xs text-leaf-600 hover:bg-leaf-50 rounded border border-dashed border-leaf-300 transition-colors">
                  <Plus size={12} className="mr-1" /> Add A.K.A.
                </button>
              )}
            </div>
          </section>
        </div>

        {/* References Sidebar */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} /> References
            </h4>
            <button onClick={handleFindLinks} disabled={searchingLinks} className="text-[10px] font-bold uppercase tracking-wider text-leaf-600 hover:text-leaf-700 disabled:opacity-50">
              {searchingLinks ? <Loader2 size={12} className="animate-spin" /> : 'Find More'}
            </button>
          </div>

          {referenceLinks.length > 0 ? (
            <ul className="space-y-3 mb-4">
              {referenceLinks.map((link, idx) => (
                <li key={idx}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-start text-xs text-slate-600 hover:text-leaf-600 group">
                    <ExternalLink size={12} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400 group-hover:text-leaf-500" />
                    <span className="truncate font-medium">{link.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
             <p className="text-xs text-slate-400 italic mb-4">No reference links established.</p>
          )}

          {suggestedLinks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h5 className="text-[10px] font-bold text-slate-700 mb-3 uppercase tracking-wider">Suggested:</h5>
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {suggestedLinks.map((link, idx) => (
                  <div key={idx} className="flex items-start gap-2 cursor-pointer p-1 rounded hover:bg-white" onClick={() => toggleLinkSelection(idx)}>
                    <div className={`mt-0.5 ${selectedLinks.has(idx) ? 'text-leaf-600' : 'text-slate-300'}`}>
                      {selectedLinks.has(idx) ? <CheckSquare size={14} /> : <Square size={14} />}
                    </div>
                    <div className="text-[10px] text-slate-600 overflow-hidden">
                      <div className="font-bold truncate text-slate-800">{link.title}</div>
                      <div className="opacity-60 truncate">{link.url}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={saveSelectedLinks} disabled={selectedLinks.size === 0} className="w-full py-2 bg-leaf-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-leaf-700 disabled:opacity-50 shadow-sm">
                Import ({selectedLinks.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Layer: Morphology, Ecology, History */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Universal Physical Characteristics */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Layers size={16} className="text-leaf-500" /> Universal Description
          </h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Leaf size={16} className="text-slate-300 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Foliage</span>
                <span className="text-xs text-slate-700">{morphology?.foliage || 'Not described'}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Flower2 size={16} className="text-slate-300 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Flowers</span>
                <span className="text-xs text-slate-700">{morphology?.flowers || 'Not described'}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Info size={16} className="text-slate-300 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Form & Texture</span>
                <span className="text-xs text-slate-700">{morphology?.form || 'Unspecified'} {morphology?.texture ? `(${morphology.texture})` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic / Taxon-Specific Traits (Prototype for Agave spines, etc.) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-purple-500" /> Specialized Traits
          </h4>
          {specializedTraits.length > 0 ? (
             <div className="space-y-3">
                {specializedTraits.map(([key, val]) => (
                   <div key={key} className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{key.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-slate-700 font-medium">{String(val)}</span>
                   </div>
                ))}
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center opacity-40">
                <Tags size={24} className="text-slate-300 mb-2" />
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter leading-tight px-4">
                   No taxon-specific attributes defined. <br/> (e.g. Spine Color, Fruit Type)
                </p>
            </div>
          )}
        </div>

        {/* Growth & Hardiness */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Thermometer size={16} className="text-orange-500" /> Growth & Hardiness
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block mb-1">Hardiness Range</span>
              <span className="text-sm font-bold text-slate-800">Zone {hardinessMin || '?'}-{hardinessMax || '?'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block mb-1">Growth Rate</span>
              <span className="text-xs font-semibold text-slate-700 capitalize">{ecology?.growthRate || 'Unspecified'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2">
              <Ruler size={14} className="text-slate-300" />
              <div>
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Max Height</span>
                <span className="text-xs font-bold text-slate-800">{heightMax ? `${heightMax} cm` : '--'}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2">
              <Ruler size={14} className="text-slate-300 rotate-90" />
              <div>
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Max Width</span>
                <span className="text-xs font-bold text-slate-800">{widthMax ? `${widthMax} cm` : '--'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5"><Sun size={14} /> {ecology?.light || 'Light info n/a'}</div>
            <div className="flex items-center gap-1.5"><Droplets size={14} /> {ecology?.water || 'Water info n/a'}</div>
          </div>
        </div>

        {/* Origin & History */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <HistoryIcon size={16} className="text-blue-500" /> Origin & History
          </h4>
          <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
            <Mountain size={18} />
            <div>
              <span className="text-[9px] uppercase font-extrabold opacity-60 block tracking-wider">Intro / Discovery</span>
              <span className="text-sm font-bold">{originYear || 'Ancient/Unknown'}</span>
            </div>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto pr-2 custom-scrollbar italic border-l-2 border-slate-100 pl-3">
            {history || 'Historical background not yet established for this taxon.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsPanel;