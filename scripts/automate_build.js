/**
 * AUTOMATED DATABASE BUILDER (CLI) v2.33.0
 * 
 * Orchestrates the transformation of raw WCVP and WFO data into the FloraCatalog database.
 * v2.33.0: High-Fidelity WFO Backbone (Rank Collapsing + Literal Propagation).
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
const APP_VERSION = 'v2.33.0';

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

// Global Client Reference for Robust Reconnection
let activeClient = null;

async function getClient() {
    if (activeClient) {
        try {
            await activeClient.query('SELECT 1');
            return activeClient;
        } catch (e) {
            log("Existing connection lost. Re-establishing...");
        }
    }

    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        log("Connection details not found in .env.");
        const projId = await askQuestion(`Project ID (Default: ${DEFAULT_PROJECT_ID}): `) || DEFAULT_PROJECT_ID;
        const password = await askQuestion("Database Password: ");
        if (!password) { err("Password required."); process.exit(1); }
        connectionString = `postgresql://postgres.${projId}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`;
    }

    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    
    client.on('error', (e) => {
        if (e.message.includes('terminated unexpectedly') || e.message.includes('Connection terminated')) {
            warn("Database connection terminated by host.");
            activeClient = null; 
        } else {
            err("Database Client Error: " + e.message);
        }
    });

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
            const isConnectionError = e.message.includes('terminated') || e.code === '57P01' || e.code === '08006';
            if (isConnectionError && attempt < retries) {
                warn(`Connection dropped. Retrying segment (${attempt}/${retries})...`);
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
    log("Preparing WCVP Data (Cleaning)...");
    const py = fs.existsSync('scripts/convert_wcvp.py.txt') ? 'python3 scripts/convert_wcvp.py.txt' : null;
    if (!py) throw new Error("Missing scripts/convert_wcvp.py.txt");
    execSync(py, { stdio: 'inherit' });
};

const stepPrepWFO = () => {
    log("Preparing WFO Data (Distill Backbone)...");
    const py = fs.existsSync('scripts/distill_wfo.py.txt') ? 'python3 scripts/distill_wfo.py.txt' : null;
    if (!py) throw new Error("Missing scripts/distill_wfo.py.txt");
    execSync(py, { stdio: 'inherit' });
};

const stepResetDB = async () => {
    log("Resetting Database Schema...");
    const sql = fs.readFileSync(FILE_SCHEMA, 'utf-8');
    await robustQuery(sql);
};

const stepImportWCVP = async () => {
    log("Streaming WCVP Staging (1.4M rows)...");
    if (!fs.existsSync(FILE_CLEAN_CSV)) throw new Error("Run Step 1 first.");
    const client = await getClient();
    const stream = client.query(copyFrom(`COPY wcvp_import FROM STDIN WITH CSV HEADER`));
    const fileStream = fs.createReadStream(FILE_CLEAN_CSV);
    await pipeline(fileStream, stream);
    log("  Import finished.");
};

const stepImportWFO = async () => {
    log("Streaming WFO Staging (Filtered backbone)...");
    if (fs.existsSync(FILE_WFO_IMPORT)) {
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