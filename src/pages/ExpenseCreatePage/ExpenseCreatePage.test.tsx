import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppServicesProvider } from '@/app/AppServices';
import { routes } from '@/app/routes';
import type { YearMonth } from '@/shared/lib/time';
import { createTestServices } from '@/test/services';

describe('saisie d’une dépense (de bout en bout)', () => {
  it('enregistre la dépense dans la base locale puis revient à l’accueil', async () => {
    const services = await createTestServices();
    const user = userEvent.setup();
    render(
      <AppServicesProvider value={services}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/?new=1'] })} />
      </AppServicesProvider>,
    );

    await screen.findByRole('dialog', { name: 'Nouvelle dépense' });
    for (const key of ['1', '2', 'Virgule', '4', '0']) {
      await user.click(await screen.findByRole('button', { name: key }));
    }
    await user.click(screen.getByRole('radio', { name: 'Courses' }));
    await user.click(screen.getByRole('radio', { name: 'Viande' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    // La fenêtre se ferme, le dashboard (resté affiché derrière) redevient accessible.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const saved = await services.expenses.findByMonth('2026-09' as YearMonth);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      amount: 1240,
      categoryId: 'groceries',
      subcategoryId: 'groceries.meat',
      date: '2026-09-20',
      deletedAt: null,
    });
  });

  it('crée un tag qui reste disponible ensuite', async () => {
    const services = await createTestServices();
    const user = userEvent.setup();
    render(
      <AppServicesProvider value={services}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/?new=1'] })} />
      </AppServicesProvider>,
    );
    await screen.findByRole('dialog', { name: 'Nouvelle dépense' });
    await user.click(await screen.findByRole('button', { name: 'Tag' }));
    await user.type(screen.getByRole('textbox', { name: 'Nouveau tag' }), '#Sortie Plage{Enter}');

    // Le catalogue est « vivant » : le nouveau tag apparaît, déjà coché.
    expect(await screen.findByRole('checkbox', { name: '#sortie-plage' })).toBeChecked();
    expect((await services.catalog.load()).tags.map((t) => t.name)).toContain('sortie-plage');
  });
});
