
import React, { useState } from 'react';
import { Taxon, TaxonRank, UserPreferences } from '../types';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import DetailsPanel from './DetailsPanel';
import { formatScientificName } from '../utils/formatters';

interface TaxonRowProps {
  taxon: Taxon;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Taxon>) => void;
  depth: number;
  preferences: UserPreferences;
}

const TaxonRow: React.FC<TaxonRowProps> = ({ taxon, onDelete, onUpdate, depth, preferences }) => {
  const [expanded, setExpanded] = useState(false);

  // Indentation logic based on rank or depth
  const isGenus = taxon.rank === 'genus';
  const isSpecies = taxon.rank === 'species';
  
  // Style adjustments
  let nameStyle = "font-serif text-slate-700";
  if (isGenus) nameStyle = "font-serif font-bold text-slate-800 text-lg italic";
  else if (isSpecies) nameStyle = "font-serif font-semibold text-slate-600 italic";
  else if (taxon.rank === 'cultivar') nameStyle = "font-sans font-medium text-slate-800";
  else nameStyle = "font-serif text-slate-500 italic"; // var, subsp

  // Use Formatter for the specific epithet/name
  let displayName = formatScientificName(taxon, preferences);
  if (taxon.rank === 'cultivar') displayName = `'${taxon.name}'`;
  
  // Rank badge
  const showRankBadge = !isGenus && !isSpecies && taxon.rank !== 'cultivar';

  return (
    <>
      <tr className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
        
        {/* Name Column with dynamic indent */}
        <td className="p-3 align-top pl-8">
           <div className="flex items-center gap-2" style={{ marginLeft: `${depth * 20}px` }}>
              <span className={nameStyle}>{displayName}</span>
              {showRankBadge && (
                 <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 rounded">
                    {taxon.rank.substring(0,4)}
                 </span>
              )}
           </div>
        </td>

        {/* Common Name */}
        <td className="p-3 align-top">
          <div className="text-slate-600 text-sm">{taxon.commonName}</div>
        </td>

        {/* Family (Only show on Genus usually, or if distinct) */}
        <td className="p-3 align-top">
           {isGenus && taxon.family && (
             <span className="text-xs text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                {taxon.family}
             </span>
           )}
        </td>

        {/* Actions */}
        <td className="p-3 align-top text-right w-32">
              <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-bold uppercase tracking-wide text-leaf-600 hover:text-leaf-700 flex items-center gap-1"
                >
                  {expanded ? 'Close' : 'Details'}
                  {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>

                <button 
                  onClick={() => { if(confirm('Delete this taxon and all descendants?')) onDelete(taxon.id); }}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
        </td>
      </tr>
      
      {expanded && (
        <tr className="bg-slate-50/80 border-b border-slate-100 shadow-inner">
          <td colSpan={4} className="p-0">
            <div className="p-6" style={{ paddingLeft: `${(depth * 20) + 40}px` }}>
               <DetailsPanel
                 title={taxon.scientificName}
                 description={taxon.description}
                 synonyms={taxon.synonyms}
                 referenceLinks={taxon.referenceLinks}
                 onUpdate={(updates) => onUpdate(taxon.id, updates)}
               />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default TaxonRow;
