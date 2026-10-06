/**
 * Fonction Vercel `/api/sync` : un « coffre » par code secret, qui contient le dernier fichier de
 * sauvegarde complet (format `lisboa-expenses`). Le serveur ne fusionne rien : chaque appareil
 * récupère le fichier, le fusionne avec sa base, puis renvoie le résultat.
 *
 * - `GET`  → 200 + le fichier (en-tête `X-Rev`), ou 204 si le coffre est vide (`X-Rev: 0`).
 * - `PUT`  → corps = le fichier, en-tête `X-Base-Rev` = la révision lue. 409 si un autre appareil a
 *   écrit entre-temps (l'appelant recommence : lecture, fusion, envoi). Jamais d'écrasement aveugle.
 *
 * Le code secret voyage dans `Authorization: Bearer …` et n'est jamais stocké : le coffre est
 * identifié par son empreinte SHA-256.
 *
 * Ce fichier n'importe rien : il sert tel quel à Vercel, au serveur de dev (vite.config.ts) et aux tests.
 */

/** 28 caractères base32 Crockford (140 bits), sans séparateurs. Voir `domains/sync/domain/syncCode.ts`. */
const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{28}$/;
/** Une sauvegarde de séjour pèse moins d'1 Mo : au-delà, ce n'en est pas une. */
export const MAX_BODY_BYTES = 4_000_000;
export const MAX_REQUESTS_PER_MINUTE = 60;

export interface VaultSnapshot {
  rev: number;
  data: string | null;
}

/** Stockage des coffres. En production : Upstash Redis. En dev et en test : en mémoire. */
export interface VaultStore {
  read(vault: string): Promise<VaultSnapshot>;
  /** Écrit seulement si la révision actuelle vaut `expectedRev` (comparaison et écriture atomiques). */
  write(vault: string, expectedRev: number, data: string): Promise<{ ok: boolean; rev: number }>;
  /** Compte une requête de ce client, et renvoie le nombre de requêtes de la minute en cours. */
  hit(client: string): Promise<number>;
}

const respond = (
  status: number,
  body: string | null = null,
  headers: Record<string, string> = {},
) =>
  new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(body !== null ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      ...headers,
    },
  });

const error = (status: number, code: string, headers: Record<string, string> = {}) =>
  respond(status, JSON.stringify({ error: code }), headers);

async function vaultIdOf(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`lisboa:${code}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function clientOf(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/** Contrôle léger : le serveur ne stocke qu'un fichier de sauvegarde de cette application. */
function looksLikeBackup(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { format?: unknown }).format === 'lisboa-expenses'
    );
  } catch {
    return false;
  }
}

export function createSyncHandler(store: VaultStore) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'PUT') {
      return error(405, 'methodNotAllowed', { Allow: 'GET, PUT' });
    }
    const code = request.headers
      .get('authorization')
      ?.match(/^Bearer (.+)$/)?.[1]
      ?.trim();
    if (!code || !CODE_PATTERN.test(code)) return error(401, 'unauthorized');

    if ((await store.hit(clientOf(request))) > MAX_REQUESTS_PER_MINUTE) {
      return error(429, 'tooManyRequests', { 'Retry-After': '60' });
    }

    const vault = await vaultIdOf(code);

    if (request.method === 'GET') {
      const { rev, data } = await store.read(vault);
      return data === null
        ? respond(204, null, { 'X-Rev': String(rev) })
        : respond(200, data, { 'X-Rev': String(rev) });
    }

    const baseRevHeader = request.headers.get('x-base-rev');
    const baseRev = Number(baseRevHeader);
    if (!baseRevHeader || !Number.isInteger(baseRev) || baseRev < 0) {
      return error(400, 'missingBaseRev');
    }
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return error(413, 'tooLarge');
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return error(413, 'tooLarge');
    if (!looksLikeBackup(body)) return error(400, 'notABackup');

    const result = await store.write(vault, baseRev, body);
    return result.ok
      ? respond(200, JSON.stringify({ rev: result.rev }), { 'X-Rev': String(result.rev) })
      : error(409, 'conflict', { 'X-Rev': String(result.rev) });
  };
}

/** Coffres en mémoire : serveur de dev et tests. Perdus à l'arrêt du processus. */
export function memoryVaultStore(): VaultStore {
  const vaults = new Map<string, { rev: number; data: string }>();
  const hits = new Map<string, number>();
  return {
    async read(vault) {
      const entry = vaults.get(vault);
      return entry ? { rev: entry.rev, data: entry.data } : { rev: 0, data: null };
    },
    async write(vault, expectedRev, data) {
      const current = vaults.get(vault)?.rev ?? 0;
      if (current !== expectedRev) return { ok: false, rev: current };
      vaults.set(vault, { rev: current + 1, data });
      return { ok: true, rev: current + 1 };
    },
    async hit(client) {
      const key = `${client}:${Math.floor(Date.now() / 60_000)}`;
      const count = (hits.get(key) ?? 0) + 1;
      hits.set(key, count);
      return count;
    },
  };
}

// Comparaison et écriture en une seule opération côté Redis : deux appareils qui envoient en même
// temps ne peuvent pas s'écraser, le second reçoit un refus (409) et recommence.
const WRITE_IF_REV = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current ~= tonumber(ARGV[1]) then return {0, current} end
redis.call('SET', KEYS[2], ARGV[2])
redis.call('SET', KEYS[1], current + 1)
return {1, current + 1}
`;

/** Upstash Redis par son API REST (aucune dépendance). Variables injectées par l'intégration Vercel. */
export function upstashVaultStore(url: string, token: string): VaultStore {
  async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands.map((command) => command.map(String))),
    });
    if (!response.ok) throw new Error(`Upstash a répondu ${response.status}`);
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    return results.map((entry) => {
      if (entry.error) throw new Error(`Upstash : ${entry.error}`);
      return entry.result;
    });
  }
  const keys = (vault: string) => [`vault:${vault}:rev`, `vault:${vault}:data`] as const;

  return {
    async read(vault) {
      const [values] = await pipeline([['MGET', ...keys(vault)]]);
      const [rev, data] = values as [string | null, string | null];
      return { rev: Number(rev ?? 0), data };
    },
    async write(vault, expectedRev, data) {
      const [result] = await pipeline([
        ['EVAL', WRITE_IF_REV, 2, ...keys(vault), expectedRev, data],
      ]);
      const [ok, rev] = result as [number, number];
      return { ok: ok === 1, rev: Number(rev) };
    },
    async hit(client) {
      const key = `rate:${client}:${Math.floor(Date.now() / 60_000)}`;
      const [count] = await pipeline([
        ['INCR', key],
        ['EXPIRE', key, 120],
      ]);
      return Number(count);
    },
  };
}

function productionHandler(): ((request: Request) => Promise<Response>) | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? createSyncHandler(upstashVaultStore(url, token)) : null;
}

async function handleInProduction(request: Request): Promise<Response> {
  const handle = productionHandler();
  if (!handle) return error(503, 'storageNotConfigured');
  try {
    return await handle(request);
  } catch (cause) {
    // Jamais le code secret dans les journaux : seulement le message d'erreur du stockage.
    console.error('sync: erreur de stockage', cause instanceof Error ? cause.message : cause);
    return error(503, 'storageUnavailable');
  }
}

export const GET = handleInProduction;
export const PUT = handleInProduction;
