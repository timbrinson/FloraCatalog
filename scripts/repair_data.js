/**
 * FLORA CATALOG DATA REPAIR UTILITY v1.4.3
 * 
 * Performs high-volume data propagation and recursive count repairs in small batches.
 * v1.4.3: NOWAIT Lock Protection & Lock Diagnostics.
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

// Absolute boundaries to ensure no symbols (+, ×) or hybrids are skipped
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

const log = (msg) => console.log(`\x1b[36m[Repair]\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
const err = (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);

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
    
    client.on('error', (e) => {
        if (e.message.includes('terminated unexpectedly')) {
            warn("Database connection terminated unexpectedly. Please restart the script.");
            process.exit(1);
        }
    });

    await client.connect();
    await client.query("SET statement_timeout = 0");

    log("Starting Data Repair utility v1.4.3...");

    // 1. Structural Fix (Lock-Protected)
    log("Step 1: Checking schema...");
    const colCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'app_taxa' AND column_name = 'order'
    `);

    if (colCheck.rowCount === 0) {
        log("  Column 'order' missing. Attempting to acquire AccessExclusive lock...");
        try {
            // ADR-009: NOWAIT prevents hanging if zombie IO is still saturating the table
            await client.query(`LOCK TABLE app_taxa IN ACCESS EXCLUSIVE MODE NOWAIT`);
            await client.query(`ALTER TABLE app_taxa ADD COLUMN "order" text COLLATE "C"`);
            log("  Column added successfully.");
        } catch (e) {
            if (e.code === '55P03') {
                err("  CRITICAL: Table 'app_taxa' is locked by another process.");
                log("  DIAGNOSTICS: Fetching locker information...");
                const blockers = await client.query(`
                    SELECT pid, state, now() - query_start as duration, query 
                    FROM pg_stat_activity 
                    WHERE pid IN (SELECT pid FROM pg_locks WHERE relation = 'app_taxa'::regclass)
                `);
                if (blockers.rowCount > 0) {
                    blockers.rows.forEach(b => {
                        log(`  - Blocker [PID ${b.pid}]: ${b.state} for ${b.duration}. Query: ${b.query.substring(0, 50)}...`);
                    });
                }
                warn("  ACTION: Reset your Supabase Database Password to force-kill all sessions, then retry.");
                process.exit(1);
            }
            throw e;
        }
    } else {
        log("  Column 'order' already present. Skipping ALTER.");
    }

    log("Step 2: Identifying physical Order records...");
    await client.query(`UPDATE app_taxa SET "order" = taxon_name WHERE taxon_rank = 'Order'`);

    log("Step 3: Linking Orders to Families...");
    await client.query(`
        UPDATE app_taxa f SET "order" = o.taxon_name 
        FROM app_taxa o 
        WHERE f.parent_id = o.id AND f.taxon_rank = 'Family' AND o.taxon_rank = 'Order'
    `);

    // 4. Robust Catch-all Propagation
    log("Step 4: Propagating Order to entire hierarchy (Catch-all Segmented)...");
    for (let pass = 1; pass <= 3; pass++) {
        log(`  --- Propagation Pass ${pass}/3 ---`);
        for (const seg of SEGMENTS) {
            process.stdout.write(`    Processing Segment ${seg.label}... \r`);
            await client.query(`
                UPDATE app_taxa child
                SET "order" = parent."order"
                FROM app_taxa parent
                WHERE child.parent_id = parent.id 
                  AND child."order" IS NULL 
                  AND parent."order" IS NOT NULL
                  AND child.taxon_name >= $1 AND child.taxon_name < $2
            `, [seg.start, seg.end]);
        }
        console.log(`\n    Pass ${pass} complete.`);
    }

    // 5. Pivot to Direct Child Counts
    log("Step 5: Repairing Child Counts (Segmented pass)...");
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

    log("Step 6: Rebuilding indexes and statistics...");
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