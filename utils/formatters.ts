
import { Taxon, UserPreferences } from '../types';

export const formatScientificName = (taxon: Taxon, prefs: UserPreferences = { hybrid_spacing: 'space', auto_enrichment: false, color_theme: 'option2a', search_mode: 'prefix' }): string => {
  let name = taxon.name || ''; 
  
  const cleanName = name.replace(/^[×x]\s?/i, '');
  
  const isGenusHybrid = taxon.genus_hybrid === '×' || taxon.genus_hybrid === 'x';
  const isSpeciesHybrid = taxon.species_hybrid === '×' || taxon.species_hybrid === 'x';

  const showHybridSymbol = isGenusHybrid || isSpeciesHybrid;

  if (showHybridSymbol) {
    const space = prefs.hybrid_spacing === 'space' ? ' ' : '';
    return `×${space}${cleanName}`;
  }
  
  return cleanName;
};

export const formatFullScientificName = (taxon: Taxon, prefs: UserPreferences): string => {
    let fullName = taxon.taxon_name || taxon.name || 'Unknown'; 
    const space = prefs.hybrid_spacing === 'space' ? ' ' : '';

    let formatted = fullName;
    
    if (/^[×x]\s?/i.test(formatted)) {
        formatted = formatted.replace(/^[×x]\s?/i, `%%HYBRID_START%%`);
    }

    formatted = formatted.replace(/\s[×x]\s/g, ' %%HYBRID_MID%% ');
    
    if (formatted.includes('×') && !formatted.includes('%%HYBRID')) {
         formatted = formatted.replace(/×/g, ' %%HYBRID_MID%% ');
    }
    
    formatted = formatted.replace('%%HYBRID_START%%', `×${space}`);
    formatted = formatted.replace(/\s?%%HYBRID_MID%%\s?/g, ` ×${space}`);

    if (!formatted.includes('%%HYBRID')) {
        formatted = formatted.replace(/(\S)(×)/g, '$1 ×'); 
        
        if (prefs.hybrid_spacing === 'space') {
             formatted = formatted.replace(/×(?=\S)/g, '× ');
        } else {
             formatted = formatted.replace(/×\s/g, '×');
        }
    }

    return formatted.trim();
};
