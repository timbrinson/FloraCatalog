
/**
 * AUTOMATED DATABASE BUILDER (CLI)
 * 
 * Orchestrates the transformation of raw WCVP data into the FloraCatalog database.
 * 
 * Features:
 * - Interactive Menu (Granular Resume)
 * - Secure Password Handling (Env or Prompt)
 * - Python Integration (Data Cleaning)
 * - Postgres Streaming (pg-copy-streams)
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

const DEFAULT_PROJECT_ID = "uzzayfueabppzpwunvlf"; // Default Project
const DIR_DATA = 'data';
const DIR_INPUT = path.join(DIR_DATA, 'input');
const DIR_TEMP = path.join(DIR_DATA, 'temp');
const FILE_CLEAN_CSV = path.join(DIR_TEMP, 'wcvp_names_clean.csv');
const FILE_SCHEMA = 'wcvp_schema.txt';

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
    ON CONFLICT (id) DO NOTHING;
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
const err = (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);

const askQuestion = (query, hidden = false) => {
    const rl = readline.createInterface({ 
        input: process.stdin, 
        output: process.stdout,
        terminal: true
    });
    
    return new Promise(resolve => {
        rl.question(query, ans => {
            rl.close();
            resolve(ans);
        });
    });
};

const ensureDirs = () => {
    if (!fs.existsSync(DIR_INPUT)) fs.mkdirSync(DIR_INPUT, { recursive: true });
    if (!fs.existsSync(DIR_TEMP)) fs.mkdirSync(DIR_TEMP, { recursive: true });
};

// Helper to determine python command (python vs python3)
const getPythonCommand = () => {
    try {
        // Try python3 first (standard on mac/linux)
        execSync('python3 --version', { stdio: 'ignore' });
        return 'python3';
    } catch (e) {
        // Fallback to python (windows or older systems)
        return 'python';
    }
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
    if (!fs.existsSync(rawPath)) rawPath = rawName; // Check root

    if (!fs.existsSync(rawPath)) {
        throw new Error(`Could not find '${rawName}'. Please place the unzipped WCVP file in 'data/input/' or project root.`);
    }

    const pyCmd = getPythonCommand();
    log(`Converting '${rawPath}' to Clean CSV (using ${pyCmd})...`);
    
    try {
        // We use a temporary copy in root because the python script expects it there
        const tempRaw = 'wcvp_names.csv';
        if (path.resolve(rawPath) !== path.resolve(tempRaw)) {
            fs.copyFileSync(rawPath, tempRaw);
        }
        
        execSync(`${pyCmd} scripts/convert_wcvp.py.txt`, { stdio: 'inherit' });
        
        if (fs.existsSync('wcvp_names_clean.csv')) {
            fs.renameSync('wcvp_names_clean.csv', FILE_CLEAN_CSV);
            // Cleanup root temp file if we created it
            if (path.resolve(rawPath) !== path.resolve(tempRaw)) {
                fs.unlinkSync(tempRaw);
            }
        } else {
            throw new Error("Python script did not generate wcvp_names_clean.csv");
        }
    } catch (e) {
        throw new Error(`Python conversion failed. ${e.message}`);
    }
}

async function stepBuildSchema(client) {
    log("Applying Schema (wcvp_schema.txt)...");
    if (!fs.existsSync(FILE_SCHEMA)) throw new Error("Schema file not found");
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await client.query(sql);
}

async function stepImportStream(client) {
    log("Streaming CSV to 'wcvp_import' (COPY command)...");
    
    if (!fs.existsSync(FILE_CLEAN_CSV)) throw new Error("Clean CSV not found.");

    // The header is crucial for COPY
    const copyQuery = `COPY wcvp_import FROM STDIN WITH (FORMAT csv, HEADER true)`;
    
    const stream = client.query(copyFrom(copyQuery));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);

    try {
        await pipeline(fileStream, stream);
        log("Stream complete.");
    } catch (e) {
        throw new Error(`Streaming failed: ${e.message}`);
    }
}

async function stepPopulate(client) {
    log("Populating 'app_taxa' (UUID Generation)...");
    await client.query(Q_POPULATE);
}

async function stepIndexes(client) {
    log("Building Indexes...");
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_app_taxa_wcvp_id ON app_taxa(wcvp_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent_plant_name_id ON app_taxa(parent_plant_name_id);
        CREATE INDEX IF NOT EXISTS idx_app_taxa_parent_id ON app_taxa(parent_id);
    `);
}

async function stepLink(client) {
    log("Linking Parents (Adjacency)...");
    await client.query(Q_LINK_PARENTS);
}

async function stepHierarchy(client) {
    log("Calculating Hierarchy Paths (Ltree)... this takes time...");
    await client.query(Q_HIERARCHY);
}

async function stepCounts(client) {
    log("Calculating Descendant Counts...");
    await client.query(Q_COUNTS);
}

// --- MAIN LOOP ---

async function main() {
    console.log("\n🌿 FLORA CATALOG - DATABASE AUTOMATION 🌿\n");

    let dbUrl = process.env.DATABASE_URL;
    let dbPass = process.env.DATABASE_PASSWORD;

    // Security: Handle missing URL or Password
    if (!dbUrl) {
        // Construct default URL using provided Project ID
        if (!dbPass) {
            console.log(`ℹ️  DATABASE_URL not found in .env. Using default project: ${DEFAULT_PROJECT_ID}`);
            dbPass = await askQuestion("🔑 Enter Database Password: ", true);
        }
        
        if (dbPass) {
            // Construct the standard Supabase direct connection string
            // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
            const encodedPass = encodeURIComponent(dbPass);
            dbUrl = `postgresql://postgres:${encodedPass}@db.${DEFAULT_PROJECT_ID}.supabase.co:5432/postgres`;
        } else {
            err("Password required to continue.");
            process.exit(1);
        }
    } else if (!dbPass) {
        // URL exists but password might be missing (not embedded)
        const hasEmbedPass = dbUrl.includes('postgres://') && dbUrl.split('@')[0].includes(':');
        if (!hasEmbedPass) {
            dbPass = await askQuestion("🔑 Enter Database Password (for existing URL): ", true);
            if (!dbPass) {
                err("Password required.");
                process.exit(1);
            }
        }
    }

    const clientConfig = {
        connectionString: dbUrl,
    };
    if (dbPass && !dbUrl.includes(encodeURIComponent(dbPass))) {
        clientConfig.password = dbPass;
    }

    const client = new pg.Client(clientConfig);

    try {
        await client.connect();
        log("Connected to Database.");

        const steps = [
            { id: '1', name: "Prepare Data (Python)", fn: () => stepPrepareData() },
            { id: '2', name: "Build Schema (Reset DB)", fn: () => stepBuildSchema(client) },
            { id: '3', name: "Import CSV (Stream)", fn: () => stepImportStream(client) },
            { id: '4', name: "Populate App Taxa", fn: () => stepPopulate(client) },
            { id: '5', name: "Build Indexes", fn: () => stepIndexes(client) },
            { id: '6', name: "Link Parents", fn: () => stepLink(client) },
            { id: '7', name: "Build Hierarchy (Ltree)", fn: () => stepHierarchy(client) },
            { id: '8', name: "Calc Counts", fn: () => stepCounts(client) }
        ];

        console.log("\n--- MENU ---");
        console.log("A. Run ALL Steps (Fresh Build)");
        steps.forEach(s => console.log(`${s.id}. Resume from Step ${s.id}: ${s.name}`));
        console.log("Q. Quit");

        const choice = await askQuestion("\nSelect option: ");
        const normChoice = choice.toUpperCase();

        if (normChoice === 'Q') process.exit(0);

        let startIndex = 0;
        if (normChoice === 'A') {
            startIndex = 0;
        } else {
            const stepIdx = steps.findIndex(s => s.id === normChoice);
            if (stepIdx === -1) {
                err("Invalid selection");
                process.exit(1);
            }
            startIndex = stepIdx;
        }

        // Execute Sequence
        for (let i = startIndex; i < steps.length; i++) {
            const step = steps[i];
            console.log(`\n--- [Step ${step.id}/${steps.length}] ${step.name} ---`);
            await step.fn();
        }

        log("\n✅ Automation Complete!");

    } catch (e) {
        err(e.message);
        if (e.stack) console.error(e.stack);
    } finally {
        await client.end();
    }
}

main();
