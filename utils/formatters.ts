import { Taxon, UserPreferences } from '../types';

// Fix: Add missing searchMode to default UserPreferences to resolve TypeScript error
export const formatScientificName = (taxon: Taxon, prefs: UserPreferences = { hybridSpacing: 'space', autoEnrichment: false, colorTheme: 'option2a', searchMode: 'prefix' }): string => {
  let name = taxon.name || ''; 
  
  // Clean potential dirty data double-prefixes if normalizing didn't catch them all
  const cleanName = name.replace(/^[×x]\s?/i, '');
  
  // Logic for adding hybrid symbol prefix
  const isGenusHybrid = taxon.genusHybrid === '×' || taxon.genusHybrid === 'x';
  const isSpeciesHybrid = taxon.speciesHybrid === '×' || taxon.speciesHybrid === 'x';

  const showHybridSymbol = isGenusHybrid || isSpeciesHybrid;

  if (showHybridSymbol) {
    const space = prefs.hybridSpacing === 'space' ? ' ' : '';
    return `×${space}${cleanName}`;
  }
  
  return cleanName;
};

// Helper for full scientific name reconstruction
export const formatFullScientificName = (taxon: Taxon, prefs: UserPreferences): string => {
    let fullName = taxon.taxonName || taxon.name || 'Unknown'; 
    const space = prefs.hybridSpacing === 'space' ? ' ' : '';

    // Step 1: Normalize any existing x/× to a standard placeholder
    let formatted = fullName;
    
    // Handle "Start of string" hybrid (Intergeneric) e.g. "x Mangave"
    if (/^[×x]\s?/i.test(formatted)) {
        formatted = formatted.replace(/^[×x]\s?/i, `%%HYBRID_START%%`);
    }

    // Handle "Middle of string" hybrid (Interspecific) e.g. "Salvia x jamensis"
    formatted = formatted.replace(/\s[×x]\s/g, ' %%HYBRID_MID%% ');
    
    // Handle the tight case "Salvia×jamensis"
    if (formatted.includes('×') && !formatted.includes('%%HYBRID')) {
         formatted = formatted.replace(/×/g, ' %%HYBRID_MID%% ');
    }
    
    // Now reconstruct with user preferences
    
    // 1. Intergeneric (Start)
    formatted = formatted.replace('%%HYBRID_START%%', `×${space}`);
    
    // 2. Interspecific (Middle)
    formatted = formatted.replace(/\s?%%HYBRID_MID%%\s?/g, ` ×${space}`);

    // Fallback cleanup if no tokens were used but × is present
    if (!formatted.includes('%%HYBRID')) {
        formatted = formatted.replace(/(\S)(×)/g, '$1 ×'); 
        
        if (prefs.hybridSpacing === 'space') {
             formatted = formatted.replace(/×(?=\S)/g, '× ');
        } else {
             formatted = formatted.replace(/×\s/g, '×');
        }
    }

    return formatted.trim();
};