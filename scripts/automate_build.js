/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.31.6
 * 
 * Orchestrates the transformation of raw WCVP and WFO data into the FloraCatalog database.
 * v2.31.6: Restored interactive connection string construction and password prompting.
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
const FILE_WFO_MAP = path.join(DIR_TEMP, 'wfo_family_order_map.csv');
const FILE_SCHEMA = 'scripts/wcvp_schema.sql.txt';
const FILE_OPTIMIZE = 'scripts/optimize_indexes.sql.txt';
const APP_VERSION = 'v2.31.6';

const SEGMENTS = [
    { label: "Symbols (+, etc)", start: " ", end: "A" },
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
    { label: "W - Z", start: "W", end: "{" },
    { label: "Hybrids (×, etc)", start: "{", end: "\uffff" } 
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

const getPythonCommand = () => {
    try { execSync('python3 --version', { stdio: 'ignore' }); return 'python3'; } 
    catch (e) { return 'python'; }
};

const selectSegments = async () => {
    console.log("\nAvailable Ranges: A, D, H, M, S, T, W, or 'All'");
    const filter = await askQuestion("Target alphabetical range (e.g. 'All'): ");
    if (!filter || filter.toLowerCase() === 'all') return SEGMENTS;
    const startChar = filter.toUpperCase();
    const filtered = SEGMENTS.filter(s => s.start >= startChar || s.label.startsWith(startChar));
    return filtered.length === 0 ? SEGMENTS : filtered;
};

// --- STEPS ---

async function stepPrepWCVP() {
    log("Preparing WCVP Data...");
    ensureDirs();
    const pyCmd = getPythonCommand();
    execSync(`${pyCmd} scripts/convert_wcvp.py.txt`, { stdio: 'inherit' });
}

async function stepPrepWFO() {
    log("Preparing WFO Data (Distill Backbone)...");
    ensureDirs();
    const pyCmd = getPythonCommand();
    execSync(`${pyCmd} scripts/distill_wfo.py.txt`, { stdio: 'inherit' });
}

async function stepBuildSchema(client) {
    log(`Applying Schema (Full DB Reset)...`);
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await client.query(sql);
}

async function stepImportWCVP(client) {
    log("Streaming WCVP CSV to 'wcvp_import'...");
    if (!fs.existsSync(FILE_CLEAN_CSV)) throw new Error("WCVP clean file missing. Run Step 1.");
    const copyQuery = `COPY wcvp_import FROM STDIN WITH (FORMAT csv, HEADER true)`;
    const stream = client.query(copyFrom(copyQuery));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);
    await pipeline(fileStream, stream);
}

async function stepImportWFO(client) {
    log("Streaming WFO Map to 'wfo_family_order_map'...");
    if (!fs.existsSync(FILE_WFO_MAP)) throw new Error("WFO map file missing. Run Step 2.");
    
    // Ensure table exists in case Step 3 was skipped
    await client.query(`CREATE TABLE IF NOT EXISTS wfo_family_order_map (family text PRIMARY KEY, "order" text NOT NULL);`);
    await client.query(`TRUNCATE TABLE wfo_family_order_map;`);

    const wfoQuery = `COPY wfo_family_order_map FROM STDIN WITH (FORMAT csv, HEADER true)`;
    const wfoStream = client.query(copyFrom(wfoQuery));
    const wfoFile = fs.createReadStream(FILE_WFO_MAP);
    await pipeline(wfoFile, wfoStream);
}

async function stepPopulateApp(client, segments) {
    log("Populating 'app_taxa' from WCVP Staging...");
    await client.query("SET statement_timeout = 0;");
    await client.query(`INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level) VALUES (1, 'WCVP', '14', 'Kew Gardens WCVP', 'https://powo.science.kew.org/', 5) ON CONFLICT (id) DO NOTHING;`);
    
    for (const seg of segments) {
        log(`Processing Segment: ${seg.label}...`);
        await client.query(`
            INSERT INTO app_taxa (wcvp_id, ipni_id, taxon_rank, taxon_status, family, genus_hybrid, genus, species_hybrid, species, infraspecific_rank, infraspecies, taxon_name, taxon_authors, parent_plant_name_id, source_id)
            SELECT plant_name_id, ipni_id, COALESCE(taxon_rank, 'Unranked'), taxon_status, family, genus_hybrid, genus, species_hybrid, species, infraspecific_rank, infraspecies, taxon_name, taxon_authors, parent_plant_name_id, 1
            FROM wcvp_import WHERE taxon_name >= '${seg.start}' AND taxon_name < '${seg.end}' ON CONFLICT DO NOTHING;
        `);
    }
}

async function stepIndexes(client) {
    log("Building Essential Build Indexes...");
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_app_taxa_wcvp ON app_taxa(wcvp_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent_plant_name_id ON app_taxa(parent_plant_name_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent ON app_taxa(parent_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_name_sort ON app_taxa (taxon_name COLLATE "C");
        CREATE INDEX IF NOT EXISTS idx_app_taxa_family ON app_taxa(family);
    `);
}

async function stepLinkParents(client, segments) {
    log("Linking WCVP Parents (Adjacency List)...");
    await client.query("SET statement_timeout = 0;");
    for (const seg of segments) {
        log(`Linking Segment: ${seg.label}...`);
        await client.query(`UPDATE app_taxa child SET parent_id = parent.id FROM app_taxa parent WHERE child.parent_plant_name_id = parent.wcvp_id AND child.parent_id IS NULL AND child.taxon_name >= '${seg.start}' AND child.taxon_name < '${seg.end}';`);
    }
}

async function stepCreateWFOOrders(client) {
    log("Building Phylogenetic Layer (WFO Orders)...");
    await client.query("SET statement_timeout = 0;");

    // Source 3: World Flora Online
    const wfoCitation = 'WFO (2025): World Flora Online. Version 2025.12. Published on the Internet; http://www.worldfloraonline.org. Accessed on: 2026-01-09';
    await client.query(`INSERT INTO app_data_sources (id, name, version, citation_text, trust_level) VALUES (3, 'WFO', '2025.12', '${wfoCitation}', 5) ON CONFLICT (id) DO NOTHING;`);

    log("  Creating Order records from map...");
    await client.query(`
        INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, source_id, verification_level)
        SELECT DISTINCT "order", 'Order', 'Accepted', 3, 'WFO Backbone 2025.12'
        FROM wfo_family_order_map
        ON CONFLICT DO NOTHING;
    `);

    log("  Linking existing Families to WFO Orders...");
    await client.query(`
        UPDATE app_taxa fam
        SET parent_id = ord.id
        FROM wfo_family_order_map map
        JOIN app_taxa ord ON map."order" = ord.taxon_name AND ord.taxon_rank = 'Order'
        WHERE fam.taxon_name = map.family AND fam.taxon_rank = 'Family' AND fam.parent_id IS NULL;
    `);
}

async function stepCreateDerivedFamilies(client, segments) {
    log("Generating Taxonomic Backbone (System Derived Families)...");
    await client.query("SET statement_timeout = 0;");

    // Source 2: FloraCatalog System
    await client.query(`INSERT INTO app_data_sources (id, name, version, citation_text, trust_level) VALUES (2, 'FloraCatalog System', '${APP_VERSION}', 'Internal system layer for taxonomic derivation.', 5) ON CONFLICT (id) DO NOTHING;`);

    log("  Creating Family records from attributes...");
    await client.query(`
        INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, family, source_id, verification_level)
        SELECT DISTINCT family, 'Family', 'Derived', family, 2, 'FloraCatalog Derived'
        FROM app_taxa WHERE family IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app_taxa a WHERE a.taxon_name = app_taxa.family AND a.taxon_rank = 'Family')
        ON CONFLICT DO NOTHING;
    `);

    log("  Grafting remaining Orphans to Families...");
    for (const seg of segments) {
        log(`  Grafting Segment: ${seg.label}...`);
        await client.query(`UPDATE app_taxa child SET parent_id = parent.id FROM app_taxa parent WHERE child.parent_id IS NULL AND child.family = parent.taxon_name AND parent.taxon_rank = 'Family' AND child.id != parent.id AND child.taxon_name >= '${seg.start}' AND child.taxon_name < '${seg.end}';`);
    }
}

async function stepHierarchy(client, segments) {
    log("Building Ltree Hierarchy Paths...");
    await client.query("SET statement_timeout = 0;");
    
    // Level 0: Orders/Orphans (New Root anchoring)
    for (const seg of segments) {
        await client.query(`UPDATE app_taxa SET hierarchy_path = text2ltree('root') || text2ltree(replace(id::text, '-', '_')) WHERE parent_id IS NULL AND hierarchy_path IS NULL AND taxon_name >= '${seg.start}' AND taxon_name < '${seg.end}';`);
    }

    let level = 1;
    while (true) {
        let levelUpdated = 0;
        log(`Processing Level ${level}...`);
        for (const seg of segments) {
            const res = await client.query(`UPDATE app_taxa child SET hierarchy_path = parent.hierarchy_path || text2ltree(replace(child.id::text, '-', '_')) FROM app_taxa parent WHERE child.parent_id = parent.id AND parent.hierarchy_path IS NOT NULL AND child.hierarchy_path IS NULL AND child.taxon_name >= '${seg.start}' AND child.taxon_name < '${seg.end}';`);
            levelUpdated += res.rowCount;
        }
        if (levelUpdated === 0 || level > 20) break;
        level++;
    }
}

async function stepCounts(client, segments) {
    log("Calculating Recursive Counts...");
    for (const seg of segments) {
        await client.query(`WITH counts AS (SELECT parent_id, COUNT(*) as cnt FROM app_taxa WHERE parent_id IS NOT NULL GROUP BY parent_id) UPDATE app_taxa SET descendant_count = counts.cnt FROM counts WHERE app_taxa.id = counts.parent_id AND app_taxa.taxon_name >= '${seg.start}' AND app_taxa.taxon_name < '${seg.end}';`);
    }
}

async function stepOptimize(client) {
    log(`Optimizing Indexes (V8.1)...`);
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await client.query(sql);
}

async function main() {
    console.log("\n🌿 FLORA CATALOG - DATABASE AUTOMATION v2.31.6 🌿\n");
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let dbUrl = process.env.DATABASE_URL;
    let finalConfig;

    if (dbUrl) {
        log("Using DATABASE_URL from .env");
        finalConfig = { connectionString: dbUrl, ssl: { rejectUnauthorized: false } };
    } else {
        let dbPass = process.env.DATABASE_PASSWORD;
        if (!dbPass) dbPass = (await askQuestion("🔑 Enter Database Password: ")).trim();
        if (!dbPass) { err("Password required."); process.exit(1); }
        const user = `postgres.${DEFAULT_PROJECT_ID}`;
        const host = 'aws-0-us-west-2.pooler.supabase.com';
        const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(dbPass)}@${host}:6543/postgres`;
        finalConfig = { connectionString, ssl: { rejectUnauthorized: false } };
    }

    const client = new pg.Client(finalConfig);
    
    client.on('error', (e) => {
        err(`Database Connection Error: ${e.message}`);
        process.exit(1);
    });

    try {
        await client.connect();
        log("✅ Database Connected Successfully");
    } catch (e) {
        err(`Initial Connection Failed: ${e.message}`);
        process.exit(1);
    }
    
    const steps = [
        { id: '1', name: "Prepare WCVP Data (Pipe -> Comma)", fn: () => stepPrepWCVP() },
        { id: '2', name: "Prepare WFO Data (Distill Backbone)", fn: () => stepPrepWFO() },
        { id: '3', name: "Reset Database (Rebuild Schema)", fn: () => stepBuildSchema(client) },
        { id: '4', name: "Import Staging: WCVP", fn: () => stepImportWCVP(client) },
        { id: '5', name: "Import Staging: WFO Map", fn: () => stepImportWFO(client) },
        { id: '6', name: "Populate App Taxa (WCVP -> Core)", fn: (segs) => stepPopulateApp(client, segs) },
        { id: '7', name: "Build-Indexes (Essential)", fn: () => stepIndexes(client) },
        { id: '8', name: "Link Parents (WCVP Lineage)", fn: (segs) => stepLinkParents(client, segs) },
        { id: '9', name: "Build Backbone: WFO Orders", fn: () => stepCreateWFOOrders(client) },
        { id: '10', name: "Build Backbone: Derived Families", fn: (segs) => stepCreateDerivedFamilies(client, segs) },
        { id: '11', name: "Calculate Hierarchy (Ltree)", fn: (segs) => stepHierarchy(client, segs) },
        { id: '12', name: "Calculate Counts (Grid)", fn: (segs) => stepCounts(client, segs) },
        { id: '13', name: "Optimize Indexes (V8.1)", fn: () => stepOptimize(client) }
    ];

    console.log("\n--- FLORA CATALOG BUILD MENU v2.31.6 ---");
    steps.forEach(s => console.log(`${s.id.padStart(2)}. Step ${s.id}: ${s.name}`));
    const choice = await askQuestion("\nSelect step(s) (e.g. 'All', '9', or '2,5,9,10'): ");
    
    let targetSteps = [];
    if (choice.toLowerCase() === 'all') {
        targetSteps = steps;
    } else if (choice.includes(',')) {
        const ids = choice.split(',').map(s => s.trim());
        targetSteps = steps.filter(s => ids.includes(s.id));
    } else {
        const startIndex = steps.findIndex(s => s.id === choice);
        if (startIndex === -1) { err("Invalid selection"); process.exit(1); }
        targetSteps = steps.slice(startIndex);
    }

    if (targetSteps.length === 0) { err("No steps selected."); process.exit(1); }

    let targetSegments = SEGMENTS;
    const needsSegments = targetSteps.some(s => ['6', '8', '10', '11', '12'].includes(s.id));
    if (needsSegments) targetSegments = await selectSegments();

    for (const step of targetSteps) {
        await step.fn(targetSegments);
    }
    
    await client.end();
    log("Build process finished.");
}
main();