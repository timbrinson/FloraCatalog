
/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.5
 * 
 * Orchestrates the transformation of raw WCVP data into the FloraCatalog database.
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

// --- SQL QUERIES ---

const Q_POPULATE = `
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
    ON CONFLICT (wcvp_id) DO NOTHING;
`;

const Q_LINK_PARENTS = `
    UPDATE app_taxa child
    SET parent_id = parent.id
    FROM app_taxa parent
    WHERE child.parent_plant_name_id = parent.wcvp_id
      AND child.parent_id IS NULL;
`;

const Q_HIERARCHY = `
    WITH RECURSIVE tax_tree AS (
        SELECT id, parent_id, text2ltree('root') || text2ltree(replace(id::text, '-', '_')) as path
        FROM app_taxa WHERE parent_id IS NULL
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

const Q_COUNTS = `
    WITH counts AS (
       SELECT parent_id, COUNT(*) as cnt
       FROM app_taxa WHERE parent_id IS NOT NULL GROUP BY parent_id
    )
    UPDATE app_taxa SET descendant_count = counts.cnt
    FROM counts WHERE app_taxa.id = counts.parent_id;
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
        log("Found existing cleaned CSV. Skipping conversion.");
        return;
    }
    const rawName = 'wcvp_names.csv'; 
    let rawPath = path.join(DIR_INPUT, rawName);
    if (!fs.existsSync(rawPath)) rawPath = rawName; 

    if (!fs.existsSync(rawPath)) {
        throw new Error(`Could not find '${rawName}'. Place in 'data/input/' or root.`);
    }

    const pyCmd = getPythonCommand();
    log(`Converting '${rawPath}' to Clean CSV (using ${pyCmd})...`);
    try {
        const tempRaw = 'wcvp_names.csv';
        if (path.resolve(rawPath) !== path.resolve(tempRaw)) fs.copyFileSync(rawPath, tempRaw);
        execSync(`${pyCmd} scripts/convert_wcvp.py.txt`, { stdio: 'inherit' });
        if (fs.existsSync('wcvp_names_clean.csv')) {
            fs.renameSync('wcvp_names_clean.csv', FILE_CLEAN_CSV);
            if (path.resolve(rawPath) !== path.resolve(tempRaw)) fs.unlinkSync(tempRaw);
        } else {
            throw new Error("Python script did not generate wcvp_names_clean.csv");
        }
    } catch (e) { throw new Error(`Python conversion failed: ${e.message}`); }
}

async function stepBuildSchema(client) {
    log(`Applying Schema (${FILE_SCHEMA})...`);
    if (!fs.existsSync(FILE_SCHEMA)) throw new Error(`Schema file not found at ${FILE_SCHEMA}`);
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await client.query(sql);
}

async function stepImportStream(client) {
    log("Streaming CSV to 'wcvp_import'...");
    if (!fs.existsSync(FILE_CLEAN_CSV)) throw new Error("Clean CSV not found.");
    const copyQuery = `COPY wcvp_import FROM STDIN WITH (FORMAT csv, HEADER true)`;
    const stream = client.query(copyFrom(copyQuery));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);
    try { await pipeline(fileStream, stream); log("Stream complete."); } 
    catch (e) { throw new Error(`Streaming failed: ${e.message}`); }
}

async function stepPopulate(client) {
    log("Populating 'app_taxa'...");
    await client.query(Q_POPULATE);
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
    log("Linking Parents...");
    await client.query(Q_LINK_PARENTS);
}

async function stepHierarchy(client) {
    log("Calculating Hierarchy Paths (Ltree)... this can take 2-5 minutes...");
    await client.query('SET statement_timeout = 0');
    await client.query(Q_HIERARCHY);
}

async function stepCounts(client) {
    log("Calculating Descendant Counts...");
    await client.query(Q_COUNTS);
}

async function stepOptimize(client) {
    log(`Applying Performance Tuning (${FILE_OPTIMIZE})...`);
    if (!fs.existsSync(FILE_OPTIMIZE)) {
        log("Optimization file not found, skipping performance tuning.");
        return;
    }
    const sql = fs.readFileSync(FILE_OPTIMIZE, 'utf-8');
    await client.query(sql);
}

// --- MAIN LOOP ---

async function main() {
    console.log("\n🌿 FLORA CATALOG - DATABASE AUTOMATION v2.5 🌿\n");
    
    let dbUrl = process.env.DATABASE_URL;
    let finalConfig;

    if (dbUrl) {
        log("Using DATABASE_URL from .env");
        finalConfig = { 
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false },
            family: 4 
        };
    } else {
        let dbPass = process.env.DATABASE_PASSWORD;
        if (!dbPass) {
            console.log(`ℹ️ DATABASE_URL not found in .env.`);
            console.log(`Defaulting to project ID: ${DEFAULT_PROJECT_ID}`);
            dbPass = (await askQuestion("🔑 Enter Database Password: ")).trim();
        }
        
        if (!dbPass) { err("Password required."); process.exit(1); }

        // Construct parameters explicitly
        const host = 'aws-0-us-west-2.pooler.supabase.com';
        const user = `postgres.${DEFAULT_PROJECT_ID}`;
        
        console.log(`\n📡 Connection Parameters:`);
        console.log(`   Host: ${host}`);
        console.log(`   User: ${user}`);
        console.log(`   Port: 6543 (Transaction Pooler)`);
        console.log(`   SSL: Enabled (Required)\n`);

        finalConfig = {
            user: user,
            host: host,
            database: 'postgres',
            password: dbPass,
            port: 6543,
            ssl: { rejectUnauthorized: false }, // CRITICAL for Supabase
            family: 4 
        };
    }

    const client = new pg.Client(finalConfig);

    try {
        await client.connect();
        log("✅ Connected Successfully to Supabase.");
        
        const steps = [
            { id: '1', name: "Prepare Data (Python)", fn: () => stepPrepareData() },
            { id: '2', name: "Build Schema (Reset DB)", fn: () => stepBuildSchema(client) },
            { id: '3', name: "Import CSV (Stream)", fn: () => stepImportStream(client) },
            { id: '4', name: "Populate App Taxa", fn: () => stepPopulate(client) },
            { id: '5', name: "Build Structural Indexes", fn: () => stepIndexes(client) },
            { id: '6', name: "Link Parents", fn: () => stepLink(client) },
            { id: '7', name: "Build Hierarchy (Ltree)", fn: () => stepHierarchy(client) },
            { id: '8', name: "Calc Counts", fn: () => stepCounts(client) },
            { id: '9', name: "Performance Tuning (Optimized Indices)", fn: () => stepOptimize(client) }
        ];

        console.log("\n--- MENU ---");
        console.log("A. Run ALL Steps (Fresh Build)");
        steps.forEach(s => console.log(`${s.id}. Resume from Step ${s.id}: ${s.name}`));
        console.log("Q. Quit");

        const choice = (await askQuestion("\nSelect option: ")).toUpperCase();
        if (choice === 'Q') process.exit(0);

        let startIndex = choice === 'A' ? 0 : steps.findIndex(s => s.id === choice);
        if (startIndex === -1) { err("Invalid selection"); process.exit(1); }

        for (let i = startIndex; i < steps.length; i++) {
            const step = steps[i];
            console.log(`\n--- [Step ${step.id}/${steps.length}] ${step.name} ---`);
            await step.fn();
        }
        log("\n✅ Automation Complete!");
    } catch (e) { 
        err(`Connection or build failed: ${e.message}`);
        if (e.message.includes('authentication failed')) {
            console.log("\n💡 TROUBLESHOOTING TIP:");
            console.log("1. Ensure you are using your DATABASE password, not your Supabase dashboard login password.");
            console.log("2. Check that your project ID matches: " + DEFAULT_PROJECT_ID);
            console.log("3. Reset your Database Password in Supabase Dashboard -> Settings -> Database.\n");
        } else if (e.message.includes('EHOSTUNREACH') || e.message.includes('ETIMEDOUT')) {
            console.log("\n💡 TROUBLESHOOTING TIP:");
            console.log("Connection timed out. You might be behind a firewall that blocks port 6543.");
            console.log("Current host: aws-0-us-west-2.pooler.supabase.com.\n");
        }
    } finally { 
        try { await client.end(); } catch(e) {} 
    }
}
main();
