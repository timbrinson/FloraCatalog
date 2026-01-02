import { Taxon, UserPreferences } from '../types';

/**
 * assembleScientificName: Deterministically builds a botanical name from parts.
 * ADR-005: Standards enforcement MUST be algorithmic.
 */
export const assembleScientificName = (p: Partial<Taxon>): string => {
  let parts: string[] = [];
  
  if (p.genus && p.genus !== 'null') {
    const isGenusHybrid = p.genus_hybrid === '×' || p.genus_hybrid === 'x' || p.genus_hybrid === 'true';
    const gh = isGenusHybrid ? '× ' : '';
    // Strip existing symbols before applying standard ones
    const cleanGenus = String(p.genus).trim().replace(/^[×x+]\s?/i, '');
    if (cleanGenus) {
        parts.push(`${gh}${cleanGenus.charAt(0).toUpperCase()}${cleanGenus.slice(1).toLowerCase()}`);
    }
  }
  
  if (p.species && p.species !== 'null') {
    const isSpeciesHybrid = p.species_hybrid === '×' || p.species_hybrid === 'x' || p.species_hybrid === 'true';
    const sh = isSpeciesHybrid ? '× ' : '';
    const cleanSpecies = String(p.species).trim().replace(/^[×x+]\s?/i, '');
    if (cleanSpecies) {
        parts.push(`${sh}${cleanSpecies.toLowerCase()}`);
    }
  }
  
  if (p.infraspecific_rank && p.infraspecific_rank !== 'null' && p.infraspecies && p.infraspecies !== 'null') {
    const rank = String(p.infraspecific_rank).trim();
    const epithet = String(p.infraspecies).trim().toLowerCase();
    if (rank && epithet) {
        parts.push(`${rank} ${epithet}`);
    }
  }
  
  if (p.cultivar && p.cultivar !== 'null') {
    const cleanCultivar = String(p.cultivar).trim().replace(/['"]/g, '');
    if (cleanCultivar) {
        parts.push(`'${cleanCultivar}'`);
    }
  }
  
  return parts.join(' ').trim();
};

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