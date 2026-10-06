import { SyncError } from '../domain/SyncServer';
import type { PushResult, RemoteSnapshot, SyncServer } from '../domain/SyncServer';
import type { SyncCode } from '../domain/syncCode';

export const SYNC_ENDPOINT = '/api/sync';

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

function failureOf(status: number): SyncError {
  if (status === 401) return new SyncError('unauthorized');
  if (status === 429) return new SyncError('tooManyRequests');
  return new SyncError('unavailable');
}

/** Client HTTP de `/api/sync` (voir `api/sync.ts`). `fetch` injectable : les tests y branchent le vrai handler. */
export class HttpSyncServer implements SyncServer {
  constructor(private readonly fetchImpl: Fetch = (input, init) => fetch(input, init)) {}

  private async request(code: SyncCode, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchImpl(SYNC_ENDPOINT, {
        ...init,
        cache: 'no-store',
        headers: { ...init.headers, Authorization: `Bearer ${code}` },
      });
    } catch {
      // fetch ne rejette que sans réseau (ou serveur injoignable).
      throw new SyncError('offline');
    }
  }

  async pull(code: SyncCode): Promise<RemoteSnapshot> {
    const response = await this.request(code, { method: 'GET' });
    if (response.status !== 200 && response.status !== 204) throw failureOf(response.status);
    const rev = Number(response.headers.get('X-Rev') ?? 0);
    return { rev, text: response.status === 204 ? null : await response.text() };
  }

  async push(code: SyncCode, baseRev: number, text: string): Promise<PushResult> {
    const response = await this.request(code, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Base-Rev': String(baseRev) },
      body: text,
    });
    if (response.status === 409) return { ok: false, reason: 'conflict' };
    if (!response.ok) throw failureOf(response.status);
    return { ok: true, rev: Number(response.headers.get('X-Rev') ?? 0) };
  }
}
