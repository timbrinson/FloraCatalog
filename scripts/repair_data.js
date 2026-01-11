/**
 * FLORA CATALOG DATA REPAIR UTILITY v1.2.0
 * 
 * Performs high-volume data propagation and recursive count repairs in small batches.
 * v1.2.0: Optimized Step 7 with JOIN-based aggregation to prevent stalls.
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
    await client.connect();
    await client.query("SET statement_timeout = 0");

    log("Starting Data Repair utility v1.2.0...");

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
            WHERE s.parent_id = g.id AND g.taxon_rank = 'Genus' AND s."order" IS NULL 
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

    // 7. Optimized Recursive Count Repair
    log("Step 7: Repairing Recursive Descendant Counts (Optimized JOIN logic)...");
    for (const seg of SEGMENTS) {
        process.stdout.write(`  Repairing Counts for Segment ${seg.label}... \r`);
        // Using Aggregated Join instead of Correlated Subquery to prevent 1.4M scan stall
        await client.query(`
            UPDATE app_taxa p
            SET descendant_count = sub.cnt
            FROM (
                SELECT p2.id, count(c2.id) - 1 as cnt
                FROM app_taxa p2
                JOIN app_taxa c2 ON c2.hierarchy_path <@ p2.hierarchy_path
                WHERE p2.taxon_name >= $1 AND p2.taxon_name < $2
                  AND p2.taxon_rank IN ('Order', 'Family', 'Genus', 'Species')
                  AND p2.hierarchy_path IS NOT NULL
                GROUP BY p2.id
            ) sub
            WHERE p.id = sub.id
        `, [seg.start, seg.end]);
    }
    console.log("\n  Count repair complete.");

    log("Step 8: Rebuilding indexes and statistics...");
    await client.query(`CREATE INDEX IF NOT EXISTS idx_app_taxa_order_col ON app_taxa("order")`);
    await client.query(`ANALYZE app_taxa`);

    log("\x1b[32mRepair Successful!\x1b[0m Your 'Order' column is populated and counts are recursive.");
    await client.end();
}

main().catch(err => {
    console.error("\nFATAL ERROR DURING REPAIR:");
    console.error(err);
    process.exit(1);
});