import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildDefaultCatalog } from '@/domains/categorization';
import type { Tag } from '@/domains/categorization';
import { addDays } from '@/shared/lib/time';
import type { LocalDate } from '@/shared/lib/time';
import type { Cents } from '../../domain/money';
import type { Expense, ExpenseResult } from '../../domain/expense';
import { ExpenseForm } from './ExpenseForm';
import type { ExpenseFormValues } from './expenseFormSchema';

const TODAY = '2026-09-20' as LocalDate;
const savedExpense = { amount: 1240 as Cents } as Expense;
const ok: ExpenseResult = { ok: true, expense: savedExpense };

function setup(overrides: { onCreateTag?: (name: string) => Promise<Tag | null> } = {}) {
  const onSubmit = vi.fn<
    (values: ExpenseFormValues, options: { addAnother: boolean }) => Promise<ExpenseResult>
  >(async () => ok);
  const onCancel = vi.fn();
  const onCreateTag = overrides.onCreateTag ?? vi.fn(async () => null);
  const user = userEvent.setup();
  render(
    <ExpenseForm
      catalog={buildDefaultCatalog()}
      today={TODAY}
      onSubmit={onSubmit}
      onCancel={onCancel}
      onCreateTag={onCreateTag}
    />,
  );
  const key = (name: string) => user.click(screen.getByRole('button', { name }));
  const typeAmount = async (text: string) => {
    for (const character of text) await key(character === ',' ? 'Virgule' : character);
  };
  const save = () => user.click(screen.getByRole('button', { name: 'Enregistrer' }));
  return { user, onSubmit, onCancel, key, typeAmount, save };
}

const amountInput = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Montant' });

describe('ExpenseForm', () => {
  it('place le curseur sur le montant à l’ouverture', () => {
    setup();
    expect(amountInput()).toHaveFocus();
  });

  it('compose le montant avec le pavé numérique', async () => {
    const { typeAmount, key } = setup();
    await typeAmount('12,40');
    expect(amountInput()).toHaveValue('12,40');
    await key('Effacer');
    expect(amountInput()).toHaveValue('12,4');
  });

  it('nettoie ce qui est tapé au clavier', async () => {
    const { user } = setup();
    await user.type(amountInput(), '1a2.456');
    expect(amountInput()).toHaveValue('12,45');
  });

  it('enregistre les valeurs saisies', async () => {
    const { user, onSubmit, typeAmount, save } = setup();
    await typeAmount('12,40');
    await user.click(screen.getByRole('radio', { name: 'Courses' }));
    await user.click(screen.getByRole('radio', { name: 'Viande' }));
    await save();

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(
      {
        amount: '12,40',
        categoryId: 'groceries',
        subcategoryId: 'groceries.meat',
        date: TODAY,
        tagIds: [],
      },
      { addAnother: false },
    );
  });

  it('refuse un formulaire vide et explique pourquoi', async () => {
    const { onSubmit, save } = setup();
    await save();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Saisis un montant supérieur à 0')).toBeInTheDocument();
    expect(screen.getByText('Choisis une catégorie')).toBeInTheDocument();
    expect(amountInput()).toBeInvalid();
  });

  it('retire l’erreur dès que le champ est corrigé', async () => {
    const { user, typeAmount, save } = setup();
    await save();
    await typeAmount('5');
    await user.click(screen.getByRole('radio', { name: 'Transport' }));
    expect(screen.queryByText('Saisis un montant supérieur à 0')).not.toBeInTheDocument();
    expect(screen.queryByText('Choisis une catégorie')).not.toBeInTheDocument();
  });

  describe('sous-catégorie', () => {
    it('n’affiche que celles de la catégorie choisie', async () => {
      const { user } = setup();
      expect(screen.queryByRole('radio', { name: 'Viande' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      expect(screen.getByRole('radio', { name: 'Viande' })).toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: 'Loyer' })).not.toBeInTheDocument();
    });

    it('est réinitialisée quand on change de catégorie', async () => {
      const { user, typeAmount, save, onSubmit } = setup();
      await typeAmount('3');
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      await user.click(screen.getByRole('radio', { name: 'Viande' }));
      await user.click(screen.getByRole('radio', { name: 'Transport' }));
      await save();
      expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
        categoryId: 'transport',
        subcategoryId: null,
      });
    });

    it('se décoche par un second appui', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      const meat = screen.getByRole('radio', { name: 'Viande' });
      await user.click(meat);
      expect(meat).toBeChecked();
      await user.click(meat);
      expect(meat).not.toBeChecked();
    });

    it('est rappelée dans le résumé sous le montant', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      await user.click(screen.getByRole('radio', { name: 'Viande' }));
      expect(screen.getByText('Courses › Viande')).toBeInTheDocument();
    });
  });

  describe('date', () => {
    it('propose Aujourd’hui (par défaut) et Hier', async () => {
      const { user, typeAmount, save, onSubmit } = setup();
      expect(screen.getByRole('radio', { name: "Aujourd'hui" })).toBeChecked();

      await typeAmount('4');
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      await user.click(screen.getByRole('radio', { name: 'Hier' }));
      await save();
      expect(onSubmit.mock.calls[0]?.[0].date).toBe(addDays(TODAY, -1));
    });

    it('accepte une autre date pour rattraper un jour passé', async () => {
      const { user, typeAmount, save, onSubmit } = setup();
      await typeAmount('4');
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      await user.click(screen.getByRole('radio', { name: 'Autre date' }));
      const dateField = screen.getByLabelText('Choisir une date');
      await user.clear(dateField);
      await user.type(dateField, '2026-09-05');
      await save();
      expect(onSubmit.mock.calls[0]?.[0].date).toBe('2026-09-05');
    });
  });

  describe('tags', () => {
    it('coche et décoche un tag existant', async () => {
      const { user, typeAmount, save, onSubmit } = setup();
      await typeAmount('4');
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      await user.click(screen.getByRole('checkbox', { name: '#avec-amis' }));
      await user.click(screen.getByRole('checkbox', { name: '#cash' }));
      await user.click(screen.getByRole('checkbox', { name: '#cash' }));
      await save();
      expect(onSubmit.mock.calls[0]?.[0].tagIds).toEqual(['avec-amis']);
    });

    it('crée un tag avec Entrée, le coche, et n’enregistre pas la dépense', async () => {
      const created: Tag = {
        id: 'sortie-plage' as Tag['id'],
        name: 'sortie-plage',
        updatedAt: '2026-09-20T10:00:00.000Z' as Tag['updatedAt'],
        deletedAt: null,
      };
      const onCreateTag = vi.fn(async () => created);
      const { user, typeAmount, save, onSubmit } = setup({ onCreateTag });

      await typeAmount('4');
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      await user.click(screen.getByRole('button', { name: 'Tag' }));
      await user.type(screen.getByRole('textbox', { name: 'Nouveau tag' }), 'Sortie plage{Enter}');

      expect(onCreateTag).toHaveBeenCalledExactlyOnceWith('Sortie plage');
      expect(onSubmit).not.toHaveBeenCalled();

      await save();
      expect(onSubmit.mock.calls[0]?.[0].tagIds).toEqual(['sortie-plage']);
    });
  });

  describe('enregistrer et en ajouter une autre', () => {
    it('vide le montant et les tags, garde la catégorie, annonce le résultat', async () => {
      const { user, typeAmount, onSubmit } = setup();
      await typeAmount('12,40');
      await user.click(screen.getByRole('radio', { name: 'Courses' }));
      await user.click(screen.getByRole('checkbox', { name: '#cash' }));
      await user.click(screen.getByRole('button', { name: 'Enregistrer et en ajouter une autre' }));

      expect(onSubmit.mock.calls[0]?.[1]).toEqual({ addAnother: true });
      expect(amountInput()).toHaveValue('');
      expect(amountInput()).toHaveFocus();
      expect(screen.getByRole('radio', { name: 'Courses' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: '#cash' })).not.toBeChecked();
      expect(screen.getByRole('status')).toHaveTextContent(/Dépense enregistrée : 12,40\s€/);
    });
  });

  it('enregistre avec Ctrl+Entrée', async () => {
    const { user, typeAmount, onSubmit } = setup();
    await typeAmount('7');
    await user.click(screen.getByRole('radio', { name: 'Courses' }));
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]?.[1]).toEqual({ addAnother: false });
  });

  it('signale un échec d’enregistrement', async () => {
    const { user, typeAmount, save, onSubmit } = setup();
    onSubmit.mockResolvedValueOnce({ ok: false, error: 'subcategoryMismatch' });
    await typeAmount('7');
    await user.click(screen.getByRole('radio', { name: 'Courses' }));
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "La dépense n'a pas pu être enregistrée",
    );
  });

  it('ferme avec Annuler', async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('ExpenseForm en modification', () => {
  const defaultValues: ExpenseFormValues = {
    amount: '18,50',
    categoryId: 'activities',
    subcategoryId: 'activities.restaurants',
    date: '2026-09-19',
    tagIds: ['avec-amis'],
  };

  function setupEdit() {
    const onSubmit = vi.fn<
      (values: ExpenseFormValues, options: { addAnother: boolean }) => Promise<ExpenseResult>
    >(async () => ok);
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpenseForm
        mode="edit"
        catalog={buildDefaultCatalog()}
        today={TODAY}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onCreateTag={async () => null}
        onDelete={onDelete}
      />,
    );
    return { user, onSubmit, onDelete, onCancel };
  }

  it('préremplit tous les champs de la dépense', () => {
    setupEdit();
    expect(amountInput()).toHaveValue('18,50');
    expect(screen.getByRole('radio', { name: 'Activités' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Restaurants' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '#avec-amis' })).toBeChecked();
    expect(screen.getByLabelText('Choisir une date')).toHaveValue('2026-09-19');
  });

  it('propose de modifier ou supprimer, pas d’en ajouter une autre', () => {
    setupEdit();
    expect(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer cette dépense' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Enregistrer et en ajouter une autre' }),
    ).not.toBeInTheDocument();
  });

  it('enregistre les changements sans « ajouter une autre »', async () => {
    const { user, onSubmit } = setupEdit();
    await user.clear(amountInput());
    await user.type(amountInput(), '20');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(onSubmit).toHaveBeenCalledWith(
      { ...defaultValues, amount: '20' },
      { addAnother: false },
    );
  });

  it('Ctrl+Maj+Entrée enregistre simplement (rien à ajouter en modification)', async () => {
    const { user, onSubmit } = setupEdit();
    await user.keyboard('{Control>}{Shift>}{Enter}{/Shift}{/Control}');
    expect(onSubmit.mock.calls[0]?.[1]).toEqual({ addAnother: false });
  });

  it('demande la suppression sans enregistrer', async () => {
    const { user, onSubmit, onDelete } = setupEdit();
    await user.click(screen.getByRole('button', { name: 'Supprimer cette dépense' }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('garde le pavé fermé pour laisser voir la date et les tags, et l’ouvre au toucher du montant', async () => {
    const { user } = setupEdit();
    expect(screen.queryByRole('group', { name: 'Pavé numérique' })).not.toBeInTheDocument();

    await user.click(amountInput());
    expect(screen.getByRole('group', { name: 'Pavé numérique' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Transport' }));
    expect(screen.queryByRole('group', { name: 'Pavé numérique' })).not.toBeInTheDocument();
  });

  it('modifie le montant avec le pavé une fois ouvert', async () => {
    const { user, onSubmit } = setupEdit();
    await user.click(amountInput());
    await user.click(screen.getByRole('button', { name: 'Effacer' }));
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(onSubmit.mock.calls[0]?.[0].amount).toBe('18,55');
  });
});
