import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
const config = JSON.parse(await fs.readFile('.scratch/d-work-mode-20261008/oracle-input.json', 'utf8')) as {
    root: string;
    output: string;
};
const root = path.resolve(config.root), output = config.output, sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
if (!root.includes(path.join('.scratch', 'c-search-20261007', 'library')) && !root.includes(path.join('.scratch', 'd-work-mode-20261008', 'library')))
    throw Error('ORACLE_SCOPE_DENIED');
const db = new Database(path.join(root, '.dam/library.sqlite'), { readonly: true, fileMustExist: true });
const result: {
    version: number;
    tables: Record<string, {
        count: number;
        sha256: string;
    }>;
    files: Record<string, string>;
    media?: unknown;
    retrieval?: {active: string; vectors: number; vectorsSha256: string; jobs: number; jobsSha256: string};
} = { version: Number(db.pragma('user_version', { simple: true })), tables: {}, files: {} };
try {
    const names = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {
        name: string;
    }[];
    for (const { name } of names) {
        if (!/^(assets|asset_tags|asset_lifecycle|capture_requests|asset_candidates|promotion_links|basic_analysis_.+|independent_tag_.+|background_analysis_.+|background_ocr_.+|asset_image_vectors|asset_retrieval_.+|retrieval_.+|work_sets|work_set_members|work_media_state|work_reference_frames)$/.test(name))
            continue;
        const rows = db.prepare('SELECT * FROM "' + name + '" ORDER BY 1,2').all();
        result.tables[name] = { count: rows.length, sha256: sha(JSON.stringify(rows)) };
    }
    if (result.version >= 15)
        result.media = db.prepare('SELECT id,asset_id,source_generation,requested_ticks,actual_ticks,time_base,position,note,png_sha256,method,transform,active FROM work_reference_frames ORDER BY id').all();
}
finally {
    db.close();
}
const registry = JSON.parse(await fs.readFile(path.join(root, '.dam/.dam-asset-retrieval.json'), 'utf8')) as {canonical: string};
if (!/^asset-vectors-[a-f0-9-]{36}\.sqlite$/.test(registry.canonical)) throw Error('ORACLE_RETRIEVAL_SCOPE_DENIED');
const vectorsDb = new Database(path.join(root, '.dam', registry.canonical), {readonly: true, fileMustExist: true});
try {
    if (vectorsDb.pragma('integrity_check', {simple: true}) !== 'ok') throw Error('ORACLE_RETRIEVAL_INTEGRITY');
    const vectors = vectorsDb.prepare('SELECT * FROM vectors ORDER BY space,id,view').all();
    const jobs = vectorsDb.prepare('SELECT * FROM jobs ORDER BY id').all();
    result.retrieval = {active: String(vectorsDb.prepare("SELECT value FROM meta WHERE key='active'").pluck().get()),
        vectors: vectors.length, vectorsSha256: sha(JSON.stringify(vectors)), jobs: jobs.length, jobsSha256: sha(JSON.stringify(jobs))};
} finally {vectorsDb.close();}
async function readRole(role: string, depth = 0): Promise<void> {
    if (depth > 4)
        throw Error('ORACLE_ROLE_DEPTH');
    const directory = path.join(root, role);
    for (const file of await fs.readdir(directory, { withFileTypes: true })) {
        if (file.isSymbolicLink())
            throw Error('ORACLE_ROLE_CHANGED');
        const relative = role + '/' + file.name;
        if (file.isDirectory())
            await readRole(relative, depth + 1);
        else if (file.isFile())
            result.files[relative] = sha(await fs.readFile(path.join(root, relative)));
        else
            throw Error('ORACLE_ROLE_CHANGED');
    }
}
for (const role of ['Originals', '.dam/required-previews'])
    await readRole(role);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ version: result.version, tables: result.tables, files: Object.keys(result.files).length }) + '\n');
