

import { Taxon } from './types';

export const DEFAULT_TAXA: Taxon[] = [
    // 1. x Amarine tubergenii 'Anastasia'
    { 
        id: '1', taxonRank: 'genus', name: 'Amarine', taxonName: '× Amarine', genusHybrid: '×', genus: 'Amarine', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 1 
    },
    { 
        id: '2', parentId: '1', taxonRank: 'species', name: 'tubergenii', taxonName: '× Amarine tubergenii', genus: 'Amarine', genusHybrid: '×', species: 'tubergenii', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 2 
    },
    { 
        id: '3', parentId: '2', taxonRank: 'cultivar', name: 'Anastasia', taxonName: "× Amarine tubergenii 'Anastasia'", genus: 'Amarine', genusHybrid: '×', species: 'tubergenii', cultivar: 'Anastasia', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 3 
    },

    // 2. x Hippeastrelia 'Volcano'
    { 
        id: '4', taxonRank: 'genus', name: 'Hippeastrelia', taxonName: '× Hippeastrelia', genusHybrid: '×', genus: 'Hippeastrelia', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 4 
    },
    { 
        id: '5', parentId: '4', taxonRank: 'cultivar', name: 'Volcano', taxonName: "× Hippeastrelia 'Volcano'", genus: 'Hippeastrelia', genusHybrid: '×', cultivar: 'Volcano', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 5 
    },

    // 3. Hippeastrum x johnsonii
    { 
        id: '6', taxonRank: 'genus', name: 'Hippeastrum', taxonName: 'Hippeastrum', genus: 'Hippeastrum', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 6 
    },
    { 
        id: '7', parentId: '6', taxonRank: 'species', name: 'johnsonii', taxonName: 'Hippeastrum × johnsonii', genus: 'Hippeastrum', species: 'johnsonii', speciesHybrid: '×', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 7 
    },

    // 4. Habranthus x floryi 'Cherry Pink'
    { 
        id: '8', taxonRank: 'genus', name: 'Habranthus', taxonName: 'Habranthus', genus: 'Habranthus', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 8 
    },
    { 
        id: '9', parentId: '8', taxonRank: 'species', name: 'floryi', taxonName: 'Habranthus × floryi', genus: 'Habranthus', species: 'floryi', speciesHybrid: '×', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 9 
    },
    { 
        id: '10', parentId: '9', taxonRank: 'cultivar', name: 'Cherry Pink', taxonName: "Habranthus × floryi 'Cherry Pink'", genus: 'Habranthus', species: 'floryi', speciesHybrid: '×', cultivar: 'Cherry Pink', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 10 
    },

    // 5. Agave parryi hierarchy
    { 
        id: '11', taxonRank: 'genus', name: 'Agave', taxonName: 'Agave', genus: 'Agave', taxonStatus: 'Accepted', family: 'Asparagaceae', synonyms: [], referenceLinks: [], createdAt: 11 
    },
    { 
        id: '12', parentId: '11', taxonRank: 'species', name: 'parryi', taxonName: 'Agave parryi', genus: 'Agave', species: 'parryi', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 12 
    },
    { 
        id: '13', parentId: '12', taxonRank: 'subspecies', name: 'huachucensis', taxonName: 'Agave parryi subsp. huachucensis', genus: 'Agave', species: 'parryi', infraspecificRank: 'subsp.', infraspecies: 'huachucensis', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 13 
    },
    { 
        id: '14', parentId: '12', taxonRank: 'subspecies', name: 'truncata', taxonName: 'Agave parryi subsp. truncata', genus: 'Agave', species: 'parryi', infraspecificRank: 'subsp.', infraspecies: 'truncata', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 14 
    },
    { 
        id: '15', parentId: '14', taxonRank: 'cultivar', name: 'Orizaba', taxonName: "Agave parryi subsp. truncata 'Orizaba'", genus: 'Agave', species: 'parryi', infraspecificRank: 'subsp.', infraspecies: 'truncata', cultivar: 'Orizaba', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 15 
    },

    // 6. Tulipa clusiana hierarchy
    { 
        id: '16', taxonRank: 'genus', name: 'Tulipa', taxonName: 'Tulipa', genus: 'Tulipa', taxonStatus: 'Accepted', family: 'Liliaceae', synonyms: [], referenceLinks: [], createdAt: 16 
    },
    { 
        id: '17', parentId: '16', taxonRank: 'species', name: 'clusiana', taxonName: 'Tulipa clusiana', genus: 'Tulipa', species: 'clusiana', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 17 
    },
    { 
        id: '18', parentId: '17', taxonRank: 'variety', name: 'stellata', taxonName: 'Tulipa clusiana var. stellata', genus: 'Tulipa', species: 'clusiana', infraspecificRank: 'var.', infraspecies: 'stellata', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 18 
    },
    { 
        id: '19', parentId: '17', taxonRank: 'variety', name: 'chrysanth', taxonName: 'Tulipa clusiana var. chrysanth', genus: 'Tulipa', species: 'clusiana', infraspecificRank: 'var.', infraspecies: 'chrysanth', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 19 
    },
    { 
        id: '20', parentId: '19', taxonRank: 'cultivar', name: 'Tubergens Gem', taxonName: "Tulipa clusiana var. chrysanth 'Tubergens Gem'", genus: 'Tulipa', species: 'clusiana', infraspecificRank: 'var.', infraspecies: 'chrysanth', cultivar: 'Tubergens Gem', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 20 
    },

    // 7. Echeveria colorata
    { 
        id: '21', taxonRank: 'genus', name: 'Echeveria', taxonName: 'Echeveria', genus: 'Echeveria', taxonStatus: 'Accepted', family: 'Crassulaceae', synonyms: [], referenceLinks: [], createdAt: 21 
    },
    { 
        id: '22', parentId: '21', taxonRank: 'species', name: 'colorata', taxonName: 'Echeveria colorata', genus: 'Echeveria', species: 'colorata', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 22 
    },
    { 
        id: '23', parentId: '22', taxonRank: 'form', name: 'lindsayana', taxonName: 'Echeveria colorata f. lindsayana', genus: 'Echeveria', species: 'colorata', infraspecificRank: 'f.', infraspecies: 'lindsayana', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 23 
    },

    // 8. Agapanthus
    { 
        id: '24', taxonRank: 'genus', name: 'Agapanthus', taxonName: 'Agapanthus', genus: 'Agapanthus', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 24 
    },
    { 
        id: '25', parentId: '24', taxonRank: 'cultivar', name: 'Storm Cloud', taxonName: "Agapanthus 'Storm Cloud'", genus: 'Agapanthus', cultivar: 'Storm Cloud', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 25 
    },
    { 
        id: '26', parentId: '24', taxonRank: 'species', name: 'africanus', taxonName: 'Agapanthus africanus', genus: 'Agapanthus', species: 'africanus', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 26 
    },
    { 
        id: '27', parentId: '26', taxonRank: 'cultivar', name: 'Summer Sky', taxonName: "Agapanthus africanus 'Summer Sky'", genus: 'Agapanthus', species: 'africanus', cultivar: 'Summer Sky', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 27 
    },

    // 9. Boophone
    { 
        id: '28', taxonRank: 'genus', name: 'Boophone', taxonName: 'Boophone', genus: 'Boophone', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 28 
    },
    { 
        id: '29', parentId: '28', taxonRank: 'species', name: 'disticha', taxonName: 'Boophone disticha', genus: 'Boophone', species: 'disticha', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 29 
    }
];