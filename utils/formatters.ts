

import { Taxon, UserPreferences } from '../types';

export const formatScientificName = (taxon: Taxon, prefs: UserPreferences = { hybridSpacing: 'space', autoEnrichment: false, colorTheme: 'option2a' }): string => {
  let name = taxon.name || ''; // Safe default
  
  // Clean potential dirty data double-prefixes if normalizing didn't catch them all
  const cleanName = name.replace(/^[×x]\s?/i, '');
  
  // Logic for adding hybrid symbol prefix
  const isGenusHybrid = taxon.genusHybrid === '×' || taxon.genusHybrid === 'x';
  const isSpeciesHybrid = taxon.speciesHybrid === '×' || taxon.speciesHybrid === 'x';
  const isHybridRank = taxon.taxonRank === 'hybrid'; 

  const showHybridSymbol = isGenusHybrid || isSpeciesHybrid || isHybridRank;

  if (showHybridSymbol) {
    const space = prefs.hybridSpacing === 'space' ? ' ' : '';
    return `×${space}${cleanName}`;
  }
  
  return cleanName;
};

// Helper for full scientific name reconstruction
export const formatFullScientificName = (taxon: Taxon, prefs: UserPreferences): string => {
    let fullName = taxon.taxonName || taxon.name || 'Unknown'; // Was scientificName
    const space = prefs.hybridSpacing === 'space' ? ' ' : '';

    // Step 1: Normalize any existing x/× to a standard placeholder
    let formatted = fullName;
    
    // Handle "Start of string" hybrid (Intergeneric) e.g. "x Mangave"
    if (/^[×x]\s?/i.test(formatted)) {
        formatted = formatted.replace(/^[×x]\s?/i, `%%HYBRID_START%%`);
    }

    // Handle "Middle of string" hybrid (Interspecific) e.g. "Salvia x jamensis"
    // We look for x/× surrounded by spaces, OR preceded by a letter and followed by space/letter
    formatted = formatted.replace(/\s[×x]\s/g, ' %%HYBRID_MID%% ');
    
    // Handle the tight case "Salvia×jamensis" -> ensure it triggers
    if (formatted.includes('×') && !formatted.includes('%%HYBRID')) {
         formatted = formatted.replace(/×/g, ' %%HYBRID_MID%% ');
    }
    
    // Now reconstruct with user preferences
    
    // 1. Intergeneric (Start)
    formatted = formatted.replace('%%HYBRID_START%%', `×${space}`);
    
    // 2. Interspecific (Middle)
    // Always ensure a space BEFORE the ×
    formatted = formatted.replace(/\s?%%HYBRID_MID%%\s?/g, ` ×${space}`);

    // Fallback cleanup if no tokens were used but × is present
    if (!formatted.includes('%%HYBRID')) {
        // Ensure space BEFORE × if it's in the middle of text (e.g. "Salvia×jamensis")
        formatted = formatted.replace(/(\S)(×)/g, '$1 ×'); 
        
        // Enforce spacing AFTER × based on pref
        if (prefs.hybridSpacing === 'space') {
             formatted = formatted.replace(/×(?=\S)/g, '× ');
        } else {
             formatted = formatted.replace(/×\s/g, '×');
        }
    }

    return formatted.trim();
};