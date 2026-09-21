import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppServicesProvider } from '@/app/AppServices';
import { routes } from '@/app/routes';
import { createTestServices } from '@/test/services';

async function renderApp(path: string, options: { search?: string } = { search: '?demo=1' }) {
  const services = await createTestServices(options);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppServicesProvider value={services}>
      <RouterProvider router={router} />
    </AppServicesProvider>,
  );
  return { services, router, user: userEvent.setup() };
}

const focusHeading = () => screen.findByRole('heading', { level: 1, name: 'Focus' });

// Démo au 20 septembre 2026 : « viande » = 5 achats (13,10 · 14,50 · 15,20 · 8,60 · 12,40 €) = 63,80 €.
describe('« Mes focus » sur le dashboard', () => {
  it('affiche les focus épinglés avec leur total et leur rythme', async () => {
    await renderApp('/');
    const section = await screen.findByRole('region', { name: 'Mes focus' });
    const cards = within(section).getAllByRole('link', { name: /€/ });
    expect(cards).toHaveLength(3);

    const meat = within(section).getByRole('link', { name: /Viande/ });
    expect(meat).toHaveTextContent('Courses › Viande');
    expect(meat).toHaveTextContent('63,80 €');
    expect(meat).toHaveTextContent('≈ 22 € par semaine'); // 63,80 ÷ 20 jours × 7
    expect(within(section).getByRole('link', { name: /Transport/ })).toHaveTextContent(
      'Catégorie entière',
    );
  });

  it('propose de gérer les focus', async () => {
    const { user } = await renderApp('/');
    await user.click(await screen.findByRole('link', { name: 'Gérer' }));
    expect(await screen.findByRole('dialog', { name: 'Mes focus' })).toBeInTheDocument();
  });

  it('invite à épingler un premier focus quand il n’y en a aucun', async () => {
    await renderApp('/', {});
    expect(await screen.findByText('Aucun focus')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajouter un focus' })).toBeInTheDocument();
  });

  it('ouvre le détail d’un focus', async () => {
    const { user } = await renderApp('/');
    const section = await screen.findByRole('region', { name: 'Mes focus' });
    await user.click(within(section).getByRole('link', { name: /Viande/ }));
    await focusHeading();
    expect(await screen.findByText('soit 7 % de tes dépenses de septembre')).toBeInTheDocument();
  });
});

describe('page Focus', () => {
  it('affiche le premier focus quand l’adresse n’en précise pas, sans rediriger', async () => {
    const { router } = await renderApp('/focus');
    await focusHeading();
    expect(await screen.findByRole('region', { name: 'Courses › Viande' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/focus');
    expect(screen.getByText('Septembre 2026')).toBeInTheDocument();
    const switcher = screen.getByRole('navigation', { name: 'Mes focus' });
    expect(within(switcher).getByRole('link', { name: 'Viande' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('résume le focus : total, part du mois, rythme, achats, panier moyen', async () => {
    await renderApp('/focus');
    const summary = await screen.findByRole('region', { name: 'Courses › Viande' });
    expect(summary).toHaveTextContent('63,80 €');
    expect(summary).toHaveTextContent('soit 7 % de tes dépenses de septembre'); // 63,80 ÷ 970
    expect(summary).toHaveTextContent('≈ 22 €');
    expect(summary).toHaveTextContent('par semaine');
    expect(summary).toHaveTextContent('5');
    expect(summary).toHaveTextContent('achats');
    expect(summary).toHaveTextContent('12,76 €'); // 63,80 ÷ 5
    expect(summary).toHaveTextContent('panier moyen');
  });

  it('montre semaine par semaine, la semaine en cours à part', async () => {
    await renderApp('/focus');
    const weekly = await screen.findByRole('region', { name: 'Semaine par semaine' });
    const weeks = within(weekly).getAllByRole('listitem');
    expect(weeks).toHaveLength(3);
    expect(weeks[0]).toHaveTextContent('13 €'); // 13,10
    expect(weeks[0]).toHaveTextContent('1–7 sept.');
    expect(weeks[1]).toHaveTextContent('30 €'); // 14,50 + 15,20 = 29,70
    expect(weeks[1]).toHaveTextContent('8–14 sept.');
    expect(weeks[2]).toHaveTextContent('21 €'); // 8,60 + 12,40
    expect(weeks[2]).toHaveTextContent('15–21, en cours');
  });

  it('compare une sous-catégorie au reste de sa catégorie', async () => {
    await renderApp('/focus');
    const card = await screen.findByRole('region', { name: 'Dans tes courses' });
    expect(within(card).getByText('Viande')).toBeInTheDocument();
    expect(within(card).getByText('Le reste')).toBeInTheDocument();
    expect(card).toHaveTextContent('au total ce mois-ci');
  });

  it('liste les trois dernières entrées et mène à l’historique filtré', async () => {
    await renderApp('/focus');
    const entries = await screen.findByRole('region', { name: 'Dernières entrées' });
    const rows = within(entries).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Aujourd'hui");
    expect(rows[0]).toHaveTextContent('dim. 20 sept.');
    expect(rows[0]).toHaveTextContent('−12,40 €');
    expect(rows[1]).toHaveTextContent('Mercredi');
    const all = within(entries).getByRole('link', { name: 'Voir les 5 entrées' });
    expect(all).toHaveAttribute('href', '/history?month=2026-09&q=Viande');
  });

  it('passe d’un focus à l’autre avec le sélecteur', async () => {
    const { user } = await renderApp('/focus');
    const switcher = await screen.findByRole('navigation', { name: 'Mes focus' });
    expect(within(switcher).getByRole('link', { name: 'Viande' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(switcher).getByRole('link', { name: 'Transport' }));
    const summary = await screen.findByRole('region', { name: 'Catégorie entière' });
    expect(summary).toHaveTextContent('66,90 €'); // 40,00 + 8,90 + 11,80 + 6,20
    expect(within(switcher).getByRole('link', { name: 'Transport' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Une catégorie se lit par sous-catégorie.
    expect(
      await screen.findByRole('region', { name: 'Répartition par sous-catégorie' }),
    ).toBeInTheDocument();
  });

  it('propose « + Nouveau » pour épingler un focus', async () => {
    const { user } = await renderApp('/focus');
    await user.click(await screen.findByRole('link', { name: 'Nouveau' }));
    expect(await screen.findByRole('dialog', { name: 'Mes focus' })).toBeInTheDocument();
  });

  it('revient au dashboard avec le bouton retour', async () => {
    const { user } = await renderApp('/focus');
    await user.click(await screen.findByRole('link', { name: 'Retour au tableau de bord' }));
    expect(await screen.findByRole('region', { name: 'Mes focus' })).toBeInTheDocument();
  });

  it('affiche le premier focus quand celui de l’adresse n’existe pas (ou plus)', async () => {
    await renderApp('/focus/inconnu');
    expect(await screen.findByRole('region', { name: 'Courses › Viande' })).toBeInTheDocument();
  });

  it('sans focus, invite à en ajouter un', async () => {
    const { user } = await renderApp('/focus', {});
    expect(await screen.findByText('Aucun focus épinglé')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ajouter un focus' }));
    expect(await screen.findByRole('dialog', { name: 'Mes focus' })).toBeInTheDocument();
  });
});

describe('gérer les focus', () => {
  async function openManager() {
    const app = await renderApp('/?focus=manage');
    const dialog = await screen.findByRole('dialog', { name: 'Mes focus' });
    return { ...app, dialog };
  }
  const names = (dialog: HTMLElement) =>
    within(dialog)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.focus-manager__name')?.textContent);

  it('liste les focus épinglés dans l’ordre', async () => {
    const { dialog } = await openManager();
    expect(names(dialog)).toEqual(['Viande', 'Transport', 'Restaurants']);
  });

  it('réordonne : monter, descendre, et bloque aux extrémités', async () => {
    const { dialog, user } = await openManager();
    expect(within(dialog).getByRole('button', { name: 'Monter Viande' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Descendre Restaurants' })).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: 'Monter Restaurants' }));
    await waitFor(() => expect(names(dialog)).toEqual(['Viande', 'Restaurants', 'Transport']));

    await user.click(within(dialog).getByRole('button', { name: 'Descendre Viande' }));
    await waitFor(() => expect(names(dialog)).toEqual(['Restaurants', 'Viande', 'Transport']));
  });

  it('garde le focus clavier sur le bouton après un déplacement', async () => {
    const { dialog, user } = await openManager();
    await user.click(within(dialog).getByRole('button', { name: 'Monter Restaurants' }));
    await waitFor(() => expect(names(dialog)[1]).toBe('Restaurants'));
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Monter Restaurants' })).toHaveFocus(),
    );
  });

  it('retire un focus', async () => {
    const { dialog, user } = await openManager();
    await user.click(within(dialog).getByRole('button', { name: 'Retirer Transport' }));
    await waitFor(() => expect(names(dialog)).toEqual(['Viande', 'Restaurants']));
  });

  it('épingle un tag, une catégorie ou une sous-catégorie, sans doublon', async () => {
    const { dialog, user } = await openManager();

    await user.click(within(dialog).getByRole('radio', { name: 'Tag' }));
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Élément à suivre' }),
      '#avec-amis',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Épingler' }));
    await waitFor(() => expect(names(dialog)).toContain('#avec-amis'));

    // Ce qui est déjà épinglé n'est plus proposé.
    const options = within(
      within(dialog).getByRole('combobox', { name: 'Élément à suivre' }),
    ).getAllByRole('option');
    expect(options.map((o) => o.textContent)).not.toContain('#avec-amis');

    await user.click(within(dialog).getByRole('radio', { name: 'Catégorie' }));
    const categories = within(
      within(dialog).getByRole('combobox', { name: 'Élément à suivre' }),
    ).getAllByRole('option');
    expect(categories.map((o) => o.textContent)).not.toContain('Transport'); // déjà épinglé
    expect(categories.map((o) => o.textContent)).toContain('Santé');
  });

  it('désactive « Épingler » tant que rien n’est choisi', async () => {
    const { dialog } = await openManager();
    expect(within(dialog).getByRole('button', { name: 'Épingler' })).toBeDisabled();
  });

  it('un focus retiré disparaît du dashboard', async () => {
    const { dialog, user } = await openManager();
    await user.click(within(dialog).getByRole('button', { name: 'Retirer Transport' }));
    await user.click(within(dialog).getByRole('button', { name: 'Terminé' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const section = await screen.findByRole('region', { name: 'Mes focus' });
    expect(within(section).queryByRole('link', { name: /Transport/ })).not.toBeInTheDocument();
  });
});
