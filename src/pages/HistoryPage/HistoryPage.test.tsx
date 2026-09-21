import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppServicesProvider } from '@/app/AppServices';
import { routes } from '@/app/routes';
import { useUndoToast } from '@/app/undoToast';
import { createTestServices } from '@/test/services';

async function renderHistory(path = '/history', options: { now?: Date } = {}) {
  useUndoToast.getState().dismiss();
  const services = await createTestServices({ search: '?demo=1', ...options });
  const user = userEvent.setup();
  render(
    <AppServicesProvider value={services}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AppServicesProvider>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Historique' });
  await screen.findAllByRole('link', { name: /Modifier la dépense :/ });
  return { services, user };
}

const rowLinks = () => screen.getAllByRole('link', { name: /^.*Modifier la dépense :/ });
const search = () => screen.getByRole('searchbox', { name: 'Rechercher une dépense' });

// Données de démo au 20 septembre 2026 : celles des maquettes.
describe('historique (démo, 20 septembre 2026)', () => {
  it('regroupe par jour avec le total du jour, comme la maquette', async () => {
    await renderHistory();
    const today = screen.getByRole('region', { name: "Aujourd'hui · dim. 20 sept." });
    expect(today).toHaveTextContent('12,40 €');

    const yesterday = screen.getByRole('region', { name: 'Hier · sam. 19 sept.' });
    expect(yesterday).toHaveTextContent('24,70 €');
    expect(within(yesterday).getAllByRole('listitem')).toHaveLength(2);

    expect(screen.getByRole('region', { name: 'dim. 13 sept.' })).toHaveTextContent('70,20 €');
  });

  it('affiche le mois et le total', async () => {
    await renderHistory();
    expect(screen.getByText('970,00 € au total')).toBeInTheDocument();
    expect(screen.getByText('Septembre 2026', { selector: 'p' })).toBeInTheDocument();
  });

  it('détaille une ligne : libellé, catégorie, tags, montant', async () => {
    await renderHistory();
    const yesterday = screen.getByRole('region', { name: 'Hier · sam. 19 sept.' });
    const [restaurants] = within(yesterday).getAllByRole('listitem');
    expect(restaurants).toHaveTextContent('Restaurants');
    expect(restaurants).toHaveTextContent('Activités');
    expect(restaurants).toHaveTextContent('#avec-amis');
    expect(restaurants).toHaveTextContent('−18,50 €');
  });

  it('ne montre d’abord que 30 lignes, puis charge les précédentes', async () => {
    const { user } = await renderHistory();
    expect(rowLinks()).toHaveLength(30);
    await user.click(screen.getByRole('button', { name: 'Charger les dépenses précédentes' }));
    expect(rowLinks()).toHaveLength(36);
    expect(
      screen.queryByRole('button', { name: 'Charger les dépenses précédentes' }),
    ).not.toBeInTheDocument();
  });
});

describe('recherche et filtres', () => {
  it('cherche par mot, sans tenir compte des accents ni de la casse', async () => {
    const { user } = await renderHistory();
    await user.type(search(), 'ÉPICERIE');
    expect(rowLinks().length).toBeGreaterThan(0);
    for (const row of rowLinks()) expect(row).toHaveTextContent('Épicerie');
  });

  it('cherche par tag', async () => {
    const { user } = await renderHistory();
    await user.type(search(), '#avec-amis');
    const rows = rowLinks();
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row).toHaveTextContent('#avec-amis');
    expect(await screen.findByRole('status')).toHaveTextContent('2 dépenses');
  });

  it('cherche par montant', async () => {
    const { user } = await renderHistory();
    await user.type(search(), '18,50');
    expect(rowLinks()).toHaveLength(1);
    expect(rowLinks()[0]).toHaveTextContent('Restaurants');
  });

  it('garde les dépenses qui contiennent tous les mots', async () => {
    const { user } = await renderHistory();
    await user.type(search(), 'viande courses');
    for (const row of rowLinks()) expect(row).toHaveTextContent('Viande');
    await user.clear(search());
    await user.type(search(), 'viande transport');
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
  });

  it('filtre par catégorie', async () => {
    const { user } = await renderHistory();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Catégorie' }), 'Transport');
    const rows = rowLinks();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toHaveTextContent('Transport');
  });

  it('filtre par tag', async () => {
    const { user } = await renderHistory();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tag' }), '#soirée-esn');
    expect(rowLinks()).toHaveLength(2);
  });

  it('cumule catégorie et recherche, et le total suit', async () => {
    const { user } = await renderHistory();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Catégorie' }), 'Activités');
    await user.type(search(), 'bars');
    // Bars & soirées : 22,00 € le 7 et 14,00 € le 18 (celui du 25 n'a pas encore eu lieu).
    expect(rowLinks()).toHaveLength(2);
    expect(screen.getByText('36,00 € au total')).toBeInTheDocument();
  });

  it('propose d’effacer les filtres quand rien ne correspond', async () => {
    const { user } = await renderHistory();
    await user.type(search(), 'zzzz');
    expect(await screen.findByText('Aucun résultat')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Effacer les filtres' }));
    expect(search()).toHaveValue('');
    expect(rowLinks().length).toBeGreaterThan(0);
  });

  it('reprend la recherche depuis l’adresse', async () => {
    await renderHistory('/history?q=viande');
    expect(search()).toHaveValue('viande');
    for (const row of rowLinks()) expect(row).toHaveTextContent('Viande');
  });
});

describe('changement de mois', () => {
  it('passe à un autre mois du séjour', async () => {
    const { user } = await renderHistory('/history', { now: new Date('2026-10-05T12:00:00Z') });
    const months = screen.getByRole('combobox', { name: 'Mois' });
    expect(months).toHaveValue('2026-10');
    await user.selectOptions(months, 'Septembre 2026');
    expect(await screen.findByText('Septembre 2026', { selector: 'p' })).toBeInTheDocument();
    expect(rowLinks().length).toBeGreaterThan(0);
  });

  it('n’offre pas les mois à venir', async () => {
    await renderHistory('/history', { now: new Date('2026-10-05T12:00:00Z') });
    const options = within(screen.getByRole('combobox', { name: 'Mois' })).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Septembre 2026', 'Octobre 2026']);
  });
});

describe('modification', () => {
  it('ouvre la dépense dans un panneau, préremplie', async () => {
    const { user } = await renderHistory();
    await user.click(rowLinks()[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Modifier la dépense' });
    expect(within(dialog).getByRole('textbox', { name: 'Montant' })).toHaveValue('12,40');
    expect(within(dialog).getByRole('radio', { name: 'Courses' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Viande' })).toBeChecked();
  });

  it('enregistre les changements, la ligne se met à jour', async () => {
    const { user, services } = await renderHistory();
    await user.click(rowLinks()[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Modifier la dépense' });
    const amount = within(dialog).getByRole('textbox', { name: 'Montant' });
    await user.clear(amount);
    await user.type(amount, '20');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const today = screen.getByRole('region', { name: "Aujourd'hui · dim. 20 sept." });
    expect(await within(today).findByText('−20,00 €')).toBeInTheDocument();

    const [saved] = await services.expenses.findByMonth('2026-09' as never);
    expect(saved).toMatchObject({ amount: 2000, categoryId: 'groceries' });
  });

  it('met en avant la ligne en cours de modification', async () => {
    const { user } = await renderHistory();
    await user.click(rowLinks()[0]!);
    await screen.findByRole('dialog', { name: 'Modifier la dépense' });
    expect(document.querySelectorAll('.expense-list-row--selected')).toHaveLength(1);
  });

  it('ferme le panneau quand la dépense n’existe pas', async () => {
    await renderHistory('/history?edit=inconnue');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('suppression et annulation', () => {
  it('supprime depuis le panneau puis annule', async () => {
    const { user, services } = await renderHistory();
    const todayGroup = () => screen.queryByRole('region', { name: "Aujourd'hui · dim. 20 sept." });
    expect(todayGroup()).toBeInTheDocument();

    await user.click(rowLinks()[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Modifier la dépense' });
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer cette dépense' }));

    expect(await screen.findByText('Dépense supprimée')).toBeInTheDocument();
    await waitFor(() => expect(todayGroup()).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await services.expenses.findByMonth('2026-09' as never)).toHaveLength(35);

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(todayGroup()).toBeInTheDocument());
    expect(await services.expenses.findByMonth('2026-09' as never)).toHaveLength(36);
  });

  it('supprime avec l’action visible de la ligne (alternative au glissement)', async () => {
    const { user } = await renderHistory();
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]!);
    expect(await screen.findByText('Dépense supprimée')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: "Aujourd'hui · dim. 20 sept." }),
      ).not.toBeInTheDocument(),
    );
  });

  it('propose Modifier dans les actions de la ligne', async () => {
    const { user } = await renderHistory();
    await user.click(screen.getAllByRole('link', { name: 'Modifier' })[0]!);
    expect(await screen.findByRole('dialog', { name: 'Modifier la dépense' })).toBeInTheDocument();
  });
});

describe('historique vide', () => {
  it('invite à saisir une première dépense', async () => {
    useUndoToast.getState().dismiss();
    const services = await createTestServices();
    render(
      <AppServicesProvider value={services}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/history'] })} />
      </AppServicesProvider>,
    );
    expect(await screen.findByText('Aucune dépense en septembre')).toBeInTheDocument();
    expect(screen.getByText('0,00 € au total')).toBeInTheDocument();
  });
});
