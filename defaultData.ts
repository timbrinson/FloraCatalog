
import { Taxon } from './types';

export const DEFAULT_TAXA: Taxon[] = [
    // 1. Agave ovatifolia 'Frosty Blue'
    { 
        id: '1', rank: 'genus', name: 'Agave', scientificName: 'Agave', taxonomicStatus: 'Accepted', family: 'Asparagaceae', commonName: 'Century Plant', synonyms: [], referenceLinks: [], createdAt: 1,
        authorship: 'L.', plantNameId: 'urn:lsid:ipni.org:names:320035-2',
        geographicArea: 'Americas', firstPublished: 'Sp. Pl.: 323 (1753)',
        reviewed: 'Y', lifeformDescription: 'Succulent subshrub', climateDescription: 'Subtropical'
    },
    { 
        id: '2', parentId: '1', rank: 'species', name: 'ovatifolia', scientificName: 'Agave ovatifolia', taxonomicStatus: 'Accepted', commonName: "Whale's Tongue Agave", synonyms: [], referenceLinks: [], createdAt: 2,
        authorship: 'G.D.Starr & Villarreal', geographicArea: 'Mexico Northeast', plantNameId: 'urn:lsid:ipni.org:names:60435868-2',
        firstPublished: 'Sida 20: 395 (2002)', publication: 'Sida 20: 395', volumeAndPage: '20: 395',
        reviewed: 'Y', lifeformDescription: 'Succulent', climateDescription: 'Subtropical'
    },
    { id: '3', parentId: '2', rank: 'cultivar', name: 'Frosty Blue', scientificName: "Agave ovatifolia 'Frosty Blue'", taxonomicStatus: 'Accepted', commonName: "Frosty Blue Agave", synonyms: [], referenceLinks: [], createdAt: 3, description: "Intense powder-blue foliage selection." },

    // 2. Agave parryi var. truncata 'Huntington'
    { 
        id: '4', parentId: '1', rank: 'species', name: 'parryi', scientificName: 'Agave parryi', taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 4,
        authorship: 'Engelm.', geographicArea: 'Arizona to Mexico', plantNameId: 'urn:lsid:ipni.org:names:6193-2',
        firstPublished: 'Trans. Acad. Sci. St. Louis 3: 311 (1875)',
        reviewed: 'Y'
    },
    { 
        id: '5', parentId: '4', rank: 'variety', name: 'truncata', scientificName: 'Agave parryi var. truncata', taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 5,
        authorship: 'Gentry', geographicArea: 'Mexico (Durango, Zacatecas)', plantNameId: 'urn:lsid:ipni.org:names:22502-2',
        firstPublished: 'Publ. Carnegie Inst. Wash. 527: 523 (1940)',
        nomenclaturalRemarks: 'nom. illeg. if treated as sp.', reviewed: 'Y'
    },
    { 
        id: '13', parentId: '4', rank: 'subspecies', name: 'truncata', scientificName: 'Agave parryi subsp. truncata', taxonomicStatus: 'Synonym', synonyms: [], referenceLinks: [], createdAt: 5,
        authorship: 'Gentry', geographicArea: 'Mexico (Durango, Zacatecas)', plantNameId: 'urn:lsid:ipni.org:names:99999-1',
        acceptedNameId: 'urn:lsid:ipni.org:names:22502-2',
        firstPublished: 'Agaves Cont. N. Amer.: 523 (1982)'
    },
    { id: '6', parentId: '5', rank: 'cultivar', name: 'Huntington', scientificName: "Agave parryi var. truncata 'Huntington'", taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 6, description: "A clone distributed by the Huntington Botanical Gardens." },
    
    // 3. Colocasia 'Mojito'
    { 
        id: '10', rank: 'genus', name: 'Colocasia', scientificName: 'Colocasia', taxonomicStatus: 'Accepted', family: 'Araceae', commonName: 'Elephant Ear', synonyms: [], referenceLinks: [], createdAt: 10,
        authorship: 'Schott', plantNameId: 'urn:lsid:ipni.org:names:2745-1', firstPublished: 'Melet. Bot.: 18 (1832)',
        geographicArea: 'Trop. & Subtrop. Asia'
    },
    { 
        id: '11', parentId: '10', rank: 'species', name: 'esculenta', scientificName: 'Colocasia esculenta', taxonomicStatus: 'Accepted', synonyms: [], referenceLinks: [], createdAt: 11,
        authorship: '(L.) Schott', geographicArea: 'Trop. & Subtrop. Asia to N. Australia', plantNameId: 'urn:lsid:ipni.org:names:86629-1',
        firstPublished: 'Melet. Bot.: 18 (1832)', parentheticalAuthor: 'L.', publicationAuthor: 'Schott',
        reviewed: 'Y'
    },
    { id: '12', parentId: '11', rank: 'cultivar', name: 'Mojito', scientificName: "Colocasia esculenta 'Mojito'", taxonomicStatus: 'Accepted', description: "Speckled with midnight purple.", synonyms: [], referenceLinks: [], createdAt: 12 },

    // 4. Hybrid Example: x Mangave
    {
        id: '20', rank: 'genus', name: 'Mangave', scientificName: '× Mangave', taxonomicStatus: 'Accepted', family: 'Asparagaceae', synonyms: [], referenceLinks: [], createdAt: 20,
        authorship: 'J.M.Webber', genusHybrid: '×', hybridFormula: 'Agave × Manfreda',
        firstPublished: 'Madroño 12: 120 (1953)', plantNameId: 'urn:lsid:ipni.org:names:295627-2',
        reviewed: 'Y'
    }
];
