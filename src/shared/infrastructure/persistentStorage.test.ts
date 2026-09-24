import { getStorageProtection, requestPersistentStorage } from './persistentStorage';

function mockStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
}
afterEach(() => mockStorage(undefined));

describe('requestPersistentStorage', () => {
  it('demande la protection et rapporte qu’elle est accordée', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persisted: async () => false, persist });
    expect(await requestPersistentStorage()).toBe('protected');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('rapporte un refus sans lever d’erreur', async () => {
    mockStorage({ persisted: async () => false, persist: async () => false });
    expect(await requestPersistentStorage()).toBe('unprotected');
  });

  it('ne redemande pas quand la protection est déjà accordée', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persisted: async () => true, persist });
    expect(await requestPersistentStorage()).toBe('protected');
    expect(persist).not.toHaveBeenCalled();
  });

  it('reste silencieux quand le navigateur ne sait pas faire', async () => {
    mockStorage(undefined);
    expect(await requestPersistentStorage()).toBe('unknown');
  });

  it('avale une exception du navigateur (navigation privée, stockage bloqué)', async () => {
    mockStorage({
      persisted: async () => {
        throw new Error('bloqué');
      },
    });
    expect(await requestPersistentStorage()).toBe('unknown');
    expect(await getStorageProtection()).toBe('unknown');
  });
});

describe('getStorageProtection', () => {
  it('lit l’état sans le modifier', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persisted: async () => false, persist });
    expect(await getStorageProtection()).toBe('unprotected');
    expect(persist).not.toHaveBeenCalled();
  });
});
