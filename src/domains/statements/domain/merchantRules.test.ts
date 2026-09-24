import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import type { IsoInstant } from '@/shared/lib/time';
import { classifyMerchant, merchantKey, sameClassification } from './merchantRules';
import type { MerchantRule } from './merchantRules';

const rule = (
  id: string,
  categoryId: string | null,
  subcategoryId: string | null = null,
  overrides: Partial<MerchantRule> = {},
): MerchantRule => ({
  id,
  categoryId: categoryId as CategoryId | null,
  subcategoryId: subcategoryId as SubcategoryId | null,
  ignore: false,
  updatedAt: '2026-09-20T10:00:00.000Z' as IsoInstant,
  deletedAt: null,
  ...overrides,
});
const classify = (description: string, rules: MerchantRule[] = []) =>
  classifyMerchant(merchantKey(description), rules);

describe('merchantKey', () => {
  it('ignore la casse, les accents et les espaces multiples', () => {
    expect(merchantKey('  Pastéis De  Belém ')).toBe('pasteis de belem');
    expect(merchantKey('ALWAHA MARKET')).toBe(merchantKey('Alwaha Market'));
  });
});

describe('règles livrées', () => {
  it.each([
    ['Continente', 'groceries.staples'],
    ['Pingo Doce', 'groceries.staples'],
    ['Lidl', 'groceries.staples'],
    ['Auchan', 'groceries.staples'],
    ['Primaprix', 'groceries.staples'],
    ['Super Halal Bazar', 'groceries.staples'],
    ['Gelato', 'activities.cafes'],
    ['Pastéis De Belém', 'activities.cafes'],
    ['Esplanada da Igreja da Graça', 'activities.cafes'],
    ['The Best Kebab Grill', 'activities.restaurants'],
    ['Metro de Lisboa', 'transport.singleTickets'],
    ['Uber *Trip', 'transport.rideshare'],
    ['Telecabine', 'activities.excursions'],
    ['Headout Quinta Da', 'activities.culture'],
    ['Anthropic', 'subscriptions.apps'],
    ['Amazon', 'shopping.other'],
    ['Decathlon', 'shopping.other'],
    ['Farmácia Central', 'health.pharmacy'],
  ])('%s → %s', (description, target) => {
    const [category] = target.split('.');
    expect(classify(description)).toEqual({
      categoryId: category,
      subcategoryId: target,
      ignore: false,
      source: 'default',
    });
  });

  it('laisse « à classer » un commerçant ambigu plutôt que de le mal classer', () => {
    for (const unknown of [
      'Cascais',
      'Normal',
      'Nobby',
      'Talento Tranquilo',
      'Arco Do Cego',
      'Drinks And Foods',
    ]) {
      expect(classify(unknown).source).toBe('unknown');
    }
  });

  it('ne se trompe pas sur une sous-chaîne au milieu d’un mot', () => {
    // « bolt » ne doit pas se déclencher dans « Arboltec », ni « uber » dans « Suberia ».
    expect(classify('Arboltec').source).toBe('unknown');
    expect(classify('Suberia').source).toBe('unknown');
  });
});

describe('règles apprises', () => {
  it('priment sur les règles livrées', () => {
    const learned = rule(merchantKey('Amazon'), 'groceries', 'groceries.hygiene');
    expect(classify('Amazon', [learned])).toEqual({
      categoryId: 'groceries',
      subcategoryId: 'groceries.hygiene',
      ignore: false,
      source: 'user',
    });
  });

  it('classent un commerçant inconnu', () => {
    expect(classify('Nobby', [rule('nobby', 'shopping', 'shopping.other')]).source).toBe('user');
  });

  it('peuvent décider de ne jamais importer un commerçant', () => {
    const skip = rule('nobby', null, null, { ignore: true });
    expect(classify('Nobby', [skip])).toMatchObject({ ignore: true, source: 'user' });
  });

  it('une règle supprimée ne s’applique plus', () => {
    const removed = rule('amazon', 'groceries', null, {
      deletedAt: '2026-09-21T00:00:00.000Z' as IsoInstant,
    });
    expect(classify('Amazon', [removed]).source).toBe('default');
  });
});

describe('sameClassification', () => {
  it('compare catégorie, sous-catégorie et « ignorer »', () => {
    const a = { categoryId: 'groceries' as CategoryId, subcategoryId: null, ignore: false };
    expect(sameClassification(a, { ...a })).toBe(true);
    expect(sameClassification(a, { ...a, subcategoryId: 'groceries.meat' as SubcategoryId })).toBe(
      false,
    );
    expect(sameClassification(a, { ...a, ignore: true })).toBe(false);
  });
});
