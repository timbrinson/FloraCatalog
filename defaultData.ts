
import { Taxon } from './types';

export const DEFAULT_TAXA: Taxon[] = [
    // 1. x Amarine tubergenii 'Anastasia'
    { 
        id: '1', rank: 'genus', name: 'Amarine', scientificName: '× Amarine', genusHybrid: '×', genus: 'Amarine', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 1 
    },
    { 
        id: '2', parentId: '1', rank: 'species', name: 'tubergenii', scientificName: '× Amarine tubergenii', genus: 'Amarine', genusHybrid: '×', species: 'tubergenii', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 2 
    },
    { 
        id: '3', parentId: '2', rank: 'cultivar', name: 'Anastasia', scientificName: "× Amarine tubergenii 'Anastasia'", genus: 'Amarine', genusHybrid: '×', species: 'tubergenii', cultivar: 'Anastasia', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 3 
    },

    // 2. x Hippeastrelia 'Volcano'
    { 
        id: '4', rank: 'genus', name: 'Hippeastrelia', scientificName: '× Hippeastrelia', genusHybrid: '×', genus: 'Hippeastrelia', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 4 
    },
    { 
        id: '5', parentId: '4', rank: 'cultivar', name: 'Volcano', scientificName: "× Hippeastrelia 'Volcano'", genus: 'Hippeastrelia', genusHybrid: '×', cultivar: 'Volcano', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 5 
    },

    // 3. Hippeastrum x johnsonii
    { 
        id: '6', rank: 'genus', name: 'Hippeastrum', scientificName: 'Hippeastrum', genus: 'Hippeastrum', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 6 
    },
    { 
        id: '7', parentId: '6', rank: 'species', name: 'johnsonii', scientificName: 'Hippeastrum × johnsonii', genus: 'Hippeastrum', species: 'johnsonii', speciesHybrid: '×', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 7 
    },

    // 4. Habranthus x floryi 'Cherry Pink'
    { 
        id: '8', rank: 'genus', name: 'Habranthus', scientificName: 'Habranthus', genus: 'Habranthus', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 8 
    },
    { 
        id: '9', parentId: '8', rank: 'species', name: 'floryi', scientificName: 'Habranthus × floryi', genus: 'Habranthus', species: 'floryi', speciesHybrid: '×', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 9 
    },
    { 
        id: '10', parentId: '9', rank: 'cultivar', name: 'Cherry Pink', scientificName: "Habranthus × floryi 'Cherry Pink'", genus: 'Habranthus', species: 'floryi', speciesHybrid: '×', cultivar: 'Cherry Pink', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 10 
    },

    // 5. Agave parryi hierarchy
    { 
        id: '11', rank: 'genus', name: 'Agave', scientificName: 'Agave', genus: 'Agave', taxonStatus: 'Accepted', family: 'Asparagaceae', synonyms: [], referenceLinks: [], createdAt: 11 
    },
    { 
        id: '12', parentId: '11', rank: 'species', name: 'parryi', scientificName: 'Agave parryi', genus: 'Agave', species: 'parryi', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 12 
    },
    { 
        id: '13', parentId: '12', rank: 'subspecies', name: 'huachucensis', scientificName: 'Agave parryi subsp. huachucensis', genus: 'Agave', species: 'parryi', infraspecificRank: 'subsp.', infraspecies: 'huachucensis', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 13 
    },
    { 
        id: '14', parentId: '12', rank: 'subspecies', name: 'truncata', scientificName: 'Agave parryi subsp. truncata', genus: 'Agave', species: 'parryi', infraspecificRank: 'subsp.', infraspecies: 'truncata', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 14 
    },
    { 
        id: '15', parentId: '14', rank: 'cultivar', name: 'Orizaba', scientificName: "Agave parryi subsp. truncata 'Orizaba'", genus: 'Agave', species: 'parryi', infraspecificRank: 'subsp.', infraspecies: 'truncata', cultivar: 'Orizaba', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 15 
    },

    // 6. Tulipa clusiana hierarchy
    { 
        id: '16', rank: 'genus', name: 'Tulipa', scientificName: 'Tulipa', genus: 'Tulipa', taxonStatus: 'Accepted', family: 'Liliaceae', synonyms: [], referenceLinks: [], createdAt: 16 
    },
    { 
        id: '17', parentId: '16', rank: 'species', name: 'clusiana', scientificName: 'Tulipa clusiana', genus: 'Tulipa', species: 'clusiana', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 17 
    },
    { 
        id: '18', parentId: '17', rank: 'variety', name: 'stellata', scientificName: 'Tulipa clusiana var. stellata', genus: 'Tulipa', species: 'clusiana', infraspecificRank: 'var.', infraspecies: 'stellata', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 18 
    },
    { 
        id: '19', parentId: '17', rank: 'variety', name: 'chrysanth', scientificName: 'Tulipa clusiana var. chrysanth', genus: 'Tulipa', species: 'clusiana', infraspecificRank: 'var.', infraspecies: 'chrysanth', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 19 
    },
    { 
        id: '20', parentId: '19', rank: 'cultivar', name: 'Tubergens Gem', scientificName: "Tulipa clusiana var. chrysanth 'Tubergens Gem'", genus: 'Tulipa', species: 'clusiana', infraspecificRank: 'var.', infraspecies: 'chrysanth', cultivar: 'Tubergens Gem', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 20 
    },

    // 7. Echeveria colorata
    { 
        id: '21', rank: 'genus', name: 'Echeveria', scientificName: 'Echeveria', genus: 'Echeveria', taxonStatus: 'Accepted', family: 'Crassulaceae', synonyms: [], referenceLinks: [], createdAt: 21 
    },
    { 
        id: '22', parentId: '21', rank: 'species', name: 'colorata', scientificName: 'Echeveria colorata', genus: 'Echeveria', species: 'colorata', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 22 
    },
    { 
        id: '23', parentId: '22', rank: 'form', name: 'lindsayana', scientificName: 'Echeveria colorata f. lindsayana', genus: 'Echeveria', species: 'colorata', infraspecificRank: 'f.', infraspecies: 'lindsayana', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 23 
    },

    // 8. Agapanthus
    { 
        id: '24', rank: 'genus', name: 'Agapanthus', scientificName: 'Agapanthus', genus: 'Agapanthus', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 24 
    },
    { 
        id: '25', parentId: '24', rank: 'cultivar', name: 'Storm Cloud', scientificName: "Agapanthus 'Storm Cloud'", genus: 'Agapanthus', cultivar: 'Storm Cloud', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 25 
    },
    { 
        id: '26', parentId: '24', rank: 'species', name: 'africanus', scientificName: 'Agapanthus africanus', genus: 'Agapanthus', species: 'africanus', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 26 
    },
    { 
        id: '27', parentId: '26', rank: 'cultivar', name: 'Summer Sky', scientificName: "Agapanthus africanus 'Summer Sky'", genus: 'Agapanthus', species: 'africanus', cultivar: 'Summer Sky', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 27 
    },

    // 9. Boophone
    { 
        id: '28', rank: 'genus', name: 'Boophone', scientificName: 'Boophone', genus: 'Boophone', taxonStatus: 'Accepted', family: 'Amaryllidaceae', synonyms: [], referenceLinks: [], createdAt: 28 
    },
    { 
        id: '29', parentId: '28', rank: 'species', name: 'disticha', scientificName: 'Boophone disticha', genus: 'Boophone', species: 'disticha', taxonStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 29 
    }
];