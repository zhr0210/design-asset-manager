import type Database from 'better-sqlite3';
import { CREATE_CAPTURE_REQUESTS_TABLE, CREATE_ASSET_CANDIDATES_TABLE, CREATE_PROMOTION_LINKS_TABLE } from '../db/schema';
import { applyBasicAnalysisSchema } from '../background-analysis/basic-analysis.schema';
import { BACKGROUND_ANALYSIS_SQL } from '../background-analysis/background-analysis.schema';
export const WORK_MEDIA_BACKGROUND_SQL = BACKGROUND_ANALYSIS_SQL.replace('AND policy.singleton=1', "AND r.source_format IN ('png','jpeg','webp') AND policy.singleton=1");
export const WORK_MEDIA_SQL = `
CREATE TABLE work_media_state (
 set_id TEXT NOT NULL REFERENCES work_sets(id) ON DELETE CASCADE,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision>0),source_generation TEXT NOT NULL,
 source_url TEXT NOT NULL,position_ticks INTEGER NOT NULL CHECK(position_ticks>=0),
 selected_frame_id TEXT,duration_ticks INTEGER,
 PRIMARY KEY(set_id,asset_id)
);
CREATE TABLE work_reference_frames (
 id TEXT PRIMARY KEY,set_id TEXT NOT NULL REFERENCES work_sets(id) ON DELETE CASCADE,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 request_id TEXT NOT NULL,source_generation TEXT NOT NULL,requested_ticks INTEGER NOT NULL CHECK(requested_ticks>=0),
 actual_ticks INTEGER NOT NULL CHECK(actual_ticks>=requested_ticks),time_base INTEGER NOT NULL CHECK(time_base=10000000),
 position INTEGER NOT NULL CHECK(position>=0),note TEXT NOT NULL,png_ref TEXT NOT NULL,png_bytes INTEGER NOT NULL CHECK(png_bytes>0),
 png_sha256 TEXT NOT NULL CHECK(length(png_sha256)=64),created_at TEXT NOT NULL,method TEXT NOT NULL,transform TEXT NOT NULL,
 active INTEGER NOT NULL CHECK(active IN (0,1)),UNIQUE(set_id,asset_id,request_id)
);
CREATE INDEX work_reference_frames_scope ON work_reference_frames(set_id,asset_id,active,position);
CREATE TRIGGER work_reference_frame_evidence_immutable BEFORE UPDATE OF id,set_id,asset_id,request_id,source_generation,requested_ticks,actual_ticks,time_base,png_ref,png_bytes,png_sha256,created_at,method,transform ON work_reference_frames
BEGIN SELECT RAISE(ABORT,'REFERENCE_FRAME_EVIDENCE_IMMUTABLE'); END;
`;
/** Called only inside the Host's backed-up schema-maintenance transaction.
 * Rebuild the three connected capture tables in dependency order, keeping all
 * existing rows. Foreign keys remain enabled throughout. No source backfill. */
export function applyWorkMediaSchema(db: Database.Database) {
    if (Number(db.pragma('user_version', { simple: true })) === 15)
        return;
    applyBasicAnalysisSchema(db);
    const tables = ['capture_requests', 'asset_candidates', 'promotion_links'];
    const objects = db.prepare("SELECT sql FROM sqlite_schema WHERE type IN ('index','trigger') AND tbl_name IN ('capture_requests','asset_candidates','promotion_links') AND sql IS NOT NULL").all() as Array<{
        sql: string;
    }>;
    for (const row of db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as Array<{
        name: string;
    }>) {
        const keys = db.prepare('PRAGMA foreign_key_list("' + row.name.replace(/"/g, '""') + '")').all() as Array<{
            table: string;
        }>;
        if (!tables.includes(row.name) && keys.some(key => tables.includes(key.table)))
            throw Error('视频升级遇到未支持的第三方表，原库保持不变。');
    }
    for (const name of tables)
        db.exec(`CREATE TEMP TABLE dam_media_${name} AS SELECT * FROM ${name}`);
    for (const name of [...tables].reverse())
        db.exec(`DROP TABLE ${name}`);
    db.exec(CREATE_CAPTURE_REQUESTS_TABLE.replace("('jpeg', 'png', 'webp')", "('jpeg', 'png', 'webp', 'mp4')"));
    db.exec(CREATE_ASSET_CANDIDATES_TABLE);
    db.exec(CREATE_PROMOTION_LINKS_TABLE);
    for (const name of tables) {
        db.exec(`INSERT INTO ${name} SELECT * FROM temp.dam_media_${name}`);
        db.exec(`DROP TABLE temp.dam_media_${name}`);
    }
    for (const object of objects)
        db.exec(object.sql);
    const enroll = (db.prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name='background_analysis_enroll'").get() as {
        sql: string;
    }).sql;
    db.exec('DROP TRIGGER background_analysis_enroll');
    db.exec(enroll.replace('AND policy.singleton=1', "AND r.source_format IN ('png','jpeg','webp') AND policy.singleton=1"));
    db.exec(WORK_MEDIA_SQL);
    if ((db.pragma('foreign_key_check') as unknown[]).length)
        throw Error('视频升级未通过关联检查，修改已回滚。');
    db.pragma('user_version=15');
}
