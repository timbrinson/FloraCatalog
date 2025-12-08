
import React, { useState } from 'react';
import { ExternalLink, Globe, Plus, Loader2, CheckSquare, Square, X, HelpCircle, Info } from 'lucide-react';
import { Link, Synonym, SynonymType } from '../types';
import { findAdditionalLinks } from '../services/geminiService';

interface DetailsPanelProps {
  description?: string;
  synonyms?: Synonym[];
  referenceLinks?: Link[];
  title: string;
  onUpdate: (updates: { description?: string; synonyms?: Synonym[]; referenceLinks?: Link[] }) => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ 
  description, 
  synonyms = [], 
  referenceLinks = [], 
  title, 
  onUpdate 
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
      case 'misapplied': return 'bg-red-50 text-red-700 border-red-200 line-through decoration-red-400';
      case 'common': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-white text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            {description || <span className="italic text-slate-400">No description available.</span>}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synonyms</h4>
            <button 
              onClick={() => setShowLegend(!showLegend)} 
              className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider transition-colors ${showLegend ? 'text-leaf-600' : 'text-slate-300 hover:text-slate-500'}`}
              title={showLegend ? "Hide Legend" : "Show Legend"}
            >
               <Info size={12} />
               {showLegend ? 'Hide Legend' : 'Legend'}
            </button>
          </div>

          {showLegend && (
            <div className="flex flex-wrap gap-3 mb-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-[10px] text-slate-600">Scientific (Taxonomic)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="text-[10px] text-slate-600">Trade Name</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-[10px] text-slate-600">Misapplied (Wrong)</span>
              </div>
               <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="text-[10px] text-slate-600">Common</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {synonyms.map((syn, idx) => (
              <span 
                key={idx} 
                className={`inline-flex items-center px-2 py-1 text-xs rounded border group/syn ${getBadgeColor(syn.type)}`}
                title={`Type: ${syn.type}`}
              >
                {syn.name}
                <button
                  onClick={() => handleDeleteSynonym(syn.name)}
                  className="ml-1.5 opacity-0 group-hover/syn:opacity-100 transition-opacity hover:bg-black/10 rounded-full p-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}

            {isAddingSynonym ? (
              <div className="flex items-center gap-1 animate-in fade-in duration-200 bg-white p-1 rounded border border-leaf-200 shadow-sm">
                <input
                  type="text"
                  value={newSynonymName}
                  onChange={(e) => setNewSynonymName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSynonym();
                    if (e.key === 'Escape') setIsAddingSynonym(false);
                  }}
                  autoFocus
                  className="w-32 px-1 py-1 text-xs outline-none bg-transparent"
                  placeholder="Name..."
                />
                <select 
                   value={newSynonymType}
                   onChange={(e) => setNewSynonymType(e.target.value as SynonymType)}
                   className="text-xs border-l border-slate-200 pl-1 outline-none text-slate-500 bg-transparent"
                >
                    <option value="unspecified">Type...</option>
                    <option value="common">Common</option>
                    <option value="scientific">Scientific</option>
                    <option value="trade">Trade</option>
                    <option value="misapplied">Misapplied</option>
                </select>
                <button onClick={handleAddSynonym} className="text-leaf-600 hover:bg-leaf-50 p-1 rounded">
                    <CheckSquare size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingSynonym(true)}
                className="inline-flex items-center px-2 py-1 text-xs text-leaf-600 hover:bg-leaf-50 rounded border border-dashed border-leaf-300 hover:border-leaf-400 transition-colors"
              >
                <Plus size={12} className="mr-1" /> Add
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">References</h4>
          <button
            onClick={handleFindLinks}
            disabled={searchingLinks}
            className="text-xs flex items-center gap-1 text-leaf-600 hover:text-leaf-700 font-medium disabled:opacity-50"
          >
            {searchingLinks ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
            Find More
          </button>
        </div>

        {referenceLinks.length > 0 ? (
          <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            {referenceLinks.map((link, idx) => (
              <li key={idx}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start text-xs text-slate-600 hover:text-leaf-600 hover:underline group"
                >
                  <ExternalLink size={10} className="mr-1.5 mt-0.5 flex-shrink-0 text-slate-400 group-hover:text-leaf-500" />
                  <span className="truncate">{link.title}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
           <p className="text-xs text-slate-400 italic mb-4">No references yet.</p>
        )}

        {suggestedLinks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h5 className="text-xs font-semibold text-slate-700 mb-2">Select to Add:</h5>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {suggestedLinks.map((link, idx) => (
                <div key={idx} className="flex items-start gap-2 cursor-pointer" onClick={() => toggleLinkSelection(idx)}>
                  <div className={`mt-0.5 ${selectedLinks.has(idx) ? 'text-leaf-600' : 'text-slate-300'}`}>
                    {selectedLinks.has(idx) ? <CheckSquare size={14} /> : <Square size={14} />}
                  </div>
                  <div className="text-xs text-slate-600 overflow-hidden">
                    <div className="font-medium truncate">{link.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{link.url}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={saveSelectedLinks}
              disabled={selectedLinks.size === 0}
              className="w-full py-1.5 bg-leaf-50 text-leaf-700 text-xs font-medium rounded hover:bg-leaf-100 disabled:opacity-50 flex justify-center items-center gap-1"
            >
              <Plus size={12} />
              Add Selected ({selectedLinks.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;
