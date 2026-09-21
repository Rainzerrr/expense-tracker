import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppServicesProvider } from '@/app/AppServices';
import type { AppServices } from '@/app/bootstrap';
import { routes } from '@/app/routes';
import { parseBackup } from '@/domains/backup';
import { createBackup } from '@/domains/backup';
import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { addExpense } from '@/domains/expenses';
import { createTestServices } from '@/test/services';

const meat = {
  amount: 1240,
  categoryId: 'groceries' as CategoryId,
  subcategoryId: 'groceries.meat' as SubcategoryId,
  tagIds: [],
  date: '2026-09-20',
};

// Fichiers « téléchargés » : jsdom n'a ni Blob URL ni téléchargement, on les intercepte.
let downloads: File[];
beforeEach(() => {
  downloads = [];
  URL.createObjectURL = vi.fn((blob: Blob) => {
    downloads.push(blob as File);
    return 'blob:test';
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

async function renderApp(path: string, services?: AppServices) {
  const app = services ?? (await createTestServices());
  render(
    <AppServicesProvider value={app}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AppServicesProvider>,
  );
  return app;
}

async function renderSettings(services?: AppServices) {
  const app = await renderApp('/settings', services);
  await screen.findByRole('heading', { level: 1, name: 'Réglages' });
  return { app, user: userEvent.setup() };
}

const backupOf = async (app: AppServices) => (await createBackup(app.backup)).text;
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const jsonFile = (text: string, name = 'lisboa.json') =>
  new File([text], name, { type: 'application/json' });

describe('envoyer vers un autre appareil', () => {
  it('télécharge un fichier valide quand le menu Partager n’existe pas', async () => {
    const source = await createTestServices();
    await addExpense(source, meat);
    const { user } = await renderSettings(source);

    await user.click(screen.getByRole('button', { name: 'Envoyer (AirDrop…)' }));

    expect(
      await screen.findByText('Fichier téléchargé : lisboa-2026-09-20.json.'),
    ).toBeInTheDocument();
    expect(downloads).toHaveLength(1);
    const parsed = parseBackup(await downloads[0]!.text());
    expect(parsed.ok && parsed.file.data.expenses).toHaveLength(1);
  });

  it('utilise le menu Partager quand il existe, et note l’envoi', async () => {
    const shared: File[] = [];
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn(async ({ files }: { files: File[] }) => void shared.push(...files)),
    });
    const source = await createTestServices();
    await addExpense(source, meat);
    const { user } = await renderSettings(source);

    await user.click(screen.getByRole('button', { name: 'Envoyer (AirDrop…)' }));

    expect(await screen.findByText('Fichier envoyé.')).toBeInTheDocument();
    expect(shared).toHaveLength(1);
    expect(shared[0]?.name).toBe('lisboa-2026-09-20.json');
    expect(downloads).toHaveLength(0);
    expect(
      await screen.findByText('Dernier envoi ou téléchargement : 20 sept. 2026.'),
    ).toBeInTheDocument();
  });

  it('ne note rien quand on ferme le menu Partager sans envoyer', async () => {
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new DOMException('annulé', 'AbortError');
      }),
    });
    const { user, app } = await renderSettings();

    await user.click(screen.getByRole('button', { name: 'Envoyer (AirDrop…)' }));

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(screen.queryByText('Fichier envoyé.')).not.toBeInTheDocument();
    expect(await app.backup.getMeta('lastExportAt')).toBeNull();
    expect(await screen.findByText("Aucune sauvegarde pour l'instant.")).toBeInTheDocument();
  });

  it('propose aussi le téléchargement direct', async () => {
    const { user } = await renderSettings();
    await user.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));
    expect(await screen.findByText(/Fichier téléchargé : lisboa-.*\.json\./)).toBeInTheDocument();
  });
});

describe('recevoir des données', () => {
  async function receive(source: AppServices, target?: AppServices) {
    const text = await backupOf(source);
    const { user, app } = await renderSettings(target);
    await user.upload(fileInput(), jsonFile(text));
    return { user, app, text };
  }

  it('montre un aperçu, n’écrit rien, puis fusionne à la confirmation', async () => {
    const iphone = await createTestServices({ search: '?demo=1' }); // 36 dépenses au 20 septembre
    const mac = await createTestServices();
    const { user } = await receive(iphone, mac);

    expect(await screen.findByText("Ce que l'import va faire")).toBeInTheDocument();
    expect(screen.getByText('Nouvelles : 36 · Modifiées : 0 · Supprimées : 0')).toBeInTheDocument();
    expect(await mac.expenses.isEmpty()).toBe(true); // rien d'écrit avant la confirmation

    await user.click(screen.getByRole('button', { name: 'Fusionner' }));

    expect(await screen.findByText('Import terminé')).toBeInTheDocument();
    expect(await mac.expenses.findByMonth('2026-09' as never)).toHaveLength(36);
    expect(await screen.findByText('Dernier import : 20 sept. 2026.')).toBeInTheDocument();
  });

  it('permet d’annuler après l’aperçu', async () => {
    const iphone = await createTestServices({ search: '?demo=1' });
    const mac = await createTestServices();
    const { user } = await receive(iphone, mac);
    await user.click(await screen.findByRole('button', { name: 'Annuler' }));
    expect(screen.queryByText("Ce que l'import va faire")).not.toBeInTheDocument();
    expect(await mac.expenses.isEmpty()).toBe(true);
  });

  it('dit que tout est à jour quand il n’y a rien à importer', async () => {
    const iphone = await createTestServices();
    await addExpense(iphone, meat);
    const { text } = await receive(iphone, iphone);
    expect(text).toBeTruthy();
    expect(
      await screen.findByText("Cet appareil est déjà à jour : il n'y a rien à importer."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fusionner' })).not.toBeInTheDocument();
  });

  it.each([
    ['pas du JSON', 'bonjour', "Ce fichier n'est pas lisible : ce n'est pas une sauvegarde."],
    ['un autre JSON', '{"a":1}', 'Ce fichier ne vient pas de cette application.'],
    [
      'un fichier abîmé',
      JSON.stringify({ format: 'lisboa-expenses', version: 1, exportedAt: 'x', data: {} }),
      "Ce fichier est abîmé ou incomplet. Rien n'a été importé.",
    ],
    [
      'une version plus récente',
      JSON.stringify({ format: 'lisboa-expenses', version: 99 }),
      "Ce fichier vient d'une version plus récente de l'application. Mets l'application à jour, puis réessaie.",
    ],
  ])('refuse %s avec un message clair, sans rien modifier', async (_label, content, message) => {
    const mac = await createTestServices();
    await addExpense(mac, meat);
    const { user } = await renderSettings(mac);
    await user.upload(fileInput(), jsonFile(content));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(await mac.expenses.findByMonth('2026-09' as never)).toHaveLength(1);
  });
});

describe('exporter pour un tableur', () => {
  it('télécharge un CSV lisible avec les libellés affichés', async () => {
    const source = await createTestServices();
    await addExpense(source, { ...meat, tagIds: ['avec-amis' as never] });
    const { user } = await renderSettings(source);

    await user.click(await screen.findByRole('button', { name: 'Télécharger le CSV' }));

    expect(
      await screen.findByText('Fichier téléchargé : lisboa-depenses-2026-09-20.csv.'),
    ).toBeInTheDocument();
    // Les octets réels du fichier : la marque UTF-8 (EF BB BF) est ce qui fait lire « é » et « € » à Excel.
    const bytes = new Uint8Array(await downloads[0]!.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = await downloads[0]!.text(); // .text() retire la marque
    expect(csv).toContain('Date;Montant (€);Catégorie;Sous-catégorie;Tags\r\n');
    expect(csv).toContain('2026-09-20;12,40;Courses;Viande;#avec-amis\r\n');
  });
});

describe('mode démo', () => {
  it('désactive l’envoi et l’import : les données de démo ne doivent pas se mélanger aux vraies', async () => {
    const demo = await createTestServices({ search: '?demo=1' });
    await renderSettings(demo);
    expect(screen.getByRole('button', { name: 'Envoyer (AirDrop…)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choisir un fichier' })).toBeDisabled();
    expect(
      screen.getAllByText('Indisponible en mode démo : ces données sont fictives.').length,
    ).toBeGreaterThan(0);
  });
});

describe('rappel de sauvegarde', () => {
  const eightDaysBefore = new Date('2026-09-12T10:00:00Z'); // TEST_NOW = 20 septembre

  it('apparaît sur le dashboard quand des dépenses ne sont sauvegardées nulle part depuis 7 jours', async () => {
    const app = await createTestServices();
    await addExpense(app, { ...meat, date: '2026-09-12' }, eightDaysBefore);
    await renderApp('/', app);

    const link = await screen.findByRole('link', { name: 'Sauvegarder' });
    expect(link).toHaveAttribute('href', '/settings');
    expect(
      screen.getByText('Tes dernières dépenses ne sont sauvegardées nulle part depuis 8 jours.'),
    ).toBeInTheDocument();
  });

  it('disparaît une fois les données exportées', async () => {
    const app = await createTestServices();
    await addExpense(app, { ...meat, date: '2026-09-12' }, eightDaysBefore);
    await app.backup.setMeta('lastExportAt', '2026-09-19T10:00:00.000Z' as never);
    await renderApp('/', app);
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
    expect(screen.queryByRole('link', { name: 'Sauvegarder' })).not.toBeInTheDocument();
  });

  it('ne s’affiche pas sur un appareil neuf, ni pour une dépense récente', async () => {
    const app = await createTestServices();
    await addExpense(app, meat, new Date('2026-09-19T10:00:00Z'));
    await renderApp('/', app);
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
    expect(screen.queryByText(/ne sont sauvegardées nulle part/)).not.toBeInTheDocument();
  });

  it('ne s’affiche pas en mode démo', async () => {
    const demo = await createTestServices({ search: '?demo=1' });
    await renderApp('/', demo);
    await screen.findByRole('heading', { level: 1, name: 'Septembre 2026' });
    expect(screen.queryByText(/ne sont sauvegardées nulle part/)).not.toBeInTheDocument();
  });
});
