/**
 * FLORA CATALOG DATA REPAIR UTILITY v1.4.0
 * 
 * Performs high-volume data propagation and recursive count repairs in small batches.
 * v1.4.0: Segmented Count Updates & Symbol-Inclusive Propagation.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

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

const DEFAULT_PROJECT_ID = 'uzzayfueabppzpwunvlf';

// Inclusive boundaries to handle leading symbols like + and ×
const SEGMENTS = [
    { label: "A (incl. symbols)", start: " ", end: "B" },
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
    { label: "W - Z (incl. hybrid symbols)", start: "W", end: "\uffff" }
];

const log = (msg) => console.log(`\x1b[36m[Repair]\x1b[0m ${msg}`);
const askQuestion = (query) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(query, ans => { rl.close(); resolve(ans); });
    });
};

async function main() {
    let connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        log("Connection details not found in .env.");
        const projId = await askQuestion(`Project ID (Default: ${DEFAULT_PROJECT_ID}): `) || DEFAULT_PROJECT_ID;
        const password = await askQuestion("Database Password: ");
        if (!password) { console.error("Password required."); process.exit(1); }
        connectionString = `postgresql://postgres.${projId}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`;
    }

    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    
    // Add connection listener to handle unexpected socket loss
    client.on('error', (e) => {
        if (e.message.includes('terminated unexpectedly')) {
            console.warn("\x1b[33m[WARN]\x1b[0m Database connection terminated unexpectedly. Please restart the script.");
            process.exit(1);
        }
    });

    await client.connect();
    await client.query("SET statement_timeout = 0");

    log("Starting Data Repair utility v1.4.0...");

    // 1. Structural Fix
    log("Step 1: Ensuring 'order' column exists...");
    await client.query(`ALTER TABLE app_taxa ADD COLUMN IF NOT EXISTS "order" text COLLATE "C"`);

    log("Step 2: Identifying physical Order records...");
    await client.query(`UPDATE app_taxa SET "order" = taxon_name WHERE taxon_rank = 'Order'`);

    log("Step 3: Linking Orders to Families...");
    await client.query(`
        UPDATE app_taxa f SET "order" = o.taxon_name 
        FROM app_taxa o 
        WHERE f.parent_id = o.id AND f.taxon_rank = 'Family' AND o.taxon_rank = 'Order'
    `);

    // 4. Batch Propagation to Genera
    log("Step 4: Propagating Order to Genera (Segmented)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`  Processing Segment ${seg.label}... \r`);
        await client.query(`
            UPDATE app_taxa g SET "order" = f."order" FROM app_taxa f 
            WHERE g.parent_id = f.id AND f.taxon_rank = 'Family' AND g."order" IS NULL 
            AND g.taxon_name >= $1 AND g.taxon_name < $2
        `, [seg.start, seg.end]);
    }
    console.log("\n  Genera propagation complete.");

    // 5. Batch Propagation to Species
    log("Step 5: Propagating Order to Species (Segmented)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`  Processing Segment ${seg.label}... \r`);
        await client.query(`
            UPDATE app_taxa s SET "order" = g."order" FROM app_taxa g 
            WHERE s.parent_id = g.id AND s.taxon_rank = 'Genus' AND s."order" IS NULL 
            AND s.taxon_name >= $1 AND s.taxon_name < $2
        `, [seg.start, seg.end]);
    }
    console.log("\n  Species propagation complete.");

    // 6. Batch Propagation to Children
    log("Step 6: Finalizing propagation for Infraspecies/Cultivars...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`  Processing Segment ${seg.label}... \r`);
        await client.query(`
            UPDATE app_taxa i SET "order" = s."order" FROM app_taxa s 
            WHERE i.parent_id = s.id AND i."order" IS NULL 
            AND i.taxon_name >= $1 AND i.taxon_name < $2
        `, [seg.start, seg.end]);
    }
    console.log("\n  Hierarchy propagation complete.");

    // 7. Pivot to Direct Child Counts
    log("Step 7: Repairing Child Counts (Segmented pass)...");
    log("  Resetting all counts to zero (Segmented)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`  Resetting Segment ${seg.label}... \r`);
        await client.query(`UPDATE app_taxa SET descendant_count = 0 WHERE taxon_name >= $1 AND taxon_name < $2`, [seg.start, seg.end]);
    }
    
    log("\n  Calculating immediate children (Segmented pass)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`  Updating Segment ${seg.label}... \r`);
        await client.query(`
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
    log(`\n  Successfully repaired parent record counts.`);

    log("Step 8: Rebuilding indexes and statistics...");
    await client.query(`CREATE INDEX IF NOT EXISTS idx_app_taxa_order_col ON app_taxa("order")`);
    await client.query(`ANALYZE app_taxa`);

    log("\x1b[32mRepair Successful!\x1b[0m Your 'Order' column is populated and child counts are optimized.");
    await client.end();
}

main().catch(err => {
    console.error("\nFATAL ERROR DURING REPAIR:");
    console.error(err);
    process.exit(1);
});