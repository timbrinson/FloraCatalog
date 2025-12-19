
/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.15
 * 
 * Orchestrates the transformation of raw WCVP data into the FloraCatalog database.
 * Optimized for free-tier environments using segmented batching.
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

// Alphabet segments for batching
const SEGMENTS = [
    { label: "A - C", start: "", end: "D" },
    { label: "D - G", start: "D", end: "H" },
    { label: "H - L", start: "H", end: "M" },
    { label: "M - P", start: "M", end: "Q" },
    { label: "Q - S", start: "Q", end: "T" },
    { label: "T - Z", start: "T", end: "{" } // '{' is char after 'Z'
];

// --- SQL TEMPLATES ---

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
    FROM wcvp_import
    WHERE taxon_name >= '${start}' AND taxon_name < '${end}'
    ON CONFLICT (wcvp_id) DO NOTHING;
`;

const buildHierarchyQuery = (start, end) => `
    WITH RECURSIVE tax_tree AS (
        SELECT id, parent_id, text2ltree('root') || text2ltree(replace(id::text, '-', '_')) as path
        FROM app_taxa 
        WHERE parent_id IS NULL AND taxon_name >= '${start}' AND taxon_name < '${end}'
        UNION ALL
        SELECT c.id, c.parent_id, p.path || text2ltree(replace(c.id::text, '-', '_'))
        FROM app_taxa c JOIN tax_tree p ON c.parent_id = p.id
    )
    UPDATE app_taxa
    SET hierarchy_path = tax_tree.path
    FROM tax_tree
    WHERE app_taxa.id = tax_tree.id
      AND app_taxa.hierarchy_path IS NULL;
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

async function stepPopulate(client) {
    log("Populating 'app_taxa' in segments...");
    await client.query("SET statement_timeout = 0;");
    
    // Ensure data source 1 exists
    await client.query(`
        INSERT INTO app_data_sources (id, name, version, citation_text, url, trust_level)
        VALUES (1, 'WCVP', '14', 'Kew Gardens WCVP', 'https://powo.science.kew.org/', 5)
        ON CONFLICT (id) DO NOTHING;
    `);

    for (const seg of SEGMENTS) {
        log(`Processing Segment: ${seg.label}...`);
        await client.query(buildPopulateQuery(seg.start, seg.end));
    }
    log("Population complete.");
}

async function stepIndexes(client) {
    log("Building Structural Indexes...");
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_app_taxa_wcvp_id ON app_taxa(wcvp_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent_plant_name_id ON app_taxa(parent_plant_name_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent_id ON app_taxa(parent_id);
    `);
}

async function stepLink(client) {
    log("Linking Parents (Segmented)...");
    await client.query("SET statement_timeout = 0;");
    for (const seg of SEGMENTS) {
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

async function stepHierarchy(client) {
    log("Calculating Hierarchy Paths (Ltree - Segmented)...");
    await client.query("SET statement_timeout = 0;");
    for (const seg of SEGMENTS) {
        log(`Calculating Segment: ${seg.label}...`);
        await client.query(buildHierarchyQuery(seg.start, seg.end));
    }
}

async function stepCounts(client) {
    log("Calculating Descendant Counts (Segmented)...");
    await client.query("SET statement_timeout = 0;");
    for (const seg of SEGMENTS) {
        log(`Counting Segment: ${seg.label}...`);
        await client.query(buildCountsQuery(seg.start, seg.end));
    }
}

async function stepOptimize(client) {
    log(`Applying Performance Tuning...`);
    if (!fs.existsSync(FILE_OPTIMIZE)) return;
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await client.query(sql);
}

// --- MAIN LOOP ---

async function main() {
    console.log("\n🌿 FLORA CATALOG - DATABASE AUTOMATION v2.15 🌿\n");
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
    try {
        await client.connect();
        log("✅ Connection Successful!");
        const steps = [
            { id: '1', name: "Prepare Data (Python)", fn: () => stepPrepareData() },
            { id: '2', name: "Build Schema (Reset)", fn: () => stepBuildSchema(client) },
            { id: '3', name: "Import CSV (Stream)", fn: () => stepImportStream(client) },
            { id: '4', name: "Populate App Taxa (Segmented)", fn: () => stepPopulate(client) },
            { id: '5', name: "Build Indexes", fn: () => stepIndexes(client) },
            { id: '6', name: "Link Parents (Segmented)", fn: () => stepLink(client) },
            { id: '7', name: "Build Hierarchy (Segmented)", fn: () => stepHierarchy(client) },
            { id: '8', name: "Calc Counts (Segmented)", fn: () => stepCounts(client) },
            { id: '9', name: "Optimize", fn: () => stepOptimize(client) }
        ];
        console.log("\n--- MENU ---");
        steps.forEach(s => console.log(`${s.id}. Step ${s.id}: ${s.name}`));
        const choice = (await askQuestion("\nSelect option: ")).toUpperCase();
        const startIndex = steps.findIndex(s => s.id === choice);
        if (startIndex === -1) { err("Invalid selection"); process.exit(1); }
        for (let i = startIndex; i < steps.length; i++) {
            const step = steps[i];
            console.log(`\n--- [Step ${step.id}/${steps.length}] ${step.name} ---`);
            await step.fn();
        }
        log("\n✅ Automation Complete!");
    } catch (e) { err(`Build failed: ${e.message}`); } finally { try { await client.end(); } catch(e) {} }
}
main();
