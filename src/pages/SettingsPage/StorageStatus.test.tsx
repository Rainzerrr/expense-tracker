import { render, screen } from '@testing-library/react';
import { StorageStatus } from './StorageStatus';

function mockStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
}
afterEach(() => mockStorage(undefined));

describe('StorageStatus', () => {
  it('rassure quand le stockage est protégé', async () => {
    mockStorage({ persisted: async () => true });
    render(<StorageStatus />);
    expect(await screen.findByText(/Protégé : le navigateur s'est engagé/)).toBeInTheDocument();
  });

  it('avertit et conseille d’installer l’app quand il ne l’est pas', async () => {
    mockStorage({ persisted: async () => false });
    render(<StorageStatus />);
    expect(await screen.findByText(/Non protégé/)).toHaveTextContent(
      "Installe-la sur l'écran d'accueil",
    );
  });

  it('dit honnêtement quand le navigateur ne permet pas de savoir', async () => {
    mockStorage(undefined);
    render(<StorageStatus />);
    expect(await screen.findByText(/ne permet pas de vérifier/)).toBeInTheDocument();
  });
});
