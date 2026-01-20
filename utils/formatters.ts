import { Taxon, UserPreferences } from '../types';

/**
 * RANK_ALIAS_MAP: Standardizes verbose rank names to botanical abbreviations.
 * Used during Stage 2 Normalization to ensure DB consistency.
 */
export const RANK_ALIAS_MAP: Record<string, string> = {
    'subspecies': 'subsp.',
    'subsp': 'subsp.',
    'ssp.': 'subsp.',
    'ssp': 'subsp.',
    'variety': 'var.',
    'varietas': 'var.',
    'var': 'var.',
    'v.': 'var.',
    'v': 'var.',
    'form': 'f.',
    'forma': 'f.',
    'f': 'f.',
    'fo.': 'f.',
    'fo': 'f.',
    'fa.': 'f.',
    'fa': 'f.',
    'subvariety': 'subvar.',
    'subform': 'subf.',
    'convariety': 'convar.',
    'nothosubspecies': 'nothosubsp.',
    'nothovariety': 'nothovar.'
};

/**
 * diacriticTranscription: Maps botanical diacritics and historical numeric substitutions.
 * v2.35.5: Added historical numeric transcription (e.g., Munz1 -> Munzi).
 */
const transcribeDiacritics = (str: string): string => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Standard accent stripping
        .replace(/ñ/g, 'n')
        .replace(/1/g, 'i'); // Historical botanical transcription: Munz1 -> Munzi
};

/**
 * getNakedName: Returns a standardized botanical string based on a whitelist.
 * v2.35.5: Expanded whitelist to include botanical symbols and author citation parentheses.
 */
export const getNakedName = (name: string): string => {
  if (!name) return '';
  
  let clean = name;
  
  // Character Swaps
  clean = clean.replace(/_/g, '-');
  clean = clean.replace(/\b[xX]\b/g, '×'); // Standalone x/X to multiplication
  clean = clean.replace(/["`]/g, "'");    // Quote normalization
  
  // Diacritic Transcription
  clean = transcribeDiacritics(clean);

  // Whitelist: A-Z, a-z, 0-9, spaces, -, ', ×, +, ., ,, !, /, \, (, )
  return clean
    .replace(/[^A-Za-z0-9 \-'×+.,!/\\()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export interface LexedTaxonParts {
    genus_hybrid?: string;
    genus?: string;
    species_hybrid?: string;
    species?: string;
    infraspecific_rank?: string;
    infraspecies?: string;
    cultivar?: string;
    nomenclature_metadata?: string;
}

/**
 * parseBotanicalName: The Stage 0 Deterministic Lexer.
 * Algorithmic sequential token consumption following botanical nomenclature rules.
 */
export const parseBotanicalName = (input: string): LexedTaxonParts => {
    const parts: LexedTaxonParts = {};
    let remaining = getNakedName(input);
    if (!remaining) return parts;

    const toTitleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    // 1. Genus Hybrid Marker
    if (remaining.startsWith('+') || remaining.startsWith('×')) {
        parts.genus_hybrid = remaining.charAt(0);
        remaining = remaining.slice(1).trim();
    }

    // 2. Genus
    const words = remaining.split(' ');
    if (words.length > 0) {
        parts.genus = words[0].replace(/[()]/g, ''); // Strip author parentheses if present in first word
        parts.genus = toTitleCase(parts.genus);
        remaining = words.slice(1).join(' ').trim();
    }

    // 3. Species Hybrid Marker
    if (remaining.startsWith('+') || remaining.startsWith('×')) {
        parts.species_hybrid = remaining.charAt(0);
        remaining = remaining.slice(1).trim();
    }

    // 4. Look for Infraspecific Markers
    const infraspecificKeys = Object.keys(RANK_ALIAS_MAP).sort((a, b) => b.length - a.length);
    let markerFound = false;

    for (const key of infraspecificKeys) {
        const markerRegex = new RegExp(`\\b${key.replace('.', '\\.')}\\b`, 'i');
        const match = remaining.match(markerRegex);
        if (match) {
            const index = match.index!;
            const markerText = match[0];
            
            // Text before marker is the species epithet (unless already processed)
            const preMarker = remaining.slice(0, index).trim();
            if (preMarker && !preMarker.includes("'")) {
                parts.species = preMarker.toLowerCase();
            }

            parts.infraspecific_rank = RANK_ALIAS_MAP[key.toLowerCase()];
            
            // Text after marker: first word is infraspecies
            let postMarker = remaining.slice(index + markerText.length).trim();
            const postWords = postMarker.split(' ');
            if (postWords.length > 0) {
                parts.infraspecies = postWords[0].toLowerCase();
                remaining = postWords.slice(1).join(' ').trim();
            }
            markerFound = true;
            break;
        }
    }

    // 5. Species Epithet (If not already found via marker)
    if (!parts.species && !markerFound && remaining && !remaining.startsWith("'")) {
        const wordsAfterGenus = remaining.split(' ');
        if (wordsAfterGenus.length > 0) {
            parts.species = wordsAfterGenus[0].toLowerCase();
            remaining = wordsAfterGenus.slice(1).join(' ').trim();
        }
    }

    // 6. Cultivar (Quote Delimited)
    if (remaining.includes("'")) {
        const firstQuote = remaining.indexOf("'");
        const lastQuote = remaining.lastIndexOf("'");
        
        // Everything before first quote is "Pre-cultivar Noise"
        // remaining = remaining.slice(firstQuote); 
        
        if (firstQuote !== lastQuote && lastQuote - firstQuote > 1) {
            parts.cultivar = toTitleCase(remaining.slice(firstQuote + 1, lastQuote));
            // Metadata is everything remaining outside the quotes
            parts.nomenclature_metadata = (remaining.slice(0, firstQuote) + " " + remaining.slice(lastQuote + 1)).trim();
        } else {
            // Lenient handling for single quote
            parts.cultivar = toTitleCase(remaining.slice(firstQuote + 1));
            parts.nomenclature_metadata = remaining.slice(0, firstQuote).trim();
        }
    } else if (!markerFound && remaining) {
        // If there's leftover text and no quotes/markers, it's likely nomenclature metadata (author citations)
        parts.nomenclature_metadata = remaining;
    }

    return parts;
};

/**
 * normalizeTaxonParts: Applies Stage 3 logic to raw AI tokens.
 */
export const normalizeTaxonParts = (p: Partial<Taxon>): Partial<Taxon> => {
    const normalized = { ...p };
    
    // Regex for hybrid markers: matches leading x, X, ×, or + followed by optional space
    const hybridRegex = /^[×+xX]\s*/;

    if (normalized.genus) {
        let cleanGenus = normalized.genus.trim();
        if (hybridRegex.test(cleanGenus)) {
            normalized.genus_hybrid = '×';
            cleanGenus = cleanGenus.replace(hybridRegex, '');
        }
        normalized.genus = cleanGenus.charAt(0).toUpperCase() + cleanGenus.slice(1).toLowerCase();
    }
    
    if (normalized.species) {
        let cleanSpecies = normalized.species.trim();
        if (hybridRegex.test(cleanSpecies)) {
            normalized.species_hybrid = '×';
            cleanSpecies = cleanSpecies.replace(hybridRegex, '');
        }
        normalized.species = cleanSpecies.toLowerCase();
    }
    
    if (normalized.infraspecies) {
        let cleanInfra = normalized.infraspecies.trim();
        if (hybridRegex.test(cleanInfra)) {
            cleanInfra = cleanInfra.replace(hybridRegex, '');
        }
        normalized.infraspecies = cleanInfra.toLowerCase();
    }
    
    if (normalized.infraspecific_rank) {
        const rankLower = normalized.infraspecific_rank.trim().toLowerCase();
        normalized.infraspecific_rank = RANK_ALIAS_MAP[rankLower] || rankLower;
    }
    
    if (normalized.cultivar) {
        const clean = normalized.cultivar.trim().replace(/['"]/g, '');
        normalized.cultivar = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    
    return normalized;
};

/**
 * assembleScientificName: Deterministically builds a botanical name from parts.
 */
export const assembleScientificName = (p: Partial<Taxon>): string => {
  const normalized = normalizeTaxonParts(p);
  let parts: string[] = [];
  
  if (normalized.genus) {
    const isGenusHybrid = normalized.genus_hybrid === '×' || (normalized.genus_hybrid as any) === true;
    const gh = isGenusHybrid ? '× ' : '';
    parts.push(`${gh}${normalized.genus}`);
  }
  
  if (normalized.species) {
    const isSpeciesHybrid = normalized.species_hybrid === '×' || (normalized.species_hybrid as any) === true;
    const sh = isSpeciesHybrid ? '× ' : '';
    parts.push(`${sh}${normalized.species}`);
  }
  
  if (normalized.infraspecific_rank && normalized.infraspecies) {
    parts.push(`${normalized.infraspecific_rank} ${normalized.infraspecies}`);
  }
  
  if (normalized.cultivar) {
    parts.push(`'${normalized.cultivar}'`);
  }
  
  return parts.join(' ').trim();
};

export const formatFullScientificName = (taxon: Taxon, prefs: UserPreferences): string => {
    let fullName = taxon.taxon_name || taxon.name || 'Unknown'; 
    const space = prefs.hybrid_spacing === 'space' ? ' ' : '';

    let formatted = fullName;
    
    if (/^[×]\s?/i.test(formatted)) {
        formatted = formatted.replace(/^[×]\s?/i, `%%HYBRID_START%%`);
    }

    formatted = formatted.replace(/\s[×]\s/g, ' %%HYBRID_MID%% ');
    
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