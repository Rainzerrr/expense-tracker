import { createSyncHandler, MAX_REQUESTS_PER_MINUTE, memoryVaultStore } from './sync';

const CODE = 'ABCD1234EFGH5678JKMN9PQRSTVW';
const OTHER_CODE = '0000111122223333444455556666';
const backup = (marker: string) =>
  JSON.stringify({ format: 'lisboa-expenses', version: 1, exportedAt: marker, data: {} });

function setup() {
  const handle = createSyncHandler(memoryVaultStore());
  const call = (method: string, init: { code?: string; body?: string; baseRev?: number } = {}) =>
    handle(
      new Request('http://test/api/sync', {
        method,
        headers: {
          ...(init.code !== undefined ? { Authorization: `Bearer ${init.code}` } : {}),
          ...(init.baseRev !== undefined ? { 'X-Base-Rev': String(init.baseRev) } : {}),
        },
        body: init.body,
      }),
    );
  return { call };
}

describe('/api/sync', () => {
  it('refuse une requête sans code, ou avec un code mal formé', async () => {
    const { call } = setup();
    expect((await call('GET')).status).toBe(401);
    expect((await call('GET', { code: 'trop-court' })).status).toBe(401);
    expect((await call('GET', { code: CODE.toLowerCase() })).status).toBe(401);
  });

  it('répond 204 et la révision 0 pour un coffre vide', async () => {
    const { call } = setup();
    const response = await call('GET', { code: CODE });
    expect(response.status).toBe(204);
    expect(response.headers.get('X-Rev')).toBe('0');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('garde le dernier fichier envoyé, et un coffre par code', async () => {
    const { call } = setup();
    const put = await call('PUT', { code: CODE, baseRev: 0, body: backup('a') });
    expect(put.status).toBe(200);
    expect(put.headers.get('X-Rev')).toBe('1');

    const get = await call('GET', { code: CODE });
    expect(get.status).toBe(200);
    expect(get.headers.get('X-Rev')).toBe('1');
    expect(await get.text()).toBe(backup('a'));
    expect((await call('GET', { code: OTHER_CODE })).status).toBe(204);
  });

  it('refuse d’écraser un envoi plus récent (409 avec la révision actuelle)', async () => {
    const { call } = setup();
    await call('PUT', { code: CODE, baseRev: 0, body: backup('iphone') });
    const late = await call('PUT', { code: CODE, baseRev: 0, body: backup('mac') });
    expect(late.status).toBe(409);
    expect(late.headers.get('X-Rev')).toBe('1');
    expect(await (await call('GET', { code: CODE })).text()).toBe(backup('iphone'));
  });

  it('ne stocke que des fichiers de sauvegarde de l’application', async () => {
    const { call } = setup();
    expect((await call('PUT', { code: CODE, baseRev: 0, body: 'pas du json' })).status).toBe(400);
    expect((await call('PUT', { code: CODE, baseRev: 0, body: '{"format":"autre"}' })).status).toBe(
      400,
    );
    expect((await call('PUT', { code: CODE, body: backup('a') })).status).toBe(400);
    expect((await call('GET', { code: CODE })).status).toBe(204);
  });

  it('limite le nombre de requêtes par minute', async () => {
    const { call } = setup();
    for (let i = 0; i < MAX_REQUESTS_PER_MINUTE; i += 1) await call('GET', { code: CODE });
    const blocked = await call('GET', { code: CODE });
    expect(blocked.status).toBe(429);
  });

  it('n’accepte que GET et PUT', async () => {
    const { call } = setup();
    expect((await call('DELETE', { code: CODE })).status).toBe(405);
  });
});
