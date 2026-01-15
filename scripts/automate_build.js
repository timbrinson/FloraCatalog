/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.33.16
 * 
 * Orchestrates the transformation of raw WCVP and WFO data into the FloraCatalog database.
 * v2.33.16: Flexible Execution & Deterministic Bridging.
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
const APP_VERSION = 'v2.33.16';

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
    { label: "M (Fabaceae)", start: "Ma", end: "Mb" },
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
    await client.query(`TRUNCATE TABLE wfo_import`);
    const stream = client.query(copyFrom(`COPY wfo_import FROM STDIN WITH CSV HEADER`));
    const fileStream = fs.createReadStream(FILE_WFO_IMPORT);
    await pipeline(fileStream, stream);
    log("  WFO staging complete.");
};

const stepPopulateWCVP = async () => {
    log("Moving WCVP staging to core table...");
    await robustQuery(`INSERT INTO app_data_sources (id, name, version, trust_level) VALUES (1, 'WCVP', '14 (2025)', 5) ON CONFLICT DO NOTHING`);
    for (const seg of SEGMENTS) {
        log(`  Processing: ${seg.label}...`);
        await robustQuery(`
            INSERT INTO app_taxa (wcvp_id, ipni_id, powo_id, taxon_name, taxon_rank, taxon_status, family, genus, species, infraspecies, infraspecific_rank, source_id)
            SELECT plant_name_id, ipni_id, powo_id, taxon_name, COALESCE(taxon_rank, 'Unranked'), taxon_status, family, genus, species, infraspecies, infraspecific_rank, 1
            FROM wcvp_import WHERE taxon_name >= $1 AND taxon_name < $2
            ON CONFLICT (wcvp_id) DO NOTHING;
        `, [seg.start, seg.end]);
    }
};

const stepPopulateWFO = async () => {
    log("Moving distilled WFO backbone to core table (Authority Creation)...");
    await robustQuery(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (2, 'World Flora Online', '2025.12', 'WFO (2025): World Flora Online. Version 2025.12.', 'http://www.worldfloraonline.org', 5)
        ON CONFLICT (id) DO UPDATE SET last_accessed_at = NOW();
    `);

    // Load distilled ranks (Kingdom through Family) with full metadata set
    const res = await robustQuery(`
        INSERT INTO app_taxa (
            wfo_id, wfo_parent_id, wfo_accepted_id, wfo_scientific_name_id, wfo_original_id, 
            taxon_name, taxon_rank, taxon_status, family, source_id, verification_level
        )
        SELECT DISTINCT ON (scientificName, taxonRank) 
            taxonID, parentNameUsageID, acceptedNameUsageID, scientificNameID, originalNameUsageID, 
            scientificName, INITCAP(LOWER(taxonRank)), INITCAP(LOWER(taxonomicStatus)), family, 2, 'WFO Backbone v2.33.16'
        FROM wfo_import
        ORDER BY scientificName, taxonRank, CASE WHEN taxonomicStatus = 'ACCEPTED' THEN 1 ELSE 2 END
        ON CONFLICT DO NOTHING;
    `);
    log(`  Created ${res.rowCount} WFO backbone authority records.`);
};

const stepBuildIndexes = async () => {
    log("Building structural indexes...");
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_temp_wcvp ON app_taxa(wcvp_id)`);
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_temp_parent_attr ON app_taxa(parent_plant_name_id)`);
    await robustQuery(`CREATE INDEX IF NOT EXISTS idx_bridge_family_lookup ON app_taxa (family COLLATE "C") WHERE taxon_rank = 'Family' AND source_id = 2`);
};

const stepLinkParents = async () => {
    log("Linking WCVP children to parents (Nomenclature adjacency)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Segment ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa child SET parent_id = parent.id
            FROM app_taxa parent WHERE child.parent_plant_name_id = parent.wcvp_id
            AND child.parent_id IS NULL AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
    console.log("\n  WCVP linking complete.");
};

const stepResolveWFO = async () => {
    log("Resolving internal WFO hierarchy (Phylogenetic adjacency)...");
    await robustQuery(`
        UPDATE app_taxa child SET parent_id = parent.id
        FROM app_taxa parent WHERE child.wfo_parent_id = parent.wfo_id
        AND child.source_id = 2 AND parent.source_id = 2 AND child.id != parent.id;
    `);

    log("  Backbone completion (Literal propagation)...");
    for (let p = 1; p <= 5; p++) {
        await robustQuery(`
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
};

const stepBridgeGrafting = async () => {
    log("Grafting Genus roots to Family parents (Literal join)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Grafting Segment ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa child SET parent_id = parent.id
            FROM app_taxa parent 
            WHERE child.parent_id IS NULL 
              AND child.family = parent.family
              AND parent.taxon_rank = 'Family' 
              AND parent.source_id = 2 
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
    console.log("\n  Grafting complete.");
};

const stepBridgeSynonyms = async () => {
    log("Dereferencing Synonym Families (Deterministic ID redirect)...");
    // Implementation: If a child is grafted to a Family SYNONYM, point it to the ACCEPTED Family
    const synRes = await robustQuery(`
        UPDATE app_taxa child 
        SET parent_id = parent_acc.id,
            family = parent_acc.family
        FROM app_taxa parent_syn
        JOIN app_taxa parent_acc ON parent_syn.wfo_accepted_id = parent_acc.wfo_id
        WHERE child.parent_id = parent_syn.id 
          AND parent_syn.taxon_rank = 'Family' 
          AND parent_syn.taxon_status = 'Synonym'
          AND parent_acc.source_id = 2;
    `);
    log(`  Redirected ${synRes.rowCount} children to Accepted authority parents via WFO ID.`);
};

const stepBridgeFlow = async () => {
    log("Flowing phylogenetic literals to descendants (Literal consistency join)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`    Flowing Segment ${seg.label}... \r`);
        await robustQuery(`
            UPDATE app_taxa child
            SET kingdom = parent.kingdom, phylum = parent.phylum, class = parent.class, "order" = parent."order"
            FROM app_taxa parent 
            WHERE child.family = parent.family 
              AND parent.taxon_rank = 'Family' 
              AND parent.source_id = 2
              AND child.source_id IN (1, 3) 
              AND child.taxon_name >= $1 AND child.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
    console.log("\n  Phylogenetic flow complete.");
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
            UPDATE app_taxa p SET descendant_count = (SELECT count(*) FROM app_taxa c WHERE c.parent_id = p.id)
            WHERE p.taxon_name >= $1 AND p.taxon_name < $2;
        `, [seg.start, seg.end]);
    }
    console.log("\n  Count sync complete.");
};

const stepOptimize = async () => {
    log("Optimizing indexes...");
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await robustQuery(sql);
    await robustQuery(`DROP INDEX IF EXISTS idx_bridge_family_lookup`);
};

const STEPS = [
    { id: 1, label: "Prepare WCVP (Cleaning)", fn: stepPrepWCVP },
    { id: 2, label: "Prepare WFO (Distillation)", fn: stepPrepWFO },
    { id: 3, label: "Reset Database (Schema WIPE)", fn: stepResetDB },
    { id: 4, label: "Import WCVP (CSV Stream)", fn: stepImportWCVP },
    { id: 5, label: "Import WFO (Darwin Core)", fn: stepImportWFO },
    { id: 6, label: "Populate WCVP (Nomenclature)", fn: stepPopulateWCVP },
    { id: 7, label: "Populate WFO (Authority Tier)", fn: stepPopulateWFO },
    { id: 8, label: "Build Indexes (Structural)", fn: stepBuildIndexes },
    { id: 9, label: "Link Parents (WCVP Adjacency)", fn: stepLinkParents },
    { id: 10, label: "Resolve Backbone (WFO Hierarchy)", fn: stepResolveWFO },
    { id: 11, label: "Bridge: Grafting (Genus to Family)", fn: stepBridgeGrafting },
    { id: 12, label: "Bridge: Synonyms (Dereferencing)", fn: stepBridgeSynonyms },
    { id: 13, label: "Bridge: Literal Flow (Inheritance)", fn: stepBridgeFlow },
    { id: 14, label: "Hierarchy (Ltree Paths)", fn: stepHierarchy },
    { id: 15, label: "Counts (# Navigation)", fn: stepCounts },
    { id: 16, label: "Optimize (Production)", fn: stepOptimize }
];

async function main() {
    console.log(`\n\x1b[32m🌿 FLORA CATALOG BUILDER ${APP_VERSION}\x1b[0m`);
    console.log("----------------------------------------");
    STEPS.forEach(s => console.log(`${s.id.toString().padStart(2)}. ${s.label}`));
    console.log("----------------------------------------");

    const choice = await askQuestion("Select step(s) to run (e.g. '7' for single, '7,12' for specific, '7-12' for range): ");
    let sequence = [];
    
    if (choice.includes('-')) {
        const [start, end] = choice.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
            sequence = STEPS.filter(s => s.id >= start && s.id <= end).map(s => s.id);
        }
    } else if (choice.includes(',')) {
        sequence = choice.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    } else {
        const id = parseInt(choice.trim());
        if (!isNaN(id)) {
            sequence = [id];
        }
    }

    if (sequence.length === 0) {
        err("Invalid selection.");
        process.exit(1);
    }

    try {
        for (const id of sequence) {
            const step = STEPS.find(s => s.id === id);
            if (!step) continue;
            log(`\x1b[35m[STEP ${id}]\x1b[0m ${step.label}...`);
            await step.fn();
        }
        log("\x1b[32mBuild Sequence Complete!\x1b[0m");
    } catch (e) {
        err(`Process failed.`);
        console.error(e);
    } finally {
        if (activeClient) await activeClient.end();
    }
}

main();