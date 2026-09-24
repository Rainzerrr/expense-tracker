import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppServicesProvider } from '@/app/AppServices';
import type { AppServices } from '@/app/bootstrap';
import { routes } from '@/app/routes';
import { createTestServices } from '@/test/services';

const HEADER = 'Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde';
const card = (
  started: string,
  description: string,
  amount: string,
  state = 'TERMINÉ',
  type = 'Paiement par carte',
) =>
  `${type},Valeur actuelle,${started},${state === 'EN ATTENTE' ? '' : started},${description},${amount},0.00,EUR,${state},10.00`;
const statement = (...lines: string[]) => [HEADER, ...lines].join('\n');
const csvFile = (text: string, name = 'account-statement.csv') =>
  new File([text], name, { type: 'text/csv' });

const SAMPLE = statement(
  card('2026-09-05 12:00:00', 'Continente', '-20.00'),
  card('2026-09-06 12:00:00', 'Nobby', '-21.00'),
  card('2026-09-07 12:00:00', 'Metro de Lisboa', '-1.80'),
  card(
    '2026-09-01 18:33:36',
    'Recharge sur Apple Pay via *5583',
    '200.00',
    'TERMINÉ',
    'Ajout de fonds',
  ),
  card('2026-09-21 19:33:52', 'Gelato', '-4.50', 'EN ATTENTE'),
  card('2026-08-29 17:33:22', 'Amazon', '-40.46'),
);

async function renderSettings(services?: AppServices) {
  const app = services ?? (await createTestServices());
  render(
    <AppServicesProvider value={app}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/settings'] })} />
    </AppServicesProvider>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Réglages' });
  return { app, user: userEvent.setup() };
}

const card_ = () => screen.getByRole('region', { name: 'Importer un relevé Revolut' });
const fileInput = () => card_().querySelector<HTMLInputElement>('input[type="file"]')!;
const merchantSelect = (name: string) =>
  within(card_()).getByRole('combobox', { name: `Catégorie pour ${name}` });

describe('importer un relevé Revolut', () => {
  it('montre l’aperçu : combien à importer, ce qui est ignoré et pourquoi', async () => {
    const { user } = await renderSettings();
    await user.upload(fileInput(), csvFile(SAMPLE));

    expect(await within(card_()).findByText(/3 dépenses à importer, pour/)).toHaveTextContent(
      '42,80',
    );
    expect(
      within(card_()).getByText("1 commerçant à classer avant d'importer."),
    ).toBeInTheDocument();

    const skipped = within(card_()).getByText('Opérations ignorées').parentElement!;
    expect(skipped).toHaveTextContent('En attente : 1');
    expect(skipped).toHaveTextContent('Recharges du compte : 1');
    expect(skipped).toHaveTextContent('En dehors de ton séjour : 1');
  });

  it('propose une catégorie aux commerçants connus, et « À classer » aux autres', async () => {
    const { user } = await renderSettings();
    await user.upload(fileInput(), csvFile(SAMPLE));
    await within(card_()).findByText(/3 dépenses à importer/);

    expect(merchantSelect('Continente')).toHaveValue('s:groceries.staples');
    expect(merchantSelect('Metro de Lisboa')).toHaveValue('s:transport.singleTickets');
    expect(merchantSelect('Nobby')).toHaveValue('');
    expect(within(card_()).getByText('À classer')).toBeInTheDocument();
  });

  it('bloque l’import tant qu’un commerçant n’est pas classé', async () => {
    const { user } = await renderSettings();
    await user.upload(fileInput(), csvFile(SAMPLE));
    await within(card_()).findByText(/3 dépenses à importer/);
    expect(within(card_()).getByRole('button', { name: /^Importer 2 dépenses/ })).toBeDisabled();

    await user.selectOptions(merchantSelect('Nobby'), 'c:shopping');
    expect(
      within(card_()).getByText('Tout est classé. Vérifie les catégories, puis importe.'),
    ).toBeInTheDocument();
    expect(within(card_()).getByRole('button', { name: /^Importer 3 dépenses/ })).toBeEnabled();
  });

  it('importe, retient le choix, et les dépenses apparaissent dans l’historique avec leur commerçant', async () => {
    const { user, app } = await renderSettings();
    await user.upload(fileInput(), csvFile(SAMPLE));
    await within(card_()).findByText(/3 dépenses à importer/);
    await user.selectOptions(merchantSelect('Nobby'), 'c:shopping');
    await user.click(within(card_()).getByRole('button', { name: /^Importer 3 dépenses/ }));

    expect(await within(card_()).findByText('Import terminé')).toBeInTheDocument();
    expect(within(card_()).getByText(/3 dépenses importées \(42,80/)).toBeInTheDocument();
    expect(
      within(card_()).getByText('1 règle retenue pour la prochaine fois.'),
    ).toBeInTheDocument();
    expect(await app.expenses.findByMonth('2026-09' as never)).toHaveLength(3);

    await user.click(within(card_()).getByRole('link', { name: "Voir dans l'historique" }));
    const row = await screen.findByRole('link', { name: /Nobby · Shopping/ });
    expect(row).toHaveTextContent('−21,00 €');
  });

  it('un commerçant mis sur « Ne pas importer » n’est pas importé', async () => {
    const { user, app } = await renderSettings();
    await user.upload(fileInput(), csvFile(SAMPLE));
    await within(card_()).findByText(/3 dépenses à importer/);
    await user.selectOptions(merchantSelect('Nobby'), 'skip');
    await user.click(within(card_()).getByRole('button', { name: /^Importer 2 dépenses/ }));
    await within(card_()).findByText('Import terminé');
    expect((await app.expenses.findByMonth('2026-09' as never)).map((e) => e.note).sort()).toEqual([
      'Continente',
      'Metro de Lisboa',
    ]);
  });

  it('réimporter le même relevé signale que tout est déjà là', async () => {
    const { user } = await renderSettings();
    await user.upload(fileInput(), csvFile(SAMPLE));
    await within(card_()).findByText(/3 dépenses à importer/);
    await user.selectOptions(merchantSelect('Nobby'), 'c:shopping');
    await user.click(within(card_()).getByRole('button', { name: /^Importer 3 dépenses/ }));
    await within(card_()).findByText('Import terminé');

    await user.upload(fileInput(), csvFile(SAMPLE));
    expect(
      await within(card_()).findByText('Aucune nouvelle dépense à importer.'),
    ).toBeInTheDocument();
    expect(within(card_()).getByText('Déjà importées : 3')).toBeInTheDocument();
    expect(within(card_()).queryByRole('button', { name: /^Importer/ })).not.toBeInTheDocument();
  });

  it('permet d’annuler après l’aperçu, sans rien écrire', async () => {
    const { user, app } = await renderSettings();
    await user.upload(fileInput(), csvFile(SAMPLE));
    await user.click(await within(card_()).findByRole('button', { name: 'Annuler' }));
    expect(within(card_()).queryByText("Ce que l'import va faire")).not.toBeInTheDocument();
    expect(await app.expenses.isEmpty()).toBe(true);
  });

  it.each([
    ['un fichier qui n’est pas un relevé', 'Date;Montant\n2026-09-20;12,40', 'notAStatement'],
    ['un fichier vide', '', 'empty'],
  ])('refuse %s avec un message clair', async (_label, content) => {
    const { user } = await renderSettings();
    await user.upload(fileInput(), csvFile(content));
    expect(await within(card_()).findByRole('alert')).toHaveTextContent(/relevé|vide/);
  });

  it('en mode démo, l’import est désactivé', async () => {
    const demo = await createTestServices({ search: '?demo=1' });
    await renderSettings(demo);
    expect(within(card_()).getByRole('button', { name: 'Choisir le relevé (CSV)' })).toBeDisabled();
  });

  it('un virement n’est pas importé tant que l’utilisateur ne l’a pas décidé, mais peut l’être (loyer)', async () => {
    const { user, app } = await renderSettings();
    await user.upload(
      fileInput(),
      csvFile(
        statement(card('2026-09-03 10:00:00', 'Loyer Lisboa', '-420.00', 'TERMINÉ', 'Virement')),
      ),
    );
    await within(card_()).findByText('Catégorie de chaque commerçant');
    expect(merchantSelect('Loyer Lisboa')).toHaveValue('skip');

    await user.selectOptions(merchantSelect('Loyer Lisboa'), 's:housing.rent');
    await user.click(within(card_()).getByRole('button', { name: /^Importer 1 dépense/ }));
    await waitFor(async () =>
      expect(await app.expenses.findByMonth('2026-09' as never)).toHaveLength(1),
    );
    expect((await app.expenses.findByMonth('2026-09' as never))[0]).toMatchObject({
      amount: 42000,
      categoryId: 'housing',
      subcategoryId: 'housing.rent',
    });
  });
});
