import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppServicesProvider } from '@/app/AppServices';
import { routes } from '@/app/routes';
import { createTestServices } from '@/test/services';

async function renderDashboard(options: { search?: string; now?: Date; path?: string } = {}) {
  const services = await createTestServices(options);
  render(
    <AppServicesProvider value={services}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [options.path ?? '/'] })}
      />
    </AppServicesProvider>,
  );
  return services;
}

// Les chiffres de ces tests sont ceux des maquettes (jour 20 sur 30, 970 € dont 420 € de loyer).
describe('dashboard au 20 septembre 2026 (démo)', () => {
  beforeEach(async () => {
    await renderDashboard({ search: '?demo=1' });
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
  });

  it('affiche le total, la moyenne hors logement et la projection de fin de mois', async () => {
    const summary = await screen.findByRole('region', { name: 'Projection fin de mois' });
    expect(summary).toHaveTextContent('Dépensé en septembre');
    expect(summary).toHaveTextContent('970,00 €');
    expect(summary).toHaveTextContent('Jour 20 sur 30');
    expect(summary).toHaveTextContent('27,50 €');
    expect(summary).toHaveTextContent('hors logement');
    expect(summary).toHaveTextContent('≈ 1 245 €');
    expect(summary).toHaveTextContent('10 jours restants');
    expect(summary).toHaveTextContent('13 % du séjour écoulé');
  });

  it('répartit les dépenses par catégorie, le logement en tête', async () => {
    const breakdown = await screen.findByRole('region', { name: "Où part l'argent" });
    const [first] = within(breakdown).getAllByRole('listitem');
    expect(first).toHaveTextContent('Logement');
    expect(first).toHaveTextContent('420 €');
    // Au centre du donut : le total hors loyer.
    expect(breakdown).toHaveTextContent('hors loyer');
    expect(breakdown).toHaveTextContent('550 €');
  });

  it('décrit la courbe : 550 € au jour 20, ≈ 825 € projetés', async () => {
    expect(
      await screen.findByRole('img', {
        name: /Cumul des dépenses hors logement : 550\s€ au jour 20, projeté à 825\s€ en fin de mois/,
      }),
    ).toBeInTheDocument();
  });

  it('liste les dernières dépenses, la plus récente d’abord', async () => {
    const recent = await screen.findByRole('region', { name: 'Dernières dépenses' });
    const rows = within(recent).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent('Viande');
    expect(rows[0]).toHaveTextContent("Courses · Aujourd'hui");
    expect(rows[0]).toHaveTextContent('−12,40 €');
    expect(rows[1]).toHaveTextContent('Hier');
  });

  it('n’offre aucun mois de plus : septembre est à la fois le premier et le mois en cours', async () => {
    expect(await screen.findByRole('button', { name: 'Mois précédent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mois suivant' })).toBeDisabled();
  });

  it('ouvre le panneau de saisie sans quitter le dashboard', async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Nouvelle dépense' }));
    expect(await screen.findByRole('dialog', { name: 'Nouvelle dépense' })).toBeInTheDocument();
  });
});

describe('navigation entre les mois', () => {
  it('remonte au mois précédent puis redescend', async () => {
    const user = userEvent.setup();
    await renderDashboard({ search: '?demo=1', now: new Date('2026-10-05T12:00:00Z') });
    await screen.findByRole('heading', { level: 1, name: 'Octobre 2026' });
    expect(screen.getByRole('button', { name: 'Mois suivant' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
    // Septembre est fini : plus de projection, le mois est terminé.
    const summary = await screen.findByRole('region', { name: 'Projection fin de mois' });
    expect(summary).toHaveTextContent('Mois terminé');
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Mois suivant' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Octobre 2026' }),
    ).toBeInTheDocument();
  });

  it('retombe sur le mois en cours quand le mois demandé est hors séjour', async () => {
    await renderDashboard({ path: '/?month=2030-01' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' }),
    ).toBeInTheDocument();
  });
});

describe('dashboard sans aucune dépense (usage réel, premier lancement)', () => {
  it('reste lisible : totaux à zéro et invitation à saisir', async () => {
    await renderDashboard();
    const summary = await screen.findByRole('region', { name: 'Projection fin de mois' });
    expect(summary).toHaveTextContent('0,00 €');
    expect(await screen.findByText('Aucune dépense ce mois-ci')).toBeInTheDocument();
  });

  it('le budget par défaut affiche 0 € dépensé sur chaque ligne', async () => {
    await renderDashboard();
    const budget = await screen.findByRole('region', { name: 'Budget du mois' });
    expect(budget).toHaveTextContent('0,00 € sur 1 000,00 €');
    expect(budget).toHaveTextContent('0,00 € sur 400,00 €');
    expect(budget).toHaveTextContent('0,00 € sur 1 400,00 €');
  });
});

// Chiffres exacts du jeu de démo au 20 septembre 2026 : 420 € de loyer, 341,70 € courses + activités, 970 € au total.
describe('budget du mois (démo, 20 septembre 2026)', () => {
  it('affiche les trois lignes avec ce qu’il reste, sans dépassement', async () => {
    await renderDashboard({ search: '?demo=1' });
    const budget = await screen.findByRole('region', { name: 'Budget du mois' });

    expect(budget).toHaveTextContent('Logement');
    expect(budget).toHaveTextContent('420,00 € sur 1 000,00 €');
    expect(budget).toHaveTextContent('il reste 580,00 €');

    expect(budget).toHaveTextContent('Courses + Activités');
    expect(budget).toHaveTextContent('341,70 € sur 400,00 €');
    expect(budget).toHaveTextContent('il reste 58,30 €');

    expect(budget).toHaveTextContent('Total du mois');
    expect(budget).toHaveTextContent('970,00 € sur 1 400,00 €');
    expect(budget).toHaveTextContent('il reste 430,00 €');

    expect(within(budget).queryByText(/dépassé/)).not.toBeInTheDocument();
  });

  it('mène au réglage du budget', async () => {
    const user = userEvent.setup();
    await renderDashboard({ search: '?demo=1' });
    const budget = await screen.findByRole('region', { name: 'Budget du mois' });
    await user.click(within(budget).getByRole('link', { name: 'Régler' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Réglages' })).toBeInTheDocument();
  });

  it('signale un dépassement du budget souple sans alarmer, et un dépassement du total comme le vrai risque', async () => {
    const services = await renderDashboard({ search: '?demo=1' });
    // On pousse les courses + activités et le total au-delà de l'objectif.
    await services.budget.set({
      housingCents: 100000 as never,
      flexCents: 1000 as never,
      totalCents: 10000 as never,
      updatedAt: '2026-09-01T00:00:00.000Z' as never,
    });
    const budget = await screen.findByRole('region', { name: 'Budget du mois' });

    expect(await within(budget).findByText(/dépassé de 331,70 €/)).toBeInTheDocument();
    expect(within(budget).getByText(/objectif souple/)).toBeInTheDocument();
    expect(within(budget).getByText(/dépassé de 870,00 €/)).toBeInTheDocument();
  });
});
