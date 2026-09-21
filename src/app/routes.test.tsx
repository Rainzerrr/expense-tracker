import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createTestServices } from '@/test/services';
import { AppServicesProvider } from './AppServices';
import { routes } from './routes';

async function renderAt(path: string, options: { search?: string } = {}) {
  const services = await createTestServices(options);
  render(
    <AppServicesProvider value={services}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AppServicesProvider>,
  );
}

describe('navigation', () => {
  it('affiche le dashboard du mois en cours par défaut', async () => {
    await renderAt('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' }),
    ).toBeInTheDocument();
  });

  it('propose la navigation mobile et la barre latérale (le CSS en masque une)', async () => {
    await renderAt('/history');
    await screen.findByRole('heading', { level: 1, name: 'Historique' });
    expect(screen.getAllByRole('navigation', { name: 'Navigation principale' })).toHaveLength(2);
  });

  it("marque l'écran courant avec aria-current", async () => {
    await renderAt('/history');
    await screen.findByRole('heading', { level: 1, name: 'Historique' });
    const links = screen.getAllByRole('link', { name: 'Historique', current: 'page' });
    expect(links.length).toBeGreaterThan(0);
  });

  it('ouvre la saisie depuis le bouton « + » de la barre du bas', async () => {
    await renderAt('/');
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
    // Dans le DOM, la barre latérale précède la barre du bas.
    const bottomNav = screen.getAllByRole('navigation', { name: 'Navigation principale' }).at(-1);
    await userEvent.click(
      within(bottomNav as HTMLElement).getByRole('link', { name: 'Ajouter une dépense' }),
    );
    expect(await screen.findByRole('dialog', { name: 'Nouvelle dépense' })).toBeInTheDocument();
  });

  it('affiche le bandeau de démo uniquement en mode démo, avec un lien pour le quitter', async () => {
    await renderAt('/', { search: '?demo=1' });
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
    expect(screen.getByText(/Mode démo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quitter la démo' })).toHaveAttribute(
      'href',
      '/?demo=0',
    );
  });

  it('n’affiche pas le bandeau en usage réel', async () => {
    await renderAt('/');
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
    expect(screen.queryByText(/Mode démo/)).not.toBeInTheDocument();
  });
});
