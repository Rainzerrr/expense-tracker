import { DEMO_STORAGE_KEY, resolveDemoMode } from './demoMode';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe('resolveDemoMode', () => {
  it('est désactivé par défaut', () => {
    expect(resolveDemoMode('', fakeStorage())).toBe(false);
  });

  it('?demo=1 active la démo et la mémorise pour la session', () => {
    const storage = fakeStorage();
    expect(resolveDemoMode('?demo=1', storage)).toBe(true);
    // Après navigation, le paramètre a disparu de l'URL mais la démo reste active.
    expect(resolveDemoMode('', storage)).toBe(true);
  });

  it('?demo=0 quitte la démo', () => {
    const storage = fakeStorage({ [DEMO_STORAGE_KEY]: '1' });
    expect(resolveDemoMode('?demo=0', storage)).toBe(false);
    expect(resolveDemoMode('', storage)).toBe(false);
  });

  it('ignore les autres paramètres et valeurs', () => {
    expect(resolveDemoMode('?demo=yes&x=1', fakeStorage())).toBe(false);
  });

  it('fonctionne sans stockage (navigation privée)', () => {
    expect(resolveDemoMode('?demo=1', null)).toBe(true);
    expect(resolveDemoMode('', null)).toBe(false);
  });

  it('ne plante pas si le stockage lève une exception', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqué');
      },
      setItem: () => {
        throw new Error('bloqué');
      },
      removeItem: () => {
        throw new Error('bloqué');
      },
    };
    expect(resolveDemoMode('?demo=1', broken)).toBe(true);
    expect(resolveDemoMode('', broken)).toBe(false);
  });
});
