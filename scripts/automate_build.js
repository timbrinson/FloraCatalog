/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.31.2
 * 
 * Orchestrates the transformation of raw WCVP data into the FloraCatalog database.
 * Optimized for free-tier environments using granular segmented iterative operations.
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
const DEFAULT_PROJECT_ID = "uzzayfueabppzpwunvlf"; 
const DIR_DATA = 'data';
const DIR_INPUT = path.join(DIR_DATA, 'input');
const DIR_TEMP = path.join(DIR_DATA, 'temp');
const FILE_CLEAN_CSV = path.join(DIR_TEMP, 'wcvp_names_clean.csv');
const FILE_SCHEMA = 'scripts/wcvp_schema.sql.txt';
const FILE_OPTIMIZE = 'scripts/optimize_indexes.sql.txt';
const APP_VERSION = 'v2.31.2';

// Granular segments to prevent Supabase connection resets
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

// --- SQL TEMPLATES ---

/**
 * buildPopulateQuery: Comprehensive column list for high-fidelity transfer.
 */
const buildPopulateQuery = (start, end) => `
    INSERT INTO app_taxa (
        wcvp_id, ipni_id, taxon_rank, taxon_status, family, genus_hybrid, 
        genus, species_hybrid, species, infraspecific_rank, infraspecies, 
        parenthetical_author, primary_author, publication_author, 
        place_of_publication, volume_and_page, first_published, 
        nomenclatural_remarks, geographic_area, lifeform_description, 
        climate_description, taxon_name, taxon_authors, 
        accepted_plant_name_id, basionym_plant_name_id, 
        replaced_synonym_author, homotypic_synonym, 
        parent_plant_name_id, powo_id, hybrid_formula, reviewed, source_id
    )
    SELECT 
        plant_name_id, ipni_id, COALESCE(taxon_rank, 'Unranked'), taxon_status, family, genus_hybrid, 
        genus, species_hybrid, species, infraspecific_rank, infraspecies, 
        parenthetical_author, primary_author, publication_author, 
        place_of_publication, volume_and_page, first_published, 
        nomenclatural_remarks, geographic_area, lifeform_description, 
        climate_description, taxon_name, taxon_authors, 
        accepted_plant_name_id, basionym_plant_name_id, 
        replaced_synonym_author, homotypic_synonym, 
        parent_plant_name_id, powo_id, hybrid_formula, reviewed, 1
    FROM wcvp_import w
    WHERE taxon_name >= '${start}' AND taxon_name < '${end}'
      AND NOT EXISTS (SELECT 1 FROM app_taxa a WHERE a.wcvp_id = w.plant_name_id)
    ON CONFLICT (wcvp_id) DO NOTHING;
`;

const buildCountsQuery = (start, end) => `
    WITH counts AS (
       SELECT parent_id, COUNT(*) as cnt
       FROM app_taxa 
       WHERE parent_id IS NOT NULL 
       GROUP BY parent_id
    )
    UPDATE app_taxa SET descendant_count = counts.cnt
    FROM counts 
    WHERE app_taxa.id = counts.parent_id
      AND app_taxa.taxon_name >= '${start}' AND app_taxa.taxon_name < '${end}';
`;

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
    log("Recommendation: If recovering T-Z, run Step 6-8 for 'All' to close gaps.");
    const filter = await askQuestion("Target alphabetical range (e.g. 'All'): ");
    
    if (!filter || filter.toLowerCase() === 'all') return SEGMENTS;
    
    const startChar = filter.toUpperCase();
    const filtered = SEGMENTS.filter(s => s.start >= startChar || s.label.startsWith(startChar));
    
    if (filtered.length === 0) {
        warn(`No segments found for '${filter}'. Falling back to All.`);
        return SEGMENTS;
    }
    
    log(`Selected ${filtered.length} segments starting from range '${filtered[0].label}'.`);
    return filtered;
};

// --- STEPS ---

async function stepPrepareData() {
    log("Checking input data...");
    ensureDirs();
    if (fs.existsSync(FILE_CLEAN_CSV)) {
        log("Found existing cleaned CSV in temp. Skipping conversion.");
        return;
    }
    const inputFiles = fs.readdirSync(DIR_INPUT);
    const csvFile = inputFiles.find(f => f.toLowerCase().endsWith('.csv') || f.toLowerCase().endsWith('.txt'));
    const zipFile = inputFiles.find(f => f.toLowerCase().endsWith('.zip'));
    if (!csvFile && !zipFile) throw new Error(`Could not find WCVP data in '${DIR_INPUT}'.`);
    const pyCmd = getPythonCommand();
    log(`Running conversion script (using ${pyCmd})...`);
    try {
        execSync(`${pyCmd} scripts/convert_wcvp.py.txt`, { stdio: 'inherit' });
        if (fs.existsSync(FILE_CLEAN_CSV)) log("✅ Clean CSV verified.");
        else throw new Error("Conversion failed.");
    } catch (e) { throw new Error(`Python conversion failed: ${e.message}`); }
}

async function stepBuildSchema(client) {
    log(`Applying Schema...`);
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await client.query(sql);
}

async function stepImportStream(client) {
    log("Streaming CSV to 'wcvp_import'...");
    const copyQuery = `COPY wcvp_import FROM STDIN WITH (FORMAT csv, HEADER true)`;
    const stream = client.query(copyFrom(copyQuery));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);
    try { await pipeline(fileStream, stream); log("Import complete."); } 
    catch (e) { throw new Error(`Streaming failed: ${e.message}`); }
}

async function stepPopulate(client, segments) {
    log("Populating 'app_taxa' in segments...");
    await client.query("SET statement_timeout = 0;");
    
    await client.query(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (1, 'WCVP', '14', 'Kew Gardens WCVP', 'https://powo.science.kew.org/', 5)
        ON CONFLICT (id) DO NOTHING;
    `);

    for (const seg of segments) {
        log(`Processing Segment: ${seg.label}...`);
        await client.query(buildPopulateQuery(seg.start, seg.end));
    }
    log("Population complete.");
}

async function stepIndexes(client) {
    log("Building Essential Build Indexes (Standardized)...");
    // These are the bare minimum needed for efficient Parent linking and Hierarchy walks.
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_app_taxa_wcvp ON app_taxa(wcvp_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent_plant_name_id ON app_taxa(parent_plant_name_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent ON app_taxa(parent_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_name_sort ON app_taxa (taxon_name COLLATE "C");
        CREATE INDEX IF NOT EXISTS idx_app_taxa_family ON app_taxa(family);
    `);
    log("Essential indexes verified.");
}

async function stepLink(client, segments) {
    log("Linking Parents (Segmented Adjacency)...");
    await client.query("SET statement_timeout = 0;");
    for (const seg of segments) {
        log(`Linking Segment: ${seg.label}...`);
        const q = `
            UPDATE app_taxa child
            SET parent_id = parent.id
            FROM app_taxa parent
            WHERE child.parent_plant_name_id = parent.wcvp_id
              AND child.parent_id IS NULL
              AND child.taxon_name >= '${seg.start}' AND child.taxon_name < '${seg.end}';
        `;
        await client.query(q);
    }
}

async function stepBackbone(client, segments) {
    log("Generating Family Backbone & Fallthrough Grafting...");
    await client.query("SET statement_timeout = 0;");

    // Phase 1: Ensure FloraCatalog System source exists
    await client.query(`
        INSERT INTO app_data_sources (id, name, version, citation_text, trust_level)
        VALUES (
            2, 
            'FloraCatalog System', 
            '${APP_VERSION} (Derived)', 
            'Internal system layer used to derive taxonomic backbone records from authoritative WCVP v14 attributes.', 
            5
        ) ON CONFLICT (id) DO NOTHING;
    `);

    // Phase 2: Create Physical Family Records (One-time creation from unique values)
    log("Creating unique Family records...");
    await client.query(`
        INSERT INTO app_taxa (taxon_name, taxon_rank, taxon_status, family, source_id, verification_level)
        SELECT DISTINCT family, 'Family', 'Derived', family, 2, 'FloraCatalog ${APP_VERSION} (Derived from WCVP v14 "family" attribute)'
        FROM app_taxa
        WHERE family IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM app_taxa a WHERE a.family = app_taxa.family AND a.taxon_rank = 'Family')
        ON CONFLICT DO NOTHING;
    `);

    // Phase 3: Fallthrough Grafting (Linking orphans/roots to Families)
    // CRITICAL: This MUST occur after stepLink to ensure species have linked to genera first.
    for (const seg of segments) {
        log(`Grafting Segment: ${seg.label}...`);
        const q = `
            UPDATE app_taxa child
            SET parent_id = parent.id
            FROM app_taxa parent
            WHERE child.parent_id IS NULL
              AND child.family = parent.family
              AND parent.taxon_rank = 'Family'
              AND child.id != parent.id
              AND child.taxon_name >= '${seg.start}' AND child.taxon_name < '${seg.end}';
        `;
        await client.query(q);
    }
    log("Backbone generation complete.");
}

async function stepHierarchy(client, segments) {
    log("Calculating Hierarchy Paths (Ltree - Segmented Iterative)...");
    await client.query("SET statement_timeout = 0;");
    
    log("Resetting False Roots (Recovery Logic)...");
    await client.query(`
        UPDATE app_taxa 
        SET hierarchy_path = NULL 
        WHERE parent_id IS NOT NULL 
          AND hierarchy_path IS NOT NULL 
          AND nlevel(hierarchy_path) = 2;
    `);

    log("Initializing Level 0 (Roots)...");
    for (const seg of segments) {
        log(`Level 0: Segment ${seg.label}...`);
        await client.query(`
            UPDATE app_taxa 
            SET hierarchy_path = text2ltree('root') || text2ltree(replace(id::text, '-', '_'))
            WHERE parent_id IS NULL 
              AND hierarchy_path IS NULL
              AND taxon_name >= '${seg.start}' AND taxon_name < '${seg.end}';
        `);
    }

    let level = 1;
    let totalUpdated = 0;
    while (true) {
        let levelUpdated = 0;
        log(`Processing Level ${level}...`);
        
        for (const seg of segments) {
            const res = await client.query(`
                UPDATE app_taxa child
                SET hierarchy_path = parent.hierarchy_path || text2ltree(replace(child.id::text, '-', '_'))
                FROM app_taxa parent
                WHERE child.parent_id = parent.id
                  AND parent.hierarchy_path IS NOT NULL
                  AND child.hierarchy_path IS NULL
                  AND child.taxon_name >= '${seg.start}' AND child.taxon_name < '${seg.end}';
            `);
            levelUpdated += res.rowCount;
        }
        
        if (levelUpdated === 0) {
            log("No more children to update. Hierarchy complete.");
            break;
        }
        
        log(`Level ${level} complete: ${levelUpdated} rows updated.`);
        totalUpdated += levelUpdated;
        level++;
        if (level > 20) break;
    }
    log(`Hierarchy built for ${totalUpdated} descendants.`);
}

async function stepCounts(client, segments) {
    log("Calculating Descendant Counts (Segmented)...");
    await client.query("SET statement_timeout = 0;");
    for (const seg of segments) {
        log(`Counting Segment: ${seg.label}...`);
        await client.query(buildCountsQuery(seg.start, seg.end));
    }
}

async function stepOptimize(client) {
    log(`Applying Performance Tuning (Full Grid Optimization)...`);
    if (!fs.existsSync(FILE_OPTIMIZE)) {
        warn(`Could not find ${FILE_OPTIMIZE}. Skipping.`);
        return;
    }
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await client.query(sql);
    log("Performance indexes created.");
}

// --- MAIN LOOP ---

async function main() {
    console.log("\n🌿 FLORA CATALOG - DATABASE AUTOMATION v2.31.2 🌿\n");
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
        log("✅ Connection Successful!");
        
        const steps = [
            { id: '1', name: "Prepare Data (Python)", fn: () => stepPrepareData() },
            { id: '2', name: "Build Schema (Reset)", fn: () => stepBuildSchema(client) },
            { id: '3', name: "Import CSV (Stream)", fn: () => stepImportStream(client) },
            { id: '4', name: "Populate App Taxa (Segmented)", fn: (segs) => stepPopulate(client, segs) },
            { id: '5', name: "Build Build-Indexes", fn: () => stepIndexes(client) },
            { id: '6', name: "Link Parents (Segmented)", fn: (segs) => stepLink(client, segs) },
            { id: '7', name: "Family Backbone & Grafting (Segmented)", fn: (segs) => stepBackbone(client, segs) },
            { id: '8', name: "Build Hierarchy (Segmented Iterative)", fn: (segs) => stepHierarchy(client, segs) },
            { id: '9', name: "Calc Counts (Segmented)", fn: (segs) => stepCounts(client, segs) },
            { id: '10', name: "Final Performance Tuning", fn: () => stepOptimize(client) }
        ];

        console.log("\n--- MENU ---");
        steps.forEach(s => console.log(`${s.id}. Step ${s.id}: ${s.name}`));
        const choice = (await askQuestion("\nSelect option: ")).toUpperCase();
        const startIndex = steps.findIndex(s => s.id === choice);
        
        if (startIndex === -1) { err("Invalid selection"); process.exit(1); }

        let targetSegments = SEGMENTS;
        const segmentedSteps = ['4', '6', '7', '8', '9'];
        if (segmentedSteps.includes(choice)) {
            targetSegments = await selectSegments();
        }

        for (let i = startIndex; i < steps.length; i++) {
            const step = steps[i];
            console.log(`\n--- [Step ${step.id}/${steps.length}] ${step.name} ---`);
            await step.fn(targetSegments);
        }
        log("\n✅ Automation Task Complete!");
    } catch (e) { 
        err(`Build failed: ${e.message}`); 
    } finally { 
        try { await client.end(); } catch(e) {} 
    }
}
main();