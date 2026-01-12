/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.32.0
 * 
 * Orchestrates the transformation of raw WCVP and WFO data into the FloraCatalog database.
 * v2.32.0: Higher Rank Extension (Kingdom, Phylum, Class).
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import { from as copyFrom } from 'pg-copy-streams';
import { pipeline } from 'stream/promises';

// Simple .env parser
const loadEnv = () => {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
            lines.forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2 && !line.startsWith('#')) {
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                    process.env[key] = val;
                }
            });
        }
    } catch (e) { /* ignore */ }
};
loadEnv();

// --- CONFIGURATION ---
const DEFAULT_PROJECT_ID = 'uzzayfueabppzpwunvlf';
const DIR_DATA = 'data';
const DIR_INPUT = path.join(DIR_DATA, 'input');
const DIR_TEMP = path.join(DIR_DATA, 'temp');
const FILE_CLEAN_CSV = path.join(DIR_TEMP, 'wcvp_names_clean.csv');
const FILE_WFO_IMPORT = path.join(DIR_TEMP, 'wfo_import.csv');
const FILE_SCHEMA = 'scripts/wcvp_schema.sql.txt';
const FILE_OPTIMIZE = 'scripts/optimize_indexes.sql.txt';
const APP_VERSION = 'v2.32.0';

// Absolute boundaries to ensure no symbols (+, ×) or hybrids are skipped
const SEGMENTS = [
    { label: "A (incl. symbols)", start: "\x01", end: "B" },
    { label: "B", start: "B", end: "C" },
    { label: "C", start: "C", end: "D" },
    { label: "D", start: "D", end: "E" },
    { label: "E", start: "E", end: "F" },
    { label: "F", start: "F", end: "G" },
    { label: "G", start: "G", end: "H" },
    { label: "H", start: "H", end: "I" },
    { label: "I", start: "I", end: "J" },
    { label: "J - K", start: "J", end: "L" },
    { label: "L", start: "L", end: "M" },
    { label: "M", start: "M", end: "N" },
    { label: "N", start: "N", end: "O" },
    { label: "O", start: "O", end: "P" },
    { label: "P", start: "P", end: "Q" },
    { label: "Q", start: "Q", end: "R" },
    { label: "R", start: "R", end: "S" },
    { label: "S", start: "S", end: "T" },
    { label: "T", start: "T", end: "U" },
    { label: "U - V", start: "U", end: "W" },
    { label: "W - Z (incl. max unicode)", start: "W", end: "\uffff" }
];

// --- UTILS ---
const log = (msg) => console.log(`\x1b[36m[FloraBuild]\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
const err = (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);

const askQuestion = (query) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(query, ans => { rl.close(); resolve(ans); });
    });
};

const ensureDirs = () => {
    if (!fs.existsSync(DIR_INPUT)) fs.mkdirSync(DIR_INPUT, { recursive: true });
    if (!fs.existsSync(DIR_TEMP)) fs.mkdirSync(DIR_TEMP, { recursive: true });
};

// Global Client Reference for Robust Reconnection
let activeClient = null;

async function getClient() {
    if (activeClient) {
        try {
            await activeClient.query('SELECT 1');
            return activeClient;
        } catch (e) {
            log("Existing connection lost. Re-establishing...");
        }
    }

    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        log("Connection details not found in .env.");
        const projId = await askQuestion(`Project ID (Default: ${DEFAULT_PROJECT_ID}): `) || DEFAULT_PROJECT_ID;
        const password = await askQuestion("Database Password: ");
        if (!password) { err("Password required."); process.exit(1); }
        connectionString = `postgresql://postgres.${projId}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`;
    }

    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    
    client.on('error', (e) => {
        if (e.message.includes('terminated unexpectedly') || e.message.includes('Connection terminated')) {
            warn("Database connection terminated by host.");
            activeClient = null; 
        } else {
            err("Database Client Error: " + e.message);
        }
    });

    await client.connect();
    await client.query("SET statement_timeout = 0");
    activeClient = client;
    return client;
}

async function robustQuery(sql, params = [], retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const client = await getClient();
            return await client.query(sql, params);
        } catch (e) {
            const isConnectionError = e.message.includes('terminated') || e.code === '57P01' || e.code === '08006';
            if (isConnectionError && attempt < retries) {
                warn(`Connection dropped. Retrying segment (${attempt}/${retries})...`);
                activeClient = null; 
                await new Promise(r => setTimeout(r, 2000 * attempt));
                continue;
            }
            throw e;
        }
    }
}

// --- STEPS ---

const stepPrepWCVP = () => {
    log("Preparing WCVP Data (Cleaning)...");
    const py = fs.existsSync('scripts/convert_wcvp.py.txt') ? 'python3 scripts/convert_wcvp.py.txt' : null;
    if (!py) throw new Error("Missing scripts/convert_wcvp.py.txt");
    execSync(py, { stdio: 'inherit' });
};

const stepPrepWFO = () => {
    log("Preparing WFO Data (Distill Backbone)...");
    const py = fs.existsSync('scripts/distill_wfo.py.txt') ? 'python3 scripts/distill_wfo.py.txt' : null;
    if (!py) throw new Error("Missing scripts/distill_wfo.py.txt");
    execSync(py, { stdio: 'inherit' });
};

const stepResetDB = async () => {
    log("Resetting Database Schema...");
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await robustQuery(sql);
};

const stepImportWCVP = async () => {
    log("Streaming WCVP Staging (1.4M rows)...");
    if (!fs.existsSync(FILE_CLEAN_CSV)) throw new Error("Run Step 1 first.");
    const client = await getClient();
    const stream = client.query(copyFrom(`COPY wcvp_import FROM STDIN WITH CSV HEADER`));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);
    await pipeline(fileStream, stream);
    log("  Import finished.");
};

const stepImportWFO = async () => {
    log("Streaming WFO Staging (Filtered backbone)...");
    if (fs.existsSync(FILE_WFO_IMPORT)) {
        const client = await getClient();
        await client.query(`
            CREATE TABLE IF NOT EXISTS wfo_import (
                taxonID text PRIMARY KEY,
                scientificNameID text,
                localID text,
                scientificName text,
                taxonRank text,
                parentNameUsageID text,
                scientificNameAuthorship text,
                family text,
                subfamily text,
                tribe text,
                subtribe text,
                genus text,
                subgenus text,
                specificEpithet text,
                infraspecificEpithet text,
                verbatimTaxonRank text,
                nomenclaturalStatus text,
                namePublishedIn text,
                taxonomicStatus text,
                acceptedNameUsageID text,
                originalNameUsageID text,
                nameAccordingToID text,
                taxonRemarks text,
                created text,
                modified text,
                "references" text,
                source text,
                majorGroup text,
                tplID text
            );
        `);
        const columns = "taxonID,scientificNameID,localID,scientificName,taxonRank,parentNameUsageID,scientificNameAuthorship,family,subfamily,tribe,subtribe,genus,subgenus,specificEpithet,infraspecificEpithet,verbatimTaxonRank,nomenclaturalStatus,namePublishedIn,taxonomicStatus,acceptedNameUsageID,originalNameUsageID,nameAccordingToID,taxonRemarks,created,modified,\"references\",source,majorGroup,tplID";
        const stream = client.query(copyFrom(`COPY wfo_import (${columns}) FROM STDIN WITH CSV HEADER`));
        const fileStream = fs.createReadStream(FILE_WFO_IMPORT);
        await pipeline(fileStream, stream);
        log("  WFO Import finished.");
    } else {
        warn("WFO import file not found. Skipping.");
    }
};

const stepPopulateApp = async () => {
    log("Populating 'app_taxa' from Staging...");
    await robustQuery(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (1, 'WCVP', '14 (2025)', 'Kew Gardens WCVP v14', 'https://powo.science.kew.org/', 5)
        ON CONFLICT (id) DO NOTHING;
    `);

    for (const seg of SEGMENTS) {
        log(`  Populating Segment: ${seg.label}...`);
        await robustQuery(`
            INSERT INTO app_taxa (
                wcvp_id, ipni_id, powo_id, accepted_plant_name_id, parent_plant_name_id, 
                basionym_plant_name_id, homotypic_synonym, taxon_name, taxon_authors, family, 
                genus, genus_hybrid, species, species_hybrid, infraspecies, infraspecific_rank, 
                taxon_rank, taxon_status, hybrid_formula, parenthetical_author, primary_author, 
                publication_author, replaced_synonym_author, place_of_publication, volume_and_page, 
                first_published, nomenclatural_remarks, reviewed, geographic_area, lifeform_description, 
                climate_description, source_id
            )
            SELECT 
                plant_name_id, ipni_id, powo_id, accepted_plant_name_id, parent_plant_name_id, 
                basionym_plant_name_id, homotypic_synonym, taxon_name, taxon_authors, family, 
                genus, genus_hybrid, species, species_hybrid, infraspecies, infraspecific_rank, 
                COALESCE(taxon_rank, 'Unranked'), taxon_status, hybrid_formula, parenthetical_author, primary_author, 
                publication_author, replaced_synonym_author, place_of_publication, volume_and_page, 
                first_published, nomenclatural_remarks, reviewed, geographic_area, lifeform_description, 
                climate_description, 1
            FROM wcvp_import
            WHERE taxon_name >= $1 AND taxon_name < $2
            ON CONFLICT DO NOTHING;
        `, [seg.start, seg.end]);
    }
};

const stepBuildIndexes = async () => {
    log("Building Structural Indexes...");
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_temp_wcvp ON app_taxa(wcvp_id)`);
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_temp_parent_attr ON app_taxa(parent_plant_name_id)`);
};

const stepLinkParents = async () => {
    log("Linking Parents (Adjacency)...");
    for (const seg of SEGMENTS) {
        log(`  Linking Segment: ${seg.label}...`);
        await robustQuery(`
            UPDATE app_taxa child
            SET parent_id = parent.id
            FROM app_taxa parent
            WHERE child.parent_plant_name_id = parent.wcvp_id
              AND child.parent_id IS NULL
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
};

const stepWFOOrders = async () => {
    log("Building Higher Ranks Backbone (Kingdom, Phylum, Class, Order)...");
    await robustQuery(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (3, 'World Flora Online', '2025.12', 'WFO (2025): World Flora Online. Version 2025.12. Published on the Internet; http://www.worldfloraonline.org. Accessed on: 2026-01-09', 'http://www.worldfloraonline.org', 5)
        ON CONFLICT (id) DO NOTHING;
    `);
    
    const RANKS = ['Kingdom', 'Phylum', 'Class', 'Order'];
    
    for (const rank of RANKS) {
        log(`  Creating physical ${rank} records...`);
        await robustQuery(`
            INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, "${rank.toLowerCase()}", source_id, verification_level)
            SELECT scientificName, '${rank}', taxonomicStatus, scientificName, 3, 'WFO Backbone Distill v2.32.0'
            FROM wfo_import
            WHERE LOWER(taxonRank) = '${rank.toLowerCase()}'
            ON CONFLICT DO NOTHING;
        `);
    }

    log("  Linking Backbone hierarchy...");
    // 1. Kingdom -> Phylum
    await robustQuery(`
        UPDATE app_taxa child
        SET parent_id = parent.id,
            kingdom = parent.taxon_name
        FROM wfo_import wfo_child
        JOIN wfo_import wfo_parent ON wfo_child.parentNameUsageID = wfo_parent.taxonID
        JOIN app_taxa parent ON parent.taxon_name = wfo_parent.scientificName AND parent.taxon_rank = 'Kingdom'
        WHERE child.taxon_name = wfo_child.scientificName AND child.taxon_rank = 'Phylum'
          AND child.parent_id IS NULL;
    `);

    // 2. Phylum -> Class
    await robustQuery(`
        UPDATE app_taxa child
        SET parent_id = parent.id,
            phylum = parent.taxon_name,
            kingdom = parent.kingdom
        FROM wfo_import wfo_child
        JOIN wfo_import wfo_parent ON wfo_child.parentNameUsageID = wfo_parent.taxonID
        JOIN app_taxa parent ON parent.taxon_name = wfo_parent.scientificName AND parent.taxon_rank = 'Phylum'
        WHERE child.taxon_name = wfo_child.scientificName AND child.taxon_rank = 'Class'
          AND child.parent_id IS NULL;
    `);

    // 3. Class -> Order
    await robustQuery(`
        UPDATE app_taxa child
        SET parent_id = parent.id,
            class = parent.taxon_name,
            phylum = parent.phylum,
            kingdom = parent.kingdom
        FROM wfo_import wfo_child
        JOIN wfo_import wfo_parent ON wfo_child.parentNameUsageID = wfo_parent.taxonID
        JOIN app_taxa parent ON parent.taxon_name = wfo_parent.scientificName AND parent.taxon_rank = 'Class'
        WHERE child.taxon_name = wfo_child.scientificName AND child.taxon_rank = 'Order'
          AND child.parent_id IS NULL;
    `);

    // Ensure Backbone Families (Source 2)
    log("  Ensuring Backbone Families linked to Orders...");
    await robustQuery(`
        INSERT INTO app_data_sources (id, name, version, citation_text, trust_level)
        VALUES (2, 'FloraCatalog System', 'v2.32.0 (Derived)', 'Internal system layer deriving backbone from attributes.', 5)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, family, source_id, verification_level)
        SELECT DISTINCT family, 'Family', 'Derived', family, 2, 'FloraCatalog v2.32.0'
        FROM app_taxa
        WHERE family IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM app_taxa a WHERE a.family = app_taxa.family AND a.taxon_rank = 'Family')
        ON CONFLICT DO NOTHING;
    `);

    // Link Families to Orders
    await robustQuery(`
        UPDATE app_taxa app_fam
        SET parent_id = app_order.id,
            "order" = app_order.taxon_name,
            class = app_order.class,
            phylum = app_order.phylum,
            kingdom = app_order.kingdom
        FROM wfo_import wfo_fam
        JOIN wfo_import wfo_order ON wfo_fam.parentNameUsageID = wfo_order.taxonID
        JOIN app_taxa app_order ON app_order.taxon_name = wfo_order.scientificName AND app_order.taxon_rank = 'Order'
        WHERE app_fam.taxon_name = wfo_fam.family AND app_fam.taxon_rank = 'Family'
          AND app_fam.parent_id IS NULL;
    `);
};

const stepDerivedFamilies = async () => {
    log("Grafting orphaned WCVP roots to Family records & Catch-all Higher Rank Sync...");
    
    // Pass 1: Direct Grafting
    log("  Pass 1: Direct Family Grafting...");
    for (const seg of SEGMENTS) {
        await robustQuery(`
            UPDATE app_taxa child
            SET parent_id = parent.id,
                "order" = parent."order",
                class = parent.class,
                phylum = parent.phylum,
                kingdom = parent.kingdom
            FROM app_taxa parent
            WHERE child.parent_id IS NULL
              AND child.family = parent.family
              AND parent.taxon_rank = 'Family'
              AND child.id != parent.id
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }

    // Pass 2: Recursive Higher Rank Propagation
    log("  Pass 2: Recursive Rank Propagation (3 passes)...");
    for (let p = 1; p <= 3; p++) {
        log(`    - Pass ${p}/3...`);
        for (const seg of SEGMENTS) {
            await robustQuery(`
                UPDATE app_taxa child
                SET "order" = COALESCE(child."order", parent."order"),
                    class = COALESCE(child.class, parent.class),
                    phylum = COALESCE(child.phylum, parent.phylum),
                    kingdom = COALESCE(child.kingdom, parent.kingdom)
                FROM app_taxa parent
                WHERE child.parent_id = parent.id 
                  AND (child.kingdom IS NULL AND parent.kingdom IS NOT NULL)
                  AND child.taxon_name >= $1 AND child.taxon_name < $2;
            `, [seg.start, seg.end]);
        }
    }
};

const stepHierarchy = async () => {
    log("Building Ltree Hierarchy (Iterative & Robust)...");
    await robustQuery(`ANALYZE app_taxa`);

    const pathCheck = await robustQuery(`SELECT count(hierarchy_path) as cnt FROM app_taxa WHERE hierarchy_path IS NOT NULL`);
    const pathsExist = parseInt(pathCheck.rows[0].cnt) > 0;

    if (pathsExist) {
        warn("Existing hierarchy paths detected.");
        const choice = await askQuestion("Would you like to (R)esume/Finish current build or (S)tart over from zero? (R/S): ");
        if (choice.toLowerCase() === 's') {
            log("  Resetting hierarchy paths (Segmented)...");
            for (const seg of SEGMENTS) {
                process.stdout.write(`    Resetting ${seg.label}... \r`);
                await robustQuery(`UPDATE app_taxa SET hierarchy_path = NULL WHERE taxon_name >= $1 AND taxon_name < $2`, [seg.start, seg.end]);
            }
            console.log("\n    Reset complete.");
        } else {
            log("  Resuming build. Existing paths will be preserved.");
        }
    }

    // Level 1: Roots
    log("  Processing Level 1: Roots...");
    const rootRes = await robustQuery(`
        UPDATE app_taxa 
        SET hierarchy_path = text2ltree('root') || text2ltree(replace(id::text, '-', '_'))
        WHERE parent_id IS NULL AND hierarchy_path IS NULL
    `);
    log(`    Updated ${rootRes.rowCount} new roots.`);

    let level = 2;
    while (true) {
        log(`  Processing Level ${level}...`);
        let totalUpdated = 0;
        
        for (const seg of SEGMENTS) {
            const res = await robustQuery(`
                UPDATE app_taxa c
                SET hierarchy_path = p.hierarchy_path || text2ltree(replace(c.id::text, '-', '_'))
                FROM app_taxa p
                WHERE c.parent_id = p.id
                  AND p.hierarchy_path IS NOT NULL
                  AND c.hierarchy_path IS NULL
                  AND c.taxon_name >= $1 AND c.taxon_name < $2
            `, [seg.start, seg.end]);
            totalUpdated += res.rowCount;
            if (res.rowCount > 0) {
                process.stdout.write(`    - Segment ${seg.label}: ${res.rowCount} updated\r`);
            }
        }
        
        console.log(`\n    Level ${level} complete. Total: ${totalUpdated} records.`);
        if (totalUpdated === 0) {
            const orphans = await robustQuery(`SELECT count(*) as cnt FROM app_taxa WHERE hierarchy_path IS NULL`);
            if (parseInt(orphans.rows[0].cnt) > 0) {
                warn(`${orphans.rows[0].cnt} records still missing paths. Check linkage.`);
            }
            break;
        }
        level++;
    }

    log("  Grafting temporary false roots...");
    await robustQuery(`
        UPDATE app_taxa c
        SET hierarchy_path = p.hierarchy_path || text2ltree(replace(c.id::text, '-', '_'))
        FROM app_taxa p
        WHERE c.parent_id = p.id
          AND p.hierarchy_path IS NOT NULL
          AND c.hierarchy_path = (text2ltree('root') || text2ltree(replace(c.id::text, '-', '_')));
    `);
};

const stepCounts = async () => {
    log("Calculating Direct Descendant Counts (Segmented Aggregation)...");
    log("  Resetting current counts (Segmented)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Resetting ${seg.label}... \r`);
        await robustQuery(`UPDATE app_taxa SET descendant_count = 0 WHERE taxon_name >= $1 AND taxon_name < $2`, [seg.start, seg.end]);
    }
    
    log("\n  Calculating immediate children (Segmented pass)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Updating ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa p
            SET descendant_count = sub.cnt
            FROM (
                SELECT parent_id as id, count(*) as cnt
                FROM app_taxa
                WHERE parent_id IS NOT NULL
                  AND parent_id IN (SELECT id FROM app_taxa WHERE taxon_name >= $1 AND taxon_name < $2)
                GROUP BY parent_id
            ) sub
            WHERE p.id = sub.id
        `, [seg.start, seg.end]);
    }
    log("\n  Count update finished.");
};

const stepOptimize = async () => {
    log("Applying V8.1 Index Optimizations...");
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await robustQuery(sql);
};

// --- ORCHESTRATOR ---

const STEPS = [
    { id: 1, label: "Prepare WCVP", fn: stepPrepWCVP },
    { id: 2, label: "Prepare WFO", fn: stepPrepWFO },
    { id: 3, label: "Reset Database", fn: stepResetDB },
    { id: 4, label: "Import WCVP", fn: stepImportWCVP },
    { id: 5, label: "Import WFO", fn: stepImportWFO },
    { id: 6, label: "Populate App", fn: stepPopulateApp },
    { id: 7, label: "Build Indexes", fn: stepBuildIndexes },
    { id: 8, label: "Link Parents", fn: stepLinkParents },
    { id: 9, label: "WFO Higher Ranks", fn: stepWFOOrders },
    { id: 10, label: "Derived Backbone", fn: stepDerivedFamilies },
    { id: 11, label: "Hierarchy", fn: stepHierarchy },
    { id: 12, label: "Counts", fn: stepCounts },
    { id: 13, label: "Optimize", fn: stepOptimize }
];

async function main() {
    console.log(`\n\x1b[32m🌿 FLORA CATALOG BUILDER ${APP_VERSION}\x1b[0m`);
    console.log("------------------------------------------");
    STEPS.forEach(s => console.log(`${s.id}. ${s.label}`));
    console.log("------------------------------------------");
    
    const choice = await askQuestion("Select step to start (or comma-list for specific steps): ");
    ensureDirs();

    let sequence = [];
    if (choice.includes(',')) {
        sequence = choice.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    } else {
        const startId = parseInt(choice);
        sequence = STEPS.filter(s => s.id >= startId).map(s => s.id);
    }

    if (sequence.length === 0) { err("No steps selected."); process.exit(1); }

    try {
        for (const id of sequence) {
            const step = STEPS.find(s => s.id === id);
            log(`\x1b[35m[STEP ${id}]\x1b[0m Executing: ${step.label}...`);
            await step.fn();
        }

        log("\x1b[32mBuild Complete!\x1b[0m");
    } catch (e) {
        err(`Process failed at step.`);
        console.error(e);
    } finally {
        if (activeClient) await activeClient.end();
    }
}

main();
