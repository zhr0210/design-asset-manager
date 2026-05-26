import { getDatabase } from '../db'

export interface DbSite {
  id: string
  name: string
  base_url: string
  search_url_template: string
  requires_auth: number // 1 or 0
  auth_state_path?: string
  auth_status: string
  notes?: string
  created_at: string
  updated_at: string
}

export class SiteService {
  private getDb() {
    return getDatabase()
  }

  public listSites(): DbSite[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM sites ORDER BY name ASC').all() as DbSite[]
  }

  public saveSite(site: Omit<DbSite, 'created_at' | 'updated_at'>): DbSite {
    const db = this.getDb()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT * FROM sites WHERE id = ?').get(site.id) as DbSite | undefined

    if (existing) {
      db.prepare(`
        UPDATE sites
        SET name = ?, base_url = ?, search_url_template = ?, requires_auth = ?, auth_state_path = ?, auth_status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        site.name,
        site.base_url,
        site.search_url_template,
        site.requires_auth,
        site.auth_state_path || null,
        site.auth_status,
        site.notes || null,
        now,
        site.id
      )
      return {
        ...existing,
        ...site,
        updated_at: now
      }
    } else {
      db.prepare(`
        INSERT INTO sites (id, name, base_url, search_url_template, requires_auth, auth_state_path, auth_status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        site.id,
        site.name,
        site.base_url,
        site.search_url_template,
        site.requires_auth,
        site.auth_state_path || null,
        site.auth_status,
        site.notes || null,
        now,
        now
      )
      return {
        ...site,
        created_at: now,
        updated_at: now
      }
    }
  }

  public deleteSite(id: string): void {
    const db = this.getDb()
    db.prepare('DELETE FROM sites WHERE id = ?').run(id)
  }

  public updateSiteStatus(id: string, status: string): void {
    const db = this.getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE sites SET auth_status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
  }

  public updateSiteAuth(id: string, authStatePath: string, status: string): void {
    const db = this.getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE sites SET auth_state_path = ?, auth_status = ?, updated_at = ? WHERE id = ?').run(authStatePath, status, now, id)
  }
}
