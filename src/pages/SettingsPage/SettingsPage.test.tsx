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
import { formatSyncCode } from '@/domains/sync';
import { createTestServices, memorySyncServer } from '@/test/services';

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
/** Les boutons d'envoi attendent que le fichier soit préparé. */
async function enabledButton(name: string) {
  const button = screen.getByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const jsonFile = (text: string, name = 'lisboa.json') =>
  new File([text], name, { type: 'application/json' });

describe('envoyer vers un autre appareil', () => {
  it('télécharge un fichier valide quand le menu Partager n’existe pas', async () => {
    const source = await createTestServices();
    await addExpense(source, meat);
    const { user } = await renderSettings(source);

    await user.click(await enabledButton('Envoyer (AirDrop…)'));

    expect(
      await screen.findByText(/le fichier lisboa-2026-09-20\.json a été téléchargé à la place/),
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

    await user.click(await enabledButton('Envoyer (AirDrop…)'));

    expect(await screen.findByText('Fichier envoyé.')).toBeInTheDocument();
    expect(shared).toHaveLength(1);
    expect(shared[0]?.name).toBe('lisboa-2026-09-20.json');
    expect(downloads).toHaveLength(0);
    expect(
      await screen.findByText('Dernier envoi ou téléchargement : 20 sept. 2026.'),
    ).toBeInTheDocument();
  });

  it('ouvre le menu Partager dans la foulée du clic (exigence de Safari)', async () => {
    // Safari refuse le partage (NotAllowedError) si une lecture de la base le précède.
    let duringClick = false;
    const markClick = () => {
      duringClick = true;
      queueMicrotask(() => (duringClick = false));
    };
    document.addEventListener('click', markClick, true);
    const calledDuringClick: boolean[] = [];
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn(async () => void calledDuringClick.push(duringClick)),
    });
    const source = await createTestServices();
    await addExpense(source, meat);
    const { user } = await renderSettings(source);
    await user.click(await enabledButton('Envoyer (AirDrop…)'));

    expect(await screen.findByText('Fichier envoyé.')).toBeInTheDocument();
    expect(calledDuringClick).toEqual([true]);
    document.removeEventListener('click', markClick, true);
  });

  it('retombe sur le téléchargement si le navigateur refuse le partage', async () => {
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new DOMException('refusé', 'NotAllowedError');
      }),
    });
    const { user } = await renderSettings();
    await user.click(await enabledButton('Envoyer (AirDrop…)'));

    expect(await screen.findByText(/a été téléchargé à la place/)).toBeInTheDocument();
    expect(downloads).toHaveLength(1);
  });

  it('partage en .txt quand le navigateur refuse l’extension .json (Chrome)', async () => {
    const shared: File[] = [];
    Object.assign(navigator, {
      canShare: ({ files }: { files: File[] }) => files.every((file) => file.name.endsWith('.txt')),
      share: vi.fn(async ({ files }: { files: File[] }) => void shared.push(...files)),
    });
    const source = await createTestServices();
    await addExpense(source, meat);
    const { user } = await renderSettings(source);

    await user.click(await enabledButton('Envoyer (AirDrop…)'));

    expect(await screen.findByText('Fichier envoyé.')).toBeInTheDocument();
    expect(shared[0]?.name).toBe('lisboa-2026-09-20.txt');
    const parsed = parseBackup(await shared[0]!.text());
    expect(parsed.ok && parsed.file.data.expenses).toHaveLength(1);
    expect(downloads).toHaveLength(0);
  });

  it('ne note rien quand on ferme le menu Partager sans envoyer', async () => {
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new DOMException('annulé', 'AbortError');
      }),
    });
    const { user, app } = await renderSettings();

    await user.click(await enabledButton('Envoyer (AirDrop…)'));

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(screen.queryByText('Fichier envoyé.')).not.toBeInTheDocument();
    expect(await app.backup.getMeta('lastExportAt')).toBeNull();
    expect(await screen.findByText("Aucune sauvegarde pour l'instant.")).toBeInTheDocument();
  });

  it('propose aussi le téléchargement direct', async () => {
    const { user } = await renderSettings();
    await user.click(await enabledButton('Télécharger le fichier'));
    expect(await screen.findByText(/Fichier téléchargé : lisboa-.*\.json\./)).toBeInTheDocument();
  });
});

describe('synchronisation', () => {
  const codeOnScreen = () => document.querySelector('.sync-card__code')?.textContent ?? '';

  it('crée un code sur le premier appareil et envoie aussitôt ses dépenses', async () => {
    const server = memorySyncServer();
    const iphone = await createTestServices({ syncServer: server });
    await addExpense(iphone, meat);
    const { user } = await renderSettings(iphone);

    await user.click(await screen.findByRole('button', { name: 'Créer un code' }));

    expect(await screen.findByText('Synchronisé le 20 sept. à 13:00.')).toBeInTheDocument();
    expect(codeOnScreen()).toMatch(/^([0-9A-Z]{4} ){6}[0-9A-Z]{4}$/);
    const code = await iphone.syncSettings.getCode();
    expect(code && formatSyncCode(code)).toBe(codeOnScreen());
  });

  it('relie un second appareil avec ce code, et reçoit les dépenses', async () => {
    const server = memorySyncServer();
    const iphone = await createTestServices({ syncServer: server });
    await addExpense(iphone, meat);
    const { syncNow } = await import('@/domains/sync/application/syncNow');
    const { generateSyncCode } = await import('@/domains/sync');
    const code = generateSyncCode();
    await syncNow({ backup: iphone.backup, server, code, now: new Date() });

    const mac = await createTestServices({ syncServer: server });
    const { user } = await renderSettings(mac);
    await user.type(
      await screen.findByLabelText("Code affiché dans les Réglages de l'autre appareil"),
      formatSyncCode(code).toLowerCase(),
    );
    await user.click(screen.getByRole('button', { name: 'Relier cet appareil' }));

    expect(
      await screen.findByText(/Reçu de l'autre appareil — nouvelles : 1 · modifiées : 0/),
    ).toBeInTheDocument();
    expect(await mac.syncSettings.getCode()).toBe(code);
  });

  it('refuse un code mal recopié au lieu de créer un coffre vide', async () => {
    const mac = await createTestServices({ syncServer: memorySyncServer() });
    const { user } = await renderSettings(mac);
    const field = await screen.findByLabelText(
      "Code affiché dans les Réglages de l'autre appareil",
    );

    await user.type(field, 'ABCD');
    await user.click(screen.getByRole('button', { name: 'Relier cet appareil' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/fait 28 caractères/);

    await user.clear(field);
    await user.type(field, '0000 1111 2222 3333 4444 5555 6666');
    await user.click(screen.getByRole('button', { name: 'Relier cet appareil' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Aucune donnée en ligne/);
    expect(await mac.syncSettings.getCode()).toBeNull();
  });

  it('détache l’appareil sans toucher aux dépenses', async () => {
    const iphone = await createTestServices({ syncServer: memorySyncServer() });
    await addExpense(iphone, meat);
    const { user } = await renderSettings(iphone);
    await user.click(await screen.findByRole('button', { name: 'Créer un code' }));
    await screen.findByText(/Synchronisé le/);

    await user.click(screen.getByRole('button', { name: 'Détacher cet appareil' }));
    await user.click(screen.getByRole('button', { name: 'Oui, détacher' }));

    expect(await screen.findByRole('button', { name: 'Créer un code' })).toBeInTheDocument();
    expect(await iphone.syncSettings.getCode()).toBeNull();
    expect((await iphone.backup.readAll()).expenses).toHaveLength(1);
  });

  it('n’est pas proposée en mode démo', async () => {
    await renderSettings(await createTestServices({ search: '?demo=1' }));
    expect(screen.queryByRole('button', { name: 'Créer un code' })).not.toBeInTheDocument();
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
    expect(csv).toContain('Date;Montant (€);Catégorie;Sous-catégorie;Tags;Note\r\n');
    expect(csv).toContain('2026-09-20;12,40;Courses;Viande;#avec-amis;\r\n');
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
