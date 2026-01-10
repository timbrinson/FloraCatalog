/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.31.9
 * 
 * Orchestrates the transformation of raw WCVP and WFO data into the FloraCatalog database.
 * v2.31.9: Self-healing WFO staging; SQL-driven phylogenetic mapping.
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
const APP_VERSION = 'v2.31.9';

const SEGMENTS = [
    { label: "A", start: "A", end: "B" },
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
    { label: "W - Z", start: "W", end: "{" }
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

async function getClient() {
    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        log("Connection details not found in .env.");
        const projId = await askQuestion(`Project ID (Default: ${DEFAULT_PROJECT_ID}): `) || DEFAULT_PROJECT_ID;
        const password = await askQuestion("Database Password: ");
        if (!password) { err("Password required."); process.exit(1); }
        connectionString = `postgresql://postgres.${projId}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`;
    }

    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    // Disable timeout for massive operations
    await client.query("SET statement_timeout = 0");
    return client;
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

const stepResetDB = async (client) => {
    log("Resetting Database Schema...");
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await client.query(sql);
};

const stepImportWCVP = async (client) => {
    log("Streaming WCVP Staging (1.4M rows)...");
    if (!fs.existsSync(FILE_CLEAN_CSV)) throw new Error("Run Step 1 first.");
    const stream = client.query(copyFrom(`COPY wcvp_import FROM STDIN WITH CSV HEADER`));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);
    await pipeline(fileStream, stream);
    log("  Import finished.");
};

const stepImportWFO = async (client) => {
    log("Streaming WFO Staging (Filtered backbone)...");
    
    if (fs.existsSync(FILE_WFO_IMPORT)) {
        // Self-healing: Ensure table exists if user skipped Step 3 (v2.31.9)
        // Updated to full 29-column schema (v2.31.10)
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

        const stream = client.query(copyFrom(`COPY wfo_import FROM STDIN WITH CSV HEADER`));
        const fileStream = fs.createReadStream(FILE_WFO_IMPORT);
        await pipeline(fileStream, stream);
        log("  WFO Import finished.");
    } else {
        warn("WFO import file not found. Skipping.");
    }
};

const stepPopulateApp = async (client) => {
    log("Populating 'app_taxa' from Staging...");
    
    // Ensure Sources
    await client.query(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (1, 'WCVP', '14 (2025)', 'Kew Gardens WCVP v14', 'https://powo.science.kew.org/', 5)
        ON CONFLICT (id) DO NOTHING;
    `);

    for (const seg of SEGMENTS) {
        log(`  Populating Segment: ${seg.label}...`);
        await client.query(`
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

const stepBuildIndexes = async (client) => {
    log("Building Structural Indexes...");
    await client.query(`CREATE INDEX IF NOT EXISTS idx_temp_wcvp ON app_taxa(wcvp_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_temp_parent_attr ON app_taxa(parent_plant_name_id)`);
};

const stepLinkParents = async (client) => {
    log("Linking Parents (Adjacency)...");
    for (const seg of SEGMENTS) {
        log(`  Linking Segment: ${seg.label}...`);
        await client.query(`
            UPDATE app_taxa child
            SET parent_id = parent.id
            FROM app_taxa parent
            WHERE child.parent_plant_name_id = parent.wcvp_id
              AND child.parent_id IS NULL
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
};

const stepWFOOrders = async (client) => {
    log("Creating WFO Orders & Linking Families (SQL Logic)...");
    
    await client.query(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (3, 'World Flora Online', '2025.12', 'WFO (2025): World Flora Online. Version 2025.12. Published on the Internet; http://www.worldfloraonline.org. Accessed on: 2026-01-09', 'http://www.worldfloraonline.org', 5)
        ON CONFLICT (id) DO NOTHING;
    `);

    // 1. Create Physical Orders (All of them from staging)
    await client.query(`
        INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, source_id, verification_level)
        SELECT scientificName, 'Order', taxonomicStatus, 3, 'WFO Backbone Distill'
        FROM wfo_import
        WHERE LOWER(taxonRank) = 'order'
        ON CONFLICT DO NOTHING;
    `);

    // 2. Ensure Families exist (Source 2)
    await client.query(`
        INSERT INTO app_data_sources (id, name, version, citation_text, trust_level)
        VALUES (2, 'FloraCatalog System', 'v2.31.9 (Derived)', 'Internal system layer deriving backbone from attributes.', 5)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, family, source_id, verification_level)
        SELECT DISTINCT family, 'Family', 'Derived', family, 2, 'FloraCatalog v2.31.9'
        FROM app_taxa
        WHERE family IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM app_taxa a WHERE a.family = app_taxa.family AND a.taxon_rank = 'Family')
        ON CONFLICT DO NOTHING;
    `);

    // 3. Link Families to Orders via SQL self-join on wfo_import
    await client.query(`
        UPDATE app_taxa app_fam
        SET parent_id = app_order.id
        FROM wfo_import wfo_fam
        JOIN wfo_import wfo_order ON wfo_fam.parentNameUsageID = wfo_order.taxonID
        JOIN app_taxa app_order ON app_order.taxon_name = wfo_order.scientificName AND app_order.taxon_rank = 'Order'
        WHERE app_fam.taxon_name = wfo_fam.family AND app_fam.taxon_rank = 'Family'
          AND app_fam.parent_id IS NULL;
    `);
};

const stepDerivedFamilies = async (client) => {
    log("Grafting orphaned WCVP roots to Family records...");
    for (const seg of SEGMENTS) {
        await client.query(`
            UPDATE app_taxa child
            SET parent_id = parent.id
            FROM app_taxa parent
            WHERE child.parent_id IS NULL
              AND child.family = parent.family
              AND parent.taxon_rank = 'Family'
              AND child.id != parent.id
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
};

const stepHierarchy = async (client) => {
    log("Building Ltree Hierarchy (Iterative)...");
    
    // Clear paths
    await client.query(`UPDATE app_taxa SET hierarchy_path = NULL`);

    // Level 1: Roots
    log("  Processing Level 1: Roots...");
    const rootRes = await client.query(`
        UPDATE app_taxa 
        SET hierarchy_path = text2ltree('root') || text2ltree(replace(id::text, '-', '_'))
        WHERE parent_id IS NULL
    `);
    log(`    Found ${rootRes.rowCount} roots.`);

    let level = 2;
    while (true) {
        log(`  Processing Level ${level}...`);
        let totalUpdated = 0;
        
        // Split by segment to prevent timeouts on the join
        for (const seg of SEGMENTS) {
            const res = await client.query(`
                UPDATE app_taxa c
                SET hierarchy_path = p.hierarchy_path || text2ltree(replace(c.id::text, '-', '_'))
                FROM app_taxa p
                WHERE c.parent_id = p.id
                  AND p.hierarchy_path IS NOT NULL
                  AND c.hierarchy_path IS NULL
                  AND c.taxon_name >= $1 AND c.taxon_name < $2
            `, [seg.start, seg.end]);
            totalUpdated += res.rowCount;
        }
        
        log(`    Processed ${totalUpdated} records.`);
        if (totalUpdated === 0) break;
        level++;
    }

    // False Root Recovery (Protcol v2.31.5)
    log("  Grafting temporary false roots...");
    await client.query(`
        UPDATE app_taxa c
        SET hierarchy_path = p.hierarchy_path || text2ltree(replace(c.id::text, '-', '_'))
        FROM app_taxa p
        WHERE c.parent_id = p.id
          AND p.hierarchy_path IS NOT NULL
          AND c.hierarchy_path = (text2ltree('root') || text2ltree(replace(c.id::text, '-', '_')));
    `);
};

const stepCounts = async (client) => {
    log("Calculating Descendant Counts...");
    for (const seg of SEGMENTS) {
        log(`  Updating Counts for Segment: ${seg.label}...`);
        await client.query(`
            WITH counts AS (
                SELECT parent_id, COUNT(*) as cnt
                FROM app_taxa
                WHERE parent_id IS NOT NULL
                GROUP BY parent_id
            )
            UPDATE app_taxa
            SET descendant_count = counts.cnt
            FROM counts
            WHERE app_taxa.id = counts.parent_id
              AND app_taxa.taxon_name >= $1 AND app_taxa.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
};

const stepOptimize = async (client) => {
    log("Applying V8.1 Index Optimizations...");
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await client.query(sql);
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
    { id: 9, label: "WFO Orders", fn: stepWFOOrders },
    { id: 10, label: "Derived Families", fn: stepDerivedFamilies },
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

    let client = null;
    try {
        // Only need client for DB steps
        const dbStepIds = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        if (sequence.some(id => dbStepIds.includes(id))) {
            client = await getClient();
        }

        for (const id of sequence) {
            const step = STEPS.find(s => s.id === id);
            log(`\x1b[35m[STEP ${id}]\x1b[0m Executing: ${step.label}...`);
            await step.fn(client);
        }

        log("\x1b[32mBuild Complete!\x1b[0m");
    } catch (e) {
        err(`Process failed at step.`);
        console.error(e);
    } finally {
        if (client) await client.end();
    }
}

main();
