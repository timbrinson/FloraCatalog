/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.33.14
 * 
 * Orchestrates the transformation of raw WCVP and WFO data into the FloraCatalog database.
 * v2.33.14: Build Accelerator Lifecycle (Step 7/15).
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
const APP_VERSION = 'v2.33.14';

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

let activeClient = null;

async function getClient() {
    if (activeClient) {
        try { await activeClient.query('SELECT 1'); return activeClient; } 
        catch (e) { activeClient = null; }
    }

    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        log("Connection details missing.");
        const projId = await askQuestion(`Project ID: `) || DEFAULT_PROJECT_ID;
        const password = await askQuestion("Password: ");
        connectionString = `postgresql://postgres.${projId}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`;
    }

    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    client.on('error', (e) => { if (e.message.includes('terminated')) activeClient = null; });
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
            if (attempt < retries) {
                warn(`Retry ${attempt}/3...`);
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
    log("Cleaning WCVP data...");
    execSync('python3 scripts/convert_wcvp.py.txt', { stdio: 'inherit' });
};

const stepPrepWFO = () => {
    log("Distilling WFO backbone...");
    execSync('python3 scripts/distill_wfo.py.txt', { stdio: 'inherit' });
};

const stepResetDB = async () => {
    log("Resetting database schema...");
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await robustQuery(sql);
};

const stepImportWCVP = async () => {
    log("Streaming WCVP staging...");
    const client = await getClient();
    await client.query(`TRUNCATE TABLE wcvp_import`);
    const stream = client.query(copyFrom(`COPY wcvp_import FROM STDIN WITH CSV HEADER`));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);
    await pipeline(fileStream, stream);
    log("  WCVP staging complete.");
};

const stepImportWFO = async () => {
    log("Streaming WFO staging...");
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

    log("  Truncating wfo_import for fresh load...");
    await client.query(`TRUNCATE TABLE wfo_import`);

    const stream = client.query(copyFrom(`COPY wfo_import FROM STDIN WITH CSV HEADER`));
    const fileStream = fs.createReadStream(FILE_WFO_IMPORT);
    await pipeline(fileStream, stream);
    
    log("  Indexing WFO for performance...");
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wfo_import_parent ON wfo_import(parentNameUsageID)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wfo_import_rank ON wfo_import(taxonRank)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wfo_import_name ON wfo_import(scientificName)`);
    log("  WFO staging complete.");
};

const stepPopulateApp = async () => {
    log("Moving staging to core...");
    await robustQuery(`INSERT INTO app_data_sources (id, name, version, trust_level) VALUES (1, 'WCVP', '14 (2025)', 5) ON CONFLICT DO NOTHING`);
    for (const seg of SEGMENTS) {
        log(`  Processing: ${seg.label}...`);
        await robustQuery(`
            INSERT INTO app_taxa (wcvp_id, taxon_name, taxon_rank, taxon_status, family, genus, species, infraspecies, source_id)
            SELECT plant_name_id, taxon_name, COALESCE(taxon_rank, 'Unranked'), taxon_status, family, genus, species, infraspecies, 1
            FROM wcvp_import WHERE taxon_name >= $1 AND taxon_name < $2
            ON CONFLICT DO NOTHING;
        `, [seg.start, seg.end]);
    }
};

const stepBuildIndexes = async () => {
    log("Building core indexes...");
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_temp_wcvp ON app_taxa(wcvp_id)`);
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_temp_parent_attr ON app_taxa(parent_plant_name_id)`);
    
    // V2.33.14: Build Accelerator Index (Temporary)
    // Ensures Step 12 literal flow can find 1.4M parent records instantly.
    // Updated: Now indexes 'family' literal column for Literal Consistency rule.
    log("  Creating bridge accelerator...");
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_bridge_family_lookup ON app_taxa (family COLLATE "C") WHERE taxon_rank = 'Family' AND source_id = 2`);
};

const stepLinkParents = async () => {
    log("Linking parents...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Segment ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa child SET parent_id = parent.id
            FROM app_taxa parent WHERE child.parent_plant_name_id = parent.wcvp_id
            AND child.parent_id IS NULL AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
    console.log("\n  Linking complete.");
};

const stepWFOBackbone = async () => {
    log("Starting Phase 9: WFO Phylogenetic Backbone Reconstruction...");
    const client = await getClient();

    log("  Step 1: Mitigating deadlocks (Identifying zombie sessions)...");
    const zombies = await client.query(`
        SELECT pid FROM pg_stat_activity 
        WHERE query ILIKE '%app_taxa%' 
          AND state != 'idle' 
          AND pid != pg_backend_pid();
    `);
    if (zombies.rowCount > 0) {
        warn(`    Found ${zombies.rowCount} active sessions. Attempting to clear...`);
        for (const z of zombies.rows) {
            await client.query(`SELECT pg_terminate_backend($1)`, [z.pid]);
        }
    }

    log("  Step 2: Resetting Source ID 2 (WFO backbone slate)...");
    log("    Un-grafting existing bridges to backbone...");
    await client.query(`
        UPDATE app_taxa SET parent_id = NULL 
        WHERE parent_id IN (SELECT id FROM app_taxa WHERE source_id = 2)
    `);

    const resetRes = await client.query(`DELETE FROM app_taxa WHERE source_id = 2`);
    log(`    Cleared ${resetRes.rowCount} stale backbone records.`);

    log("  Step 3: Synchronizing Authoritative Source ID 2 (WFO Metadata)...");
    await client.query(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (2, 'World Flora Online', '2025.12', 'WFO (2025): World Flora Online. Version 2025.12. Published on the Internet; http://www.worldfloraonline.org. Accessed on: 2026-01-12', 'http://www.worldfloraonline.org', 5)
        ON CONFLICT (id) DO UPDATE SET 
            name = EXCLUDED.name,
            version = EXCLUDED.version,
            citation_text = EXCLUDED.citation_text,
            url = EXCLUDED.url,
            trust_level = EXCLUDED.trust_level,
            last_accessed_at = NOW();
    `);

    const TARGET_RANKS = ['Kingdom', 'Phylum', 'Class', 'Order', 'Family'];
    for (const rank of TARGET_RANKS) {
        log(`  Step 4: Physical Creation [${rank}]...`);
        const insRes = await client.query(`
            INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, "${rank.toLowerCase()}", source_id, verification_level)
            SELECT DISTINCT ON (scientificName) 
                scientificName, 
                INITCAP(LOWER(taxonRank)), 
                INITCAP(LOWER(taxonomicStatus)), 
                scientificName, 
                2, 
                'WFO Backbone v2.33.14'
            FROM wfo_import 
            WHERE LOWER(taxonRank) = LOWER($1)
            ORDER BY scientificName, CASE WHEN taxonomicStatus = 'ACCEPTED' THEN 1 WHEN taxonomicStatus = 'SYNONYM' THEN 2 ELSE 3 END
            ON CONFLICT DO NOTHING;
        `, [rank]);
        log(`    Created ${insRes.rowCount} physical ${rank} records.`);
    }

    log("  Step 5: Resolving Backbone Hierarchy (Authority-Seeking Recursion)...");
    await client.query(`
        WITH RECURSIVE backbone_tree AS (
            SELECT t.id as physical_id, w.parentNameUsageID, w.taxonRank
            FROM app_taxa t
            JOIN wfo_import w ON t.taxon_name = w.scientificName AND t.source_id = 2
            UNION ALL
            SELECT bt.physical_id, w.parentNameUsageID, w.taxonRank
            FROM backbone_tree bt
            JOIN wfo_import w ON bt.parentNameUsageID = w.taxonID
            WHERE NOT EXISTS (
                SELECT 1 FROM app_taxa p 
                WHERE p.taxon_name = w.scientificName AND p.source_id = 2
            )
        )
        UPDATE app_taxa child SET parent_id = parent.id
        FROM backbone_tree bt
        JOIN wfo_import w_parent ON bt.parentNameUsageID = w_parent.taxonID
        JOIN app_taxa parent ON parent.taxon_name = w_parent.scientificName AND parent.source_id = 2
        WHERE child.id = bt.physical_id AND child.parent_id IS NULL AND child.id != parent.id;
    `);

    log("  Step 6: Internal Backbone Completion (Literal Propagation)...");
    for (let p = 1; p <= 5; p++) {
        process.stdout.write(`    Pass ${p}/5... \r`);
        await client.query(`
            UPDATE app_taxa child
            SET kingdom = COALESCE(child.kingdom, parent.kingdom),
                phylum = COALESCE(child.phylum, parent.phylum),
                class = COALESCE(child.class, parent.class),
                "order" = COALESCE(child."order", parent."order"),
                family = COALESCE(child.family, parent.family)
            FROM app_taxa parent
            WHERE child.parent_id = parent.id AND child.source_id = 2 AND parent.source_id = 2;
        `);
    }
    console.log("\n  Phase 9 Complete.");
};

const stepBridgeGrafting = async () => {
    log("Starting Phase 10: Phylogenetic Bridge (Family Grafting)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Grafting Segment ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa child SET parent_id = parent.id
            FROM app_taxa parent 
            WHERE child.parent_id IS NULL 
              AND child.family = parent.family
              AND parent.taxon_rank = 'Family' 
              AND parent.source_id = 2 
              AND child.id != parent.id
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
    console.log("\n    Grafting complete.");
};

const stepBridgeSynonyms = async () => {
    log("Starting Phase 11: Synonym Redirects (Dereferencing Family Synonyms)...");
    const synRes = await robustQuery(`
        UPDATE app_taxa child 
        SET parent_id = accepted_parent.id,
            family = accepted_parent.family
        FROM app_taxa current_parent
        JOIN wfo_import w_syn ON LOWER(current_parent.family) = LOWER(w_syn.scientificName) 
          AND current_parent.taxon_rank = 'Family' 
          AND current_parent.source_id = 2
          AND UPPER(w_syn.taxonomicStatus) = 'SYNONYM'
        JOIN wfo_import w_acc ON w_syn.acceptedNameUsageID = w_acc.taxonID
        JOIN app_taxa accepted_parent ON LOWER(w_acc.scientificName) = LOWER(accepted_parent.family) 
          AND accepted_parent.taxon_rank = 'Family'
          AND accepted_parent.source_id = 2
        WHERE child.parent_id = current_parent.id;
    `);
    log(`    Redirected ${synRes.rowCount} children to Accepted Family parents.`);
};

const stepBridgeFlow = async () => {
    log("Starting Phase 12: Literal Flow (Mass Phylogenetic Inheritance)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Flowing Segment ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa child
            SET kingdom = parent.kingdom, 
                phylum = parent.phylum, 
                class = parent.class, 
                "order" = parent."order"
            FROM app_taxa parent 
            WHERE child.family = parent.family 
              AND parent.taxon_rank = 'Family'
              AND parent.source_id = 2
              AND child.source_id IN (1, 3)
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
    console.log("\n  Phase 12 Complete.");
};

const stepHierarchy = async () => {
    log("Building Ltree paths...");
    await robustQuery(`UPDATE app_taxa SET hierarchy_path = text2ltree('root') || text2ltree(replace(id::text, '-', '_')) WHERE parent_id IS NULL AND hierarchy_path IS NULL`);
    let level = 2;
    while (true) {
        log(`  Processing Level ${level}...`);
        let total = 0;
        for (const seg of SEGMENTS) {
            const res = await robustQuery(`
                UPDATE app_taxa c SET hierarchy_path = p.hierarchy_path || text2ltree(replace(c.id::text, '-', '_'))
                FROM app_taxa p WHERE c.parent_id = p.id AND p.hierarchy_path IS NOT NULL AND c.hierarchy_path IS NULL
                AND c.taxon_name >= $1 AND c.taxon_name < $2
            `, [seg.start, seg.end]);
            total += res.rowCount;
        }
        if (total === 0) break;
        level++;
    }
};

const stepCounts = async () => {
    log("Calculating descendant counts...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Updating: ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa p SET descendant_count = sub.cnt
            FROM (SELECT parent_id as id, count(*) as cnt FROM app_taxa WHERE parent_id IS NOT NULL GROUP BY parent_id) sub
            WHERE p.id = sub.id AND p.taxon_name >= $1 AND p.taxon_name < $2
        `, [seg.start, seg.end]);
    }
    console.log("\n  Phase 14 Complete.");
};

const stepOptimize = async () => {
    log("Optimizing indexes...");
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await robustQuery(sql);
    
    // V2.33.14: Clean up build accelerator index
    log("  Cleaning up bridge accelerator...");
    await robustQuery(`DROP INDEX IF EXISTS idx_bridge_family_lookup`);
};

const STEPS = [
    { id: 1, label: "Prepare WCVP (Cleaning)", fn: stepPrepWCVP },
    { id: 2, label: "Prepare WFO (Distillation)", fn: stepPrepWFO },
    { id: 3, label: "Reset Database (Schema WIPE)", fn: stepResetDB },
    { id: 4, label: "Import WCVP (CSV Stream)", fn: stepImportWCVP },
    { id: 5, label: "Import WFO (Darwin Core)", fn: stepImportWFO },
    { id: 6, label: "Populate App (WCVP Data)", fn: stepPopulateApp },
    { id: 7, label: "Build Indexes (Structural)", fn: stepBuildIndexes },
    { id: 8, label: "Link Parents (WCVP Adjacency)", fn: stepLinkParents },
    { id: 9, label: "WFO Higher Ranks (Backbone)", fn: stepWFOBackbone },
    { id: 10, label: "Bridge: Family Grafting", fn: stepBridgeGrafting },
    { id: 11, label: "Bridge: Synonym Redirects", fn: stepBridgeSynonyms },
    { id: 12, label: "Bridge: Literal Flow", fn: stepBridgeFlow },
    { id: 13, label: "Hierarchy (Ltree Paths)", fn: stepHierarchy },
    { id: 14, label: "Counts (# Navigation)", fn: stepCounts },
    { id: 15, label: "Optimize (Sort-Inclusive)", fn: stepOptimize }
];

async function main() {
    console.log(`\n\x1b[32m🌿 FLORA CATALOG BUILDER ${APP_VERSION}\x1b[0m`);
    console.log("----------------------------------------");
    STEPS.forEach(s => console.log(`${s.id.toString().padStart(2)}. ${s.label}`));
    console.log("----------------------------------------");

    const choice = await askQuestion("Select step(s) to run (e.g. '11' or '11,12,13'): ");
    let sequence = [];
    if (choice.includes(',')) {
        sequence = choice.split(',').map(n => parseInt(n.trim()));
    } else {
        const startId = parseInt(choice);
        if (isNaN(startId)) {
            err("Invalid selection. Please enter a number.");
            process.exit(1);
        }
        sequence = STEPS.filter(s => s.id >= startId).map(s => s.id);
    }

    try {
        for (const id of sequence) {
            const step = STEPS.find(s => s.id === id);
            if (!step) continue;
            log(`\x1b[35m[STEP ${id}]\x1b[0m ${step.label}...`);
            await step.fn();
        }
        log("\x1b[32mBuild Complete!\x1b[0m");
    } catch (e) {
        err(`Process failed.`);
        console.error(e);
    } finally {
        if (activeClient) await activeClient.end();
    }
}

main();