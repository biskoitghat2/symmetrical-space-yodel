/**
 * ServerDatabase: bridges the browser frontend to a local Express+SQLite server.
 * Same interface as @tauri-apps/plugin-sql — drop-in replacement for server mode.
 * The server injects window.__HESABFLOW_SERVER=true to activate this path.
 */
export class ServerDatabase {
  async execute(sql: string, params: unknown[] = []) {
    const res = await fetch('/api/db/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? 'DB execute failed');
    }
    return res.json(); // { rowsAffected, lastInsertId }
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await fetch('/api/db/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? 'DB select failed');
    }
    const data = await res.json();
    return data.rows as T[];
  }
}
