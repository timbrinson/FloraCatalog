/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.33.0
 * 
 * Orchestrates the transformation of raw WCVP and WFO data into the FloraCatalog database.
 * v2.33.0: High-Fidelity WFO Backbone (Rank Collapsing + Literal Propagation).
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
const APP_VERSION = 'v2.33.0';

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

const stepWFOBackbone = async () => {
    log("Building WFO Backbone (Kingdom -> Family)...");
    
    // Targeted cleanup of Source 2 (Derived) AND Source 3 (Legacy WFO)
    // HUMAN NOTE: The deletion of Source 3 should be removed once manual entries are added.
    await robustQuery(`DELETE FROM app_taxa WHERE source_id IN (2, 3)`);

    await robustQuery(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (2, 'World Flora Online', '2025.12', 'WFO (2025): World Flora Online. Version 2025.12. Published on the Internet; http://www.worldfloraonline.org. Accessed on: 2026-01-09', 'http://www.worldfloraonline.org', 5)
        ON CONFLICT (id) DO UPDATE SET citation_text = EXCLUDED.citation_text;
    `);

    const TARGET_RANKS = ['Kingdom', 'Phylum', 'Class', 'Order', 'Family'];

    for (const rank of TARGET_RANKS) {
        log(`  Processing physical ${rank} records...`);
        // Priority De-duplication: Accepted > Synonym > Unchecked
        await robustQuery(`
            INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, "${rank.toLowerCase()}", source_id, verification_level)
            SELECT DISTINCT ON (scientificName) 
                scientificName, 
                INITCAP(LOWER(taxonRank)), 
                INITCAP(LOWER(taxonomicStatus)), 
                scientificName, 
                2, 
                'WFO Backbone v2.33.0'
            FROM wfo_import
            WHERE LOWER(taxonRank) = LOWER($1)
            ORDER BY scientificName, 
                CASE 
                    WHEN taxonomicStatus = 'ACCEPTED' THEN 1 
                    WHEN taxonomicStatus = 'SYNONYM' THEN 2 
                    ELSE 3 
                END
            ON CONFLICT DO NOTHING;
        `, [rank]);
    }

    log("  Resolving collapsed parentage (WFO Inter-linking)...");
    // Recursive query approach to find the nearest physical parent in our target backbone set
    await robustQuery(`
        WITH RECURSIVE backbone_tree AS (
            -- Seed with all WFO records in staging
            SELECT taxonID, parentNameUsageID, scientificName, taxonRank 
            FROM wfo_import
            
            UNION ALL
            
            -- Walk up until we hit a rank we track in app_taxa
            SELECT bt.taxonID, w.parentNameUsageID, w.scientificName, w.taxonRank
            FROM backbone_tree bt
            JOIN wfo_import w ON bt.parentNameUsageID = w.taxonID
            WHERE LOWER(bt.taxonRank) NOT IN ('kingdom', 'phylum', 'class', 'order', 'family')
        )
        UPDATE app_taxa child
        SET parent_id = parent.id
        FROM backbone_tree bt_child
        JOIN backbone_tree bt_parent ON bt_child.parentNameUsageID = bt_parent.taxonID
        JOIN app_taxa parent ON parent.taxon_name = bt_parent.scientificName AND parent.source_id = 2
        WHERE child.taxon_name = bt_child.scientificName AND child.source_id = 2
          AND LOWER(bt_parent.taxonRank) IN ('kingdom', 'phylum', 'class', 'order', 'family')
          AND child.parent_id IS NULL;
    `);

    log("  Executing Internal Backbone Propagation (Source 2 Completion)...");
    for (let p = 1; p <= 4; p++) {
        process.stdout.write(`    Pass ${p}/4... \r`);
        await robustQuery(`
            UPDATE app_taxa child
            SET kingdom = COALESCE(child.kingdom, parent.kingdom),
                phylum = COALESCE(child.phylum, parent.phylum),
                class = COALESCE(child.class, parent.class),
                "order" = COALESCE(child."order", parent."order")
            FROM app_taxa parent
            WHERE child.parent_id = parent.id 
              AND child.source_id = 2 AND parent.source_id = 2;
        `);
    }
    console.log("\n  Internal propagation complete.");
};

const stepBackboneBridge = async () => {
    log("Bridging Natural Taxa (Source 1/3) to Phylogenetic Backbone (Source 2)...");

    // 1. Bridge via Family Literal
    log("  Step 1: Bridging children to backbone Families...");
    await robustQuery(`
        UPDATE app_taxa child
        SET parent_id = parent.id
        FROM app_taxa parent
        WHERE child.parent_id IS NULL
          AND child.family = parent.taxon_name
          AND parent.taxon_rank = 'Family'
          AND parent.source_id = 2
          AND child.id != parent.id;
    `);

    // 2. Dereference Parent Synonyms
    log("  Step 2: Resolving parent synonym redirects...");
    await robustQuery(`
        UPDATE app_taxa child
        SET parent_id = accepted_parent.id
        FROM app_taxa current_parent
        JOIN wfo_import w_syn ON current_parent.taxon_name = w_syn.scientificName 
          AND current_parent.taxon_rank = 'Family'
          AND w_syn.taxonomicStatus = 'SYNONYM'
        JOIN wfo_import w_acc ON w_syn.acceptedNameUsageID = w_acc.taxonID
        JOIN app_taxa accepted_parent ON w_acc.scientificName = accepted_parent.taxon_name 
          AND accepted_parent.taxon_rank = 'Family'
        WHERE child.parent_id = current_parent.id;
    `);

    // 3. Mass Literal Propagation (Single Pass flow from anchored Families)
    log("  Step 3: Mass literal propagation from anchored Families...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Propagating: ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa child
            SET kingdom = parent.kingdom,
                phylum = parent.phylum,
                class = parent.class,
                "order" = parent."order"
            FROM app_taxa parent
            WHERE child.parent_id = parent.id
              AND parent.taxon_rank = 'Family'
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }

    log("\n  Step 4: Deep propagation (recursive catch-all)...");
    for (let p = 1; p <= 3; p++) {
        log(`    - Recursive Pass ${p}/3...`);
        for (const seg of SEGMENTS) {
            await robustQuery(`
                UPDATE app_taxa child
                SET kingdom = COALESCE(child.kingdom, parent.kingdom),
                    phylum = COALESCE(child.phylum, parent.phylum),
                    class = COALESCE(child.class, parent.class),
                    "order" = COALESCE(child."order", parent."order")
                FROM app_taxa parent
                WHERE child.parent_id = parent.id 
                  AND child.kingdom IS NULL AND parent.kingdom IS NOT NULL
                  AND child.taxon_name >= $1 AND child.taxon_name < $2;
            `, [seg.start, seg.end]);
        }
    }
    console.log("\n  Bridge and propagation complete.");
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

    // Level 1: Roots (Kingdoms)
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
        if (totalUpdated === 0) break;
        level++;
    }
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
    { id: 9, label: "WFO Higher Ranks", fn: stepWFOBackbone },
    { id: 10, label: "Backbone Bridge", fn: stepBackboneBridge },
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
