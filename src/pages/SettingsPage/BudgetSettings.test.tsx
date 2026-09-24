import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppServicesProvider } from '@/app/AppServices';
import type { AppServices } from '@/app/bootstrap';
import { routes } from '@/app/routes';
import { DEFAULT_BUDGET } from '@/domains/budget';
import { createTestServices } from '@/test/services';

async function renderSettings(services?: AppServices) {
  const app = services ?? (await createTestServices());
  render(
    <AppServicesProvider value={app}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/settings'] })} />
    </AppServicesProvider>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Réglages' });
  // Le budget se charge de façon asynchrone (Dexie) : on attend qu'il soit monté.
  await screen.findByRole('region', { name: 'Budget mensuel' });
  return { app, user: userEvent.setup() };
}

const budgetCard = () => screen.getByRole('region', { name: 'Budget mensuel' });
const field = (label: string) => within(budgetCard()).getByRole('textbox', { name: label });

describe('régler le budget mensuel', () => {
  it('préremplit les trois champs avec le budget par défaut (1 000 € / 400 € / 1 400 €)', async () => {
    await renderSettings();
    expect(field('Logement')).toHaveValue('1000');
    expect(field('Courses + Activités (ensemble)')).toHaveValue('400');
    expect(field("Total du mois (l'objectif à ne pas dépasser)")).toHaveValue('1400');
  });

  it('enregistre les nouveaux montants', async () => {
    const { user, app } = await renderSettings();
    await user.clear(field('Logement'));
    await user.type(field('Logement'), '950');
    await user.click(within(budgetCard()).getByRole('button', { name: 'Enregistrer' }));

    expect(await within(budgetCard()).findByText('Budget enregistré.')).toBeInTheDocument();
    const budget = await app.budget.get();
    expect(budget).toMatchObject({ housingCents: 95000, flexCents: 40000, totalCents: 140000 });
  });

  it('refuse un montant illisible, sans rien enregistrer', async () => {
    const { user, app } = await renderSettings();
    await user.clear(field('Logement'));
    await user.type(field('Logement'), 'abc');
    await user.click(within(budgetCard()).getByRole('button', { name: 'Enregistrer' }));

    expect(await within(budgetCard()).findByRole('alert')).toHaveTextContent(
      'Vérifie les montants',
    );
    expect(await app.budget.get()).toMatchObject(DEFAULT_BUDGET);
  });

  it('reflète sur le dashboard ce qui vient d’être réglé', async () => {
    const { user, app } = await renderSettings();
    await user.clear(field("Total du mois (l'objectif à ne pas dépasser)"));
    await user.type(field("Total du mois (l'objectif à ne pas dépasser)"), '1200');
    await user.click(within(budgetCard()).getByRole('button', { name: 'Enregistrer' }));
    await within(budgetCard()).findByText('Budget enregistré.');

    render(
      <AppServicesProvider value={app}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />
      </AppServicesProvider>,
    );
    const budget = await screen.findByRole('region', { name: 'Budget du mois' });
    expect(budget).toHaveTextContent('0,00 € sur 1 200,00 €');
  });
});
